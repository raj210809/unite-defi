import { ethers, getAddress } from 'ethers';
import ABI from './abi/limit_order_protocol.json';
import { Address, MakerTraits } from '@1inch/limit-order-sdk';
import { Signature } from 'ethers';


// Define the LimitOrder structure as per contract expectations with bytes32 fields
// Note: Keep the typo "Recepient" to match the contract
interface LimitOrder {
    salt: bigint;
    maker: bigint;
    receiver: bigint;
    makerAsset: bigint;
    takerAsset: bigint;
    makingAmount: bigint;
    takingAmount: bigint;
    makerTraits: bigint;
    crossChainRecepient: string; // bytes32 as hex string - note the typo to match contract
    suiAsset: string; // bytes32 as hex string
}

const name = '1inch Aggregation Router';
const version = '6';
const chainId = 84532; // Base Sepolia ChainID

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(
    '672f2093e66f1769515da9289e89ce4643c0dbe36b4fb25a3c50b6a7df2219d5',
    provider
);
const contractAddress = '0xeA6F755261cc8D91E801a348953046Fb99dA4B73';

// Helper: Convert address to uint256 bigint (lower 160 bits)
const addrToUint256 = (address: string): bigint =>
    BigInt(address.toLowerCase()) & ((1n << 160n) - 1n);

// Build Salt (salt96 << 160 | extensionHash160) — No Extensions in this case
const buildSalt = (salt96: bigint, extensionHash160: bigint = 0n): bigint => {
    return (salt96 << 160n) | extensionHash160;
};

// Helper: Convert string to bytes32
const stringToBytes32 = (str: string): string => {
    if (str.startsWith('0x') && str.length === 66) {
        // Already a bytes32 hex string
        return str;
    }
    // Convert string to bytes32 (truncated or padded to 32 bytes)
    const bytes = ethers.toUtf8Bytes(str);
    if (bytes.length > 32) {
        // If too long, hash it to fit in 32 bytes
        return ethers.keccak256(bytes);
    }
    // Pad to 32 bytes (right-pad with zeros)
    const paddedBytes = new Uint8Array(32);
    paddedBytes.set(bytes);
    return ethers.hexlify(paddedBytes);
};

// EIP-712 Signing
async function signOrder(wallet: ethers.Wallet, order: LimitOrder): Promise<string> {
    const domain = {
        name: "1inch Aggregation Router",
        version: "6",
        chainId: 84532, // Base Sepolia ChainID
        verifyingContract: contractAddress,
    };

    const types = {
        Order: [
            { name: 'salt', type: 'uint256' },
            { name: 'maker', type: 'uint256' },
            { name: 'receiver', type: 'uint256' },
            { name: 'makerAsset', type: 'uint256' },
            { name: 'takerAsset', type: 'uint256' },
            { name: 'makingAmount', type: 'uint256' },
            { name: 'takingAmount', type: 'uint256' },
            { name: 'makerTraits', type: 'uint256' },
            { name: 'crossChainRecepient', type: 'bytes32' }, // Keep the typo to match contract
            { name: 'suiAsset', type: 'bytes32' },
        ],
    };
    const value = order;

    return wallet.signTypedData(domain, types, order);
}

// Fill Order on-chain
async function fillOrder(
    order: LimitOrder,
    signature: string,
    amount: bigint,
    takerTraits: bigint,
    options?: { value?: bigint }
) {
    const contract = new ethers.Contract(contractAddress, ABI, wallet);
    return contract.fillContractOrder(order, signature, amount, takerTraits, options || {});
}

function getRSV(signature: string): { r: string; vs: string } {
    const sig = Signature.from(signature);

    // EIP-2098 compact "vs" = s (32 bytes) with v in the highest bit
    const sBigInt = BigInt(sig.s);
    const vBigInt = BigInt(sig.v);

    // Set highest bit of s if v is 28
    const vsBigInt = vBigInt === 28n ? (sBigInt | (1n << 255n)) : sBigInt;

    const vsHex = '0x' + vsBigInt.toString(16).padStart(64, '0');
    return { r: sig.r, vs: vsHex };
}


async function main() {
    // Addresses
    const maker = getAddress(wallet.address);
    const receiver = getAddress('0xf1f8f703d72821c6A933cC860FF57b0ed1DfBE3C');
    const makerAsset = getAddress('0x4097705d95C5bB12762C80034faEAd3A65bbf357');
    const takerAsset = getAddress('0x000000000000000000000000000000000000dead');

    // Build Salt
    const uniqueSalt96 = BigInt(Date.now()) & ((1n << 96n) - 1n);
    const salt = buildSalt(uniqueSalt96);

    // MakerTraits using SDK
    const makerTraitsObj = MakerTraits.default()
        .allowMultipleFills()
        .withExpiration(BigInt(Math.floor(Date.now() / 1000) + 3600))
        .withAnySender();

    const makerTraits = makerTraitsObj.asBigInt();

    const order: LimitOrder = {
        salt,
        maker: addrToUint256(maker),
        receiver: addrToUint256(receiver),
        makerAsset: addrToUint256(makerAsset),
        takerAsset: addrToUint256(takerAsset),
        makingAmount: BigInt(1_000_000_000),
        takingAmount: BigInt(20_000_000),
        makerTraits: makerTraitsObj.asBigInt(),
        // Convert strings to bytes32 - note the field name with typo
        crossChainRecepient: stringToBytes32('suiCrossChainRecipientAddressHere'),
        suiAsset: stringToBytes32('0xSUIAssetAddressOrIdentifierHere'),
    };

    console.log('Cross-chain recipient (bytes32):', order.crossChainRecepient);
    console.log('SUI asset (bytes32):', order.suiAsset);

    // EIP-712 Signature
    // const signature = await signOrder(wallet, order);
    // console.log('Signature:', signature);
    // const { r, vs } = getRSV(signature);
    const { r, yParityAndS: vs } = ethers.Signature.from(await signOrder(wallet, order));


    // Approve MakerAsset
    const erc20Abi = ['function approve(address spender, uint256 amount) public returns (bool)'];
    const makerAssetContract = new ethers.Contract(makerAsset, erc20Abi, wallet);
    await makerAssetContract.approve(contractAddress, order.makingAmount);
    console.log(`Approved ${order.makingAmount} tokens to contract ${contractAddress}`);

    // Instantiate Contract in main scope
    const contract = new ethers.Contract(contractAddress, ABI, wallet);
    console.log('Order:', order);
    console.log('Signature types:', typeof (r), typeof (vs));
    console.log('Making amount:', order.makingAmount);

    const feeData = await provider.getFeeData();

    const tx = await contract.fillOrder(
        order,
        order.crossChainRecepient,
        order.crossChainRecepient,
        order.makingAmount,
        BigInt(0),
    );

    await tx.wait();
    console.log('Order filled. Tx Hash:', tx.hash);
    console.log("events emitted:", tx.events)
}

main().catch(console.error);
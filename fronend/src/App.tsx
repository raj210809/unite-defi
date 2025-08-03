import { useState } from 'react';
import { ethers, getAddress, Signature  } from 'ethers';
import ABI from './abi/limit_order_protocol.json';

interface LimitOrder {
    salt: bigint;
    maker: bigint;
    receiver: bigint;
    makerAsset: bigint;
    takerAsset: bigint;
    makingAmount: bigint;
    takingAmount: bigint;
    makerTraits: bigint;
    crossChainRecepient: string;
    suiAsset: string;
}

const CONTRACT_ADDRESS = '0xeA6F755261cc8D91E801a348953046Fb99dA4B73';
const CHAIN_ID = 84532;

const addrToUint256 = (address: string): bigint => {
    return BigInt(address.toLowerCase()) & ((1n << 160n) - 1n);
};

const buildSalt = (salt96: bigint, extensionHash160: bigint = 0n): bigint => {
    return (salt96 << 160n) | extensionHash160;
};

const stringToBytes32 = (str: string): string => {
    if (str.startsWith('0x') && str.length === 66) return str;
    const bytes = ethers.toUtf8Bytes(str);
    if (bytes.length > 32) return ethers.keccak256(bytes);
    const paddedBytes = new Uint8Array(32);
    paddedBytes.set(bytes);
    return ethers.hexlify(paddedBytes);
};

function App() {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

    const [makerAsset, setMakerAsset] = useState('');
    const [makingAmount, setMakingAmount] = useState('');
    const [takerAsset, setTakerAsset] = useState('');
    const [takingAmount, setTakingAmount] = useState('');
    const [suiAsset, setSuiAsset] = useState('');
    const [crossChainRecipient, setCrossChainRecipient] = useState('');

    const connectWallet = async () => {
        if (!(window as any).ethereum) return alert('MetaMask not found');
        const web3Provider = new ethers.BrowserProvider((window as any).ethereum);
        await web3Provider.send('eth_requestAccounts', []);
        const userSigner = await web3Provider.getSigner();
        setProvider(web3Provider);
        setSigner(userSigner);
    };

    const signAndSendOrder = async () => {
        if (!signer || !provider) return;

        const maker = getAddress(await signer.getAddress());
        const receiver = getAddress('0xf1f8f703d72821c6A933cC860FF57b0ed1DfBE3C');

        const salt = buildSalt(BigInt(Date.now()) & ((1n << 96n) - 1n));

        const order: LimitOrder = {
            salt,
            maker: addrToUint256(maker),
            receiver: addrToUint256(receiver),
            makerAsset: addrToUint256(getAddress(makerAsset)),
            takerAsset: addrToUint256(getAddress(takerAsset)),
            makingAmount: BigInt(makingAmount),
            takingAmount: BigInt(takingAmount),
            makerTraits: BigInt(0),
            crossChainRecepient: stringToBytes32(crossChainRecipient),
            suiAsset: stringToBytes32(suiAsset),
        };

        const domain = {
            name: '1inch Aggregation Router',
            version: '6',
            chainId: CHAIN_ID,
            verifyingContract: CONTRACT_ADDRESS,
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
                { name: 'crossChainRecepient', type: 'bytes32' },
                { name: 'suiAsset', type: 'bytes32' },
            ],
        };

        const signature = await signer.signTypedData(domain, types, order);
        const { r, yParityAndS: vs } = Signature.from(signature);

        const erc20Abi = ['function approve(address spender, uint256 amount) public returns (bool)'];
        const erc20Contract = new ethers.Contract(makerAsset, erc20Abi, signer);
        await erc20Contract.approve(CONTRACT_ADDRESS, order.makingAmount);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        const tx = await contract.fillOrder(
            order,
            order.crossChainRecepient,
            order.crossChainRecepient,
            order.makingAmount,
            BigInt(0)
        );

        await tx.wait();
        alert('Order Filled. Tx Hash: ' + tx.hash);
    };

    return (
        <div>
            <h2>Web3 Limit Order</h2>

            <button onClick={connectWallet}>Connect MetaMask</button>

            <div>
                <input type="text" placeholder="Maker Asset Address" value={makerAsset} onChange={(e) => setMakerAsset(e.target.value)} />
                <input type="text" placeholder="Making Amount" value={makingAmount} onChange={(e) => setMakingAmount(e.target.value)} />
                <input type="text" placeholder="Taker Asset Address" value={takerAsset} onChange={(e) => setTakerAsset(e.target.value)} />
                <input type="text" placeholder="Taking Amount" value={takingAmount} onChange={(e) => setTakingAmount(e.target.value)} />
                <input type="text" placeholder="SUI Asset (bytes32 or string)" value={suiAsset} onChange={(e) => setSuiAsset(e.target.value)} />
                <input type="text" placeholder="Cross-chain Recipient (bytes32 or string)" value={crossChainRecipient} onChange={(e) => setCrossChainRecipient(e.target.value)} />
            </div>

            <button onClick={signAndSendOrder}>Sign & Fill Order</button>
        </div>
    );
}

export default App;

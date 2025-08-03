import { ethers } from "ethers";
import FactoryABI from "./abi/escrow-factory.json"
import ESCROW_ABI from "./abi/escrow.json";

// Replace with your actual deployed addresses
const ESCROW_FACTORY_ADDRESS = "0x022455a8A9a326b79d7D81BBC5BCFedAf648EFF8";

// Set up provider and signer
const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
const signer = new ethers.Wallet("672f2093e66f1769515da9289e89ce4643c0dbe36b4fb25a3c50b6a7df2219d5", provider);

// Load EscrowFactory contract instance
const escrowFactory = new ethers.Contract(ESCROW_FACTORY_ADDRESS, FactoryABI, signer);

/**
 * Creates a new Escrow contract.
 */
export async function createEscrow(
  maker: string,
  asset: string,
  amount: ethers.BigNumberish,
  hashlock: string,
  timelock: number
): Promise<string> {

  const tx = await escrowFactory.createEscrow(maker, asset, amount, hashlock, timelock);
  const receipt = await tx.wait();

  console.log("New escrow created at:", receipt.escrowAddress);
  return receipt.escrowAddress;
}

/**
 * Claim funds from the escrow using the secret.
 */
export async function claim(escrowAddress: string, secret: string) {
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const hashlock = await escrow.hashlock();
  const hashedSecret = ethers.keccak256(ethers.toUtf8Bytes(secret));

  if (hashlock !== hashedSecret) {
    throw new Error("Provided secret does not match hashlock");
  }

  const tx = await escrow.claim(ethers.encodeBytes32String(secret));
  await tx.wait();
  console.log("Funds claimed successfully");
}

/**
 * Refund the funds after timelock has passed.
 */
export async function refund(escrowAddress: string) {
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const tx = await escrow.refund();
  await tx.wait();
  console.log("Refund successful");
}

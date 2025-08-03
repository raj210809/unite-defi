import { ethers } from "ethers";
import ABI from "./abi/escrow.json"

// Replace with your actual deployed addresses
const ESCROW_FACTORY_ADDRESS = "0x022455a8A9a326b79d7D81BBC5BCFedAf648EFF8";

// Set up provider and signer
const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

// Load EscrowFactory contract instance
const escrowFactory = new ethers.Contract(ESCROW_FACTORY_ADDRESS, ABI, signer);

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

  const event = receipt.events?.find((e) => e.event === "EscrowCreated");
  if (!event) throw new Error("EscrowCreated event not found");

  const escrowAddress = event.args?.escrowAddress;
  console.log("New escrow created at:", escrowAddress);
  return escrowAddress;
}

/**
 * Claim funds from the escrow using the secret.
 */
export async function claim(escrowAddress: string, secret: string) {
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const hashlock = await escrow.hashlock();
  const hashedSecret = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(secret));

  if (hashlock !== hashedSecret) {
    throw new Error("Provided secret does not match hashlock");
  }

  const tx = await escrow.claim(ethers.utils.formatBytes32String(secret));
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

import { ethers } from "ethers";
import ABI from "./abi/new_abi.json"

// Replace with your values
const CONTRACT_ADDRESS = "0xeA6F755261cc8D91E801a348953046Fb99dA4B73";

// Base Sepolia RPC (you can use Alchemy, Infura, or a public one)
const BASE_SEPOLIA_RPC = "https://base-sepolia.infura.io/v3/e940f92114244cf6907d26f47d8e83a2"; // or from Infura/Alchemy
const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);

// Create contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// Listen to event
contract.on("OrderVerified", (
  suiAsset: string,
  crossChainRecepient: string,
  maker: string,
  takerAsset: string,
  makingAmount: ethers.BigNumberish,
  takingAmount: ethers.BigNumberish,
  event
) => {
  console.log("🔔 OrderVerified Event Received:");
  console.log("SUI Asset:", suiAsset);
  console.log("Cross-chain Recipient:", crossChainRecepient);
  console.log("Maker:", maker);
  console.log("Taker Asset:", takerAsset);
  console.log("Making Amount:", makingAmount.toString());
  console.log("Taking Amount:", takingAmount.toString());
  console.log("Event Metadata:", event);
});


contract.on("OrderFilled", (
  taker: string,
  orderHash: string,
  remainingAmount: ethers.BigNumberish,
  event
) => {
  console.log("✅ OrderFilled Event:");
  console.log("Taker:", taker);
  console.log("Order Hash:", orderHash);
  console.log("Remaining Amount:", remainingAmount.toString());
  console.log("Block Number:", event.blockNumber);
});
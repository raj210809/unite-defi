// call-contract.ts
import { ethers } from 'ethers';
import dotenv from "dotenv"
import abi from "../abi/escrow_factory.json"

dotenv.config()
async function main () {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const block = await provider.getBlockNumber();

  console.log("Current Block Number:", block);

  // A random account from Anvil (you can use impersonation if needed)
  const signer = provider.getSigner(0);

  // USDC contract on Ethereum mainnet
  const contractAddress : string = process.env.ESCROW_CONTRACT_ADDRESS || "0xa7bCb4EAc8964306F9e3764f67Db6A7af6DdF99A";

  const contract = new ethers.Contract(contractAddress, abi, provider);

  console.log("Contract Address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
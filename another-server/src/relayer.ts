import { ethers } from "ethers";
import {SuiClient , getFullnodeUrl} from "@mysten/sui/client";
import {Ed25519Keypair} from "@mysten/sui/keypairs/ed25519"
import {fromBase64} from "@mysten/bcs"
import {Transaction} from "@mysten/sui/transactions"
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

// EVM Setup
// const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
// const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
// const abi = JSON.parse(fs.readFileSync(process.env.EVM_CONTRACT_ABI_PATH!, "utf8"));
// const evmContract = new ethers.Contract(process.env.EVM_CONTRACT_ADDRESS!, abi, wallet);

// SUI Setup
const keypair = Ed25519Keypair.fromSecretKey(fromBase64(process.env.SUI_KEYPAIR!));
const suiClient = new SuiClient({
  url: getFullnodeUrl("devnet")
})
const senderAddress = keypair.getPublicKey().toSuiAddress()
console.log(senderAddress)

async function signAndExecute(tx : any) {
  return await suiClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });
}

tx.moveCall({
  target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE}::${process.env.SUI_FUNCTION_1}`,
  arguments: [
    tx.pure(keypair.getPublicKey().toSuiAddress()), // maker: address
    coin,                                            // asset: Coin<T>
    tx.pure(hashlock),                              // hashlock: vector<u8>
    tx.pure(timelock),                               // timelock: u64
  ],
  typeArguments: [typeArg],
});

// Listener
// evmContract.on(process.env.EVENT_NAME!, async (...args: any[]) => {
//   try {
//     const eventData = args[args.length - 1]; // Last argument is usually the Event Object
//     console.log("🔔 Event detected:", eventData);

//     // Customize arguments as per event values
//     const tx = new TransactionBlock();
//     tx.moveCall({
//       target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE}::${process.env.SUI_FUNCTION}`,
//       arguments: [
//         tx.pure(eventData.args[0]), // Modify this according to your event
//         tx.pure(eventData.args[1]),
//       ],
//     });

//     const result = await signer.signAndExecuteTransactionBlock({ transactionBlock: tx });
//     console.log("✅ Sui Tx executed:", result.digest);
//   } catch (err) {
//     console.error("❌ Error handling event:", err);
//   }
// });

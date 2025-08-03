import {getFullnodeUrl , SuiClient , SuiTransactionBlock} from "@mysten/sui/client"

import {Transaction} from "@mysten/sui/transactions"

import {Ed25519Keypair} from "@mysten/sui/keypairs/ed25519"

import {fromBase64} from "@mysten/bcs"

const client = new SuiClient({
    url: getFullnodeUrl("devnet")
})

const keyPair = Ed25519Keypair.fromSecretKey(fromBase64("GLWN+UMj/ahJF5yayUEbOijwSXpYvfi6FNZlVAXOMwS"));

const sender = keyPair.getPublicKey().toSuiAddress()

console.log("Sender Address: ", sender)

const COIN_OBJECT_ID = '0xd19f65383633e8e219f338c8465541c75fa0049a0d6092d0fdb32262d4c2e48f';
const COIN_TYPE = '0x2::coin::Coin<0x2::sui::SUI>';


export async function create(hashlock: number[], timelock: number, amount: bigint , suiAsset: string) {
  const tx = new Transaction();

  // Step 1: Split the coin to get the amount you want to lock
 const [coinForEscrow] = tx.splitCoins(
  tx.object(suiAsset),      // the main coin object
  [tx.pure('u64', amount)]        // the amount to split out (as u64)
);

  // Step 2: Create the escrow using that specific Coin
  const [escrow] = tx.moveCall({
    target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE}::${process.env.SUI_FUNCTION_1}`,
    arguments: [
      tx.pure('address', keyPair.getPublicKey().toSuiAddress()),
      coinForEscrow,
      tx.pure('vector<u8>', hashlock),
      tx.pure('u64', timelock),                      // timelock
    ],
    typeArguments: [COIN_TYPE],
  });

  // Step 3: Transfer the escrow object to the maker
  tx.transferObjects([escrow], keyPair.getPublicKey().toSuiAddress());

  // Step 4: Set gas and execute transaction
  tx.setGasBudget(100_000_000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keyPair,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  return result.effects?.created
}


export async function claim (escrowId : string , secret : string) {
  const tx = new Transaction();

  // Capture return values from moveCall
  tx.moveCall({
  target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE}::${process.env.SUI_FUNCTION_2}`,
  arguments: [                                          
    tx.object( escrowId ),                              
    tx.pure('string' , secret),                               
  ],
  typeArguments: [COIN_TYPE],
});

  // Optional: Use the returned `lock` and `key` objects in other instructions
  // For example, logging or further passing them

  tx.setGasBudget(100_000_000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keyPair,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  return result.transaction?.data
}

export async function refund (escrowId : string , keyPair : Ed25519Keypair) {
  const tx = new Transaction();

  // Capture return values from moveCall
  tx.moveCall({
  target: `${process.env.SUI_PACKAGE_ID}::${process.env.SUI_MODULE}::${process.env.SUI_FUNCTION_3}`,
  arguments: [                                          
    tx.object( escrowId ),                              
  ],
  typeArguments: [COIN_TYPE],
});

  // Optional: Use the returned `lock` and `key` objects in other instructions
  // For example, logging or further passing them

  tx.setGasBudget(100_000_000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keyPair,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  console.log("Transaction Result: ", result.effects?.created);
}
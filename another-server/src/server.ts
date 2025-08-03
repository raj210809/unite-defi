import express from "express";
import {create , claim , refund} from "./sui"
import crypto from "crypto";
import { keccak256 , toUtf8Bytes , toBeArray} from "ethers";
import { createEscrow } from "./evm";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/create" , async (req , res) => {
   const secret = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  console.log("luuuund")
  // 2. Hash it with Keccak256
  const hashHex = keccak256(toUtf8Bytes(secret)); // returns 0x-prefixed hex string

  // 3. Convert to number[] for Sui (vector<u8>)
  const hashBytes = Array.from(toBeArray(hashHex))

  const object_id = await create(hashBytes, req.body.timelock , req.body.takingAmount , req.body.suiAsset);

  const addressEscrow = createEscrow(req.body.maker, req.body.asset, req.body.makingAmount, hashHex, req.body.timelock);
  

  // 4. Return only the secret
  res.json({ secret, object_id , addressEscrow });

})

app.post("/withdraw" , async (req , res) => {
  const tx_on_sui = await claim(req.body.escrowId, req.body.secret);

  // Return only the secret
  res.json({ tx_on_sui });
})

app.listen(3000, () => {
  console.log("Server is running on port 3000");
})
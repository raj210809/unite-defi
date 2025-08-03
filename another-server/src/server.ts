import express from "express";
import {create , claim , refund} from "./sui"
import crypto from "crypto";
import { keccak256 , toUtf8Bytes , toBeArray} from "ethers/src.ts";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/create" , async (req , res) => {
   const secret = crypto.randomBytes(32).toString('hex'); // 64 hex chars

  // 2. Hash it with Keccak256
  const hashHex = keccak256(toUtf8Bytes(secret)); // returns 0x-prefixed hex string

  // 3. Convert to number[] for Sui (vector<u8>)
  const hashBytes = Array.from(toBeArray(hashHex))

  create(hashBytes, req.body.timelock)
  

  // 4. Return only the secret
  res.json({ secret });

  // Send only the secret
  res.json({ secret });
})

app.listen(3000, () => {
  console.log("Server is running on port 3000");
})
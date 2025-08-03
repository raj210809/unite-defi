import express from "express";
import {signOrder} from "./off-chain-order-creation"
import { ethers } from "ethers"

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fusionOrderExample = {
    maker: "0x0d8B290Fd34626f3A51958fa3f12d633A695eaCF",
    taker: "0x0d8B290Fd34626f3A51958fa3f12d633A695eaCF",
    suiRecipient: "0xbfcde57f5042b90e0ce081b42b353203cd28d110849597ffb4bea26faa5eac7c",
    tokenIn: "0x1111111111111111111111111111111111111111",
    tokenOut: "0xc5a249fb0f9de24ef73d19f832d89e8ebd98016015b8501d3171205e445d05ef",
    amountIn: "1000000000000000000",
    amountOut: "2000000000000000000",
    expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    nonce: 2,
};

const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

app.get('/sign', async (req, res) => {
    try {
        const tx = await signOrder(provider, fusionOrderExample);
        res.json(tx);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message || "Unknown error" });
    }
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
import { ethers } from "ethers";
// import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { TypedDataDomain } from "ethers";
import { FusionOrder, EIP712Domain } from "./types";

const domain: EIP712Domain = {
  name: "FusionHTLC",
  chainId: 84532,
  version: "1",
  verifyingContract: "0x1F280C39097cc81D1cc460544e5C1FE0964801c0", // Your deployed contract
};

const types = {
  FusionOrder: [
    { name: "maker", type: "address" },
    { name: "taker", type: "address" },
    { name: "suiRecipient", type: "string" },
    { name: "tokenIn", type: "address" },
    { name: "tokenOut", type: "string" },
    { name: "amountIn", type: "uint256" },
    { name: "amountOut", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

export async function signOrder(
  provider: ethers.JsonRpcProvider,
  order: FusionOrder
): Promise<string> {
  const signer = new ethers.Wallet("672f2093e66f1769515da9289e89ce4643c0dbe36b4fb25a3c50b6a7df2219d5" , provider)
  return await signer.signTypedData(domain as TypedDataDomain, types, order);
}

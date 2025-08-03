// File: types.ts
export interface FusionOrder {
  maker: string; // Ethereum address
  taker?: string; // Optional taker address (if known)
  suiRecipient: string; // Sui address where SUI tokens/NFTs should go
  tokenIn: string; // Token the maker wants to give (ERC20 address)
  tokenOut: string; // Token the maker wants to receive (could be SUI or bridged token address)
  amountIn: string;
  amountOut: string;
  expiry: number; // Unix timestamp
  nonce: number;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface SignedOrder extends FusionOrder {
  signature: string;
}

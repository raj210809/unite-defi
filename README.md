# SuiFusion: Cross-Chain Atomic Swaps via Dutch Auction Protocol

<div align="center">
  <img src="https://github.com/user-attachments/assets/addc338c-9604-4f88-9fb9-18955e24e45d" alt="SuiFusion" width="200">
</div>

<div align="center">

[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Sui](https://img.shields.io/badge/Sui-4DA2FF?style=for-the-badge&logo=sui&logoColor=white)](https://sui.io)
[![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)](https://ethereum.org)
[![MetaMask](https://img.shields.io/badge/MetaMask-F6851B?style=for-the-badge&logo=metamask&logoColor=white)](https://metamask.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
</div>

**A novel extension for 1inch Fusion+ enabling trustless, atomic cross-chain swaps between Ethereum (Base Sepolia) and Sui through Dutch Auction mechanisms and custom escrow protocols.**

---

## Table of Contents

- [Overview](#overview)
- [Core Architecture](#core-architecture)
- [System Components](#system-components)
- [Protocol Flow](#protocol-flow)
- [Smart Contract Implementation](#smart-contract-implementation)
- [Dutch Auction Mechanism](#dutch-auction-mechanism)
- [Security Model](#security-model)
- [Technical Implementation](#technical-implementation)
- [Deployment Guide](#deployment-guide)
- [API Reference](#api-reference)
- [Contributing](#contributing)

---

## Overview

SuiFusion introduces a groundbreaking approach to cross-chain asset swaps by combining Hash Time Locked Contracts (HTLCs) with competitive Dutch auction pricing. Unlike traditional bridge-based solutions, SuiFusion ensures true atomicity and eliminates counterparty risk through on-chain escrow mechanisms deployed on both source and destination chains.

### Key Innovation Points

- **Trustless Atomic Swaps**: No intermediate custody or centralized authority required
- **Dutch Auction Price Discovery**: Real-time competitive pricing through resolver participation
- **Multi-Chain HTLC Implementation**: Custom escrow contracts on both EVM and Move ecosystems
- **Event-Driven Architecture**: Sophisticated off-chain coordination with on-chain settlement
- **1inch Fusion+ Integration**: Built as a natural extension to existing 1inch infrastructure

### Supported Networks

| Network | Type | Contract Language | Status |
|---------|------|-------------------|---------|
| Base Sepolia | EVM | Solidity | Live |
| Sui Devnet | Move | Move | Live |

---

## Core Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        FE[Frontend Application]
        WS[WebSocket Connection]
    end
    
    subgraph "Application Layer"
        API[REST API Server]
        REL[Event Relayer Service]
        DB[(SQLite Database)]
    end
    
    subgraph "Blockchain Layer - Ethereum"
        DA[Dutch Auction Contract]
        ESC_ETH[Escrow Factory]
        LOP[Limit Order Protocol]
    end
    
    subgraph "Blockchain Layer - Sui"
        ESC_SUI[Escrow Module]
        FAC_SUI[Escrow Factory]
    end
    
    subgraph "Resolver Network"
        RES1[Resolver Bot 1]
        RES2[Resolver Bot 2]
        RESN[Resolver Bot N]
    end
    
    FE --> API
    FE <--> WS
    API --> DB
    API --> REL
    REL --> DA
    REL --> ESC_ETH
    REL --> ESC_SUI
    REL <--> RES1
    REL <--> RES2
    REL <--> RESN
    
    DA --> LOP
    RES1 --> ESC_SUI
    RES2 --> ESC_SUI
    RESN --> ESC_SUI
```

### System Component Distribution

```mermaid
pie title System Component Distribution
    "Smart Contracts" : 25
    "Backend Services" : 30
    "Frontend Interface" : 15
    "Relayer Infrastructure" : 20
    "Database & Storage" : 10
```

---

## System Components

### 1. Frontend Application (`frontend/`)

**Technology Stack**: React, TypeScript, Web3 Integration
**Purpose**: User interface for order creation, tracking, and management

**Key Features**:
- Order submission interface with real-time validation
- Dutch auction progress visualization
- Transaction status tracking
- Multi-wallet support (MetaMask, Sui Wallet)

### 2. Backend Server (`another-server/`)

**Technology Stack**: Node.js, Express, TypeScript, SQLite
**Purpose**: Order management, API endpoints, and business logic coordination

**Database Schema**:

```mermaid
erDiagram
    orders ||--|| dutch_auctions : "has"
    
    orders {
        string orderId PK
        string secret
        string secretHash
        string resolverAddress
        integer auctionStart
        string amount
        string status
        timestamp createdAt
        string maker
        string suiAsset
        string takerAsset
        string makingAmount
        string takingAmount
        string minReturnAmount
        boolean verified
    }
    
    dutch_auctions {
        string orderId PK
        string auctionOrderId
        string amount
        string startRate
        string minReturnAmount
        string decreaseRates
    }
```

### 3. Event Relayer

**Technology Stack**: Node.js, TypeScript, WebSocket, Blockchain SDKs
**Purpose**: Cross-chain event monitoring and coordination

**Service Architecture**:

```mermaid
graph LR
    subgraph "Event Sources"
        ETH_EVENTS[Ethereum Events]
        SUI_EVENTS[Sui Events]
    end
    
    subgraph "Relayer Core"
        EVENT_PARSER[Event Parser]
        MESSAGE_QUEUE[Message Queue]
        WS_SERVER[WebSocket Server]
    end
    
    subgraph "Event Consumers"
        RESOLVERS[Resolver Bots]
        FRONTEND[Frontend Clients]
        API_SERVER[API Server]
    end
    
    ETH_EVENTS --> EVENT_PARSER
    SUI_EVENTS --> EVENT_PARSER
    EVENT_PARSER --> MESSAGE_QUEUE
    MESSAGE_QUEUE --> WS_SERVER
    WS_SERVER --> RESOLVERS
    WS_SERVER --> FRONTEND
    WS_SERVER --> API_SERVER
```

### 4. Smart Contracts

#### Ethereum Contracts (`contracts/`)

**FusionDutchAuction.sol**: Core auction mechanism with discrete rate steps
**EscrowSrc.sol**: HTLC implementation for source chain asset locking
**EscrowFactory.sol**: Factory pattern for escrow deployment

#### Sui Contracts (`suicontracts/escrow/`)

**escrow.move**: Move-based HTLC implementation
**escrow_factory.move**: Factory module for escrow instantiation

---

## Protocol Flow

### Complete Order Lifecycle

```mermaid
sequenceDiagram
    participant User as Maker
    participant FE as Frontend
    participant API as API Server
    participant REL as Relayer
    participant DA as Dutch Auction
    participant RES as Resolver
    participant ETH_ESC as Ethereum Escrow
    participant SUI_ESC as Sui Escrow
    
    User->>FE: Submit swap order
    FE->>API: POST /order
    API->>DA: createOrder()
    DA-->>REL: OrderCreated event
    
    Note over REL: Auction begins
    REL-->>RES: Broadcast order
    
    loop Dutch Auction Process
        RES->>RES: Calculate profitability
        RES->>DA: getCurrentRate()
        DA-->>RES: Current auction rate
    end
    
    RES->>SUI_ESC: create_escrow()
    SUI_ESC-->>REL: EscrowCreated event
    REL-->>User: Notify escrow ready
    
    User->>REL: Reveal secret
    REL-->>RES: Forward secret
    
    RES->>ETH_ESC: claim(secret)
    ETH_ESC->>RES: Transfer assets
    
    User->>SUI_ESC: claim(secret)
    SUI_ESC->>User: Transfer assets
    
    Note over User, SUI_ESC: Atomic swap completed
```

### State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> OrderCreated
    
    OrderCreated --> AuctionActive : Dutch auction starts
    AuctionActive --> EscrowDeployed : Resolver creates escrow
    AuctionActive --> Expired : Timeout reached
    
    EscrowDeployed --> SecretRevealed : Maker reveals secret
    EscrowDeployed --> RefundInitiated : Timeout reached
    
    SecretRevealed --> AssetsTransferred : Both parties claim
    RefundInitiated --> Refunded : Assets returned
    
    AssetsTransferred --> [*]
    Refunded --> [*]
    Expired --> [*]
```

---

## Smart Contract Implementation

### Dutch Auction Contract

The FusionDutchAuction contract implements a sophisticated pricing mechanism with discrete rate steps:

```solidity
struct Order {
    address user;
    address srcToken;
    uint256 amount;
    uint256 auctionStart;
    uint256 startrate;
    uint256 minReturnAmount;
    uint256[] decrease_rates;
    bool filled;
}

function getCurrentRate(bytes32 orderId) public view returns (uint256) {
    Order storage order = orders[orderId];
    require(order.user != address(0), "Order not found");

    if (block.timestamp < order.auctionStart) {
        return order.startrate;
    }

    uint256 elapsed = block.timestamp - order.auctionStart;
    uint256 totalDecrease;
    uint256 stepsToCalculate = elapsed > order.decrease_rates.length 
        ? order.decrease_rates.length 
        : elapsed;
    
    for (uint256 i = 0; i < stepsToCalculate; i++) {
        totalDecrease += order.decrease_rates[i];
    }

    uint256 currentRate = order.startrate > totalDecrease 
        ? order.startrate - totalDecrease 
        : 0;
    
    return currentRate > order.minReturnAmount 
        ? currentRate 
        : order.minReturnAmount;
}
```

### HTLC Implementation

#### Ethereum Escrow

```solidity
contract EscrowSrc {
    address public maker;
    IERC20 public asset;
    uint256 public amount;
    bytes32 public hashlock;
    uint256 public timelock;
    bool public claimed;
    bool public refunded;

    function claim(bytes32 secret) external {
        require(!claimed && !refunded, "Already handled");
        require(keccak256(abi.encodePacked(secret)) == hashlock, "Invalid secret");
        require(block.timestamp < timelock, "Timelock expired");
        
        claimed = true;
        require(asset.transfer(msg.sender, amount), "Transfer failed");
    }

    function refund() external {
        require(!claimed && !refunded, "Already handled");
        require(block.timestamp >= timelock, "Timelock not expired");
        require(msg.sender == maker, "Only maker can refund");
        
        refunded = true;
        require(asset.transfer(maker, amount), "Transfer failed");
    }
}
```

#### Sui Escrow (Move)

```move
module escrow::escrow {
    use sui::event;
    use sui::object::{new, uid_to_inner, delete};
    use sui::transfer::public_transfer;
    use sui::coin::{Coin, value, into_balance, from_balance};
    use sui::balance::Balance;

    public struct Escrow<phantom T> has key, store {
        id: UID,
        maker: address,
        asset: Balance<T>,
        hashlock: vector<u8>,
        timelock: u64,
        claimed: bool,
        refunded: bool,
    }

    public fun create_escrow<T>(
        maker: address,
        asset: Coin<T>,
        hashlock: vector<u8>,
        timelock: u64,
        ctx: &mut TxContext
    ): Escrow<T> {
        let id = new(ctx);
        let amount = value(&asset);
        let asset_balance = into_balance(asset);
        let escrow = Escrow {
            id,
            maker,
            asset: asset_balance,
            hashlock,
            timelock,
            claimed: false,
            refunded: false,
        };
        
        let escrow_id = uid_to_inner(&escrow.id);
        event::emit(EscrowCreated {
            escrow_id,
            maker,
            amount,
            hashlock,
            timelock,
        });
        
        escrow
    }

    public fun claim<T>(
        escrow: Escrow<T>,
        secret: vector<u8>,
        c...
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract FusionHTLC {
    using ECDSA for bytes32;

    struct Order {
        address token;
        address maker;
        address taker;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bytes32 orderId;
    }

    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant ORDER_TYPEHASH =
        keccak256(
            "Order(address token,address maker,address taker,uint256 amount,bytes32 hashlock,uint256 timelock,bytes32 orderId)"
        );

    mapping(bytes32 => bool) public claimed;
    mapping(bytes32 => bool) public refunded;

    event OrderFilled(bytes32 indexed orderId, address indexed maker, address indexed taker, bytes32 secret);
    event OrderRefunded(bytes32 indexed orderId, address indexed maker);

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("FusionHTLC")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function fillOrder(
        address token,
        address maker,
        address taker,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        bytes32 orderId,
        bytes calldata secret,
        bytes calldata signature
    ) external {
        require(!claimed[orderId], "Order already claimed");
        require(!refunded[orderId], "Order already refunded");
        require(msg.sender == taker, "Only taker can fill order");
        require(block.timestamp < timelock, "Timelock expired");
        require(keccak256(secret) == hashlock, "Invalid secret");

        // Build struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                ORDER_TYPEHASH,
                token,
                maker,
                taker,
                amount,
                hashlock,
                timelock,
                orderId
            )
        );

        // EIP-712 digest
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        // Verify signature
        address recovered = digest.recover(signature);
        require(recovered == maker, "Invalid signature from maker");

        // Transfer tokens from maker to taker
        require(
            IERC20(token).transferFrom(maker, taker, amount),
            "Token transfer failed"
        );

        claimed[orderId] = true;
        emit OrderFilled(orderId, maker, taker, keccak256(secret));
    }

    function refundOrder(
        address token,
        address maker,
        address taker,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        bytes32 orderId,
        bytes calldata signature
    ) external {
        require(!claimed[orderId], "Order already claimed");
        require(!refunded[orderId], "Already refunded");
        require(msg.sender == maker, "Only maker can refund");
        require(block.timestamp >= timelock, "Timelock not expired");

        // Verify signature (same logic)
        bytes32 structHash = keccak256(
            abi.encode(
                ORDER_TYPEHASH,
                token,
                maker,
                taker,
                amount,
                hashlock,
                timelock,
                orderId
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = digest.recover(signature);
        require(recovered == maker, "Invalid signature from maker");

        refunded[orderId] = true;
        emit OrderRefunded(orderId, maker);
    }
}

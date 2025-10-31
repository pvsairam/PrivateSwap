// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "fhevm-contracts/contracts/token/ERC20/ConfidentialERC20.sol";

/**
 * @title EncryptedPUSD
 * @notice Encrypted Private USD token using Zama's FHEVM (Fully Homomorphic Encryption)
 * @dev Extends ConfidentialERC20 for encrypted balances and transfers
 * 
 * Key Features:
 * - All balances stored as encrypted euint64
 * - Transfers happen without revealing amounts on-chain
 * - Only authorized parties can decrypt balances
 * - Uses TFHE operations for encrypted arithmetic
 */
contract EncryptedPUSD is ConfidentialERC20 {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() ConfidentialERC20("Encrypted Private USD", "ePUSD") {
        owner = msg.sender;
    }

    /**
     * @notice Mint encrypted tokens from a plaintext amount
     * @dev Faucet-friendly function that converts plaintext to encrypted
     * @param to Recipient address
     * @param amount Amount in plaintext (will be encrypted on-chain)
     */
    function mint(address to, uint64 amount) external onlyOwner {
        _unsafeMint(to, amount);
    }

    /**
     * @notice Transfer ownership of the contract
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}

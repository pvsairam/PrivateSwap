// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemoToken
 * @notice Simplified ERC20 token for PrivateSwap demonstration
 * @dev This is a standard ERC20. In production with FHEVM, balances would be euint64 (encrypted)
 * 
 * FHEVM Production Version Would Include:
 * - mapping(address => euint64) private _balances; // Encrypted balances
 * - TFHE library for homomorphic operations
 * - Re-encryption protocol for balance viewing
 * - Zero-knowledge proofs for transfers
 */
contract DemoToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {}

    /**
     * @notice Mint tokens to an address
     * @dev Owner-only minting for demonstration purposes
     * In production FHEVM version:
     * - Would take einput encryptedAmount and bytes calldata inputProof
     * - Balance would be euint64, updated with TFHE.add()
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from sender
     * @dev For demonstration purposes
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

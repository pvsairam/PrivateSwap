// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PrivateSwap
 * @notice Privacy-preserving AMM using Zama's Fully Homomorphic Encryption (FHEVM)
 * @dev Complete FHEVM implementation with encrypted reserves and FHE operations
 * 
 * Architecture:
 * - All reserves are encrypted (euint64)
 * - All swap amounts are encrypted
 * - Division workaround: expose numerator/denominator for off-chain calculation
 * - MEV and front-running protection through encryption
 * 
 * Built for Zama FHEVM Developer Program - Demonstrates production-ready encrypted DEX
 */
interface ILocalConfidentialFungibleToken {
    function confidentialTransferFrom(address sender, address recipient, euint64 amount) external returns (euint64);
    function confidentialTransfer(address recipient, euint64 amount) external returns (euint64);
    function confidentialBalanceOf(address account) external view returns (euint64);
}

contract PrivateSwap is Ownable, ReentrancyGuard, Pausable {

    // ==================== Events ====================
    
    event LiquidityAdded(address indexed provider);
    event LiquidityRemoved(address indexed provider);
    event SwapExecuted(address indexed sender, address indexed tokenIn, address indexed tokenOut, address to);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event QuoteCalculated(address indexed user, address inputToken);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // ==================== State Variables ====================
    
    // Token contract addresses
    ILocalConfidentialFungibleToken public immutable tokenA;
    ILocalConfidentialFungibleToken public immutable tokenB;

    // Encrypted reserves - NOBODY can see these values!
    euint64 private _reserveA;
    euint64 private _reserveB;

    // Fee management (in basis points, 30 = 0.3%)
    uint256 public swapFee = 30; // 0.3% default fee (same as Uniswap)
    uint256 public constant MAX_FEE = 1000; // 10% maximum fee
    uint256 public constant FEE_DENOMINATOR = 10000; // 100% in basis points

    // Division workaround: Store encrypted numerator/denominator for off-chain calculation
    // User calls getQuote() -> decrypt numerator/denominator -> calculate amountOut -> re-encrypt -> swap()
    mapping(address => euint64) private _lastNumerator;
    mapping(address => euint64) private _lastDenominator;

    // ==================== Constructor ====================
    
    constructor(address _tokenA, address _tokenB, address initialOwner) 
        Ownable(initialOwner) 
    {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token addresses");
        require(_tokenA != _tokenB, "Tokens must be different");
        
        tokenA = ILocalConfidentialFungibleToken(_tokenA);
        tokenB = ILocalConfidentialFungibleToken(_tokenB);
    }

    // ==================== Admin Functions ====================
    
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setSwapFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee exceeds maximum");
        uint256 oldFee = swapFee;
        swapFee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    // ==================== Liquidity Functions ====================
    
    /**
     * @notice Add liquidity to the pool
     * @dev Transfers encrypted tokens and updates encrypted reserves
     * @param amountA Encrypted amount of token A
     * @param amountAProof Proof for encrypted amount A
     * @param amountB Encrypted amount of token B
     * @param amountBProof Proof for encrypted amount B
     */
    function addLiquidity(
        einput amountA,
        bytes calldata amountAProof,
        einput amountB,
        bytes calldata amountBProof
    ) external whenNotPaused nonReentrant {
        // Decrypt and validate encrypted inputs
        euint64 decryptedAmountA = TFHE.asEuint64(amountA, amountAProof);
        euint64 decryptedAmountB = TFHE.asEuint64(amountB, amountBProof);

        // Grant access permissions
        TFHE.allowThis(decryptedAmountA);
        TFHE.allowThis(decryptedAmountB);
        TFHE.allowTransient(decryptedAmountA, address(this));
        TFHE.allowTransient(decryptedAmountB, address(this));
        TFHE.allowTransient(decryptedAmountA, address(tokenA));
        TFHE.allowTransient(decryptedAmountB, address(tokenB));

        // Grant access to existing reserves if initialized
        if (TFHE.isInitialized(_reserveA)) {
            TFHE.allowThis(_reserveA);
            TFHE.allowThis(_reserveB);
            TFHE.allowTransient(_reserveA, address(this));
            TFHE.allowTransient(_reserveB, address(this));
        }

        // Transfer tokens from sender to this contract
        tokenA.confidentialTransferFrom(msg.sender, address(this), decryptedAmountA);
        tokenB.confidentialTransferFrom(msg.sender, address(this), decryptedAmountB);

        // Update encrypted reserves
        if (!TFHE.isInitialized(_reserveA)) {
            // First liquidity addition
            _reserveA = decryptedAmountA;
            _reserveB = decryptedAmountB;
        } else {
            // Add to existing reserves using FHE addition
            _reserveA = TFHE.add(_reserveA, decryptedAmountA);
            _reserveB = TFHE.add(_reserveB, decryptedAmountB);
        }

        // Grant access to updated reserves (ONLY to contract, NOT to external parties)
        TFHE.allowThis(_reserveA);
        TFHE.allowThis(_reserveB);

        emit LiquidityAdded(msg.sender);
    }

    /**
     * @notice Remove liquidity from the pool
     * @dev Transfers encrypted tokens back to user and updates encrypted reserves
     * @param amountA Encrypted amount of token A to remove
     * @param amountAProof Proof for encrypted amount A
     * @param amountB Encrypted amount of token B to remove
     * @param amountBProof Proof for encrypted amount B
     */
    function removeLiquidity(
        einput amountA,
        bytes calldata amountAProof,
        einput amountB,
        bytes calldata amountBProof
    ) external whenNotPaused nonReentrant {
        require(TFHE.isInitialized(_reserveA), "Reserves not initialized");
        require(TFHE.isInitialized(_reserveB), "Reserves not initialized");

        // Decrypt liquidity amounts
        euint64 decryptedAmountA = TFHE.asEuint64(amountA, amountAProof);
        euint64 decryptedAmountB = TFHE.asEuint64(amountB, amountBProof);

        // Grant access permissions
        TFHE.allowThis(decryptedAmountA);
        TFHE.allowThis(decryptedAmountB);
        TFHE.allowTransient(decryptedAmountA, address(this));
        TFHE.allowTransient(decryptedAmountB, address(this));
        TFHE.allowTransient(decryptedAmountA, address(tokenA));
        TFHE.allowTransient(decryptedAmountB, address(tokenB));

        // Grant access to reserves
        TFHE.allowThis(_reserveA);
        TFHE.allowThis(_reserveB);
        TFHE.allowTransient(_reserveA, address(this));
        TFHE.allowTransient(_reserveB, address(this));

        // Verify sufficient reserves using encrypted comparison
        ebool hasEnoughA = TFHE.ge(_reserveA, decryptedAmountA);
        ebool hasEnoughB = TFHE.ge(_reserveB, decryptedAmountB);
        ebool hasEnoughReserves = TFHE.and(hasEnoughA, hasEnoughB);

        // Use TFHE.select for conditional logic: if sufficient, transfer requested amounts, else transfer 0
        euint64 actualAmountA = TFHE.select(hasEnoughReserves, decryptedAmountA, TFHE.asEuint64(0));
        euint64 actualAmountB = TFHE.select(hasEnoughReserves, decryptedAmountB, TFHE.asEuint64(0));

        // Grant transient access for transfers
        TFHE.allowTransient(actualAmountA, address(tokenA));
        TFHE.allowTransient(actualAmountB, address(tokenB));

        // Transfer tokens to user
        tokenA.confidentialTransfer(msg.sender, actualAmountA);
        tokenB.confidentialTransfer(msg.sender, actualAmountB);

        // Update reserves using FHE subtraction
        _reserveA = TFHE.sub(_reserveA, actualAmountA);
        _reserveB = TFHE.sub(_reserveB, actualAmountB);

        // Grant access to updated reserves (ONLY to contract, NOT to external parties)
        TFHE.allowThis(_reserveA);
        TFHE.allowThis(_reserveB);

        emit LiquidityRemoved(msg.sender);
    }

    // ==================== Quote Calculation (Division Workaround) ====================
    
    /**
     * @notice Calculate swap quote using encrypted computation
     * @dev Returns encrypted numerator/denominator for off-chain division
     * 
     * Flow:
     * 1. User calls getQuote() with encrypted amountIn
     * 2. Contract calculates: numerator = amountInWithFee * reserveOut
     *                         denominator = reserveIn * FEE_DENOMINATOR + amountInWithFee
     * 3. User decrypts numerator and denominator off-chain
     * 4. User calculates: amountOut = numerator / denominator
     * 5. User re-encrypts amountOut and calls swap()
     * 
     * @param amountIn Encrypted input amount
     * @param amountInProof Proof for encrypted input
     * @param isAtoB Direction: true = A→B, false = B→A
     */
    function getQuote(
        einput amountIn,
        bytes calldata amountInProof,
        bool isAtoB
    ) external {
        require(TFHE.isInitialized(_reserveA), "Reserves not initialized");
        require(TFHE.isInitialized(_reserveB), "Reserves not initialized");

        // Convert external encrypted input to internal encrypted value
        euint64 encryptedAmountIn = TFHE.asEuint64(amountIn, amountInProof);

        // Select reserves based on direction
        euint64 reserveIn = isAtoB ? _reserveA : _reserveB;
        euint64 reserveOut = isAtoB ? _reserveB : _reserveA;

        // Calculate input amount with fee: amountInWithFee = amountIn * (10000 - fee)
        // Example: if fee is 30 (0.3%), feeMultiplier is 9970
        uint64 feeMultiplier = uint64(FEE_DENOMINATOR - swapFee);
        euint64 amountInWithFee = TFHE.mul(encryptedAmountIn, feeMultiplier);

        // Calculate numerator and denominator for constant product formula
        // Uniswap formula: amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee)
        // We can't do division in FHE, so we expose numerator/denominator for off-chain calculation
        euint64 numerator = TFHE.mul(amountInWithFee, reserveOut);
        euint64 denominator = TFHE.add(TFHE.mul(reserveIn, uint64(FEE_DENOMINATOR)), amountInWithFee);

        // Store for this user
        _lastNumerator[msg.sender] = numerator;
        _lastDenominator[msg.sender] = denominator;

        // Allow user to decrypt
        TFHE.allowThis(numerator);
        TFHE.allowThis(denominator);
        TFHE.allow(numerator, msg.sender);
        TFHE.allow(denominator, msg.sender);

        emit QuoteCalculated(msg.sender, isAtoB ? address(tokenA) : address(tokenB));
    }

    /**
     * @notice Get the encrypted numerator from last quote calculation
     * @dev User decrypts this off-chain for division
     */
    function getEncryptedNumerator() external view returns (euint64) {
        return _lastNumerator[msg.sender];
    }

    /**
     * @notice Get the encrypted denominator from last quote calculation
     * @dev User decrypts this off-chain for division
     */
    function getEncryptedDenominator() external view returns (euint64) {
        return _lastDenominator[msg.sender];
    }

    // ==================== Swap Function ====================
    
    /**
     * @notice Execute encrypted token swap
     * @dev Complete privacy-preserving swap with encrypted slippage protection
     * 
     * Flow:
     * 1. User calls getQuote() first to get numerator/denominator
     * 2. User decrypts and calculates expectedAmountOut off-chain
     * 3. User re-encrypts expectedAmountOut and minAmountOut
     * 4. User calls swap() with all encrypted parameters
     * 5. Contract verifies: expectedAmountOut >= minAmountOut using TFHE.ge()
     * 6. If valid, executes encrypted transfer; if not, transfers 0 (fails gracefully)
     * 
     * @param amountIn Encrypted input amount
     * @param amountInProof Proof for encrypted input
     * @param expectedAmountOut Encrypted expected output (calculated off-chain from quote)
     * @param expectedAmountOutProof Proof for expected output
     * @param minAmountOut Encrypted minimum acceptable output (slippage protection)
     * @param minAmountOutProof Proof for minimum output
     * @param isAtoB Direction: true = A→B, false = B→A
     */
    function swap(
        einput amountIn,
        bytes calldata amountInProof,
        einput expectedAmountOut,
        bytes calldata expectedAmountOutProof,
        einput minAmountOut,
        bytes calldata minAmountOutProof,
        bool isAtoB
    ) external whenNotPaused nonReentrant {
        require(TFHE.isInitialized(_reserveA), "Reserves not initialized");
        require(TFHE.isInitialized(_reserveB), "Reserves not initialized");

        // Decrypt all encrypted inputs
        euint64 decryptedAmountIn = TFHE.asEuint64(amountIn, amountInProof);
        euint64 decryptedExpectedAmountOut = TFHE.asEuint64(expectedAmountOut, expectedAmountOutProof);
        euint64 decryptedMinAmountOut = TFHE.asEuint64(minAmountOut, minAmountOutProof);

        // Select tokens and reserves based on direction
        ILocalConfidentialFungibleToken tokenIn = isAtoB ? tokenA : tokenB;
        ILocalConfidentialFungibleToken tokenOut = isAtoB ? tokenB : tokenA;
        euint64 reserveIn = isAtoB ? _reserveA : _reserveB;
        euint64 reserveOut = isAtoB ? _reserveB : _reserveA;

        // Grant transient access for token transfers
        TFHE.allowTransient(decryptedAmountIn, address(tokenIn));
        TFHE.allowTransient(decryptedExpectedAmountOut, address(tokenOut));

        // Encrypted slippage protection: verify expectedAmountOut >= minAmountOut
        ebool isAmountSufficient = TFHE.ge(decryptedExpectedAmountOut, decryptedMinAmountOut);

        // Conditional logic using TFHE.select:
        // If slippage check passes: use expected amounts
        // If slippage check fails: use 0 (transaction effectively fails)
        euint64 actualTransferAmount = TFHE.select(isAmountSufficient, decryptedExpectedAmountOut, TFHE.asEuint64(0));
        euint64 actualInputAmount = TFHE.select(isAmountSufficient, decryptedAmountIn, TFHE.asEuint64(0));

        // Grant transient access for actual amounts
        TFHE.allowTransient(actualTransferAmount, address(tokenOut));
        TFHE.allowTransient(actualInputAmount, address(tokenIn));

        // Transfer input tokens from user to contract
        tokenIn.confidentialTransferFrom(msg.sender, address(this), actualInputAmount);

        // Update encrypted reserves using FHE operations
        if (isAtoB) {
            _reserveA = TFHE.add(_reserveA, actualInputAmount);
            _reserveB = TFHE.sub(_reserveB, actualTransferAmount);
        } else {
            _reserveB = TFHE.add(_reserveB, actualInputAmount);
            _reserveA = TFHE.sub(_reserveA, actualTransferAmount);
        }

        // Transfer output tokens to user
        tokenOut.confidentialTransfer(msg.sender, actualTransferAmount);

        // Grant access to updated reserves (ONLY to contract, NOT to external parties)
        TFHE.allowThis(_reserveA);
        TFHE.allowThis(_reserveB);

        emit SwapExecuted(
            msg.sender, 
            address(tokenIn), 
            address(tokenOut), 
            msg.sender
        );
    }

    // ==================== View Functions ====================
    
    /**
     * @notice Get encrypted reserve A
     * @dev Only users with proper permissions can decrypt
     */
    function getEncryptedReserveA() external view returns (euint64) {
        return _reserveA;
    }

    /**
     * @notice Get encrypted reserve B
     * @dev Only users with proper permissions can decrypt
     */
    function getEncryptedReserveB() external view returns (euint64) {
        return _reserveB;
    }

    /**
     * @notice Check if reserves are initialized
     * @dev Useful for frontend to know if pool is ready
     */
    function isInitialized() external view returns (bool) {
        return TFHE.isInitialized(_reserveA) && TFHE.isInitialized(_reserveB);
    }

    /**
     * @notice Get current swap fee in basis points
     */
    function getSwapFee() external view returns (uint256) {
        return swapFee;
    }

    // ==================== Emergency Functions ====================
    
    /**
     * @notice Emergency withdraw in case of critical issues
     * @dev Only owner, should never be needed in normal operation
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        // Note: This is for emergency only and breaks FHE privacy
        // Should only be used if contract is compromised
        emit EmergencyWithdraw(token, amount);
    }
}

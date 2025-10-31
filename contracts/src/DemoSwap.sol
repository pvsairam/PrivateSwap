// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DemoSwap
 * @notice Simplified AMM for PrivateSwap demonstration
 * @dev This is a standard AMM. In production with FHEVM, all amounts would be encrypted
 * 
 * FHEVM Production Version Would Include:
 * - euint64 private reserveA; // Encrypted reserves
 * - euint64 private reserveB;
 * - TFHE operations for all calculations (mul, div, add, sub, ge, le)
 * - Encrypted input parameters: einput encryptedAmountIn, bytes calldata inputProof
 * - Encrypted slippage checks using TFHE.ge(amountOut, minAmountOut)
 * - Only success/failure publicly visible, amounts remain private
 */
contract DemoSwap is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public feeNumerator = 30; // 0.3% fee

    event Swap(address indexed user, bool aToB, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB);
    event FeeUpdated(uint256 newFee);

    constructor(address _tokenA, address _tokenB) Ownable(msg.sender) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token addresses");
        require(_tokenA != _tokenB, "Tokens must be different");
        
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    /**
     * @notice Swap tokens using constant product AMM formula
     * @dev In FHEVM production:
     * - All parameters would be encrypted (einput encryptedAmountIn, bytes calldata inputProof)
     * - Calculations done with TFHE library on encrypted values
     * - Slippage check: TFHE.ge(amountOut, minAmountOut) in encrypted space
     * - Event would not emit amounts (only success indicator)
     */
    function swap(
        bool aToB,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be > 0");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");

        // Calculate output amount with fee
        (amountOut,) = _calculateSwap(aToB, amountIn);
        require(amountOut >= minAmountOut, "Insufficient output amount");

        if (aToB) {
            // Transfer token A from user
            tokenA.safeTransferFrom(msg.sender, address(this), amountIn);
            
            // Update reserves (in FHEVM: TFHE.add/sub on encrypted values)
            uint256 fee = (amountIn * feeNumerator) / FEE_DENOMINATOR;
            reserveA += amountIn - fee;
            reserveB -= amountOut;
            
            // Transfer token B to user
            tokenB.safeTransfer(msg.sender, amountOut);
        } else {
            // Transfer token B from user
            tokenB.safeTransferFrom(msg.sender, address(this), amountIn);
            
            // Update reserves
            uint256 fee = (amountIn * feeNumerator) / FEE_DENOMINATOR;
            reserveB += amountIn - fee;
            reserveA -= amountOut;
            
            // Transfer token A to user
            tokenA.safeTransfer(msg.sender, amountOut);
        }

        emit Swap(msg.sender, aToB, amountIn, amountOut);
    }

    /**
     * @notice Add liquidity to the pool
     * @dev In FHEVM production: Parameters would be encrypted
     */
    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant whenNotPaused {
        require(amountA > 0 && amountB > 0, "Amounts must be > 0");

        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), amountB);

        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB);
    }

    /**
     * @notice Remove liquidity from the pool
     * @dev In FHEVM production: Parameters would be encrypted
     */
    function removeLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant whenNotPaused {
        require(amountA <= reserveA && amountB <= reserveB, "Insufficient liquidity");

        reserveA -= amountA;
        reserveB -= amountB;

        tokenA.safeTransfer(msg.sender, amountA);
        tokenB.safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB);
    }

    /**
     * @notice Calculate swap output amount
     * @dev In FHEVM production: All calculations would use TFHE operations
     * - TFHE.mul(), TFHE.div(), TFHE.add(), TFHE.sub()
     * - Returns euint64 instead of uint256
     */
    function _calculateSwap(
        bool aToB,
        uint256 amountIn
    ) internal view returns (uint256 amountOut, uint256 newReserveIn) {
        uint256 currentReserveIn = aToB ? reserveA : reserveB;
        uint256 currentReserveOut = aToB ? reserveB : reserveA;

        // Apply fee
        uint256 fee = (amountIn * feeNumerator) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        // Constant product formula: x * y = k
        // amountOut = (amountInAfterFee * currentReserveOut) / (currentReserveIn + amountInAfterFee)
        uint256 numerator = amountInAfterFee * currentReserveOut;
        uint256 denominator = currentReserveIn + amountInAfterFee;
        amountOut = numerator / denominator;
        
        newReserveIn = currentReserveIn + amountInAfterFee;
    }

    /**
     * @notice Get current exchange rate
     * @dev Returns amount of token B received for 1 token A (or vice versa)
     */
    function getExchangeRate(bool aToB) external view returns (uint256) {
        if (reserveA == 0 || reserveB == 0) return 0;
        
        if (aToB) {
            return (reserveB * 1e18) / reserveA;
        } else {
            return (reserveA * 1e18) / reserveB;
        }
    }

    /**
     * @notice Quote swap output amount
     * @dev Used for frontend price display
     */
    function quote(bool aToB, uint256 amountIn) external view returns (uint256 amountOut) {
        if (amountIn == 0 || reserveA == 0 || reserveB == 0) return 0;
        (amountOut,) = _calculateSwap(aToB, amountIn);
    }

    /**
     * @notice Update fee (owner only)
     * @param newFeeNumerator New fee in basis points (max 100 = 1%)
     */
    function updateFee(uint256 newFeeNumerator) external onlyOwner {
        require(newFeeNumerator <= 100, "Fee too high");
        feeNumerator = newFeeNumerator;
        emit FeeUpdated(newFeeNumerator);
    }

    /**
     * @notice Pause contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}

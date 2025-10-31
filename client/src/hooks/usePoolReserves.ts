import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, DEMO_SWAP_ABI } from '@/lib/contracts';

export function usePoolReserves() {
  const { data: reserveA, isLoading: loadingA } = useReadContract({
    address: CONTRACTS.DEMO_SWAP,
    abi: DEMO_SWAP_ABI,
    functionName: 'reserveA',
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: reserveB, isLoading: loadingB } = useReadContract({
    address: CONTRACTS.DEMO_SWAP,
    abi: DEMO_SWAP_ABI,
    functionName: 'reserveB',
    query: {
      refetchInterval: 5000,
    },
  });

  // Calculate output amount using constant product formula
  // amountOut = (amountIn * feeMultiplier * reserveOut) / (reserveIn * 10000 + amountIn * feeMultiplier)
  const calculateSwapOutput = (amountIn: string, isAtoB: boolean): string | null => {
    if (!reserveA || !reserveB || !amountIn || isNaN(parseFloat(amountIn))) {
      return null;
    }

    const amountInBN = BigInt(Math.floor(parseFloat(amountIn) * 1e18));
    const reserveInBN = isAtoB ? reserveA : reserveB;
    const reserveOutBN = isAtoB ? reserveB : reserveA;

    const FEE_DENOMINATOR = BigInt(10000);
    const FEE_NUMERATOR = BigInt(30); // 0.3% fee

    // Calculate: (amountIn * (10000 - 30) * reserveOut) / (reserveIn * 10000 + amountIn * (10000 - 30))
    const feeMultiplier = FEE_DENOMINATOR - FEE_NUMERATOR;
    const numerator = amountInBN * feeMultiplier * (reserveOutBN as bigint);
    const denominator = (reserveInBN as bigint) * FEE_DENOMINATOR + amountInBN * feeMultiplier;

    const amountOutBN = numerator / denominator;
    return parseFloat(formatUnits(amountOutBN, 18)).toFixed(6);
  };

  return {
    reserveA: reserveA ? formatUnits(reserveA as bigint, 18) : '0',
    reserveB: reserveB ? formatUnits(reserveB as bigint, 18) : '0',
    isLoading: loadingA || loadingB,
    calculateSwapOutput,
    hasLiquidity: reserveA && reserveB && reserveA > BigInt(0) && reserveB > BigInt(0),
  };
}

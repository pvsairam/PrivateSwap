import { useAccount, useReadContract, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI, SEPOLIA_TOKENS, Token } from '@/lib/tokens';

export function useTokenBalance(tokenAddress: `0x${string}`, decimals: number) {
  const { address } = useAccount();

  const { data: balance, isLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  const formattedBalance = balance
    ? parseFloat(formatUnits(balance as bigint, decimals)).toFixed(4)
    : '0.00';

  return {
    balance: formattedBalance,
    isLoading,
  };
}

export function useETHBalance() {
  const { address } = useAccount();

  const { data, isLoading } = useBalance({
    address,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  const formattedBalance = data?.value
    ? parseFloat(formatUnits(data.value, 18)).toFixed(4)
    : '0.00';

  return {
    balance: formattedBalance,
    isLoading,
  };
}

// Custom hook to fetch all token balances at once (follows Rules of Hooks)
export function useAllTokenBalances(): Token[] {
  // Call hooks at top level for each token
  const pusd = useTokenBalance(SEPOLIA_TOKENS[0].address, SEPOLIA_TOKENS[0].decimals);
  const peth = useTokenBalance(SEPOLIA_TOKENS[1].address, SEPOLIA_TOKENS[1].decimals);

  return [
    {
      symbol: SEPOLIA_TOKENS[0].symbol,
      name: SEPOLIA_TOKENS[0].name,
      address: SEPOLIA_TOKENS[0].address,
      decimals: SEPOLIA_TOKENS[0].decimals,
      price: SEPOLIA_TOKENS[0].price,
      balance: pusd.balance,
      isLoadingBalance: pusd.isLoading,
    },
    {
      symbol: SEPOLIA_TOKENS[1].symbol,
      name: SEPOLIA_TOKENS[1].name,
      address: SEPOLIA_TOKENS[1].address,
      decimals: SEPOLIA_TOKENS[1].decimals,
      price: SEPOLIA_TOKENS[1].price,
      balance: peth.balance,
      isLoadingBalance: peth.isLoading,
    },
  ];
}

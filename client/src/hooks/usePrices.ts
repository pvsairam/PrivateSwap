import { useQuery } from "@tanstack/react-query";

interface Prices {
  usdt: number;
  eth: number;
}

export function usePrices() {
  return useQuery<Prices>({
    queryKey: ["/api/prices"],
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

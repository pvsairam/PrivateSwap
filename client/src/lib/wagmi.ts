import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'PrivateSwap',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c0e0e3b5f8c8d8f7e6d5c4b3a2918170', // Fallback for testing
  chains: [sepolia],
  ssr: false,
});

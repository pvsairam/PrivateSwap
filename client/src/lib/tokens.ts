import { CONTRACTS } from "./contracts";

// Sepolia testnet token addresses with mock USD prices
export const SEPOLIA_TOKENS = [
  {
    symbol: "PUSD",
    name: "Private USD",
    address: CONTRACTS.PUSD,
    decimals: 18,
    price: 0, // Will be updated with live price
    isEncrypted: false,
  },
  {
    symbol: "PETH",
    name: "Private ETH",
    address: CONTRACTS.PETH,
    decimals: 18,
    price: 0, // Will be updated with live price
    isEncrypted: false,
  },
  {
    symbol: "ePUSD",
    name: "Encrypted Private USD",
    address: CONTRACTS.ENCRYPTED_PUSD,
    decimals: 6, // FHEVM euint64 requires smaller decimals
    price: 0, // Will be updated with live price (same as PUSD/USDT)
    isEncrypted: true,
  },
  {
    symbol: "ePETH",
    name: "Encrypted Private ETH",
    address: CONTRACTS.ENCRYPTED_PETH,
    decimals: 6, // FHEVM euint64 requires smaller decimals
    price: 0, // Will be updated with live price (same as PETH/ETH)
    isEncrypted: true,
  },
] as const;

export type Token = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  price?: number;
  balance?: string;
  isLoadingBalance?: boolean;
  isEncrypted?: boolean;
};

// ERC20 ABI for balanceOf and decimals
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;

// PrivateSwap Contract Addresses on Sepolia Testnet
export const CONTRACTS = {
  // Public demo tokens (deployed on Sepolia with market-accurate ratio)
  PUSD: "0x152a668B68EbFf2d1d2305bDA0D44dDEE41f8Ac6",
  PETH: "0x39A6651112ED9D7cDAD7bc6701f0D6A67c147181",
  
  // Encrypted tokens using Zama FHEVM (deployed on Sepolia)
  ENCRYPTED_PUSD: "0x6D95E7c9BA9a1271B377BcCb5233B4e7d40D0822",
  ENCRYPTED_PETH: "0xc0A50C6B79Fe7754B89460cFdF2685B0913771Ee",
  
  // DemoSwap AMM (deployed on Sepolia) - Pool: 100k PUSD + 26 PETH (1 PETH = ~3,846 PUSD)
  DEMO_SWAP: "0xB13707a8afb851d4Bf976956A6298D800d334F85",
  
  // PrivateSwap FHEVM AMM (deployed on Sepolia)
  PRIVATE_SWAP: "0x612FE77876e6a579cCF0F1266F356b91F9DFb7Df",
} as const;

// DemoToken ABI (Standard ERC20)
export const ENCRYPTED_TOKEN_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// DemoSwap ABI (Public AMM)
export const DEMO_SWAP_ABI = [
  {
    inputs: [],
    name: "tokenA",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenB",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reserveA",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reserveB",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "aToB", type: "bool" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    name: "swap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
    name: "addLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "reserveIn", type: "uint256" },
      { name: "reserveOut", type: "uint256" },
    ],
    name: "calculateOutputAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
] as const;

// PrivateSwap ABI (FHEVM AMM with encrypted operations)
export const PRIVATE_SWAP_ABI = [
  {
    inputs: [],
    name: "tokenA",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenB",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isInitialized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSwapFee",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "amountA", type: "bytes32" },
      { name: "amountAProof", type: "bytes" },
      { name: "amountB", type: "bytes32" },
      { name: "amountBProof", type: "bytes" },
    ],
    name: "addLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "bytes32" },
      { name: "amountInProof", type: "bytes" },
      { name: "isAtoB", type: "bool" },
    ],
    name: "getQuote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "bytes32" },
      { name: "amountInProof", type: "bytes" },
      { name: "expectedAmountOut", type: "bytes32" },
      { name: "expectedAmountOutProof", type: "bytes" },
      { name: "minAmountOut", type: "bytes32" },
      { name: "minAmountOutProof", type: "bytes" },
      { name: "isAtoB", type: "bool" },
    ],
    name: "swap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

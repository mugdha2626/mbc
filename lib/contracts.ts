import { Address } from "viem";

// Contract addresses - update these after deployment
export const TMAP_DISHES_ADDRESS = process.env
  .NEXT_PUBLIC_TMAP_DISHES_CONTRACT_ADDRESS as Address;
export const USDC_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as Address;

// Initial mint amount in USDC (with 6 decimals) - $0.10
export const INITIAL_MINT_AMOUNT = BigInt(100_000);

// TmapDishes contract ABI (only the functions we need)
export const TMAP_DISHES_ABI = [
  {
    name: "createDish",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dishId", type: "bytes32" },
      { name: "metadata", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dishId", type: "bytes32" },
      { name: "usdcAmount", type: "uint256" },
      { name: "referrer", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "dishes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "totalSupply", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "metadata", type: "string" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    name: "getCurrentPrice",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "dishId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTokensForUsdc",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "dishId", type: "bytes32" },
      { name: "usdcAmount", type: "uint256" },
    ],
    outputs: [
      { name: "tokenAmount", type: "uint256" },
      { name: "actualCost", type: "uint256" },
    ],
  },
  {
    name: "getMarketCap",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "dishId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getBalance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "dishId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "calculatePendingRewards",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "dishId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "claimRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "dishId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "pendingRewards",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "bytes32" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ERC20 ABI for USDC
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

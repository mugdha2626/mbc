"use client";

import { useState, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";

// Create a public client for reading from the chain
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface TransactionRequest {
  to: Address;
  data: Hex;
  value?: bigint;
}

interface UseFarcasterTransactionResult {
  sendTransaction: (request: TransactionRequest) => Promise<Hex>;
  waitForTransaction: (hash: Hex) => Promise<boolean>;
  isLoading: boolean;
  error: Error | null;
}

export function useFarcasterTransaction(): UseFarcasterTransactionResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendTransaction = useCallback(
    async (request: TransactionRequest): Promise<Hex> => {
      setIsLoading(true);
      setError(null);

      try {
        const ethProvider = sdk.wallet.ethProvider;
        if (!ethProvider) {
          throw new Error("Farcaster wallet not available");
        }

        // Get the user's address
        const accounts = await ethProvider.request({
          method: "eth_requestAccounts",
        });
        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts available");
        }
        const userAddress = accounts[0] as Address;

        console.log("Sending transaction from:", userAddress);
        console.log("To:", request.to);
        console.log("Data:", request.data);

        // Send transaction using eth_sendTransaction
        const txHash = await ethProvider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: userAddress,
              to: request.to,
              data: request.data,
              value: request.value ? `0x${request.value.toString(16)}` : "0x0",
            },
          ],
        });

        console.log("Transaction hash:", txHash);
        setIsLoading(false);
        return txHash as Hex;
      } catch (err) {
        console.error("Transaction failed:", err);
        const error =
          err instanceof Error ? err : new Error("Transaction failed");
        setError(error);
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  const waitForTransaction = useCallback(
    async (hash: Hex): Promise<boolean> => {
      try {
        console.log("Waiting for transaction:", hash);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 60_000, // 60 seconds timeout
        });
        console.log("Transaction receipt:", receipt);
        return receipt.status === "success";
      } catch (err) {
        console.error("Wait for transaction failed:", err);
        return false;
      }
    },
    []
  );

  return {
    sendTransaction,
    waitForTransaction,
    isLoading,
    error,
  };
}

// Helper to encode function calls
export function encodeApprove(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: [
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
    ],
    functionName: "approve",
    args: [spender, amount],
  });
}

export function encodeCreateDish(dishId: Hex, metadata: string): Hex {
  return encodeFunctionData({
    abi: [
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
    ],
    functionName: "createDish",
    args: [dishId, metadata],
  });
}

export function encodeMint(
  dishId: Hex,
  usdcAmount: bigint,
  referrer: Address
): Hex {
  return encodeFunctionData({
    abi: [
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
    ],
    functionName: "mint",
    args: [dishId, usdcAmount, referrer],
  });
}

// Helper to check allowance
export async function checkAllowance(
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address
): Promise<bigint> {
  try {
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: [
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
      ],
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
    });
    return allowance as bigint;
  } catch (err) {
    console.error("Failed to check allowance:", err);
    return BigInt(0);
  }
}

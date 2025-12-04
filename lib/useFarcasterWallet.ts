"use client";

import { useState, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  type Address,
  type Hash,
  parseAbi,
} from "viem";
import { baseSepolia } from "viem/chains";

// Public client for reading
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Contract ABIs
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const tmapDishesAbi = parseAbi([
  "function createDish(bytes32 dishId, string metadata)",
  "function mint(bytes32 dishId, uint256 usdcAmount, address referrer)",
  "function dishes(bytes32) view returns (address creator, uint256 totalSupply, uint256 createdAt, string metadata, bool exists)",
]);

export function useFarcasterWallet() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switch to Base Sepolia
  const switchToBaseSepolia = useCallback(async (): Promise<boolean> => {
    try {
      const ethProvider = sdk.wallet.ethProvider;
      if (!ethProvider) return false;

      // Get current chain
      const currentChainId = await ethProvider.request({
        method: "eth_chainId",
      });

      const baseSepoliaChainId = "0x" + baseSepolia.id.toString(16); // 0x14a34
      console.log(
        "Current chain:",
        currentChainId,
        "Target:",
        baseSepoliaChainId
      );

      if (currentChainId !== baseSepoliaChainId) {
        console.log("Switching to Base Sepolia...");
        await ethProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: baseSepoliaChainId }],
        });
        console.log("Switched to Base Sepolia");
      }
      return true;
    } catch (err) {
      console.error("Failed to switch chain:", err);
      return false;
    }
  }, []);

  // Get user's wallet address
  const getAddress = useCallback(async (): Promise<Address | null> => {
    try {
      const ethProvider = sdk.wallet.ethProvider;
      if (!ethProvider) {
        console.log("No ethProvider available");
        return null;
      }

      const accounts = await ethProvider.request({
        method: "eth_requestAccounts",
      });

      console.log("Got accounts:", accounts);
      if (!accounts || accounts.length === 0) return null;
      return accounts[0] as Address;
    } catch (err) {
      console.error("Failed to get address:", err);
      return null;
    }
  }, []);

  // Send transaction using Farcaster's eth_sendTransaction directly
  const sendTransaction = useCallback(
    async (from: Address, to: Address, data: Hash): Promise<Hash> => {
      const ethProvider = sdk.wallet.ethProvider;
      if (!ethProvider) {
        throw new Error("Farcaster wallet not available");
      }

      // Make sure we're on the right chain
      await switchToBaseSepolia();

      console.log("=== Sending transaction ===");
      console.log("From:", from);
      console.log("To:", to);
      console.log("Data:", data);

      try {
        // Use eth_sendTransaction directly with all params
        const txHash = await ethProvider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: from,
              to: to,
              data: data,
              // Let the wallet estimate gas
            },
          ],
        });

        console.log("Transaction hash received:", txHash);
        return txHash as Hash;
      } catch (err: unknown) {
        console.error("eth_sendTransaction error:", err);
        // Log more details about the error
        if (err && typeof err === "object") {
          console.error("Error details:", JSON.stringify(err, null, 2));
        }
        throw err;
      }
    },
    [switchToBaseSepolia]
  );

  // Check USDC allowance
  const checkAllowance = useCallback(
    async (
      usdcAddress: Address,
      ownerAddress: Address,
      spenderAddress: Address
    ): Promise<bigint> => {
      try {
        const allowance = await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [ownerAddress, spenderAddress],
        });
        return allowance;
      } catch (err) {
        console.error("Failed to check allowance:", err);
        return BigInt(0);
      }
    },
    []
  );

  // Check USDC balance
  const checkBalance = useCallback(
    async (usdcAddress: Address, ownerAddress: Address): Promise<bigint> => {
      try {
        const balance = await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [ownerAddress],
        });
        return balance;
      } catch (err) {
        console.error("Failed to check balance:", err);
        return BigInt(0);
      }
    },
    []
  );

  // Approve USDC
  const approveUsdc = useCallback(
    async (
      usdcAddress: Address,
      spenderAddress: Address,
      amount: bigint
    ): Promise<Hash> => {
      setIsLoading(true);
      setError(null);

      try {
        // First get the user's address
        const userAddress = await getAddress();
        if (!userAddress) {
          throw new Error("Could not get wallet address");
        }

        console.log("=== Approving USDC ===");
        console.log("User address:", userAddress);
        console.log("USDC Address:", usdcAddress);
        console.log("Spender:", spenderAddress);
        console.log("Amount:", amount.toString());

        // Encode the approve function call
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [spenderAddress, amount],
        });

        console.log("Encoded data:", data);

        const hash = await sendTransaction(userAddress, usdcAddress, data);
        console.log("Approve tx hash:", hash);

        // Wait for confirmation
        console.log("Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 120_000, // 2 minute timeout
        });
        console.log("Approve confirmed! Status:", receipt.status);

        if (receipt.status !== "success") {
          throw new Error("Approve transaction failed on chain");
        }

        return hash;
      } catch (err) {
        console.error("Approve failed:", err);
        const message = err instanceof Error ? err.message : "Approve failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAddress, sendTransaction]
  );

  // Create dish on contract
  const createDish = useCallback(
    async (
      contractAddress: Address,
      dishId: Hash,
      metadata: string
    ): Promise<Hash> => {
      setIsLoading(true);
      setError(null);

      try {
        const userAddress = await getAddress();
        if (!userAddress) {
          throw new Error("Could not get wallet address");
        }

        console.log("=== Creating dish ===");
        console.log("Contract:", contractAddress);
        console.log("DishId:", dishId);

        // Encode the createDish function call
        const data = encodeFunctionData({
          abi: tmapDishesAbi,
          functionName: "createDish",
          args: [dishId, metadata],
        });

        const hash = await sendTransaction(userAddress, contractAddress, data);
        console.log("Create dish tx hash:", hash);

        // Wait for confirmation
        console.log("Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 120_000,
        });
        console.log("Create dish confirmed! Status:", receipt.status);

        if (receipt.status !== "success") {
          throw new Error("Create dish transaction failed on chain");
        }

        return hash;
      } catch (err) {
        console.error("Create dish failed:", err);
        const message =
          err instanceof Error ? err.message : "Create dish failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAddress, sendTransaction]
  );

  // Mint tokens
  const mintTokens = useCallback(
    async (
      contractAddress: Address,
      dishId: Hash,
      usdcAmount: bigint,
      referrer: Address
    ): Promise<Hash> => {
      setIsLoading(true);
      setError(null);

      try {
        const userAddress = await getAddress();
        if (!userAddress) {
          throw new Error("Could not get wallet address");
        }

        console.log("=== Minting tokens ===");
        console.log("Contract:", contractAddress);
        console.log("DishId:", dishId);
        console.log("Amount:", usdcAmount.toString());

        // Encode the mint function call
        const data = encodeFunctionData({
          abi: tmapDishesAbi,
          functionName: "mint",
          args: [dishId, usdcAmount, referrer],
        });

        const hash = await sendTransaction(userAddress, contractAddress, data);
        console.log("Mint tx hash:", hash);

        // Wait for confirmation
        console.log("Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 120_000,
        });
        console.log("Mint confirmed! Status:", receipt.status);

        if (receipt.status !== "success") {
          throw new Error("Mint transaction failed on chain");
        }

        return hash;
      } catch (err) {
        console.error("Mint failed:", err);
        const message = err instanceof Error ? err.message : "Mint failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAddress, sendTransaction]
  );

  return {
    approveUsdc,
    createDish,
    mintTokens,
    checkAllowance,
    checkBalance,
    getAddress,
    switchToBaseSepolia,
    isLoading,
    error,
  };
}

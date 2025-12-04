"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount, useSendCalls, useCallsStatus } from "wagmi";
import {
  zeroAddress,
  type Address,
  encodeFunctionData,
  parseAbi,
  createPublicClient,
  http,
  type Hash,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  TMAP_DISHES_ADDRESS,
  USDC_ADDRESS,
  TMAP_DISHES_ABI,
  ERC20_ABI,
} from "@/lib/contracts";

// ABIs for encoding
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const tmapDishesAbi = parseAbi([
  "function mint(bytes32 dishId, uint256 usdcAmount, address referrer)",
]);

// Public client for reading
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface DishData {
  dishId: string;
  name: string;
  description?: string;
  image?: string;
  currentPrice: number;
  currentSupply: number;
  totalHolders: number;
  dailyVolume: number;
  marketCap: number;
  dailyPriceChange: number;
  creator: number;
  restaurant: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantImage: string;
  creatorUsername: string;
  creatorPfp: string;
}

type MintStep = "idle" | "checking" | "sending" | "waiting" | "complete";

export default function DishPage() {
  const router = useRouter();
  const params = useParams();
  const dishId = params.id as string;

  const [dish, setDish] = useState<DishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Minting state
  const [backAmount, setBackAmount] = useState(1);
  const [mintStep, setMintStep] = useState<MintStep>("idle");
  const [mintError, setMintError] = useState("");

  // On-chain data
  const [onChainPrice, setOnChainPrice] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const {
    sendCalls,
    data: callsId,
    isPending: isSendingCalls,
    error: sendCallsError,
    reset: resetSendCalls,
  } = useSendCalls();

  // Check calls status
  const { data: callsStatus } = useCallsStatus({
    id: callsId?.id ?? "",
    query: {
      enabled: !!callsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  // Fetch dish data from API
  useEffect(() => {
    if (!dishId) return;

    const fetchDish = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dish/${dishId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch dish");
        }

        setDish(data.dish);
      } catch (err) {
        console.error("Error fetching dish:", err);
        setError(err instanceof Error ? err.message : "Failed to load dish");
      } finally {
        setLoading(false);
      }
    };

    fetchDish();
  }, [dishId]);

  // Fetch on-chain price
  useEffect(() => {
    if (!dishId || !TMAP_DISHES_ADDRESS) return;

    const fetchOnChainData = async () => {
      try {
        const price = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: TMAP_DISHES_ABI,
          functionName: "getCurrentPrice",
          args: [dishId as Hash],
        });
        // Price is in USDC (6 decimals)
        setOnChainPrice(Number(price) / 1e6);
      } catch (err) {
        console.error("Error fetching on-chain price:", err);
      }
    };

    fetchOnChainData();
  }, [dishId]);

  // Fetch user's USDC balance
  useEffect(() => {
    if (!address || !USDC_ADDRESS) return;

    const fetchBalance = async () => {
      try {
        const balance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        setUserBalance(Number(balance) / 1e6);
      } catch (err) {
        console.error("Error fetching USDC balance:", err);
      }
    };

    fetchBalance();
  }, [address]);

  // Watch for transaction completion
  useEffect(() => {
    if (callsId?.id && mintStep === "sending") {
      setMintStep("waiting");
    }
  }, [callsId?.id, mintStep]);

  // Watch for sendCalls error
  useEffect(() => {
    if (sendCallsError && mintStep === "sending") {
      setMintError(sendCallsError.message || "Transaction failed");
      setMintStep("idle");
    }
  }, [sendCallsError, mintStep]);

  // Watch for calls completion
  useEffect(() => {
    if (mintStep === "waiting" && callsStatus) {
      const status = callsStatus.status;

      if (status === "success") {
        setMintStep("complete");
        // Refresh data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (status === "failure") {
        const receipts = callsStatus.receipts as
          | Array<{ status?: string | number }>
          | undefined;

        if (receipts && receipts.length > 0) {
          const allSuccess = receipts.every((r) => {
            const s = r.status;
            return s === "success" || s === "0x1" || s === 1 || s === "1";
          });

          if (allSuccess) {
            setMintStep("complete");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
        }

        setMintError("Transaction failed");
        setMintStep("idle");
      }
    }
  }, [callsStatus, mintStep]);

  // Calculate cost for minting
  const currentPrice = onChainPrice ?? dish?.currentPrice ?? 0.1;
  const totalCost = (currentPrice * backAmount).toFixed(2);
  const usdcAmount = BigInt(Math.floor(parseFloat(totalCost) * 1e6));

  // Handle mint
  const handleMint = async () => {
    if (!isConnected || !address) {
      setMintError("Please connect your wallet");
      return;
    }

    if (!TMAP_DISHES_ADDRESS || !USDC_ADDRESS) {
      setMintError("Contract addresses not configured");
      return;
    }

    if (userBalance < parseFloat(totalCost)) {
      setMintError(`Insufficient USDC. You have $${userBalance.toFixed(2)}`);
      return;
    }

    setMintError("");
    resetSendCalls();
    setMintStep("checking");

    try {
      // Check allowance
      const currentAllowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, TMAP_DISHES_ADDRESS],
      });

      const needsApproval = currentAllowance < usdcAmount;

      // Build calls
      const calls: { to: Address; data: `0x${string}` }[] = [];

      if (needsApproval) {
        calls.push({
          to: USDC_ADDRESS,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [TMAP_DISHES_ADDRESS, usdcAmount * BigInt(1000)],
          }),
        });
      }

      calls.push({
        to: TMAP_DISHES_ADDRESS,
        data: encodeFunctionData({
          abi: tmapDishesAbi,
          functionName: "mint",
          args: [dishId as Hash, usdcAmount, zeroAddress],
        }),
      });

      setMintStep("sending");
      sendCalls({ calls });
    } catch (err) {
      console.error("Error minting:", err);
      setMintError(err instanceof Error ? err.message : "Failed to mint");
      setMintStep("idle");
    }
  };

  const isMinting = mintStep !== "idle" && mintStep !== "complete";

  const getButtonText = () => {
    switch (mintStep) {
      case "checking":
        return "Checking...";
      case "sending":
        return "Confirm in Wallet...";
      case "waiting":
        return "Confirming...";
      case "complete":
        return "Success!";
      default:
        return `Back for $${totalCost}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !dish) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-600 mb-4">{error || "Dish not found"}</p>
        <button
          onClick={() => router.back()}
          className="btn-primary px-6 py-2 rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      <div className="relative h-72">
        <img
          src={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800"}
          alt={dish.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Share button */}
        <button className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Dish name overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{dish.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl -mt-4 relative">
        <div className="px-4 py-6">
          {/* Restaurant & Creator Info */}
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push(`/restaurant/${dish.restaurant}`)}
            >
              <img
                src={dish.restaurantImage || "https://via.placeholder.com/40"}
                alt={dish.restaurantName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">{dish.restaurantName}</p>
                <p className="text-sm text-gray-500">{dish.restaurantAddress}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created by</p>
              <p className="text-sm font-medium text-primary-dark">@{dish.creatorUsername}</p>
            </div>
          </div>

          {/* Description */}
          {dish.description && (
            <p className="text-gray-600 mb-4">{dish.description}</p>
          )}

          {/* Stats Grid */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Price</p>
                <p className="text-2xl font-bold text-green-600">${currentPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Market Cap</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(dish.marketCap || currentPrice * dish.currentSupply).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">24h Volume</p>
                <p className="text-lg font-semibold text-gray-900">${dish.dailyVolume?.toFixed(2) || "0.00"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Holders</p>
                <p className="text-lg font-semibold text-gray-900">{dish.totalHolders || 0}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dish.dailyPriceChange >= 0 ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    <span className="font-medium text-green-600">Up {dish.dailyPriceChange || 0}% today</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"/>
                    </svg>
                    <span className="font-medium text-red-600">Down {Math.abs(dish.dailyPriceChange)}% today</span>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Supply: {dish.currentSupply || 0}
              </div>
            </div>
          </div>

          {/* Back More Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Back this dish</h3>

            {/* USDC Balance */}
            {isConnected && (
              <p className="text-sm text-gray-500 mb-3">
                Your USDC Balance: <span className="font-medium">${userBalance.toFixed(2)}</span>
              </p>
            )}

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setBackAmount(Math.max(1, backAmount - 1))}
                disabled={isMinting}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
              >
                <span className="text-xl text-gray-600">-</span>
              </button>
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold text-gray-900">{backAmount}</p>
                <p className="text-sm text-gray-500">tokens</p>
              </div>
              <button
                onClick={() => setBackAmount(backAmount + 1)}
                disabled={isMinting}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
              >
                <span className="text-xl text-gray-600">+</span>
              </button>
            </div>

            {/* Mint Error */}
            {mintError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-700">{mintError}</p>
              </div>
            )}

            {/* Success Message */}
            {mintStep === "complete" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-green-700">Successfully minted! Refreshing...</p>
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isMinting || !isConnected}
              className="w-full btn-primary font-semibold py-4 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isMinting && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {!isConnected ? "Connect Wallet to Mint" : getButtonText()}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">Max $10 per dish</p>
          </div>

          {/* Share Referral */}
          <button className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-600 hover:border-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share referral & earn 5%
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useFarcaster } from "@/app/providers/FarcasterProvider";
import { useReferral } from "@/app/hooks/useReferral";
import { useAccount, useSendCalls, useCallsStatus, useReadContract } from "wagmi";
import { parseAbi, encodeFunctionData, type Hash, type Address, zeroAddress, keccak256, toBytes } from "viem";
import { baseSepolia } from "viem/chains";
import { TMAP_DISHES_ADDRESS, USDC_ADDRESS, ERC20_ABI, TMAP_DISHES_ABI } from "@/lib/contracts";

// ABIs
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const tmapDishesAbi = parseAbi([
  "function mint(bytes32 dishId, uint256 usdcAmount, address referrer)",
  "function getCurrentPrice(bytes32 dishId) view returns (uint256)",
  "function getTokensForUsdc(bytes32 dishId, uint256 usdcAmount) view returns (uint256 tokenAmount, uint256 actualCost)",
  "function dishes(bytes32) view returns (address creator, uint256 totalSupply, uint256 createdAt, string metadata, bool exists)",
]);

/**
 * Check if a dishId is a valid bytes32 hash (0x + 64 hex chars)
 */
function isValidBytes32(id: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(id);
}

/**
 * Generate a proper bytes32 dishId from restaurant name and dish name
 */
function generateDishId(restaurantName: string, dishName: string): string {
  const combined = `${restaurantName.toLowerCase().trim()}:${dishName.toLowerCase().trim()}`;
  return keccak256(toBytes(combined));
}

type MintStep = "idle" | "approving" | "minting" | "complete";

interface DishData {
  dishId: string;
  name: string;
  image?: string;
  description?: string;
  restaurant: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  creator: number;
  creatorUsername?: string;
  creatorPfp?: string;
  currentPrice?: number;
  marketCap?: number;
  dailyVolume?: number;
  totalHolders?: number;
  currentSupply?: number;
  weeklyChange?: number;
  yourHolding?: number;
  yourValue?: number;
}

// USDC amount options in dollars
const USDC_OPTIONS = [0.1, 0.5, 1, 2, 5, 10];

export default function DishPage() {
  const router = useRouter();
  const params = useParams();
  const dishIdFromUrl = params.id as string;
  const { user } = useFarcaster();
  const { referrerFid } = useReferral();

  const [dish, setDish] = useState<DishData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usdcAmount, setUsdcAmount] = useState(0.1); // USDC amount to spend (in dollars)
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [mintStep, setMintStep] = useState<MintStep>("idle");
  const [mintError, setMintError] = useState("");

  // Compute the proper bytes32 dishId for contract calls
  const contractDishId = dish
    ? (isValidBytes32(dish.dishId)
        ? dish.dishId
        : (dish.restaurantName && dish.name
            ? generateDishId(dish.restaurantName, dish.name)
            : null))
    : null;

  // Wagmi hooks
  const { address, isConnected } = useAccount();

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Read current price from contract
  const { data: currentPriceOnChain } = useReadContract({
    address: TMAP_DISHES_ADDRESS,
    abi: tmapDishesAbi,
    functionName: "getCurrentPrice",
    args: contractDishId ? [contractDishId as Hash] : undefined,
    query: {
      enabled: !!contractDishId && isValidBytes32(contractDishId),
    },
  });

  // Read how many tokens we'll get for the selected USDC amount
  const usdcAmountRaw = BigInt(Math.floor(usdcAmount * 1_000_000)); // Convert to 6 decimals
  const { data: tokensForUsdc } = useReadContract({
    address: TMAP_DISHES_ADDRESS,
    abi: tmapDishesAbi,
    functionName: "getTokensForUsdc",
    args: contractDishId ? [contractDishId as Hash, usdcAmountRaw] : undefined,
    query: {
      enabled: !!contractDishId && isValidBytes32(contractDishId) && usdcAmountRaw > 0,
    },
  });

  // Check if dish exists on chain
  const { data: dishOnChain } = useReadContract({
    address: TMAP_DISHES_ADDRESS,
    abi: tmapDishesAbi,
    functionName: "dishes",
    args: contractDishId ? [contractDishId as Hash] : undefined,
    query: {
      enabled: !!contractDishId && isValidBytes32(contractDishId),
    },
  });

  // Read USDC allowance
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && TMAP_DISHES_ADDRESS ? [address, TMAP_DISHES_ADDRESS] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Derived values
  const dishExistsOnChain = dishOnChain ? dishOnChain[4] : false; // exists field
  const estimatedTokens = tokensForUsdc ? Number(tokensForUsdc[0]) : 0;
  const actualCost = tokensForUsdc ? Number(tokensForUsdc[1]) / 1_000_000 : usdcAmount;

  // Send calls for approve + mint
  const {
    sendCalls: sendMintCalls,
    data: mintCallsId,
    isPending: isMinting,
    error: mintCallError,
    reset: resetMint,
  } = useSendCalls();

  const { data: mintStatus } = useCallsStatus({
    id: mintCallsId?.id ?? "",
    query: {
      enabled: !!mintCallsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  // Fetch dish data
  useEffect(() => {
    const fetchDish = async () => {
      if (!dishIdFromUrl) return;

      try {
        const res = await fetch(`/api/dish/${dishIdFromUrl}`);
        if (res.ok) {
          const data = await res.json();
          setDish(data.dish);
        } else {
          setMintError("Dish not found");
        }
      } catch (error) {
        console.error("Failed to fetch dish:", error);
        setMintError("Failed to load dish");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDish();
  }, [dishIdFromUrl]);

  // Check wishlist status
  useEffect(() => {
    const checkWishlist = async () => {
      if (!user || !dishIdFromUrl) return;

      try {
        const res = await fetch(`/api/wishlist?fid=${user.fid}`);
        if (res.ok) {
          const data = await res.json();
          const isInWishlist = data.wishlist?.some(
            (item: { dish: string }) => item.dish === dishIdFromUrl
          );
          setIsWishlisted(isInWishlist);
        }
      } catch (error) {
        console.error("Failed to check wishlist:", error);
      }
    };

    if (user) {
      checkWishlist();
    }
  }, [user, dishIdFromUrl]);

  // Watch mint status
  useEffect(() => {
    const updateDatabaseAfterMint = async () => {
      if (!user || !address || !dishIdFromUrl) return;

      try {
        // Update the database with the new mint data
        await fetch("/api/dish/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dishId: dishIdFromUrl,
            minterFid: user.fid,
            minterAddress: address,
            usdcAmount: usdcAmount, // Amount in USDC (dollars)
            tokensReceived: estimatedTokens,
            referrerFid: referrerFid || null,
          }),
        });
      } catch (error) {
        console.error("Failed to update database after mint:", error);
      }
    };

    if (mintStatus?.status === "success") {
      setMintStep("complete");
      // Update DB then refresh
      updateDatabaseAfterMint().then(() => {
        setTimeout(() => {
          router.refresh();
          // Re-fetch dish data to show updated values
          fetch(`/api/dish/${dishIdFromUrl}`)
            .then(res => res.json())
            .then(data => {
              if (data.dish) setDish(data.dish);
            });
          setMintStep("idle");
          resetMint();
        }, 1500);
      });
    } else if (mintStatus?.status === "failure") {
      setMintError("Transaction failed. Please try again.");
      setMintStep("idle");
    }
  }, [mintStatus, router, resetMint, user, address, dishIdFromUrl, usdcAmount, estimatedTokens, referrerFid]);

  // Handle mint error
  useEffect(() => {
    if (mintCallError) {
      setMintError(mintCallError.message || "Transaction failed");
      setMintStep("idle");
    }
  }, [mintCallError]);

  const handleAddToWishlist = async () => {
    if (!user) {
      alert("Please sign in to add to wishlist");
      return;
    }

    try {
      const endpoint = "/api/wishlist";
      const method = isWishlisted ? "DELETE" : "POST";

      await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: user.fid,
          dishId: dishIdFromUrl,
          referrer: referrerFid,
        }),
      });

      setIsWishlisted(!isWishlisted);
    } catch (error) {
      console.error("Failed to update wishlist", error);
    }
  };

  const handleShare = () => {
    if (!user) return;
    const url = `${window.location.origin}/dish/${dishIdFromUrl}?ref=${user.fid}`;
    navigator.clipboard.writeText(url);
    alert("Referral link copied to clipboard!");
  };

  const handleMint = async () => {
    if (!isConnected || !address) {
      setMintError("Please connect your wallet");
      return;
    }

    if (!contractDishId || !isValidBytes32(contractDishId)) {
      setMintError("Invalid dish ID. This dish may need to be recreated.");
      console.error("Invalid contractDishId:", contractDishId);
      return;
    }

    if (usdcAmount <= 0) {
      setMintError("Amount must be greater than 0");
      return;
    }

    // Max $10 per dish
    if (usdcAmount > 10) {
      setMintError("Maximum $10 per dish");
      return;
    }

    // Convert to raw USDC amount (6 decimals)
    const usdcAmountToSpend = BigInt(Math.floor(usdcAmount * 1_000_000));

    setMintError("");
    setMintStep("approving");

    try {
      const calls: { to: Address; data: `0x${string}` }[] = [];

      // Check if we need to approve
      const currentAllowance = allowance || BigInt(0);
      const needsApproval = currentAllowance < usdcAmountToSpend;

      // Add approve call if needed
      if (needsApproval) {
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [TMAP_DISHES_ADDRESS, usdcAmountToSpend * BigInt(10)], // Approve extra for future mints
        });
        calls.push({
          to: USDC_ADDRESS,
          data: approveData,
        });
      }

      // If dish doesn't exist on chain, we need to create it first
      if (!dishExistsOnChain && dish) {
        const metadata = JSON.stringify({
          name: dish.name,
          description: dish.description || "",
          restaurant: dish.restaurantName || "",
          restaurantId: dish.restaurant,
        });
        const createDishData = encodeFunctionData({
          abi: parseAbi(["function createDish(bytes32 dishId, string metadata)"]),
          functionName: "createDish",
          args: [contractDishId as Hash, metadata],
        });
        calls.push({
          to: TMAP_DISHES_ADDRESS,
          data: createDishData,
        });
      }

      // Add mint call
      const referrerAddress = referrerFid && user?.walletAddress
        ? user.walletAddress as Address
        : zeroAddress;

      const mintData = encodeFunctionData({
        abi: tmapDishesAbi,
        functionName: "mint",
        args: [contractDishId as Hash, usdcAmountToSpend, referrerAddress],
      });
      calls.push({
        to: TMAP_DISHES_ADDRESS,
        data: mintData,
      });

      setMintStep("minting");
      await sendMintCalls({ calls });
    } catch (error) {
      console.error("Mint failed:", error);
      setMintError(error instanceof Error ? error.message : "Failed to mint");
      setMintStep("idle");
    }
  };

  const getButtonText = () => {
    if (mintStep === "approving") return "Approving...";
    if (mintStep === "minting") return "Minting...";
    if (estimatedTokens > 0) {
      return `Back for $${usdcAmount.toFixed(2)} (~${estimatedTokens} tokens)`;
    }
    return `Back for $${usdcAmount.toFixed(2)}`;
  };

  const userBalance = usdcBalance ? Number(usdcBalance) / 1_000_000 : 0;
  // Use on-chain price if available, otherwise fall back to DB price
  const price = currentPriceOnChain ? Number(currentPriceOnChain) / 1_000_000 : (dish?.currentPrice || 0.1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900">Loading dish...</div>
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900">Dish not found</div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-xl"
          >
            Go Back
          </button>
        </div>
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
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {/* Wishlist button */}
          <button
            onClick={handleAddToWishlist}
            className={`p-2 rounded-full backdrop-blur-sm transition-colors shadow-sm ${
              isWishlisted
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white/90 hover:bg-white text-gray-700"
            }`}
          >
            <svg className="w-5 h-5" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Dish name overlay */}
        <div className="absolute bottom-8 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{dish.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl -mt-4 relative">
        <div className="px-4 py-4">
          {/* Restaurant & Creator Info */}
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push(`/restaurant/${dish.restaurant}`)}
            >
              <img
                src={dish.restaurantImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100"}
                alt={dish.restaurantName || "Restaurant"}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">{dish.restaurantName || "Unknown Restaurant"}</p>
                <p className="text-sm text-gray-500">{dish.restaurantAddress || ""}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created by</p>
              <p className="text-sm font-medium text-primary-dark">@{dish.creatorUsername || "anonymous"}</p>
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
                <p className="text-2xl font-bold text-green-600">${price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Market Cap</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(dish.marketCap || price * (dish.currentSupply || 0)).toFixed(2)}
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
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                <span className="font-medium text-green-600">
                  Up {dish.weeklyChange || 0}% this week
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Supply: {dish.currentSupply || 0}
              </div>
            </div>
          </div>

          {/* Your Holdings */}
          {dish.yourHolding && dish.yourHolding > 0 && (
            <div className="bg-primary-softer border border-primary rounded-2xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Your Holdings</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">{dish.yourHolding} tokens</p>
                  <p className="text-lg font-bold text-primary-dark">${(dish.yourValue || 0).toFixed(2)}</p>
                </div>
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cash Out
                </button>
              </div>
            </div>
          )}

          {/* Back More Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Back this dish</h3>

            {/* USDC Balance */}
            {isConnected && (
              <p className="text-sm text-gray-500 mb-3">
                Your USDC Balance: <span className="font-medium">${userBalance.toFixed(2)}</span>
              </p>
            )}

            {/* USDC Amount Selection */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Select amount to spend:</p>
              <div className="grid grid-cols-3 gap-2">
                {USDC_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setUsdcAmount(amount)}
                    disabled={isMinting}
                    className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                      usdcAmount === amount
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    ${amount.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Tokens */}
            {estimatedTokens > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">You will receive:</span>
                  <span className="font-semibold text-gray-900">{estimatedTokens} tokens</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Actual cost:</span>
                  <span className="font-medium text-gray-700">${actualCost.toFixed(4)}</span>
                </div>
              </div>
            )}

            {/* Warning if dish doesn't exist on chain */}
            {!dishExistsOnChain && contractDishId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-yellow-700">
                  This dish hasn&apos;t been created on-chain yet. It will be created with your first mint.
                </p>
              </div>
            )}

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
          <button 
            onClick={handleShare}
            className="btn-dashed w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share referral & earn 2.5%
          </button>
        </div>
      </div>
    </div>
  );
}

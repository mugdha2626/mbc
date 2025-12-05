"use client";

import { Header } from "@/app/components/layout/Header";
import { BottomNav } from "@/app/components/layout/BottomNav";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useFarcaster } from "@/app/providers/FarcasterProvider";
import { useAccount, useSendCalls, useCallsStatus } from "wagmi";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  type Hash,
} from "viem";
import { baseSepolia } from "viem/chains";
import { TMAP_DISHES_ADDRESS, TMAP_DISHES_ABI } from "@/lib/contracts";

// ABI for rewards functions
const rewardsAbi = parseAbi([
  "function calculatePendingRewards(address user, bytes32 dishId) view returns (uint256)",
  "function claimRewards(bytes32 dishId)",
  "function getBalance(address user, bytes32 dishId) view returns (uint256)",
  "function getReferralRewards(address user) view returns (uint256)",
  "function claimReferralRewards()",
]);

// Public client for reading
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface DishReward {
  dishId: string;
  name: string;
  image?: string;
  pendingRewards: number;
  balance: number;
  restaurantName?: string;
}

type ClaimStep = "idle" | "claiming" | "complete";

export default function RewardsPage() {
  const { user } = useFarcaster();
  const { address, isConnected } = useAccount();
  const [dishRewards, setDishRewards] = useState<DishReward[]>([]);
  const [dishRewardsTotal, setDishRewardsTotal] = useState(0);
  const [referralRewards, setReferralRewards] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimingDishId, setClaimingDishId] = useState<string | null>(null);
  const [claimStep, setClaimStep] = useState<ClaimStep>("idle");
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Wagmi hooks for claiming
  const {
    sendCalls: sendClaimCalls,
    data: claimCallsId,
    error: claimCallError,
    reset: resetClaim,
  } = useSendCalls();

  const { data: claimStatus } = useCallsStatus({
    id: claimCallsId?.id ?? "",
    query: {
      enabled: !!claimCallsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  // Fetch rewards data
  const fetchRewards = useCallback(async () => {
    if (!user?.fid || !address) {
      setDishRewards([]);
      setDishRewardsTotal(0);
      setReferralRewards(0);
      setTotalRewards(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch user's portfolio to get their dish holdings
      const userRes = await fetch(`/api/users/${user.fid}`);
      if (!userRes.ok) {
        throw new Error("Failed to fetch user");
      }
      const userData = await userRes.json();
      const portfolio = userData.user?.portfolio;

      let referralTotal = 0;
      try {
        const referralResult = await publicClient.readContract({
          address: TMAP_DISHES_ADDRESS,
          abi: rewardsAbi,
          functionName: "getReferralRewards",
          args: [address],
        });
        referralTotal = Number(referralResult) / 1e6;
      } catch (err) {
        console.error("Error fetching referral rewards:", err);
      }

      if (!portfolio?.dishes || portfolio.dishes.length === 0) {
        setDishRewards([]);
        setDishRewardsTotal(0);
        setReferralRewards(referralTotal);
        setTotalRewards(referralTotal);
        setLoading(false);
        return;
      }

      // Fetch rewards for each dish
      const rewardsPromises = portfolio.dishes.map(
        async (item: { dish: string; quantity: number }) => {
          try {
            // Fetch dish details
            const dishRes = await fetch(`/api/dish/${item.dish}`);
            if (!dishRes.ok) return null;
            const dishData = await dishRes.json();
            const dish = dishData.dish;

            // Get pending rewards from contract
            const dishIdBytes32 = item.dish as Hash;
            let pendingRewards = BigInt(0);
            let balance = BigInt(0);

            try {
              pendingRewards = await publicClient.readContract({
                address: TMAP_DISHES_ADDRESS,
                abi: rewardsAbi,
                functionName: "calculatePendingRewards",
                args: [address, dishIdBytes32],
              });

              balance = await publicClient.readContract({
                address: TMAP_DISHES_ADDRESS,
                abi: rewardsAbi,
                functionName: "getBalance",
                args: [address, dishIdBytes32],
              });
            } catch (err) {
              console.error(
                `Error fetching rewards for dish ${item.dish}:`,
                err
              );
            }

            return {
              dishId: item.dish,
              name: dish?.name || "Unknown Dish",
              image: dish?.image,
              pendingRewards: Number(pendingRewards) / 1e6,
              balance: Number(balance),
              restaurantName: dish?.restaurantName,
            };
          } catch {
            return null;
          }
        }
      );

      const rewards = (await Promise.all(rewardsPromises)).filter(
        (r): r is DishReward => r !== null && r.pendingRewards > 0
      );

      // Sort by pending rewards descending
      rewards.sort((a, b) => b.pendingRewards - a.pendingRewards);

      const total = rewards.reduce((sum, r) => sum + r.pendingRewards, 0);

      setDishRewards(rewards);
      setDishRewardsTotal(total);
      setReferralRewards(referralTotal);
      setTotalRewards(total + referralTotal);
    } catch (err) {
      console.error("Error fetching rewards:", err);
      setDishRewards([]);
      setDishRewardsTotal(0);
      setReferralRewards(0);
      setTotalRewards(0);
    } finally {
      setLoading(false);
    }
  }, [user?.fid, address]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // Handle claim status changes
  useEffect(() => {
    if (claimStep === "claiming" && claimStatus) {
      if (
        claimStatus.status === "success" ||
        (claimStatus.receipts &&
          claimStatus.receipts.every(
            (r: { status?: string | number }) =>
              r.status === "success" ||
              r.status === "0x1" ||
              r.status === 1 ||
              r.status === "1"
          ))
      ) {
        setClaimStep("complete");
        setClaimSuccess(true);
        setClaimingDishId(null);

        // Refresh rewards after successful claim
        setTimeout(() => {
          fetchRewards();
          setClaimSuccess(false);
          setClaimStep("idle");
        }, 2000);
      } else if (claimStatus.status === "failure") {
        setClaimError("Claim failed. Please try again.");
        setClaimStep("idle");
        setClaimingDishId(null);
      }
    }
  }, [claimStatus, claimStep, fetchRewards]);

  // Handle claim error
  useEffect(() => {
    if (claimCallError && claimStep === "claiming") {
      setClaimError(claimCallError.message || "Claim failed");
      setClaimStep("idle");
      setClaimingDishId(null);
    }
  }, [claimCallError, claimStep]);

  // Claim rewards for a specific dish
  const handleClaim = async (dishId: string) => {
    if (!isConnected || !address) {
      setClaimError("Please connect your wallet");
      return;
    }

    setClaimError("");
    setClaimSuccess(false);
    resetClaim();
    setClaimingDishId(dishId);
    setClaimStep("claiming");

    try {
      const dishIdBytes32 = dishId as Hash;

      sendClaimCalls({
        calls: [
          {
            to: TMAP_DISHES_ADDRESS,
            data: encodeFunctionData({
              abi: rewardsAbi,
              functionName: "claimRewards",
              args: [dishIdBytes32],
            }),
          },
        ],
      });
    } catch (err) {
      console.error("Error claiming rewards:", err);
      setClaimError(err instanceof Error ? err.message : "Failed to claim");
      setClaimStep("idle");
      setClaimingDishId(null);
    }
  };

  const handleClaimReferral = async () => {
    if (!isConnected || !address) {
      setClaimError("Please connect your wallet");
      return;
    }

    if (referralRewards <= 0) return;

    setClaimError("");
    setClaimSuccess(false);
    resetClaim();
    setClaimingDishId("referral");
    setClaimStep("claiming");

    try {
      sendClaimCalls({
        calls: [
          {
            to: TMAP_DISHES_ADDRESS,
            data: encodeFunctionData({
              abi: rewardsAbi,
              functionName: "claimReferralRewards",
              args: [],
            }),
          },
        ],
      });
    } catch (err) {
      console.error("Error claiming referral rewards:", err);
      setClaimError(
        err instanceof Error ? err.message : "Failed to claim referral rewards"
      );
      setClaimStep("idle");
      setClaimingDishId(null);
    }
  };

  // Claim all rewards
  const handleClaimAll = async () => {
    if (!isConnected || !address) {
      setClaimError("Please connect your wallet");
      return;
    }

    if (dishRewards.length === 0 && referralRewards <= 0) return;

    setClaimError("");
    setClaimSuccess(false);
    resetClaim();
    setClaimingDishId("all");
    setClaimStep("claiming");

    try {
      const calls = dishRewards.map((reward) => ({
        to: TMAP_DISHES_ADDRESS,
        data: encodeFunctionData({
          abi: rewardsAbi,
          functionName: "claimRewards",
          args: [reward.dishId as Hash],
        }),
      }));

      if (referralRewards > 0) {
        calls.push({
          to: TMAP_DISHES_ADDRESS,
          data: encodeFunctionData({
            abi: rewardsAbi,
            functionName: "claimReferralRewards",
            args: [],
          }),
        });
      }

      if (calls.length === 0) {
        setClaimStep("idle");
        setClaimingDishId(null);
        return;
      }

      sendClaimCalls({ calls });
    } catch (err) {
      console.error("Error claiming all rewards:", err);
      setClaimError(err instanceof Error ? err.message : "Failed to claim");
      setClaimStep("idle");
      setClaimingDishId(null);
    }
  };

  const isClaiming = claimStep === "claiming";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-pink text-foreground pb-24">
        <Header title="Rewards" />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[var(--primary-dark)] border-t-transparent rounded-full animate-spin" />
            <span className="text-primary-text">Loading rewards...</span>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-pink text-foreground pb-24">
        <Header title="Rewards" />
        <div className="flex flex-col items-center justify-center h-64 px-4">
          <div className="w-16 h-16 bg-[var(--primary-light)] rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-[var(--primary-dark)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-primary-text text-center">
            Please sign in to view your rewards
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-pink text-foreground pb-24">
      <Header title="Rewards" />

      {/* Total Rewards Card */}
      <div className="px-4 pt-4 pb-3">
        <div className="glass rounded-2xl p-4 card-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-primary-text mb-0.5 opacity-70">
                Total Claimable
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-foreground">
                  ${totalRewards.toFixed(4)}
                </span>
                <span className="text-xs text-primary-text opacity-70">
                  USDC
                </span>
              </div>
            </div>
            <div className="w-10 h-10 glass-primary rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="glass-soft rounded-lg p-2.5 border-card-border">
              <p className="text-[10px] text-primary-text mb-0.5 opacity-70">
                Holdings
              </p>
              <p className="text-sm font-semibold text-foreground">
                ${dishRewardsTotal.toFixed(4)}
              </p>
              <p className="text-[9px] text-primary-text opacity-60 mt-0.5">
                {dishRewards.length} dish{dishRewards.length !== 1 ? "es" : ""}
              </p>
            </div>
            <div className="glass-soft rounded-lg p-2.5 border-card-border">
              <p className="text-[10px] text-primary-text mb-0.5 opacity-70">
                Referrals
              </p>
              <p className="text-sm font-semibold text-foreground">
                ${referralRewards.toFixed(4)}
              </p>
              <p className="text-[9px] text-primary-text opacity-60 mt-0.5">
                Wishlist shares
              </p>
            </div>
          </div>

          {totalRewards > 0 && (
            <button
              onClick={handleClaimAll}
              disabled={isClaiming}
              className="w-full btn-primary py-2.5 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
            >
              {isClaiming && claimingDishId === "all" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Claim All
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {claimError && (
        <div className="px-4 mb-3">
          <div className="glass-soft border border-primary-dark/30 rounded-lg p-2.5">
            <p className="text-xs text-foreground">{claimError}</p>
          </div>
        </div>
      )}

      {claimSuccess && (
        <div className="px-4 mb-3">
          <div className="glass-soft border border-primary-dark/30 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-primary-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-xs text-foreground">
                Rewards claimed successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Rewards Section */}
      {referralRewards > 0 && (
        <div className="px-4 mb-4">
          <h2 className="text-sm font-semibold mb-2 text-foreground">
            Referral Rewards
          </h2>
          <div className="glass rounded-lg p-3 card-shadow">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex-1">
                <p className="text-[10px] text-primary-text mb-0.5 opacity-70">
                  Available
                </p>
                <p className="text-base font-semibold text-foreground">
                  ${referralRewards.toFixed(4)}
                  <span className="text-xs text-primary-text ml-1 font-normal opacity-70">
                    USDC
                  </span>
                </p>
              </div>
              <button
                onClick={handleClaimReferral}
                disabled={isClaiming || referralRewards <= 0}
                className="px-3 py-1.5 glass-primary hover:glass-strong text-primary-dark text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
              >
                {isClaiming && claimingDishId === "referral" ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-dark/30 border-t-primary-dark rounded-full animate-spin" />
                    <span>Claiming</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Claim
                  </>
                )}
              </button>
            </div>
            <div className="flex items-start gap-1.5 text-[10px] text-primary-text opacity-70 pt-2 border-t border-card-border">
              <svg
                className="w-3 h-3 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>
                Earned from wishlist shares. Rewards are safe until claimed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="px-4 mb-4">
        <div className="glass rounded-lg p-3 card-shadow">
          <h3 className="text-xs font-semibold text-foreground mb-3">
            How Rewards Work
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-primary-dark font-semibold shrink-0 mt-0.5">
                1.
              </span>
              <p className="text-primary-text">
                When someone mints a dish you hold, 2.5% goes to holder rewards
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary-dark font-semibold shrink-0 mt-0.5">
                2.
              </span>
              <p className="text-primary-text">
                Rewards distributed proportionally to your token balance
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary-dark font-semibold shrink-0 mt-0.5">
                3.
              </span>
              <p className="text-primary-text">
                Referrals accrue in a pool until you claim them
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary-dark font-semibold shrink-0 mt-0.5">
                4.
              </span>
              <p className="text-primary-text">
                Claim anytime - rewards accumulate until collected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards by Dish */}
      <div className="px-4 mb-4">
        <h2 className="text-sm font-semibold mb-2.5 text-foreground">
          Rewards by Dish
        </h2>

        {dishRewards.length > 0 ? (
          <div className="space-y-2">
            {dishRewards.map((reward) => (
              <div
                key={reward.dishId}
                className="glass rounded-lg p-3 card-shadow hover:glass-strong transition-all"
              >
                <div className="flex gap-3">
                  <Link href={`/dish/${reward.dishId}`} className="shrink-0">
                    <img
                      src={
                        reward.image ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
                      }
                      alt={reward.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dish/${reward.dishId}`}>
                      <h3 className="font-medium text-foreground truncate text-sm mb-0.5">
                        {reward.name}
                      </h3>
                      {reward.restaurantName && (
                        <p className="text-[10px] text-primary-text truncate opacity-70 mb-1.5">
                          {reward.restaurantName}
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          ${reward.pendingRewards.toFixed(4)}
                        </p>
                        <p className="text-[9px] text-primary-text opacity-60">
                          {reward.balance} stamps · USDC
                        </p>
                      </div>
                      <button
                        onClick={() => handleClaim(reward.dishId)}
                        disabled={isClaiming}
                        className="px-3 py-1.5 glass-primary hover:glass-strong text-primary-dark text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {isClaiming && claimingDishId === reward.dishId ? (
                          <>
                            <div className="w-3 h-3 border-2 border-primary-dark/30 border-t-primary-dark rounded-full animate-spin" />
                            <span>Claiming</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Claim
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-lg p-6 text-center card-shadow">
            <div className="w-12 h-12 glass-soft rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-primary-text opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-foreground font-medium mb-1">
              No holder rewards yet
            </p>
            <p className="text-xs text-primary-text opacity-70 mb-3">
              Hold dish stamps to earn rewards when others mint.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-primary-dark text-xs font-medium hover:text-primary-dark/80 transition-colors"
            >
              Explore dishes
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Rewards History Placeholder */}
      {/* <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-6 text-center shadow-sm">
          <p className="text-sm text-gray-400">
            Rewards history coming soon
          </p>
        </div>
      </div> */}

      <BottomNav />
    </div>
  );
}

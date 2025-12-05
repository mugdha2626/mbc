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
      <div className="min-h-screen bg-[var(--background)] text-gray-900 pb-24">
        <Header title="Rewards" />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[var(--primary-dark)] border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500">Loading rewards...</span>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-gray-900 pb-24">
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
          <p className="text-gray-500 text-center">
            Please sign in to view your rewards
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-gray-900 pb-24">
      <Header title="Rewards" />

      {/* Total Rewards Card */}
      <div className="px-4 py-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 rounded-2xl p-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-100/50 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-600"
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
              <p className="text-sm text-emerald-700 font-medium">
                Total Claimable Rewards
              </p>
            </div>

            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-bold text-emerald-700">
                ${totalRewards.toFixed(4)}
              </span>
              <span className="text-emerald-600 mb-1">USDC</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs text-emerald-600/80 mb-1">Stamp holdings</p>
                <p className="text-base font-semibold text-emerald-800">
                  ${dishRewardsTotal.toFixed(4)}
                </p>
                <p className="text-[11px] text-emerald-500">
                  From {dishRewards.length} dish
                  {dishRewards.length !== 1 ? "es" : ""}
                </p>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs text-emerald-600/80 mb-1">Referral rewards</p>
                <p className="text-base font-semibold text-emerald-800">
                  ${referralRewards.toFixed(4)}
                </p>
                <p className="text-[11px] text-emerald-500">
                  Earned from wishlist shares
                </p>
              </div>
            </div>

            <p className="text-sm text-emerald-600/80 mb-4">
              Claim everything in one tap or pick specific rewards below.
            </p>

            {totalRewards > 0 && (
              <button
                onClick={handleClaimAll}
                disabled={isClaiming}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {isClaiming && claimingDishId === "all" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Claiming All...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
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
                    Claim All Rewards
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {claimError && (
        <div className="px-4 mb-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
            <p className="text-sm text-rose-600">{claimError}</p>
          </div>
        </div>
      )}

      {claimSuccess && (
        <div className="px-4 mb-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-emerald-500"
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
              <p className="text-sm text-emerald-700">
                Rewards claimed successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Rewards */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Referral Rewards</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">
                Available to claim
              </p>
              <p className="text-2xl font-semibold text-emerald-700">
                ${referralRewards.toFixed(4)}
                <span className="text-sm text-gray-500 ml-1">USDC</span>
              </p>
              <p className="text-xs text-gray-500">
                Earned when someone mints via your shared wishlist link
              </p>
            </div>
            <button
              onClick={handleClaimReferral}
              disabled={isClaiming || referralRewards <= 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isClaiming && claimingDishId === "referral" ? (
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
                  Claim referral
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Paid out from the on-chain referral pool. Pending amounts stay safe until you claim.
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[var(--primary-dark)]"
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
            How Rewards Work
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">1.</span>
              <p>
                When someone mints a dish you hold, 2.5% goes to holder rewards
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">2.</span>
              <p>Rewards are distributed proportionally to your token balance</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">3.</span>
              <p>Referrals now accrue in a pool until you claim them</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">4.</span>
              <p>Claim anytime - rewards accumulate until you collect them</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards by Dish */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">
          Rewards by Dish
        </h2>

        {dishRewards.length > 0 ? (
          <div className="space-y-3">
            {dishRewards.map((reward) => (
              <div
                key={reward.dishId}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  <Link href={`/dish/${reward.dishId}`} className="shrink-0">
                    <img
                      src={
                        reward.image ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
                      }
                      alt={reward.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dish/${reward.dishId}`}>
                      <h3 className="font-medium text-gray-900 truncate">
                        {reward.name}
                      </h3>
                      {reward.restaurantName && (
                        <p className="text-xs text-gray-500 truncate">
                          {reward.restaurantName}
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {reward.balance} stamps held
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">
                        ${reward.pendingRewards.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-400">USDC</p>
                    </div>
                    <button
                      onClick={() => handleClaim(reward.dishId)}
                      disabled={isClaiming}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isClaiming && claimingDishId === reward.dishId ? (
                        <>
                          <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                          <span>Claiming</span>
                        </>
                      ) : (
                        "Claim"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-300"
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
            <p className="text-gray-500 mb-2">No holder rewards available yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Hold dish stamps to earn rewards when others mint. Referral rewards are shown above.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-[var(--primary-dark)] font-medium"
            >
              Explore dishes
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

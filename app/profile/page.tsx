"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { GoogleMapView } from "@/app/components/map/GoogleMapView";
import { getCurrentPosition } from "@/lib/geo";
import getFid from "@/app/providers/Fid";
import type { User } from "@/app/interface";
import { calculateUserTier } from "@/lib/tiers";
import { useAccount, useSendCalls, useCallsStatus } from "wagmi";
import { createPublicClient, http, encodeFunctionData, type Hash } from "viem";
import { baseSepolia } from "viem/chains";
import { TMAP_DISHES_ADDRESS, TMAP_DISHES_ABI } from "@/lib/contracts";

// Public client for reading contract data
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface MapRestaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  address: string;
  city: string;
  dishCount: number;
  tmapRating: number;
}

interface HoldingWithDetails {
  dishId: string;
  name: string;
  image?: string;
  quantity: number;
  currentPrice: number;
  totalValue: number;
  returnValue: number;
  restaurantName?: string;
  referredBy?: {
    fid: number;
    username: string;
  } | null;
}

interface CreatedDishWithReferrals {
  dishId: string;
  name: string;
  image?: string;
  currentPrice: number;
  currentSupply: number;
  totalHolders: number;
  restaurantName?: string;
  referredTo: {
    fid: number;
    username: string;
  }[];
}

// Helper to format currency
function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(2)}`;
}

// Helper to get reputation rank
function getReputationRank(score: number): string {
  if (score >= 1000) return "Food Legend";
  if (score >= 750) return "Master Taster";
  if (score >= 500) return "Local Tastemaker";
  if (score >= 250) return "Rising Foodie";
  if (score >= 100) return "Taste Explorer";
  return "New Taster";
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [farcasterUser, setFarcasterUser] = useState<{
    displayName?: string;
    username?: string;
    pfpUrl?: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [backedRestaurants, setBackedRestaurants] = useState<MapRestaurant[]>(
    []
  );
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [currentLocationCity, setCurrentLocationCity] =
    useState<string>("Loading...");
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [holdings, setHoldings] = useState<HoldingWithDetails[]>([]);
  const [createdDishes, setCreatedDishes] = useState<
    CreatedDishWithReferrals[]
  >([]);
  const [showReputationTooltip, setShowReputationTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Sell modal state
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] =
    useState<HoldingWithDetails | null>(null);
  const [sellAmount, setSellAmount] = useState(1);
  const [sellValue, setSellValue] = useState<number | null>(null);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellStep, setSellStep] = useState<"idle" | "selling" | "complete">(
    "idle"
  );
  const [sellError, setSellError] = useState("");

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const {
    sendCalls: sendSellCalls,
    data: sellCallsId,
    error: sellCallError,
    reset: resetSell,
  } = useSendCalls();

  const { data: sellStatus } = useCallsStatus({
    id: sellCallsId?.id ?? "",
    query: {
      enabled: !!sellCallsId?.id,
      refetchInterval: (data) => {
        if (data.state.data?.status === "success") return false;
        return 2000;
      },
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const fid = await getFid();
        if (!fid) {
          setIsLoading(false);
          return;
        }

        // Get Farcaster context for display info
        const { sdk } = await import("@farcaster/miniapp-sdk");
        const context = await sdk.context;
        if (context?.user) {
          setFarcasterUser({
            displayName: context.user.displayName,
            username: context.user.username,
            pfpUrl: context.user.pfpUrl,
          });
        }

        // Fetch user data from our database
        const res = await fetch(`/api/users/${fid}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }

        // Fetch backed restaurants
        const restaurantsRes = await fetch(`/api/users/${fid}/restaurants`);
        if (restaurantsRes.ok) {
          const restaurantsData = await restaurantsRes.json();
          setBackedRestaurants(restaurantsData.restaurants || []);
          setAvailableCities(restaurantsData.cities || []);
        }

        // Fetch wishlist count
        const wishlistRes = await fetch(`/api/wishlist?fid=${fid}`);
        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json();
          setWishlistCount(wishlistData.wishlist?.length || 0);
        }

        // Fetch detailed holdings with dish info and referrer usernames
        const userRes2 = await fetch(`/api/users/${fid}`);
        if (userRes2.ok) {
          const userData = await userRes2.json();
          const portfolio = userData.user?.portfolio;
          console.log("Portfolio data:", portfolio);

          if (portfolio?.dishes) {
            console.log("Portfolio dishes:", portfolio.dishes);
            const holdingsPromises = portfolio.dishes.map(
              async (item: {
                dish: string;
                quantity: number;
                return: number;
                referredBy?: number | null;
                referredTo?: number[];
              }) => {
                try {
                  const dishRes = await fetch(`/api/dish/${item.dish}`);
                  if (!dishRes.ok) return null;
                  const dishData = await dishRes.json();
                  const dish = dishData.dish;

                  // Fetch referrer username if exists
                  let referredByInfo = null;
                  if (item.referredBy) {
                    try {
                      const referrerRes = await fetch(
                        `/api/users/${item.referredBy}`
                      );
                      if (referrerRes.ok) {
                        const referrerData = await referrerRes.json();
                        referredByInfo = {
                          fid: item.referredBy,
                          username:
                            referrerData.user?.username ||
                            `User #${item.referredBy}`,
                        };
                      }
                    } catch {
                      referredByInfo = {
                        fid: item.referredBy,
                        username: `User #${item.referredBy}`,
                      };
                    }
                  }

                  return {
                    dishId: item.dish,
                    name: dish?.name || "Unknown Dish",
                    image: dish?.image,
                    quantity: item.quantity,
                    currentPrice: dish?.currentPrice || 0,
                    totalValue: (dish?.currentPrice || 0) * item.quantity,
                    returnValue: item.return || 0,
                    restaurantName: dish?.restaurantName,
                    referredBy: referredByInfo,
                  };
                } catch {
                  return null;
                }
              }
            );

            const holdingsResults = (
              await Promise.all(holdingsPromises)
            ).filter(Boolean) as HoldingWithDetails[];
            console.log("Holdings with details:", holdingsResults);
            setHoldings(holdingsResults);

            // Fetch created dishes with referredTo info
            const createdRes = await fetch(`/api/dish/created?fid=${fid}`);
            if (createdRes.ok) {
              const createdData = await createdRes.json();

              // Build map of referredTo from portfolio
              const referredToMap = new Map<string, number[]>();
              portfolio.dishes.forEach(
                (item: { dish: string; referredTo?: number[] }) => {
                  if (item.referredTo && item.referredTo.length > 0) {
                    referredToMap.set(item.dish, item.referredTo);
                  }
                }
              );

              const createdDishesPromises = (createdData.dishes || []).map(
                async (dish: {
                  dishId: string;
                  name: string;
                  image?: string;
                  currentPrice?: number;
                  currentSupply?: number;
                  totalHolders?: number;
                  restaurantName?: string;
                }) => {
                  const referredToFids = referredToMap.get(dish.dishId) || [];

                  // Fetch usernames for referredTo
                  const referredToPromises = referredToFids.map(
                    async (refFid: number) => {
                      try {
                        const userRes3 = await fetch(`/api/users/${refFid}`);
                        if (userRes3.ok) {
                          const userData3 = await userRes3.json();
                          return {
                            fid: refFid,
                            username:
                              userData3.user?.username || `User #${refFid}`,
                          };
                        }
                      } catch {
                        // ignore
                      }
                      return { fid: refFid, username: `User #${refFid}` };
                    }
                  );

                  const referredTo = await Promise.all(referredToPromises);

                  return {
                    dishId: dish.dishId,
                    name: dish.name,
                    image: dish.image,
                    currentPrice: dish.currentPrice || 0,
                    currentSupply: dish.currentSupply || 0,
                    totalHolders: dish.totalHolders || 0,
                    restaurantName: dish.restaurantName,
                    referredTo,
                  };
                }
              );

              const createdDishesResults = await Promise.all(
                createdDishesPromises
              );
              console.log(
                "Created dishes with referrals:",
                createdDishesResults
              );
              setCreatedDishes(createdDishesResults);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Get user's current location
  useEffect(() => {
    getCurrentPosition()
      .then(async (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(location);

        // Try to reverse geocode to get city name
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&result_type=locality`
          );
          const data = await response.json();
          if (data.results?.[0]?.formatted_address) {
            const city = data.results[0].address_components?.find(
              (c: { types: string[] }) => c.types.includes("locality")
            )?.long_name;
            setCurrentLocationCity(
              city || data.results[0].formatted_address.split(",")[0]
            );
          } else {
            setCurrentLocationCity("Your Location");
          }
        } catch {
          setCurrentLocationCity("Your Location");
        }
      })
      .catch(() => {
        setCurrentLocationCity("Location unavailable");
      });
  }, []);

  // Filter restaurants by selected city
  const filteredRestaurants = useMemo(() => {
    if (!selectedCity) return backedRestaurants;
    return backedRestaurants.filter((r) => r.city === selectedCity);
  }, [backedRestaurants, selectedCity]);

  // Get map center based on selected city's restaurants or user location
  const mapCenter = useMemo(() => {
    if (selectedCity && filteredRestaurants.length > 0) {
      // Center on the first restaurant in the selected city
      return {
        lat: filteredRestaurants[0].lat,
        lng: filteredRestaurants[0].lng,
      };
    }
    return userLocation;
  }, [selectedCity, filteredRestaurants, userLocation]);

  // Display name for location
  const displayLocation = selectedCity || currentLocationCity;

  // Calculate portfolio value on-demand from holdings
  const calculatedPortfolioValue = useMemo(() => {
    return holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
  }, [holdings]);

  // Calculate user tier based on achievements
  const userTier = useMemo(() => {
    const dishesBacked = user?.portfolio?.dishes?.length || 0;
    const dishesCreated = createdDishes.length;
    const portfolioValue = calculatedPortfolioValue;
    const reputationScore = user?.reputationScore || 0;

    return calculateUserTier(
      dishesBacked,
      dishesCreated,
      portfolioValue,
      reputationScore
    );
  }, [
    user?.portfolio?.dishes?.length,
    createdDishes.length,
    calculatedPortfolioValue,
    user?.reputationScore,
  ]);

  // Calculate return percentage based on calculated value vs invested
  const returnPercentage =
    user?.portfolio.totalInvested && user.portfolio.totalInvested > 0
      ? (
          ((calculatedPortfolioValue - user.portfolio.totalInvested) /
            user.portfolio.totalInvested) *
          100
        ).toFixed(1)
      : "0";

  const totalReturn =
    calculatedPortfolioValue - (user?.portfolio.totalInvested || 0);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowReputationTooltip(false);
      }
    };

    if (showReputationTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReputationTooltip]);

  // Fetch sell value when amount changes
  const fetchSellValue = useCallback(async (dishId: string, amount: number) => {
    if (!amount || amount <= 0) {
      setSellValue(null);
      return;
    }

    try {
      const value = await publicClient.readContract({
        address: TMAP_DISHES_ADDRESS,
        abi: TMAP_DISHES_ABI,
        functionName: "getSellValue",
        args: [dishId as Hash, BigInt(amount)],
      });
      setSellValue(Number(value) / 1e6); // Convert from 6 decimals
    } catch (err) {
      console.error("Error fetching sell value:", err);
      setSellValue(null);
    }
  }, []);

  // Open sell modal
  const openSellModal = (holding: HoldingWithDetails) => {
    setSelectedHolding(holding);
    setSellAmount(1);
    setSellValue(null);
    setSellError("");
    setSellStep("idle");
    setSellModalOpen(true);
    // Fetch initial sell value
    fetchSellValue(holding.dishId, 1);
  };

  // Close sell modal
  const closeSellModal = () => {
    setSellModalOpen(false);
    setSelectedHolding(null);
    setSellAmount(1);
    setSellValue(null);
    setSellError("");
    setSellStep("idle");
    resetSell();
  };

  // Update sell value when amount changes
  useEffect(() => {
    if (selectedHolding && sellAmount > 0) {
      fetchSellValue(selectedHolding.dishId, sellAmount);
    }
  }, [sellAmount, selectedHolding, fetchSellValue]);

  // Handle sell status changes
  useEffect(() => {
    const updateAfterSell = async () => {
      if (!selectedHolding || !user?.fid) return;

      try {
        // Call API to update portfolio in database
        await fetch("/api/dish/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dishId: selectedHolding.dishId,
            sellerFid: user.fid,
            sellerAddress: address,
            tokensSold: sellAmount,
            usdcReceived: sellValue || 0,
          }),
        });
      } catch (err) {
        console.error("Error updating portfolio after sell:", err);
      }

      // Refresh page after update
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    };

    if (sellStep === "selling" && sellStatus) {
      if (
        sellStatus.status === "success" ||
        (sellStatus.receipts &&
          sellStatus.receipts.every(
            (r: { status?: string | number }) =>
              r.status === "success" ||
              r.status === "0x1" ||
              r.status === 1 ||
              r.status === "1"
          ))
      ) {
        setSellStep("complete");
        updateAfterSell();
      } else if (sellStatus.status === "failure") {
        setSellError("Transaction failed. Please try again.");
        setSellStep("idle");
      }
    }
  }, [
    sellStatus,
    sellStep,
    selectedHolding,
    user?.fid,
    address,
    sellAmount,
    sellValue,
  ]);

  // Handle sell error
  useEffect(() => {
    if (sellCallError && sellStep === "selling") {
      setSellError(sellCallError.message || "Sell failed");
      setSellStep("idle");
    }
  }, [sellCallError, sellStep]);

  // Execute sell
  const handleSell = async () => {
    if (!selectedHolding || !isConnected || !address) {
      setSellError("Please connect your wallet");
      return;
    }

    if (sellAmount <= 0 || sellAmount > selectedHolding.quantity) {
      setSellError("Invalid amount");
      return;
    }

    setSellError("");
    setSellStep("selling");
    resetSell();

    try {
      sendSellCalls({
        calls: [
          {
            to: TMAP_DISHES_ADDRESS,
            data: encodeFunctionData({
              abi: TMAP_DISHES_ABI,
              functionName: "sell",
              args: [selectedHolding.dishId as Hash, BigInt(sellAmount)],
            }),
          },
        ],
      });
    } catch (err) {
      console.error("Error selling:", err);
      setSellError(err instanceof Error ? err.message : "Failed to sell");
      setSellStep("idle");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-6">
        {/* Profile Info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {farcasterUser?.pfpUrl ? (
              <img
                src={farcasterUser.pfpUrl}
                alt={farcasterUser.username || "Profile"}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {farcasterUser?.displayName || user?.username || "Anonymous"}
              </h1>
              <p className="text-gray-500">
                @{farcasterUser?.username || user?.username || "user"}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`badge ${userTier.badgeClass}`}>
                  {userTier.name.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              PORTFOLIO VALUE
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(calculatedPortfolioValue)}
            </p>
            {holdings.length > 0 && (
              <p
                className={`text-sm flex items-center gap-1 ${
                  totalReturn >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totalReturn >= 0 ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 17l5-5 5 5"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 7l-5 5-5-5"
                    />
                  </svg>
                )}
                {totalReturn >= 0 ? "+" : ""}
                {returnPercentage}% return
              </p>
            )}
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 relative" ref={tooltipRef}>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
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
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              REPUTATION
              <button
                onClick={() => setShowReputationTooltip(!showReputationTooltip)}
                className="ml-auto p-0.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
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
              </button>
            </div>
            <p className="text-2xl font-bold text-primary-dark">
              {user?.reputationScore || 0}
            </p>
            <p className="text-sm text-gray-500">
              {getReputationRank(user?.reputationScore || 0)}
            </p>

            {/* Reputation Tooltip */}
            {showReputationTooltip && (
              <div className="absolute top-full left-0 right-0 mt-2 z-20">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-4 h-4 text-primary-dark"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    <span className="font-semibold text-gray-900 text-sm">
                      Reputation Score
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Your reputation reflects your impact on the tmap community.
                    Earn points by:
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-1.5 h-1.5 bg-primary-dark rounded-full"></span>
                      <span>Creating popular dishes</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-1.5 h-1.5 bg-primary-dark rounded-full"></span>
                      <span>Referring friends to mint</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-1.5 h-1.5 bg-primary-dark rounded-full"></span>
                      <span>Early backing of trending dishes</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-1.5 h-1.5 bg-primary-dark rounded-full"></span>
                      <span>Consistent activity over time</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Higher reputation unlocks badges and increases your
                      visibility.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              TOTAL INVESTED
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(user?.portfolio.totalInvested || 0)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              STAMPS
            </div>
            <p className="text-xl font-bold text-gray-900">
              {user?.portfolio.dishes.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Wishlist Button */}
      <div className="px-4 py-4">
        <Link
          href="/wishlist"
          className="group flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 hover:border-primary-soft hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-400 group-hover:from-red-100 group-hover:to-red-200 group-hover:text-red-500 transition-all">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              {wishlistCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-primary-dark transition-colors">
                My Wishlist
              </p>
              <p className="text-sm text-gray-500">
                {wishlistCount === 0
                  ? "Save dishes you want to try"
                  : `${wishlistCount} saved ${
                      wishlistCount === 1 ? "dish" : "dishes"
                    }`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-gray-300 group-hover:text-primary-dark group-hover:translate-x-1 transition-all"
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
          </div>
        </Link>
      </div>

      {/* Taste Map Section */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
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
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">
              Your Taste Map
            </h2>
          </div>
          <span className="text-sm font-medium text-primary-dark">
            {filteredRestaurants.length}{" "}
            {filteredRestaurants.length === 1 ? "Spot" : "Spots"}
          </span>
        </div>

        {/* Map Container */}
        <div className="relative h-52 rounded-2xl overflow-hidden shadow-sm">
          <GoogleMapView
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            center={mapCenter}
            userLocation={userLocation}
            showRecenterButton={!selectedCity}
            restaurants={filteredRestaurants}
            defaultZoom={13}
          />

          {/* Location label with city picker */}
          <div className="absolute bottom-3 right-3 z-10">
            <button
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5 hover:bg-white transition-colors shadow-sm"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {displayLocation}
              {availableCities.length > 0 && (
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showCityPicker ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>

            {/* City Picker Dropdown */}
            {showCityPicker && availableCities.length > 0 && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCity(null);
                    setShowCityPicker(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    !selectedCity
                      ? "text-primary-dark font-medium"
                      : "text-gray-700"
                  }`}
                >
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
                      d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
                    />
                  </svg>
                  Current Location
                  {!selectedCity && (
                    <svg
                      className="w-4 h-4 ml-auto text-primary-dark"
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
                  )}
                </button>
                <div className="border-t border-gray-100 my-1" />
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setSelectedCity(city);
                      setShowCityPicker(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                      selectedCity === city
                        ? "text-primary-dark font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {city}
                    {selectedCity === city && (
                      <svg
                        className="w-4 h-4 text-primary-dark"
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
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your Holdings Section */}
      <div className="px-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Stamps
        </h2>

        {holdings.length > 0 ? (
          <div className="space-y-3">
            {holdings.map((holding) => (
              <div
                key={holding.dishId}
                className="bg-white rounded-2xl p-4 border border-gray-100"
              >
                <div className="flex gap-3">
                  <Link
                    href={`/dish/${holding.dishId}`}
                    className="flex-shrink-0"
                  >
                    <img
                      src={
                        holding.image ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
                      }
                      alt={holding.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/dish/${holding.dishId}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="font-medium text-gray-900 truncate">
                          {holding.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {holding.quantity} Stamps
                        </p>
                      </Link>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-semibold text-gray-900">
                          ${holding.totalValue.toFixed(2)}
                        </p>
                        <p
                          className={`text-sm ${
                            holding.returnValue >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {holding.returnValue >= 0 ? "+" : ""}
                          {formatCurrency(holding.returnValue)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span>${holding.currentPrice.toFixed(2)} each</span>
                      {holding.restaurantName && (
                        <span>{holding.restaurantName}</span>
                      )}
                    </div>
                    {holding.referredBy && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
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
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          via @{holding.referredBy.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No Stamps yet</p>
            <Link
              href="/explore"
              className="inline-block btn-primary px-6 py-2 rounded-xl text-sm font-medium"
            >
              Explore Dishes
            </Link>
          </div>
        )}
      </div>

      {/* Stamps You Created Section */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Stamps You Created
        </h2>
        {createdDishes.length > 0 ? (
          <div className="space-y-3">
            {createdDishes.map((dish) => (
              <Link
                key={dish.dishId}
                href={`/dish/${dish.dishId}`}
                className="block bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex gap-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        dish.image ||
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
                      }
                      alt={dish.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 1L9 9l-8 2 6 5-2 8 7-4 7 4-2-8 6-5-8-2-3-8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {dish.name}
                        </p>
                        {dish.restaurantName && (
                          <p className="text-xs text-gray-500 truncate">
                            {dish.restaurantName}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-green-600 flex-shrink-0 ml-2">
                        ${dish.currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      <span>{dish.currentSupply} minted</span>
                      <span>{dish.totalHolders} holders</span>
                    </div>
                    {dish.referredTo.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
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
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          +2.5% earned
                        </span>
                        {dish.referredTo.map((u) => (
                          <span
                            key={u.fid}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            @{u.username}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">
              You haven&apos;t created any stamps yet
            </p>
            <Link
              href="/create"
              className="inline-block btn-primary px-6 py-2 rounded-xl text-sm font-medium"
            >
              Create a Stamp
            </Link>
          </div>
        )}
      </div>

      {/* Sell Modal */}
      {sellModalOpen && selectedHolding && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={closeSellModal}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Sticky */}
            <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Sell Stamps
              </h2>
              <button
                onClick={closeSellModal}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Dish Info */}
              <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <img
                  src={
                    selectedHolding.image ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
                  }
                  alt={selectedHolding.name}
                  className="w-14 h-14 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {selectedHolding.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedHolding.quantity} stamps · $
                    {selectedHolding.currentPrice.toFixed(2)} each
                  </p>
                </div>
              </div>

              {/* Amount Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to sell
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSellAmount(Math.max(1, sellAmount - 1))}
                    disabled={sellAmount <= 1 || sellStep === "selling"}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg text-gray-600">−</span>
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {sellAmount}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSellAmount(
                        Math.min(selectedHolding.quantity, sellAmount + 1)
                      )
                    }
                    disabled={
                      sellAmount >= selectedHolding.quantity ||
                      sellStep === "selling"
                    }
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg text-gray-600">+</span>
                  </button>
                </div>
                {/* Quick select buttons */}
                {selectedHolding.quantity > 1 && (
                  <div className="flex gap-2 justify-center mt-2">
                    <button
                      onClick={() => setSellAmount(1)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        sellAmount === 1
                          ? "bg-primary-soft text-primary-dark"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      1
                    </button>
                    {selectedHolding.quantity >= 2 && (
                      <button
                        onClick={() =>
                          setSellAmount(
                            Math.floor(selectedHolding.quantity / 2)
                          )
                        }
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          sellAmount ===
                          Math.floor(selectedHolding.quantity / 2)
                            ? "bg-primary-soft text-primary-dark"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Half
                      </button>
                    )}
                    <button
                      onClick={() => setSellAmount(selectedHolding.quantity)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        sellAmount === selectedHolding.quantity
                          ? "bg-primary-soft text-primary-dark"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      All
                    </button>
                  </div>
                )}
              </div>

              {/* Sell Value */}
              <div className="bg-green-50 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-green-600 mb-0.5">
                      You will receive
                    </p>
                    <p className="text-xl font-bold text-green-700">
                      {sellValue !== null ? `$${sellValue.toFixed(2)}` : "..."}
                      <span className="text-sm font-normal text-green-600 ml-1">
                        USDC
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      70% return
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {sellError && (
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-sm text-red-600">{sellError}</p>
                </div>
              )}

              {/* Success Message */}
              {sellStep === "complete" && (
                <div className="bg-green-50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-600"
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
                    <p className="text-sm font-medium text-green-700">
                      Sold successfully! Refreshing...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sell Button - Sticky bottom */}
            <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100">
              <button
                onClick={handleSell}
                disabled={
                  sellStep === "selling" ||
                  sellStep === "complete" ||
                  sellValue === null
                }
                className="w-full py-3 btn-primary disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {sellStep === "selling" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Selling...
                  </>
                ) : sellStep === "complete" ? (
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
                    Sold!
                  </>
                ) : (
                  `Sell for $${sellValue?.toFixed(2) || "..."}`
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Selling returns 70% of market value
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { useFarcaster } from "@/app/providers/FarcasterProvider";

interface UserData {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  badges: string[];
  portfolio: {
    totalValue: number;
    totalReturn: number;
    totalInvested: number;
    dishes: { dish: string; quantity: number; return: number; referredBy?: number | null }[];
  };
  reputationScore: number;
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

interface CreatedDish {
  dishId: string;
  name: string;
  image?: string;
  currentPrice: number;
  totalHolders: number;
  currentSupply: number;
  restaurantName?: string;
  dailyPriceChange?: number;
}


function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(2)}`;
}

function getReputationRank(score: number): string {
  if (score >= 1000) return "Food Legend";
  if (score >= 750) return "Master Taster";
  if (score >= 500) return "Local Tastemaker";
  if (score >= 250) return "Rising Foodie";
  if (score >= 100) return "Taste Explorer";
  return "New Taster";
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const fid = params.fid as string;
  const { user: currentUser } = useFarcaster();

  const [user, setUser] = useState<UserData | null>(null);
  const [holdings, setHoldings] = useState<HoldingWithDetails[]>([]);
  const [createdDishes, setCreatedDishes] = useState<CreatedDish[]>([]);
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user
        const userRes = await fetch(`/api/users/${fid}`);
        if (!userRes.ok) {
          setError("User not found");
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        const portfolio = userData.user?.portfolio;

        // Fetch holdings (stamps the user owns)
        if (portfolio?.dishes) {
          const holdingsPromises = portfolio.dishes.map(async (item: { dish: string; quantity: number; return: number; referredBy?: number | null }) => {
            try {
              const dishRes = await fetch(`/api/dish/${item.dish}`);
              if (!dishRes.ok) return null;
              const dishData = await dishRes.json();
              const dish = dishData.dish;

              // Fetch referrer username if exists
              let referredByInfo = null;
              if (item.referredBy) {
                try {
                  const referrerRes = await fetch(`/api/users/${item.referredBy}`);
                  if (referrerRes.ok) {
                    const referrerData = await referrerRes.json();
                    referredByInfo = {
                      fid: item.referredBy,
                      username: referrerData.user?.username || `User #${item.referredBy}`,
                    };
                  }
                } catch {
                  referredByInfo = { fid: item.referredBy, username: `User #${item.referredBy}` };
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
          });

          const holdingsResults = (await Promise.all(holdingsPromises)).filter(Boolean) as HoldingWithDetails[];
          setHoldings(holdingsResults);
        }

        // Fetch dishes created by this user
        const dishesRes = await fetch(`/api/dish/created?fid=${fid}`);
        if (dishesRes.ok) {
          const dishesData = await dishesRes.json();
          setCreatedDishes(dishesData.dishes || []);
        }

        // Fetch current user's wishlist to check which dishes are already wishlisted
        if (currentUser?.fid) {
          const wishlistRes = await fetch(`/api/wishlist?fid=${currentUser.fid}`);
          if (wishlistRes.ok) {
            const wishlistData = await wishlistRes.json();
            const wishlistDishIds = new Set<string>(
              (wishlistData.wishlist || []).map((item: { dish: string }) => item.dish)
            );
            setWishlisted(wishlistDishIds);
          }
        }
      } catch (err) {
        console.error("Failed to fetch:", err);
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    if (fid) fetchData();
  }, [fid, currentUser?.fid]);

  const handleToggleWishlist = async (e: React.MouseEvent, dishId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert("Please sign in to add to wishlist");
      return;
    }

    const isCurrentlyWishlisted = wishlisted.has(dishId);

    try {
      if (isCurrentlyWishlisted) {
        // Remove from wishlist
        await fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: currentUser.fid,
            dishId,
          }),
        });
        setWishlisted((prev) => {
          const newSet = new Set(prev);
          newSet.delete(dishId);
          return newSet;
        });
      } else {
        // Add to wishlist
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: currentUser.fid,
            dishId,
            referrer: parseInt(fid), // The profile owner is the referrer
          }),
        });
        setWishlisted((prev) => new Set(prev).add(dishId));
      }
    } catch (error) {
      console.error("Failed to update wishlist", error);
    }
  };

  // Calculate portfolio value dynamically from holdings
  const calculatedPortfolioValue = useMemo(() => {
    return holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
  }, [holdings]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-gray-500 mb-4">{error || "User not found"}</p>
        <button onClick={() => router.back()} className="text-[var(--primary-dark)] font-medium">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {user.displayName || `@${user.username}`}
          </h1>
        </div>
      </header>

      {/* Profile Info */}
      <div className="bg-white px-4 py-6 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          {user.pfpUrl ? (
            <img src={user.pfpUrl} alt={user.username} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.displayName || user.username}</h2>
            <p className="text-gray-500">@{user.username}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {user.badges?.length > 0 ? (
                user.badges.map((badge, i) => (
                  <span key={i} className={`badge ${i === 0 ? "badge-yellow" : "badge-gray"}`}>{badge}</span>
                ))
              ) : (
                <span className="badge badge-gray">NEW TASTER</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">PORTFOLIO VALUE</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculatedPortfolioValue)}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">REPUTATION</p>
            <p className="text-2xl font-bold text-primary-dark">{user.reputationScore || 0}</p>
            <p className="text-sm text-gray-500">{getReputationRank(user.reputationScore || 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">STAMPS</p>
            <p className="text-xl font-bold text-gray-900">{holdings.length}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">DISHES CREATED</p>
            <p className="text-xl font-bold text-gray-900">{createdDishes.length}</p>
          </div>
        </div>
      </div>

      {/* Stamps Section */}
      <div className="px-4 py-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stamps</h3>
        {holdings.length > 0 ? (
          <div className="space-y-3">
            {holdings.map((holding) => (
              <Link
                key={holding.dishId}
                href={`/dish/${holding.dishId}`}
                className="block bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex gap-3">
                  <img
                    src={holding.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
                    alt={holding.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{holding.name}</p>
                        <p className="text-sm text-gray-500">{holding.quantity} Stamps</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-semibold text-gray-900">${holding.totalValue.toFixed(2)}</p>
                        <p className={`text-sm ${holding.returnValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {holding.returnValue >= 0 ? '+' : ''}{formatCurrency(holding.returnValue)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span>${holding.currentPrice.toFixed(2)} each</span>
                      {holding.restaurantName && <span>{holding.restaurantName}</span>}
                    </div>
                    {holding.referredBy && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          via @{holding.referredBy.username}
                        </span>
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
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-500">No stamps yet</p>
          </div>
        )}
      </div>

      {/* Created Dishes */}
      <div className="px-4 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dishes Created</h3>
        {createdDishes.length > 0 ? (
          <div className="space-y-3">
            {createdDishes.map((dish) => (
              <Link key={dish.dishId} href={`/dish/${dish.dishId}`}>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                  <img
                    src={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                    alt={dish.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{dish.name}</p>
                    {dish.restaurantName && (
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {dish.restaurantName}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>{dish.currentSupply || 0} minted</span>
                      <span>{dish.totalHolders || 0} holders</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-semibold text-green-600">${(dish.currentPrice || 0).toFixed(2)}</p>
                    {currentUser?.fid !== parseInt(fid) && (
                      <button
                        onClick={(e) => handleToggleWishlist(e, dish.dishId)}
                        className={`p-1.5 rounded-full transition-colors ${
                          wishlisted.has(dish.dishId)
                            ? "text-red-500 hover:bg-red-50"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                        }`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill={wishlisted.has(dish.dishId) ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <p className="text-gray-500">No dishes created yet</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

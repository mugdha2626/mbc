"use client";

import { Header } from "@/app/components/layout/Header";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { PriceChange } from "@/app/components/shared/PriceChange";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useFarcaster } from "@/app/providers/FarcasterProvider";

interface PortfolioHolding {
  dishId: string;
  name: string;
  image?: string;
  quantity: number;
  currentPrice: number;
  totalValue: number;
  dailyPriceChange: number;
  restaurantName?: string;
}

interface CreatedDish {
  dishId: string;
  name: string;
  image?: string;
  totalHolders: number;
  marketCap: number;
  currentPrice: number;
  currentSupply: number;
  dailyVolume: number;
  dailyPriceChange: number;
  restaurantName?: string;
  restaurantAddress?: string;
}

interface WishlistItem {
  dishId: string;
  name: string;
  image?: string;
  currentPrice: number;
  restaurantName?: string;
  referrer: number;
}

interface PortfolioData {
  holdings: PortfolioHolding[];
  createdDishes: CreatedDish[];
  totalValue: number;
  totalReturn: number;
  totalInvested: number;
}

export default function PortfolioPage() {
  const { user } = useFarcaster();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!user?.fid) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user data which includes portfolio
        const userRes = await fetch(`/api/users/${user.fid}`);
        if (!userRes.ok) {
          throw new Error("Failed to fetch user");
        }
        const userData = await userRes.json();
        const portfolio = userData.user?.portfolio;

        if (!portfolio) {
          setPortfolioData({
            holdings: [],
            createdDishes: [],
            totalValue: 0,
            totalReturn: 0,
            totalInvested: 0,
          });
          setLoading(false);
          return;
        }

        // Fetch details for each dish in portfolio
        const holdingsPromises = (portfolio.dishes || []).map(async (item: { dish: string; quantity: number }) => {
          try {
            const dishRes = await fetch(`/api/dish/${item.dish}`);
            if (!dishRes.ok) return null;
            const dishData = await dishRes.json();
            const dish = dishData.dish;
            return {
              dishId: item.dish,
              name: dish?.name || "Unknown Dish",
              image: dish?.image,
              quantity: item.quantity,
              currentPrice: dish?.currentPrice || 0,
              totalValue: (dish?.currentPrice || 0) * item.quantity,
              dailyPriceChange: dish?.dailyPriceChange || 0,
              restaurantName: dish?.restaurantName,
            };
          } catch {
            return null;
          }
        });

        // Fetch dishes created by this user
        const createdRes = await fetch(`/api/dish/created?fid=${user.fid}`);
        let createdDishes: CreatedDish[] = [];
        if (createdRes.ok) {
          const createdData = await createdRes.json();
          createdDishes = (createdData.dishes || []).map((dish: {
            dishId: string;
            name: string;
            image?: string;
            totalHolders?: number;
            marketCap?: number;
            currentPrice?: number;
            currentSupply?: number;
            dailyVolume?: number;
            dailyPriceChange?: number;
            restaurantName?: string;
            restaurantAddress?: string;
          }) => ({
            dishId: dish.dishId,
            name: dish.name,
            image: dish.image,
            totalHolders: dish.totalHolders || 0,
            marketCap: dish.marketCap || 0,
            currentPrice: dish.currentPrice || 0,
            currentSupply: dish.currentSupply || 0,
            dailyVolume: dish.dailyVolume || 0,
            dailyPriceChange: dish.dailyPriceChange || 0,
            restaurantName: dish.restaurantName,
            restaurantAddress: dish.restaurantAddress,
          }));
        }

        const holdings = (await Promise.all(holdingsPromises)).filter(Boolean) as PortfolioHolding[];
        const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);

        // Fetch wishlist
        const wishlistRes = await fetch(`/api/wishlist?fid=${user.fid}`);
        let wishlistItems: WishlistItem[] = [];
        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json();
          // Fetch dish details for each wishlist item
          const wishlistPromises = (wishlistData.wishlist || []).map(
            async (item: { dish: string; referrer: number }) => {
              try {
                const dishRes = await fetch(`/api/dish/${item.dish}`);
                if (!dishRes.ok) return null;
                const dishData = await dishRes.json();
                const dish = dishData.dish;
                return {
                  dishId: item.dish,
                  name: dish?.name || "Unknown Dish",
                  image: dish?.image,
                  currentPrice: dish?.currentPrice || 0,
                  restaurantName: dish?.restaurantName,
                  referrer: item.referrer,
                };
              } catch {
                return null;
              }
            }
          );
          wishlistItems = (await Promise.all(wishlistPromises)).filter(Boolean) as WishlistItem[];
        }
        setWishlist(wishlistItems);

        setPortfolioData({
          holdings,
          createdDishes,
          totalValue,
          totalReturn: portfolio.totalReturn || 0,
          totalInvested: portfolio.totalInvested || 0,
        });
      } catch (err) {
        console.error("Error fetching portfolio:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [user?.fid]);

  // Remove item from wishlist
  const handleRemoveFromWishlist = async (dishId: string) => {
    if (!user?.fid) return;

    try {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: user.fid, dishId }),
      });

      if (res.ok) {
        setWishlist((prev) => prev.filter((item) => item.dishId !== dishId));
      }
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
    }
  };

  // Calculate stats
  const totalValue = portfolioData?.totalValue || 0;
  const totalReturn = portfolioData?.totalReturn || 0;
  const totalReturnPercent = portfolioData?.totalInvested
    ? ((totalReturn / portfolioData.totalInvested) * 100)
    : 0;
  const tokensOwned = portfolioData?.holdings.reduce((sum, h) => sum + h.quantity, 0) || 0;
  const tokensCreated = portfolioData?.createdDishes.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-gray-900 pb-24">
        <Header title="Portfolio" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading portfolio...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-gray-900 pb-24">
        <Header title="Portfolio" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Please sign in to view your portfolio</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-gray-900 pb-24">
      <Header title="Portfolio" />

      {/* Portfolio Summary */}
      <div className="px-4 py-6">
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] border border-[var(--primary-dark)]/30 rounded-2xl p-6">
          <p className="text-sm text-gray-600 mb-1">Total Portfolio Value</p>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-bold text-gray-900">${totalValue.toFixed(2)}</span>
            <PriceChange value={totalReturnPercent} size="md" />
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-semibold text-gray-900">{tokensOwned}</p>
              <p className="text-xs text-gray-500">Stamps Owned</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{tokensCreated}</p>
              <p className="text-xs text-gray-500">Stamps Created</p>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Your Holdings</h2>
        {portfolioData?.holdings && portfolioData.holdings.length > 0 ? (
          <div className="space-y-3">
            {portfolioData.holdings.map((holding) => (
              <Link key={holding.dishId} href={`/dish/${holding.dishId}`}>
                <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors shadow-sm">
                  <div className="flex gap-4">
                    <img
                      src={holding.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
                      alt={holding.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{holding.name}</h3>
                          <p className="text-sm text-gray-500">{holding.quantity} Stamps</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${holding.totalValue.toFixed(2)}</p>
                          <PriceChange value={holding.dailyPriceChange} size="sm" />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Price: ${holding.currentPrice.toFixed(2)}</span>
                        {holding.restaurantName && <span>{holding.restaurantName}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <p className="text-gray-500">No stamps yet. Back a dish to get started!</p>
            <Link href="/explore" className="text-primary font-medium mt-2 inline-block">
              Explore dishes →
            </Link>
          </div>
        )}
      </div>

      {/* Created Tokens */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Stamps You Created</h2>
        {portfolioData?.createdDishes && portfolioData.createdDishes.length > 0 ? (
          <div className="space-y-3">
            {portfolioData.createdDishes.map((dish) => (
              <Link key={dish.dishId} href={`/dish/${dish.dishId}`}>
                <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors shadow-sm">
                  <div className="flex gap-4">
                    <div className="relative">
                      <img
                        src={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
                        alt={dish.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L9 9l-8 2 6 5-2 8 7-4 7 4-2-8 6-5-8-2-3-8z"/></svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{dish.name}</h3>
                          {dish.restaurantName && (
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {dish.restaurantName}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-semibold text-green-600">${dish.currentPrice.toFixed(2)}</p>
                          <PriceChange value={dish.dailyPriceChange} size="sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {dish.totalHolders} holders
                        </span>
                        <span>Supply: {dish.currentSupply}</span>
                        <span>MC: ${dish.marketCap.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <p className="text-gray-500">You haven&apos;t created any stamps yet.</p>
            <Link href="/create" className="text-primary font-medium mt-2 inline-block">
              Create a stamp →
            </Link>
          </div>
        )}
      </div>

      {/* Wishlist */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Your Wishlist</h2>
        {wishlist.length > 0 ? (
          <div className="space-y-3">
            {wishlist.map((item) => (
              <div key={item.dishId} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex gap-4">
                  <Link href={`/dish/${item.dishId}`} className="flex-shrink-0">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
                      alt={item.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dish/${item.dishId}`}>
                      <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                      {item.restaurantName && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {item.restaurantName}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-green-600 mt-1">${item.currentPrice.toFixed(2)}</p>
                    </Link>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/dish/${item.dishId}`}
                      className="px-3 py-1.5 bg-[var(--primary)] text-gray-900 text-sm font-medium rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      Mint
                    </Link>
                    <button
                      onClick={() => handleRemoveFromWishlist(item.dishId)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove from wishlist"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <p className="text-gray-500">Your wishlist is empty.</p>
            <p className="text-xs text-gray-400 mt-1">Heart dishes from other users&apos; profiles to add them here!</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

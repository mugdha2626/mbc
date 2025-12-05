"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { useFarcaster } from "@/app/providers/FarcasterProvider";

interface WishlistDish {
  dishId: string;
  name: string;
  image?: string;
  restaurant: string;
  restaurantName?: string;
  currentPrice?: number;
  dailyPriceChange?: number;
  totalHolders?: number;
  marketCap?: number;
  referrer?: number;
}

export default function WishlistPage() {
  const router = useRouter();
  const { user, isLoaded } = useFarcaster();
  const [wishlistDishes, setWishlistDishes] = useState<WishlistDish[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch wishlist items
        const res = await fetch(`/api/wishlist?fid=${user.fid}`);
        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const wishlistItems = data.wishlist || [];

        if (wishlistItems.length === 0) {
          setWishlistDishes([]);
          setIsLoading(false);
          return;
        }

        // Fetch dish details for each wishlist item
        const dishPromises = wishlistItems.map(async (item: { dish: string; referrer: number }) => {
          try {
            const dishRes = await fetch(`/api/dish/${item.dish}`);
            if (dishRes.ok) {
              const dishData = await dishRes.json();
              return { ...dishData.dish, referrer: item.referrer };
            }
            return null;
          } catch {
            return null;
          }
        });

        const dishes = await Promise.all(dishPromises);
        setWishlistDishes(dishes.filter(Boolean) as WishlistDish[]);
      } catch (error) {
        console.error("Failed to fetch wishlist", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      fetchWishlist();
    }
  }, [user, isLoaded]);

  const handleRemoveFromWishlist = async (dishId: string) => {
    if (!user) return;

    try {
      await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: user.fid, dishId }),
      });
      setWishlistDishes((prev) => prev.filter((d) => d.dishId !== dishId));
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return "$0.00";
    return `$${price.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (!marketCap) return "$0";
    if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(1)}K`;
    }
    return `$${marketCap.toFixed(0)}`;
  };

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
          </div>
        </header>
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
              {wishlistDishes.length > 0 && (
                <p className="text-sm text-gray-500">{wishlistDishes.length} saved {wishlistDishes.length === 1 ? 'dish' : 'dishes'}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {!user ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your wishlist</h3>
            <p className="text-gray-500 mb-6">Connect with Farcaster to save dishes</p>
          </div>
        ) : wishlistDishes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 mb-6">Explore dishes and tap the heart to save your favorites!</p>
            <Link
              href="/explore"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Explore Dishes
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {wishlistDishes.map((dish) => (
              <Link key={dish.dishId} href={`/dish/${dish.dishId}`}>
                <div className="bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-md hover:border-gray-200 transition-all relative group">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="relative">
                      <img
                        src={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                        alt={dish.name}
                        className="w-24 h-24 rounded-xl object-cover shrink-0"
                      />
                      {/* Wishlist badge */}
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">
                            {dish.name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveFromWishlist(dish.dishId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                            title="Remove from wishlist"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="truncate">{dish.restaurantName || "Unknown Restaurant"}</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-green-600">
                            {formatPrice(dish.currentPrice)}
                          </span>
                          {dish.dailyPriceChange !== undefined && (
                            <span className={`text-xs font-medium ${dish.dailyPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {dish.dailyPriceChange >= 0 ? '+' : ''}{dish.dailyPriceChange.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{dish.totalHolders || 0}</span>
                          </div>
                          <span>MC: {formatMarketCap(dish.marketCap)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

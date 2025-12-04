"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { BackedDishCard } from "@/app/components/cards/BackedDishCard";

interface DishData {
  dishId: string;
  name: string;
  image?: string;
  currentPrice: number;
  dailyPriceChange: number;
  totalHolders: number;
  marketCap: number;
  creatorUsername: string;
}

interface RestaurantData {
  id: string;
  name: string;
  address: string;
  image: string;
  tmapRating: number;
  dishes: DishData[];
  stats: {
    dishCount: number;
    totalHolders: number;
    totalVolume: number;
  };
}

export default function RestaurantPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRestaurant() {
      if (!restaurantId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Restaurant not found");
          } else {
            setError("Failed to load restaurant");
          }
          return;
        }

        const data = await response.json();
        setRestaurant(data);
      } catch (err) {
        console.error("Error fetching restaurant:", err);
        setError("Failed to load restaurant");
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurant();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="animate-pulse">
          <div className="h-56 bg-gray-200" />
          <div className="bg-white rounded-t-3xl -mt-4 relative p-4">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || "Restaurant not found"}</p>
          <button
            onClick={() => router.back()}
            className="text-primary-dark font-medium hover:underline"
          >
            Go back
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Image */}
      <div className="relative h-56">
        <img
          src={restaurant.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

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

        {/* Restaurant name overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="group relative flex items-center gap-1 text-yellow-400 cursor-help">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span className="text-white font-medium">{restaurant.tmapRating.toFixed(1)}</span>

              {/* Tooltip */}
              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-white text-gray-700 text-xs font-medium rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none shadow-lg z-10">
                Average dish token price
                <div className="absolute top-full left-4 border-4 border-transparent border-t-white" />
              </div>
            </div>
            <span className="text-white/60">•</span>
            <span className="text-white/80 text-sm">{restaurant.stats.totalHolders} holders</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl -mt-4 relative">
        <div className="px-4 py-6">
          {/* Address */}
          <a
            href={restaurant.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-primary-dark transition-colors group"
          >
            <svg className="w-4 h-4 text-primary-dark group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="underline decoration-dotted decoration-gray-300 underline-offset-2 group-hover:decoration-primary-dark">
              {restaurant.address || "Address not available"}
            </span>
            <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Top Dishes Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Dishes {restaurant.dishes.length > 0 && `(${restaurant.dishes.length})`}
            </h2>
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              Sort by
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Dish List */}
          {restaurant.dishes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No dishes yet</p>
              <p className="text-sm text-gray-400 mt-1">Be the first to mint a dish here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {restaurant.dishes.map((dish) => (
                <BackedDishCard
                  key={dish.dishId}
                  id={dish.dishId}
                  name={dish.name}
                  image={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                  price={dish.currentPrice}
                  holders={dish.totalHolders}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

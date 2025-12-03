"use client";

import { useState } from "react";
import { Header } from "@/app/components/layout/Header";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { FilterPills } from "@/app/components/ui/FilterPills";
import { DishCard } from "@/app/components/cards/DishCard";
import { RestaurantCard } from "@/app/components/cards/RestaurantCard";

const exploreFilters = [
  { id: "trending", label: "Trending", icon: <span>🔥</span> },
  { id: "new", label: "New", icon: <span>✨</span> },
  { id: "nearby", label: "Nearby", icon: <span>📍</span> },
  { id: "top", label: "Top Rated", icon: <span>⭐</span> },
];

const trendingDishes = [
  {
    id: "1",
    name: "Truffle Mushroom Risotto",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400",
    price: 24.50,
    marketCap: "$12.4K",
    volume: "$8.2K",
    priceChange: 15.3,
    holders: ["https://i.pravatar.cc/100?img=1", "https://i.pravatar.cc/100?img=2", "https://i.pravatar.cc/100?img=3"],
  },
  {
    id: "2",
    name: "Spicy Tuna Roll",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400",
    price: 18.20,
    marketCap: "$9.1K",
    volume: "$5.4K",
    priceChange: 8.7,
    holders: ["https://i.pravatar.cc/100?img=4", "https://i.pravatar.cc/100?img=5"],
  },
  {
    id: "3",
    name: "Wood-Fired Pizza",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    price: 12.75,
    marketCap: "$6.8K",
    volume: "$4.2K",
    priceChange: -2.1,
    holders: ["https://i.pravatar.cc/100?img=6", "https://i.pravatar.cc/100?img=7", "https://i.pravatar.cc/100?img=8"],
  },
];

const featuredRestaurants = [
  {
    id: "1",
    name: "Spicy House Kitchen",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
    tags: ["Thai", "Asian Fusion"],
    address: "Downtown District, SF",
    topDishCount: 8,
    badge: "Rising Star",
  },
  {
    id: "2",
    name: "The Garden Kitchen",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
    tags: ["Italian", "Vegetarian"],
    address: "Mission District, SF",
    topDishCount: 12,
  },
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<"dishes" | "restaurants">("dishes");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Header />

      {/* Tab Switcher */}
      <div className="px-4 py-3">
        <div className="flex gap-2 bg-zinc-800/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("dishes")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "dishes"
                ? "bg-purple-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Dishes
          </button>
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "restaurants"
                ? "bg-purple-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Restaurants
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-4">
        <FilterPills filters={exploreFilters} />
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === "dishes" ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold mb-3">Trending Now 🔥</h2>
            {trendingDishes.map((dish) => (
              <DishCard key={dish.id} {...dish} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-3">Featured Restaurants</h2>
            {featuredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} {...restaurant} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

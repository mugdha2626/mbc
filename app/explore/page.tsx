"use client";

import { useState } from "react";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { BackedDishCard } from "@/app/components/cards/BackedDishCard";

const exploreFilters = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "nearby", label: "Nearby" },
  { id: "top", label: "Top Rated" },
];

const trendingDishes = [
  {
    id: "1",
    name: "Truffle Mushroom Risotto",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400",
    restaurant: "The Garden Kitchen",
    creator: "foodie_hero",
    price: 24.50,
    priceChange: 15.3,
    holders: 342,
    marketCap: "$12.4K",
  },
  {
    id: "2",
    name: "Spicy Tuna Roll",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400",
    restaurant: "Sushi Master",
    creator: "sushi_lover",
    price: 18.20,
    priceChange: 8.7,
    holders: 180,
    marketCap: "$9.1K",
  },
  {
    id: "3",
    name: "Wood-Fired Pizza",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    restaurant: "Joe's Pizza",
    creator: "pizza_king",
    price: 12.75,
    priceChange: -2.1,
    holders: 95,
    marketCap: "$6.8K",
  },
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<"dishes" | "restaurants">("dishes");
  const [activeFilter, setActiveFilter] = useState("trending");

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Explore</h1>
      </header>

      {/* Tab Switcher */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("dishes")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "dishes"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Dishes
          </button>
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "restaurants"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Restaurants
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {exploreFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === filter.id
                  ? "btn-primary"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "dishes" ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Trending Now</h2>
            {trendingDishes.map((dish) => (
              <BackedDishCard key={dish.id} {...dish} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Featured Restaurants</h2>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

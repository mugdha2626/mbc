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

      {/* Map Section with Overlay */}
      <div className="relative h-48 bg-gray-200">
        {/* Map Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-73.99,40.73,12,0/400x200@2x?access_token=pk.placeholder')",
            backgroundColor: "#e5e7eb"
          }}
        >
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>

        {/* Spots Count Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg drop-shadow-md">12 spots near you</p>
              <p className="text-white/80 text-sm drop-shadow-md">Within 5 miles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Center Aligned */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2 justify-center">
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

"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { BackedDishCard } from "@/app/components/cards/BackedDishCard";
import { GoogleMapView } from "@/app/components/map/GoogleMapView";
import { getCurrentPosition } from "@/lib/geo";

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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch user's current location on mount
  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      })
      .catch(() => {
        // Location unavailable - will use default center
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-pink pb-24">
      {/* Header */}
      <header className="glass-strong px-4 py-4 border-b border-card-border">
        <h1 className="text-xl font-bold text-foreground">Explore</h1>
      </header>

      {/* Tab Switcher */}
      <div className="glass-soft px-4 py-3 border-b border-card-border">
        <div className="flex gap-2 glass rounded-xl p-1">
          <button
            onClick={() => setActiveTab("dishes")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "dishes"
                ? "glass-strong text-foreground card-shadow"
                : "text-primary-text hover:text-foreground"
            }`}
          >
            Dishes
          </button>
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "restaurants"
                ? "glass-strong text-foreground card-shadow"
                : "text-primary-text hover:text-foreground"
            }`}
          >
            Restaurants
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="relative h-48 bg-gradient-pink">
        <GoogleMapView
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
          center={userLocation}
          userLocation={userLocation}
          showRecenterButton={true}
          restaurants={[]}
        />
      </div>

      {/* Filters - Center Aligned */}
      <div className="glass-soft px-4 py-3 border-b border-card-border">
        <div className="flex gap-2 justify-center">
          {exploreFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === filter.id
                  ? "btn-primary"
                  : "glass-soft text-primary-text hover:glass-primary hover:text-foreground"
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
            <h2 className="text-lg font-semibold text-foreground mb-3">Trending Now</h2>
            {trendingDishes.map((dish) => (
              <BackedDishCard key={dish.id} {...dish} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground mb-3">Featured Restaurants</h2>
            <p className="text-primary-text">Coming soon...</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

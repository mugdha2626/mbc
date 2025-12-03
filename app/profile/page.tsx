"use client";

import { useFarcaster } from "@/app/providers/FarcasterProvider";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { BackedDishCard } from "@/app/components/cards/BackedDishCard";
import { MiniTasteMap } from "@/app/components/map/MiniTasteMap";

const userStats = {
  portfolioValue: "$142.50",
  portfolioChange: 12.5,
  reputation: 850,
  rank: "Local Tastemaker",
};

const badges = [
  { id: "1", label: "EARLY BIRD", color: "yellow" },
  { id: "2", label: "SPICY EXPERT", color: "gray" },
];

const tasteSpots = [
  { id: "1", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200", x: 25, y: 35 },
  { id: "2", image: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=200", x: 45, y: 50 },
  { id: "3", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200", x: 65, y: 45 },
  { id: "4", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200", x: 30, y: 70 },
];

const backedDishes = [
  {
    id: "1",
    name: "Dan Dan Noodles",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
    restaurant: "Spicy Moon",
    creator: "spicy_boi",
    price: 4.20,
    priceChange: 5.2,
    holders: 342,
    marketCap: "$17.6k",
  },
  {
    id: "2",
    name: "Mapo Tofu",
    image: "https://images.unsplash.com/photo-1582576163090-09d3b6f8a969?w=400",
    restaurant: "Spicy Moon",
    creator: "foodie_hero",
    price: 2.10,
    priceChange: 5.2,
    holders: 120,
    marketCap: "$3.1k",
  },
  {
    id: "3",
    name: "Cheese Slice",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    restaurant: "Joe's Pizza",
    creator: "portnoy_fan",
    price: 8.50,
    priceChange: 5.2,
    holders: 1500,
    marketCap: "$102.0k",
  },
  {
    id: "4",
    name: "Malted Pancakes",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
    restaurant: "Sunday in Brooklyn",
    creator: "brunch_queen",
    price: 5.40,
    priceChange: 5.2,
    holders: 600,
    marketCap: "$32.4k",
  },
];

export default function ProfilePage() {
  const { user } = useFarcaster();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-6">
        {/* Profile Info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {user?.pfpUrl ? (
              <img
                src={user.pfpUrl}
                alt={user.username || "Profile"}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200"
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {user?.displayName || "Alex Taster"}
              </h1>
              <p className="text-gray-500">@{user?.username || "foodie_hero"}</p>
              <div className="flex gap-2 mt-2">
                {badges.map((badge) => (
                  <span
                    key={badge.id}
                    className={`badge ${badge.color === "yellow" ? "badge-yellow" : "badge-gray"}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              PORTFOLIO VALUE
            </div>
            <p className="text-2xl font-bold text-gray-900">{userStats.portfolioValue}</p>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l5-5 5 5" />
              </svg>
              +{userStats.portfolioChange}% this week
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              REPUTATION
            </div>
            <p className="text-2xl font-bold text-indigo-600">{userStats.reputation}</p>
            <p className="text-sm text-gray-500">Rank: {userStats.rank}</p>
          </div>
        </div>
      </div>

      {/* Taste Map Section */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Your Taste Map</h2>
          </div>
          <span className="text-sm font-medium text-indigo-600">{tasteSpots.length} Spots</span>
        </div>
        <MiniTasteMap spots={tasteSpots} location="New York" />
      </div>

      {/* Backed Dishes Section */}
      <div className="px-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Backed Dishes</h2>
        <div className="space-y-3">
          {backedDishes.map((dish) => (
            <BackedDishCard key={dish.id} {...dish} />
          ))}
        </div>

        {/* View Past Activity */}
        <button className="btn-dashed mt-4">
          View Past Activity
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

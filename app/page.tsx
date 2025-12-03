"use client";

import { useState } from "react";
import { BottomNav } from "./components/layout/BottomNav";
import { GoogleMapView } from "./components/map/GoogleMapView";

const filters = [
  { id: "near", label: "Near me", icon: "📍", active: true },
  { id: "trending", label: "Trending", icon: "🔥", active: false },
  { id: "new", label: "New", icon: "✨", active: false },
];

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("near");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm z-10">
        {/* Search Bar */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes, restaurants..."
            className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === filter.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      {/* Notification Banner */}
      <div className="px-4 py-2 bg-white border-b border-gray-100">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700 font-medium">12 new spots near you</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMapView apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""} />
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

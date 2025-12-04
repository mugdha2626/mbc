"use client";

import { useState } from "react";
import { BottomNav } from "./components/layout/BottomNav";
import { GoogleMapView } from "./components/map/GoogleMapView";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm z-10">
        {/* Search Bar */}
        <div className="relative">
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
            className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-hover)]"
          />
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMapView apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""} />

        {/* Spots Overlay - Top of Map */}
        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-gray-50/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-900 font-medium">12 spots near you</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

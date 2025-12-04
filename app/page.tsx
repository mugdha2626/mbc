"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "./components/layout/BottomNav";
import { GoogleMapView } from "./components/map/GoogleMapView";

interface SearchResult {
  id: string;
  name: string;
  type: "restaurant" | "dish" | "user";
  subtitle: string;
  lat?: number;
  lng?: number;
  fid?: number;
  pfpUrl?: string;
}

interface MapRestaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  address: string;
  dishCount: number;
  tmapRating: number;
}

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; id: string } | null>(null);
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch restaurants for map on mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch("/api/restaurants");
        const data = await res.json();
        if (data.restaurants) {
          setRestaurants(data.restaurants);
        }
      } catch (err) {
        console.error("Failed to fetch restaurants:", err);
      } finally {
        setIsLoadingMap(false);
      }
    };
    fetchRestaurants();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();

        const results: SearchResult[] = [];

        // Add restaurants
        if (data.restaurants) {
          data.restaurants.forEach((r: any) => {
            results.push({
              id: r.id,
              name: r.name,
              type: "restaurant",
              subtitle: r.address || "",
              lat: r.latitude,
              lng: r.longitude,
            });
          });
        }

        // Add dishes
        if (data.dishes) {
          data.dishes.forEach((d: any) => {
            results.push({
              id: d.tokenAdrress || d._id,
              name: d.name,
              type: "dish",
              subtitle: d.restaurantName || "",
              lat: d.restaurantLat,
              lng: d.restaurantLng,
            });
          });
        }

        // Add users
        if (data.users) {
          data.users.forEach((u: any) => {
            results.push({
              id: u._id,
              name: u.username,
              type: "user",
              subtitle: `${u.reputationScore} reputation · ${u.portfolio?.dishes?.length || 0} dishes`,
              fid: u.fid,
              pfpUrl: u.pfpUrl,
            });
          });
        }

        setSearchResults(results);
        setShowResults(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === "user" && result.fid) {
      // Navigate to user profile
      router.push(`/profile/${result.fid}`);
      setShowResults(false);
      return;
    }

    if (result.lat && result.lng) {
      setSelectedLocation({ lat: result.lat, lng: result.lng, id: result.id });
    }
    setSearchQuery(result.name);
    setShowResults(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm z-20">
        {/* Search Bar */}
        <div className="relative" ref={searchRef}>
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search dishes, restaurants, users..."
            className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-10 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-hover)]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setShowResults(false);
              }}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-30">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  {result.type === "user" && result.pfpUrl ? (
                    <img
                      src={result.pfpUrl}
                      alt={result.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      result.type === "restaurant" ? "bg-blue-100" :
                      result.type === "user" ? "bg-purple-100" : "bg-orange-100"
                    }`}>
                      {result.type === "restaurant" ? (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      ) : result.type === "user" ? (
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {result.type === "user" ? `@${result.name}` : result.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    result.type === "restaurant" ? "bg-blue-50 text-blue-600" :
                    result.type === "user" ? "bg-purple-50 text-purple-600" : "bg-orange-50 text-orange-600"
                  }`}>
                    {result.type === "restaurant" ? "Restaurant" : result.type === "user" ? "User" : "Dish"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-center z-30">
              <p className="text-gray-500">No results found</p>
            </div>
          )}
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        {isLoadingMap ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : (
          <GoogleMapView
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            selectedLocation={selectedLocation}
            restaurants={restaurants}
          />
        )}

        {/* Spots Overlay - Top of Map */}
        {!isLoadingMap && restaurants.length > 0 && (
          <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-gray-50/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-900 font-medium">{restaurants.length} spots near you</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

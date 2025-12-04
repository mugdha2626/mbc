"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { GoogleMapView } from "@/app/components/map/GoogleMapView";
import { getCurrentPosition } from "@/lib/geo";
import getFid from "@/app/providers/Fid";
import type { User } from "@/app/interface";

interface MapRestaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  address: string;
  city: string;
  dishCount: number;
  tmapRating: number;
}

// Helper to format currency
function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(2)}`;
}

// Helper to get reputation rank
function getReputationRank(score: number): string {
  if (score >= 1000) return "Food Legend";
  if (score >= 750) return "Master Taster";
  if (score >= 500) return "Local Tastemaker";
  if (score >= 250) return "Rising Foodie";
  if (score >= 100) return "Taste Explorer";
  return "New Taster";
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [farcasterUser, setFarcasterUser] = useState<{
    displayName?: string;
    username?: string;
    pfpUrl?: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [backedRestaurants, setBackedRestaurants] = useState<MapRestaurant[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [currentLocationCity, setCurrentLocationCity] = useState<string>("Loading...");
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const fid = await getFid();
        if (!fid) {
          setIsLoading(false);
          return;
        }

        // Get Farcaster context for display info
        const { sdk } = await import("@farcaster/miniapp-sdk");
        const context = await sdk.context;
        if (context?.user) {
          setFarcasterUser({
            displayName: context.user.displayName,
            username: context.user.username,
            pfpUrl: context.user.pfpUrl,
          });
        }

        // Fetch user data from our database
        const res = await fetch(`/api/users/${fid}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }

        // Fetch backed restaurants
        const restaurantsRes = await fetch(`/api/users/${fid}/restaurants`);
        if (restaurantsRes.ok) {
          const restaurantsData = await restaurantsRes.json();
          setBackedRestaurants(restaurantsData.restaurants || []);
          setAvailableCities(restaurantsData.cities || []);
        }

        // Fetch wishlist count
        const wishlistRes = await fetch(`/api/wishlist?fid=${fid}`);
        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json();
          setWishlistCount(wishlistData.wishlist?.length || 0);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Get user's current location
  useEffect(() => {
    getCurrentPosition()
      .then(async (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(location);

        // Try to reverse geocode to get city name
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&result_type=locality`
          );
          const data = await response.json();
          if (data.results?.[0]?.formatted_address) {
            const city = data.results[0].address_components?.find(
              (c: { types: string[] }) => c.types.includes("locality")
            )?.long_name;
            setCurrentLocationCity(city || data.results[0].formatted_address.split(",")[0]);
          } else {
            setCurrentLocationCity("Your Location");
          }
        } catch {
          setCurrentLocationCity("Your Location");
        }
      })
      .catch(() => {
        setCurrentLocationCity("Location unavailable");
      });
  }, []);

  // Filter restaurants by selected city
  const filteredRestaurants = useMemo(() => {
    if (!selectedCity) return backedRestaurants;
    return backedRestaurants.filter(r => r.city === selectedCity);
  }, [backedRestaurants, selectedCity]);

  // Get map center based on selected city's restaurants or user location
  const mapCenter = useMemo(() => {
    if (selectedCity && filteredRestaurants.length > 0) {
      // Center on the first restaurant in the selected city
      return { lat: filteredRestaurants[0].lat, lng: filteredRestaurants[0].lng };
    }
    return userLocation;
  }, [selectedCity, filteredRestaurants, userLocation]);

  // Display name for location
  const displayLocation = selectedCity || currentLocationCity;

  // Calculate return percentage
  const returnPercentage = user?.portfolio.totalInvested
    ? ((user.portfolio.totalReturn / user.portfolio.totalInvested) * 100).toFixed(1)
    : "0";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-6">
        {/* Profile Info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {farcasterUser?.pfpUrl ? (
              <img
                src={farcasterUser.pfpUrl}
                alt={farcasterUser.username || "Profile"}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {farcasterUser?.displayName || user?.username || "Anonymous"}
              </h1>
              <p className="text-gray-500">
                @{farcasterUser?.username || user?.username || "user"}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {user?.badges && user.badges.length > 0 ? (
                  user.badges.map((badge, index) => (
                    <span
                      key={index}
                      className={`badge ${index === 0 ? "badge-yellow" : "badge-gray"}`}
                    >
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="badge badge-gray">NEW TASTER</span>
                )}
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
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(user?.portfolio.totalValue || 0)}
            </p>
            {user?.portfolio.totalReturn !== undefined && (
              <p className={`text-sm flex items-center gap-1 ${user.portfolio.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {user.portfolio.totalReturn >= 0 ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l5-5 5 5" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-5 5-5-5" />
                  </svg>
                )}
                {user.portfolio.totalReturn >= 0 ? '+' : ''}{returnPercentage}% return
              </p>
            )}
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              REPUTATION
            </div>
            <p className="text-2xl font-bold text-primary-dark">
              {user?.reputationScore || 0}
            </p>
            <p className="text-sm text-gray-500">
              {getReputationRank(user?.reputationScore || 0)}
            </p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              TOTAL INVESTED
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(user?.portfolio.totalInvested || 0)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              STAMPS
            </div>
            <p className="text-xl font-bold text-gray-900">
              {user?.portfolio.dishes.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Wishlist Button */}
      <div className="px-4 py-4">
        <Link
          href="/wishlist"
          className="group flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 hover:border-primary-soft hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-400 group-hover:from-red-100 group-hover:to-red-200 group-hover:text-red-500 transition-all">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              {wishlistCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-primary-dark transition-colors">My Wishlist</p>
              <p className="text-sm text-gray-500">
                {wishlistCount === 0
                  ? "Save dishes you want to try"
                  : `${wishlistCount} saved ${wishlistCount === 1 ? 'dish' : 'dishes'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-dark group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Taste Map Section */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Your Taste Map</h2>
          </div>
          <span className="text-sm font-medium text-primary-dark">
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? "Spot" : "Spots"}
          </span>
        </div>

        {/* Map Container */}
        <div className="relative h-52 rounded-2xl overflow-hidden shadow-sm">
          <GoogleMapView
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            center={mapCenter}
            userLocation={userLocation}
            showRecenterButton={!selectedCity}
            restaurants={filteredRestaurants}
            defaultZoom={13}
          />

          {/* Location label with city picker */}
          <div className="absolute bottom-3 right-3 z-10">
            <button
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5 hover:bg-white transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {displayLocation}
              {availableCities.length > 0 && (
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCityPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* City Picker Dropdown */}
            {showCityPicker && availableCities.length > 0 && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCity(null);
                    setShowCityPicker(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${!selectedCity ? 'text-primary-dark font-medium' : 'text-gray-700'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                  </svg>
                  Current Location
                  {!selectedCity && (
                    <svg className="w-4 h-4 ml-auto text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="border-t border-gray-100 my-1" />
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setSelectedCity(city);
                      setShowCityPicker(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${selectedCity === city ? 'text-primary-dark font-medium' : 'text-gray-700'}`}
                  >
                    {city}
                    {selectedCity === city && (
                      <svg className="w-4 h-4 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stamps Section */}
      <div className="px-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stamps</h2>

        {user?.portfolio.dishes && user.portfolio.dishes.length > 0 ? (
          <div className="space-y-3">
            {user.portfolio.dishes.map((holding, index) => (
              <div
                key={holding.dish}
                className="bg-white rounded-2xl p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Dish #{index + 1}
                    </p>
                    <p className="text-sm text-gray-500">
                      {holding.quantity} Stamps
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${holding.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {holding.return >= 0 ? '+' : ''}{formatCurrency(holding.return)}
                    </p>
                    {holding.referredBy && (
                      <p className="text-xs text-gray-400">
                        Referred by #{holding.referredBy}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">No Stamps yet</p>
            <a
              href="/explore"
              className="inline-block btn-primary px-6 py-2 rounded-xl text-sm font-medium"
            >
              Explore Dishes
            </a>
          </div>
        )}

        {/* View Past Activity */}
        {user?.portfolio.dishes && user.portfolio.dishes.length > 0 && (
          <button className="btn-dashed mt-4">
            View Past Activity
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

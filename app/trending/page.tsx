"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/app/components/layout/Header";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { getCurrentPosition } from "@/lib/geo";
import getFid from "@/app/providers/Fid";

interface TrendingDish {
  dishId: string;
  name: string;
  image?: string;
  currentPrice: number;
  priceChange: number;
  totalHolders: number;
  restaurantName: string;
  restaurantId: string;
  creatorUsername: string;
  distance: number | null;
  trendingScore: number;
  isNew: boolean;
}

interface TopUser {
  fid: number;
  username: string;
  pfpUrl?: string;
  displayName?: string;
  portfolioValue: number;
  valueChange: number;
  valueChangePercent: number;
  reputationScore: number;
  dishCount: number;
  primaryCity: string | null;
  rank: number;
}

type Tab = "dishes" | "users";
type UserFilter = "global" | string;

export default function TrendingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dishes");
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentUserFid, setCurrentUserFid] = useState<number | null>(null);

  // Dishes state
  const [trendingDishes, setTrendingDishes] = useState<TrendingDish[]>([]);
  const [dishesLoading, setDishesLoading] = useState(true);

  // Users state
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [currentUserCity, setCurrentUserCity] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<UserFilter>("global");
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Get user location and fid
  useEffect(() => {
    const init = async () => {
      try {
        const fid = await getFid();
        if (fid) setCurrentUserFid(fid);

        const pos = await getCurrentPosition();
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch (err) {
        console.error("Error getting location:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Hydrate holder counts from on-chain endpoint
  const enrichHolderCounts = useCallback(async (dishes: TrendingDish[]) => {
    if (!dishes || dishes.length === 0) return;

    try {
      const results = await Promise.all(
        dishes.map(async (dish) => {
          try {
            const res = await fetch(`/api/dish/${encodeURIComponent(dish.dishId)}/holders`);
            if (!res.ok) return null;
            const data = await res.json();
            return { dishId: dish.dishId, holderCount: Number(data.holderCount || 0) };
          } catch (err) {
            console.error("Error fetching holder count for dish", dish.dishId, err);
            return null;
          }
        })
      );

      const holderMap = new Map<string, number>();
      results.forEach((r) => {
        if (r) holderMap.set(r.dishId, r.holderCount);
      });

      if (holderMap.size === 0) return;

      setTrendingDishes((prev) =>
        prev.map((dish) =>
          holderMap.has(dish.dishId)
            ? { ...dish, totalHolders: holderMap.get(dish.dishId) || dish.totalHolders }
            : dish
        )
      );
    } catch (err) {
      console.error("Error enriching holder counts:", err);
    }
  }, []);

  // Fetch trending dishes
  const fetchTrendingDishes = useCallback(async () => {
    setDishesLoading(true);
    try {
      const params = new URLSearchParams();
      if (userLocation) {
        params.set("lat", userLocation.lat.toString());
        params.set("lng", userLocation.lng.toString());
        params.set("radius", "16"); // ~10 miles radius
      }
      params.set("limit", "15");

      const res = await fetch(`/api/trending/dishes?${params}`);
      if (res.ok) {
        const data = await res.json();
        const dishes = data.dishes || [];
        setTrendingDishes(dishes);
        enrichHolderCounts(dishes);
      }
    } catch (err) {
      console.error("Error fetching trending dishes:", err);
    } finally {
      setDishesLoading(false);
    }
  }, [userLocation, enrichHolderCounts]);

  // Fetch top users
  const fetchTopUsers = useCallback(async (filter: UserFilter) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("city", filter);
      if (currentUserFid) params.set("fid", currentUserFid.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/trending/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTopUsers(data.users || []);
        setCities(data.cities || []);
        if (data.currentUserCity && !currentUserCity) {
          setCurrentUserCity(data.currentUserCity);
        }
      }
    } catch (err) {
      console.error("Error fetching top users:", err);
    } finally {
      setUsersLoading(false);
    }
  }, [currentUserFid, currentUserCity]);

  // Load data based on active tab
  useEffect(() => {
    if (loading) return;

    if (activeTab === "dishes") {
      fetchTrendingDishes();
    } else {
      fetchTopUsers(userFilter);
    }
  }, [activeTab, loading, fetchTrendingDishes, fetchTopUsers, userFilter]);

  // Format helpers
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };
  const formatDistance = (km: number | null) => {
    if (km === null) return null;
    const miles = km * 0.621371;
    if (miles < 0.1) return `${Math.round(miles * 5280)}ft`;
    return `${miles.toFixed(1)}mi`;
  };
  const formatValue = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-pink text-foreground pb-24">
      <Header title="Trending" />

      {/* Tab Switcher */}
      <div className="px-4 py-3">
        <div className="flex glass rounded-xl p-1">
          <button
            onClick={() => setActiveTab("dishes")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "dishes"
                ? "glass-strong text-foreground card-shadow"
                : "text-primary-text hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Hot Dishes
            </div>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "users"
                ? "glass-strong text-foreground card-shadow"
                : "text-primary-text hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Top Users
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "dishes" ? (
        <div className="px-4">
          {/* Location indicator */}
          {userLocation && (
            <div className="flex items-center gap-2 text-xs text-primary-text mb-3 opacity-70">
              <svg className="w-3.5 h-3.5 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Showing dishes within 10 miles
            </div>
          )}

          {dishesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="glass rounded-lg p-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 glass-soft rounded-lg" />
                    <div className="flex-1">
                      <div className="h-3 glass-soft rounded w-3/4 mb-2" />
                      <div className="h-2 glass-soft rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : trendingDishes.length > 0 ? (
            <div className="space-y-2">
              {trendingDishes.map((dish, index) => (
                <Link
                  key={dish.dishId}
                  href={`/dish/${dish.dishId}`}
                  className="block glass rounded-lg p-3 card-shadow hover:glass-strong transition-all"
                >
                  <div className="flex gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-6 flex items-center justify-center">
                      <span className={`text-sm font-bold ${
                        index === 0 ? "text-primary-dark" :
                        index === 1 ? "text-primary-text" :
                        index === 2 ? "text-primary-text opacity-80" :
                        "text-primary-text opacity-50"
                      }`}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
                        alt={dish.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-foreground truncate text-sm">{dish.name}</h3>
                          <p className="text-[10px] text-primary-text truncate opacity-70">{dish.restaurantName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-foreground text-sm">{formatPrice(dish.currentPrice)}</p>
                          <p className={`text-[10px] font-medium ${
                            dish.priceChange >= 0 ? "text-primary-dark" : "text-primary-dark opacity-60"
                          }`}>
                            {formatChange(dish.priceChange)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-primary-text opacity-60">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {dish.totalHolders}
                        </span>
                        {dish.distance !== null && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {formatDistance(dish.distance)}
                          </span>
                        )}
                        <span>@{dish.creatorUsername}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 glass-soft rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary-text opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-foreground font-medium mb-1">No trending dishes yet</p>
              <p className="text-xs text-primary-text opacity-70">Be the first to create one!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4">
          {/* City Filter */}
          <div className="relative mb-3">
            <button
              onClick={() => setShowCityPicker(!showCityPicker)}
              className="flex items-center gap-2 glass rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:glass-strong transition-all w-full"
            >
              <svg className="w-4 h-4 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {userFilter === "global" ? "Global" : userFilter}
              <svg className={`w-4 h-4 text-primary-text opacity-70 transition-transform ${showCityPicker ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCityPicker && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-card-border py-1 max-h-64 overflow-y-auto z-20">
                <button
                  onClick={() => {
                    setUserFilter("global");
                    setShowCityPicker(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-light flex items-center justify-between transition-colors ${
                    userFilter === "global" ? "text-primary-dark font-medium bg-primary-light" : "text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Global
                  </span>
                  {userFilter === "global" && (
                    <svg className="w-4 h-4 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                {currentUserCity && (
                  <>
                    <div className="border-t border-card-border my-1" />
                    <button
                      onClick={() => {
                        setUserFilter(currentUserCity);
                        setShowCityPicker(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-light flex items-center justify-between transition-colors ${
                        userFilter === currentUserCity ? "text-primary-dark font-medium bg-primary-light" : "text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {currentUserCity}
                        <span className="text-xs text-primary-text opacity-60">(your city)</span>
                      </span>
                      {userFilter === currentUserCity && (
                        <svg className="w-4 h-4 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </>
                )}
                {cities.length > 0 && (
                  <>
                    <div className="border-t border-card-border my-1" />
                    <div className="px-3 py-1.5 text-xs text-primary-text opacity-70 font-medium">All Cities</div>
                    {cities.filter(c => c !== currentUserCity).map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          setUserFilter(city);
                          setShowCityPicker(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-light flex items-center justify-between transition-colors ${
                          userFilter === city ? "text-primary-dark font-medium bg-primary-light" : "text-foreground"
                        }`}
                      >
                        {city}
                        {userFilter === city && (
                          <svg className="w-4 h-4 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="glass rounded-lg p-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 glass-soft rounded-full" />
                    <div className="flex-1">
                      <div className="h-3 glass-soft rounded w-1/2 mb-2" />
                      <div className="h-2 glass-soft rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : topUsers.length > 0 ? (
            <div className="space-y-2">
              {topUsers.map((user) => (
                <Link
                  key={user.fid}
                  href={`/profile/${user.fid}`}
                  className="block glass rounded-lg p-3 card-shadow hover:glass-strong transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-6 flex items-center justify-center">
                      {user.rank <= 3 ? (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold glass-primary ${
                          user.rank === 1 ? "text-primary-dark" :
                          user.rank === 2 ? "text-primary-text" :
                          "text-primary-text opacity-80"
                        }`}>
                          {user.rank}
                        </div>
                      ) : (
                        <span className="text-primary-text opacity-50 font-medium text-sm">{user.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    {user.pfpUrl ? (
                      <img
                        src={user.pfpUrl}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full glass-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-dark font-semibold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-foreground truncate text-sm">
                          {user.displayName || user.username}
                        </h3>
                        {user.rank === 1 && (
                          <span className="text-primary-dark">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-primary-text opacity-70">@{user.username}</p>
                      <div className="flex items-center gap-2.5 mt-1 text-[10px] text-primary-text opacity-60">
                        <span>{user.dishCount} stamps</span>
                        {user.primaryCity && <span>{user.primaryCity}</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground text-sm">{formatValue(user.portfolioValue)}</p>
                      <p className={`text-[10px] font-medium ${
                        user.valueChangePercent >= 0 ? "text-primary-dark" : "text-primary-dark opacity-60"
                      }`}>
                        {formatChange(user.valueChangePercent)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 glass-soft rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary-text opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-foreground font-medium mb-1">No users found</p>
              <p className="text-xs text-primary-text opacity-70">
                {userFilter !== "global" ? "Try switching to Global" : "Be the first to join!"}
              </p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

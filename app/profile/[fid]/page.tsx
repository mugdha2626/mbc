"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BottomNav } from "@/app/components/layout/BottomNav";
import type { User } from "@/app/interface";

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

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const fid = params.fid as string;

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${fid}`);
        if (!res.ok) {
          setError("User not found");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setError("Failed to load user");
      } finally {
        setIsLoading(false);
      }
    };

    if (fid) {
      fetchUser();
    }
  }, [fid]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">{error || "User not found"}</p>
          <button
            onClick={() => router.back()}
            className="text-[var(--primary-dark)] font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">@{user.username}</h1>
        </div>
      </header>

      {/* Profile Info */}
      <div className="bg-white px-4 py-6 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">@{user.username}</h2>
            <p className="text-gray-500">FID: {user.fid}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {user.badges && user.badges.length > 0 ? (
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
              {formatCurrency(user.portfolio?.totalValue || 0)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              REPUTATION
            </div>
            <p className="text-2xl font-bold text-primary-dark">
              {user.reputationScore || 0}
            </p>
            <p className="text-sm text-gray-500">
              {getReputationRank(user.reputationScore || 0)}
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
              {formatCurrency(user.portfolio?.totalInvested || 0)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              DISHES BACKED
            </div>
            <p className="text-xl font-bold text-gray-900">
              {user.portfolio?.dishes?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Backed Dishes */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backed Dishes</h3>

        {user.portfolio?.dishes && user.portfolio.dishes.length > 0 ? (
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
                      {holding.quantity} tokens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${holding.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {holding.return >= 0 ? '+' : ''}{formatCurrency(holding.return)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <p className="text-gray-500">No dishes backed yet</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

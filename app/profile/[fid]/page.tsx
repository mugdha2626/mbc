"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { useFarcaster } from "@/app/providers/FarcasterProvider";

interface UserData {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  badges: string[];
  portfolio: {
    totalValue: number;
    totalReturn: number;
    totalInvested: number;
    dishes: { dish: string; quantity: number; return: number }[];
  };
  reputationScore: number;
}

interface CreatedDish {
  tokenAdrress: string;
  name: string;
  image: string;
  currentPrice: number;
  totalHolders: number;
  restaurant: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(2)}`;
}

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
  const { user: currentUser } = useFarcaster();

  const [user, setUser] = useState<UserData | null>(null);
  const [createdDishes, setCreatedDishes] = useState<CreatedDish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user
        const userRes = await fetch(`/api/users/${fid}`);
        if (!userRes.ok) {
          setError("User not found");
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        // Fetch dishes created by this user
        const dishesRes = await fetch(`/api/dishes/creator/${fid}`);
        if (dishesRes.ok) {
          const dishesData = await dishesRes.json();
          setCreatedDishes(dishesData.dishes || []);
        }
      } catch (err) {
        console.error("Failed to fetch:", err);
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    if (fid) fetchData();
  }, [fid]);

  const handleAddToWishlist = async (e: React.MouseEvent, dishId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert("Please sign in to add to wishlist");
      return;
    }

    try {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: currentUser.fid,
          dishId,
          referrer: parseInt(fid), // The profile owner is the referrer
        }),
      });
      alert("Added to wishlist!");
    } catch (error) {
      console.error("Failed to add to wishlist", error);
    }
  };

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
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-gray-500 mb-4">{error || "User not found"}</p>
        <button onClick={() => router.back()} className="text-[var(--primary-dark)] font-medium">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {user.displayName || `@${user.username}`}
          </h1>
        </div>
      </header>

      {/* Profile Info */}
      <div className="bg-white px-4 py-6 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          {user.pfpUrl ? (
            <img src={user.pfpUrl} alt={user.username} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.displayName || user.username}</h2>
            <p className="text-gray-500">@{user.username}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {user.badges?.length > 0 ? (
                user.badges.map((badge, i) => (
                  <span key={i} className={`badge ${i === 0 ? "badge-yellow" : "badge-gray"}`}>{badge}</span>
                ))
              ) : (
                <span className="badge badge-gray">NEW TASTER</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">PORTFOLIO VALUE</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(user.portfolio?.totalValue || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">REPUTATION</p>
            <p className="text-2xl font-bold text-primary-dark">{user.reputationScore || 0}</p>
            <p className="text-sm text-gray-500">{getReputationRank(user.reputationScore || 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">DISHES CREATED</p>
            <p className="text-xl font-bold text-gray-900">{createdDishes.length}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">DISHES HOLDING</p>
            <p className="text-xl font-bold text-gray-900">{user.portfolio?.dishes?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Created Dishes */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dishes Created</h3>
        {createdDishes.length > 0 ? (
          <div className="space-y-3">
            {createdDishes.map((dish) => (
              <Link key={dish.tokenAdrress} href={`/dish/${dish.tokenAdrress}`}>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 relative group">
                  <img src={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"} alt={dish.name} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{dish.name}</p>
                    <p className="text-sm text-gray-500">{dish.totalHolders} holders</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-semibold text-gray-900">${dish.currentPrice.toFixed(2)}</p>
                    {currentUser?.fid !== parseInt(fid) && (
                      <button
                        onClick={(e) => handleAddToWishlist(e, dish.tokenAdrress)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <p className="text-gray-500">No dishes created yet</p>
          </div>
        )}
      </div>

      {/* Holdings */}
      {user.portfolio?.dishes && user.portfolio.dishes.length > 0 && (
        <div className="p-4 pt-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Holdings</h3>
          <div className="space-y-3">
            {user.portfolio.dishes.map((holding, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Dish Stamp</p>
                  <p className="text-sm text-gray-500">{holding.quantity} Stamps</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-medium ${holding.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {holding.return >= 0 ? '+' : ''}{formatCurrency(holding.return)}
                  </p>
                  {currentUser?.fid !== parseInt(fid) && (
                    <button
                      onClick={(e) => handleAddToWishlist(e, holding.dish)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

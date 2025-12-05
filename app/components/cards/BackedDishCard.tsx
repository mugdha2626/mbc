"use client";

import Link from "next/link";

import { useFarcaster } from "@/app/providers/FarcasterProvider";

export interface BackedDishCardProps {
  id: string;
  name: string;
  image: string;
  restaurant?: string;
  creator?: string;
  price: number;
  priceChange?: number;
  holders: number;
  marketCap?: string;
}

export function BackedDishCard({
  id,
  name,
  image,
  restaurant,
  creator,
  price,
  priceChange,
  holders,
  marketCap,
}: BackedDishCardProps) {
  const { user } = useFarcaster();
  const isPositive = priceChange !== undefined && priceChange >= 0;

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Please sign in to add to wishlist");
      return;
    }

    try {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: user.fid,
          dishId: id,
        }),
      });
      alert("Added to wishlist!");
    } catch (error) {
      console.error("Failed to add to wishlist", error);
    }
  };

  return (
    <Link href={`/dish/${id}`}>
      <div className="glass rounded-2xl p-3 hover:glass-strong transition-all card-shadow mb-2 relative group">
        <div className="flex gap-3">
          {/* Image */}
          <img
            src={image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
            alt={name}
            className="w-20 h-20 rounded-xl object-cover shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-foreground leading-tight mb-1 line-clamp-2">{name}</h3>
                <button
                  onClick={handleAddToWishlist}
                  className="p-1 text-primary-text hover:text-primary-dark hover:glass-primary rounded-full transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {restaurant && (
                <div className="flex items-center gap-1 text-xs text-primary-text mb-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="truncate">{restaurant}</span>
                </div>
              )}

              {creator && (
                <p className="text-xs text-muted truncate">by @{creator}</p>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-primary-dark">${price.toFixed(2)}</span>
                {priceChange !== undefined && (
                  <div className={`flex items-center gap-0.5 text-xs ${isPositive ? "text-primary-dark" : "text-primary-dark opacity-60"}`}>
                    <span>{isPositive ? "+" : ""}{priceChange.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-primary-text">
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{holders}</span>
                </div>
                {marketCap && <span>MC: {marketCap}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

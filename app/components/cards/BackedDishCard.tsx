"use client";

import Link from "next/link";

export interface BackedDishCardProps {
  id: string;
  name: string;
  image: string;
  restaurant: string;
  creator: string;
  price: number;
  priceChange: number;
  holders: number;
  marketCap: string;
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
  const isPositive = priceChange >= 0;

  return (
    <Link href={`/dish/${id}`}>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          {/* Image */}
          <img
            src={image}
            alt={name}
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">{name}</h3>

            <div className="flex items-center gap-1 text-sm text-gray-500 mb-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span>{restaurant}</span>
            </div>

            <p className="text-sm text-gray-400 mb-2">Created by @{creator}</p>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-green-600">${price.toFixed(2)}</span>
                <div className="flex items-center gap-1 text-sm">
                  <svg className={`w-3.5 h-3.5 ${isPositive ? "text-green-500" : "text-red-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? "M7 17l5-5 5 5" : "M17 7l-5 5-5-5"} />
                  </svg>
                  <span className={isPositive ? "text-green-600" : "text-red-500"}>
                    {isPositive ? "+" : ""}{priceChange.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="text-right text-sm text-gray-500">
                <div className="flex items-center gap-1 justify-end">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{holders}</span>
                </div>
                <span>Cap: {marketCap}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

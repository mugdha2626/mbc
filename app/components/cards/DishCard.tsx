"use client";

import Link from "next/link";
import { PriceChange } from "../shared/PriceChange";
import { AvatarStack } from "../shared/AvatarStack";

export interface DishCardProps {
  id: string;
  name: string;
  image: string;
  price: number;
  marketCap: string;
  volume: string;
  priceChange: number;
  holders: string[];
}

export function DishCard({
  id,
  name,
  image,
  price,
  marketCap,
  volume,
  priceChange,
  holders,
}: DishCardProps) {
  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement wishlist logic with API
    // For now just console log
    console.log("Add to wishlist", id);
  };

  return (
    <Link href={`/dish/${id}`}>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-all shadow-sm relative group">
        <div className="flex gap-4">
          {/* Image */}
          <div className="flex-shrink-0">
            <img
              src={image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
              alt={name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
              <AvatarStack avatars={holders} />
            </div>

            <p className="text-xl font-bold text-primary-dark mb-1">
              ${price.toFixed(2)}
            </p>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>MC: {marketCap}</span>
              <span>Vol: {volume}</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <PriceChange value={priceChange} />
              <div className="flex gap-2">
                <button
                  onClick={handleWishlist}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
                <button className="px-4 py-1.5 bg-primary-soft hover:bg-primary text-primary text-xs font-semibold rounded-full transition-colors">
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

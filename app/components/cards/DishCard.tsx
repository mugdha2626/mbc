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
  return (
    <Link href={`/dish/${id}`}>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-all">
        <div className="flex gap-4">
          {/* Image */}
          <div className="flex-shrink-0">
            <img
              src={image}
              alt={name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-white truncate">{name}</h3>
              <AvatarStack avatars={holders} />
            </div>

            <p className="text-xl font-bold text-purple-400 mb-1">
              ${price.toFixed(2)}
            </p>

            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>MC: {marketCap}</span>
              <span>Vol: {volume}</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <PriceChange value={priceChange} />
              <button className="px-4 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-semibold rounded-full transition-colors">
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

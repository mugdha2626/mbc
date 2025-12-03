"use client";

import Link from "next/link";
import { TagPill } from "../ui/TagPill";

export interface RestaurantCardProps {
  id: string;
  name: string;
  image: string;
  tags: string[];
  address: string;
  topDishCount: number;
  badge?: string;
}

export function RestaurantCard({
  id,
  name,
  image,
  tags,
  address,
  topDishCount,
  badge,
}: RestaurantCardProps) {
  return (
    <Link href={`/restaurant/${id}`}>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all">
        {/* Image */}
        <div className="relative h-32">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
          {badge && (
            <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <span>🏆</span>
              {badge}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white mb-2">{name}</h3>

          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="text-purple-400">●</span>
            <span className="truncate">{address}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800">
            <span className="text-sm text-zinc-400">
              {topDishCount} dishes available
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

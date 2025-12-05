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
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-all shadow-sm">
        {/* Image */}
        <div className="relative h-32">
          <img
            src={image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"}
            alt={name}
            className="w-full h-full object-cover"
          />
          {badge && (
            <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a4 4 0 004-4V4H8v7a4 4 0 004 4zm-6-4V4H4a2 2 0 00-2 2v3a3 3 0 003 3h1v-1zm12 0h1a3 3 0 003-3V6a2 2 0 00-2-2h-2v7zM9 18h6v3H9v-3z"/></svg>
              {badge}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{name}</h3>

          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-2 h-2 text-[var(--primary-dark)]" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
            <span className="truncate">{address}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {topDishCount} dishes available
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

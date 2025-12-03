"use client";

import { useRouter } from "next/navigation";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { BackedDishCard } from "@/app/components/cards/BackedDishCard";

// Mock data
const restaurant = {
  id: "1",
  name: "Spicy House Kitchen",
  image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
  tags: ["Thai", "Asian Fusion", "Spicy"],
  address: "123 Flavor Street, Downtown District, SF 94102",
  rating: 4.8,
  reviewCount: 234,
  badge: "Rising Star",
};

const dishes = [
  {
    id: "1",
    name: "Pad Thai Supreme",
    image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400",
    restaurant: restaurant.name,
    creator: "thai_lover",
    price: 24.50,
    priceChange: 12.8,
    holders: 342,
    marketCap: "$12.4K",
  },
  {
    id: "2",
    name: "Green Curry Delight",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400",
    restaurant: restaurant.name,
    creator: "curry_king",
    price: 18.75,
    priceChange: 8.4,
    holders: 180,
    marketCap: "$9.8K",
  },
  {
    id: "3",
    name: "Mango Sticky Rice",
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400",
    restaurant: restaurant.name,
    creator: "dessert_queen",
    price: 12.00,
    priceChange: -3.2,
    holders: 95,
    marketCap: "$7.2K",
  },
];

export default function RestaurantPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Image */}
      <div className="relative h-56">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Share button */}
        <button className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Badge */}
        {restaurant.badge && (
          <div className="absolute top-4 right-16">
            <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <span>🏆</span>
              {restaurant.badge}
            </div>
          </div>
        )}

        {/* Restaurant name overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-yellow-400">
              <span>⭐</span>
              <span className="text-white font-medium">{restaurant.rating}</span>
            </div>
            <span className="text-white/60">•</span>
            <span className="text-white/80 text-sm">{restaurant.reviewCount} reviews</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl -mt-4 relative">
        <div className="px-4 py-6">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {restaurant.tags.map((tag) => (
              <span key={tag} className="badge badge-gray">
                {tag}
              </span>
            ))}
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span>{restaurant.address}</span>
          </div>

          {/* Top Dishes Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Dishes</h2>
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              Sort by
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Dish List */}
          <div className="space-y-3">
            {dishes.map((dish) => (
              <BackedDishCard key={dish.id} {...dish} />
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

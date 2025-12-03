"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Mock data
const dish = {
  id: "1",
  name: "Truffle Mushroom Risotto",
  image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800",
  restaurant: {
    id: "1",
    name: "The Garden Kitchen",
    image: "https://i.pravatar.cc/100?img=10",
    distance: "2.3 miles away",
  },
  creator: {
    username: "foodie_hero",
    image: "https://i.pravatar.cc/100?img=11",
  },
  tags: ["Italian", "Vegetarian", "Gluten-Free"],
  currentPrice: 4.23,
  marketCap: "$2.1K",
  volume24h: "$847",
  totalHolders: 127,
  weeklyChange: 12,
  yourHolding: 3,
  yourValue: 12.69,
};

export default function DishPage() {
  const router = useRouter();
  const [backAmount, setBackAmount] = useState(1);

  const totalCost = (dish.currentPrice * backAmount).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      <div className="relative h-72">
        <img
          src={dish.image}
          alt={dish.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

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

        {/* Dish name overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{dish.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl -mt-4 relative">
        <div className="px-4 py-6">
          {/* Restaurant & Creator Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={dish.restaurant.image}
                alt={dish.restaurant.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium text-gray-900">{dish.restaurant.name}</p>
                <p className="text-sm text-gray-500">{dish.restaurant.distance}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created by</p>
              <p className="text-sm font-medium text-indigo-600">@{dish.creator.username}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {dish.tags.map((tag, index) => (
              <span
                key={tag}
                className={`badge ${index === 1 ? "bg-green-100 text-green-700" : index === 2 ? "bg-orange-100 text-orange-700" : "badge-gray"}`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Price</p>
                <p className="text-2xl font-bold text-green-600">${dish.currentPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Market Cap</p>
                <p className="text-2xl font-bold text-gray-900">{dish.marketCap}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">24h Volume</p>
                <p className="text-lg font-semibold text-gray-900">{dish.volume24h}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Holders</p>
                <p className="text-lg font-semibold text-gray-900">{dish.totalHolders}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-500">📈</span>
                <span className="font-medium text-green-600">Up {dish.weeklyChange}% this week</span>
              </div>
              <div className="flex items-end gap-0.5 h-8">
                {[40, 55, 45, 60, 50, 70, 65, 80].map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-green-500"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Your Holdings */}
          {dish.yourHolding > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Your Holdings</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">{dish.yourHolding} tokens</p>
                  <p className="text-lg font-bold text-indigo-600">${dish.yourValue.toFixed(2)}</p>
                </div>
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cash Out
                </button>
              </div>
            </div>
          )}

          {/* Back More Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Back this dish</h3>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setBackAmount(Math.max(1, backAmount - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <span className="text-xl text-gray-600">-</span>
              </button>
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold text-gray-900">{backAmount}</p>
                <p className="text-sm text-gray-500">tokens</p>
              </div>
              <button
                onClick={() => setBackAmount(backAmount + 1)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <span className="text-xl text-gray-600">+</span>
              </button>
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition-colors">
              Back for ${totalCost}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">Max $10 per dish</p>
          </div>

          {/* Share Referral */}
          <button className="btn-dashed flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share referral & earn 5%
          </button>
        </div>
      </div>
    </div>
  );
}

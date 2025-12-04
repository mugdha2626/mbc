"use client";

import { Header } from "@/app/components/layout/Header";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { PriceChange } from "@/app/components/shared/PriceChange";
import Link from "next/link";

const portfolioStats = {
  totalValue: "$247.50",
  totalChange: 12.4,
  tokensOwned: 8,
  tokensCreated: 2,
};

const holdings = [
  {
    id: "1",
    name: "Truffle Risotto",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=200",
    amount: 5,
    value: 85.50,
    avgCost: 12.20,
    currentPrice: 17.10,
    priceChange: 24.5,
  },
  {
    id: "2",
    name: "Pad Thai Supreme",
    image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=200",
    amount: 3,
    value: 62.40,
    avgCost: 18.50,
    currentPrice: 20.80,
    priceChange: 12.4,
  },
  {
    id: "3",
    name: "Spicy Tuna Roll",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200",
    amount: 8,
    value: 99.60,
    avgCost: 14.20,
    currentPrice: 12.45,
    priceChange: -8.2,
  },
];

const createdTokens = [
  {
    id: "4",
    name: "Secret Ramen",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200",
    holders: 24,
    marketCap: "$4.2K",
    earnings: "$42.50",
  },
];

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-gray-900 pb-24">
      <Header title="Portfolio" />

      {/* Portfolio Summary */}
      <div className="px-4 py-6">
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] border border-[var(--primary-dark)]/30 rounded-2xl p-6">
          <p className="text-sm text-gray-600 mb-1">Total Portfolio Value</p>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-bold text-gray-900">{portfolioStats.totalValue}</span>
            <PriceChange value={portfolioStats.totalChange} size="md" />
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-semibold text-gray-900">{portfolioStats.tokensOwned}</p>
              <p className="text-xs text-gray-500">Stamps Owned</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{portfolioStats.tokensCreated}</p>
              <p className="text-xs text-gray-500">Stamps Created</p>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Your Holdings</h2>
        <div className="space-y-3">
          {holdings.map((holding) => (
            <Link key={holding.id} href={`/dish/${holding.id}`}>
              <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors shadow-sm">
                <div className="flex gap-4">
                  <img
                    src={holding.image}
                    alt={holding.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{holding.name}</h3>
                        <p className="text-sm text-gray-500">{holding.amount} Stamps</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${holding.value.toFixed(2)}</p>
                        <PriceChange value={holding.priceChange} size="sm" />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Avg: ${holding.avgCost.toFixed(2)}</span>
                      <span>Now: ${holding.currentPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Created Tokens */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Stamps You Created</h2>
        <div className="space-y-3">
          {createdTokens.map((token) => (
            <Link key={token.id} href={`/dish/${token.id}`}>
              <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors shadow-sm">
                <div className="flex gap-4">
                  <div className="relative">
                    <img
                      src={token.image}
                      alt={token.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L9 9l-8 2 6 5-2 8 7-4 7 4-2-8 6-5-8-2-3-8z"/></svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{token.name}</h3>
                        <p className="text-sm text-gray-500">{token.holders} holders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">MC: {token.marketCap}</p>
                        <p className="text-green-600 font-medium">+{token.earnings}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

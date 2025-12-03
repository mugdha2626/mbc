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
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <Header title="Portfolio" />

      {/* Portfolio Summary */}
      <div className="px-4 py-6">
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
          <p className="text-sm text-zinc-400 mb-1">Total Portfolio Value</p>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-bold">{portfolioStats.totalValue}</span>
            <PriceChange value={portfolioStats.totalChange} size="md" />
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-semibold">{portfolioStats.tokensOwned}</p>
              <p className="text-xs text-zinc-500">Tokens Owned</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{portfolioStats.tokensCreated}</p>
              <p className="text-xs text-zinc-500">Tokens Created</p>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Your Holdings</h2>
        <div className="space-y-3">
          {holdings.map((holding) => (
            <Link key={holding.id} href={`/dish/${holding.id}`}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="flex gap-4">
                  <img
                    src={holding.image}
                    alt={holding.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{holding.name}</h3>
                        <p className="text-sm text-zinc-500">{holding.amount} tokens</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${holding.value.toFixed(2)}</p>
                        <PriceChange value={holding.priceChange} size="sm" />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-zinc-500">
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
        <h2 className="text-lg font-semibold mb-3">Tokens You Created</h2>
        <div className="space-y-3">
          {createdTokens.map((token) => (
            <Link key={token.id} href={`/dish/${token.id}`}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="flex gap-4">
                  <div className="relative">
                    <img
                      src={token.image}
                      alt={token.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs">👑</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{token.name}</h3>
                        <p className="text-sm text-zinc-500">{token.holders} holders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-400">MC: {token.marketCap}</p>
                        <p className="text-green-400 font-medium">+{token.earnings}</p>
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

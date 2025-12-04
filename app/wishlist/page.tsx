"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { useFarcaster } from "@/app/providers/FarcasterProvider";
import Link from "next/link";

// Mock dishes data (same as in other pages for consistency)
const MOCK_DISHES = [
    {
        id: "1",
        name: "Truffle Mushroom Risotto",
        image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800",
        restaurant: "The Garden Kitchen",
        price: 4.23,
        holders: ["https://i.pravatar.cc/100?img=1", "https://i.pravatar.cc/100?img=2", "https://i.pravatar.cc/100?img=3"],
        marketCap: "$2.1K",
        volume: "$847",
        priceChange: 12,
    },
    {
        id: "2",
        name: "Spicy Miso Ramen",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
        restaurant: "Tokyo Express",
        price: 3.50,
        holders: ["https://i.pravatar.cc/100?img=4", "https://i.pravatar.cc/100?img=5"],
        marketCap: "$1.8K",
        volume: "$500",
        priceChange: -5,
    },
    {
        id: "3",
        name: "Avocado Toast",
        image: "https://images.unsplash.com/photo-1588137372308-15f75323ca8d?w=800",
        restaurant: "Brunch Spot",
        price: 5.00,
        holders: ["https://i.pravatar.cc/100?img=6"],
        marketCap: "$3.0K",
        volume: "$1.2K",
        priceChange: 8,
    }
];

export default function WishlistPage() {
    const router = useRouter();
    const { user } = useFarcaster();
    const [wishlistItems, setWishlistItems] = useState<{ dish: string; referrer: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWishlist = async () => {
            if (!user) return;
            try {
                const res = await fetch(`/api/wishlist?fid=${user.fid}`);
                if (res.ok) {
                    const data = await res.json();
                    setWishlistItems(data.wishlist || []);
                }
            } catch (error) {
                console.error("Failed to fetch wishlist", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchWishlist();
        } else {
            // If no user yet, wait a bit or just show loading
            // The FarcasterProvider handles loading state too
        }
    }, [user]);

    // Filter mock dishes based on wishlist
    // In a real app, we would fetch these dishes from the API
    const displayedDishes = MOCK_DISHES.filter(d =>
        wishlistItems.some(item => item.dish === d.id)
    );

    // If we have items in wishlist that are not in MOCK_DISHES, we might want to show placeholders
    // But for now, let's just show what matches.

    // Actually, if I just added "1" to wishlist, it should show up.

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
            </header>

            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    </div>
                ) : wishlistItems.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
                        <p className="text-gray-500 mb-6">Explore dishes and save your favorites for later!</p>
                        <Link href="/explore" className="btn-primary inline-block px-6 py-3 rounded-xl">
                            Explore Dishes
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedDishes.length > 0 ? displayedDishes.map((dish) => (
                            <Link key={dish.id} href={`/dish/${dish.id}`}>
                                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex gap-4 hover:border-gray-200 transition-all shadow-sm">
                                    <img src={dish.image} alt={dish.name} className="w-24 h-24 rounded-xl object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">{dish.name}</h3>
                                            <button
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!user) return;
                                                    try {
                                                        await fetch("/api/wishlist", {
                                                            method: "DELETE",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ fid: user.fid, dishId: dish.id }),
                                                        });
                                                        setWishlistItems(prev => prev.filter(i => i.dish !== dish.id));
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-2">{dish.restaurant}</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-bold text-primary-dark">${dish.price.toFixed(2)}</p>
                                            <span className={`text-sm font-medium ${dish.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {dish.priceChange >= 0 ? '+' : ''}{dish.priceChange}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            // Fallback if we have items but no mock data matches
                            wishlistItems.map((item) => (
                                <div key={item.dish} className="bg-white rounded-2xl p-4 border border-gray-100">
                                    <p className="font-medium text-gray-900">Dish ID: {item.dish}</p>
                                    <p className="text-sm text-gray-500">Referrer: {item.referrer || "None"}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

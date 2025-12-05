import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

interface UserDocument {
  fid: number;
  username: string;
  pfpUrl?: string;
  displayName?: string;
  reputationScore: number;
  portfolio: {
    totalValue: number;
    totalReturn: number;
    totalInvested: number;
    dishes: {
      dish: string;
      quantity: number;
      return: number;
    }[];
  };
}

interface DishDocument {
  dishId: string;
  currentPrice: number;
  restaurant: string;
}

interface RestaurantDocument {
  id: string;
  city?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

/**
 * Extract city from address string
 */
function extractCityFromAddress(address: string): string | null {
  if (!address) return null;
  // Common pattern: "Street, City, State ZIP" or "Street, City, Country"
  const parts = address.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    // Usually city is the second-to-last or second part
    // Try to find a part that looks like a city (not a zip code, not a state abbreviation)
    for (let i = parts.length - 2; i >= 1; i--) {
      const part = parts[i];
      // Skip if it looks like a zip code or state abbreviation
      if (/^\d{5}(-\d{4})?$/.test(part)) continue;
      if (/^[A-Z]{2}$/.test(part)) continue;
      // Skip if it contains numbers (likely street address)
      if (/\d/.test(part) && i === 0) continue;
      return part;
    }
    return parts[1]; // Fallback to second part
  }
  return null;
}

/**
 * GET - Get top users
 * Query params:
 * - city: Filter by city (optional, "global" for all)
 * - userLat: User's latitude (for finding their city)
 * - userLng: User's longitude (for finding their city)
 * - fid: Current user's fid (to determine their city from their stamps)
 * - limit: Number of users to return (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityFilter = searchParams.get("city") || "global";
    const currentUserFid = parseInt(searchParams.get("fid") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");

    const db = await getDb();

    // Get all users with portfolios
    const users = await db
      .collection<UserDocument>("users")
      .find({ "portfolio.dishes.0": { $exists: true } }) // Only users with at least 1 dish
      .toArray();

    if (users.length === 0) {
      return NextResponse.json({
        users: [],
        cities: [],
        currentUserCity: null,
      });
    }

    // Get all dishes for price lookup
    const allDishIds = [...new Set(users.flatMap(u => u.portfolio.dishes.map(d => d.dish)))];
    const dishes = await db
      .collection<DishDocument>("dishes")
      .find({ dishId: { $in: allDishIds } })
      .project({ dishId: 1, currentPrice: 1, restaurant: 1 })
      .toArray();

    const dishPriceMap = new Map(dishes.map(d => [d.dishId, d.currentPrice]));
    const dishRestaurantMap = new Map(dishes.map(d => [d.dishId, d.restaurant]));

    // Get all restaurants for city lookup
    const restaurantIds = [...new Set(dishes.map(d => d.restaurant))];
    const restaurants = await db
      .collection<RestaurantDocument>("restaurants")
      .find({ id: { $in: restaurantIds } })
      .project({ id: 1, city: 1, address: 1, latitude: 1, longitude: 1 })
      .toArray();

    const restaurantCityMap = new Map<string, string>();
    restaurants.forEach(r => {
      const city = r.city || extractCityFromAddress(r.address || "");
      if (city) {
        restaurantCityMap.set(r.id, city);
      }
    });

    // Calculate each user's portfolio value and determine their primary city
    const userStats = users.map(user => {
      // Calculate current portfolio value
      let portfolioValue = 0;
      const cityCounts = new Map<string, number>();

      user.portfolio.dishes.forEach(holding => {
        const price = dishPriceMap.get(holding.dish) || 0;
        portfolioValue += price * holding.quantity;

        // Count cities from their holdings
        const restaurantId = dishRestaurantMap.get(holding.dish);
        if (restaurantId) {
          const city = restaurantCityMap.get(restaurantId);
          if (city) {
            cityCounts.set(city, (cityCounts.get(city) || 0) + holding.quantity);
          }
        }
      });

      // Find primary city (most stamps)
      let primaryCity: string | null = null;
      let maxCount = 0;
      cityCounts.forEach((count, city) => {
        if (count > maxCount) {
          maxCount = count;
          primaryCity = city;
        }
      });

      // Calculate value change (current value vs invested)
      const totalInvested = user.portfolio.totalInvested || 0;
      const valueChange = portfolioValue - totalInvested;
      const valueChangePercent = totalInvested > 0
        ? (valueChange / totalInvested) * 100
        : 0;

      // Calculate ranking score
      // Weight: 60% portfolio value, 40% value change percentage
      // Use log scale for value to prevent huge portfolios from dominating
      const valueScore = Math.log10(Math.max(1, portfolioValue)) * 10;
      const changeScore = Math.min(100, Math.max(-50, valueChangePercent)); // Cap change impact
      const rankingScore = valueScore * 0.6 + changeScore * 0.4 + (user.reputationScore / 10);

      return {
        fid: user.fid,
        username: user.username,
        pfpUrl: user.pfpUrl,
        displayName: user.displayName,
        portfolioValue,
        valueChange,
        valueChangePercent,
        totalInvested,
        reputationScore: user.reputationScore,
        dishCount: user.portfolio.dishes.length,
        primaryCity,
        rankingScore,
      };
    });

    // Get all unique cities for filter options
    const allCities: string[] = [];
    const citySet = new Set<string>();
    userStats.forEach(u => {
      if (u.primaryCity && !citySet.has(u.primaryCity)) {
        citySet.add(u.primaryCity);
        allCities.push(u.primaryCity);
      }
    });
    allCities.sort();

    // Find current user's city
    const currentUser = userStats.find(u => u.fid === currentUserFid);
    const currentUserCity = currentUser?.primaryCity || null;

    // Filter by city if specified
    let filteredUsers = userStats;
    if (cityFilter && cityFilter !== "global") {
      filteredUsers = userStats.filter(u => u.primaryCity === cityFilter);
    }

    // Sort by ranking score and limit
    filteredUsers.sort((a, b) => b.rankingScore - a.rankingScore);
    const topUsers = filteredUsers.slice(0, limit);

    // Add rank to each user
    const rankedUsers = topUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    return NextResponse.json({
      users: rankedUsers,
      cities: allCities,
      currentUserCity,
      filter: cityFilter,
    });
  } catch (error) {
    console.error("Error fetching top users:", error);
    return NextResponse.json(
      { error: "Failed to fetch top users" },
      { status: 500 }
    );
  }
}

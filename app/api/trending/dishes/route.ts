import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

interface DishDocument {
  dishId: string;
  name: string;
  image?: string;
  startingPrice: number;
  currentPrice: number;
  currentSupply: number;
  totalHolders: number;
  dailyVolume: number;
  marketCap: number;
  creator: number;
  restaurant: string;
  createdAt: Date;
}

interface RestaurantDocument {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
}

/**
 * Calculate trending score for a dish
 * Factors:
 * 1. Price growth rate (currentPrice vs startingPrice)
 * 2. Age adjustment (newer dishes get a boost to normalize for less time)
 * 3. Current price weight (higher price = more activity)
 * 4. Holder count (social proof)
 */
function calculateTrendingScore(dish: DishDocument): number {
  const now = new Date();
  const createdAt = new Date(dish.createdAt);
  const ageInDays = Math.max(1, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Price growth percentage
  const priceGrowth = dish.startingPrice > 0
    ? ((dish.currentPrice - dish.startingPrice) / dish.startingPrice) * 100
    : 0;

  // Normalize growth to 2-week period
  // If dish is < 14 days old, project what the growth would be over 14 days
  const twoWeeks = 14;
  let normalizedGrowth: number;

  if (ageInDays < twoWeeks) {
    // Project growth: if it grew X% in Y days, project to 14 days
    // Apply a slight dampening factor (0.8) to avoid over-projection
    normalizedGrowth = (priceGrowth / ageInDays) * twoWeeks * 0.8;
    // Give new dishes a boost (1.2x - 1.5x based on how new they are)
    const newBoost = 1 + (0.5 * (1 - ageInDays / twoWeeks));
    normalizedGrowth *= newBoost;
  } else {
    // For dishes older than 2 weeks, use actual 2-week equivalent
    // Slightly favor recent growth by weighting recent performance
    normalizedGrowth = priceGrowth * (twoWeeks / ageInDays);
  }

  // Current price factor (log scale to prevent domination by very high prices)
  // Range: 1-3x multiplier
  const priceFactor = 1 + Math.log10(Math.max(1, dish.currentPrice * 10));

  // Holder factor (social proof, log scale)
  // Range: 1-2x multiplier
  const holderFactor = 1 + Math.log10(Math.max(1, dish.totalHolders)) * 0.3;

  // Supply factor (more supply = more activity)
  const supplyFactor = 1 + Math.log10(Math.max(1, dish.currentSupply)) * 0.2;

  // Final score
  const score = normalizedGrowth * priceFactor * holderFactor * supplyFactor;

  return Math.max(0, score);
}

/**
 * Haversine distance calculation in km
 */
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GET - Get trending dishes
 * Query params:
 * - lat: User latitude
 * - lng: User longitude
 * - radius: Search radius in km (default 50)
 * - limit: Number of dishes to return (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseFloat(searchParams.get("radius") || "50");
    const limit = parseInt(searchParams.get("limit") || "10");

    const db = await getDb();

    // Get all dishes with their restaurant info
    const dishes = await db
      .collection<DishDocument>("dishes")
      .find({})
      .toArray();

    if (dishes.length === 0) {
      return NextResponse.json({ dishes: [], hasLocation: lat !== 0 && lng !== 0 });
    }

    // Get restaurant locations
    const restaurantIds = [...new Set(dishes.map(d => d.restaurant))];
    const restaurants = await db
      .collection<RestaurantDocument>("restaurants")
      .find({ id: { $in: restaurantIds } })
      .project({ id: 1, name: 1, latitude: 1, longitude: 1, city: 1 })
      .toArray();

    const restaurantMap = new Map(restaurants.map(r => [r.id, r]));

    // Get creator usernames
    const creatorFids = [...new Set(dishes.map(d => d.creator))];
    const creators = await db
      .collection("users")
      .find({ fid: { $in: creatorFids } })
      .project({ fid: 1, username: 1 })
      .toArray();
    const creatorMap = new Map(creators.map(c => [c.fid, c.username]));

    // Calculate trending score and filter by location if provided
    const hasLocation = lat !== 0 && lng !== 0;

    // Base price from bonding curve formula
    const BASE_PRICE = 1.0;

    const scoredDishes = dishes
      // Filter out dishes still at or below starting price ($1.00)
      .filter(dish => dish.currentPrice > BASE_PRICE)
      .map(dish => {
        const restaurant = restaurantMap.get(dish.restaurant);
        const distance = restaurant && hasLocation
          ? getDistance(lat, lng, restaurant.latitude, restaurant.longitude)
          : null;

        // Use BASE_PRICE as the minimum starting price to avoid inflated percentages
        // Some older dishes may have incorrect or missing startingPrice values
        const effectiveStartingPrice = Math.max(dish.startingPrice || BASE_PRICE, BASE_PRICE);

        // Calculate price change percentage from the effective starting price
        const priceChange = ((dish.currentPrice - effectiveStartingPrice) / effectiveStartingPrice) * 100;

        return {
          dishId: dish.dishId,
          name: dish.name,
          image: dish.image,
          currentPrice: dish.currentPrice,
          startingPrice: effectiveStartingPrice,
          priceChange,
          totalHolders: dish.totalHolders,
          currentSupply: dish.currentSupply,
          marketCap: dish.marketCap,
          restaurantId: dish.restaurant,
          restaurantName: restaurant?.name || "Unknown",
          creatorUsername: creatorMap.get(dish.creator) || `user_${dish.creator}`,
          creatorFid: dish.creator,
          distance,
          trendingScore: calculateTrendingScore(dish),
          createdAt: dish.createdAt,
          isNew: (new Date().getTime() - new Date(dish.createdAt).getTime()) < (2 * 60 * 60 * 1000),
        };
      })
      .filter(dish => {
        // If location provided, filter by radius
        if (hasLocation && dish.distance !== null) {
          return dish.distance <= radius;
        }
        return true;
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return NextResponse.json({
      dishes: scoredDishes,
      hasLocation,
      radius,
    });
  } catch (error) {
    console.error("Error fetching trending dishes:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending dishes" },
      { status: 500 }
    );
  }
}

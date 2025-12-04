import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/**
 * Extract city from address string
 */
function extractCity(address: string): string {
  if (!address) return "Unknown";
  
  // Try to extract city from address - typically format is "Street, City, State ZIP"
  const parts = address.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    // City is usually the second-to-last part before state/zip
    const cityPart = parts[parts.length - 2];
    // Remove any numbers (zip codes that might be mixed in)
    return cityPart.replace(/\d+/g, "").trim() || parts[1] || "Unknown";
  }
  return parts[0] || "Unknown";
}

/**
 * GET - Fetch restaurants for dishes that a user has backed
 * Returns restaurants in map-friendly format with city info
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;
    const fidNum = parseInt(fid);

    if (isNaN(fidNum)) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    const db = await getDb();

    // Find the user
    let user = await db.collection("users").findOne({ fid: fidNum });
    if (!user) {
      // Try as string for legacy data
      user = await db.collection("users").findOne({ fid: fid });
    }

    if (!user || !user.portfolio?.dishes?.length) {
      return NextResponse.json({ restaurants: [], cities: [] });
    }

    // Get unique dish IDs from user's portfolio
    const dishIds = user.portfolio.dishes.map((d: { dish: string }) => d.dish);

    // Find all dishes to get their restaurant IDs
    const dishes = await db
      .collection("dishes")
      .find({ dishId: { $in: dishIds } })
      .toArray();

    if (dishes.length === 0) {
      return NextResponse.json({ restaurants: [], cities: [] });
    }

    // Get unique restaurant IDs
    const restaurantIds = [...new Set(dishes.map((d) => d.restaurant))];

    // Fetch restaurant data
    const restaurants = await db
      .collection("restaurants")
      .find({ id: { $in: restaurantIds } })
      .toArray();

    // Count backed dishes per restaurant
    const dishCountByRestaurant = dishes.reduce((acc: Record<string, number>, dish) => {
      acc[dish.restaurant] = (acc[dish.restaurant] || 0) + 1;
      return acc;
    }, {});

    // Transform to map-friendly format with backed dish count and city
    const mapRestaurants = restaurants.map((r) => {
      const city = r.city || extractCity(r.address || "");
      return {
        id: r.id,
        name: r.name,
        lat: r.latitude,
        lng: r.longitude,
        image: r.image || "",
        address: r.address || "",
        city,
        dishCount: dishCountByRestaurant[r.id] || 0,
        tmapRating: r.tmapRating || 0,
      };
    });

    // Get unique cities
    const cities = [...new Set(mapRestaurants.map(r => r.city))].filter(c => c !== "Unknown");

    return NextResponse.json({ restaurants: mapRestaurants, cities });
  } catch (error) {
    console.error("Error fetching user restaurants:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}


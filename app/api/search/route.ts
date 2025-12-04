import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ restaurants: [], dishes: [], users: [] });
    }

    const db = await getDb();
    const searchRegex = { $regex: query, $options: "i" };

    // Search restaurants by name or address
    const restaurants = await db
      .collection("restaurants")
      .find({
        $or: [
          { name: searchRegex },
          { address: searchRegex },
        ],
      })
      .limit(5)
      .toArray();

    // Search dishes by name
    const dishes = await db
      .collection("dishes")
      .find({
        name: searchRegex,
      })
      .limit(5)
      .toArray();

    // For each dish, get the restaurant info
    const dishesWithRestaurant = await Promise.all(
      dishes.map(async (dish) => {
        const restaurant = await db
          .collection("restaurants")
          .findOne({ id: dish.restaurant });
        return {
          ...dish,
          restaurantName: restaurant?.name || "",
          restaurantLat: restaurant?.latitude,
          restaurantLng: restaurant?.longitude,
        };
      })
    );

    // Search users by username or displayName
    const users = await db
      .collection("users")
      .find({
        $or: [
          { username: searchRegex },
          { displayName: searchRegex },
        ],
      })
      .limit(5)
      .toArray();

    return NextResponse.json({
      restaurants,
      dishes: dishesWithRestaurant,
      users,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

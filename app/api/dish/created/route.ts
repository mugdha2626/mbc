import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/**
 * GET - Fetch all dishes created by a user with full details
 * Query params: fid (required) - Farcaster ID of the creator
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    const fidNum = parseInt(fid);
    if (isNaN(fidNum)) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    const db = await getDb();

    // Find all dishes where creator matches the fid
    const dishes = await db
      .collection("dishes")
      .find({ creator: fidNum })
      .toArray();

    // Enrich with restaurant details
    const enrichedDishes = await Promise.all(
      dishes.map(async (dish) => {
        const restaurant = await db.collection("restaurants").findOne({
          id: dish.restaurant,
        });

        return {
          ...dish,
          restaurantName: restaurant?.name || "Unknown Restaurant",
          restaurantAddress: restaurant?.address || "",
          restaurantImage: restaurant?.image || "",
        };
      })
    );

    return NextResponse.json({ dishes: enrichedDishes });
  } catch (error) {
    console.error("Error fetching created dishes:", error);
    return NextResponse.json(
      { error: "Failed to fetch created dishes" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

/**
 * GET - Fetch a single dish by dishId
 * The [id] parameter is the bytes32 dishId (e.g., 0x...)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dishIdParam } = await params;

    if (!dishIdParam) {
      return NextResponse.json(
        { error: "Dish ID is required" },
        { status: 400 }
      );
    }

    // Decode URL-encoded dishId (e.g., %3A becomes :, %20 becomes space)
    const dishId = decodeURIComponent(dishIdParam);

    const db = await getDb();

    // Fetch dish from database
    const dish = await db.collection("dishes").findOne({ dishId });

    if (!dish) {
      return NextResponse.json(
        { error: "Dish not found" },
        { status: 404 }
      );
    }

    // Fetch the restaurant info
    const restaurant = await db.collection("restaurants").findOne({
      id: dish.restaurant,
    });

    // Fetch the creator's info
    const creator = await db.collection("users").findOne({
      fid: dish.creator,
    });

    return NextResponse.json({
      dish: {
        ...dish,
        restaurantName: restaurant?.name || "Unknown Restaurant",
        restaurantAddress: restaurant?.address || "",
        restaurantImage: restaurant?.image || "",
        restaurantLatitude: restaurant?.latitude,
        restaurantLongitude: restaurant?.longitude,
        creatorUsername: creator?.username || "anonymous",
        creatorPfp: creator?.pfpUrl || "",
      },
    });
  } catch (error) {
    console.error("Error fetching dish:", error);
    return NextResponse.json(
      { error: "Failed to fetch dish" },
      { status: 500 }
    );
  }
}

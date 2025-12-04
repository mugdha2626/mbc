import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // Get all restaurants with their dish count
    const restaurants = await db
      .collection("restaurants")
      .find({})
      .toArray();

    // Transform to map-friendly format
    const mapRestaurants = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      lat: r.latitude,
      lng: r.longitude,
      image: r.image,
      address: r.address,
      dishCount: r.dishes?.length || 0,
      tmapRating: r.tmapRating,
    }));

    return NextResponse.json({ restaurants: mapRestaurants });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}

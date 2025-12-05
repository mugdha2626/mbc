import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find all dishes for this restaurant
    const dishes = await db
      .collection("dishes")
      .find({ restaurant: restaurantId })
      .sort({ createdAt: -1 })
      .toArray();

    // Map to the format we need
    const formattedDishes = dishes.map((dish) => ({
      dishId: dish.dishId,
      name: dish.name,
      image: dish.image,
      currentPrice: dish.currentPrice || 0,
      currentSupply: dish.currentSupply || 0,
      totalHolders: dish.totalHolders || 0,
    }));

    return NextResponse.json({ dishes: formattedDishes });
  } catch (error) {
    console.error("Error fetching restaurant dishes:", error);
    return NextResponse.json(
      { error: "Failed to fetch dishes" },
      { status: 500 }
    );
  }
}

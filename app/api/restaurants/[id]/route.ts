import { NextRequest, NextResponse } from "next/server";
import { getRestaurantWithStats } from "@/lib/db/restaurants";
import { getDb } from "@/lib/mongodb";
import type { Dish } from "@/app/interface";

interface DishWithName extends Dish {
  name: string;
  image?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    const restaurant = await getRestaurantWithStats(id);

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const dishes = restaurant.dishes as DishWithName[];

    // Get creator usernames for each dish
    const db = await getDb();
    const creatorFids = [...new Set(dishes.map((d) => d.creator))];
    const creators = await db
      .collection("users")
      .find({ fid: { $in: creatorFids } })
      .project({ fid: 1, username: 1 })
      .toArray();

    const creatorMap = new Map(creators.map(c => [c.fid, c.username]));

    // Enrich dishes with creator usernames
    const enrichedDishes = dishes.map((dish) => ({
      ...dish,
      creatorUsername: creatorMap.get(dish.creator) || `user_${dish.creator}`,
    }));

    return NextResponse.json({
      ...restaurant,
      dishes: enrichedDishes,
    });
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}

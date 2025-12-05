import { NextRequest, NextResponse } from "next/server";
import { getRestaurantWithStats } from "@/lib/db/restaurants";
import { getDb } from "@/lib/mongodb";
import type { Dish } from "@/app/interface";
import { createPublicClient, http, type Hash } from "viem";
import { baseSepolia } from "viem/chains";
import { TMAP_DISHES_ADDRESS, TMAP_DISHES_ABI } from "@/lib/contracts";

// Public client for reading from contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

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

    // Fetch live prices from contract for each dish
    const dishesWithLivePrices = await Promise.all(
      dishes.map(async (dish) => {
        let livePrice = dish.currentPrice;

        // Try to get live price from contract
        if (TMAP_DISHES_ADDRESS && dish.dishId) {
          try {
            const priceResult = await publicClient.readContract({
              address: TMAP_DISHES_ADDRESS,
              abi: TMAP_DISHES_ABI,
              functionName: "getCurrentPrice",
              args: [dish.dishId as Hash],
            });
            livePrice = Number(priceResult) / 1_000_000; // Convert from 6 decimals
          } catch (err) {
            // If contract call fails (dish might not exist on-chain), use DB price
            console.error(`Failed to get live price for dish ${dish.dishId}:`, err);
          }
        }

        return {
          ...dish,
          currentPrice: livePrice,
          creatorUsername: creatorMap.get(dish.creator) || `user_${dish.creator}`,
        };
      })
    );

    return NextResponse.json({
      ...restaurant,
      dishes: dishesWithLivePrices,
    });
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}

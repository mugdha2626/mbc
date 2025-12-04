import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

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

    const dishes = await db
      .collection("dishes")
      .find({ creator: fidNum })
      .toArray();

    // For each dish, get the restaurant name
    const dishesWithRestaurant = await Promise.all(
      dishes.map(async (dish) => {
        const restaurant = await db
          .collection("restaurants")
          .findOne({ id: dish.restaurant });

        return {
          tokenAdrress: dish.tokenAdrress,
          name: dish.name,
          image: dish.image || "",
          currentPrice: dish.currentPrice,
          totalHolders: dish.totalHolders,
          restaurant: restaurant?.name || "",
        };
      })
    );

    return NextResponse.json({ dishes: dishesWithRestaurant });
  } catch (error) {
    console.error("Error fetching creator dishes:", error);
    return NextResponse.json(
      { error: "Failed to fetch dishes" },
      { status: 500 }
    );
  }
}

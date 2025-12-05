import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { updateRestaurantRating } from "@/lib/db/restaurants";

/**
 * POST /api/dish/sell
 * Update user portfolio and dish stats after a successful sell transaction
 *
 * Body: {
 *   dishId: string (bytes32 hash),
 *   sellerFid: number,
 *   sellerAddress: string,
 *   tokensSold: number,
 *   usdcReceived: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dishId, sellerFid, sellerAddress, tokensSold, usdcReceived } = body;

    // Validate required fields
    if (!dishId) {
      return NextResponse.json({ error: "dishId is required" }, { status: 400 });
    }
    if (!sellerFid) {
      return NextResponse.json({ error: "sellerFid is required" }, { status: 400 });
    }
    if (!tokensSold || tokensSold <= 0) {
      return NextResponse.json({ error: "tokensSold must be positive" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    // 1. Update dish stats
    const dish = await db.collection("dishes").findOne({ dishId });
    if (!dish) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const newSupply = Math.max(0, (dish.currentSupply || 0) - tokensSold);

    // Calculate new price based on supply (using bonding curve formula)
    // Price = 1.0 + (supply * 0.0125)
    const newPrice = 1.0 + newSupply * 0.0125;

    await db.collection("dishes").updateOne(
      { dishId },
      {
        $set: {
          currentSupply: newSupply,
          currentPrice: newPrice,
          updatedAt: now,
        },
        $inc: {
          dailyVolume: usdcReceived || 0,
        },
      }
    );

    // 2. Update user's portfolio
    const user = await db.collection("users").findOne({ fid: sellerFid });
    if (user && user.portfolio?.dishes) {
      const dishIndex = user.portfolio.dishes.findIndex(
        (d: { dish: string }) => d.dish === dishId
      );

      if (dishIndex !== -1) {
        const currentQuantity = user.portfolio.dishes[dishIndex].quantity || 0;
        const newQuantity = Math.max(0, currentQuantity - tokensSold);

        if (newQuantity === 0) {
          // Remove dish from portfolio if quantity is 0
          await db.collection("users").updateOne(
            { fid: sellerFid },
            {
              $pull: { "portfolio.dishes": { dish: dishId } } as any,
              $set: { updatedAt: now },
            }
          );

          // Decrement holder count on dish
          await db.collection("dishes").updateOne(
            { dishId },
            {
              $inc: { totalHolders: -1 },
              $set: { updatedAt: now },
            }
          );
        } else {
          // Update quantity in portfolio
          await db.collection("users").updateOne(
            { fid: sellerFid, "portfolio.dishes.dish": dishId },
            {
              $set: {
                "portfolio.dishes.$.quantity": newQuantity,
                updatedAt: now,
              },
            }
          );
        }
      }
    }

    // 3. Update restaurant rating
    if (dish.restaurant) {
      await updateRestaurantRating(dish.restaurant);
    }

    console.log(
      `Sell: User ${sellerFid} sold ${tokensSold} tokens of dish ${dishId} for $${usdcReceived}`
    );

    return NextResponse.json({
      success: true,
      dishId,
      tokensSold,
      usdcReceived,
      newSupply,
      newPrice,
    });
  } catch (error) {
    console.error("Error processing sell:", error);
    return NextResponse.json(
      { error: "Failed to process sell" },
      { status: 500 }
    );
  }
}

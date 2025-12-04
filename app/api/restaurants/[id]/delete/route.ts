import { NextRequest, NextResponse } from "next/server";
import { deleteRestaurantWithCascade } from "@/lib/db/restaurants";

/**
 * DELETE - Delete a restaurant and cascade delete all associated data
 * This removes:
 * - All dishes belonging to the restaurant
 * - All wishlist references to those dishes
 * - All portfolio references to those dishes
 * - The restaurant itself
 */
export async function DELETE(
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

    const result = await deleteRestaurantWithCascade(restaurantId);

    if (!result.deletedRestaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Restaurant and associated data deleted successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    return NextResponse.json(
      { error: "Failed to delete restaurant" },
      { status: 500 }
    );
  }
}

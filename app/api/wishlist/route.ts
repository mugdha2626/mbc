import { NextRequest, NextResponse } from "next/server";
import { addToWishlist, removeFromWishlist } from "@/lib/db/users";
import { cleanupOrphanedWishlistItems } from "@/lib/db/restaurants";

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

        // Clean up orphaned wishlist items and return the cleaned list
        const wishlist = await cleanupOrphanedWishlistItems(fidNum);
        return NextResponse.json({ wishlist });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        return NextResponse.json(
            { error: "Failed to fetch wishlist" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fid, dishId, referrer } = body;

        if (!fid || !dishId) {
            return NextResponse.json(
                { error: "FID and Dish ID are required" },
                { status: 400 }
            );
        }

        await addToWishlist(fid, dishId, referrer || 0);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        return NextResponse.json(
            { error: "Failed to add to wishlist" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { fid, dishId } = body;

        if (!fid || !dishId) {
            return NextResponse.json(
                { error: "FID and Dish ID are required" },
                { status: 400 }
            );
        }

        await removeFromWishlist(fid, dishId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        return NextResponse.json(
            { error: "Failed to remove from wishlist" },
            { status: 500 }
        );
    }
}

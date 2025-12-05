import { NextRequest, NextResponse } from "next/server";
import { recordReferral, getReferrer } from "@/lib/db/referrals";

/**
 * GET - Get the referrer for a user+dish combination
 * Query params: referredFid, dishId
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const referredFid = searchParams.get("referredFid");
    const dishId = searchParams.get("dishId");

    if (!referredFid || !dishId) {
      return NextResponse.json(
        { error: "referredFid and dishId are required" },
        { status: 400 }
      );
    }

    const referrerFid = await getReferrer(parseInt(referredFid), dishId);

    return NextResponse.json({ referrerFid });
  } catch (error) {
    console.error("Error getting referrer:", error);
    return NextResponse.json(
      { error: "Failed to get referrer" },
      { status: 500 }
    );
  }
}

/**
 * POST - Record a referral (first referrer wins, subsequent calls are no-ops)
 * Body: { referredFid, dishId, referrerFid }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referredFid, dishId, referrerFid } = body;

    if (!referredFid || !dishId || !referrerFid) {
      return NextResponse.json(
        { error: "referredFid, dishId, and referrerFid are required" },
        { status: 400 }
      );
    }

    const recorded = await recordReferral(
      parseInt(referredFid),
      dishId,
      parseInt(referrerFid)
    );

    return NextResponse.json({ success: true, recorded });
  } catch (error) {
    console.error("Error recording referral:", error);
    return NextResponse.json(
      { error: "Failed to record referral" },
      { status: 500 }
    );
  }
}


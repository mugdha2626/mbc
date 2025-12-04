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

    // Try to find user by fid as number first, then as string (for legacy data)
    let user = await db.collection("users").findOne({ fid: fidNum });

    if (!user) {
      // Try as string in case of legacy data
      user = await db.collection("users").findOne({ fid: fid });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

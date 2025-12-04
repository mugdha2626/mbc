import { NextRequest, NextResponse } from "next/server";
import { findUserByFid } from "@/lib/db/users";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;
    const fidNum = parseInt(fid);

    if (isNaN(fidNum)) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    const user = await findUserByFid(fidNum);

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

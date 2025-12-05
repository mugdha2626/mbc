import { NextRequest, NextResponse } from "next/server";
import { upsertUser } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, username, walletAddress, pfpUrl, displayName } = body;

    if (!fid) {
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    const { user, isNewUser } = await upsertUser(
      Number(fid),
      username || "",
      walletAddress || "",
      pfpUrl,
      displayName
    );

    return NextResponse.json({ user, isNewUser });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { upsertUser } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, username } = body;

    if (!fid) {
      return NextResponse.json(
        { error: "Missing fid" },
        { status: 400 }
      );
    }

    // Create or update user in MongoDB
    const user = await upsertUser(fid.toString(), username || "");

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

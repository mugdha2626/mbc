import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  pad,
  stringToBytes,
  toHex,
  type Hash,
} from "viem";
import { baseSepolia } from "viem/chains";
import { TMAP_DISHES_ADDRESS, TMAP_DISHES_ABI } from "@/lib/contracts";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const toBytes32DishId = (id: string): Hash => {
  if (id.startsWith("0x") && id.length === 66) {
    return id as Hash;
  }
  const bytes = stringToBytes(id);
  const truncated = bytes.slice(0, 32);
  return toHex(pad(truncated, { size: 32 })) as Hash;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Dish ID is required" },
        { status: 400 }
      );
    }

    if (!TMAP_DISHES_ADDRESS) {
      return NextResponse.json(
        { error: "Contract address is not configured" },
        { status: 500 }
      );
    }

    const decodedId = decodeURIComponent(id);
    const dishIdBytes32 = toBytes32DishId(decodedId);

    const holderCount = await publicClient.readContract({
      address: TMAP_DISHES_ADDRESS,
      abi: TMAP_DISHES_ABI,
      functionName: "getHolderCount",
      args: [dishIdBytes32],
    });

    return NextResponse.json({
      dishId: decodedId,
      holderCount: Number(holderCount),
    });
  } catch (error) {
    console.error("Error fetching holder count:", error);
    return NextResponse.json(
      { error: "Failed to fetch holder count" },
      { status: 500 }
    );
  }
}

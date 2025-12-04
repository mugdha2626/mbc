import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { createPublicClient, http, type Hash } from "viem";
import { baseSepolia } from "viem/chains";
import { TMAP_DISHES_ADDRESS, TMAP_DISHES_ABI } from "@/lib/contracts";

// Create a public client to read from the contract
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

interface MintRequest {
  dishId: string;
  minterFid: number;
  minterAddress: string;
  usdcAmount: number; // Amount in USDC (not wei)
  tokensReceived: number;
  referrerFid?: number | null;
}

/**
 * POST - Update dish data after a successful mint
 * This syncs the database with the on-chain state
 */
export async function POST(request: NextRequest) {
  try {
    const body: MintRequest = await request.json();

    const { dishId, minterFid, minterAddress, usdcAmount, tokensReceived, referrerFid } = body;

    if (!dishId || !minterFid || !minterAddress) {
      return NextResponse.json(
        { error: "dishId, minterFid, and minterAddress are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    // Read current price and supply from the contract for accuracy
    // Get current price from contract
    const priceResult = await publicClient.readContract({
      address: TMAP_DISHES_ADDRESS,
      abi: TMAP_DISHES_ABI,
      functionName: "getCurrentPrice",
      args: [dishId as Hash],
    });
    const currentPrice = Number(priceResult) / 1_000_000; // Convert from 6 decimals

    // Get dish info including total supply
    const dishResult = await publicClient.readContract({
      address: TMAP_DISHES_ADDRESS,
      abi: TMAP_DISHES_ABI,
      functionName: "dishes",
      args: [dishId as Hash],
    });
    // dishResult is a tuple: [creator, totalSupply, createdAt, metadata, exists]
    const totalSupply = Number(dishResult[1]);

    // Check if user already holds this dish
    const existingHolder = await db.collection("users").findOne({
      fid: minterFid,
      "portfolio.dishes.dish": dishId,
    });

    const isNewHolder = !existingHolder;

    // Calculate market cap
    const marketCap = currentPrice * totalSupply;

    // Update dish document
    const dishUpdate: Record<string, unknown> = {
      currentPrice,
      currentSupply: totalSupply,
      marketCap,
      updatedAt: now,
    };

    // Increment totalHolders only if this is a new holder
    const dishUpdateQuery: Record<string, unknown> = {
      $set: dishUpdate,
      $inc: {
        dailyVolume: usdcAmount,
        ...(isNewHolder ? { totalHolders: 1 } : {}),
      },
    };

    await db.collection("dishes").updateOne(
      { dishId },
      dishUpdateQuery
    );

    // Update minter's portfolio
    if (isNewHolder) {
      // Add new dish to portfolio
      await db.collection("users").updateOne(
        { fid: minterFid },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {
          $push: {
            "portfolio.dishes": {
              dish: dishId,
              quantity: tokensReceived,
              return: 0,
              referredBy: referrerFid || null,
              referredTo: [],
            },
          },
          $inc: {
            "portfolio.totalInvested": usdcAmount,
          },
          $set: { updatedAt: now },
        } as any
      );
    } else {
      // Update existing dish in portfolio
      await db.collection("users").updateOne(
        { fid: minterFid, "portfolio.dishes.dish": dishId },
        {
          $inc: {
            "portfolio.dishes.$.quantity": tokensReceived,
            "portfolio.totalInvested": usdcAmount,
          },
          $set: { updatedAt: now },
        }
      );
    }

    // If there's a referrer, update their referral tracking
    if (referrerFid && isNewHolder) {
      await db.collection("users").updateOne(
        { fid: referrerFid, "portfolio.dishes.dish": dishId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {
          $push: {
            "portfolio.dishes.$.referredTo": minterFid,
          },
          $inc: {
            reputationScore: 10, // Reward for successful referral
          },
          $set: { updatedAt: now },
        } as any
      );
    }

    // Update minter's reputation score
    await db.collection("users").updateOne(
      { fid: minterFid },
      {
        $inc: { reputationScore: 5 }, // Reward for minting
      }
    );

    return NextResponse.json({
      success: true,
      dish: {
        dishId,
        currentPrice,
        currentSupply: totalSupply,
        totalHolders: isNewHolder ? "incremented" : "unchanged",
        marketCap,
      },
    });
  } catch (error) {
    console.error("Error updating dish after mint:", error);
    return NextResponse.json(
      { error: "Failed to update dish data" },
      { status: 500 }
    );
  }
}

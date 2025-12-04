import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Dish, DishId, Fid, RestaurantId } from "@/app/interface";
import { keccak256, toBytes } from "viem";
import { updateRestaurantRating } from "@/lib/db/restaurants";

// Extended Dish type for database storage (includes extra fields)
interface DishDocument extends Dish {
  name: string;
  description?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request body type for checking/preparing a dish
interface PrepareDishRequest {
  name: string;
  description?: string;
  image?: string;
  restaurantId: RestaurantId;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  creatorFid: Fid;
}

// Request body for saving after contract creation
interface SaveDishRequest extends PrepareDishRequest {
  dishId: DishId;
  createTxHash?: string;
  mintTxHash?: string;
}

/**
 * Generate a unique dishId by hashing the restaurant name and dish name
 * This creates a bytes32 hash that matches the contract's dishId format
 */
export function generateDishId(
  restaurantName: string,
  dishName: string
): DishId {
  const combined = `${restaurantName.toLowerCase().trim()}:${dishName
    .toLowerCase()
    .trim()}`;
  return keccak256(toBytes(combined));
}

/**
 * GET - Check if dish exists and get dishId
 * Returns: { exists: boolean, dishId: string, dish?: DishDocument }
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const restaurantName = searchParams.get("restaurantName");
  const dishName = searchParams.get("dishName");

  if (!restaurantName || !dishName) {
    return NextResponse.json(
      { error: "restaurantName and dishName are required" },
      { status: 400 }
    );
  }

  const dishId = generateDishId(restaurantName, dishName);
  const db = await getDb();

  // Check if dish exists in database
  const existingDish = await db.collection("dishes").findOne({ dishId });

  if (existingDish) {
    return NextResponse.json({
      exists: true,
      dishId,
      dish: existingDish,
    });
  }

  return NextResponse.json({
    exists: false,
    dishId,
  });
}

/**
 * POST - Save dish to database after contract creation/minting
 */
export async function POST(request: NextRequest) {
  try {
    const body: SaveDishRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Dish name is required" },
        { status: 400 }
      );
    }

    if (!body.restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    if (!body.creatorFid) {
      return NextResponse.json(
        { error: "Creator FID is required" },
        { status: 400 }
      );
    }

    if (!body.dishId) {
      return NextResponse.json(
        { error: "Dish ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if dish already exists
    const existingDish = await db.collection("dishes").findOne({
      dishId: body.dishId,
    });

    if (existingDish) {
      // Dish already exists - just return it (minting was done on existing dish)
      return NextResponse.json({
        success: true,
        dish: existingDish,
        isNew: false,
      });
    }

    // Create new dish document
    const now = new Date();
    const dish: DishDocument = {
      dishId: body.dishId,
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      image: body.image || undefined,
      startingPrice: 0.1,
      currentPrice: 0.1,
      dailyPriceChange: 0,
      currentSupply: 0,
      totalHolders: 0,
      dailyVolume: 0,
      marketCap: 0,
      creator: body.creatorFid,
      restaurant: body.restaurantId,
      createdAt: now,
      updatedAt: now,
    };

    // Insert the dish into the database
    const result = await db.collection("dishes").insertOne(dish);

    // Ensure the restaurant exists in our database
    const existingRestaurant = await db.collection("restaurants").findOne({
      id: body.restaurantId,
    });

    if (!existingRestaurant) {
      await db.collection("restaurants").insertOne({
        id: body.restaurantId,
        name: body.restaurantName,
        address: body.restaurantAddress || "",
        latitude: body.restaurantLatitude,
        longitude: body.restaurantLongitude,
        image: "",
        dishes: [dish.dishId],
        tmapRating: 0,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db.collection("restaurants").updateOne(
        { id: body.restaurantId },
        {
          $addToSet: { dishes: dish.dishId },
          $set: { updatedAt: now },
        }
      );
    }

    // Update creator's portfolio
    await db.collection("users").updateOne(
      { fid: body.creatorFid },
      {
        $addToSet: {
          "portfolio.dishes": {
            dish: dish.dishId,
            quantity: 0,
            return: 0,
            referredBy: null,
            referredTo: [],
          },
        },
        $set: { updatedAt: now },
      }
    );

    // Update the restaurant's rating based on all its dishes
    await updateRestaurantRating(body.restaurantId);

    return NextResponse.json(
      {
        success: true,
        dish: {
          ...dish,
          _id: result.insertedId.toString(),
        },
        isNew: true,
        createTxHash: body.createTxHash,
        mintTxHash: body.mintTxHash,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving dish:", error);
    return NextResponse.json({ error: "Failed to save dish" }, { status: 500 });
  }
}

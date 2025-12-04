import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Dish, DishId, Fid, RestaurantId } from "@/app/interface";
import { keccak256, toBytes } from "viem";

// Extended Dish type for database storage (includes extra fields)
interface DishDocument extends Dish {
  name: string;
  description?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request body type
interface CreateDishRequest {
  name: string;
  description?: string;
  image?: string;
  restaurantId: RestaurantId;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  creatorFid: Fid;
  // Transaction hashes from frontend contract calls
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
  // Create a unique identifier by hashing restaurant name + dish name
  const combined = `${restaurantName.toLowerCase().trim()}:${dishName
    .toLowerCase()
    .trim()}`;
  return keccak256(toBytes(combined));
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateDishRequest = await request.json();

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

    const db = await getDb();

    // Generate unique dishId using restaurant name and dish name
    const dishId = generateDishId(body.restaurantName, body.name);

    // Check if dish already exists at this restaurant with same name
    const existingDish = await db.collection("dishes").findOne({
      dishId: dishId,
    });

    if (existingDish) {
      return NextResponse.json(
        { error: "A dish with this name already exists at this restaurant" },
        { status: 409 }
      );
    }

    // Initial token economics
    const startingPrice = 0.1; // $0.10

    // Create the dish document
    const now = new Date();
    const dish: DishDocument = {
      dishId: dishId,
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      image: body.image || undefined,
      startingPrice: startingPrice,
      currentPrice: startingPrice,
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

    // Also ensure the restaurant exists in our database
    const existingRestaurant = await db.collection("restaurants").findOne({
      id: body.restaurantId,
    });

    if (!existingRestaurant) {
      // Create the restaurant entry
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
      // Add dish to restaurant's dish list
      await db.collection("restaurants").updateOne(
        { id: body.restaurantId },
        {
          $addToSet: { dishes: dish.dishId },
          $set: { updatedAt: now },
        }
      );
    }

    // Update creator's portfolio (if user exists)
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

    return NextResponse.json(
      {
        success: true,
        dish: {
          ...dish,
          _id: result.insertedId.toString(),
        },
        createTxHash: body.createTxHash,
        mintTxHash: body.mintTxHash,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating dish:", error);
    return NextResponse.json(
      { error: "Failed to create dish" },
      { status: 500 }
    );
  }
}

// GET endpoint to generate dishId without creating (for frontend to use before contract call)
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

  return NextResponse.json({ dishId });
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Dish, DishAddress, Fid, RestaurantId } from "@/app/interface";

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
}

// Generate a unique token address
function generateTokenAddress(): DishAddress {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `0x${timestamp}${randomPart}`.toLowerCase();
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

    // Check if dish already exists at this restaurant with same name
    const existingDish = await db.collection("dishes").findOne({
      name: body.name.trim(),
      restaurant: body.restaurantId,
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
      tokenAdrress: generateTokenAddress(),
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
        dishes: [dish.tokenAdrress],
        tmapRating: 0,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Add dish to restaurant's dish list
      await db.collection("restaurants").updateOne(
        { id: body.restaurantId },
        {
          $addToSet: { dishes: dish.tokenAdrress },
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
            dish: dish.tokenAdrress,
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

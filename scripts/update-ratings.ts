/**
 * Updates all restaurant ratings based on their dishes' average prices.
 * Run with: npx tsx scripts/update-ratings.ts
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

function calculateRatingFromPrices(dishes: { currentPrice: number }[]): number {
  if (!dishes || dishes.length === 0) {
    return 0;
  }

  const avgPrice = dishes.reduce((sum, d) => sum + (d.currentPrice || 0), 0) / dishes.length;
  const rating = Math.min(avgPrice * 10, 100);

  return Math.round(rating * 10) / 10;
}

async function updateAllRatings() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI not found in environment");
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("tmap");
    const restaurants = db.collection("restaurants");
    const dishes = db.collection("dishes");

    const allRestaurants = await restaurants.find({}).toArray();
    console.log(`Found ${allRestaurants.length} restaurants\n`);

    for (const restaurant of allRestaurants) {
      const restaurantDishes = await dishes
        .find({ restaurant: restaurant.id })
        .project({ currentPrice: 1 })
        .toArray();

      const newRating = calculateRatingFromPrices(
        restaurantDishes as { currentPrice: number }[]
      );

      await restaurants.updateOne(
        { id: restaurant.id },
        { $set: { tmapRating: newRating, updatedAt: new Date() } }
      );

      console.log(
        `${restaurant.name}: ${restaurantDishes.length} dishes, rating: ${newRating}`
      );
    }

    console.log("\nAll restaurant ratings updated!");
  } finally {
    await client.close();
  }
}

updateAllRatings().catch(console.error);

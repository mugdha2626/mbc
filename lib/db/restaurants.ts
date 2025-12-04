import { getDb } from "../mongodb";
import type { Restaurant, Dish, RestaurantId } from "@/app/interface";

const RESTAURANTS_COLLECTION = "restaurants";
const DISHES_COLLECTION = "dishes";

/**
 * Calculate the tmapRating for a restaurant based on the average currentPrice of its dishes.
 *
 * Formula: Rating = Average Price × 10 (capped at 100)
 * - $0.10 starting price = 1.0 rating
 * - $2.00 = 20.0 rating
 * - $10.00 = 100.0 rating (max)
 */
export function calculateRatingFromPrices(dishes: { currentPrice: number }[]): number {
  if (!dishes || dishes.length === 0) {
    return 0;
  }

  const avgPrice = dishes.reduce((sum, d) => sum + (d.currentPrice || 0), 0) / dishes.length;
  const rating = Math.min(avgPrice * 10, 100);

  // Round to 1 decimal place
  return Math.round(rating * 10) / 10;
}

/**
 * Update a restaurant's tmapRating based on its dishes' current prices.
 * Call this whenever a dish is created, minted, or price changes.
 */
export async function updateRestaurantRating(restaurantId: RestaurantId): Promise<number> {
  const db = await getDb();

  // Get all dishes for this restaurant
  const dishes = await db
    .collection<Dish>(DISHES_COLLECTION)
    .find({ restaurant: restaurantId })
    .project({ currentPrice: 1 })
    .toArray();

  const newRating = calculateRatingFromPrices(dishes as { currentPrice: number }[]);

  // Update the restaurant's rating
  await db.collection(RESTAURANTS_COLLECTION).updateOne(
    { id: restaurantId },
    {
      $set: {
        tmapRating: newRating,
        updatedAt: new Date()
      }
    }
  );

  return newRating;
}

/**
 * Update all restaurant ratings in the database.
 * Useful for batch updates or migrations.
 */
export async function updateAllRestaurantRatings(): Promise<void> {
  const db = await getDb();

  const restaurants = await db
    .collection(RESTAURANTS_COLLECTION)
    .find({})
    .project({ id: 1 })
    .toArray();

  for (const restaurant of restaurants) {
    await updateRestaurantRating(restaurant.id);
  }
}

/**
 * Find a restaurant by ID with its full dish data
 */
export async function findRestaurantById(restaurantId: RestaurantId): Promise<Restaurant | null> {
  const db = await getDb();

  const restaurant = await db
    .collection(RESTAURANTS_COLLECTION)
    .findOne({ id: restaurantId });

  if (!restaurant) {
    return null;
  }

  // Get full dish data
  const dishes = await db
    .collection<Dish>(DISHES_COLLECTION)
    .find({ restaurant: restaurantId })
    .toArray();

  return {
    id: restaurant.id,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    name: restaurant.name,
    address: restaurant.address || "",
    image: restaurant.image || "",
    dishes: dishes,
    tmapRating: restaurant.tmapRating || 0,
  } as Restaurant;
}

// Extended dish type for database storage
interface DishDocument extends Dish {
  name: string;
  description?: string;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Get a restaurant with aggregated stats
 */
export async function getRestaurantWithStats(restaurantId: RestaurantId) {
  const db = await getDb();

  const restaurant = await db
    .collection(RESTAURANTS_COLLECTION)
    .findOne({ id: restaurantId });

  if (!restaurant) {
    return null;
  }

  // Get full dish data with creator info
  const dishes = await db
    .collection<DishDocument>(DISHES_COLLECTION)
    .find({ restaurant: restaurantId })
    .toArray();

  // Calculate total holders and volume across all dishes
  const totalHolders = dishes.reduce((sum, d) => sum + (d.totalHolders || 0), 0);
  const totalVolume = dishes.reduce((sum, d) => sum + (d.dailyVolume || 0), 0);

  return {
    id: restaurant.id,
    name: restaurant.name,
    address: restaurant.address || "",
    image: restaurant.image || "",
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    tmapRating: restaurant.tmapRating || 0,
    dishes: dishes as DishDocument[],
    stats: {
      dishCount: dishes.length,
      totalHolders,
      totalVolume,
    }
  };
}

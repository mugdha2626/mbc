import { getDb } from "../mongodb";
import type { Restaurant, Dish, RestaurantId } from "@/app/interface";

const RESTAURANTS_COLLECTION = "restaurants";
const DISHES_COLLECTION = "dishes";
const USERS_COLLECTION = "users";

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

/**
 * Delete a restaurant and cascade delete all associated data:
 * - Delete all dishes belonging to the restaurant
 * - Remove wishlist references to those dishes from all users
 * - Remove portfolio references to those dishes from all users
 * - Delete the restaurant itself
 *
 * @returns Object with counts of deleted items
 */
export async function deleteRestaurantWithCascade(restaurantId: RestaurantId): Promise<{
  deletedRestaurant: boolean;
  deletedDishes: number;
  cleanedWishlists: number;
  cleanedPortfolios: number;
}> {
  const db = await getDb();

  // 1. Get all dish IDs for this restaurant
  const dishes = await db
    .collection<Dish>(DISHES_COLLECTION)
    .find({ restaurant: restaurantId })
    .project({ dishId: 1 })
    .toArray();

  const dishIds = dishes.map(d => d.dishId);

  let cleanedWishlists = 0;
  let cleanedPortfolios = 0;

  if (dishIds.length > 0) {
    // 2. Remove these dishes from all users' wishlists
    const wishlistResult = await db.collection(USERS_COLLECTION).updateMany(
      { "wishList.dish": { $in: dishIds } },
      {
        $pull: {
          wishList: { dish: { $in: dishIds } }
        }
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    cleanedWishlists = wishlistResult.modifiedCount;

    // 3. Remove these dishes from all users' portfolios
    const portfolioResult = await db.collection(USERS_COLLECTION).updateMany(
      { "portfolio.dishes.dish": { $in: dishIds } },
      {
        $pull: {
          "portfolio.dishes": { dish: { $in: dishIds } }
        }
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    cleanedPortfolios = portfolioResult.modifiedCount;

    // 4. Delete all dishes for this restaurant
    await db.collection(DISHES_COLLECTION).deleteMany({ restaurant: restaurantId });
  }

  // 5. Delete the restaurant itself
  const restaurantResult = await db
    .collection(RESTAURANTS_COLLECTION)
    .deleteOne({ id: restaurantId });

  return {
    deletedRestaurant: restaurantResult.deletedCount > 0,
    deletedDishes: dishIds.length,
    cleanedWishlists,
    cleanedPortfolios,
  };
}

/**
 * Clean up orphaned wishlist items for a user.
 * Removes any wishlist items where the dish no longer exists.
 *
 * @returns The cleaned wishlist
 */
export async function cleanupOrphanedWishlistItems(fid: number): Promise<{ dish: string; referrer: number }[]> {
  const db = await getDb();

  // Get user's current wishlist
  const user = await db.collection(USERS_COLLECTION).findOne({ fid });
  if (!user || !user.wishList || user.wishList.length === 0) {
    return [];
  }

  const wishlistDishIds = user.wishList.map((item: { dish: string }) => item.dish);

  // Find which dishes actually exist
  const existingDishes = await db
    .collection(DISHES_COLLECTION)
    .find({ dishId: { $in: wishlistDishIds } })
    .project({ dishId: 1 })
    .toArray();

  const existingDishIds = new Set(existingDishes.map(d => d.dishId));

  // Find orphaned dish IDs
  const orphanedDishIds = wishlistDishIds.filter((id: string) => !existingDishIds.has(id));

  if (orphanedDishIds.length > 0) {
    // Remove orphaned items from wishlist
    await db.collection(USERS_COLLECTION).updateOne(
      { fid },
      {
        $pull: {
          wishList: { dish: { $in: orphanedDishIds } }
        }
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
  }

  // Return the cleaned wishlist
  const cleanedWishlist = user.wishList.filter(
    (item: { dish: string }) => existingDishIds.has(item.dish)
  );

  return cleanedWishlist;
}

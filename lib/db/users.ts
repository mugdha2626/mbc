import { getDb } from "../mongodb";
import type { User, Portfolio } from "@/app/interface";

const COLLECTION = "users";

// Default portfolio for new users
function createDefaultPortfolio(): Portfolio {
  return {
    totalValue: 0,
    totalReturn: 0,
    totalInvested: 0,
    dishes: [],
  };
}

// Default user object
function createDefaultUser(fid: number, username: string): User {
  return {
    fid,
    username,
    badges: [],
    walletAddress: "",
    portfolio: createDefaultPortfolio(),
    reputationScore: 0,
    wishList: [],
  };
}

/**
 * Find user by Farcaster ID
 */
export async function findUserByFid(fid: number): Promise<User | null> {
  const db = await getDb();
  const user = await db.collection<User>(COLLECTION).findOne({ fid });
  return user;
}

/**
 * Create or update user on Farcaster sign-in
 * Returns the user (existing or newly created) and whether it's a new user
 */
export async function upsertUser(
  fid: number,
  username: string,
  walletAddress: string,
  pfpUrl?: string,
  displayName?: string
): Promise<{ user: User; isNewUser: boolean }> {
  const db = await getDb();

  // Check if user exists first
  const existingUser = await db.collection<User>(COLLECTION).findOne({ fid });
  const isNewUser = !existingUser;

  const setFields: Record<string, unknown> = {
    username,
    walletAddress,
  };

  // Only update pfpUrl and displayName if provided
  if (pfpUrl) setFields.pfpUrl = pfpUrl;
  if (displayName) setFields.displayName = displayName;

  const result = await db.collection<User>(COLLECTION).findOneAndUpdate(
    { fid },
    {
      $set: setFields,
      $setOnInsert: {
        fid,
        badges: [],
        portfolio: createDefaultPortfolio(),
        reputationScore: 0,
        wishList: [],
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  return { user: result as User, isNewUser };
}

/**
 * Update user's wallet address
 */
export async function updateUserWallet(
  fid: number,
  walletAddress: string
): Promise<void> {
  const db = await getDb();
  await db
    .collection<User>(COLLECTION)
    .updateOne({ fid }, { $set: { walletAddress } });
}

/**
 * Get user's portfolio
 */
export async function getUserPortfolio(fid: number): Promise<Portfolio | null> {
  const user = await findUserByFid(fid);
  return user?.portfolio || null;
}

/**
 * Add item to user's wishlist
 */
export async function addToWishlist(
  fid: number,
  dishId: string,
  referrer: number
): Promise<void> {
  const db = await getDb();

  // Check if already in wishlist to avoid duplicates
  const user = await findUserByFid(fid);
  const exists = user?.wishList?.some((item) => item.dish === dishId);

  if (!exists) {
    await db.collection<User>(COLLECTION).updateOne(
      { fid },
      {
        $push: {
          wishList: { dish: dishId, referrer },
        },
      }
    );
  }
}

/**
 * Remove item from user's wishlist
 */
export async function removeFromWishlist(
  fid: number,
  dishId: string
): Promise<void> {
  const db = await getDb();
  await db.collection<User>(COLLECTION).updateOne(
    { fid },
    {
      $pull: {
        wishList: { dish: dishId },
      },
    }
  );
}

/**
 * Get user's wishlist
 */
export async function getWishlist(
  fid: number
): Promise<{ dish: string; referrer: number }[]> {
  const user = await findUserByFid(fid);
  return user?.wishList || [];
}

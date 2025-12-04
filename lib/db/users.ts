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
function createDefaultUser(fid: string, username: string): User {
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
export async function findUserByFid(fid: string): Promise<User | null> {
  const db = await getDb();
  const user = await db.collection<User>(COLLECTION).findOne({ fid });
  return user;
}

/**
 * Create or update user on Farcaster sign-in
 * Returns the user (existing or newly created)
 */
export async function upsertUser(
  fid: string,
  username: string,
  walletAddress: string
): Promise<User> {
  const db = await getDb();

  const result = await db.collection<User>(COLLECTION).findOneAndUpdate(
    { fid },
    {
      $set: {
        username, 
        walletAddress, 
      },
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

  return result as User;
}

/**
 * Update user's wallet address
 */
export async function updateUserWallet(
  fid: string,
  walletAddress: string
): Promise<void> {
  const db = await getDb();
  await db.collection<User>(COLLECTION).updateOne(
    { fid },
    { $set: { walletAddress } }
  );
}

/**
 * Get user's portfolio
 */
export async function getUserPortfolio(fid: string): Promise<Portfolio | null> {
  const user = await findUserByFid(fid);
  return user?.portfolio || null;
}

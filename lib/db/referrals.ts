import { getDb } from "../mongodb";

const COLLECTION = "referrals";

export interface Referral {
  referredFid: number;  // The user who was referred
  dishId: string;       // The dish they were referred to
  referrerFid: number;  // The user who made the referral
  createdAt: Date;      // When the referral was recorded
}

/**
 * Record a referral - only stores the FIRST referrer for a user+dish combo
 * This ensures the original referrer gets credit even if the user sees the dish
 * through multiple referral links later
 */
export async function recordReferral(
  referredFid: number,
  dishId: string,
  referrerFid: number
): Promise<boolean> {
  // Don't record self-referrals
  if (referredFid === referrerFid) {
    return false;
  }

  const db = await getDb();

  // Check if a referral already exists for this user+dish
  const existing = await db.collection<Referral>(COLLECTION).findOne({
    referredFid,
    dishId,
  });

  if (existing) {
    // Don't overwrite existing referral - first referrer wins
    console.log(`[Referral] Referral already exists for FID ${referredFid} on dish ${dishId.slice(0, 10)}...`);
    return false;
  }

  // Record the new referral
  await db.collection<Referral>(COLLECTION).insertOne({
    referredFid,
    dishId,
    referrerFid,
    createdAt: new Date(),
  });

  console.log(`[Referral] Recorded: FID ${referrerFid} referred FID ${referredFid} to dish ${dishId.slice(0, 10)}...`);
  return true;
}

/**
 * Get the referrer for a user+dish combination
 * Returns the referrer's FID or null if no referral exists
 */
export async function getReferrer(
  referredFid: number,
  dishId: string
): Promise<number | null> {
  const db = await getDb();

  const referral = await db.collection<Referral>(COLLECTION).findOne({
    referredFid,
    dishId,
  });

  return referral?.referrerFid || null;
}

/**
 * Get all referrals made by a user (dishes they've referred others to)
 */
export async function getReferralsByReferrer(
  referrerFid: number
): Promise<Referral[]> {
  const db = await getDb();

  const referrals = await db
    .collection<Referral>(COLLECTION)
    .find({ referrerFid })
    .sort({ createdAt: -1 })
    .toArray();

  return referrals;
}

/**
 * Get all referrals for a user (dishes they were referred to)
 */
export async function getReferralsForUser(
  referredFid: number
): Promise<Referral[]> {
  const db = await getDb();

  const referrals = await db
    .collection<Referral>(COLLECTION)
    .find({ referredFid })
    .sort({ createdAt: -1 })
    .toArray();

  return referrals;
}


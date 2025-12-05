/**
 * Calculate user tier based on multiple criteria:
 * - Dishes backed (from portfolio)
 * - Dishes created
 * - Portfolio value
 * - Reputation score
 */

export interface TierInfo {
  name: string;
  badgeClass: string;
}

export function calculateUserTier(
  dishesBacked: number,
  dishesCreated: number,
  portfolioValue: number,
  reputationScore: number
): TierInfo {
  // Restaurant Royalty - Top tier (highest reputation + high portfolio)
  if (reputationScore >= 1000 && portfolioValue >= 100000) {
    return {
      name: "Restaurant Royalty",
      badgeClass: "badge-amber", // Gold/premium color
    };
  }

  // Food Mogul - Created 20+ dishes AND $50k+ portfolio
  if (dishesCreated >= 20 && portfolioValue >= 50000) {
    return {
      name: "Food Mogul",
      badgeClass: "badge-purple",
    };
  }

  // Culinary Capitalist - Created 10+ dishes AND $10k+ portfolio
  if (dishesCreated >= 10 && portfolioValue >= 10000) {
    return {
      name: "Culinary Capitalist",
      badgeClass: "badge-primary",
    };
  }

  // Portfolio Chef - Created 3+ dishes AND $2k+ portfolio
  if (dishesCreated >= 3 && portfolioValue >= 2000) {
    return {
      name: "Portfolio Chef",
      badgeClass: "badge-blue",
    };
  }

  // Taste Investor - Created 1+ dish OR $500+ portfolio
  if (dishesCreated >= 1 || portfolioValue >= 500) {
    return {
      name: "Taste Investor",
      badgeClass: "badge-mint",
    };
  }

  // Rising Foodie - Backed 5+ dishes
  if (dishesBacked >= 5) {
    return {
      name: "Rising Foodie",
      badgeClass: "badge-gray",
    };
  }

  // New Taster - Default for new users
  return {
    name: "New Taster",
    badgeClass: "badge-gray",
  };
}


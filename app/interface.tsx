export type DishAddress = string;
export type RestaurantId = string;
export type Fid = string;

export interface User {
  fid: Fid;
  username: string;
  badges: string[];
  walletAddress: string;
  portfolio: Portfolio;
  reputationScore: number;
  wishList: { dish: DishAddress; referrer: Fid }[];
}

export interface Portfolio {
  totalValue: number;
  totalReturn: number;
  totalInvested: number;
  dishes: {
    dish: DishAddress;
    quantity: number;
    return: number;
    referredBy: Fid | null;
    referredTo: Fid[];
  }[];
}

export interface Restaurant {
  id: RestaurantId;
  latitude: number;
  longitude: number;
  placeId: string;
  name: string;
  image: string;
  dishes: Dish[];
  tmapRating: number;
}

export interface Dish {
  tokenAdrress: DishAddress;
  startingPrice: number;
  currentPrice: number;
  dailyPriceChange: number;
  currentSupply: number;
  totalHolders: number;
  dailyVolume: number;
  marketCap: number;
  creator: Fid;
  restaurant: RestaurantId;
}

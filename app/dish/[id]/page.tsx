import { Metadata } from "next";
import { getDb } from "@/lib/mongodb";
import DishPageClient from "./DishPageClient";

// Get the app URL from environment or use a default
const getAppUrl = () => {
  // For production, use NEXT_PUBLIC_APP_URL or VERCEL_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // For development/ngrok
  return "https://inez-cronish-hastately.ngrok-free.dev";
};

interface DishMetadata {
  name: string;
  description?: string;
  restaurant: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantImage?: string;
  creator: number;
  creatorUsername?: string;
  creatorPfp?: string;
  currentPrice?: number;
  marketCap?: number;
  dailyVolume?: number;
  dailyPriceChange?: number;
  totalHolders?: number;
  currentSupply?: number;
  weeklyChange?: number;
  yourHolding?: number;
  yourValue?: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: dishIdParam } = await params;
  const dishId = decodeURIComponent(dishIdParam);

  try {
    const db = await getDb();
    const dish = await db.collection("dishes").findOne({ dishId });

    if (!dish) {
      return {
        title: "Dish Not Found",
        description: "The dish you're looking for doesn't exist.",
      };
    }

    const restaurant = await db.collection("restaurants").findOne({
      id: dish.restaurant,
    });

    const creator = await db.collection("users").findOne({
      fid: dish.creator,
    });

    const appUrl = getAppUrl();
    const dishUrl = `${appUrl}/dish/${encodeURIComponent(dishId)}`;
    const ogImageUrl = `${appUrl}/api/og/dish/${encodeURIComponent(dishId)}`;

    const title = `${dish.name} at ${restaurant?.name || "Restaurant"}`;
    const description =
      dish.description ||
      `Back ${dish.name} at ${restaurant?.name || "this restaurant"}. $${(
        dish.currentPrice || 0.1
      ).toFixed(2)} per stamp.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogImageUrl,
            width: 600,
            height: 400,
            alt: dish.name,
          },
        ],
        url: dishUrl,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Dish",
      description: "View dish details",
    };
  }
}

export default async function DishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DishPageClient />;
}

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
  image?: string;
  currentPrice: number;
  totalHolders: number;
  restaurantName: string;
  creatorUsername: string;
  creatorFid: number;
}

async function getDishMetadata(dishId: string): Promise<DishMetadata | null> {
  try {
    const db = await getDb();
    const dish = await db.collection("dishes").findOne({ dishId });

    if (!dish) return null;

    const restaurant = await db.collection("restaurants").findOne({
      id: dish.restaurant,
    });

    const creator = await db.collection("users").findOne({
      fid: dish.creator,
    });

    return {
      name: dish.name || "Unknown Dish",
      description: dish.description,
      image: dish.image,
      currentPrice: dish.currentPrice || 0.1,
      totalHolders: dish.totalHolders || 0,
      restaurantName: restaurant?.name || "Unknown Restaurant",
      creatorUsername: creator?.username || "anonymous",
      creatorFid: dish.creator,
    };
  } catch (error) {
    console.error("Error fetching dish metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: dishIdParam } = await params;
  const dishId = decodeURIComponent(dishIdParam);
  const dish = await getDishMetadata(dishId);
  const appUrl = getAppUrl();

  if (!dish) {
    return {
      title: "Dish Not Found | tmap",
      description: "This dish could not be found on tmap.",
    };
  }

  // Build the fc:miniapp embed JSON for Farcaster
  // Use the same icon/splash from the manifest for consistency
  const miniAppEmbed = {
    version: "1",
    imageUrl: `${appUrl}/api/og/dish/${encodeURIComponent(dishId)}`,
    button: {
      title: "Mint this Dish",
      action: {
        type: "launch_miniapp",
        name: "tmap",
        url: `${appUrl}/dish/${encodeURIComponent(dishId)}?ref=${dish.creatorFid}`,
        splashImageUrl: "https://tmap.app/splash.png",
        splashBackgroundColor: "#000000",
      },
    },
  };

  const title = `${dish.name} at ${dish.restaurantName} | tmap`;
  const description =
    dish.description ||
    `${dish.name} - $${dish.currentPrice.toFixed(2)} | ${dish.totalHolders} holders | Mint on tmap`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `${appUrl}/api/og/dish/${encodeURIComponent(dishId)}`,
          width: 600,
          height: 400,
          alt: dish.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl}/api/og/dish/${encodeURIComponent(dishId)}`],
    },
    other: {
      // Farcaster Mini App embed metadata
      "fc:miniapp": JSON.stringify(miniAppEmbed),
      // Legacy fc:frame for backwards compatibility (optional)
      "fc:frame": JSON.stringify(miniAppEmbed),
    },
  };
}

export default function DishPage() {
  return <DishPageClient />;
}

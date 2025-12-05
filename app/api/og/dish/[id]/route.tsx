import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

// Use Node.js runtime for MongoDB compatibility
export const runtime = "nodejs";

// Image dimensions (3:2 aspect ratio as required by Farcaster)
const WIDTH = 600;
const HEIGHT = 400;

// Dynamic import to avoid edge runtime issues
async function getDishData(dishId: string) {
  const { getDb } = await import("@/lib/mongodb");
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
    image: dish.image,
    currentPrice: dish.currentPrice || 1.0,
    totalHolders: dish.totalHolders || 0,
    currentSupply: dish.currentSupply || 0,
    restaurantName: restaurant?.name || "Unknown Restaurant",
    creatorUsername: creator?.username || "anonymous",
    creatorPfp: creator?.pfpUrl,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dishIdParam } = await params;

    if (!dishIdParam) {
      return new Response("Dish ID is required", { status: 400 });
    }

    const dishId = decodeURIComponent(dishIdParam);
    const dish = await getDishData(dishId);

    if (!dish) {
      // Return a fallback image for non-existent dishes
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)",
              color: "white",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>
              Dish Not Found
            </div>
            <div style={{ fontSize: 16, marginTop: 12, color: "#666" }}>
              tmap - Social Map of Food Culture
            </div>
          </div>
        ),
        { width: WIDTH, height: HEIGHT }
      );
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            fontFamily: "system-ui, sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Background */}
          {dish.image ? (
            <img
              src={dish.image}
              alt=""
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(2px) brightness(0.6)",
                transform: "scale(1.1)",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
              }}
            />
          )}

          {/* Gradient overlay */}
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.9) 100%)",
            }}
          />

          {/* Main content container */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              padding: 28,
            }}
          >
            {/* Left side - Dish image */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                marginRight: 24,
              }}
            >
              {dish.image ? (
                <img
                  src={dish.image}
                  alt=""
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 20,
                    objectFit: "cover",
                    border: "3px solid rgba(255,255,255,0.2)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 20,
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 64,
                    border: "3px solid rgba(255,255,255,0.2)",
                  }}
                >
                  🍽️
                </div>
              )}
            </div>

            {/* Right side - Info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: 1,
              }}
            >
              {/* tmap badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: "bold", color: "white" }}>
                    tmap
                  </span>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#aaa" }}>
                    📍 {dish.restaurantName.length > 25
                      ? dish.restaurantName.slice(0, 25) + "..."
                      : dish.restaurantName}
                  </span>
                </div>
              </div>

              {/* Dish name */}
              <div
                style={{
                  color: "white",
                  fontSize: 36,
                  fontWeight: "bold",
                  lineHeight: 1.1,
                  marginBottom: 16,
                  textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                {dish.name.length > 30 ? dish.name.slice(0, 30) + "..." : dish.name}
              </div>

              {/* Price and stats row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {/* Price */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    borderRadius: 12,
                    padding: "8px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>
                    ${dish.currentPrice.toFixed(2)}
                  </span>
                </div>

                {/* Holders */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>👥</span>
                  <span style={{ fontSize: 16, color: "white", fontWeight: "600" }}>
                    {dish.totalHolders}
                  </span>
                </div>

                {/* Supply */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>🎫</span>
                  <span style={{ fontSize: 16, color: "white", fontWeight: "600" }}>
                    {dish.currentSupply}
                  </span>
                </div>
              </div>

              {/* Creator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {dish.creatorPfp ? (
                  <img
                    src={dish.creatorPfp}
                    alt=""
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    👤
                  </div>
                )}
                <span style={{ fontSize: 14, color: "#aaa" }}>
                  Created by{" "}
                  <span style={{ color: "#22c55e", fontWeight: "600" }}>
                    @{dish.creatorUsername}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom CTA bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 48,
              background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>
              Tap to Mint on tmap
            </span>
            <span style={{ fontSize: 18 }}>→</span>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);

    // Return a fallback error image
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)",
            color: "white",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              borderRadius: 16,
              padding: "12px 24px",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: "bold" }}>tmap</span>
          </div>
          <div style={{ fontSize: 18, color: "#888" }}>
            Social Map of Food Culture
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const METERS_PER_MILE = 1609.34;
const DEFAULT_RADIUS_MILES = 5;

// Haversine formula for accurate distance calculation
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radiusMiles = parseFloat(
      searchParams.get("radius") || String(DEFAULT_RADIUS_MILES)
    );

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const radiusMeters = radiusMiles * METERS_PER_MILE;

    // Calculate bounding box for fast pre-filtering
    // 1 degree latitude ≈ 111km, longitude varies by latitude
    const latDelta = radiusMeters / 111000;
    const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

    const db = await getDb();

    // Fast bounding box query - only fetch coordinates
    const restaurants = await db
      .collection("restaurants")
      .find(
        {
          latitude: { $gte: lat - latDelta, $lte: lat + latDelta },
          longitude: { $gte: lng - lngDelta, $lte: lng + lngDelta },
        },
        {
          projection: { latitude: 1, longitude: 1 },
        }
      )
      .toArray();

    // Apply precise Haversine distance filter
    const nearbyCount = restaurants.filter((r) => {
      if (typeof r.latitude !== "number" || typeof r.longitude !== "number") {
        return false;
      }
      const distance = calculateDistanceMeters(lat, lng, r.latitude, r.longitude);
      return distance <= radiusMeters;
    }).length;

    // Cache response for 5 minutes (coordinates don't change often)
    return NextResponse.json(
      { count: nearbyCount, radiusMiles },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching nearby count:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby count" },
      { status: 500 }
    );
  }
}

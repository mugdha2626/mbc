import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "Google API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Build request body
    const body: Record<string, unknown> = {
      textQuery: `${query} restaurant`,
      includedType: "restaurant",
      languageCode: "en",
      maxResultCount: 10,
    };

    // Add location bias if coordinates provided
    if (lat && lng) {
      body.locationBias = {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
          },
          radius: 5000, // 5km radius
        },
      };
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Places API error:", error);
      return NextResponse.json(
        { error: "Failed to search places" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform to simpler format
    const places: PlaceResult[] = (data.places || []).map(
      (place: {
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }) => ({
        id: place.id,
        name: place.displayName?.text || "Unknown",
        address: place.formattedAddress || "",
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
      })
    );

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

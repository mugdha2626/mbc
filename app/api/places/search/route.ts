import { NextRequest, NextResponse } from "next/server";
import { Restaurant, RestaurantId, Dish } from "@/app/interface";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
    // Use Places Autocomplete API for fast, predictive results
    // Note: includedPrimaryTypes is limited to 5 types max
    const primaryTypesForAutocomplete = [
      "restaurant",
      "cafe",
      "bar",
      "bakery",
      "coffee_shop",
    ];

    const body: Record<string, unknown> = {
      input: query,
      includedPrimaryTypes: primaryTypesForAutocomplete,
      languageCode: "en",
    };

    // Add location bias for nearby results
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      body.locationBias = {
        circle: {
          center: { latitude, longitude },
          radius: 5000.0, // 5km
        },
      };
    }

    // Step 1: Get autocomplete predictions
    const autocompleteResponse = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    if (!autocompleteResponse.ok) {
      const errorText = await autocompleteResponse.text();
      console.error("Autocomplete API error:", autocompleteResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to search places", details: errorText },
        { status: autocompleteResponse.status }
      );
    }

    const autocompleteData = await autocompleteResponse.json();
    const suggestions = autocompleteData.suggestions || [];

    if (suggestions.length === 0) {
      return NextResponse.json({ places: [] });
    }

    // Step 2: Fetch details for each place (in parallel for speed)
    // Filter to only placePredictions (not queryPredictions)
    const placePredictions = suggestions
      .filter((s: { placePrediction?: unknown }) => s.placePrediction)
      .slice(0, 8);

    const placeDetailsPromises = placePredictions.map(
      async (suggestion: { placePrediction: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }) => {
        const placeId = suggestion.placePrediction?.placeId;
        if (!placeId) return null;

        try {
          const detailsResponse = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_API_KEY!,
                "X-Goog-FieldMask": "id,displayName,formattedAddress,location,primaryType,types",
              },
            }
          );

          if (!detailsResponse.ok) return null;
          return await detailsResponse.json();
        } catch {
          return null;
        }
      }
    );

    const placeDetails = await Promise.all(placeDetailsPromises);

    // Transform to Restaurant format (already filtered by includedPrimaryTypes)
    const places: Restaurant[] = placeDetails
      .filter(Boolean)
      .map((place: {
        id?: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }): Restaurant => ({
        id: (place.id || "") as RestaurantId,
        name: place.displayName?.text || "Unknown",
        address: place.formattedAddress || "",
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        image: "",
        dishes: [] as Dish[],
        tmapRating: 0,
      }));

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/app/components/layout/BottomNav";
import { getCurrentPosition, isWithinRange } from "@/lib/geo";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Restaurant search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Step 2: Location verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    distance: number;
  } | null>(null);
  const [verificationError, setVerificationError] = useState("");

  // Step 3: Dish details
  const [dishName, setDishName] = useState("");
  const [dishDescription, setDishDescription] = useState("");

  // Get user's current location for biased search
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get user location on mount for better search results
    getCurrentPosition()
      .then((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      })
      .catch(() => {
        // Ignore - location is optional for search
      });
  }, []);

  // Search restaurants
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (userLocation) {
        params.set("lat", userLocation.lat.toString());
        params.set("lng", userLocation.lng.toString());
      }

      const res = await fetch(`/api/places/search?${params}`);
      const data = await res.json();

      if (data.places) {
        setSearchResults(data.places);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Verify user is at selected restaurant
  const handleVerifyLocation = async () => {
    if (!selectedRestaurant) return;

    setIsVerifying(true);
    setVerificationError("");

    try {
      const position = await getCurrentPosition();
      const result = isWithinRange(
        position.coords.latitude,
        position.coords.longitude,
        selectedRestaurant.latitude,
        selectedRestaurant.longitude,
        200 // 200 meters
      );

      setVerificationResult({
        verified: result.isValid,
        distance: result.distance,
      });

      if (result.isValid) {
        // Auto advance after short delay
        setTimeout(() => setStep(3), 1500);
      }
    } catch (err) {
      console.error("Location error:", err);
      setVerificationError(
        "Could not get your location. Please enable location services."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Create Dish Token</h1>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step
                    ? "bg-green-500 text-white"
                    : s === step
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s < step ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 4 && (
                <div className={`flex-1 h-1 rounded ${s < step ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Search</span>
          <span>Verify</span>
          <span>Details</span>
          <span>Create</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4">
        {/* Step 1: Search Restaurant */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Find the Restaurant</h2>
              <p className="text-sm text-gray-500 mb-4">
                Search for the restaurant where you want to create a dish token.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search restaurants..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl transition-colors"
                >
                  {isSearching ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{searchResults.length} results</p>
                {searchResults.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => {
                      setSelectedRestaurant(restaurant);
                      setStep(2);
                    }}
                    className={`w-full text-left bg-white border rounded-xl p-4 hover:border-indigo-300 transition-colors ${
                      selectedRestaurant?.id === restaurant.id
                        ? "border-indigo-500 ring-2 ring-indigo-200"
                        : "border-gray-200"
                    }`}
                  >
                    <p className="font-medium text-gray-900">{restaurant.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Restaurant */}
            {selectedRestaurant && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm text-indigo-600 font-medium">Selected:</p>
                <p className="font-semibold text-gray-900">{selectedRestaurant.name}</p>
                <button
                  onClick={() => setStep(2)}
                  className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Verify Location */}
        {step === 2 && selectedRestaurant && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify You're There</h2>
              <p className="text-gray-500 max-w-xs mx-auto">
                You must be at <span className="font-medium">{selectedRestaurant.name}</span> to create a dish token.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-medium text-gray-900">{selectedRestaurant.name}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedRestaurant.address}</p>
            </div>

            {verificationError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-700">{verificationError}</p>
              </div>
            )}

            {verificationResult && !verificationResult.verified && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="font-medium text-red-800">You're too far away</p>
                <p className="text-sm text-red-600 mt-1">
                  You're {verificationResult.distance}m away. You need to be within 200m.
                </p>
              </div>
            )}

            {verificationResult && verificationResult.verified && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-green-800">Location Verified!</p>
                <p className="text-sm text-green-600 mt-1">
                  You're {verificationResult.distance}m from the restaurant.
                </p>
              </div>
            )}

            {!verificationResult?.verified && (
              <button
                onClick={handleVerifyLocation}
                disabled={isVerifying}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Checking location...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    Verify My Location
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Step 3: Dish Details */}
        {step === 3 && selectedRestaurant && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dish Details</h2>

              <div className="bg-gray-100 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-500">Restaurant</p>
                <p className="font-medium text-gray-900">{selectedRestaurant.name}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="e.g., Truffle Mushroom Risotto"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={dishDescription}
                    onChange={(e) => setDishDescription(e.target.value)}
                    placeholder="Describe the dish..."
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dish Photo
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Tap to take a photo</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              disabled={!dishName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && selectedRestaurant && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Review Your Token</h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Restaurant</span>
                  <span className="font-medium text-gray-900">{selectedRestaurant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dish</span>
                  <span className="font-medium text-gray-900">{dishName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Starting Price</span>
                  <span className="font-medium text-green-600">$0.10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Creator Fee</span>
                  <span className="font-medium text-gray-900">2% of all trades</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">You'll be the creator!</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Earn 2% on all future trades of this token.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                // TODO: Call API to create dish
                router.push("/profile");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Create Token
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

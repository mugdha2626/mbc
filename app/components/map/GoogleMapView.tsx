"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useState } from "react";
import Link from "next/link";

interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  dishCount: number;
  trending?: boolean;
}

interface GoogleMapViewProps {
  restaurants?: Restaurant[];
  center?: { lat: number; lng: number };
  apiKey: string;
}

// Mock restaurants for demo
const mockRestaurants: Restaurant[] = [
  { id: "1", name: "Spicy House", lat: 40.7580, lng: -73.9855, image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100", dishCount: 8, trending: true },
  { id: "2", name: "Joe's Pizza", lat: 40.7614, lng: -73.9776, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100", dishCount: 5 },
  { id: "3", name: "The Garden Kitchen", lat: 40.7549, lng: -73.9840, image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100", dishCount: 12 },
  { id: "4", name: "Sushi Master", lat: 40.7505, lng: -73.9934, image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=100", dishCount: 6 },
];

export function GoogleMapView({
  restaurants = mockRestaurants,
  center = { lat: 40.7549, lng: -73.9840 },
  apiKey,
}: GoogleMapViewProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // If no API key, show placeholder map
  if (!apiKey) {
    return <PlaceholderMap restaurants={restaurants} />;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={14}
        mapId="tmap-main"
        className="w-full h-full"
        disableDefaultUI
        gestureHandling="greedy"
      >
        {restaurants.map((restaurant) => (
          <AdvancedMarker
            key={restaurant.id}
            position={{ lat: restaurant.lat, lng: restaurant.lng }}
            onClick={() => setSelectedRestaurant(restaurant)}
          >
            <div className={`relative cursor-pointer transform transition-transform hover:scale-110 ${selectedRestaurant?.id === restaurant.id ? "scale-110" : ""}`}>
              <div className={`w-12 h-12 rounded-full overflow-hidden border-3 shadow-lg ${restaurant.trending ? "border-orange-500 ring-4 ring-orange-200" : "border-white"}`}>
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {restaurant.trending && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/></svg>
                </div>
              )}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[var(--primary-dark)] rounded-full border-2 border-white" />
            </div>
          </AdvancedMarker>
        ))}
      </Map>

      {/* Selected restaurant popup */}
      {selectedRestaurant && (
        <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg">
          <Link href={`/restaurant/${selectedRestaurant.id}`}>
            <div className="flex gap-3">
              <img
                src={selectedRestaurant.image}
                alt={selectedRestaurant.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedRestaurant.name}</h3>
                <p className="text-sm text-gray-500">{selectedRestaurant.dishCount} dishes available</p>
                {selectedRestaurant.trending && (
                  <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                    Trending
                  </span>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </APIProvider>
  );
}

// Placeholder map when no API key is provided
function PlaceholderMap({ restaurants }: { restaurants: Restaurant[] }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary)] overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0">
        <svg width="100%" height="100%" className="opacity-30">
          <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#E6C5C1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#mapGrid)" />
        </svg>
      </div>

      {/* Roads */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <line x1="0" y1="30%" x2="100%" y2="45%" stroke="#C4908A" strokeWidth="8" />
        <line x1="20%" y1="0" x2="35%" y2="100%" stroke="#C4908A" strokeWidth="6" />
        <line x1="60%" y1="0" x2="70%" y2="100%" stroke="#C4908A" strokeWidth="5" />
        <line x1="0" y1="70%" x2="100%" y2="60%" stroke="#C4908A" strokeWidth="4" />
      </svg>

      {/* Restaurant markers */}
      {restaurants.map((restaurant, index) => {
        const positions = [
          { x: 25, y: 30 },
          { x: 60, y: 25 },
          { x: 45, y: 55 },
          { x: 70, y: 65 },
        ];
        const pos = positions[index % positions.length];

        return (
          <div
            key={restaurant.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={() => setSelectedRestaurant(restaurant)}
          >
            <div className={`relative ${selectedRestaurant?.id === restaurant.id ? "scale-110" : ""}`}>
              <div className={`w-14 h-14 rounded-full overflow-hidden border-3 shadow-lg ${restaurant.trending ? "border-orange-500 ring-4 ring-orange-200" : "border-white"}`}>
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {restaurant.trending && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm shadow-md">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/></svg>
                </div>
              )}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--primary-dark)] rounded-full border-2 border-white" />
            </div>
          </div>
        );
      })}

      {/* User location */}
      <div
        className="absolute z-10"
        style={{ left: "50%", top: "50%" }}
      >
        <div className="w-4 h-4 bg-[var(--primary-dark)] rounded-full animate-pulse ring-4 ring-[var(--primary)]" />
      </div>

      {/* Map attribution */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600">
        Add Google Maps API key to enable real maps
      </div>

      {/* Selected restaurant popup */}
      {selectedRestaurant && (
        <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg z-20">
          <Link href={`/restaurant/${selectedRestaurant.id}`}>
            <div className="flex gap-3">
              <img
                src={selectedRestaurant.image}
                alt={selectedRestaurant.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedRestaurant.name}</h3>
                <p className="text-sm text-gray-500">{selectedRestaurant.dishCount} dishes available</p>
                {selectedRestaurant.trending && (
                  <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                    Trending
                  </span>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

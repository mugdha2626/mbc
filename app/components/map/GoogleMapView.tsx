"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  address?: string;
  dishCount: number;
  tmapRating: number;
}

interface GoogleMapViewProps {
  restaurants?: Restaurant[];
  center?: { lat: number; lng: number };
  apiKey: string;
  selectedLocation?: { lat: number; lng: number; id: string } | null;
}

export function GoogleMapView({
  restaurants = [],
  center = { lat: 40.7549, lng: -73.9840 },
  apiKey,
  selectedLocation,
}: GoogleMapViewProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [mapCenter, setMapCenter] = useState(center);

  // Handle selected location from search
  useEffect(() => {
    if (selectedLocation) {
      setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      // Find and select the restaurant if it matches
      const restaurant = restaurants.find(r => r.id === selectedLocation.id);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    }
  }, [selectedLocation, restaurants]);

  // If no API key, show placeholder map
  if (!apiKey) {
    return <PlaceholderMap restaurants={restaurants} selectedLocation={selectedLocation} />;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        center={mapCenter}
        defaultZoom={14}
        zoom={selectedLocation ? 16 : 14}
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
              <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-white shadow-lg">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Rating Badge */}
              <div className="absolute -top-1 -right-1 min-w-[26px] h-6 bg-white rounded-full flex items-center justify-center px-1.5 shadow-md">
                <span className="text-gray-900 font-bold text-xs">{restaurant.tmapRating.toFixed(1)}</span>
              </div>
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
              <div className="relative">
                <img
                  src={selectedRestaurant.image}
                  alt={selectedRestaurant.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="absolute -top-1 -right-1 min-w-[26px] h-5 bg-white rounded-full flex items-center justify-center px-1.5 shadow-md">
                  <span className="text-gray-900 font-bold text-xs">{selectedRestaurant.tmapRating.toFixed(1)}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedRestaurant.name}</h3>
                <p className="text-sm text-gray-500">{selectedRestaurant.dishCount} dishes available</p>
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
function PlaceholderMap({
  restaurants,
  selectedLocation
}: {
  restaurants: Restaurant[];
  selectedLocation?: { lat: number; lng: number; id: string } | null;
}) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Handle selected location from search
  useEffect(() => {
    if (selectedLocation) {
      const restaurant = restaurants.find(r => r.id === selectedLocation.id);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    }
  }, [selectedLocation, restaurants]);

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
              <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-lg">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Rating Badge */}
              <div className="absolute -top-1 -right-1 min-w-[26px] h-6 bg-white rounded-full flex items-center justify-center px-1.5 shadow-md">
                <span className="text-gray-900 font-bold text-xs">{restaurant.tmapRating.toFixed(1)}</span>
              </div>
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
              <div className="relative">
                <img
                  src={selectedRestaurant.image}
                  alt={selectedRestaurant.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="absolute -top-1 -right-1 min-w-[26px] h-5 bg-white rounded-full flex items-center justify-center px-1.5 shadow-md">
                  <span className="text-gray-900 font-bold text-xs">{selectedRestaurant.tmapRating.toFixed(1)}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedRestaurant.name}</h3>
                <p className="text-sm text-gray-500">{selectedRestaurant.dishCount} dishes available</p>
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

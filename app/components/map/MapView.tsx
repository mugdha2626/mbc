"use client";

import { useState } from "react";
import Link from "next/link";

interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "trending" | "restaurant" | "trophy" | "chef" | "utensils";
  count?: number;
}

interface MapViewProps {
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
}

// Mock markers for demo
const mockMarkers: MapMarker[] = [
  { id: "1", name: "Spicy House", lat: 45, lng: 50, type: "trending" },
  { id: "2", name: "12 spots", lat: 25, lng: 20, type: "restaurant", count: 12 },
  { id: "3", name: "Top Chef", lat: 60, lng: 75, type: "chef" },
  { id: "4", name: "Award Winner", lat: 35, lng: 60, type: "trophy" },
  { id: "5", name: "Local Spot", lat: 70, lng: 35, type: "utensils" },
];

const MarkerIcon = ({ type, count }: { type: MapMarker["type"]; count?: number }) => {
  const baseClasses = "w-12 h-12 rounded-full flex items-center justify-center shadow-lg";

  switch (type) {
    case "trending":
      return (
        <div className={`${baseClasses} bg-gradient-to-br from-orange-500 to-orange-600 ring-4 ring-orange-500/30`}>
          <span className="text-xl">🔥</span>
        </div>
      );
    case "restaurant":
      return (
        <div className={`${baseClasses} bg-zinc-800 border-2 border-purple-500`}>
          <span className="text-white font-bold text-sm">{count}</span>
        </div>
      );
    case "trophy":
      return (
        <div className={`${baseClasses} bg-purple-600`}>
          <span className="text-xl">🏆</span>
        </div>
      );
    case "chef":
      return (
        <div className={`${baseClasses} bg-purple-600`}>
          <span className="text-xl">👨‍🍳</span>
        </div>
      );
    case "utensils":
      return (
        <div className={`${baseClasses} bg-zinc-800 border border-zinc-700`}>
          <span className="text-xl">🍴</span>
        </div>
      );
    default:
      return null;
  }
};

export function MapView({ markers = mockMarkers, onMarkerClick }: MapViewProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
    onMarkerClick?.(marker);
  };

  return (
    <div className="relative w-full h-full bg-[#0d0d15] overflow-hidden">
      {/* Map background with roads */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {/* Roads */}
        <line x1="0" y1="30" x2="100" y2="45" stroke="#2a2a3d" strokeWidth="3" />
        <line x1="20" y1="0" x2="35" y2="100" stroke="#2a2a3d" strokeWidth="3" />
        <line x1="60" y1="0" x2="70" y2="100" stroke="#2a2a3d" strokeWidth="2.5" />
        <line x1="0" y1="70" x2="100" y2="60" stroke="#2a2a3d" strokeWidth="2" />
        <line x1="45" y1="0" x2="55" y2="100" stroke="#2a2a3d" strokeWidth="2" />

        {/* Curved road */}
        <path d="M 30 40 Q 45 35 50 50 T 70 55" stroke="#2a2a3d" strokeWidth="3" fill="none" />
      </svg>

      {/* User location */}
      <div
        className="absolute z-10"
        style={{ left: "45%", top: "65%" }}
      >
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse ring-4 ring-blue-500/30" />
      </div>

      {/* Markers */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
          style={{ left: `${marker.lng}%`, top: `${marker.lat}%` }}
          onClick={() => handleMarkerClick(marker)}
        >
          <MarkerIcon type={marker.type} count={marker.count} />
          {marker.type === "trending" && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 px-3 py-1 rounded-lg whitespace-nowrap">
              <span className="text-sm font-medium text-white">{marker.name}</span>
            </div>
          )}
        </div>
      ))}

      {/* Floating action button */}
      <Link href="/dish/new">
        <div className="absolute bottom-4 right-4 w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 hover:bg-purple-500 transition-colors z-30">
          <div className="w-8 h-8 rounded-full bg-white/90" />
        </div>
      </Link>
    </div>
  );
}

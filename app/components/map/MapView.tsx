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
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 23c-3.866 0-7-2.239-7-5 0-1.359.533-2.588 1.394-3.5C5.536 13.06 5 11.612 5 10c0-4.418 3.134-8 7-8s7 3.582 7 8c0 1.612-.536 3.06-1.394 4.5.861.912 1.394 2.141 1.394 3.5 0 2.761-3.134 5-7 5zm0-18c-2.761 0-5 2.686-5 6 0 1.335.428 2.569 1.152 3.548L9.5 16.5l1.293-1.293a1 1 0 011.414 0L13.5 16.5l1.348-1.952C15.572 13.569 16 12.335 16 11c0-3.314-2.239-6-5-6h1z"/>
          </svg>
        </div>
      );
    case "restaurant":
      return (
        <div className={`${baseClasses} bg-white border-2 border-[var(--primary-dark)]`}>
          <span className="text-gray-900 font-bold text-sm">{count}</span>
        </div>
      );
    case "trophy":
      return (
        <div className={`${baseClasses} btn-primary`}>
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 15a4 4 0 004-4V4H8v7a4 4 0 004 4zm-6-4V4H4a2 2 0 00-2 2v3a3 3 0 003 3h1v-1zm12 0h1a3 3 0 003-3V6a2 2 0 00-2-2h-2v7zM9 18h6v3H9v-3z"/>
          </svg>
        </div>
      );
    case "chef":
      return (
        <div className={`${baseClasses} btn-primary`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513c0 1.135.845 2.098 1.976 2.192 1.327.11 2.669.166 4.024.166 1.355 0 2.697-.056 4.024-.166 1.131-.094 1.976-1.057 1.976-2.192v-2.513c0-1.135-.845-2.098-1.976-2.192A48.424 48.424 0 0012 8.25zm0 0V6m0 2.25a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-4.5 0v1.5A2.25 2.25 0 0012 8.25zm0 9.75v1.5m-3-1.5h6"/>
          </svg>
        </div>
      );
    case "utensils":
      return (
        <div className={`${baseClasses} bg-white border border-gray-200`}>
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513c0 1.135.845 2.098 1.976 2.192 1.327.11 2.669.166 4.024.166 1.355 0 2.697-.056 4.024-.166 1.131-.094 1.976-1.057 1.976-2.192v-2.513c0-1.135-.845-2.098-1.976-2.192A48.424 48.424 0 0012 8.25z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 10.5V21m5-10.5V21m5-10.5V21M6 3v4m6-4v4m6-4v4"/>
          </svg>
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
        <div className="absolute bottom-4 right-4 w-14 h-14 btn-primary rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary-dark)]/30 z-30">
          <div className="w-8 h-8 rounded-full bg-white/90" />
        </div>
      </Link>
    </div>
  );
}

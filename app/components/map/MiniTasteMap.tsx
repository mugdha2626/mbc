"use client";

interface TasteSpot {
  id: string;
  image: string;
  x: number;
  y: number;
}

interface MiniTasteMapProps {
  spots: TasteSpot[];
  location?: string;
}

export function MiniTasteMap({ spots, location = "New York" }: MiniTasteMapProps) {
  return (
    <div className="relative w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg width="100%" height="100%">
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#c7d2fe" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Spots with images */}
      {spots.map((spot) => (
        <div
          key={spot.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
        >
          <div className="relative">
            <img
              src={spot.image}
              alt=""
              className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rounded-full" />
          </div>
        </div>
      ))}

      {/* Location label */}
      <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700">
        {location}
      </div>
    </div>
  );
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; 

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if user is within range of a location
 */
export function isWithinRange(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  maxDistanceMeters: number = 200
): { isValid: boolean; distance: number } {
  const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
  return {
    isValid: distance <= maxDistanceMeters,
    distance: Math.round(distance),
  };
}

/**
 * Get user's current position using browser Geolocation API
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    console.log("[geo] getCurrentPosition called");
    console.log("[geo] navigator.geolocation:", !!navigator.geolocation);
    
    if (!navigator.geolocation) {
      console.error("[geo] Geolocation not supported");
      reject(new Error("Geolocation is not supported"));
      return;
    }

    console.log("[geo] Calling navigator.geolocation.getCurrentPosition...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[geo] Success:", position.coords.latitude, position.coords.longitude);
        resolve(position);
      },
      (error) => {
        console.error("[geo] Error:", error.code, error.message);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

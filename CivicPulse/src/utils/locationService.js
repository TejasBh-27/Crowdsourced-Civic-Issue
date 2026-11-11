import exifr from 'exifr';

/**
 * CivicPulse Real-World Location Service
 * 1. Photo EXIF GPS Extraction (extracts real location embedded inside photos by phone camera)
 * 2. Live Device GPS
 * 3. Reverse & Forward Geocoding via OpenStreetMap Nominatim
 */

/**
 * Extract exact GPS coordinates embedded inside the photo by the camera (EXIF Metadata)
 */
export async function extractGpsFromPhoto(file) {
  if (!file) return { hasPhotoGps: false };

  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      const address = await reverseGeocodeAddress(gps.latitude, gps.longitude);
      return {
        hasPhotoGps: true,
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: 5, // Camera EXIF GPS is pinpoint
        address,
        source: 'photo_exif',
        capturedAt: new Date().toLocaleTimeString()
      };
    }
  } catch (err) {
    console.warn('EXIF GPS extraction info:', err.message);
  }

  return { hasPhotoGps: false };
}

/**
 * Live device coordinates from browser/mobile geolocation
 * Attempts high-accuracy hardware GPS first, with graceful fallback
 */
export async function getDeviceCoordinates() {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported by your browser/device.');
  }

  // Attempt 1: High accuracy GPS (hardware GPS sensor on mobile)
  const queryPosition = (options) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10,
            timestamp: pos.timestamp
          });
        },
        (err) => reject(err),
        options
      );
    });
  };

  try {
    return await queryPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  } catch (firstErr) {
    // If high accuracy timed out, retry with standard accuracy (Wi-Fi / Cell tower)
    if (firstErr.code === 3) {
      try {
        return await queryPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 5000
        });
      } catch (secondErr) {
        throw new Error('GPS request timed out. Please ensure Location/GPS is turned ON on your phone.');
      }
    }
    if (firstErr.code === 1) {
      throw new Error('Location permission denied. Please allow location access in your mobile browser settings.');
    }
    throw new Error('Unable to retrieve device GPS signal.');
  }
}

/**
 * Reverse geocode latitude and longitude to real-world street address
 */
export async function reverseGeocodeAddress(latitude, longitude) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CivicPulseApp/1.0 (Municipal AI Governance)'
        },
        signal: controller.signal
      }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};

      const road = a.road || a.pedestrian || a.street || a.highway || a.footway;
      const locality = a.suburb || a.neighbourhood || a.residential || a.village || a.town_district;
      const city = a.city || a.town || a.county || a.municipality || a.state_district;
      const state = a.state;
      const postcode = a.postcode;

      const parts = [road, locality, city, state, postcode].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 4).join(', ').trim();
      }
    }
  } catch (err) {
    console.warn('Reverse geocoding network notice:', err.message);
  }

  return `Live Coordinates: ${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E`;
}

/**
 * Search real location address by text query (Forward geocoding)
 */
export async function searchLocationByAddress(query) {
  const q = (query || '').trim();
  if (!q || q.length < 3) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return data.map(item => ({
        address: item.display_name.split(',').slice(0, 4).join(', ').trim(),
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      }));
    }
  } catch (err) {
    console.warn('Forward search failed:', err.message);
  }
  return [];
}

/**
 * Detect real-world location from device GPS
 */
export async function detectRealWorldLocation() {
  const coords = await getDeviceCoordinates();
  const address = await reverseGeocodeAddress(coords.latitude, coords.longitude);
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    address,
    isRealGps: true,
    source: 'device_gps',
    capturedAt: new Date().toLocaleTimeString()
  };
}

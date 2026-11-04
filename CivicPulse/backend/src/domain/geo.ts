// Ray-casting point-in-polygon on GeoJSON coordinates ([lng, lat]).
// Ward counts per city are small (tens to low hundreds), so a linear scan is fine.

type Ring = number[][];

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** polygon = GeoJSON Polygon geometry: { type:'Polygon', coordinates:[outer, ...holes] } */
export function pointInPolygon(lng: number, lat: number, polygon: { coordinates: number[][][] }): boolean {
  const [outer, ...holes] = polygon.coordinates;
  if (!outer || !inRing(lng, lat, outer)) return false;
  return !holes.some((h) => inRing(lng, lat, h));
}

export function validCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

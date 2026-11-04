import { pointInPolygon } from '../domain/geo.js';
import type { Repo, Ward } from '../domain/types.js';

export interface WardRouter {
  findWard(lat: number, lng: number): Promise<Ward | null>;
  invalidate(): void;
}

/** Resolves a GPS point to the ward whose boundary contains it. Wards are cached briefly. */
export function createWardRouter(repo: Repo, { ttlMs = 60_000, now = Date.now } = {}): WardRouter {
  let cache: Ward[] | null = null;
  let at = 0;

  async function wards(): Promise<Ward[]> {
    if (!cache || now() - at > ttlMs) {
      cache = await repo.wards.list();
      at = now();
    }
    return cache;
  }

  return {
    async findWard(lat, lng) {
      const list = await wards();
      return list.find((w) => w.boundary && pointInPolygon(lng, lat, w.boundary)) || null;
    },
    invalidate() { cache = null; },
  };
}

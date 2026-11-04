import { createMemoryRepo } from '../src/repositories/memory.js';
import { createMemoryStorage } from '../src/services/storage.js';
import { createMemoryNotifier } from '../src/services/notifier.js';
import { createWardRouter } from '../src/services/wardRouter.js';
import { createComplaintService } from '../src/services/complaintService.js';
import { createApp } from '../src/http/app.js';
import { DEPARTMENTS } from '../src/domain/constants.js';
import type { AiClient, PolygonGeometry } from '../src/domain/types.js';
import type { Config } from '../src/config.js';

const rect = (w: number, s: number, e: number, n: number): PolygonGeometry => ({ type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] });
export const IN_W01 = { latitude: 21.35, longitude: 74.88 };
export const OUTSIDE = { latitude: 28.6, longitude: 77.2 };

export const config: Pick<Config, 'maxUploadBytes' | 'ai'> = {
  maxUploadBytes: 1024 * 1024,
  ai: { mode: 'mock', url: '', timeoutMs: 1000, maxAttempts: 3, retryDelayMs: 10 },
};
export const JPEG = Buffer.alloc(8000, 1);

export const citizen: Record<string, string> = { 'x-user-id': 'CIT-1', 'x-user-role': 'citizen', 'x-user-name': 'Asha', 'x-user-phone': '+919800000001' };
export const citizen2: Record<string, string> = { 'x-user-id': 'CIT-2', 'x-user-role': 'citizen', 'x-user-name': 'Ravi', 'x-user-phone': '+919800000002' };
export const officer = (id = 'OFF-W01-roads'): Record<string, string> => ({ 'x-user-id': id, 'x-user-role': 'officer', 'x-user-name': id });

export async function build({ aiInspect }: { aiInspect?: AiClient['inspect'] } = {}) {
  const repo = createMemoryRepo();
  await repo.wards.upsert({ code: 'W01', name: 'Ward 1', boundary: rect(74.87, 21.34, 74.89, 21.36) });
  for (const dept of Object.keys(DEPARTMENTS)) {
    await repo.officers.upsert({ id: `OFF-W01-${dept}`, name: `Off ${dept}`, ward: 'W01', department: dept });
    await repo.workers.upsert({ id: `WRK-W01-${dept}`, name: `Wrk ${dept}`, phone: '+918000000001', ward: 'W01', department: dept });
  }
  await repo.workers.upsert({ id: 'WRK-W02-roads', name: 'Other ward', ward: 'W02', department: 'roads' });
  await repo.workers.upsert({ id: 'WRK-W01-inactive', name: 'Gone', ward: 'W01', department: 'roads', active: false });

  const notifier = createMemoryNotifier();
  const jobs: { fn: () => Promise<void>; delay?: number }[] = [];
  const schedule = (fn: () => Promise<void>, delay?: number) => jobs.push({ fn, delay });
  const ai: AiClient = { inspect: aiInspect || (async () => ({ isValid: true, confidence: 0.95, urgency: { score: 75, level: 'high' } })) };
  const silent = { error() {} };

  const service = createComplaintService({
    repo, ai, notifier, storage: createMemoryStorage(), wardRouter: createWardRouter(repo), config, schedule, log: silent,
  });
  const app = createApp({ service, config });

  // Run queued background jobs (including jobs they enqueue) to completion.
  const drain = async () => { for (let j = jobs.shift(); j; j = jobs.shift()) await j.fn(); };
  return { repo, notifier, service, app, drain, jobs };
}

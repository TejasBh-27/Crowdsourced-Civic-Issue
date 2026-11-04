// Seeds demo wards, officers and workers around Shirpur, Maharashtra (change coordinates for your city).
// Usage: npm run seed   (needs MONGO_URI)
import { config } from './config.js';
import { connectMongo, createMongoRepo, disconnectMongo } from './repositories/mongo.js';
import { DEPARTMENTS } from './domain/constants.js';
import type { PolygonGeometry, Ward } from './domain/types.js';

const rect = (w: number, s: number, e: number, n: number): PolygonGeometry => ({ type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] });

const wards: Ward[] = [
  { code: 'W01', name: 'Ward 1 - Central', city: 'Shirpur', boundary: rect(74.870, 21.340, 74.890, 21.360) },
  { code: 'W02', name: 'Ward 2 - East', city: 'Shirpur', boundary: rect(74.890, 21.340, 74.910, 21.360) },
];

await connectMongo(config.mongoUri);
const repo = createMongoRepo();

for (const w of wards) await repo.wards.upsert(w);

let n = 1;
for (const w of wards) {
  for (const dept of Object.keys(DEPARTMENTS)) {
    const id = `OFF-${w.code}-${dept}`;
    await repo.officers.upsert({ id, name: `Officer ${n}`, phone: `+9190000000${String(n).padStart(2, '0')}`, ward: w.code, department: dept });
    for (let k = 1; k <= 2; k++) {
      await repo.workers.upsert({ id: `WRK-${w.code}-${dept}-${k}`, name: `Worker ${n}.${k}`, phone: `+9180000000${String(n * 2 + k).padStart(2, '0')}`, ward: w.code, department: dept });
    }
    n++;
  }
}
console.log(`Seeded ${wards.length} wards, ${n - 1} officers, ${(n - 1) * 2} workers`);
await disconnectMongo();

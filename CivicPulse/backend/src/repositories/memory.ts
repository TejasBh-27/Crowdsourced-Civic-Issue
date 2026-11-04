// In-memory repository: used by tests and for running the API without MongoDB.
// Implements the same interface (Repo) as repositories/mongo.ts.

import type { Repo, Complaint, Ward, Officer, Worker } from '../domain/types.js';

function clone<T>(o: T): T {
  return o == null ? o : structuredClone(o);
}

export function createMemoryRepo(): Repo {
  const complaints = new Map<string, Complaint>();
  const wards: Ward[] = [];
  const officers = new Map<string, Officer>();
  const workers = new Map<string, Worker>();
  const counters = new Map<number, number>();

  return {
    kind: 'memory',

    async nextComplaintId(year) {
      const n = (counters.get(year) || 0) + 1;
      counters.set(year, n);
      return `CMP-${year}-${String(n).padStart(6, '0')}`;
    },

    complaints: {
      async create(doc) {
        complaints.set(doc.id, clone(doc));
        return clone(doc);
      },
      async getById(id) {
        return clone(complaints.get(id));
      },
      // Optimistic transition: applies only if current status is in expectStatus.
      async update(id, { expectStatus, set = {}, timeline }) {
        const cur = complaints.get(id);
        if (!cur) return null;
        if (expectStatus && !expectStatus.includes(cur.status)) return null;
        const next: Complaint = { ...cur, ...clone(set), updatedAt: new Date().toISOString() };
        next.timeline = [...cur.timeline, ...(timeline ? [clone(timeline)] : [])];
        complaints.set(id, next);
        return clone(next);
      },
      async listByCitizen(citizenId) {
        return [...complaints.values()]
          .filter((c) => c.reportedBy.id === citizenId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(clone);
      },
      async listByOfficer(officerId, { status } = {}) {
        return [...complaints.values()]
          .filter((c) => c.assignedOfficer?.id === officerId && (!status || c.status === status))
          .map(clone);
      },
    },

    wards: {
      async list() { return wards.map(clone); },
      async upsert(w) {
        const i = wards.findIndex((x) => x.code === w.code);
        if (i >= 0) wards[i] = clone(w); else wards.push(clone(w));
      },
    },
    officers: {
      async getById(id) { return clone(officers.get(id)); },
      async findByWardDepartment(ward, department) {
        return clone([...officers.values()].find((o) => o.ward === ward && o.department === department && o.active !== false));
      },
      async upsert(o) { officers.set(o.id, clone(o)); },
    },
    workers: {
      async getById(id) { return clone(workers.get(id)); },
      async listByScope(ward, department) {
        return [...workers.values()].filter((w) => w.ward === ward && w.department === department && w.active !== false).map(clone);
      },
      async upsert(w) { workers.set(w.id, clone(w)); },
    },
  };
}

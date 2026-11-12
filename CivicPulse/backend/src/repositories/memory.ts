// Disk-persisted in-memory repository: survives server restarts and development reloads.
// Implements the same interface (Repo) as repositories/mongo.ts.

import fs from 'node:fs';
import path from 'node:path';
import type { Repo, Complaint, Ward, Officer, Worker } from '../domain/types.js';

function clone<T>(o: T): T {
  return o == null ? o : structuredClone(o);
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');

const INITIAL_SEED_COMPLAINTS: Complaint[] = [
  {
    id: 'CMP-2026-101',
    title: 'Pothole Hazard on MG Road',
    category: 'pothole',
    description: 'Deep road crater causing heavy bike skids near metro pillar 42. Urgent patching required.',
    status: 'verified',
    urgency: 'high',
    urgencyScore: 82,
    location: { type: 'Point', coordinates: [77.2090, 28.6139], address: 'Near Pillar 42, MG Road, Ward 14' },
    photo: { key: 'seed-pothole.jpg', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', mime: 'image/jpeg' },
    reportedBy: { id: 'CIT-4668', name: 'Tejas Bhamre', phone: '9545286810', email: 'tejas.bhamre@civicpulse.gov' },
    ward: 'W-14',
    department: 'roads',
    assignedOfficer: { id: 'OFF-9902', name: 'Inspector Rajesh Kumar' },
    assignedWorker: null,
    aiAttempts: 1,
    timeline: [
      { status: 'submitted', note: 'Report received via CivicPulse mobile portal', by: 'CIT-4668', at: '2026-10-10T09:00:00Z' },
      { status: 'verified', note: 'Verified by AI (urgency high); routed to Inspector Rajesh Kumar', by: 'system', at: '2026-10-10T09:01:00Z' }
    ],
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-10T09:01:00Z'
  },
  {
    id: 'CMP-2026-102',
    title: 'Garbage Dump Overflowing Near Market',
    category: 'garbage',
    description: 'Community dump bin overflowing on pedestrian walkway with foul odor and stray animals.',
    status: 'verified',
    urgency: 'medium',
    urgencyScore: 65,
    location: { type: 'Point', coordinates: [77.2105, 28.6152], address: 'Block C Park Outer Lane, Ward 14' },
    photo: { key: 'seed-garbage.jpg', url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600', mime: 'image/jpeg' },
    reportedBy: { id: 'CIT-4481', name: 'Ananya Sharma', phone: '9876543210', email: 'ananya@civicpulse.gov' },
    ward: 'W-14',
    department: 'sanitation',
    assignedOfficer: { id: 'OFF-4011', name: 'Inspector Sunita Rao' },
    assignedWorker: null,
    aiAttempts: 1,
    timeline: [
      { status: 'submitted', note: 'Report received', by: 'CIT-4481', at: '2026-10-09T08:15:00Z' },
      { status: 'verified', note: 'Verified by AI; routed to Sanitation Department', by: 'system', at: '2026-10-09T08:16:00Z' }
    ],
    createdAt: '2026-10-09T08:15:00Z',
    updatedAt: '2026-10-09T08:16:00Z'
  },
  {
    id: 'CMP-2026-103',
    title: 'Street Light Pole Damaged & Flickering Dark',
    category: 'street_light',
    description: 'Streetlight #SL-414 is non-functional creating dark alley near girls school.',
    status: 'resolved',
    urgency: 'medium',
    urgencyScore: 70,
    location: { type: 'Point', coordinates: [77.2070, 28.6120], address: 'Lane 4, Near Model School, Ward 14' },
    photo: { key: 'seed-light.jpg', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600', mime: 'image/jpeg' },
    reportedBy: { id: 'CIT-8821', name: 'Rohit Verma', phone: '9811122334' },
    ward: 'W-14',
    department: 'electrical',
    assignedOfficer: { id: 'OFF-9902', name: 'Inspector Rajesh Kumar' },
    assignedWorker: null,
    aiAttempts: 1,
    resolution: { note: 'Replaced sodium vapor bulb with high-efficiency 100W LED unit and restored wiring.', photoUrl: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=600', resolvedAt: '2026-10-06T16:45:00Z' },
    timeline: [
      { status: 'submitted', note: 'Report received', by: 'CIT-8821', at: '2026-10-04T10:00:00Z' },
      { status: 'verified', note: 'Verified by AI; routed to Electrical Dept', by: 'system', at: '2026-10-04T10:01:00Z' },
      { status: 'in_progress', note: 'Crew assigned on-site', by: 'OFF-9902', at: '2026-10-05T09:00:00Z' },
      { status: 'resolved', note: 'LED light installed & MTTR logged', by: 'OFF-9902', at: '2026-10-06T16:45:00Z' }
    ],
    createdAt: '2026-10-04T10:00:00Z',
    updatedAt: '2026-10-06T16:45:00Z'
  }
];

function loadDiskComplaints(): Map<string, Complaint> {
  const map = new Map<string, Complaint>();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(COMPLAINTS_FILE)) {
      const content = fs.readFileSync(COMPLAINTS_FILE, 'utf-8');
      const list = JSON.parse(content) as Complaint[];
      if (Array.isArray(list)) {
        for (const c of list) {
          if (c && c.id) map.set(c.id, c);
        }
      }
    } else {
      for (const c of INITIAL_SEED_COMPLAINTS) {
        map.set(c.id, c);
      }
      fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(INITIAL_SEED_COMPLAINTS, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Notice: Failed reading disk complaints, starting with initial seeds:', err);
    for (const c of INITIAL_SEED_COMPLAINTS) {
      map.set(c.id, c);
    }
  }
  return map;
}

function saveDiskComplaints(map: Map<string, Complaint>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Failed writing complaints to disk:', err);
  }
}

export function createMemoryRepo(): Repo {
  const complaints = loadDiskComplaints();
  const wards: Ward[] = [];
  const officers = new Map<string, Officer>();
  const workers = new Map<string, Worker>();
  const counters = new Map<number, number>();

  // Initialize counter from existing complaint IDs
  for (const id of complaints.keys()) {
    const match = id.match(/CMP-(\d{4})-(\d+)/);
    if (match) {
      const year = parseInt(match[1], 10);
      const num = parseInt(match[2], 10);
      const current = counters.get(year) || 0;
      if (num > current) counters.set(year, num);
    }
  }

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
        saveDiskComplaints(complaints);
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
        saveDiskComplaints(complaints);
        return clone(next);
      },
      async listByCitizen(citizenId, phone, email) {
        const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
        const cleanEmail = email ? email.toLowerCase().trim() : '';

        return [...complaints.values()]
          .filter((c) => {
            if (c.reportedBy?.id && c.reportedBy.id === citizenId) return true;
            if (cleanPhone && c.reportedBy?.phone) {
              const cClean = c.reportedBy.phone.replace(/\D/g, '').slice(-10);
              if (cClean && cClean === cleanPhone) return true;
            }
            if (cleanEmail && c.reportedBy?.email) {
              if (c.reportedBy.email.toLowerCase().trim() === cleanEmail) return true;
            }
            return false;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(clone);
      },
      async listByOfficer(officerId, { status } = {}) {
        return [...complaints.values()]
          .filter((c) => (!status || c.status === status))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(clone);
      },
      async delete(id) {
        const deleted = complaints.delete(id);
        if (deleted) saveDiskComplaints(complaints);
        return deleted;
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

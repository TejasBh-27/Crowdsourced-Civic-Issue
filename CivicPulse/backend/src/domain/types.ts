import type { STATUS, ROLES } from './constants.js';

export type Status = (typeof STATUS)[keyof typeof STATUS];
export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Urgency = 'low' | 'medium' | 'high' | 'critical';
export type CategoryId = 'pothole' | 'garbage' | 'water' | 'street_light' | 'drainage' | 'illegal_parking';
export type DepartmentId = 'roads' | 'sanitation' | 'water' | 'electrical' | 'drainage' | 'traffic';

export interface User { id: string; role: Role; name: string; phone?: string }

export interface PolygonGeometry { type: 'Polygon'; coordinates: number[][][] }
export interface Ward { id?: string; code: string; name: string; city?: string; boundary: PolygonGeometry }
export interface Officer { id: string; name: string; phone?: string; ward: string; department: string; active?: boolean }
export interface Worker { id: string; name: string; phone?: string; ward: string; department: string; active?: boolean }

export interface StoredPhoto { key: string; url: string; mime: string }
export interface TimelineEntry { status: Status; note: string; by: string; at: string }

export interface AiResult {
  isValid: boolean;
  confidence: number;
  rejectionReason?: string;
  urgency: { score: number; level: Urgency };
  cv?: Record<string, unknown>;
  nlp?: Record<string, unknown>;
}

export interface Complaint {
  id: string;
  title: string;
  category: CategoryId;
  description: string;
  status: Status;
  urgency: Urgency | null;
  urgencyScore?: number;
  location: { type: 'Point'; coordinates: [number, number]; address?: string; accuracyM?: number };
  photo: StoredPhoto;
  reportedBy: { id: string; name: string; phone?: string };
  ward: string | null;
  department: string;
  assignedOfficer: { id: string; name: string } | null;
  assignedWorker: { id: string; name: string; phone?: string; assignedAt: string } | null;
  ai?: AiResult;
  aiAttempts: number;
  rejectionReason?: string | null;
  needsManualRouting?: boolean;
  resolution?: { note: string; photoUrl: string | null; resolvedAt: string };
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSpec {
  expectStatus?: Status[];
  set?: Partial<Complaint>;
  timeline?: TimelineEntry;
}

export interface Repo {
  kind: 'memory' | 'mongo';
  nextComplaintId(year: number): Promise<string>;
  complaints: {
    create(doc: Complaint): Promise<Complaint>;
    getById(id: string): Promise<Complaint | null | undefined>;
    update(id: string, spec: UpdateSpec): Promise<Complaint | null | undefined>;
    listByCitizen(citizenId: string): Promise<Complaint[]>;
    listByOfficer(officerId: string, opts?: { status?: string }): Promise<Complaint[]>;
  };
  wards: { list(): Promise<Ward[]>; upsert(w: Ward): Promise<void> };
  officers: {
    getById(id: string): Promise<Officer | null | undefined>;
    findByWardDepartment(ward: string, department: string): Promise<Officer | null | undefined>;
    upsert(o: Officer): Promise<void>;
  };
  workers: {
    getById(id: string): Promise<Worker | null | undefined>;
    listByScope(ward: string, department: string): Promise<Worker[]>;
    upsert(w: Worker): Promise<void>;
  };
}

export interface Storage {
  save(buffer: Buffer, mime: string): Promise<StoredPhoto>;
  read(key: string): Promise<Buffer>;
}
export interface Notifier { send(phone: string, text: string): Promise<void> }
export interface AiClient {
  inspect(input: { photo: Buffer; mime: string; category: string; description: string; latitude: number; longitude: number }): Promise<AiResult>;
}
export type Schedule = (fn: () => Promise<void>, delayMs?: number) => unknown;
export interface UploadedFile { buffer: Buffer; mimetype: string }

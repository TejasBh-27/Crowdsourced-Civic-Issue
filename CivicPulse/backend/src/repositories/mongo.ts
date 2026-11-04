import mongoose from 'mongoose';
import type { Repo, Complaint, Ward, Officer, Worker } from '../domain/types.js';

const { Schema } = mongoose;

// String _id everywhere so ids are human-readable (CMP-2026-000123) and map 1:1 to the API `id`.
const point = { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } };

const ComplaintSchema = new Schema(
  {
    _id: String,
    title: String,
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    status: { type: String, required: true, index: true },
    urgency: String,
    urgencyScore: Number,
    location: { ...point, address: String, accuracyM: Number },
    photo: { key: String, url: String, mime: String },
    reportedBy: { id: { type: String, index: true }, name: String, phone: String },
    ward: { type: String, index: true },
    department: String,
    assignedOfficer: { id: { type: String, index: true }, name: String },
    assignedWorker: { id: String, name: String, phone: String, assignedAt: String },
    ai: Schema.Types.Mixed,
    aiAttempts: { type: Number, default: 0 },
    rejectionReason: String,
    needsManualRouting: Boolean,
    resolution: { note: String, photoUrl: String, resolvedAt: String },
    timeline: [{ _id: false, status: String, note: String, at: String, by: String }],
    createdAt: String,
    updatedAt: String,
  },
  { versionKey: false }
);
ComplaintSchema.index({ location: '2dsphere' });
ComplaintSchema.index({ 'assignedOfficer.id': 1, status: 1 });

const WardSchema = new Schema(
  { _id: String, code: { type: String, unique: true }, name: String, city: String, boundary: Schema.Types.Mixed },
  { versionKey: false }
);
const OfficerSchema = new Schema(
  { _id: String, name: String, phone: String, ward: { type: String, index: true }, department: String, active: { type: Boolean, default: true } },
  { versionKey: false }
);
const WorkerSchema = new Schema(
  { _id: String, name: String, phone: String, ward: String, department: String, active: { type: Boolean, default: true } },
  { versionKey: false }
);
const CounterSchema = new Schema({ _id: String, seq: Number }, { versionKey: false });

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
const Ward = mongoose.models.Ward || mongoose.model('Ward', WardSchema);
const Officer = mongoose.models.Officer || mongoose.model('Officer', OfficerSchema);
const Worker = mongoose.models.Worker || mongoose.model('Worker', WorkerSchema);
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

type Raw = { _id: string } & Record<string, unknown>;

// Mongo documents use _id (string); the API/domain uses `id`.
function out<T>(d: Raw | null | undefined): T | null {
  if (!d) return null;
  const { _id, ...rest } = d;
  return { id: _id, ...rest } as T;
}
// Query results are cast through Raw: the Mongoose schemas above are the runtime source of truth for shape.
const one = async <T>(q: { lean(): PromiseLike<unknown> }): Promise<T | null> => out<T>((await q.lean()) as Raw | null);
const many = async <T>(q: { lean(): PromiseLike<unknown> }): Promise<T[]> => ((await q.lean()) as Raw[]).map((r) => out<T>(r) as T);

export async function connectMongo(uri: string): Promise<void> {
  await mongoose.connect(uri);
  await Promise.all([Complaint.init(), Ward.init(), Officer.init(), Worker.init()]);
}
export const disconnectMongo = (): Promise<void> => mongoose.disconnect();

export function createMongoRepo(): Repo {
  return {
    kind: 'mongo',

    async nextComplaintId(year) {
      const c = (await Counter.findOneAndUpdate({ _id: `complaint-${year}` }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean()) as unknown as { seq: number };
      return `CMP-${year}-${String(c.seq).padStart(6, '0')}`;
    },

    complaints: {
      async create(doc) {
        const { id, ...rest } = doc;
        await Complaint.create({ _id: id, ...rest });
        return doc;
      },
      getById: (id) => one<Complaint>(Complaint.findById(id)),
      async update(id, { expectStatus, set = {}, timeline }) {
        const filter: Record<string, unknown> = { _id: id };
        if (expectStatus) filter.status = { $in: expectStatus };
        const update: Record<string, unknown> = { $set: { ...set, updatedAt: new Date().toISOString() } };
        if (timeline) update.$push = { timeline };
        return one<Complaint>(Complaint.findOneAndUpdate(filter, update, { new: true }));
      },
      listByCitizen: (citizenId) => many<Complaint>(Complaint.find({ 'reportedBy.id': citizenId }).sort({ createdAt: -1 })),
      listByOfficer: (officerId, { status } = {}) =>
        many<Complaint>(Complaint.find({ 'assignedOfficer.id': officerId, ...(status ? { status } : {}) })),
    },

    wards: {
      list: () => many<Ward>(Ward.find()),
      async upsert(w) {
        const { id, ...rest } = w;
        await Ward.updateOne({ _id: id || w.code }, { $set: rest }, { upsert: true });
      },
    },
    officers: {
      getById: (id) => one<Officer>(Officer.findById(id)),
      findByWardDepartment: (ward, department) => one<Officer>(Officer.findOne({ ward, department, active: { $ne: false } })),
      async upsert(o) {
        const { id, ...rest } = o;
        await Officer.updateOne({ _id: id }, { $set: rest }, { upsert: true });
      },
    },
    workers: {
      getById: (id) => one<Worker>(Worker.findById(id)),
      listByScope: (ward, department) => many<Worker>(Worker.find({ ward, department, active: { $ne: false } })),
      async upsert(w) {
        const { id, ...rest } = w;
        await Worker.updateOne({ _id: id }, { $set: rest }, { upsert: true });
      },
    },
  };
}

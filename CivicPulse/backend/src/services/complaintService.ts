import { STATUS, TRANSITIONS, ROLES, CATEGORIES, DEPARTMENTS, URGENCY_RANK, departmentFor } from '../domain/constants.js';
import { badRequest, forbidden, notFound, conflict } from '../domain/errors.js';
import { validCoords } from '../domain/geo.js';
import type { AiClient, AiResult, CategoryId, Complaint, Notifier, Repo, Schedule, Status, Storage, TimelineEntry, UploadedFile, Urgency, User } from '../domain/types.js';
import type { WardRouter } from './wardRouter.js';
import type { Config } from '../config.js';

export interface SubmitInput {
  category: string;
  description: string;
  title?: string;
  latitude: number;
  longitude: number;
  address?: string;
  accuracyM?: number;
}

export interface ComplaintServiceDeps {
  repo: Repo;
  ai: AiClient;
  notifier: Notifier;
  storage: Storage;
  wardRouter: WardRouter;
  config: Pick<Config, 'ai'>;
  schedule: Schedule;
  now?: () => Date;
  log?: { error?: (msg: string) => void };
}

const iso = (d: Date): string => d.toISOString();
const rank = (u: Urgency | null): number => (u ? URGENCY_RANK[u] : 0);
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createComplaintService({ repo, ai, notifier, storage, wardRouter, config, schedule, now = () => new Date(), log = console }: ComplaintServiceDeps) {
  const maxAttempts = config.ai.maxAttempts;

  const entry = (status: Status, note: string, by = 'system'): TimelineEntry => ({ status, note, by, at: iso(now()) });

  async function sms(complaint: Complaint, text: string): Promise<void> {
    try {
      if (!complaint.reportedBy.phone) throw new Error('citizen has no phone number');
      await notifier.send(complaint.reportedBy.phone, text);
    } catch (err) {
      log.error?.(`SMS failed for ${complaint.id}: ${errMsg(err)}`);
      await repo.complaints.update(complaint.id, { timeline: entry(complaint.status, `SMS to citizen failed: ${errMsg(err)}`) });
    }
  }

  async function transition(id: string, from: Status[], to: Status, set: Partial<Complaint>, note: string, by?: string): Promise<Complaint> {
    if (!from.every((s) => TRANSITIONS[s].includes(to))) throw new Error(`Illegal transition ${from} -> ${to}`);
    const updated = await repo.complaints.update(id, { expectStatus: from, set: { ...set, status: to }, timeline: entry(to, note, by) });
    if (!updated) throw conflict('Complaint was changed by someone else or is not in a valid state for this action');
    return updated;
  }

  // ---- AI pipeline -------------------------------------------------------------------------

  async function process(id: string, attempt = 1): Promise<void> {
    const c = await repo.complaints.getById(id);
    if (!c || c.status !== STATUS.SUBMITTED) return;

    let result: AiResult;
    try {
      const photo = await storage.read(c.photo.key);
      result = await ai.inspect({
        photo, mime: c.photo.mime, category: c.category, description: c.description,
        latitude: c.location.coordinates[1], longitude: c.location.coordinates[0],
      });
    } catch (err) {
      log.error?.(`AI inspection failed for ${id} (attempt ${attempt}/${maxAttempts}): ${errMsg(err)}`);
      await repo.complaints.update(id, { set: { aiAttempts: attempt }, timeline: entry(STATUS.SUBMITTED, `AI attempt ${attempt} failed: ${errMsg(err)}`) });
      if (attempt < maxAttempts) {
        schedule(() => process(id, attempt + 1), config.ai.retryDelayMs * attempt);
      } else {
        const done = await transition(id, [STATUS.SUBMITTED], STATUS.MANUAL_REVIEW, {}, 'AI unavailable; queued for manual review');
        await sms(done, `CivicPulse: we received your report ${id}. It is under review and we will update you soon.`);
      }
      return;
    }

    if (!result.isValid) {
      const reason = result.rejectionReason || 'The photo does not clearly show the reported issue.';
      const done = await transition(id, [STATUS.SUBMITTED], STATUS.REJECTED, { ai: result, aiAttempts: attempt, rejectionReason: reason }, `Rejected by AI: ${reason}`);
      await sms(done, `CivicPulse: your report ${id} could not be verified. ${reason} Open the app to resubmit a clearer photo.`);
      return;
    }

    const officer = c.ward ? await repo.officers.findByWardDepartment(c.ward, c.department) : null;
    const done = await transition(
      id, [STATUS.SUBMITTED], STATUS.VERIFIED,
      {
        ai: result, aiAttempts: attempt, urgency: result.urgency.level, urgencyScore: result.urgency.score,
        assignedOfficer: officer ? { id: officer.id, name: officer.name } : null,
        needsManualRouting: !officer,
      },
      officer
        ? `Verified by AI (urgency ${result.urgency.level}); routed to ${officer.name}, ward ${c.ward}`
        : `Verified by AI (urgency ${result.urgency.level}); no officer found for ward/department, needs manual routing`
    );
    await sms(done, `CivicPulse: your report ${id} (${CATEGORIES[c.category].label}) was submitted successfully and sent to ${(DEPARTMENTS as Record<string, string>)[c.department]}. Urgency: ${result.urgency.level}.`);
  }

  // ---- Citizen -------------------------------------------------------------------------------

  async function submit(user: User, input: SubmitInput, file?: UploadedFile): Promise<Complaint> {
    if (user.role !== ROLES.CITIZEN) throw forbidden('Only citizens can report issues');
    const category = input.category as CategoryId;
    if (!CATEGORIES[category]) throw badRequest('Unknown category');
    if (!validCoords(input.latitude, input.longitude)) throw badRequest('Invalid location');
    if (!file) throw badRequest('A photo is required');

    const stored = await storage.save(file.buffer, file.mimetype);
    const ward = await wardRouter.findWard(input.latitude, input.longitude);
    const id = await repo.nextComplaintId(now().getFullYear());
    const stamp = iso(now());

    const doc: Complaint = {
      id,
      title: input.title || CATEGORIES[category].label,
      category,
      description: input.description,
      status: STATUS.SUBMITTED,
      urgency: null,
      location: { type: 'Point', coordinates: [input.longitude, input.latitude], address: input.address, accuracyM: input.accuracyM },
      photo: stored,
      reportedBy: { id: user.id, name: user.name, phone: user.phone },
      ward: ward?.code ?? null,
      department: departmentFor(category) as string,
      assignedOfficer: null,
      assignedWorker: null,
      aiAttempts: 0,
      timeline: [entry(STATUS.SUBMITTED, ward ? `Report received in ward ${ward.code}` : 'Report received; location is outside all known wards', user.id)],
      createdAt: stamp,
      updatedAt: stamp,
    };
    await repo.complaints.create(doc);
    schedule(() => process(id), 0);
    return doc;
  }

  async function resubmitPhoto(user: User, id: string, file?: UploadedFile): Promise<Complaint> {
    const c = await getForUser(user, id);
    if (c.reportedBy.id !== user.id) throw forbidden();
    if (c.status !== STATUS.REJECTED) throw conflict('Only rejected reports can be resubmitted');
    if (!file) throw badRequest('A photo is required');
    const stored = await storage.save(file.buffer, file.mimetype);
    const updated = await transition(id, [STATUS.REJECTED], STATUS.SUBMITTED, { photo: stored, aiAttempts: 0, rejectionReason: null }, 'Citizen resubmitted photo', user.id);
    schedule(() => process(id), 0);
    return updated;
  }

  const listMine = (user: User) => repo.complaints.listByCitizen(user.id);

  async function getForUser(user: User, id: string): Promise<Complaint> {
    const c = await repo.complaints.getById(id);
    if (!c) throw notFound('Complaint not found');
    const isOwner = c.reportedBy.id === user.id;
    const isOfficer = user.role === ROLES.OFFICER && c.assignedOfficer?.id === user.id;
    if (!(isOwner || isOfficer || user.role === ROLES.ADMIN)) throw forbidden();
    return c;
  }

  // ---- Officer -------------------------------------------------------------------------------

  const requireOfficer = (user: User): void => { if (user.role !== ROLES.OFFICER) throw forbidden('Officer access only'); };

  async function ownedByOfficer(user: User, id: string): Promise<Complaint> {
    requireOfficer(user);
    const c = await repo.complaints.getById(id);
    if (!c) throw notFound('Complaint not found');
    if (c.assignedOfficer?.id !== user.id) throw forbidden('This complaint is not assigned to you');
    return c;
  }

  async function listForOfficer(user: User, { status }: { status?: string } = {}): Promise<Complaint[]> {
    requireOfficer(user);
    const rows = await repo.complaints.listByOfficer(user.id, { status });
    // Most urgent first; within the same urgency, oldest first.
    return rows.sort((a, b) => rank(b.urgency) - rank(a.urgency) || a.createdAt.localeCompare(b.createdAt));
  }

  async function listWorkers(user: User) {
    requireOfficer(user);
    const officer = await repo.officers.getById(user.id);
    if (!officer) throw forbidden('No officer profile for this account');
    return repo.workers.listByScope(officer.ward, officer.department);
  }

  async function assignWorker(user: User, id: string, workerId: string): Promise<Complaint> {
    const c = await ownedByOfficer(user, id);
    const officer = await repo.officers.getById(user.id);
    if (!officer) throw forbidden('No officer profile for this account');
    const worker = await repo.workers.getById(workerId);
    if (!worker || worker.active === false) throw notFound('Worker not found');
    if (worker.ward !== officer.ward || worker.department !== officer.department) throw badRequest('Worker is not in your ward and department');
    if (!([STATUS.VERIFIED, STATUS.WORKER_ASSIGNED] as Status[]).includes(c.status)) throw conflict(`Cannot assign a worker while status is ${c.status}`);
    return transition(
      id, [c.status], STATUS.WORKER_ASSIGNED,
      { assignedWorker: { id: worker.id, name: worker.name, phone: worker.phone, assignedAt: iso(now()) } },
      `Assigned to worker ${worker.name}`, user.id
    );
  }

  async function start(user: User, id: string): Promise<Complaint> {
    await ownedByOfficer(user, id);
    return transition(id, [STATUS.WORKER_ASSIGNED], STATUS.IN_PROGRESS, {}, 'Work started', user.id);
  }

  async function resolve(user: User, id: string, { note }: { note?: string }, file?: UploadedFile): Promise<Complaint> {
    await ownedByOfficer(user, id);
    if (!note || note.trim().length < 5) throw badRequest('A resolution note is required');
    const photoUrl = file ? (await storage.save(file.buffer, file.mimetype)).url : null;
    const done = await transition(
      id, [STATUS.IN_PROGRESS], STATUS.RESOLVED,
      { resolution: { note: note.trim(), photoUrl, resolvedAt: iso(now()) } },
      note.trim(), user.id
    );
    await sms(done, `CivicPulse: your report ${id} has been resolved. ${note.trim()}`);
    return done;
  }

  return { submit, resubmitPhoto, listMine, getForUser, listForOfficer, listWorkers, assignWorker, start, resolve, process };
}

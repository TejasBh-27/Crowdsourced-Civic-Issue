import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { build, citizen, citizen2, officer, JPEG, IN_W01, OUTSIDE } from './helpers.js';

const report = (app: Express, who: Record<string, string> = citizen, over: Record<string, unknown> = {}) => {
  const f = { category: 'pothole', description: 'Deep pothole near the market gate', ...IN_W01, ...over };
  let r = request(app).post('/api/v1/complaints').set(who);
  for (const [k, v] of Object.entries(f)) if (k !== 'noPhoto') r = r.field(k, String(v));
  return over.noPhoto ? r : r.attach('photo', JPEG, { filename: 'p.jpg', contentType: 'image/jpeg' });
};

describe('happy path: report -> AI verify -> SMS -> officer -> worker -> resolve', () => {
  it('runs the whole lifecycle', async () => {
    const { app, drain, notifier } = await build();

    const created = await report(app);
    expect(created.status).toBe(202);
    expect(created.body.status).toBe('submitted');
    expect(created.body.ward).toBe('W01');
    expect(created.body.department).toBe('roads');
    const id = created.body.id;
    expect(id).toMatch(/^CMP-\d{4}-000001$/);

    await drain();
    const verified = (await request(app).get(`/api/v1/complaints/${id}`).set(citizen)).body;
    expect(verified.status).toBe('verified');
    expect(verified.urgency).toBe('high');
    expect(verified.assignedOfficer.id).toBe('OFF-W01-roads');
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0].phone).toBe('+919800000001');
    expect(notifier.sent[0].text).toContain('submitted successfully');

    const q = await request(app).get('/api/v1/officer/complaints').set(officer());
    expect(q.body.map((c: { id: string }) => c.id)).toEqual([id]);

    const workers = await request(app).get('/api/v1/officer/workers').set(officer());
    expect(workers.body.map((w: { id: string }) => w.id)).toEqual(['WRK-W01-roads']); // other ward + inactive excluded

    const assigned = await request(app).post(`/api/v1/officer/complaints/${id}/assign`).set(officer()).send({ workerId: 'WRK-W01-roads' });
    expect(assigned.body.status).toBe('worker_assigned');
    expect(assigned.body.assignedWorker.name).toBe('Wrk roads');

    expect((await request(app).post(`/api/v1/officer/complaints/${id}/start`).set(officer())).body.status).toBe('in_progress');

    const resolved = await request(app).post(`/api/v1/officer/complaints/${id}/resolve`).set(officer())
      .field('note', 'Filled and compacted with asphalt').attach('photo', JPEG, { filename: 'r.jpg', contentType: 'image/jpeg' });
    expect(resolved.body.status).toBe('resolved');
    expect(resolved.body.resolution.photoUrl).toMatch(/^\/uploads\//);
    expect(notifier.sent).toHaveLength(2);
    expect(notifier.sent[1].text).toContain('resolved');

    expect(resolved.body.timeline.map((t: { status: string }) => t.status)).toEqual(['submitted', 'verified', 'worker_assigned', 'in_progress', 'resolved']);
  });

  it('sorts the officer queue by urgency then age', async () => {
    const levels = ['low', 'critical', 'high'] as const;
    let i = 0;
    const { app, drain } = await build({ aiInspect: async () => ({ isValid: true, confidence: 1, urgency: { score: 50, level: levels[i++] } }) });
    const ids = [];
    for (let n = 0; n < 3; n++) ids.push((await report(app)).body.id);
    await drain();
    const q = (await request(app).get('/api/v1/officer/complaints').set(officer())).body;
    expect(q.map((c: { urgency: string }) => c.urgency)).toEqual(['critical', 'high', 'low']);
  });
});

describe('AI rejection', () => {
  it('rejects, texts the reason, and lets the citizen resubmit', async () => {
    let valid = false;
    const { app, drain, notifier } = await build({
      aiInspect: async () => valid
        ? { isValid: true, confidence: 0.9, urgency: { score: 50, level: 'medium' } }
        : { isValid: false, confidence: 0.1, rejectionReason: 'Photo does not show a pothole.', urgency: { score: 0, level: 'low' } },
    });
    const id = (await report(app)).body.id;
    await drain();

    const rej = (await request(app).get(`/api/v1/complaints/${id}`).set(citizen)).body;
    expect(rej.status).toBe('rejected');
    expect(rej.rejectionReason).toBe('Photo does not show a pothole.');
    expect(notifier.sent[0].text).toContain('could not be verified');
    expect(notifier.sent[0].text).toContain('Photo does not show a pothole.');
    // rejected reports never reach the officer
    expect((await request(app).get('/api/v1/officer/complaints').set(officer())).body).toEqual([]);

    valid = true;
    const re = await request(app).post(`/api/v1/complaints/${id}/photo`).set(citizen).attach('photo', JPEG, { filename: 'n.jpg', contentType: 'image/jpeg' });
    expect(re.status).toBe(202);
    expect(re.body.status).toBe('submitted');
    await drain();
    expect((await request(app).get(`/api/v1/complaints/${id}`).set(citizen)).body.status).toBe('verified');
    expect(notifier.sent).toHaveLength(2);
  });

  it('only the owner can resubmit, and only rejected reports', async () => {
    const { app, drain } = await build();
    const id = (await report(app)).body.id;
    await drain(); // now verified
    const photo = () => request(app).post(`/api/v1/complaints/${id}/photo`);
    expect((await photo().set(citizen).attach('photo', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' })).status).toBe(409);
    expect((await photo().set(citizen2).attach('photo', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' })).status).toBe(403);
  });
});

describe('AI outage', () => {
  it('retries with backoff, then falls back to manual review and tells the citizen it is under review', async () => {
    let calls = 0;
    const { app, drain, notifier, jobs } = await build({ aiInspect: async () => { calls++; throw new Error('down'); } });
    const id = (await report(app)).body.id;
    await drain();
    expect(calls).toBe(3);
    const c = (await request(app).get(`/api/v1/complaints/${id}`).set(citizen)).body;
    expect(c.status).toBe('manual_review');
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0].text).toContain('under review');
    expect(jobs).toHaveLength(0);
  });

  it('recovers when the AI comes back before attempts run out', async () => {
    let calls = 0;
    const { app, drain } = await build({
      aiInspect: async () => { if (++calls < 2) throw new Error('blip'); return { isValid: true, confidence: 1, urgency: { score: 90, level: 'critical' } }; },
    });
    const id = (await report(app)).body.id;
    await drain();
    expect((await request(app).get(`/api/v1/complaints/${id}`).set(citizen)).body.status).toBe('verified');
  });

  it('does not process the same complaint twice', async () => {
    let calls = 0;
    const { app, drain, service } = await build({ aiInspect: async () => { calls++; return { isValid: true, confidence: 1, urgency: { score: 10, level: 'low' } }; } });
    const id = (await report(app)).body.id;
    await drain();
    await service.process(id);
    expect(calls).toBe(1);
  });
});

describe('routing', () => {
  it('flags complaints outside every ward for manual routing', async () => {
    const { app, drain } = await build();
    const id = (await report(app, citizen, OUTSIDE)).body.id;
    await drain();
    const c = (await request(app).get(`/api/v1/complaints/${id}`).set(citizen)).body;
    expect(c.status).toBe('verified');
    expect(c.ward).toBeNull();
    expect(c.assignedOfficer).toBeNull();
    expect(c.needsManualRouting).toBe(true);
  });

  it('routes each category to the matching department officer', async () => {
    const { app, drain } = await build();
    const id = (await report(app, citizen, { category: 'garbage' })).body.id;
    await drain();
    const c = (await request(app).get(`/api/v1/complaints/${id}`).set(citizen)).body;
    expect(c.assignedOfficer.id).toBe('OFF-W01-sanitation');
  });
});

describe('validation', () => {
  it('requires a photo', async () => {
    const { app } = await build();
    expect((await report(app, citizen, { noPhoto: true })).status).toBe(400);
  });
  it('rejects bad coordinates, short descriptions and unknown categories', async () => {
    const { app } = await build();
    expect((await report(app, citizen, { latitude: 95 })).status).toBe(400);
    expect((await report(app, citizen, { description: 'short' })).status).toBe(400);
    expect((await report(app, citizen, { category: 'noise' })).status).toBe(400);
  });
  it('rejects non-image uploads', async () => {
    const { app } = await build();
    const r = await request(app).post('/api/v1/complaints').set(citizen)
      .field('category', 'pothole').field('description', 'A pothole on the road').field('latitude', '21.35').field('longitude', '74.88')
      .attach('photo', Buffer.from('%PDF'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(400);
  });
  it('rejects oversized photos', async () => {
    const { app } = await build();
    const r = await report(app, citizen, {}).then(() => request(app).post('/api/v1/complaints').set(citizen)
      .field('category', 'pothole').field('description', 'A pothole on the road').field('latitude', '21.35').field('longitude', '74.88')
      .attach('photo', Buffer.alloc(2 * 1024 * 1024), { filename: 'big.jpg', contentType: 'image/jpeg' }));
    expect(r.status).toBe(413);
  });
  it('requires authentication', async () => {
    const { app } = await build();
    expect((await request(app).get('/api/v1/complaints/mine')).status).toBe(401);
  });
});

describe('authorization and state rules', () => {
  async function verified() {
    const ctx = await build();
    const id = (await report(ctx.app)).body.id;
    await ctx.drain();
    return { ...ctx, id };
  }

  it('citizens only see their own complaints', async () => {
    const { app, id } = await verified();
    expect((await request(app).get(`/api/v1/complaints/${id}`).set(citizen2)).status).toBe(403);
    expect((await request(app).get('/api/v1/complaints/mine').set(citizen2)).body).toEqual([]);
    expect((await request(app).get('/api/v1/complaints/mine').set(citizen)).body).toHaveLength(1);
  });

  it('citizens cannot use officer endpoints; officers cannot report', async () => {
    const { app, id } = await verified();
    expect((await request(app).get('/api/v1/officer/complaints').set(citizen)).status).toBe(403);
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/start`).set(citizen)).status).toBe(403);
    expect((await report(app, officer())).status).toBe(403);
  });

  it('an officer cannot act on another officer\'s complaint', async () => {
    const { app, id } = await verified();
    const other = officer('OFF-W01-garbage');
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/assign`).set(other).send({ workerId: 'WRK-W01-garbage' })).status).toBe(403);
    expect((await request(app).get(`/api/v1/complaints/${id}`).set(other)).status).toBe(403);
    expect((await request(app).get('/api/v1/officer/complaints').set(other)).body).toEqual([]);
  });

  it('rejects workers from another ward/department or inactive', async () => {
    const { app, id } = await verified();
    const assign = (workerId: string) => request(app).post(`/api/v1/officer/complaints/${id}/assign`).set(officer()).send({ workerId });
    expect((await assign('WRK-W02-roads')).status).toBe(400);
    expect((await assign('WRK-W01-sanitation')).status).toBe(400);
    expect((await assign('WRK-W01-inactive')).status).toBe(404);
    expect((await assign('nope')).status).toBe(404);
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/assign`).set(officer()).send({})).status).toBe(400);
  });

  it('enforces the order: assign -> start -> resolve', async () => {
    const { app, id } = await verified();
    const o = officer();
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/start`).set(o)).status).toBe(409);
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/resolve`).set(o).field('note', 'done and dusted')).status).toBe(409);
    await request(app).post(`/api/v1/officer/complaints/${id}/assign`).set(o).send({ workerId: 'WRK-W01-roads' });
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/resolve`).set(o).field('note', 'done and dusted')).status).toBe(409);
    await request(app).post(`/api/v1/officer/complaints/${id}/start`).set(o);
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/resolve`).set(o).field('note', 'x')).status).toBe(400);
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/resolve`).set(o).field('note', 'done and dusted')).status).toBe(200);
    expect((await request(app).post(`/api/v1/officer/complaints/${id}/start`).set(o)).status).toBe(409);
  });

  it('allows reassigning a worker before work starts', async () => {
    const { app, id, repo } = await verified();
    await repo.workers.upsert({ id: 'WRK-W01-roads-2', name: 'Second', ward: 'W01', department: 'roads' });
    const o = officer();
    await request(app).post(`/api/v1/officer/complaints/${id}/assign`).set(o).send({ workerId: 'WRK-W01-roads' });
    const re = await request(app).post(`/api/v1/officer/complaints/${id}/assign`).set(o).send({ workerId: 'WRK-W01-roads-2' });
    expect(re.body.assignedWorker.name).toBe('Second');
  });

  it('a failed SMS does not break the pipeline and is recorded on the timeline', async () => {
    const ctx = await build();
    ctx.notifier.send = async () => { throw new Error('gateway down'); };
    const id = (await report(ctx.app)).body.id;
    await ctx.drain();
    const c = (await request(ctx.app).get(`/api/v1/complaints/${id}`).set(citizen)).body;
    expect(c.status).toBe('verified');
    expect(c.timeline.some((t: { note: string }) => t.note.includes('SMS to citizen failed'))).toBe(true);
  });
});

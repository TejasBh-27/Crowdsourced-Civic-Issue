import { describe, it, expect } from 'vitest';
import { assertSafeConfig } from '../src/config.js';
import { createMockAiClient, AiResultSchema } from '../src/services/aiClient.js';
import { createTwilioNotifier } from '../src/services/notifier.js';

describe('config safety', () => {
  const base = { nodeEnv: 'development', authMode: 'dev-headers', sms: { provider: 'console' } };
  it('blocks dev-headers auth in production', () => {
    expect(() => assertSafeConfig({ ...base, nodeEnv: 'production' })).toThrow(/production/);
    expect(() => assertSafeConfig(base)).not.toThrow();
    expect(() => assertSafeConfig({ ...base, nodeEnv: 'production', authMode: 'jwt' })).not.toThrow();
  });
  it('requires twilio vars when twilio is selected', () => {
    expect(() => assertSafeConfig({ ...base, sms: { provider: 'twilio' } })).toThrow(/TWILIO/);
  });
});

describe('mock AI client', () => {
  const ai = createMockAiClient();
  const base = { mime: 'image/jpeg', category: 'pothole', latitude: 21.35, longitude: 74.88 };
  it('rejects tiny images', async () => {
    const r = await ai.inspect({ ...base, photo: Buffer.alloc(100), description: 'x' });
    expect(r.isValid).toBe(false);
    expect(AiResultSchema.safeParse(r).success).toBe(true);
  });
  it('raises urgency for danger words', async () => {
    const calm = await ai.inspect({ ...base, photo: Buffer.alloc(9000), description: 'a small crack in the road' });
    const hot = await ai.inspect({ ...base, photo: Buffer.alloc(9000), description: 'dangerous hazard, accident near school children' });
    expect(hot.urgency.score).toBeGreaterThan(calm.urgency.score);
    expect(hot.urgency.level).toBe('critical');
    expect(AiResultSchema.safeParse(hot).success).toBe(true);
  });
});

describe('AI response contract', () => {
  it('rejects malformed service responses', () => {
    expect(AiResultSchema.safeParse({ isValid: true }).success).toBe(false);
    expect(AiResultSchema.safeParse({ isValid: true, confidence: 2, urgency: { score: 5, level: 'low' } }).success).toBe(false);
  });
});

describe('twilio notifier', () => {
  it('posts form-encoded with basic auth and throws on failure', async () => {
    let seen: { url: string; opts: { headers: Record<string, string>; body: URLSearchParams } } | undefined;
    const ok = createTwilioNotifier({ sid: 'AC1', token: 't', from: '+1555', fetchImpl: async (url, opts) => { seen = { url, opts }; return { ok: true }; } });
    await ok.send('+919800000001', 'hello');
    expect(seen!.url).toContain('/Accounts/AC1/Messages.json');
    expect(seen!.opts.headers.Authorization).toBe(`Basic ${Buffer.from('AC1:t').toString('base64')}`);
    expect(seen!.opts.body.get('To')).toBe('+919800000001');
    const bad = createTwilioNotifier({ sid: 'AC1', token: 't', from: '+1555', fetchImpl: async () => ({ ok: false, status: 401 }) });
    await expect(bad.send('+91', 'x')).rejects.toThrow(/401/);
  });
});

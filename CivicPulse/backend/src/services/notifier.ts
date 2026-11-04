import type { Notifier } from '../domain/types.js';

export function createConsoleNotifier(log: (msg: string) => void = console.log): Notifier {
  return { async send(phone, text) { log(`[SMS -> ${phone}] ${text}`); } };
}

interface TwilioOpts {
  sid: string;
  token: string;
  from: string;
  fetchImpl?: (url: string, init: { method: string; headers: Record<string, string>; body: URLSearchParams }) => Promise<{ ok: boolean; status?: number }>;
}

/** Twilio via REST (no SDK). Phone numbers must be E.164, e.g. +919876543210. */
export function createTwilioNotifier({ sid, token, from, fetchImpl = fetch as NonNullable<TwilioOpts['fetchImpl']> }: TwilioOpts): Notifier {
  return {
    async send(to, body) {
      const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      if (!res.ok) throw new Error(`Twilio responded ${res.status}`);
    },
  };
}

export function createMemoryNotifier(): Notifier & { sent: { phone: string; text: string }[] } {
  const sent: { phone: string; text: string }[] = [];
  return { sent, async send(phone, text) { sent.push({ phone, text }); } };
}

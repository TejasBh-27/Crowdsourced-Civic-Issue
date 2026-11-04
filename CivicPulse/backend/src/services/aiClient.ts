import { z } from 'zod';
import { URGENCY } from '../domain/constants.js';
import type { AiClient, AiResult, Urgency } from '../domain/types.js';

// Contract between this backend and the Python AI service (separate module).
// POST {AI_SERVICE_URL}/v1/ai/inspect   multipart/form-data:
//   photo (file), category, description, latitude, longitude
// The AI service owns fusing CV severity and NLP text cues into `urgency`.
export const AiResultSchema = z.object({
  isValid: z.boolean(),                       // does the photo genuinely show the reported issue?
  confidence: z.number().min(0).max(1),
  rejectionReason: z.string().optional(),     // shown to the citizen (via SMS) when isValid=false
  urgency: z.object({
    score: z.number().min(0).max(100),
    level: z.enum([URGENCY.LOW, URGENCY.MEDIUM, URGENCY.HIGH, URGENCY.CRITICAL]),
  }),
  cv: z.record(z.any()).optional(),
  nlp: z.record(z.any()).optional(),
});

export const levelFromScore = (s: number): Urgency => (s >= 85 ? 'critical' : s >= 70 ? 'high' : s >= 40 ? 'medium' : 'low');

export function createHttpAiClient({ url, timeoutMs }: { url: string; timeoutMs: number }): AiClient {
  return {
    async inspect({ photo, mime, category, description, latitude, longitude }) {
      const form = new FormData();
      form.append('photo', new Blob([new Uint8Array(photo)], { type: mime }), 'photo');
      form.append('category', category);
      form.append('description', description);
      form.append('latitude', String(latitude));
      form.append('longitude', String(longitude));
      const res = await fetch(`${url}/v1/ai/inspect`, { method: 'POST', body: form, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`AI service responded ${res.status}`);
      return AiResultSchema.parse(await res.json()) as AiResult;
    },
  };
}

// Development stand-in so the pipeline runs before the real CV/NLP service exists.
// NOT a model: tiny images are "unclear", urgency comes from keywords.
const HIGH_WORDS = ['accident', 'hazard', 'burst', 'emergency', 'injur', 'children', 'school', 'dangerous', 'flood', 'live wire'];
export function createMockAiClient(): AiClient {
  return {
    async inspect({ photo, description, category }) {
      if (photo.length < 5_000) {
        return {
          isValid: false,
          confidence: 0.2,
          rejectionReason: 'The photo is too small or unclear to verify. Please retake it closer to the issue in good light.',
          urgency: { score: 0, level: 'low' },
          cv: { mock: true },
        };
      }
      const text = description.toLowerCase();
      const hits = HIGH_WORDS.filter((w) => text.includes(w)).length;
      const base = category === 'pothole' || category === 'water' ? 55 : 45;
      const score = Math.min(100, base + hits * 15);
      return { isValid: true, confidence: 0.9, urgency: { score, level: levelFromScore(score) }, cv: { mock: true }, nlp: { mock: true, keywordHits: hits } };
    },
  };
}

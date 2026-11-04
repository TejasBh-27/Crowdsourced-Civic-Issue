import express from 'express';
import { config, assertSafeConfig } from './config.js';
import { createApp } from './http/app.js';
import { createComplaintService } from './services/complaintService.js';
import { createWardRouter } from './services/wardRouter.js';
import { createLocalStorage } from './services/storage.js';
import { createHttpAiClient, createMockAiClient } from './services/aiClient.js';
import { createConsoleNotifier, createTwilioNotifier } from './services/notifier.js';
import { connectMongo, createMongoRepo } from './repositories/mongo.js';
import { createMemoryRepo } from './repositories/memory.js';
import type { Repo, Schedule } from './domain/types.js';

assertSafeConfig();

const useMemory = process.env.REPO === 'memory';
let repo: Repo;
if (useMemory) {
  repo = createMemoryRepo();
  console.warn('Using in-memory repository: data is lost on restart');
} else {
  await connectMongo(config.mongoUri);
  repo = createMongoRepo();
}

const storage = createLocalStorage(config.uploadDir);
const ai = config.ai.mode === 'http' ? createHttpAiClient(config.ai) : createMockAiClient();
if (config.ai.mode !== 'http') console.warn('AI_MODE=mock: using the keyword-based development stand-in, not real CV/NLP');
const notifier = config.sms.provider === 'twilio'
  ? createTwilioNotifier({ sid: config.sms.twilioSid as string, token: config.sms.twilioToken as string, from: config.sms.twilioFrom as string }) // presence checked by assertSafeConfig
  : createConsoleNotifier();

// In-process job runner. Retries are lost on restart; move to a durable queue (BullMQ/SQS) before production.
const schedule: Schedule = (fn, delayMs = 0) => setTimeout(() => fn().catch((e: unknown) => console.error('job failed', e)), delayMs);

const service = createComplaintService({ repo, ai, notifier, storage, wardRouter: createWardRouter(repo), config, schedule });
const app = createApp({ service, config });
app.use('/uploads', express.static(config.uploadDir));

app.listen(config.port, () => console.log(`CivicPulse API on :${config.port}`));

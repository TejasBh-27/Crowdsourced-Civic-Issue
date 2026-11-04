import 'dotenv/config';

const env = process.env;

export interface Config {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  authMode: string;
  uploadDir: string;
  maxUploadBytes: number;
  ai: { mode: string; url: string; timeoutMs: number; maxAttempts: number; retryDelayMs: number };
  sms: { provider: string; twilioSid?: string; twilioToken?: string; twilioFrom?: string };
}

export const config: Config = {
  nodeEnv: env.NODE_ENV || 'development',
  port: Number(env.PORT || 4000),
  mongoUri: env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse',
  // dev-headers = trust x-user-id / x-user-role (development only, replaced by the Auth module)
  authMode: env.AUTH_MODE || 'dev-headers',
  uploadDir: env.UPLOAD_DIR || 'uploads',
  maxUploadBytes: Number(env.MAX_UPLOAD_MB || 8) * 1024 * 1024,
  ai: {
    mode: env.AI_MODE || 'mock', // mock | http
    url: env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
    timeoutMs: Number(env.AI_TIMEOUT_MS || 20000),
    maxAttempts: Number(env.AI_MAX_ATTEMPTS || 3),
    retryDelayMs: Number(env.AI_RETRY_DELAY_MS || 5000),
  },
  sms: {
    provider: env.SMS_PROVIDER || 'console', // console | twilio
    twilioSid: env.TWILIO_ACCOUNT_SID,
    twilioToken: env.TWILIO_AUTH_TOKEN,
    twilioFrom: env.TWILIO_FROM,
  },
};

export function assertSafeConfig(c: Pick<Config, 'nodeEnv' | 'authMode'> & { sms: Config['sms'] } = config): void {
  if (c.nodeEnv === 'production' && c.authMode === 'dev-headers') {
    throw new Error('AUTH_MODE=dev-headers is not allowed in production');
  }
  if (c.sms.provider === 'twilio' && !(c.sms.twilioSid && c.sms.twilioToken && c.sms.twilioFrom)) {
    throw new Error('Twilio SMS provider selected but TWILIO_* variables are missing');
  }
}

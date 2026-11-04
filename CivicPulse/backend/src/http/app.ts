import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import { z } from 'zod';
import { AppError, badRequest, unauthorized } from '../domain/errors.js';
import { ROLES, CATEGORIES } from '../domain/constants.js';
import type { Role, User } from '../domain/types.js';
import type { createComplaintService } from '../services/complaintService.js';
import type { Config } from '../config.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: User }
  }
}

type Service = ReturnType<typeof createComplaintService>;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const CreateSchema = z.object({
  category: z.enum(Object.keys(CATEGORIES) as [string, ...string[]]),
  description: z.string().trim().min(10, 'Describe the issue in at least 10 characters').max(2000),
  title: z.string().trim().max(120).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
  accuracyM: z.coerce.number().min(0).optional(),
});
const AssignSchema = z.object({ workerId: z.string().min(1) });
const ResolveSchema = z.object({ note: z.string().trim().min(5).max(1000) });

const parse = <S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> => {
  const r = schema.safeParse(data);
  if (!r.success) throw badRequest('Validation failed', r.error.issues.map((i: z.ZodIssue) => ({ field: i.path.join('.'), message: i.message })));
  return r.data;
};

// DEV ONLY: trusts headers. Replaced by JWT verification in the Auth module (config.assertSafeConfig blocks this in production).
function devIdentity(req: Request, _res: Response, next: NextFunction): void {
  const id = req.header('x-user-id');
  const role = req.header('x-user-role');
  if (!id || !(Object.values(ROLES) as string[]).includes(role ?? '')) return next(unauthorized('Send x-user-id and x-user-role (dev auth mode)'));
  req.user = { id, role: role as Role, name: req.header('x-user-name') || id, phone: req.header('x-user-phone') };
  next();
}

export function createApp({ service, config, authMiddleware }: { service: Service; config: Pick<Config, 'maxUploadBytes'>; authMiddleware?: RequestHandler }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1 },
    fileFilter: (_req, file, cb) => (ALLOWED_MIME.has(file.mimetype) ? cb(null, true) : cb(badRequest('Photo must be JPEG, PNG or WebP'))),
  });
  const photo = upload.single('photo');

  const auth = authMiddleware || devIdentity;
  const wrap = (fn: (req: Request, res: Response) => unknown): RequestHandler => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const api = express.Router();

  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.get('/categories', (_req, res) => res.json(Object.entries(CATEGORIES).map(([id, c]) => ({ id, ...c }))));
  api.use(auth);
  const me = (req: Request): User => req.user as User; // set by the auth middleware
  const pid = (req: Request): string => String(req.params.id);

  // Citizen
  api.post('/complaints', photo, wrap(async (req, res) => {
    const input = parse(CreateSchema, req.body);
    res.status(202).json(await service.submit(me(req), input, req.file)); // 202: AI verification continues in background
  }));
  api.get('/complaints/mine', wrap(async (req, res) => res.json(await service.listMine(me(req)))));
  api.get('/complaints/:id', wrap(async (req, res) => res.json(await service.getForUser(me(req), pid(req)))));
  api.post('/complaints/:id/photo', photo, wrap(async (req, res) => res.status(202).json(await service.resubmitPhoto(me(req), pid(req), req.file))));

  // Officer
  api.get('/officer/complaints', wrap(async (req, res) => res.json(await service.listForOfficer(me(req), { status: req.query.status as string | undefined }))));
  api.get('/officer/workers', wrap(async (req, res) => res.json(await service.listWorkers(me(req)))));
  api.post('/officer/complaints/:id/assign', wrap(async (req, res) => {
    const { workerId } = parse(AssignSchema, req.body);
    res.json(await service.assignWorker(me(req), pid(req), workerId));
  }));
  api.post('/officer/complaints/:id/start', wrap(async (req, res) => res.json(await service.start(me(req), pid(req)))));
  api.post('/officer/complaints/:id/resolve', photo, wrap(async (req, res) => {
    const body = parse(ResolveSchema, req.body);
    res.json(await service.resolve(me(req), pid(req), body, req.file));
  }));

  app.use('/api/v1', api);

  // eslint-disable-next-line no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    console.error(err);
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong' } });
  });

  return app;
}

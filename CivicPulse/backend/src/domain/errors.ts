export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}
export const badRequest = (m: string, d?: unknown) => new AppError(400, 'bad_request', m, d);
export const unauthorized = (m = 'Authentication required') => new AppError(401, 'unauthorized', m);
export const forbidden = (m = 'Not allowed') => new AppError(403, 'forbidden', m);
export const notFound = (m = 'Not found') => new AppError(404, 'not_found', m);
export const conflict = (m: string) => new AppError(409, 'conflict', m);

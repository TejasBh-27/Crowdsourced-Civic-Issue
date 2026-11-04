import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Storage } from '../domain/types.js';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function extFor(mime: string): string {
  const ext = EXT[mime];
  if (!ext) throw new Error(`Unsupported image type: ${mime}`);
  return ext;
}

/** Local-disk storage. Swap for a Cloudinary/S3 implementation of the same interface in production. */
export function createLocalStorage(dir: string): Storage {
  return {
    async save(buffer, mime) {
      const ext = extFor(mime);
      await mkdir(dir, { recursive: true });
      const key = `${randomUUID()}.${ext}`;
      await writeFile(path.join(dir, key), buffer);
      return { key, url: `/uploads/${key}`, mime };
    },
    async read(key) {
      return readFile(path.join(dir, path.basename(key)));
    },
  };
}

export function createMemoryStorage(): Storage {
  const files = new Map<string, Buffer>();
  return {
    async save(buffer, mime) {
      const key = `${randomUUID()}.${extFor(mime)}`;
      files.set(key, buffer);
      return { key, url: `/uploads/${key}`, mime };
    },
    async read(key) {
      const b = files.get(key);
      if (!b) throw new Error('not found');
      return b;
    },
  };
}

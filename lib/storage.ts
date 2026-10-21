/**
 * Photo storage.
 *
 *  - Default: files are written to `.data/uploads` and served by
 *    /api/uploads/[name]. Fine for local dev and a single server.
 *  - If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, files go to the
 *    public Supabase Storage bucket `listing-photos` instead (required on
 *    Vercel, where the filesystem is not persistent).
 *
 * Want UploadThing/S3/Cloudinary? Replace `saveImage` — it only has to return a URL.
 */
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const BUCKET = 'listing-photos';
const dir = process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/aam-uploads' : path.join(process.cwd(), '.data', 'uploads'));

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
type Mime = keyof typeof EXT;
const MIME_BY_EXT: Record<string, Mime> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Identify the image from its first bytes — never trust the browser-supplied type. */
export function sniffImageType(b: Buffer): Mime | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

const useSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Store an image and return the URL to save on the listing. */
export async function saveImage(data: Buffer, mime: Mime): Promise<string> {
  const name = `${randomUUID()}.${EXT[mime]}`;

  if (useSupabase()) {
    const base = process.env.SUPABASE_URL!.replace(/\/$/, '');
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${name}`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': mime,
      },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Supabase storage ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return `${base}/storage/v1/object/public/${BUCKET}/${name}`;
  }

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data);
  return `/api/uploads/${name}`;
}

/** Read a locally stored upload (the name is validated so it can't escape the folder). */
export async function readUpload(name: string): Promise<{ data: Buffer; type: Mime } | null> {
  const m = /^([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(name);
  if (!m) return null;
  try {
    return { data: await fs.readFile(path.join(dir, name)), type: MIME_BY_EXT[m[2]] };
  } catch {
    return null;
  }
}

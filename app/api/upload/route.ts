import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { allow } from '@/lib/rate-limit';
import { MAX_UPLOAD_BYTES, saveImage, sniffImageType } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** POST /api/upload (multipart, field "file") → { url }. Hosts only; JPEG, PNG or WebP up to 4 MB. */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser('host');
  if ('response' in auth) return auth.response;
  if (!allow(`upload:${auth.user.id}`, 100, 60 * 60_000)) {
    return NextResponse.json({ error: 'Upload limit reached. Try again later.' }, { status: 429 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Photo is too large (max 4 MB).' }, { status: 413 });

    const data = Buffer.from(await file.arrayBuffer());
    const type = sniffImageType(data);
    if (!type) return NextResponse.json({ error: 'Use a JPEG, PNG or WebP photo.' }, { status: 415 });

    return NextResponse.json({ url: await saveImage(data, type) }, { status: 201 });
  } catch (err) {
    console.error('[api/upload]', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

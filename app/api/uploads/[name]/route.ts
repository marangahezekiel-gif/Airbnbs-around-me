import { NextResponse } from 'next/server';
import { readUpload } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** GET /api/uploads/<uuid>.jpg — serves locally stored listing photos. */
export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const file = await readUpload(params.name);
  if (!file) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.type,
      // file names are random and never reused, so they can be cached forever
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

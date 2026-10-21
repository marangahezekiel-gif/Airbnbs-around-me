'use client';

/**
 * Multi-photo uploader with instant previews.
 *
 * Each photo is shrunk in the browser (max 1600 px, JPEG) before upload, which
 * keeps uploads fast on mobile data and strips location metadata. While it
 * uploads, the user already sees a preview; the first photo is the cover.
 */
import { useRef, useState } from 'react';

interface Pending {
  key: string;
  preview: string;
  error?: string;
}

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))) ?? file;
  } catch {
    return file; // the browser couldn't decode it — let the server decide
  }
}

export function ImageUploader({ value, onChange, max = 12 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  // The latest list, so several uploads finishing at different times don't overwrite each other
  const valueRef = useRef(value);
  valueRef.current = value;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - valueRef.current.length - pending.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));

    const items = chosen.map((file) => ({ file, item: { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, preview: URL.createObjectURL(file) } as Pending }));
    setPending((p) => [...p, ...items.map((i) => i.item)]);

    for (const { file, item } of items) {
      try {
        const blob = await shrink(file);
        const form = new FormData();
        form.append('file', blob, 'photo.jpg');
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed');
        onChange([...valueRef.current, data.url]);
        setPending((p) => p.filter((x) => x.key !== item.key));
        URL.revokeObjectURL(item.preview);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed';
        setPending((p) => p.map((x) => (x.key === item.key ? { ...x, error: message } : x)));
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  const makeCover = (i: number) => onChange([value[i], ...value.filter((_, j) => j !== i)]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url, i) => (
          <li key={url} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-charcoal-100">
            <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-pin">Cover</span>}
            <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2">
              {i > 0 ? (
                <button type="button" onClick={() => makeCover(i)} className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold shadow-pin">
                  Make cover
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="rounded-full bg-charcoal-900/90 px-2.5 py-1 text-xs font-bold text-white"
              >
                Remove
              </button>
            </div>
          </li>
        ))}

        {pending.map((p) => (
          <li key={p.key} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-charcoal-100">
            <img src={p.preview} alt="" className={`h-full w-full object-cover ${p.error ? 'opacity-40' : 'opacity-60'}`} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center">
              {p.error ? (
                <>
                  <p className="text-xs font-bold text-coral-700">{p.error}</p>
                  <button
                    type="button"
                    onClick={() => setPending((all) => all.filter((x) => x.key !== p.key))}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-pin"
                  >
                    Dismiss
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold shadow-pin">Uploading…</span>
              )}
            </div>
          </li>
        ))}

        {value.length + pending.length < max && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-charcoal-300 text-sm font-bold text-charcoal-600 transition hover:border-charcoal-900 hover:text-charcoal-900"
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                +
              </span>
              Add photos
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
        aria-label="Choose photos to upload"
      />
      <p className="mt-2 text-xs text-charcoal-400">Up to {max} photos. The first one is the cover shown on the map and in search.</p>
    </div>
  );
}

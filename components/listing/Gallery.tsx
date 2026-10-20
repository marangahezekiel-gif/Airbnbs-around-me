'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  photos: string[];
  title: string;
}

/** Thumbnail image; hides itself if the file fails to load (e.g. offline) so the gradient behind shows. */
function Img({ src, className = '' }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden';
      }}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

/**
 * Photo gallery: a swipeable carousel on phones, a 1+4 mosaic on desktop,
 * and a full-screen lightbox (keyboard + swipe) for "show all photos".
 */
export function Gallery({ photos, title }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, next, prev]);

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <>
      {/* Mobile: swipe carousel */}
      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory overflow-x-auto md:hidden">
        {photos.map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => openAt(i)}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            className="aspect-[4/3] w-full shrink-0 snap-center bg-gradient-to-br from-sand-200 to-coral-100"
          >
            <Img src={p} />
          </button>
        ))}
      </div>

      {/* Desktop: mosaic */}
      <div className="relative hidden h-[26rem] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl md:grid">
        {photos.slice(0, 5).map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => openAt(i)}
            aria-label={`Open photo ${i + 1}`}
            className={`overflow-hidden bg-gradient-to-br from-sand-200 to-coral-100 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
          >
            <Img src={p} className="transition duration-500 hover:scale-105" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => openAt(0)}
          className="absolute bottom-4 right-4 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-float transition hover:scale-105"
        >
          Show all {photos.length} photos
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-charcoal-900/95" role="dialog" aria-modal="true" aria-label={`${title} photos`}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-semibold">
              {index + 1} / {photos.length}
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close gallery" className="rounded-full p-2 text-2xl leading-none hover:bg-white/10">
              ✕
            </button>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center px-2 pb-6"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
            }}
          >
            <button type="button" onClick={prev} aria-label="Previous photo" className="absolute left-2 z-10 hidden rounded-full bg-white/90 px-4 py-3 text-xl font-bold shadow-float hover:bg-white sm:block">
              ‹
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[index]} alt={`${title} — photo ${index + 1}`} className="max-h-full max-w-full rounded-2xl object-contain" />
            <button type="button" onClick={next} aria-label="Next photo" className="absolute right-2 z-10 hidden rounded-full bg-white/90 px-4 py-3 text-xl font-bold shadow-float hover:bg-white sm:block">
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}

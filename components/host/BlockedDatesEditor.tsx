'use client';

/** Host availability calendar: tap a day to close it to guests (tap again to reopen). */
import { useMemo } from 'react';
import { Months } from '../calendar/Months';

interface Props {
  value: string[];
  onChange: (dates: string[]) => void;
}

export function BlockedDatesEditor({ value, onChange }: Props) {
  const set = useMemo(() => new Set(value), [value]);

  const toggle = (iso: string) => {
    const next = new Set(set);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    onChange([...next].sort());
  };

  const upcoming = value.filter((d) => d >= new Date().toISOString().slice(0, 10)).length;

  return (
    <div>
      <Months
        cell={(iso, day, past) => {
          const closed = set.has(iso);
          return (
            <button
              type="button"
              disabled={past}
              onClick={() => toggle(iso)}
              aria-pressed={closed}
              aria-label={`${iso}${closed ? ', closed to guests' : ', open'}`}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
                closed
                  ? 'bg-charcoal-900 font-bold text-white line-through'
                  : past
                    ? 'text-charcoal-300'
                    : 'font-medium hover:border hover:border-charcoal-900'
              }`}
            >
              {day}
            </button>
          );
        }}
      />
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-charcoal-50 px-4 py-3 text-sm">
        <p className="text-charcoal-600">
          {upcoming === 0 ? 'All upcoming dates are open to guests.' : `${upcoming} upcoming date${upcoming > 1 ? 's' : ''} closed to guests.`}
        </p>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="font-bold underline">
            Reopen all
          </button>
        )}
      </div>
    </div>
  );
}

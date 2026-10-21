'use client';

/**
 * Check-in / check-out picker for host listings. Unlike the indicative
 * calendar used for external Airbnb listings, `blocked` here is REAL data:
 * nights the host closed plus nights when every unit is already booked.
 *
 * A blocked day can't be a check-in (that night is taken) but can be a
 * check-out (the guest leaves that morning).
 */
import { useMemo } from 'react';
import { addDays } from '@/lib/marketplace/availability';
import { Months } from '../calendar/Months';

export interface Range {
  start: string | null;
  end: string | null;
}

interface Props {
  blocked: string[];
  value: Range;
  onChange: (r: Range) => void;
  maxNights?: number;
}

export function DateRangePicker({ blocked, value, onChange, maxNights = 30 }: Props) {
  const blockedSet = useMemo(() => new Set(blocked), [blocked]);
  const { start, end } = value;

  /** Is any night in [from, to) closed? */
  const nightBlocked = (from: string, to: string) => {
    for (let d = from; d < to; d = addDays(d, 1)) if (blockedSet.has(d)) return true;
    return false;
  };

  const pick = (day: string) => {
    if (!start || end || day <= start) onChange({ start: day, end: null });
    else onChange({ start, end: day });
  };

  return (
    <Months
      cell={(iso, day, past) => {
        const choosingEnd = Boolean(start && !end && iso > start);
        const disabled = past || (choosingEnd ? nightBlocked(start!, iso) || iso > addDays(start!, maxNights) : blockedSet.has(iso));
        const edge = iso === start || iso === end;
        const inRange = Boolean(start && end && iso > start && iso < end);
        return (
          <button
            type="button"
            disabled={disabled}
            onClick={() => pick(iso)}
            aria-label={`${iso}${blockedSet.has(iso) ? ', unavailable' : ''}`}
            aria-pressed={edge || inRange}
            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
              edge
                ? 'bg-charcoal-900 font-bold text-white'
                : inRange
                  ? 'rounded-none bg-coral-50 font-semibold'
                  : disabled
                    ? `text-charcoal-300 ${blockedSet.has(iso) && !past ? 'line-through' : ''}`
                    : 'font-medium hover:border hover:border-charcoal-900'
            }`}
          >
            {day}
          </button>
        );
      }}
    />
  );
}

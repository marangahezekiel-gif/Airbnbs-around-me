import type { BookingStatus } from '@/lib/marketplace/types';

const STYLES: Record<BookingStatus, { label: string; cls: string }> = {
  pending: { label: 'Awaiting host', cls: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Declined', cls: 'bg-charcoal-100 text-charcoal-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-charcoal-100 text-charcoal-600' },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = STYLES[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

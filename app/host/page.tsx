import { redirect } from 'next/navigation';

/** /host → the dashboard (the middleware has already checked the visitor is a host). */
export default function HostIndex() {
  redirect('/host/dashboard');
}

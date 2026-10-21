import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HeroMap } from '@/components/landing/HeroMap';
import { HeroSearch } from '@/components/landing/HeroSearch';
import { InstallSection } from '@/components/landing/InstallSection';

const STEPS = [
  {
    n: '01',
    title: 'Share your location',
    body: 'One tap and the map jumps to where you are. Prefer to plan ahead? Search any city or address instead.',
  },
  {
    n: '02',
    title: 'See stays on the map',
    body: 'Price pins show what’s nearby right now. Tap a pin or a card — the two stay perfectly in sync.',
  },
  {
    n: '03',
    title: 'Book on Airbnb',
    body: 'Found one you like? Open the full listing, check dates, then finish booking directly on Airbnb.',
  },
];

const FEATURES = [
  { title: 'Live map + list', body: 'Split-screen on desktop, a swipeable bottom sheet on your phone.' },
  { title: 'Around me now', body: 'Re-centre on your live location any time with a single button.' },
  { title: 'Filters that matter', body: 'Price, entire place or private room, bedrooms, amenities and instant book.' },
  { title: 'Installable app', body: 'Add it to your home screen on iPhone, Android or desktop. No app store.' },
  { title: 'Works offline', body: 'Your latest search is saved, so stays are still there when the signal isn’t.' },
  { title: 'Price-drop alerts', body: 'Optional notifications when a stay you’re watching gets cheaper.' },
];

export default function LandingPage() {
  return (
    <>
      <Header transparent />
      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-sand-100">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-coral-100 opacity-70 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:pb-28 lg:pt-20">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-charcoal-600 shadow-pin">
                <span className="h-2 w-2 rounded-full bg-coral-500" /> Live map · No sign-up
              </p>
              <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Find perfect Airbnbs <span className="text-coral-500">around you</span> in seconds.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-500">
                Open the app, share your location and see stays on a live map — with prices, ratings and exactly how far
                each one is from where you’re standing.
              </p>
              <div className="mt-9">
                <HeroSearch />
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-charcoal-500">
                <li>✓ Free to use</li>
                <li>✓ Installs like an app</li>
                <li>✓ Works offline</li>
              </ul>
            </div>
            <HeroMap />
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
            From “where am I?” to “book it” in three steps.
          </h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-3xl border border-charcoal-100 bg-white p-7 shadow-card">
                <span className="text-4xl font-extrabold text-coral-200">{s.n}</span>
                <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-charcoal-500">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-20 bg-sand-100 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Features</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
              Everything you need, nothing you don’t.
            </h2>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="border-t-2 border-charcoal-900 pt-5">
                  <h3 className="text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-charcoal-500">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── For hosts ── */}
        <section id="host" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 rounded-[2rem] bg-charcoal-900 p-8 text-white sm:p-14 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-coral-300">For hosts</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Got a place to rent? Let nearby guests find it.</h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-charcoal-200">
                List it in minutes: add photos, drop a pin on the exact entrance, set your price and how many units you have.
                Guests around you see it on the map right away and send booking requests you can accept or decline.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup?role=host"
                  className="rounded-full bg-coral-500 px-7 py-3.5 font-bold text-white transition hover:bg-coral-400 active:scale-95"
                >
                  List your place
                </Link>
                <Link
                  href="/signin?callbackUrl=%2Fhost%2Fdashboard"
                  className="rounded-full border border-white/30 px-7 py-3.5 font-bold transition hover:border-white active:scale-95"
                >
                  Host sign in
                </Link>
              </div>
            </div>
            <ul className="space-y-3 text-charcoal-100">
              {['Exact pin guests can navigate to', 'Units left shown live on the map', 'Instant Book or approve each request', 'Close dates any time with your calendar'].map(
                (t) => (
                  <li key={t} className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-3">
                    <span aria-hidden="true" className="mt-0.5 text-coral-300">✓</span>
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <InstallSection />

        {/* ── Final CTA ── */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-[2rem] bg-coral-500 px-8 py-14 text-center text-white sm:px-16">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Your next stay is probably closer than you think.</h2>
            <Link
              href="/explore?locate=1"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-lg font-extrabold text-coral-600 shadow-float transition hover:scale-105 active:scale-95"
            >
              Find stays near me <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

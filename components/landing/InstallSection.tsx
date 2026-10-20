'use client';

import { useState } from 'react';
import { IosInstallDialog, useInstall } from '@/components/InstallPrompt';

/** Landing-page section explaining and triggering PWA installation. */
export function InstallSection() {
  const { canPrompt, installed, isIOS, promptInstall } = useInstall();
  const [iosHelp, setIosHelp] = useState(false);

  return (
    <section id="install" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="overflow-hidden rounded-[2rem] bg-charcoal-900 p-8 text-white sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-300">Get the app</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Put it on your home screen.</h2>
          <p className="mt-4 text-charcoal-300">
            No app store, no download. Install Airbnbs Around Me straight from your browser — it opens full-screen,
            remembers your last search and still shows saved stays when you lose signal.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {installed ? (
              <span className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold">✓ Installed on this device</span>
            ) : canPrompt ? (
              <button type="button" onClick={() => void promptInstall()} className="rounded-full bg-coral-500 px-6 py-3 text-sm font-bold transition hover:bg-coral-600 active:scale-95">
                Install app
              </button>
            ) : isIOS ? (
              <button type="button" onClick={() => setIosHelp(true)} className="rounded-full bg-coral-500 px-6 py-3 text-sm font-bold transition hover:bg-coral-600 active:scale-95">
                Add to Home Screen
              </button>
            ) : null}
          </div>
        </div>

        <ol className="mt-10 grid gap-4 text-sm lg:mt-0 lg:w-[22rem]">
          <li className="rounded-2xl bg-white/5 p-5">
            <p className="font-bold">iPhone &amp; iPad</p>
            <p className="mt-1 text-charcoal-300">Open in Safari → Share → <b className="text-white">Add to Home Screen</b>.</p>
          </li>
          <li className="rounded-2xl bg-white/5 p-5">
            <p className="font-bold">Android</p>
            <p className="mt-1 text-charcoal-300">Chrome menu (⋮) → <b className="text-white">Install app</b>, or tap the button here.</p>
          </li>
          <li className="rounded-2xl bg-white/5 p-5">
            <p className="font-bold">Desktop</p>
            <p className="mt-1 text-charcoal-300">Click the install icon in the address bar of Chrome or Edge.</p>
          </li>
        </ol>
      </div>
      {iosHelp && <IosInstallDialog onClose={() => setIosHelp(false)} />}
    </section>
  );
}

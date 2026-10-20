'use client';

/**
 * "Add to Home Screen" support.
 *  - Chrome/Edge/Android fire `beforeinstallprompt`; we stash it and show our own button.
 *  - iOS Safari has no install API, so we show the manual Share → Add to Home Screen steps.
 */
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  }, [deferred]);

  return { canPrompt: deferred !== null, installed, isIOS, promptInstall };
}

/** Compact install button for headers. Renders nothing when install isn't possible. */
export function InstallButton({ className = '' }: { className?: string }) {
  const { canPrompt, installed, isIOS, promptInstall } = useInstall();
  const [iosHelp, setIosHelp] = useState(false);

  if (installed || (!canPrompt && !isIOS)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (canPrompt ? void promptInstall() : setIosHelp(true))}
        className={`items-center gap-2 rounded-full border border-charcoal-200 px-4 py-2.5 text-sm font-semibold transition hover:border-charcoal-900 ${className}`}
      >
        <span aria-hidden="true">⤓</span> Install app
      </button>
      {iosHelp && <IosInstallDialog onClose={() => setIosHelp(false)} />}
    </>
  );
}

export function IosInstallDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Install on iPhone">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-charcoal-900/50" />
      <div className="relative w-full rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-float sm:max-w-sm sm:rounded-3xl">
        <h2 className="text-lg font-extrabold">Install on your iPhone</h2>
        <ol className="mt-4 space-y-3 text-[15px] text-charcoal-700">
          <li><b>1.</b> Open this page in <b>Safari</b>.</li>
          <li><b>2.</b> Tap the <b>Share</b> button (the square with an arrow).</li>
          <li><b>3.</b> Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>
        </ol>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-full bg-charcoal-900 py-3 text-sm font-bold text-white">
          Got it
        </button>
      </div>
    </div>
  );
}

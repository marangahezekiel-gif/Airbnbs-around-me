import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Airbnbs Around Me — find stays near you in seconds',
    template: '%s · Airbnbs Around Me',
  },
  description:
    'Open the app, share your location and instantly see Airbnb stays around you on a live map — with prices, ratings and distance at a glance.',
  applicationName: 'Airbnbs Around Me',
  manifest: '/manifest.webmanifest',
  // iOS "Add to Home Screen" behaviour
  appleWebApp: { capable: true, title: 'Around Me', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'Airbnbs Around Me',
    title: 'Find perfect Airbnbs around you in seconds.',
    description: 'A live map of Airbnb stays around your current location.',
  },
  twitter: { card: 'summary_large_image', title: 'Airbnbs Around Me' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // use the full screen on notched phones
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

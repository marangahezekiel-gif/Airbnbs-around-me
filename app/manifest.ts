import type { MetadataRoute } from 'next';

/** Web App Manifest → served at /manifest.webmanifest. Makes the site installable. */
export default function manifest(): MetadataRoute.Manifest {
  const manifest = {
    id: '/',
    name: 'Airbnbs Around Me',
    short_name: 'Around Me',
    description: 'Find Airbnb stays around your current location on a live map.',
    // Installed app opens straight onto the map, centred on the user
    start_url: '/explore?locate=1&source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    categories: ['travel', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the app icon on Android for this quick action
    shortcuts: [
      {
        name: 'Around me now',
        short_name: 'Around me',
        url: '/explore?locate=1&source=shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };

  // Cast: newer manifest fields (id, shortcuts) aren't in every Next 14.x type definition.
  return manifest as MetadataRoute.Manifest;
}

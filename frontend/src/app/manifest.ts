// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import type { MetadataRoute } from 'next';

// Web App Manifest — /manifest.webmanifest хаягаар өгөгдөнө. Next.js энэ файлын
// конвенцийг таньж <link rel="manifest"> толгойг өөрөө нэмнэ.
//
// theme_color нь дизайн системийн брэнд токен (--dan-blue, globals.css) —
// #0064E1 cobalt. Токен өөрчлөгдвөл энд бас шинэчил.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ring System',
    short_name: 'Ring',
    description: 'Төрийн үйлчилгээний процессын дахин инженерчлэлийн платформ',
    lang: 'mn',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#0064E1',
    background_color: '#ffffff',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Аюулгүй бүс (safe zone) — марк төвийн 80%-д багтсан тул Android-ын
        // дурын маск (тойрог/squircle) доор тайрагдахгүй.
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

/* ============================================
   sw.js — Service Worker para cachear Pyodide y CDNs
   v1 - Cachea pyodide, numpy, matplotlib, fuentes, etc.
   ============================================ */

const CACHE_NAME = 'pyodide-cache-v1';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 días

// Hosts de los que queremos cachear respuestas
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'accounts.google.com'
];

// ============================================================
// INSTALACIÓN
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando…');
  self.skipWaiting();
});

// ============================================================
// ACTIVACIÓN
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Borrando caché antigua:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Estrategia cache-first para CDNs
// ============================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET
  if (req.method !== 'GET') return;

  // Solo cachear hosts de la lista o el propio origen
  const esCDN = CDN_HOSTS.includes(url.host);
  const esLocal = url.origin === self.location.origin;

  if (!esCDN && !esLocal) return;

  // No cachear llamadas a la API de Google Drive (son datos del usuario)
  if (url.host === 'www.googleapis.com') return;
  if (url.pathname.startsWith('/drive/')) return;

  // No cachear el propio sw.js (siempre queremos la última versión)
  if (url.pathname.endsWith('/sw.js')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);

      if (cached) {
        // Servir desde caché
        return cached;
      }

      try {
        const response = await fetch(req);

        // Solo cachear respuestas exitosas
        if (response && response.status === 200 && response.type !== 'opaque') {
          // Clonar antes de consumir
          const clone = response.clone();

          // Guardar en caché con metadata de tiempo
          cache.put(req, clone).catch(err => {
            console.warn('[SW] No se pudo cachear:', req.url, err);
          });
        }

        return response;
      } catch (err) {
        // Sin red y sin caché: devolver algo para que no rompa
        console.warn('[SW] Fetch falló:', req.url, err);

        // Si era un asset de pyodide, avisar
        if (url.host === 'cdn.jsdelivr.net' && url.pathname.includes('pyodide')) {
          return new Response(
            'Pyodide no está disponible. Revisa tu conexión.',
            { status: 503, headers: { 'Content-Type': 'text/plain' } }
          );
        }

        return new Response('', { status: 504 });
      }
    })
  );
});

// ============================================================
// MENSAJES DESDE EL CLIENTE
// ============================================================
self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  if (type === 'LIMPIAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Caché eliminado');
      event.ports[0]?.postMessage({ ok: true });
    });
  }

  if (type === 'ESTADO_CACHE') {
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        event.ports[0]?.postMessage({
          ok: true,
          entradas: keys.length,
          urls: keys.slice(0, 20).map(r => r.url)
        });
      });
    });
  }
});

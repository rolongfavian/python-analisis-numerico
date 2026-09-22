/* ============================================
   sw.js — Service Worker
   v2 - Cachea Pyodide, CDNs y extensiones bajo demanda
   ============================================ */

const CACHE_NAME = 'pyweb-cache-v2';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 días

const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/';

const ARCHIVOS_PYODIDE_CORE = [
  PYODIDE_BASE + 'pyodide.js',
  PYODIDE_BASE + 'pyodide.asm.js',
  PYODIDE_BASE + 'pyodide.asm.wasm',
  PYODIDE_BASE + 'pyodide.asm.data',
  PYODIDE_BASE + 'python_stdlib.zip',
  PYODIDE_BASE + 'repodata.json'
];

// ============================================================
// INSTALACIÓN
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando v2…');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Precargando Pyodide core…');

      let ok = 0;
      let fallidos = 0;

      const GRUPO = 3;
      for (let i = 0; i < ARCHIVOS_PYODIDE_CORE.length; i += GRUPO) {
        const grupo = ARCHIVOS_PYODIDE_CORE.slice(i, i + GRUPO);
        await Promise.allSettled(
          grupo.map(url =>
            cache.add(url)
              .then(() => { ok++; })
              .catch(err => {
                fallidos++;
                console.warn('[SW] Falló precacheo:', url, err.message);
              })
          )
        );
      }

      console.log(`[SW] Pyodide core: ${ok} OK, ${fallidos} fallidos`);
    })
  );

  self.skipWaiting();
});

// ============================================================
// ACTIVACIÓN
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando v2…');
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
// FETCH — cache-first para CDNs
// ============================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  const esCDN = CDN_HOSTS.includes(url.host);
  const esLocal = url.origin === self.location.origin;

  if (!esCDN && !esLocal) return;

  if (url.host === 'www.googleapis.com') return;
  if (url.host === 'accounts.google.com') return;
  if (url.pathname.includes('/drive/')) return;
  if (url.pathname.startsWith('/upload/')) return;
  if (url.pathname.endsWith('/sw.js')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const response = await fetch(req);

        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          cache.put(req, clone).catch(err => {
            console.warn('[SW] No se pudo cachear:', req.url, err.message);
          });
        }

        return response;
      } catch (err) {
        console.warn('[SW] Fetch falló:', req.url, err.message);

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
  const port = event.ports[0];

  // ----------------------------------------------------------
  // ESTADO DEL CACHÉ
  // ----------------------------------------------------------
  if (type === 'ESTADO_CACHE') {
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      port?.postMessage({
        ok: true,
        entradas: keys.length,
        urls: keys.map(r => r.url)
      });
    });
  }

  // ----------------------------------------------------------
  // COMPROBAR SI UN ARCHIVO ESTÁ EN CACHÉ
  // ----------------------------------------------------------
  if (type === 'ESTA_EN_CACHE') {
    const url = event.data.url;
    caches.open(CACHE_NAME).then(async (cache) => {
      const match = await cache.match(url, { ignoreSearch: true });
      port?.postMessage({ ok: true, enCache: !!match });
    });
  }

  // ----------------------------------------------------------
  // CACHEAR UN ARCHIVO BAJO DEMANDA
  // ----------------------------------------------------------
  if (type === 'CACHEAR_URL') {
    const url = event.data.url;
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const yaEsta = await cache.match(url, { ignoreSearch: true });
        if (yaEsta) {
          port?.postMessage({ ok: true, yaEstaba: true });
          return;
        }
        await cache.add(url);
        port?.postMessage({ ok: true, yaEstaba: false });
      } catch (e) {
        port?.postMessage({ ok: false, error: String(e) });
      }
    });
  }

  // ----------------------------------------------------------
  // CACHEAR VARIAS URLs A LA VEZ
  // ----------------------------------------------------------
  if (type === 'CACHEAR_URLS') {
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then(async (cache) => {
      let ok = 0;
      let fallidos = 0;
      const errores = [];

      for (const url of urls) {
        try {
          const yaEsta = await cache.match(url, { ignoreSearch: true });
          if (yaEsta) {
            ok++;
            continue;
          }
          await cache.add(url);
          ok++;
        } catch (e) {
          fallidos++;
          errores.push(`${url}: ${e.message}`);
          console.warn('[SW] Falló cachear:', url, e.message);
        }
      }

      console.log(`[SW] CACHEAR_URLS: ${ok} OK, ${fallidos} fallidos`);
      port?.postMessage({ ok: true, ok_count: ok, fallidos, errores });
    }).catch(e => {
      port?.postMessage({ ok: false, error: String(e) });
    });
  }

  // ----------------------------------------------------------
  // LIMPIAR CACHÉ
  // ----------------------------------------------------------
  if (type === 'LIMPIAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Caché eliminado');
      port?.postMessage({ ok: true });
    });
  }

  // ----------------------------------------------------------
  // PRECACHEAR EXTENSIÓN DE GRÁFICOS 2D
  // ----------------------------------------------------------
  if (type === 'PRECACHEAR_GRAFICOS_2D') {
    const urls = [
      PYODIDE_BASE + 'numpy-1.26.4-cp311-cp311-emscripten_3_1_45_wasm32.whl',
      PYODIDE_BASE + 'matplotlib-3.8.4-cp311-cp311-emscripten_3_1_45_wasm32.whl',
      PYODIDE_BASE + 'matplotlib_pyodide-0.2.2-py3-none-any.whl',
      PYODIDE_BASE + 'Pillow-10.3.0-cp311-cp311-emscripten_3_1_45_wasm32.whl',
      PYODIDE_BASE + 'cycler-0.12.1-py3-none-any.whl',
      PYODIDE_BASE + 'fonttools-4.51.0-py3-none-any.whl',
      PYODIDE_BASE + 'kiwisolver-1.4.5-cp311-cp311-emscripten_3_1_45_wasm32.whl',
      PYODIDE_BASE + 'packaging-23.2-py3-none-any.whl',
      PYODIDE_BASE + 'pyparsing-3.1.2-py3-none-any.whl',
      PYODIDE_BASE + 'python_dateutil-2.9.0.post0-py2.py3-none-any.whl',
      PYODIDE_BASE + 'pytz-2024.1-py2.py3-none-any.whl',
      PYODIDE_BASE + 'six-1.16.0-py2.py3-none-any.whl'
    ];

    caches.open(CACHE_NAME).then(async (cache) => {
      let ok = 0;
      let fallidos = 0;
      const GRUPO = 4;
      for (let i = 0; i < urls.length; i += GRUPO) {
        const grupo = urls.slice(i, i + GRUPO);
        await Promise.allSettled(
          grupo.map(async (url) => {
            try {
              const yaEsta = await cache.match(url, { ignoreSearch: true });
              if (!yaEsta) {
                await cache.add(url);
              }
              ok++;
            } catch (e) {
              fallidos++;
            }
          })
        );
      }
      port?.postMessage({ ok: true, ok_count: ok, fallidos, total: urls.length });
    });
  }
});

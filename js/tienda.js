/* ============================================
   tienda.js — Tienda de extensiones para Pyodide
   v3 - Catálogo ampliado (~20 extensiones) + comunicación robusta con SW
   ============================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'py_extensions_instaladas';

  // ============================================================
  // CATÁLOGO DE EXTENSIONES
  // ============================================================
  const CATALOGO = [
    // ============================================================
    // CÁLCULO NUMÉRICO
    // ============================================================
    {
      nombre: 'numpy',
      tipo: 'pyodide',
      categoria: 'Cálculo numérico',
      summary: 'Álgebra lineal, arrays multidimensionales, funciones matemáticas vectorizadas.',
      paquetes: ['numpy'],
      urls: [
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/numpy-1.26.4-cp311-cp311-emscripten_3_1_45_wasm32.whl'
      ]
    },
    {
      nombre: 'scipy',
      tipo: 'pyodide',
      categoria: 'Cálculo numérico',
      summary: 'Métodos numéricos: integración, optimización, interpolación, álgebra lineal, EDOs.',
      paquetes: ['scipy'],
      urls: []
    },
    {
      nombre: 'sympy',
      tipo: 'pyodide',
      categoria: 'Cálculo numérico',
      summary: 'Matemática simbólica: derivadas, integrales, resolución de ecuaciones exactas.',
      paquetes: ['sympy'],
      urls: []
    },
    {
      nombre: 'mpmath',
      tipo: 'pyodide',
      categoria: 'Cálculo numérico',
      summary: 'Aritmética de precisión arbitraria. Útil para validar métodos numéricos.',
      paquetes: ['mpmath'],
      urls: []
    },

    // ============================================================
    // GRÁFICOS Y VISUALIZACIÓN
    // ============================================================
    {
      nombre: 'matplotlib',
      tipo: 'pyodide',
      categoria: 'Gráficos',
      summary: 'Gráficos 2D: líneas, barras, contornos, scatter. Incluye numpy automáticamente.',
      paquetes: ['numpy', 'matplotlib'],
      urls: [
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/numpy-1.26.4-cp311-cp311-emscripten_3_1_45_wasm32.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/matplotlib-3.8.4-cp311-cp311-emscripten_3_1_45_wasm32.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/matplotlib_pyodide-0.2.2-py3-none-any.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/Pillow-10.3.0-cp311-cp311-emscripten_3_1_45_wasm32.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/cycler-0.12.1-py3-none-any.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/fonttools-4.51.0-py3-none-any.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/kiwisolver-1.4.5-cp311-cp311-emscripten_3_1_45_wasm32.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/packaging-23.2-py3-none-any.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyparsing-3.1.2-py3-none-any.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/python_dateutil-2.9.0.post0-py2.py3-none-any.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pytz-2024.1-py2.py3-none-any.whl',
        'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/six-1.16.0-py2.py3-none-any.whl'
      ]
    },
    {
      nombre: 'bokeh',
      tipo: 'pyodide',
      categoria: 'Gráficos',
      summary: 'Gráficos interactivos para la web. Alternativa moderna a matplotlib.',
      paquetes: ['bokeh'],
      urls: []
    },
    {
      nombre: 'plotly',
      tipo: 'pyodide',
      categoria: 'Gráficos',
      summary: 'Gráficos interactivos con muchas opciones. Ideal para dashboards.',
      paquetes: ['plotly'],
      urls: []
    },

    // ============================================================
    // DATOS
    // ============================================================
    {
      nombre: 'pandas',
      tipo: 'pyodide',
      categoria: 'Datos',
      summary: 'DataFrames y análisis de datos tabulares. La herramienta estándar.',
      paquetes: ['pandas'],
      urls: []
    },
    {
      nombre: 'polars',
      tipo: 'pyodide',
      categoria: 'Datos',
      summary: 'DataFrames rápidos en Rust. Alternativa a pandas para grandes volúmenes.',
      paquetes: ['polars'],
      urls: []
    },
    {
      nombre: 'pyarrow',
      tipo: 'pyodide',
      categoria: 'Datos',
      summary: 'Formato columnar Apache Arrow. Lectura/escritura eficiente de datos.',
      paquetes: ['pyarrow'],
      urls: []
    },

    // ============================================================
    // ESTADÍSTICA Y ML
    // ============================================================
    {
      nombre: 'statsmodels',
      tipo: 'pyodide',
      categoria: 'Estadística',
      summary: 'Modelos estadísticos, regresión, series temporales, tests.',
      paquetes: ['statsmodels'],
      urls: []
    },
    {
      nombre: 'scikit-learn',
      tipo: 'pyodide',
      categoria: 'Machine Learning',
      summary: 'Machine learning clásico: regresión, clustering, clasificación.',
      paquetes: ['scikit-learn'],
      urls: []
    },

    // ============================================================
    // MATEMÁTICAS AVANZADAS
    // ============================================================
    {
      nombre: 'networkx',
      tipo: 'pyodide',
      categoria: 'Matemáticas',
      summary: 'Teoría de grafos y redes. Análisis de estructuras complejas.',
      paquetes: ['networkx'],
      urls: []
    },
    {
      nombre: 'nltk',
      tipo: 'pyodide',
      categoria: 'Matemáticas',
      summary: 'Procesamiento de lenguaje natural. Análisis de texto.',
      paquetes: ['nltk'],
      urls: []
    },

    // ============================================================
    // GEOMETRÍA
    // ============================================================
    {
      nombre: 'shapely',
      tipo: 'pyodide',
      categoria: 'Geometría',
      summary: 'Geometría computacional: puntos, líneas, polígonos, operaciones.',
      paquetes: ['shapely'],
      urls: []
    },

    // ============================================================
    // UTILIDADES (desde PyPI con micropip)
    // ============================================================
    {
      nombre: 'rich',
      tipo: 'pypi',
      categoria: 'Utilidades',
      summary: 'Salida de consola con formato, tablas, colores y progreso.',
      paquetes: ['rich'],
      urls: []
    },
    {
      nombre: 'tabulate',
      tipo: 'pypi',
      categoria: 'Utilidades',
      summary: 'Tablas formateadas en texto plano. Perfecto para mostrar iteraciones.',
      paquetes: ['tabulate'],
      urls: []
    },
    {
      nombre: 'tqdm',
      tipo: 'pypi',
      categoria: 'Utilidades',
      summary: 'Barras de progreso. Ideal para métodos numéricos iterativos.',
      paquetes: ['tqdm'],
      urls: []
    },
    {
      nombre: 'regex',
      tipo: 'pypi',
      categoria: 'Utilidades',
      summary: 'Expresiones regulares avanzadas. Más rápido que el módulo re estándar.',
      paquetes: ['regex'],
      urls: []
    },
    {
      nombre: 'pyyaml',
      tipo: 'pypi',
      categoria: 'Utilidades',
      summary: 'Lectura y escritura de archivos YAML. Configuración de proyectos.',
      paquetes: ['pyyaml'],
      urls: []
    },
    {
      nombre: 'requests',
      tipo: 'pypi',
      categoria: 'Utilidades',
      summary: 'Peticiones HTTP. Consumir APIs desde Python en el navegador.',
      paquetes: ['requests'],
      urls: []
    }
  ];

  // ============================================================
  // ESTADO
  // ============================================================
  let catalogoActual = [];
  let filtroTexto = '';
  let filtroCategoria = 'Todas';
  let cargando = false;

  // ============================================================
  // PERSISTENCIA
  // ============================================================
  function leerInstaladas() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) { return []; }
  }

  function guardarInstaladas(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }

  function agregarInstalada(nombre) {
    const lista = leerInstaladas();
    if (!lista.includes(nombre)) {
      lista.push(nombre);
      guardarInstaladas(lista);
    }
  }

  function quitarInstalada(nombre) {
    guardarInstaladas(leerInstaladas().filter(n => n !== nombre));
  }

  // ============================================================
  // SERVICE WORKER — COMUNICACIÓN ROBUSTA
  // ============================================================
  function swPostMessage(msg, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker) {
        return reject(new Error('Service Worker no soportado'));
      }

      const enviar = () => {
        const controller = navigator.serviceWorker.controller;
        if (!controller) {
          return reject(new Error('SW no controla la página aún'));
        }

        const channel = new MessageChannel();
        let resuelto = false;

        const timer = setTimeout(() => {
          if (!resuelto) {
            resuelto = true;
            reject(new Error('Timeout esperando respuesta del SW'));
          }
        }, timeoutMs);

        channel.port1.onmessage = (e) => {
          if (resuelto) return;
          resuelto = true;
          clearTimeout(timer);
          resolve(e.data);
        };

        try {
          controller.postMessage(msg, [channel.port2]);
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      };

      if (navigator.serviceWorker.controller) {
        enviar();
        return;
      }

      navigator.serviceWorker.ready.then(() => {
        if (navigator.serviceWorker.controller) {
          enviar();
        } else {
          const onCtrl = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onCtrl);
            enviar();
          };
          navigator.serviceWorker.addEventListener('controllerchange', onCtrl);
          setTimeout(() => {
            if (!navigator.serviceWorker.controller) {
              reject(new Error('SW nunca tomó el control'));
            }
          }, timeoutMs);
        }
      }).catch(reject);
    });
  }

  async function estaEnCache(url) {
    try {
      const resp = await swPostMessage({ type: 'ESTA_EN_CACHE', url });
      return resp?.enCache === true;
    } catch (e) {
      console.warn('[tienda] estaEnCache falló:', e.message);
      return false;
    }
  }

  async function cachearUrls(urls) {
    if (!urls || urls.length === 0) return true;
    try {
      const resp = await swPostMessage({ type: 'CACHEAR_URLS', urls }, 120000);
      return resp?.ok === true;
    } catch (e) {
      console.warn('[tienda] Error cacheando URLs:', e.message);
      return false;
    }
  }

  // ============================================================
  // ESTADO DE CADA EXTENSIÓN
  // ============================================================
  function estadoExtension(ext) {
    const instaladas = leerInstaladas();
    const registrada = instaladas.includes(ext.nombre);
    const cargada = typeof window.estaCargado === 'function' && window.estaCargado(ext.nombre);

    if (registrada && cargada) return 'instalada';
    if (registrada && !cargada) return 'pendiente';
    return 'disponible';
  }

  // ============================================================
  // FILTROS
  // ============================================================
  function getCategorias() {
    const set = new Set(['Todas']);
    catalogoActual.forEach(p => set.add(p.categoria));
    return Array.from(set);
  }

  function filtrarCatalogo() {
    const q = filtroTexto.trim().toLowerCase();
    return catalogoActual.filter(p => {
      if (filtroCategoria !== 'Todas' && p.categoria !== filtroCategoria) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q)
        || (p.summary || '').toLowerCase().includes(q);
    });
  }

  // ============================================================
  // RENDERIZADO
  // ============================================================
  function renderCatalogo() {
    const cont = document.getElementById('tienda-catalogo');
    if (!cont) return;

    renderCategorias();

    if (cargando) {
      cont.innerHTML = '<div class="tienda-cargando">Cargando catálogo…</div>';
      return;
    }

    const lista = filtrarCatalogo();
    if (lista.length === 0) {
      cont.innerHTML = '<div class="tienda-vacio">Sin extensiones que coincidan.</div>';
      return;
    }

    cont.innerHTML = '';
    lista.forEach(ext => {
      const estado = estadoExtension(ext);
      const card = document.createElement('div');
      card.className = 'tienda-card' + (estado === 'instalada' ? ' ya-instalada' : '') + (estado === 'pendiente' ? ' pendiente' : '');

      let btnClase = 'tienda-btn-instalar';
      let btnTexto = 'Instalar';
      let btnDisabled = false;

      if (estado === 'instalada') {
        btnClase += ' instalado';
        btnTexto = '✓ Instalada';
        btnDisabled = true;
      } else if (estado === 'pendiente') {
        btnClase += ' reinstalar';
        btnTexto = '↻ Reinstalar';
      }

      card.innerHTML = `
        <div class="tienda-card-info">
          <div class="tienda-card-nombre">${escapeHtml(ext.nombre)}</div>
          <div class="tienda-card-desc">${escapeHtml(ext.summary)}</div>
          <span class="tienda-card-cat">${escapeHtml(ext.categoria)}</span>
        </div>
        <button class="${btnClase}" ${btnDisabled ? 'disabled' : ''}>${btnTexto}</button>
      `;

      const btn = card.querySelector('button');
      if (!btnDisabled) {
        btn.addEventListener('click', () => instalarDesdeTienda(ext, btn));
      }

      cont.appendChild(card);
    });
  }

  function renderCategorias() {
    const cont = document.getElementById('tienda-categorias');
    if (!cont) return;

    const cats = getCategorias();
    cont.innerHTML = '';

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tienda-cat-btn' + (cat === filtroCategoria ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        filtroCategoria = cat;
        renderCatalogo();
      });
      cont.appendChild(btn);
    });
  }

  // ============================================================
  // INSTALAR
  // ============================================================
  async function instalarDesdeTienda(ext, boton) {
    const result = document.getElementById('tienda-result');

    const mensaje = `Vas a instalar "${ext.nombre}". Puede pesar varios MB.`;
    abrirAvisoDescarga(mensaje, async () => {
      if (result) result.innerHTML = '<div class="tienda-msg info">Preparando instalación…</div>';
      boton.disabled = true;
      boton.textContent = 'Instalando…';
      boton.classList.add('instalando');

      if (typeof window.isPyodideReady !== 'function' || !window.isPyodideReady()) {
        if (result) result.innerHTML = '<div class="tienda-msg error">Python no está listo todavía. Espera unos segundos y reintenta.</div>';
        boton.disabled = false;
        boton.textContent = 'Instalar';
        boton.classList.remove('instalando');
        return;
      }

      if (ext.urls && ext.urls.length > 0) {
        if (result) result.innerHTML = '<div class="tienda-msg info">Cacheando archivos en el navegador…</div>';
        const cacheOk = await cachearUrls(ext.urls);
        if (!cacheOk) {
          console.warn('[tienda] No se pudieron cachear todas las URLs. Se intentará cargar directamente desde el CDN.');
        }
      }

      if (result) result.innerHTML = '<div class="tienda-msg info">Cargando en Python… (puede tardar la primera vez)</div>';
      let resp;
      try {
        if (ext.tipo === 'pyodide') {
          for (const pkg of ext.paquetes) {
            if (result) result.innerHTML = `<div class="tienda-msg info">Cargando "${pkg}"…</div>`;
            const r = await window.cargarPaquete(pkg);
            if (!r.ok) throw new Error(r.mensaje);
          }
          resp = { ok: true, mensaje: `${ext.nombre} instalado correctamente.` };
        } else {
          resp = await window.instalarDesdePyPI(ext.nombre);
        }
      } catch (e) {
        resp = { ok: false, mensaje: String(e.message || e) };
      }

      if (resp.ok) {
        agregarInstalada(ext.nombre);
        boton.textContent = '✓ Instalada';
        boton.classList.remove('instalando');
        boton.classList.add('instalado');
        if (result) result.innerHTML = `<div class="tienda-msg ok">✅ ${escapeHtml(resp.mensaje)}</div>`;
        renderInstaladas();
        renderCatalogo();
        if (typeof showToast === 'function') showToast('Instalada: ' + ext.nombre);
      } else {
        boton.textContent = 'Error';
        boton.classList.remove('instalando');
        boton.classList.add('error');
        boton.title = resp.mensaje;
        if (result) result.innerHTML = `<div class="tienda-msg error">❌ ${escapeHtml(resp.mensaje)}</div>`;
        setTimeout(() => {
          boton.textContent = 'Instalar';
          boton.classList.remove('error');
          boton.disabled = false;
        }, 4000);
      }
    });
  }

  // ============================================================
  // LISTA DE INSTALADAS
  // ============================================================
  function renderInstaladas() {
    const cont = document.getElementById('tienda-instaladas');
    if (!cont) return;

    const lista = leerInstaladas();
    if (lista.length === 0) {
      cont.innerHTML = '<div class="tienda-vacio">Aún no has instalado ninguna extensión.</div>';
      return;
    }

    cont.innerHTML = '';
    lista.forEach(nombre => {
      const chip = document.createElement('span');
      chip.className = 'tienda-chip';
      chip.innerHTML = `<span>${escapeHtml(nombre)}</span>`;
      const del = document.createElement('button');
      del.type = 'button';
      del.title = 'Quitar de la lista';
      del.textContent = '×';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        quitarInstalada(nombre);
        renderInstaladas();
        renderCatalogo();
      });
      chip.appendChild(del);
      cont.appendChild(chip);
    });
  }

  // ============================================================
  // MODAL
  // ============================================================
  function abrirTienda() {
    const modal = document.getElementById('modal-tienda');
    if (!modal) return;

    const result = document.getElementById('tienda-result');
    if (result) result.innerHTML = '';

    const search = document.getElementById('tienda-search');
    if (search) search.value = '';

    filtroTexto = '';
    filtroCategoria = 'Todas';
    catalogoActual = CATALOGO.slice();

    renderInstaladas();
    renderCatalogo();

    modal.classList.add('open');

    setTimeout(() => {
      if (search) search.focus();
    }, 150);
  }

  function cerrarTienda() {
    const modal = document.getElementById('modal-tienda');
    if (modal) modal.classList.remove('open');
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    const search = document.getElementById('tienda-search');
    if (search) {
      search.addEventListener('input', (e) => {
        filtroTexto = e.target.value;
        renderCatalogo();
      });
    }

    const recargar = document.getElementById('tienda-recargar');
    if (recargar) {
      recargar.addEventListener('click', () => {
        catalogoActual = CATALOGO.slice();
        renderCatalogo();
      });
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.abrirTienda = abrirTienda;
  window.cerrarTienda = cerrarTienda;
  window.abrirAvisoDescarga = abrirAvisoDescarga;
  window.confirmarAvisoDescarga = confirmarAvisoDescarga;
  window.cancelarAvisoDescarga = cancelarAvisoDescarga;
})();

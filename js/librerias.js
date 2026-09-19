/* ============================================
   librerias.js — Tienda de librerías Python
   v2 - Catálogo con API de PyScript + filtro + categorías
   ============================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'libs_instaladas';
  const CACHE_KEY = 'libs_catalogo_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

  // ============================================================
  // CATÁLOGO LOCAL (fallback si falla la API)
  // ============================================================
  const CATALOGO_LOCAL = [
    // Cálculo numérico
    { name: 'numpy',           summary: 'Álgebra lineal y arrays multidimensionales',                  category: 'Cálculo numérico' },
    { name: 'scipy',           summary: 'Métodos numéricos: integración, optimización, EDOs',         category: 'Cálculo numérico' },
    { name: 'sympy',           summary: 'Matemática simbólica: derivadas, integrales, ecuaciones',     category: 'Cálculo numérico' },
    { name: 'mpmath',          summary: 'Aritmética de precisión arbitraria',                        category: 'Cálculo numérico' },
    { name: 'numpy-financial', summary: 'Funciones financieras vectorizadas',                        category: 'Cálculo numérico' },

    // Datos y gráficos
    { name: 'pandas',          summary: 'DataFrames y análisis de datos tabulares',                  category: 'Datos y gráficos' },
    { name: 'matplotlib',      summary: 'Gráficos 2D y 3D de calidad de publicación',                category: 'Datos y gráficos' },
    { name: 'plotly',          summary: 'Gráficos interactivos en el navegador',                     category: 'Datos y gráficos' },
    { name: 'bokeh',           summary: 'Visualización interactiva para web',                        category: 'Datos y gráficos' },
    { name: 'altair',          summary: 'Gramática declarativa de gráficos',                         category: 'Datos y gráficos' },
    { name: 'seaborn',         summary: 'Gráficos estadísticos sobre matplotlib',                    category: 'Datos y gráficos' },
    { name: 'geopandas',       summary: 'Datos geoespaciales con pandas',                            category: 'Datos y gráficos' },

    // Estadística y ML
    { name: 'scikit-learn',    summary: 'Machine learning clásico: clasificación, regresión, clustering', category: 'Estadística y ML' },
    { name: 'statsmodels',     summary: 'Modelos estadísticos y tests de hipótesis',                 category: 'Estadística y ML' },
    { name: 'networkx',        summary: 'Análisis de grafos y redes complejas',                      category: 'Estadística y ML' },
    { name: 'astropy',         summary: 'Astronomía y física de partículas',                         category: 'Estadística y ML' },

    // Utilidades
    { name: 'regex',           summary: 'Expresiones regulares avanzadas',                           category: 'Utilidades' },
    { name: 'python-dateutil', summary: 'Fechas y horas con parsing avanzado',                       category: 'Utilidades' },
    { name: 'pytz',            summary: 'Zonas horarias del mundo',                                  category: 'Utilidades' },
    { name: 'tabulate',        summary: 'Tablas formateadas en texto plano',                         category: 'Utilidades' },
    { name: 'rich',            summary: 'Salida de consola con colores y formato',                   category: 'Utilidades' },
    { name: 'tqdm',            summary: 'Barras de progreso elegantes',                              category: 'Utilidades' },
    { name: 'jsonschema',      summary: 'Validación de estructuras JSON',                            category: 'Utilidades' },
    { name: 'pyyaml',          summary: 'Parsing y escritura de YAML',                               category: 'Utilidades' },
    { name: 'toml',            summary: 'Parsing de archivos TOML',                                  category: 'Utilidades' },
    { name: 'pyparsing',       summary: 'Construcción de parsers personalizados',                    category: 'Utilidades' },
    { name: 'pytest',          summary: 'Framework de testing',                                      category: 'Utilidades' },
    { name: 'micropip',        summary: 'Gestor de paquetes para Pyodide (ya incluido)',              category: 'Utilidades' }
  ];

  // ============================================================
  // ESTADO
  // ============================================================
  let catalogoActual = [];
  let filtroTexto = '';
  let filtroCategoria = 'Todas';
  let cargando = false;

  // ============================================================
  // PERSISTENCIA LOCAL
  // ============================================================
  function leerInstaladas() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
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
    guardarInstaladas(leerInstaladas().filter(x => x !== nombre));
  }

  // ============================================================
  // CACHÉ DEL CATÁLOGO
  // ============================================================
  function leerCacheCatalogo() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) return null;
      return data.paquetes;
    } catch (e) {
      return null;
    }
  }

  function guardarCacheCatalogo(paquetes) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        paquetes: paquetes
      }));
    } catch (e) {
      // localStorage lleno, ignorar
    }
  }

  // ============================================================
  // CARGA DEL CATÁLOGO (API + fallback local)
  // ============================================================
  async function cargarCatalogo(forzar) {
    if (cargando) return;
    cargando = true;
    renderCatalogo();

    // 1) Intentar caché primero
    if (!forzar) {
      const cache = leerCacheCatalogo();
      if (cache && cache.length > 0) {
        catalogoActual = cache;
        cargando = false;
        renderCatalogo();
        return;
      }
    }

    // 2) Intentar API
    try {
      const res = await fetch('https://packages.pyscript.net/api/top_100_pypi_packages.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // Filtrar los soportados (status === "green")
      const paquetes = (data.packages || [])
        .filter(p => p.status === 'green')
        .map(p => ({
          name: p.name,
          summary: p.summary || '',
          category: 'Populares en PyPI'
        }));

      if (paquetes.length > 0) {
        catalogoActual = paquetes;
        guardarCacheCatalogo(paquetes);
        cargando = false;
        renderCatalogo();
        return;
      }
      throw new Error('API vacía');
    } catch (e) {
      console.warn('[tienda] API no disponible, uso catálogo local:', e.message);
    }

    // 3) Fallback local
    catalogoActual = CATALOGO_LOCAL.slice();
    cargando = false;
    renderCatalogo();
  }

  // ============================================================
  // RENDERIZADO DE LA TIENDA
  // ============================================================
  function getCategorias() {
    const set = new Set(['Todas']);
    catalogoActual.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }

  function filtrarCatalogo() {
    const q = filtroTexto.trim().toLowerCase();
    return catalogoActual.filter(p => {
      if (filtroCategoria !== 'Todas' && p.category !== filtroCategoria) return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q)
        || (p.summary || '').toLowerCase().includes(q);
    });
  }

  function renderCatalogo() {
    const cont = document.getElementById('libs-catalogo');
    if (!cont) return;

    // Renderizar chips de categorías
    renderCategorias();

    if (cargando) {
      cont.innerHTML = '<div class="libs-cargando">Cargando catálogo de librerías…</div>';
      return;
    }

    const lista = filtrarCatalogo();

    if (lista.length === 0) {
      cont.innerHTML = '<div class="libs-empty">No hay librerías que coincidan con la búsqueda.</div>';
      return;
    }

    const instaladas = leerInstaladas();
    cont.innerHTML = '';

    lista.forEach(pkg => {
      const yaInstalado = instaladas.includes(pkg.name);
      const card = document.createElement('div');
      card.className = 'libs-card' + (yaInstalado ? ' ya-instalada' : '');

      card.innerHTML = `
        <div class="libs-card-info">
          <div class="libs-card-nombre">${escapeHtml(pkg.name)}</div>
          <div class="libs-card-desc">${escapeHtml(pkg.summary || 'Sin descripción.')}</div>
          ${pkg.category ? `<span class="libs-card-cat">${escapeHtml(pkg.category)}</span>` : ''}
        </div>
        <button class="libs-btn-instalar ${yaInstalado ? 'instalado' : ''}"
                data-pkg="${escapeHtml(pkg.name)}"
                ${yaInstalado ? 'disabled' : ''}>
          ${yaInstalado ? '✓ Instalado' : 'Instalar'}
        </button>
      `;

      const btn = card.querySelector('button');
      if (!yaInstalado) {
        btn.addEventListener('click', () => instalarDesdeTienda(pkg.name, btn));
      }

      cont.appendChild(card);
    });
  }

  function renderCategorias() {
    const cont = document.getElementById('libs-categorias');
    if (!cont) return;

    const cats = getCategorias();
    cont.innerHTML = '';

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'libs-cat-btn' + (cat === filtroCategoria ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        filtroCategoria = cat;
        renderCatalogo();
      });
      cont.appendChild(btn);
    });
  }

  // ============================================================
  // INSTALAR DESDE LA TIENDA
  // ============================================================
  async function instalarDesdeTienda(nombre, boton) {
    const result = document.getElementById('libs-result');

    if (typeof window.instalarPaquetePyodide !== 'function') {
      if (result) result.innerHTML = '<div class="libs-msg error">Pyodide aún no está listo. Espera unos segundos.</div>';
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Instalando…';
    boton.classList.add('instalando');
    if (result) result.innerHTML = '';

    const resp = await window.instalarPaquetePyodide(nombre);

    if (resp.ok) {
      boton.textContent = '✓ Instalado';
      boton.classList.remove('instalando');
      boton.classList.add('instalado');
      agregarInstalada(nombre);
      renderInstaladas();
      window.dispatchEvent(new CustomEvent('libreria-instalada', { detail: { nombre } }));
    } else {
      boton.textContent = 'Error';
      boton.classList.remove('instalando');
      boton.classList.add('error');
      boton.title = resp.mensaje;
      if (result) result.innerHTML = `<div class="libs-msg error">❌ ${escapeHtml(resp.mensaje)}</div>`;
      setTimeout(() => {
        boton.textContent = 'Instalar';
        boton.classList.remove('error');
        boton.disabled = false;
      }, 3500);
    }
  }

  // ============================================================
  // MODAL
  // ============================================================
  function abrirModalLibrerias() {
    const modal = document.getElementById('modal-libs');
    if (!modal) return;

    document.getElementById('libs-result').innerHTML = '';
    const search = document.getElementById('libs-search');
    if (search) search.value = '';
    filtroTexto = '';
    filtroCategoria = 'Todas';

    renderInstaladas();
    modal.classList.add('open');

    // Cargar catálogo (con caché si existe)
    if (catalogoActual.length === 0) {
      cargarCatalogo(false);
    } else {
      renderCatalogo();
    }

    setTimeout(() => {
      if (search) search.focus();
    }, 150);
  }

  function cerrarModalLibrerias() {
    const modal = document.getElementById('modal-libs');
    if (modal) modal.classList.remove('open');
  }

  // ============================================================
  // LISTA DE INSTALADAS (CHIPS)
  // ============================================================
  function renderInstaladas() {
    const cont = document.getElementById('libs-instaladas');
    if (!cont) return;

    const lista = leerInstaladas();
    if (lista.length === 0) {
      cont.innerHTML = '<div class="libs-empty">Aún no has instalado ninguna librería.</div>';
      return;
    }

    cont.innerHTML = '';
    lista.forEach(nombre => {
      const chip = document.createElement('span');
      chip.className = 'libs-chip';
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
  // REINSTALAR AL INICIAR
  // ============================================================
  async function reinstalarAlIniciar() {
    const lista = leerInstaladas();
    if (lista.length === 0) return;

    const esperarPyodide = () => new Promise(resolve => {
      if (window.isPyodideReady && window.isPyodideReady()) return resolve();
      window.addEventListener('pyodide-ready', resolve, { once: true });
    });

    await esperarPyodide();

    console.log('[tienda] Reinstalando', lista.length, 'librería(s)…');
    for (const nombre of lista) {
      const resp = await window.instalarPaquetePyodide(nombre);
      if (!resp.ok) {
        console.warn(`[tienda] No se pudo reinstalar "${nombre}":`, resp.mensaje);
      }
    }
    console.log('[tienda] Reinstalación terminada.');
  }

  // ============================================================
  // UTILIDADES
  // ============================================================
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  function init() {
    renderInstaladas();
    reinstalarAlIniciar();

    const search = document.getElementById('libs-search');
    if (search) {
      search.addEventListener('input', (e) => {
        filtroTexto = e.target.value;
        renderCatalogo();
      });
    }

    const recargar = document.getElementById('libs-recargar');
    if (recargar) {
      recargar.addEventListener('click', () => {
        localStorage.removeItem(CACHE_KEY);
        cargarCatalogo(true);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.abrirModalLibrerias = abrirModalLibrerias;
  window.cerrarModalLibrerias = cerrarModalLibrerias;
  window.cargarCatalogo = cargarCatalogo;
})();

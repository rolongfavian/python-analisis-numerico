/* ============================================
   librerias.js — UI para instalar librerías Python
   ============================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'libs_instaladas';

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

  // ============================================================
  // ABRIR / CERRAR MODAL
  // ============================================================

  function abrirModalLibrerias() {
    const modal = document.getElementById('modal-libs');
    if (!modal) return;
    document.getElementById('libs-input').value = '';
    document.getElementById('libs-result').innerHTML = '';
    renderInstaladas();
    modal.classList.add('open');
    setTimeout(() => {
      document.getElementById('libs-input').focus();
    }, 100);
  }

  function cerrarModalLibrerias() {
    const modal = document.getElementById('modal-libs');
    if (modal) modal.classList.remove('open');
  }

  // ============================================================
  // INSTALAR
  // ============================================================

  async function instalarDesdeModal(nombre) {
    const input = document.getElementById('libs-input');
    const result = document.getElementById('libs-result');
    const nombrePaquete = (nombre || input.value || '').trim();

    if (!nombrePaquete) {
      result.innerHTML = '<div class="libs-msg error">Escribe el nombre de una librería.</div>';
      return;
    }

    result.innerHTML = `<div class="libs-msg info">Instalando <strong>${escapeHtml(nombrePaquete)}</strong>… esto puede tardar unos segundos.</div>`;

    if (typeof window.instalarPaquetePyodide !== 'function') {
      result.innerHTML = '<div class="libs-msg error">Pyodide no está cargado todavía. Espera unos segundos e inténtalo de nuevo.</div>';
      return;
    }

    const resp = await window.instalarPaquetePyodide(nombrePaquete);

    if (resp.ok) {
      agregarInstalada(nombrePaquete);
      result.innerHTML = `<div class="libs-msg ok">✅ ${escapeHtml(resp.mensaje)}</div>`;
      input.value = '';
      renderInstaladas();
      window.dispatchEvent(new CustomEvent('libreria-instalada', { detail: { nombre: nombrePaquete } }));
    } else {
      result.innerHTML = `<div class="libs-msg error">❌ ${escapeHtml(resp.mensaje)}</div>`;
    }
  }

  // ============================================================
  // SUGERENCIAS RÁPIDAS
  // ============================================================

  const SUGERENCIAS = [
    { nombre: 'numpy', desc: 'Álgebra lineal y arrays' },
    { nombre: 'scipy', desc: 'Métodos numéricos' },
    { nombre: 'sympy', desc: 'Matemática simbólica' },
    { nombre: 'matplotlib', desc: 'Gráficos' },
    { nombre: 'pandas', desc: 'Datos tabulares' },
    { nombre: 'mpmath', desc: 'Precisión arbitraria' }
  ];

  function renderSugerencias() {
    const cont = document.getElementById('libs-sugerencias');
    if (!cont) return;

    cont.innerHTML = '';
    SUGERENCIAS.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'libs-sugerencia';
      btn.innerHTML = `<strong>${s.nombre}</strong><span>${s.desc}</span>`;
      btn.addEventListener('click', () => instalarDesdeModal(s.nombre));
      cont.appendChild(btn);
    });
  }

  // ============================================================
  // LISTA DE INSTALADAS
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
        const nueva = leerInstaladas().filter(x => x !== nombre);
        guardarInstaladas(nueva);
        renderInstaladas();
      });
      chip.appendChild(del);
      cont.appendChild(chip);
    });
  }

  // ============================================================
  // RE-INSTALAR AL CARGAR LA PÁGINA
  // ============================================================

  async function reinstalarAlIniciar() {
    const lista = leerInstaladas();
    if (lista.length === 0) return;

    const esperarPyodide = () => new Promise(resolve => {
      if (window.isPyodideReady && window.isPyodideReady()) return resolve();
      window.addEventListener('pyodide-ready', resolve, { once: true });
    });

    await esperarPyodide();

    console.log('[librerias] Reinstalando', lista.length, 'librería(s)…');
    for (const nombre of lista) {
      const resp = await window.instalarPaquetePyodide(nombre);
      if (!resp.ok) {
        console.warn(`[librerias] No se pudo reinstalar "${nombre}":`, resp.mensaje);
      }
    }
    console.log('[librerias] Reinstalación terminada.');
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
    renderSugerencias();
    renderInstaladas();
    reinstalarAlIniciar();

    const input = document.getElementById('libs-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          instalarDesdeModal();
        }
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
  window.instalarDesdeModal = instalarDesdeModal;
})();

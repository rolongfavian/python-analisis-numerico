/* ============================================
   pyodide.js — Motor Python en background
   v7 - Logs detallados de carga de paquetes
   ============================================ */

(function () {
  'use strict';

  // ============================================================
  // ESTADO
  // ============================================================
  let pyodide = null;
  let pyodideReady = false;
  let pyodideCargando = false;
  let cargaActual = 0;
  let paquetesInstalados = [];
  let micropipListo = false;

  const EXTENSIONES_CACHE_KEY = 'py_extensions_instaladas';

  // ============================================================
  // BARRA DE PROGRESO
  // ============================================================
  function crearBarra() {
    if (document.getElementById('pyodide-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'pyodide-bar';
    bar.innerHTML = `
      <span class="py-status">Cargando Python en segundo plano…</span>
      <div class="py-progress">
        <div class="py-progress-fill" id="py-progress-fill"></div>
      </div>
    `;
    document.body.appendChild(bar);
  }

  function actualizarBarra(mensaje, porcentaje) {
    const bar = document.getElementById('pyodide-bar');
    const status = bar?.querySelector('.py-status');
    const fill = document.getElementById('py-progress-fill');

    if (status && mensaje) status.textContent = mensaje;
    if (fill && typeof porcentaje === 'number') {
      fill.style.width = Math.max(0, Math.min(100, porcentaje)) + '%';
    }
  }

  function marcarBarraLista() {
    const bar = document.getElementById('pyodide-bar');
    if (!bar) return;
    bar.classList.add('ready');
    actualizarBarra('Python listo', 100);
    setTimeout(() => {
      bar.classList.add('hidden');
    }, 1500);
  }

  function marcarBarraError(msg) {
    const bar = document.getElementById('pyodide-bar');
    if (!bar) return;
    bar.classList.add('error');
    actualizarBarra('Error: ' + msg, 0);
  }

  // ============================================================
  // CARGA EN BACKGROUND
  // ============================================================
  async function cargarPyodide() {
    if (pyodideReady || pyodideCargando) return;
    pyodideCargando = true;

    crearBarra();
    actualizarBarra('Cargando Python en segundo plano…', 5);

    try {
      actualizarBarra('Descargando intérprete…', 15);
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
      });
      actualizarBarra('Configurando entorno…', 60);

      await pyodide.runPythonAsync(`
import sys, io
_buf = io.StringIO()
sys.stdout = _buf
      `);

      actualizarBarra('Preparando micropip…', 75);
      try {
        await pyodide.loadPackage('micropip');
        micropipListo = true;
        console.log('[pyodide] micropip cargado');
      } catch (e) {
        console.warn('[pyodide] micropip no disponible:', e);
      }

      try {
        const guardadas = JSON.parse(localStorage.getItem(EXTENSIONES_CACHE_KEY) || '[]');
        console.log('[pyodide] Extensiones registradas en localStorage:', guardadas.length);
      } catch (e) {
        // ignorar
      }

      pyodideReady = true;
      pyodideCargando = false;
      actualizarBarra('Python listo', 100);
      marcarBarraLista();

      window.dispatchEvent(new CustomEvent('pyodide-ready'));

    } catch (err) {
      pyodideCargando = false;
      console.error('[pyodide] Error fatal:', err);
      marcarBarraError(err.message || 'No se pudo cargar');
    }
  }

  // ============================================================
  // EJECUCIÓN DE CÓDIGO
  // ============================================================
  async function executeCode(code) {
    if (!pyodideReady) {
      throw new Error('Python todavía no está listo. Espera unos segundos.');
    }

    await pyodide.runPythonAsync(`
import sys, io
_buf = io.StringIO()
sys.stdout = _buf
    `);

    try {
      await pyodide.runPythonAsync(`
try:
    import matplotlib.pyplot as _plt
    _plt.close('all')
except Exception:
    pass
      `);
    } catch (e) { /* ok */ }

    let errorEjecucion = null;
    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      errorEjecucion = String(err);
    }

    let imagenes = [];
    try {
      const imgsJson = await pyodide.runPythonAsync(`
import json as _json
_imgs = []
try:
    import matplotlib.pyplot as _plt
    import io as _io
    import base64 as _b64
    for _num in _plt.get_fignums():
        _fig = _plt.figure(_num)
        _buf_img = _io.BytesIO()
        _fig.savefig(_buf_img, format='png', dpi=100, bbox_inches='tight')
        _buf_img.seek(0)
        _b64_str = _b64.b64encode(_buf_img.read()).decode('ascii')
        _imgs.append("data:image/png;base64," + _b64_str)
    _plt.close('all')
except Exception:
    pass
_json.dumps(_imgs)
      `);
      imagenes = JSON.parse(imgsJson);
    } catch (e) {
      console.warn('[pyodide] Error capturando imágenes:', e);
    }

    const stdout = pyodide.runPython("sys.stdout.getvalue()");

    return { stdout, imagenes, errorEjecucion };
  }

  // ============================================================
  // CARGA DE PAQUETES (usado por la tienda)
  // ============================================================
  async function cargarPaquete(nombre) {
    if (!pyodideReady) {
      return { ok: false, mensaje: 'Python no está listo todavía. Espera unos segundos.' };
    }
    if (paquetesInstalados.includes(nombre)) {
      console.log(`[pyodide] "${nombre}" ya estaba cargado en memoria`);
      return { ok: true, mensaje: 'Ya estaba cargado.', yaEstaba: true };
    }

    console.log(`[pyodide] Cargando paquete: "${nombre}"…`);
    try {
      await pyodide.loadPackage(nombre);
      paquetesInstalados.push(nombre);
      console.log(`[pyodide] ✓ Paquete "${nombre}" cargado OK`);
      return { ok: true, mensaje: `Paquete "${nombre}" cargado.` };
    } catch (err) {
      const msg = String(err.message || err);
      console.error(`[pyodide] ✗ Error cargando "${nombre}":`, msg);
      return { ok: false, mensaje: `Error cargando "${nombre}": ${msg}` };
    }
  }

  async function instalarDesdePyPI(nombre) {
    if (!pyodideReady) {
      return { ok: false, mensaje: 'Python no está listo todavía.' };
    }
    if (!micropipListo) {
      try {
        await pyodide.loadPackage('micropip');
        micropipListo = true;
      } catch (e) {
        return { ok: false, mensaje: 'micropip no está disponible.' };
      }
    }

    const limpio = String(nombre || '').trim();
    if (!/^[a-zA-Z0-9_\-\.\[\]]+$/.test(limpio)) {
      return { ok: false, mensaje: 'Nombre de paquete inválido.' };
    }

    console.log(`[pyodide] Instalando desde PyPI: "${limpio}"…`);
    try {
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("${limpio}")
      `);
      if (!paquetesInstalados.includes(limpio)) {
        paquetesInstalados.push(limpio);
      }
      console.log(`[pyodide] ✓ "${limpio}" instalado desde PyPI`);
      return { ok: true, mensaje: `"${limpio}" instalado desde PyPI.` };
    } catch (err) {
      const msg = String(err.message || err);
      console.error(`[pyodide] ✗ Error instalando "${limpio}":`, msg);
      if (msg.includes('No module named')) {
        return { ok: false, mensaje: `"${limpio}" no existe en PyPI.` };
      }
      if (msg.includes('wheel')) {
        return { ok: false, mensaje: `"${limpio}" necesita compilación nativa. No está disponible.` };
      }
      return { ok: false, mensaje: `Error instalando "${limpio}": ${msg}` };
    }
  }

  // ============================================================
  // LISTA DE PAQUETES
  // ============================================================
  function listarPaquetesCargados() {
    return paquetesInstalados.slice();
  }

  function estaCargado(nombre) {
    return paquetesInstalados.includes(nombre);
  }

  // ============================================================
  // API PÚBLICA
  // ============================================================
  function isPyodideReady() { return pyodideReady; }
  function isPyodideCargando() { return pyodideCargando; }
  function getPyodide() { return pyodide; }

  // ============================================================
  // ARRANQUE
  // ============================================================
  function arrancarCuandoHayaHueco() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => cargarPyodide(), { timeout: 3000 });
    } else {
      setTimeout(cargarPyodide, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancarCuandoHayaHueco);
  } else {
    arrancarCuandoHayaHueco();
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.isPyodideReady = isPyodideReady;
  window.isPyodideCargando = isPyodideCargando;
  window.getPyodide = getPyodide;
  window.executeCode = executeCode;
  window.cargarPaquete = cargarPaquete;
  window.instalarDesdePyPI = instalarDesdePyPI;
  window.listarPaquetesCargados = listarPaquetesCargados;
  window.estaCargado = estaCargado;
})();

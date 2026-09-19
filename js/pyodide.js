/* ============================================
   pyodide.js — Motor Python + ejecución + gráficas + librerías
   v5 - Captura de Matplotlib + errores amigables + limpiar output
   ============================================ */

(function () {
  'use strict';

  let pyodideReady = false;
  let pyodide = null;
  let micropipReady = false;

  const PAQUETES_INICIALES = ['numpy', 'matplotlib'];

  async function initPython() {
    const badge = document.getElementById('status-badge');
    try {
      pyodide = await loadPyodide();

      // Cargar paquetes base
      try {
        await pyodide.loadPackage(PAQUETES_INICIALES);
      } catch (e) {
        console.warn('[pyodide] No se pudieron precargar algunos paquetes:', e);
      }

      // Configurar matplotlib con backend AGG (sin GUI, ideal para captura)
      await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
      `);

      pyodideReady = true;
      if (badge) {
        badge.innerText = "Entorno Python listo";
        badge.classList.add("status-ready");
      }

      prepararMicropip();
      window.dispatchEvent(new CustomEvent('pyodide-ready'));
    } catch (e) {
      if (badge) badge.innerText = "Error al cargar Python";
      console.error('[pyodide] Error:', e);
    }
  }

  async function prepararMicropip() {
    try {
      await pyodide.loadPackage('micropip');
      micropipReady = true;
      console.log('[pyodide] micropip listo');
      window.dispatchEvent(new CustomEvent('micropip-ready'));
    } catch (e) {
      console.warn('[pyodide] micropip no disponible:', e);
    }
  }

  // ============================================================
  // INSTALAR PAQUETES BAJO DEMANDA
  // ============================================================
  async function instalarPaquete(nombrePaquete) {
    if (!pyodideReady) {
      return { ok: false, mensaje: 'Python todavía está cargando. Espera unos segundos.' };
    }
    if (!micropipReady) {
      try {
        await pyodide.loadPackage('micropip');
        micropipReady = true;
      } catch (e) {
        return { ok: false, mensaje: 'micropip no está disponible.' };
      }
    }

    const nombre = String(nombrePaquete || '').trim();
    if (!nombre) return { ok: false, mensaje: 'Nombre vacío.' };
    if (!/^[a-zA-Z0-9_\-\.\[\]]+$/.test(nombre)) {
      return { ok: false, mensaje: 'Nombre de paquete inválido.' };
    }

    try {
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("${nombre}")
      `);
      return { ok: true, mensaje: `Paquete "${nombre}" instalado correctamente.` };
    } catch (err) {
      const msg = String(err.message || err);
      if (msg.includes('No module named')) {
        return { ok: false, mensaje: `El paquete "${nombre}" no existe en PyPI.` };
      }
      if (msg.includes('wheel')) {
        return { ok: false, mensaje: `"${nombre}" necesita compilación nativa. No está disponible en el navegador.` };
      }
      return { ok: false, mensaje: `Error instalando "${nombre}": ${msg}` };
    }
  }

  async function listarPaquetes() {
    if (!pyodideReady) return [];
    try {
      const result = await pyodide.runPythonAsync(`
import micropip
list(micropip.list())
      `);
      return result ? result.toJs() : [];
    } catch (e) {
      return [];
    }
  }

  // ============================================================
  // EJECUCIÓN DE CÓDIGO + CAPTURA DE GRÁFICAS
  // ============================================================

  async function executeCode(code) {
    // 1) Preparar stdout
    await pyodide.runPythonAsync(`
import sys, io
_buf = io.StringIO()
sys.stdout = _buf
    `);

    // 2) Cerrar figuras previas de matplotlib
    try {
      await pyodide.runPythonAsync(`
try:
    import matplotlib.pyplot as _plt
    _plt.close('all')
except Exception:
    pass
      `);
    } catch (e) { /* matplotlib no cargado aún, ok */ }

    // 3) Ejecutar el código del usuario
    let errorEjecucion = null;
    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      errorEjecucion = String(err);
    }

    // 4) Capturar figuras abiertas
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
except Exception as _e:
    pass
_json.dumps(_imgs)
      `);
      imagenes = JSON.parse(imgsJson);
    } catch (e) {
      console.warn('[pyodide] Error capturando imágenes:', e);
    }

    // 5) Recoger stdout
    const stdout = pyodide.runPython("sys.stdout.getvalue()");

    return { stdout, imagenes, errorEjecucion };
  }

  /**
   * Traduce errores técnicos de Pyodide a mensajes amigables.
   */
  function humanizarError(err) {
    const s = String(err);

    // mpl_toolkits.mplot3d (bug conocido de Pyodide)
    if (s.includes('mpl_toolkits') || s.includes('mplot3d') || s.includes('line_2d_to_3d')) {
      return (
        '⚠️ Los gráficos 3D (mpl_toolkits.mplot3d) no están completamente soportados en el navegador.\n\n' +
        'Alternativas:\n' +
        '  • Usa gráficos 2D: plt.contourf(), plt.imshow(), plt.pcolormesh()\n' +
        '  • Abre el archivo en Google Colab con el botón "Colab" de arriba para tener 3D completo.\n\n' +
        '— Detalle técnico —\n' + s
      );
    }

    // Módulo no instalado
    if (s.includes('ModuleNotFoundError') || s.includes("No module named")) {
      const match = s.match(/No module named '([^']+)'/);
      const mod = match ? match[1] : 'desconocido';
      return (
        `⚠️ El módulo "${mod}" no está instalado.\n\n` +
        `Para instalarlo, abre la Tienda 🏪 (botón arriba a la derecha del editor) y busca "${mod.split('.')[0]}".\n\n` +
        '— Detalle técnico —\n' + s
      );
    }

    // Falta de memoria
    if (s.includes('MemoryError') || s.includes('out of memory')) {
      return (
        '⚠️ El navegador se quedó sin memoria. Prueba con menos datos o cierra otras pestañas.\n\n' +
        '— Detalle técnico —\n' + s
      );
    }

    // Error de sintaxis
    if (s.includes('SyntaxError')) {
      return '⚠️ Error de sintaxis en el código. Revisa la línea indicada abajo.\n\n' + s;
    }

    return s;
  }

  function renderResultado(out, stdout, imagenes, errorEjecucion) {
    out.innerHTML = '';

    if (errorEjecucion) {
      const pre = document.createElement('pre');
      pre.className = 'output-error';
      pre.textContent = humanizarError(errorEjecucion);
      out.appendChild(pre);
    }

    if (stdout && stdout.trim()) {
      const pre = document.createElement('pre');
      pre.className = 'output-text';
      pre.textContent = stdout;
      out.appendChild(pre);
    }

    if (imagenes && imagenes.length > 0) {
      imagenes.forEach((src, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'output-image-wrap';
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Gráfica ' + (i + 1);
        img.className = 'output-image';
        img.loading = 'lazy';
        wrap.appendChild(img);
        out.appendChild(wrap);
      });
    }

    if (!errorEjecucion && (!stdout || !stdout.trim()) && (!imagenes || imagenes.length === 0)) {
      out.innerText = '(sin salida)';
    }
  }

  async function runCode(editorId, outputId) {
    const out = document.getElementById(outputId);
    if (!out) return;

    if (!pyodideReady) {
      out.innerText = "Esperando a que Python cargue...";
      return;
    }

    const editor = (typeof editorsMap !== 'undefined') ? editorsMap[editorId] : null;
    if (!editor) {
      out.innerText = "Editor no encontrado.";
      return;
    }

    const code = editor.getValue();
    out.innerText = "Ejecutando...";

    try {
      const { stdout, imagenes, errorEjecucion } = await executeCode(code);
      renderResultado(out, stdout, imagenes, errorEjecucion);
    } catch (err) {
      out.innerText = "Error inesperado:\n" + humanizarError(err);
    }
  }

  async function runEnvCode() {
    const out = document.getElementById('env-output');
    if (!out) return;

    if (!pyodideReady) {
      out.innerText = "Esperando a que Python cargue...";
      return;
    }

    const editor = (typeof editorsMap !== 'undefined') ? editorsMap['env-editor'] : null;
    if (!editor) {
      out.innerText = "Editor no encontrado.";
      return;
    }

    const code = editor.getValue();
    out.innerText = "Ejecutando...";

    try {
      const { stdout, imagenes, errorEjecucion } = await executeCode(code);
      renderResultado(out, stdout, imagenes, errorEjecucion);
    } catch (err) {
      out.innerText = "Error inesperado:\n" + humanizarError(err);
    }
  }

  // ============================================================
  // LIMPIAR OUTPUT
  // ============================================================
  function limpiarOutputEnv() {
    const out = document.getElementById('env-output');
    if (out) out.innerText = 'Presiona Ejecutar para ver el resultado...';
  }

  function limpiarOutputsGuia() {
    document.querySelectorAll('.output-box').forEach(o => {
      o.innerText = 'Presiona Ejecutar para ver el resultado...';
    });
  }

  function isPyodideReady() { return pyodideReady; }
  function getPyodide() { return pyodide; }

  initPython();

  window.runCode = runCode;
  window.runEnvCode = runEnvCode;
  window.isPyodideReady = isPyodideReady;
  window.getPyodide = getPyodide;
  window.instalarPaquetePyodide = instalarPaquete;
  window.listarPaquetesPyodide = listarPaquetes;
  window.limpiarOutputEnv = limpiarOutputEnv;
  window.limpiarOutputsGuia = limpiarOutputsGuia;
})();

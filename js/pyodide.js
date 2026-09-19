/* ============================================
   pyodide.js — Motor Python + ejecución + micropip
   v3 - Soporte para instalar librerías bajo demanda
   ============================================ */

(function () {
  'use strict';

  let pyodideReady = false;
  let pyodide = null;
  let micropipReady = false;

  // Paquetes pre-cargados al iniciar (los más comunes)
  const PAQUETES_INICIALES = ['numpy'];

  async function initPython() {
    const badge = document.getElementById('status-badge');
    try {
      pyodide = await loadPyodide();

      // Cargar paquetes base que ya vienen compilados en Pyodide
      try {
        await pyodide.loadPackage(PAQUETES_INICIALES);
      } catch (e) {
        console.warn('[pyodide] No se pudieron precargar algunos paquetes:', e);
      }

      pyodideReady = true;
      if (badge) {
        badge.innerText = "Entorno Python listo";
        badge.classList.add("status-ready");
      }

      // Cargar micropip en segundo plano (no bloquea)
      prepararMicropip();

      // Avisar al resto de scripts
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

  /**
   * Instala un paquete desde PyPI usando micropip.
   * Devuelve {ok: bool, mensaje: string}
   */
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

  /**
   * Lista los paquetes instalados vía micropip.
   */
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
  // EJECUCIÓN DE CÓDIGO
  // ============================================================

  async function executeCode(code) {
    await pyodide.runPythonAsync(`
import sys, io
_buf = io.StringIO()
sys.stdout = _buf
    `);
    await pyodide.runPythonAsync(code);
    return pyodide.runPython("sys.stdout.getvalue()");
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
      const stdout = await executeCode(code);
      out.innerText = stdout || "(sin salida impresa)";
    } catch (err) {
      out.innerText = "Error de ejecución:\n" + err;
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
      const stdout = await executeCode(code);
      out.innerText = stdout || "(sin salida)";
    } catch (err) {
      out.innerText = "Error:\n" + err;
    }
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
})();

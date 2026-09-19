/* ============================================
   pyodide.js — Motor Python + ejecución de código
   v2 - Emite evento 'pyodide-ready' al terminar la carga
   ============================================ */

(function () {
  'use strict';

  let pyodideReady = false;
  let pyodide = null;

  async function initPython() {
    const badge = document.getElementById('status-badge');
    try {
      pyodide = await loadPyodide();
      pyodideReady = true;
      if (badge) {
        badge.innerText = "Entorno Python listo";
        badge.classList.add("status-ready");
      }
      // Avisar al resto de scripts que Pyodide ya está disponible
      window.dispatchEvent(new CustomEvent('pyodide-ready'));
    } catch (e) {
      if (badge) badge.innerText = "Error al cargar Python";
      console.error('[pyodide] Error:', e);
    }
  }

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
})();

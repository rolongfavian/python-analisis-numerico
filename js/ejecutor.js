/* ============================================
   ejecutor.js — Ejecuta código y pinta el resultado
   v2 - Adaptado a Skulpt
   ============================================ */

(function () {
  'use strict';

  function renderResultado(contenedor, stdout, imagenes, error) {
    if (!contenedor) return;

    contenedor.innerHTML = '';

    if (error) {
      const pre = document.createElement('pre');
      pre.className = 'output-error';
      pre.textContent = 'Error:\n' + error;
      contenedor.appendChild(pre);
    }

    if (stdout && stdout.trim()) {
      const pre = document.createElement('pre');
      pre.className = 'output-text';
      pre.textContent = stdout;
      contenedor.appendChild(pre);
    }

    if (!error && (!stdout || !stdout.trim())) {
      contenedor.innerText = '(sin salida)';
    }
  }

  async function ejecutarYMostrar(codigo, contenedor) {
    if (!contenedor) return;

    if (!window.isPyodideReady()) {
      contenedor.innerHTML = '<span class="output-text">Esperando a que Python cargue…</span>';
    } else {
      contenedor.innerHTML = '<span class="output-text">Ejecutando…</span>';
    }

    const listo = await esperarPyodide(15000);
    if (!listo) {
      contenedor.innerHTML = '<pre class="output-error">Python no se cargó a tiempo. Revisa tu conexión.</pre>';
      return;
    }

    try {
      const { stdout, imagenes, errorEjecucion } = await window.executeCode(codigo);
      renderResultado(contenedor, stdout, imagenes, errorEjecucion);
    } catch (err) {
      renderResultado(contenedor, '', [], String(err));
    }
  }

  function esperarPyodide(timeoutMs) {
    return new Promise((resolve) => {
      if (window.isPyodideReady()) return resolve(true);

      const inicio = Date.now();
      const check = setInterval(() => {
        if (window.isPyodideReady()) {
          clearInterval(check);
          resolve(true);
        } else if (Date.now() - inicio > timeoutMs) {
          clearInterval(check);
          resolve(false);
        }
      }, 100);

      window.addEventListener('pyodide-ready', () => {
        clearInterval(check);
        resolve(true);
      }, { once: true });
    });
  }

  async function ejecutarEjemplo(editorId, outputId) {
    const contenedor = document.getElementById(outputId);
    if (!contenedor) return;

    const textarea = document.getElementById(editorId);
    if (!textarea) {
      contenedor.innerText = 'Editor no encontrado.';
      return;
    }

    let codigo = '';
    if (typeof editorsMap !== 'undefined' && editorsMap[editorId]) {
      codigo = editorsMap[editorId].getValue();
    } else {
      codigo = textarea.value;
    }

    if (!codigo.trim()) {
      contenedor.innerText = 'El ejemplo está vacío.';
      return;
    }

    await ejecutarYMostrar(codigo, contenedor);
  }

  async function ejecutarCodigoEntorno() {
    const contenedor = document.getElementById('entorno-output');
    if (!contenedor) return;

    const editor = (typeof editorsMap !== 'undefined') ? editorsMap['entorno-editor'] : null;
    if (!editor) {
      contenedor.innerText = 'Editor no encontrado.';
      return;
    }

    const codigo = editor.getValue();
    if (!codigo.trim()) {
      contenedor.innerText = 'El editor está vacío.';
      return;
    }

    await ejecutarYMostrar(codigo, contenedor);
  }

  function limpiarSalida(outputId) {
    const contenedor = document.getElementById(outputId);
    if (contenedor) contenedor.innerText = '';
  }

  function limpiarSalidasGuia() {
    document.querySelectorAll('.output-box').forEach(o => {
      o.innerText = 'Presiona Ejecutar para ver el resultado...';
    });
  }

  window.renderResultado = renderResultado;
  window.ejecutarYMostrar = ejecutarYMostrar;
  window.ejecutarEjemplo = ejecutarEjemplo;
  window.ejecutarCodigoEntorno = ejecutarCodigoEntorno;
  window.limpiarSalida = limpiarSalida;
  window.limpiarSalidasGuia = limpiarSalidasGuia;
  window.esperarPyodide = esperarPyodide;
})();

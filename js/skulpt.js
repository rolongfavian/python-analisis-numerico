/* ============================================
   skulpt.js — Motor Python en el navegador con Skulpt
   v1 - Reemplaza a Pyodide. Mucho más ligero (~1.5 MB)
   ============================================ */

(function () {
  'use strict';

  let skulptReady = false;
  let skulptCargando = false;
  let outputBuffer = [];

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
  // INICIALIZACIÓN (Skulpt es síncrono, pero comprobamos)
  // ============================================================
  function initSkulpt() {
    if (skulptReady || skulptCargando) return;
    skulptCargando = true;

    crearBarra();
    actualizarBarra('Verificando Skulpt…', 30);

    // Skulpt se carga con <script> en el HTML. Comprobamos que esté.
    if (typeof Sk === 'undefined') {
      marcarBarraError('Skulpt no se cargó. Revisa la conexión.');
      skulptCargando = false;
      return;
    }

    actualizarBarra('Configurando entorno…', 70);

    // Configurar Skulpt
    Sk.configure({
      output: function (texto) {
        outputBuffer.push(texto);
      },
      read: function (x) {
        // Permite importar módulos estándar de Skulpt
        if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) {
          throw "File not found: '" + x + "'";
        }
        return Sk.builtinFiles.files[x];
      },
      inputfun: function (prompt) {
        return window.prompt(prompt);
      },
      inputfunTakesPrompt: true,
      __future__: Sk.python3
    });

    skulptReady = true;
    skulptCargando = false;
    actualizarBarra('Python listo', 100);
    marcarBarraLista();

    window.dispatchEvent(new CustomEvent('pyodide-ready'));
    window.dispatchEvent(new CustomEvent('skulpt-ready'));
  }

  // ============================================================
  // EJECUCIÓN DE CÓDIGO
  // ============================================================
  async function executeCode(code) {
    if (!skulptReady) {
      throw new Error('Python todavía no está listo. Espera unos segundos.');
    }

    // Reiniciar el buffer
    outputBuffer = [];

    let errorEjecucion = null;

    try {
      await Sk.misceval.asyncToPromise(() =>
        Sk.importMainWithBody('<stdin>', false, code, true)
      );
    } catch (err) {
      // Skulpt lanza errores con formato propio
      errorEjecucion = String(err);
      // Limpiar el mensaje de Skulpt para que sea legible
      errorEjecucion = errorEjecucion
        .replace(/^.*?Error: /s, '')
        .replace(/\n.*$/, '')
        .trim();
    }

    const stdout = outputBuffer.join('');
    return { stdout, imagenes: [], errorEjecucion };
  }

  // ============================================================
  // API PÚBLICA (compatible con lo que espera el resto del código)
  // ============================================================
  function isPyodideReady() { return skulptReady; }
  function isPyodideCargando() { return skulptCargando; }
  function getPyodide() { return null; }

  // Stubs para compatibilidad con código que ya no se usa
  async function cargarPaquete() {
    return { ok: false, mensaje: 'Skulpt no soporta paquetes externos.' };
  }
  async function instalarDesdePyPI() {
    return { ok: false, mensaje: 'Skulpt no soporta paquetes externos.' };
  }
  function listarPaquetesCargados() { return []; }
  function estaCargado() { return false; }

  // ============================================================
  // ARRANQUE
  // ============================================================
  function arrancarCuandoHayaHueco() {
    // Skulpt es muy ligero, lo iniciamos casi de inmediato
    setTimeout(initSkulpt, 100);
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

/* ============================================
   skulpt-runner.js — Motor Python ligero (Skulpt)
   v2 - Con detección de librerías y feedback claro
   ============================================ */

(function () {
  'use strict';

  let skulptCargado = false;
  let skulptCargando = false;

  // ============================================================
  // CARGA DE SKULPT
  // ============================================================
  function cargarSkulpt() {
    return new Promise((resolve, reject) => {
      if (skulptCargado) return resolve();
      if (skulptCargando) {
        const check = setInterval(() => {
          if (skulptCargado) { clearInterval(check); resolve(); }
        }, 100);
        return;
      }

      skulptCargando = true;

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js';
      script.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js';
        script2.onload = () => {
          skulptCargado = true;
          skulptCargando = false;
          resolve();
        };
        script2.onerror = () => {
          skulptCargando = false;
          reject(new Error('No se pudo cargar skulpt-stdlib'));
        };
        document.head.appendChild(script2);
      };
      script.onerror = () => {
        skulptCargando = false;
        reject(new Error('No se pudo cargar skulpt'));
      };
      document.head.appendChild(script);
    });
  }

  // ============================================================
  // EJECUTAR CÓDIGO EN SKULPT
  // ============================================================
  async function ejecutarConSkulpt(codigo) {
    await cargarSkulpt();

    function builtinRead(x) {
      if (Sk.builtinFiles === undefined ||
          Sk.builtinFiles['files'][x] === undefined) {
        throw new Error("No se encontró el módulo '" + x + "'");
      }
      return Sk.builtinFiles['files'][x];
    }

    let salida = '';
    let error = null;

    Sk.configure({
      output: (texto) => { salida += texto; },
      read: builtinRead,
      __future__: Sk.python3,
      execLimit: 5000,
      yieldLimit: 1000,
      killableWhile: true,
      killableFor: true
    });

    try {
      await Sk.misceval.asyncToPromise(() =>
        Sk.importMainWithBody('<stdin>', false, codigo, true)
      );
    } catch (e) {
      error = e.toString();
    }

    return { stdout: salida, error };
  }

  // ============================================================
  // RENDERIZADO
  // ============================================================
  function renderResultado(out, stdout, error) {
    out.innerHTML = '';

    if (error) {
      const pre = document.createElement('pre');
      pre.className = 'output-error';
      pre.textContent = 'Error:\n' + error;
      out.appendChild(pre);
    }

    if (stdout && stdout.trim()) {
      const pre = document.createElement('pre');
      pre.className = 'output-text';
      pre.textContent = stdout;
      out.appendChild(pre);
    }

    if (!error && (!stdout || !stdout.trim())) {
      out.innerText = '(sin salida)';
    }
  }

  // ============================================================
  // EXPOSICIÓN
  // ============================================================
  window.ejecutarConSkulpt = ejecutarConSkulpt;
  window.renderResultadoSkulpt = renderResultado;
})();

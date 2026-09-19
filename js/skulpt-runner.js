/* ============================================
   skulpt-runner.js — Motor Python ligero (Skulpt)
   Para el modo invitado. ~200 KB, sin librerías.
   ============================================ */

(function () {
  'use strict';

  let skulptCargado = false;
  let skulptCargando = false;

  // Comandos permitidos en modo invitado (los que Skulpt soporta)
  const COMANDOS_PERMITIDOS = [
    'print', 'input',
    'range', 'len', 'sum', 'min', 'max', 'abs', 'round',
    'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple',
    'enumerate', 'zip', 'sorted', 'reversed', 'map', 'filter',
    'type', 'isinstance', 'repr',
    'True', 'False', 'None'
  ];

  // ============================================================
  // CARGA DE SKULPT
  // ============================================================
  function cargarSkulpt() {
    return new Promise((resolve, reject) => {
      if (skulptCargado) return resolve();
      if (skulptCargando) {
        // Esperar a que termine la carga en curso
        const check = setInterval(() => {
          if (skulptCargado) {
            clearInterval(check);
            resolve();
          }
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
  /**
   * Ejecuta código Python con Skulpt.
   * Devuelve { stdout, error }.
   */
  async function ejecutarConSkulpt(codigo) {
    await cargarSkulpt();

    // Función de salida
    function builtinRead(x) {
      if (Sk.builtinFiles === undefined ||
          Sk.builtinFiles['files'][x] === undefined) {
        throw new Error("Archivo no encontrado: '" + x + "'");
      }
      return Sk.builtinFiles['files'][x];
    }

    Sk.configure({
      output: (texto) => {
        salida += texto;
      },
      read: builtinRead,
      __future__: Sk.python3,
      execLimit: 5000,          // 5s máximo de ejecución
      yieldLimit: 1000,          // límite de operaciones
      killableWhile: true,
      killableFor: true
    });

    let salida = '';
    let error = null;

    const codigoPreparado = `
import sys
def input(prompt=""):
    sys.stdout.write(prompt)
    return ""
` + codigo;

    try {
      await Sk.misceval.asyncToPromise(() =>
        Sk.importMainWithBody('<stdin>', false, codigoPreparado, true)
      );
    } catch (e) {
      error = e.toString();
    }

    return { stdout: salida, error };
  }

  // ============================================================
  // RENDERIZADO
  // ============================================================
  function renderResultadoSkulpt(out, stdout, error) {
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
  // WRAPPER: runEnvCodeInvitado
  // ============================================================
  async function runEnvCodeInvitado() {
    const out = document.getElementById('env-output');
    if (!out) return;

    const editor = (typeof editorsMap !== 'undefined') ? editorsMap['env-editor'] : null;
    if (!editor) {
      out.innerText = 'Editor no encontrado.';
      return;
    }

    const codigo = editor.getValue();
    if (!codigo.trim()) {
      out.innerText = 'Escribe algo de código para ejecutar.';
      return;
    }

    out.innerText = 'Ejecutando (modo invitado, motor ligero)…';

    try {
      const { stdout, error } = await ejecutarConSkulpt(codigo);
      renderResultadoSkulpt(out, stdout, error);
    } catch (e) {
      out.innerText = 'Error inesperado:\n' + e.message;
    }
  }

  // Exponer
  window.runEnvCodeInvitado = runEnvCodeInvitado;
  window.ejecutarConSkulpt = ejecutarConSkulpt;
})();

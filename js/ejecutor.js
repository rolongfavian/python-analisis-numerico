/* ============================================
   ejecutor.js — Motor de ejecución
   - Invitado: Skulpt (ligero, ~200 KB)
   - Conectado: genera .ipynb y sube a Drive → abre Colab
   ============================================ */

(function () {
  'use strict';

  // ============================================================
  // GENERADOR DE .ipynb
  // ============================================================
  function buildIpynbDesdeCodigo(codigo, nombre) {
    const lineas = codigo.split('\n').map((l, i, a) =>
      i < a.length - 1 ? l + '\n' : l
    );

    return {
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            `# ${nombre || 'Ejercicio'}\n`,
            '\n',
            'Generado desde la guía de Python para Análisis Numérico.\n'
          ]
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: lineas
        }
      ],
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: { name: 'python', version: '3.11' }
      },
      nbformat: 4,
      nbformat_minor: 5
    };
  }

  // ============================================================
  // DETECTAR SI ESTAMOS CONECTADOS
  // ============================================================
  function estamosConectados() {
    return typeof window.getDriveToken === 'function' && !!window.getDriveToken();
  }

  function estamosEnInvitado() {
    return document.getElementById('guest-warning') &&
           document.getElementById('guest-warning').style.display !== 'none';
  }

  // ============================================================
  // EJECUTAR SEGÚN MODO
  // ============================================================
  async function runEnvCode() {
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

    // ------------------------------------------------------
    // MODO INVITADO → Skulpt
    // ------------------------------------------------------
    if (!estamosConectados()) {
      if (typeof window.runEnvCodeInvitado === 'function') {
        await window.runEnvCodeInvitado();
      } else {
        out.innerText = 'Motor ligero no cargado. Recarga la página.';
      }
      return;
    }

    // ------------------------------------------------------
    // MODO CONECTADO → subir a Drive y abrir Colab
    // ------------------------------------------------------
    await subirYabrirEnColab(codigo, 'env-editor');
  }

  async function subirYabrirEnColab(codigo, editorId) {
    const out = document.getElementById('env-output');
    const token = window.getDriveToken && window.getDriveToken();

    if (!token) {
      out.innerText = 'Conecta tu cuenta de Google para usar Colab.';
      return;
    }

    // Nombre del archivo (sin extensión)
    const fnInput = document.getElementById('env-filename');
    let nombre = (fnInput && fnInput.value) ? fnInput.value : 'ejercicio';
    nombre = nombre.replace(/\.\w+$/, '');
    if (!nombre) nombre = 'ejercicio';

    const nombreIpynb = nombre + '.ipynb';
    const ipynb = buildIpynbDesdeCodigo(codigo, nombre);
    const contenido = JSON.stringify(ipynb, null, 1);

    out.innerText = 'Subiendo a Drive y abriendo Colab…';

    try {
      // Buscar si ya existe un archivo con ese nombre en la raíz del proyecto
      const parentId = window.getDriveFolderId ? window.getDriveFolderId() : null;
      if (!parentId) {
        out.innerText = 'No se encontró la carpeta de Drive. Reconecta tu cuenta.';
        return;
      }

      // Buscar archivo existente
      const q = encodeURIComponent(
        `name='${nombreIpynb}' and '${parentId}' in parents and trashed=false`
      );
      const buscar = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
        { headers: { 'Authorization': 'Bearer ' + token } }
      );
      const buscarData = await buscar.json();
      let fileId = buscarData.files && buscarData.files.length > 0
        ? buscarData.files[0].id
        : null;

      if (fileId) {
        // Actualizar existente
        const res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            body: contenido
          }
        );
        if (!res.ok) throw new Error('No se pudo actualizar el archivo');
      } else {
        // Crear nuevo
        const boundary = 'foo_bar';
        const metadata = {
          name: nombreIpynb,
          mimeType: 'application/json',
          parents: [parentId]
        };
        const body =
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${contenido}\r\n` +
          `--${boundary}--`;

        const res = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
          }
        );
        if (!res.ok) throw new Error('No se pudo crear el archivo');
        const data = await res.json();
        fileId = data.id;
      }

      out.innerText = '✅ Abriendo en Colab…';

      // Abrir Colab con el archivo
      window.open(
        `https://colab.research.google.com/drive/${fileId}`,
        '_blank'
      );

    } catch (e) {
      out.innerText = 'Error al subir a Colab:\n' + e.message;
    }
  }

  // ============================================================
  // RUN EN LA GUÍA (ejemplos)
  // ============================================================
  async function runCode(editorId, outputId) {
    const out = document.getElementById(outputId);
    if (!out) return;

    const editor = (typeof editorsMap !== 'undefined') ? editorsMap[editorId] : null;
    if (!editor) {
      out.innerText = 'Editor no encontrado.';
      return;
    }

    const codigo = editor.getValue();
    if (!codigo.trim()) {
      out.innerText = 'El ejemplo está vacío.';
      return;
    }

    // Modo invitado: ejecutar con Skulpt
    if (!estamosConectados()) {
      out.innerText = 'Ejecutando (modo invitado)…';
      try {
        const { stdout, error } = await window.ejecutarConSkulpt(codigo);
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
      } catch (e) {
        out.innerText = 'Error: ' + e.message;
      }
      return;
    }

    // Modo conectado: subir a Drive y abrir Colab
    out.innerText = 'Subiendo a Colab…';
    try {
      await subirYabrirEnColab(codigo, editorId);
      out.innerText = '✅ Abierto en Colab. Revisa la nueva pestaña.';
    } catch (e) {
      out.innerText = 'Error: ' + e.message;
    }
  }

  // ============================================================
  // LIMPIAR OUTPUTS
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

  // ============================================================
  // STUBS para compatibilidad
  // ============================================================
  function isPyodideReady() { return true; }
  function getPyodide() { return null; }

  async function instalarPaquete() {
    return {
      ok: false,
      mensaje: 'Ya no se instalan librerías localmente. El código se ejecuta en Google Colab, que ya tiene todas las librerías.'
    };
  }

  async function listarPaquetes() { return []; }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    const badge = document.getElementById('status-badge');
    if (badge) {
      badge.innerText = 'Listo · Ejecuta en el navegador o en Google Colab';
      badge.classList.add('status-ready');
    }

    window.dispatchEvent(new CustomEvent('pyodide-ready'));
    window.dispatchEvent(new CustomEvent('motor-listo'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.runCode = runCode;
  window.runEnvCode = runEnvCode;
  window.isPyodideReady = isPyodideReady;
  window.getPyodide = getPyodide;
  window.instalarPaquetePyodide = instalarPaquete;
  window.listarPaquetesPyodide = listarPaquetes;
  window.limpiarOutputEnv = limpiarOutputEnv;
  window.limpiarOutputsGuia = limpiarOutputsGuia;
  window.buildIpynbDesdeCodigo = buildIpynbDesdeCodigo;
  window.subirYabrirEnColab = subirYabrirEnColab;
})();

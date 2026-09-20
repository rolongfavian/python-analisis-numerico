/* ============================================
   ejecutor.js — Motor de ejecución inteligente
   v2 - Decide automáticamente: Skulpt local o Colab
   - Aplica a TODA la página (Guía y Entorno)
   - Modo invitado: solo Skulpt
   ============================================ */

(function () {
  'use strict';

  const LIBRERIAS_PESADAS = [
    'numpy', 'np',
    'matplotlib', 'plt', 'pyplot',
    'scipy',
    'pandas', 'pd',
    'sympy',
    'sklearn', 'scikit-learn',
    'statsmodels',
    'networkx',
    'plotly',
    'bokeh',
    'seaborn',
    'altair',
    'geopandas',
    'mpmath',
    'tensorflow', 'torch', 'keras',
    'cv2', 'opencv',
    'PIL', 'Pillow',
    'requests', 'urllib3',
    'micropip',
    'marimo'
  ];

  // ============================================================
  // DETECCIÓN
  // ============================================================
  function usaLibreriaPesada(codigo) {
    const regexes = [
      /^\s*import\s+([a-zA-Z_][\w]*)/gm,
      /^\s*from\s+([a-zA-Z_][\w]*)\s+import/gm
    ];

    const modulosEncontrados = new Set();
    regexes.forEach(re => {
      let match;
      while ((match = re.exec(codigo)) !== null) {
        modulosEncontrados.add(match[1].toLowerCase());
      }
    });

    for (const mod of modulosEncontrados) {
      if (LIBRERIAS_PESADAS.includes(mod)) return true;
    }
    return false;
  }

  function estamosConectados() {
    return typeof window.getDriveToken === 'function' && !!window.getDriveToken();
  }

  function estamosEnInvitado() {
    const gw = document.getElementById('guest-warning');
    return gw && gw.style.display !== 'none';
  }

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
  // MOTOR PRINCIPAL
  // ============================================================
  async function ejecutarCodigo(codigo, out, editorId, nombreSugerido) {
    if (!codigo || !codigo.trim()) {
      out.innerText = 'Escribe algo de código para ejecutar.';
      return;
    }

    if (usaLibreriaPesada(codigo)) {
      if (estamosEnInvitado() || !estamosConectados()) {
        out.innerHTML = `
          <div class="output-error">
            ⚠️ Este código usa librerías como <strong>NumPy</strong> o
            <strong>Matplotlib</strong>, que no se pueden ejecutar aquí.<br><br>
            Para ejecutarlo, conecta tu cuenta de Google con el botón
            <strong>"Drive: no conectado"</strong> de arriba.
          </div>
        `;
        return;
      }
      await subirYabrirEnColab(codigo, editorId, out, nombreSugerido);
      return;
    }

    out.innerText = 'Ejecutando…';
    try {
      const { stdout, error } = await window.ejecutarConSkulpt(codigo);
      window.renderResultadoSkulpt(out, stdout, error);
    } catch (e) {
      out.innerText = 'Error: ' + e.message;
    }
  }

  // ============================================================
  // SUBIR A DRIVE + ABRIR COLAB
  // ============================================================
  async function subirYabrirEnColab(codigo, editorId, out, nombreSugerido) {
    const token = window.getDriveToken && window.getDriveToken();

    if (!token) {
      out.innerText = 'Conecta tu cuenta de Google para usar Colab.';
      return;
    }

    let nombre = nombreSugerido;
    if (!nombre) {
      const fnInput = document.getElementById('env-filename');
      nombre = (fnInput && fnInput.value) ? fnInput.value : 'ejercicio';
    }
    nombre = nombre.replace(/\.\w+$/, '');
    if (!nombre) nombre = 'ejercicio';

    const nombreIpynb = nombre + '.ipynb';
    const ipynb = buildIpynbDesdeCodigo(codigo, nombre);
    const contenido = JSON.stringify(ipynb, null, 1);

    out.innerText = 'Subiendo a Drive y abriendo Colab…';

    try {
      const parentId = window.getDriveFolderId ? window.getDriveFolderId() : null;
      if (!parentId) {
        out.innerText = 'No se encontró la carpeta de Drive. Reconecta tu cuenta.';
        return;
      }

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

      out.innerHTML = '✅ Abierto en Google Colab. Revisa la nueva pestaña.';

      window.open(
        `https://colab.research.google.com/drive/${fileId}`,
        '_blank'
      );
    } catch (e) {
      out.innerHTML = '<div class="output-error">Error al subir a Colab:\n' + e.message + '</div>';
    }
  }

  // ============================================================
  // BOTONES GLOBALES
  // ============================================================
  async function runEnvCode() {
    const out = document.getElementById('env-output');
    if (!out) return;

    const editor = (typeof editorsMap !== 'undefined') ? editorsMap['env-editor'] : null;
    if (!editor) { out.innerText = 'Editor no encontrado.'; return; }

    const codigo = editor.getValue();
    await ejecutarCodigo(codigo, out, 'env-editor');
  }

  async function runCode(editorId, outputId) {
    const out = document.getElementById(outputId);
    if (!out) return;

    const editor = (typeof editorsMap !== 'undefined') ? editorsMap[editorId] : null;
    if (!editor) { out.innerText = 'Editor no encontrado.'; return; }

    const codigo = editor.getValue();
    await ejecutarCodigo(codigo, out, editorId);
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
  // STUBS
  // ============================================================
  function isPyodideReady() { return true; }
  function getPyodide() { return null; }
  async function instalarPaquete() {
    return { ok: false, mensaje: 'Tienda deshabilitada.' };
  }
  async function listarPaquetes() { return []; }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    const badge = document.getElementById('status-badge');
    if (badge) {
      badge.innerText = 'Listo · Python local + Colab para librerías';
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
  window.usaLibreriaPesada = usaLibreriaPesada;
  window.ejecutarCodigo = ejecutarCodigo;
})();

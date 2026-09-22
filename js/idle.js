/* ============================================
   idle.js — IDLE general (sin Drive)
   Editor libre de Python con archivos en localStorage
   v4 - Sin tienda, con botón Limpiar
   ============================================ */

(function () {
  'use strict';

  const STORAGE_CODIGO = 'idle_codigo_actual';
  const STORAGE_ARCHIVOS = 'idle_archivos';
  const STORAGE_ARCHIVO_ACTIVO = 'idle_archivo_activo';
  const MIN_OUTPUT = 160;
  const MAX_OUTPUT_FACTOR = 0.6;

  let editorIdle = null;
  let archivoActivo = null;

  // ============================================================
  // EDITOR
  // ============================================================
  function initEditor() {
    if (editorIdle) return;
    if (typeof CodeMirror === 'undefined') return;

    const textarea = document.getElementById('idle-editor');
    if (!textarea) return;

    if (typeof editorsMap !== 'undefined' && editorsMap['idle-editor']) {
      editorIdle = editorsMap['idle-editor'];
      return;
    }

    try {
      const guardado = localStorage.getItem(STORAGE_CODIGO);
      if (guardado) textarea.value = guardado;
    } catch (e) { /* ignorar */ }

    if (typeof createEditor === 'function') {
      editorIdle = createEditor(textarea);
    } else {
      editorIdle = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        autoCloseBrackets: true,
        matchBrackets: true,
        lineWrapping: false
      });
    }

    if (editorIdle) {
      if (typeof editorsMap !== 'undefined') {
        editorsMap['idle-editor'] = editorIdle;
      }
      editorIdle.on('change', () => {
        try {
          localStorage.setItem(STORAGE_CODIGO, editorIdle.getValue());
        } catch (e) { /* ignorar */ }
      });
    }
  }

  // ============================================================
  // SISTEMA DE ARCHIVOS (localStorage)
  // ============================================================
  function leerArchivos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_ARCHIVOS) || '[]');
    } catch (e) { return []; }
  }

  function guardarArchivos(lista) {
    try {
      localStorage.setItem(STORAGE_ARCHIVOS, JSON.stringify(lista));
    } catch (e) { /* ignorar */ }
  }

  function nuevoId() {
    return 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function idleRefrescar() {
    renderListaArchivos();
  }

  function renderListaArchivos() {
    const cont = document.getElementById('idle-lista-archivos');
    if (!cont) return;

    const archivos = leerArchivos();
    const input = document.getElementById('idle-filename');
    const nombreActual = input ? input.value : '';

    if (archivos.length === 0) {
      cont.innerHTML = '<div class="empty">Sin archivos guardados localmente</div>';
      return;
    }

    cont.innerHTML = '';
    archivos.forEach(f => {
      const item = document.createElement('div');
      item.className = 'file-item';
      if (f.nombre === nombreActual) item.classList.add('active');

      const icono = f.tipo === 'py' ? 'code' : 'description';
      item.innerHTML = `
        <span class="material-symbols-outlined">${icono}</span>
        <span class="file-name">${escapeHtml(f.nombre)}</span>
        <span class="file-actions">
          <button title="Eliminar" data-del="${f.id}">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </span>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        abrirArchivo(f.id);
      });

      const btnDel = item.querySelector('button[data-del]');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          eliminarArchivo(f.id);
        });
      }

      cont.appendChild(item);
    });
  }

  function idleCrearNotebook() {
    const nombre = prompt('Nombre del notebook (sin .ipynb):', 'nuevo');
    if (!nombre) return;
    const nombreFinal = nombre.endsWith('.ipynb') ? nombre : nombre + '.ipynb';
    const archivos = leerArchivos();
    archivos.push({
      id: nuevoId(),
      tipo: 'ipynb',
      nombre: nombreFinal,
      contenido: ''
    });
    guardarArchivos(archivos);
    renderListaArchivos();
    if (typeof showToast === 'function') showToast('Notebook creado: ' + nombreFinal);
  }

  function idleCrearPy() {
    const nombre = prompt('Nombre del archivo .py (sin .py):', 'script');
    if (!nombre) return;
    const nombreFinal = nombre.endsWith('.py') ? nombre : nombre + '.py';
    const archivos = leerArchivos();
    archivos.push({
      id: nuevoId(),
      tipo: 'py',
      nombre: nombreFinal,
      contenido: ''
    });
    guardarArchivos(archivos);
    renderListaArchivos();
    if (typeof showToast === 'function') showToast('Archivo creado: ' + nombreFinal);
  }

  function idleImportar() {
    const input = document.getElementById('idle-import-input');
    if (input) { input.value = ''; input.click(); }
  }

  function idleImportarArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const nombre = file.name;
    const ext = nombre.split('.').pop().toLowerCase();
    if (ext !== 'py' && ext !== 'ipynb') {
      alert('Solo se admiten archivos .py y .ipynb');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const contenido = e.target.result;
      const archivos = leerArchivos();
      archivos.push({
        id: nuevoId(),
        tipo: ext,
        nombre: nombre,
        contenido: contenido
      });
      guardarArchivos(archivos);
      renderListaArchivos();
      if (typeof showToast === 'function') showToast('Importado: ' + nombre);
    };
    reader.readAsText(file);
  }

  function abrirArchivo(id) {
    const archivos = leerArchivos();
    const archivo = archivos.find(f => f.id === id);
    if (!archivo) return;

    initEditor();
    if (!editorIdle) return;

    let contenido = archivo.contenido || '';
    if (archivo.tipo === 'ipynb') {
      contenido = extraerCodigoDeIpynb(contenido);
    }
    editorIdle.setValue(contenido);

    const input = document.getElementById('idle-filename');
    if (input) input.value = archivo.nombre;

    archivoActivo = id;
    try {
      localStorage.setItem(STORAGE_ARCHIVO_ACTIVO, id);
    } catch (e) { /* ignorar */ }

    renderListaArchivos();
  }

  function eliminarArchivo(id) {
    if (!confirm('¿Eliminar este archivo?')) return;
    const archivos = leerArchivos().filter(f => f.id !== id);
    guardarArchivos(archivos);
    if (archivoActivo === id) archivoActivo = null;
    renderListaArchivos();
    if (typeof showToast === 'function') showToast('Eliminado');
  }

  // ============================================================
  // GUARDAR
  // ============================================================
  function guardarEnLocalStorage(nombre, codigo, tipo) {
    const archivos = leerArchivos();
    let index = archivos.findIndex(f => f.nombre === nombre);
    if (index < 0 && archivoActivo) {
      index = archivos.findIndex(f => f.id === archivoActivo);
    }

    const contenidoGuardar = (tipo === 'ipynb')
      ? JSON.stringify(buildIpynb(codigo, nombre), null, 1)
      : codigo;

    if (index >= 0) {
      archivos[index].contenido = contenidoGuardar;
      archivos[index].nombre = nombre;
      archivos[index].tipo = tipo;
      archivoActivo = archivos[index].id;
    } else {
      const idNuevo = nuevoId();
      archivos.push({
        id: idNuevo,
        tipo: tipo,
        nombre: nombre,
        contenido: contenidoGuardar
      });
      archivoActivo = idNuevo;
    }

    guardarArchivos(archivos);
    renderListaArchivos();
  }

  // ============================================================
  // CONVERTIR
  // ============================================================
  function idleConvertir() {
    if (!editorIdle) return;

    const input = document.getElementById('idle-filename');
    let nombre = (input && input.value.trim()) ? input.value.trim() : '';
    if (!nombre) {
      alert('Pon un nombre de archivo primero.');
      return;
    }

    const codigo = editorIdle.getValue();
    if (!codigo.trim()) {
      alert('El editor está vacío. No hay nada que convertir.');
      return;
    }

    const ext = nombre.split('.').pop().toLowerCase();
    let nombreNuevo = nombre;
    let tipoNuevo = ext;

    if (ext === 'py') {
      nombreNuevo = nombre.replace(/\.py$/, '.ipynb');
      tipoNuevo = 'ipynb';
    } else if (ext === 'ipynb') {
      nombreNuevo = nombre.replace(/\.ipynb$/, '.py');
      tipoNuevo = 'py';
    } else {
      alert('El archivo debe terminar en .py o .ipynb');
      return;
    }

    if (input) input.value = nombreNuevo;
    guardarEnLocalStorage(nombreNuevo, codigo, tipoNuevo);

    if (typeof showToast === 'function') {
      showToast('Convertido y guardado: ' + nombreNuevo);
    }
  }

  // ============================================================
  // DESCARGAR
  // ============================================================
  function idleDescargar() {
    if (!editorIdle) return;

    const input = document.getElementById('idle-filename');
    let nombre = (input && input.value.trim()) ? input.value.trim() : '';
    if (!nombre) {
      alert('Pon un nombre de archivo primero.');
      return;
    }

    const codigo = editorIdle.getValue();
    if (!codigo.trim()) {
      alert('El editor está vacío.');
      return;
    }

    const ext = nombre.split('.').pop().toLowerCase();

    if (ext === 'ipynb') {
      const ipynb = buildIpynb(codigo, nombre);
      const contenido = JSON.stringify(ipynb, null, 1);
      descargarBlob(contenido, nombre, 'application/json;charset=utf-8');
    } else if (ext === 'py') {
      descargarBlob(codigo, nombre, 'text/x-python;charset=utf-8');
    } else {
      alert('El nombre debe terminar en .py o .ipynb');
      return;
    }

    if (typeof showToast === 'function') showToast('Descargado: ' + nombre);
  }

  function descargarBlob(contenido, nombre, mime) {
    const blob = new Blob([contenido], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // EJECUTAR
  // ============================================================
  async function ejecutarIdle() {
    const contenedor = document.getElementById('idle-output');
    if (!contenedor) return;

    initEditor();
    if (!editorIdle) {
      contenedor.innerText = 'Editor no inicializado.';
      return;
    }

    const codigo = editorIdle.getValue();
    if (!codigo.trim()) {
      contenedor.innerText = 'El editor está vacío.';
      return;
    }

    if (typeof window.ejecutarYMostrar === 'function') {
      await window.ejecutarYMostrar(codigo, contenedor);
    } else {
      contenedor.innerText = 'El motor de Python no está listo. Espera unos segundos.';
    }
  }

  function limpiarIdle() {
    if (!editorIdle) return;
    if (!confirm('¿Borrar todo el código y la salida?')) return;
    editorIdle.setValue('');
    try {
      localStorage.removeItem(STORAGE_CODIGO);
    } catch (e) { /* ignorar */ }
    const contenedor = document.getElementById('idle-output');
    if (contenedor) contenedor.innerText = 'Presiona Ejecutar para ver el resultado...';
  }

  function idleCargarEjemplo() {
    if (!editorIdle) return;
    const ejemplos = [
      "print('Hola, mundo')",
      "n = 10\nfor i in range(1, n+1):\n    print(i, i**2)",
      "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(5))",
      "import math\nprint(math.pi)\nprint(math.sqrt(2))",
      "f = lambda x: x**3 - x - 2\nfor x in [1, 1.5, 2]:\n    print(f'f({x}) = {f(x)}')"
    ];
    const elegido = ejemplos[Math.floor(Math.random() * ejemplos.length)];
    editorIdle.setValue(elegido);
    if (typeof showToast === 'function') showToast('Ejemplo cargado');
  }

  // ============================================================
  // UTILIDADES .IPYNB
  // ============================================================
  function buildIpynb(codigo, nombre) {
    const lineas = codigo.split('\n');
    return {
      cells: [{
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: lineas.map((l, i, a) => i < a.length - 1 ? l + '\n' : l)
      }],
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

  function extraerCodigoDeIpynb(texto) {
    try {
      const ipynb = JSON.parse(texto);
      if (!ipynb.cells) return texto;
      return ipynb.cells
        .filter(c => c.cell_type === 'code')
        .map(c => Array.isArray(c.source) ? c.source.join('') : (c.source || ''))
        .join('\n\n');
    } catch (e) {
      return texto;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ============================================================
  // ABRIR / CERRAR
  // ============================================================
  function abrirIdle() {
    const modal = document.getElementById('modal-idle');
    if (!modal) return;

    initEditor();
    renderListaArchivos();

    setTimeout(() => {
      if (editorIdle) {
        try { editorIdle.refresh(); } catch (e) {}
        editorIdle.focus();
      }
    }, 100);

    modal.classList.add('open');
  }

  function cerrarIdle() {
    const modal = document.getElementById('modal-idle');
    if (modal) modal.classList.remove('open');
  }

  // ============================================================
  // TIRADOR DE REDIMENSIÓN
  // ============================================================
  function initResizeHandle() {
    const handle = document.getElementById('idle-resize-handle');
    const output = document.getElementById('idle-output');
    const modal = document.querySelector('.modal-idle-box');
    if (!handle || !output || !modal) return;

    let dragging = false;
    let startY = 0;
    let startH = 0;

    function iniciar(clientY) {
      dragging = true;
      startY = clientY;
      startH = output.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    function mover(clientY) {
      if (!dragging) return;
      const delta = startY - clientY;
      let nuevaAltura = startH + delta;
      const alturaModal = modal.offsetHeight;
      const maxH = alturaModal * MAX_OUTPUT_FACTOR;
      if (nuevaAltura < MIN_OUTPUT) nuevaAltura = MIN_OUTPUT;
      if (nuevaAltura > maxH) nuevaAltura = maxH;
      output.style.height = nuevaAltura + 'px';
      if (editorIdle) {
        try { editorIdle.refresh(); } catch (e) {}
      }
    }

    function terminar() {
      dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      iniciar(e.clientY);
    });
    document.addEventListener('mousemove', (e) => mover(e.clientY));
    document.addEventListener('mouseup', terminar);

    handle.addEventListener('touchstart', (e) => {
      iniciar(e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (dragging) {
        e.preventDefault();
        mover(e.touches[0].clientY);
      }
    }, { passive: false });
    document.addEventListener('touchend', terminar);
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    initResizeHandle();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('modal-idle');
        if (modal && modal.classList.contains('open')) cerrarIdle();
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        abrirIdle();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        const modal = document.getElementById('modal-idle');
        if (modal && modal.classList.contains('open')) {
          e.preventDefault();
          idleDescargar();
        }
      }
    });

    setTimeout(() => {
      renderListaArchivos();
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.abrirIdle = abrirIdle;
  window.cerrarIdle = cerrarIdle;
  window.ejecutarIdle = ejecutarIdle;
  window.limpiarIdle = limpiarIdle;
  window.idleCrearNotebook = idleCrearNotebook;
  window.idleCrearPy = idleCrearPy;
  window.idleImportar = idleImportar;
  window.idleImportarArchivo = idleImportarArchivo;
  window.idleRefrescar = idleRefrescar;
  window.idleDescargar = idleDescargar;
  window.idleConvertir = idleConvertir;
  window.idleCargarEjemplo = idleCargarEjemplo;

  window.buildIpynb = buildIpynb;
  window.extraerCodigoDeIpynb = extraerCodigoDeIpynb;
})();

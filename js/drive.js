/* ============================================
   drive.js — Google Drive + explorador + OAuth oculto
   v15 - Adaptado a la web unificada con admin oculto
   ============================================ */

(function () {
  'use strict';

  const CLIENT_ID = '420968434649-a5itml1n5ijtmin8fs1c5ug6bof0kv9o.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_FOLDER_NAME = 'Python_Análisis_Numérico';
  const MAX_IMPORT_MB = 5;
  const LIBS_FILE_NAME = '__librerias__.json';

  let driveToken = null;
  let driveFolderId = null;
  let currentFolderId = null;
  let currentFolderPath = [];
  let currentFileId = null;
  let currentFileName = null;
  let currentFileExt = 'ipynb';
  let guestMode = false;

  // ============================================================
  // ICONOS
  // ============================================================
  function getIconHtml(file) {
    const name = (file.name || '').toLowerCase();
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    if (isFolder) return '<span class="material-symbols-outlined" style="color:#f4b942">folder</span>';
    if (name.endsWith('.py')) return '<img src="iconos/python.svg" alt="Python" style="width:18px;height:18px;">';
    if (name.endsWith('.ipynb')) return '<img src="iconos/jupyter.svg" alt="Jupyter" style="width:18px;height:18px;">';
    return '<span class="material-symbols-outlined" style="color:var(--text-dim)">draft</span>';
  }

  function isEditableFile(name) {
    const n = (name || '').toLowerCase();
    return n.endsWith('.ipynb') || n.endsWith('.py');
  }

  function esArchivoOculto(nombre) {
    return nombre === LIBS_FILE_NAME;
  }

  function esAdmin() {
    return document.documentElement.getAttribute('data-admin') === 'true';
  }

  // ============================================================
  // OAUTH
  // ============================================================
  function connectDrive() {
    if (!esAdmin()) {
      showToast('Esta función solo está disponible para administradores', true);
      return;
    }
    if (typeof google === 'undefined' || !google.accounts) {
      showToast('Google Identity no disponible. Espera 5s.', true);
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) {
          showToast('Error: ' + response.error, true);
          return;
        }
        driveToken = response.access_token;
        guestMode = false;

        try {
          await ensureDriveFolder();
          updateDriveStatus(true);
          await actualizarListaArchivos();

          if (window.guardado) window.guardado.intentarSubirTodo();

          localStorage.setItem('drive_connected', '1');
          localStorage.setItem('drive_last_connect', Date.now());
          showToast('Conectado a Google Drive');
        } catch (e) {
          showToast('Error al preparar carpeta: ' + e.message, true);
        }
      }
    });
    client.requestAccessToken();
  }

  async function ensureDriveFolder() {
    const q = encodeURIComponent(
      `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
      { headers: { 'Authorization': 'Bearer ' + driveToken } }
    );
    const data = await res.json();

    if (data.files && data.files.length > 0) {
      driveFolderId = data.files[0].id;
    } else {
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + driveToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: DRIVE_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      const folder = await createRes.json();
      driveFolderId = folder.id;
    }
  }

  function updateDriveStatus(connected) {
    const el = document.getElementById('drive-status');
    if (!el) return;
    if (connected) {
      el.innerText = 'Drive: conectado';
      el.classList.add('connected');
    } else {
      el.innerText = 'Drive: no conectado';
      el.classList.remove('connected');
    }
  }

  // ============================================================
  // LISTADO
  // ============================================================
  async function actualizarListaArchivos() {
    if (guestMode) return;
    const ul = document.getElementById('entorno-file-list');
    if (!ul) return;

    if (!driveToken || !driveFolderId) {
      ul.innerHTML = '<li class="empty">Conecta tu Drive para ver archivos</li>';
      return;
    }

    const parent = currentFolderId || driveFolderId;
    const q = encodeURIComponent(`'${parent}' in parents and trashed=false`);

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&orderBy=folder,name&pageSize=200`,
        { headers: { 'Authorization': 'Bearer ' + driveToken } }
      );
      const data = await res.json();
      renderFileList(data.files || []);
    } catch (e) {
      showToast('Error al listar: ' + e.message, true);
    }
  }

  function renderFileList(files) {
    const ul = document.getElementById('entorno-file-list');
    if (!ul) return;
    ul.innerHTML = '';

    files = files.filter(f => !esArchivoOculto(f.name));

    if (files.length === 0) {
      ul.innerHTML = '<li class="empty">Carpeta vacía</li>';
      return;
    }

    files.forEach(f => {
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
      const li = document.createElement('li');
      li.dataset.id = f.id;
      li.dataset.name = f.name;
      li.dataset.type = isFolder ? 'folder' : 'file';
      li.innerHTML = `
        <span class="file-icon">${getIconHtml(f)}</span>
        <span class="name">${escapeHtml(f.name)}</span>
      `;

      li.addEventListener('click', () => {
        if (isFolder) navigateTo(f.id, f.name);
        else if (isEditableFile(f.name)) openFile(f.id, f.name);
      });

      ul.appendChild(li);
    });
  }

  function navigateTo(folderId, folderName) {
    if (folderId === 'root') {
      currentFolderId = null;
      currentFolderPath = [];
    } else {
      currentFolderId = folderId;
      currentFolderPath.push({ id: folderId, name: folderName });
    }
    actualizarBreadcrumb();
    actualizarListaArchivos();
  }

  function actualizarBreadcrumb() {
    const bc = document.getElementById('entorno-breadcrumb');
    if (!bc) return;
    let html = '<span>🏠 Raíz</span>';
    currentFolderPath.forEach(f => {
      html += ' / <span>' + escapeHtml(f.name) + '</span>';
    });
    bc.innerHTML = html;
  }

  // ============================================================
  // CREAR
  // ============================================================
  async function crearCarpeta() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }
    const name = prompt('Nombre de la carpeta:');
    if (!name) return;
    const parent = currentFolderId || driveFolderId;

    try {
      await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + driveToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parent]
        })
      });
      showToast('Carpeta creada: ' + name);
      actualizarListaArchivos();
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  async function crearNotebook() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }
    const name = prompt('Nombre del notebook (sin .ipynb):', 'nuevo');
    if (!name) return;
    await crearArchivoDrive(name.endsWith('.ipynb') ? name : name + '.ipynb', 'ipynb');
  }

  async function crearPythonFile() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }
    const name = prompt('Nombre del archivo Python (sin .py):', 'script');
    if (!name) return;
    await crearArchivoDrive(name.endsWith('.py') ? name : name + '.py', 'py');
  }

  async function crearArchivoDrive(filename, tipo) {
    const parent = currentFolderId || driveFolderId;
    const blob = tipo === 'ipynb'
      ? JSON.stringify(buildIpynb('', filename))
      : '';

    const metadata = {
      name: filename,
      mimeType: tipo === 'ipynb' ? 'application/json' : 'text/x-python',
      parents: [parent]
    };

    const boundary = 'foo_bar';
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${metadata.mimeType}\r\n\r\n` +
      `${blob}\r\n` +
      `--${boundary}--`;

    try {
      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + driveToken,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body
        }
      );
      const data = await res.json();
      showToast('Archivo creado: ' + filename);
      setTimeout(() => openFile(data.id, filename), 400);
      actualizarListaArchivos();
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  // ============================================================
  // IMPORTAR
  // ============================================================
  function abrirSelectorImportar() {
    const input = document.getElementById('import-input');
    if (input) { input.value = ''; input.click(); }
  }

  async function importarArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const nombre = file.name;
    const esValido = nombre.endsWith('.ipynb') || nombre.endsWith('.py');
    if (!esValido) { showToast('Solo .ipynb y .py', true); return; }
    if (file.size > MAX_IMPORT_MB * 1024 * 1024) {
      showToast(`El archivo supera los ${MAX_IMPORT_MB} MB`, true); return;
    }

    const contenido = await leerArchivoComoTexto(file);
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    const parent = currentFolderId || driveFolderId;
    const ext = nombre.substring(nombre.lastIndexOf('.') + 1);
    const mime = ext === 'ipynb' ? 'application/json' : 'text/x-python';
    const metadata = { name: nombre, mimeType: mime, parents: [parent] };
    const boundary = 'foo_bar';
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mime}\r\n\r\n` +
      `${contenido}\r\n` +
      `--${boundary}--`;

    try {
      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + driveToken,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body
        }
      );
      if (res.ok) { showToast('Importado: ' + nombre); actualizarListaArchivos(); }
      else { showToast('Error al importar', true); }
    } catch (e) { showToast('Error: ' + e.message, true); }
  }

  function leerArchivoComoTexto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  // ============================================================
  // ABRIR / GUARDAR
  // ============================================================
  async function openFile(fileId, fileName) {
    if (!isEditableFile(fileName)) { showToast('Solo .ipynb y .py', true); return; }

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { 'Authorization': 'Bearer ' + driveToken } }
      );

      if (res.status === 404) {
        showToast('El archivo ya no existe', true);
        currentFileId = null; currentFileName = null;
        return;
      }
      if (!res.ok) { showToast(`Error al abrir (${res.status})`, true); return; }

      let code = '';
      if (fileName.endsWith('.ipynb')) {
        const ipynb = await res.json();
        code = extractCodeFromIpynb(ipynb);
      } else {
        code = await res.text();
      }

      currentFileId = fileId;
      currentFileName = fileName;
      currentFileExt = fileName.split('.').pop();

      const fnInput = document.getElementById('entorno-filename');
      if (fnInput) fnInput.value = fileName;

      if (typeof editorsMap !== 'undefined' && editorsMap['entorno-editor']) {
        editorsMap['entorno-editor'].setValue(code);
      }

      showToast('Abierto: ' + fileName);
    } catch (e) { showToast('Error al abrir: ' + e.message, true); }
  }

  function guardarArchivoEntorno() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }
    const fnInput = document.getElementById('entorno-filename');
    const filename = (fnInput ? fnInput.value.trim() : '') || 'nuevo.ipynb';
    const ext = filename.split('.').pop();
    const code = (typeof editorsMap !== 'undefined' && editorsMap['entorno-editor'])
      ? editorsMap['entorno-editor'].getValue() : '';

    if (window.guardado) {
      window.guardado.guardarCambio({
        fileId: currentFileId,
        nombre: filename,
        ext: ext,
        contenido: code,
        parentId: currentFolderId || driveFolderId
      });
      showToast('Guardando...');
    }
  }

  // ============================================================
  // DESCARGAR / GENERAR .ipynb
  // ============================================================
  function descargarIpynb() {
    const filename = document.getElementById('entorno-filename')?.value || 'archivo.ipynb';
    const code = (typeof editorsMap !== 'undefined' && editorsMap['entorno-editor'])
      ? editorsMap['entorno-editor'].getValue() : '';
    if (filename.endsWith('.ipynb')) {
      const ipynb = buildIpynb(code, filename);
      descargarTexto(JSON.stringify(ipynb, null, 1), filename);
    } else {
      descargarTexto(code, filename);
    }
    showToast('Descargado: ' + filename);
  }

  function guardarComoIpynb() {
    const editor = (typeof editorsMap !== 'undefined') ? editorsMap['entorno-editor'] : null;
    if (!editor) { showToast('Editor no encontrado', true); return; }

    const code = editor.getValue();
    if (!code.trim()) { showToast('El editor está vacío', true); return; }

    const fnInput = document.getElementById('entorno-filename');
    let nombre = (fnInput && fnInput.value) ? fnInput.value : 'ejercicio';
    nombre = nombre.replace(/\.\w+$/, '');
    if (!nombre) nombre = 'ejercicio';

    const nombreIpynb = nombre + '.ipynb';
    const ipynb = buildIpynb(code, nombre);
    const contenido = JSON.stringify(ipynb, null, 1);

    // Si hay Drive, preguntar; si no, descargar
    if (!driveToken) {
      const ok = confirm(`Vas a generar "${nombreIpynb}".\n\n¿Descargar el archivo ahora?`);
      if (!ok) { showToast('Generación cancelada'); return; }
      descargarTexto(contenido, nombreIpynb);
      showToast('Descargado: ' + nombreIpynb);
      return;
    }

    const opcion = confirm(
      `Vas a generar "${nombreIpynb}".\n\n` +
      `Aceptar → Subir a Drive\n` +
      `Cancelar → Descargar al dispositivo`
    );
    if (opcion) subirIpynbADrive(contenido, nombreIpynb);
    else { descargarTexto(contenido, nombreIpynb); showToast('Descargado: ' + nombreIpynb); }
  }

  async function subirIpynbADrive(contenido, nombreIpynb) {
    const parentId = driveFolderId;
    if (!parentId) { showToast('No hay carpeta de Drive', true); return; }

    try {
      const q = encodeURIComponent(
        `name='${nombreIpynb}' and '${parentId}' in parents and trashed=false`
      );
      const buscar = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
        { headers: { 'Authorization': 'Bearer ' + driveToken } }
      );
      const buscarData = await buscar.json();
      let fileId = buscarData.files && buscarData.files.length > 0
        ? buscarData.files[0].id : null;

      if (fileId) {
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + driveToken, 'Content-Type': 'application/json' },
            body: contenido
          }
        );
      } else {
        const boundary = 'foo_bar';
        const metadata = { name: nombreIpynb, mimeType: 'application/json', parents: [parentId] };
        const body =
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${contenido}\r\n` +
          `--${boundary}--`;
        await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + driveToken,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
          }
        );
      }
      showToast('Subido a Drive: ' + nombreIpynb);
      actualizarListaArchivos();
    } catch (e) {
      showToast('Error al subir: ' + e.message, true);
    }
  }

  function descargarTexto(texto, nombre) {
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // UTILIDADES
  // ============================================================
  function buildIpynb(code, nombre) {
    return {
      cells: [
        { cell_type: 'markdown', metadata: {}, source: [`# ${nombre}\n`, '\n', 'Generado desde Python para Análisis Numérico.\n'] },
        { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: code.split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l) }
      ],
      metadata: {
        kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
        language_info: { name: 'python', version: '3.11' }
      },
      nbformat: 4, nbformat_minor: 5
    };
  }

  function extractCodeFromIpynb(ipynb) {
    if (!ipynb.cells) return '';
    return ipynb.cells.filter(c => c.cell_type === 'code')
      .map(c => Array.isArray(c.source) ? c.source.join('') : (c.source || ''))
      .join('\n\n');
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.connectDrive = connectDrive;
  window.actualizarListaArchivos = actualizarListaArchivos;
  window.crearCarpeta = crearCarpeta;
  window.crearNotebook = crearNotebook;
  window.crearPythonFile = crearPythonFile;
  window.abrirSelectorImportar = abrirSelectorImportar;
  window.importarArchivo = importarArchivo;
  window.guardarArchivoEntorno = guardarArchivoEntorno;
  window.descargarIpynb = descargarIpynb;
  window.guardarComoIpynb = guardarComoIpynb;
  window.getDriveToken = () => driveToken;
  window.getDriveFolderId = () => driveFolderId;
  window.isGuestMode = () => guestMode;
  window.mostrarBannerReconectar = () => {};
  window.actualizarFileIdActual = (nombre, fileId) => {
    if (currentFileName === nombre) currentFileId = fileId;
  };
})();

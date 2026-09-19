/* ============================================
   drive.js — Google Drive + explorador de archivos
   ============================================ */

(function () {
  'use strict';

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================
  const CLIENT_ID = '420968434649-a5itml1n5ijtmin8fs1c5ug6bof0kv9o.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_FOLDER_NAME = 'Python_Análisis_Numérico';

  // ============================================================
  // ESTADO
  // ============================================================
  let driveToken = null;
  let driveFolderId = null;
  let currentFolderId = null;       // null = raíz
  let currentFolderPath = [];       // [{id, name}, ...]
  let currentFileId = null;
  let currentFileName = null;

  // ============================================================
  // CONEXIÓN CON GOOGLE DRIVE
  // ============================================================

  /**
   * Inicia el flujo OAuth para conectar con Drive.
   */
  function connectDrive() {
    if (typeof google === 'undefined' || !google.accounts) {
      showToast('Google Identity no disponible. Espera 5s y reintenta.', true);
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) {
          showToast('Error: ' + response.error, true);
          console.error('[drive] OAuth error:', response);
          return;
        }
        driveToken = response.access_token;

        try {
          await ensureDriveFolder();
          updateDriveStatus(true);
          showToast('Conectado a Google Drive');

          const setup = document.getElementById('drive-setup');
          const layout = document.getElementById('env-layout');
          if (setup) setup.style.display = 'none';
          if (layout) layout.style.display = 'grid';

          await refreshFileList();

          setTimeout(() => {
            if (typeof editorsMap !== 'undefined') {
              Object.values(editorsMap).forEach(ed => {
                try { ed.refresh(); } catch (e) {}
              });
            }
          }, 100);
        } catch (e) {
          showToast('Error al preparar carpeta: ' + e.message, true);
          console.error('[drive]', e);
        }
      }
    });

    client.requestAccessToken();
  }

  /**
   * Asegura que la carpeta raíz exista en el Drive.
   * Si no existe, la crea.
   */
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

  /**
   * Actualiza el badge de estado del Drive.
   */
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
  // LISTADO Y NAVEGACIÓN
  // ============================================================

  /**
   * Refresca la lista de archivos de la carpeta actual.
   */
  async function refreshFileList() {
    const ul = document.getElementById('env-file-list');
    if (!ul) return;

    if (!driveToken || !driveFolderId) {
      ul.innerHTML = '<li class="empty">Conecta tu Drive para ver tus archivos</li>';
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
      console.error('[drive]', e);
    }
  }

  /**
   * Renderiza la lista de archivos en la barra lateral.
   */
  function renderFileList(files) {
    const ul = document.getElementById('env-file-list');
    if (!ul) return;
    ul.innerHTML = '';

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
        <span class="icon">${isFolder ? '📁' : '📄'}</span>
        <span class="name">${escapeHtml(f.name)}</span>
        <span class="delete-btn" title="Borrar">🗑️</span>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
          e.stopPropagation();
          deleteItem(f.id, f.name, isFolder);
          return;
        }
        if (isFolder) {
          navigateTo(f.id, f.name);
        } else {
          openFile(f.id, f.name);
        }
      });

      ul.appendChild(li);
    });
  }

  /**
   * Navega a una carpeta o vuelve a la raíz.
   */
  function navigateTo(folderId, folderName) {
    if (folderId === 'root') {
      currentFolderId = null;
      currentFolderPath = [];
    } else {
      currentFolderId = folderId;
      currentFolderPath.push({ id: folderId, name: folderName });
    }
    renderBreadcrumb();
    refreshFileList();
  }

  /**
   * Navega a un nivel específico del breadcrumb.
   */
  function navigateToPath(index) {
    currentFolderPath = currentFolderPath.slice(0, index + 1);
    currentFolderId = currentFolderPath[index].id;
    renderBreadcrumb();
    refreshFileList();
  }

  /**
   * Renderiza el breadcrumb de navegación.
   */
  function renderBreadcrumb() {
    const bc = document.getElementById('env-breadcrumb');
    if (!bc) return;

    let html = `<a onclick="navigateTo('root')">🏠 Raíz</a>`;
    currentFolderPath.forEach((f, i) => {
      html += ` <span class="sep">/</span> `;
      if (i === currentFolderPath.length - 1) {
        html += `<span>📁 ${escapeHtml(f.name)}</span>`;
      } else {
        html += `<a onclick="navigateToPath(${i})">📁 ${escapeHtml(f.name)}</a>`;
      }
    });
    bc.innerHTML = html;
  }

  // ============================================================
  // CREAR CARPETAS Y ARCHIVOS
  // ============================================================

  /**
   * Crea una nueva carpeta dentro de la carpeta actual.
   */
  async function createFolder() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    const name = prompt('Nombre de la nueva carpeta:');
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
      refreshFileList();
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  /**
   * Crea un nuevo notebook .ipynb dentro de la carpeta actual.
   */
  async function createNotebook() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    const name = prompt('Nombre del nuevo notebook (sin .ipynb):', 'nuevo');
    if (!name) return;

    const filename = name.endsWith('.ipynb') ? name : name + '.ipynb';
    const parent = currentFolderId || driveFolderId;
    const emptyIpynb = buildIpynb('# ' + name + '\n\n# Escribe tu código aquí\n', name);

    const metadata = {
      name: filename,
      mimeType: 'application/json',
      parents: [parent]
    };
    const boundary = 'foo_bar';
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(emptyIpynb)}\r\n` +
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
      showToast('Notebook creado: ' + filename);
      setTimeout(() => openFile(data.id, filename), 400);
      refreshFileList();
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  // ============================================================
  // ABRIR / GUARDAR ARCHIVOS
  // ============================================================

  /**
   * Abre un archivo .ipynb desde el Drive y lo carga en el editor.
   */
  async function openFile(fileId, fileName) {
    if (!fileName.endsWith('.ipynb')) {
      showToast('Solo se abren notebooks .ipynb', true);
      return;
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { 'Authorization': 'Bearer ' + driveToken } }
      );
      const ipynb = await res.json();
      const code = extractCodeFromIpynb(ipynb);

      currentFileId = fileId;
      currentFileName = fileName;

      const filenameInput = document.getElementById('env-filename');
      if (filenameInput) filenameInput.value = fileName;

      if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
        editorsMap['env-editor'].setValue(code);
      }

      const out = document.getElementById('env-output');
      if (out) out.innerText = 'Abierto: ' + fileName;

      showToast('Abierto: ' + fileName);

      document.querySelectorAll('#env-file-list li').forEach(li => {
        li.classList.toggle('active', li.dataset.id === fileId);
      });
    } catch (e) {
      showToast('Error al abrir: ' + e.message, true);
    }
  }

  /**
   * Guarda el contenido del editor en el Drive.
   */
  async function saveEnvToDrive() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    const filenameInput = document.getElementById('env-filename');
    const filename = (filenameInput ? filenameInput.value.trim() : '') || 'nuevo.ipynb';
    const nombre = filename.replace('.ipynb', '');

    if (typeof editorsMap === 'undefined' || !editorsMap['env-editor']) return;
    const code = editorsMap['env-editor'].getValue();
    const ipynb = buildIpynb(code, nombre);

    const parent = currentFolderId || driveFolderId;
    let fileId = currentFileId;

    // Si no tenemos un archivo abierto, buscar uno con el mismo nombre en la carpeta
    if (!fileId) {
      const q = encodeURIComponent(
        `name='${filename}' and '${parent}' in parents and trashed=false`
      );
      const search = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
        { headers: { 'Authorization': 'Bearer ' + driveToken } }
      );
      const searchData = await search.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }
    }

    let url, method;
    if (fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      method = 'PATCH';
    } else {
      url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
      method = 'POST';
    }

    const boundary = 'foo_bar';
    const metadata = { name: filename, mimeType: 'application/json', parents: [parent] };
    const body = method === 'POST'
      ? `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(ipynb)}\r\n--${boundary}--`
      : JSON.stringify(ipynb);

    const headers = method === 'POST'
      ? { 'Authorization': 'Bearer ' + driveToken, 'Content-Type': `multipart/related; boundary=${boundary}` }
      : { 'Authorization': 'Bearer ' + driveToken, 'Content-Type': 'application/json' };

    try {
      const res = await fetch(url, { method, headers, body });
      const data = await res.json();
      if (method === 'POST' && data.id) {
        currentFileId = data.id;
        currentFileName = filename;
      }
      showToast('Guardado: ' + filename);
      refreshFileList();
    } catch (e) {
      showToast('Error al guardar: ' + e.message, true);
    }
  }

  /**
   * Guarda el contenido de un editor de la Guía en la carpeta raíz del Drive.
   */
  async function saveEditorToDrive(editorId, nombre, silent = false) {
    if (!driveToken) {
      if (!silent) showToast('Conecta Drive primero', true);
      return;
    }
    if (typeof editorsMap === 'undefined' || !editorsMap[editorId]) return;

    const code = editorsMap[editorId].getValue();
    const ipynb = buildIpynb(code, nombre);

    // Buscar archivo con ese nombre en la carpeta raíz
    const q = encodeURIComponent(
      `name='${nombre}.ipynb' and '${driveFolderId}' in parents and trashed=false`
    );
    const search = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
      { headers: { 'Authorization': 'Bearer ' + driveToken } }
    );
    const searchData = await search.json();

    let url, method;
    if (searchData.files && searchData.files.length > 0) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${searchData.files[0].id}?uploadType=media`;
      method = 'PATCH';
    } else {
      url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      method = 'POST';
    }

    const boundary = 'foo_bar';
    const metadata = { name: nombre + '.ipynb', mimeType: 'application/json', parents: [driveFolderId] };
    const body = method === 'POST'
      ? `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(ipynb)}\r\n--${boundary}--`
      : JSON.stringify(ipynb);

    const headers = method === 'POST'
      ? { 'Authorization': 'Bearer ' + driveToken, 'Content-Type': `multipart/related; boundary=${boundary}` }
      : { 'Authorization': 'Bearer ' + driveToken, 'Content-Type': 'application/json' };

    try {
      const res = await fetch(url, { method, headers, body });
      if (res.ok) {
        if (!silent) showToast('Guardado: ' + nombre + '.ipynb');
      } else {
        if (!silent) showToast('Error al guardar', true);
      }
    } catch (e) {
      if (!silent) showToast('Error: ' + e.message, true);
    }
  }

  // ============================================================
  // BORRAR
  // ============================================================

  async function deleteCurrentFile() {
    if (!currentFileId) { showToast('No hay archivo abierto', true); return; }
    const name = currentFileName || 'archivo';
    if (!confirm(`¿Borrar "${name}"?`)) return;
    await deleteItem(currentFileId, name, false);
  }

  async function deleteItem(fileId, name, isFolder) {
    const msg = isFolder
      ? `¿Borrar la carpeta "${name}" y TODO su contenido?`
      : `¿Borrar "${name}"?`;
    if (!confirm(msg)) return;

    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + driveToken }
      });
      showToast('Borrado: ' + name);

      if (fileId === currentFileId) {
        currentFileId = null;
        currentFileName = null;
        if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
          editorsMap['env-editor'].setValue('');
        }
        const filenameInput = document.getElementById('env-filename');
        if (filenameInput) filenameInput.value = 'nuevo.ipynb';
      }
      refreshFileList();
    } catch (e) {
      showToast('Error al borrar: ' + e.message, true);
    }
  }

  // ============================================================
  // ABRIR EN COLAB
  // ============================================================

  async function openInColab() {
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    let fileId = currentFileId;
    if (!fileId) {
      await saveEnvToDrive();
      fileId = currentFileId;
      if (!fileId) { showToast('No se pudo guardar', true); return; }
    }

    window.open(`https://colab.research.google.com/drive/${fileId}`, '_blank');
  }

  // ============================================================
  // EXPORTAR A .IPYNB (DESCARGA LOCAL)
  // ============================================================

  function exportToIpynb(editorId, nombre) {
    if (typeof editorsMap === 'undefined' || !editorsMap[editorId]) return;

    const code = editorsMap[editorId].getValue();
    const ipynb = buildIpynb(code, nombre);
    const blob = new Blob([JSON.stringify(ipynb, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre + '.ipynb';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Descargado: ' + nombre + '.ipynb');
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  /**
   * Construye un objeto .ipynb estándar a partir de código Python.
   */
  function buildIpynb(code, nombre) {
    return {
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            `# ${nombre}\n`,
            '\n',
            'Generado desde la guía de Python para Análisis Numérico.\n'
          ]
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: code.split('\n').map((l, i, a) =>
            i < a.length - 1 ? l + '\n' : l
          )
        }
      ],
      metadata: {
        kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
        language_info: { name: 'python', version: '3.11' }
      },
      nbformat: 4,
      nbformat_minor: 5
    };
  }

  /**
   * Extrae el código Python de un objeto .ipynb.
   */
  function extractCodeFromIpynb(ipynb) {
    if (!ipynb.cells) return '';
    return ipynb.cells
      .filter(c => c.cell_type === 'code')
      .map(c => Array.isArray(c.source) ? c.source.join('') : (c.source || ''))
      .join('\n\n');
  }

  /**
   * Escapa HTML para evitar inyección en nombres de archivo.
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================================
  // EXPONER FUNCIONES GLOBALMENTE
  // ============================================================
  window.connectDrive = connectDrive;
  window.refreshFileList = refreshFileList;
  window.navigateTo = navigateTo;
  window.navigateToPath = navigateToPath;
  window.createFolder = createFolder;
  window.createNotebook = createNotebook;
  window.openFile = openFile;
  window.saveEnvToDrive = saveEnvToDrive;
  window.saveEditorToDrive = saveEditorToDrive;
  window.deleteCurrentFile = deleteCurrentFile;
  window.deleteItem = deleteItem;
  window.openInColab = openInColab;
  window.exportToIpynb = exportToIpynb;
})();
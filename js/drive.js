/* ============================================
   drive.js — Google Drive + explorador de archivos
   v3 - Con sistema de guardado en 3 capas
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
  let currentFolderId = null;
  let currentFolderPath = [];
  let currentFileId = null;
  let currentFileName = null;
  let currentFileExt = 'ipynb';
  let guestMode = false;
  let itemMenuTarget = null;

  // ============================================================
  // ICONOS
  // ============================================================

  function getIconHtml(file) {
    const name = (file.name || '').toLowerCase();
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

    if (isFolder) {
      return '<span class="material-symbols-outlined" style="color:#f4b942">folder</span>';
    }
    if (name.endsWith('.py')) {
      return '<img src="iconos/python.svg" alt="Python">';
    }
    if (name.endsWith('.ipynb')) {
      return '<img src="iconos/jupyter.svg" alt="Jupyter">';
    }
    if (name.endsWith('.txt') || name.endsWith('.md')) {
      return '<span class="material-symbols-outlined" style="color:#a0a0a0">description</span>';
    }
    if (name.endsWith('.csv') || name.endsWith('.xlsx')) {
      return '<span class="material-symbols-outlined" style="color:#4ec9b0">table_chart</span>';
    }
    if (name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      return '<span class="material-symbols-outlined" style="color:#c586c0">image</span>';
    }
    return '<span class="material-symbols-outlined" style="color:var(--text-dim)">draft</span>';
  }

  function isEditableFile(name) {
    const n = (name || '').toLowerCase();
    return n.endsWith('.ipynb') || n.endsWith('.py');
  }

  // ============================================================
  // CONEXIÓN CON DRIVE
  // ============================================================

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
          return;
        }
        driveToken = response.access_token;
        guestMode = false;

        try {
          await ensureDriveFolder();
          updateDriveStatus(true);

          const gw = document.getElementById('guest-warning');
          if (gw) gw.style.display = 'none';

          const setup = document.getElementById('drive-setup');
          const layout = document.getElementById('env-layout');
          if (setup) setup.style.display = 'none';
          if (layout) layout.style.display = 'grid';

          await refreshFileList();

          // Al conectar, intentar subir pendientes
          if (window.guardado) window.guardado.intentarSubirTodo();

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
  // MODO INVITADO
  // ============================================================

  function activarModoInvitado() {
    guestMode = true;
    driveToken = null;
    updateDriveStatus(false);

    const setup = document.getElementById('drive-setup');
    const layout = document.getElementById('env-layout');
    if (setup) setup.style.display = 'none';
    if (layout) layout.style.display = 'grid';

    let gw = document.getElementById('guest-warning');
    if (!gw) {
      gw = document.createElement('div');
      gw.id = 'guest-warning';
      const main = document.querySelector('.env-main');
      if (main) main.insertBefore(gw, main.firstChild);
    }
    gw.style.display = 'block';
    gw.innerHTML = '<strong>Modo invitado:</strong> puedes escribir y ejecutar código, pero no guardar en la nube. Descarga tus archivos antes de cerrar la página o perderás el trabajo.';

    const savedCode = localStorage.getItem('guest_code') || '';
    const savedName = localStorage.getItem('guest_filename') || 'invitado.ipynb';
    if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
      editorsMap['env-editor'].setValue(savedCode);
    }
    const fnInput = document.getElementById('env-filename');
    if (fnInput) fnInput.value = savedName;

    refreshGuestFileList();
    showToast('Modo invitado activado');
  }

  function refreshGuestFileList() {
    const ul = document.getElementById('env-file-list');
    if (!ul) return;
    const files = JSON.parse(localStorage.getItem('guest_files') || '[]');

    ul.innerHTML = '';
    if (files.length === 0) {
      ul.innerHTML = '<li class="empty">Sin archivos guardados localmente</li>';
      return;
    }

    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.dataset.id = 'guest-' + i;
      li.innerHTML = `
        <span class="file-icon">${getIconHtml({name: f.name, mimeType: 'application/json'})}</span>
        <span class="name">${escapeHtml(f.name)}</span>
        <button class="menu-btn" title="Opciones"><span class="material-symbols-outlined">more_vert</span></button>
      `;
      li.addEventListener('click', (e) => {
        if (e.target.closest('.menu-btn')) {
          e.stopPropagation();
          abrirMenuInvitado(e.target.closest('.menu-btn'), i, f.name);
          return;
        }
        if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
          editorsMap['env-editor'].setValue(f.content || '');
        }
        const fnInput = document.getElementById('env-filename');
        if (fnInput) fnInput.value = f.name;
        document.querySelectorAll('#env-file-list li').forEach(x => x.classList.remove('active'));
        li.classList.add('active');
        showToast('Abierto: ' + f.name);
      });
      ul.appendChild(li);
    });
  }

  function abrirMenuInvitado(anchor, index, nombre) {
    const opciones = [
      { icon: 'download', label: 'Descargar', fn: () => descargarArchivoInvitado(index, nombre) },
      { icon: 'drive_file_rename_outline', label: 'Renombrar', fn: () => renombrarInvitado(index) },
      { icon: 'delete', label: 'Eliminar', fn: () => eliminarInvitado(index), danger: true }
    ];
    abrirMenuFlotante(anchor, opciones);
  }

  function descargarArchivoInvitado(index, nombre) {
    const files = JSON.parse(localStorage.getItem('guest_files') || '[]');
    const f = files[index];
    if (!f) return;
    descargarTexto(f.content, f.name);
    cerrarMenuFlotante();
  }

  function renombrarInvitado(index) {
    const files = JSON.parse(localStorage.getItem('guest_files') || '[]');
    if (!files[index]) return;
    abrirModalRenombrar(files[index].name, async (nuevoNombre) => {
      files[index].name = nuevoNombre;
      localStorage.setItem('guest_files', JSON.stringify(files));
      refreshGuestFileList();
      showToast('Renombrado: ' + nuevoNombre);
    });
  }

  function eliminarInvitado(index) {
    const files = JSON.parse(localStorage.getItem('guest_files') || '[]');
    if (!files[index]) return;
    abrirModalEliminar(files[index].name, false, () => {
      files.splice(index, 1);
      localStorage.setItem('guest_files', JSON.stringify(files));
      refreshGuestFileList();
      showToast('Eliminado');
    });
  }

  function guardarArchivoInvitado() {
    const nombre = (document.getElementById('env-filename').value || 'invitado.ipynb').trim();
    const content = typeof editorsMap !== 'undefined' && editorsMap['env-editor']
      ? editorsMap['env-editor'].getValue()
      : '';
    const files = JSON.parse(localStorage.getItem('guest_files') || '[]');
    const existing = files.findIndex(f => f.name === nombre);
    if (existing >= 0) {
      files[existing].content = content;
    } else {
      files.push({ name: nombre, content: content });
    }
    localStorage.setItem('guest_files', JSON.stringify(files));
    refreshGuestFileList();
    showToast('Guardado localmente');
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
  // LISTADO Y NAVEGACIÓN
  // ============================================================

  async function refreshFileList() {
    if (guestMode) {
      refreshGuestFileList();
      return;
    }
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
    }
  }

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
        <span class="file-icon">${getIconHtml(f)}</span>
        <span class="name">${escapeHtml(f.name)}</span>
        <button class="menu-btn" title="Opciones"><span class="material-symbols-outlined">more_vert</span></button>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.closest('.menu-btn')) {
          e.stopPropagation();
          abrirMenuArchivo(e.target.closest('.menu-btn'), f, isFolder);
          return;
        }
        if (isFolder) {
          navigateTo(f.id, f.name);
        } else if (isEditableFile(f.name)) {
          openFile(f.id, f.name);
        } else {
          showToast('Este archivo no se puede abrir en el editor', true);
        }
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
    renderBreadcrumb();
    refreshFileList();
  }

  function navigateToPath(index) {
    currentFolderPath = currentFolderPath.slice(0, index + 1);
    currentFolderId = currentFolderPath[index].id;
    renderBreadcrumb();
    refreshFileList();
  }

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
  // CREAR
  // ============================================================

  async function createFolder() {
    if (guestMode) {
      showToast('Modo invitado: no se pueden crear carpetas en Drive', true);
      return;
    }
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

  async function createNotebook() {
    if (guestMode) {
      crearArchivoInvitado('ipynb');
      return;
    }
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    const name = prompt('Nombre del notebook (sin .ipynb):', 'nuevo');
    if (!name) return;
    await crearArchivoDrive(name.endsWith('.ipynb') ? name : name + '.ipynb', 'ipynb');
  }

  async function createPythonFile() {
    if (guestMode) {
      crearArchivoInvitado('py');
      return;
    }
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    const name = prompt('Nombre del archivo Python (sin .py):', 'script');
    if (!name) return;
    await crearArchivoDrive(name.endsWith('.py') ? name : name + '.py', 'py');
  }

  function crearArchivoInvitado(ext) {
    const nombre = prompt('Nombre del archivo (sin extensión):', 'nuevo');
    if (!nombre) return;
    const finalName = nombre + '.' + ext;
    const files = JSON.parse(localStorage.getItem('guest_files') || '[]');
    files.push({ name: finalName, content: '' });
    localStorage.setItem('guest_files', JSON.stringify(files));
    refreshGuestFileList();
    showToast('Archivo creado: ' + finalName);
  }

  async function crearArchivoDrive(filename, tipo) {
    const parent = currentFolderId || driveFolderId;
    const contenidoInicial = '# ' + filename + '\n\n';
    const blob = tipo === 'ipynb'
      ? JSON.stringify(buildIpynb(contenidoInicial, filename))
      : contenidoInicial;

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
      refreshFileList();
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  // ============================================================
  // MENÚ FLOTANTE
  // ============================================================

  function abrirMenuArchivo(anchor, file, isFolder) {
    const opciones = [];

    opciones.push({
      icon: 'share',
      label: 'Compartir',
      fn: () => abrirModalCompartir(file.id, file.name)
    });
    opciones.push({
      icon: 'drive_file_rename_outline',
      label: 'Renombrar',
      fn: () => abrirModalRenombrar(file.name, async (nuevo) => {
        await renombrarItemDrive(file.id, nuevo);
      })
    });
    opciones.push({
      icon: 'content_copy',
      label: 'Copiar',
      fn: () => abrirModalCopiar(file.name, async (nuevo) => {
        await copiarItemDrive(file.id, nuevo);
      })
    });
    opciones.push({
      icon: 'drive_file_move',
      label: 'Mover',
      fn: () => abrirModalMover(file.id, file.name)
    });
    opciones.push({
      icon: 'delete',
      label: 'Eliminar',
      danger: true,
      fn: () => abrirModalEliminar(file.name, isFolder, async () => {
        await eliminarItemDrive(file.id, file.name);
      })
    });

    abrirMenuFlotante(anchor, opciones);
  }

  function abrirMenuFlotante(anchor, opciones) {
    cerrarMenuFlotante();
    const menu = document.getElementById('item-menu');
    if (!menu) return;

    menu.innerHTML = '';
    opciones.forEach(op => {
      const btn = document.createElement('button');
      if (op.danger) btn.classList.add('danger');
      btn.innerHTML = `<span class="material-symbols-outlined">${op.icon}</span><span>${op.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cerrarMenuFlotante();
        op.fn();
      });
      menu.appendChild(btn);
    });

    const rect = anchor.getBoundingClientRect();
    const menuWidth = 180;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    let top = rect.bottom + 4;
    if (top + 220 > window.innerHeight) {
      top = rect.top - 8;
      menu.style.transform = 'translateY(-100%)';
    } else {
      menu.style.transform = 'none';
    }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('open');
    itemMenuTarget = anchor;

    setTimeout(() => {
      document.addEventListener('click', cerrarMenuFuera, { once: true });
    }, 10);
  }

  function cerrarMenuFuera(e) {
    const menu = document.getElementById('item-menu');
    if (!menu) return;
    if (menu.contains(e.target)) return;
    cerrarMenuFlotante();
  }

  function cerrarMenuFlotante() {
    const menu = document.getElementById('item-menu');
    if (menu) menu.classList.remove('open');
    itemMenuTarget = null;
  }

  // ============================================================
  // MODALES
  // ============================================================

  function abrirModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  }

  function cerrarModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  }

  function cerrarTodosLosModales() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  }

  function abrirModalRenombrar(nombreActual, callback) {
    const input = document.getElementById('rename-input');
    const box = document.getElementById('modal-rename');
    if (!input || !box) return;
    input.value = nombreActual;
    box._callback = callback;
    abrirModal('modal-rename');
    setTimeout(() => { input.focus(); input.select(); }, 100);
  }

  function confirmarRenombrar() {
    const input = document.getElementById('rename-input');
    const box = document.getElementById('modal-rename');
    if (!input || !box) return;
    const nuevo = input.value.trim();
    if (!nuevo) return;
    cerrarModal('modal-rename');
    if (box._callback) box._callback(nuevo);
  }

  function abrirModalCopiar(nombreActual, callback) {
    const input = document.getElementById('copy-input');
    const box = document.getElementById('modal-copy');
    if (!input || !box) return;
    const ext = nombreActual.substring(nombreActual.lastIndexOf('.'));
    const base = nombreActual.substring(0, nombreActual.lastIndexOf('.'));
    input.value = base + '_copia' + ext;
    box._callback = callback;
    abrirModal('modal-copy');
    setTimeout(() => { input.focus(); input.select(); }, 100);
  }

  function confirmarCopiar() {
    const input = document.getElementById('copy-input');
    const box = document.getElementById('modal-copy');
    if (!input || !box) return;
    const nuevo = input.value.trim();
    if (!nuevo) return;
    cerrarModal('modal-copy');
    if (box._callback) box._callback(nuevo);
  }

  function abrirModalEliminar(nombre, esCarpeta, callback) {
    const texto = document.getElementById('delete-text');
    const box = document.getElementById('modal-delete');
    if (!texto || !box) return;
    texto.innerHTML = esCarpeta
      ? `Se eliminará la carpeta <strong>${escapeHtml(nombre)}</strong> y <strong>todo su contenido</strong>. Esta acción no se puede deshacer.`
      : `Se eliminará el archivo <strong>${escapeHtml(nombre)}</strong>. Esta acción no se puede deshacer.`;
    box._callback = callback;
    abrirModal('modal-delete');
  }

  function confirmarEliminar() {
    const box = document.getElementById('modal-delete');
    if (!box) return;
    cerrarModal('modal-delete');
    if (box._callback) box._callback();
  }

  function abrirModalCompartir(fileId, nombre) {
    const box = document.getElementById('modal-share');
    if (!box) return;
    document.getElementById('share-email').value = '';
    document.getElementById('share-name').innerText = nombre;
    box.dataset.fileId = fileId;
    document.querySelectorAll('#modal-share .radio-option').forEach(o => o.classList.remove('selected'));
    document.querySelector('#modal-share .radio-option[data-role="reader"]').classList.add('selected');
    abrirModal('modal-share');
  }

  function seleccionarRolShare(el) {
    document.querySelectorAll('#modal-share .radio-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  }

  async function confirmarCompartir() {
    const box = document.getElementById('modal-share');
    if (!box) return;
    const fileId = box.dataset.fileId;
    const email = document.getElementById('share-email').value.trim();
    const rolSelected = document.querySelector('#modal-share .radio-option.selected');
    if (!email || !rolSelected) { showToast('Completa los datos', true); return; }

    const role = rolSelected.dataset.role;
    cerrarModal('modal-share');

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + driveToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'user',
            role: role,
            emailAddress: email
          })
        }
      );

      if (res.ok) {
        showToast('Compartido con ' + email);
      } else {
        const err = await res.json();
        showToast('Error: ' + (err.error?.message || 'no se pudo compartir'), true);
      }
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  async function abrirModalMover(fileId, nombre) {
    const box = document.getElementById('modal-move');
    const list = document.getElementById('move-folder-list');
    if (!box || !list) return;

    box.dataset.fileId = fileId;
    document.getElementById('move-name').innerText = nombre;
    list.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-dim);font-size:0.8rem">Cargando carpetas...</div>';

    abrirModal('modal-move');

    try {
      const q = encodeURIComponent(
        `mimeType='application/vnd.google-apps.folder' and trashed=false and '${driveFolderId}' in parents`
      );
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=100`,
        { headers: { 'Authorization': 'Bearer ' + driveToken } }
      );
      const data = await res.json();

      list.innerHTML = '';
      const rootBtn = document.createElement('button');
      rootBtn.innerHTML = '<span class="material-symbols-outlined" style="color:#f4b942">folder</span> 🏠 Raíz';
      rootBtn.dataset.folderId = driveFolderId;
      rootBtn.addEventListener('click', () => {
        list.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
        rootBtn.classList.add('selected');
      });
      list.appendChild(rootBtn);

      (data.files || []).forEach(f => {
        const btn = document.createElement('button');
        btn.innerHTML = `<span class="material-symbols-outlined" style="color:#f4b942">folder</span> ${escapeHtml(f.name)}`;
        btn.dataset.folderId = f.id;
        btn.addEventListener('click', () => {
          list.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
        list.appendChild(btn);
      });
    } catch (e) {
      list.innerHTML = '<div style="padding:1rem;color:var(--danger)">Error al cargar carpetas</div>';
    }
  }

  async function confirmarMover() {
    const box = document.getElementById('modal-move');
    if (!box) return;
    const fileId = box.dataset.fileId;
    const selected = document.querySelector('#move-folder-list button.selected');
    if (!selected) { showToast('Selecciona una carpeta destino', true); return; }

    const newParent = selected.dataset.folderId;
    const oldParent = currentFolderId || driveFolderId;
    cerrarModal('modal-move');

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParent}&removeParents=${oldParent}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + driveToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );
      if (res.ok) {
        showToast('Movido correctamente');
        refreshFileList();
      } else {
        showToast('Error al mover', true);
      }
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  // ============================================================
  // OPERACIONES DRIVE
  // ============================================================

  async function renombrarItemDrive(fileId, nuevoNombre) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + driveToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: nuevoNombre })
        }
      );
      if (res.ok) {
        showToast('Renombrado: ' + nuevoNombre);
        if (fileId === currentFileId) {
          currentFileName = nuevoNombre;
          const fnInput = document.getElementById('env-filename');
          if (fnInput) fnInput.value = nuevoNombre;
        }
        refreshFileList();
      } else {
        showToast('Error al renombrar', true);
      }
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  async function copiarItemDrive(fileId, nuevoNombre) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/copy`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + driveToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: nuevoNombre,
            parents: [currentFolderId || driveFolderId]
          })
        }
      );
      if (res.ok) {
        showToast('Copiado: ' + nuevoNombre);
        refreshFileList();
      } else {
        showToast('Error al copiar', true);
      }
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  async function eliminarItemDrive(fileId, nombre) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + driveToken }
        }
      );
      if (res.ok) {
        showToast('Eliminado: ' + nombre);
        if (fileId === currentFileId) {
          currentFileId = null;
          currentFileName = null;
        }
        refreshFileList();
      } else {
        showToast('Error al eliminar', true);
      }
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  }

  // ============================================================
  // ABRIR / GUARDAR
  // ============================================================

  async function openFile(fileId, fileName) {
    if (guestMode) return;
    if (!isEditableFile(fileName)) {
      showToast('Solo se abren archivos .ipynb y .py', true);
      return;
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { 'Authorization': 'Bearer ' + driveToken } }
      );

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

  async function saveEnvToDrive() {
    if (guestMode) {
      guardarArchivoInvitado();
      return;
    }
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    const filenameInput = document.getElementById('env-filename');
    const filename = (filenameInput ? filenameInput.value.trim() : '') || 'nuevo.ipynb';
    const ext = filename.split('.').pop();

    const code = (typeof editorsMap !== 'undefined' && editorsMap['env-editor'])
      ? editorsMap['env-editor'].getValue()
      : '';

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

  async function saveEditorToDrive(editorId, nombre, silent) {
    if (guestMode) {
      if (!silent) showToast('Modo invitado: usa Descargar para guardar el archivo', true);
      return;
    }
    if (!driveToken) {
      if (!silent) showToast('Conecta Drive primero', true);
      return;
    }
    if (typeof editorsMap === 'undefined' || !editorsMap[editorId]) return;

    const code = editorsMap[editorId].getValue();

    if (window.guardado) {
      window.guardado.guardarCambio({
        fileId: null,
        nombre: nombre + '.ipynb',
        ext: 'ipynb',
        contenido: code,
        parentId: driveFolderId
      });
    }
  }

  // ============================================================
  // AUTOGUARDADO
  // ============================================================

  function marcarCambio() {
    const status = document.getElementById('autosave-status');
    if (status) {
      status.innerText = '● Sin guardar';
      status.classList.remove('saved');
    }

    if (guestMode) {
      const code = (typeof editorsMap !== 'undefined' && editorsMap['env-editor'])
        ? editorsMap['env-editor'].getValue()
        : '';
      localStorage.setItem('guest_code', code);
      localStorage.setItem('guest_filename',
        document.getElementById('env-filename')?.value || 'invitado.ipynb');
      if (window.guardado) window.guardado.actualizarEstadoUI('ok');
      return;
    }

    if (!currentFileName) return;

    const ext = currentFileName.split('.').pop();
    const code = (typeof editorsMap !== 'undefined' && editorsMap['env-editor'])
      ? editorsMap['env-editor'].getValue()
      : '';

    if (window.guardado) {
      window.guardado.guardarCambio({
        fileId: currentFileId,
        nombre: currentFileName,
        ext: ext,
        contenido: code,
        parentId: currentFolderId || driveFolderId
      });
    }
  }

  function actualizarFileIdActual(nombre, nuevoFileId) {
    if (currentFileName === nombre) {
      currentFileId = nuevoFileId;
    }
  }

  function marcarGuardado() {
    if (window.guardado) window.guardado.actualizarEstadoUI('ok');
  }

  // ============================================================
  // EXPORTAR / COLAB
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

  function descargarActual() {
    const filename = document.getElementById('env-filename')?.value || 'archivo.ipynb';
    const code = (typeof editorsMap !== 'undefined' && editorsMap['env-editor'])
      ? editorsMap['env-editor'].getValue()
      : '';

    if (filename.endsWith('.ipynb')) {
      const ipynb = buildIpynb(code, filename);
      descargarTexto(JSON.stringify(ipynb, null, 1), filename);
    } else {
      descargarTexto(code, filename);
    }
    showToast('Descargado: ' + filename);
  }

  async function openInColab() {
    if (guestMode) {
      showToast('Modo invitado: conecta con Google para usar Colab', true);
      return;
    }
    if (!driveToken) { showToast('Conecta Drive primero', true); return; }

    let fileId = currentFileId;
    if (!fileId) {
      await saveEnvToDrive();
      setTimeout(() => {
        if (currentFileId) {
          window.open(`https://colab.research.google.com/drive/${currentFileId}`, '_blank');
        } else {
          showToast('Espera a que se guarde el archivo', true);
        }
      }, 2000);
      return;
    }
    window.open(`https://colab.research.google.com/drive/${fileId}`, '_blank');
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  function buildIpynb(code, nombre) {
    return {
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [`# ${nombre}\n`, '\n', 'Generado desde la guía de Python para Análisis Numérico.\n']
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: code.split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l)
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

  function extractCodeFromIpynb(ipynb) {
    if (!ipynb.cells) return '';
    return ipynb.cells
      .filter(c => c.cell_type === 'code')
      .map(c => Array.isArray(c.source) ? c.source.join('') : (c.source || ''))
      .join('\n\n');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.connectDrive = connectDrive;
  window.activarModoInvitado = activarModoInvitado;
  window.refreshFileList = refreshFileList;
  window.navigateTo = navigateTo;
  window.navigateToPath = navigateToPath;
  window.createFolder = createFolder;
  window.createNotebook = createNotebook;
  window.createPythonFile = createPythonFile;
  window.openFile = openFile;
  window.saveEnvToDrive = saveEnvToDrive;
  window.saveEditorToDrive = saveEditorToDrive;
  window.exportToIpynb = exportToIpynb;
  window.descargarActual = descargarActual;
  window.openInColab = openInColab;
  window.abrirModalRenombrar = abrirModalRenombrar;
  window.abrirModalCopiar = abrirModalCopiar;
  window.abrirModalEliminar = abrirModalEliminar;
  window.abrirModalCompartir = abrirModalCompartir;
  window.abrirModalMover = abrirModalMover;
  window.confirmarRenombrar = confirmarRenombrar;
  window.confirmarCopiar = confirmarCopiar;
  window.confirmarEliminar = confirmarEliminar;
  window.confirmarCompartir = confirmarCompartir;
  window.confirmarMover = confirmarMover;
  window.seleccionarRolShare = seleccionarRolShare;
  window.cerrarModal = cerrarModal;
  window.cerrarTodosLosModales = cerrarTodosLosModales;
  window.marcarCambio = marcarCambio;
  window.marcarGuardado = marcarGuardado;
  window.actualizarFileIdActual = actualizarFileIdActual;
  window.getDriveToken = () => driveToken;
  window.buildIpynb = buildIpynb;

  // Detectar cambios en el editor
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
        editorsMap['env-editor'].on('change', marcarCambio);
      }
    }, 1000);
  });
})();

/* ============================================
   guardado.js — Sistema de guardado en 3 capas
   v3 - Adaptado al entorno admin
   ============================================ */

(function () {
  'use strict';

  const COLA_KEY = 'cola_pendientes';
  const INTERVALO_SUBIDA = 5000;

  let colaTimer = null;
  let subiendo = false;

  // ============================================================
  // COLA EN LOCALSTORAGE
  // ============================================================
  function leerCola() {
    try {
      return JSON.parse(localStorage.getItem(COLA_KEY) || '[]');
    } catch (e) { return []; }
  }

  function guardarCola(cola) {
    try {
      localStorage.setItem(COLA_KEY, JSON.stringify(cola));
    } catch (e) {
      console.warn('[guardado] localStorage lleno o bloqueado:', e);
      if (cola.length > 5) {
        cola.splice(0, cola.length - 5);
        try { localStorage.setItem(COLA_KEY, JSON.stringify(cola)); } catch (e2) {}
      }
    }
  }

  function encolar(item) {
    const cola = leerCola();
    const idx = cola.findIndex(p =>
      (item.fileId && p.fileId === item.fileId) ||
      (!item.fileId && !p.fileId && p.nombre === item.nombre)
    );

    const entrada = {
      fileId: item.fileId || null,
      nombre: item.nombre,
      ext: item.ext,
      contenido: item.contenido,
      mime: item.mime,
      parentId: item.parentId,
      ts: Date.now()
    };

    if (idx >= 0) cola[idx] = entrada;
    else cola.push(entrada);

    guardarCola(cola);
    actualizarEstadoUI();
    return entrada;
  }

  function desencolar(fileId, nombre) {
    let cola = leerCola();
    cola = cola.filter(p => {
      if (fileId && p.fileId === fileId) return false;
      if (!fileId && p.nombre === nombre && !p.fileId) return false;
      return true;
    });
    guardarCola(cola);
    actualizarEstadoUI();
  }

  function contarPendientes() {
    return leerCola().length;
  }

  function limpiarCola() {
    guardarCola([]);
    actualizarEstadoUI();
  }

  // ============================================================
  // SERIALIZACIÓN
  // ============================================================
  function prepararContenido(item) {
    if (item.ext === 'ipynb') {
      const nombre = item.nombre.replace('.ipynb', '');
      const ipynb = window.buildIpynb
        ? window.buildIpynb(item.contenido, nombre)
        : { cells: [{ cell_type: 'code', source: item.contenido }], metadata: {}, nbformat: 4, nbformat_minor: 5 };
      return { contenido: JSON.stringify(ipynb), mime: 'application/json' };
    } else if (item.ext === 'py') {
      return { contenido: item.contenido, mime: 'text/x-python' };
    }
    return { contenido: item.contenido, mime: 'text/plain' };
  }

  // ============================================================
  // SUBIDA A DRIVE
  // ============================================================
  async function subirPendiente(item, token) {
    if (!token) return false;

    const { contenido, mime } = prepararContenido(item);
    const filename = item.nombre;
    const parent = item.parentId;

    let url, method, headers, body;

    if (item.fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${item.fileId}?uploadType=media`;
      method = 'PATCH';
      headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': mime };
      body = contenido;
    } else {
      url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
      method = 'POST';
      const boundary = 'foo_bar';
      const metadata = { name: filename, mimeType: mime, parents: [parent] };
      body =
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${mime}\r\n\r\n` +
        `${contenido}\r\n` +
        `--${boundary}--`;
      headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': `multipart/related; boundary=${boundary}`
      };
    }

    try {
      const res = await fetch(url, { method, headers, body });

      if (res.ok) {
        const data = method === 'POST' ? await res.json() : null;
        return data && data.id ? data.id : true;
      }
      if (res.status === 404) return 'recrear';
      if (res.status === 401 || res.status === 403) {
        if (typeof window.mostrarBannerReconectar === 'function') {
          window.mostrarBannerReconectar();
        }
        return false;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ============================================================
  // CICLO
  // ============================================================
  async function intentarSubirTodo() {
    if (subiendo) return;
    const token = window.getDriveToken ? window.getDriveToken() : null;
    if (!token) return;

    const cola = leerCola();
    if (cola.length === 0) return;

    subiendo = true;
    actualizarEstadoUI('subiendo');

    for (const item of cola) {
      const resultado = await subirPendiente(item, token);

      if (resultado === false) {
        subiendo = false;
        actualizarEstadoUI('error');
        return;
      }

      if (resultado === 'recrear') {
        const colaActual = leerCola().filter(p => {
          if (item.fileId) return p.fileId !== item.fileId;
          return !(p.nombre === item.nombre && !p.fileId);
        });
        colaActual.push({ ...item, fileId: null, ts: Date.now() });
        guardarCola(colaActual);
        subiendo = false;
        actualizarEstadoUI('ok');
        return;
      }

      desencolar(item.fileId, item.nombre);
      if (resultado !== true && typeof window.actualizarFileIdActual === 'function') {
        window.actualizarFileIdActual(item.nombre, resultado);
      }
    }

    subiendo = false;
    actualizarEstadoUI('ok');
  }

  function iniciarCiclo() {
    if (colaTimer) clearInterval(colaTimer);
    colaTimer = setInterval(intentarSubirTodo, INTERVALO_SUBIDA);
    window.addEventListener('online', () => intentarSubirTodo());
  }

  function detenerCiclo() {
    if (colaTimer) clearInterval(colaTimer);
    colaTimer = null;
  }

  // ============================================================
  // UI
  // ============================================================
  function actualizarEstadoUI(estado) {
    const el = document.getElementById('autosave-status');
    if (!el) return;

    const pendientes = contarPendientes();
    const online = navigator.onLine;

    if (estado === 'subiendo') {
      el.innerText = '☁ Subiendo...';
      el.classList.remove('saved');
      return;
    }

    if (pendientes === 0) {
      el.innerText = '✅ Todo sincronizado';
      el.classList.add('saved');
      setTimeout(() => {
        if (contarPendientes() === 0) {
          el.innerText = '';
          el.classList.remove('saved');
        }
      }, 3000);
      return;
    }

    if (!online) {
      el.innerText = `⚠️ Sin conexión · ${pendientes} pendiente${pendientes > 1 ? 's' : ''}`;
    } else {
      el.innerText = `💾 Guardado local · ${pendientes} pendiente${pendientes > 1 ? 's' : ''}`;
    }
    el.classList.remove('saved');
  }

  // ============================================================
  // API PÚBLICA
  // ============================================================
  function guardarCambio(datos) {
    encolar(datos);
    intentarSubirTodo();
  }

  window.addEventListener('load', () => {
    actualizarEstadoUI();
    setTimeout(intentarSubirTodo, 2000);
  });

  window.guardado = {
    guardarCambio,
    intentarSubirTodo,
    iniciarCiclo,
    detenerCiclo,
    contarPendientes,
    limpiarCola,
    leerCola,
    actualizarEstadoUI
  };
})();

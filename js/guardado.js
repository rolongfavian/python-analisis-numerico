/* ============================================
   guardado.js — Sistema de guardado en 3 capas
   Capa 1: localStorage (instantáneo)
   Capa 2: Google Drive (cada 5s)
   Capa 3: Reintento al volver online
   ============================================ */

(function () {
  'use strict';

  const COLA_KEY = 'cola_pendientes';
  const INTERVALO_SUBIDA = 5000; // 5 segundos

  let colaTimer = null;
  let subiendo = false;

  // ============================================================
  // COLA EN LOCALSTORAGE
  // ============================================================

  function leerCola() {
    try {
      return JSON.parse(localStorage.getItem(COLA_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function guardarCola(cola) {
    try {
      localStorage.setItem(COLA_KEY, JSON.stringify(cola));
    } catch (e) {
      console.warn('[guardado] localStorage lleno o bloqueado:', e);
      // Si se llena, quitamos los más viejos
      if (cola.length > 5) {
        cola.splice(0, cola.length - 5);
        try {
          localStorage.setItem(COLA_KEY, JSON.stringify(cola));
        } catch (e2) {
          console.error('[guardado] No se pudo guardar ni recortando');
        }
      }
    }
  }

  /**
   * Añade o actualiza un pendiente en la cola.
   * Si ya existe uno con el mismo fileId o nombre, lo sobrescribe.
   */
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

    if (idx >= 0) {
      cola[idx] = entrada;
    } else {
      cola.push(entrada);
    }
    guardarCola(cola);
    actualizarEstadoUI();
    return entrada;
  }

  /**
   * Elimina un pendiente cuando ya se subió bien a Drive.
   */
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
  // SERIALIZACIÓN SEGÚN TIPO
  // ============================================================

  /**
   * Prepara el contenido y MIME correctos según el tipo de archivo.
   */
  function prepararContenido(item) {
    if (item.ext === 'ipynb') {
      // Necesitamos buildIpynb de drive.js
      const nombre = item.nombre.replace('.ipynb', '');
      const ipynb = window.buildIpynb
        ? window.buildIpynb(item.contenido, nombre)
        : { cells: [{ cell_type: 'code', source: item.contenido }], metadata: {}, nbformat: 4, nbformat_minor: 5 };
      return {
        contenido: JSON.stringify(ipynb),
        mime: 'application/json'
      };
    } else if (item.ext === 'py') {
      return { contenido: item.contenido, mime: 'text/x-python' };
    } else if (item.ext === 'md') {
      return { contenido: item.contenido, mime: 'text/markdown' };
    } else {
      return { contenido: item.contenido, mime: 'text/plain' };
    }
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
      // Ya existe: PATCH
      url = `https://www.googleapis.com/upload/drive/v3/files/${item.fileId}?uploadType=media`;
      method = 'PATCH';
      headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': mime
      };
      body = contenido;
    } else {
      // Nuevo: POST con multipart
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
      } else {
        console.warn('[guardado] Error al subir:', res.status, await res.text());
        return false;
      }
    } catch (e) {
      console.warn('[guardado] Error de red:', e.message);
      return false;
    }
  }

  // ============================================================
  // CICLO DE SUBIDA
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
        // Error: dejarlo en cola, salir del bucle para reintentar después
        subiendo = false;
        actualizarEstadoUI('error');
        return;
      }
      // Subida exitosa: eliminar de la cola
      desencolar(item.fileId, item.nombre);

      // Si era un archivo nuevo, actualizar el fileId en el editor
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

    // Reintentar al volver online
    window.addEventListener('online', () => {
      console.log('[guardado] Conexión recuperada, subiendo pendientes...');
      intentarSubirTodo();
    });
  }

  function detenerCiclo() {
    if (colaTimer) clearInterval(colaTimer);
    colaTimer = null;
  }

  // ============================================================
  // ESTADO UI
  // ============================================================

  function actualizarEstadoUI(estado) {
    const el = document.getElementById('autosave-status');
    if (!el) return;

    const pendientes = contarPendientes();
    const online = navigator.onLine;

    if (estado === 'subiendo') {
      el.innerText = '☁ Subiendo...';
      el.classList.remove('saved');
      el.style.color = 'var(--cyan)';
      return;
    }

    if (pendientes === 0) {
      el.innerText = '✅ Todo sincronizado';
      el.classList.add('saved');
      el.style.color = 'var(--accent)';
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
      el.style.color = 'var(--danger)';
    } else {
      el.innerText = `💾 Guardado local · ${pendientes} pendiente${pendientes > 1 ? 's' : ''}`;
      el.style.color = 'var(--warning)';
    }
    el.classList.remove('saved');
  }

  // ============================================================
  // API PÚBLICA
  // ============================================================

  /**
   * Guarda un cambio: encola + actualiza UI + intenta subir ya.
   */
  function guardarCambio(datos) {
    encolar(datos);
    intentarSubirTodo();
  }

  // Al abrir la página, si hay cola, intentar subir
  window.addEventListener('load', () => {
    actualizarEstadoUI();
    setTimeout(intentarSubirTodo, 2000);
  });

  // Escuchar cambios de conexión
  window.addEventListener('online', () => actualizarEstadoUI());
  window.addEventListener('offline', () => actualizarEstadoUI());

  // Exponer API pública
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

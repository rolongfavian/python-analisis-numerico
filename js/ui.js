/* ============================================
   ui.js — Menú hamburguesa, toasts, admin mode, aviso descarga
   v4 - Añade showEntorno y cerrarEntorno
   ============================================ */

(function () {
  'use strict';

  // ============================================================
  // MENÚ HAMBURGUESA
  // ============================================================
  function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!sidebar || !overlay) return;

    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', open);
  }

  function closeMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  // ============================================================
  // TOAST
  // ============================================================
  let toastTimer = null;

  function showToast(msg, isError) {
    const t = document.getElementById('toast');
    if (!t) return;

    t.innerText = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
    }, 3500);
  }

  // ============================================================
  // MODO ADMIN
  // ============================================================
  function esAdmin() {
    return document.documentElement.getAttribute('data-admin') === 'true';
  }

  function activarModoAdmin() {
    document.documentElement.setAttribute('data-admin', 'true');

    const driveStatus = document.getElementById('drive-status');
    if (driveStatus) driveStatus.style.display = 'block';

    const menuAdmin = document.getElementById('menu-admin');
    if (menuAdmin) menuAdmin.style.display = 'block';

    console.log('[admin] Modo administrador activado');
  }

  // ============================================================
  // MOSTRAR / CERRAR VISTA DEL ENTORNO (ADMIN)
  // ============================================================
  function showEntorno() {
    if (!esAdmin()) {
      showToast('Esta función solo está disponible para administradores', true);
      return;
    }

    const guia = document.querySelector('.container');
    if (guia) guia.style.display = 'none';

    const entorno = document.getElementById('view-entorno');
    if (entorno) entorno.style.display = 'flex';

    closeMenu();

    if (typeof window.actualizarListaArchivos === 'function'
        && typeof window.getDriveToken === 'function'
        && window.getDriveToken()) {
      window.actualizarListaArchivos();
    }
  }

  function cerrarEntorno() {
    const entorno = document.getElementById('view-entorno');
    if (entorno) entorno.style.display = 'none';

    const guia = document.querySelector('.container');
    if (guia) guia.style.display = '';

    if (typeof window.cargarSegunHash === 'function') {
      window.cargarSegunHash();
    }
  }

  // ============================================================
  // AVISO DE DESCARGA
  // ============================================================
  let avisoDescargaCallback = null;

  function abrirAvisoDescarga(mensaje, callback) {
    const modal = document.getElementById('modal-aviso-descarga');
    const texto = document.getElementById('aviso-descarga-texto');
    if (!modal) return;

    if (texto) texto.textContent = mensaje;
    avisoDescargaCallback = callback;
    modal.classList.add('open');
  }

  function cerrarAvisoDescarga() {
    const modal = document.getElementById('modal-aviso-descarga');
    if (modal) modal.classList.remove('open');
    avisoDescargaCallback = null;
  }

  function confirmarAvisoDescarga() {
    const cb = avisoDescargaCallback;
    cerrarAvisoDescarga();
    if (typeof cb === 'function') cb();
  }

  function cancelarAvisoDescarga() {
    cerrarAvisoDescarga();
  }

  // ============================================================
  // NAVEGACIÓN ENTRE VISTAS
  // ============================================================
  function mostrarVista(nombre) {
    document.querySelectorAll('.view-container').forEach(v => {
      v.style.display = 'none';
    });

    const vista = document.getElementById('view-' + nombre);
    if (vista) vista.style.display = '';
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
        if (document.getElementById('modal-aviso-descarga')?.classList.contains('open')) {
          cancelarAvisoDescarga();
        }
      }
    });

    if (esAdmin()) {
      activarModoAdmin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.toggleMenu = toggleMenu;
  window.closeMenu = closeMenu;
  window.showToast = showToast;
  window.esAdmin = esAdmin;
  window.activarModoAdmin = activarModoAdmin;
  window.abrirAvisoDescarga = abrirAvisoDescarga;
  window.cerrarAvisoDescarga = cerrarAvisoDescarga;
  window.confirmarAvisoDescarga = confirmarAvisoDescarga;
  window.cancelarAvisoDescarga = cancelarAvisoDescarga;
  window.mostrarVista = mostrarVista;
  window.showEntorno = showEntorno;
  window.cerrarEntorno = cerrarEntorno;
})();

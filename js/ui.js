/* ============================================
   ui.js — Menú hamburguesa, toasts, admin mode, aviso descarga
   v3 - Adaptado a la web unificada
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
  // AVISO DE DESCARGA (para la tienda)
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
    // Ocultar todas las vistas
    document.querySelectorAll('.view-container').forEach(v => {
      v.style.display = 'none';
    });

    // Mostrar la que toca
    const vista = document.getElementById('view-' + nombre);
    if (vista) vista.style.display = '';
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    // Escape cierra el menú
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
        // También cierra el aviso de descarga si está abierto
        if (document.getElementById('modal-aviso-descarga')?.classList.contains('open')) {
          cancelarAvisoDescarga();
        }
      }
    });

    // Detectar modo admin al inicio
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
})();

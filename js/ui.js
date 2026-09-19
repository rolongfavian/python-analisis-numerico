/* ============================================
   ui.js — Menú, toasts, cambio de vista
   v2 - Añade clase al body para bloquear scroll solo en Entorno
   ============================================ */

(function () {
  'use strict';

  let currentView = 'guide';

  // ============================================================
  // CAMBIO DE VISTA (Guía / Entorno)
  // ============================================================

  function switchView(view) {
    currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));

    const tabs = document.querySelectorAll('.view-tab');
    const menuToggle = document.getElementById('menu-toggle');

    if (view === 'guide') {
      const el = document.getElementById('view-guide');
      if (el) el.classList.add('active');
      if (tabs[0]) tabs[0].classList.add('active');
      if (menuToggle) menuToggle.style.display = 'flex';

      // La Guía necesita scroll normal
      document.body.classList.remove('view-env-active');
    } else {
      const el = document.getElementById('view-env');
      if (el) el.classList.add('active');
      if (tabs[1]) tabs[1].classList.add('active');
      if (menuToggle) menuToggle.style.display = 'none';

      // El Entorno bloquea el scroll general
      document.body.classList.add('view-env-active');
    }

    // Refrescar editores CodeMirror
    setTimeout(() => {
      if (typeof editorsMap !== 'undefined') {
        Object.values(editorsMap).forEach(ed => {
          try { ed.refresh(); } catch (e) {}
        });
      }
    }, 100);
  }

  // ============================================================
  // MENÚ HAMBURGUESA
  // ============================================================

  function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const btn = document.getElementById('menu-toggle');
    if (!sidebar || !overlay || !btn) return;

    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', open);
    btn.classList.toggle('open', open);
  }

  function closeMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const btn = document.getElementById('menu-toggle');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (btn) btn.classList.remove('open');
  }

  function toggleGroup(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.classList.toggle('open');
    if (btn) btn.classList.toggle('active', isOpen);
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
  // BANNER DE CONEXIÓN
  // ============================================================

  function actualizarBannerConexion() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    banner.style.display = navigator.onLine ? 'none' : 'block';
  }

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================

  function init() {
    // Cerrar menú al tocar un enlace
    document.querySelectorAll('.menu-group-content a').forEach(a => {
      a.addEventListener('click', () => {
        setTimeout(closeMenu, 100);
      });
    });

    // Escape cierra el menú
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    // Escuchar cambios de conexión
    window.addEventListener('online', actualizarBannerConexion);
    window.addEventListener('offline', actualizarBannerConexion);
    actualizarBannerConexion();

    // La vista inicial es Guía → sin bloqueo de scroll
    document.body.classList.remove('view-env-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.switchView = switchView;
  window.toggleMenu = toggleMenu;
  window.closeMenu = closeMenu;
  window.toggleGroup = toggleGroup;
  window.showToast = showToast;
})();

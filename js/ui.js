/* ============================================
   ui.js — Menú, toasts, cambio de vista
   v3 - Fix: al cambiar a Guía, asegurar que Entorno esté oculto
   ============================================ */

(function () {
  'use strict';

  let currentView = 'guide';

  // ============================================================
  // CAMBIO DE VISTA (Guía / Entorno)
  // ============================================================

  function switchView(view) {
    currentView = view;

    // Quitar .active de TODAS las vistas y tabs
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));

    const tabs = document.querySelectorAll('.view-tab');
    const menuToggle = document.getElementById('menu-toggle');

    if (view === 'guide') {
      const el = document.getElementById('view-guide');
      const envEl = document.getElementById('view-env');
      if (el) el.classList.add('active');
      if (envEl) envEl.classList.remove('active');  // doble seguridad
      if (tabs[0]) tabs[0].classList.add('active');
      if (menuToggle) menuToggle.style.display = 'flex';

      document.body.classList.remove('view-env-active');

      // Hacer scroll al top de la Guía
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      const el = document.getElementById('view-env');
      const guideEl = document.getElementById('view-guide');
      if (el) el.classList.add('active');
      if (guideEl) guideEl.classList.remove('active');  // doble seguridad
      if (tabs[1]) tabs[1].classList.add('active');
      if (menuToggle) menuToggle.style.display = 'none';

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
    // Al cargar, asegurarse de que solo la Guía esté activa
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const guideEl = document.getElementById('view-guide');
    const envEl = document.getElementById('view-env');
    if (guideEl) guideEl.classList.add('active');
    if (envEl) envEl.classList.remove('active');

    document.body.classList.remove('view-env-active');

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

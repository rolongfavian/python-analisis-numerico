/* ============================================
   ui.js — Menú hamburguesa y toasts
   v5 - Sin modo admin, sin Drive
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
  // INIT
  // ============================================================
  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    });
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
})();

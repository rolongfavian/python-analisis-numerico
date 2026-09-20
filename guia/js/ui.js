/* ============================================
   ui.js — Menú y toasts (versión guía)
   ============================================ */

(function () {
  'use strict';

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

  let toastTimer = null;

  function showToast(msg, isError) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
  }

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.toggleMenu = toggleMenu;
  window.closeMenu = closeMenu;
  window.showToast = showToast;
})();

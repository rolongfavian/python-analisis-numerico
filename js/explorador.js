/* ============================================
   explorador.js — Ampliar / cerrar explorador
   ============================================ */

(function () {
  'use strict';

  let expandido = false;

  function toggleExpandSidebar() {
    const sidebar = document.getElementById('env-sidebar');
    const icon = document.getElementById('expand-icon');
    const closeBtn = document.getElementById('btn-close-expanded');
    if (!sidebar || !icon) return;

    expandido = !expandido;

    if (expandido) {
      sidebar.classList.add('expanded');
      icon.innerText = 'close';
      if (closeBtn) closeBtn.classList.add('visible');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('expanded');
      icon.innerText = 'expand_content';
      if (closeBtn) closeBtn.classList.remove('visible');
      document.body.style.overflow = '';
    }

    if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
      setTimeout(() => {
        try { editorsMap['env-editor'].refresh(); } catch (e) {}
      }, 250);
    }
  }

  function cerrarExplorador() {
    if (!expandido) return;
    toggleExpandSidebar();
  }

  window.toggleExpandSidebar = toggleExpandSidebar;
  window.cerrarExplorador = cerrarExplorador;
})();

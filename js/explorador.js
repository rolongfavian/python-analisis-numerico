/* ============================================
   explorador.js — Ampliar / cerrar explorador
   v4 - Sin botón flotante, solo la X en el breadcrumb
   ============================================ */

(function () {
  'use strict';

  let expandido = false;

  function toggleExpandSidebar() {
    const sidebar = document.getElementById('env-sidebar');
    const icon = document.getElementById('expand-icon');
    if (!sidebar || !icon) return;

    expandido = !expandido;

    if (expandido) {
      sidebar.classList.add('expanded');
      icon.innerText = 'close';
    } else {
      sidebar.classList.remove('expanded');
      icon.innerText = 'expand_content';
    }

    if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
      setTimeout(() => {
        try { editorsMap['env-editor'].refresh(); } catch (e) {}
      }, 250);
    }
  }

  function cerrarExplorador() {
    if (!expandido) return;
    expandido = false;

    const sidebar = document.getElementById('env-sidebar');
    const icon = document.getElementById('expand-icon');

    if (sidebar) sidebar.classList.remove('expanded');
    if (icon) icon.innerText = 'expand_content';

    if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
      setTimeout(() => {
        try { editorsMap['env-editor'].refresh(); } catch (e) {}
      }, 250);
    }
  }

  // ============================================================
  // CIERRE AUTOMÁTICO AL TOCAR UN ARCHIVO
  // ============================================================
  document.addEventListener('click', (e) => {
    if (!expandido) return;

    const li = e.target.closest('#env-file-list li');
    if (!li) return;

    if (e.target.closest('.menu-btn')) return;
    if (li.dataset.type === 'folder') return;

    cerrarExplorador();
  }, true);

  window.toggleExpandSidebar = toggleExpandSidebar;
  window.cerrarExplorador = cerrarExplorador;
})();

/* ============================================
   explorador.js — Ampliar / cerrar explorador
   v3 - Cierra automáticamente al abrir un archivo
        (funciona incluso si el handler de drive.js corre primero)
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
    } else {
      sidebar.classList.remove('expanded');
      icon.innerText = 'expand_content';
      if (closeBtn) closeBtn.classList.remove('visible');
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
    const closeBtn = document.getElementById('btn-close-expanded');

    if (sidebar) sidebar.classList.remove('expanded');
    if (icon) icon.innerText = 'expand_content';
    if (closeBtn) closeBtn.classList.remove('visible');

    if (typeof editorsMap !== 'undefined' && editorsMap['env-editor']) {
      setTimeout(() => {
        try { editorsMap['env-editor'].refresh(); } catch (e) {}
      }, 250);
    }
  }

  // ============================================================
  // CIERRE AUTOMÁTICO AL TOCAR UN ARCHIVO
  // ============================================================
  // Usamos un listener en capture phase que se ejecuta ANTES del
  // listener normal de drive.js. Así cerramos el explorador
  // ANTES de que drive.js abra el archivo, y el editor ya tiene
  // el layout correcto.
  document.addEventListener('click', (e) => {
    if (!expandido) return;

    const li = e.target.closest('#env-file-list li');
    if (!li) return;

    // Ignorar clicks en el botón ⋯ de opciones
    if (e.target.closest('.menu-btn')) return;

    // Ignorar clicks en carpetas (queremos navegar dentro)
    if (li.dataset.type === 'folder') return;

    // Es un archivo: cerrar el explorador ampliado
    cerrarExplorador();
  }, true); // ← capture: true, se ejecuta antes

  // Exponer globalmente
  window.toggleExpandSidebar = toggleExpandSidebar;
  window.cerrarExplorador = cerrarExplorador;
})();

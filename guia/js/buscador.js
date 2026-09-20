/* ============================================
   buscador.js — Buscador (stub temporal)
   Se reescribirá cuando estén todas las partes
   ============================================ */

(function () {
  'use strict';

  function abrirBuscador() {
    // Temporal: mostrar un aviso
    if (typeof showToast === 'function') {
      showToast('El buscador estará disponible próximamente', false);
    } else {
      alert('El buscador estará disponible próximamente');
    }
  }

  function cerrarBuscador() {
    const modal = document.getElementById('modal-buscador');
    if (modal) modal.classList.remove('open');
  }

  window.abrirBuscador = abrirBuscador;
  window.cerrarBuscador = cerrarBuscador;
})();

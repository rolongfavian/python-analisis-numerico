/* ============================================
   tema.js — Selector de tema claro/oscuro/sistema
   ============================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'py-theme';
  const DEFAULT_THEME = 'dark';

  /**
   * Aplica el tema indicado al documento.
   * @param {'dark'|'light'|'system'} mode
   */
  function applyTheme(mode) {
    const html = document.documentElement;

    if (mode === 'system') {
      const prefersDark = window.matchMedia &&
                         window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', mode);
    }

    // Refrescar todos los CodeMirror para que repinten con los nuevos colores
    setTimeout(() => {
      if (typeof editorsMap !== 'undefined') {
        Object.values(editorsMap).forEach(ed => {
          try { ed.refresh(); } catch (e) {}
        });
      }
    }, 50);
  }

  /**
   * Inicializa el selector de tema y aplica el guardado.
   */
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    const sel = document.getElementById('theme-select');

    if (sel) {
      sel.value = saved;
      sel.addEventListener('change', (e) => {
        const mode = e.target.value;
        localStorage.setItem(STORAGE_KEY, mode);
        applyTheme(mode);
      });
    }

    applyTheme(saved);

    // Escuchar cambios del sistema operativo (solo si estamos en modo "system")
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        const current = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
        if (current === 'system') {
          applyTheme('system');
        }
      });
    }
  }

  // Aplicar el tema lo antes posible (aunque el DOM no esté listo)
  // para evitar "flash" de tema incorrecto.
  const earlyTheme = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  if (earlyTheme === 'system') {
    const prefersDark = window.matchMedia &&
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', earlyTheme);
  }

  // Cuando el DOM esté listo, conectar el selector
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  // Exponer la función por si otros scripts la necesitan
  window.applyTheme = applyTheme;
})();

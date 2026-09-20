/* ============================================
   tema.js — Selector de tema claro/oscuro/sistema
   Versión para /guia/
   ============================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'py-theme-guia';
  const DEFAULT_THEME = 'dark';

  function applyTheme(mode) {
    const html = document.documentElement;

    if (mode === 'system') {
      const prefersDark = window.matchMedia &&
                         window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', mode);
    }
  }

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

  // Aplicar tema lo antes posible para evitar "flash"
  const earlyTheme = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  if (earlyTheme === 'system') {
    const prefersDark = window.matchMedia &&
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', earlyTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  window.applyTheme = applyTheme;
})();

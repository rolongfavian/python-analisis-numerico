/* ============================================
   guia.js — Cargador de partes de la guía
   v1 - Lee parte-XX.json con el nuevo formato
   ============================================ */

(function () {
  'use strict';

  const CONTENT_PATH = 'contenido/';

  // Lista de partes disponibles (a medida que las crees, las añades aquí)
  const PARTES = [
    { id: 1, titulo: 'Primeros pasos', emoji: '🐣' },
    { id: 2, titulo: 'Tipos de datos', emoji: '🔢' },
    { id: 3, titulo: 'Operaciones', emoji: '➕' },
    { id: 4, titulo: 'Control de flujo', emoji: '🔀' },
    { id: 5, titulo: 'Colecciones', emoji: '📚' },
    { id: 6, titulo: 'Funciones', emoji: '⚙️' }
    // ...
  ];

  let cache = {};

  // ============================================================
  // CARGA
  // ============================================================
  async function loadParte(parteId) {
    if (cache[parteId]) return cache[parteId];
    const file = `parte-${String(parteId).padStart(2, '0')}.json`;
    try {
      const res = await fetch(CONTENT_PATH + file);
      if (!res.ok) throw new Error('No se pudo cargar ' + file);
      const data = await res.json();
      cache[parteId] = data;
      return data;
    } catch (e) {
      console.error('[guia] Error:', e);
      return null;
    }
  }

  // ============================================================
  // MATH
  // ============================================================
  function renderMath(element) {
    if (!element) return;
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([element]).catch(() => {});
    } else if (window.MathJax && window.MathJax.typeset) {
      window.MathJax.typeset([element]);
    }
  }

  // ============================================================
  // SIDEBAR
  // ============================================================
  function renderSidebar() {
    const cont = document.getElementById('sidebar-partes');
    if (!cont) return;
    cont.innerHTML = '';

    PARTES.forEach(p => {
      const div = document.createElement('div');
      div.className = 'menu-group';
      div.innerHTML = `
        <button class="menu-group-header" onclick="showParte(${p.id}); closeMenu();">
          <span>${p.emoji} Parte ${p.id} · ${escapeHtml(p.titulo)}</span>
        </button>
      `;
      cont.appendChild(div);
    });
  }

  // ============================================================
  // RENDERIZAR PARTE
  // ============================================================
  function renderParte(container, data) {
    if (!data || !data.temas) {
      container.innerHTML = '<div id="loading-guide">Error al cargar la parte.</div>';
      return;
    }

    let html = '';

    // Encabezado de la parte
    html += `<div class="parte-header">`;
    html += `<div class="parte-emoji">${data.emoji || '📚'}</div>`;
    html += `<h1>Parte ${data.parte}: ${escapeHtml(data.titulo)}</h1>`;
    if (data.descripcion) {
      html += `<p>${escapeHtml(data.descripcion)}</p>`;
    }
    html += `</div>`;

    // Temas
    data.temas.forEach(tema => {
      html += renderTema(tema, data.parte);
    });

    container.innerHTML = html;
    renderMath(container);
  }

  function renderTema(tema, parteId) {
    const id = `tema-${parteId}-${tema.id}`;
    let html = `<article class="tema" id="${id}">`;

    // Header del tema
    html += `<div class="tema-header">`;
    html += `<div class="tema-numero">${tema.numero}</div>`;
    html += `<div class="tema-titulo-bloque">`;
    html += `<h2>${tema.emoji || ''} ${escapeHtml(tema.titulo)}</h2>`;
    if (tema.subtitulo) {
      html += `<p class="tema-subtitulo">${escapeHtml(tema.subtitulo)}</p>`;
    }
    html += `</div>`;
    html += `</div>`;

    // Qué es
    if (tema.que_es && tema.que_es.length > 0) {
      html += `<section class="tema-seccion">`;
      html += `<h3 class="seccion-titulo">💡 ¿Qué es?</h3>`;
      tema.que_es.forEach(p => { html += p; });
      html += `</section>`;
    }

    // Para qué sirve
    if (tema.para_que_sirve && tema.para_que_sirve.length > 0) {
      html += `<section class="tema-seccion">`;
      html += `<h3 class="seccion-titulo">🎯 ¿Para qué sirve?</h3>`;
      tema.para_que_sirve.forEach(p => { html += p; });
      html += `</section>`;
    }

    // Sintaxis
    if (tema.sintaxis) {
      html += `<section class="tema-seccion">`;
      html += `<h3 class="seccion-titulo">✍️ Sintaxis</h3>`;
      html += `<pre class="bloque-sintaxis"><code>${escapeHtml(tema.sintaxis)}</code></pre>`;
      html += `</section>`;
    }

    // Ejemplos
    if (tema.ejemplos && tema.ejemplos.length > 0) {
      html += `<section class="tema-seccion">`;
      html += `<h3 class="seccion-titulo">🧪 Ejemplos</h3>`;
      tema.ejemplos.forEach((ej, i) => {
        html += `<div class="bloque-ejemplo">`;
        html += `<div class="ejemplo-titulo">Ejemplo ${i + 1}: ${escapeHtml(ej.titulo)}</div>`;
        html += `<pre class="bloque-codigo"><code>${escapeHtml(ej.codigo)}</code></pre>`;
        if (ej.explicacion && ej.explicacion.length > 0) {
          html += `<div class="ejemplo-explicacion">`;
          ej.explicacion.forEach(p => { html += p; });
          html += `</div>`;
        }
        html += `</div>`;
      });
      html += `</section>`;
    }

    // Errores comunes
    if (tema.errores_comunes && tema.errores_comunes.length > 0) {
      html += `<section class="tema-seccion">`;
      html += `<h3 class="seccion-titulo">⚠️ Errores comunes</h3>`;
      tema.errores_comunes.forEach(err => {
        html += `<div class="bloque-error">`;
        html += `<div class="error-linea"><span class="error-marca">❌</span><code>${escapeHtml(err.error)}</code></div>`;
        html += `<div class="error-razon">${escapeHtml(err.razon)}</div>`;
        html += `<div class="ok-linea"><span class="ok-marca">✅</span><code>${escapeHtml(err.correcto)}</code></div>`;
        html += `</div>`;
      });
      html += `</section>`;
    }

    // Tips
    if (tema.tips && tema.tips.length > 0) {
      html += `<section class="tema-seccion">`;
      html += `<h3 class="seccion-titulo">💡 Trucos y buenas prácticas</h3>`;
      tema.tips.forEach(t => { html += t; });
      html += `</section>`;
    }

    // Resumen
    if (tema.resumen) {
      html += `<div class="bloque-resumen">`;
      html += `<strong>📌 En resumen:</strong> ${tema.resumen}`;
      html += `</div>`;
    }

    html += `</article>`;
    return html;
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  async function showParte(parteId) {
    const container = document.getElementById('guide-content');
    if (!container) return;

    container.innerHTML = '<div id="loading-guide">Cargando parte...</div>';
    const data = await loadParte(parteId);
    if (!data) {
      container.innerHTML = `<div id="loading-guide">Error al cargar la parte ${parteId}.</div>`;
      return;
    }

    renderParte(container, data);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ============================================================
  // UTILIDADES
  // ============================================================
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    renderSidebar();
    showParte(1);
  }

  window.showParte = showParte;
  window.PARTES_GUIA = PARTES;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

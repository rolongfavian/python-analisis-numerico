/* ============================================
   guia.js — Cargador de contenido (versión solo-guía)
   Vive en /guia/, lee de ../contenido/
   ============================================ */

(function () {
  'use strict';

  const CONTENT_PATH = '../contenido/';
  let currentLevel = null;
  let cache = {};

  async function loadLevel(levelId) {
    if (cache[levelId]) return cache[levelId];
    const file = `nivel-${String(levelId).padStart(2, '0')}.json`;
    try {
      const res = await fetch(CONTENT_PATH + file);
      if (!res.ok) throw new Error('No se pudo cargar ' + file);
      const data = await res.json();
      cache[levelId] = data;
      return data;
    } catch (e) {
      console.error('[guia] Error:', e);
      return null;
    }
  }

  function renderMath(element) {
    if (!element) return;
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([element]).catch(() => {});
    } else if (window.MathJax && window.MathJax.typeset) {
      window.MathJax.typeset([element]);
    }
  }

  function renderLevel(container, data) {
    if (!data || !data.niveles) {
      container.innerHTML = '<div id="loading-guide">Error al cargar el contenido.</div>';
      return;
    }

    let html = '';
    data.niveles.forEach(nivel => {
      html += `<div class="level-section" id="${nivel.id}">`;
      html += `<h2><span class="level-num">${nivel.numero}</span> ${nivel.titulo}</h2>`;
      if (nivel.descripcion) {
        html += `<p class="level-desc">${nivel.descripcion}</p>`;
      }
      (nivel.comandos || []).forEach((cmd, i) => {
        html += renderCommand(cmd, nivel.id, i);
      });
      html += `</div>`;
    });

    container.innerHTML = html;
    renderMath(container);
  }

  function renderCommand(cmd, levelId, index) {
    const id = `cmd-${levelId}-${index}`;
    let html = `<div class="cmd-card" id="${id}">`;

    html += `<div class="cmd-header" onclick="toggleCmd('${id}')">`;
    html += `<div class="cmd-title">`;
    if (cmd.nombre) {
      html += `<span class="cmd-name">${escapeHtml(cmd.nombre)}</span>`;
      if (cmd.alias) html += ` <span style="color:var(--text-dim)">— ${escapeHtml(cmd.alias)}</span>`;
    } else {
      html += escapeHtml(cmd.titulo || '');
    }
    html += `</div>`;

    html += `<div class="cmd-badges">`;
    if (cmd.basico) html += `<span class="cmd-badge badge-basic">Básico</span>`;
    if (cmd.intermedio) html += `<span class="cmd-badge badge-inter">+ Info</span>`;
    if (cmd.avanzado) html += `<span class="cmd-badge badge-advanced">Avanzado</span>`;
    html += `</div>`;

    html += `<span class="cmd-chevron">▶</span>`;
    html += `</div>`;

    html += `<div class="cmd-body">`;

    if (cmd.basico) {
      html += `<div class="cmd-layer cmd-layer-basic">`;
      html += `<div class="cmd-layer-title">Qué es y cómo se usa</div>`;
      html += cmd.basico;
      html += `</div>`;
    }
    if (cmd.intermedio) {
      html += `<div class="cmd-layer cmd-layer-inter">`;
      html += `<div class="cmd-layer-title">Profundizando</div>`;
      html += cmd.intermedio;
      html += `</div>`;
    }
    if (cmd.avanzado) {
      html += `<div class="cmd-layer cmd-layer-advanced">`;
      html += `<div class="cmd-layer-title">Nivel técnico</div>`;
      html += cmd.avanzado;
      html += `</div>`;
    }

    if (cmd.codigo) {
      html += `<div class="codigo-solo-lectura">`;
      html += `<div class="codigo-label">${escapeHtml(cmd.etiquetaCodigo || 'Ejemplo')}</div>`;
      html += `<pre class="codigo-bloque"><code>${escapeHtml(cmd.codigo)}</code></pre>`;
      html += `</div>`;
    }

    html += `</div>`;
    html += `</div>`;
    return html;
  }

  function toggleCmd(id) {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.toggle('expanded');
    if (card.classList.contains('expanded')) renderMath(card);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function showLevel(levelId) {
    const container = document.getElementById('guide-content');
    if (!container) return;
    container.innerHTML = '<div id="loading-guide">Cargando nivel...</div>';
    const data = await loadLevel(levelId);
    if (!data) {
      container.innerHTML = '<div id="loading-guide">Error al cargar el nivel ' + levelId + '.</div>';
      return;
    }
    currentLevel = levelId;
    renderLevel(container, data);
  }

  function initGuide() { showLevel(1); }

  window.showLevel = showLevel;
  window.toggleCmd = toggleCmd;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuide);
  } else {
    initGuide();
  }
})();

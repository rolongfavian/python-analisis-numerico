/* ============================================
   guia.js — Cargador de contenido de la guía
   ============================================ */

(function () {
  'use strict';

  const CONTENT_PATH = 'contenido/';
  let currentLevel = null;
  let cache = {};

  /**
   * Carga un archivo JSON de nivel.
   */
  async function loadLevel(levelId) {
    if (cache[levelId]) return cache[levelId];

    const file = `nivel-${String(levelId).padStart(2, '0')}.json`;
    const url = CONTENT_PATH + file;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudo cargar ' + file);
      const data = await res.json();
      cache[levelId] = data;
      return data;
    } catch (e) {
      console.error('[guia] Error:', e);
      return null;
    }
  }

  /**
   * Fuerza a MathJax a procesar el LaTeX de un elemento.
   */
  function renderMath(element) {
    if (!element) return;
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([element]).catch((err) => {
        console.warn('[guia] MathJax error:', err);
      });
    } else if (window.MathJax && window.MathJax.typeset) {
      window.MathJax.typeset([element]);
    }
  }

  /**
   * Renderiza un nivel completo en el contenedor.
   */
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

    // Renderizar LaTeX
    renderMath(container);

    // Crear los editores CodeMirror después de insertar el HTML
    setTimeout(() => {
      if (typeof CodeMirror !== 'undefined') {
        container.querySelectorAll('textarea').forEach(textarea => {
          if (textarea._cmInitialized) return;
          const editor = CodeMirror.fromTextArea(textarea, {
            mode: 'python',
            lineNumbers: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            autoCloseBrackets: true,
            matchBrackets: true,
            extraKeys: {
              'Tab': (cm) => cm.replaceSelection('    ', 'end'),
              'Ctrl-Space': (cm) => cm.showHint({ hint: getHint, completeSingle: false })
            }
          });
          textarea._cmInitialized = true;

          if (typeof editorsMap !== 'undefined') {
            editorsMap[textarea.id] = editor;
          }
        });
      }
    }, 50);
  }

  /**
   * Renderiza un comando con sus 3 capas (básica, intermedia, avanzada).
   */
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
      const editorId = `ed-${id}`;
      const outId = `out-${id}`;
      html += `<div class="editor-container">`;
      html += `<div class="controls">`;
      html += `<span>${escapeHtml(cmd.etiquetaCodigo || 'Ejemplo ejecutable')}</span>`;
      html += `<button class="btn-run" onclick="runCode('${editorId}','${outId}')">Ejecutar</button>`;
      html += `</div>`;
      html += `<textarea id="${editorId}">${escapeHtml(cmd.codigo)}</textarea>`;
      html += `<div id="${outId}" class="output-box">Presiona Ejecutar para ver el resultado...</div>`;
      html += `</div>`;
    }

    html += `</div>`;
    html += `</div>`;
    return html;
  }

  /**
   * Alterna la visibilidad de una tarjeta.
   */
  function toggleCmd(id) {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.toggle('expanded');

    // Re-procesar MathJax si la tarjeta se acaba de expandir
    if (card.classList.contains('expanded')) {
      renderMath(card);
    }
  }

  /**
   * Escapa HTML para prevenir inyección.
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Muestra un nivel en el contenedor de la guía.
   */
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

  /**
   * Muestra el nivel por defecto (1) al iniciar.
   */
  function initGuide() {
    showLevel(1);
  }

  // Exponer globalmente
  window.showLevel = showLevel;
  window.toggleCmd = toggleCmd;

  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuide);
  } else {
    initGuide();
  }
})();

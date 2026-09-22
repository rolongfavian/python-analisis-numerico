/* ============================================
   guia.js — Cargador de contenido de la guía
   v5 - Unificado: intro + sección 0 + 15 partes + glosario
   ============================================ */

(function () {
  'use strict';

  const CONTENT_PATH = 'contenido/';

  // ============================================================
  // MAPA DE SECCIONES
  // ============================================================
  const SECCIONES = {
    'intro':       { archivo: 'intro.json',       tipo: 'simple' },
    'seccion-00':  { archivo: 'seccion-00.json',  tipo: 'simple' },
    'glosario':    { archivo: 'glosario.json',    tipo: 'simple' }
  };

  const PARTES = [
    { id: 1,  archivo: 'parte-01.json' },
    { id: 2,  archivo: 'parte-02.json' },
    { id: 3,  archivo: 'parte-03.json' },
    { id: 4,  archivo: 'parte-04.json' },
    { id: 5,  archivo: 'parte-05.json' },
    { id: 6,  archivo: 'parte-06.json' },
    { id: 7,  archivo: 'parte-07.json' },
    { id: 8,  archivo: 'parte-08.json' },
    { id: 9,  archivo: 'parte-09.json' },
    { id: 10, archivo: 'parte-10.json' },
    { id: 11, archivo: 'parte-11.json' },
    { id: 12, archivo: 'parte-12.json' },
    { id: 13, archivo: 'parte-13.json' },
    { id: 14, archivo: 'parte-14.json' },
    { id: 15, archivo: 'parte-15.json' }
  ];

  let cache = {};

  // ============================================================
  // CARGA DE JSON
  // ============================================================
  async function cargarJson(archivo) {
    if (cache[archivo]) return cache[archivo];
    try {
      const res = await fetch(CONTENT_PATH + archivo);
      if (!res.ok) throw new Error('No se pudo cargar ' + archivo);
      const data = await res.json();
      cache[archivo] = data;
      return data;
    } catch (e) {
      console.error('[guia] Error cargando', archivo, e);
      return null;
    }
  }

  // ============================================================
  // MATHJAX
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
  // RENDERIZAR SECCIÓN SIMPLE (intro, sección 0, glosario)
  // ============================================================
  function renderSeccionSimple(container, data) {
    if (!data) {
      container.innerHTML = '<div id="loading-guide">Error al cargar el contenido.</div>';
      return;
    }

    let html = '';

    // Encabezado
    html += `<div class="page-header">`;
    if (data.emoji) html += `<div class="page-emoji">${data.emoji}</div>`;
    if (data.titulo) html += `<h1>${escapeHtml(data.titulo)}</h1>`;
    if (data.descripcion) html += `<p>${escapeHtml(data.descripcion)}</p>`;
    html += `</div>`;

    // Contenido HTML libre (por si la intro o el glosario traen HTML)
    if (data.contenido) {
      html += `<div class="tema-seccion">${data.contenido}</div>`;
    }

    // Secciones internas (para la intro)
    if (data.secciones && data.secciones.length > 0) {
      data.secciones.forEach(sec => {
        html += `<div class="tema-seccion">`;
        if (sec.titulo) html += `<h3 class="seccion-titulo">${escapeHtml(sec.titulo)}</h3>`;
        if (sec.contenido) html += sec.contenido;
        html += `</div>`;
      });
    }

    // Créditos
    if (data.creditos) {
      html += `<div class="intro-creditos">${data.creditos}</div>`;
    }

    container.innerHTML = html;
    renderMath(container);
  }

  // ============================================================
  // RENDERIZAR PARTE (con temas)
  // ============================================================
  function renderParte(container, data) {
    if (!data || !data.temas) {
      container.innerHTML = '<div id="loading-guide">Error al cargar la parte.</div>';
      return;
    }

    let html = '';

    // Encabezado
    html += `<div class="page-header">`;
    if (data.emoji) html += `<div class="page-emoji">${data.emoji}</div>`;
    html += `<h1>Parte ${data.parte}: ${escapeHtml(data.titulo)}</h1>`;
    if (data.descripcion) html += `<p>${escapeHtml(data.descripcion)}</p>`;
    html += `</div>`;

    // Temas
    data.temas.forEach(tema => {
      html += renderTema(tema, data.parte);
    });

    container.innerHTML = html;
    renderMath(container);

    // Inicializar editores CodeMirror después de inyectar
    setTimeout(() => inicializarEditores(container), 50);
  }

  // ============================================================
  // RENDERIZAR TEMA INDIVIDUAL
  // ============================================================
  function renderTema(tema, parteId) {
    const id = `tema-${parteId}-${tema.id}`;
    let html = `<article class="tema" id="${id}">`;

    // Header
    html += `<div class="tema-header">`;
    html += `<div class="tema-numero">${escapeHtml(tema.numero || '')}</div>`;
    html += `<div class="tema-titulo-bloque">`;
    html += `<h2>${tema.emoji ? tema.emoji + ' ' : ''}${escapeHtml(tema.titulo)}</h2>`;
    if (tema.subtitulo) {
      html += `<p class="tema-subtitulo">${escapeHtml(tema.subtitulo)}</p>`;
    }
    html += `</div></div>`;

    // ¿Qué es?
    if (tema.que_es && tema.que_es.length > 0) {
      html += `<section class="tema-seccion">`;
      html += `<h3 class="seccion-titulo">💡 ¿Qué es?</h3>`;
      tema.que_es.forEach(p => { html += p; });
      html += `</section>`;
    }

    // ¿Para qué sirve?
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
        html += renderEjemplo(ej, i, parteId, tema.id);
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
        if (err.razon) html += `<div class="error-razon">${escapeHtml(err.razon)}</div>`;
        if (err.correcto) {
          html += `<div class="ok-linea"><span class="ok-marca">✅</span><code>${escapeHtml(err.correcto)}</code></div>`;
        }
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
  // RENDERIZAR EJEMPLO (con editor)
  // ============================================================
  function renderEjemplo(ej, index, parteId, temaId) {
    const editorId = `ed-${parteId}-${temaId}-${index}`;
    const outputId = `out-${parteId}-${temaId}-${index}`;

    let html = `<div class="bloque-ejemplo">`;
    html += `<div class="ejemplo-titulo">Ejemplo ${index + 1}: ${escapeHtml(ej.titulo || '')}</div>`;

    // Si el ejemplo trae código, se muestra con editor
    if (ej.codigo) {
      html += `<textarea id="${editorId}">${escapeHtml(ej.codigo)}</textarea>`;
      html += `<div style="padding:8px 14px;display:flex;justify-content:flex-end;gap:8px;border-bottom:1px solid var(--border);">`;
      html += `<button class="btn-run" onclick="ejecutarEjemplo('${editorId}', '${outputId}')"
                style="padding:6px 14px;border-radius:5px;border:1px solid var(--accent-dim);background:var(--accent-soft);color:var(--accent);font-family:var(--font-ui);font-size:0.78rem;font-weight:600;cursor:pointer;">
                ▶ Ejecutar
              </button>`;
      html += `</div>`;
      html += `<div id="${outputId}" class="output-box" style="padding:10px 14px;font-family:var(--font-mono);font-size:0.78rem;color:var(--text-dim);min-height:40px;">Presiona Ejecutar para ver el resultado...</div>`;
    }

    // Explicación
    if (ej.explicacion && ej.explicacion.length > 0) {
      html += `<div class="ejemplo-explicacion">`;
      ej.explicacion.forEach(p => { html += p; });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  // ============================================================
  // INICIALIZAR EDITORES CODEMIRROR
  // ============================================================
  function inicializarEditores(container) {
    if (typeof CodeMirror === 'undefined') return;
    if (typeof createEditor !== 'function') return;

    container.querySelectorAll('textarea').forEach(textarea => {
      if (textarea._cmInitialized) return;
      if (typeof editorsMap !== 'undefined' && editorsMap[textarea.id]) return;

      const editor = createEditor(textarea);
      textarea._cmInitialized = true;
      if (typeof editorsMap !== 'undefined') {
        editorsMap[textarea.id] = editor;
      }
    });
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  async function showSeccion(nombre) {
    const container = document.getElementById('guide-content');
    if (!container) return;

    // Si ya estamos en esa sección, no hacer nada
    if (window.location.hash === '#' + nombre && container.dataset.seccion === nombre) {
      return;
    }

    container.innerHTML = '<div id="loading-guide">Cargando contenido...</div>';
    container.dataset.seccion = nombre;

    const info = SECCIONES[nombre];
    if (!info) {
      container.innerHTML = '<div id="loading-guide">Sección no encontrada: ' + escapeHtml(nombre) + '</div>';
      return;
    }

    const data = await cargarJson(info.archivo);
    renderSeccionSimple(container, data);

    // Actualizar URL
    history.replaceState(null, '', '#' + nombre);

    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function showParte(parteId) {
    const container = document.getElementById('guide-content');
    if (!container) return;

    if (window.location.hash === '#parte-' + parteId && container.dataset.parte === String(parteId)) {
      return;
    }

    container.innerHTML = '<div id="loading-guide">Cargando parte...</div>';
    container.dataset.parte = String(parteId);
    container.dataset.seccion = '';

    const info = PARTES.find(p => p.id === parteId);
    if (!info) {
      container.innerHTML = '<div id="loading-guide">Parte no encontrada: ' + parteId + '</div>';
      return;
    }

    const data = await cargarJson(info.archivo);
    renderParte(container, data);

    // Actualizar URL
    history.replaceState(null, '', '#parte-' + String(parteId).padStart(2, '0'));

    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ============================================================
  // CARGA INICIAL
  // ============================================================
  function cargarSegunHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
      showSeccion('intro');
      return;
    }

    if (hash.startsWith('parte-')) {
      const id = parseInt(hash.replace('parte-', ''), 10);
      if (!isNaN(id)) {
        showParte(id);
        return;
      }
    }

    if (SECCIONES[hash]) {
      showSeccion(hash);
      return;
    }

    // Fallback
    showSeccion('intro');
  }

  function init() {
    cargarSegunHash();

    // Al cambiar el hash, recargar
    window.addEventListener('hashchange', cargarSegunHash);
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.showSeccion = showSeccion;
  window.showParte = showParte;
  window.cargarSegunHash = cargarSegunHash;
  window.inicializarEditores = inicializarEditores;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

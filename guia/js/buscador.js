/* ============================================
   buscador.js — Buscador global de la guía
   v2 - Indexa partes y temas, búsqueda difusa
   ============================================ */

(function () {
  'use strict';

  const INDICE_KEY = 'guia_indice_v2';
  const INDICE_TTL = 24 * 60 * 60 * 1000;
  const CONTENT_PATH = 'contenido/';

  // Las 12 partes de la guía (debe coincidir con guia.js)
  const PARTES = [
    { id: 1,  titulo: 'Primeros pasos',         emoji: '🐣' },
    { id: 2,  titulo: 'Tipos de datos',         emoji: '🔢' },
    { id: 3,  titulo: 'Operaciones',            emoji: '➕' },
    { id: 4,  titulo: 'Control de flujo',       emoji: '🔀' },
    { id: 5,  titulo: 'Colecciones',            emoji: '📚' },
    { id: 6,  titulo: 'Funciones',              emoji: '⚙️' },
    { id: 7,  titulo: 'Módulos y librerías',    emoji: '📦' },
    { id: 8,  titulo: 'Errores y excepciones',  emoji: '⚠️' },
    { id: 9,  titulo: 'Clases y objetos (POO)', emoji: '🏛️' },
    { id: 10, titulo: 'Análisis numérico',      emoji: '🧮' },
    { id: 11, titulo: 'Archivos y datos',       emoji: '📁' },
    { id: 12, titulo: 'Recursos extra',         emoji: '🎓' }
  ];

  let indice = [];
  let resultados = [];
  let seleccionActual = -1;
  let cargando = false;

  // ============================================================
  // UTILIDADES
  // ============================================================
  function normalizar(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  // Extrae texto plano de un array de strings HTML
  function unirHtml(arr) {
    if (!arr) return '';
    if (typeof arr === 'string') return stripHtml(arr);
    return arr.map(stripHtml).join(' ');
  }

  // ============================================================
  // CACHÉ DEL ÍNDICE
  // ============================================================
  function leerIndiceCache() {
    try {
      const raw = localStorage.getItem(INDICE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > INDICE_TTL) return null;
      return data.indice;
    } catch (e) { return null; }
  }

  function guardarIndiceCache(idx) {
    try {
      localStorage.setItem(INDICE_KEY, JSON.stringify({ ts: Date.now(), indice: idx }));
    } catch (e) {
      // Si es muy grande, no cachear
    }
  }

  // ============================================================
  // CONSTRUCCIÓN DEL ÍNDICE
  // ============================================================
  async function construirIndice() {
    if (cargando) return;
    cargando = true;

    const cache = leerIndiceCache();
    if (cache && cache.length > 0) {
      indice = cache;
      cargando = false;
      console.log('[buscador] Índice cargado desde caché:', indice.length, 'entradas');
      return;
    }

    const nuevo = [];

    for (const parte of PARTES) {
      const file = `parte-${String(parte.id).padStart(2, '0')}.json`;
      try {
        const res = await fetch(CONTENT_PATH + file);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.temas) continue;

        data.temas.forEach((tema, i) => {
          // Texto de todas las secciones para búsqueda
          const textoQueEs = unirHtml(tema.que_es);
          const textoParaQue = unirHtml(tema.para_que_sirve);

          // Ejemplos: código + explicación
          let textoEjemplos = '';
          if (tema.ejemplos) {
            tema.ejemplos.forEach(ej => {
              textoEjemplos += ' ' + (ej.titulo || '');
              textoEjemplos += ' ' + (ej.codigo || '');
              textoEjemplos += ' ' + unirHtml(ej.explicacion);
            });
          }

          // Errores comunes
          let textoErrores = '';
          if (tema.errores_comunes) {
            tema.errores_comunes.forEach(err => {
              textoErrores += ' ' + (err.error || '');
              textoErrores += ' ' + (err.razon || '');
              textoErrores += ' ' + (err.correcto || '');
            });
          }

          // Tips
          const textoTips = unirHtml(tema.tips);

          // Todo junto para la búsqueda general
          const todo = [
            tema.titulo || '',
            tema.subtitulo || '',
            textoQueEs,
            textoParaQue,
            textoEjemplos,
            textoErrores,
            textoTips,
            tema.resumen || ''
          ].join(' ');

          nuevo.push({
            parteId: parte.id,
            parteTitulo: parte.titulo,
            parteEmoji: parte.emoji,
            temaIndex: i,
            temaId: tema.id,
            numero: tema.numero,
            titulo: tema.titulo,
            subtitulo: tema.subtitulo || '',
            emoji: tema.emoji || '',
            textoQueEs,
            todo
          });
        });

        // También indexar la parte misma (por si buscan su nombre)
        nuevo.push({
          parteId: parte.id,
          parteTitulo: parte.titulo,
          parteEmoji: parte.emoji,
          temaIndex: -1,
          temaId: null,
          numero: null,
          titulo: `Parte ${parte.id}: ${parte.titulo}`,
          subtitulo: data.descripcion || '',
          emoji: parte.emoji,
          textoQueEs: stripHtml(data.descripcion || ''),
          todo: `${parte.titulo} ${data.descripcion || ''}`
        });

      } catch (e) {
        console.warn('[buscador] Error cargando parte-' + parte.id + ':', e);
      }
    }

    indice = nuevo;
    guardarIndiceCache(indice);
    cargando = false;
    console.log('[buscador] Índice construido:', indice.length, 'entradas');
  }

  // ============================================================
  // BÚSQUEDA
  // ============================================================
  function buscar(query) {
    const q = normalizar(query.trim());
    if (!q || q.length < 2) {
      resultados = [];
      seleccionActual = -1;
      renderResultados();
      return;
    }

    const terminos = q.split(/\s+/).filter(t => t.length > 0);

    const scored = indice.map(item => {
      const titulo = normalizar(item.titulo);
      const subtitulo = normalizar(item.subtitulo);
      const textoQueEs = normalizar(item.textoQueEs);
      const todo = normalizar(item.todo);

      let score = 0;
      let coincidencias = 0;

      for (const t of terminos) {
        let s = 0;

        // Título: máxima prioridad
        if (titulo === t) s += 200;
        else if (titulo.startsWith(t)) s += 100;
        else if (titulo.includes(t)) s += 50;

        // Subtítulo
        if (subtitulo.includes(t)) s += 20;

        // Texto principal
        if (textoQueEs.includes(t)) s += 10;

        // Todo
        if (todo.includes(t)) s += 5;

        if (s > 0) coincidencias++;
        score += s;
      }

      // Penalizar si no coinciden todos los términos
      if (coincidencias < terminos.length) score *= 0.4;

      return { item, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map(x => x.item);

    resultados = scored;
    seleccionActual = resultados.length > 0 ? 0 : -1;
    renderResultados();
  }

  // ============================================================
  // RESALTAR
  // ============================================================
  function resaltar(texto, query) {
    if (!query) return escapeHtml(texto);
    const q = query.trim();
    if (!q) return escapeHtml(texto);

    const idx = normalizar(texto).indexOf(normalizar(q));
    if (idx < 0) {
      const max = 140;
      return escapeHtml(texto.slice(0, max)) + (texto.length > max ? '…' : '');
    }

    const inicio = Math.max(0, idx - 50);
    const fin = Math.min(texto.length, idx + q.length + 90);

    let fragmento = texto.slice(inicio, fin);
    if (inicio > 0) fragmento = '…' + fragmento;
    if (fin < texto.length) fragmento += '…';

    const norm = normalizar(fragmento);
    const normQ = normalizar(q);
    let html = '';
    let i = 0;
    while (i < fragmento.length) {
      const pos = norm.indexOf(normQ, i);
      if (pos < 0) {
        html += escapeHtml(fragmento.slice(i));
        break;
      }
      html += escapeHtml(fragmento.slice(i, pos));
      html += '<mark>' + escapeHtml(fragmento.slice(pos, pos + q.length)) + '</mark>';
      i = pos + q.length;
    }
    return html;
  }

  // ============================================================
  // RENDERIZADO
  // ============================================================
  function renderResultados() {
    const cont = document.getElementById('buscador-resultados');
    if (!cont) return;

    const input = document.getElementById('buscador-input');
    const query = input ? input.value : '';

    if (!query || query.trim().length < 2) {
      cont.innerHTML = `
        <div class="buscador-vacio">
          Escribe al menos 2 letras para buscar en la guía.
          <div class="buscador-hint">
            Prueba con: <code>while</code>, <code>lista</code>, <code>bisección</code>,
            <code>función</code>, <code>error</code>...
          </div>
        </div>
      `;
      return;
    }

    if (resultados.length === 0) {
      cont.innerHTML = `<div class="buscador-vacio">Sin resultados para "<strong>${escapeHtml(query)}</strong>".</div>`;
      return;
    }

    cont.innerHTML = '';

    // Encabezado
    const header = document.createElement('div');
    header.className = 'buscador-header';
    header.textContent = `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`;
    cont.appendChild(header);

    resultados.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'buscador-item' + (i === seleccionActual ? ' selected' : '');

      // Determinar el tipo
      const esParte = item.temaIndex === -1;
      const tipoLabel = esParte
        ? `${item.parteEmoji} Parte ${item.parteId}`
        : `${item.parteEmoji} Parte ${item.parteId} · Tema ${item.numero}`;

      // Fragmento: usar el textoQueEs si no es parte, o el todo si es parte
      const textoBase = item.textoQueEs || item.subtitulo;
      const fragmento = resaltar(textoBase, query);

      div.innerHTML = `
        <div class="buscador-item-nivel">${escapeHtml(tipoLabel)}</div>
        <div class="buscador-item-titulo">${item.emoji ? item.emoji + ' ' : ''}${resaltar(item.titulo, query)}</div>
        <div class="buscador-item-fragmento">${fragmento}</div>
      `;

      div.addEventListener('click', () => irAResultado(item));
      cont.appendChild(div);
    });
  }

  // ============================================================
  // NAVEGAR AL RESULTADO
  // ============================================================
  async function irAResultado(item) {
    cerrarBuscador();

    if (typeof showParte === 'function') {
      await showParte(item.parteId);
    }

    setTimeout(() => {
      if (item.temaIndex >= 0 && item.temaId) {
        const temaId = `tema-${item.parteId}-${item.temaId}`;
        const tema = document.getElementById(temaId);
        if (tema) {
          tema.scrollIntoView({ behavior: 'smooth', block: 'start' });
          tema.style.transition = 'box-shadow 0.4s';
          tema.style.boxShadow = '0 0 0 3px var(--accent)';
          setTimeout(() => { tema.style.boxShadow = ''; }, 2000);
        }
      } else {
        // Es una parte: scroll al inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 500);
  }

  // ============================================================
  // NAVEGACIÓN POR TECLADO
  // ============================================================
  function moverSeleccion(delta) {
    if (resultados.length === 0) return;
    seleccionActual = (seleccionActual + delta + resultados.length) % resultados.length;
    renderResultados();
    const sel = document.querySelector('.buscador-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function confirmarSeleccion() {
    if (seleccionActual >= 0 && resultados[seleccionActual]) {
      irAResultado(resultados[seleccionActual]);
    }
  }

  // ============================================================
  // ABRIR / CERRAR
  // ============================================================
  function abrirBuscador() {
    const modal = document.getElementById('modal-buscador');
    if (!modal) return;

    modal.classList.add('open');

    if (indice.length === 0) {
      // Mostrar mensaje de carga
      const cont = document.getElementById('buscador-resultados');
      if (cont) cont.innerHTML = '<div class="buscador-vacio">Cargando índice de búsqueda...</div>';

      construirIndice().then(() => {
        renderResultados();
        const input = document.getElementById('buscador-input');
        if (input) input.focus();
      });
    } else {
      renderResultados();
    }

    setTimeout(() => {
      const input = document.getElementById('buscador-input');
      if (input) { input.focus(); input.select(); }
    }, 100);
  }

  function cerrarBuscador() {
    const modal = document.getElementById('modal-buscador');
    if (modal) modal.classList.remove('open');
    resultados = [];
    seleccionActual = -1;
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    const input = document.getElementById('buscador-input');
    if (input) {
      input.addEventListener('input', (e) => buscar(e.target.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moverSeleccion(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moverSeleccion(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          confirmarSeleccion();
        } else if (e.key === 'Escape') {
          cerrarBuscador();
        }
      });
    }

    // Ctrl+K o Cmd+K abre el buscador
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        abrirBuscador();
      }
    });

    // Pre-cargar el índice en segundo plano
    setTimeout(() => {
      if (indice.length === 0) construirIndice();
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.abrirBuscador = abrirBuscador;
  window.cerrarBuscador = cerrarBuscador;
  window.reconstruirIndice = () => {
    localStorage.removeItem(INDICE_KEY);
    indice = [];
    construirIndice();
  };
})();

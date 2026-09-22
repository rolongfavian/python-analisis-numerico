/* ============================================
   buscador.js — Buscador global de la guía
   v6 - Indexa intro + sección 0 + 15 partes + glosario
   ============================================ */

(function () {
  'use strict';

  const CONTENT_PATH = 'contenido/';
  const INDICE_KEY = 'guia_indice_v6';
  const INDICE_TTL = 24 * 60 * 60 * 1000;

  // Secciones simples (sin temas)
  const SECCIONES = [
    { id: 'intro',      archivo: 'intro.json',      titulo: 'Introducción',         emoji: '📖' },
    { id: 'seccion-00', archivo: 'seccion-00.json', titulo: 'Cómo usar esta página', emoji: '📚' },
    { id: 'glosario',   archivo: 'glosario.json',   titulo: 'Glosario y recursos',  emoji: '📕' }
  ];

  // Partes (con temas)
  const PARTES = [
    { id: 1,  archivo: 'parte-01.json', emoji: '🐣' },
    { id: 2,  archivo: 'parte-02.json', emoji: '🔢' },
    { id: 3,  archivo: 'parte-03.json', emoji: '➕' },
    { id: 4,  archivo: 'parte-04.json', emoji: '📝' },
    { id: 5,  archivo: 'parte-05.json', emoji: '📚' },
    { id: 6,  archivo: 'parte-06.json', emoji: '🎯' },
    { id: 7,  archivo: 'parte-07.json', emoji: '🔀' },
    { id: 8,  archivo: 'parte-08.json', emoji: '🔄' },
    { id: 9,  archivo: 'parte-09.json', emoji: '⚙️' },
    { id: 10, archivo: 'parte-10.json', emoji: '📦' },
    { id: 11, archivo: 'parte-11.json', emoji: '⚠️' },
    { id: 12, archivo: 'parte-12.json', emoji: '🏛️' },
    { id: 13, archivo: 'parte-13.json', emoji: '📁' },
    { id: 14, archivo: 'parte-14.json', emoji: '🧮' },
    { id: 15, archivo: 'parte-15.json', emoji: '🎓' }
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

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  function unirHtml(arr) {
    if (!arr) return '';
    if (typeof arr === 'string') return stripHtml(arr);
    return arr.map(stripHtml).join(' ');
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ============================================================
  // CACHÉ DEL ÍNDICE
  // ============================================================
  function leerCache() {
    try {
      const raw = localStorage.getItem(INDICE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > INDICE_TTL) return null;
      return data.indice;
    } catch (e) { return null; }
  }

  function guardarCache(idx) {
    try {
      localStorage.setItem(INDICE_KEY, JSON.stringify({ ts: Date.now(), indice: idx }));
    } catch (e) { /* ignorar */ }
  }

  // ============================================================
  // CONSTRUIR ÍNDICE
  // ============================================================
  async function construirIndice() {
    if (cargando) return;
    cargando = true;

    const cache = leerCache();
    if (cache && cache.length > 0) {
      indice = cache;
      cargando = false;
      console.log('[buscador] Índice cargado desde caché:', indice.length);
      return;
    }

    const nuevo = [];

    // 1) Secciones simples (intro, sección 0, glosario)
    for (const sec of SECCIONES) {
      try {
        const res = await fetch(CONTENT_PATH + sec.archivo);
        if (!res.ok) continue;
        const data = await res.json();

        // La sección como entrada
        nuevo.push({
          tipo: 'seccion',
          seccionId: sec.id,
          parteId: null,
          temaIndex: -1,
          numero: null,
          titulo: data.titulo || sec.titulo,
          subtitulo: data.descripcion || '',
          emoji: data.emoji || sec.emoji,
          textoQueEs: stripHtml(data.descripcion || ''),
          todo: [
            data.titulo || sec.titulo,
            data.descripcion || '',
            (data.secciones || []).map(s => s.titulo + ' ' + stripHtml(s.contenido)).join(' '),
            stripHtml(data.creditos || '')
          ].join(' ')
        });

        // Subsecciones internas (para la intro)
        if (data.secciones && data.secciones.length > 0) {
          data.secciones.forEach((sub, i) => {
            nuevo.push({
              tipo: 'seccion-sub',
              seccionId: sec.id,
              parteId: null,
              temaIndex: i,
              numero: null,
              titulo: sub.titulo || 'Sección',
              subtitulo: '',
              emoji: sec.emoji,
              textoQueEs: stripHtml(sub.contenido || ''),
              todo: [sub.titulo, stripHtml(sub.contenido || '')].join(' ')
            });
          });
        }
      } catch (e) {
        console.warn('[buscador] Error con', sec.archivo, e);
      }
    }

    // 2) Partes con temas
    for (const parte of PARTES) {
      try {
        const res = await fetch(CONTENT_PATH + parte.archivo);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.temas) continue;

        data.temas.forEach((tema, i) => {
          const textoQueEs = unirHtml(tema.que_es);
          const textoParaQue = unirHtml(tema.para_que_sirve);

          let textoEjemplos = '';
          if (tema.ejemplos) {
            tema.ejemplos.forEach(ej => {
              textoEjemplos += ' ' + (ej.titulo || '');
              textoEjemplos += ' ' + (ej.codigo || '');
              textoEjemplos += ' ' + unirHtml(ej.explicacion);
            });
          }

          let textoErrores = '';
          if (tema.errores_comunes) {
            tema.errores_comunes.forEach(err => {
              textoErrores += ' ' + (err.error || '');
              textoErrores += ' ' + (err.razon || '');
              textoErrores += ' ' + (err.correcto || '');
            });
          }

          const textoTips = unirHtml(tema.tips);

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
            tipo: 'tema',
            seccionId: null,
            parteId: parte.id,
            temaIndex: i,
            temaId: tema.id,
            numero: tema.numero,
            titulo: tema.titulo,
            subtitulo: tema.subtitulo || '',
            emoji: tema.emoji || parte.emoji,
            textoQueEs,
            todo
          });
        });

        // La parte misma como entrada
        nuevo.push({
          tipo: 'parte',
          seccionId: null,
          parteId: parte.id,
          temaIndex: -1,
          numero: null,
          titulo: `Parte ${parte.id}: ${data.titulo}`,
          subtitulo: data.descripcion || '',
          emoji: data.emoji || parte.emoji,
          textoQueEs: stripHtml(data.descripcion || ''),
          todo: [data.titulo, data.descripcion].join(' ')
        });

      } catch (e) {
        console.warn('[buscador] Error con', parte.archivo, e);
      }
    }

    indice = nuevo;
    guardarCache(indice);
    cargando = false;
    console.log('[buscador] Índice construido:', indice.length);
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
        if (titulo === t) s += 200;
        else if (titulo.startsWith(t)) s += 100;
        else if (titulo.includes(t)) s += 50;

        if (subtitulo.includes(t)) s += 20;
        if (textoQueEs.includes(t)) s += 10;
        if (todo.includes(t)) s += 5;

        if (s > 0) coincidencias++;
        score += s;
      }

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
  // RENDERIZAR RESULTADOS
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
            Prueba con: <code>while</code>, <code>lista</code>, <code>función</code>,
            <code>error</code>, <code>clase</code>...
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

    const header = document.createElement('div');
    header.className = 'buscador-header';
    header.textContent = `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`;
    cont.appendChild(header);

    resultados.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'buscador-item' + (i === seleccionActual ? ' selected' : '');

      let label = '';
      if (item.tipo === 'parte') {
        label = `${item.emoji} Parte ${item.parteId}`;
      } else if (item.tipo === 'tema') {
        label = `${item.emoji} Parte ${item.parteId} · Tema ${item.numero}`;
      } else if (item.tipo === 'seccion') {
        label = `${item.emoji} ${item.titulo}`;
      } else if (item.tipo === 'seccion-sub') {
        label = `${item.emoji} ${item.titulo}`;
      }

      const fragmento = resaltar(item.textoQueEs || item.subtitulo || '', query);

      div.innerHTML = `
        <div class="buscador-item-nivel">${escapeHtml(label)}</div>
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

    // Secciones simples
    if (item.tipo === 'seccion' || item.tipo === 'seccion-sub') {
      if (typeof showSeccion === 'function') {
        await showSeccion(item.seccionId);
      }
      return;
    }

    // Partes y temas
    if (typeof showParte === 'function' && item.parteId) {
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
  // ABRIR / CERRAR MODAL
  // ============================================================
  function abrirBuscador() {
    const modal = document.getElementById('modal-buscador');
    if (!modal) return;

    modal.classList.add('open');

    if (indice.length === 0) {
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
        if (e.key === 'ArrowDown') { e.preventDefault(); moverSeleccion(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moverSeleccion(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); confirmarSeleccion(); }
        else if (e.key === 'Escape') cerrarBuscador();
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

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================
  window.abrirBuscador = abrirBuscador;
  window.cerrarBuscador = cerrarBuscador;
  window.reconstruirIndice = () => {
    localStorage.removeItem(INDICE_KEY);
    indice = [];
    construirIndice();
  };
})();

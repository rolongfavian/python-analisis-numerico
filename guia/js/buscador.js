/* ============================================
   buscador.js — Buscador (versión solo-guía)
   ============================================ */

(function () {
  'use strict';

  const INDICE_KEY = 'guia_indice_cache_v2';
  const INDICE_TTL = 24 * 60 * 60 * 1000;
  const CONTENT_PATH = '../contenido/';

  let indice = [];
  let resultados = [];
  let seleccionActual = -1;
  let cargando = false;

  const NIVELES = [
    { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
    { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }, { id: 11 }, { id: 99 }
  ];

  function extraerNumeroNivel(id) {
    if (typeof id === 'number') return id;
    const m = String(id || '').match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

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
    } catch (e) {}
  }

  async function construirIndice() {
    if (cargando) return;
    cargando = true;

    const cache = leerIndiceCache();
    if (cache && cache.length > 0) {
      indice = cache;
      cargando = false;
      return;
    }

    const nuevo = [];
    for (const nivel of NIVELES) {
      const file = `nivel-${String(nivel.id).padStart(2, '0')}.json`;
      try {
        const res = await fetch(CONTENT_PATH + file);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.niveles) continue;

        data.niveles.forEach(n => {
          const numNivel = extraerNumeroNivel(n.id);
          if (numNivel === null) return;

          (n.comandos || []).forEach((cmd, i) => {
            const tB = stripHtml(cmd.basico);
            const tI = stripHtml(cmd.intermedio);
            const tA = stripHtml(cmd.avanzado);
            nuevo.push({
              nivelId: numNivel,
              nivelNumero: n.numero,
              nivelTitulo: n.titulo,
              comandoIndex: i,
              titulo: cmd.nombre || cmd.titulo || '',
              alias: cmd.alias || '',
              texto: [tB, tI, tA].join(' '),
              textoBasico: tB
            });
          });

          nuevo.push({
            nivelId: numNivel,
            nivelNumero: n.numero,
            nivelTitulo: n.titulo,
            comandoIndex: -1,
            titulo: n.titulo,
            alias: '',
            texto: stripHtml(n.descripcion || ''),
            textoBasico: stripHtml(n.descripcion || '')
          });
        });
      } catch (e) { console.warn('[buscador]', e); }
    }

    indice = nuevo;
    guardarIndiceCache(indice);
    cargando = false;
  }

  function normalizar(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function buscar(query) {
    const q = normalizar(query.trim());
    if (!q || q.length < 2) { resultados = []; seleccionActual = -1; renderResultados(); return; }
    const terminos = q.split(/\s+/).filter(t => t.length > 0);

    const scored = indice.map(item => {
      const titulo = normalizar(item.titulo);
      const alias = normalizar(item.alias);
      const texto = normalizar(item.texto);
      let score = 0, coincidencias = 0;
      for (const t of terminos) {
        let s = 0;
        if (titulo === t) s += 100;
        else if (titulo.startsWith(t)) s += 50;
        else if (titulo.includes(t)) s += 25;
        if (alias.includes(t)) s += 15;
        if (texto.includes(t)) s += 5;
        if (s > 0) coincidencias++;
        score += s;
      }
      if (coincidencias < terminos.length) score *= 0.4;
      return { item, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(x => x.item);

    resultados = scored;
    seleccionActual = resultados.length > 0 ? 0 : -1;
    renderResultados();
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function resaltar(texto, query) {
    if (!query) return escapeHtml(texto);
    const q = query.trim();
    if (!q) return escapeHtml(texto);
    const idx = normalizar(texto).indexOf(normalizar(q));
    if (idx < 0) {
      const max = 120;
      return escapeHtml(texto.slice(0, max)) + (texto.length > max ? '…' : '');
    }
    const inicio = Math.max(0, idx - 40);
    const fin = Math.min(texto.length, idx + q.length + 80);
    let fragmento = texto.slice(inicio, fin);
    if (inicio > 0) fragmento = '…' + fragmento;
    if (fin < texto.length) fragmento += '…';

    const norm = normalizar(fragmento);
    const normQ = normalizar(q);
    let html = '', i = 0;
    while (i < fragmento.length) {
      const pos = norm.indexOf(normQ, i);
      if (pos < 0) { html += escapeHtml(fragmento.slice(i)); break; }
      html += escapeHtml(fragmento.slice(i, pos));
      html += '<mark>' + escapeHtml(fragmento.slice(pos, pos + q.length)) + '</mark>';
      i = pos + q.length;
    }
    return html;
  }

  function renderResultados() {
    const cont = document.getElementById('buscador-resultados');
    if (!cont) return;
    const input = document.getElementById('buscador-input');
    const query = input ? input.value : '';

    if (!query || query.trim().length < 2) {
      cont.innerHTML = '<div class="buscador-vacio">Escribe al menos 2 letras para buscar.</div>';
      return;
    }
    if (resultados.length === 0) {
      cont.innerHTML = '<div class="buscador-vacio">Sin resultados para "<strong>' + escapeHtml(query) + '</strong>".</div>';
      return;
    }

    cont.innerHTML = '';
    resultados.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'buscador-item' + (i === seleccionActual ? ' selected' : '');
      const fragmento = resaltar(item.textoBasico || item.texto, query);
      div.innerHTML = `
        <div class="buscador-item-nivel">Nivel ${item.nivelNumero} · ${escapeHtml(item.nivelTitulo)}</div>
        <div class="buscador-item-titulo">${resaltar(item.titulo, query)}</div>
        <div class="buscador-item-fragmento">${fragmento}</div>
      `;
      div.addEventListener('click', () => irAResultado(item));
      cont.appendChild(div);
    });
  }

  async function irAResultado(item) {
    cerrarBuscador();
    const nivelNum = extraerNumeroNivel(item.nivelId);
    if (nivelNum === null) return;
    if (typeof showLevel === 'function') await showLevel(nivelNum);
    setTimeout(() => {
      if (item.comandoIndex >= 0) {
        const cardId = `cmd-${nivelNum}-${item.comandoIndex}`;
        const card = document.getElementById(cardId);
        if (card) {
          card.classList.add('expanded');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.transition = 'box-shadow 0.3s';
          card.style.boxShadow = '0 0 0 3px var(--accent)';
          setTimeout(() => { card.style.boxShadow = ''; }, 1500);
        }
      }
    }, 500);
  }

  function moverSeleccion(delta) {
    if (resultados.length === 0) return;
    seleccionActual = (seleccionActual + delta + resultados.length) % resultados.length;
    renderResultados();
    const sel = document.querySelector('.buscador-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function confirmarSeleccion() {
    if (seleccionActual >= 0 && resultados[seleccionActual]) irAResultado(resultados[seleccionActual]);
  }

  function abrirBuscador() {
    const modal = document.getElementById('modal-buscador');
    if (!modal) return;
    modal.classList.add('open');
    if (indice.length === 0) {
      construirIndice().then(() => {
        const input = document.getElementById('buscador-input');
        if (input) input.focus();
      });
    }
    setTimeout(() => {
      const input = document.getElementById('buscador-input');
      if (input) { input.focus(); input.select(); }
    }, 100);
  }

  function cerrarBuscador() {
    const modal = document.getElementById('modal-buscador');
    if (modal) modal.classList.remove('open');
    resultados = []; seleccionActual = -1;
  }

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
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); abrirBuscador();
      }
    });
    setTimeout(() => { if (indice.length === 0) construirIndice(); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.abrirBuscador = abrirBuscador;
  window.cerrarBuscador = cerrarBuscador;
})();

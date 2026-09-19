/* ============================================
   codemirror.js — Editores + autocompletado Python
   ============================================ */

(function () {
  'use strict';

  // ============================================================
  // FRAGMENTOS DE CÓDIGO PYTHON (autocompletado)
  // ============================================================
  const PYTHON_SNIPPETS = [
    // Estructuras de control
    { text: 'if condicion:\n    pass', displayText: 'if condicion:' },
    { text: 'if condicion:\n    pass\nelse:\n    pass', displayText: 'if/else' },
    { text: 'if condicion:\n    pass\nelif otra:\n    pass\nelse:\n    pass', displayText: 'if/elif/else' },
    { text: 'for i in range(10):\n    pass', displayText: 'for i in range(n)' },
    { text: 'for elemento in coleccion:\n    pass', displayText: 'for elemento in coleccion' },
    { text: 'while condicion:\n    pass', displayText: 'while condicion:' },
    { text: 'break', displayText: 'break' },
    { text: 'continue', displayText: 'continue' },
    { text: 'pass', displayText: 'pass' },

    // Funciones y clases
    { text: 'def nombre(parametros):\n    return resultado', displayText: 'def nombre(...)' },
    { text: 'def __init__(self):\n    pass', displayText: 'def __init__(self)' },
    { text: 'lambda x: x', displayText: 'lambda x: x' },
    { text: 'class Nombre:\n    def __init__(self):\n        pass', displayText: 'class Nombre:' },

    // Manejo de errores
    { text: 'try:\n    pass\nexcept Exception as e:\n    print(e)', displayText: 'try/except' },
    { text: 'try:\n    pass\nfinally:\n    pass', displayText: 'try/finally' },
    { text: 'raise ValueError("mensaje")', displayText: 'raise ValueError(...)' },
    { text: 'assert condicion, "mensaje"', displayText: 'assert condicion' },

    // Imports comunes
    { text: 'import numpy as np', displayText: 'import numpy as np' },
    { text: 'import matplotlib.pyplot as plt', displayText: 'import matplotlib.pyplot as plt' },
    { text: 'import math', displayText: 'import math' },
    { text: 'from math import pi, e, sqrt', displayText: 'from math import ...' },
    { text: 'import random', displayText: 'import random' },
    { text: 'import time', displayText: 'import time' },

    // Funciones built-in
    { text: 'print()', displayText: 'print(valor)' },
    { text: 'len(coleccion)', displayText: 'len(coleccion)' },
    { text: 'range(inicio, fin, paso)', displayText: 'range(...)' },
    { text: 'enumerate(iterable)', displayText: 'enumerate(iterable)' },
    { text: 'zip(iterable1, iterable2)', displayText: 'zip(...)' },
    { text: 'sum(iterable)', displayText: 'sum(iterable)' },
    { text: 'min(iterable)', displayText: 'min(iterable)' },
    { text: 'max(iterable)', displayText: 'max(iterable)' },
    { text: 'abs(valor)', displayText: 'abs(valor)' },
    { text: 'round(valor, decimales)', displayText: 'round(valor, n)' },
    { text: 'int(valor)', displayText: 'int(valor)' },
    { text: 'float(valor)', displayText: 'float(valor)' },
    { text: 'str(valor)', displayText: 'str(valor)' },
    { text: 'list(iterable)', displayText: 'list(iterable)' },
    { text: 'dict()', displayText: 'dict()' },
    { text: 'set()', displayText: 'set()' },
    { text: 'input("prompt: ")', displayText: 'input(prompt)' },

    // Algoritmos numéricos comunes
    { text: 'def f(x):\n    return x**2 - 2', displayText: 'def f(x):' },
    { text: 'def df(x):\n    return 2*x', displayText: 'def df(x): (derivada)' },
    { text: 'abs(x - y) < 1e-9', displayText: 'abs(x - y) < tol' },
    { text: 'math.isclose(a, b, rel_tol=1e-9)', displayText: 'math.isclose(a, b)' },

    // Palabras comunes
    { text: 'return', displayText: 'return' },
    { text: 'import', displayText: 'import' },
    { text: 'from', displayText: 'from' },
    { text: 'as', displayText: 'as' },
    { text: 'with open() as archivo:', displayText: 'with open(...) as ...' },
    { text: 'None', displayText: 'None' },
    { text: 'True', displayText: 'True' },
    { text: 'False', displayText: 'False' },
    { text: 'and', displayText: 'and' },
    { text: 'or', displayText: 'or' },
    { text: 'not', displayText: 'not' },
    { text: 'in', displayText: 'in' },
    { text: 'is', displayText: 'is' },

    // Operadores y comodines
    { text: '==', displayText: '== (igual)' },
    { text: '!=', displayText: '!= (distinto)' },
    { text: '<=', displayText: '<= (menor o igual)' },
    { text: '>=', displayText: '>= (mayor o igual)' },
    { text: '**', displayText: '** (potencia)' },
    { text: '//', displayText: '// (división entera)' },
    { text: '%', displayText: '% (módulo)' },
    { text: '+=', displayText: '+= (suma y asigna)' },
    { text: '-=', displayText: '-= (resta y asigna)' },
    { text: '*=', displayText: '*= (multiplica y asigna)' },
    { text: '/=', displayText: '/= (divide y asigna)' }
  ];

  // ============================================================
  // AUTOCOMPLETADO PERSONALIZADO
  // ============================================================

  /**
   * Devuelve la lista de sugerencias que coincidan con el token actual.
   */
  function pythonHint(editor) {
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    const end = cur.ch;
    let start = end;
    while (start && /[\w\.]/.test(line.charAt(start - 1))) start--;
    const token = line.slice(start, end).toLowerCase();

    // Si no hay token, devolver lista vacía (para no molestar)
    if (!token || token.length < 1) return null;

    const list = PYTHON_SNIPPETS
      .filter(s => {
        const t = s.text.toLowerCase();
        const d = (s.displayText || s.text).toLowerCase();
        return t.startsWith(token) || d.startsWith(token) || t.includes(token);
      })
      .map(s => ({
        text: s.text,
        displayText: s.displayText || s.text
      }));

    if (list.length === 0) return null;

    return {
      list: list,
      from: CodeMirror.Pos(cur.line, start),
      to: CodeMirror.Pos(cur.line, end)
    };
  }

  // ============================================================
  // INICIALIZACIÓN DE EDITORES
  // ============================================================

  /**
   * Crea un editor CodeMirror a partir de un textarea.
   */
  function createEditor(textarea) {
    const editor = CodeMirror.fromTextArea(textarea, {
      mode: 'python',
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      lineWrapping: false,
      autoCloseBrackets: true,
      matchBrackets: true,
      extraKeys: {
        'Tab': (cm) => {
          // Si hay sugerencias abiertas, Tab selecciona la actual
          if (cm.state.completionActive) {
            cm.state.completionActive.pick();
          } else {
            cm.replaceSelection('    ', 'end');
          }
        },
        'Ctrl-Space': (cm) => {
          cm.showHint({ hint: pythonHint, completeSingle: false });
        }
      }
    });

    // Mostrar sugerencias automáticamente al escribir ciertos caracteres
    editor.on('inputRead', (cm, change) => {
      if (change.origin !== '+input') return;
      const typed = change.text[0];
      // Disparar hint al escribir una letra o el punto
      if (/[a-zA-Z_.]/.test(typed)) {
        // Debounce: solo disparar si no estamos en medio de un hint
        if (cm.state.completionActive) return;
        clearTimeout(editor._hintTimer);
        editor._hintTimer = setTimeout(() => {
          cm.showHint({
            hint: pythonHint,
            completeSingle: false,
            alignWithWord: true
          });
        }, 80);
      }
    });

    return editor;
  }

  /**
   * Inicializa todos los editores de la página.
   */
  function initEditors() {
    if (typeof editorsMap === 'undefined') {
      window.editorsMap = {};
    }

    document.querySelectorAll('textarea').forEach(textarea => {
      if (editorsMap[textarea.id]) return; // ya inicializado
      const editor = createEditor(textarea);
      editorsMap[textarea.id] = editor;
    });

    console.log('[codemirror] Editores inicializados:', Object.keys(editorsMap).length);
  }

  // Exponer globalmente el mapa de editores (para otros scripts)
  window.editorsMap = window.editorsMap || {};

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditors);
  } else {
    initEditors();
  }
})();

/* ============================================
   codemirror.js — Editores CodeMirror + autocompletado
   v5 - Sin linter (Skulpt no expone compile)
   ============================================ */

(function () {
  'use strict';

  const PYTHON_SNIPPETS = [
    { text: 'if condicion:\n    pass', displayText: 'if condicion:' },
    { text: 'if condicion:\n    pass\nelse:\n    pass', displayText: 'if/else' },
    { text: 'if condicion:\n    pass\nelif otra:\n    pass\nelse:\n    pass', displayText: 'if/elif/else' },
    { text: 'for i in range(10):\n    pass', displayText: 'for i in range(n)' },
    { text: 'for elemento in coleccion:\n    pass', displayText: 'for elemento in coleccion' },
    { text: 'while condicion:\n    pass', displayText: 'while condicion:' },
    { text: 'break', displayText: 'break' },
    { text: 'continue', displayText: 'continue' },
    { text: 'pass', displayText: 'pass' },
    { text: 'def nombre(parametros):\n    return resultado', displayText: 'def nombre(...)' },
    { text: 'def __init__(self):\n    pass', displayText: 'def __init__(self)' },
    { text: 'lambda x: x', displayText: 'lambda x: x' },
    { text: 'class Nombre:\n    def __init__(self):\n        pass', displayText: 'class Nombre:' },
    { text: 'try:\n    pass\nexcept Exception as e:\n    print(e)', displayText: 'try/except' },
    { text: 'try:\n    pass\nfinally:\n    pass', displayText: 'try/finally' },
    { text: 'raise ValueError("mensaje")', displayText: 'raise ValueError(...)' },
    { text: 'assert condicion, "mensaje"', displayText: 'assert condicion' },
    { text: 'import math', displayText: 'import math' },
    { text: 'from math import pi, e, sqrt', displayText: 'from math import ...' },
    { text: 'import random', displayText: 'import random' },
    { text: 'import time', displayText: 'import time' },
    { text: 'import datetime', displayText: 'import datetime' },
    { text: 'import json', displayText: 'import json' },
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
    { text: 'bool(valor)', displayText: 'bool(valor)' },
    { text: 'list(iterable)', displayText: 'list(iterable)' },
    { text: 'dict()', displayText: 'dict()' },
    { text: 'set()', displayText: 'set()' },
    { text: 'tuple()', displayText: 'tuple()' },
    { text: 'input("prompt: ")', displayText: 'input(prompt)' },
    { text: 'type(valor)', displayText: 'type(valor)' },
    { text: 'isinstance(valor, tipo)', displayText: 'isinstance(...)' },
    { text: 'sorted(iterable)', displayText: 'sorted(...)' },
    { text: 'reversed(iterable)', displayText: 'reversed(...)' },
    { text: 'map(funcion, iterable)', displayText: 'map(...)' },
    { text: 'filter(funcion, iterable)', displayText: 'filter(...)' },
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

  function pythonHint(editor) {
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    const end = cur.ch;
    let start = end;

    while (start && /[\w\.]/.test(line.charAt(start - 1))) start--;

    const token = line.slice(start, end).toLowerCase();
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

  function createEditor(textarea, opciones = {}) {
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

    function triggerHint(cm) {
      if (cm.state.completionActive) return;
      clearTimeout(cm._hintTimer);
      cm._hintTimer = setTimeout(() => {
        try {
          cm.showHint({
            hint: pythonHint,
            completeSingle: false,
            alignWithWord: true
          });
        } catch (e) { /* ignore */ }
      }, 60);
    }

    editor.on('inputRead', (cm, change) => {
      if (change.origin !== '+input') return;
      const typed = change.text[0];
      if (!typed) return;
      if (/[a-zA-Z0-9_.]/.test(typed)) triggerHint(cm);
    });

    const ta = editor.getInputField();
    if (ta) {
      ta.addEventListener('beforeinput', (e) => {
        const data = e.data || '';
        if (data && /[a-zA-Z0-9_.]/.test(data)) {
          triggerHint(editor);
        }
      });

      ta.addEventListener('keyup', (e) => {
        if (e.key && e.key.length === 1 && /[a-zA-Z0-9_.]/.test(e.key)) {
          triggerHint(editor);
        }
      });
    }

    return editor;
  }

  function initEditors() {
    if (typeof editorsMap === 'undefined') {
      window.editorsMap = {};
    }

    document.querySelectorAll('textarea').forEach(textarea => {
      if (editorsMap[textarea.id]) return;
      const editor = createEditor(textarea);
      editorsMap[textarea.id] = editor;
    });

    console.log('[codemirror] Editores inicializados:', Object.keys(editorsMap).length);
  }

  window.editorsMap = window.editorsMap || {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditors);
  } else {
    initEditors();
  }

  window.createEditor = createEditor;
  window.pythonHint = pythonHint;
})();

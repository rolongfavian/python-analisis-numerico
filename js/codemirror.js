/* ============================================
   codemirror.js — Editores + autocompletado + linter
   v4 - Linter amigable (no marca imports como error)
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
    { text: 'import numpy as np', displayText: 'import numpy as np' },
    { text: 'import matplotlib.pyplot as plt', displayText: 'import matplotlib.pyplot as plt' },
    { text: 'import math', displayText: 'import math' },
    { text: 'from math import pi, e, sqrt', displayText: 'from math import ...' },
    { text: 'import random', displayText: 'import random' },
    { text: 'import time', displayText: 'import time' },
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
    { text: 'def f(x):\n    return x**2 - 2', displayText: 'def f(x):' },
    { text: 'def df(x):\n    return 2*x', displayText: 'def df(x): (derivada)' },
    { text: 'abs(x - y) < 1e-9', displayText: 'abs(x - y) < tol' },
    { text: 'math.isclose(a, b, rel_tol=1e-9)', displayText: 'math.isclose(a, b)' },
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

  // ============================================================
  // AUTOCOMPLETADO
  // ============================================================
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
      .map(s => ({ text: s.text, displayText: s.displayText || s.text }));

    if (list.length === 0) return null;

    return {
      list: list,
      from: CodeMirror.Pos(cur.line, start),
      to: CodeMirror.Pos(cur.line, end)
    };
  }

  // ============================================================
  // LINTER
  // ============================================================
  const lintTimers = {};
  const lastLinted = {};
  const LINT_DEBOUNCE_MS = 700;

  function aplicarMarcasLint(editor, errors) {
    editor.clearGutter('CodeMirror-lint-markers');
    if (editor._lintMarks) {
      editor._lintMarks.forEach(m => m.clear());
    }
    editor._lintMarks = [];

    if (!errors || errors.length === 0) return;

    errors.forEach(err => {
      const line = Math.max(0, (err.line || 1) - 1);
      const marker = document.createElement('div');
      marker.className = 'cm-lint-marker';
      marker.title = err.message;
      marker.textContent = '⚠';
      editor.setGutterMarker(line, 'CodeMirror-lint-markers', marker);

      const lineText = editor.getLine(line) || '';
      if (lineText.length > 0) {
        const mark = editor.markText(
          CodeMirror.Pos(line, 0),
          CodeMirror.Pos(line, lineText.length),
          { className: 'cm-lint-underline', title: err.message }
        );
        editor._lintMarks.push(mark);
      }
    });
  }

  async function lintCode(code) {
    if (typeof window.isPyodideReady !== 'function' || !window.isPyodideReady()) {
      return null;
    }
    const pyodide = window.getPyodide();
    if (!pyodide) return null;
    if (!code || !code.trim()) return [];

    try {
      pyodide.globals.set('__lint_code__', code);
      // Solo verifica sintaxis con compile(). No importa módulos,
      // por eso no marca "import pandas" como error aunque no esté instalado.
      const resultJson = await pyodide.runPythonAsync(`
import json as __json__
__lint_errors__ = []
try:
    compile(__lint_code__, "<editor>", "exec")
except SyntaxError as e:
    __lint_errors__.append({
        "line": e.lineno or 1,
        "col": (e.offset or 1),
        "message": str(e.msg or e)
    })
except Exception as e:
    __lint_errors__.append({
        "line": 1,
        "col": 1,
        "message": str(e)
    })
__json__.dumps(__lint_errors__)
      `);
      return JSON.parse(resultJson);
    } catch (e) {
      console.warn('[linter] Error inesperado:', e);
      return [];
    }
  }

  function programarLint(editor, editorId) {
    clearTimeout(lintTimers[editorId]);
    lintTimers[editorId] = setTimeout(async () => {
      const code = editor.getValue();
      if (lastLinted[editorId] === code) return;
      lastLinted[editorId] = code;

      const errors = await lintCode(code);
      if (errors === null) return;
      aplicarMarcasLint(editor, errors);
    }, LINT_DEBOUNCE_MS);
  }

  // ============================================================
  // CREACIÓN DE EDITORES
  // ============================================================
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
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-lint-markers'],
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
        } else if (e.inputType === 'insertText' && !data) {
          triggerHint(editor);
        }
      });

      ta.addEventListener('keyup', (e) => {
        if (e.key && e.key.length === 1 && /[a-zA-Z0-9_.]/.test(e.key)) {
          triggerHint(editor);
        }
      });

      ta.addEventListener('compositionend', (e) => {
        const data = e.data || '';
        if (data && /[a-zA-Z0-9_.]/.test(data.slice(-1))) {
          triggerHint(editor);
        }
      });
    }

    editor.on('change', () => programarLint(editor, textarea.id));
    setTimeout(() => programarLint(editor, textarea.id), 1500);

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

  function lintCuandoPyodideListo() {
    if (typeof window.isPyodideReady === 'function' && window.isPyodideReady()) {
      Object.entries(editorsMap).forEach(([id, ed]) => programarLint(ed, id));
      return;
    }
    setTimeout(lintCuandoPyodideListo, 1500);
  }

  window.reLintAll = () => {
    Object.entries(editorsMap).forEach(([id, ed]) => programarLint(ed, id));
  };
  window.pythonHint = pythonHint;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initEditors();
      lintCuandoPyodideListo();
    });
  } else {
    initEditors();
    lintCuandoPyodideListo();
  }
})();

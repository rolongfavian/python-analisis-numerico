/* ============================================
   ejemplos.js — Ejemplos precargados para el editor
   v2 - Incluye los ejercicios del curso corregidos
   ============================================ */

(function () {
  'use strict';

  const EJEMPLOS = [
    // =========================================================
    // ANÁLISIS NUMÉRICO
    // =========================================================
    {
      id: 'metodos-raices',
      nombre: 'Métodos de raíces (Bisección, Newton, Punto Fijo)',
      descripcion: 'Los 3 métodos resuelven x³ + 4x² − 10 = 0',
      codigo: `# ============================================================
# Análisis Numérico — Métodos de búsqueda de raíces
# Ecuación: f(x) = x³ + 4x² − 10 = 0
# ============================================================

# Función principal
def f(x):
    return x**3 + 4*x**2 - 10

# Derivada de f
def df(x):
    return 3*x**2 + 8*x

# Reescribimos f(x) = 0  →  x = g(x)  →  x = sqrt(10 / (x + 4))
def g(x):
    return (10 / (x + 4)) ** 0.5

# Derivada de g (para verificar convergencia del punto fijo)
# g'(x) = -5 / (sqrt(10) * (x + 4)^(3/2))
def dg(x):
    return -5 / ((10 ** 0.5) * (x + 4) ** 1.5)

# ------------------------------------------------------------
# 1) MÉTODO DE BISECCIÓN
# ------------------------------------------------------------
def biseccion(f, a, b, tol=1e-14, max_iter=100):
    if f(a) * f(b) > 0:
        print(f"Sin cambio de signo en [{a}, {b}]")
        return None, None

    for k in range(1, max_iter + 1):
        c = (a + b) / 2
        fc = f(c)
        err = (b - a) / 2

        if err < tol or fc == 0:
            return c, err

        if f(a) * fc < 0:
            b = c
        else:
            a = c

    return (a + b) / 2, (b - a) / 2

print("=" * 50)
print("MÉTODO DE BISECCIÓN")
print("=" * 50)
raiz, error = biseccion(f, 1, 2)
if raiz is not None:
    print(f"Raíz ≈ {raiz:.14f}")
    print(f"Error = {error:.3e}")
    print(f"f(raíz) = {f(raiz):.3e}")

# ------------------------------------------------------------
# 2) MÉTODO DE NEWTON-RAPHSON
# ------------------------------------------------------------
def newton_raphson(f, df, x0, tol=1e-15, max_iter=1000):
    x = x0
    for k in range(1, max_iter + 1):
        if df(x) == 0:
            print("Derivada nula, no se puede continuar")
            return None, None
        x_nuevo = x - f(x) / df(x)
        err = abs(x_nuevo - x)
        if err < tol:
            return x_nuevo, err
        x = x_nuevo
    print("No convergió en el número de iteraciones permitido")
    return x, err

print("\\n" + "=" * 50)
print("MÉTODO DE NEWTON-RAPHSON")
print("=" * 50)
raiz, error = newton_raphson(f, df, x0=1.5)
if raiz is not None:
    print(f"Raíz ≈ {raiz:.15f}")
    print(f"Error = {error:.3e}")
    print(f"f(raíz) = {f(raiz):.3e}")

# ------------------------------------------------------------
# 3) MÉTODO DE PUNTO FIJO
# ------------------------------------------------------------
def punto_fijo(g, dg, x0, tol=1e-15, max_iter=100):
    x = x0
    for k in range(1, max_iter + 1):
        x_nuevo = g(x)
        err = abs(x_nuevo - x)
        if err < tol:
            return x_nuevo, err, abs(dg(x_nuevo))
        x = x_nuevo
    return x, err, abs(dg(x))

print("\\n" + "=" * 50)
print("MÉTODO DE PUNTO FIJO")
print("=" * 50)
raiz, error, conv = punto_fijo(g, dg, x0=1.5)
print(f"Raíz ≈ {raiz:.15f}")
print(f"Error = {error:.3e}")
print(f"|g'(raíz)| = {conv:.4f}  →  {'Converge' if conv < 1 else 'Diverge'}")`
    },
    {
      id: 'determinante',
      nombre: 'Determinante de una matriz (Laplace)',
      descripcion: 'Calcula el determinante de cualquier matriz cuadrada',
      codigo: `# ============================================================
# Determinante de una matriz por expansión de Laplace
# Funciona para cualquier tamaño n×n
# ============================================================

def determinante(m):
    n = len(m)

    # Caso base: matriz 1x1
    if n == 1:
        return m[0][0]

    # Caso base: matriz 2x2
    if n == 2:
        return m[0][0]*m[1][1] - m[0][1]*m[1][0]

    # Expansión por la primera fila
    det = 0
    for j in range(n):
        # Submatriz eliminando fila 0 y columna j
        sub = [[m[i][k] for k in range(n) if k != j] for i in range(1, n)]
        signo = (-1) ** j
        det += signo * m[0][j] * determinante(sub)
    return det


# ------------------------------------------------------------
# Validación con la matriz del ejercicio
# ------------------------------------------------------------
matriz = [[1, -1, 1],
          [2, -1, 1],
          [4,  3, 7]]

# Verificar que sea cuadrada
filas = len(matriz)
for fila in matriz:
    if len(fila) != filas:
        print("Error: la matriz no es cuadrada")
        exit()

print("Matriz:")
for fila in matriz:
    print(" ", fila)

det = determinante(matriz)
print(f"\\nDeterminante = {det}")`
    },
    {
      id: 'gauss-jordan-sistema',
      nombre: 'Gauss-Jordan: resolver sistema de ecuaciones',
      descripcion: 'Sistema 5×5 con matriz aumentada',
      codigo: `# ============================================================
# Gauss-Jordan: resuelve un sistema de ecuaciones lineales
# Sistema 5x5 con matriz aumentada
# ============================================================

matriz_ampliada = [
    [1, 1, 1, 1, 1, 5],
    [2, 3, 1, 5, 1, 12],
    [1, -1, 2, -1, 3, 4],
    [3, 2, 1, 2, 1, 9],
    [4, 1, -2, 3, 0, 5]
]

filas = len(matriz_ampliada)
columnas = len(matriz_ampliada[0])

# Verificar dimensiones: n filas × (n+1) columnas
if columnas != filas + 1:
    print("El sistema no tiene una matriz aumentada válida")
    exit()

# ------------------------------------------------------------
# Eliminación gaussiana con pivoteo parcial
# ------------------------------------------------------------
for i in range(filas):
    # Buscar pivote no nulo
    pivote = matriz_ampliada[i][i]
    if pivote == 0:
        for j in range(i + 1, filas):
            if matriz_ampliada[j][i] != 0:
                matriz_ampliada[i], matriz_ampliada[j] = matriz_ampliada[j], matriz_ampliada[i]
                pivote = matriz_ampliada[i][i]
                break

    # Si no hay pivote, el sistema puede ser compatible indeterminado
    if pivote == 0:
        print("Advertencia: pivote nulo, el sistema puede ser indeterminado")
        continue

    # Normalizar la fila del pivote
    for j in range(columnas):
        matriz_ampliada[i][j] /= pivote

    # Eliminar el resto de la columna i
    for j in range(filas):
        if j != i:
            factor = matriz_ampliada[j][i]
            for k in range(columnas):
                matriz_ampliada[j][k] -= matriz_ampliada[i][k] * factor

# ------------------------------------------------------------
# Extraer soluciones
# ------------------------------------------------------------
print("Matriz reducida:")
for fila in matriz_ampliada:
    print(" ", [round(x, 6) for x in fila])

print("\\nSoluciones:")
for i, fila in enumerate(matriz_ampliada, start=1):
    print(f"  x{i} = {fila[-1]:.6f}")`
    },
    {
      id: 'matriz-inversa',
      nombre: 'Inversa de una matriz (Gauss-Jordan)',
      descripcion: 'Calcula la inversa ampliando con la identidad',
      codigo: `# ============================================================
# Inversa de una matriz usando Gauss-Jordan
# [A | I]  →  [I | A⁻¹]
# ============================================================

matriz = [[1,  2,  3],
          [-1, -3, -2],
          [4,  5,  6]]

n = len(matriz)

# ------------------------------------------------------------
# Verificar que sea cuadrada
# ------------------------------------------------------------
for fila in matriz:
    if len(fila) != n:
        print("Error: la matriz no es cuadrada")
        exit()

# ------------------------------------------------------------
# Construir identidad y matriz aumentada
# ------------------------------------------------------------
identidad = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
aumentada = [matriz[i] + identidad[i] for i in range(n)]

# ------------------------------------------------------------
# Eliminación Gauss-Jordan
# ------------------------------------------------------------
for i in range(n):
    pivote = aumentada[i][i]

    # Pivoteo parcial si es necesario
    if pivote == 0:
        for j in range(i + 1, n):
            if aumentada[j][i] != 0:
                aumentada[i], aumentada[j] = aumentada[j], aumentada[i]
                pivote = aumentada[i][i]
                break

    if pivote == 0:
        print("La matriz no es invertible (pivote nulo)")
        exit()

    # Normalizar fila
    for j in range(2 * n):
        aumentada[i][j] /= pivote

    # Eliminar otras filas
    for j in range(n):
        if j != i:
            factor = aumentada[j][i]
            for k in range(2 * n):
                aumentada[j][k] -= aumentada[i][k] * factor

# ------------------------------------------------------------
# Extraer la parte derecha (la inversa)
# ------------------------------------------------------------
inversa = [fila[n:] for fila in aumentada]

print("Matriz original:")
for fila in matriz:
    print(" ", fila)

print("\\nMatriz inversa:")
for fila in inversa:
    print(" ", [round(x, 6) for x in fila])

# Verificación: A · A⁻¹ ≈ I
print("\\nVerificación (A · A⁻¹):")
for i in range(n):
    fila = [sum(matriz[i][k] * inversa[k][j] for k in range(n)) for j in range(n)]
    print(" ", [round(x, 6) for x in fila])`
    },
    {
      id: 'multiplicacion-matrices',
      nombre: 'Multiplicación de matrices',
      descripcion: 'Producto A · B verificando dimensiones',
      codigo: `# ============================================================
# Multiplicación de matrices: A · B
# ============================================================

matriz_a = [[1,  2,  3],
            [-1, -3, -2],
            [4,  5,  6]]

matriz_b = [[1, -1, 1],
            [2, -1, 1],
            [4,  3, 7]]

# ------------------------------------------------------------
# Verificar dimensiones: columnas de A == filas de B
# ------------------------------------------------------------
filas_a = len(matriz_a)
columnas_a = len(matriz_a[0])
filas_b = len(matriz_b)
columnas_b = len(matriz_b[0])

# Verificar que todas las filas de A tengan el mismo largo
for fila in matriz_a:
    if len(fila) != columnas_a:
        print("Error: la matriz A tiene filas de distinto tamaño")
        exit()

for fila in matriz_b:
    if len(fila) != columnas_b:
        print("Error: la matriz B tiene filas de distinto tamaño")
        exit()

if columnas_a != filas_b:
    print(f"No se pueden multiplicar: A es {filas_a}x{columnas_a}, B es {filas_b}x{columnas_b}")
    exit()

# ------------------------------------------------------------
# Producto
# ------------------------------------------------------------
resultado = [
    [sum(matriz_a[i][k] * matriz_b[k][j] for k in range(columnas_a))
     for j in range(columnas_b)]
    for i in range(filas_a)
]

print("A · B =")
for fila in resultado:
    print(" ", fila)`
    },
    {
      id: 'suma-matrices',
      nombre: 'Suma de matrices',
      descripcion: 'Suma A + B verificando dimensiones',
      codigo: `# ============================================================
# Suma de matrices: A + B
# ============================================================

matriz_a = [[1,  2,  3],
            [-1, -3, -2],
            [4,  5,  6]]

matriz_b = [[1, -1, 1],
            [2, -1, 1],
            [4,  3, 7]]

# ------------------------------------------------------------
# Verificar dimensiones
# ------------------------------------------------------------
filas_a = len(matriz_a)
filas_b = len(matriz_b)

if filas_a != filas_b:
    print("No se pueden sumar: distinto número de filas")
    exit()

for i in range(filas_a):
    if len(matriz_a[i]) != len(matriz_b[i]):
        print(f"No se pueden sumar: la fila {i} tiene distinto tamaño")
        exit()

# ------------------------------------------------------------
# Suma
# ------------------------------------------------------------
resultado = [
    [matriz_a[i][j] + matriz_b[i][j] for j in range(len(matriz_a[i]))]
    for i in range(filas_a)
]

print("A + B =")
for fila in resultado:
    print(" ", fila)`
    },
    {
      id: 'newton-simple',
      nombre: 'Newton-Raphson (versión simple)',
      descripcion: 'Versión mínima del método de Newton',
      codigo: `# ============================================================
# Newton-Raphson (versión mínima)
# Resuelve x³ + 4x² − 10 = 0
# ============================================================

def g(x):
    return x**3 + 4*x**2 - 10

def f(x):
    return 3*x**2 + 8*x

# Punto inicial
p = 1.5

print(f"{'Iter':<6} {'x':<20} {'f(x)':<15}")
print("-" * 45)

for k in range(1, 11):
    p_nuevo = p - g(p) / f(p)
    print(f"{k:<6} {p_nuevo:<20.12f} {g(p_nuevo):<15.3e}")
    p = p_nuevo

print(f"\\nRaíz aproximada: {p:.12f}")
print(f"f(raíz) = {g(p):.3e}")`
    },
    {
      id: 'comparativa-metodos',
      nombre: 'Comparativa: Bisección vs Newton',
      descripcion: 'Convergencia de los dos métodos en gráfica',
      codigo: `# ============================================================
# Comparativa gráfica: Bisección vs Newton
# ============================================================
import matplotlib.pyplot as plt

f  = lambda x: x**3 - x - 1
df = lambda x: 3*x**2 - 1

def biseccion_hist(f, a, b, tol=1e-12, max_iter=100):
    fa, fb = f(a), f(b)
    hist = []
    for _ in range(max_iter):
        c = (a + b) / 2
        err = (b - a) / 2
        hist.append(err)
        if err < tol:
            break
        if fa * f(c) < 0:
            b, fb = c, f(c)
        else:
            a, fa = c, f(c)
    return hist

def newton_hist(f, df, x0, tol=1e-12, max_iter=100):
    x = x0
    hist = []
    for _ in range(max_iter):
        x_nuevo = x - f(x) / df(x)
        err = abs(x_nuevo - x)
        hist.append(err)
        if err < tol:
            break
        x = x_nuevo
    return hist

h_bis = biseccion_hist(f, 1, 2)
h_new = newton_hist(f, df, 1.5)

fig, ax = plt.subplots(figsize=(8, 5))
ax.semilogy(range(1, len(h_bis) + 1), h_bis, 'o-', label='Bisección', color='#4ec9b0')
ax.semilogy(range(1, len(h_new) + 1), h_new, 's-', label='Newton', color='#dcdcaa')
ax.set_xlabel('Iteración')
ax.set_ylabel('Error absoluto')
ax.set_title('Convergencia: Bisección vs Newton')
ax.grid(True, alpha=0.3)
ax.legend()
plt.show()`
    },
    {
      id: 'numpy-basico',
      nombre: 'NumPy: operaciones con arrays',
      descripcion: 'Vectores, matrices y álgebra lineal',
      codigo: `# ============================================================
# NumPy: operaciones vectorizadas
# ============================================================
import numpy as np

a = np.array([1, 2, 3, 4, 5])
b = np.linspace(0, 1, 5)

print("a =", a)
print("b =", b)
print("a + b =", a + b)
print("a * 2 =", a * 2)
print("a ** 2 =", a ** 2)

print("\\nEstadísticas:")
print("  Suma:", np.sum(a))
print("  Media:", np.mean(a))
print("  Desv. estándar:", np.std(a))

m = np.array([[1, 2], [3, 4]])
print("\\nMatriz:")
print(m)
print("Determinante:", np.linalg.det(m))
print("Inversa:")
print(np.linalg.inv(m))`
    },
    {
      id: 'error-punto-flotante',
      nombre: 'Error de punto flotante',
      descripcion: 'Por qué 0.1 + 0.2 ≠ 0.3',
      codigo: `# ============================================================
# Error de punto flotante
# ============================================================
import math
import sys

a = 0.1 + 0.2
b = 0.3

print("0.1 + 0.2 =", a)
print("¿Es igual a 0.3?", a == b)
print("¿Es cercano?", math.isclose(a, b))

print("\\nÉpsilon de la máquina:", sys.float_info.epsilon)

# Cancelación catastrófica
x = 1e20
print("\\n(x + 1) - x con x = 1e20:", (x + 1) - x)
print("Debería ser 1, da 0 por pérdida de precisión")`
    }
  ];

  // ============================================================
  // UI
  // ============================================================
  function abrirMenuEjemplos() {
    const menu = document.getElementById('ejemplos-menu');
    if (!menu) return;
    menu.innerHTML = '';

    const titulo = document.createElement('div');
    titulo.className = 'ejemplos-titulo';
    titulo.textContent = 'Ejemplos precargados';
    menu.appendChild(titulo);

    EJEMPLOS.forEach(ej => {
      const btn = document.createElement('button');
      btn.className = 'ejemplo-item';
      btn.innerHTML = `
        <strong>${escapeHtml(ej.nombre)}</strong>
        <span>${escapeHtml(ej.descripcion)}</span>
      `;
      btn.addEventListener('click', () => {
        cargarEjemplo(ej);
        cerrarMenuEjemplos();
      });
      menu.appendChild(btn);
    });

    menu.classList.add('open');

    setTimeout(() => {
      document.addEventListener('click', cerrarMenuFuera, { once: true });
    }, 10);
  }

  function cerrarMenuFuera(e) {
    const menu = document.getElementById('ejemplos-menu');
    const btn = document.getElementById('btn-ejemplos');
    if (!menu) return;
    if (menu.contains(e.target)) return;
    if (btn && btn.contains(e.target)) return;
    cerrarMenuEjemplos();
  }

  function cerrarMenuEjemplos() {
    const menu = document.getElementById('ejemplos-menu');
    if (menu) menu.classList.remove('open');
  }

  async function cargarEjemplo(ej) {
    if (typeof editorsMap === 'undefined' || !editorsMap['env-editor']) {
      showToast('Editor no encontrado', true);
      return;
    }

    const editor = editorsMap['env-editor'];
    const codigoActual = editor.getValue().trim();

    if (codigoActual.length > 0) {
      const ok = confirm(
        `¿Reemplazar el código actual con el ejemplo "${ej.nombre}"?`
      );
      if (!ok) return;
    }

    editor.setValue(ej.codigo);
    editor.clearHistory();
    editor.refresh();

    const fnInput = document.getElementById('env-filename');
    if (fnInput) {
      fnInput.value = ej.id + '.py';
    }

    showToast('Ejemplo cargado: ' + ej.nombre);
  }

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarMenuEjemplos();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.abrirMenuEjemplos = abrirMenuEjemplos;
  window.cerrarMenuEjemplos = cerrarMenuEjemplos;
  window.EJEMPLOS_PRECARGADOS = EJEMPLOS;
})();

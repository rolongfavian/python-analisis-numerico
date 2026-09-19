import marimo

__generated_with = "0.9.0"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    return mo, np, plt


@app.cell
def _(mo):
    mo.md("""
    # Método de Bisección

    Resuelve $f(x) = 0$ en un intervalo $[a, b]$ donde $f(a) \\cdot f(b) < 0$.

    **Teorema de Bolzano:** si $f$ es continua en $[a,b]$ y $f(a) \\cdot f(b) < 0$,
    entonces existe al menos una raíz $c \\in (a,b)$ con $f(c) = 0$.
    """)
    return


@app.cell
def _(mo):
    a = mo.ui.number(value=1.0, label="a (extremo izquierdo)")
    b = mo.ui.number(value=2.0, label="b (extremo derecho)")
    tol = mo.ui.number(value=1e-6, label="Tolerancia")
    mo.hstack([a, b, tol])
    return a, b, tol


@app.cell
def _(a, b, tol, mo):
    def f(x):
        return x**3 - x - 2

    def biseccion(f, a, b, tol, max_iter=100):
        fa, fb = f(a), f(b)
        if fa * fb >= 0:
            raise ValueError("Bolzano no se cumple")

        historial = []
        for k in range(1, max_iter + 1):
            c = (a + b) / 2
            fc = f(c)
            err = (b - a) / 2
            historial.append((k, c, fc, err))
            if err < tol or abs(fc) < 1e-14:
                return c, k, historial
            if fa * fc < 0:
                b, fb = c, fc
            else:
                a, fa = c, fc
        return None, max_iter, historial

    try:
        raiz, iters, hist = biseccion(f, a.value, b.value, tol.value)
        mo.md(f"""
        **Resultado:**
        - Raíz aproximada: `{raiz:.10f}`
        - Iteraciones: `{iters}`
        - f(raíz): `{f(raiz):.3e}`
        """)
    except ValueError as e:
        mo.md(f"**Error:** {e}")
    return biseccion, f, hist


@app.cell
def _(hist, plt):
    if hist:
        iters = [h[0] for h in hist]
        errores = [h[3] for h in hist]
        plt.figure(figsize=(8, 4))
        plt.semilogy(iters, errores, 'o-')
        plt.xlabel("Iteración")
        plt.ylabel("Error absoluto")
        plt.title("Convergencia de la Bisección")
        plt.grid(True)
        plt.tight_layout()
        plt.gca()
    return


if __name__ == "__main__":
    app.run()

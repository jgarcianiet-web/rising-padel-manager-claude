# Pádel Manager

**El juego definitivo de gestión de pádel.** Un juego de [Rising Games](#).

Dirige tu carrera como jugador profesional o gestiona tu propio club: entrena, ficha personal,
negocia patrocinios, arma parejas que encajen (drive + revés) y conquista el circuito mundial.

---

## Qué hay en este repositorio

| Carpeta / archivo | Qué es |
|---|---|
| `src/index.html` | **El juego entero.** Un único archivo con todo dentro (código, estilos, logos). Se puede abrir directamente en cualquier navegador. |
| `src-tauri/` | El envoltorio que convierte el juego en una aplicación de escritorio (Windows / macOS). |
| `src-tauri/icons/` | Iconos de la aplicación en todos los tamaños. |
| `tests/` | Batería de pruebas automáticas. |
| `.github/workflows/` | Compilación automática en la nube. |

El juego es deliberadamente **un solo archivo**: así funciona con doble clic, sin instalar nada,
sin conexión y en el móvil. Todo lo demás de este repositorio existe para empaquetarlo,
probarlo y distribuirlo.

---

## Jugar ahora mismo

Abrir `src/index.html` con doble clic. Ya está.

## Probar que nada se ha roto

```bash
node tests/smoke.js
```

No requiere instalar nada (solo Node.js). Ejecuta una temporada entera, funda un club,
guarda y recupera partidas, y comprueba las reglas del simulador.

Cada prueba corresponde a un fallo real que apareció jugando: el error al entrar en modo club,
la partida nueva que no se podía empezar, el presupuesto del club que no daba para fichar...
Si alguno vuelve, la prueba lo caza **antes** de compilar.

> Las pruebas simulan un navegador cuyos elementos **no tienen `.remove()`**, a propósito:
> así reproducen el comportamiento del WebView de móvil, donde se escondían varios errores.

## Generar la aplicación de escritorio

Requisitos: [Node.js](https://nodejs.org) (LTS) y [Rust](https://www.rust-lang.org/tools/install).

```bash
npm install     # solo la primera vez
npm run dev     # probar en una ventana de aplicación
npm run build   # generar el instalador
```

El instalador aparece en `src-tauri/target/release/bundle/`:
`nsis/*.exe` y `msi/*.msi` en Windows, `dmg/*.dmg` en macOS.

Guía detallada, paso a paso: [`LÉEME-EMPAQUETAR.md`](LÉEME-EMPAQUETAR.md).

## Compilar sin tener las dos máquinas

La pestaña **Actions** de GitHub compila Windows y macOS en la nube.
Ver [`SUBIR-A-GITHUB.md`](SUBIR-A-GITHUB.md).

---

## Cómo trabajar en el juego

Todo el código vive dentro de `src/index.html`, entre las etiquetas `<script>`.
Después de cualquier cambio:

```bash
node tests/smoke.js
```

Si sale `16/16 pruebas superadas`, el cambio es seguro.

---

© Rising Games

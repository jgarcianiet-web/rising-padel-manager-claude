# Pádel Manager — Empaquetar como app de Windows (y Mac)

Este proyecto ya está montado con **Tauri**. Solo tienes que instalar dos herramientas y ejecutar un comando. El resultado es un instalador `.exe`/`.msi` de Windows (o `.dmg` en Mac) con el icono del juego, que puedes instalar o enviar a quien quieras.

El juego ya está dentro (`src/index.html`), el icono ya está generado, y la configuración ya está hecha. **No tienes que tocar nada de código.**

---

## Lo que necesitas instalar (una sola vez)

### En Windows
1. **Node.js** — https://nodejs.org → descarga la versión **LTS**, instálala con "Siguiente, siguiente".
2. **Rust** — https://www.rust-lang.org/tools/install → descarga `rustup-init.exe`, ejecútalo y acepta las opciones por defecto.
   - Si te avisa de que faltan las "Microsoft C++ Build Tools", te dará el enlace. Instálalas (elige la carga de trabajo *"Desarrollo para el escritorio con C++"*). Es el paso más pesado (unos minutos y ~2 GB), pero solo se hace una vez.
3. **Reinicia** el terminal (o el PC) para que reconozca los comandos nuevos.

### En Mac
1. **Node.js** (igual, versión LTS de nodejs.org).
2. **Rust**: abre Terminal y pega `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. **Command Line Tools**: `xcode-select --install`

---

## Generar la app (3 pasos)

Abre un terminal **dentro de esta carpeta** (`rising-padel-tauri`) y ejecuta:

```bash
# 1. Instalar las herramientas de Tauri (solo la primera vez)
npm install

# 2. Probar que todo arranca (abre el juego en una ventana de app)
npm run dev

# 3. Comprobar que nada se ha roto
node tests/smoke.js

# 4. Generar el instalador final
npm run build
```

El paso 3 tarda un rato la primera vez (compila Rust). Cuando termine, te dirá la ruta exacta. Estará en:

```
src-tauri/target/release/bundle/
```

- **Windows** → carpeta `nsis/` con el `Rising Pádel Manager_3.1.0_x64-setup.exe` (instalador) y `msi/` con el `.msi`.
- **Mac** → carpeta `dmg/` con el `.dmg` y `macos/` con el `.app`.

Ese `.exe`/`.dmg` es lo que instalas o compartes. Ya lleva el icono y el juego dentro; funciona sin internet.

---

## "Solo tengo Windows / solo tengo Mac, ¿cómo hago el otro?"

Tauri genera el instalador **del sistema donde lo ejecutas**. Para tener los dos (Windows *y* Mac) sin dos ordenadores, usa **GitHub Actions** (compilación en la nube, gratis):

1. Sube esta carpeta a un repositorio de GitHub.
2. Ya incluye el archivo `.github/workflows/build.yml` (está listo).
3. En GitHub, entra en la pestaña **Actions** y lanza el workflow "Build".
4. Al terminar, en la sección **Artifacts** te podrás descargar el `.exe` de Windows y el `.dmg` de Mac, compilados en la nube.

Si te lías con GitHub, **Claude Code** te lo configura y sube en un rato.

---

## De cara a Steam (para el futuro, sin prisa)

Cuando llegue el momento:
- Cuenta de Steamworks: 100 USD (una vez), formulario fiscal W-8BEN.
- El `.exe` que generas aquí es la base; Steam pide envolverlo con su SDK (Claude Code te ayuda con eso).
- No hace falta nada de esto para jugar ni para compartir el juego con amigos ahora mismo.

---

## Si algo falla

- **"command not found: npm"** → no reiniciaste el terminal tras instalar Node, o Node no se instaló bien.
- **Error de Rust / "linker"** → faltan las C++ Build Tools (Windows) o las Command Line Tools (Mac). Ver arriba.
- **La ventana sale en blanco** → asegúrate de que `src/index.html` existe (es el juego). Si lo actualizas a una versión nueva del juego, solo tienes que reemplazar ese archivo y volver a `npm run build`.

Cualquier atasco, pásame el mensaje de error y lo resolvemos.

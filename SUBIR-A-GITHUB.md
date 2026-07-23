# Subir Pádel Manager a GitHub y compilarlo en la nube

Con esto consigues tres cosas:

1. **Copia de seguridad con historial.** Nunca más pierdes el juego, y puedes volver a
   cualquier versión anterior si algo se rompe.
2. **Instaladores de Windows y macOS generados solos**, sin necesidad de tener las dos máquinas.
3. **Un sitio donde Claude Code puede trabajar** sobre el proyecto directamente.

---

## Paso 1 · Crear la cuenta y el repositorio

1. Cuenta gratuita en <https://github.com> (si no la tienes).
2. Botón **+** arriba a la derecha → **New repository**.
3. Nombre: `padel-manager`.
4. Visibilidad: **Private** (recomendado — el juego es tuyo; siempre puedes hacerlo público después).
5. **No** marques ninguna casilla de "Add a README" (ya viene uno).
6. **Create repository**.

---

## Paso 2 · Subir la carpeta

### Opción A · GitHub Desktop (la más sencilla, sin terminal)

1. Instala **GitHub Desktop**: <https://desktop.github.com>
2. Ábrelo e inicia sesión con tu cuenta.
3. Menú **File → Add local repository** y elige esta carpeta (`rising-padel-tauri`).
4. Te dirá que no es un repositorio todavía → pulsa **create a repository**.
5. Abajo a la izquierda, escribe un mensaje (por ejemplo `Primera versión, v3.1.0`) y pulsa
   **Commit to main**.
6. Arriba, pulsa **Publish repository**. Elige la cuenta y marca **Keep this code private**.

Ya está subido.

### Opción B · Claude Code (que lo haga él)

Si tienes Claude Code instalado, ábrelo dentro de esta carpeta y pídele:

> Sube esta carpeta a un repositorio privado de GitHub llamado padel-manager, con un commit
> inicial, y confirma que la pestaña Actions funciona.

### Opción C · Terminal

```bash
cd ruta/a/rising-padel-tauri
git init -b main
git add .
git commit -m "Primera versión, v3.1.0"
git remote add origin https://github.com/TU-USUARIO/padel-manager.git
git push -u origin main
```

---

## Paso 3 · Conseguir el `.exe` y el `.dmg`

Al subir el proyecto, GitHub ejecuta solo las pruebas. Para generar los instaladores:

1. Entra en tu repositorio → pestaña **Actions**.
2. En la lista de la izquierda, elige **Pruebas y compilación**.
3. Botón **Run workflow** (a la derecha) → **Run workflow**.
4. Espera. La primera vez tarda bastante (compila Rust desde cero); las siguientes son mucho
   más rápidas porque se guarda en caché.
5. Cuando termine, entra en la ejecución y baja hasta **Artifacts**. Ahí tienes
   `padel-manager-Windows` y `padel-manager-macOS` para descargar.

> Primero se ejecutan las pruebas. **Si alguna falla, no se compila nada** — es una red de
> seguridad para que nunca publiques una versión rota.

---

## Paso 4 (opcional) · Publicar una versión descargable

Cuando quieras una versión "oficial" con enlace de descarga para compartir:

1. En tu repositorio, pestaña **Releases** → **Create a new release**.
2. En **Choose a tag** escribe `v3.1.0` y pulsa **Create new tag**.
3. **Publish release**.

GitHub compilará y adjuntará solo los instaladores a esa versión (queda como borrador para que
lo revises antes de hacerlo público).

---

## Cómo actualizar el juego a partir de ahora

Cuando tengas una versión nueva de `index.html`:

1. Sustituye `src/index.html` por la nueva.
2. Ejecuta `node tests/smoke.js` para comprobar que todo sigue bien.
3. En GitHub Desktop: escribe el mensaje del cambio → **Commit to main** → **Push origin**.

Y si quieres nuevos instaladores, repite el Paso 3.

---

## Sobre el coste

Todo esto es **gratis**: los repositorios privados no cuestan nada, e incluyen 2.000 minutos
mensuales de compilación en la nube. Un juego como este consume una fracción mínima de eso.

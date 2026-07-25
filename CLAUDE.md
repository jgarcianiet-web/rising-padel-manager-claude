# Rising Pádel Manager — notas para trabajar en este repo

## Regla de oro: todo texto visible se traduce a los 5 idiomas

El juego está en **español, inglés, francés, alemán e italiano**. Cualquier cosa
nueva que se vea en pantalla nace ya traducida en los cinco. No se deja "para
luego": una cadena en español dentro de una partida en alemán es un fallo.

Cómo se hace:

1. **Añadir la clave en `src/js/i18n.js`**, en los cinco bloques de idioma
   (`es`, `en`, `fr`, `de`, `it`). Los campos interpolados `{campo}` deben ser
   los mismos en todos.
2. **Pintar con `t("clave", {campo})`**, nunca con el literal.
3. Para textos con HTML dentro, usar `data-i18n-html` en el marcado estático.

### Cuidado con los catálogos de datos

Lo que más se escapa no son los botones, son los **catálogos**: listas de datos
que luego se pintan. Cuando un catálogo contiene texto visible, se guarda la
**clave**, no la frase, y se resuelve con `t()` al pintar:

```js
const FRASES_STAFF={ entrenador:["fr_ent_1","fr_ent_2", ...] };   // claves
// y al pintar:  «${t(st.frase)}»
```

Se hace así en: frases del staff, nombres de lesiones (`lesNombre`), tipos de
spot, hitos, primas, reformas, sectores de marcas, dilemas y peinados. El patrón
tiene una ventaja añadida: **las partidas guardadas antiguas llevan el literal**
y `t()` devuelve tal cual lo que no reconoce, así que siguen funcionando.

### Ojo al shadowing de `t`

`t` es la función de traducción **global**. Declarar una variable local con ese
nombre la tapa y rompe el idioma en silencio. Ya ha pasado tres veces (táctica,
tier de patrocinador, tabla de récords). Si necesitas una variable ahí, llámala
`ta`, `tr`, `tt`… cualquier cosa menos `t`.

### Cómo comprobarlo

- `node tests/smoke.js` incluye un test de integridad del catálogo: verifica que
  **toda** clave existe en los cinco idiomas, que no hay claves huérfanas y que
  las interpolaciones coinciden entre idiomas.
- Para cazar literales que nunca pasaron por `t()`, la vía que funciona es
  **jugar el juego en otro idioma** y comparar el texto visible entre lenguas: lo
  que aparece idéntico en tres o más idiomas casi siempre está sin traducir. Así
  se encontraron el panel de Semana, la pantalla de fundar club y la analítica,
  que los tests de claves no veían.

## El azar de simulación va con semilla

Todo el azar que **decide algo** sale de `rnd()` (`src/js/rng.js`), no de
`Math.random`. La semilla y la posición del flujo viajan dentro de la partida
(`G.semilla`, `G._rngS`), así que dos partidas con la misma semilla viven lo
mismo y recargar no cambia el resultado de un punto ya jugado.

Tres cosas que hay que respetar al tocar el código:

1. **`Math.random` solo para lo que se ve o se oye.** El ruido de la grada, las
   frases del narrador y la barra de la pantalla de carga siguen usándolo, y
   llevan `// azar-visual` al final de la línea para declararlo. Si el sonido
   bebiera del flujo de simulación, jugar con el sonido apagado daría resultados
   distintos que con el sonido puesto.
2. **Ojo con el shadowing de `rnd`**, el mismo cuento que con `t`. Varias
   funciones recibían un parámetro llamado `rnd` para inyectar azar en las
   pruebas; ese parámetro tapaba la función global y su respaldo se quedaba sin
   semilla. Ahora ese parámetro se llama **`azar`**, y el respaldo es `rnd`.
3. **El orden importa al crear una partida.** `iniciaSemilla()` va como campo de
   `G` *antes* de `world:mkWorld()`, porque generar el mundo ya consume azar y
   las propiedades de un objeto se evalúan de izquierda a derecha.

`tests/estatico.js` lo hace cumplir: falla si aparece un `Math.random` sin
marcar en un fichero de simulación, o si alguien vuelve a tapar `rnd`.

## Pruebas

- `node tests/smoke.js` — toda la suite (motor, mundo, SQLite con sql.js real,
  i18n y comprobaciones estáticas). Debe quedar en verde antes de cualquier commit.
- Verificación en navegador con Playwright (`playwright-core`, Chromium en
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`): el juego se abre desde
  `file://src/index.html`. Conviene saltar el splash antes de capturar.

## Estructura

Juego de un solo HTML sin dependencias externas ni paso de compilación:
`src/index.html` carga `src/js/**` en orden. Persistencia: blob JSON en
localStorage como copia de seguridad y SQLite (sql.js) como fuente primaria —
ver `docs/PLAN-FASE-4.md`.

### El juego no pide nada a la red, y hay una CSP que lo obliga

`index.html` lleva una `Content-Security-Policy` con `default-src 'none'` y
`connect-src 'none'`; `tauri.conf.json` lleva la equivalente para el
empaquetado. Consecuencias prácticas al tocar el código:

- **Todo se dibuja por código.** Los avatares, las fotos del periódico y los
  escudos son SVG generado. No hay ni puede haber imágenes remotas.
- **Las tipografías viven incrustadas** en `src/css/fuentes.css` como `data:`
  URI. Ese fichero está **generado**: no se edita a mano, se regenera con
  `node tools/fuentes.js src/css/fuentes.css`. Si añades un peso nuevo en el
  CSS, añádelo también a la lista `FAMILIAS` del generador o no existirá.
- **`script-src` es solo `'self'`**: nada de `eval`, `new Function` ni
  manejadores `onclick=""` en el HTML (se enganchan desde JS, como ya se hace).
- `style-src` sí permite `'unsafe-inline'`, porque el juego pinta con
  `style=""` y con `el.style` desde código.

`tests/estatico.js` hace cumplir las tres cosas: falla si aparece una URL
remota en el HTML o el CSS, si la CSP se afloja, o si se incrusta una
tipografía cuyo aviso de licencia no está en `LICENSE`.

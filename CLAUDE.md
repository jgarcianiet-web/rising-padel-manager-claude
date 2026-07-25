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

## El torneo tiene cuadro

`tournament.js` construye un cuadro final de 16 con siembra por puntos de
ranking (`mkCuadro`). Cada vez que avanzas de ronda se resuelven **todos** los
cruces (`resolverRondaCuadro`), así que tu siguiente rival es quien ganó de
verdad su partido, no una tirada nueva.

- Los cruces entre parejas del ordenador se deciden con `probGana(nA,nB)`, una
  logística sobre la diferencia de nivel: 12 puntos ≈ 90%. **No** se simulan
  punto a punto —son 15 partidos por torneo— y por eso abrir el cuadro no se
  nota.
- Tu entrada en el cuadro **no es una pareja del mundo**: es un objeto
  `{yo:true, nivel, pts}` sin `jug`. Usa `nivCuadro(p)` y `nomCuadro(p)`, nunca
  `nivelPareja(p)` ni `p.nombre` directamente, o reventará en tu propia casilla.
- La previa (fases 0 y 1) sigue siendo cruces sueltos: es lo que es una previa.

## Accesibilidad: los tamaños de letra escalan

Todos los `font-size` del CSS son `calc(Npx * var(--esc))`, y el menú tiene un
selector de tres posiciones que mueve `--esc`. Si escribes un tamaño en px
pelado, `tests/estatico.js` falla: el público del pádel pasa de los 40 y ese
ajuste es la diferencia entre jugar cómodo o no jugar.

Al tocar la maquetación, **prueba en «Enorme» y en 420 px de ancho**. Ahí es
donde aparecen los desbordamientos (ya pasó con la barra superior).

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

## El cuaderno de dilemas tiene memoria

`DILEMAS` (en `engine/world.js`) son 45 escenas con dos opciones y consecuencia
diferida. Lo que hay que respetar al añadir una:

1. **La partida recuerda.** `c.dilVistos` guarda cuándo se vivió cada una y
   `c.decis` qué se eligió. Una escena no se repite antes de `DIL_DESCANSO`
   semanas, y `unico:true` la deja en una sola vez para siempre.
2. **Las cadenas se escriben de dos formas.** Por condición,
   `cond:c=>dilHizo(c,"universidad",1)`, para lo que solo tiene sentido si
   decidiste aquello; o por apertura, `dif:{abre:"cobro_inversor"}`, cuando la
   consecuencia *es* la escena siguiente. Lo que se abre por cadena y no debe
   salir en el sorteo lleva `cadena:true`.
3. **Los nombres que se interpolan pueden no existir.** Una guardada vieja sin
   némesis, una pareja rota entre que el dilema se abre y se pinta: usa
   `nomRival(c)` y `nomCompi(c)`, nunca `c.nemesis.nombre` a pelo, o el modal
   revienta y se lleva la semana por delante.

`peso` sube o baja la probabilidad de que salga (los de la trama pesan más).

### El narrador es decoración, y por eso va con azar visual

`F_WIN`, `F_ERR` y `F_PERSO` están **repartidos por el final que se pinta**: si
la bola muere en el cristal, la frase habla del cristal. Se eligen con
`pickVis`, no con `pick`, porque el comentario ya se emite detrás de una moneda
visual: si la frase bebiera del flujo con semilla, esa moneda movería la
simulación y dos partidas con la misma semilla dejarían de coincidir. Pasó al
ampliar el repertorio, y la prueba de la semilla lo cazó.

## El modo club tiene cara: filosofía, junta y derbi

Tres cosas que se fijan al fundar (`club.js`) y que hay que respetar:

1. **`FILOS_CLUB` condiciona el mercado.** `afinidadFilo(cl,j)` va de −2 a +2 y
   entra en `costeFichajeCl` y `salarioDeCl`; a −2, `fichable()` dice que no y
   el botón se apaga con su motivo. Si añades una filosofía, tiene que cambiar
   *a quién puedes fichar*, no solo el texto.
2. **`JUNTAS` no se elige: `mkJunta()` la sortea.** `margen` son las temporadas
   de cuerda, `dureza` cuánto aprieta el objetivo al cerrar el año y `prima` lo
   que paga por cumplirlo. La tacaña además mira la masa salarial.
3. **El derbi** (`mkDerbi`, `esDerbi`, `anotaDerbi`) se resuelve al cerrar un
   partido en `tournament.js`. Los guardados antiguos reciben las tres cosas en
   `entrarPartida()`; ojo con no pisar el objetivo de junta que ya traían.

### La cantera se sigue durante años

Una promesa no es una ficha en una lista: cierra temporada como un jugador.
`evolucionaCantera(cl)` corre en el cierre de temporada del club y hace crecer
a cada chaval hacia su `pot` con `saltoCantera` —más deprisa cuanto más lejos
esté del techo, y más con escuela, entrenador y filosofía de cantera—, guarda
la línea en `j.hist` (temporada, antes, después, en qué golpe mejoró) y le gasta
`ilusion` por cada año sin debutar.

Dos reglas al tocarlo:

1. **Nadie se va sin aviso.** La curva de ilusión está calculada para que la
   ficha enseñe «se va a final de temporada» al menos una temporada antes de
   que se marche. Perder a un canterano tiene que ser culpa del jugador, no una
   sorpresa. `CAN_FUGA` es solo un tope de seguridad.
2. **El techo no se enseña, se estima** (`techoTxt`). Con ojeador es un número;
   sin él, una horquilla. Es la única información del juego por la que merece la
   pena pagar un sueldo.

## Rumores: el mercado se cuenta antes de pasar

`mkRumor` / `resolverRumores` (en `engine/world.js`) publican lo que aún no ha
ocurrido, y **la mitad no ocurre**. Dos reglas:

- **El desenlace se decide al nacer**, no al resolver, para que el azar con
  semilla lo fije de una vez y recargar no cambie el final.
- **Un rumor confirmado mueve el mundo de verdad**: `_rompeParejaMundo` cambia
  jugadores de pareja y renombra las dos, un fichaje cambia `p.club`, y los que
  van de ti o de los tuyos cuestan moral. Si añades un tipo, añade su efecto: un
  rumor que no cambia nada al confirmarse es ruido.
- **Y abre la conversación que toca.** `RUM_DILEMA` mapea tipo → dilema; los tres
  que abre (`rum_oferta`, `rum_traicion`, `rum_suelto`) van marcados `cadena` y
  jamás salen en el sorteo. Solo en carrera: el modal de dilemas es suyo.

El periódico (`renderNoticias`) tiene sección de mercado (`rumoresHTML`) y
columna de opinión (`columnaHTML`), que **no es azar**: elige el texto según tu
momento (arriba, subiendo, bajando, empezando, club).

## La guía de las primeras semanas

`guia.js` sustituye al tutorial de fichas por una tira que pide **una cosa cada
vez**, señala dónde está con un aro (`.guiaFoco`) y se pasa sola. Los pasos se
comprueban sobre el **estado de la partida**, no sobre el DOM.

Tres cosas que hay que respetar al añadir o mover un paso:

1. **`hito:true` solo para hechos consumados** —entrenaste, jugaste, pasó la
   semana—. Un paso marcado como hito puede desatascar la guía saltando hacia
   adelante; uno que mira el estado de la interfaz, no. `tabActiva` ya vale
   `"semana"` nada más empezar: si eso pudiera provocar un salto, la guía se
   comería media carrera en el primer repintado (pasó).
2. **`salta` para lo que no aplica a esa partida.** Un club puede fundarse con
   dos jugadores, y entonces no hay con quién formar la pareja B. Pedir lo
   imposible deja la guía atascada.
3. **El enganche es un oyente de clic propio**, aparte del despachador de
   `data-ac`, porque las pestañas se enganchan con `.onclick` y no pasan por
   él. Si se toca `ui.js`, ese segundo oyente tiene que seguir ahí.

El paso por el que va se guarda en `localStorage` (`rpm_guia_<modo>`: número, o
`-1` si se cerró), y `entrarPartida()` la retoma. Quien recarga a mitad no la
pierde y quien la cerró no la vuelve a ver.

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

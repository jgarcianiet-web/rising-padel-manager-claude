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

## El motor: cinco estilos y ninguna respuesta correcta

Esto es lo que sostiene todo lo demás. Si el partido tiene una jugada que gana
siempre, da igual lo bien montados que estén el mercado, la Copa o la pareja:
son adornos alrededor de una moneda trucada. Y lo estuvo mucho tiempo.

**Lo que pasaba.** A igualdad de nivel, el estilo `constructor` ganaba entre el
93% y el 98% a los otros cuatro, y el `bandejero` el 33% a todos. Elegir estilo
al crearte, fichar por estilo en el club, las identidades y sus antídotos: todo
mentía. El partido lo decidía una sola cosa, quién tenía más `dejada`.

Dos causas, y la segunda es la gorda:

1. **La dejada era el mejor golpe del juego** (`win .32`, más que un remate
   `.27`, arriesgando poco más que una víbora) y encima dejaba al rival
   descolocado (`_scr`, ×1,7 en el golpe siguiente). El 78% de los puntos que
   cerraba un constructor morían en dejada. Ahora es `.20/.15`: un golpe de
   riesgo que **roba la iniciativa**, no que cierra el punto.
2. **El globo SIEMPRE echaba de la red al rival**, sin medirse con nada. Con
   eso, «bola alta estando en la red» —la única situación que abre las
   candidatas `["bandeja","vibora","remate",…]`— no podía ocurrir jamás, y ese
   trozo de `chooseShot` era **código muerto**. Medido: en 60 partidos un
   bandejero no pegaba UNA bandeja y un rematador ni un remate; jugaban el
   partido entero con sus peores atributos. Ahora el globo se mide contra la
   defensa aérea rival (`pPasa`): si es bueno los pasa, y si se queda corto les
   deja la bola arriba. Eso devuelve el bucle que **es** el pádel —globo,
   bandeja, globo, bandeja— y le pone al globo el riesgo que le faltaba.

Hoy los cinco estilos están entre el 47% y el 57% de media, y hay contras de
verdad: el bandejero se come al constructor, el constructor al defensivo, el
defensivo al agresivo y el rematador al defensivo. `tests/casos.js` no deja que
ninguno se salga de la banda 28-72 (banda ancha a propósito: con 24 partidos por
celda el ruido es de ±10, así que **no afina el equilibrio, caza el desastre**).

### Cómo se mide esto

La matriz de estilos, siempre: cinco por cinco, mismo nivel, N partidos por
celda **reiniciando la semilla en cada uno con `rndSemilla(sem,sem)`**. Y cuando
una celda sale rara, el desglose por golpe: `stats[eq].wShot` y `stats[eq].eShot`
sobreviven a `quickMatch`, así que se puede contar de dónde salen los puntos de
cada lado. Fue ese desglose el que enseñó la dejada y el que enseñó que la
bandeja no aparecía ni una vez.

**Cuidado con dar por buena una medición vieja.** Dos reglas de este repo se
habían calibrado con el motor roto y estaban del revés: `copFuerzaPar` daba
doble peso al jugador flojo («el rival juega al flojo») cuando en realidad
apilar SUMA —a media 55, una pareja 70/40 gana el 79% a una 55/55—, y el estilo
`bandejero` era plano porque parecía equilibrado. Si tocas el motor, **vuelve a
sacar todas las tablas**, no solo la del cambio.

### La confianza se enfría hacia el centro

`j.conf` bajaba 4 por derrota y no la subía nada: una mala racha dejaba a la
segunda pareja del club clavada en 15 para siempre (medido: conf 23 en la
temporada 2 y ahí seguía en la 5). Y era una asimetría, porque las parejas del
mundo se rehacen de cero en cada eliminatoria y llegan siempre a 55 —tus
jugadores cargaban con las cicatrices y los rivales no—. Ahora relaja hacia 55
cada semana en el cierre del club. Doler unas semanas, sí; marcar la carrera, no.

## Lo que se juega y lo que se resuelve

Tres competiciones y una sola regla, la misma en las tres: **tus partidos se
juegan con el motor; los que no juegas tú se resuelven con una logística**. Un
torneo son 15 cruces y una jornada de Superliga 24: simularlos punto a punto
pondría la pantalla a tirones sin que nadie los vea.

- **Torneo**: `quickMatch` para los tuyos, `probGana` para el resto del cuadro.
- **Copa de Clubes**: `copJuega` monta tus dos puntos con `teamDePareja`; los
  demás cruces salen de `copFuerza`.
- **Superliga**: `resuelveCruceEquipos` juega tus tres puntos con
  `slTeamDePareja` y resuelve los ajenos con `probPunto`.

Dos cosas que hay que respetar:

1. **Las dos vías tienen que decir lo mismo.** Las constantes de `probGana` y
   `probPunto` salen de medir el motor, no de elegir un número redondo: estaban
   en 12 y en 16 —un 91% y un 82% a doce puntos de diferencia— cuando el motor
   mide un 95%, así que el cuadro y la liga vivían en una realidad más plana que
   la pista. Las dos están hoy en 9. Si tocas el motor, vuelve a medirlas.
2. **Lo que pases al motor es lo único que el motor ve.** `teamDePareja` (club)
   y `slTeamDePareja` (Superliga) tienen que copiar el lado de pista y los
   rasgos: el lado vale hasta un 6% por golpe y la combinación drive+revés un
   5%. Ya pasó una vez —parejas de nivel equivalente perdían 0-2 una y otra vez
   porque el club no copiaba ninguna de las dos cosas—.

### El atajo a granel

`slAGranel(true, fn)` resuelve TODO con la logística, también lo tuyo. Existe
para las pruebas de balance, que miden la economía y el objetivo de la junta a
lo largo de decenas de temporadas: jugar cada punto son trece mil partidos y el
vm de pruebas se planta en media hora. **No es una optimización, es una
declaración**: si alguna vez el resultado a granel y el jugado dejan de
parecerse, el que miente es el atajo.

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

## Eventos de circuito: semanas que cambian las reglas

`engine/eventos.js`. Los dilemas enriquecen la ficción; esto enriquece el bucle:
una carrera de quince temporadas necesita que la temporada 7 no se juegue como
la 3. Hay seis alcances —semana, torneo, racha, temporada, era y propio— y una
regla que `tests/casos.js` hace cumplir:

> **Un evento que no cambia una decisión es una noticia, no un evento.**

Cada uno declara `mods` (modificadores) o `flags`, y ambos están enganchados a
la simulación de verdad: `resolveShot` (por golpe), `costeViaje`, la
recuperación semanal de energía, `pickLesion`, los puntos del torneo, `miTeam`
(el suplente obligatorio), el punto de oro y el sorteo con la némesis.

Dos cosas que hay que respetar al añadir uno:

1. **La bolsa, no la lista.** `evRecalcula` resume todos los eventos activos en
   un objeto plano (`_evBolsa`) y `resolveShot` consulta eso. Recorrer la lista
   de eventos dentro del bucle de puntos —que se ejecuta decenas de veces por
   punto— es el camino corto a que el partido vaya a tirones.
2. **Los alcances largos pesan menos** en el sorteo (`evSortea`): un cambio de
   normativa que dure una temporada no puede salir cada dos por tres, y los
   `unico:true` no vuelven jamás.

## El ranking: ventana de 52 semanas, como la FIP

Cada torneo reparte puntos y **esos puntos valen un año**. Al cumplirse las 52
semanas se caen: si el año pasado ganaste el torneo de esta semana, hoy lo
defiendes. Eso es lo que hace que el ranking se mueva todas las semanas en vez
de dar un salto artificial en diciembre.

Se guarda un **anillo de 52 casillas** por pareja (`x.rk`), lo ganado en cada
semana del año, y `x.pts` es la suma cacheada. De ahí las cuatro funciones de
`state.js`:

- `rkAnota(x, semana, pts)` — puntúa con fecha. **Nunca asignes `x.pts` a
  mano**: la siguiente operación lo recalcula desde el anillo y tu número
  desaparece.
- `rkCaduca(x, semana)` / `caducaSemanaRanking(semana)` — pasa la escoba al
  empezar la semana. Va guardada con `G.world._rkSem` porque entrar y salir de
  la partida no puede costarte puntos.
- `rkDefiende(x, semana)` — lo que te juegas esta semana. Es lo que pinta el
  panel y el KPI.
- `rkAsegura(x)` — migración: a una partida vieja se le reparte su `pts` por las
  52 casillas para que no se le caiga todo de golpe.

`tests/estatico.js` falla si alguien vuelve a meter el recorte del 55% al
cerrar temporada.

### Cuentan los mejores 18 resultados

`rkSuma` no suma las 52 casillas: ordena y **suma las 18 mejores**
(`RK_MEJORES`). Sumándolo todo, jugar más siempre sumaba más —un Bronce de 40
puntos nunca estorbaba— y la estrategia óptima era competir todas las semanas:
medido, un bot de volumen ganaba 107 títulos y llegaba al número 1. Con los
mejores 18, ese mismo bot acaba 3º con 8.200 puntos contra 17.300 del líder:
los menores siguen sirviendo (dinero, ritmo, confianza, entrar al circuito),
pero **el ranking de arriba se gana en las semanas grandes o no se gana**.

Dos detalles finos:

- **El anillo entero se conserva.** Se defiende TODO lo ganado: una casilla que
  caduca puede dejar sitio a un resultado pequeño que estaba esperando fuera de
  los 18 (la prueba lo cubre con el «suplente» que entra a contar).
- **`rkAsegura` migra a 18 casillas espaciadas, no a 52.** Repartir en 52
  deflactaba un 65% los puntos heredados al contar solo los 18 mejores.

Y ojo al medir repartos: con mejores-18, la suma de una pareja llena NO sube en
el premio entero (el título desplaza a su peor resultado). Lo que garantiza el
reparto es lo que entra en la **casilla** de la semana, no el delta de `pts`.

### La previa no puntúa

`loserIdx` es para el dinero y `loserPtsIdx` para los puntos, y devuelve −1 en
las fases de previa. Con la previa puntuando, entrar en la clasificatoria de una
Corona y perder el primer partido daba 100 puntos, más que ganar un Continental
Plata entero (80): presentarse a perder era la estrategia óptima y se medía
—48-196 sin un título daba el puesto 3—.

## Momentos, cifras de carrera y arquetipos

Tres piezas de la misma idea: **el contador de títulos comunica volumen; la
carrera se comunica con otras cosas.**

1. **Momentos** (`momAnota`, en `state.js`): primeras veces que se guardan una
   sola vez con su temporada y sus datos —primer título, primera Corona, los
   Maestros, el número 1, la primera víctima del top 10, la final ganada a la
   némesis, el título jugando tocado, el título con suplente—. Los pinta la
   sala de trofeos como tarjetas. No se calcula nada al pintar: si no se vivió,
   no existe. Al añadir uno: gancho en el sitio del hecho + clave `mom_*` y
   `mom_*_d` en los cinco idiomas.
2. **Cifras que miden carrera**: `c.finales` (jugadas, también las perdidas),
   `c.semN1` (semanas cerradas como nº1) y `c.vTop10` (victorias contra el top
   10, con el puesto del rival leído ANTES de que la semana recoloque el
   ranking). La cabecera de la sala de trofeos enseña los grandes títulos como
   cifra principal; el total bruto queda como una cifra más.
3. **Arquetipos** (`legadoDe(...).arqs`): lo que la carrera FUE aunque no fuera
   la del número 1 —especialista en Coronas, rey del circuito menor, ídolo
   popular, matagigantes, el que volvió…—. Salen de hechos comprobables de los
   contadores, nunca de una etiqueta a mano, y una carrera puede tener varios o
   ninguno.

## El circuito puntúa como puntúas tú

`simCircuito` (en `state.js`) reparte cada semana los puntos de los torneos del
calendario, y solo entre las parejas que los juegan. Tres reglas que hay que
respetar si se toca:

1. **Nadie cobra por existir.** Antes esto sumaba `0.045·(nivel−40)²` a *todas*
   las parejas cada semana: 47 puntos para una de nivel 70 sin jugar contra
   nadie, cuando ganar un Continental Bronce entero da 40. Medido, cuatro
   temporadas ganando siete títulos dejaban peor clasificado (91 → 95) que
   cuatro perdiendo en primera ronda de torneos grandes (91 → 66).
2. **Una pareja, un torneo por semana**, la misma regla que tiene el jugador.
   Si se les deja jugar el premier *y* el Continental, el mundo puntúa al doble
   de ritmo y el jugador se queda treinta puestos por debajo de su nivel.
3. **`cupoP` es la rampa de entrada al circuito grande.** Estaba en 32 de 92 y
   creaba un callejón sin salida: sin premier no hay puntos y sin puntos no se
   llega al corte. El cuadro final (`cupoD`) sigue siendo igual de exigente.

Y los **Maestros son ocho parejas que empiezan en cuartos**: `mkCuadro` les hace
un cuadro propio (`SIEMBRA_8`, ronda 3). Con el cuadro de 16 la ronda salía
vacía y la pantalla del torneo reventaba; no se veía porque con el ranking viejo
nadie llegaba nunca al top 8.

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

## La pareja es coprotagonista, no un segundo bloque de atributos

`engine/pareja.js` sostiene tres cosas que van juntas y que hay que respetar al
tocarlas.

1. **El plan conjunto se domina con el tiempo.** `PLANES_PAREJA` usa los mismos
   modificadores que los eventos, pero `pjGolpe` los aplica **escalados por
   `dominio/100`**: un plan recién elegido no cambia nada. `planElige` pone el
   dominio a cero y `planRompe` deja solo `PLAN_DOM_RUPTURA` (18%). Si añades un
   plan, tiene que cambiar *qué golpes te salen*, no solo el texto.
2. **Son seis ejes porque se arreglan de forma distinta.** `compiMoral` sigue
   mandando en la ruptura y todo lo que ya la usaba funciona igual; los `EJES`
   explican por qué está como está. Que no crea en tu juego se arregla ganando;
   que esté harta de aeropuertos, no. `relSemana` mueve cada eje por su motivo, y
   necesita leer `c._jugoTorneo` **antes** de que la semana lo apague.
3. **Las conversaciones las empiezas tú y pueden salir mal.** Cada `CHARLA`
   cuesta (energía o dinero), tiene enfriamiento y un `riesgo` que sube cuando el
   eje que peor está ya está roto. Una conversación que siempre sale bien es un
   botón de subir moral, no una decisión.

Los tres sitios donde cambia el compañero (fichaje, ruptura y retirada) llaman a
`parejaNueva(c)`: si añades un cuarto, llámalo también o la etapa nueva heredará
los automatismos y los enfriamientos de la anterior.

### El compañero recuerda, y por eso puede reprochar

Tres piezas nuevas de `engine/pareja.js`, y una regla común: **todo sale del
estado y se comprueba contra lo que HACES, no contra lo que dices.**

1. **Promesas** (`promAnota`/`promSemana`): dos charlas dejan un compromiso con
   plazo —hablar del calendario promete levantar el pie; pedir compromiso
   promete ir a por un premier—. Se evalúan en el cierre semanal ANTES de
   apagar `_jugoTorneo`, y al resolverse el compañero lo dice con su nombre.
   **Nunca dejes registrar una promesa imposible**: la del premier solo se hace
   dentro del corte (top 56), porque fuera de él se rompía sola cada ocho
   semanas y hundía el eje a cero hiciera lo que hiciera el jugador (medido).
   Y `planElige` recuerda: cambiar de plan antes de `PLAN_PACIENCIA` semanas
   tiene frase y roce.
2. **La voz semanal** (`compiComenta`): una frase como mucho, con DOBLE
   enfriamiento —global (`CC_ENFRIA`) y por tema (`CC_REPITE`)—. Sin el
   segundo, un eje que se queda bajo producía la misma queja cada tres semanas
   para siempre: 58 veces en tres temporadas, medido. La frecuencia buena está
   en ~9 frases por temporada, variadas. Y la misma situación produce dos
   personas distintas: ante el torneo grande con el depósito vacío, la pareja
   ambiciosa quiere jugarlo y la desgastada pide llegar enteros.
3. **La ambición tiene entradas y salidas.** Era el CUARTO trinquete del repo,
   esta vez hacia abajo: sin acceso a los premier en las primeras temporadas no
   había NINGUNA entrada y el eje caía a cero hacia la semana 100 de cualquier
   carrera (medido con la traza). Ahora la alimentan los títulos (+3, +5 si es
   premier), las finales jugadas (+2) y competir en premier (+3): cae cuando la
   carrera no va a ningún sitio —que es la historia de la ruptura por
   ambición— y se recupera ganando.

El **arco de la némesis** (en `tournament.js`) se deriva de hechos: «herida»
cuando te domina (d−v≥3), «pulso» igualado, «vuelco» —una vez, y es noticia—
al darle la vuelta a un duelo que ibas perdiendo. Las finales entre vosotros se
cuentan aparte. La ficha de rivalidades pinta la fase, y un guardado viejo la
deduce de su h2h. Y el **staff tiene historia**: `st.desde` y `st.tits`
(títulos juntos) se enseñan en su ficha.

### Cómo se miden estas cosas (y por qué `golpeTodo:{err}` es peligroso)

Un plan se ajusta **midiendo partidos, no leyendo el multiplicador**. El banco
de pruebas que funciona monta dos parejas idénticas, fija el personaje (rasgos,
estilo y carácter, que si no tapan el efecto) y juega N partidos por plan
**reiniciando la semilla en cada uno con `rndSemilla(sem,sem)`** — ojo: escribir
`G._rngS` no reinicia nada, el estado del generador es una variable de módulo.
Con eso la comparación es pareada y 500 partidos bastan; sin eso, la horquilla se
come cualquier diferencia por debajo de 5 puntos.

La primera versión de los planes iba de 13,9% a 36,3% de victorias: la palanca
`golpeTodo:{err}` recorta el error de **todos** los golpes, y como la mayoría de
los puntos mueren en fallo y no en golpe ganador, un −12% ahí valía más que
cualquier bonificación de golpe. Al revés, un +3% de error global hundía el plan
de red por debajo de no tener plan. Hoy los cinco planes valen entre +3 y +5
puntos de victoria sobre «sin plan», y `tests/casos.js` no deja bajar ningún
`golpeTodo.err` de 0,95.

## El presupuesto de energía: la trampa que casi hunde el juego

Antes de tocar cualquier número de entrenamiento, lee esto.

La energía es un **presupuesto semanal**: lo que gastas entrenando y compitiendo
frente a lo que recuperas. Si no cuadra, no pasa algo malo: pasa lo peor, que es
que **entrenar deja de ser la jugada correcta**. Medido con `banco.js` (carreras
completas, sin trucar energía ni dinero) con los números viejos —4 por sesión,
11 por partido, 12 de recuperación—:

- el que entrenaba cinco días vivía a **1 de energía** y jugó dos partidos en
  dos temporadas;
- el que entrenaba dos días y competía **terminaba mejor que los otros dos**;
- **ninguna de las tres formas de jugar ganó un solo título en diez
  temporadas.**

Los números de ahora: sesión 2/3/5, partido 7, recuperación semanal 26 (más el
preparador). En club: sesión 7/12/19, partido 7, eliminatoria 10, recuperación
24.

**La regla:** cualquier cambio a costes de energía, a las ganancias de
entrenamiento o a los multiplicadores de `engine/forma.js` hay que medirlo con
una carrera completa **sin fijar energía ni dinero**. El bot de las capturas los
fija (`c.energia=Math.max(c.energia,75)`) y por eso llegaba al número uno con 29
títulos mientras un jugador real se quedaba en el puesto 100: ese bot no vale
para equilibrar, solo para hacer fotos.

## El calendario decide, y por eso tiene huecos

Un circuito con torneo todas las semanas no es un calendario, es una cinta de
correr. Tres reglas que se sostienen entre sí:

1. **Hay semanas en blanco** (`CONT_CAL` lleva `null`). Antes había un
   Continental las 52 semanas del año: una carrera larga terminaba con **más de
   cien títulos** y un Continental Bronce de la temporada 2 valía en el palmarés
   lo mismo que la Corona que te hizo número uno. Los parones son los que
   convierten «cuándo juego» en una decisión.
2. **Un partido cuesta más cuanto más hondo llegas** (`costeEnergiaPartido`:
   6 en previa, 16 en la final). Con un coste plano la energía dejaba de apretar
   en cuanto eras bueno —medido: nivel 86 competía 51 semanas de 52, 137
   partidos y 20 títulos sin saltarse nada—. Subirlo a secas era volver a la
   trampa de que entrenar no compense; escalado por ronda, paga el que se está
   llevando los puntos y no el que se está construyendo.
3. **El calendario es parte del corte.** `entradaEn` lo comprueba, no solo la
   interfaz. Ver «El circuito puntúa como puntúas tú».
4. **La energía vuelve; la gira, no** (`c.gira`, en `engine/forma.js`). Con la
   recuperación semanal cuadrada, arriba se podía competir siempre: el torneo
   pequeño costaba menos de lo que se recuperaba. El poso de la gira sube solo
   compitiendo (más con rondas, viaje lejano y estilo explosivo), baja solo en
   casa (menos a partir de los 30) y muerde donde duele: la recuperación
   semanal (`regenCarrera`, suelo 8) y el riesgo de lesión. Medido a nivel 80
   con tres temporadas: el que juega todas las semanas sin mirarla vive a gira
   75, encadena 7-11 lesiones y acaba 22º-31º; el que para cuando pasa de 55
   juega casi las mismas semanas, vive fresco y acaba top 10. **No toca el
   entreno**: la trampa histórica del repo es que entrenar deje de compensar,
   y por eso la gira solo se alimenta de torneos. Y el conflicto que crea se
   ENSEÑA: `vocesCalendario` (en `engine/atencion.js`) pinta la caja de
   «conflicto de calendario» solo cuando hay voces pidiendo cosas
   incompatibles —la ambición del compañero, sus promesas, el ranking que
   defiende puntos, el rodaje de la marca, el técnico y el cuerpo—.

### El palmarés cuenta lo que importa

`palmaresHTML` agrupa por categoría y **enumera los grandes uno a uno pero
cuenta los pequeños** («Continental Bronce ×70»), con un titular de «X títulos
grandes de Y». Noventa Bronces en fila no son un palmarés, son un muro.

## Las lesiones no pueden entrar en barrena

`fragil` sube 1 con cada lesión. Sumaba hasta **+0,15 sobre una base de 0,012**,
o sea que a partir de la quinta lesión el historial pesaba trece veces más que
la energía, la carga y el fisio juntos: la carrera entraba en espiral y no salía
—medido, 19 lesiones en una sola temporada y 23 semanas de baja de 52—. Es el
mismo fallo que tenía la confianza del club: un trinquete de un solo sentido.

Dos cosas lo arreglan y las dos hacen falta:

1. **El historial multiplica, no suma** (`×1` a `×1,6`). Sigue siendo un lastre
   real sin comerse el resto del modelo, que es donde están las decisiones.
2. **El cuerpo se rehace** (`curaFragilidad`): cada `FRAGIL_CURA` semanas sanas
   seguidas te quitan una lesión vieja de encima. Cuidarse deja de ser un gesto
   y pasa a tener premio.

Y el escalón por energía baja era un precipicio (×5 por debajo de 35, ×25 por
debajo de 20). Como competir es justo lo que te vacía, el que competía se
autolesionaba. Hoy la pendiente es la misma pero mucho menos vertical.

## Entrenar no tiene respuesta correcta

`engine/forma.js` existe para que no haya una jugada que gane siempre. Cuatro
sistemas que se pelean entre ellos:

1. **Contexto** (`CTX_ENTRENO`): pista, casa, sparring, gimnasio, vídeo y
   concentración. Regla al añadir uno: **si es gratis, tiene que renunciar a
   algo** (menos ganancia, sin competir esa semana, solo golpes físicos). Un
   sitio gratis y sin inconveniente es la respuesta correcta para siempre, y
   `tests/casos.js` lo rechaza.
2. **Adaptación** (`c.adapt`): trabajar el mismo golpe lo sube 17 y baja 5 el
   resto. Siete semanas seguidas con la volea la dejan rindiendo al 40%.
3. **Carga acumulada** (`c.carga`): un filtro con poso 0,80, cuyo estado estable
   es 5× lo que entra cada semana. `CARGA_BASE` sale de ahí (`CARGA_OPT/5`) para
   que una semana normal en pista quede rondando el óptimo. **Ojo al tocar los
   multiplicadores de intensidad**: con la intensa a 1,35 todo el mundo se
   quedaba clavado en «bien» y el sistema no mordía; a 1,75, «siempre intensa»
   te deja pasado de vueltas y con ×1,5 de riesgo de lesión.
4. **Forma y ritmo**: `c.forma` es por golpe, temporal (se enfría 1 por semana)
   y se aplica en `miTeam` sobre el atributo; `c.ritmo` sube 13 compitiendo y
   baja 6 parado, y se cobra en la confianza, que es donde se nota no tener
   partidos en las piernas.

**El cuerpo técnico da horquillas, no números** (`banda`, `bandaTxt`,
`pronosticoEntreno`): la precisión sale de `staffNiv("fisico")+staffNiv("entrenador")`.
Y la barra dibuja la horquilla —de `lo` a `hi`, flotando— en vez del valor: no
tiene sentido ocultar el dato en el texto y regalarlo en píxeles.

Medido con bots de 200 semanas: fijarse en un solo golpe termina 17 puntos de
media por debajo, entrenar siempre suave 10 por debajo, y varias estrategias
sensatas (alternar cargas, pagar sparring, rotar objetivos) empatan arriba. Eso
es lo que se busca: varios caminos buenos y dos maneras claras de hacerlo mal.

## El parte de atención: tres capas de información

`engine/atencion.js`. El juego maneja veinte sistemas y no todos merecen la
misma intensidad a la vez. El parte de la semana (carrera y club) reduce la
fricción con tres capas: **qué necesita atención ahora** (una línea por
asunto), **por qué** (al pulsar: factores con números, consecuencia y, si hay
técnico del tema, su recomendación con su nombre) y **el detalle experto**
(un botón que salta a la pestaña de siempre).

Reglas al añadir una señal:

1. **Solo entra lo que cambia una decisión DE ESTA SEMANA** —la misma regla
   que los eventos—. «Vas 47º» no es una señal; «defiendes 800 puntos hoy» sí.
2. **`atencionDe(e)` es pura**: lee el estado, no muta nada y no consume
   azar. Por eso la suite la prueba sin montar pantalla. El pintado
   (`renderAtencion`) es aparte, y aguanta el DOM recortado de la suite.
3. **Como mucho `AT_MAX` asuntos, los graves primero.** Un parte que lo
   cuenta todo es la sobrecarga que venía a arreglar.
4. **El «por qué» es donde el staff vende conocimiento**: la recomendación
   lleva el nombre del técnico si lo tienes (y su escuela cuando toca, como
   el fisio recuperador con la merma). Sin técnico, la línea es más genérica.

## El staff tiene escuela: mismo nivel, otra gestión

`PERFILES_STAFF` (en `career.js`). Cada rol tiene **dos escuelas** y todo
técnico nace con una (`st.perfil`, sorteada en `mkStaff`). La regla que las
gobierna:

> **Una escuela engancha a una mecánica DISTINTA, no da «un poco más» de la
> misma.** El fisio preventivo baja el riesgo de lesión y el recuperador
> acorta la baja y disipa la secuela al doble; el psicólogo de ánimo sube el
> suelo semanal de confianza y el de presión da confianza extra en los
> partidos serios (carrera) y en el desempate de la Copa (club); el preparador
> motor regenera más energía y el de picos enfría la forma a la mitad; el
> entrenador de pizarra acelera el dominio del plan (y la cantera en club) y
> el de pista exprime el entreno; el agente de marcas trae más rodajes y
> mejores contratos y el de premios muerde la mitad de comisión; el ojeador de
> cantera sube el techo de lo que se presenta y el de mercado trae mejores
> agentes.

Cosas que hay que respetar al tocarlas:

1. **Los guardados viejos no llevan escuela y funcionan exactamente como
   antes**: todos los ganchos tratan `perfil` ausente como el comportamiento
   de siempre (el patrón de `t()` con los literales). No migres staff viejo.
2. **Los números que cambian de escuela viven en helpers medibles**
   (`regenCarrera`, `confSueloPsico`, `netoPremio`, `staffPerfil`), no inline:
   una regla que solo existe dentro del cierre semanal no se puede probar.
3. **La escuela se enseña donde se ficha** (`perfilChip` + descripción en el
   mercado y en el equipo): si el jugador no puede ver la diferencia antes de
   contratar, no es una decisión.
4. **Medido con carreras de 6 temporadas, 4 semillas por escuela.** Las dos
   escuelas del fisio acaban igual por caminos distintos: ≈0,5 lesiones por
   carrera —al preventivo no le llegan, al recuperador le duran una semana y
   sin secuela—, contra 2 con fisio sin escuela y 7 sin fisio. El preparador
   motor da +4 de energía media (83 vs 79) y el de picos convierte esa forma
   en semanas grandes; los puestos finales se solapan. Con ±30 puestos de
   ruido por semilla la vara no es afinar: es que ninguna escuela quede
   muerta ni domine, y no pasa. Y ojo al volver a medir: SEIS carreras dentro
   de un solo `page.evaluate` revientan el renderizador (`Target crashed`) y
   la promesa se queda colgada sin quemar CPU — una página por carrera.

## El partido te contesta: lectura, informe e identidad

`engine/tactica.js`. La táctica ya cambiaba el partido, pero el partido no
contestaba: tocabas un botón y no sabías si había servido, y el rival aguantaba
cuarenta víboras seguidas igual de bien la última que la primera.

1. **La lectura del rival** (`tacLee`, `tacLecturaX`). Al cerrar cada juego el
   rival mira qué llevas jugado; si un golpe pasa del umbral, empieza a
   esperarlo y ese golpe rinde menos. Se les olvida si varías. Y la lectura
   ya **no muere con el partido**: el patrón de cada partido tuyo queda en
   `c.tacHist` (últimos `TAC_HIST`), y si el mismo golpe domina en 3 o más,
   `tacPreLectura` hace que el siguiente rival salga esperándolo
   (`match.lectura` sembrada a nivel bajo) y el parte de atención lo avisa
   ANTES («el circuito ya espera tu globo»). Variar entre partidos también es
   táctica.
   **Los umbrales salen de medir, no de la intuición**: el golpe más repetido de
   un partido real está en el 27% para una pareja completa y sube al 31-37% para
   un muro, porque la situación de pista ya limita lo que se puede jugar. Con el
   32%-62% de la primera versión la lectura no saltaba nunca —función muerta—;
   con 29%-40% una pareja completa se libra (7 de 40 partidos) y un muro cae
   (33 de 40). Si tocas `chooseShot`, vuelve a medir esa distribución.
2. **El informe táctico** (`tacAnota`, `tacInformeHTML`). Cada combinación de
   ajustes lleva su cuenta —puntos jugados y ganados, winners, errores y globos
   que te pasan por encima— y se cuenta en el descanso, que es donde se decide
   el plan del set siguiente. La firma del plan es la combinación de los cuatro
   ajustes: cambiar cualquiera abre una línea nueva, que es lo que se compara.
3. **La identidad del rival** (`identidadPareja`) **se lee de sus atributos**, no
   se le pega encima: por eso la etiqueta nunca miente. Cada una lleva su
   antídoto (`identContra`), que es lo que la convierte en una decisión y no en
   un adorno.

## El dinero tiene que escasear también arriba

`engine/inversion.js`. Medido con un bot de diez temporadas: hasta la octava la
caja se mueve entre 14.000 y 31.000 y hay semanas en números rojos —ahí la
economía funciona—, pero al entrar en el top 10 salta a **262.000 sin nada que
hacer con ellos**. Un recurso que deja de escasear deja de ser una decisión, y
con él se caen fichar staff, elegir torneo o pagar un sparring.

Las cinco inversiones (centro de entrenamiento en una región, clínica,
analítica, academia y agencia de imagen) son los sitios donde el dinero vuelve a
convertirse en decisiones. Dos reglas al tocarlas:

1. **El freno es el mantenimiento semanal, no un tope artificial.** Tenerlas las
   cinco al máximo cuesta 5.670€/semana y un número uno del mundo ingresa del
   orden de 3.500€: hay que elegir dos o tres. `tests/casos.js` compara esas dos
   cifras y falla si el mantenimiento total vuelve a caber en lo que se ingresa.
2. **Cada nivel cambia una decisión, no da «+1 a todo».** El centro al máximo
   hace que las horas de pista rindan como un sparring de pago —o sea, deja de
   tener sentido pagarlo—; la clínica te deja vivir en intensa; la analítica
   sustituye al preparador como fuente de información; la academia solo sale a
   cuenta si eres famoso; la imagen compra prestigio, que es lo que mira una
   pareja buena antes de decirte que sí.

Los efectos están enganchados donde se decide: `costeViaje`, `pickLesion`,
`decaeMerma`, `cargaPoso`, `precisionStaff`, `fansAdd`, el tier de patrocinio y
el `rivBoost` del partido.

### Y nadie trabaja gratis

Una deuda sin consecuencia no es una decisión. El staff cobraba a crédito para
siempre: medido con el banco de carreras, un perfil que fichaba a los tres del
mercado en cuanto tenía 5.000€ terminaba seis temporadas a **−117.636€** jugando
exactamente igual de bien. `impagoStaff` da un mes de cuerda (cuatro nóminas) y,
pasado eso, se marcha el mejor pagado. Con eso el mismo perfil termina en +2.469€.

Dos cosas: se avisa antes con `av_fijos`, así que perder al entrenador es culpa
tuya y no una sorpresa; y se va **uno por semana**, no todos de golpe —con un
bucle, quitar al mejor pagado encoge la nómina y con ella el límite, así que el
siguiente también se pasa de raya y se te cae la estructura entera el mismo día—.

## Las primeras semanas tienen que contar algo

`engine/arranque.js`. El arranque era el tramo más pobre: aparecías con una
pareja que no sabías de dónde salía, jugabas contra desconocidos que no volvías
a ver y nadie te decía en qué te estabas convirtiendo. La guía enseñaba a
pulsar botones; esto cuenta una historia con los mismos botones.

Tres escenas, y las tres leen el estado en vez de inventarse nada:

1. **La primera pareja, semana 1.** No es un texto de bienvenida: cómo plantees
   la sociedad (`ARR_PACTOS`) mueve los ejes de `engine/pareja.js` desde el
   minuto uno y te acompaña meses. Si añades un pacto, tiene que mover ejes.
2. **El primer rival, semana 3.** Se elige uno de tu nivel (±7) y `rivalDeFase`
   lo trae de vuelta en las rondas de entrada durante dos temporadas
   (`arrSorteaRival`). Después manda el sistema de némesis, que necesita varias
   eliminaciones para arrancar; esto llena justo ese hueco.
3. **El balance de la semana 10.** `arrBalance` construye las líneas desde
   datos reales —récord, golpe más trabajado (`c.adapt`), atributo fuerte y
   flojo, el eje peor de la pareja, la caja, el marcador con el primer rival y
   el puesto—. **Si el dato no existe, la línea no se pinta**: antes eso que
   rellenar con vaguedades.

## No todos los partidos valen lo mismo

`engine/drama.js`. El juego trataba igual la primera ronda de un Continental
Bronce que la final de una Corona: mismo cartel, misma grada, misma ficha. El
`pesoPartido` (0..100) sale de la categoría, la ronda y **lo que hay en juego de
verdad**, y de ahí salen el cartel de «lo que te juegas», la intensidad de la
grada y si al ganar se levanta el trofeo en pantalla.

Dos reglas:

1. **El peso sale de hechos comprobables del estado de la partida**, no de una
   etiqueta puesta a mano: el título, que sea el primero, que te ponga número 1,
   los puntos que defiendes, la némesis, la bestia negra, el último año.
   `enJuego` devuelve esa lista y cada entrada aporta su peso. Un partido que
   «parece» importante pero no cambia nada, no lo es, y entonces no saca cartel.
2. **Los cortes están altos a propósito.** La primera tabla hacía «histórica»
   cualquier final —hasta la de un Continental Bronce— y la palabra dejaba de
   significar algo. Medido con los cortes de ahora: octavos de Bronce 10
   (rutina), primera final de Bronce 62 (grande), final de Bronce con el
   palmarés hecho 46 (seria), octavos de Corona 34 (seria) y final de Corona 78
   (histórica). Si tocas los pesos, vuelve a sacar esa tabla.

## El club tiene competición propia: la Copa de Clubes

`engine/copa.js`. Antes el modo club era una carrera con dos parejas: todo
—plantilla, cantera, filosofía, junta— colgaba de torneos individuales que no
eran del club. **Ojo, no confundir con `engine/liga.js`**: la Superliga es otro
modo, con plantilla propia y un motor de fuerzas abstractas. La Copa se juega
con tus jugadores y con el motor de partidos de verdad (`quickMatch`).

Ocho equipos, ida y vuelta, y cada jornada una eliminatoria a dos partidos con
desempate. Tres reglas que la sostienen:

1. **La jornada son tres decisiones, no un botón.** Repartir a los cuatro
   (`copAlineacionAuto(cl,reparte)`: apilar a los dos mejores o hacer dos
   parejas parejas), emparejar contra sus dos parejas (de tú a tú o cruzadas) y
   elegir quién sale al desempate sabiendo la energía que le quedará.
2. **En los dos primeros partidos nadie repite.** Sin cuatro jugadores sanos el
   segundo punto se pierde en la mesa: es lo que obliga a tener fondo de
   armario y lo que hace que ceder a alguien tenga precio.
3. **Las jornadas caen en semanas sin premier** (`copSemanasLibres`). Sí
   coinciden con Continentales, y ahí es donde la fatiga empieza a decidir.

### La Copa no la decide la fuerza: la decide la enfermería

El hallazgo que explicaba el modo club entero, y que tres rondas de mediciones
habían achacado a la fuerza de la plantilla. **La Copa pide cuatro jugadores
SANOS**, y sin ellos el segundo punto se pierde en la mesa sin jugarlo.

Medido sobre doce fundaciones jugadas igual de bien: la que nunca pudo alinear
segunda pareja ganó **0 de 20** eliminatorias, y la que siempre pudo, **16 de
20**. Los puntos perdidos en la mesa coincidían *exactamente* con las jornadas
sin segunda pareja. Y la fuerza no predecía nada: un club de fuerza 67 contra un
grupo de 60 ganaba 2 de 20 y otro de 59 contra 58 ganaba 12 de 20.

La causa era el presupuesto: 22.000€ compraban exactamente cuatro jugadores, y
el club pasa **una media de 1,1 lesionados por semana**. Con cuatro en
plantilla, cualquier lesión te quitaba el punto antes de empezar. Hoy el
presupuesto (30.000€) da para **cinco**, que es el fondo de armario que la regla
siempre pidió. Con eso la mediana de eliminatorias ganadas en la primera
temporada pasa del 25% al 40% y desaparecen las destituciones del primer año.

**La regla no cambió** —sigue sin poder repetir pareja en los dos primeros
puntos, que es lo que obliga a tener fondo—; lo que cambió es que ahora se puede
construir ese fondo. Si tocas `PRESUP_CLUB`, comprueba que los CINCO más baratos
del mercado inicial siguen cabiendo: `tests/casos.js` lo exige.

### Fundar no puede ser una tirada, y la junta no puede ser un cepo

Dos cosas más que salieron al medir el modo club con un bot que **juega bien**
(funda con cinco, ficha fisio lo primero, mantiene fondo de armario, no compite
en semana de Copa y descansa si la plantilla está fundida). Con él, los que
sobreviven ganan de 30 a 45 eliminatorias de 50 y los que caen ganan de 0 a 8 de
20: no es varianza, son **dos poblaciones distintas**.

1. **El mercado del primer día tiene suelo** (`mkMercadoFundacion`). El circuito
   no tiene división de abajo —el club más flojo del mundo tiene una primera
   pareja de 60—, así que una fundación con mala suerte nacía enfrentándose a
   rivales cinco puntos por encima todas las jornadas. El suelo garantiza cuatro
   jugadores: dos para una primera pareja al nivel del club más flojo (60) y dos
   para sostener la segunda (54), porque la Copa se juega a **dos puntos**. El
   mercado semanal (`cl.mercado`) sigue sin suelo ninguno: esto es para no nacer
   muerto, no para regalar.
2. **El fisio es LA decisión del modo club, y hay que decirlo.** Medido sobre
   diez fundaciones con la misma semilla: sin fisio, 1,35 lesionados por semana y
   8 destituciones de 10; con fisio, 0,42 y 4 de 10. Ahora se avisa en cuanto
   hay dos tocados y no hay fisio, con la razón entera.

### El tercer trinquete: la junta

Después de la confianza del club y de la fragilidad, el mismo fallo por tercera
vez. El objetivo de la junta se apretaba tras cada éxito (`min(posFin,obj)×dureza`)
y **no se relajaba jamás**, así que acababa en 1º; y la paciencia se reponía al
`margen` del carácter, que para la junta `corto` es **uno**. Combinado: ganabas la
Copa dos años seguidos, quedabas segundo al tercero y a la calle. Medido tal cual.

Tres suelos lo arreglan, y los tres son el mismo suelo escrito en tres sitios:

- el objetivo **no baja del 2º** —«campeón o a la calle» no es un trabajo—;
- cumplir repone **al menos dos temporadas** de cuerda, igual que al fundar;
- y el objetivo **solo se aprieta si lo cumples**: que te pidan más por ganar es
  la historia de cualquier banquillo, que te pidan más por perder es un cepo.

Con todo junto, 28 fundaciones a dos temporadas: **8 destituciones (29%)**,
mediana de 3º de 8 y un reparto sano de puestos. Si tocas la junta o el mercado
inicial, vuelve a sacar esa tabla —y ojo: cualquier cambio que consuma más azar
mueve la semilla, así que las fundaciones **no son comparables una a una** entre
dos versiones; hay que mirar la distribución con muestra grande, no doce casos.

### La economía del club, y por qué la juzga la Copa

Tres cosas que se midieron y hubo que corregir, todas de la misma familia:

1. **Los salarios estaban fuera de escala.** A media×8 semanal, cuatro
   jugadores de nivel 52 costaban 1.664€/semana contra unos 765€ de ingresos:
   un club recién fundado perdía 900€ cada semana hiciera lo que hiciera. Hoy
   son media×4,5, el presupuesto fundacional son 22.000€ (la Copa pide cuatro
   jugadores, no dos) y la base semanal del club son 420€, porque un club vive
   de sus pistas y su bar aunque no tenga prestigio.
2. **La deuda tiene suelo.** Por debajo de ocho semanas de salarios la junta
   vende al mejor que no sea titular —nunca por debajo de cuatro jugadores, que
   es dejarte sin segunda pareja— y si no queda a quién vender, se le acaba la
   paciencia. Antes se llegaba a −480.000€ sin que pasara nada.
3. **La junta juzga la COPA, no el ranking individual.** Pedirle a un club
   recién fundado el top 30 del circuito —cuando su pareja A es de nivel 55— era
   destituirlo en la primera evaluación hiciera lo que hiciera. Los `obj0` son
   puestos de la Copa (3º a 6º) y la paciencia tiene un suelo de dos temporadas.

Y una que no se veía y costaba partidos: **`teamDePareja` no copiaba el lado de
pista ni los rasgos**. Lo que no está en ese objeto no existe para el motor, y
las parejas del mundo sí los llevan: la combinación drive+revés vale un 5% y
jugar en tu lado natural hasta un 6% por golpe. Parejas de nivel equivalente
perdían 0-2 una y otra vez.

### Los socios son el otro jefe

`cl.socios` y `cl.humorSocios`. La junta mira la clasificación; los socios
miran el derbi, la cantera y a quién vendes. Pagan cuota **todas las semanas** y
lo que pagan depende de su humor (`socIngreso`), así que enfadarlos cuesta caja,
no solo ambiente. Ganar suma, barrer suma más, perder en casa duele el doble y
el derbi multiplica lo que pase.

Las **cesiones** son la alternativa a vender: no cobras, pero no lo pierdes y
vuelve mejorado (`cesionSemana`). Solo se puede ceder al que sobra de verdad, y
ceder a un canterano enfada a la grada.

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

## La cantera se sigue durante años

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

### Y el club lo recuerda todo

La memoria del canterano se escribe **donde ocurre el hecho**: `j.origen` al
presentarse en la academia (con el nombre del ojeador si lo hay), `j.debut` y
`j.primerPunto` en `copJuega` la primera vez que pisa la pista y la primera vez
que gana su punto, y `cl.libroCantera` cuando sale de la cantera —tres finales:
`sube`, `venta`, `fuga`, cada uno con su línea—. La ficha del jugador «de la
casa» lleva su chip con el debut, y la pestaña del club pinta el libro. Si no
se vivió, no existe.

**Y el que se marcha puede volver como rival.** `canRegresaAlCircuito` (en
`club.js`) se llama en la fuga y en la venta desde la cantera: si el chaval
tiene nivel de circuito (`CAN_REGRESO_MIN`), sustituye al flojo de una pareja
del mundo —con preferencia por los clubes de tu grupo de la Copa, para que el
reencuentro pueda ocurrir de verdad— y queda marcado con `exCantera`
(club, motivo y temporada). La jornada contra su club lo anuncia ANTES de
alinear (es información que cambia la decisión), y `copJuega` cierra la
historia en el acta (`acta.exCan`): si su pareja te quitó un punto, lo dice
con su nombre. Dos cosas al tocarlo:

1. **La elección de pareja es determinista** (la que mejora más de cerca), no
   sorteada: no consume azar y por tanto no mueve la semilla de nadie.
2. **Vender también deja rastro**: el vendido puede acabar enfrente, que es el
   precio oculto de la venta. La línea del libro lleva `dest` cuando se sabe
   dónde acabó.

Y **la némesis tiene epílogo**: la pantalla de retirada cierra la rivalidad
según su fase (`leg_nem_vuelco/herida/pulso`), con el cara a cara y las finales
del duelo. Sale del estado, como todo el arco.

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

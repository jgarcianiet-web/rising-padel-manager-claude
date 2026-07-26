# Tráiler de treinta y cinco segundos

Sin voz en off y sin música con derechos. La estructura es la que funciona en
managers: **enseña la simulación primero**, porque es lo que la gente duda que
exista, y deja la promesa emocional para el final.

`tools/trailer.js` graba estos treinta y cinco segundos en vídeo (`.webm`) jugando de
verdad, con semilla fija. Lo que el script **no** hace es poner los rótulos ni
la música: eso son cinco minutos en cualquier editor, y va aquí escrito para que
se monte igual siempre.

---

## Guion, plano a plano

| # | Tiempo | Qué se ve | Rótulo sobreimpreso |
|---|--------|-----------|---------------------|
| 1 | 0:00 – 0:05 | Un punto entero en directo: la pista, la bola moviéndose, la retransmisión escribiéndose a la derecha. Termina en winner. | — (que hable la pantalla) |
| 2 | 0:05 – 0:09 | El informe del ojeador. El cursor pulsa «aplicar plan» y los botones de táctica cambian solos. | **Lee al rival antes de jugarlo** |
| 3 | 0:09 – 0:13 | El panel de la pareja: el plan conjunto rodándose, los seis ejes de la relación y las conversaciones que puedes abrir. | **Tu pareja no es una estadística** |
| 4 | 0:13 – 0:17 | Un dilema a pantalla completa. Se lee el título y las dos opciones, y se elige una. | **Cada decisión vuelve** |
| 5 | 0:17 – 0:21 | El periódico: portada, titular de rumor, columna de mercado. | **El circuito habla antes de que pase** |
| 6 | 0:21 – 0:25 | La pestaña Ranking subiendo, y el gráfico de evolución de la sala de trofeos con la línea trepando de #91 a un puesto alto. | **Empiezas el 91 del mundo** |
| 7 | 0:25 – 0:29 | La vitrina de la sala de trofeos, con los títulos, y el bloque de «con quién lo hiciste». | **Te retiras cuando el cuerpo diga basta** |
| 8 | 0:29 – 0:34 | Fundido a negro, logo del juego, precio y dónde. | **Rising Pádel Manager · 6 € · itch.io**<br>*Español · English · Français · Deutsch · Italiano* |

## Reglas de montaje

1. **Ni un plano por debajo de tres segundos.** Es un juego de leer: si el plano
   no da tiempo a leer una línea, no sirve de nada.
2. **Nada de cortes al ritmo de la música.** El género se vende despacio.
3. **Los rótulos, en la mitad inferior** y sobre una banda oscura: la interfaz ya
   es oscura y el texto blanco se pierde encima de las tarjetas.
4. **Sin voz en off.** Cuesta dinero, envejece mal y hay que rehacerla en cinco
   idiomas.
5. **La versión de quince segundos** para redes es la misma quitando los planos
   2, 3 y 5, y alargando el 1 a siete segundos.

## Música

Sin derechos y sin sorpresas: algo instrumental de ritmo medio, sin percusión
marcada. En el propio juego no hay música, así que el tráiler no promete nada
que luego no esté.

## Producir el vídeo

```sh
NODE_PATH=$PWD/node_modules node tools/trailer.js
# preparando la partida (sin cámara)… T11 · #1 · 30 títulos
# partida cargada de la ranura 1
# grabando…
# el tráiler dura 30.5 s desde que se levanta el telón
# → docs/tienda/trailer/trailer-bruto.webm · 2744 KB
```

Tarda unos cinco minutos: la carrera que se enseña se juega de verdad, once
temporadas, antes de encender la cámara.

### Tres cosas que hay que saber del bruto

1. **Empieza en negro y hay que cortar por ahí.** Playwright graba desde que
   abre el navegador, así que los primeros tres o cuatro segundos son la página
   cargando. El script tapa todo eso con un telón negro y lo levanta justo
   cuando empieza el primer plano: en el editor, se corta por donde termina el
   negro y ya está sincronizado con la tabla de arriba.
2. **La partida se juega fuera de cámara.** Sembrar la carrera dentro de la
   grabación metía dos minutos y medio de simulación en el vídeo (el primer
   intento duraba 164 s). Ahora se juega en una ventana sin grabar, se guarda,
   y la ventana que graba abre esa partida ya hecha.
3. **Es la misma carrera que las capturas** (semilla `TIENDA-1`): once
   temporadas, del 91 al nº1 del mundo. La ficha de tienda y el tráiler cuentan
   lo mismo, que es lo suyo.

El vídeo sale **en bruto y a tamaño de trabajo** (1280×720, ~2,8 MB): la idea es
montarlo encima, no publicarlo tal cual. Si hace falta a 1080p, se cambia
`ANCHO`/`ALTO` en la cabecera del script.

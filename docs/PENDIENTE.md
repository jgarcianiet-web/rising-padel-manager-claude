# Pendiente

Cosas identificadas y decididas, que **no** están hechas. Se anotan aquí para
que no se pierdan entre commits.

---

## Lanzamiento: lo que no es código

**Las cuatro están hechas** y viven en `docs/tienda/`:

- **Página de tienda y descripción** → `docs/tienda/README.md` (título, gancho,
  descripción corta y larga en ES y EN, cinco viñetas, etiquetas, precio y
  requisitos).
- **Capturas** → `docs/tienda/capturas/es` y `/en`, nueve a 1920×1080, sacadas de
  una carrera de once temporadas jugada de verdad. Se regeneran con
  `tools/capturas.js`, y en cualquiera de los cinco idiomas.
- **Tráiler** → guion plano a plano en `docs/tienda/TRAILER.md` y el bruto de
  treinta segundos en `docs/tienda/trailer/`. Se regenera con `tools/trailer.js`.

Lo único que queda es humano: **decidir el precio final, montar los rótulos y la
música sobre el bruto, y darle a publicar.**

### Lo que sigue abierto

- **Dónde se publica.** La recomendación de la auditoría sigue en pie: itch.io a
  6 €, y Steam solo cuando haya un dato de retención que lo justifique. La ficha
  de `docs/tienda/README.md` está escrita para itch.io; para Steam habría que
  traducirla a los otros tres idiomas y añadir cápsulas gráficas.
- **Montar el tráiler.** El bruto de treinta segundos está grabado; faltan los
  rótulos de la tabla del guion y la música.
- **Capturas en francés, alemán e italiano**, si se publica ficha por mercado:
  es el mismo comando con otro idioma.

---

## Contenido: lo que sube la nota y no está hecho

Por orden de retorno, según la auditoría:

1. ~~**Triplicar los dilemas (15 → 40-45) y encadenarlos.**~~ **Hecho.** 45
   dilemas, memoria de lo vivido y lo decidido, y tres cadenas reales (el cobro
   del inversor, la operación de quien se infiltró, la conversación de quien
   rechazó la beca). De paso se triplicaron los otros catálogos que se leen más
   veces: posts de fans (32 → 98), frases de staff (24 → 72), usuarios del muro
   (14 → 30) y las frases del narrador (8 → 24, repartidas por final).
2. **Eventos de temporada que no son dilemas**: el sorteo que te cruza con tu
   archirrival en primera ronda, la lesión de tu pareja que te obliga a jugar
   con un suplente, un cambio de normativa.
3. ~~**Identidad propia del modo club**~~ **Hecho.** Filosofía que condiciona a
   quién fichas, junta con carácter, derbi con marcador y cantera con
   seguimiento de varios años (crecen hacia su techo, dejan historial y se
   marchan si los tienes ahí sin debutar).
4. ~~**Rumores que te salpiquen más**~~ **Hecho.** Un rumor confirmado sobre ti,
   sobre tu pareja o una ruptura del circuito abre ahora su propio dilema.

---

## Equilibrio: el ranking premia presentarse, no ganar

Medido jugando de verdad (con `tools/capturas.js`, cuatro temporadas, mismo
entrenamiento y misma mejora de pareja en los dos casos):

| Estrategia | Balance | Títulos | Puesto |
|---|---|---|---|
| Jugar solo las categorías bajas que se pueden ganar | 226-51 | **7** | #91 → **#95** |
| Entrar siempre al torneo más grande disponible | 89-114 | **0** | #91 → **#66** |

Es decir: **una carrera con siete títulos acaba peor clasificada que una sin
ninguno**. La causa está en dos sitios que se suman:

- `simCircuito` (state.js) da puntos a **todas** las parejas del mundo cada
  semana: `0.045·(nivel−40)² + R(−12,26)`. Una pareja de nivel 70 se lleva ~47
  puntos semanales sin jugar contra nadie, unos 2.400 por temporada.
- Ganar un Continental Bronce entero da **40 puntos**. Un Plata, 80. Para igualar
  lo que una pareja de nivel 70 gana de oficio hay que ganar un torneo por
  semana.

Como los puntos de ronda de un torneo grande superan a los de ganar uno pequeño,
la estrategia óptima es entrar donde te van a apalizar. Eso no es lo que el juego
quiere enseñar, y encima choca con el gancho de la ficha de tienda («empiezas el
91 y subes»): subir funciona, pero recompensa lo contrario de lo que parece.

Dos arreglos posibles, sin tocar el resto:

1. Que el mundo puntúe como puntúa el jugador: en vez de repartir a todos cada
   semana, que solo puntúen las parejas que «juegan» el torneo de esa semana,
   con el reparto real de la categoría (campeón, finalista, etc.).
2. Subir los puntos de las categorías bajas para que ganar un torneo compense
   frente a perder en octavos de uno grande.

La primera es la buena: la segunda tapa el síntoma.

---

## Deuda técnica conocida

- **`src/js/vendor/sql-asm.js` pesa 1,3 MB**, el 59% del juego, y es la
  compilación asm.js (la de compatibilidad). La razón histórica para no usar la
  WASM era una CSP que prohibiera `wasm-unsafe-eval`, pero la CSP actual no la
  prohíbe: se está pagando el peaje sin que haya peaje. Cambiar a la WASM debería
  bajar el arranque de forma notable.
- **Ficheros grandes**: `i18n.js` pasa de las 8.000 líneas y `career.js` de las
  1.500. Lo barato y útil sería sacar los catálogos de datos (`MARCAS`,
  `DILEMAS`, `HITOS_*`, `LESIONES`, `RASGOS`) a un `src/js/data/` propio.
- **El botón «🏆 Superliga» del menú** abre el modo directamente, en paralelo al
  sistema de invitación. El usuario decidió dejarlo: es otro modo aparte y no
  interfiere con la carrera.

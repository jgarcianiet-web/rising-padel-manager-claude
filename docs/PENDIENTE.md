# Pendiente

Cosas identificadas y decididas, que **no** están hechas. Se anotan aquí para
que no se pierdan entre commits.

---

## Lanzamiento: lo que no es código

Esto no se arregla programando y decide más ventas que la siguiente función.
Ninguna de las cuatro está empezada.

### Página de tienda
Título, descripción corta y larga, etiquetas, precio y capítulo de requisitos.
Decisión previa pendiente: **dónde** se publica. La recomendación de la
auditoría fue **itch.io a 5-8 €** (o gratis con la Superliga como expansión)
antes que Steam, para medir retención sin quemar el lanzamiento.

### Capturas
Mínimo seis, y que cuenten el juego en orden: el panel de Semana, un partido en
directo con la retransmisión, el cuadro del torneo, la ficha del jugador con sus
atributos, el periódico y la sala de trofeos. Hacerlas **en varios idiomas** para
la ficha de cada mercado. Conviene sacarlas con `tools/resoluciones.js` a 1920
para que salgan con la maquetación ancha, no con la de móvil.

### Tráiler de treinta segundos
Sin voz en off. Estructura que funciona en juegos de gestión: 5 s de partido en
directo → 8 s de decisiones (dilema, mercado, táctica) → 8 s de progresión
(ranking subiendo, títulos) → 5 s de retirada y legado → 4 s de título y precio.

### Descripción
Un párrafo de gancho y cinco viñetas. El gancho no es «un juego de pádel»: es
que **empiezas el 91 del mundo y te retiras cuando el cuerpo dice basta**.

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
3. **Identidad propia del modo club**: filosofía que condiciona qué jugadores te
   aceptan, junta con carácter (paciente, cortoplacista, tacaña), cantera con
   seguimiento de varios años, rivalidad entre clubes. Hoy comparte demasiada
   pantalla con el modo carrera. Estimación: 1-2 semanas.

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

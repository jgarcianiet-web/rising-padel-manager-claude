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

## Camino al 9/10: las siete prioridades que quedan

La primera de la lista (eventos sistémicos) ya está. Las demás, en el orden en
que se decidieron:

2. **Profundidad de la pareja.** Plan de juego conjunto que tarde semanas en
   dominarse y que se pierda al cambiar de compañero; confianza con varios ejes
   (deportiva, personal, ambición, reparto de protagonismo, lealtad, fatiga de
   convivencia); y **conversaciones que inicie el jugador**, no solo dilemas que
   llegan del sistema.
3. **Que entrenamiento y descanso dejen de ser resolubles.** Planes semanales en
   vez de clics diarios, rendimientos decrecientes por repetir el mismo golpe,
   forma temporal además de atributos permanentes, e información imperfecta del
   staff («probablemente aguante dos partidos») en vez de certezas.
4. **Economía con sumideros estratégicos.** Hoy una carrera avanzada acumula
   medio millón sin nada que hacer con él: campamento de pretemporada, analítica
   de rivales, clínica de recuperación, base en una región, academia propia.
5. **Agencia táctica y feedback en el partido.** Explicar qué hizo tu cambio
   («subir a la red te dio winners y te expuso al globo»), rival que se adapta a
   tus patrones, identidades tácticas que se noten sin abrir la ficha.
6. **Estructura competitiva propia del modo club.** Eliminatorias con varias
   parejas, alineación por rival y fatiga, cesiones, socios frente a junta.
7. **Presentación con jerarquía dramática.** Que una final no se parezca a una
   semana cualquiera: portada especial, ceremonia de retirada, audio contextual.
8. **Primer tramo de carrera más dirigido.** Primera pareja con escena, primer
   rival recurrente presentado, y un resumen a las 8-10 semanas que explique qué
   decisiones te están definiendo.

---

## Contenido: lo que sube la nota y no está hecho

Por orden de retorno, según la auditoría:

1. ~~**Triplicar los dilemas (15 → 40-45) y encadenarlos.**~~ **Hecho.** 45
   dilemas, memoria de lo vivido y lo decidido, y tres cadenas reales (el cobro
   del inversor, la operación de quien se infiltró, la conversación de quien
   rechazó la beca). De paso se triplicaron los otros catálogos que se leen más
   veces: posts de fans (32 → 98), frases de staff (24 → 72), usuarios del muro
   (14 → 30) y las frases del narrador (8 → 24, repartidas por final).
2. ~~**Eventos de temporada que no son dilemas**~~ **Hecho.** 19 eventos de
   circuito en seis alcances (semana, torneo, racha, temporada, era y propio),
   todos con efecto sobre la simulación: pista lenta, vuelo perdido, gripe,
   suplente obligatorio, público hostil, pelota nueva, altitud, crisis de
   confianza, calendario comprimido, gira, impago del patrocinador, punto de
   oro obligatorio, nueva puntuación, calendario reducido, generación
   irrepetible, caída del dominador, sorteo con la némesis, la expareja en
   prensa y el viejo entrenador contando tus patrones. Ver `engine/eventos.js`.
3. ~~**Identidad propia del modo club**~~ **Hecho.** Filosofía que condiciona a
   quién fichas, junta con carácter, derbi con marcador y cantera con
   seguimiento de varios años (crecen hacia su techo, dejan historial y se
   marchan si los tienes ahí sin debutar).
4. ~~**Rumores que te salpiquen más**~~ **Hecho.** Un rumor confirmado sobre ti,
   sobre tu pareja o una ruptura del circuito abre ahora su propio dilema.

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

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

## Camino al 9/10: hecho

Las ocho prioridades están: eventos sistémicos, profundidad de la pareja,
entrenamiento no resoluble, economía con sumideros, agencia táctica y feedback
en partido, competición propia del club, jerarquía dramática y primer tramo de
carrera dirigido. Cada una con su sección en CLAUDE.md y sus pruebas.

Lo siguiente ya no es una lista cerrada: toca **jugar carreras largas y medir**.

### Lo que apareció al medirlas (y ya está arreglado)

Jugar carreras y temporadas de club completas, sin trucar energía ni dinero,
sacó a la luz cosas que ninguna prueba de claves ni de interfaz veía:

- **El motor estaba roto de raíz.** A igualdad de nivel, el estilo
  `constructor` ganaba el 93-98% a los otros cuatro y el `bandejero` el 33% a
  todos. La causa: la dejada era el mejor golpe del juego, y el globo echaba
  siempre de la red al rival, con lo que la bola alta en la red no ocurría
  nunca y bandeja/víbora/remate eran código muerto. Arreglado y con pruebas;
  la explicación larga está en CLAUDE.md («El motor: cinco estilos y ninguna
  respuesta correcta»).
- **La deuda no tenía consecuencia.** El staff cobraba a crédito para siempre:
  seis temporadas a −117.636€ jugando igual de bien.
- **La confianza era un trinquete de un solo sentido** en el club, y encima
  asimétrico: tus jugadores cargaban las cicatrices y los rivales llegaban
  siempre a 55.

### Segunda revisión: lo que salió al medir el motor ya arreglado

- **Varios números afinados contra el motor roto se habían quedado mintiendo.**
  Arreglados: los planes de pareja (dos valían ruido y `escudo` valía −4, o sea
  que «protegerse» castigaba) y `probGana`, que predecía un 91% donde el motor
  da un 95%. Los umbrales de lectura táctica sí aguantaron sin tocarlos. **La
  lección es que hay que sospechar de TODO número calibrado antes del arreglo**:
  aparecieron tres, pueden quedar más.
- **Cuidado al medir con bots: `abrirTorneo(i)` no mira el calendario.** El
  corte vive solo en la interfaz (`pintarEventosSemana` únicamente ofrece el
  premier y el continental de esa semana). Un banco de pruebas que llame a
  `abrirTorneo` a pelo juega los Maestros las 52 semanas, y toda la medición que
  salga de ahí es basura —pasó, y daba 946.000€ y el nº1 en la temporada 12—.
  Convendría que `entradaEn` comprobara también el calendario, para que la regla
  no dependa de que quien la llame se porte bien.
- **El arco de carrera, medido bien, funciona**: primer título a los 18,
  competitivo a los 24, pico en el puesto 2 a los 28, y temporadas malas de
  verdad por el camino (#2 → #9 → #7). La caja se queda acotada (~80.000€).
- **Títulos y ranking están desacoplados, y eso está bien**, pero el contador de
  títulos deja de significar nada: el calendario reparte 52 torneos al año y una
  carrera termina con más de cien. Los puntos los deciden quince semanas (4
  Coronas, 10 Élite 1 y los Maestros suman 19.500 de los 27.090 del techo); las
  otras treinta y siete son casi irrelevantes para el ranking.
- **El nº1 es alcanzable**: el techo del jugador son 27.090 puntos al año y el
  nº1 del mundo se mueve entre 15.400 y 19.700. Pero en dos carreras honestas de
  quince temporadas el tope fue el puesto 2, así que conviene comprobar que hay
  un camino que lo consiga de verdad y no solo sobre el papel.

### Lo que queda abierto de esto

- **Regenerar las capturas y el tráiler.** Además de ser de antes de las ocho
  prioridades, los números que enseñan (puesto, títulos, marcadores) los
  produjo el motor roto. Es el mismo comando: `tools/capturas.js` y
  `tools/trailer.js`.
- **Varianza del club en la fundación.** Con una plantilla fundada a conciencia
  el primer año sale bien (8 de 10 eliminatorias medidas, socios contentos y
  caja creciendo) y en el segundo subes de división y se aprieta, que es lo que
  se busca. Pero el mercado inicial son ocho agentes al azar y un mal reparto
  todavía puede dejarte sin una primera pareja competitiva. Conviene medir
  varias fundaciones seguidas y decidir si el mercado inicial necesita un
  suelo.
- **La Superliga no usa el motor de partidos.** `engine/liga.js` resuelve todo
  con `probPunto`, una logística sobre una «fuerza» escalar: ni estilos, ni
  táctica, ni el bucle globo-bandeja, ni planes. Es un modo entero al margen de
  lo que hace bueno al juego, y además su modelo de fuerza de pareja (la media
  de los dos) contradice al que se midió para la Copa (manda el bueno y cuenta
  doble). Decidir si se engancha al motor o se asume como modo de hoja de
  cálculo.
- **Lesiones: el 20-24% de las semanas de una carrera larga.** Sale de un bot
  que entrena cuatro días y compite todas las semanas sin descansar nunca, así
  que puede ser correcto, pero no está comprobado que un jugador que gestione la
  carga baje de ahí. Merece una medición propia.
- ~~**La energía ya no aprieta arriba.**~~ **Resuelto con la gira (P3)**: la
  energía visible se recupera, pero el poso de las semanas de torneo seguidas
  no, y muerde justo la recuperación. Medido: machacar el calendario sin
  gestionarla cuesta 7-11 lesiones y quince puestos; entrenar sigue
  compensando porque la gira solo se alimenta de torneos.

---

## La hoja de ruta al 9/10 (segunda tanda)

De las prioridades 2-8 del último plan:

- **P2 · Inflación de torneos y títulos — HECHA.** El ranking cuenta los
  mejores 18 resultados (`RK_MEJORES`), el perfil enseña cifras de carrera
  (grandes títulos, finales, semanas nº1, victorias top-10) con el total bruto
  degradado, y los momentos (`momAnota`) guardan las primeras veces. Medido: el
  bot de volumen que llegaba a nº1 con 107 títulos ahora acaba 3º.
- **P8 · Arquetipos — hecha en su núcleo.** `legadoDe(...).arqs` reconoce siete
  identidades de carrera desde contadores reales; se pintan en la sala de
  trofeos. Faltan los arquetipos que piden datos que aún no se guardan (pareja
  histórica, jugador de un solo club).
- **P3 · Que las 52 semanas no sean rutina — HECHA.** La fatiga residual es
  el poso de la gira (`c.gira`): sube compitiendo (rondas, viaje lejano,
  estilo explosivo), baja en casa (menos a partir de los 30) y muerde la
  recuperación semanal y el riesgo médico. Medido: el que juega todas las
  semanas sin mirarla acaba 22º-31º con 7-11 lesiones; el que para cuando
  aprieta juega casi lo mismo y acaba top 10. Y el conflicto de calendario se
  enseña (`vocesCalendario`): la caja solo sale cuando el compañero, el
  ranking, la marca, el técnico y el cuerpo piden cosas incompatibles.
- **P4 · Staff que cambia cómo se juega — HECHA.** Cada rol tiene dos
  escuelas (`PERFILES_STAFF`) y todo técnico nace con una: el fisio preventivo
  evita la lesión y el recuperador la acorta; el psicólogo de ánimo sostiene
  las rachas y el de presión prepara los partidos que pesan (y el desempate de
  la Copa); el preparador motor da semanas y el de picos alarga la forma; el
  entrenador de pizarra acelera el plan y la cantera y el de pista exprime el
  entreno; el agente de marcas vende y el de premios negocia; el ojeador de
  cantera sube el techo de la academia y el de mercado trae mejores agentes.
  La escuela se ve al fichar (chip + qué cambia) y los guardados viejos
  funcionan como siempre. Ver «El staff tiene escuela» en CLAUDE.md.
- **P5 · Voz y memoria de personajes — HECHA.** El compañero deja
  promesas con plazo que se comprueban contra lo que haces (y las recuerda con
  su nombre al cumplirse o romperse), tiene voz semanal con doble enfriamiento
  (~9 frases por temporada, medido), y recuerda el plan («dijiste que le
  daríamos tiempo»). La némesis tiene arco por fases (herida → pulso → vuelco,
  con noticia) y epílogo en la retirada, y el staff acumula historia (desde
  cuándo, títulos juntos). Los canteranos también recuerdan: quién los
  descubrió, su debut, su primer punto ganado y el libro de la cantera con los
  que se fueron; y el que se marcha —por fuga o por venta— puede volver como
  rival: una pareja del mundo lo ficha (`canRegresaAlCircuito`), la jornada de
  Copa contra su club lo anuncia antes de alinear y el acta cierra la historia
  con su nombre.
- **P6 · Jerarquía audiovisual** — pendiente (cabeceras de momento, audio
  contextual). `pesoPartido` y `dramaGrada` son la base.
- **P7 · Tres capas de información — HECHA.** El parte de
  atención (`engine/atencion.js`) abre la pestaña Semana en carrera y club:
  capa 1 con como mucho cuatro asuntos que cambian una decisión de esta
  semana (carga, gira, defensa de puntos, pareja, promesas, caja,
  patrocinador; en club: la jornada sin cuatro sanos, el fisio, la deuda, la
  junta y la cantera), capa 2 al pulsar con números y la recomendación
  firmada por el técnico, y capa 3 saltando a la pestaña experta. La señal
  «el rival te está leyendo» también está: el patrón de tus últimos partidos
  persiste (`c.tacHist`), y si un golpe domina en 3 de 5, el siguiente rival
  sale esperándolo (`tacPreLectura` siembra `match.lectura`) y el parte lo
  avisa antes.

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

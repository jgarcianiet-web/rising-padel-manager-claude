# Plan detallado — Fase 4: SQLite como fuente de verdad

Continuación de `PLAN-SQLITE.md`. Las Fases 0–3 ya están en `main`:
persistencia + historial, proyecciones, lecturas y un modelo relacional
normalizado con migración probada por *round-trip*. La Fase 4 es el salto
grande: que **el modelo relacional sea la fuente de verdad**, no un reflejo.

> ⚠️ La Fase 4 **no es un paso incremental más**: es una reescritura del núcleo
> de persistencia. Este documento existe para decidir *si* y *cómo* hacerla, con
> los ojos abiertos.

## 1. El problema central (impedancia sync ↔ async)

- El estado del juego (`G`) es un objeto JS en memoria, leído y escrito de forma
  **síncrona** en todo el código (el bucle de partido, el render, etc.).
- `guardar()` se llama en ~50 sitios, síncrono.
- SQLite bajo Tauri es **asíncrono** (`invoke` → Rust).
- El harness de pruebas (Node) **no tiene SQLite ni Tauri**.
- El juego también corre en un navegador normal, **sin Tauri**.

"SQLite como fuente de verdad" significa que la autoridad de los datos vive en
las tablas y el juego debe leer/escribir de ahí. La colisión entre un juego
síncrono y una base asíncrona es **el** reto. No se puede convertir el juego a
`async` en 50 sitios sin un riesgo enorme.

## 2. Prerrequisitos (antes de escribir una línea)

1. **Smoke-test de un build de escritorio** que confirme que las Fases 0–3
   funcionan en runtime real (guardar, proyectar, leer 🔬, recuento del modelo
   normalizado). Hoy nada de la ruta SQLite se ha ejecutado en la app; construir
   la Fase 4 encima sin esto es construir a ciegas. **No negociable.**
2. **Un driver concreto** que justifique la Fase 4. Las Fases 0–3 ya dan
   persistencia, backups y consultas. La Fase 4 solo compensa si hay una
   necesidad real, p. ej.:
   - partidas demasiado grandes para un blob JSON (cargas parciales),
   - consultas/analítica que deban operar sobre datos vivos, no un reflejo,
   - varias partidas/carreras consultables a la vez.
   Si no hay driver, **quedarse en la Fase 3 es una decisión válida y sensata.**
3. **Cobertura de normalización completa**: hoy solo está normalizado el *mundo*
   (parejas/jugadores/atributos). Antes de mover la autoridad hay que normalizar
   también `carrera`, `clubG`, finanzas, staff, calendario, contratos y
   temporadas, cada uno con su tabla y su prueba de *round-trip*.

## 3. Rutas arquitectónicas (con sus contrapartidas)

### Ruta A — Repositorio (memoria de trabajo + SQLite autoritativo) *[nativo]*
Se mantiene una **copia de trabajo en memoria** (acceso síncrono intacto) pero
SQLite pasa a ser el **almacén persistente autoritativo**:
- **Cargar**: al arrancar la partida, leer el modelo normalizado de SQLite
  (async, un único momento discreto) y **hidratar** la copia de trabajo con
  `denormalizar()` (ya escrito y probado).
- **Jugar**: el juego muta la copia de trabajo en memoria, síncrono, sin cambios.
- **Guardar**: volcar la copia a SQLite (el `db_snapshot` de la Fase 3, ya hecho).
- La diferencia con hoy: la **autoridad** se mueve a SQLite; el blob JSON pasa a
  ser export/caché y **la carga lee de las tablas**, no del blob.
- **Pros**: preserva el bucle síncrono; reutiliza casi todo lo hecho; patrón
  estándar (BD como sistema de registro, memoria como *working set*).
- **Contras**: el harness de pruebas sigue sin poder ejercitar la BD (se queda en
  el camino de reserva); el navegador sigue sin BD; hay que introducir una
  interfaz de almacenamiento para no acoplar el juego a Tauri.

### Ruta B — sql.js (SQLite WASM en el frontend) *[recomendada si importa la testabilidad]*
Compilar SQLite a WebAssembly (sql.js) y ejecutarlo **dentro del WebView**, de
forma **síncrona** en JS; persistir los bytes de la `.db` vía Tauri (o
localStorage en navegador).
- **Pros**: resuelve **a la vez** los dos problemas — el acceso síncrono (no hay
  async que meter en el juego) **y** el del harness (sql.js corre en Node, así
  que las pruebas *sí* cubren la ruta de BD) **y** la paridad con el navegador
  (WASM corre en el navegador). Es la realización más *pura* de "SQLite como
  fuente de verdad".
- **Contras**: añade una dependencia WASM grande; conviven dos motores (WASM
  delante, `rusqlite` detrás) salvo que `rusqlite` quede como export duradero
  opcional; re-cablear la persistencia sobre sql.js es en sí un trabajo grande.

### Recomendación
- Si el objetivo es **"SQLite como fuente de verdad de verdad, testeable y con
  paridad navegador"** → **Ruta B (sql.js)**. Es más inversión inicial pero
  simplifica sync y pruebas para siempre.
- Si el objetivo es **"almacén autoritativo en escritorio con la mínima
  disrupción"** → **Ruta A**.

## 4. Sub-fases (incrementales, cada una entregable y en verde)

Sea cual sea la ruta, nunca *big-bang*:

- **4a — Camino de hidratación (leer con autoridad).** Añadir "cargar partida
  desde las tablas normalizadas" en paralelo al blob. Reconstruir el mundo con
  `denormalizar()` (ya probado). Detrás de un *flag*; verificar que el estado
  reconstruido coincide con el del blob. Sin cambio de comportamiento aún.
- **4b — Voltear la autoridad de una porción.** Que **una** entidad (p. ej. las
  parejas/jugadores del mundo) se cargue de las tablas en vez del blob; el resto
  sigue del blob. El menor volteo posible; validar a fondo.
- **4c — Migración y consistencia.** Doble escritura (blob + tablas) + un
  chequeo de consistencia (estado del blob vs estado de las tablas) + migración
  única de partidas existentes.
- **4d — Degradar el blob.** Cuando las tablas son autoritativas para una
  entidad, el blob queda como export/backup para ella. Ampliar entidad a entidad
  (carrera, clubG, finanzas, staff, calendario) hasta cubrir todo.
- **4e — Harness de pruebas.** En Ruta B es gratis (sql.js en Node). En Ruta A,
  introducir una capa de acceso con doble implementación (Tauri en la app; en
  memoria/sql.js en pruebas) para cubrir la ruta de BD.

### Estado de la 4d (entidad a entidad)

| Entidad | Tabla | PR |
|---|---|---|
| Historial de Nº1 (`n1hist`) | `norm_n1` | #51 |
| Palmarés del protagonista | `norm_palmares` | #52 |
| Diario del protagonista | `norm_diario` | #53 |
| Trayectoria por temporada (`hist`) | `norm_hist` | #54 |
| Cara a cara (`h2h`) | `norm_h2h` | #55 |
| Equipo de staff | `norm_staff` | #56 |
| Finanzas y patrocinio | `norm_finanzas`, `norm_sponsor` | #57 |
| Resto del protagonista (clave/valor JSON) | `norm_protagonista` | 4d·8 |
| Identidad del contenido (volteo de autoridad) | `norm_meta` | 4d·9 |
| Campos sueltos del mundo (`lider_*`, `nextId`…) | `norm_mundo` | 4d·10 |

Con `norm_protagonista` la cobertura del protagonista queda completa: cada
campo de `G.carrera`/`G.clubG` vive en una tabla (dedicada o clave/valor).

### Degradación del blob (4d·9) — HECHA

Al continuar partida, `hidratarDesdeSql()` (ui.js) usa **SQLite como fuente
primaria**: la tabla `norm_meta` guarda la identidad del contenido (modo +
nombre del protagonista, la BD es única y la comparten carrera y club) y, si
coincide con la partida que se carga, las entidades se adoptan de las tablas
con validación de forma — aunque el blob esté desactualizado. Si la identidad
no coincide o sql.js no está listo, se cae a la ruta de salvaguarda: el blob
manda y SQLite solo sustituye lo que coincide exactamente. `G._fuenteSql`
("sqlite"/"blob") deja el diagnóstico.

El blob JSON sigue escribiéndose en cada guardado: es el export/copia de
seguridad y la red ante corrupción de la BD.

## 5. El harness de pruebas (crítico)

Hoy las pruebas corren en un `vm` de Node con un `localStorage` falso. Si SQLite
es la fuente de verdad, las pruebas deben ejercitar una BD:
- **Ruta B**: sql.js en Node → SQLite real en pruebas. La mejor opción.
- **Ruta A**: interfaz `Storage` con dos implementaciones (Tauri/`rusqlite` en la
  app; en memoria en pruebas). Exige que el juego lea/escriba a través de la
  interfaz — un refactor real.

## 6. Migración de datos

En el primer arranque de un build con Fase 4: leer el blob existente, correr
`normalizar()`, escribir las tablas, marcar como migrado; `denormalizar()`
reconstruye al cargar. El *round-trip* de la Fase 3 ya prueba que esto no pierde
datos **para las entidades del mundo**; hay que extender la cobertura (y su
prueba) a todas las entidades antes de voltear su autoridad.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Impedancia sync/async | Copia de trabajo síncrona (Ruta A) o BD WASM síncrona (Ruta B) |
| Regresión del núcleo | Sub-fases, doble escritura + chequeo de consistencia, blob como red hasta probar cada entidad |
| Runtime sin verificar | Smoke-test previo (nº1) + auto-chequeo en la app que hace *round-trip* de la BD al arrancar |
| Alcance desbordado | Congelar la cobertura de entidades por incremento; el mundo ya está (Fase 3) |
| Dependencia WASM (Ruta B) | Evaluar tamaño/soporte antes; posible carga diferida |

## 8. Tamaño estimado

- **Ruta A**: medio-grande. Toca carga/guardado + interfaz `Storage` +
  normalización por entidad + migración. Varios PRs.
- **Ruta B**: grande al principio (introducir sql.js, re-cablear persistencia)
  pero simplifica sync y pruebas a largo plazo. Varios PRs.

## 9. Recomendación final

1. **Smoke-test primero** — sin esto, no empezar.
2. **Confirmar el driver** — si no hay una necesidad real, la Fase 3 es un buen
   sitio donde parar.
3. Si se sigue: **Ruta B (sql.js)** para un final coherente y testeable, o
   **Ruta A** para mínima disrupción; y avanzar por las sub-fases 4a→4e, una
   entidad cada vez, con las pruebas en verde en cada paso.

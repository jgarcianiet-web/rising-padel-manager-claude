# Plan de persistencia con SQLite

Este documento explica cómo está montada hoy la persistencia (Opción A) y el
camino por fases para llegar a un modelo relacional completo (Opción B) sin
reescribir el juego de golpe.

## Contexto y restricciones

- El estado del juego (`G`) es **un único objeto JS** que se serializa a JSON.
- El guardado (`guardar()`, `lsGet`, `lsSet`) es **síncrono** y se llama en
  decenas de sitios metidos en la lógica de juego.
- El acceso a SQLite desde Tauri es **asíncrono** (pasa por Rust vía `invoke`).
- Las pruebas corren en Node **sin Tauri**: no hay SQLite en ese entorno.
- El juego también debe seguir funcionando en un navegador normal.

Conclusión: no se puede convertir todo el guardado a asíncrono sin un refactor
enorme y arriesgado. Por eso vamos por fases.

## Fase 0 — Persistencia en SQLite (implementada)

SQLite actúa como **espejo duradero** detrás de la capa de guardado actual.

- `localStorage` sigue siendo la fuente de verdad síncrona durante la partida.
- En la app de escritorio, cada `guardar()` hace *write-through* a un fichero
  `rpm.db` (comando Rust `db_save`): última partida por modo + historial de las
  últimas 20 copias.
- Al arrancar, si en `localStorage` falta una partida pero SQLite la tiene, se
  restaura (`hidratarDesdeDB`).
- Fuera de Tauri (navegador/pruebas) todo es no-op → las 17 pruebas no cambian.

Tablas: `saves(modo, json, updated_at)` y `save_history(id, modo, json, saved_at)`.

Comandos Rust: `db_save`, `db_load`, `db_history`.

Beneficio inmediato: copia de seguridad en disco, transparente y restaurable,
independiente del caché del WebView. Y deja la costura para lo siguiente.

## Fase 1 — Proyecciones relacionales de solo lectura

En cada `guardar()`, además del blob, escribir **tablas derivadas** a partir del
JSON (jugadores, clubes, rankings, resultados) mediante un nuevo comando Rust
que recibe filas ya calculadas en JS. El juego **no lee** de esas tablas: son
solo para consultar/analizar (SQL, estadísticas, depuración).

- Riesgo: casi nulo (el blob sigue siendo la verdad; las tablas son un reflejo).
- Entrega: se pueden hacer consultas reales sobre la partida sin tocar la lógica.

## Fase 2 — Lecturas concretas servidas por SQLite

Migrar consultas puntuales y pesadas (p. ej. ranking mundial, histórico de
temporadas, mercado) para que lean de las tablas en vez de recorrer el objeto en
memoria. Se introduce acceso asíncrono **solo en esos puntos** (o se precalcula
al cargar), sin tocar el bucle de partido ni el guardado general.

## Fase 3 — Entidades normalizadas con capa de acceso

Modelar de verdad `jugadores`, `clubes`, `contratos`, `estadisticas`,
`temporadas`, `rankings` con claves foráneas y una capa de acceso a datos. El
blob JSON pasa a ser un *checkpoint*/caché; la escritura va a las tablas. Aquí sí
hace falta un plan de migración de datos y pruebas dedicadas del modelo.

## Fase 4 — SQLite como fuente de verdad

El juego opera contra el modelo relacional; el JSON solo se conserva para
export/import y compatibilidad. Requiere que el harness de pruebas pueda
ejercitar una capa de datos con SQLite (p. ej. `sql.js`/WASM en Node, o una capa
de acceso con doble backend memoria/SQLite).

## Principios

1. Cada fase deja el juego jugable y las pruebas verdes.
2. El blob JSON nunca se abandona hasta la Fase 4 (red de seguridad y export).
3. La asincronía se introduce por zonas, nunca de golpe en los ~50 puntos de
   guardado síncrono.

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// ================================================================
//  Persistencia en SQLite
//  ----------------------
//  El juego sigue guardando de forma síncrona en localStorage (su fuente
//  de verdad durante la partida). Además, cuando corre dentro de la app de
//  escritorio, hace un "write-through" a este SQLite: un fichero rpm.db en
//  el directorio de datos de la app, con la última partida por modo y un
//  historial de las últimas copias (para restaurar/recuperar).
// ================================================================

use rusqlite::{params, Connection};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS saves(
  modo TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS save_history(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modo TEXT NOT NULL,
  json TEXT NOT NULL,
  saved_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hist_modo ON save_history(modo, saved_at);

-- Proyecciones relacionales de solo lectura (Fase 1): reflejo consultable del
-- estado del juego. El juego NO lee de aquí; se regeneran en cada guardado.
CREATE TABLE IF NOT EXISTS proj_ranking(
  modo TEXT NOT NULL,
  pos INTEGER NOT NULL,
  pareja TEXT NOT NULL,
  sexo TEXT NOT NULL,
  nivel INTEGER NOT NULL,
  pts INTEGER NOT NULL,
  pro INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS proj_jugadores(
  modo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  sexo TEXT NOT NULL,
  lado TEXT NOT NULL,
  estilo TEXT NOT NULL,
  media INTEGER NOT NULL,
  pareja TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proj_rank ON proj_ranking(modo, sexo, pos);
CREATE INDEX IF NOT EXISTS idx_proj_jug ON proj_jugadores(modo, sexo, media);

-- Modelo relacional normalizado (Fase 3): entidades con relaciones.
-- pareja 1—N jugador 1—N atributo. El blob JSON sigue siendo la fuente de
-- verdad; esto es un reflejo normalizado y consultable (base para la Fase 4).
CREATE TABLE IF NOT EXISTS norm_pareja(
  modo TEXT NOT NULL,
  pid INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  sexo TEXT NOT NULL,
  pts INTEGER NOT NULL,
  pro INTEGER NOT NULL,
  edad INTEGER NOT NULL,
  club INTEGER NOT NULL,
  PRIMARY KEY(modo, pid)
);
CREATE TABLE IF NOT EXISTS norm_jugador(
  modo TEXT NOT NULL,
  jid TEXT NOT NULL,
  pareja_pid INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  sexo TEXT NOT NULL,
  lado INTEGER NOT NULL,
  estilo TEXT NOT NULL,
  perso TEXT NOT NULL,
  conf INTEGER NOT NULL,
  pais TEXT NOT NULL,
  PRIMARY KEY(modo, jid)
);
CREATE TABLE IF NOT EXISTS norm_atributo(
  modo TEXT NOT NULL,
  jid TEXT NOT NULL,
  clave TEXT NOT NULL,
  valor INTEGER NOT NULL,
  PRIMARY KEY(modo, jid, clave)
);
CREATE INDEX IF NOT EXISTS idx_norm_jug_par ON norm_jugador(modo, pareja_pid);
";

// Número de copias del historial que se conservan por modo.
const HISTORIAL_MAX: i64 = 20;

struct Db(Mutex<Connection>);

fn ahora() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Abre la base en disco; si no se puede (permisos, etc.), cae a una base en
/// memoria para que el juego nunca se rompa por culpa de la persistencia.
fn init_conn(app: &AppHandle) -> Connection {
    let conn = (|| -> Result<Connection, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Connection::open(dir.join("rpm.db")).map_err(|e| e.to_string())
    })()
    .unwrap_or_else(|e| {
        eprintln!("SQLite en disco no disponible ({e}); uso base en memoria");
        Connection::open_in_memory().expect("no se pudo abrir SQLite en memoria")
    });
    conn.execute_batch(SCHEMA)
        .expect("no se pudieron crear las tablas");
    conn
}

/// Guarda la partida del modo indicado y añade una copia al historial.
#[tauri::command]
fn db_save(db: tauri::State<Db>, modo: String, json: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let t = ahora();
    conn.execute(
        "INSERT INTO saves(modo, json, updated_at) VALUES(?1, ?2, ?3)
         ON CONFLICT(modo) DO UPDATE SET json = ?2, updated_at = ?3",
        params![modo, json, t],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO save_history(modo, json, saved_at) VALUES(?1, ?2, ?3)",
        params![modo, json, t],
    )
    .map_err(|e| e.to_string())?;
    // conservar solo las últimas copias por modo
    conn.execute(
        "DELETE FROM save_history WHERE modo = ?1 AND id NOT IN
           (SELECT id FROM save_history WHERE modo = ?1 ORDER BY saved_at DESC LIMIT ?2)",
        params![modo, HISTORIAL_MAX],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Devuelve la última partida guardada del modo, o null si no hay.
#[tauri::command]
fn db_load(db: tauri::State<Db>, modo: String) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    match conn.query_row(
        "SELECT json FROM saves WHERE modo = ?1",
        params![modo],
        |row| row.get::<_, String>(0),
    ) {
        Ok(s) => Ok(Some(s)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Marcas de tiempo (epoch en segundos) de las copias del historial, recientes primero.
#[tauri::command]
fn db_history(db: tauri::State<Db>, modo: String) -> Result<Vec<i64>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT saved_at FROM save_history WHERE modo = ?1 ORDER BY saved_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![modo], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

// Filas que el frontend calcula a partir del estado y envía para proyectar.
#[derive(serde::Deserialize)]
struct RankRow {
    pareja: String,
    sexo: String,
    pos: i64,
    nivel: i64,
    pts: i64,
    pro: bool,
}
#[derive(serde::Deserialize)]
struct JugRow {
    nombre: String,
    sexo: String,
    lado: String,
    estilo: String,
    media: i64,
    pareja: String,
}

/// Regenera las proyecciones relacionales de solo lectura (ranking y jugadores)
/// para un modo, en una transacción (borra e inserta). El juego no lee de ellas.
#[tauri::command]
fn db_project(
    db: tauri::State<Db>,
    modo: String,
    ranking: Vec<RankRow>,
    jugadores: Vec<JugRow>,
) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM proj_ranking WHERE modo = ?1", params![modo])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM proj_jugadores WHERE modo = ?1", params![modo])
        .map_err(|e| e.to_string())?;
    for r in &ranking {
        tx.execute(
            "INSERT INTO proj_ranking(modo, pos, pareja, sexo, nivel, pts, pro)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![modo, r.pos, r.pareja, r.sexo, r.nivel, r.pts, r.pro],
        )
        .map_err(|e| e.to_string())?;
    }
    for j in &jugadores {
        tx.execute(
            "INSERT INTO proj_jugadores(modo, nombre, sexo, lado, estilo, media, pareja)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![modo, j.nombre, j.sexo, j.lado, j.estilo, j.media, j.pareja],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Fase 2: lecturas servidas por SQLite (consultas sobre las proyecciones) ----

#[derive(serde::Serialize)]
struct TopJug {
    nombre: String,
    sexo: String,
    media: i64,
    estilo: String,
    pareja: String,
}

/// Top jugadores por media (ambos sexos), consultado sobre proj_jugadores.
#[tauri::command]
fn db_top_jugadores(db: tauri::State<Db>, modo: String, limite: i64) -> Result<Vec<TopJug>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT nombre, sexo, media, estilo, pareja FROM proj_jugadores
             WHERE modo = ?1 ORDER BY media DESC, nombre ASC LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![modo, limite], |r| {
            Ok(TopJug {
                nombre: r.get(0)?,
                sexo: r.get(1)?,
                media: r.get(2)?,
                estilo: r.get(3)?,
                pareja: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[derive(serde::Serialize)]
struct RankOut {
    pos: i64,
    pareja: String,
    nivel: i64,
    pts: i64,
    pro: bool,
}

/// Ranking de un sexo, consultado sobre proj_ranking.
#[tauri::command]
fn db_ranking(db: tauri::State<Db>, modo: String, sexo: String, limite: i64) -> Result<Vec<RankOut>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT pos, pareja, nivel, pts, pro FROM proj_ranking
             WHERE modo = ?1 AND sexo = ?2 ORDER BY pos ASC LIMIT ?3",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![modo, sexo, limite], |r| {
            Ok(RankOut {
                pos: r.get(0)?,
                pareja: r.get(1)?,
                nivel: r.get(2)?,
                pts: r.get(3)?,
                pro: r.get::<_, i64>(4)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

// ---- Fase 3: modelo relacional normalizado (escritura del snapshot) ----

#[derive(serde::Deserialize)]
struct ParejaNorm {
    pid: i64,
    nombre: String,
    sexo: String,
    pts: i64,
    pro: bool,
    edad: i64,
    club: i64,
}
#[derive(serde::Deserialize)]
struct JugNorm {
    jid: String,
    pareja_pid: i64,
    nombre: String,
    sexo: String,
    lado: i64,
    estilo: String,
    perso: String,
    conf: i64,
    pais: String,
}
#[derive(serde::Deserialize)]
struct AttrNorm {
    jid: String,
    clave: String,
    valor: i64,
}

/// Vuelca el estado a las tablas normalizadas (pareja/jugador/atributo) en una
/// transacción, reemplazando el snapshot anterior del modo.
#[tauri::command]
fn db_snapshot(
    db: tauri::State<Db>,
    modo: String,
    parejas: Vec<ParejaNorm>,
    jugadores: Vec<JugNorm>,
    atributos: Vec<AttrNorm>,
) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM norm_atributo WHERE modo = ?1", params![modo])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM norm_jugador WHERE modo = ?1", params![modo])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM norm_pareja WHERE modo = ?1", params![modo])
        .map_err(|e| e.to_string())?;
    for p in &parejas {
        tx.execute(
            "INSERT INTO norm_pareja(modo, pid, nombre, sexo, pts, pro, edad, club)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![modo, p.pid, p.nombre, p.sexo, p.pts, p.pro, p.edad, p.club],
        )
        .map_err(|e| e.to_string())?;
    }
    for j in &jugadores {
        tx.execute(
            "INSERT INTO norm_jugador(modo, jid, pareja_pid, nombre, sexo, lado, estilo, perso, conf, pais)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![modo, j.jid, j.pareja_pid, j.nombre, j.sexo, j.lado, j.estilo, j.perso, j.conf, j.pais],
        )
        .map_err(|e| e.to_string())?;
    }
    for a in &atributos {
        tx.execute(
            "INSERT INTO norm_atributo(modo, jid, clave, valor) VALUES(?1, ?2, ?3, ?4)",
            params![modo, a.jid, a.clave, a.valor],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize)]
struct NormStats {
    parejas: i64,
    jugadores: i64,
    atributos: i64,
}

/// Recuento de filas del modelo normalizado (para mostrar que está poblado).
#[tauri::command]
fn db_norm_stats(db: tauri::State<Db>, modo: String) -> Result<NormStats, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let parejas: i64 = conn
        .query_row("SELECT COUNT(*) FROM norm_pareja WHERE modo = ?1", params![modo], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let jugadores: i64 = conn
        .query_row("SELECT COUNT(*) FROM norm_jugador WHERE modo = ?1", params![modo], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let atributos: i64 = conn
        .query_row("SELECT COUNT(*) FROM norm_atributo WHERE modo = ?1", params![modo], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(NormStats { parejas, jugadores, atributos })
}

// ---- Fase 4a: leer de vuelta el modelo normalizado (hidratación) ----

#[derive(serde::Serialize)]
struct ParejaOut {
    pid: i64,
    nombre: String,
    sexo: String,
    pts: i64,
    pro: bool,
    edad: i64,
    club: i64,
}
#[derive(serde::Serialize)]
struct JugOut {
    jid: String,
    pareja_pid: i64,
    nombre: String,
    sexo: String,
    lado: i64,
    estilo: String,
    perso: String,
    conf: i64,
    pais: String,
}
#[derive(serde::Serialize)]
struct AttrOut {
    jid: String,
    clave: String,
    valor: i64,
}
#[derive(serde::Serialize)]
struct Snapshot {
    parejas: Vec<ParejaOut>,
    jugadores: Vec<JugOut>,
    atributos: Vec<AttrOut>,
}

/// Devuelve el modelo normalizado completo de un modo, para reconstruir el
/// estado desde la base (base de la Fase 4: SQLite como fuente de verdad).
#[tauri::command]
fn db_read_snapshot(db: tauri::State<Db>, modo: String) -> Result<Snapshot, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut sp = conn
        .prepare("SELECT pid, nombre, sexo, pts, pro, edad, club FROM norm_pareja WHERE modo = ?1 ORDER BY pid")
        .map_err(|e| e.to_string())?;
    let parejas = sp
        .query_map(params![modo], |r| {
            Ok(ParejaOut {
                pid: r.get(0)?,
                nombre: r.get(1)?,
                sexo: r.get(2)?,
                pts: r.get(3)?,
                pro: r.get::<_, i64>(4)? != 0,
                edad: r.get(5)?,
                club: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut sj = conn
        .prepare("SELECT jid, pareja_pid, nombre, sexo, lado, estilo, perso, conf, pais FROM norm_jugador WHERE modo = ?1 ORDER BY jid")
        .map_err(|e| e.to_string())?;
    let jugadores = sj
        .query_map(params![modo], |r| {
            Ok(JugOut {
                jid: r.get(0)?,
                pareja_pid: r.get(1)?,
                nombre: r.get(2)?,
                sexo: r.get(3)?,
                lado: r.get(4)?,
                estilo: r.get(5)?,
                perso: r.get(6)?,
                conf: r.get(7)?,
                pais: r.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut sa = conn
        .prepare("SELECT jid, clave, valor FROM norm_atributo WHERE modo = ?1")
        .map_err(|e| e.to_string())?;
    let atributos = sa
        .query_map(params![modo], |r| {
            Ok(AttrOut {
                jid: r.get(0)?,
                clave: r.get(1)?,
                valor: r.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(Snapshot { parejas, jugadores, atributos })
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = init_conn(app.handle());
            app.manage(Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db_save,
            db_load,
            db_history,
            db_project,
            db_top_jugadores,
            db_ranking,
            db_snapshot,
            db_norm_stats,
            db_read_snapshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running Rising Pádel Manager");
}

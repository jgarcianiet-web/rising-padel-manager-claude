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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = init_conn(app.handle());
            app.manage(Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![db_save, db_load, db_history, db_project])
        .run(tauri::generate_context!())
        .expect("error while running Rising Pádel Manager");
}

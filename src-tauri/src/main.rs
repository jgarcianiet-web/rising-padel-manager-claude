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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = init_conn(app.handle());
            app.manage(Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![db_save, db_load, db_history])
        .run(tauri::generate_context!())
        .expect("error while running Rising Pádel Manager");
}

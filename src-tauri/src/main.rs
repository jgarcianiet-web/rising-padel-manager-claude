// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Tauri se usa únicamente como empaquetador (genera los instaladores de
// Windows y macOS). Toda la base de datos vive en el frontend con sql.js
// (SQLite compilado a JS), así que aquí no hay lógica nativa.

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Rising Pádel Manager");
}

#!/usr/bin/env node
/* Ejecuta la batería de pruebas del juego y devuelve código de error si algo falla.
   Uso:  npm test                                                            */

const fs = require("fs");
const path = require("path");
const { ejecutar } = require("./harness");

const casos = fs.readFileSync(path.join(__dirname, "casos.js"), "utf8");

console.log("\n  Rising Games · pruebas de Pádel Manager\n");

(async () => {
  let res = [];

  // 1) Pruebas del juego (en un vm que emula el navegador, sin SQLite).
  let sandbox;
  try {
    sandbox = ejecutar(casos);
  } catch (e) {
    console.error("  ✗ El juego ni siquiera arranca:\n   ", e.message, "\n");
    process.exit(1);
  }
  res = res.concat(sandbox.RESULTADOS || []);

  // 2) Pruebas de la capa SQLite (Ruta B) contra sql.js REAL en Node.
  try {
    const pruebasSql = require("./db-sqljs");
    res = res.concat(await pruebasSql());
  } catch (e) {
    res.push({ nombre: "sql.js (Ruta B) no disponible", ok: false, detalle: e.message });
  }

  let fallos = 0;
  for (const r of res) {
    if (r.ok) {
      console.log("  ✓ " + r.nombre + (r.detalle ? "  ·  " + r.detalle : ""));
    } else {
      fallos++;
      console.log("  ✗ " + r.nombre + "\n      " + r.detalle);
    }
  }

  console.log("\n  " + (res.length - fallos) + "/" + res.length + " pruebas superadas\n");
  if (!res.length) { console.error("  No se ejecutó ninguna prueba.\n"); process.exit(1); }
  process.exit(fallos ? 1 : 0);
})();

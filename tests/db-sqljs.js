/* Pruebas de la capa SQLite (Ruta B) contra sql.js REAL en Node.
   A diferencia de las pruebas del juego (que corren en un vm sin SQLite),
   esto ejercita una base de datos SQLite de verdad: por fin la ruta de BD
   queda cubierta por las pruebas. Devuelve una lista de resultados. */
const path = require("path");
const initSqlJs = require(path.join(__dirname, "..", "src", "js", "vendor", "sql-asm.js"));
const db = require(path.join(__dirname, "..", "src", "js", "db.js"));

module.exports = async function ejecutarPruebasSql() {
  const res = [];
  const chk = (cond, nombre, detalle) => res.push({ nombre, ok: !!cond, detalle: cond ? (detalle || "") : (detalle || "no se cumple") });

  const SQL = await initSqlJs();
  const d = new SQL.Database();
  db.dbSqlSchema(d);

  const snap = {
    parejas: [
      { pid: 1, nombre: "A / B", sexo: "M", pts: 2000, pro: true, edad: 25, club: 3, extras: JSON.stringify({ _titulos: 3, retiraT: 41 }) },
      { pid: 2, nombre: "C / D", sexo: "F", pts: 1500, pro: false, edad: 22, club: 5, extras: "{}" },
    ],
    jugadores: [
      { jid: "1-0", pareja_pid: 1, nombre: "A", sexo: "M", lado: 0, estilo: "agresivo", perso: "frio", conf: 60, pais: "ES", extras: JSON.stringify({ _ropa: "#123456" }) },
      { jid: "1-1", pareja_pid: 1, nombre: "B", sexo: "M", lado: 1, estilo: "rematador", perso: "valiente", conf: 55, pais: "AR", extras: "{}" },
    ],
    atributos: [
      { jid: "1-0", clave: "remate", valor: 90 },
      { jid: "1-0", clave: "fondo", valor: 80 },
    ],
  };

  db.dbSqlGuardarSnapshot(d, snap);
  db.dbSqlGuardarSnapshot(d, snap); // reproyectar: debe REEMPLAZAR, no acumular
  const back = db.dbSqlLeerSnapshot(d);

  chk(back.parejas.length === 2, "sql.js · round-trip: 2 parejas", back.parejas.length + " parejas");
  chk(back.jugadores.length === 2, "sql.js · round-trip: 2 jugadores");
  chk(back.atributos.length === 2, "sql.js · round-trip: 2 atributos (reemplaza, no acumula)");
  chk(back.parejas[0].nombre === "A / B" && back.parejas[0].pro === true, "sql.js · campos y pro:bool reconstruidos");
  // los extras (campos no modelados) sobreviven el round-trip por SQLite
  const ep = JSON.parse(back.parejas[0].extras || "{}");
  const ej = JSON.parse((back.jugadores.find(j => j.jid === "1-0") || {}).extras || "{}");
  chk(ep._titulos === 3 && ep.retiraT === 41, "sql.js · extras de la pareja sobreviven", JSON.stringify(ep));
  chk(ej._ropa === "#123456", "sql.js · extras del jugador sobreviven");

  // consulta relacional real (JOIN) sobre sql.js
  const r = d.exec("SELECT AVG(a.valor) FROM norm_jugador j JOIN norm_atributo a ON a.jid=j.jid WHERE j.pareja_pid=1");
  const media = r[0] ? r[0].values[0][0] : null;
  chk(Math.abs(media - 85) < 0.001, "sql.js · JOIN pareja→jugador→atributo (media 85)", "media=" + media);

  // persistencia: exportar bytes y reabrir
  const bytes = d.export();
  const d2 = new SQL.Database(bytes);
  const n = d2.exec("SELECT COUNT(*) FROM norm_pareja")[0].values[0][0];
  chk(n === 2, "sql.js · export/import de bytes conserva los datos", n + " parejas tras reabrir");

  return res;
};

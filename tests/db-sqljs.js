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

  // ---------- analítica: consultas sobre el modelo normalizado ----------
  // se puebla una BD nueva con datos con relieve (dos estilos, dos países, medias distintas)
  const da = new SQL.Database(); db.dbSqlSchema(da);
  const snapA = {
    parejas: [
      { pid: 1, nombre: "Alta / Alta", sexo: "M", pts: 0, pro: true, edad: 26, club: 1, extras: "{}" },
      { pid: 2, nombre: "Baja / Baja", sexo: "F", pts: 0, pro: false, edad: 20, club: 2, extras: "{}" },
    ],
    jugadores: [
      { jid: "1-0", pareja_pid: 1, nombre: "Ana", sexo: "M", lado: 0, estilo: "agresivo", perso: "frio", conf: 60, pais: "ES", extras: "{}" },
      { jid: "1-1", pareja_pid: 1, nombre: "Ben", sexo: "M", lado: 1, estilo: "agresivo", perso: "frio", conf: 60, pais: "ES", extras: "{}" },
      { jid: "2-0", pareja_pid: 2, nombre: "Cal", sexo: "F", lado: 0, estilo: "defensivo", perso: "frio", conf: 60, pais: "AR", extras: "{}" },
      { jid: "2-1", pareja_pid: 2, nombre: "Dan", sexo: "F", lado: 1, estilo: "defensivo", perso: "frio", conf: 60, pais: "AR", extras: "{}" },
    ],
    atributos: [
      { jid: "1-0", clave: "remate", valor: 90 }, { jid: "1-1", clave: "remate", valor: 80 }, // pareja 1: media 85 (élite/bueno)
      { jid: "2-0", clave: "fondo", valor: 40 }, { jid: "2-1", clave: "fondo", valor: 30 },   // pareja 2: media 35 (flojo)
    ],
  };
  db.dbSqlGuardarSnapshot(da, snapA);

  const est = db.dbSqlPorEstilo(da);
  chk(est.length === 2 && est[0].estilo === "agresivo" && est[0].media === 85 && est[0].n === 2,
    "analítica · nivel medio por estilo (agresivo lidera con 85)", JSON.stringify(est));

  const par = db.dbSqlMejoresParejas(da, 8);
  chk(par.length === 2 && par[0].pareja === "Alta / Alta" && par[0].media === 85 && par[1].media === 35,
    "analítica · mejores parejas por media conjunta", par.map(p => p.pareja + ":" + p.media).join(", "));

  const pais = db.dbSqlTopPaises(da, 8);
  chk(pais.length === 2 && pais[0].pais === "ES" && pais[0].media === 85 && pais[0].n === 2,
    "analítica · mejores nacionalidades (ES 85, AR 35)", pais.map(p => p.pais + ":" + p.media).join(", "));

  const dis = db.dbSqlDistribucionNivel(da);
  const eliteN = dis[0].n, flojoN = dis[4].n;   // jugadores: medias 90, 80 (élite) y 40, 30 (flojo)
  chk(dis.length === 5 && eliteN === 2 && flojoN === 2,
    "analítica · distribución por banda de nivel (2 élite, 2 flojos)", dis.map(b => b.k + ":" + b.n).join(" · "));

  // sin datos: no revienta, devuelve vacío
  const vacia = new SQL.Database(); db.dbSqlSchema(vacia);
  chk(db.dbSqlPorEstilo(vacia).length === 0 && db.dbSqlMejoresParejas(vacia).length === 0,
    "analítica · sin datos las consultas devuelven vacío, no error");

  // ---------- guardia de consistencia (Fase 4c) ----------
  // `d` tiene el snapshot `snap` (2 parejas, 2 jugadores, 2 atributos)
  chk(db.dbSqlSnapshotCoincide(d, snap).ok === true,
    "4c · guardia: las tablas coinciden con el estado vivo");
  // divergencia por recuento: en lo esperado sobra una pareja
  const snapMas = { parejas: snap.parejas.concat([{ pid: 9, nombre: "X / Y", sexo: "M", pts: 0, pro: false, edad: 20, club: -1, extras: "{}" }]), jugadores: snap.jugadores, atributos: snap.atributos };
  chk(db.dbSqlSnapshotCoincide(d, snapMas).ok === false,
    "4c · guardia: detecta divergencia de recuento", db.dbSqlSnapshotCoincide(d, snapMas).msg);
  // divergencia por clave: mismo recuento pero un pid cambiado
  const snapPid = { parejas: [Object.assign({}, snap.parejas[0], { pid: 99 }), snap.parejas[1]], jugadores: snap.jugadores, atributos: snap.atributos };
  chk(db.dbSqlSnapshotCoincide(d, snapPid).ok === false,
    "4c · guardia: detecta una clave de pareja cambiada");
  // sin base: no lanza, informa ok:false
  chk(db.dbSqlSnapshotCoincide(null, snap).ok === false,
    "4c · guardia: sin base devuelve ok:false, no error");

  // ---------- historial de Nº1 (Fase 4d) ----------
  const n1 = [
    { t: 0, nombre: "Ana", pts: 5000, yo: false, sexo: "F" },
    { t: 1, nombre: "Tú", pts: 6200, yo: true, sexo: "M" },
    { t: 2, nombre: "Bea", pts: 5800, yo: false, sexo: "F" },
  ];
  db.dbSqlGuardarN1(d, n1);
  db.dbSqlGuardarN1(d, n1); // reproyectar: debe REEMPLAZAR, no acumular
  const n1b = db.dbSqlLeerN1(d);
  chk(n1b.length === 3, "4d · n1: round-trip conserva 3 temporadas (reemplaza, no acumula)", n1b.length + " filas");
  chk(n1b[0].t === 0 && n1b[1].t === 1 && n1b[2].t === 2, "4d · n1: orden por temporada preservado");
  chk(n1b[1].nombre === "Tú" && n1b[1].yo === true && n1b[1].pts === 6200, "4d · n1: campos y yo:bool reconstruidos");
  chk(n1b[0].sexo === "F" && n1b[2].sexo === "F", "4d · n1: sexo conservado");
  // lista vacía: no falla y deja la tabla vacía
  db.dbSqlGuardarN1(d, []);
  chk(db.dbSqlLeerN1(d).length === 0, "4d · n1: lista vacía deja la tabla vacía");

  // ---------- palmarés del protagonista (Fase 4d·2) ----------
  const pal = ["Open Madrid (T1)", "MAJOR París (T2)", "Premier Roma — pareja B (T2)"];
  db.dbSqlGuardarPalmares(d, pal);
  db.dbSqlGuardarPalmares(d, pal); // reproyectar: debe REEMPLAZAR, no acumular
  const palb = db.dbSqlLeerPalmares(d);
  chk(palb.length === 3, "4d · palmarés: round-trip conserva 3 títulos (reemplaza, no acumula)", palb.length + " filas");
  chk(palb[0] === pal[0] && palb[1] === pal[1] && palb[2] === pal[2],
    "4d · palmarés: títulos y orden de inserción preservados", JSON.stringify(palb));
  chk(palb[2].includes("—"), "4d · palmarés: caracteres no ASCII sobreviven");
  db.dbSqlGuardarPalmares(d, []);
  chk(db.dbSqlLeerPalmares(d).length === 0, "4d · palmarés: lista vacía deja la tabla vacía");

  // ---------- diario del protagonista (Fase 4d·3) ----------
  // el diario vive con la entrada MÁS RECIENTE primero; el round-trip debe ser identidad
  const dia = ["📰 Nuevo nº1 del circuito.", "💶 Cobras 300€ del sponsor.", "🎾 Victoria en primera ronda."];
  db.dbSqlGuardarDiario(d, dia);
  db.dbSqlGuardarDiario(d, dia); // reproyectar: debe REEMPLAZAR, no acumular
  const diab = db.dbSqlLeerDiario(d);
  chk(diab.length === 3, "4d · diario: round-trip conserva 3 entradas (reemplaza, no acumula)", diab.length + " filas");
  chk(diab[0] === dia[0] && diab[2] === dia[2], "4d · diario: orden (reciente primero) preservado", JSON.stringify(diab));
  chk(diab[0].includes("📰") && diab[1].includes("€"), "4d · diario: emojis y símbolos sobreviven");
  db.dbSqlGuardarDiario(d, []);
  chk(db.dbSqlLeerDiario(d).length === 0, "4d · diario: lista vacía deja la tabla vacía");

  // ---------- trayectoria por temporada (Fase 4d·4) ----------
  const hist = [
    { t: 1, pos: 38, pts: 410, tit: 0 },
    { t: 2, pos: 17, pts: 1980, tit: 1 },
    { t: 3, pos: 4, pts: 5120, tit: 3 },
  ];
  db.dbSqlGuardarHist(d, hist);
  db.dbSqlGuardarHist(d, hist); // reproyectar: debe REEMPLAZAR, no acumular
  const histb = db.dbSqlLeerHist(d);
  chk(histb.length === 3, "4d · hist: round-trip conserva 3 temporadas (reemplaza, no acumula)", histb.length + " filas");
  chk(histb[0].t === 1 && histb[2].t === 3, "4d · hist: orden cronológico preservado");
  chk(histb[1].pos === 17 && histb[1].pts === 1980 && histb[1].tit === 1,
    "4d · hist: campos pos/pts/tit reconstruidos", JSON.stringify(histb[1]));
  db.dbSqlGuardarHist(d, []);
  chk(db.dbSqlLeerHist(d).length === 0, "4d · hist: lista vacía deja la tabla vacía");

  // ---------- cara a cara contra rivales (Fase 4d·5) ----------
  // mapa id_rival → {v,d,n,ultT,alta}; `alta` solo existe si es >0
  const h2h = {
    "7": { v: 3, d: 1, n: "Gabán/Chingorro", ultT: 2, alta: 2 },
    "12": { v: 0, d: 2, n: "Sánchiz/Ustera", ultT: 1 },
  };
  db.dbSqlGuardarH2h(d, h2h);
  db.dbSqlGuardarH2h(d, h2h); // reproyectar: debe REEMPLAZAR, no acumular
  const h2hb = db.dbSqlLeerH2h(d);
  chk(Object.keys(h2hb).length === 2, "4d · h2h: round-trip conserva 2 rivales (reemplaza, no acumula)");
  chk(h2hb["7"].v === 3 && h2hb["7"].d === 1 && h2hb["7"].n === "Gabán/Chingorro" && h2hb["7"].ultT === 2,
    "4d · h2h: marcador, nombre y última temporada reconstruidos", JSON.stringify(h2hb["7"]));
  chk(h2hb["7"].alta === 2 && !("alta" in h2hb["12"]),
    "4d · h2h: `alta` solo se materializa si es >0 (round-trip identidad)");
  db.dbSqlGuardarH2h(d, {});
  chk(Object.keys(db.dbSqlLeerH2h(d)).length === 0, "4d · h2h: mapa vacío deja la tabla vacía");

  // ---------- equipo de staff contratado (Fase 4d·6) ----------
  // mapa rol → miembro o null (puesto vacío); solo se persisten los ocupados
  const staff = {
    entrenador: { rol: "entrenador", n: "Marta Vidal", sexo: "F", edad: 48, niv: 4, sal: 620,
      esp: ["remate", "vibora", "bandeja"], frase: "Pizarra vieja, ideas nuevas.", equipoDe: "Gabán/Chingorro" },
    rep: { rol: "rep", n: "Luis Roca", sexo: "M", edad: 55, niv: 3, sal: 300, com: 14, frase: "Negocia al cuerpo." },
    fisio: null, psico: null, fisico: null,
  };
  db.dbSqlGuardarStaff(d, staff);
  db.dbSqlGuardarStaff(d, staff); // reproyectar: debe REEMPLAZAR, no acumular
  const stb = db.dbSqlLeerStaff(d);
  chk(Object.keys(stb).length === 2, "4d · staff: solo persisten los puestos ocupados (2 de 5)", Object.keys(stb).join(","));
  chk(stb.entrenador.n === "Marta Vidal" && stb.entrenador.niv === 4 && stb.entrenador.sal === 620,
    "4d · staff: campos modelados reconstruidos");
  chk(Array.isArray(stb.entrenador.esp) && stb.entrenador.esp[1] === "vibora" && stb.entrenador.equipoDe === "Gabán/Chingorro",
    "4d · staff: extras (esp[], equipoDe) sobreviven en el JSON", JSON.stringify(stb.entrenador.esp));
  chk(stb.rep.com === 14 && stb.rep.frase === "Negocia al cuerpo.", "4d · staff: comisión y frase del agente sobreviven");
  db.dbSqlGuardarStaff(d, { entrenador: null, rep: null });
  chk(Object.keys(db.dbSqlLeerStaff(d)).length === 0, "4d · staff: equipo vacío deja la tabla vacía");

  // ---------- finanzas y patrocinio (Fase 4d·7) ----------
  db.dbSqlGuardarFinanzas(d, { dinero: 3175 });
  db.dbSqlGuardarFinanzas(d, { dinero: 3175 }); // reproyectar: reemplaza
  chk(db.dbSqlLeerFinanzas(d).dinero === 3175, "4d · finanzas: dinero persiste y se reconstruye");
  db.dbSqlGuardarFinanzas(d, { dinero: -420 });
  chk(db.dbSqlLeerFinanzas(d).dinero === -420, "4d · finanzas: caja en negativo sobrevive");

  const patro = { marca: "PadelPro", sec: "material", tier: 3, sem: 180, bonus: 900, objetivo: 12,
    tRest: 40, durTotal: 52, primas: [["top20", "entrar en el top 20", 500]], primasCobradas: { top20: true }, spots: 2 };
  const ofertas = [
    { marca: "Ibercaña", sec: "banca", tier: 2, sem: 110, bonus: 400, objetivo: 20 },
    { marca: "VoleaZero", sec: "ropa", tier: 1, sem: 60, bonus: 150, objetivo: 30 },
  ];
  db.dbSqlGuardarSponsor(d, patro, ofertas);
  db.dbSqlGuardarSponsor(d, patro, ofertas); // reproyectar: reemplaza
  const spb = db.dbSqlLeerSponsor(d);
  chk(spb.actual && spb.actual.marca === "PadelPro" && spb.actual.tier === 3 && spb.actual.sem === 180,
    "4d · sponsor: contrato vigente reconstruido");
  chk(spb.actual.primas.length === 1 && spb.actual.primas[0][2] === 500 && spb.actual.primasCobradas.top20 === true && spb.actual.tRest === 40,
    "4d · sponsor: primas, cobradas y semanas restantes sobreviven en extras", JSON.stringify(spb.actual.primas));
  chk(spb.ofertas.length === 2 && spb.ofertas[0].marca === "Ibercaña" && spb.ofertas[1].sem === 60,
    "4d · sponsor: ofertas sobre la mesa en orden (reemplaza, no acumula)");
  db.dbSqlGuardarSponsor(d, null, []);
  const spv = db.dbSqlLeerSponsor(d);
  chk(spv.actual === null && spv.ofertas.length === 0, "4d · sponsor: sin contrato ni ofertas deja la tabla vacía");

  // ---------- resto del protagonista (Fase 4d·8, cierre) ----------
  // clave/valor JSON: números, strings, booleanos, null y objetos anidados;
  // las claves con tabla dedicada (palmares, staff, dinero...) se excluyen
  const prota = {
    nombre: "Río Vera", semana: 17, edad: 19, pts: 2450, energia: 82.5, conf: 61, pro: false,
    lesion: null, racha: [1, 1, 0, 1],
    compi: { n: "Chino", quim: 74, attrs: { saque: 55, remate: 61 } },
    objetivos: [{ id: "top30", done: false }],
    palmares: ["NO debe persistir aquí"], dinero: 9999, staff: { entrenador: null },
  };
  db.dbSqlGuardarProta(d, prota);
  db.dbSqlGuardarProta(d, prota); // reproyectar: debe REEMPLAZAR, no acumular
  const prb = db.dbSqlLeerProta(d);
  chk(!("palmares" in prb) && !("dinero" in prb) && !("staff" in prb),
    "4d · prota: las claves con tabla dedicada se excluyen", Object.keys(prb).join(","));
  chk(prb.nombre === "Río Vera" && prb.semana === 17 && prb.energia === 82.5 && prb.pro === false && prb.lesion === null,
    "4d · prota: escalares (número, string, booleano, null) reconstruidos");
  chk(prb.compi.attrs.remate === 61 && prb.racha.length === 4 && prb.objetivos[0].id === "top30",
    "4d · prota: objetos anidados (compi.attrs, racha, objetivos) sobreviven");
  chk(Object.keys(prb).length === Object.keys(prota).length - 3,
    "4d · prota: cobertura completa del resto de claves (reemplaza, no acumula)");
  db.dbSqlGuardarProta(d, {});
  chk(Object.keys(db.dbSqlLeerProta(d)).length === 0, "4d · prota: protagonista vacío deja la tabla vacía");

  // ---------- identidad del contenido (Fase 4d·9) ----------
  db.dbSqlGuardarMeta(d, { modo: "carrera", prota: "Río Vera" });
  db.dbSqlGuardarMeta(d, { modo: "carrera", prota: "Río Vera" }); // reemplaza, no acumula
  const meta = db.dbSqlLeerMeta(d);
  chk(meta.modo === "carrera" && meta.prota === "Río Vera", "4d·9 · meta: identidad modo+protagonista round-trip", JSON.stringify(meta));
  db.dbSqlGuardarMeta(d, { modo: "club", prota: "Rising Pádel Club" });
  const meta2 = db.dbSqlLeerMeta(d);
  chk(meta2.modo === "club" && Object.keys(meta2).length === 2, "4d·9 · meta: reescribir cambia la identidad sin residuos");

  // ---------- campos sueltos del mundo (Fase 4d·10) ----------
  const mundo = { parejas: [{ id: 1 }], n1hist: [{ t: 1 }], lider_M: 7, lider_F: 12, nextId: 104, _extra: { a: [1, 2] } };
  db.dbSqlGuardarMundoKV(d, mundo);
  db.dbSqlGuardarMundoKV(d, mundo); // reproyectar: reemplaza, no acumula
  const kv = db.dbSqlLeerMundoKV(d);
  chk(!("parejas" in kv) && !("n1hist" in kv), "4d·10 · mundo: las claves con tabla dedicada se excluyen", Object.keys(kv).join(","));
  chk(kv.lider_M === 7 && kv.lider_F === 12 && kv.nextId === 104, "4d·10 · mundo: líderes y nextId reconstruidos");
  chk(kv._extra && kv._extra.a[1] === 2, "4d·10 · mundo: valores anidados sobreviven al JSON");
  db.dbSqlGuardarMundoKV(d, { parejas: [] });
  chk(Object.keys(db.dbSqlLeerMundoKV(d)).length === 0, "4d·10 · mundo: sin campos sueltos deja la tabla vacía");

  return res;
};

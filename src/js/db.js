/* ================================================================
   Fase 4 (Ruta B): SQLite en el frontend con sql.js
   ----------------------------------------------------------------
   sql.js es SQLite compilado a JS (sql-asm.js), síncrono, que funciona
   igual en el navegador, en la app Tauri y en Node (las pruebas). Esto
   nos da una base de datos SQLite REAL accesible de forma síncrona, sin
   la barrera async de invocar a Rust.

   Este módulo es aditivo: si sql.js no está cargado (o falla), todo es
   no-op y el juego sigue funcionando con el blob de siempre. Las
   funciones de esquema/lectura/escritura son puras (reciben el handle de
   la BD), por eso se pueden probar directamente en Node.
================================================================ */

// La columna `extras` (JSON) guarda cualquier campo persistente NO modelado en
// columnas propias, para que el round-trip sea lossless por construcción (sobreviva
// el campo que sea, ahora o en el futuro: _titulos, retiraT, _ropa, etc.).
const DB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS norm_pareja(
  pid INTEGER PRIMARY KEY, nombre TEXT, sexo TEXT, pts INTEGER, pro INTEGER, edad INTEGER, club INTEGER, extras TEXT);
CREATE TABLE IF NOT EXISTS norm_jugador(
  jid TEXT PRIMARY KEY, pareja_pid INTEGER, nombre TEXT, sexo TEXT, lado INTEGER,
  estilo TEXT, perso TEXT, conf INTEGER, pais TEXT, extras TEXT);
CREATE TABLE IF NOT EXISTS norm_atributo(
  jid TEXT, clave TEXT, valor INTEGER, PRIMARY KEY(jid, clave));
CREATE INDEX IF NOT EXISTS idx_njp ON norm_jugador(pareja_pid);
`;

function dbSqlSchema(db){ db.run(DB_SCHEMA_SQL); }

// Vuelca un snapshot normalizado (parejas/jugadores/atributos) en la BD, en una
// transacción, reemplazando el anterior.
function dbSqlGuardarSnapshot(db, snap){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_atributo; DELETE FROM norm_jugador; DELETE FROM norm_pareja;");
    let st=db.prepare("INSERT INTO norm_pareja VALUES(?,?,?,?,?,?,?,?)");
    (snap.parejas||[]).forEach(p=>st.run([p.pid,p.nombre||"",p.sexo||"M",p.pts|0,p.pro?1:0,p.edad|0,(p.club==null?-1:p.club),p.extras||"{}"])); st.free();
    st=db.prepare("INSERT INTO norm_jugador VALUES(?,?,?,?,?,?,?,?,?,?)");
    (snap.jugadores||[]).forEach(j=>st.run([j.jid,j.pareja_pid,j.nombre||"",j.sexo||"M",j.lado|0,j.estilo||"",j.perso||"",j.conf|0,j.pais||"",j.extras||"{}"])); st.free();
    st=db.prepare("INSERT INTO norm_atributo VALUES(?,?,?)");
    (snap.atributos||[]).forEach(a=>st.run([a.jid,a.clave,a.valor|0])); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}

// Lee el snapshot de la BD en la misma forma que produce normalizar().
function dbSqlLeerSnapshot(db){
  const out={parejas:[],jugadores:[],atributos:[]};
  const q=(sql,cb)=>{ const r=db.exec(sql); if(r&&r[0]) r[0].values.forEach(cb); };
  q("SELECT pid,nombre,sexo,pts,pro,edad,club,extras FROM norm_pareja ORDER BY pid",
    v=>out.parejas.push({pid:v[0],nombre:v[1],sexo:v[2],pts:v[3],pro:!!v[4],edad:v[5],club:v[6],extras:v[7]}));
  q("SELECT jid,pareja_pid,nombre,sexo,lado,estilo,perso,conf,pais,extras FROM norm_jugador ORDER BY jid",
    v=>out.jugadores.push({jid:v[0],pareja_pid:v[1],nombre:v[2],sexo:v[3],lado:v[4],estilo:v[5],perso:v[6],conf:v[7],pais:v[8],extras:v[9]}));
  q("SELECT jid,clave,valor FROM norm_atributo",
    v=>out.atributos.push({jid:v[0],clave:v[1],valor:v[2]}));
  return out;
}

/* ---------- capa de navegador/app: init, persistencia y write-through ---------- */
let SQLDB=null;
function _sqlInitFn(){
  if(typeof window!=="undefined"&&window.initSqlJs) return window.initSqlJs;
  if(typeof initSqlJs!=="undefined") return initSqlJs;
  return null;
}
function dbSqlDisponible(){ return !!SQLDB; }
// Inicializa sql.js (async, una vez al arrancar). Carga los bytes guardados si
// los hay. Devuelve una promesa que resuelve true si quedó lista.
function dbSqlInit(){
  const fn=_sqlInitFn(); if(!fn) return Promise.resolve(false);
  return Promise.resolve(fn()).then(SQL=>{
    let bytes=null;
    try{
      const b64=(typeof lsGet==="function")?lsGet("rpm_sqldb"):null;
      if(b64) bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    }catch(e){}
    SQLDB = bytes? new SQL.Database(bytes) : new SQL.Database();
    dbSqlSchema(SQLDB);
    return true;
  }).catch(()=>{ SQLDB=null; return false; });
}
function dbSqlPersistir(){
  if(!SQLDB) return;
  try{
    const bytes=SQLDB.export(); let s=""; const CH=8192;
    for(let i=0;i<bytes.length;i+=CH) s+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH));
    if(typeof lsSet==="function") lsSet("rpm_sqldb",btoa(s));
  }catch(e){}
}
// Write-through: vuelca el estado vivo a sql.js (si está disponible).
function dbSqlSnapshotVivo(){
  if(!SQLDB||typeof normalizar!=="function") return;
  try{ dbSqlGuardarSnapshot(SQLDB, normalizar()); dbSqlPersistir(); }catch(e){}
}

/* ---------- consultas para la analítica (síncronas, sobre sql.js) ---------- */
// Top jugadores por media (media = promedio de sus atributos), vía subconsulta.
function dbSqlTopJugadores(limite){
  if(!SQLDB) return [];
  try{
    const r=SQLDB.exec(
      "SELECT j.nombre, j.sexo, j.estilo, "+
      "(SELECT AVG(a.valor) FROM norm_atributo a WHERE a.jid=j.jid) media "+
      "FROM norm_jugador j ORDER BY media DESC, j.nombre ASC LIMIT "+((limite|0)||10));
    if(!r||!r[0]) return [];
    return r[0].values.map(v=>({nombre:v[0],sexo:v[1],estilo:v[2],media:Math.round(v[3]||0)}));
  }catch(e){ return []; }
}
function dbSqlNormStats(){
  if(!SQLDB) return null;
  try{
    const c=(t)=>{ const r=SQLDB.exec("SELECT COUNT(*) FROM "+t); return (r&&r[0])?r[0].values[0][0]:0; };
    return {parejas:c("norm_pareja"),jugadores:c("norm_jugador"),atributos:c("norm_atributo")};
  }catch(e){ return null; }
}
// Reconstruye el mundo (lista de parejas) desde sql.js. Base de la Fase 4b.
function dbSqlCargarMundo(){
  if(!SQLDB||typeof denormalizar!=="function") return null;
  try{ const snap=dbSqlLeerSnapshot(SQLDB); return snap.parejas.length?denormalizar(snap):null; }catch(e){ return null; }
}

// En Node (pruebas) exportamos las funciones puras; en el navegador quedan como globales.
if(typeof module!=="undefined"&&module.exports){
  module.exports={DB_SCHEMA_SQL,dbSqlSchema,dbSqlGuardarSnapshot,dbSqlLeerSnapshot};
}

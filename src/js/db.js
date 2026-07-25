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
CREATE TABLE IF NOT EXISTS norm_n1(
  ord INTEGER PRIMARY KEY AUTOINCREMENT, temporada INTEGER, nombre TEXT, pts INTEGER, yo INTEGER, sexo TEXT);
CREATE TABLE IF NOT EXISTS norm_palmares(
  ord INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT);
CREATE TABLE IF NOT EXISTS norm_diario(
  ord INTEGER PRIMARY KEY AUTOINCREMENT, texto TEXT);
CREATE TABLE IF NOT EXISTS norm_hist(
  ord INTEGER PRIMARY KEY AUTOINCREMENT, temporada INTEGER, pos INTEGER, pts INTEGER, tit INTEGER);
CREATE TABLE IF NOT EXISTS norm_h2h(
  rid TEXT PRIMARY KEY, v INTEGER, d INTEGER, nombre TEXT, ult_t INTEGER, alta INTEGER);
CREATE TABLE IF NOT EXISTS norm_staff(
  rol TEXT PRIMARY KEY, nombre TEXT, sexo TEXT, edad INTEGER, niv INTEGER, sal INTEGER, extras TEXT);
CREATE TABLE IF NOT EXISTS norm_finanzas(
  clave TEXT PRIMARY KEY, valor INTEGER);
CREATE TABLE IF NOT EXISTS norm_sponsor(
  slot TEXT PRIMARY KEY, marca TEXT, sec TEXT, tier INTEGER, sem INTEGER, extras TEXT);
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

// Historial de Nº1 (n1hist): cada temporada apunta quién acabó de número uno.
// Es una lista ORDENADA (una fila por temporada); se guarda entera y se lee en
// orden de inserción. Puras (reciben el handle) para probarlas con sql.js real.
function dbSqlGuardarN1(db, lista){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_n1;");
    const st=db.prepare("INSERT INTO norm_n1(temporada,nombre,pts,yo,sexo) VALUES(?,?,?,?,?)");
    (lista||[]).forEach(h=>st.run([h.t|0,h.nombre||"",h.pts|0,h.yo?1:0,h.sexo||"M"])); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
function dbSqlLeerN1(db){
  const out=[];
  const r=db.exec("SELECT temporada,nombre,pts,yo,sexo FROM norm_n1 ORDER BY ord");
  if(r&&r[0]) r[0].values.forEach(v=>out.push({t:v[0],nombre:v[1],pts:v[2],yo:!!v[3],sexo:v[4]}));
  return out;
}

// Palmarés del protagonista (carrera o club): lista ordenada de títulos (strings).
// Mismo patrón que norm_n1: se guarda entera y se lee en orden de inserción.
function dbSqlGuardarPalmares(db, lista){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_palmares;");
    const st=db.prepare("INSERT INTO norm_palmares(titulo) VALUES(?)");
    (lista||[]).forEach(x=>st.run([String(x)])); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
function dbSqlLeerPalmares(db){
  const out=[];
  const r=db.exec("SELECT titulo FROM norm_palmares ORDER BY ord");
  if(r&&r[0]) r[0].values.forEach(v=>out.push(v[0]));
  return out;
}

// Diario del protagonista: lista corta (10 entradas, la más reciente primero).
// Se guarda tal cual está en memoria (índice 0 = más reciente) y se lee en el
// mismo orden, así el round-trip es identidad.
function dbSqlGuardarDiario(db, lista){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_diario;");
    const st=db.prepare("INSERT INTO norm_diario(texto) VALUES(?)");
    (lista||[]).forEach(x=>st.run([String(x)])); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
function dbSqlLeerDiario(db){
  const out=[];
  const r=db.exec("SELECT texto FROM norm_diario ORDER BY ord");
  if(r&&r[0]) r[0].values.forEach(v=>out.push(v[0]));
  return out;
}

// Trayectoria por temporada del protagonista: {t, pos, pts, tit} — una fila
// por temporada cerrada, en orden cronológico. Mismo patrón que norm_n1.
function dbSqlGuardarHist(db, lista){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_hist;");
    const st=db.prepare("INSERT INTO norm_hist(temporada,pos,pts,tit) VALUES(?,?,?,?)");
    (lista||[]).forEach(h=>st.run([h.t|0,h.pos|0,h.pts|0,h.tit|0])); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
function dbSqlLeerHist(db){
  const out=[];
  const r=db.exec("SELECT temporada,pos,pts,tit FROM norm_hist ORDER BY ord");
  if(r&&r[0]) r[0].values.forEach(v=>out.push({t:v[0],pos:v[1],pts:v[2],tit:v[3]}));
  return out;
}

// Cara a cara contra rivales: mapa id_rival → {v, d, n, ultT, alta}. Es un
// diccionario (sin orden significativo); la clave primaria es el id del rival.
// `alta` solo se materializa si es >0, para que el round-trip respete la forma
// original (el juego lo crea perezosamente con (h2r.alta||0)+1).
function dbSqlGuardarH2h(db, mapa){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_h2h;");
    const st=db.prepare("INSERT INTO norm_h2h(rid,v,d,nombre,ult_t,alta) VALUES(?,?,?,?,?,?)");
    Object.keys(mapa||{}).forEach(rid=>{
      const h=mapa[rid]||{};
      st.run([String(rid),h.v|0,h.d|0,h.n||"",h.ultT|0,h.alta|0]);
    }); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
// Equipo de staff contratado: mapa rol → miembro ({rol, n, sexo, edad, niv,
// sal, ...}) o null si el puesto está vacío. Solo se persisten los puestos
// ocupados; los campos no modelados (frase, esp, com, equipoDe...) van al JSON
// de extras, como en norm_pareja.
const _MODELADO_STAFF=["rol","n","sexo","edad","niv","sal"];
function dbSqlGuardarStaff(db, staff){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_staff;");
    const st=db.prepare("INSERT INTO norm_staff(rol,nombre,sexo,edad,niv,sal,extras) VALUES(?,?,?,?,?,?,?)");
    Object.keys(staff||{}).forEach(rol=>{
      const m=staff[rol]; if(!m) return;
      const ex={}; Object.keys(m).forEach(k=>{ if(_MODELADO_STAFF.indexOf(k)<0) ex[k]=m[k]; });
      st.run([String(rol),m.n||"",m.sexo||"M",m.edad|0,m.niv|0,m.sal|0,JSON.stringify(ex)]);
    }); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
function dbSqlLeerStaff(db){
  const out={};
  const r=db.exec("SELECT rol,nombre,sexo,edad,niv,sal,extras FROM norm_staff");
  if(r&&r[0]) r[0].values.forEach(f=>{
    let ex={}; try{ ex=JSON.parse(f[6]||"{}"); }catch(_){}
    out[f[0]]=Object.assign(ex,{rol:f[0],n:f[1],sexo:f[2],edad:f[3],niv:f[4],sal:f[5]});
  });
  return out;
}

// Finanzas del protagonista: escalares con nombre (hoy solo `dinero`; el
// esquema clave/valor deja sitio a más sin migrar).
function dbSqlGuardarFinanzas(db, fin){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_finanzas;");
    const st=db.prepare("INSERT INTO norm_finanzas(clave,valor) VALUES(?,?)");
    Object.keys(fin||{}).forEach(k=>{ if(Number.isFinite(fin[k])) st.run([k,Math.round(fin[k])]); }); st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
function dbSqlLeerFinanzas(db){
  const out={};
  const r=db.exec("SELECT clave,valor FROM norm_finanzas");
  if(r&&r[0]) r[0].values.forEach(f=>{ out[f[0]]=f[1]; });
  return out;
}

// Patrocinio: el contrato vigente (slot "actual") y las ofertas sobre la mesa
// (slots "oferta:0", "oferta:1"...). Los campos no modelados (bonus, objetivo,
// tRest, durTotal, primas, primasCobradas, spots, nombre del club...) van al
// JSON de extras, como en norm_pareja y norm_staff.
const _MODELADO_SPONSOR=["marca","sec","tier","sem"];
function _filaSponsor(st, slot, s){
  const ex={}; Object.keys(s).forEach(k=>{ if(_MODELADO_SPONSOR.indexOf(k)<0) ex[k]=s[k]; });
  st.run([slot,s.marca||"",s.sec||"",s.tier|0,s.sem|0,JSON.stringify(ex)]);
}
function dbSqlGuardarSponsor(db, actual, ofertas){
  db.run("BEGIN");
  try{
    db.run("DELETE FROM norm_sponsor;");
    const st=db.prepare("INSERT INTO norm_sponsor(slot,marca,sec,tier,sem,extras) VALUES(?,?,?,?,?,?)");
    if(actual) _filaSponsor(st,"actual",actual);
    (ofertas||[]).forEach((of,i)=>{ if(of) _filaSponsor(st,"oferta:"+i,of); });
    st.free();
    db.run("COMMIT");
  }catch(e){ try{ db.run("ROLLBACK"); }catch(_){} throw e; }
}
function dbSqlLeerSponsor(db){
  const out={actual:null,ofertas:[]};
  const r=db.exec("SELECT slot,marca,sec,tier,sem,extras FROM norm_sponsor ORDER BY slot");
  if(r&&r[0]) r[0].values.forEach(f=>{
    let ex={}; try{ ex=JSON.parse(f[5]||"{}"); }catch(_){}
    const s=Object.assign(ex,{marca:f[1],sec:f[2],tier:f[3],sem:f[4]});
    if(f[0]==="actual") out.actual=s; else out.ofertas.push(s);
  });
  return out;
}

function dbSqlLeerH2h(db){
  const out={};
  const r=db.exec("SELECT rid,v,d,nombre,ult_t,alta FROM norm_h2h");
  if(r&&r[0]) r[0].values.forEach(f=>{
    const h={v:f[1],d:f[2]};
    if(f[3]) h.n=f[3];
    if(f[4]) h.ultT=f[4];
    if(f[5]) h.alta=f[5];
    out[f[0]]=h;
  });
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
  try{
    dbSqlGuardarSnapshot(SQLDB, normalizar());
    try{ if(typeof G!=="undefined"&&G&&G.world) dbSqlGuardarN1(SQLDB, G.world.n1hist||[]); }catch(_){}
    try{
      const prot=(typeof G!=="undefined"&&G)?(G.modo==="carrera"?G.carrera:G.clubG):null;
      if(prot){
        dbSqlGuardarPalmares(SQLDB, prot.palmares||[]);
        dbSqlGuardarDiario(SQLDB, prot.diario||[]);
        dbSqlGuardarHist(SQLDB, prot.hist||[]);
        dbSqlGuardarH2h(SQLDB, prot.h2h||{});
        dbSqlGuardarStaff(SQLDB, prot.staff||{});
        dbSqlGuardarFinanzas(SQLDB, {dinero:prot.dinero});
        dbSqlGuardarSponsor(SQLDB, prot.sponsor||null,
          G.modo==="carrera" ? (prot.ofertasPatro||[]) : (prot.sponsorOferta?[prot.sponsorOferta]:[]));
      }
    }catch(_){}
    dbSqlPersistir();
  }catch(e){}
}
// Reconstruye el historial de Nº1 desde sql.js. Base de la Fase 4d (n1hist).
function dbSqlCargarN1(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerN1(SQLDB); }catch(e){ return null; }
}
// Reconstruye el palmarés del protagonista desde sql.js (Fase 4d·2).
function dbSqlCargarPalmares(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerPalmares(SQLDB); }catch(e){ return null; }
}
// Reconstruye el diario del protagonista desde sql.js (Fase 4d·3).
function dbSqlCargarDiario(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerDiario(SQLDB); }catch(e){ return null; }
}
// Reconstruye la trayectoria por temporada desde sql.js (Fase 4d·4).
function dbSqlCargarHist(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerHist(SQLDB); }catch(e){ return null; }
}
// Reconstruye el cara a cara contra rivales desde sql.js (Fase 4d·5).
function dbSqlCargarH2h(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerH2h(SQLDB); }catch(e){ return null; }
}
// Reconstruye el equipo de staff contratado desde sql.js (Fase 4d·6).
function dbSqlCargarStaff(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerStaff(SQLDB); }catch(e){ return null; }
}
// Reconstruye las finanzas y el patrocinio desde sql.js (Fase 4d·7).
function dbSqlCargarFinanzas(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerFinanzas(SQLDB); }catch(e){ return null; }
}
function dbSqlCargarSponsor(){
  if(!SQLDB) return null;
  try{ return dbSqlLeerSponsor(SQLDB); }catch(e){ return null; }
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

/* ---------- guardia de consistencia (Fase 4c) ----------
   Comprueba, por round-trip, que el snapshot que quedó en las tablas coincide
   con el estado vivo ya normalizado: mismos recuentos y las mismas claves
   primarias (pid/jid). Es la salvaguarda que debe pasar antes de fiarse de las
   tablas como autoridad; si el modelo (normalizar/denormalizar) perdiera algo,
   aquí se nota. Pura (recibe el handle de BD) para probarla con sql.js real. */
function dbSqlSnapshotCoincide(db, snap){
  db=db||SQLDB; if(!db) return {ok:false,msg:"sin base"};
  try{
    const back=dbSqlLeerSnapshot(db), s=snap||{};
    const nb={p:back.parejas.length,j:back.jugadores.length,a:back.atributos.length};
    const ns={p:(s.parejas||[]).length,j:(s.jugadores||[]).length,a:(s.atributos||[]).length};
    if(nb.p!==ns.p||nb.j!==ns.j||nb.a!==ns.a)
      return {ok:false,msg:`recuentos: tablas ${nb.p}/${nb.j}/${nb.a} vs vivo ${ns.p}/${ns.j}/${ns.a}`};
    const set=(arr,k)=>{ const m=new Set(); (arr||[]).forEach(x=>m.add(String(x[k]))); return m; };
    const mismos=(A,B)=>A.size===B.size&&[...A].every(x=>B.has(x));
    if(!mismos(set(back.parejas,"pid"),set(s.parejas,"pid"))) return {ok:false,msg:"claves de pareja difieren"};
    if(!mismos(set(back.jugadores,"jid"),set(s.jugadores,"jid"))) return {ok:false,msg:"claves de jugador difieren"};
    return {ok:true,n:nb.p};
  }catch(e){ return {ok:false,msg:"error al verificar"}; }
}
// Guardia sobre la base viva: ¿las tablas coinciden con el estado `snap`? No lanza.
function dbSqlVerificarVivo(snap){ return dbSqlSnapshotCoincide(SQLDB, snap); }

/* ---------- consultas de ANALÍTICA (SQL real sobre el modelo normalizado) ----------
   Todas aceptan un handle de BD opcional que cae a la base viva (SQLDB): así la
   interfaz las llama sin argumentos y las pruebas les pasan una BD sql.js real.
   La media de cada jugador se calcula con una subconsulta reutilizable. */
const _MEDIA_JUG = "(SELECT jid, AVG(valor) v FROM norm_atributo GROUP BY jid)";
function _filas(db,sql){ const r=(db||SQLDB).exec(sql); return (r&&r[0])?r[0].values:[]; }

// Media de nivel y número de jugadores por estilo de juego (el estilo que domina).
function dbSqlPorEstilo(db){
  db=db||SQLDB; if(!db) return [];
  try{
    return _filas(db,
      "SELECT j.estilo, COUNT(*) n, AVG(m.v) media FROM norm_jugador j "+
      "JOIN "+_MEDIA_JUG+" m ON m.jid=j.jid WHERE j.estilo<>'' "+
      "GROUP BY j.estilo ORDER BY media DESC")
      .map(v=>({estilo:v[0],n:v[1]|0,media:Math.round(v[2]||0)}));
  }catch(e){ return []; }
}
// Mejores parejas por media conjunta de sus jugadores (JOIN pareja→jugador→atributo).
function dbSqlMejoresParejas(db,limite){
  db=db||SQLDB; if(!db) return [];
  try{
    return _filas(db,
      "SELECT p.nombre, p.sexo, AVG(a.valor) media, COUNT(DISTINCT j.jid) nj "+
      "FROM norm_pareja p JOIN norm_jugador j ON j.pareja_pid=p.pid "+
      "JOIN norm_atributo a ON a.jid=j.jid GROUP BY p.pid "+
      "ORDER BY media DESC LIMIT "+((limite|0)||8))
      .map(v=>({pareja:v[0],sexo:v[1],media:Math.round(v[2]||0),jugadores:v[3]|0}));
  }catch(e){ return []; }
}
// Mejores países (nacionalidades) por media, con al menos 2 jugadores en el circuito.
function dbSqlTopPaises(db,limite){
  db=db||SQLDB; if(!db) return [];
  try{
    return _filas(db,
      "SELECT j.pais, COUNT(*) n, AVG(m.v) media FROM norm_jugador j "+
      "JOIN "+_MEDIA_JUG+" m ON m.jid=j.jid WHERE j.pais<>'' "+
      "GROUP BY j.pais HAVING n>=2 ORDER BY media DESC LIMIT "+((limite|0)||8))
      .map(v=>({pais:v[0],n:v[1]|0,media:Math.round(v[2]||0)}));
  }catch(e){ return []; }
}
// Distribución de jugadores por banda de nivel (mismos cortes que colAttr).
function dbSqlDistribucionNivel(db){
  db=db||SQLDB; if(!db) return [];
  try{
    const bandas=[{k:"Élite (80+)",n:0},{k:"Bueno (68-79)",n:0},{k:"Correcto (56-67)",n:0},{k:"Discreto (44-55)",n:0},{k:"Flojo (<44)",n:0}];
    _filas(db,
      "SELECT CASE WHEN v>=80 THEN 0 WHEN v>=68 THEN 1 WHEN v>=56 THEN 2 WHEN v>=44 THEN 3 ELSE 4 END banda, "+
      "COUNT(*) n FROM "+_MEDIA_JUG+" GROUP BY banda")
      .forEach(v=>{ const i=v[0]|0; if(bandas[i]) bandas[i].n=v[1]|0; });
    return bandas;
  }catch(e){ return []; }
}

// En Node (pruebas) exportamos las funciones puras; en el navegador quedan como globales.
if(typeof module!=="undefined"&&module.exports){
  module.exports={DB_SCHEMA_SQL,dbSqlSchema,dbSqlGuardarSnapshot,dbSqlLeerSnapshot,
    dbSqlGuardarN1,dbSqlLeerN1,dbSqlGuardarPalmares,dbSqlLeerPalmares,
    dbSqlGuardarDiario,dbSqlLeerDiario,dbSqlGuardarHist,dbSqlLeerHist,
    dbSqlGuardarH2h,dbSqlLeerH2h,dbSqlGuardarStaff,dbSqlLeerStaff,
    dbSqlGuardarFinanzas,dbSqlLeerFinanzas,dbSqlGuardarSponsor,dbSqlLeerSponsor,
    dbSqlPorEstilo,dbSqlMejoresParejas,dbSqlTopPaises,dbSqlDistribucionNivel,
    dbSqlSnapshotCoincide};
}

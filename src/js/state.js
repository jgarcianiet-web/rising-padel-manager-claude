/* ================================================================
   ESTADO GLOBAL DE PARTIDA + GUARDADO
================================================================ */
let G=null;            // {v, modo:"carrera"|"club", world, carrera?, clubG?}
let torneo=null,match=null,speed=1.6;
let tabActiva="semana",cmTab="semana";
let lado=null,colorSel=COLORES[0],persoSel=null,colorClubSel=COLORES[0],sexoSel="M",sexoClubSel="M",filoClubSel="oficio";

const SLOTS={carrera:"rpm_carrera_v1",club:"rpm_club_v1",superliga:"rpm_superliga_v1"};
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}

/* ---------- ranuras de guardado ----------

   Cada modo tiene N_RANURAS partidas independientes. La clave de la primera es
   la de siempre ("rpm_carrera_v1"), sin sufijo, para que las partidas ya
   empezadas aparezcan como ranura 1 sin migrar nada; las demás llevan "_s2",
   "_s3". La ranura activa viaja en G._slot, así que guardar sobrescribe la que
   se abrió y no otra. */
const N_RANURAS=3;
function slotKey(modo,n){
  const base=SLOTS[modo]; if(!base) return null;
  return (!n||n<=1)?base:base+"_s"+n;
}
function slotActual(){ return (G&&G._slot)|0||1; }
/* Resumen de lo que hay en una ranura, para pintarla en el selector. Devuelve
   null si está vacía, y un objeto con roto:true si hay algo que no se entiende
   (así el jugador ve que la ranura está ocupada por basura y puede borrarla). */
function slotInfo(modo,n){
  const raw=lsGet(slotKey(modo,n));
  if(!raw) return null;
  try{
    const d=JSON.parse(raw);
    const e=modo==="carrera"?d.carrera:d.clubG;
    if(!e||!e.nombre) return {roto:true,bytes:raw.length};
    return {
      nombre:String(e.nombre),
      temporada:Math.floor((e.semana-1)/SEMANAS_TEMP)+1,
      semana:((e.semana-1)%SEMANAS_TEMP)+1,
      titulos:(e.palmares||[]).length,
      dif:d.dif||null,
      bytes:raw.length,
    };
  }catch(err){ return {roto:true,bytes:raw.length}; }
}
function borrarSlot(modo,n){ lsDel(slotKey(modo,n)); }

/* ---------- importación de una partida exportada ----------

   El botón Exportar generaba un JSON que no había forma de volver a meter en el
   juego: una copia de seguridad que no lo era. Esto valida el fichero antes de
   escribirlo, para que un JSON cualquiera no deje una ranura inservible. */
function validaPartida(d,modo){
  // Array.isArray: un JSON válido puede ser una lista, y typeof la da por objeto
  if(!d||typeof d!=="object"||Array.isArray(d)||!d.modo) return "imp_err_formato";
  if(d.modo!==modo) return "imp_err_modo";
  const e=modo==="carrera"?d.carrera:d.clubG;
  if(!e||typeof e!=="object"||!e.nombre) return "imp_err_incompleta";
  if(!Number.isFinite(e.semana)||e.semana<1) return "imp_err_incompleta";
  if(!d.world||!Array.isArray(d.world.parejas)||!d.world.parejas.length) return "imp_err_mundo";
  return null;
}
function importarPartida(texto,modo,n){
  let d; try{ d=JSON.parse(texto); }catch(e){ return "imp_err_formato"; }
  const err=validaPartida(d,modo);
  if(err) return err;
  return lsSet(slotKey(modo,n),JSON.stringify(d))?null:"imp_err_espacio";
}

// ---------- SQLite (Ruta B): la persistencia vive en db.js con sql.js ----------
// localStorage sigue siendo la fuente de verdad síncrona del guardado; sql.js
// mantiene el modelo relacional (poblado en cada guardar). Aquí quedan solo las
// funciones PURAS de proyección/normalización/comparación, que db.js y las
// pruebas reutilizan.

// ---------- proyección de solo lectura (función pura, para pruebas) ----------
// Construye, a partir del estado en memoria, filas planas (ranking y jugadores)
// para reflejarlas en tablas SQLite consultables. Es una función pura (no toca
// SQLite ni el DOM), por eso se puede probar sin Tauri.
function filasProyeccion(){
  const out={ranking:[],jugadores:[]};
  if(!G||!G.world||!Array.isArray(G.world.parejas)) return out;
  const parejas=G.world.parejas;
  const seguro=n=>Number.isFinite(n)?Math.round(n):0;
  const porSexo={};
  parejas.forEach(p=>{ const s=p.sexo||"M"; (porSexo[s]=porSexo[s]||[]).push(p); });
  Object.keys(porSexo).forEach(s=>{
    porSexo[s].slice().sort((a,b)=>(b.pts||0)-(a.pts||0)).forEach((p,i)=>{
      const nivel=(p.jug&&p.jug.length>=2&&p.jug[0].attrs&&p.jug[1].attrs)?nivelPareja(p):0;
      out.ranking.push({pareja:p.nombre||"?",sexo:s,pos:i+1,nivel:seguro(nivel),pts:seguro(p.pts||0),pro:!!p.pro});
    });
  });
  parejas.forEach(p=>(p.jug||[]).forEach(j=>{
    out.jugadores.push({nombre:j.n||"?",sexo:p.sexo||"M",lado:(j.lado===1?"revés":"drive"),estilo:j.estilo||"",media:seguro(j.attrs?mediaAttrs(j.attrs):0),pareja:p.nombre||""});
  }));
  return out;
}
// ---------- modelo relacional normalizado ----------
// normalizar() y denormalizar() son PURAS (no tocan SQLite ni el DOM): es la
// lógica de migración, y su ida y vuelta se puede probar sin Tauri.
// Campos que van a columnas propias; el resto se guarda en `extras` (JSON).
const _MODELADO_PAREJA=["id","nombre","sexo","pts","pro","edad","club","jug"];
const _MODELADO_JUG=["n","sexo","lado","estilo","perso","conf","pais","attrs"];
function _extrasJSON(obj,excluir){
  const e={};
  for(const k in obj){
    if(!Object.prototype.hasOwnProperty.call(obj,k)) continue;
    if(excluir.indexOf(k)>=0) continue;
    const v=obj[k], t=typeof v;
    if(t==="function"||t==="undefined") continue;
    e[k]=v;
  }
  try{ return JSON.stringify(e); }catch(err){ return "{}"; }
}
function _parseExtras(s){ if(!s) return {}; try{ const o=JSON.parse(s); return (o&&typeof o==="object")?o:{}; }catch(e){ return {}; } }
function normalizar(){
  const out={parejas:[],jugadores:[],atributos:[]};
  if(!G||!G.world||!Array.isArray(G.world.parejas)) return out;
  const ent=n=>Number.isFinite(n)?Math.round(n):0;
  G.world.parejas.forEach(p=>{
    out.parejas.push({pid:p.id,nombre:p.nombre||"",sexo:p.sexo||"M",pts:ent(p.pts||0),pro:!!p.pro,edad:ent(p.edad||0),club:(p.club==null?-1:p.club),extras:_extrasJSON(p,_MODELADO_PAREJA)});
    (p.jug||[]).forEach((j,idx)=>{
      const jid=p.id+"-"+idx;
      out.jugadores.push({jid,pareja_pid:p.id,nombre:j.n||"",sexo:j.sexo||p.sexo||"M",lado:(j.lado===1?1:0),estilo:j.estilo||"",perso:j.perso||"",conf:ent(j.conf||0),pais:j.pais||"",extras:_extrasJSON(j,_MODELADO_JUG)});
      const a=j.attrs||{};
      ATTR_KEYS.forEach(k=>{ if(a[k]!=null) out.atributos.push({jid,clave:k,valor:ent(a[k])}); });
    });
  });
  return out;
}
function denormalizar(snap){
  const attrsByJid={};
  (snap.atributos||[]).forEach(a=>{ (attrsByJid[a.jid]=attrsByJid[a.jid]||{})[a.clave]=a.valor; });
  const jugByPid={};
  (snap.jugadores||[]).forEach(j=>{ (jugByPid[j.pareja_pid]=jugByPid[j.pareja_pid]||[]).push(j); });
  Object.keys(jugByPid).forEach(pid=>jugByPid[pid].sort((a,b)=>a.jid<b.jid?-1:a.jid>b.jid?1:0));
  return (snap.parejas||[]).map(p=>Object.assign({}, _parseExtras(p.extras), {
    id:p.pid,nombre:p.nombre,sexo:p.sexo,pts:p.pts,pro:!!p.pro,edad:p.edad,club:p.club,
    jug:(jugByPid[p.pid]||[]).map(j=>Object.assign({}, _parseExtras(j.extras), {n:j.nombre,sexo:j.sexo,lado:j.lado,estilo:j.estilo,perso:j.perso,conf:j.conf,pais:j.pais,attrs:attrsByJid[j.jid]||{}}))
  }));
}
// ---------- comparación e integridad ----------
// Compara dos "mundos" (listas de parejas) por identidad estructural estable
// (nº, nombres de pareja y de jugadores) — no por datos volátiles (pts, conf).
function compararMundos(recon,orig){
  if(!Array.isArray(recon)||!Array.isArray(orig)) return {ok:false,msg:"datos inválidos"};
  if(recon.length!==orig.length) return {ok:false,msg:`parejas: ${recon.length} vs ${orig.length}`};
  const byId={}; recon.forEach(p=>byId[p.id]=p);
  let dif=0;
  orig.forEach(o=>{
    const r=byId[o.id];
    if(!r||r.nombre!==o.nombre){ dif++; return; }
    (o.jug||[]).forEach((oj,i)=>{ if(!r.jug[i]||r.jug[i].n!==oj.n) dif++; });
  });
  return dif===0?{ok:true,n:recon.length}:{ok:false,msg:`${dif} discrepancias`};
}
// Lee el mundo de sql.js, lo reconstruye y lo compara con la memoria viva.
// Ahora es SÍNCRONO: sql.js no tiene la barrera async que tenía Tauri.
function verificarSnapshot(){
  const recon=(typeof dbSqlCargarMundo==="function")?dbSqlCargarMundo():null;
  if(!recon) return {ok:false,msg:"sin datos en la base"};
  return compararMundos(recon,(G&&G.world&&G.world.parejas)||[]);
}
// Overlay de analítica: consulta sql.js (funciona en la app y en el navegador).
function abrirAnalitica(){
  const ov=document.getElementById("analitica"), cuerpo=document.getElementById("analiticaCuerpo");
  if(!ov||!cuerpo) return;
  ov.classList.remove("oculto");
  const lista=(typeof dbSqlDisponible==="function")&&dbSqlDisponible();
  if(!lista){
    cuerpo.innerHTML=`<div class="foot" style="text-align:left;line-height:1.6">${t("ana_sql_no")}</div>`;
    return;
  }
  const top=(typeof dbSqlTopJugadores==="function")?dbSqlTopJugadores(10):[];
  if(!top.length){
    cuerpo.innerHTML=`<div class="foot" style="text-align:left;line-height:1.6">${t("ana_sin_datos")}</div>`;
    return;
  }
  // consultas de analítica (SQL real sobre el modelo normalizado)
  const parejas=(typeof dbSqlMejoresParejas==="function")?dbSqlMejoresParejas(null,8):[];
  const estilos=(typeof dbSqlPorEstilo==="function")?dbSqlPorEstilo():[];
  const paises=(typeof dbSqlTopPaises==="function")?dbSqlTopPaises(null,6):[];
  const distri=(typeof dbSqlDistribucionNivel==="function")?dbSqlDistribucionNivel():[];
  const ns=(typeof dbSqlNormStats==="function")?dbSqlNormStats():null;
  const v=verificarSnapshot();
  const sec=(t)=>`<div class="anaHd">${t}</div>`;
  const medIn=(m)=>`<b style="color:${colAttr(m)};font-family:'IBM Plex Mono',monospace">${m}</b>`;
  const barra=(pct,col)=>`<div class="abar" style="flex:1;margin:0 8px"><i style="width:${Math.max(3,Math.min(100,pct))}%;background:${col}"></i></div>`;

  // 1) top jugadores por media
  const fJug=top.map((j,i)=>`<tr><td class="pos">${i+1}</td><td>${j.nombre}</td><td class="pts">${medIn(j.media)}</td><td style="color:var(--gris)">${j.estilo||""}</td><td class="niv">${j.sexo}</td></tr>`).join("");
  // 2) mejores parejas por media conjunta
  const fPar=parejas.map((p,i)=>`<tr><td class="pos">${i+1}</td><td>${p.pareja}</td><td class="pts">${medIn(p.media)}</td><td class="niv">${p.sexo}</td></tr>`).join("");
  // 3) media por estilo (barra proporcional a la media)
  const fEst=estilos.map(e=>`<div class="anaRow"><span class="anaK">${e.estilo}</span>${barra(e.media,colAttr(e.media))}<span class="anaV">${medIn(e.media)} <span style="color:var(--gris2)">·${e.n}</span></span></div>`).join("");
  // 4) distribución por banda de nivel (barra proporcional al mayor grupo)
  const maxN=Math.max(1,...distri.map(b=>b.n));
  const COLB=["#7CE08A","#B9DB7F","#E6E9F0","#B9C0CE","#8B94A7"];
  const fDis=distri.map((b,i)=>`<div class="anaRow"><span class="anaK" style="min-width:118px">${b.k}</span>${barra(b.n/maxN*100,COLB[i]||"#8B94A7")}<span class="anaV">${b.n}</span></div>`).join("");
  // 5) top países
  const fPais=paises.map(p=>`<span class="chip">${p.pais} ${medIn(p.media)} <span style="color:var(--gris2)">·${p.n}</span></span>`).join(" ");

  cuerpo.innerHTML=
     sec(t("ana_top"))
    +`<div class="foot" style="text-align:left;margin:-2px 0 5px">${t("ana_sql_jug")}</div>`
    +`<table class="rk">${fJug}</table>`
    +(fPar?sec(t("ana_parejas"))+`<table class="rk">${fPar}</table>`:"")
    +(fEst?sec(t("ana_estilo"))+`<div style="margin-top:2px">${fEst}</div>`:"")
    +(fDis?sec(t("ana_distri"))+`<div style="margin-top:2px">${fDis}</div>`:"")
    +(fPais?sec(t("ana_paises"))+`<div class="meta" style="margin-top:2px">${fPais}</div>`:"")
    +`<div class="foot" style="text-align:left;margin-top:12px">`
    +(ns?t("ana_modelo",{p:ns.parejas,j:ns.jugadores,a:ns.atributos}):t("ana_modelo_no"))
    +`<div style="margin-top:5px">`
    +(v.ok?t("ana_integridad_ok",{n:v.n}):t("ana_integridad_no",{msg:v.msg}))
    +`</div><div style="margin-top:5px">`
    +t("ana_semilla",{semilla:semillaTxt(G&&G.semilla)})
    +`</div></div>`;
}
document.getElementById("btnAnalitica").onclick=abrirAnalitica;
document.getElementById("analiticaCerrar").onclick=()=>document.getElementById("analitica").classList.add("oculto");
// migración del guardado único antiguo a su ranura por modo
(function(){
  const viejo=lsGet("rpm_save_v1");
  if(viejo){
    try{const d=JSON.parse(viejo); if(d&&d.modo&&!lsGet(SLOTS[d.modo])) lsSet(SLOTS[d.modo],viejo);}catch(e){}
    lsDel("rpm_save_v1");
  }
})();
function guardar(){
  if(!G) return;
  // Fase 4c: al haber base SQLite, la partida queda marcada como migrada (su
  // modelo vive también en las tablas). La marca viaja en el propio blob.
  if(typeof dbSqlDisponible==="function" && dbSqlDisponible()) G._vSql=1;
  // La posición del flujo de azar viaja con la partida: continuar la retoma
  // donde estaba, así que recargar y repetir un punto da el mismo resultado.
  G._rngS=rndEstado().pos;
  const json=JSON.stringify(G);
  const ok=lsSet(slotKey(G.modo,slotActual()),json);   // se guarda en la ranura que se abrió
  if(typeof dbSqlSnapshotVivo==="function"){
    dbSqlSnapshotVivo();  // write-through del modelo a sql.js
    // guardia de consistencia: ¿las tablas reconstruyen el estado vivo? (flag de sesión)
    if(typeof dbSqlVerificarVivo==="function" && typeof normalizar==="function"){
      try{ G._sqlOK = !!dbSqlVerificarVivo(normalizar()).ok; }catch(e){ G._sqlOK=false; }
    }
  }
  const st=G.modo==="carrera"?G.carrera.semana:G.modo==="club"?G.clubG.semana:(G.superliga?("J"+G.superliga.jornada):0);
  document.getElementById("footSave").textContent=ok
    ? t("pie_guardado",{modo:t("modo_"+G.modo),cuando:G.modo==="superliga"?st:t("pie_semana",{n:st})})
    : t("pie_nolocal");
}
document.getElementById("btnExport").onclick=()=>{
  if(!G) return;
  guardar();   // que el fichero refleje lo último jugado, no lo último guardado
  const blob=new Blob([JSON.stringify(G)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  // el nombre lleva protagonista y temporada: si guardas varias copias, se
  // distinguen sin abrirlas
  const e=G.modo==="carrera"?G.carrera:G.clubG;
  const quien=String((e&&e.nombre)||G.modo).replace(/[^\w\-]+/g,"_").slice(0,24);
  const temp=e&&e.semana?"-T"+(Math.floor((e.semana-1)/SEMANAS_TEMP)+1):"";
  a.download=`rpm-${G.modo}-${quien}${temp}.json`;
  a.click();
  if(typeof avisa==="function") avisa(t("imp_exportada"),"ok");
};
document.getElementById("btnMenu").onclick=()=>{ guardar(); G=null; irA("menu"); pintarMenu(); };
function pintaSnd(){ document.getElementById("btnSnd").textContent=SND?"🔊":"🔇"; }
document.getElementById("btnSnd").onclick=()=>{ SND=!SND; try{localStorage.setItem("rpm_snd",SND?"1":"0");}catch(e){} if(!SND) musicaOff(); else if(match&&match.ver) musicaOn(); pintaSnd(); };
pintaSnd();
document.getElementById("btnAyuda").onclick=()=>{ if(G) verTuto(G.modo,true); };
// la pantalla de ajustes vive en dos sitios: la barra (en partida) y el menú
if(document.getElementById("btnAjustes")) document.getElementById("btnAjustes").onclick=()=>mostrarAjustes();
if(document.getElementById("btnAjustesMenu")) document.getElementById("btnAjustesMenu").onclick=()=>mostrarAjustes();

/* ---------- helpers de mundo compartidos ---------- */
function mkAttrsNivel(nivel,estilo){
  const base=ESTILOS[estilo].attrs,m=Object.values(base).reduce((a,b)=>a+b)/9;
  const o={};
  ATTR_KEYS.forEach(k=>o[k]=clamp(Math.round(base[k]*(nivel/m)+R(-3,3)),25,96));
  return o;
}
function mediaAttrs(a){return Math.round(ATTR_KEYS.reduce((s,k)=>s+a[k],0)/9);}
function finScore(attrs){ return (attrs.remate+attrs.vibora+attrs.bandeja+attrs.volea)/4 - (attrs.fondo+attrs.pared+attrs.globo)/3; }
function asignaLadosPareja(jug){
  if(!jug||jug.length<2) return;
  // el que tiene más vocación de finalización va al REVÉS (1), el otro al DRIVE (0)
  const f0=finScore(jug[0].attrs), f1=finScore(jug[1].attrs);
  if(f0>=f1){ jug[0].lado=1; jug[1].lado=0; } else { jug[0].lado=0; jug[1].lado=1; }
}
function nivelPareja(p){return Math.round((mediaAttrs(p.jug[0].attrs)+mediaAttrs(p.jug[1].attrs))/2);}
function mkWorld(){
  const parejas=[];
  PROS.concat(PROS_F).forEach((pr,i)=>{
    const sx=i<PROS.length?"M":"F";  // élite masculina y élite femenina, cada una con sus estrellas
    const mk=(d)=>({n:d[0],perso:d[1],estilo:d[2],attrs:mkAttrsNivel(d[3],d[2]),conf:60,pais:d[4]||"🇪🇸",sexo:sx});
    const jug=[mk(pr.p),mk(pr.q)];
    asignaLadosPareja(jug);
    const nivel=nivelPareja({jug});
    parejas.push({id:i,nombre:`${jug[0].n} / ${jug[1].n}`,jug,edad:Math.round(R(22,30)),pro:true,sexo:sx,pts:Math.round((nivel-40)*(nivel-40)*R(3.2,4.2)),club:clubAlAzar(),atNet:false});
  });
  const usados=new Set();
  // el país se sortea primero y el nombre lo respeta: un sueco se llama Lindqvist
  const nom=(sx,pais)=>{let n,g=0;do{n=nombreCompleto(sx,pais);}while(usados.has(n)&&g++<40);usados.add(n);return n;};
  const ofens=["rematador","agresivo","bandejero"],defs=["defensivo","constructor"];
  /* Cuerpo del circuito. Antes eran 44 parejas (22 por sexo) que, con la élite,
     dejaban el ranking en 40 y al jugador debutando el 41º: un circuito mundial
     donde cabías de memoria. Ahora son NPC_POR_SEXO por categoría, así que se
     empieza por el noventa y tantos y subir al top 20 es un camino, no un paseo.
     El nivel se reparte por índice DENTRO del sexo, para que ambas categorías
     tengan la escalera completa de 40 a 66 y no media cada una. */
  const total=NPC_POR_SEXO*2;
  for(let i=0;i<total;i++){
    const sx=i%2===0?"M":"F";
    const k=Math.floor(i/2);                       // 0..NPC_POR_SEXO-1 dentro de su sexo
    const nivel=Math.round(40+k*(26/(NPC_POR_SEXO-1))+R(-2,2));
    const e1=pick(ofens),e2=pick(defs);
    const p1=pickPais(), p2=rnd()<.78?p1:pickPais();   // las parejas suelen ser del mismo país
    const jug=[
      {n:nom(sx,p1),estilo:e1,perso:pick(Object.keys(PERSONALIDADES)),attrs:mkAttrsNivel(nivel,e1),conf:55,pais:p1,sexo:sx},
      {n:nom(sx,p2),estilo:e2,perso:pick(Object.keys(PERSONALIDADES)),attrs:mkAttrsNivel(nivel,e2),conf:55,pais:p2,sexo:sx}
    ];
    asignaLadosPareja(jug);
    parejas.push({id:PROS.length+PROS_F.length+i,nombre:`${jug[0].n}/${jug[1].n}`,jug,edad:Math.round(R(18,32)),pro:false,sexo:sx,pts:Math.max(0,Math.round((nivel-40)*(nivel-40)*R(2.6,3.6))),club:clubAlAzar(),atNet:false});
  }
  /* La era del mundo: cada circuito nace con una forma distinta arriba. Los
     puntos se REESCALAN de los ya sorteados (∝ (nivel−40)²) en vez de volver a
     tirarlos: así la era no consume azar extra ni mueve el resto del mundo. */
  const era=(typeof sorteaEra==="function")?sorteaEra():"abierta";
  if(typeof _aplicaEra==="function"){
    const nivAntes=new Map(parejas.map(p=>[p.id,nivelPareja(p)]));
    _aplicaEra(parejas,era);
    parejas.forEach(p=>{
      const a=nivAntes.get(p.id), b=nivelPareja(p);
      if(a!==b&&a>41) p.pts=Math.max(0,Math.round(p.pts*Math.pow((b-40)/(a-40),2)));
    });
  }
  return {parejas,lider:null,era};
}
// Entidad protagonista. Devuelve null sin partida abierta: se llama desde sitios
// que también existen en el menú (avisos, selector de ranuras) y antes reventaba
// con "Cannot read properties of null" en cuanto alguno se usaba desde ahí.
function ent(){ return G?(G.modo==="carrera"?G.carrera:G.clubG):null; }
/* ================================================================
   EL RANKING ES UNA VENTANA DE 52 SEMANAS

   Así funcionan la FIP y Premier Pádel, y así se mueve el ranking de verdad:
   cada torneo reparte puntos, esos puntos **valen un año**, y al cumplirse las
   52 semanas se caen. Lo que estaba antes —acumular todo el año y recortar un
   45% de golpe al cerrar temporada— no se parece a nada: el ranking se quedaba
   quieto once meses y daba un salto artificial en diciembre.

   Con la ventana pasan las dos cosas que hacen interesante un ranking:

   - **Se defiende.** Si el año pasado ganaste el torneo de esta semana, esos
     puntos se caen HOY. Repetir resultado te deja igual; hacerlo peor te
     hunde aunque hayas ganado partidos.
   - **Se mueve todas las semanas**, no una vez al año.

   Guardarlo entero (cada resultado con su fecha) engordaría la partida por 180
   parejas; se guarda un anillo de 52 casillas por pareja —lo ganado en cada
   semana del año— que es justo lo que hace falta para caducar y para saber qué
   defiendes. `pts` sigue existiendo como suma cacheada, así que todo lo que ya
   leía `pts` sigue funcionando igual.
================================================================ */
/* ================================================================
   MOMENTOS: la memoria emocional de la carrera. Un contador de títulos dice
   cuánto; esto dice CUÁLES. Cada momento se guarda UNA vez —son primeras
   veces— con su temporada, su semana y los datos para contarlo, y la sala de
   trofeos los pinta como tarjetas. No se calcula nada al pintar: si no se
   vivió, no existe.
================================================================ */
function momAnota(e,id,datos){
  if(!e) return false;
  e.momentos=e.momentos||[];
  if(e.momentos.some(m=>m.id===id)) return false;
  e.momentos.push({id,t:temporada(),sem:semanaTemp(),d:datos||{}});
  return true;
}
function momDe(e,id){ return ((e&&e.momentos)||[]).find(m=>m.id===id)||null; }

const RK_SEMANAS=52;
function rkSlot(semanaAbs){ return ((Math.max(1,semanaAbs|0)-1)%RK_SEMANAS); }
function rkNuevo(){ return new Array(RK_SEMANAS).fill(0); }
/* EL RANKING CUENTA SOLO TUS MEJORES RESULTADOS, como los circuitos de verdad.
   Sumando las 52 casillas, jugar más siempre sumaba más: un Continental Bronce
   (40 puntos) nunca estorbaba, así que la estrategia óptima era competir todas
   las semanas y los torneos menores eran acumulables hasta el infinito. Con los
   mejores 18, un resultado pequeño solo cuenta mientras no tengas 18 mejores:
   los menores sirven para el dinero, el ritmo y la confianza —y para entrar en
   el circuito—, pero el ranking de arriba se juega en las semanas grandes.
   Es lo que convierte el calendario en una selección y no en una cinta de
   correr. El anillo entero se conserva: se sigue defendiendo TODO lo ganado
   (una casilla que caduca puede dejar sitio a un resultado que antes no
   contaba). */
const RK_MEJORES=18;
function rkSuma(x){
  const r=x.rk||[];
  if(r.length<=RK_MEJORES) return r.reduce((a,b)=>a+(b|0),0);
  return r.slice().sort((a,b)=>(b|0)-(a|0)).slice(0,RK_MEJORES).reduce((a,b)=>a+(b|0),0);
}
/* Las partidas antiguas traen `pts` y ninguna historia. Se reparte lo que
   tuvieran por las 52 casillas: así su ranking no salta de golpe y a lo largo
   del año siguiente van defendiendo lo que traían. */
function rkAsegura(x){
  if(!x) return null;
  if(!Array.isArray(x.rk)||x.rk.length!==RK_SEMANAS){
    /* Se reparte en RK_MEJORES casillas espaciadas, no en las 52: con el
       ranking a mejores-18, repartir en 52 dejaba 34 casillas fuera de la suma
       y los puntos heredados se deflactaban un 65% al migrar. Espaciadas para
       que la defensa de ese total se reparta por el año, no caiga de golpe. */
    const total=x.pts|0, cacho=Math.floor(total/RK_MEJORES);
    x.rk=rkNuevo();
    const paso=Math.floor(RK_SEMANAS/RK_MEJORES);   // 52/18 → una de cada ~3
    for(let k=0;k<RK_MEJORES;k++) x.rk[k*paso]=cacho;
    x.rk[0]+=total-cacho*RK_MEJORES;
  }
  x.pts=rkSuma(x);
  return x.rk;
}
/* Anota puntos en la semana en que se ganan. */
function rkAnota(x,semanaAbs,pts){
  if(!x||!pts) return;
  rkAsegura(x);
  x.rk[rkSlot(semanaAbs)]+=pts|0;
  x.pts=rkSuma(x);
}
/* Qué se defiende esta semana: lo que se ganó en la misma semana del año pasado. */
function rkDefiende(x,semanaAbs){
  if(!x) return 0;
  rkAsegura(x);
  return x.rk[rkSlot(semanaAbs)]|0;
}
/* Caduca la semana: se cae lo del año pasado. Devuelve cuánto se ha perdido. */
function rkCaduca(x,semanaAbs){
  if(!x) return 0;
  rkAsegura(x);
  const i=rkSlot(semanaAbs), cae=x.rk[i]|0;
  x.rk[i]=0;
  x.pts=rkSuma(x);
  return cae;
}
/* Pasa la escoba por todo el circuito al empezar una semana. Se hace una sola
   vez por semana (`_rkSem` lo marca), porque entrar y salir de la partida no
   puede costarte puntos. */
function caducaSemanaRanking(semanaAbs){
  if(!G||!G.world) return 0;
  if(G.world._rkSem===semanaAbs) return 0;
  G.world._rkSem=semanaAbs;
  (G.world.parejas||[]).forEach(p=>rkCaduca(p,semanaAbs));
  const e=ent();
  return e?rkCaduca(e,semanaAbs):0;
}

/* ================================================================
   EL CIRCUITO PUNTÚA COMO PUNTÚAS TÚ

   Durante mucho tiempo esto daba puntos a TODAS las parejas del mundo cada
   semana: `0.045·(nivel−40)²`, que para una pareja de nivel 70 son unos 47
   puntos semanales sin jugar contra nadie. Ganar un Continental Bronce entero
   da 40. El efecto medido era demoledor: cuatro temporadas ganando siete
   títulos en categorías asequibles dejaban el ranking PEOR (91 → 95) que cuatro
   temporadas perdiendo en primera ronda de torneos grandes (91 → 66). El juego
   premiaba presentarse, no ganar.

   Ahora el mundo puntúa con la misma moneda que el jugador: cada semana se
   juegan los torneos que hay en el calendario, se reparte el cuadro entre las
   parejas que entran, y cobra el que llega lejos. Nadie cobra por existir.
================================================================ */
/* Plazas que reparte un cuadro de 32: campeón, finalista, dos semifinalistas,
   cuatro de cuartos, ocho de octavos y dieciséis de primera ronda. Encaja con
   los seis escalones de `cat.pts`. */
const CUADRO_PLAZAS=[1,1,2,4,8,16];
/* Quién se inscribe en un torneo, por categoría y sexo.
   - Los premier van por ranking, que es como funciona un corte de verdad.
   - Los Continental están abiertos, así que se apuntan las parejas cuyo nivel
     encaja con la categoría: es la misma decisión que toma el jugador cuando
     mira el calendario y elige dónde puede competir. */
function _inscritosTorneo(ci,sx,excluir){
  const cat=CATS[ci]; if(!cat) return [];
  const libres=G.world.parejas.filter(p=>(p.sexo||"M")===sx&&!p.retiraT&&!excluir.includes(p.id));
  if(cat.premier){
    const cupo=cat.tf?8:(cat.cupoP||32);
    return [...libres].sort((a,b)=>b.pts-a.pts).slice(0,cupo);
  }
  const base=cat.base||44;
  return libres.filter(p=>Math.abs(nivelPareja(p)-base)<=11)
               .sort((a,b)=>Math.abs(nivelPareja(a)-base)-Math.abs(nivelPareja(b)-base))
               .slice(0,32);
}
/* Juega el cuadro y reparte los puntos. No se simula punto a punto —son
   decenas de partidos por semana— pero el orden no es el del ranking: se
   siembra por nivel con ruido, así que hay campanadas. Devuelve el campeón. */
function _reparteTorneo(ci,sx,excluir,yaInscritos){
  const cat=CATS[ci];
  const inscritos=yaInscritos||_inscritosTorneo(ci,sx,excluir);
  if(inscritos.length<4) return null;
  const orden=inscritos.map(p=>({p,f:nivelPareja(p)+R(-7,7)})).sort((a,b)=>b.f-a.f);
  const sem=ent()?ent().semana:1;
  let i=0;
  CUADRO_PLAZAS.forEach((plazas,k)=>{
    const pts=cat.pts[k]||0;
    for(let j=0;j<plazas&&i<orden.length;j++,i++) rkAnota(orden[i].p,sem,pts);
  });
  return orden[0].p;
}
function simCircuito(excluir){
  const slot=slotSemana(semanaTemp());
  const sexos=["M","F"];
  sexos.forEach(sx=>{
    /* Una pareja, un torneo por semana: la misma regla que tienes tú. Si se
       les dejaba jugar el grande Y el Continental, el mundo puntuaba al doble
       de ritmo que el jugador y el ranking se quedaba veinte puestos por
       debajo de lo que decía su nivel. Los que entran en el premier no están
       disponibles para el Continental de esa semana. */
    const ocupados=excluir.slice();
    if(slot.premier!==undefined&&slot.premier!==null){
      const inscritos=_inscritosTorneo(slot.premier,sx,excluir);
      inscritos.forEach(p=>ocupados.push(p.id));
      const camp=_reparteTorneo(slot.premier,sx,excluir,inscritos);
      // el campeón del circuito se apunta el título en el palmarés de su club
      if(camp&&sx===miSexo()&&camp.club!==undefined){
        const cid=(PREM_CAL&&PREM_CAL[semanaTemp()-1]&&PREM_CAL[semanaTemp()-1].ciudad)?" "+PREM_CAL[semanaTemp()-1].ciudad:"";
        clubPalma(camp.club,`${catNombre(slot.premier)}${cid} (T${temporada()})`);
        camp._titulos=(camp._titulos||0)+1;
      }
    }
    if(slot.fip!==undefined&&slot.fip!==null) _reparteTorneo(slot.fip,sx,ocupados);
  });
  const sx=miSexo();
  const top=[...G.world.parejas].filter(p=>(p.sexo||"M")===sx).sort((a,b)=>b.pts-a.pts)[0];
  if(top&&G.world["lider_"+sx]!==top.id){
    G.world["lider_"+sx]=top.id;
    avisa(t("av_nuevo_n1",{circuito:sx==="F"?t("pre_circ_f"):t("pre_circ_m"),nombre:top.nombre}));
  }
}
function mkJovenNPC(sx){
  const est=pick(Object.keys(ESTILOS));
  const pais=pickPais();
  return {n:nombreCompleto(sx,pais),estilo:est,perso:pick(Object.keys(PERSONALIDADES)),attrs:null,conf:55,pais,sexo:sx,_est:est};
}
// ---------- IA de clubes: personalidad de mercado ----------
// Cada club tiene una forma de moverse en el mercado, derivada de su filosofía:
//   rico → ficha estrellas · cantera → forma jóvenes · vendedor → traspasa · conservador → estable
const _MERCADO_POR_FIL={cantera:"cantera",ataque:"rico",humilde:"vendedor"};
function mercadoDeClub(ci){ const cl=CLUBES_NPC[ci]; return (cl&&(cl.mercado||_MERCADO_POR_FIL[cl.fil]))||"conservador"; }
// Cada club hace un movimiento por temporada según su personalidad.
function accionesDeClub(w,noticias){
  const dueños=ci=>w.parejas.filter(p=>p.club===ci&&!p.retiraT);
  for(let ci=0;ci<CLUBES_NPC.length;ci++){
    const cl=CLUBES_NPC[ci]; if(!cl) continue;
    const mercado=mercadoDeClub(ci);
    if(mercado==="conservador") continue;
    if(rnd()<.45) continue;                 // no todos mueven cada temporada
    const mios=dueños(ci);
    if(mercado==="rico"){
      // ficha una estrella emergente (no consagrada) de otro club
      const obj=w.parejas.filter(p=>p.club!==ci&&!p.retiraT&&!p.pro&&nivelPareja(p)>=66).sort((a,b)=>nivelPareja(b)-nivelPareja(a))[0];
      if(obj){ obj.club=ci; rkAnota(obj,ent().semana,Math.round((obj.pts||0)*.15+200)); noticias.push(t("mun_golpe_efecto",{club:cl.n,pareja:obj.nombre})); }
    } else if(mercado==="cantera"){
      // hace crecer a su joven promesa
      const joven=mios.filter(p=>p.edad<=23).sort((a,b)=>b.pts-a.pts)[0]||mios.slice().sort((a,b)=>a.edad-b.edad)[0];
      if(joven){ joven.jug.forEach(j=>{ if(j.attrs){ const k=pick(ATTR_KEYS); j.attrs[k]=clamp(j.attrs[k]+3,25,96); } }); rkAnota(joven,ent().semana,Math.round((joven.pts||0)*.1+120)); noticias.push(t("mun_cantera_salto",{club:cl.n,pareja:joven.nombre})); }
    } else if(mercado==="vendedor"){
      // no puede retener a su mejor pareja: la traspasa a un club rico
      const estrella=mios.slice().sort((a,b)=>nivelPareja(b)-nivelPareja(a))[0];
      const ricos=[]; for(let d=0;d<CLUBES_NPC.length;d++){ if(d!==ci&&mercadoDeClub(d)==="rico") ricos.push(d); }
      if(estrella&&ricos.length){ const dest=pick(ricos); estrella.club=dest; noticias.push(t("mun_no_retiene",{club:cl.n,pareja:estrella.nombre,destino:CLUBES_NPC[dest].n})); }
    }
  }
}
/* El circuito habla todas las semanas. Un rumor cada tres o cuatro, y los que
   vencen se confirman (moviendo el mundo) o se desmienten. Va aquí, junto al
   resto de lo que pasa cada semana, y lo llaman los dos modos. */
function semanaDeRumores(e,semana){
  /* Si el rumor va de una pareja del circuito, el periódico saca sus caras: un
     rumor con foto de los protagonistas se lee como una noticia, no como una
     ficha de datos. Los que van de ti usan tu pareja. */
  const protDe=rum=>{
    if(rum.pid!=null){
      const p=(G.world.parejas||[]).find(x=>x.id===rum.pid);
      if(p&&p.jug) return p;
    }
    return (rum.tipo==="pareja"&&typeof miParejaProt==="function")?miParejaProt():null;
  };
  resolverRumores(e,semana).forEach(res=>{
    avisa(`📰 ${res.txt}`);
    if(res.ok){
      const tipoNot=res.rum.tipo==="ruptura"?"ruptura":res.rum.tipo==="fichaje"?"fichaje":"mercado";
      noticia(tipoNot,res.txt,t("rum_pie"),protDe(res.rum));
      // y lo que se confirma trae conversación: el rumor abre su escena
      if(res.abre) abreDilema(e,res.abre,semana);
    }
  });
  if(rnd()<.3){
    const rum=mkRumor(e,semana);
    if(rum){
      const tx=rumorTexto(rum);
      noticia("mercado",tx.t,tx.x,protDe(rum));
      if(rnd()<.5) post("rumor");
    }
  }
}
function evolucionaMundo(){
  const w=G.world;
  if(!w.nextId){ w.nextId=100; w.parejas.forEach(p=>{ if(p.id>=w.nextId) w.nextId=p.id+1; }); }
  const noticias=[];
  // registro histórico: quién cierra la temporada como nº1
  refrescaMercadoStaff();
  const n1=rankingFilas()[0];
  w.n1hist=(w.n1hist||[]);
  w.n1hist.push({t:temporada()-1,nombre:n1.nombre,pts:n1.pts,yo:!!n1.yo,sexo:miSexo()});
  // GALA de fin de temporada
  const filasG=rankingFilas();
  const yoFila=filasG.find(f=>f.yo);
  const galaPremios=[];
  galaPremios.push(t("gala_pareja",{n:n1.nombre}));
  const joven=w.parejas.filter(p2=>(p2.sexo||"M")===miSexo()&&p2.edad<=21&&!p2.retiraT).sort((a,b)=>b.pts-a.pts)[0];
  if(joven) galaPremios.push(t("gala_revelacion",{n:joven.nombre,edad:joven.edad}));
  const e2=ent();
  if(n1.yo){ const premio=t("gala_palmares",{t:temporada()-1}); e2.palmares.push(premio); fansAdd(2000,premio); post("gala"); }
  if(e2.rachaMax>=12) galaPremios.push(t("gala_racha",{n:nombreEntidad().replace("★ ",""),m:e2.rachaMax}));
  avisa(t("gala_hd",{lista:galaPremios.join(" · ")}));
  if(n1.yo) noticia("titulo",t("not_pareja_anio_t"),t("not_pareja_anio_s"),miParejaProt());
  if(n1.yo){ noticias.push(t("gala_n1_feed")); noticia("n1",t("not_n1_t"),t("not_n1_s")); }
  // 1) envejecimiento: los jóvenes crecen, los veteranos declinan (fuerte a partir de 33)
  w.parejas.forEach(p=>{
    p.edad++;
    // los puntos ya no se recortan al cerrar: cada resultado caduca a las 52
    // semanas de haberse conseguido, como en la FIP
    p.jug.forEach(j=>{
      for(let i=0;i<2;i++){
        const k=pick(ATTR_KEYS);
        if(p.edad<24) j.attrs[k]=clamp(j.attrs[k]+1,25,96);
        else if(p.edad>=33) j.attrs[k]=clamp(j.attrs[k]-2,25,96);
        else if(p.edad>30) j.attrs[k]=clamp(j.attrs[k]-1,25,96);
      }
    });
  });
  // 2) retiradas efectivas (las anunciadas la temporada pasada)
  const fuera=w.parejas.filter(p=>p.retiraT);
  fuera.forEach(p=>{
    noticias.push(`👋 ${p.nombre} cuelgan la pala. Fin de una era.`);
    if(p.pro||p.pts>1200) noticia("retirada",t("not_retiran_t",{nombre:p.nombre}),t("not_retiran_s"));
  });
  w.parejas=w.parejas.filter(p=>!p.retiraT);
  // 3) nuevos anuncios de última temporada
  w.parejas.forEach(p=>{
    if(!p.retiraT&&(p.edad>=35||(p.edad>=32&&rnd()<.35))){
      p.retiraT=true;
      noticias.push(`📰 ${p.nombre} anuncian que esta será su última temporada.`);
    }
  });
  // 4) rupturas: el culebrón de cada pretemporada (1-2 recombinaciones entre parejas de nivel parecido)
  const activos=w.parejas.filter(p=>!p.retiraT);
  for(let k=0;k<2&&activos.length>=4;k++){
    if(rnd()<.35) continue;
    const a=pick(activos);
    const cerca=activos.filter(p=>p!==a&&p.sexo===a.sexo&&Math.abs(nivelPareja(p)-nivelPareja(a))<=8);
    if(!cerca.length) continue;
    const b=pick(cerca);
    const sale=a.jug[1].n, entra=b.jug[1].n;
    [a.jug[1],b.jug[1]]=[b.jug[1],a.jug[1]];
    a.nombre=`${a.jug[0].n}/${a.jug[1].n}`;
    b.nombre=`${b.jug[0].n}/${b.jug[1].n}`;
    noticias.push(t("mun_bombazo",{jug:a.jug[0].n,sale,entra}));
    noticia("ruptura",t("not_ruptura_npc_t",{jug:a.jug[0].n,sale}),t("not_ruptura_npc_s",{entra}),{jug:[{n:a.jug[0].n,sexo:a.sexo},{n:sale,sexo:a.sexo}]});
  }
  // 5) debuts: jóvenes que entran al circuito hasta reponer el plantel (a veces, una perla)
  while(w.parejas.length<WORLD_N){
    const perla=rnd()<.18;
    const nivel=Math.round(perla?R(64,72):R(44,58));
    const sx=rnd()<.5?"M":"F";
    const j1=mkJovenNPC(sx), j2=mkJovenNPC(sx);
    j1.attrs=mkAttrsNivel(nivel,j1._est); j2.attrs=mkAttrsNivel(nivel,j2._est);
    const p={id:w.nextId++,nombre:`${j1.n}/${j2.n}`,jug:[j1,j2],edad:Math.round(R(18,21)),pro:perla,sexo:sx,
      pts:Math.max(0,Math.round((nivel-40)*(nivel-40)*R(.8,1.4))),club:clubAlAzar(),atNet:false};
    rkAsegura(p);   // los puntos con los que llega se reparten por el año
    w.parejas.push(p);
    noticias.push(perla?t("mun_debut_perla",{pareja:p.nombre,nivel}):t("mun_debut",{pareja:p.nombre}));
    if(perla) noticia("debut",t("not_perla_t",{nombre:p.nombre}),t("not_perla_s",{nivel}));
  }
  // 6) movimientos de club según su personalidad (fichan, forman cantera, venden)
  accionesDeClub(w,noticias);
  noticias.slice(0,8).reverse().forEach(n=>avisa(n));
}
function nombreEntidad(){
  const e=ent();
  return G.modo==="carrera"?`★ ${e.nombre}/${e.compi.n}`:`★ ${e.nombre}`;
}
function nivelEntidad(){
  const e=ent();
  if(G.modo==="carrera") return Math.round((mediaAttrs(e.attrs)+mediaAttrs(e.compi.attrs))/2);
  const al=alineacion();
  return al?Math.round((mediaAttrs(al[0].attrs)+mediaAttrs(al[1].attrs))/2):Math.round(e.plantilla.reduce((s,j)=>s+mediaAttrs(j.attrs),0)/Math.max(1,e.plantilla.length));
}
function miSexo(){ return (G.modo==="carrera"?G.carrera.sexo:G.clubG.sexo)||"M"; }
function rankingFilas(){
  const sx=miSexo();
  const filas=G.world.parejas.filter(p=>(p.sexo||"M")===sx).map(p=>({id:p.id,nombre:p.nombre,nivel:nivelPareja(p),pts:p.pts,pro:p.pro,yo:false}));
  filas.push({id:-1,nombre:nombreEntidad(),nivel:nivelEntidad(),pts:ent().pts,pro:false,yo:true});
  filas.sort((a,b)=>b.pts-a.pts);
  filas.forEach((f,i)=>f.pos=i+1);
  return filas;
}
function miPuesto(){return rankingFilas().find(f=>f.yo).pos;}
function semanaTemp(){return ((ent().semana-1)%SEMANAS_TEMP)+1;}
function temporada(){return Math.floor((ent().semana-1)/SEMANAS_TEMP)+1;}
function esSemanaTorneo(){return true;} // hay torneo FIP todas las semanas
// Infiere la "gravedad" de un aviso a partir de su contenido, para darle color y
// sonido sin tener que anotar cada una de las decenas de llamadas a avisa(). Se
// apoya en los emojis/prefijos que el juego ya usa de forma consistente.
function tipoAviso(m){
  const s=String(m||"");
  if(/^[🏆🎯✔✅✍🎉⭐💰🥇]/u.test(s)||/\bcampe(ón|ones)\b/i.test(s)) return "ok";
  if(/^[✗❌💥]/u.test(s)||/rescinde|eliminad|derrota/i.test(s)) return "bad";
  if(/⚠/u.test(s)||/lesión|lesion|baja médica|sin caja|números rojos/i.test(s)) return "warn";
  return "info";
}
// Aviso emergente (toast) con jerarquía visual + sonido, además de guardarlo en
// el diario. Es el feedback inmediato del que antes carecían las acciones fuera
// del partido; lo comparten los tres modos, que ya llamaban a avisa().
function mostrarAviso(m,tipo){
  try{
    let cont=document.getElementById("toasts");
    if(!cont){ cont=document.createElement("div"); cont.id="toasts"; (document.body||document.documentElement).appendChild(cont); }
    // no dejar que se apilen sin fin: como mucho, los 3 más recientes (con 4 la
    // pila tapaba media columna). El guard
    // y el shift explícito cubren el DOM real (HTMLCollection viva) y el DOM
    // simulado de las pruebas (array cuyo removeChild es un no-op).
    let guard=0;
    while(cont.children&&cont.children.length>=3&&guard++<8){
      quitarEl(cont.children[0]);
      if(Array.isArray(cont.children)) cont.children.shift();
    }
    const el=document.createElement("div");
    el.className="toast t-"+tipo; el.textContent=m;
    cont.appendChild(el);
    setTimeout(()=>{ try{ el.classList.add("out"); }catch(e){} setTimeout(()=>quitarEl(el),360); },3800);
  }catch(e){}
  try{ sfxAviso(tipo); }catch(e){}
}
function avisa(m,tipo){
  const e=ent();                       // null en el menú: entonces solo se muestra
  if(e&&e.diario){ e.diario.unshift(m); e.diario=e.diario.slice(0,10); }
  mostrarAviso(m,tipo||tipoAviso(m));
}
// Color por valor (0..99) para dar jerarquía de un vistazo. Antes todo lo <55
// caía en un único gris, así que un jugador joven (todo 30-52) no mostraba
// ninguna diferencia entre sus atributos; ahora el rango bajo-medio tiene sus
// propios escalones, de gris apagado (flojo) a verde (élite).
function colAttr(v){
  return v>=80?"#7CE08A"   // élite
       : v>=68?"#B9DB7F"   // bueno
       : v>=56?"#E6E9F0"   // correcto
       : v>=44?"#B9C0CE"   // discreto
       : v>=32?"#8B94A7"   // flojo
       :       "#6C7488";  // muy flojo
}
/* En qué escalón del reparto caes al perder en la fase `f`. La previa cobra
   dinero como una primera ronda —viajar cuesta y hay que comer— pero NO
   puntúa: en la FIP y en Premier Pádel los puntos son del cuadro final.

   Con la previa puntuando pasaba esto: entrar en la previa de una Corona,
   perder el primer partido y llevarte 100 puntos era mejor negocio que ganar
   un Continental Plata entero (80). Presentarse a perder era la estrategia
   óptima, y se notaba: 48-196 sin un solo título daba el puesto 3. */
function loserIdx(f){return f>=2?(6-f):5;}
function loserPtsIdx(f){return f>=2?(6-f):-1;}
function calHtml(){
  const st=semanaTemp(), res=ent().calRes||{};
  // tira de temporada: 40 semanas de un vistazo
  let strip='<div class="calstrip">';
  for(let w=1;w<=SEMANAS_TEMP;w++){
    const pc=PREM_CAL[w-1];
    const col=!pc?"#2A3140":pc.cat===7?"#E6FA50":pc.cat===6?"var(--oro)":pc.cat===5?"#9B59D0":"#4FA3D8";
    const cls="calcel"+(w===st?" hoy":"")+(w<st?" pasada":"");
    const marca=res[w]?(res[w]==="🏆"?"🏆":"•"):"";
    const nom=pc?`${catNombre(pc.cat)} (${pc.ciudad})`:t("cal_solo_fip");
    strip+=`<div class="${cls}" style="background:${col}" title="S${w}: ${nom} + ${catNombre(CONT_CAL[w-1])}">${marca}</div>`;
  }
  strip+='</div><div class="foot" style="text-align:left;margin-bottom:8px">'+t("cal_leyenda")+'</div>';
  const cal=[];
  for(let s2=st;s2<Math.min(st+8,SEMANAS_TEMP+1);s2++){
    const slot=slotSemana(s2);
    const prem=slot.premier!==undefined?`<span style="color:var(--oro)">${catNombre(slot.premier)} (${slot.ciudad})</span> + `:"";
    cal.push(`<div>S${s2} · ${prem}${catNombre(slot.fip)}${s2===st?t("cal_esta_sem"):""}</div>`);
  }
  const queda=PREM_CAL.slice(st-1).reduce((a,v)=>{if(v&&v.cat>=4&&v.cat<=6)a[v.cat-4]++;return a;},[0,0,0]);
  return strip+cal.join("")+`<div class="foot" style="text-align:left;margin-top:8px">${t("cal_restan",{major:queda[2],p1:queda[1],p2:queda[0]})}</div>`;
}


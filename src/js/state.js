/* ================================================================
   ESTADO GLOBAL DE PARTIDA + GUARDADO
================================================================ */
let G=null;            // {v, modo:"carrera"|"club", world, carrera?, clubG?}
let torneo=null,match=null,speed=1.6;
let tabActiva="semana",cmTab="semana";
let lado=null,colorSel=COLORES[0],persoSel=null,colorClubSel=COLORES[0],sexoSel="M",sexoClubSel="M";

const SLOTS={carrera:"rpm_carrera_v1",club:"rpm_club_v1"};
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}

// ---------- persistencia en SQLite (solo dentro de la app de escritorio) ----------
// localStorage sigue siendo la fuente de verdad síncrona durante la partida;
// SQLite es un espejo duradero en disco (con historial) que solo actúa cuando
// el juego corre bajo Tauri. Sin Tauri (navegador o pruebas) todo es no-op.
function _invoke(){ return (typeof window!=="undefined"&&window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.core.invoke)||null; }
function dbDisponible(){ return !!_invoke(); }
function dbGuardar(modo,json){
  const inv=_invoke(); if(!inv) return;
  try{ const p=inv("db_save",{modo,json}); if(p&&p.catch) p.catch(()=>{}); }catch(e){}
}
function dbCargar(modo){
  const inv=_invoke(); if(!inv) return Promise.resolve(null);
  try{ return Promise.resolve(inv("db_load",{modo})).catch(()=>null); }catch(e){ return Promise.resolve(null); }
}
// Al arrancar en la app: si en localStorage falta una partida pero SQLite la
// tiene (p.ej. tras limpiar la caché del WebView), la restauramos.
function hidratarDesdeDB(){
  if(!dbDisponible()) return Promise.resolve(false);
  const modos=Object.keys(SLOTS);
  let restaurada=false;
  return modos.reduce((cad,modo)=>cad.then(()=>{
    if(lsGet(SLOTS[modo])) return;
    return dbCargar(modo).then(json=>{ if(json){ lsSet(SLOTS[modo],json); restaurada=true; } });
  }),Promise.resolve()).then(()=>restaurada).catch(()=>restaurada);
}
// ---------- Fase 1: proyecciones relacionales de solo lectura ----------
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
let _ultProy=0;
function dbProyectar(modo){
  const inv=_invoke(); if(!inv) return;
  const now=Date.now(); if(now-_ultProy<3000) return; _ultProy=now;   // no saturar en guardados seguidos
  try{
    const {ranking,jugadores}=filasProyeccion();
    if(!ranking.length&&!jugadores.length) return;
    const p=inv("db_project",{modo,ranking,jugadores}); if(p&&p.catch) p.catch(()=>{});
  }catch(e){}
}
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
  const json=JSON.stringify(G);
  const ok=lsSet(SLOTS[G.modo],json);
  dbGuardar(G.modo,json);   // espejo en SQLite (no bloquea; no-op fuera de Tauri)
  dbProyectar(G.modo);      // proyecciones relacionales de solo lectura (Fase 1)
  const st=G.modo==="carrera"?G.carrera.semana:G.clubG.semana;
  document.getElementById("footSave").textContent=ok
    ? `RISING GAMES · v3.0 — ${G.modo} guardada ✓ (semana ${st})`
    : `RISING GAMES · v2.0 — guardado local no disponible aquí: usa «⤓ Exportar» para no perder la partida`;
}
document.getElementById("btnExport").onclick=()=>{
  if(!G) return;
  const blob=new Blob([JSON.stringify(G)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`rpm-${G.modo}.json`;
  a.click();
};
document.getElementById("btnImport").onclick=()=>document.getElementById("fileImport").click();
document.getElementById("fileImport").onchange=(e)=>{
  const f=e.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const data=JSON.parse(rd.result);
      if(!data||!data.modo) throw new Error("formato");
      G=data; guardar(); entrarPartida();
    }catch(err){ alert("No se pudo leer la partida."); }
  };
  rd.readAsText(f);
};
document.getElementById("btnMenu").onclick=()=>{ guardar(); G=null; irA("menu"); pintarMenu(); };
function pintaSnd(){ document.getElementById("btnSnd").textContent=SND?"🔊":"🔇"; }
document.getElementById("btnSnd").onclick=()=>{ SND=!SND; try{localStorage.setItem("rpm_snd",SND?"1":"0");}catch(e){} if(!SND) musicaOff(); else if(match&&match.ver) musicaOn(); pintaSnd(); };
pintaSnd();
document.getElementById("btnAyuda").onclick=()=>{ if(G) verTuto(G.modo,true); };

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
    parejas.push({id:i,nombre:`${jug[0].n} / ${jug[1].n}`,jug,edad:Math.round(R(22,30)),pro:true,sexo:sx,pts:Math.round((nivel-40)*(nivel-40)*R(3.2,4.2)),club:Math.floor(Math.random()*9),atNet:false});
  });
  const usados=new Set();
  const nom=(sx)=>{let n;do{n=nombrePorSexo(sx)[0]+". "+pick(APELL);}while(usados.has(n));usados.add(n);return n;};
  const ofens=["rematador","agresivo","bandejero"],defs=["defensivo","constructor"];
  for(let i=0;i<44;i++){
    const nivel=Math.round(40+i*(26/43)+R(-2,2));
    const e1=pick(ofens),e2=pick(defs), sx=i%2===0?"M":"F";
    const jug=[
      {n:nom(sx),estilo:e1,perso:pick(Object.keys(PERSONALIDADES)),attrs:mkAttrsNivel(nivel,e1),conf:55,pais:pickPais(),sexo:sx},
      {n:nom(sx),estilo:e2,perso:pick(Object.keys(PERSONALIDADES)),attrs:mkAttrsNivel(nivel,e2),conf:55,pais:pickPais(),sexo:sx}
    ];
    asignaLadosPareja(jug);
    parejas.push({id:PROS.length+PROS_F.length+i,nombre:`${jug[0].n}/${jug[1].n}`,jug,edad:Math.round(R(18,32)),pro:false,sexo:sx,pts:Math.max(0,Math.round((nivel-40)*(nivel-40)*R(2.6,3.6))),club:Math.floor(Math.random()*9),atNet:false});
    if(usados.size>110) usados.clear();
  }
  return {parejas,lider:null};
}
function ent(){ return G.modo==="carrera"?G.carrera:G.clubG; }  // entidad protagonista
function simCircuito(excluir){
  G.world.parejas.forEach(p=>{
    if(excluir.includes(p.id)) return;
    const n=nivelPareja(p);
    p.pts+=Math.max(0,Math.round(0.045*(n-40)*(n-40)+R(-12,26)));
  });
  // campeón semanal simulado del circuito → palmarés de su club
  const slotAhora=slotSemana(semanaTemp());
  if(slotAhora&&slotAhora.premier!==undefined&&Math.random()<.9){
    const sxs=miSexo();
    const contendientes=[...G.world.parejas].filter(p=>(p.sexo||"M")===sxs&&!p.yo&&!excluir.includes(p.id)).sort((a,b)=>nivelPareja(b)-nivelPareja(a)).slice(0,8);
    if(contendientes.length){
      // el campeón sale entre los mejores con algo de azar
      const camp=contendientes[Math.min(contendientes.length-1,Math.floor(Math.abs(R(0,2.4))))];
      if(camp&&camp.club!==undefined){ const cid=(PREM_CAL&&PREM_CAL[semanaTemp()-1]&&PREM_CAL[semanaTemp()-1].ciudad)?" "+PREM_CAL[semanaTemp()-1].ciudad:""; clubPalma(camp.club,`${CATS[slotAhora.premier].n}${cid} (T${temporada()})`); camp._titulos=(camp._titulos||0)+1; }
    }
  }
  const sx=miSexo();
  const top=[...G.world.parejas].filter(p=>(p.sexo||"M")===sx).sort((a,b)=>b.pts-a.pts)[0];
  if(top&&G.world["lider_"+sx]!==top.id){
    G.world["lider_"+sx]=top.id;
    avisa(`📰 Nuevo nº1 del circuito ${sx==="F"?"femenino":"masculino"}: ${top.nombre}.`);
  }
}
function mkJovenNPC(sx){
  const est=pick(Object.keys(ESTILOS));
  return {n:nombrePorSexo(sx)[0]+". "+pick(APELL),estilo:est,perso:pick(Object.keys(PERSONALIDADES)),attrs:null,conf:55,pais:pickPais(),sexo:sx,_est:est};
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
  galaPremios.push(`🏆 Pareja del Año: ${n1.nombre}`);
  const joven=w.parejas.filter(p2=>(p2.sexo||"M")===miSexo()&&p2.edad<=21&&!p2.retiraT).sort((a,b)=>b.pts-a.pts)[0];
  if(joven) galaPremios.push(`🌱 Revelación: ${joven.nombre} (${joven.edad} años)`);
  const e2=ent();
  if(n1.yo){ e2.palmares.push(`Pareja del Año (T${temporada()-1})`); fansAdd(2000,"Pareja del Año"); post("gala"); }
  if(e2.rachaMax>=12) galaPremios.push(`🔥 Mejor racha del año: ${nombreEntidad().replace("★ ","")} (${e2.rachaMax} victorias)`);
  avisa(`🎪 GALA DEL CIRCUITO — ${galaPremios.join(" · ")}.`);
  if(n1.yo) noticia("titulo","Pareja del Año en la Gala","El circuito se rinde: premio a la mejor pareja de la temporada.",miParejaProt());
  if(n1.yo){ noticias.push(`👑 Cerráis la temporada como Nº1 DEL MUNDO. Historia del pádel.`); noticia("n1","Nº1 DEL MUNDO","Cerráis la temporada en lo más alto. Historia del pádel."); }
  // 1) envejecimiento: los jóvenes crecen, los veteranos declinan (fuerte a partir de 33)
  w.parejas.forEach(p=>{
    p.edad++;
    p.pts=Math.round(p.pts*.55);
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
    if(p.pro||p.pts>1200) noticia("retirada",`${p.nombre} dicen adiós`,`Se retiran del circuito tras una gran carrera`);
  });
  w.parejas=w.parejas.filter(p=>!p.retiraT);
  // 3) nuevos anuncios de última temporada
  w.parejas.forEach(p=>{
    if(!p.retiraT&&(p.edad>=35||(p.edad>=32&&Math.random()<.35))){
      p.retiraT=true;
      noticias.push(`📰 ${p.nombre} anuncian que esta será su última temporada.`);
    }
  });
  // 4) rupturas: el culebrón de cada pretemporada (1-2 recombinaciones entre parejas de nivel parecido)
  const activos=w.parejas.filter(p=>!p.retiraT);
  for(let k=0;k<2&&activos.length>=4;k++){
    if(Math.random()<.35) continue;
    const a=pick(activos);
    const cerca=activos.filter(p=>p!==a&&p.sexo===a.sexo&&Math.abs(nivelPareja(p)-nivelPareja(a))<=8);
    if(!cerca.length) continue;
    const b=pick(cerca);
    const sale=a.jug[1].n, entra=b.jug[1].n;
    [a.jug[1],b.jug[1]]=[b.jug[1],a.jug[1]];
    a.nombre=`${a.jug[0].n}/${a.jug[1].n}`;
    b.nombre=`${b.jug[0].n}/${b.jug[1].n}`;
    noticias.push(`💥 Bombazo del mercado: ${a.jug[0].n} rompe con ${sale} y jugará con ${entra}.`);
    noticia("ruptura",`${a.jug[0].n} rompe con ${sale}`,`Jugará con ${entra} la próxima temporada`,{jug:[{n:a.jug[0].n,sexo:a.sexo},{n:sale,sexo:a.sexo}]});
  }
  // 5) debuts: jóvenes que entran al circuito hasta reponer el plantel (a veces, una perla)
  while(w.parejas.length<WORLD_N){
    const perla=Math.random()<.18;
    const nivel=Math.round(perla?R(64,72):R(44,58));
    const sx=Math.random()<.5?"M":"F";
    const j1=mkJovenNPC(sx), j2=mkJovenNPC(sx);
    j1.attrs=mkAttrsNivel(nivel,j1._est); j2.attrs=mkAttrsNivel(nivel,j2._est);
    const p={id:w.nextId++,nombre:`${j1.n}/${j2.n}`,jug:[j1,j2],edad:Math.round(R(18,21)),pro:perla,sexo:sx,
      pts:Math.max(0,Math.round((nivel-40)*(nivel-40)*R(.8,1.4))),club:Math.floor(Math.random()*9),atNet:false};
    w.parejas.push(p);
    noticias.push(perla?`🚀 Debuta ${p.nombre}, la pareja joven de la que todos hablan (${nivel}).`:`🚀 Debut en el circuito: ${p.nombre}.`);
    if(perla) noticia("debut",`Debuta ${p.nombre}`,`La pareja joven de la que todos hablan (nivel ${nivel})`);
  }
  noticias.slice(0,7).reverse().forEach(n=>avisa(n));
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
function avisa(m){
  const e=ent(); if(!e) return;
  e.diario.unshift(m); e.diario=e.diario.slice(0,10);
}
function colAttr(v){return v>=80?"#7CE08A":v>=70?"#B9DB7F":v>=55?"#E6E9F0":"#8B94A7";}
function loserIdx(f){return f>=2?(6-f):5;}
function calHtml(){
  const st=semanaTemp(), res=ent().calRes||{};
  // tira de temporada: 40 semanas de un vistazo
  let strip='<div class="calstrip">';
  for(let w=1;w<=SEMANAS_TEMP;w++){
    const pc=PREM_CAL[w-1];
    const col=!pc?"#2A3140":pc.cat===7?"#E6FA50":pc.cat===6?"var(--oro)":pc.cat===5?"#9B59D0":"#4FA3D8";
    const cls="calcel"+(w===st?" hoy":"")+(w<st?" pasada":"");
    const marca=res[w]?(res[w]==="🏆"?"🏆":"•"):"";
    const nom=pc?`${CATS[pc.cat].n} (${pc.ciudad})`:"solo FIP";
    strip+=`<div class="${cls}" style="background:${col}" title="S${w}: ${nom} + ${CATS[FIP_CAL[w-1]].n}">${marca}</div>`;
  }
  strip+='</div><div class="foot" style="text-align:left;margin-bottom:8px"><span style="color:#E6FA50">■</span> Finals · <span style="color:var(--oro)">■</span> Major · <span style="color:#9B59D0">■</span> P1 · <span style="color:#4FA3D8">■</span> P2 · <span style="color:#5E687A">■</span> solo FIP · • jugado · 🏆 título</div>';
  const cal=[];
  for(let s2=st;s2<Math.min(st+8,SEMANAS_TEMP+1);s2++){
    const slot=slotSemana(s2);
    const prem=slot.premier!==undefined?`<span style="color:var(--oro)">${CATS[slot.premier].n} (${slot.ciudad})</span> + `:"";
    cal.push(`<div>S${s2} · ${prem}${CATS[slot.fip].n}${s2===st?"  ← esta semana":""}</div>`);
  }
  const queda=PREM_CAL.slice(st-1).reduce((a,v)=>{if(v&&v.cat>=4&&v.cat<=6)a[v.cat-4]++;return a;},[0,0,0]);
  return strip+cal.join("")+`<div class="foot" style="text-align:left;margin-top:8px">Restan: ${queda[2]} Major, ${queda[1]} P1, ${queda[0]} P2 y las Finals de Barcelona (top 8). Viajar cuesta: elige bien tu gira.</div>`;
}


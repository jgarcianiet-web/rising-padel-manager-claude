/* ================================================================
   SUPERLIGA: competición entre clubes (modo aparte del Modo club). Liga a doble
   vuelta con tabla + playoffs del top 4. Cada cruce se decide a TRES parejas
   (1ª/2ª/3ª de cada club, mejor de 3). El motor es puro y testable; la pantalla
   es una capa fina encima.
================================================================ */

// Fuerza base de un club NPC, determinista por su nombre (45..80).
function fuerzaClubNPC(nombre){ return 48+(Math.abs(hashStr("liga:"+(nombre||"?")))%30); }
// Las tres parejas de un club, escalonadas desde su fuerza base.
function fuerzasTriples(base){ return [base+7,base,base-7]; }
// Probabilidad de que A gane un punto (una pareja) frente a B según la diferencia de fuerza.
function probPunto(fa,fb){ return 1/(1+Math.pow(10,(fb-fa)/16)); }
// Resuelve un cruce a 3 parejas (mejor de 3). Devuelve {ganador:0|1, gA, gB, puntos:[0|1,...]}.
function resuelveCruce(baseA,baseB,rnd){
  const r=rnd||Math.random, fa=fuerzasTriples(baseA), fb=fuerzasTriples(baseB);
  let gA=0,gB=0; const puntos=[];
  for(let i=0;i<3;i++){ const ganaA=r()<probPunto(fa[i],fb[i]); if(ganaA)gA++; else gB++; puntos.push(ganaA?0:1); }
  return {ganador:gA>gB?0:1,gA,gB,puntos};
}
// Fuerzas de las 3 parejas de un equipo: las reales si tiene alineación propia
// (tu club), o el escalonado desde la fuerza base (clubes NPC).
function fuerzasDeEquipo(eq){ return (eq.parejas&&eq.parejas.length===3)?eq.parejas.slice():fuerzasTriples(eq.fuerza); }
// Resuelve un cruce entre dos EQUIPOS (usa sus 3 parejas reales o escalonadas).
function resuelveCruceEquipos(eqA,eqB,rnd){
  const r=rnd||Math.random, fa=fuerzasDeEquipo(eqA), fb=fuerzasDeEquipo(eqB);
  let gA=0,gB=0; const puntos=[];
  for(let i=0;i<3;i++){ const ganaA=r()<probPunto(fa[i],fb[i]); if(ganaA)gA++; else gB++; puntos.push(ganaA?0:1); }
  return {ganador:gA>gB?0:1,gA,gB,puntos};
}
// --- plantilla y alineación de TU club ---
// Genera una plantilla de 6 jugadores (reutiliza mkAgente del modo club).
function mkPlantillaSuperliga(){
  const a=[],seen=new Set();
  for(let i=0;i<6;i++){ let j,g=0; do{ j=mkAgente(52,72,"M"); }while(seen.has(j.n)&&g++<20); seen.add(j.n); a.push(j); }
  return a;
}
// Fuerza de una pareja (media de los dos jugadores + química de lados: drive+revés suma).
function fuerzaParejaSL(plantilla,par){
  const a=plantilla[par[0]],b=plantilla[par[1]]; if(!a||!b) return 55;
  let f=(mediaAttrs(a.attrs)+mediaAttrs(b.attrs))/2;
  if(a.lado!==undefined&&b.lado!==undefined) f+=(a.lado!==b.lado)?2:-3;
  return Math.round(f);
}
// Recalcula las fuerzas de tu club a partir de la alineación de las 3 parejas.
function sincronizaClubSL(sl){
  if(!sl.plantilla||!sl.alin) return;
  const tu=sl.equipos.findIndex(e=>e.tuyo); if(tu<0) return;
  const fs=sl.alin.map(par=>fuerzaParejaSL(sl.plantilla,par)).sort((x,y)=>y-x);
  sl.equipos[tu].parejas=fs;
  sl.equipos[tu].fuerza=Math.round(fs.reduce((s,x)=>s+x,0)/fs.length);
}
// Mueve un jugador a otra pareja intercambiando (mantiene 2 por pareja).
function reasignaPareja(alin,jug,destino){
  let oi=-1,op=-1; for(let i=0;i<3;i++){ const k=alin[i].indexOf(jug); if(k>=0){ oi=i; op=k; } }
  if(oi<0||oi===destino) return alin;
  const otro=alin[destino][0];
  alin[destino][0]=jug; alin[oi][op]=otro;
  return alin;
}
// --- economía, desarrollo y mercado (recorrido largo) ---
// Premio por posición final de liga (16º→4k, 1º→34k).
function premioSuperliga(pos){ return Math.round(4000+(16-clamp(pos||16,1,16))*2000); }
// Bonus de playoff para tu club según hasta dónde llegó.
function bonusPlayoffSL(sl,tuIdx){
  const p=sl.playoff; if(!p) return 0;
  if(p.campeon===tuIdx) return 30000;
  if(p.final&&p.final.indexOf(tuIdx)>=0) return 12000;
  if(p.semis&&p.semis.some(s=>s.indexOf(tuIdx)>=0)) return 6000;
  return 0;
}
// Salarios de la plantilla por temporada.
function salariosSuperliga(plantilla){ return (plantilla||[]).reduce((s,j)=>s+Math.round(mediaAttrs(j.attrs)*100),0); }
// Desarrollo de la plantilla entre temporadas: los jóvenes crecen hacia su techo,
// los veteranos declinan; todos cumplen un año. Devuelve un resumen de cambios.
function evolucionaPlantillaSL(plantilla,rnd){
  const r=rnd||Math.random, cambios=[];
  (plantilla||[]).forEach(j=>{
    j.edad=(j.edad||24)+1;
    const niv=mediaAttrs(j.attrs), pot=j.pot||niv;
    if(j.edad<=24 && niv<pot){ const k=pick(ATTR_KEYS); j.attrs[k]=clamp(j.attrs[k]+(r()<.5?2:1),20,96); cambios.push(j.n+" ↑"); }
    else if(j.edad>=32){ const k=pick(ATTR_KEYS); j.attrs[k]=clamp(j.attrs[k]-1,20,96); cambios.push(j.n+" ↓"); }
  });
  return cambios;
}
// Cierre de temporada de tu club: posición final, premios, salarios, objetivo de
// la junta y desarrollo de la plantilla. Muta sl.caja y sl.plantilla; devuelve el resumen.
function cierreTempSuperliga(sl){
  const tu=sl.equipos.findIndex(e=>e.tuyo);
  const cls=clasificacionLiga(sl), pos=cls.findIndex(f=>f.i===tu)+1;
  const premio=ecoIngreso(premioSuperliga(pos)+bonusPlayoffSL(sl,tu)), sal=salariosSuperliga(sl.plantilla);
  sl.caja=(sl.caja||0)+premio-sal;
  const evo=evolucionaPlantillaSL(sl.plantilla);
  return {pos,premio,sal,caja:sl.caja,objetivoCumplido:pos<=(sl.objetivo||8),campeon:!!(sl.playoff&&sl.playoff.campeon===tu),evo};
}
// Mercado de fichajes: agentes libres para reforzar tu plantilla.
function mkMercadoSL(){ const a=[]; for(let i=0;i<4;i++) a.push(mkAgente(54,74,"M")); return a; }
function costeFichajeSL(j){ return Math.round(mediaAttrs(j.attrs)*mediaAttrs(j.attrs)*4); }
// Ficha un candidato (paga con caja). reemplazoIdx opcional para sustituir a un jugador.
function ficharSL(sl,cand,reemplazoIdx){
  const coste=costeFichajeSL(cand);
  if((sl.caja||0)<coste) return {ok:false,txt:"Caja insuficiente."};
  if(sl.plantilla.length>=8 && (reemplazoIdx==null||reemplazoIdx<0)) return {ok:false,txt:"Plantilla llena (máx 8)."};
  sl.caja-=coste;
  if(reemplazoIdx!=null&&reemplazoIdx>=0) sl.plantilla[reemplazoIdx]=cand; else sl.plantilla.push(cand);
  return {ok:true,txt:`Fichado ${cand.n} por ${coste.toLocaleString("es")}€.`};
}
// Calendario round-robin a doble vuelta para n equipos (n par). Array de jornadas; cada jornada, pares [local,visitante].
function mkCalendarioLiga(n){
  const m=n, mitad=m/2, jornadas=[]; let arr=[...Array(m).keys()];
  for(let r=0;r<m-1;r++){
    const jor=[]; for(let i=0;i<mitad;i++) jor.push([arr[i],arr[m-1-i]]);
    jornadas.push(jor);
    arr=[arr[0],arr[m-1]].concat(arr.slice(1,m-1));   // rota fijando el primero
  }
  return jornadas.concat(jornadas.map(jor=>jor.map(([a,b])=>[b,a])));   // vuelta: se invierte local/visitante
}
// Crea el estado de una temporada de Superliga: 15 clubes NPC + tu club (16 equipos).
function mkSuperliga(tuNombre,tuFuerza,tuColor){
  const npc=CLUBES_NPC.slice(0,15).map(c=>({n:c.n,color:c.color,fuerza:fuerzaClubNPC(c.n),tuyo:false}));
  const equipos=[{n:tuNombre||"Rising SC",color:tuColor||"#C6F53C",fuerza:tuFuerza||62,tuyo:true}].concat(npc);
  return {equipos,calendario:mkCalendarioLiga(equipos.length),jornada:0,
    tabla:equipos.map(()=>({pts:0,pj:0,pg:0,pp:0,gf:0,gc:0})),fase:"liga",playoff:null,ultima:null,temporada:1,
    caja:40000,objetivo:juntaTop(8),mercado:null};
}
// Juega la jornada actual (todos los cruces), actualiza la tabla y avanza. Devuelve los resultados.
function jugarJornadaLiga(sl,rnd){
  if(sl.fase!=="liga"||sl.jornada>=sl.calendario.length) return null;
  const jor=sl.calendario[sl.jornada], res=[];
  jor.forEach(([a,b])=>{
    const r=resuelveCruceEquipos(sl.equipos[a],sl.equipos[b],rnd), ta=sl.tabla[a],tb=sl.tabla[b];
    ta.pj++;tb.pj++; ta.gf+=r.gA;ta.gc+=r.gB; tb.gf+=r.gB;tb.gc+=r.gA;
    if(r.ganador===0){ ta.pg++;ta.pts+=3;tb.pp++; } else { tb.pg++;tb.pts+=3;ta.pp++; }
    res.push({a,b,gA:r.gA,gB:r.gB});
  });
  sl.jornada++; sl.ultima=res;
  if(sl.jornada>=sl.calendario.length) _iniciaPlayoffs(sl);
  return res;
}
// Clasificación ordenada (puntos, diferencia, favor).
function clasificacionLiga(sl){
  return sl.equipos.map((e,i)=>({i,e,t:sl.tabla[i]}))
    .sort((x,y)=>y.t.pts-x.t.pts||(y.t.gf-y.t.gc)-(x.t.gf-x.t.gc)||y.t.gf-x.t.gf);
}
function _iniciaPlayoffs(sl){
  const top=clasificacionLiga(sl).slice(0,8).map(t=>t.i);
  sl.fase="playoff";
  // cuartos con emparejamiento por siembra; el 1º y el 2º quedan en llaves distintas
  sl.playoff={ronda:"cuartos",
    cuartos:[[top[0],top[7]],[top[3],top[4]],[top[1],top[6]],[top[2],top[5]]],
    semis:null,final:null,campeon:null};
}
// Juega la ronda de playoff pendiente (cuartos → semis → final). Devuelve {fase, ...}.
function jugarPlayoff(sl,rnd){
  const p=sl.playoff; if(!p||sl.fase!=="playoff") return null;
  if(p.ronda==="cuartos"){
    const g=p.cuartos.map(([a,b])=>resuelveCruceEquipos(sl.equipos[a],sl.equipos[b],rnd).ganador===0?a:b);
    p.semis=[[g[0],g[1]],[g[2],g[3]]]; p.ronda="semis";
    return {fase:"cuartos",ganadores:g};
  }
  if(p.ronda==="semis"){
    const g=p.semis.map(([a,b])=>resuelveCruceEquipos(sl.equipos[a],sl.equipos[b],rnd).ganador===0?a:b);
    p.final=g.slice(); p.ronda="final";
    return {fase:"semis",finalistas:g};
  }
  if(p.ronda==="final"){
    const [a,b]=p.final, r=resuelveCruceEquipos(sl.equipos[a],sl.equipos[b],rnd);
    p.campeon=r.ganador===0?a:b; p.ronda="fin"; sl.fase="fin";
    return {fase:"final",campeon:p.campeon};
  }
  return null;
}

/* ---------------- capa de pantalla (fina) ---------------- */
function entrarSuperliga(){
  document.body.classList.remove("con-hud"); document.body.classList.remove("en-partido");
  irA("superliga"); pintarSuperliga(); guardar();
}
function crearSuperliga(){
  let nom="Rising SC";
  try{ if(typeof prompt==="function"){ const x=prompt("Nombre de tu club en la Superliga:","Rising SC"); if(x) nom=x.slice(0,24); } }catch(e){}
  const sl=mkSuperliga(nom,62,"#C6F53C");
  sl.plantilla=mkPlantillaSuperliga();
  sl.alin=[[0,1],[2,3],[4,5]];
  sl.mercado=mkMercadoSL();
  sincronizaClubSL(sl);
  G={modo:"superliga",dif:difMenu(),superliga:sl};
  entrarSuperliga();
}
// El jugador reordena su alineación (mueve un jugador a otra pareja).
function asignaParejaSL(jug,destino){
  const sl=G&&G.superliga; if(!sl||!sl.alin) return;
  reasignaPareja(sl.alin,jug,destino); sincronizaClubSL(sl);
  guardar(); pintarSuperliga();
}
function _slFilaTabla(sl,fila,pos){
  const e=fila.e,t=fila.t, tuyo=e.tuyo;
  const zona=pos<=8?"border-left:3px solid var(--lima)":"border-left:3px solid transparent";
  return `<tr style="${zona}${tuyo?";background:rgba(198,245,60,.08)":""}">
    <td class="pos">${pos}</td>
    <td style="font-size:11.5px"><span style="color:${e.color}">●</span> ${tuyo?"<b>":""}${e.n}${tuyo?"</b>":""}</td>
    <td class="pts">${t.pj}</td><td class="pts">${t.pg}</td><td class="pts">${t.pp}</td>
    <td class="pts">${t.gf}-${t.gc}</td><td class="pts" style="color:var(--lima)"><b>${t.pts}</b></td></tr>`;
}
function pintarSuperliga(){
  const sl=G&&G.superliga; if(!sl) return;
  if(!sl.plantilla){ sl.plantilla=mkPlantillaSuperliga(); sl.alin=[[0,1],[2,3],[4,5]]; sincronizaClubSL(sl); }   // guardados anteriores
  if(sl.caja==null) sl.caja=40000; if(!sl.objetivo) sl.objetivo=8; if(!sl.mercado) sl.mercado=mkMercadoSL();
  document.getElementById("topCtx").innerHTML=`<b>Superliga</b> · Temporada ${sl.temporada} · ${sl.equipos.length} clubes`;
  _pintarEquipoSL(sl);
  const cls=clasificacionLiga(sl);
  const tabla=`<table class="rk"><tr class="hd"><td>#</td><td>Club</td><td>PJ</td><td>G</td><td>P</td><td>Ptos</td><td>Pts</td></tr>${cls.map((f,i)=>_slFilaTabla(sl,f,i+1)).join("")}</table>`;
  const slTabla=document.getElementById("slTabla"); if(slTabla) slTabla.innerHTML=tabla;
  // info + resultados de la última jornada
  const nom=i=>sl.equipos[i].n;
  let info="", accion="";
  if(sl.fase==="liga"){
    info=`Jornada ${sl.jornada+ (sl.jornada<sl.calendario.length?1:0)} de ${sl.calendario.length} · liga regular. Los 8 primeros pasan a los playoffs.`;
    accion=`<button class="pri" style="width:100%" onclick="accionSuperliga()">▶ Jugar jornada ${sl.jornada+1}</button>`;
  } else if(sl.fase==="playoff"){
    const p=sl.playoff;
    if(p.ronda==="cuartos"){ info=`🏆 PLAYOFFS · Cuartos: ${p.cuartos.map(c=>`${nom(c[0])}–${nom(c[1])}`).join(" · ")}`; accion=`<button class="pri" style="width:100%" onclick="accionSuperliga()">▶ Jugar cuartos de final</button>`; }
    else if(p.ronda==="semis"){ info=`🏆 PLAYOFFS · Semifinales: ${nom(p.semis[0][0])} vs ${nom(p.semis[0][1])} · ${nom(p.semis[1][0])} vs ${nom(p.semis[1][1])}`; accion=`<button class="pri" style="width:100%" onclick="accionSuperliga()">▶ Jugar semifinales</button>`; }
    else { info=`🏆 PLAYOFFS · FINAL: ${nom(p.final[0])} vs ${nom(p.final[1])}`; accion=`<button class="pri" style="width:100%" onclick="accionSuperliga()">▶ Jugar la final</button>`; }
  } else if(sl.fase==="fin"){
    const camp=sl.playoff.campeon;
    info=`🏆 CAMPEÓN de la Superliga: <b style="color:${sl.equipos[camp].color}">${nom(camp)}</b>${sl.equipos[camp].tuyo?" — ¡ES EL TUYO!":""}.`;
    accion=`<button class="pri" style="width:100%" onclick="nuevaTempSuperliga()">✦ Nueva temporada</button>`;
  }
  const slInfo=document.getElementById("slInfo"); if(slInfo) slInfo.innerHTML=info;
  const slAccion=document.getElementById("slAccion"); if(slAccion) slAccion.innerHTML=accion;
  const slRes=document.getElementById("slResult");
  if(slRes){
    if(sl.ultima&&sl.ultima.length){
      slRes.innerHTML=`<div class="foot" style="text-align:left;margin-bottom:3px">Última jornada:</div>`+sl.ultima.map(m=>`<div style="font-size:11px;padding:1px 0">${nom(m.a)} <b style="color:${m.gA>m.gB?"var(--lima)":"var(--gris)"}">${m.gA}</b>–<b style="color:${m.gB>m.gA?"var(--lima)":"var(--gris)"}">${m.gB}</b> ${nom(m.b)}</div>`).join("");
    } else slRes.innerHTML="";
  }
}
// Panel de tu plantilla con la alineación de 3 parejas (editable).
function _pintarEquipoSL(sl){
  const slEq=document.getElementById("slEquipo"); if(!slEq||!sl.plantilla||!sl.alin) return;
  const tu=sl.equipos.find(e=>e.tuyo)||{fuerza:0};
  const ladoT=l=>(typeof ladoTxt==="function")?ladoTxt(l):(l===1?"revés":"drive");
  const cls=clasificacionLiga(sl), tuIdx=sl.equipos.findIndex(e=>e.tuyo), pos=cls.findIndex(f=>f.i===tuIdx)+1;
  const objOk=pos>0&&pos<=(sl.objetivo||8);
  let html=`<div class="meta" style="margin:0 0 8px"><div class="chip">Fuerza <b style="color:var(--lima)">${tu.fuerza}</b></div><div class="chip">Caja <b style="color:${(sl.caja||0)<0?"var(--rojo)":"var(--lima)"}">${(sl.caja||0).toLocaleString("es")}€</b></div><div class="chip">Junta: <b style="color:${objOk?"var(--verde)":"var(--rojo)"}">top ${sl.objetivo||8}</b> ${pos>0?`(vas ${pos}º)`:""}</div><div class="chip" title="${dif().desc}">${dif().emoji} <b>${dif().n}</b></div></div>
  <div class="foot" style="text-align:left;margin-bottom:6px">Alinea tus 3 parejas: la química de lados (drive+revés) suma.</div>`;
  sl.alin.forEach((par,pi)=>{
    html+=`<div class="opcion" style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:11px">Pareja ${pi+1}</b><span class="pill lima">fuerza ${fuerzaParejaSL(sl.plantilla,par)}</span></div>`;
    par.forEach(ji=>{ const j=sl.plantilla[ji];
      html+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:11px">
        <span>${j.n} <span style="color:var(--gris)">· ${mediaAttrs(j.attrs)} · ${ladoT(j.lado)}</span></span>
        <span>${[0,1,2].filter(d=>d!==pi).map(d=>`<button class="selbtn" style="font-size:9px;padding:2px 6px" onclick="asignaParejaSL(${ji},${d})">→ P${d+1}</button>`).join("")}</span></div>`;
    });
    html+=`</div>`;
  });
  // mercado de fichajes
  if(sl.mercado&&sl.mercado.length){
    html+=`<div class="bclabel" style="margin-top:6px">Mercado de fichajes${sl.plantilla.length>=8?" · plantilla llena (sustituye)":""}</div>`;
    sl.mercado.forEach((cand,ci)=>{
      const coste=costeFichajeSL(cand), puede=(sl.caja||0)>=coste;
      html+=`<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:2px 0">
        <span>${cand.n} <span style="color:var(--gris)">· ${mediaAttrs(cand.attrs)} · ${ladoT(cand.lado)}</span></span>
        <button class="selbtn" style="font-size:9px;padding:2px 7px" ${puede?"":"disabled"} onclick="ficharSLui(${ci})">${puede?`Fichar ${coste.toLocaleString("es")}€`:"Caja insuficiente"}</button></div>`;
    });
  }
  slEq.innerHTML=html;
}
// Ficha un candidato del mercado desde la UI (sustituye al jugador más flojo si la plantilla está llena).
function ficharSLui(ci){
  const sl=G&&G.superliga; if(!sl||!sl.mercado) return;
  const cand=sl.mercado[ci]; if(!cand) return;
  let reemplazo=null;
  if(sl.plantilla.length>=8){
    const enAlin=new Set(sl.alin.flat());
    let peor=-1,peorNiv=999; sl.plantilla.forEach((j,i)=>{ if(!enAlin.has(i)&&mediaAttrs(j.attrs)<peorNiv){ peorNiv=mediaAttrs(j.attrs); peor=i; } });
    if(peor<0){ avisa("✗ Plantilla llena y todos alineados: no hay a quién sustituir."); return; }
    reemplazo=peor;
  }
  const r=ficharSL(sl,cand,reemplazo);
  if(r.ok){ sl.mercado.splice(ci,1); sincronizaClubSL(sl); avisa("✍ "+r.txt); } else avisa("✗ "+r.txt);
  guardar(); pintarSuperliga();
}
function accionSuperliga(){
  const sl=G&&G.superliga; if(!sl) return;
  if(sl.fase==="liga") jugarJornadaLiga(sl);
  else if(sl.fase==="playoff") jugarPlayoff(sl);
  guardar(); pintarSuperliga();
}
function nuevaTempSuperliga(){
  const sl=G&&G.superliga; if(!sl) return;
  const tuyo=sl.equipos.find(e=>e.tuyo)||{n:"Rising SC",color:"#C6F53C",fuerza:62};
  const res=cierreTempSuperliga(sl);   // premios, salarios, objetivo y desarrollo de la temporada que acaba
  const nueva=mkSuperliga(tuyo.n,tuyo.fuerza,tuyo.color); nueva.temporada=(sl.temporada||1)+1;
  nueva.plantilla=sl.plantilla||mkPlantillaSuperliga(); nueva.alin=sl.alin||[[0,1],[2,3],[4,5]];
  nueva.caja=sl.caja; nueva.objetivo=sl.objetivo; nueva.mercado=mkMercadoSL();
  sincronizaClubSL(nueva);
  G.superliga=nueva; guardar(); pintarSuperliga();
  avisa(`🏁 Cierre de temporada: ${res.pos}º · premios +${res.premio.toLocaleString("es")}€, salarios -${res.sal.toLocaleString("es")}€. ${res.objetivoCumplido?"✔ Objetivo de la junta cumplido.":"✗ Objetivo incumplido: la junta aprieta."}`);
}

if(typeof module!=="undefined"&&module.exports){ module.exports={}; }

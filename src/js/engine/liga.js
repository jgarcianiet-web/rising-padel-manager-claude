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
// Crea el estado de una temporada de Superliga: 7 clubes NPC + tu club (8 equipos).
function mkSuperliga(tuNombre,tuFuerza,tuColor){
  const npc=CLUBES_NPC.slice(0,7).map(c=>({n:c.n,color:c.color,fuerza:fuerzaClubNPC(c.n),tuyo:false}));
  const equipos=[{n:tuNombre||"Rising SC",color:tuColor||"#C6F53C",fuerza:tuFuerza||62,tuyo:true}].concat(npc);
  return {equipos,calendario:mkCalendarioLiga(equipos.length),jornada:0,
    tabla:equipos.map(()=>({pts:0,pj:0,pg:0,pp:0,gf:0,gc:0})),fase:"liga",playoff:null,ultima:null,temporada:1};
}
// Juega la jornada actual (todos los cruces), actualiza la tabla y avanza. Devuelve los resultados.
function jugarJornadaLiga(sl,rnd){
  if(sl.fase!=="liga"||sl.jornada>=sl.calendario.length) return null;
  const jor=sl.calendario[sl.jornada], res=[];
  jor.forEach(([a,b])=>{
    const r=resuelveCruce(sl.equipos[a].fuerza,sl.equipos[b].fuerza,rnd), ta=sl.tabla[a],tb=sl.tabla[b];
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
  const top=clasificacionLiga(sl).slice(0,4).map(t=>t.i);
  sl.fase="playoff";
  sl.playoff={ronda:"semis",semis:[[top[0],top[3]],[top[1],top[2]]],finalistas:null,final:null,campeon:null};
}
// Juega la ronda de playoff pendiente (semis → final). Devuelve {fase, ...}.
function jugarPlayoff(sl,rnd){
  const p=sl.playoff; if(!p||sl.fase!=="playoff") return null;
  if(p.ronda==="semis"){
    const g=p.semis.map(([a,b])=>resuelveCruce(sl.equipos[a].fuerza,sl.equipos[b].fuerza,rnd).ganador===0?a:b);
    p.finalistas=g; p.final=g.slice(); p.ronda="final";
    return {fase:"semis",finalistas:g};
  }
  if(p.ronda==="final"){
    const [a,b]=p.final, r=resuelveCruce(sl.equipos[a].fuerza,sl.equipos[b].fuerza,rnd);
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
  G={modo:"superliga",superliga:mkSuperliga(nom,62,"#C6F53C")};
  entrarSuperliga();
}
function _slFilaTabla(sl,fila,pos){
  const e=fila.e,t=fila.t, tuyo=e.tuyo;
  const zona=pos<=4?"border-left:3px solid var(--lima)":"border-left:3px solid transparent";
  return `<tr style="${zona}${tuyo?";background:rgba(198,245,60,.08)":""}">
    <td class="pos">${pos}</td>
    <td style="font-size:11.5px"><span style="color:${e.color}">●</span> ${tuyo?"<b>":""}${e.n}${tuyo?"</b>":""}</td>
    <td class="pts">${t.pj}</td><td class="pts">${t.pg}</td><td class="pts">${t.pp}</td>
    <td class="pts">${t.gf}-${t.gc}</td><td class="pts" style="color:var(--lima)"><b>${t.pts}</b></td></tr>`;
}
function pintarSuperliga(){
  const sl=G&&G.superliga; if(!sl) return;
  document.getElementById("topCtx").innerHTML=`<b>Superliga</b> · Temporada ${sl.temporada} · ${sl.equipos.length} clubes`;
  const cls=clasificacionLiga(sl);
  const tabla=`<table class="rk"><tr class="hd"><td>#</td><td>Club</td><td>PJ</td><td>G</td><td>P</td><td>Ptos</td><td>Pts</td></tr>${cls.map((f,i)=>_slFilaTabla(sl,f,i+1)).join("")}</table>`;
  const slTabla=document.getElementById("slTabla"); if(slTabla) slTabla.innerHTML=tabla;
  // info + resultados de la última jornada
  const nom=i=>sl.equipos[i].n;
  let info="", accion="";
  if(sl.fase==="liga"){
    info=`Jornada ${sl.jornada+ (sl.jornada<sl.calendario.length?1:0)} de ${sl.calendario.length} · liga regular. Los 4 primeros pasan a los playoffs.`;
    accion=`<button class="pri" style="width:100%" onclick="accionSuperliga()">▶ Jugar jornada ${sl.jornada+1}</button>`;
  } else if(sl.fase==="playoff"){
    const p=sl.playoff;
    if(p.ronda==="semis"){ info=`🏆 PLAYOFFS · Semifinales: ${nom(p.semis[0][0])} vs ${nom(p.semis[0][1])} · ${nom(p.semis[1][0])} vs ${nom(p.semis[1][1])}`; accion=`<button class="pri" style="width:100%" onclick="accionSuperliga()">▶ Jugar semifinales</button>`; }
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
function accionSuperliga(){
  const sl=G&&G.superliga; if(!sl) return;
  if(sl.fase==="liga") jugarJornadaLiga(sl);
  else if(sl.fase==="playoff") jugarPlayoff(sl);
  guardar(); pintarSuperliga();
}
function nuevaTempSuperliga(){
  const sl=G&&G.superliga; if(!sl) return;
  const tuyo=sl.equipos.find(e=>e.tuyo)||{n:"Rising SC",color:"#C6F53C",fuerza:62};
  G.superliga=mkSuperliga(tuyo.n,tuyo.fuerza,tuyo.color); G.superliga.temporada=(sl.temporada||1)+1;
  guardar(); pintarSuperliga();
}

if(typeof module!=="undefined"&&module.exports){ module.exports={}; }

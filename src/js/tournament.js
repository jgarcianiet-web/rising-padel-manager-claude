/* ================================================================
   TORNEO Y PARTIDO (compartidos por ambos modos)
================================================================ */
function rivalDeFase(base,fase,usados){
  const _sx=miSexo();
  const target=base+FASE_OFFSET[fase];
  let margen=5,cand=[];
  while(cand.length<1&&margen<30){
    cand=G.world.parejas.filter(p=>!usados.has(p.id)&&(p.sexo||"M")===_sx&&Math.abs(nivelPareja(p)-target)<=margen);
    margen+=4;
  }
  const r=pick(cand)||pick(G.world.parejas.filter(p=>!usados.has(p.id)&&(p.sexo||"M")===_sx))||G.world.parejas.filter(p=>(p.sexo||"M")===_sx)[0]||G.world.parejas[0];
  usados.add(r.id);
  return r;
}
function abrirTorneo(ci,wildcard){
  const cat=CATS[ci];
  if(G.modo==="club"){ repararAlin(); if(!alineacion()){ avisa("✗ Necesitas al menos 2 jugadores en plantilla para competir."); return; } }
  let ent2=entradaEn(ci);
  if(ent2===-1){ if(wildcard&&!cat.tf) ent2=0; else return; }
  const viaje=costeViaje(ci);
  const LIM_DEUDA=-800;   // puedes tirar de crédito para llegar a un torneo (los premios sanean)
  if(ent().dinero-viaje<LIM_DEUDA){ avisa(`✗ Ni a crédito llega para el viaje (${viaje}€). Juega el FIP local o da clases para hacer caja.`); return; }
  ent().dinero-=viaje;
  if(ent().dinero<0) avisa(`⚠ En números rojos (${ent().dinero}€). Necesitas premios ya: cada ronda cuenta.`);
  const startFase=ent2;
  const usados=new Set();
  const rivales=[];
  for(let f=0;f<6;f++) rivales.push(f<startFase?null:rivalDeFase(cat.base,f,usados));
  const _slot=slotSemana(semanaTemp());
  const _ciudad=(cat.premier&&_slot.premier===ci)?_slot.ciudad:null;
  torneo={cat:ci,nombre:cat.n+(_ciudad?` · ${_ciudad}`:""),premierT:cat.premier,pts:cat.pts,premio:cat.premio,base:cat.base,fase:startFase,startFase,rivales,wildcard:!!wildcard};
  if(cat.premier&&startFase===2&&G.modo==="carrera"&&!G.carrera.pro){
    G.carrera.pro=true;
    noticia("hito","¡Profesionales de pleno derecho!","Cabezas de serie en un torneo Premier");
    avisa("🎉 Cabezas de serie en un torneo Premier: ¡sois profesionales de pleno derecho!");
  }
  if(cat.premier){
    const cuadro=rivales.filter(Boolean);
    const cocoNiv=Math.max(...cuadro.map(r=>nivelPareja(r)));
    const coco=cuadro.find(r=>nivelPareja(r)===cocoNiv);
    const miNiv=G.modo==="carrera"?Math.round((mediaAttrs(G.carrera.attrs)+mediaAttrs(G.carrera.compi.attrs))/2):(alineacion()?Math.round(alineacion().reduce((a,j)=>a+mediaAttrs(j.attrs),0)/2):50);
    torneo.favNos=miNiv>=cocoNiv-1;
    avisa(torneo.favNos
      ?`🎙 Pronóstico de la prensa: OS SEÑALAN FAVORITOS del ${torneo.nombre}. Ahora, a soportar el cartel.`
      :`🎙 Pronóstico de la prensa: los favoritos son ${coco.nombre} (nivel ${cocoNiv}). De vosotros, ni una línea. Mejor.`);
  }
  if(G.modo==="carrera"){
    const debut=DIAS[diaDeFase(startFase)-1];
    avisa(`📋 Inscritos en el ${torneo.nombre}${wildcard?" (wildcard)":""}. ${startFase===2?`Directos al cuadro: debut el ${debut} en octavos.`:startFase===3?`Cuadro de maestros: debut el ${debut} en cuartos.`:`La previa arranca el ${debut}.`} Viaje: ${viaje}€.`);
    guardar();pintarCarrera();
  } else {
    pintarTorneo();
    irA("torneo");
  }
}
function infoPropia(){
  if(G.modo==="carrera"){
    const c=G.carrera;
    return `Vosotros: media ${mediaAttrs(c.attrs)}+${mediaAttrs(c.compi.attrs)} · química ${c.quimica} · energía ${c.energia} · confianza ${c.conf}`;
  }
  const cl=G.clubG,al=alineacion();
  return `Pareja del ${cl.nombre}: ${al[0].n} (${mediaAttrs(al[0].attrs)}) + ${al[1].n} (${mediaAttrs(al[1].attrs)}) · química ${quimActual(cl)}`;
}
function pintarPlanPartido(){
  const e=ent(); if(!e.tactica) e.tactica={agres:"normal",diana:"repartir"};
  const t=e.tactica; if(!t.red)t.red="normal"; if(!t.clutch)t.clutch="normal";
  const ent_=entrenadorActual();
  const row=document.getElementById("planPartido");
  const btn=(g,v,txt)=>`<button class="selbtn${t[g]===v?" on":""}" onclick="setTactPrev('${g}','${v}')">${txt}</button>`;
  const grupo=(lbl,g,opts)=>`<div class="pgrow"><span class="plbl">${lbl}</span><span class="pbtns">${opts.map(o=>btn(g,o[0],o[1])).join("")}</span></div>`;
  row.innerHTML=`<div class="phead">Plan de partido <span>· se aplica al ver y al simular</span></div>
  <div class="plangrid">
    ${grupo("Agresividad","agres",[["conservadora","Segura"],["normal","Normal"],["agresiva","A degüello"]])}
    ${grupo("Objetivo","diana",[["repartir","Repartir"],["debil","Al flojo"]])}
    ${grupo("Red","red",[["aguantar","Aguantar"],["normal","Normal"],["subir","Subir"]])}
    ${grupo("Puntos calientes","clutch",[["conservar","Conservar"],["normal","Normal"],["arriesgar","Arriesgar"]])}
  </div>
  ${G.modo==="carrera"?`<div class="foot" style="text-align:left;margin-top:8px">${ent_.id>0?`${ent_.n} puede llevar el partido por ti: elige táctica según el rival y la ajusta set a set.`:"Sin entrenador: si delegas la simulación, irá a instinto (táctica normal, ajustes básicos)."}</div>`:`<div class="foot" style="text-align:left;margin-top:8px">Si delegas, el banquillo ajusta la táctica set a set.</div>`}`;
  document.getElementById("btnSimCoach").textContent=G.modo==="carrera"&&ent_.id>0?`🧠 Simular: decide ${ent_.n}`:"🧠 Simular: decide el banquillo";
}
function setTactPrev(g,v){ ent().tactica[g]=v; guardar(); pintarPlanPartido(); }
// Aplica la táctica que recomienda el informe del ojeador (un clic → plan listo).
function aplicarTacticaRec(agres,diana,red,clutch){
  const t=ent().tactica||(ent().tactica={agres:"normal",diana:"repartir"});
  t.agres=agres; t.diana=diana; if(red)t.red=red; if(clutch)t.clutch=clutch;
  guardar(); pintarPlanPartido();
  avisa("🔍 Plan del ojeador aplicado: "+(diana==="debil"?"cargar sobre el flojo":"repartir")+" · "+agres+(red&&red!=="normal"?" · red "+red:"")+".");
}
function coachTactica(){
  // el míster lee el partido: nivel relativo y marcador
  const r=torneo.rivales[torneo.fase];
  const nivR=nivelPareja(r);
  const mio=G.modo==="carrera"?Math.round((mediaAttrs(G.carrera.attrs)+mediaAttrs(G.carrera.compi.attrs))/2):(alineacion()?Math.round(alineacion().reduce((a,j)=>a+mediaAttrs(j.attrs),0)/2):50);
  const diff=mio-nivR;
  const s0=match?match.s[0]:0, s1=match?match.s[1]:0;
  let agres = diff>=4?"agresiva" : diff<=-4?"conservadora" : "normal";
  if(s0<s1) agres = agres==="conservadora"?"normal":"agresiva";      // perdiendo: arriesga
  if(s0>s1&&diff<0) agres="conservadora";                             // ganando al fuerte: administra
  const diana = Math.abs((r.jug[0]?mediaAttrs(r.jug[0].attrs):50)-(r.jug[1]?mediaAttrs(r.jug[1].attrs):50))>=5?"debil":"repartir";
  TACT.agres=agres; TACT.diana=diana;
}
function pintarTorneo(){
  pintarPlanPartido();
  document.getElementById("tNombre").innerHTML=`${torneo.premierT?"PREMIER · ":"CIRCUITO FIP · "}${torneo.nombre} · <em>${FASES[torneo.fase]}</em>`;
  const r=torneo.rivales[torneo.fase];
  const h2=ent().h2h[r.id];
  const h2txt=h2?`Os conocéis: ${h2.v}-${h2.d} a ${h2.v>=h2.d?"vuestro":"su"} favor.`:"Nunca os habéis enfrentado.";
  const persos=r.jug.map(j=>`${j.pais||""} ${j.n} (${persoNombre(j.perso).toLowerCase()})`).join(" · ");
  const entrada=torneo.startFase===2?"Cabezas de serie: directos al cuadro final.":"Entrada por la previa clasificatoria.";
  const clubR=(r.club!==undefined)?` <span class="pill" style="color:${CLUBES_NPC[r.club].color}">● ${CLUBES_NPC[r.club].n}</span>`:"";
  const miNiv=G.modo==="carrera"?Math.round((mediaAttrs(G.carrera.attrs)+mediaAttrs(G.carrera.compi.attrs))/2):(alineacion()?Math.round(alineacion().reduce((a,j)=>a+mediaAttrs(j.attrs),0)/2):50);
  const inf=informeRival(r,miNiv);
  let infoHTML="";
  if(inf){
    const li=(arr,col)=>arr.map(t=>`<div style="font-size:11px;color:${col};padding:1px 0;line-height:1.4">${t}</div>`).join("");
    infoHTML=`<div class="scout">
      <div class="scoutHd">🔍 INFORME DEL OJEADOR</div>
      ${li(inf.deb,"var(--verde)")}
      ${li(inf.fue,"var(--rojo)")}
      <div class="scoutRec"><b>Plan sugerido:</b> ${inf.recTxt}
        <button class="selbtn" style="font-size:10px;padding:3px 8px;margin-left:4px" onclick="aplicarTacticaRec('${inf.rec.agres}','${inf.rec.diana}','${inf.rec.red}','${inf.rec.clutch}')">Aplicar</button></div>
    </div>`;
  }
  document.getElementById("tInfo").innerHTML=`<span style="display:flex;gap:2px;margin-bottom:5px">${(r.jug||[]).map(j=>avatarSVG(j,38)).join("")}</span>Rival: <b>${r.nombre}</b>${clubR} <span class="pill">nivel ${nivelPareja(r)}</span> <span class="pill oro">#${rankingFilas().find(f=>f.id===r.id).pos}</span>${r.pro?' <span class="tagpro">PRO</span>':""}<br>
  <span style="font-size:11px;color:var(--gris)">${persos}</span><br>
  <span style="font-size:11px;color:var(--gris)">${h2txt}</span><br>
  <span style="font-size:11px;color:var(--gris)">${entrada}</span><br>
  <span style="font-size:11px;color:var(--gris)">${infoPropia()}</span>
  ${infoHTML}`;
  document.getElementById("tCuadro").innerHTML=FASES.map((fs,i)=>{
    if(i<torneo.startFase) return `<div style="opacity:.35">${fs}: exentos (ranking)</div>`;
    const rv=torneo.rivales[i];
    const quien=i<=torneo.fase?`: vs ${rv.nombre}`:`: rival por definir (~${torneo.base+FASE_OFFSET[i]})`;
    return `<div style="opacity:${i===torneo.fase?1:.55}">${fs}${i<torneo.fase?`: vs ${rv.nombre} ✔`:quien}${i===torneo.fase?"  ← estáis aquí":""}</div>`;
  }).join("");
}
function miTeam(){
  if(G.modo==="carrera"){
    const c=G.carrera;
    const fBase=factorForma(c.energia,c.quimica,null);   // energía + química
    const fYo=factorForma(c.energia,c.quimica,c.merma);  // tú, además, con la secuela de tu última lesión
    const mk=(attrs,fac)=>{const o={};ATTR_KEYS.forEach(k=>o[k]=Math.round(attrs[k]*fac));return o;};
    const miLado=(c.lado===0||c.lado===1)?c.lado:0;
    const yo={n:c.nombre,estilo:c.estilo,perso:c.perso,conf:c.conf,attrs:mk(c.attrs,fYo),me:true,sexo:c.sexo,ava:c.ava,_ropa:c._ropa||c.color,lado:miLado};
    // la moral del compañero se traduce en confianza real sobre la pista
    const compi={n:c.compi.n,estilo:c.compi.estilo,perso:c.compi.perso,conf:clamp(55+moralAjusteConf(c.compiMoral),15,95),attrs:mk(c.compi.attrs,fBase),sexo:c.sexo,lado:1-miLado};
    ME_COLOR=c.color;TEAM0_COLOR="#4FA3D8";
    const jug=c.lado===0?[yo,compi]:[compi,yo];
    return {nombre:`${c.nombre}/${c.compi.n}`,jug,atNet:false};
  }
  const cl=G.clubG,al=alineacion(),q=quimActual(cl);
  if(!al){ return {nombre:cl.nombre||"Tu club",jug:[{n:"—",attrs:mkAttrsNivel(40,"agresivo"),perso:"frio",sexo:cl.sexo},{n:"—",attrs:mkAttrsNivel(40,"defensivo"),perso:"frio",sexo:cl.sexo}],atNet:false}; }
  TEAM0_COLOR=cl.color;ME_COLOR=cl.color;
  const mkJ=(j)=>{
    const f=factorForma(j.energia,q,j.merma);   // energía + química + secuela de lesión
    const o={};ATTR_KEYS.forEach(k=>o[k]=Math.round(j.attrs[k]*f));
    return {n:j.n,estilo:j.estilo,perso:j.perso,conf:j.conf,attrs:o,_ref:j};
  };
  return {nombre:cl.nombre,jug:[mkJ(al[0]),mkJ(al[1])],atNet:false};
}
function calcPresion_base(){
  const m=match;let p=.15;
  if(m.p[0]===3||m.p[1]===3)p+=.35;
  if(m.p[0]===3&&m.p[1]===3)p+=.15;
  if(m.j[0]===6&&m.j[1]===6)p+=.25;
  if(m.s[0]===1&&m.s[1]===1)p+=.15;
  if(torneo&&torneo.fase===5)p+=.1;
  return Math.min(1,p);
}
function empezarPartido(ver,coach){
  const e0=ent();
  if(!e0.tactica) e0.tactica={agres:"normal",diana:"repartir"};
  TACT=coach?{...e0.tactica}:e0.tactica;
  const rival=torneo.rivales[torneo.fase];
  const h2pre=e0.h2h?e0.h2h[rival.id]:null;
  const clPre=clasificaRiv(h2pre);
  TEAM1_COLOR=(rival.club!==undefined)?CLUBES_NPC[rival.club].color:"#E06456";
  ent()._rivalesSemana.push(rival.id);
  teams=[miTeam(),rival];
  teams[1].jug.forEach(j=>{j.conf=j.conf??55;});
  stats=[mkStats(),mkStats()];
  match={p:[0,0],j:[0,0],s:[0,0],hist:[],server:Math.random()<.5?0:1,fin:false,ver,chall:[3,3],revisando:false,momento:{team:-1,run:0,best:[0,0],aviso:null}};
  match.autoCoach=!!coach;
  if(coach) coachTactica();
  if(ver){
    document.getElementById("pEqA").textContent=teams[0].nombre;
    document.getElementById("pEqB").textContent=teams[1].nombre;
    document.getElementById("avaA").innerHTML=(teams[0].jug||[]).map(j=>avatarSVG(j,30)).join("");
    document.getElementById("avaB").innerHTML=(teams[1].jug||[]).map(j=>avatarSVG(j,30)).join("");
    document.getElementById("coms").innerHTML="";
    if(clPre){
      match.rivBoost=clPre.tag==="RIVALIDAD"?.06:0;
      if(clPre.tag==="BESTIA NEGRA") teams[0].jug.forEach(j=>j.conf=clamp((j.conf??55)-4,10,95));
      if(clPre.tag==="CLIENTE") teams[1].jug.forEach(j=>j.conf=clamp((j.conf??55)-3,10,95));
      addCom(`${clPre.emo} ${clPre.tag==="RIVALIDAD"?`¡Capítulo ${h2pre.v+h2pre.d+1} de la rivalidad! ${h2pre.v}-${h2pre.d} hasta hoy.`:clPre.tag==="BESTIA NEGRA"?`Vuestra bestia negra al otro lado: ${h2pre.v}-${h2pre.d}. A romper el muro.`:`Un viejo cliente: ${h2pre.v}-${h2pre.d} a favor. Que no se despierte.`}`,0);
    }
    initPlayers();pintaMarcadorP();pintaChallenges();pintaTactica();
    musicaOn();
    irA("partido");
    setTimeout(()=>jugarPuntoAnim(),400);
  } else {
    let setsPrev=0;
    while(!match.fin){
      PRESION=calcPresion();
      resolverPunto(buildPoint(match.server).ganador);
      const setsAhora=match.s[0]+match.s[1];
      if(match.autoCoach&&setsAhora>setsPrev&&!match.fin){ coachTactica(); setsPrev=setsAhora; }
    }
    finPartido();
  }
}
// Momentum (parciales): rachas de puntos seguidos que "prenden". Un parcial
// largo contagia confianza al equipo caliente y se la quita al frío, de modo
// que el impulso cambia de verdad el desarrollo del partido (no es decorado).
function registraMomento(g){
  const m=match; if(!m) return;
  const mo=m.momento||(m.momento={team:-1,run:0,best:[0,0],aviso:null});
  mo.aviso=null;
  if(g===mo.team) mo.run++; else { mo.team=g; mo.run=1; }
  if(mo.run>(mo.best[g]||0)) mo.best[g]=mo.run;
  // a partir de 4 puntos seguidos el parcial prende, y sigue apretando cada 2
  if(mo.run>=4 && mo.run%2===0){
    mo.aviso=g;
    if(typeof teams!=="undefined"&&teams[g]&&teams[g].jug){
      teams[g].jug.forEach(j=>j.conf=clamp((j.conf??55)+2,10,95));
      const o=1-g; if(teams[o]&&teams[o].jug) teams[o].jug.forEach(j=>j.conf=clamp((j.conf??55)-1,10,95));
    }
  }
}
function resolverPunto(g){
  const m=match,r={};
  if(stats&&stats[g]) stats[g].pganados=(stats[g].pganados||0)+1;   // puntos ganados (para la barra en vivo)
  // rendimiento bajo presión: puntos calientes (break, 40-40, tie-break, final...)
  if(stats&&typeof PRESION!=="undefined"&&PRESION>=.45){
    [0,1].forEach(t=>{ if(stats[t]&&stats[t].presion) stats[t].presion.jug++; });
    if(stats[g]&&stats[g].presion) stats[g].presion.gan++;
  }
  registraMomento(g);
  // break points (ocasiones de rotura): el equipo al resto, a un punto de romper el saque
  const _rec=1-m.server;
  if(stats&&stats[_rec]&&stats[_rec].bp&&m.p[_rec]===3){
    stats[_rec].bp.jugados++;
    if(g===_rec) stats[_rec].bp.ganados++;
  }
  // --- marcador del juego: STAR POINT ---
  // Ventajas normales, pero si se dan dos ventajas sin concretar el juego
  // (deuce→ventaja→deuce→ventaja→deuce), se pasa a punto de oro (un punto decide).
  const o=1-g;
  let ganaJuego=false;
  if(m.golden){
    ganaJuego=true;                              // star point: el punto decide el juego
  } else if(m.p[g]===3 && m.p[o]===3){
    if(m.ventaja==null){ m.ventaja=g; }          // 40-40 → ventaja para g
    else if(m.ventaja===g){ ganaJuego=true; }    // concreta su ventaja → juego
    else {                                        // rompe la ventaja rival → vuelta a deuce
      m.ventaja=null;
      m.ventajasFallidas=(m.ventajasFallidas||0)+1;
      if(m.ventajasFallidas>=2) m.golden=true;   // dos ventajas sin concretar → star point
    }
  } else if(m.p[g]===3){
    ganaJuego=true;                              // 40 con el rival por debajo → juego
  } else {
    m.p[g]++;                                     // punto normal (puede llegar a 40-40)
  }
  if(ganaJuego){
    m.p=[0,0]; m.ventaja=null; m.ventajasFallidas=0; m.golden=false;
    m.j[g]++; m.server=1-m.server; r.juego=g;
    if((m.j[g]>=6&&m.j[g]-m.j[o]>=2)||m.j[g]===7){
      r.set=g;r.marcadorSet=`${m.j[0]}-${m.j[1]}`;
      m.hist.push(r.marcadorSet);
      m.s[g]++;m.j=[0,0];
      if(m.s[g]>=2) m.fin=true;
    }
  }
  return r;
}
const PTS=["0","15","30","40"];
function pintaTactica(){
  const row=document.getElementById("tactRow");
  if(!match||match.cpu){row.innerHTML="";return;}
  const t=ent().tactica; if(!t.red)t.red="normal"; if(!t.clutch)t.clutch="normal";
  const btn=(grupo,val,txt)=>`<button class="selbtn${t[grupo]===val?" on":""}" style="font-size:10px;padding:4px 6px" onclick="setTact('${grupo}','${val}')">${txt}</button>`;
  row.innerHTML=`<div class="chbar"><span>TÁCTICA</span><span style="display:flex;gap:4px;flex-wrap:wrap">${btn("agres","conservadora","Segura")}${btn("agres","normal","Normal")}${btn("agres","agresiva","A degüello")}<span style="color:var(--gris2)">·</span>${btn("diana","repartir","Repartir")}${btn("diana","debil","Al flojo")}</span></div>`
    +`<div class="chbar" style="margin-top:4px"><span>RED · CALIENTES</span><span style="display:flex;gap:4px;flex-wrap:wrap">${btn("red","aguantar","Aguantar")}${btn("red","normal","Red normal")}${btn("red","subir","Subir")}<span style="color:var(--gris2)">·</span>${btn("clutch","conservar","Conservar")}${btn("clutch","normal","Normal")}${btn("clutch","arriesgar","Arriesgar")}</span></div>`;
}
const _TACT_TXT={agres:v=>v,diana:v=>"buscar "+(v==="debil"?"al flojo":"a los dos"),red:v=>"red: "+v,clutch:v=>"puntos calientes: "+v};
function setTact(g,v){ ent().tactica[g]=v; guardar(); pintaTactica(); addCom(`⚙ Cambio táctico: ${(_TACT_TXT[g]||(x=>x))(v)}.`,0); }
function pintaChallenges(){
  const row=document.getElementById("challengeRow");
  if(!match){row.innerHTML="";return;}
  const dot=(n)=>{let h="";for(let i=0;i<3;i++)h+=`<i class="${i<n?"":"gastado"}">●</i>`;return h;};
  row.innerHTML=`<div class="chbar">
    <span>REVISIONES</span>
    <span class="chdots" title="${teams[0].nombre}">${dot(match.chall[0])} <span style="color:var(--gris2)">tú</span></span>
    <span class="chdots" title="${teams[1].nombre}">${dot(match.chall[1])} <span style="color:var(--gris2)">rival</span></span>
  </div>`;
}
function fotoHawk(dentro){
  // línea de fondo y bola cerca de ella
  const bx=150+(Math.random()*30-15), by=dentro?66:80;
  return `<svg viewBox="0 0 300 110"><rect width="300" height="110" fill="#0C1017"/>
    <rect x="40" y="20" width="220" height="70" fill="#17466B"/>
    <line x1="40" y1="72" x2="260" y2="72" stroke="#E9F3FB" stroke-width="3"/>
    <text x="50" y="34" fill="#8B94A7" font-family="monospace" font-size="9">LÍNEA DE FONDO</text>
    <ellipse cx="${bx}" cy="${by}" rx="12" ry="7" fill="${dentro?'#7CE08A':'#E06456'}" opacity=".35"/>
    <circle cx="${bx}" cy="${by}" r="7" fill="#E6FA50" stroke="#fff" stroke-width="1.5"/>
    <text x="${bx}" y="${by-12}" text-anchor="middle" fill="#fff" font-family="monospace" font-size="8">${dentro?"DENTRO":"FUERA"}</text>
  </svg>`;
}
function ofreceRevision(fin,g){
  // ¿revisable? punto cerrado por error de "out"/"glass" o winner al límite, en momento importante
  const cerrado = fin.end==="out"||fin.end==="glass"||fin.end==="porTres"||fin.end==="winner";
  const importante = match.p[0]>=2||match.p[1]>=2||PRESION>.45;
  const perdedor = fin.end==="out"||fin.end==="glass" ? fin.team : 1-g; // quien puede pedir revisión
  if(!cerrado||!importante||match.chall[perdedor]<=0||Math.random()<.55) return false;
  // solo el humano (equipo 0) decide; la IA revisa sola a veces
  if(perdedor===0){
    mostrarRevisionHumano(fin,g);
    return true;
  } else {
    // IA pide revisión ocasionalmente
    if(Math.random()<.5){ resolverRevision(fin,g,1); return true; }
  }
  return false;
}
function mostrarRevisionHumano(fin,g){
  match.revisando=true;
  const row=document.getElementById("challengeRow");
  row.innerHTML=`<div class="chbar"><span>¿PEDIR REVISIÓN DE VÍDEO?</span><span><button id="chSi" style="padding:4px 10px;font-size:11px" class="pri">Ojo de Halcón (${match.chall[0]})</button> <button id="chNo" style="padding:4px 10px;font-size:11px">Seguir</button></span></div>`;
  document.getElementById("chSi").onclick=()=>resolverRevision(fin,g,0);
  document.getElementById("chNo").onclick=()=>{ match.revisando=false; row.innerHTML=""; pintaTactica(); continuarTrasPunto(g); };
}
function resolverRevision(fin,g,quien){
  // el que pide es "quien"; gana la revisión (la bola era como él dice) con prob según su instinto
  const acierta=Math.random()<.4;  // la mayoría de revisiones confirman la decisión original
  const dentro = quien===g ? acierta : !acierta; // si acierta, la bola cae a favor del que revisa
  if(!acierta) match.chall[quien]--;   // NORMA: solo pierdes la revisión si te equivocas
  sfxClick();
  const ov=document.getElementById("hawk");ov.classList.remove("oculto");
  document.getElementById("hawkSvg").innerHTML=fotoHawk(dentro);
  const favor = acierta;
  const quText = quien===0?"Pides":"El rival pide";
  document.getElementById("hawkVerd").innerHTML = favor
    ? `<span style="color:var(--verde)">DECISIÓN CORREGIDA</span>`
    : `<span style="color:var(--rojo)">SE MANTIENE</span>`;
  document.getElementById("hawkTxt").textContent = favor
    ? `${quText} la revisión... ¡acierto! El punto cambia de manos y conservas la revisión.`
    : `${quText} la revisión... pero la decisión era correcta. Pierdes una revisión.`;
  // si acierta, el ganador del punto pasa a ser "quien"
  const ganadorFinal = favor ? quien : g;
  setTimeout(()=>{
    ov.classList.add("oculto");
    match.revisando=false;
    if(favor){ addCom(`⚖ Revisión de ${quien===0?teams[0].nombre:teams[1].nombre}: ¡acertada! El punto es para ${teams[ganadorFinal].nombre}. Conserva la revisión (${match.chall[quien]}).`,ganadorFinal); }
    else { addCom(`⚖ Revisión de ${quien===0?teams[0].nombre:teams[1].nombre}: fallida. Pierde una revisión (le quedan ${match.chall[quien]}).`,1-ganadorFinal); }
    pintaChallenges();
    continuarTrasPunto(ganadorFinal);
  },2200);
}
function mostrarTiempoMuerto(){
  match.pausaTM=true;
  const ov=document.getElementById("tmuerto");
  document.getElementById("tmSit").textContent=`Marcador de sets: ${match.s[0]}-${match.s[1]}. ${match.s[0]>match.s[1]?"Vais por delante — administra.":match.s[0]<match.s[1]?"Toca remar. Tu pareja te mira.":"Todo igualado."}`;
  ov.classList.remove("oculto");
  const e=ent(), c=G.modo==="carrera"?G.carrera:null;
  const cierra=(msg)=>{ov.classList.add("oculto");match.pausaTM=false;addCom(msg,0);setTimeout(()=>{if(match&&match.ver&&!match.fin)jugarPuntoAnim();},600);};
  document.getElementById("tmCalma").onclick=()=>{
    teams[0].jug.forEach(j=>{if(j.perso==="emocional"||j.perso==="conservador")j.conf=clamp((j.conf??55)+6,10,95);else j.conf=clamp((j.conf??55)+2,10,95);});
    cierra("🧊 Charla de calma: cabezas frías.");
  };
  document.getElementById("tmArenga").onclick=()=>{
    teams[0].jug.forEach(j=>{if(j.perso==="valiente"||j.perso==="emocional")j.conf=clamp((j.conf??55)+8,10,95);else j.conf=clamp((j.conf??55)+3,10,95);});
    if(c&&Math.random()<.3)c.compiMoral=clamp((c.compiMoral??65)+3,5,95);
    cierra("🔥 Arenga: sangre en los ojos.");
  };
  document.getElementById("tmBronca").onclick=()=>{
    teams[0].jug.forEach(j=>{
      if(j.perso==="frio"||j.perso==="valiente")j.conf=clamp((j.conf??55)+7,10,95);
      else j.conf=clamp((j.conf??55)-5,10,95);
    });
    if(c&&(c.compi.perso==="emocional"||c.compi.perso==="conservador"))c.compiMoral=clamp((c.compiMoral??65)-4,5,95);
    cierra("⚡ Bronca: o despierta... o se hunde.");
  };
}
function continuarTrasPunto(g){
  const r=resolverPunto(g);
  if(match&&match.momento&&match.momento.aviso===g){
    addCom(`🔥 Parcial de ${match.momento.run} puntos seguidos de ${teams[g].nombre}: se vienen arriba.`,g);
    sfxGrada(.5);
  }
  if(r.set!==undefined){ sfxSet(); addCom(`■ Set para ${teams[r.set].nombre} (${r.marcadorSet}).`,r.set); }
  pintaMarcadorP();
  anim=null;draw();
  if(match.fin){setTimeout(finPartido,900);}
  else setTimeout(()=>{if(match&&match.ver&&!match.fin&&!match.pausaTM) jugarPuntoAnim();},1000/speed);
}
// Barra de dos lados: local (lima) vs rival (gris), con porcentaje 0..100 del local.
function _bcBar(pct,colLocal){
  pct=clamp(Math.round(pct),0,100);
  return `<div class="bcbar"><i style="width:${pct}%;background:${colLocal||"var(--lima)"}"></i><i style="width:${100-pct}%;background:#3b4a5c"></i></div>`;
}
function pintaLiveStats(){ pintaBroadcast(); }   // compat: el marcador llama aquí cada punto
// Panel de retransmisión: marcador grande + stats en vivo (momentum, dominio de
// red, winners/errores) + estado del saque. Rellena la columna derecha del partido.
function pintaBroadcast(){
  const sc=document.getElementById("bcScore"), st=document.getElementById("bcStats");
  if(!sc||!st||!match||!teams) return;
  const m=match;
  // ---- marcador ----
  let punt;
  if(m.golden) punt="★ STAR";
  else if(m.ventaja===0) punt="VENT · 40";
  else if(m.ventaja===1) punt="40 · VENT";
  else punt=`${PTS[m.p[0]]} · ${PTS[m.p[1]]}`;
  const tb=(m.j[0]===6&&m.j[1]===6)?" · TIE-BREAK":"";
  const srv=(t)=>m.server===t?'<span class="srv">▸ saque</span>':"";
  sc.innerHTML=`<div class="teams">`
    +`<span class="tn">${teams[0].nombre}</span>`
    +`<span class="big${m.golden?" gold":""}">${punt}</span>`
    +`<span class="tn r">${teams[1].nombre}</span></div>`
    +`<div class="sub"><span>${srv(0)}</span>`
    +`<span>Sets ${m.s[0]}-${m.s[1]} · juegos ${m.j[0]}-${m.j[1]}${tb}</span>`
    +`<span>${srv(1)}</span></div>`;
  if(!m.ver||!stats){ st.innerHTML=""; return; }
  // ---- stats en vivo ----
  const w=[0,1].map(t=>stats[t].jug.reduce((a,j)=>a+(j.w||0),0));
  const e=[0,1].map(t=>stats[t].jug.reduce((a,j)=>a+(j.e||0),0));
  const pg=[0,1].map(t=>stats[t].pganados||0);
  const red=[0,1].map(t=>stats[t].red||0);
  const bp=[0,1].map(t=>stats[t].bp||{jugados:0,ganados:0});
  const fat=[0,1].map(t=>Math.round(((stats[t].fatiga||[0,0]).reduce((a,f)=>a+f,0))/2));
  const mo=m.momento;
  const domPct=pg[0]/(pg[0]+pg[1]||1)*100;
  const redPct=red[0]/(red[0]+red[1]||1)*100;
  const parcial=(mo&&mo.run>=3&&mo.team>=0)?`🔥 ${mo.team===0?mo.run+"-0":"0-"+mo.run}`:"";
  st.innerHTML=
    `<div class="bcstat"><div class="h"><span>Puntos ganados ${parcial}</span><b>${pg[0]}-${pg[1]}</b></div>${_bcBar(domPct)}</div>`
    +`<div class="bcstat"><div class="h"><span>🥅 Dominio de red</span><b>${red[0]}-${red[1]}</b></div>${_bcBar(redPct)}</div>`
    +`<div class="bcchips">`
      +`<span class="bcchip">Winners <b style="color:var(--lima)">${w[0]}</b>-${w[1]}</span>`
      +`<span class="bcchip">Errores <b style="color:var(--rojo)">${e[0]}</b>-${e[1]}</span>`
      +`<span class="bcchip">Rotura <b>${bp[0].ganados}/${bp[0].jugados}</b>-${bp[1].ganados}/${bp[1].jugados}</span>`
      +`<span class="bcchip">Fatiga <b>${fat[0]}</b>-${fat[1]}</span>`
      +`<span class="bcchip${parcial?" hot":""}">Táctica: ${TACT.agres}${TACT.diana==="debil"?" · al flojo":""}${TACT.red&&TACT.red!=="normal"?" · red:"+TACT.red:""}${TACT.clutch&&TACT.clutch!=="normal"?" · calientes:"+TACT.clutch:""}</span>`
    +`</div>`;
}
function pintaMarcadorP(){
  pintaLiveStats();
  const m=match;
  let marc;
  if(m.golden) marc="★ STAR POINT";
  else if(m.ventaja===0) marc="VENT · 40";
  else if(m.ventaja===1) marc="40 · VENT";
  else marc=`${PTS[m.p[0]]} · ${PTS[m.p[1]]}`;
  document.getElementById("pMarcador").textContent=marc;
  const tb=m.j[0]===6&&m.j[1]===6?" · TIE-BREAK":"";
  const hist=m.hist.length?` (${m.hist.join(", ")})`:"";
  document.getElementById("pJuegos").textContent=`Sets ${m.s[0]} — ${m.s[1]}${hist} · juegos ${m.j[0]}-${m.j[1]}${tb} · 3 sets a 6, star point`;
}
function addCom(txt,team){
  const box=document.getElementById("coms");
  const d=document.createElement("div");
  d.textContent=`${team===0?"›":"‹"} ${txt}`;
  box.prepend(d);
  while(box.children.length>16) box.removeChild(box.lastChild);
}
let anim=null;
function jugarPuntoAnim(){
  if(!match||match.fin) return;
  PRESION=calcPresion();
  const punto=buildPoint(match.server);
  const tl=[];let t0=0;
  punto.ev.forEach(evt=>{
    const segs=segsFor(evt);
    const total=segs.reduce((s,x)=>s+x.d,0);
    tl.push({t0,evt,segs,total});t0+=total+.12;
  });
  anim={tl,fin:t0,punto,t:0,last:0,comIdx:-1};
  ball.trail=[];
  requestAnimationFrame(loopAnim);
}
function loopAnim(ts){
  if(!anim) return;
  if(!anim.last) anim.last=ts;
  const dt=Math.min(.05,(ts-anim.last)/1000)*speed;anim.last=ts;
  anim.t+=dt;
  let act=null,idx=-1;
  for(let i=0;i<anim.tl.length;i++){if(anim.t>=anim.tl[i].t0&&anim.t<anim.tl[i].t0+anim.tl[i].total){act=anim.tl[i];idx=i;break;}}
  if(!act&&anim.t>=anim.fin){
    const g=anim.punto.ganador;
    const fin=anim.punto.ev[anim.punto.ev.length-1];
    if(["winner","porTres"].includes(fin.end)) sfxWinner(); else sfxError();
    addCom(fin.endCom,g);
    draw();
    if(match.ver && ofreceRevision(fin,g)){ anim=null; return; }  // espera decisión de revisión
    // ¿el punto cierra un set (sin acabar el partido)? → tiempo muerto
    const preS=[match.s[0],match.s[1]];
    continuarTrasPunto(g);
    const cambioSet=match&&!match.fin&&(match.s[0]!==preS[0]||match.s[1]!==preS[1]);
    if(cambioSet&&match.autoCoach) coachTactica();
    if(cambioSet&&match.ver&&!match.cpu){
      mostrarTiempoMuerto();
    }
    return;
  }
  if(act){
    if(idx!==anim.comIdx){
      anim.comIdx=idx;
      sfxGolpe(act.evt.shotKey);
      addCom(act.evt.com,act.evt.team);
      const runner=act.evt.to?{t:1-act.evt.team,idx:act.evt.recvIdx??0,x:act.evt.to.x,y:act.evt.to.y}:null;
      setTargets(act.evt.net,runner);
    }
    let tt=anim.t-act.t0,seg=null;
    for(const s of act.segs){if(tt<=s.d){seg=s;break;}tt-=s.d;}
    if(seg){
      const k=clamp(tt/seg.d,0,1);
      ball.x=seg.a.x+(seg.b.x-seg.a.x)*k;
      ball.y=seg.a.y+(seg.b.y-seg.a.y)*k;
      ball.z=seg.a.z*(1-k)+seg.b.z*k+4*seg.h*k*(1-k);
      ball.vis=true;
      ball.trail.push({x:ball.x,y:ball.y,z:ball.z});
      if(ball.trail.length>14) ball.trail.shift();
    }
  }
  stepPlayers(dt);draw();
  requestAnimationFrame(loopAnim);
}
document.getElementById("btnVel").onclick=e=>{
  speed=speed===1.6?2.6:speed===2.6?1:1.6;
  e.target.textContent="x"+speed;
};
document.getElementById("btnSimResto").onclick=()=>{
  if(!match) return;
  anim=null;match.ver=false;
  while(!match.fin){PRESION=calcPresion();resolverPunto(buildPoint(match.server).ganador);}
  finPartido();
};

function resumenPartido(){
  const gane=match.s[0]>match.s[1];
  const h=match.hist;
  const tie=h.some(x=>x==="7-6"||x==="6-7");
  const remonta=h.length===3&&((gane&&h[0].split("-").map(Number)[0]<h[0].split("-").map(Number)[1])||(!gane&&h[0].split("-").map(Number)[0]>h[0].split("-").map(Number)[1]));
  const w=[0,1].map(t=>stats[t].jug.reduce((a,j)=>a+(j.w||0),0));
  const e=[0,1].map(t=>stats[t].jug.reduce((a,j)=>a+(j.e||0),0));
  const L=[];
  if(gane&&match.s[1]===0&&h.every(x=>{const [a,b]=x.split("-").map(Number);return a-b>=3;})) L.push("Partido serio: dominio de principio a fin, sin dejar respirar.");
  else if(gane&&remonta) L.push("Remontada de casta: primer set cedido y reacción de campeones.");
  else if(!gane&&remonta) L.push("Duele: teníais el partido y se escapó en la remontada rival.");
  else if(tie&&h.length===3) L.push("Al límite absoluto: tres sets y decidido en los detalles del tie-break.");
  else if(tie) L.push("Igualadísimo: los tie-breaks marcaron el rumbo.");
  else if(gane) L.push("Trabajado y bien cerrado: cada set con oficio.");
  else L.push("No fue el día: el rival impuso su ritmo casi siempre.");
  if(gane&&w[0]<w[1]) L.push(`Victoria con oficio: menos winners que ellos (${w[0]}-${w[1]}) pero muchos menos regalos (${e[0]}-${e[1]}).`);
  else if(w[0]>w[1]*1.6) L.push(`Vendaval ofensivo: ${w[0]} winners vuestros por ${w[1]} suyos.`);
  else if(e[0]>e[1]*1.5) L.push(`Ojo al dato: ${e[0]} errores propios. ${gane?"Ganar así es caro.":"Ahí se fue el partido."}`);
  if(match.autoCoach) L.push(`El míster cerró el partido en modo ${TACT.agres}${TACT.diana==="debil"?", cargando sobre el flojo":""}.`);
  const red=[stats[0].red||0,stats[1].red||0];
  if(red[0]+red[1]>=6){
    if(red[0]>=red[1]*1.6) L.push(`Dueños de la red: ${red[0]} puntos cerrados desde arriba por ${red[1]} del rival. Ahí se ganó.`);
    else if(red[1]>=red[0]*1.6) L.push(`Os comieron la red: ${red[1]} puntos suyos desde arriba por ${red[0]} vuestros. Hay que subir mejor.`);
  }
  const mo=match.momento;
  if(mo&&Math.max(mo.best[0]||0,mo.best[1]||0)>=5){
    const bt=(mo.best[0]||0)>=(mo.best[1]||0)?0:1;
    L.push(`Rachas: el mejor parcial fue de ${mo.best[bt]} puntos seguidos ${bt===0?"vuestros":"del rival"}.`);
  }
  return L;
}
// Análisis táctico post-partido (desde vuestra perspectiva, equipo 0): el "por
// qué" del resultado. Cierra el círculo con el informe del ojeador previo.
function analisisPartido(){
  if(!stats||!teams) return [];
  const L=[];
  const topKey=(obj)=>{ let bk=null,bv=0; for(const k in (obj||{})){ if(obj[k]>bv){bv=obj[k];bk=k;} } return bk?{k:bk,v:bv}:null; };
  const lbl=(k)=>(typeof SHOTS!=="undefined"&&SHOTS[k])?SHOTS[k].label:k;
  const arma=topKey(stats[0].wShot);
  if(arma&&arma.v>=2) L.push(`🗡 Vuestra arma más letal: la ${lbl(arma.k)} (${arma.v} winners).`);
  const fallo=topKey(stats[0].eShot);
  if(fallo&&fallo.v>=2) L.push(`⚠ Vuestros errores llegaron sobre todo de la ${lbl(fallo.k)} (${fallo.v}).`);
  const re=[stats[1].jug[0].e||0, stats[1].jug[1].e||0];
  if(re[0]+re[1]>=3 && Math.abs(re[0]-re[1])>=2){
    const q=re[0]>=re[1]?0:1;
    L.push(`🎯 Cargasteis con acierto sobre ${teams[1].jug[q].n}: le forzasteis ${re[q]} errores.`);
  }
  const red=stats[0].red||0, pg=stats[0].pganados||0;
  if(pg>=6){ const pct=Math.round(red/pg*100); L.push(pct>=45?`🥅 Dominasteis la red: el ${pct}% de vuestros puntos se cerraron arriba.`:`↔ Os faltó red: solo el ${pct}% de vuestros puntos se cerraron arriba.`); }
  const pr=stats[0].presion||{jug:0,gan:0};
  if(pr.jug>=4){ const pct=Math.round(pr.gan/pr.jug*100); L.push(`${pct>=55?"💪":"🥵"} Bajo presión ganasteis ${pr.gan} de ${pr.jug} puntos calientes (${pct}%).`); }
  return L;
}
function mostrarFicha(cb){
  const nombres=[...teams[0].jug.map(j=>j.n),...teams[1].jug.map(j=>j.n)];
  const filas=[];
  [0,1].forEach(t=>stats[t].jug.forEach((j,i)=>filas.push({n:teams[t].jug[i].n,t,w:j.w||0,e:j.e||0,bal:(j.w||0)-(j.e||0)})));
  const mvp=filas.slice().sort((a,b)=>b.bal-a.bal||b.w-a.w)[0];
  document.getElementById("fichaCuerpo").innerHTML=`
    <div style="text-align:center;font-family:'Chakra Petch',sans-serif;font-size:22px;font-weight:700;margin-bottom:8px">${match.s[0]}-${match.s[1]} <span style="font-size:12px;color:var(--gris)">(${match.hist.join(", ")})</span></div>
    <table class="rk">${filas.map(f=>{const jj=[...teams[0].jug,...teams[1].jug].find(x=>x.n===f.n);return `<tr${f.n===mvp.n?' style="color:var(--oro)"':""}><td style="font-size:11px"><span style="display:inline-block;vertical-align:middle;margin-right:4px">${avatarSVG(jj,20)}</span>${f.n===mvp.n?"★ ":""}${f.n}</td><td class="pts" style="color:var(--lima)">${f.w}W</td><td class="pts" style="color:#E05656">${f.e}E</td><td class="pts">${f.bal>0?"+":""}${f.bal}</td></tr>`;}).join("")}</table>
    <div class="foot" style="text-align:left;margin-top:7px">★ MVP del partido: <b style="color:var(--oro)">${mvp.n}</b> (${mvp.w} winners, balance ${mvp.bal>0?"+":""}${mvp.bal}).</div>
    <div class="foot" style="text-align:left;margin-top:2px">Tiros ${stats[0].tiros||0}-${stats[1].tiros||0} · Red ${stats[0].red||0}-${stats[1].red||0} · Roturas ${stats[0].bp?stats[0].bp.ganados:0}/${stats[0].bp?stats[0].bp.jugados:0}-${stats[1].bp?stats[1].bp.ganados:0}/${stats[1].bp?stats[1].bp.jugados:0} · Fatiga final ${Math.round(((stats[0].fatiga||[0,0]).reduce((a,f)=>a+f,0))/2)}-${Math.round(((stats[1].fatiga||[0,0]).reduce((a,f)=>a+f,0))/2)}</div>
    ${(()=>{const an=analisisPartido();return an.length?`<div style="border-top:1px solid var(--borde);margin-top:9px;padding-top:7px"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--oro);margin-bottom:4px">🔍 Análisis táctico</div>${an.map(l=>`<div style="font-size:11.5px;line-height:1.5;color:var(--texto);padding:1px 0">${l}</div>`).join("")}</div>`:"";})()}
    ${match.ver?"":`<div style="border-top:1px solid var(--borde);margin-top:8px;padding-top:7px">${resumenPartido().map(l=>`<div style="font-size:11.5px;line-height:1.5;color:var(--gris);padding:1px 0">📋 ${l}</div>`).join("")}</div>`}`;
  const ov=document.getElementById("fichaP");
  ov.classList.remove("oculto");
  document.getElementById("fichaOk").onclick=()=>{ov.classList.add("oculto");cb();};
}
function finPartido(){
  if(match&&match.ver) musicaOff();
  if(match&&!match.cpu&&!match._fichaVista){
    match._fichaVista=true;
    mostrarFicha(()=>finPartido());
    return;
  }
  const gane=match.s[0]>match.s[1];
  const marcadorFinal=`${match.s[0]}-${match.s[1]} (${match.hist.join(", ")})`;
  const f=torneo.fase;
  const rival=torneo.rivales[f];
  const e=ent();
  if(!e.h2h[rival.id]) e.h2h[rival.id]={v:0,d:0};
  const h2r=e.h2h[rival.id];
  const clAntes=clasificaRiv(h2r);
  h2r[gane?"v":"d"]++;
  h2r.n=rival.nombre; h2r.ultT=temporada();
  if(f>=4) h2r.alta=(h2r.alta||0)+1;
  const clAhora=clasificaRiv(h2r);
  if(clAhora&&clAhora.tag==="RIVALIDAD"&&(!clAntes||clAntes.tag!=="RIVALIDAD")){
    noticia("hito",`Nace una rivalidad`,`${nombreEntidad().replace("★ ","")} y ${rival.nombre}: ${h2r.v+h2r.d} cruces y máxima igualdad. El circuito ya la espera.`);
    avisa(`🔥 La prensa habla de RIVALIDAD con ${rival.nombre}: ${h2r.v}-${h2r.d} en ${h2r.v+h2r.d} cruces.`);
    post("rivalidad",{rival:rival.nombre});
  }
  if(gane&&clAntes&&clAntes.tag==="BESTIA NEGRA"){
    e.conf!==undefined&&(e.conf=clamp(e.conf+6,15,95));
    if(G.modo==="carrera") G.carrera.conf=clamp(G.carrera.conf+6,15,95);
    noticia("hito",`Maldición rota`,`Por fin cae ${rival.nombre} (${h2r.v}-${h2r.d}). El muro mental, derribado.`);
    avisa(`⛓ ¡MALDICIÓN ROTA! Primera alegría de peso contra ${rival.nombre} (${h2r.v}-${h2r.d}).`);
    post("maldicion",{rival:rival.nombre});
  }
  e.vd=e.vd||{v:0,d:0}; e.vd[gane?"v":"d"]++;
  if(gane){ e.rachaAct=(e.rachaAct||0)+1; if(e.rachaAct>(e.rachaMax||0)){e.rachaMax=e.rachaAct;if(e.rachaMax===15)avisa("🔥 15 victorias seguidas: la racha ya es noticia en el circuito.");} }
  else e.rachaAct=0;
  fansAdd(gane?(torneo&&torneo.premierT?Math.round(R(15,40)):Math.round(R(2,8))):-Math.round(R(1,4)));
  if(Math.random()<(torneo&&torneo.premierT?.5:.15)) post(gane?"victoria":"derrota",{rival:rival.nombre,torneo:torneo?torneo.nombre:""});
  if(gane&&(e.rachaAct===5||e.rachaAct===10)) post("forma",{racha:e.rachaAct});
  let seLesiona=false, lesionTxt="";

  if(G.modo==="carrera"){
    const c=G.carrera;
    const misW=stats[0].jug[c.lado].w;
    c.energia=clamp(c.energia-11,0,100);
    c.conf=clamp(c.conf+(gane?5:-6),15,95);
    c.quimica=clamp(c.quimica+2,10,95);
    c.racha=(c.racha||[]).concat(gane?"V":"D").slice(-5);
    const dMoral=gane?(f>=4?7:4):(f<2?-7:-4);
    c.compiMoral=clamp((c.compiMoral??65)+dMoral,5,95);
    const les=intentaLesion(c,!!(c.staff&&c.staff.fisio));
    if(les){
      c.lesion=les;
      seLesiona=true;lesionTxt=c.lesion.n;
      c.conf=clamp(c.conf-4,15,95);                              // lesionarse mina la cabeza
      c.compiMoral=clamp((c.compiMoral??65)-5,5,95);             // y preocupa al compañero
      if(c.lesion.grav>=3) noticia("lesion",`Lesión de gravedad`,`${c.lesion.n}: parte médico serio, ${c.lesion.sem} semanas de baja`,miParejaProt());
    }
    if((gane||misW>=4)&&Math.random()<.45){
      const favor={defensivo:["globo","pared","chiquita","fondo"],agresivo:["remate","vibora","volea","bandeja"],bandejero:["bandeja","vibora","volea"],rematador:["remate","bandeja","volea"],constructor:["chiquita","dejada","fondo","globo"]}[c.estilo];
      const k=pick(favor);
      const freno=c.attrs[k]>=72?.4:1;
      if(c.attrs[k]<95&&Math.random()<freno) c.attrs[k]++;
    }
    avisa(`${gane?"✔ Victoria":"✗ Derrota"} ${marcadorFinal} vs ${rival.nombre} (${FASES[f].toLowerCase()}). Tú: ${misW}W/${stats[0].jug[c.lado].e}E.`);
  } else {
    const cl=G.clubG;
    const qk=quimKey(cl);
    cl.quims[qk]=clamp((cl.quims[qk]??40)+2,10,95);
    teams[0].jug.forEach((jv,i)=>{
      const j=jv._ref;
      j.energia=clamp(j.energia-11,0,100);
      j.conf=clamp(j.conf+(gane?4:-5),15,95);
      const w=stats[0].jug[i].w;
      if((gane&&Math.random()<.25)||w>=6){
        const k=pick(ATTR_KEYS);
        if(j.attrs[k]<88) j.attrs[k]++;
      }
      if(!j.lesion){
        const les=intentaLesion(j,!!G.clubG.staff.fisio);
        if(les){
          j.lesion=les;
          j.conf=clamp(j.conf-4,15,95);
          seLesiona=true;lesionTxt=`${j.n}: ${j.lesion.n}`;
          if(j.lesion.grav>=3) noticia("lesion",`Lesión de gravedad en el ${cl.nombre}`,`${j.n}: ${j.lesion.n}, ${j.lesion.sem} semanas de baja`);
        }
      }
    });
    avisa(`${gane?"✔ Victoria":"✗ Derrota"} ${marcadorFinal} del ${cl.nombre} vs ${rival.nombre} (${FASES[f].toLowerCase()}).`);
  }
  match=null;

  // neto() aplica el margen económico de la dificultad a TODO premio de torneo
  // (un solo punto para carrera y club) y, en carrera, la comisión del representante.
  const neto=(x)=>{x=ecoIngreso(x);const r=G.modo==="carrera"&&G.carrera.staff&&G.carrera.staff.rep;return r?Math.round(x*(1-(r.com||15)/100)):x;};
  if(!gane){
    const idx=loserIdx(f);
    e.pts+=torneo.pts[idx]||0;e.dinero+=neto(torneo.premio[idx]||0);
    rival.pts+=torneo.pts[Math.max(0,idx-1)]||0;
    avisa(`✗ Eliminados en ${FASES[f].toLowerCase()} del ${torneo.nombre}: +${torneo.pts[idx]||0} pts, +${neto(torneo.premio[idx]||0)}€. ${G.modo==="carrera"?"El resto de la semana, a tu aire.":""}`+(seLesiona?` ⚠ ${lesionTxt}.`:""));
    cerrarTorneo();return;
  }
  rival.pts+=torneo.pts[loserIdx(f)]||0;
  if(f===5){
    e.pts+=torneo.pts[0];e.dinero+=neto(torneo.premio[0]);
    e.palmares.push(`${torneo.nombre} (T${temporada()})`);
  if(G.modo==="club") clubPalma(-1,`${torneo.nombre} (T${temporada()})`);   // -1 = tu club (se ignora, ya está en e.palmares)
    if(torneo.premierT) e._campPremSem=semanaTemp();
    if(torneo.cat===6){ e.recMajors=(e.recMajors||0)+1; }
    if(torneo.cat===7){ e.recFinals=(e.recFinals||0)+1; }
    fansAdd([60,120,250,500,1500,3000,8000,5000][torneo.cat]||60,`título del ${torneo.nombre}`);
    post("titulo",{torneo:torneo.nombre});
    if(torneo.premierT&&torneo.favNos===false){
      noticia("titulo","¡CAMPANADA!",`Nadie los tenía en la quiniela y se llevan el ${torneo.nombre}. Épica pura.`,miParejaProt());
      fansAdd(Math.round(R(300,700)),"la campanada del año");
      post("campanada");
    }
    let extra="";
    if(G.modo==="carrera"){
      G.carrera.compiMoral=clamp((G.carrera.compiMoral??65)+8,5,95);
      if(G.carrera.sponsor){const bono=ecoIngreso(G.carrera.sponsor.bonus);e.dinero+=bono;extra=` Bonus de ${G.carrera.sponsor.marca}: +${bono}€.`;}
    }
    ent()._ultCamp=true;
    sfxTitulo();
    noticia("titulo",`¡Campeones del ${torneo.nombre}!`,`${G.modo==="carrera"?G.carrera.nombre+"/"+G.carrera.compi.n:G.clubG.nombre} · +${torneo.pts[0]} pts y ${torneo.premio[0]}€`,miParejaProt());
    avisa(`🏆 ¡CAMPEONES del ${torneo.nombre}! +${torneo.pts[0]} pts, +${neto(torneo.premio[0])}€.${extra}`+(seLesiona?` ⚠ ${lesionTxt}.`:""));
    cerrarTorneo();return;
  }
  if(seLesiona){
    const idx=loserIdx(f+1);
    e.pts+=torneo.pts[idx]||0;e.dinero+=neto(torneo.premio[idx]||0);
    noticia("lesion",`Retirada por lesión`,`${lesionTxt} — adiós al ${torneo.nombre} cuando iban lanzados`,miParejaProt());
    post("lesion");
    avisa(`⚠ ${lesionTxt}: retirada del torneo (W.O.) tras ganar. +${torneo.pts[idx]||0} pts.`);
    cerrarTorneo();return;
  }
  torneo.fase++;
  if(torneo.premierT&&torneo.fase===2&&G.modo==="carrera"&&!G.carrera.pro){
    G.carrera.pro=true;
    noticia("hito","¡Debut profesional!","Superada la previa: primer cuadro final de un Premier");
    avisa("🎉 ¡Superada la previa! Primer cuadro final de un torneo Premier: debut profesional.");
  }
  if(G.modo==="carrera"){
    avisa(`✔ Ronda superada en el ${torneo.nombre}: ${FASES[torneo.fase].toLowerCase()} el ${DIAS[diaDeFase(torneo.fase)-1]}.`);
    G.carrera._jugoTorneo=true;
    avanzarDia();
    irA("club");
  } else {
    pintarTorneo();
    irA("torneo");
  }
}
function ruedaDePrensa(gano,fase){
  const c=G.carrera; if(!c) return;
  const ov=document.getElementById("rueda");
  document.getElementById("ruedaQ").textContent=gano
    ?`Micrófonos tras el título: "¿Cómo se digiere ganar el ${torneo_ultimo?torneo_ultimo.nombre:"torneo"}?"`
    :`Zona mixta tras caer en ${FASES[fase].toLowerCase()}: "¿Qué ha faltado hoy?"`;
  const bH=document.getElementById("ruedaHumilde"),bA=document.getElementById("ruedaAmbi"),bP=document.getElementById("ruedaPicante");
  bH.textContent=gano?"«Trabajo y humildad. A seguir.»":"«El rival fue mejor. A entrenar.»";
  bA.textContent=gano?"«Vamos a por el nº1, sin esconderse.»":"«Volveremos más fuertes. Esto no queda así.»";
  bP.textContent=gano?"«Que se preparen los de arriba.»":"«El arbitraje nos ha condicionado, y lo sabe todo el mundo.»";
  ov.classList.remove("oculto");
  const fin=(msg,fx)=>{ov.classList.add("oculto");fx();avisa(msg);guardar();pintarCarrera();};
  bH.onclick=()=>fin("🎙 Declaraciones sobrias. El vestuario lo agradece.",()=>{
    c.compiMoral=clamp((c.compiMoral??65)+4,5,95);
  });
  bA.onclick=()=>fin("🎙 Ambición en titulares. La afición se enciende.",()=>{
    c.conf=clamp(c.conf+4,15,95);
    if(c.sponsor&&Math.random()<.35){c.dinero+=100;avisa(`${c.sponsor.marca} premia la repercusión: +100€.`);}
  });
  bP.onclick=()=>fin("🎙 Titular incendiario. Hay ruido... y consecuencias.",()=>{
    if(c.perso==="valiente"||c.perso==="emocional") c.conf=clamp(c.conf+7,15,95);
    else c.conf=clamp(c.conf-3,15,95);
    if(c.compi.perso==="conservador"||c.compi.perso==="frio") c.compiMoral=clamp((c.compiMoral??65)-5,5,95);
    else c.compiMoral=clamp((c.compiMoral??65)+3,5,95);
    noticia("hito","Declaraciones que arden",`${c.nombre} incendia la zona mixta. El circuito toma nota.`);
    fansAdd(Math.round(R(120,300)),"el ruido vende");
    post("picante");
  });
}
function cerrarTorneo(){
  const e=ent();
  e._accion="torneo";
  e.calRes=e.calRes||{};
  e.calRes[semanaTemp()]=e._ultCamp?"🏆":"•";
  e._ultCamp=false;
  const eraPremier=torneo&&torneo.premierT, faseCaida=torneo?torneo.fase:0, fueCampeon=e._ultCampFlag;
  torneo_ultimo=torneo;
  if(G.modo==="carrera"&&eraPremier&&(e.calRes[semanaTemp()]==="🏆"||faseCaida>=4)&&Math.random()<.75){
    setTimeout(()=>ruedaDePrensa(e.calRes[semanaTemp()]==="🏆",faseCaida),600);
  }
  torneo=null;
  if(G.modo==="carrera"){ G.carrera._jugoTorneo=true; avanzarDia(); irA("club"); }
  else { avanzarSemanaClub(); irA("clubm"); }
}
document.getElementById("btnVer").onclick=()=>empezarPartido(true);
document.getElementById("btnSimCoach").onclick=()=>empezarPartido(false,true);
document.getElementById("btnSimular").onclick=()=>empezarPartido(false);


/* ================================================================
   TORNEO Y PARTIDO (compartidos por ambos modos)
================================================================ */
function rivalDeFase(base,fase,usados){
  const _sx=miSexo();
  /* El primer rival de tu carrera vuelve a aparecer: es lo que convierte a una
     pareja cualquiera en «esos». Solo las dos primeras temporadas y solo en las
     rondas de entrada; después manda el sistema de némesis. */
  if(G.modo==="carrera"&&typeof arrSorteaRival==="function"){
    const rd=arrSorteaRival(G.carrera,fase);
    if(rd&&!usados.has(rd.id)&&(rd.sexo||"M")===_sx){ usados.add(rd.id); return rd; }
  }
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
/* ================================================================
   EL CUADRO

   Hasta ahora un torneo eran seis rivales sueltos, uno por ronda, generados por
   separado en el momento de inscribirse. No había torneo alrededor: nadie más
   jugaba, no existía la otra mitad del cuadro y daba igual quién cayera. En un
   juego de raqueta eso se nota, porque el cuadro es donde está la historia —
   que el primer cabeza de serie caiga en octavos te cambia el camino y lo sabes
   al mirar el papel.

   Ahora hay un cuadro final de 16 con siembra: los mejores se reparten por las
   esquinas para no cruzarse antes de tiempo, tú ocupas tu sitio según ranking,
   y cada ronda se resuelven TODOS los cruces. Tu siguiente rival es quien
   realmente haya ganado su partido, no una tirada nueva.

   Los cruces entre parejas del ordenador se resuelven por probabilidad según la
   diferencia de nivel, no simulando el partido punto a punto: son 15 partidos
   por torneo y hay que abrir el cuadro sin que se note la espera.
================================================================ */
const CUADRO_N=16;                 // parejas del cuadro final (octavos → final)
const CUADRO_FASE0=2;              // el cuadro final empieza en octavos

/* Orden de siembra estándar: el 1 y el 2 en extremos opuestos, el 3 y el 4 en
   los cuartos que no les tocan, etc. Así los favoritos solo se cruzan al final. */
const SIEMBRA_16=[0,15,8,7,4,11,12,3,2,13,10,5,6,9,14,1];
/* Los Maestros son ocho parejas y empiezan en cuartos: su cuadro es otro. */
const SIEMBRA_8=[0,7,4,3,2,5,6,1];
const CUADRO_TF_FASE=3;

/* Probabilidad de que A gane a B por diferencia de nivel. Esto resuelve los
   cruces del cuadro que NO juegas tú, así que su trabajo es predecir lo que
   habría pasado de simularlos: la constante sale de medir el motor de verdad,
   no de elegir un número redondo.

   Con 12 el cuadro y el motor se contradecían —el cuadro daba un 91% a doce
   puntos de diferencia y el motor medido da un 95%—, y esa grieta significaba
   que las parejas del ordenador avanzaban con una lógica distinta de la que
   sufres tú en la pista. Ajustada sobre la tabla medida (+4 → 70%, +6 → 77%,
   +8 → 87%, +12 → 95%). Si tocas el motor, vuelve a medirla. */
function probGana(nA,nB){ return 1/(1+Math.pow(10,(nB-nA)/9)); }
/* Nivel de una entrada del cuadro. Tu propia entrada no es una pareja del
   mundo (no tiene .jug), así que lleva su nivel calculado dentro. */
function nivCuadro(p){ return p?(p.yo?(p.nivel||50):nivelPareja(p)):0; }
/* Nombre visible de una entrada del cuadro, resuelto al pintar para que
   cambiar de idioma a mitad de torneo lo traduzca. */
function nomCuadro(p){ return p?(p.yo?t("cua_tu_pareja"):p.nombre):t("cua_pendiente"); }

/* Construye el cuadro final. Devuelve {ronda:{2:[...16]}, mi:índice} */
function mkCuadro(cat,usados){
  const sx=miSugSexo();
  const base=cat.base;
  /* Los Maestros no son un cuadro de 16 con previa: son los ocho mejores del
     año y arrancan en cuartos. Sin esto, entrar en ellos dejaba la ronda vacía
     y la pantalla del torneo reventaba al buscar rival. El fallo llevaba ahí
     desde siempre, escondido: con el ranking viejo nadie llegaba al top 8. */
  if(cat.tf){
    const mejores=[...G.world.parejas]
      .filter(p=>!usados.has(p.id)&&(p.sexo||"M")===sx&&!p.retiraT)
      .sort((a,b)=>(b.pts|0)-(a.pts|0))
      .slice(0,7);
    mejores.forEach(r=>usados.add(r.id));
    const yoTF={yo:true,nivel:nivelPareja({jug:miTeam().jug}),pts:(ent().pts|0)};
    const todosTF=mejores.map(r=>({p:r,pts:r.pts|0})).concat([{p:yoTF,pts:yoTF.pts}]);
    todosTF.sort((a,b)=>b.pts-a.pts);
    const casillas=new Array(8).fill(null);
    todosTF.forEach((x,i)=>{ if(i<8) casillas[SIEMBRA_8[i]]=x.p; });
    return {ronda:{[CUADRO_TF_FASE]:casillas}, mi:casillas.findIndex(p=>p&&p.yo), n:8, tf:true};
  }
  // 15 rivales del nivel del torneo, de más fuerte a más flojo
  const rivales=[];
  for(let i=0;i<CUADRO_N-1;i++){
    const target=base+8-i*(16/(CUADRO_N-1));    // del cabeza de serie al último
    let margen=5,cand=[];
    while(cand.length<1&&margen<34){
      cand=G.world.parejas.filter(p=>!usados.has(p.id)&&(p.sexo||"M")===sx&&Math.abs(nivelPareja(p)-target)<=margen);
      margen+=4;
    }
    const r=pick(cand)||pick(G.world.parejas.filter(p=>!usados.has(p.id)&&(p.sexo||"M")===sx));
    if(!r) break;
    usados.add(r.id); rivales.push(r);
  }
  // tú entras en la lista y se ordena todo por nivel: eso decide la siembra
  // La siembra va por PUNTOS de ranking, que es como se siembra un torneo de
  // verdad: por lo que has hecho, no por lo bueno que eres. Así el que sube
  // fuerte nota el premio de estar sembrado y evita a los gordos hasta el final.
  const yo={yo:true,nivel:nivelPareja({jug:miTeam().jug}),pts:(ent().pts|0)};
  const todos=rivales.map(r=>({p:r,pts:r.pts|0})).concat([{p:yo,pts:yo.pts}]);
  todos.sort((a,b)=>b.pts-a.pts);
  // se coloca cada uno en su casilla según la siembra
  const slots=new Array(CUADRO_N).fill(null);
  todos.forEach((x,i)=>{ if(i<CUADRO_N) slots[SIEMBRA_16[i]]=x.p; });
  return {ronda:{[CUADRO_FASE0]:slots}, mi:slots.findIndex(p=>p&&p.yo), n:CUADRO_N};
}
/* Sexo del circuito en el que compites (envoltorio con respaldo). */
function miSugSexo(){ return (typeof miSexo==="function")?miSexo():"M"; }

/* Resuelve todos los cruces de una ronda del cuadro MENOS el tuyo, y deja
   preparada la ronda siguiente. `miGane` dice cómo acabó el tuyo. */
function resolverRondaCuadro(fase,miGane){
  const c=torneo.cuadro; if(!c||!c.ronda[fase]) return [];
  const act=c.ronda[fase], sig=[], sorpresas=[];
  for(let i=0;i<act.length;i+=2){
    const a=act[i], b=act[i+1];
    if(!a&&!b){ sig.push(null); continue; }
    if(!a||!b){ sig.push(a||b); continue; }
    let gana;
    if(a.yo||b.yo){ gana=(a.yo===!!miGane)?a:b; }   // el tuyo ya está jugado
    else{
      const nA=nivCuadro(a), nB=nivCuadro(b);
      gana=rnd()<probGana(nA,nB)?a:b;
      // campanada: gana el que tenía 6+ puntos menos de nivel
      const perd=gana===a?b:a, dif=nivCuadro(perd)-nivCuadro(gana);
      if(dif>=6) sorpresas.push({gana,perd,dif});
    }
    sig.push(gana);
  }
  c.ronda[fase+1]=sig;
  return sorpresas;
}
/* Con quién te toca en la fase dada, según el cuadro. */
function rivalDelCuadro(fase){
  const c=torneo.cuadro; if(!c||!c.ronda[fase]) return null;
  const r=c.ronda[fase], i=r.findIndex(p=>p&&p.yo);
  if(i<0) return null;
  const rival=r[i%2===0?i+1:i-1];
  return (rival&&!rival.yo)?rival:null;
}

/* Pinta el papel: primero tu camino ronda a ronda y después el cuadro entero,
   para que se vea quién anda por la otra mitad y quién ha caído. */
function pintarCuadroHTML(){
  const out=[];
  // --- tu camino ---
  out.push(`<div class="bclabel" style="border-top:none;padding-top:0">${t("cua_tu_camino")}</div>`);
  FASES.forEach((fs,i)=>{
    if(i<torneo.startFase){ out.push(`<div style="opacity:.35">${faseNombre(i)}: ${t("cua_exento")}</div>`); return; }
    const rv=torneo.rivales[i];
    const yaJugada=i<torneo.fase, ahora=i===torneo.fase;
    const quien=rv?nomCuadro(rv):t("cua_pendiente");
    out.push(`<div style="opacity:${ahora?1:yaJugada?.75:.5}">${faseNombre(i)}: ${t("cua_vs",{rival:quien})}`
      +`${yaJugada?" ✔":""}${ahora?` <span style="color:var(--lima)">← ${t("cua_estais_aqui")}</span>`:""}</div>`);
  });
  // --- el cuadro completo ---
  const c=torneo.cuadro;
  if(c){
    for(let f=CUADRO_FASE0;f<=5;f++){
      const r=c.ronda[f]; if(!r||!r.length) break;
      out.push(`<div class="bclabel">${faseNombre(f)}</div>`);
      for(let i=0;i<r.length;i+=2){
        const a=r[i], b=r[i+1];
        if(!a&&!b) continue;
        const mio=(a&&a.yo)||(b&&b.yo);
        const col=mio?"var(--lima)":"var(--gris)";
        out.push(`<div style="font-size:calc(10.5px * var(--esc));color:${col};padding:1px 0">`
          +`${nomCuadro(a)} <span style="color:var(--gris2)">vs</span> ${nomCuadro(b)}</div>`);
      }
    }
    const campeon=(c.ronda[6]||[])[0];
    if(campeon) out.push(`<div class="bclabel">🏆 ${nomCuadro(campeon)}</div>`);
  }
  return out.join("");
}

function abrirTorneo(ci,wildcard){
  const cat=CATS[ci];
  if(G.modo==="club"){ repararAlin(); if(!alineacion()){ avisa(t("aviso_sin_plantilla")); return; } }
  // irse de concentración es renunciar a competir esa semana: ese es su precio
  if(G.modo==="carrera"&&typeof ctxBloqueaTorneo==="function"&&ctxBloqueaTorneo(G.carrera)){ avisa(t("ent_stage_bloquea")); return; }
  let ent2=entradaEn(ci);
  if(ent2===-1){ if(wildcard&&!cat.tf) ent2=0; else return; }
  const viaje=costeViaje(ci);
  const LIM_DEUDA=-800;   // puedes tirar de crédito para llegar a un torneo (los premios sanean)
  if(ent().dinero-viaje<LIM_DEUDA){ avisa(t("aviso_sin_viaje",{viaje})); return; }
  ent().dinero-=viaje;
  if(ent().dinero<0) avisa(t("aviso_numeros_rojos",{din:ent().dinero}));
  const startFase=ent2;
  const usados=new Set();
  const rivales=[];
  // El cuadro final decide los rivales de octavos en adelante; la previa sigue
  // siendo un par de cruces sueltos, que es justo lo que es una previa.
  const cuadro=mkCuadro(cat,usados);
  for(let f=0;f<6;f++){
    if(f<startFase){ rivales.push(null); continue; }
    rivales.push(f<CUADRO_FASE0 ? rivalDeFase(cat.base,f,usados) : null);
  }
  const _slot=slotSemana(semanaTemp());
  const _ciudad=(cat.premier&&_slot.premier===ci)?_slot.ciudad:null;
  torneo={cat:ci,nombre:catNombre(cat)+(_ciudad?` · ${_ciudad}`:""),premierT:cat.premier,pts:cat.pts,premio:cat.premio,base:cat.base,fase:startFase,startFase,rivales,cuadro,wildcard:!!wildcard};
  // si entras directo al cuadro final, tu primer rival ya está en el papel
  if(startFase>=CUADRO_FASE0) torneo.rivales[startFase]=rivalDelCuadro(startFase);
  /* «El sorteo no perdona»: cuando el evento está activo, tu primer rival es
     tu archirrival. No es decoración: cambia si te inscribes o te guardas la
     semana. */
  if(typeof evFlag==="function"&&evFlag("nemesis")&&ent().nemesis){
    const nem=G.world.parejas.find(p=>p.id===ent().nemesis.id);
    if(nem&&nem.jug) torneo.rivales[startFase]=nem;
  }
  if(cat.premier&&startFase===2&&G.modo==="carrera"&&!G.carrera.pro){
    G.carrera.pro=true;
    noticia("hito",t("not_prof_t"),t("not_prof_s"));
    avisa(t("aviso_cabezas_serie"));
  }
  // el torneo de la semana también se comenta en la grada
  if(rnd()<.35) post("torneo",{torneo:torneo.nombre});
  if(cat.premier){
    const enJuego=(cuadro.ronda[CUADRO_FASE0]||[]).filter(p=>p&&!p.yo).concat(rivales.filter(Boolean));
    const cocoNiv=Math.max(...enJuego.map(r=>nivCuadro(r)));
    const coco=enJuego.find(r=>nivCuadro(r)===cocoNiv);
    const miNiv=G.modo==="carrera"?Math.round((mediaAttrs(G.carrera.attrs)+mediaAttrs(G.carrera.compi.attrs))/2):(alineacion()?Math.round(alineacion().reduce((a,j)=>a+mediaAttrs(j.attrs),0)/2):50);
    torneo.favNos=miNiv>=cocoNiv-1;
    avisa(torneo.favNos?t("aviso_fav_si",{torneo:torneo.nombre}):t("aviso_fav_no",{coco:coco.nombre,niv:cocoNiv}));
  }
  if(G.modo==="carrera"){
    const debut=diaNombre(diaDeFase(startFase)-1);
    avisa(t("aviso_inscritos",{torneo:torneo.nombre,wc:wildcard?t("insc_wildcard"):"",debut:startFase===2?t("insc_directos",{debut}):startFase===3?t("insc_maestros",{debut}):t("insc_previa",{debut}),viaje}));
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
  const ta=e.tactica; if(!ta.red)ta.red="normal"; if(!ta.clutch)ta.clutch="normal";
  const ent_=entrenadorActual();
  const row=document.getElementById("planPartido");
  const btn=(g,v,txt)=>`<button class="selbtn${ta[g]===v?" on":""}" ${ac("setTactPrev",g,v)}>${txt}</button>`;
  const grupo=(lbl,g,opts)=>`<div class="pgrow"><span class="plbl">${lbl}</span><span class="pbtns">${opts.map(o=>btn(g,o[0],o[1])).join("")}</span></div>`;
  row.innerHTML=`<div class="phead">${t("tac_plan_hd")} <span>· ${t("tac_plan_sub")}</span></div>
  <div class="plangrid">
    ${grupo(t("tac_lbl_agres"),"agres",[["conservadora",t("tac_op_segura")],["normal",t("tac_op_normal")],["agresiva",t("tac_op_deguello")]])}
    ${grupo(t("tac_lbl_diana"),"diana",[["repartir",t("tac_op_repartir")],["debil",t("tac_op_flojo")]])}
    ${grupo(t("tac_lbl_red"),"red",[["aguantar",t("tac_op_aguantar")],["normal",t("tac_op_normal")],["subir",t("tac_op_subir")]])}
    ${grupo(t("tac_lbl_clutch"),"clutch",[["conservar",t("tac_op_conservar")],["normal",t("tac_op_normal")],["arriesgar",t("tac_op_arriesgar")]])}
  </div>
  ${G.modo==="carrera"?`<div class="foot" style="text-align:left;margin-top:8px">${ent_.id>0?t("tac_coach_si",{n:ent_.n}):t("tac_coach_no")}</div>`:`<div class="foot" style="text-align:left;margin-top:8px">${t("tac_coach_club")}</div>`}`;
  document.getElementById("btnSimCoach").textContent=G.modo==="carrera"&&ent_.id>0?t("tac_sim_coach",{n:ent_.n}):t("tac_sim_banq");
}
/* `_plan` es la huella de que el jugador ha tocado el plan alguna vez. Hace
   falta porque el plan neutro es una elección legítima: sin la marca no hay
   forma de distinguir «lo he dejado en normal» de «ni lo he mirado». */
function setTactPrev(g,v){ const ta=ent().tactica; ta[g]=v; ta._plan=1; guardar(); pintarPlanPartido(); }
// Aplica la táctica que recomienda el informe del ojeador (un clic → plan listo).
function aplicarTacticaRec(agres,diana,red,clutch){
  const ta=ent().tactica||(ent().tactica={agres:"normal",diana:"repartir"});
  ta.agres=agres; ta.diana=diana; if(red)ta.red=red; if(clutch)ta.clutch=clutch; ta._plan=1;
  guardar(); pintarPlanPartido();
  const agresTxt=(agres==="agresiva"?t("tac_op_deguello"):agres==="conservadora"?t("tac_op_segura"):t("tac_op_normal")).toLowerCase();
  const plan=(diana==="debil"?t("tac_av_flojo"):t("tac_av_repartir"))+" · "+agresTxt+
    (red&&red!=="normal"?" · "+t("tac_lbl_red").toLowerCase()+": "+(red==="subir"?t("tac_op_subir"):t("tac_op_aguantar")).toLowerCase():"");
  avisa(t("tac_av_plan",{plan}));
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

/* Levantar el trofeo. Solo para los títulos que pesan de verdad (ver
   engine/drama.js): si saliera con cualquier torneo dejaría de significar nada. */
function celebraTitulo(){
  if(typeof document==="undefined"||!document.body||!torneo) return;
  const e=ent(), cat=CATS[torneo.cat];
  const n1=G.modo==="carrera"?G.carrera.nombre:(alineacion()?alineacion()[0].n:e.nombre);
  const n2=G.modo==="carrera"?G.carrera.compi.n:(alineacion()?alineacion()[1].n:"");
  const ov=document.getElementById("celebraModal")||(()=>{
    const d=document.createElement("div");d.id="celebraModal";
    d.style.cssText="position:fixed;inset:0;background:radial-gradient(ellipse at 50% 40%,#2A2410,#07090D 75%);z-index:88;display:flex;align-items:center;justify-content:center;padding:16px;text-align:center";
    document.body.appendChild(d);return d;})();
  ov.innerHTML=`<div style="max-width:460px">
    <div style="font-size:calc(52px * var(--esc));line-height:1">🏆</div>
    <div style="font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:calc(26px * var(--esc));color:var(--oro);margin:8px 0 2px;letter-spacing:1px">${torneo.nombre}</div>
    ${(torneo.nombre||"").indexOf(catNombre(cat))<0?`<div class="foot" style="margin:0 0 4px">${t("dra_celebra_hd",{cat:catNombre(cat)})}</div>`:""}
    <div style="font-size:calc(15px * var(--esc));margin:10px 0 16px">${t("dra_celebra_sub",{n1,n2})}</div>
    <button class="pri" id="celebraOk" style="width:100%">${t("dra_celebra_cerrar")}</button>
  </div>`;
  const b=document.getElementById("celebraOk");
  if(b) b.onclick=()=>quitarEl(ov);
}
function pintarTorneo(){
  pintarPlanPartido();
  document.getElementById("tNombre").innerHTML=`${t(torneo.premierT?"circ_elite":"circ_cont")} · ${torneo.nombre} · <em>${faseNombre(torneo.fase)}</em>`;
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
    const li=(arr,col)=>arr.map(x=>`<div style="font-size:11px;color:${col};padding:1px 0;line-height:1.4">${x}</div>`).join("");
    infoHTML=`<div class="scout" id="scoutCaja">
      <div class="scoutHd">${t("scout_hd")}</div>
      ${li(inf.deb,"var(--verde)")}
      ${li(inf.fue,"var(--rojo)")}
      <div class="scoutRec"><b>${t("scout_plan")}</b> ${inf.recTxt}
        <button class="selbtn" style="font-size:10px;padding:3px 8px;margin-left:4px" ${ac("aplicarTacticaRec",inf.rec.agres,inf.rec.diana,inf.rec.red,inf.rec.clutch)}>${t("scout_aplicar")}</button></div>
    </div>`;
  }
  /* Qué clase de pareja tienes enfrente. Sale de sus atributos —los mismos que
     ya deciden cómo juegan—, así que la etiqueta nunca miente. */
  const _iden=(typeof identidadPareja==="function"&&r.jug)?identidadPareja(r):null;
  const _idenHTML=_iden?`<div class="scout" style="margin:7px 0 0"><div class="scoutHd">${t("tac_riv_hd")} · ${identNombre(_iden)}</div><div style="font-size:11.5px;line-height:1.45">${identDesc(_iden)}</div><div class="scoutRec" style="margin-top:5px">${identContra(_iden)}</div></div>`:"";
  document.getElementById("tInfo").innerHTML=`<span style="display:flex;gap:2px;margin-bottom:5px">${(r.jug||[]).map(j=>avatarSVG(j,38)).join("")}</span>Rival: <b>${r.nombre}</b>${clubR} <span class="pill">nivel ${nivelPareja(r)}</span> <span class="pill oro">#${rankingFilas().find(f=>f.id===r.id).pos}</span>${r.pro?' <span class="tagpro">PRO</span>':""}${_iden?` <span class="pill" style="color:var(--oro)">${identNombre(_iden)}</span>`:""}<br>
  <span style="font-size:11px;color:var(--gris)">${persos}</span><br>
  <span style="font-size:11px;color:var(--gris)">${h2txt}</span><br>
  <span style="font-size:11px;color:var(--gris)">${entrada}</span><br>
  <span style="font-size:11px;color:var(--gris)">${infoPropia()}</span>
  ${(typeof enJuegoHTML==="function")?enJuegoHTML(ent(),CATS[torneo.cat],torneo.fase,r):""}
  ${_idenHTML}
  ${infoHTML}`;
  document.getElementById("tCuadro").innerHTML=pintarCuadroHTML();
}
/* Con el evento «suplente» tu pareja no puede jugar el torneo: juegas con
   alguien de la lista de espera, peor y sin química. Es el evento que más
   cambia una semana, porque obliga a replantear si merece la pena ir. */
function compiSuplente(c){
  if(!c._suplente){
    const niv=Math.max(38,mediaAttrs(c.compi.attrs)-Math.round(R(8,16)));
    const j=mkAgente(niv-2,niv+2,c.sexo||"M");
    c._suplente={n:j.n,pais:j.pais,estilo:j.estilo,perso:j.perso,attrs:j.attrs,lado:j.lado};
  }
  return c._suplente;
}
function miTeam(){
  if(G.modo==="carrera"){
    const c=G.carrera;
    const fBase=factorForma(c.energia,c.quimica,null);   // energía + química
    const fYo=factorForma(c.energia,c.quimica,c.merma);  // tú, además, con la secuela de tu última lesión
    const mk=(attrs,fac)=>{const o={};ATTR_KEYS.forEach(k=>o[k]=Math.round(attrs[k]*fac));return o;};
    // tú además llevas la forma del golpe: lo que trabajaste hace dos semanas
    // sale mejor hoy, y lo que abandonaste, peor
    const mkYo=(attrs,fac)=>{const o={};ATTR_KEYS.forEach(k=>o[k]=Math.round(clamp(attrs[k]+(typeof formaDe==="function"?formaDe(c,k):0),20,99)*fac));return o;};
    const miLado=(c.lado===0||c.lado===1)?c.lado:0;
    // el ritmo de competición se cobra donde se nota: en la cabeza
    const confYo=clamp(c.conf+(typeof ritmoAjusteConf==="function"?ritmoAjusteConf(c):0),5,95);
    const yo={n:c.nombre,estilo:c.estilo,perso:c.perso,conf:confYo,attrs:mkYo(c.attrs,fYo),me:true,sexo:c.sexo,ava:c.ava,_ropa:c._ropa||c.color,lado:miLado};
    // la moral del compañero se traduce en confianza real sobre la pista
    const sup=(typeof evFlag==="function"&&evFlag("suplente"))?compiSuplente(c):null;
    const fuente=sup||c.compi;
    // el suplente llega sin química: se juega con la de un primer día
    const fCompi=sup?factorForma(c.energia,15,null):fBase;
    const compi={n:fuente.n,estilo:fuente.estilo,perso:fuente.perso,
      conf:sup?45:clamp(55+moralAjusteConf(c.compiMoral)+(typeof relAjusteConf==="function"?relAjusteConf(c):0),15,95),
      attrs:mk(fuente.attrs,fCompi),sexo:c.sexo,lado:1-miLado};
    ME_COLOR=c.color;TEAM0_COLOR="#4FA3D8";
    const jug=c.lado===0?[yo,compi]:[compi,yo];
    return {nombre:`${c.nombre}/${fuente.n}`,jug,atNet:false};
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
  match={p:[0,0],j:[0,0],s:[0,0],hist:[],server:rnd()<.5?0:1,fin:false,ver,chall:[3,3],revisando:false,momento:{team:-1,run:0,best:[0,0],aviso:null}};
  match.autoCoach=!!coach;
  if(coach) coachTactica();
  if(ver){
    document.getElementById("pEqA").textContent=teams[0].nombre;
    document.getElementById("pEqB").textContent=teams[1].nombre;
    document.getElementById("avaA").innerHTML=(teams[0].jug||[]).map(j=>avatarSVG(j,30)).join("");
    document.getElementById("avaB").innerHTML=(teams[1].jug||[]).map(j=>avatarSVG(j,30)).join("");
    document.getElementById("coms").innerHTML="";
    const esNem=G.modo==="carrera"&&G.carrera&&G.carrera.nemesis&&String(G.carrera.nemesis.id)===String(rival.id);
    if(esNem){
      match.rivBoost=(match.rivBoost||0)+presionNemesis(G.carrera,rival.id)
        *((typeof invPresionX==="function")?invPresionX(G.carrera):1);
      addCom(t("com_nemesis",{rival:rival.nombre,n:G.carrera.nemesis.elim|0}),0);
    }
    if(clPre){
      match.rivBoost=(match.rivBoost||0)+(clPre.tag==="RIVALIDAD"?.06:0)
        *((G.modo==="carrera"&&typeof invPresionX==="function")?invPresionX(G.carrera):1);
      if(clPre.tag==="BESTIA NEGRA") teams[0].jug.forEach(j=>j.conf=clamp((j.conf??55)-4,10,95));
      if(clPre.tag==="CLIENTE") teams[1].jug.forEach(j=>j.conf=clamp((j.conf??55)-3,10,95));
      addCom(`${clPre.emo} ${clPre.tag==="RIVALIDAD"?`¡Capítulo ${h2pre.v+h2pre.d+1} de la rivalidad! ${h2pre.v}-${h2pre.d} hasta hoy.`:clPre.tag==="BESTIA NEGRA"?`Vuestra bestia negra al otro lado: ${h2pre.v}-${h2pre.d}. A romper el muro.`:`Un viejo cliente: ${h2pre.v}-${h2pre.d} a favor. Que no se despierte.`}`,0);
    }
    initPlayers();pintaMarcadorP();pintaChallenges();pintaTactica();
    /* La grada del primer punto ya cuenta qué clase de partido es esto: en una
       final llena se oye, en una primera ronda de Bronce no. */
    if(typeof pesoPartido==="function"&&torneo){
      const _pz=pesoPartido(ent(),CATS[torneo.cat],torneo.fase,rival);
      match.peso=_pz;
      if(_pz>=DRAMA_CORTES[1]) setTimeout(()=>sfxGrada(dramaGrada(_pz)),300);
    }
    musicaOn();
    irA("partido");
    setTimeout(()=>jugarPuntoAnim(),400);
  } else {
    let setsPrev=0;
    while(!match.fin){
      PRESION=calcPresion();
      const _pt=buildPoint(match.server);
      if(typeof tacAnota==="function") tacAnota(match,_pt.ganador,_pt);
      resolverPunto(_pt.ganador);
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
  // temporada con punto de oro obligatorio: el 40-40 lo decide un punto, sin
  // ventajas. Sube la varianza de toda la temporada, y eso cambia a qué
  // torneos merece la pena ir siendo favorito.
  if(!m.golden&&typeof evFlag==="function"&&evFlag("oro")&&m.p[g]===3&&m.p[o]===3) m.golden=true;
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
    /* Fin de juego: el rival mira lo que llevas jugado. Si abusas de un golpe,
       empieza a esperarlo; si has variado, se le olvida. */
    if(!m.cpu&&typeof tacLee==="function"&&stats&&stats[0]){
      const _niv=(teams[1]&&teams[1].nivel)||(teams[1]?Math.round((mediaAttrs(teams[1].jug[0].attrs)+mediaAttrs(teams[1].jug[1].attrs))/2):60);
      const _av=tacLee(m,stats[0],_niv);
      if(_av&&m.ver) addCom(t("tac_leido",{golpe:golpeNombre(_av)}),1);
    }
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
  // `ta`, no `t`: una variable local llamada t taparía la función de traducción
  // y dejaría el juego en blanco. Ver la advertencia de CLAUDE.md.
  const ta=ent().tactica; if(!ta.red)ta.red="normal"; if(!ta.clutch)ta.clutch="normal";
  const btn=(grupo,val,clave)=>`<button class="selbtn${ta[grupo]===val?" on":""}" style="font-size:10px;padding:4px 6px" ${ac("setTact",grupo,val)}>${t(clave)}</button>`;
  row.innerHTML=`<div class="chbar"><span>${t("tac_hd")}</span><span style="display:flex;gap:4px;flex-wrap:wrap">${btn("agres","conservadora","tac_segura")}${btn("agres","normal","tac_normal")}${btn("agres","agresiva","tac_deguello")}<span style="color:var(--gris2)">·</span>${btn("diana","repartir","tac_repartir")}${btn("diana","debil","tac_al_flojo")}</span></div>`
    +`<div class="chbar" style="margin-top:4px"><span>${t("tac_hd_red")}</span><span style="display:flex;gap:4px;flex-wrap:wrap">${btn("red","aguantar","tac_aguantar")}${btn("red","normal","tac_red_normal")}${btn("red","subir","tac_subir")}<span style="color:var(--gris2)">·</span>${btn("clutch","conservar","tac_conservar")}${btn("clutch","normal","tac_normal")}${btn("clutch","arriesgar","tac_arriesgar")}</span></div>`;
}
/* Cómo se nombra cada ajuste táctico en el comentario del partido. */
const _TACT_TXT={
  agres:v=>t("tac_ag_"+v),
  diana:v=>t(v==="debil"?"tac_txt_diana_debil":"tac_txt_diana_dos"),
  red:v=>t("tac_txt_red",{v:t("tac_red_"+v)}),
  clutch:v=>t("tac_txt_clutch",{v:t("tac_cl_"+v)}),
};
function setTact(g,v){ ent().tactica[g]=v; guardar(); pintaTactica(); addCom(t("tac_cambio",{x:(_TACT_TXT[g]||(x=>x))(v)}),0); }
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
  const bx=150+(rnd()*30-15), by=dentro?66:80;
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
  if(!cerrado||!importante||match.chall[perdedor]<=0||rnd()<.55) return false;
  // solo el humano (equipo 0) decide; la IA revisa sola a veces
  if(perdedor===0){
    mostrarRevisionHumano(fin,g);
    return true;
  } else {
    // IA pide revisión ocasionalmente
    if(rnd()<.5){ resolverRevision(fin,g,1); return true; }
  }
  return false;
}
function mostrarRevisionHumano(fin,g){
  match.revisando=true;
  const row=document.getElementById("challengeRow");
  row.innerHTML=`<div class="chbar"><span>${t("bc_pedir_revision")}</span><span><button id="chSi" style="padding:4px 10px;font-size:11px" class="pri">${t("bc_ojo_halcon",{n:match.chall[0]})}</button> <button id="chNo" style="padding:4px 10px;font-size:11px">Seguir</button></span></div>`;
  document.getElementById("chSi").onclick=()=>resolverRevision(fin,g,0);
  document.getElementById("chNo").onclick=()=>{ match.revisando=false; row.innerHTML=""; pintaTactica(); continuarTrasPunto(g); };
}
function resolverRevision(fin,g,quien){
  // el que pide es "quien"; gana la revisión (la bola era como él dice) con prob según su instinto
  const acierta=rnd()<.4;  // la mayoría de revisiones confirman la decisión original
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
  document.getElementById("tmSit").textContent=t("bc_sets",{a:match.s[0],b:match.s[1]})+" "+t(match.s[0]>match.s[1]?"bc_por_delante":match.s[0]<match.s[1]?"bc_a_remar":"bc_igualado");
  /* El descanso es donde se decide el plan del set siguiente, así que es donde
     hay que contar qué ha dado cada plan hasta ahora. */
  const _inf=document.getElementById("tmInforme");
  if(_inf&&typeof tacInformeHTML==="function"){
    const _lec=(typeof tacLecturaEstado==="function")?tacLecturaEstado():null;
    _inf.innerHTML=`<div class="bclabel">${t("tac_inf_hd")}</div>${tacInformeHTML(match,4)}`
      +(_lec?`<div class="scout" style="margin-top:7px"><div class="scoutHd">${t("tac_leido_hd")}</div><div style="font-size:11.5px;line-height:1.45">${t("tac_leido_txt",{golpe:golpeNombre(_lec.golpe)})}</div></div>`:"");
  }
  ov.classList.remove("oculto");
  const e=ent(), c=G.modo==="carrera"?G.carrera:null;
  const cierra=(msg)=>{ov.classList.add("oculto");match.pausaTM=false;addCom(msg,0);setTimeout(()=>{if(match&&match.ver&&!match.fin)jugarPuntoAnim();},600);};
  document.getElementById("tmCalma").onclick=()=>{
    teams[0].jug.forEach(j=>{if(j.perso==="emocional"||j.perso==="conservador")j.conf=clamp((j.conf??55)+6,10,95);else j.conf=clamp((j.conf??55)+2,10,95);});
    cierra("🧊 Charla de calma: cabezas frías.");
  };
  document.getElementById("tmArenga").onclick=()=>{
    teams[0].jug.forEach(j=>{if(j.perso==="valiente"||j.perso==="emocional")j.conf=clamp((j.conf??55)+8,10,95);else j.conf=clamp((j.conf??55)+3,10,95);});
    if(c&&rnd()<.3)c.compiMoral=clamp((c.compiMoral??65)+3,5,95);
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
    sfxGrada((typeof dramaGrada==="function")?dramaGrada(match.peso||30):.5);
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
      +`<span class="bcchip${parcial?" hot":""}">Táctica: ${TACT.agres}${TACT.diana==="debil"?" · "+t("tac_al_flojo").toLowerCase():""}${TACT.red&&TACT.red!=="normal"?" · red:"+TACT.red:""}${TACT.clutch&&TACT.clutch!=="normal"?" · calientes:"+TACT.clutch:""}</span>`
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
    if(typeof tacAnota==="function") tacAnota(match,g,anim.punto);
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
  if(gane&&match.s[1]===0&&h.every(x=>{const [a,b]=x.split("-").map(Number);return a-b>=3;})) L.push(t("res_dominio"));
  else if(gane&&remonta) L.push(t("res_remontada"));
  else if(!gane&&remonta) L.push(t("res_remontada_rival"));
  else if(tie&&h.length===3) L.push(t("res_al_limite"));
  else if(tie) L.push(t("res_igualado"));
  else if(gane) L.push(t("res_trabajado"));
  else L.push(t("res_no_fue"));
  if(gane&&w[0]<w[1]) L.push(t("res_oficio",{w0:w[0],w1:w[1],e0:e[0],e1:e[1]}));
  else if(w[0]>w[1]*1.6) L.push(t("res_vendaval",{w0:w[0],w1:w[1]}));
  else if(e[0]>e[1]*1.5) L.push(t("res_errores",{n:e[0]})+" "+t(gane?"res_caro":"res_ahi_se_fue"));
  if(match.autoCoach) L.push(t("res_mister",{modo:t("tac_ag_"+TACT.agres)})+(TACT.diana==="debil"?t("res_sobre_flojo"):"")+".");
  const red=[stats[0].red||0,stats[1].red||0];
  if(red[0]+red[1]>=6){
    if(red[0]>=red[1]*1.6) L.push(t("res_red_nuestra",{a:red[0],b:red[1]}));
    else if(red[1]>=red[0]*1.6) L.push(t("res_red_suya",{a:red[1],b:red[0]}));
  }
  const mo=match.momento;
  if(mo&&Math.max(mo.best[0]||0,mo.best[1]||0)>=5){
    const bt=(mo.best[0]||0)>=(mo.best[1]||0)?0:1;
    L.push(t(bt===0?"res_racha_nuestra":"res_racha_rival",{n:mo.best[bt]}));
  }
  return L;
}
// Análisis táctico post-partido (desde vuestra perspectiva, equipo 0): el "por
// qué" del resultado. Cierra el círculo con el informe del ojeador previo.
function analisisPartido(){
  if(!stats||!teams) return [];
  const L=[];
  const topKey=(obj)=>{ let bk=null,bv=0; for(const k in (obj||{})){ if(obj[k]>bv){bv=obj[k];bk=k;} } return bk?{k:bk,v:bv}:null; };
  const lbl=(k)=>(typeof golpeNombre==="function")?golpeNombre(k):k;
  const arma=topKey(stats[0].wShot);
  if(arma&&arma.v>=2) L.push(t("ana_arma",{golpe:lbl(arma.k),n:arma.v}));
  const fallo=topKey(stats[0].eShot);
  if(fallo&&fallo.v>=2) L.push(t("ana_fallo",{golpe:lbl(fallo.k),n:fallo.v}));
  const re=[stats[1].jug[0].e||0, stats[1].jug[1].e||0];
  if(re[0]+re[1]>=3 && Math.abs(re[0]-re[1])>=2){
    const q=re[0]>=re[1]?0:1;
    L.push(t("ana_carga",{n:teams[1].jug[q].n,errores:re[q]}));
  }
  const red=stats[0].red||0, pg=stats[0].pganados||0;
  if(pg>=6){ const pct=Math.round(red/pg*100); L.push(t(pct>=45?"ana_red_si":"ana_red_no",{pct})); }
  const pr=stats[0].presion||{jug:0,gan:0};
  if(pr.jug>=4){ const pct=Math.round(pr.gan/pr.jug*100); L.push((pct>=55?"💪 ":"🥵 ")+t("ana_presion",{gan:pr.gan,jug:pr.jug,pct})); }
  // si te leyeron un golpe, es lo primero que hay que saber al acabar
  const lec=(typeof tacLecturaEstado==="function")?tacLecturaEstado():null;
  if(lec) L.push(t("tac_leido_txt",{golpe:lbl(lec.golpe)}));
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
    ${(()=>{const inf=(typeof tacInformeHTML==="function")?tacInformeHTML(match,5):"";return (inf&&!/tac_inf_vacio/.test(inf)&&match.tac&&Object.keys(match.tac).length>1)?`<div style="border-top:1px solid var(--borde);margin-top:9px;padding-top:7px"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--oro);margin-bottom:4px">${t("tac_inf_hd")}</div>${inf}</div>`:"";})()}
    ${(()=>{const an=analisisPartido();return an.length?`<div style="border-top:1px solid var(--borde);margin-top:9px;padding-top:7px"><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--oro);margin-bottom:4px">${t("ana_hd_tactico")}</div>${an.map(l=>`<div style="font-size:11.5px;line-height:1.5;color:var(--texto);padding:1px 0">${l}</div>`).join("")}</div>`:"";})()}
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
  // ARCHIRRIVAL: perder es lo que crea rivales de verdad — quien te elimina de
  // un torneo suma, y en fases altas la herida cuenta doble.
  if(!gane){ h2r.elim=(h2r.elim||0)+1; if(f>=4) h2r.altaElim=(h2r.altaElim||0)+1; }
  if(G.modo==="carrera"&&typeof nuevoNemesis==="function"){
    const nm=nuevoNemesis(e);
    if(nm){
      e.nemesis={id:nm.id,nombre:nm.nombre,desde:temporada(),elim:nm.elim};
      noticia("ruptura",t("not_nemesis_t",{rival:nm.nombre}),t("not_nemesis_s",{yo:nombreEntidad().replace("★ ",""),n:nm.elim}));
      avisa(t("aviso_nemesis",{rival:nm.nombre,n:nm.elim}));
    } else if(e.nemesis&&String(e.nemesis.id)===String(rival.id)){
      e.nemesis.elim=h2r.elim|0;   // el marcador del duelo se mantiene al día
    }
  }
  if(G.modo==="carrera"&&typeof arrAnotaRival==="function") arrAnotaRival(G.carrera,rival.id,gane);
  const clAhora=clasificaRiv(h2r);
  if(clAhora&&clAhora.tag==="RIVALIDAD"&&(!clAntes||clAntes.tag!=="RIVALIDAD")){
    noticia("hito",t("not_rivalidad_t"),t("not_rivalidad_s",{yo:nombreEntidad().replace("★ ",""),rival:rival.nombre,n:h2r.v+h2r.d}));
    avisa(t("aviso_rivalidad",{rival:rival.nombre,v:h2r.v,d:h2r.d,n:h2r.v+h2r.d}));
    post("rivalidad",{rival:rival.nombre});
  }
  if(gane&&clAntes&&clAntes.tag==="BESTIA NEGRA"){
    e.conf!==undefined&&(e.conf=clamp(e.conf+6,15,95));
    if(G.modo==="carrera") G.carrera.conf=clamp(G.carrera.conf+6,15,95);
    noticia("hito",t("not_maldicion_t"),t("not_maldicion_s",{rival:rival.nombre,v:h2r.v,d:h2r.d}));
    avisa(t("aviso_maldicion",{rival:rival.nombre,v:h2r.v,d:h2r.d}));
    post("maldicion",{rival:rival.nombre});
  }
  e.vd=e.vd||{v:0,d:0}; e.vd[gane?"v":"d"]++;
  // el derbi del club: un rival del circuito al que se le tiene ganas desde el día uno
  if(G.modo==="club"&&typeof anotaDerbi==="function") anotaDerbi(G.clubG,rival,gane);
  if(gane){ e.rachaAct=(e.rachaAct||0)+1; if(e.rachaAct>(e.rachaMax||0)){e.rachaMax=e.rachaAct;if(e.rachaMax===15)avisa(t("aviso_racha15"));} }
  else e.rachaAct=0;
  fansAdd(gane?(torneo&&torneo.premierT?Math.round(R(15,40)):Math.round(R(2,8))):-Math.round(R(1,4)));
  if(rnd()<(torneo&&torneo.premierT?.5:.15)) post(gane?"victoria":"derrota",{rival:rival.nombre,torneo:torneo?torneo.nombre:""});
  // la grada también habla de tu pareja, que es media pista y nunca sale en el titular
  if(rnd()<.12) post("compi");
  if(gane&&(e.rachaAct===5||e.rachaAct===10)) post("forma",{racha:e.rachaAct});
  let seLesiona=false, lesionTxt="";

  if(G.modo==="carrera"){
    const c=G.carrera;
    const misW=stats[0].jug[c.lado].w;
    c.energia=clamp(c.energia-7,0,100);
    c.conf=clamp(c.conf+(gane?5:-6),15,95);
    c.quimica=clamp(c.quimica+2,10,95);
    c.racha=(c.racha||[]).concat(gane?"V":"D").slice(-5);
    const dMoral=gane?(f>=4?7:4):(f<2?-7:-4);
    c.compiMoral=clamp((c.compiMoral??65)+dMoral,5,95);
    const les=intentaLesion(c,!!(c.staff&&c.staff.fisio));
    if(les){
      c.lesion=les;
      seLesiona=true;lesionTxt=lesNombre(c.lesion);
      c.conf=clamp(c.conf-4,15,95);                              // lesionarse mina la cabeza
      c.compiMoral=clamp((c.compiMoral??65)-5,5,95);             // y preocupa al compañero
      if(c.lesion.grav>=3) noticia("lesion",t("not_lesion_grave_t"),t("not_lesion_grave_s",{lesion:lesNombre(c.lesion),sem:c.lesion.sem}),miParejaProt());
    }
    if((gane||misW>=4)&&rnd()<.45){
      const favor={defensivo:["globo","pared","chiquita","fondo"],agresivo:["remate","vibora","volea","bandeja"],bandejero:["bandeja","vibora","volea"],rematador:["remate","bandeja","volea"],constructor:["chiquita","dejada","fondo","globo"]}[c.estilo];
      const k=pick(favor);
      const freno=c.attrs[k]>=72?.4:1;
      if(c.attrs[k]<95&&rnd()<freno) c.attrs[k]++;
    }
    avisa(t("aviso_res_carrera",{res:gane?"✔ "+t("res_victoria"):"✗ "+t("res_derrota"),marc:marcadorFinal,rival:rival.nombre,fase:faseNombre(f).toLowerCase(),w:misW,e:stats[0].jug[c.lado].e}));
  } else {
    const cl=G.clubG;
    const qk=quimKey(cl);
    cl.quims[qk]=clamp((cl.quims[qk]??40)+2,10,95);
    teams[0].jug.forEach((jv,i)=>{
      const j=jv._ref;
      j.energia=clamp(j.energia-7,0,100);
      j.conf=clamp(j.conf+(gane?4:-5),15,95);
      const w=stats[0].jug[i].w;
      if((gane&&rnd()<.25)||w>=6){
        const k=pick(ATTR_KEYS);
        if(j.attrs[k]<88) j.attrs[k]++;
      }
      if(!j.lesion){
        const les=intentaLesion(j,!!G.clubG.staff.fisio);
        if(les){
          j.lesion=les;
          j.conf=clamp(j.conf-4,15,95);
          seLesiona=true;lesionTxt=`${j.n}: ${lesNombre(j.lesion)}`;
          if(j.lesion.grav>=3) noticia("lesion",t("not_lesion_club_t",{club:cl.nombre}),t("not_lesion_club_s",{jug:j.n,lesion:lesNombre(j.lesion),sem:j.lesion.sem}));
        }
      }
    });
    avisa(t("aviso_res_club",{res:gane?"✔ "+t("res_victoria"):"✗ "+t("res_derrota"),marc:marcadorFinal,club:cl.nombre,rival:rival.nombre,fase:faseNombre(f).toLowerCase()}));
  }
  match=null;

  // neto() aplica el margen económico de la dificultad a TODO premio de torneo
  // (un solo punto para carrera y club) y, en carrera, la comisión del representante.
  const neto=(x)=>{x=ecoIngreso(x);const r=G.modo==="carrera"&&G.carrera.staff&&G.carrera.staff.rep;return r?Math.round(x*(1-(r.com||15)/100)):x;};
  if(!gane){
    const idx=loserIdx(f), idxP=loserPtsIdx(f);
    // una temporada con puntuación nueva o una gira reparten distinto
    const ptsGan=idxP<0?0:Math.round(evNum("ptsX",torneo.pts[idxP]||0));
    rkAnota(e,e.semana,ptsGan);e.dinero+=neto(torneo.premio[idx]||0);
    if(idxP>=0) rkAnota(rival,e.semana,torneo.pts[Math.max(0,idxP-1)]||0);
    avisa(t("aviso_eliminados",{fase:faseNombre(f).toLowerCase(),torneo:torneo.nombre,pts:ptsGan,din:neto(torneo.premio[idx]||0),resto:G.modo==="carrera"?t("aviso_resto_semana"):""})+(seLesiona?` ⚠ ${lesionTxt}.`:""));
    cerrarTorneo();return;
  }
  { const _ip=loserPtsIdx(f); if(_ip>=0) rkAnota(rival,e.semana,torneo.pts[_ip]||0); }
  if(f===5){
    rkAnota(e,e.semana,Math.round(evNum("ptsX",torneo.pts[0])));e.dinero+=neto(torneo.premio[0]);
    e.palmares.push(`${torneo.nombre} (T${temporada()})`);
  if(G.modo==="club") clubPalma(-1,`${torneo.nombre} (T${temporada()})`);   // -1 = tu club (se ignora, ya está en e.palmares)
    if(torneo.premierT) e._campPremSem=semanaTemp();
    // Contador de títulos de la Serie Élite. Antes los hitos miraban si el
    // palmarés contenía la palabra "Premier", lo cual dejó de funcionar al
    // renombrar el circuito y además nunca fue de fiar (el palmarés es texto
    // traducible). Con un contador, el hito no depende de cómo se llame nada.
    if(torneo.premierT) e.recTitElite=(e.recTitElite||0)+1;
    if(torneo.cat===6){ e.recMajors=(e.recMajors||0)+1; }
    // los títulos de la etapa actual con tu compañero: la historia es de LOS DOS
    if(G.modo==="carrera") e._parejaTitulos=(e._parejaTitulos|0)+1;
    if(torneo.cat===7){ e.recFinals=(e.recFinals||0)+1; }
    fansAdd([60,120,250,500,1500,3000,8000,5000][torneo.cat]||60,t("fan_titulo",{torneo:torneo.nombre}));
    post("titulo",{torneo:torneo.nombre});
    if(torneo.premierT&&torneo.favNos===false){
      noticia("titulo",t("not_campanada_t"),t("not_campanada_s",{torneo:torneo.nombre}),miParejaProt());
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
    /* Un título histórico no se cuenta con el mismo aviso que uno más: si el
       partido pesaba, se levanta el trofeo en pantalla. */
    if(typeof pesoPartido==="function"&&match&&pesoTier(match.peso||0)==="historica") celebraTitulo();
    noticia("titulo",t("not_campeones_t",{torneo:torneo.nombre}),t("not_campeones_s",{entidad:G.modo==="carrera"?G.carrera.nombre+"/"+G.carrera.compi.n:G.clubG.nombre,pts:torneo.pts[0],premio:torneo.premio[0]}),miParejaProt());
    avisa(t("aviso_campeones",{torneo:torneo.nombre,pts:torneo.pts[0],din:neto(torneo.premio[0])})+extra+(seLesiona?` ⚠ ${lesionTxt}.`:""));
    cerrarTorneo();return;
  }
  if(seLesiona){
    const idx=loserIdx(f+1);
    rkAnota(e,e.semana,torneo.pts[idx]||0);e.dinero+=neto(torneo.premio[idx]||0);
    noticia("lesion",t("not_retirada_t"),t("not_retirada_s",{lesion:lesionTxt,torneo:torneo.nombre}),miParejaProt());
    post("lesion");
    avisa(t("aviso_retirada",{lesion:lesionTxt,pts:torneo.pts[idx]||0}));
    cerrarTorneo();return;
  }
  /* El resto del cuadro juega su ronda a la vez que tú. Si cae un cabeza de
     serie, se cuenta: eso es media gracia de mirar el papel. */
  if(torneo.cuadro&&torneo.fase>=CUADRO_FASE0){
    const sorpresas=resolverRondaCuadro(torneo.fase,true);
    sorpresas.slice(0,2).forEach(s=>avisa(t("cua_campanada",{gana:nomCuadro(s.gana),perd:nomCuadro(s.perd)}),"info"));
  }
  torneo.fase++;
  // tu siguiente rival es quien haya ganado de verdad su partido, no una tirada nueva
  if(torneo.cuadro&&torneo.fase>=CUADRO_FASE0&&torneo.fase<=5){
    const r=rivalDelCuadro(torneo.fase);
    if(r) torneo.rivales[torneo.fase]=r;
    else if(!torneo.rivales[torneo.fase]) torneo.rivales[torneo.fase]=rivalDeFase(torneo.base,torneo.fase,new Set());
  }
  if(torneo.premierT&&torneo.fase===2&&G.modo==="carrera"&&!G.carrera.pro){
    G.carrera.pro=true;
    noticia("hito",t("not_debut_prof_t"),t("not_debut_prof_s"));
    avisa(t("aviso_previa_superada"));
  }
  if(G.modo==="carrera"){
    // gira de despedida: el circuito te brinda pasillo en cada torneo nuevo
    if(G.carrera&&G.carrera.ultimoBaile&&torneo&&torneo.fase===torneo.startFase){
      avisa(t("ub_despedida",{torneo:torneo.nombre}));
      fansAdd(Math.round(R(150,400)),t("ub_fan_motivo"));
    }
    avisa(t("aviso_ronda",{torneo:torneo.nombre,fase:faseNombre(torneo.fase).toLowerCase(),dia:diaNombre(diaDeFase(torneo.fase)-1)}));
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
    ?t("pr_q_gano",{torneo:torneo_ultimo?torneo_ultimo.nombre:"—"})
    :t("pr_q_pierde",{fase:faseNombre(fase).toLowerCase()});
  const bH=document.getElementById("ruedaHumilde"),bA=document.getElementById("ruedaAmbi"),bP=document.getElementById("ruedaPicante");
  bH.textContent=gano?t("pr_h_gano"):t("pr_h_pierde");
  bA.textContent=gano?t("pr_a_gano"):t("pr_a_pierde");
  bP.textContent=gano?t("pr_p_gano"):t("pr_p_pierde");
  ov.classList.remove("oculto");
  const fin=(msg,fx)=>{ov.classList.add("oculto");fx();avisa(msg);guardar();pintarCarrera();};
  bH.onclick=()=>fin(t("pr_av_sobrio"),()=>{
    c.compiMoral=clamp((c.compiMoral??65)+4,5,95);
  });
  bA.onclick=()=>fin(t("pr_av_ambicion"),()=>{
    c.conf=clamp(c.conf+4,15,95);
    if(c.sponsor&&rnd()<.35){c.dinero+=100;avisa(t("pr_av_prima",{marca:c.sponsor.marca}));}
  });
  bP.onclick=()=>fin(t("pr_av_picante"),()=>{
    if(c.perso==="valiente"||c.perso==="emocional") c.conf=clamp(c.conf+7,15,95);
    else c.conf=clamp(c.conf-3,15,95);
    if(c.compi.perso==="conservador"||c.compi.perso==="frio") c.compiMoral=clamp((c.compiMoral??65)-5,5,95);
    else c.compiMoral=clamp((c.compiMoral??65)+3,5,95);
    noticia("hito",t("not_declaraciones_t"),t("not_declaraciones_s",{nombre:c.nombre}));
    fansAdd(Math.round(R(120,300)),t("fan_ruido"));
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
  if(G.modo==="carrera"&&eraPremier&&(e.calRes[semanaTemp()]==="🏆"||faseCaida>=4)&&rnd()<.75){
    setTimeout(()=>ruedaDePrensa(e.calRes[semanaTemp()]==="🏆",faseCaida),600);
  }
  torneo=null;
  if(G.modo==="carrera"){ G.carrera._jugoTorneo=true; avanzarDia(); irA("club"); }
  else { avanzarSemanaClub(); irA("clubm"); }
}
document.getElementById("btnVer").onclick=()=>empezarPartido(true);
document.getElementById("btnSimCoach").onclick=()=>empezarPartido(false,true);
document.getElementById("btnSimular").onclick=()=>empezarPartido(false);


/* ================================================================
   MODO CLUB
================================================================ */
// lado natural: 0 = DRIVE (derecha, construcción/defensa), 1 = REVÉS (izquierda, remate/finalización)
function ladoPorAttrs(attrs,est){
  if(!attrs) return Math.random()<.5?0:1;
  const fin=(attrs.remate+attrs.vibora+attrs.bandeja+attrs.volea)/4;      // finalización
  const con=(attrs.fondo+attrs.pared+attrs.globo+attrs.dejada+attrs.chiquita)/5; // construcción
  const sesgo=fin-con;
  // estilos rematadores tiran a revés, defensivos a drive
  const bonus=est==="rematador"?3:est==="agresivo"?1.5:est==="defensivo"?-3:est==="constructor"?-2:0;
  const p=clamp(.5+(sesgo+bonus)/14,.12,.88);
  return Math.random()<p?1:0;
}
function ladoTxt(l){ return l===1?"Revés":"Drive"; }
function ladoChip(l){ if(l!==0&&l!==1) return ""; return `<span class="pill" style="background:${l===1?"#9B59D0":"#4FA3D8"}22;color:${l===1?"#B58BE0":"#6FB8E8"};border-color:${l===1?"#9B59D0":"#4FA3D8"}55">${l===1?"◀ Revés":"Drive ▶"}</span>`; }
function parejaLadoAviso(j0,j1){
  if(!j0||!j1||j0.lado===undefined||j1.lado===undefined) return "";
  if(j0.lado===j1.lado) return `<span style="color:#E0A030;font-size:10px">⚠ Dos ${ladoTxt(j0.lado).toLowerCase()}s: se pisan la pista</span>`;
  return `<span style="color:var(--lima);font-size:10px">✓ Drive + Revés bien combinados</span>`;
}
function mkAgente(nivMin,nivMax,sx){
  const est=pick(Object.keys(ESTILOS));
  const nivel=Math.round(R(nivMin,nivMax));
  sx=sx||(Math.random()<.5?"M":"F");
  const apodo=Math.random()<.28?` «${pick(APODOS)}»`:"";
  const pot=Math.round(clamp(nivel+R(2,24)-(Math.random()<.2?10:0),nivel,93));
  return {
    n:nombrePorSexo(sx)+apodo+" "+pick(APELL),pais:pickPais(),sexo:sx,pot,edad:Math.round(R(17,31)),
    estilo:est,perso:pick(Object.keys(PERSONALIDADES)),
    attrs:mkAttrsNivel(nivel,est),
    lado:ladoPorAttrs(mkAttrsNivel(nivel,est),est),
    salario:Math.round(nivel*.7),energia:100,conf:55,lesion:null
  };
}
function nivelTxt(j){
  const n=mediaAttrs(j.attrs), oj=G&&G.modo==="club"&&G.clubG&&G.clubG.staff&&G.clubG.staff.ojeador;
  if(oj){
    const techo=(j.pot||n)>=78?"techo alto":(j.pot||n)>=66?"techo medio":"techo corto";
    return `${Math.max(20,n-2)}-${Math.min(96,n+3)} · ${techo}`;
  }
  return `${Math.max(20,n-5)}-${Math.min(96,n+7)}`;
}
function costeFichaje(j){const n=mediaAttrs(j.attrs);return Math.round(n*n*1.1);}
function mkMercadoLibre(sx){const a=[],seen=new Set();for(let i=0;i<8;i++){let j,g=0;do{j=mkAgente(46,68,sx||"M");}while(seen.has(j.n)&&g++<20);seen.add(j.n);a.push(j);}return a;}
let mercadoTmp=null,plantillaTmp=[];

function prepararCrearClub(){
  const cont=document.getElementById("coloresClub");
  cont.innerHTML="";
  COLORES.forEach(c=>{
    const b=document.createElement("button");
    b.style.background=c;b.style.minHeight="34px";b.style.color="#10141C";b.textContent=colorClubSel===c?"✓":"";
    b.onclick=()=>{colorClubSel=c;prepararCrearClub();};
    cont.appendChild(b);
  });
  document.getElementById("clubSexoM").className="selbtn"+(sexoClubSel==="M"?" on":"");
  document.getElementById("clubSexoF").className="selbtn"+(sexoClubSel==="F"?" on":"");
  document.getElementById("clubSexoM").onclick=()=>{sexoClubSel="M";mercadoTmp=mkMercadoLibre("M");plantillaTmp=[];prepararCrearClub();};
  document.getElementById("clubSexoF").onclick=()=>{sexoClubSel="F";mercadoTmp=mkMercadoLibre("F");plantillaTmp=[];prepararCrearClub();};
  if(!mercadoTmp) mercadoTmp=mkMercadoLibre(sexoClubSel);
  plantillaTmp=plantillaTmp.filter(j=>mercadoTmp.includes(j)===false); // conserva selección
  pintarMercadoInicial();
}
const PRESUP_CLUB=12000;
function pintarMercadoInicial(){
  const el=document.getElementById("mercadoInicial");el.innerHTML="";
  let gasto=plantillaTmp.reduce((s,j)=>s+costeFichaje(j),0);
  document.getElementById("mercTitulo").textContent=`caja ${(PRESUP_CLUB-gasto).toLocaleString("es")}€`;
  mercadoTmp.forEach(j=>{
    const dentro=plantillaTmp.includes(j);
    const coste=costeFichaje(j);
    const d=document.createElement("div");d.className="opcion"+(dentro?" sel":"");
    d.innerHTML=`<b>${j.n}</b> <span class="pill">nivel ${nivelTxt(j)}</span> ${ladoChip(j.lado!==undefined?j.lado:ladoPorAttrs(j.attrs,j.estilo))} <span class="pill">${j.edad} años</span> <span class="pill">${estiloNombre(j.estilo)}</span> <span class="pill">${persoNombre(j.perso)}</span><div class="d">Fichaje ${coste}€ · salario ${salarioDe(j)}€/sem${(G&&G.clubG&&G.clubG.staff&&G.clubG.staff.ojeador)?"":" · informe impreciso: contrata un ojeador para afinar"}</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=dentro?"Quitar de la plantilla":`Fichar (${coste}€)`;
    b.disabled=!dentro&&(plantillaTmp.length>=4||PRESUP_CLUB-gasto<coste);
    b.onclick=()=>{
      if(dentro) plantillaTmp=plantillaTmp.filter(x=>x!==j);
      else plantillaTmp.push(j);
      pintarMercadoInicial();
    };
    d.appendChild(b);el.appendChild(d);
  });
  const be=document.getElementById("btnEmpezarClub");
  be.disabled=plantillaTmp.length<2;
  be.textContent=plantillaTmp.length<2?`Necesitas 2 jugadores (${plantillaTmp.length}/2)`:"Comenzar temporada";
  be.onclick=()=>{
    if(plantillaTmp.length<2) return;
    const gasto2=plantillaTmp.reduce((s,j)=>s+costeFichaje(j),0);
    const nombre=document.getElementById("inClubNombre").value.trim()||"Rising Pádel Club";
    G={v:1,modo:"club",dif:difMenu(),world:mkWorld(),carrera:null,clubG:{
      nombre,color:colorClubSel,
      plantilla:plantillaTmp.map(j=>({...j})),
      alin:[0,1],alinB:null,quims:{},
      semana:1,pts:0,dinero:PRESUP_CLUB-gasto2,
      sexo:sexoClubSel,wildcards:2,fans:400,social:[],
      junta:{objetivo:34,paciencia:2},sponsor:null,sponsorOferta:null,
      instal:1,academia:false,cantera:[],mercado:mercadoTmp.filter(j=>!plantillaTmp.includes(j)).map(j=>({...j})),
      staff:{entrenador:null,fisio:null,psico:null,fisico:null,ojeador:null},mercadoStaff:null,_staffV2:1,
      reformas:{techada:false,gym:false,residencia:false,video:false},
      _pendB:null,
      lesionNota:null,palmares:[],diario:[],h2h:{},_rivalesSemana:[]
    }};
    mercadoTmp=null;plantillaTmp=[];
    avisa(t("clb_nace",{nombre,lista:G.clubG.plantilla.map(j=>j.n).join(", ")}));
  noticia("debut",t("not_club_debut_t",{nombre}),t("not_club_debut_s"));
    entrarPartida();
    verTuto("club");
  };
}
const STAFF_CLUB={fisio:{n:"Fisioterapeuta",sal:210,desc:"Menos lesiones y recuperaciones más cortas para toda la plantilla."},psico:{n:"Psicólogo deportivo",sal:180,desc:"La confianza de la plantilla se recupera sola cada semana."},fisico:{n:"Preparador físico",sal:210,desc:"+4 de energía semanal extra para todos."},ojeador:{n:"Ojeador",sal:240,desc:"Mercados más grandes y con mejores jugadores."}};
const STAFF_CARR={rep:{n:"Representante",sal:150,desc:"Se lleva el 15% de tus premios, pero te trae contratos de patrocinio de más nivel."},fisio:{n:"Fisioterapeuta",sal:120,desc:"La mitad de lesiones y una semana menos de baja."},psico:{n:"Psicólogo deportivo",sal:100,desc:"Tu confianza no baja de 40 y la moral de tu pareja no se desgasta sola."},fisico:{n:"Preparador físico",sal:120,desc:"+4 de energía semanal extra."}};
const REFORMAS={
  techada:{n:"Pista central techada",coste:12000,desc:"El club gana caché: +150€/sem de socios y +5 de prestigio."},
  gym:{n:"Gimnasio propio",coste:7500,desc:"+4 de energía semanal para toda la plantilla."},
  residencia:{n:"Residencia de jugadores",coste:9500,desc:"La confianza de la plantilla sube +1 cada semana."},
  video:{n:"Sala de vídeo",coste:5500,desc:"Los entrenos rinden más (otro +1 frecuente)."},
};
function quimKeyP(par){const a=par.slice().sort();return a[0]+"|"+a[1];}
function quimDe(cl,par){return cl.quims[quimKeyP(par)]??40;}
function quimKey(cl){return quimKeyP(cl.alin);}
function quimActual(cl){return quimDe(cl,cl.alin);}
function parejaDe(par){
  const cl=G.clubG;
  if(!cl||!par||par[0]===par[1]) return null;
  const a=cl.plantilla[par[0]],b=cl.plantilla[par[1]];
  return (a&&b)?[a,b]:null;
}
function repararAlin(){
  const cl=G.clubG; if(!cl||!cl.plantilla) return;
  const val=(par)=>par&&par.length===2&&par[0]!==par[1]&&cl.plantilla[par[0]]&&cl.plantilla[par[1]];
  if(!val(cl.alin)){
    // elegir los dos de mayor nivel no lesionados (o los que haya)
    const idx=cl.plantilla.map((j,i)=>i).sort((a,b)=>(mediaAttrs(cl.plantilla[b].attrs)-(cl.plantilla[b].lesion?100:0))-(mediaAttrs(cl.plantilla[a].attrs)-(cl.plantilla[a].lesion?100:0)));
    cl.alin=idx.length>=2?[idx[0],idx[1]]:idx.length===1?[idx[0],idx[0]]:[0,1];
  }
  if(cl.alinB&&!val(cl.alinB)) cl.alinB=null;
}
function alineacion(){ repararAlin(); return parejaDe(G.clubG&&G.clubG.alin); }
function alineacionB(){return G.clubG&&G.clubG.alinB?parejaDe(G.clubG.alinB):null;}
function salarioDe(j){return Math.round(mediaAttrs(j.attrs)*8);}
function staffSalarios(){
  const cl=G.clubG;
  return Object.keys(cl.staff||{}).reduce((s2,k)=>s2+((cl.staff[k]&&cl.staff[k].sal)||0),0);
}
function salariosSemana(){return G.clubG.plantilla.reduce((s,j)=>s+salarioDe(j),0)+staffSalarios();}
function prestigioClub(){return ent().palmares.length*8+Math.max(0,40-miPuesto());}
/* ---------- pareja B: torneo paralelo simulado ---------- */
function quickMatch(tA,tB){
  teams=[tA,tB];
  const _cpu=true;
  teams[1].jug.forEach(j=>{j.conf=j.conf??55;});
  stats=[mkStats(),mkStats()];
  match={p:[0,0],j:[0,0],s:[0,0],hist:[],server:Math.random()<.5?0:1,fin:false,ver:false,cpu:true};
  while(!match.fin){PRESION=calcPresion();resolverPunto(buildPoint(match.server).ganador);}
  const gane=match.s[0]>match.s[1];
  const marcador=`${match.s[0]}-${match.s[1]}`;
  match=null;
  return {gane,marcador};
}
function teamDePareja(par){
  const cl=G.clubG, q=quimDe(cl,par.map(j=>cl.plantilla.indexOf(j)));
  const mkJ=(j)=>{
    const f=(0.86+0.14*(j.energia/100))*(0.94+0.12*(q/100));
    const o={};ATTR_KEYS.forEach(k=>o[k]=Math.round(j.attrs[k]*f));
    return {n:j.n,estilo:j.estilo,perso:j.perso,conf:j.conf,attrs:o,_ref:j};
  };
  return {nombre:G.clubG.nombre+" B",jug:[mkJ(par[0]),mkJ(par[1])],atNet:false};
}
function simTorneoParejaB(ci){
  const cl=G.clubG, cat=CATS[ci], parB=alineacionB();
  if(!parB) return;
  const ent2=entradaEn(ci);
  if(ent2===-1) return;
  const viajeB=60;
  if(cl.dinero<viajeB) return;
  cl.dinero-=viajeB;
  let fase=ent2;
  const usados=new Set();
  const idxPar=cl.alinB.slice();
  let resumen=[], titulo=false, idxPts=5;
  while(fase<6){
    const rival=rivalDeFase(cat.base,fase,usados);
    const res=quickMatch(teamDePareja(parB),rival);
    parB.forEach(j=>{j.energia=clamp(j.energia-11,0,100);j.conf=clamp(j.conf+(res.gane?3:-4),15,95);});
    const qk=quimKeyP(idxPar);
    cl.quims[qk]=clamp((cl.quims[qk]??40)+2,10,95);
    rival.pts+=cat.pts[loserIdx(fase)]||0;
    if(!res.gane){
      idxPts=loserIdx(fase);
      resumen.push(`caen en ${faseNombre(fase).toLowerCase()} (${res.marcador}) vs ${rival.nombre}`);
      break;
    }
    if(res.gane&&Math.random()<.2){const k=pick(ATTR_KEYS);const j=pick(parB);if(j.attrs[k]<88)j.attrs[k]++;}
    if(fase===5){ idxPts=0; titulo=true; break; }
    fase++;
    // lesión por fatiga a mitad de torneo
    const cansado=parB.find(j=>j.energia<20&&!j.lesion);
    if(cansado&&Math.random()<kLesion(cl.staff.fisio?.15:.3)){
      cansado.lesion=pickLesion(clamp(1-cansado.energia/40,0,1));
      if(cl.staff.fisio) cansado.lesion.sem=Math.max(1,cansado.lesion.sem-1);
      cansado.fragil=(cansado.fragil||0)+1;
      idxPts=loserIdx(fase);
      resumen.push(`retirada (W.O.): ${cansado.n}, ${cansado.lesion.n}`);
      break;
    }
  }
  const pts=Math.round((cat.pts[idxPts]||0)*.5), premio=cat.premio[idxPts]||0;  // la pareja B puntúa al 50% para el club
  cl.pts+=pts; cl.dinero+=premio;
  if(titulo){
    cl.palmares.push(`${cat.n} — pareja B (T${temporada()})`);
    noticia("titulo",t("not_parejab_t",{cat:cat.n}),t("not_parejab_s",{p1:parB[0].n,p2:parB[1].n,pts,premio}));
    avisa(t("clb_b_gana",{j1:parB[0].n,j2:parB[1].n,cat:cat.n,premio}));
  } else {
    avisa(t("clb_b_resumen",{cat:cat.n,resumen:resumen.join("; ")||t("clb_b_eliminados"),pts,premio}));
  }
}

const cmTabs=["semana","plantilla","club","ranking","diario"];
cmTabs.forEach(t=>{
  document.getElementById("cmTab"+t[0].toUpperCase()+t.slice(1)).onclick=()=>{
    cmTab=t;
    cmTabs.forEach(x=>{
      document.getElementById("cm-"+(x==="club"?"clubpan":x)).classList.toggle("oculto",x!==t);
      document.getElementById("cmTab"+x[0].toUpperCase()+x.slice(1)).classList.toggle("on",x===t);
    });
    pintarClubM();
  };
});

function pintarClubM(){
  if(G.clubG&&G.clubG._despedido){
    const cl=G.clubG;
    document.getElementById("cmTorneosDisp")&&(document.getElementById("cmTorneosDisp").innerHTML="");
    alert(t("clb_fin",{club:cl.nombre,temps:cl.hist.length,tits:cl.palmares.length,mejor:Math.min(...cl.hist.map(h=>h.pos))}));
    G=null; irA("menu"); pintarMenu(); return;
  }
  const cl=G.clubG;
  document.getElementById("topCtx").innerHTML=`<b>${t("ctx_temporada")} ${temporada()}</b> · S${semanaTemp()}/${SEMANAS_TEMP} · ${cl.sexo==="F"?t("ctx_circuito_f"):t("ctx_circuito_m")}<br>${cl.nombre} · 🎟×${cl.wildcards||0}`;
  document.getElementById("cmSem").textContent="S"+semanaTemp();
  document.getElementById("cmRank").textContent="#"+miPuesto();
  document.getElementById("cmPts").textContent=cl.pts;
  const kD=document.getElementById("cmDin");
  kD.textContent=cl.dinero+"€";
  kD.style.color=cl.dinero<0?"var(--rojo)":cl.dinero<200?"var(--oro)":"";
  document.getElementById("cmSal").textContent="-"+salariosSemana()+"€";
  if(cmTab==="semana") pintarCmSemana();
  if(cmTab==="plantilla") pintarCmPlantilla();
  if(cmTab==="club") pintarCmClub();
  if(cmTab==="ranking"){renderRanking(document.getElementById("cmTablaRk"));renderClubes(document.getElementById("cmTablaClubes"));renderN1(document.getElementById("cmN1hist"));renderRecords(document.getElementById("cmRecords"));}
  if(cmTab==="diario"){renderNoticias(document.getElementById("cmFeedNoti"));renderDiario(document.getElementById("cmDiario"),document.getElementById("cmPalmares"));renderSocial(document.getElementById("cmSocial"));renderTrayectoria(document.getElementById("cmTrayec"));}
}
function pintarCmSemana(){
  const cl=G.clubG,esT=esSemanaTorneo();
  document.getElementById("cmSemTitulo").innerHTML=(slotSemana(semanaTemp()).premier!==undefined?`${t("kpi_semana")} ${semanaTemp()} · <em>${t("ctx_premier_fip")}</em>`:`${t("kpi_semana")} ${semanaTemp()} · <em>${t("ctx_circuito_fip")}</em>`);
  const tor=document.getElementById("cmTorneo");tor.innerHTML="";
  const al=alineacion();
  if(esT){
    const listos=al&&al.every(j=>!j.lesion&&j.energia>=30);
    const info=document.createElement("div");info.className="foot";info.style.textAlign="left";info.style.marginBottom="7px";
    info.textContent=`Pareja A: ${al?al.map(j=>j.n).join(" + "):"—"} · química ${quimActual(cl)}`;
    tor.appendChild(info);
    pintarEventosSemana(tor, listos, "Pareja A no disponible (lesión o energía <30).");
    // pareja B: torneo paralelo en modo rápido
    const alB=alineacionB();
    if(alB){
      const listosB=alB.every(j=>!j.lesion&&j.energia>=30);
      const slot=slotSemana(semanaTemp());
      const d=document.createElement("div");d.className="opcion";
      const bDisp=[];
      if(slot.premier!==undefined&&entradaEn(slot.premier)!==-1) bDisp.push(slot.premier);
      if(entradaEn(slot.fip)!==-1) bDisp.push(slot.fip);
      d.innerHTML=`<b>Pareja B</b> <span class="pill">${alB.map(j=>j.n).join(" + ")}</span> <span class="pill">química ${quimDe(cl,cl.alinB)}</span><div class="d">${cl._pendB!==null?`✔ Irá al ${CATS[cl._pendB].n} — se resuelve al avanzar la semana.`:"Puede jugar su propio torneo esta semana (resultado rápido; sus puntos computan al 50% para el club)."}</div>`;
      if(listosB){
        const f=document.createElement("div");f.className="fila";
        bDisp.forEach(ci=>{
          const b=document.createElement("button");
          b.className=cl._pendB===ci?"pri":"";
          b.textContent=`B → ${CATS[ci].n}`;
          b.onclick=()=>{cl._pendB=cl._pendB===ci?null:ci;guardar();pintarClubM();};
          f.appendChild(b);
        });
        d.appendChild(f);
      } else {
        const p=document.createElement("div");p.className="foot";p.style.textAlign="left";p.textContent="Pareja B no disponible (lesión o energía <30).";d.appendChild(p);
      }
      tor.appendChild(d);
    }
  }
  // entrenamiento simultáneo: cada jugador tiene su plan; un botón entrena a todos
  const en=document.getElementById("cmEntreno");en.innerHTML="";
  cl.plantilla.forEach((j,idx)=>{
    const d=document.createElement("div");d.className="opcion";
    const les=j.lesion?` <span class="pill rojo">${j.lesion.n} (${j.lesion.sem}s)</span>`:"";
    const mer=(!j.lesion&&j.merma)?` <span class="pill" style="color:#E0A030">mermado -${j.merma.pct}% (${j.merma.sem}s)</span>`:"";
    const plan=j.plan||"auto";
    const rasg=chipRasgos(j);
    d.innerHTML=`<b>${j.n}</b> <span class="pill">nivel ${mediaAttrs(j.attrs)}</span> <span class="pill">EN ${j.energia}</span> <span class="pill">CF ${j.conf}</span> <span class="pill lima">plan: ${plan}</span>${les}${mer}${rasg?`<div style="margin-top:3px">${rasg}</div>`:""}`;
    if(!j.lesion){
      const g=document.createElement("div");g.className="entreno";g.style.marginTop="8px";
      const bAuto=document.createElement("button");
      bAuto.innerHTML=`${t("ent_auto")}<br><b>${t("ent_debil")}</b>`;
      bAuto.className=plan==="auto"?"selbtn on":"selbtn";
      bAuto.onclick=()=>{j.plan="auto";guardar();pintarClubM();};
      g.appendChild(bAuto);
      ATTR_KEYS.forEach(k=>{
        const b=document.createElement("button");
        b.className=plan===k?"selbtn on":"selbtn";
        b.innerHTML=`${atNombre(k)}<br><b style="color:${plan===k?"var(--tinta)":colAttr(j.attrs[k])}">${j.attrs[k]}</b>`;
        b.onclick=()=>{j.plan=k;guardar();pintarClubM();};
        g.appendChild(b);
      });
      d.appendChild(g);
    }
    en.appendChild(d);
  });
  const fInt=document.createElement("div");fInt.className="fila";fInt.style.margin="4px 0";
  ["suave","normal","intensa"].forEach(it=>{
    const b=document.createElement("button");
    b.className="selbtn"+((cl.intens||"normal")===it?" on":"");
    b.style.fontSize="11px";
    b.textContent=it==="suave"?"Suave":it==="normal"?"Normal":"Intensa ⚠";
    b.onclick=()=>{cl.intens=it;guardar();pintarClubM();};
    fInt.appendChild(b);
  });
  en.appendChild(fInt);
  const btnAll=document.createElement("button");
  btnAll.className="pri";btnAll.style.width="100%";btnAll.style.marginTop="4px";
  const aptos=cl.plantilla.filter(j=>!j.lesion&&j.energia>=25).length;
  btnAll.textContent=`🏋 Semana de entrenamiento — entrenan ${aptos} jugador${aptos===1?"":"es"} a la vez`;
  btnAll.disabled=aptos===0;
  btnAll.onclick=entrenarClubTodos;
  en.appendChild(btnAll);
  document.getElementById("cmCalendario").innerHTML=calHtml();
}
function pintarCmPlantilla(){
  const cl=G.clubG,el=document.getElementById("cm-plantilla");el.innerHTML="";
  // alineación
  if(cl.ofertaRival&&cl.plantilla[cl.ofertaRival.jugIdx]){
    const of=cl.ofertaRival, jOf=cl.plantilla[of.jugIdx];
    const oc=document.createElement("div");oc.className="card";
    oc.innerHTML=`<h3>${t("clb_of_hd")}<em>${CLUBES_NPC[of.clubIdx].n}</em></h3>
      <div style="font-size:12.5px;margin-bottom:9px"><span style="color:${CLUBES_NPC[of.clubIdx].color}">●</span> ${t("clb_of_txt",{club:CLUBES_NPC[of.clubIdx].n,monto:of.monto,n:jOf.n,niv:mediaAttrs(jOf.attrs)})}</div>`;
    const fr=document.createElement("div");fr.className="fila";
    const bA=document.createElement("button");bA.className="pri";bA.textContent=t("clb_of_aceptar",{monto:of.monto});
    bA.onclick=()=>{
      cl.dinero+=of.monto;
      const idx=of.jugIdx;
      cl.plantilla.splice(idx,1);
      cl.alin=cl.alin.map(a=>a>idx?a-1:a);
      if(cl.alinB){cl.alinB=cl.alinB.filter(x=>x!==idx).map(a=>a>idx?a-1:a);if(cl.alinB.length<2)cl.alinB=null;}
      noticia("venta",t("not_traspaso_t",{jug:jOf.n}),t("not_traspaso_s",{club:CLUBES_NPC[of.clubIdx].n,monto:of.monto}));
      avisa(t("clb_of_marcha",{n:jOf.n,club:CLUBES_NPC[of.clubIdx].n,monto:of.monto}));
      cl.ofertaRival=null;guardar();pintarClubM();
    };
    const bR=document.createElement("button");bR.textContent=t("clb_of_rechazar");
    bR.onclick=()=>{avisa(t("clb_of_rechazada",{club:CLUBES_NPC[of.clubIdx].n,n:jOf.n}));cl.ofertaRival=null;guardar();pintarClubM();};
    fr.appendChild(bA);fr.appendChild(bR);oc.appendChild(fr);
    el.appendChild(oc);
  } else if(cl.ofertaRival){ cl.ofertaRival=null; }
  const alCard=document.createElement("div");alCard.className="card";
  alCard.innerHTML=`<h3>Alineaciones · <em>pareja A y pareja B</em></h3>`;
  cl.plantilla.forEach((j,idx)=>{
    const row=document.createElement("div");row.className="fila";row.style.marginBottom="5px";row.style.alignItems="center";
    const enA=cl.alin.includes(idx), enB=cl.alinB&&cl.alinB.includes(idx);
    const nom=document.createElement("div");
    nom.style.flex="2";nom.style.fontSize="12px";nom.style.display="flex";nom.style.alignItems="center";nom.style.gap="6px";
    nom.innerHTML=`<span>${avatarSVG(j,30)}</span><span>${enA?"🅰 ":enB?"🅱 ":""}${j.n} ${ladoChip(j.lado)} · <span style="color:var(--gris)">nivel ${mediaAttrs(j.attrs)}${j.lesion?" · LESIONADO":""}</span></span>`;
    const bA=document.createElement("button");bA.textContent="A";bA.className=enA?"selbtn on":"selbtn";bA.style.flex=".4";
    bA.onclick=()=>{
      if(enA) return;
      if(cl.alinB){cl.alinB=cl.alinB.filter(x=>x!==idx);if(cl.alinB.length<2)cl.alinB=null;}
      cl.alin=[cl.alin[1],idx];
      guardar();pintarClubM();
    };
    const bB=document.createElement("button");bB.textContent="B";bB.className=enB?"selbtn on":"selbtn";bB.style.flex=".4";
    bB.onclick=()=>{
      if(enA) return;
      if(enB){cl.alinB=cl.alinB.filter(x=>x!==idx);if(cl.alinB.length<2)cl.alinB=null;guardar();pintarClubM();return;}
      cl.alinB=cl.alinB?[cl.alinB[cl.alinB.length-1],idx]:[idx];
      if(cl.alinB.length===1){/* esperando segundo */}
      guardar();pintarClubM();
    };
    row.appendChild(nom);row.appendChild(bA);row.appendChild(bB);
    alCard.appendChild(row);
  });
  const q=document.createElement("div");q.className="foot";q.style.textAlign="left";
  const alB2=alineacionB();
  q.innerHTML=`Química A: ${quimActual(cl)}${alB2?` · Química B: ${quimDe(cl,cl.alinB)}`:cl.alinB&&cl.alinB.length===1?" · Pareja B: elige un segundo jugador":" · Sin pareja B (necesitas 4+ jugadores)"}`;
  alCard.appendChild(q);
  el.appendChild(alCard);
  // fichas de jugadores
  asegurarPlantillaClub(cl);
  cl.plantilla.forEach((j,idx)=>{
    const d=document.createElement("div");d.className="card";
    const rolJ=cl.alin.includes(idx)?"A":(cl.alinB&&cl.alinB.includes(idx))?"B":null;
    const est=estadoJugadorClub(j), moralC=j.moralC==null?70:j.moralC;
    const ct=j.contrato||{};
    d.innerHTML=`<h3>${j.pais||""} ${j.n} · <em>${mediaAttrs(j.attrs)}</em></h3>
      <div class="meta" style="margin-top:0">
        <div class="chip">${j.edad} años</div>
        <div class="chip">${estiloNombre(j.estilo)}</div>
        <div class="chip">${persoNombre(j.perso)}</div>
        <div class="chip">Salario <b>${salarioDe(j)}€</b></div>
        <div class="chip">Energía <b style="color:${colAttr(j.energia)}">${j.energia}</b></div>
        <div class="chip">Confianza <b style="color:${colAttr(j.conf)}">${j.conf}</b></div>
        <div class="chip">Moral <b style="color:${colAttr(moralC)}">${moralC}</b></div>
        <div class="chip">Contrato <b>${ct.temporadas||1} temp.</b></div>
        <div class="chip">Cláusula <b>${(valorClausula(j)).toLocaleString("es")}€</b></div>
        ${rolJ?`<div class="chip lima">titular ${rolJ}</div>`:""}
      </div>
      <div class="foot" style="text-align:left;margin-top:6px;color:${est.col<0?"var(--rojo)":est.col>0?"var(--verde)":"var(--gris)"}">${est.clave==="salir"?"🚪":est.clave==="exige"?"😠":est.clave==="dudas"?"🤔":"🙂"} ${est.txt}</div>
      ${chipRasgos(j)?`<div style="margin-top:4px">${chipRasgos(j)}</div>`:""}
      <div class="attrs" style="margin-top:10px">${attrHtml(j.attrs)}</div>`;
    if(cl.plantilla.length>2&&!cl.alin.includes(idx)&&!(cl.alinB&&cl.alinB.includes(idx))){
      const b=document.createElement("button");b.style.width="100%";b.style.marginTop="10px";
      b.textContent=`Traspasar (+${mediaAttrs(j.attrs)*4}€)`;
      b.onclick=()=>{
        cl.dinero+=mediaAttrs(j.attrs)*4;
        cl.plantilla.splice(idx,1);
        cl.alin=cl.alin.map(a=>a>idx?a-1:a);
        avisa(t("clb_traspasado",{n:j.n}));
        guardar();pintarClubM();
      };
      d.appendChild(b);
    }
    el.appendChild(d);
  });
  // mercado
  const m=document.createElement("div");m.className="card";
  m.innerHTML=`<h3>Mercado de fichajes</h3>`;
  if(cl.plantilla.length>=6){
    m.innerHTML+=`<div class="foot" style="text-align:left">Plantilla completa (6). Traspasa antes de fichar.</div>`;
  } else {
    cl.mercado.forEach((j,mi)=>{
      const coste=costeFichaje(j);
      const d=document.createElement("div");d.className="opcion";
      d.innerHTML=`<b>${j.n}</b> <span class="pill">nivel ${nivelTxt(j)}</span> <span class="pill">${j.edad} años</span> <span class="pill">${estiloNombre(j.estilo)}</span><div class="d">Fichaje ${coste}€ · salario ${salarioDe(j)}€/sem</div>`;
      const b=document.createElement("button");b.style.width="100%";
      b.textContent=cl.dinero<coste?"Caja insuficiente":`Fichar (${coste}€)`;
      b.disabled=cl.dinero<coste;
      b.onclick=()=>{
        cl.dinero-=coste;
        cl.plantilla.push({...j});
        cl.mercado.splice(mi,1);
        avisa(t("clb_fichaje",{n:j.n,club:cl.nombre}));
        guardar();pintarClubM();
      };
      d.appendChild(b);m.appendChild(d);
    });
    if(!cl.mercado.length) m.innerHTML+=`<div class="foot" style="text-align:left">Mercado vacío. Nuevos agentes libres al cierre de temporada.</div>`;
  }
  el.appendChild(m);
}
function pintarCmClub(){
  const cl=G.clubG,el=document.getElementById("cm-clubpan");el.innerHTML="";
  const pre=prestigioClub(),socios=25+Math.round(pre*1.5);
  const c1=document.createElement("div");c1.className="card";
  c1.innerHTML=`<h3>${cl.nombre} · <em>finanzas</em></h3>
    <div class="meta" style="margin-top:0">
      <div class="chip">Prestigio <b>${pre}</b></div>
      <div class="chip">Socios <b>+${socios}€/sem</b></div>
      <div class="chip">Salarios <b>-${salariosSemana()}€/sem</b></div>
      <div class="chip">Instalaciones <b>Nv ${cl.instal}</b></div>
      <div class="chip">Récord <b>${(cl.vd||{v:0,d:0}).v}-${(cl.vd||{v:0,d:0}).d}</b></div>
      <div class="chip">Afición <b style="color:var(--lima)">${fmtFans(cl.fans||0)}</b> <span style="color:var(--gris2)">(+${Math.round((cl.fans||0)*.01)}€/sem)</span></div>
    </div>`;
  el.appendChild(c1);
  const c2=document.createElement("div");c2.className="card";
  c2.innerHTML=`<h3>Instalaciones</h3>`;
  if(cl.instal<3){
    const coste=cl.instal===1?400:900;
    const d=document.createElement("div");d.className="opcion";
    d.innerHTML=`<b>Mejorar a nivel ${cl.instal+1}</b><div class="d">${cl.instal===1?"Pistas propias: los entrenos rinden más.":"Centro de alto rendimiento: aún más."} · ${coste}€</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=cl.dinero<coste?"Caja insuficiente":`Mejorar (${coste}€)`;
    b.disabled=cl.dinero<coste;
    b.onclick=()=>{cl.dinero-=coste;cl.instal++;avisa(t("clb_instal",{n:cl.instal}));guardar();pintarClubM();};
    d.appendChild(b);c2.appendChild(d);
  } else c2.innerHTML+=`<div class="foot" style="text-align:left">Centro de alto rendimiento ✔</div>`;
  el.appendChild(c2);
  const c3=document.createElement("div");c3.className="card";
  c3.innerHTML=`<h3>Academia</h3>`;
  if(!cl.academia){
    const d=document.createElement("div");d.className="opcion";
    d.innerHTML=`<b>Abrir academia</b><div class="d">Cada temporada forma una joven promesa. · 300€</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=cl.dinero<300?"Caja insuficiente":"Abrir academia (300€)";
    b.disabled=cl.dinero<300;
    b.onclick=()=>{cl.dinero-=300;cl.academia=true;avisa("Academia abierta.");guardar();pintarClubM();};
    d.appendChild(b);c3.appendChild(d);
  } else if(!cl.cantera.length){
    c3.innerHTML+=`<div class="foot" style="text-align:left">La academia trabaja. Promesas al cierre de temporada.</div>`;
  } else {
    cl.cantera.forEach((j,idx)=>{
      const d=document.createElement("div");d.className="opcion";
      d.innerHTML=`<b>${j.n}</b> <span class="pill">nivel ${nivelTxt(j)}</span> <span class="pill">${j.edad} años</span> <span class="pill">${estiloNombre(j.estilo)}</span><div class="d">Promesa de la academia — nadie sabe su techo todavía</div>`;
      const f=document.createElement("div");f.className="fila";
      const b1=document.createElement("button");b1.className="pri";b1.textContent="Subir al primer equipo";
      b1.disabled=cl.plantilla.length>=6;
      b1.onclick=()=>{cl.plantilla.push({...j,salario:Math.round(mediaAttrs(j.attrs)*.6),energia:100,conf:55,lesion:null});cl.cantera.splice(idx,1);avisa(t("clb_sube",{n:j.n}));guardar();pintarClubM();};
      const b2=document.createElement("button");b2.textContent=`Traspasar (+${mediaAttrs(j.attrs)*6}€)`;
      b2.onclick=()=>{cl.dinero+=mediaAttrs(j.attrs)*6;cl.cantera.splice(idx,1);avisa(t("clb_promesa_out",{n:j.n}));guardar();pintarClubM();};
      f.appendChild(b1);f.appendChild(b2);d.appendChild(f);c3.appendChild(d);
    });
  }
  el.appendChild(c3);
  // reformas
  const c4=document.createElement("div");c4.className="card";
  c4.innerHTML=`<h3>${t("ref_hd")}</h3>`;
  Object.entries(REFORMAS).forEach(([k,r])=>{
    if(cl.reformas[k]){
      const d=document.createElement("div");d.className="foot";d.style.textAlign="left";d.textContent=`✔ ${t("ref_"+k)}`;c4.appendChild(d);
      return;
    }
    const d=document.createElement("div");d.className="opcion";
    d.innerHTML=`<b>${t("ref_"+k)}</b><div class="d">${t("ref_"+k+"_d")} · ${r.coste}€</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=cl.dinero<r.coste?t("mkt_caja"):t("ref_construir",{coste:r.coste});
    b.disabled=cl.dinero<r.coste;
    b.onclick=()=>{cl.dinero-=r.coste;cl.reformas[k]=true;avisa(`🏗 ${t("hito_cl_reforma")}: ${t("ref_"+k)}.`);guardar();pintarClubM();};
    d.appendChild(b);c4.appendChild(d);
  });
  el.appendChild(c4);
  // patrocinador principal del club
  const cS=document.createElement("div");cS.className="card";cS.innerHTML=`<h3>${t("patro_club_hd")}</h3>`;
  if(cl.sponsorOferta&&(!cl.sponsor||cl.sponsor.marca!==cl.sponsorOferta.marca)){
    const of=cl.sponsorOferta;
    const dS=document.createElement("div");dS.className="opcion";
    dS.innerHTML=`<b>🏟 ${of.marca}</b> <span class="pill">${tierTxt(of.tier)}</span><div class="d">${t("patro_club_oferta",{sec:of.sec,sem:of.sem})}</div>`;
    const b=document.createElement("button");b.className="pri";b.style.width="100%";b.textContent=t("patro_club_firmar");
    b.onclick=()=>{cl.sponsor={...of};cl.sponsorOferta=null;noticia("contrato",t("not_patro_club_t",{marca:of.marca,club:cl.nombre}),t("not_patro_club_s",{tier:tierTxt(of.tier).toLowerCase()}));avisa(t("patro_club_av",{marca:of.marca,sem:of.sem}));fansAdd(200,t("fan_patro_club"));guardar();pintarClubM();};
    dS.appendChild(b);cS.appendChild(dS);
  }
  if(cl.sponsor){
    const dS=document.createElement("div");dS.className="foot";dS.style.textAlign="left";dS.style.marginTop="4px";
    dS.innerHTML=t("patro_club_actual",{marca:cl.sponsor.marca,tier:tierTxt(cl.sponsor.tier),sem:cl.sponsor.sem});
    cS.appendChild(dS);
  } else if(!cl.sponsorOferta){
    const dS=document.createElement("div");dS.className="foot";dS.style.textAlign="left";
    dS.textContent=t("patro_club_sin");
    cS.appendChild(dS);
  }
  el.appendChild(cS);
  // cuerpo técnico: personas de verdad
  const c5=document.createElement("div");c5.className="card";
  c5.innerHTML=`<h3>Cuerpo técnico</h3><div id="cmEquipoStaff"></div><h3 style="margin-top:10px">Mercado de personal</h3><div id="cmMercadoStaff"></div>`;
  el.appendChild(c5);
  renderEquipoStaff(c5.querySelector("#cmEquipoStaff"));
  renderMercadoStaff(c5.querySelector("#cmMercadoStaff"));
  const c6=document.createElement("div");c6.className="card";
  c6.innerHTML=`<h3>Hitos del club</h3><div id="cmHitos"></div>`;
  el.appendChild(c6);
  renderHitos(c6.querySelector("#cmHitos"));
  const c7=document.createElement("div");c7.className="card";
  c7.innerHTML=`<h3>Rivalidades</h3><div id="cmRivalidades"></div>`;
  el.appendChild(c7);
  renderRivalidades(c7.querySelector("#cmRivalidades"));
}
function entrenaUnoClub(j,factor){
  const cl=G.clubG, it=cl.intens||"normal";
  if(j.lesion||factor<=0) return null;
  const k=(j.plan&&j.plan!=="auto")?j.plan:ATTR_KEYS.reduce((a,b)=>j.attrs[a]<=j.attrs[b]?a:b);
  const v=j.attrs[k];
  let g=v<55?2:v<70?1:(Math.random()<.5?1:0);
  if(cl.instal>=2&&Math.random()<.4) g+=1;
  if(cl.instal>=3&&Math.random()<.3) g+=1;
  if(cl.reformas&&cl.reformas.video&&Math.random()<.35) g+=1;
  const entNiv=(cl.staff&&cl.staff.entrenador&&cl.staff.entrenador.niv)||0;
  if(entNiv&&Math.random()<.12*entNiv) g+=1;   // buen entrenador jefe = mejor progresión
  g=ajustaGanancia(g,it,j.edad);
  if(v>=58&&g>0&&Math.random()<.5) g--;
  if(v>=72&&g>0&&Math.random()<.5) g--;
  if(factor<1&&g>0&&Math.random()>factor) g=Math.max(0,g-1);
  if(factor<1&&Math.random()>factor+.25) g=0;
  if(g>0){ const rf=rasgosEntreno(j); if(rf>1&&Math.random()<rf-1) g++; else if(rf<1&&Math.random()<1-rf) g=Math.max(0,g-1); }   // talento / entrena mal
  j.attrs[k]=clamp(v+g,20,Math.min(96,(j.pot||96)+4));
  if(factor===1) j.energia=clamp(j.energia-(it==="suave"?10:it==="intensa"?26:17),0,100);
  if(factor===1&&it==="intensa"&&Math.random()<.05&&!j.lesion){
    j.lesion={n:"sobrecarga por exceso de entrenamiento",k:"les_sobre",sem:1};
    return `${j.n} ${k}+${g}⚠`;
  }
  return g>0?`${j.n} ${k}+${g}`:null;
}
function entrenarClubTodos(){
  G.clubG._accion="entreno";
  avanzarSemanaClub();
}
document.getElementById("cmBtnDescanso").onclick=()=>{
  G.clubG._accion="descanso";
  G.clubG.plantilla.forEach(j=>{
    j.energia=clamp(j.energia+23,0,100);
    if(j.lesion){j.lesion.sem--;if(j.lesion.sem<=0){const s=curarLesion(j);avisa(t("les_alta_club",{n:j.n})+(s?t("les_merma_club",{pct:s.pct,sem:s.sem}):""));}}
    decaeMerma(j);
  });
  avisa("Semana de descanso y viajes del equipo.");
  avanzarSemanaClub();
};
// Asegura que cada jugador tiene contrato y moral de plantilla (guardados viejos incluidos).
function asegurarPlantillaClub(cl){
  (cl.plantilla||[]).forEach(j=>{
    if(!j.contrato) j.contrato=mkContratoClub(mediaAttrs(j.attrs));
    if(j.moralC==null) j.moralC=70;
  });
}
function avanzarSemanaClub(){
  const cl=G.clubG;
  asegurarPlantillaClub(cl);
  const accion=cl._accion||"descanso"; cl._accion=null;
  const factor=accion==="entreno"?1:accion==="torneo"?0.5:0;
  if(factor>0){
    const partes=cl.plantilla.map(j=>entrenaUnoClub(j,factor)).filter(Boolean);
    if(partes.length) avisa(`${factor===1?t("clb_semana_trabajo"):t("clb_entreno_partidos")} — ${partes.join(" · ")}.`);
  }
  if(cl._pendB!==null){ const ci=cl._pendB; cl._pendB=null; simTorneoParejaB(ci); }
  simCircuito(cl._rivalesSemana);cl._rivalesSemana=[];
  prensaSemanal();
  cl.semana++;
  const regen=10+(cl.reformas.gym?4:0)+(cl.staff.fisico?4:0);
  cl.plantilla.forEach((j,idx)=>{
    j.energia=clamp(j.energia+regen,0,100);
    if(cl.reformas.residencia) j.conf=clamp(j.conf+1,15,95);
    if(cl.staff.psico&&j.conf<50) j.conf=clamp(j.conf+2,15,95);
    if(cl.staff.fisio&&j.lesion&&Math.random()<.3){j.lesion.sem--;if(j.lesion.sem<=0){const s=curarLesion(j);avisa(`El fisio adelanta el alta de ${j.n}.`+(s?` (mermado -${s.pct}%, ${s.sem} sem)`:""));}}
    decaeMerma(j);
    // moral por minutos: el rol (titular A / B / banquillo) sube o quema la moral
    const rol=cl.alin.includes(idx)?"A":(cl.alinB&&cl.alinB.includes(idx))?"B":"banquillo";
    const antes=estadoJugadorClub(j).clave;
    j.moralC=clamp((j.moralC==null?70:j.moralC)+moralMinutosDelta(j,rol),5,95);
    const est=estadoJugadorClub(j);
    if(est.clave!==antes&&(est.clave==="exige"||est.clave==="salir")) avisa(`${est.clave==="salir"?"🚪":"😠"} ${j.n}: ${est.txt}`);
  });
  const posC_=miPuesto();
  fansAdd(Math.round((cl.fans||0)*.002)+(posC_<=10?25:posC_<=20?8:1));
  cl.dinero+=120+Math.round(prestigioClub()*10)+(cl.reformas.techada?150:0)+Math.round((cl.fans||0)*.01);
  if(cl.sponsor) cl.dinero+=cl.sponsor.sem;
  // el patrocinador principal aparece/mejora con el prestigio
  if(!cl._sponsorCheck||cl._sponsorCheck<temporada()){
    cl._sponsorCheck=temporada();
    const pre=prestigioClub(), tr=pre>=60?4:pre>=35?3:pre>=15?2:1;   // ojo: no llamar `t` (taparía i18n)
    if(!cl.sponsor||cl.sponsor.tier<tr){
      const of=ofertaPatro(tr);
      cl.sponsorOferta={marca:of.marca,sec:of.sec,tier:tr,sem:Math.round(of.sem*1.4),nombre:`${["","Bar","Deportes","","Grupo"][Math.floor(Math.random()*5)]} ${of.marca}`.trim()};
      avisa(t("patro_club_av_oferta",{marca:cl.sponsorOferta.marca,tier:tierTxt(tr),sem:cl.sponsorOferta.sem}));
    }
  }
  cl.dinero-=salariosSemana();
  if(cl.dinero<0) avisa(`⚠ Caja en números rojos (${cl.dinero}€). Los premios y socios tendrán que salvarte.`);
  if((cl.semana-1)%SEMANAS_TEMP===0){
    const posFin=miPuesto(), ptsFin=cl.pts;
    const titsT=cl.palmares.filter(x=>x.includes(`(T${temporada()-1})`)).length;
    cl.hist=(cl.hist||[]); cl.hist.push({t:temporada()-1,pos:posFin,pts:ptsFin,tit:titsT});
    cl.calRes={}; cl.wildcards=2;
    // contratos: descuenta una temporada y gestiona los que vencen (renovar o irse libre)
    for(let i=cl.plantilla.length-1;i>=0;i--){
      const j=cl.plantilla[i]; if(!j.contrato) continue;
      j.contrato.temporadas--;
      if(j.contrato.temporadas>0) continue;
      const oferta=Math.round(mediaAttrs(j.attrs)*8*1.05), r=evaluaRenovacionClub(j,oferta);
      const esImprescindible=cl.plantilla.length<=2;
      if(r.acepta||esImprescindible){
        j.contrato=mkContratoClub(mediaAttrs(j.attrs)); j.contrato.salario=oferta; j.moralC=clamp((j.moralC==null?70:j.moralC)+8,5,95);
        avisa(`✍ ${j.n} renueva con el ${cl.nombre} (${j.contrato.temporadas} temp.).`);
      } else {
        avisa(`🚪 ${j.n} acaba contrato y no renueva (pedía ${r.espera}€/sem): se marcha libre.`);
        noticia("venta",t("not_libre_t",{jug:j.n}),t("not_libre_s",{club:cl.nombre}));
        if(cl.alin.includes(i)){ cl.alin=[0,1]; }
        if(cl.alinB){ cl.alinB=cl.alinB.filter(x=>x!==i).map(a=>a>i?a-1:a); if(cl.alinB.length<2)cl.alinB=null; }
        cl.alin=cl.alin.map(a=>a>i?a-1:a);
        cl.plantilla.splice(i,1);
      }
    }
    repararAlin();
    // la junta pasa revista
    const J=cl.junta||{objetivo:34,paciencia:2};
    if(posFin<=J.objetivo){
      J.paciencia=2;
      cl._juntaOk=(cl._juntaOk||0)+1;
      const bonus=3000+Math.max(0,(J.objetivo-posFin))*200;
      cl.dinero+=bonus;
      avisa(t("clb_junta_ok",{pos:posFin,obj:J.objetivo,bonus}));
    } else {
      J.paciencia--;
      if(J.paciencia<=0){
        noticia("hito",t("not_destituido_t"),t("not_destituido_s",{obj:J.objetivo}));
        avisa(t("clb_destituido",{pos:posFin,obj:J.objetivo}));
        cl._despedido=true;
      } else {
        avisa(t("clb_junta_aviso",{obj:J.objetivo,pos:posFin}));
        post("junta");
      }
    }
    J.objetivo=Math.max(3,Math.round(Math.min(posFin,J.objetivo)*.85));
    cl.junta=J;
    avisa(t("clb_junta_nuevo",{obj:J.objetivo}));
    evolucionaMundo();
    cl.pts=Math.round(cl.pts*.55);
    cl.plantilla.forEach(j=>{
      j.edad++;
      for(let i=0;i<2;i++){
        const k=pick(ATTR_KEYS);
        if(j.edad<24) j.attrs[k]=clamp(j.attrs[k]+1,25,96);
        else if(j.edad>30) j.attrs[k]=clamp(j.attrs[k]-1,25,96);
      }
    });
    cl.mercado=mkMercadoLibre(cl.sexo||"M");
    if(cl.staff.ojeador){ for(let i=0;i<3;i++) cl.mercado.push(mkAgente(56,72,cl.sexo||"M")); }
    // los clubes rivales también fichan
    if(cl.mercado.length>4&&Math.random()<.8){
      const qi=Math.floor(Math.random()*cl.mercado.length);
      const jj=cl.mercado.splice(qi,1)[0];
      avisa(`📰 ${jj.n} ficha por el ${pick(CLUBES_NPC).n}.`);
    }
    // ...y vienen a por los tuyos (nunca por tu pareja A)
    if(!cl.ofertaRival&&cl.plantilla.length>2&&Math.random()<.55){
      // van antes a por los descontentos (los que piden salir), y ofrecen en torno a la cláusula
      const cands=cl.plantilla.map((j,i)=>i).filter(i=>!cl.alin.includes(i));
      if(cands.length){
        const descon=cands.filter(i=>estadoJugadorClub(cl.plantilla[i]).clave==="salir");
        const ji=pick(descon.length?descon:cands), cr=Math.floor(Math.random()*9), jj=cl.plantilla[ji];
        const quiereIrse=estadoJugadorClub(jj).clave==="salir";
        cl.ofertaRival={clubIdx:cr,jugIdx:ji,monto:Math.round(valorClausula(jj)*R(quiereIrse?.75:.85,1.1))};
        avisa(`📋 El ${CLUBES_NPC[cr].n} ofrece ${cl.ofertaRival.monto}€ por ${jj.n} (cláusula ${valorClausula(jj).toLocaleString("es")}€).${quiereIrse?` ${jj.n} quiere salir: presiona por marcharse.`:""} Decide en Plantilla.`);
      }
    }
    avisa(`— Cierre de temporada ${temporada()-1}. El ranking arrastra el 55% y llegan nuevos agentes libres${cl.staff.ojeador?" (el ojeador trae joyas extra)":""}.`);
    if(cl.academia&&cl.cantera.length<3){
      const j=mkAgente(42+cl.instal*2,50+cl.instal*2,cl.sexo||"M");
      j.edad=17;
      cl.cantera.push(j);
      avisa(`🎓 La academia presenta a ${j.n} (${mediaAttrs(j.attrs)} de media).`);
    }
  }
  ofertaStaffSemanal();
  chequeaHitos();
  guardaPosiciones();
  guardar();
  pintarClubM();
}


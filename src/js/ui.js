/* ================================================================
   NAVEGACIÓN Y MENÚ
================================================================ */
function irA(s){
  ["menu","crear","crearclub","club","clubm","torneo","partido"].forEach(x=>{
    const el=document.getElementById("scr-"+x);
    if(el) el.classList.toggle("oculto",x!==s);
  });
  document.getElementById("miniBtns").style.display = (s==="menu")?"none":"flex";
  if(s==="partido"){resize();draw();}
}
function infoSlot(modo){
  const raw=lsGet(SLOTS[modo]);
  if(!raw) return null;
  try{
    const d=JSON.parse(raw);
    const e=modo==="carrera"?d.carrera:d.clubG;
    const t=Math.floor((e.semana-1)/SEMANAS_TEMP)+1, s=((e.semana-1)%SEMANAS_TEMP)+1;
    const quien=modo==="carrera"?e.nombre:e.nombre;
    return {d,txt:`${quien} · T${t} S${s}`};
  }catch(e){ return null; }
}
function pintarMenu(){
  const sc=infoSlot("carrera"), scl=infoSlot("club");
  const bC=document.getElementById("btnCarrera"), bCl=document.getElementById("btnClub");
  bC.textContent = sc?`🎾 Carrera de jugador ·  continuar o nueva` : "🎾 Carrera de jugador";
  bCl.textContent = scl?`🏟 Modo club ·  continuar o nueva` : "🏟 Modo club";
  document.getElementById("menuInfo").textContent = (sc||scl)
    ? "Tienes partida guardada: al entrar podrás continuarla o empezar una nueva."
    : "El guardado es automático. Puedes exportar/importar tu partida como copia de seguridad.";
  document.getElementById("topCtx").innerHTML="<b>Rising Games</b>";
}
// modal de elección: continuar guardada o empezar nueva
function quitarEl(el){
  if(!el) return;
  try{ if(typeof el.remove==="function"){ el.remove(); return; } }catch(e){}
  try{ if(el.parentNode) el.parentNode.removeChild(el); }catch(e){}
  try{ el.style.display="none"; }catch(e){}
}
function abrirModo(modo){
  const s=infoSlot(modo);
  const nueva=()=>{ if(modo==="carrera"){ pintarCrear(); irA("crear"); } else { prepararCrearClub(); irA("crearclub"); } };
  const continuar=()=>{
    const s2=infoSlot(modo);
    if(!s2){ alert("La partida guardada no se pudo cargar."); lsDel(SLOTS[modo]); pintarMenu(); return; }
    G=s2.d; entrarPartida();
  };
  if(!s){ nueva(); return; }   // sin guardado: directo a crear
  // hay guardado → ventana de elección
  const ov=document.getElementById("modoModal")||(()=>{const d=document.createElement("div");d.id="modoModal";d.style.cssText="position:fixed;inset:0;background:rgba(10,13,19,.92);z-index:80;display:flex;align-items:center;justify-content:center;padding:16px";document.body.appendChild(d);return d;})();
  const etq=modo==="carrera"?"carrera":"club";
  ov.innerHTML=`<div class="card" style="max-width:400px;width:100%">
    <h3 style="margin-top:0">${modo==="carrera"?"🎾 Carrera de jugador":"🏟 Modo club"}</h3>
    <div class="opcion" style="margin-bottom:8px">
      <b>Partida guardada</b>
      <div class="d">${s.txt}</div>
      <button class="pri" style="width:100%;margin-top:6px" id="mmCont">▸ Continuar esta partida</button>
    </div>
    <div class="opcion">
      <b>Empezar de cero</b>
      <div class="d">Crea una ${etq} nueva. ${modo==="carrera"?"Tu carrera":"Tu club"} guardada se conservará hasta que confirmes la nueva al terminar de crearla.</div>
      <button style="width:100%;margin-top:6px" id="mmNueva">✦ Nueva ${etq}</button>
    </div>
    <button style="width:100%;margin-top:10px;background:none;color:var(--gris)" id="mmCerrar">Cancelar</button>
  </div>`;
  document.getElementById("mmCont").onclick=()=>{ quitarEl(ov); continuar(); };
  document.getElementById("mmNueva").onclick=()=>{ quitarEl(ov); nueva(); };
  document.getElementById("mmCerrar").onclick=()=>quitarEl(ov);
  ov.onclick=(e)=>{ if(e.target===ov) quitarEl(ov); };
}
document.getElementById("btnCarrera").onclick=()=>abrirModo("carrera");
document.getElementById("btnClub").onclick=()=>abrirModo("club");
function repartirClubes(){
  if(!G.world||!G.world.parejas) return;
  ["M","F"].forEach(sx=>{
    const pares=G.world.parejas.filter(p=>(p.sexo||"M")===sx);
    // clubes barajados; asignación round-robin → reparto parejo (2-3 por club)
    const orden=CLUBES_NPC.map((_,i)=>i).sort(()=>Math.random()-.5);
    pares.forEach((p,i)=>{ p.club=orden[i%orden.length]; });
  });
}
function entrarPartida(){
  if(G.world&&G.world.parejas&&G.world.parejas[0]&&G.world.parejas[0].club===undefined){
    repartirClubes();
  }
  // reparto viejo (9 clubes) → reequilibrar a los 16 una sola vez
  if(G.world&&!G.world._club16){ repartirClubes(); G.world._club16=1; }
  if(G.world&&!G.world._lados){ G.world.parejas.forEach(p=>{ if(p.jug&&p.jug[0]&&p.jug[0].lado===undefined) asignaLadosPareja(p.jug); }); G.world._lados=1; }
  if(G.world&&G.world.parejas&&G.world.parejas.length<WORLD_N){  // ampliación del circuito para guardados antiguos
    let tocaM=true;
    while(G.world.parejas.length<WORLD_N){
      if(!G.world.nextId){ G.world.nextId=100; G.world.parejas.forEach(p=>{ if(p.id>=G.world.nextId) G.world.nextId=p.id+1; }); }
      const sx=tocaM?"M":"F"; tocaM=!tocaM;
      const nivel=Math.round(R(42,66));
      const j1=mkJovenNPC(sx), j2=mkJovenNPC(sx);
      j1.attrs=mkAttrsNivel(nivel,j1._est); j2.attrs=mkAttrsNivel(nivel,j2._est);
      G.world.parejas.push({id:G.world.nextId++,nombre:`${j1.n}/${j2.n}`,jug:[j1,j2],edad:Math.round(R(19,30)),pro:false,sexo:sx,
        pts:Math.max(0,Math.round((nivel-40)*(nivel-40)*R(1.2,2.4))),club:Math.floor(Math.random()*9),atNet:false});
    }
    avisa("📰 La federación amplía el circuito: nuevas parejas entran al ranking. Ahora sois 41 por categoría.");
  }
  if(!G.calV52){  // migración al calendario real de 52 semanas
    const e=G.modo==="carrera"?G.carrera:G.clubG;
    if(e&&e.semana>1){
      const t=Math.floor((e.semana-1)/40), s2=(e.semana-1)%40;
      e.semana=t*52+s2+1;
      e.calRes={};
      avisa("📅 El circuito adopta el calendario real de 52 semanas con las sedes oficiales (Riad, Roma, París, Acapulco... y las Finals de Barcelona). Tu temporada se recoloca.");
    }
    G.calV52=1;
  }
  if(G.modo==="carrera"){
    const c=G.carrera;  // compatibilidad con guardados anteriores
    if(c.compiMoral===undefined) c.compiMoral=65;
    if(!c.racha) c.racha=[];
    if(!c.ofertasPatro) c.ofertasPatro=[];
    if(!c.staff) c.staff={rep:false,fisio:false,psico:false,fisico:false};
    if(c.sponsor===undefined){
      c.sponsor=null;
      if(c.patros&&c.patros.length){ c.sponsor=ofertaPatro(Math.min(3,c.patros.length)); delete c.patros; }
    }
    if(!c.sexo) c.sexo="M";
    if(!c.dia) c.dia=1;
    if(!c._ropa) c._ropa=c.color||"#C6F53C";
  if(c.lado!==0&&c.lado!==1) c.lado=0;
  if(c.compi&&c.compi.lado===undefined) c.compi.lado=1-(c.lado||0);
    if(c.fans===undefined) c.fans=100+Math.max(0,(45-miPuesto())*15);
    if(!c.social) c.social=[];
    if(c._sesEntreno===undefined) c._sesEntreno=0;
    if(!c.planJug) c.planJug="auto";
    if(c.entrenador===undefined||c.entrenador===null) c.entrenador=0;
    if(!c._staffV2){
      c.staff=c.staff||{};
      ["fisio","psico","fisico","rep"].forEach(r=>{ if(c.staff[r]===true) c.staff[r]=Object.assign(mkStaff(r,2),{n:mkStaff(r).n+" (de la casa)"}); if(!c.staff[r]) c.staff[r]=null; });
      if(c.entrenador>0&&ENTRENADORES[c.entrenador]){
        const v=ENTRENADORES[c.entrenador];
        c.staff.entrenador=Object.assign(mkStaff("entrenador",c.entrenador>=2?3:2),{n:v.n,esp:v.esp,sal:v.sal});
      } else c.staff.entrenador=null;
      c.entrenador=0;
      c.mercadoStaff=mkMercadoStaff();
      c._staffV2=1;
      avisa("🗂 Se abre el mercado de personal: entrenadores, fisios, psicólogos, preparadores y agentes con nombre y apellidos. Gestiónalo en la pestaña STAFF.");
    }
    if(c.wildcards===undefined) c.wildcards=2;
    if(!c.mercadoP) c.mercadoP=mkMercadoParejas();
    irA("club"); pintarCarrera();
  }
  else {
    const cl=G.clubG;  // compatibilidad
    if(cl.alinB===undefined) cl.alinB=null;
    if(!cl.staff) cl.staff={fisio:false,psico:false,fisico:false,ojeador:false};
    if(!cl.reformas) cl.reformas={techada:false,gym:false,residencia:false,video:false};
    if(cl._pendB===undefined) cl._pendB=null;
    if(!cl.sexo) cl.sexo="M";
    cl.plantilla.forEach(j=>{if(!j.sexo)j.sexo=cl.sexo; if(j.lado===undefined)j.lado=ladoPorAttrs(j.attrs,j.estilo);});
    repararAlin();
    if(!cl.junta) cl.junta={objetivo:Math.max(3,Math.round(miPuesto()*.85)),paciencia:2};
    if(cl.fans===undefined) cl.fans=300+Math.max(0,(45-miPuesto())*20);
    if(!cl._staffV2){
      cl.staff=cl.staff||{};
      ["entrenador","fisio","psico","fisico","ojeador"].forEach(r=>{ if(cl.staff[r]===true) cl.staff[r]=Object.assign(mkStaff(r,2),{n:mkStaff(r).n+" (de la casa)"}); if(cl.staff[r]===undefined) cl.staff[r]=null; });
      cl.mercadoStaff=mkMercadoStaff();
      cl._staffV2=1;
      avisa("🗂 Mercado de personal abierto: contrata a personas concretas para el club en el panel Club.");
    }
    if(!cl.social) cl.social=[];
    if(cl.wildcards===undefined) cl.wildcards=2;
    irA("clubm"); pintarClubM();
  }
  guardar();
}


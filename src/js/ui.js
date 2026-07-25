/* ================================================================
   NAVEGACIÓN Y MENÚ
================================================================ */

/* ---------- acciones declarativas (sin onclick inline) ----------

   El juego pinta casi toda su interfaz con plantillas de texto, y durante mucho
   tiempo los botones así generados llevaban onclick="funcion(arg)" dentro del
   HTML. Eso dejó de funcionar al poner la CSP: un manejador escrito como
   atributo es código en línea, y script-src 'self' lo bloquea. Los selectores
   de dificultad e idioma se quedaron mudos sin que ninguna prueba lo notara.

   La solución mantiene el estilo de plantillas pero saca el código del HTML: el
   botón declara QUÉ quiere hacer con atributos de datos

     <button ${ac("setDif","duro")}>…</button>   →   data-ac="setDif" data-a0="duro"

   y un único escuchador delegado busca ese nombre en el registro ACCIONES y lo
   llama. El nombre es una clave de un objeto, no código: un texto que no esté
   registrado no hace nada. Los argumentos viajan como cadenas; si el registro
   declara que son números, se convierten al llamar. */
const ACCIONES = {};
/* Registra acciones. `num` lista las que reciben argumentos numéricos. */
function registraAcciones(mapa, num){
  for(const k in mapa){ if(Object.prototype.hasOwnProperty.call(mapa,k)) ACCIONES[k]=mapa[k]; }
  (num||[]).forEach(k=>{ if(ACCIONES[k]) ACCIONES[k]._num=true; });
}
/* Genera los atributos para meterlos en una plantilla. Escapa las comillas para
   que un nombre con comillas dentro no pueda romper el marcado. */
function ac(nombre,...args){
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  return `data-ac="${esc(nombre)}"`+args.map((v,i)=>` data-a${i}="${esc(v)}"`).join("");
}
document.addEventListener("click",ev=>{
  const el=ev.target && ev.target.closest && ev.target.closest("[data-ac]");
  if(!el) return;
  const fn=ACCIONES[el.getAttribute("data-ac")];
  if(typeof fn!=="function") return;          // nombre no registrado: no pasa nada
  if(el.disabled) return;
  const args=[];
  for(let i=0;el.hasAttribute("data-a"+i);i++){
    const v=el.getAttribute("data-a"+i);
    args.push(fn._num?Number(v):v);
  }
  fn.apply(null,args);
});

function irA(s){
  ["menu","crear","crearclub","club","clubm","torneo","partido","superliga"].forEach(x=>{
    const el=document.getElementById("scr-"+x);
    if(el) el.classList.toggle("oculto",x!==s);
  });
  document.getElementById("miniBtns").style.display = (s==="menu")?"none":"flex";
  document.body.classList.toggle("en-partido",s==="partido");  // el partido oculta el panel lateral
  document.body.classList.toggle("en-superliga",s==="superliga");  // la Superliga no usa el HUD lateral
  if(typeof aplicarI18n==="function") aplicarI18n();   // traduce el texto estático de cada pantalla
  if(s==="partido"){resize();draw();}
}
/* Cuántas ranuras de un modo tienen algo dentro (para el rótulo del menú). */
function slotsOcupados(modo){
  let n=0;
  for(let i=1;i<=N_RANURAS;i++) if(slotInfo(modo,i)) n++;
  return n;
}
function pintarMenu(){
  const sc=slotsOcupados("carrera"), scl=slotsOcupados("club");
  const bC=document.getElementById("btnCarrera"), bCl=document.getElementById("btnClub");
  const btnSl=document.getElementById("btnSuperliga");
  bC.textContent  = t("btn_carrera")+(sc?t("menu_partidas",{n:sc}):"");
  bCl.textContent = t("btn_club")+(scl?t("menu_partidas",{n:scl}):"");
  if(btnSl) btnSl.textContent = t("btn_superliga");
  document.getElementById("menuInfo").textContent = (sc||scl) ? t("menu_info_partida") : t("menu_info_guardado");
  document.getElementById("topCtx").innerHTML="<b>Rising Games</b>";
  pintarSelectorDif();
  pintarSelectorIdioma();
}

/* Selector de dificultad del menú. La elección se guarda como preferencia
   (localStorage "rpm_dif") y cada partida nueva la fija en G.dif al crearse.
   No afecta a partidas ya empezadas: cada una conserva su propia dificultad. */
function setDif(id){ if(!PERFILES_DIF[id]) return; try{ localStorage.setItem("rpm_dif",id); }catch(e){} pintarSelectorDif(); }
function pintarSelectorDif(){
  const cont=document.getElementById("selDif"); if(!cont) return;
  const sel=difMenu();
  const chips=Object.keys(PERFILES_DIF).map(id=>{
    const p=PERFILES_DIF[id], on=id===sel;
    return `<button type="button" class="difchip${on?" on":""}" ${ac("setDif",id)} aria-pressed="${on}">${p.emoji} ${difNombre(id)}</button>`;
  }).join("");
  cont.innerHTML=`<div class="diflabel">${t("dif_label")}</div><div class="difrow">${chips}</div><div class="difdesc">${difDesc(sel)}</div>`;
}

/* Selector de idioma del menú. Preferencia global (localStorage "rpm_idioma")
   que se aplica al instante: al cambiarlo se repinta todo el menú traducido. */
function setIdioma(id){ if(!idiomaValido(id)) return; try{ localStorage.setItem("rpm_idioma",id); }catch(e){} pintarMenu(); if(typeof aplicarI18n==="function") aplicarI18n(); }
function pintarSelectorIdioma(){
  const cont=document.getElementById("selIdioma"); if(!cont) return;
  const sel=idiomaActual();
  const chips=IDIOMAS.map(l=>{
    const on=l.id===sel;
    return `<button type="button" class="difchip${on?" on":""}" ${ac("setIdioma",l.id)} aria-pressed="${on}" title="${l.n}">${l.bandera} ${l.n}</button>`;
  }).join("");
  cont.innerHTML=`<div class="diflabel">${t("idioma_label")}</div><div class="difrow difrow-wrap">${chips}</div>`;
}
// modal de elección: continuar guardada o empezar nueva
function quitarEl(el){
  if(!el) return;
  try{ if(typeof el.remove==="function"){ el.remove(); return; } }catch(e){}
  try{ if(el.parentNode) el.parentNode.removeChild(el); }catch(e){}
  try{ el.style.display="none"; }catch(e){}
}
/* ---------- Fase 4d·9: hidratación del estado al continuar ----------
   VOLTEO DE AUTORIDAD: si la identidad de las tablas (norm_meta: modo +
   nombre del protagonista) coincide con la partida que se carga, SQLite es la
   fuente primaria y sus entidades se adoptan con validación DE FORMA (aunque
   el blob esté desactualizado). Si la identidad no coincide (la BD es única y
   la comparten carrera y club) o sql.js no está listo, se cae a la ruta
   antigua: el blob manda y SQLite solo sustituye lo que coincide exactamente.
   Devuelve "sqlite" o "blob" para diagnóstico (G._fuenteSql). */
function hidratarDesdeSql(){
  const prot=G?(G.modo==="carrera"?G.carrera:G.clubG):null;
  // --- ruta primaria: SQLite manda si la identidad coincide ---
  try{
    const meta=(typeof dbSqlCargarMeta==="function")?dbSqlCargarMeta():null;
    if(meta && G && meta.modo===G.modo && prot && meta.prota===String(prot.nombre||"")){
      if(typeof dbSqlCargarMundo==="function" && G.world && Array.isArray(G.world.parejas)){
        const m=dbSqlCargarMundo();
        if(m && m.length && m.every(p2=>p2 && Array.isArray(p2.jug) && p2.jug.length===2)){ G.world.parejas=m; G._mundoDesdeSql=true; }
      }
      if(typeof dbSqlCargarN1==="function" && G.world){
        const n1=dbSqlCargarN1(); if(Array.isArray(n1)){ G.world.n1hist=n1; G._n1DesdeSql=true; }
      }
      if(typeof dbSqlCargarMundoKV==="function" && G.world){
        const kv=dbSqlCargarMundoKV();
        if(kv){ Object.keys(kv).forEach(k=>{ G.world[k]=kv[k]; }); G._mundoKvDesdeSql=true; }
      }
      const pal=(typeof dbSqlCargarPalmares==="function")?dbSqlCargarPalmares():null;
      if(Array.isArray(pal)){ prot.palmares=pal; G._palmaresDesdeSql=true; }
      const dia=(typeof dbSqlCargarDiario==="function")?dbSqlCargarDiario():null;
      if(Array.isArray(dia)){ prot.diario=dia; G._diarioDesdeSql=true; }
      const hi=(typeof dbSqlCargarHist==="function")?dbSqlCargarHist():null;
      if(Array.isArray(hi)){ prot.hist=hi; G._histDesdeSql=true; }
      const hh=(typeof dbSqlCargarH2h==="function")?dbSqlCargarH2h():null;
      if(hh && typeof hh==="object"){ prot.h2h=hh; G._h2hDesdeSql=true; }
      const st=(typeof dbSqlCargarStaff==="function")?dbSqlCargarStaff():null;
      if(st && typeof st==="object" && prot.staff && typeof prot.staff==="object"){
        Object.keys(prot.staff).forEach(r=>{ prot.staff[r]=st[r]||null; });
        G._staffDesdeSql=true;
      }
      const fin=(typeof dbSqlCargarFinanzas==="function")?dbSqlCargarFinanzas():null;
      if(fin && Number.isFinite(fin.dinero)){ prot.dinero=fin.dinero; G._finDesdeSql=true; }
      const sp=(typeof dbSqlCargarSponsor==="function")?dbSqlCargarSponsor():null;
      if(sp){
        prot.sponsor=sp.actual||null;
        if(G.modo==="carrera") prot.ofertasPatro=sp.ofertas;
        else prot.sponsorOferta=sp.ofertas[0]||null;
        G._sponsorDesdeSql=true;
      }
      const pr=(typeof dbSqlCargarProta==="function")?dbSqlCargarProta():null;
      if(pr){ Object.keys(pr).forEach(k=>{ if(k in prot) prot[k]=pr[k]; }); G._protaDesdeSql=true; }
      return "sqlite";
    }
  }catch(e){}
  // --- salvaguarda: el blob manda; SQLite solo sustituye lo que coincide ---
  try{
    if(typeof dbSqlCargarMundo==="function" && G && G.world && Array.isArray(G.world.parejas)){
      const mundoSql=dbSqlCargarMundo();
      if(mundoSql && typeof compararMundos==="function" && compararMundos(mundoSql,G.world.parejas).ok){
        G.world.parejas=mundoSql; G._mundoDesdeSql=true;
      }
    }
  }catch(e){}
  try{
    if(typeof dbSqlCargarN1==="function" && G && G.world && Array.isArray(G.world.n1hist)){
      const n1Sql=dbSqlCargarN1(), blob=G.world.n1hist;
      if(n1Sql && n1Sql.length===blob.length &&
         n1Sql.every((h,i)=>h.t===blob[i].t && h.nombre===blob[i].nombre)){
        G.world.n1hist=n1Sql; G._n1DesdeSql=true;
      }
    }
  }catch(e){}
  try{
    if(typeof dbSqlCargarMundoKV==="function" && G && G.world){
      const kv=dbSqlCargarMundoKV();
      if(kv){
        Object.keys(kv).forEach(k=>{
          if(!(k in G.world)) return;
          try{ if(JSON.stringify(G.world[k])===JSON.stringify(kv[k])) G.world[k]=kv[k]; }catch(_){}
        });
      }
    }
  }catch(e){}
  try{
    const igual=(a,b)=>a && Array.isArray(b) && a.length===b.length && a.every((x,i)=>x===b[i]);
    if(typeof dbSqlCargarPalmares==="function" && prot && Array.isArray(prot.palmares)){
      const palSql=dbSqlCargarPalmares();
      if(igual(palSql,prot.palmares)){ prot.palmares=palSql; G._palmaresDesdeSql=true; }
    }
    if(typeof dbSqlCargarDiario==="function" && prot && Array.isArray(prot.diario)){
      const diaSql=dbSqlCargarDiario();
      if(igual(diaSql,prot.diario)){ prot.diario=diaSql; G._diarioDesdeSql=true; }
    }
    if(typeof dbSqlCargarHist==="function" && prot && Array.isArray(prot.hist)){
      const hSql=dbSqlCargarHist(), hb=prot.hist;
      if(hSql && hSql.length===hb.length && hSql.every((h,i)=>h.t===hb[i].t && h.pos===hb[i].pos)){
        prot.hist=hSql; G._histDesdeSql=true;
      }
    }
    if(typeof dbSqlCargarH2h==="function" && prot && prot.h2h && typeof prot.h2h==="object"){
      const hhSql=dbSqlCargarH2h(), hhb=prot.h2h;
      const ks=hhSql?Object.keys(hhSql):null, kb=Object.keys(hhb);
      if(ks && ks.length===kb.length &&
         kb.every(k=>hhSql[k] && hhSql[k].v===(hhb[k].v|0) && hhSql[k].d===(hhb[k].d|0))){
        prot.h2h=hhSql; G._h2hDesdeSql=true;
      }
    }
    if(typeof dbSqlCargarStaff==="function" && prot && prot.staff && typeof prot.staff==="object"){
      const stSql=dbSqlCargarStaff(), stb=prot.staff;
      const ocup=Object.keys(stb).filter(r=>stb[r]);
      if(stSql && Object.keys(stSql).length===ocup.length &&
         ocup.every(r=>stSql[r] && stSql[r].n===stb[r].n && stSql[r].niv===(stb[r].niv|0) && stSql[r].sal===(stb[r].sal|0))){
        Object.keys(stb).forEach(r=>{ stb[r]=stSql[r]||null; });
        G._staffDesdeSql=true;
      }
    }
    if(typeof dbSqlCargarFinanzas==="function" && prot && typeof prot.dinero==="number"){
      const fin=dbSqlCargarFinanzas();
      if(fin && fin.dinero===Math.round(prot.dinero)){ prot.dinero=fin.dinero; G._finDesdeSql=true; }
    }
    if(typeof dbSqlCargarSponsor==="function" && prot){
      const sp=dbSqlCargarSponsor();
      if(sp){
        const blobOf=G.modo==="carrera" ? (prot.ofertasPatro||[]) : (prot.sponsorOferta?[prot.sponsorOferta]:[]);
        const okActual=(!sp.actual&&!prot.sponsor) ||
          (sp.actual&&prot.sponsor&&sp.actual.marca===prot.sponsor.marca&&sp.actual.sem===(prot.sponsor.sem|0));
        const okOfertas=sp.ofertas.length===blobOf.length&&sp.ofertas.every((o,i)=>o.marca===blobOf[i].marca);
        if(okActual&&okOfertas){
          if(prot.sponsor) prot.sponsor=sp.actual;
          if(G.modo==="carrera"){ if(Array.isArray(prot.ofertasPatro)) prot.ofertasPatro=sp.ofertas; }
          else if(prot.sponsorOferta) prot.sponsorOferta=sp.ofertas[0]||null;
          G._sponsorDesdeSql=true;
        }
      }
    }
    if(typeof dbSqlCargarProta==="function" && prot){
      const prSql=dbSqlCargarProta();
      if(prSql){
        let tot=0,ok=0;
        Object.keys(prSql).forEach(k=>{
          if(!(k in prot)) return;
          tot++;
          try{ if(JSON.stringify(prot[k])===JSON.stringify(prSql[k])){ prot[k]=prSql[k]; ok++; } }catch(_){}
        });
        if(tot>0&&tot===ok) G._protaDesdeSql=true;
      }
    }
  }catch(e){}
  return "blob";
}

/* ---------- selector de ranuras ----------

   Antes había una sola partida por modo y un modal de "continuar o empezar de
   cero" que, además, estaba escrito en castellano dentro del código: salía en
   español jugaras en el idioma que jugaras.

   Ahora cada modo tiene N_RANURAS partidas y esta pantalla las enseña todas con
   quién eres, por dónde vas y cuántos títulos llevas. La ranura elegida se
   recuerda en G._slot, así que guardar sobrescribe esa y no otra. */
let _slotDestino=1;
function slotDestino(){ return _slotDestino; }

function abrirModo(modo){
  const ov=document.getElementById("modoModal")||(()=>{
    const d=document.createElement("div");d.id="modoModal";
    d.style.cssText="position:fixed;inset:0;background:rgba(10,13,19,.92);z-index:80;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";
    document.body.appendChild(d);return d;
  })();

  const nueva=(n)=>{ _slotDestino=n; quitarEl(ov); if(modo==="carrera"){ pintarCrear(); irA("crear"); } else { prepararCrearClub(); irA("crearclub"); } };
  const continuar=(n)=>{
    const raw=lsGet(slotKey(modo,n));
    let d=null; try{ d=raw?JSON.parse(raw):null; }catch(e){}
    if(!d){ avisa(t("slot_ilegible"),"bad"); pintar(); return; }
    quitarEl(ov);
    G=d; G._slot=n;
    // Fase 4d·9: hidratación con SQLite como fuente primaria (blob de salvaguarda).
    G._fuenteSql=hidratarDesdeSql();
    entrarPartida();
  };
  const borrar=(n)=>{
    const inf=slotInfo(modo,n);
    const quien=inf&&!inf.roto?inf.nombre:t("slot_ilegible_corta");
    if(!confirm(t("slot_borrar_seguro",{quien}))) return;
    borrarSlot(modo,n); pintar(); pintarMenu();
  };

  function pintar(){
    const filas=[];
    for(let n=1;n<=N_RANURAS;n++){
      const inf=slotInfo(modo,n);
      let cuerpo,botones;
      // Cada botón lleva id propio (mmCont2, mmNueva3…) y se engancha por
      // getElementById más abajo. No es capricho: el arnés de pruebas simula el
      // DOM por id, así que así los casos pueden pulsarlos igual que un jugador.
      if(!inf){
        cuerpo=`<div class="d">${t("slot_vacia_d")}</div>`;
        botones=`<button class="pri" style="width:100%" id="mmNueva${n}">✦ ${t("slot_nueva")}</button>`;
      }else if(inf.roto){
        cuerpo=`<div class="d" style="color:var(--rojo)">${t("slot_ilegible_d",{kb:Math.max(1,Math.round(inf.bytes/1024))})}</div>`;
        botones=`<button style="width:100%" id="mmBorrar${n}">🗑 ${t("slot_borrar")}</button>`;
      }else{
        cuerpo=`<div class="d">${t("slot_resumen",{temporada:inf.temporada,semana:inf.semana,titulos:inf.titulos})}`
          +(inf.dif?` · ${difNombre(inf.dif)}`:"")+`</div>`;
        botones=`<button class="pri" style="width:100%" id="mmCont${n}">▸ ${t("slot_continuar")}</button>`
          +`<button style="width:100%;margin-top:5px;font-size:11px" id="mmBorrar${n}">🗑 ${t("slot_borrar")}</button>`;
      }
      const titulo=inf&&!inf.roto?inf.nombre:t("slot_n",{n});
      filas.push(`<div class="opcion" style="margin-bottom:8px">
        <b>${inf&&!inf.roto?`<span style="color:var(--gris2);font-size:10px">${t("slot_n",{n})}</span> `:""}${titulo}</b>
        ${cuerpo}<div style="margin-top:7px">${botones}</div></div>`);
    }
    ov.innerHTML=`<div class="card" style="max-width:430px;width:100%">
      <h3 style="margin-top:0">${modo==="carrera"?"🎾 "+t("btn_carrera"):"🏟 "+t("btn_club")}</h3>
      ${filas.join("")}
      <div style="display:flex;gap:6px;margin-top:4px">
        <button style="flex:1;font-size:11.5px" id="mmImportar">⤒ ${t("slot_importar")}</button>
        <button style="flex:1;font-size:11.5px;background:none;color:var(--gris)" id="mmCerrar">${t("btn_cancelar")}</button>
      </div>
      <input type="file" id="mmFichero" accept="application/json,.json" style="display:none">
      <div class="foot" style="text-align:left;margin-top:8px">${t("slot_pie")}</div>
    </div>`;
    // Los manejadores se enganchan desde código (nada de onclick en el marcado:
    // la CSP no ejecuta código escrito dentro del HTML).
    for(let n=1;n<=N_RANURAS;n++){
      const bc=document.getElementById("mmCont"+n);   if(bc) bc.onclick=()=>continuar(n);
      const bn=document.getElementById("mmNueva"+n);  if(bn) bn.onclick=()=>nueva(n);
      const bb=document.getElementById("mmBorrar"+n); if(bb) bb.onclick=()=>borrar(n);
    }
    document.getElementById("mmCerrar").onclick=()=>quitarEl(ov);
    const fich=document.getElementById("mmFichero");
    document.getElementById("mmImportar").onclick=()=>fich.click();
    fich.onchange=()=>{
      const f=fich.files&&fich.files[0]; if(!f) return;
      const lector=new FileReader();
      lector.onload=()=>{
        // se importa a la primera ranura libre; si están todas ocupadas, se pide destino
        let destino=0;
        for(let n=1;n<=N_RANURAS;n++) if(!slotInfo(modo,n)){ destino=n; break; }
        if(!destino){
          const r=prompt(t("imp_pide_ranura",{max:N_RANURAS}),"1");
          destino=Math.min(N_RANURAS,Math.max(1,parseInt(r,10)||0));
          if(!destino||!confirm(t("imp_sobrescribir",{n:destino}))) return;
        }
        const err=importarPartida(String(lector.result||""),modo,destino);
        if(err){ avisa(t(err),"bad"); return; }
        avisa(t("imp_ok",{n:destino}),"ok");
        pintar(); pintarMenu();
      };
      lector.onerror=()=>avisa(t("imp_err_lectura"),"bad");
      lector.readAsText(f);
    };
  }

  pintar();
  ov.onclick=(e)=>{ if(e.target===ov) quitarEl(ov); };
}
document.getElementById("btnCarrera").onclick=()=>abrirModo("carrera");
document.getElementById("btnClub").onclick=()=>abrirModo("club");
(function(){
  const b=document.getElementById("btnSuperliga"); if(!b) return;
  b.onclick=()=>{
    const raw=lsGet(SLOTS.superliga);
    if(raw){ try{ const d=JSON.parse(raw); if(d&&d.superliga){ G=d; entrarSuperliga(); return; } }catch(e){} }
    crearSuperliga();
  };
})();
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


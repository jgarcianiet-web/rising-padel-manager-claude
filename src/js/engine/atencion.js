/* ================================================================
   LA CAPA «QUÉ NECESITA ATENCIÓN AHORA» (P7)

   El juego maneja veinte sistemas y todos pueden ser relevantes, pero no
   todos a la vez ni con la misma intensidad. Este parte reduce la fricción
   con tres capas:

   1. QUÉ — una línea por asunto, como mucho AT_MAX, ordenadas por gravedad.
      Un asunto solo entra si cambia una decisión DE ESTA SEMANA: la misma
      regla que tienen los eventos («lo que no cambia una decisión es una
      noticia»).
   2. POR QUÉ — al pulsar: los factores, la consecuencia probable y, si hay
      técnico que sepa del tema, su recomendación con su nombre (el staff
      vende conocimiento; aquí es donde se nota).
   3. DETALLE — un botón que salta a la pestaña experta de ese asunto.

   `atencionDe(e)` es PURA sobre el estado (no muta nada, no consume azar):
   por eso se puede probar en la suite sin montar pantalla.
================================================================ */
const AT_MAX=4;

function atencionDe(e){
  const out=[];
  if(!e||typeof G==="undefined"||!G) return out;
  if(G.modo==="carrera") _atCarrera(e,out);
  else if(G.modo==="club") _atClub(e,out);
  out.sort((a,b)=>b.sev-a.sev);
  return out.slice(0,AT_MAX);
}

/* ---------------- carrera ---------------- */
function _atCarrera(c,out){
  // la baja manda sobre todo lo demás
  if(c.lesion){
    out.push({id:"lesion",sev:2,ico:"🩼",t:{k:"at_lesion",p:{les:lesNombre(c.lesion),sem:c.lesion.sem|0}},
      por:[{k:"at_lesion_f",p:{sem:c.lesion.sem|0}},{k:"at_lesion_r",p:{}}],tab:null});
  } else if(c.merma&&c.merma.pct){
    const rec=(typeof staffPerfil==="function"&&staffPerfil("fisio")==="recuperador")&&c.staff&&c.staff.fisio;
    out.push({id:"merma",sev:1,ico:"🩹",t:{k:"at_merma",p:{pct:c.merma.pct}},
      por:[{k:"at_merma_f",p:{pct:c.merma.pct,sem:c.merma.sem|0}},
           rec?{k:"at_merma_r_st",p:{n:c.staff.fisio.n}}:{k:"at_merma_r",p:{}}],tab:null});
  }
  // la carga acumulada: lo que te va a romper no es la semana, es el poso
  if(typeof cargaEstado==="function"){
    const est=cargaEstado(c);
    if(est==="pasado"||est==="cargado"){
      const prep=c.staff&&c.staff.fisico;
      out.push({id:"carga",sev:est==="pasado"?2:1,ico:"🏋",t:{k:"at_carga_"+est,p:{}},
        por:[{k:"at_carga_f",p:{n:c.carga|0,opt:CARGA_OPT}},
             {k:"at_carga_c",p:{x:(typeof cargaLesionX==="function"?cargaLesionX(c):1).toFixed(1)}},
             prep?{k:"at_carga_r_st",p:{n:prep.n}}:{k:"at_carga_r",p:{}}],tab:"entreno"});
    }
  }
  // sin depósito para la semana grande
  const sl=(typeof slotSemana==="function")?slotSemana(semanaTemp()):null;
  if(!c.lesion&&sl&&sl.premier!==undefined&&c.energia<40){
    out.push({id:"energia",sev:c.energia<25?2:1,ico:"🪫",t:{k:"at_energia",p:{en:c.energia|0}},
      por:[{k:"at_energia_f",p:{}},{k:"at_energia_c",p:{}}],tab:null});
  }
  // lo que te juegas en el ranking esta semana
  if(typeof rkDefiende==="function"){
    const def=rkDefiende(c,c.semana);
    if(def>=250) out.push({id:"defensa",sev:def>=700?2:1,ico:"🛡",t:{k:"at_def",p:{n:def}},
      por:[{k:"at_def_f",p:{n:def}},{k:"at_def_c",p:{pos:(typeof miPuesto==="function"?miPuesto():"—")}}],tab:"ranking"});
  }
  // la pareja: el eje que peor está, y las promesas a punto de vencer
  if(c.compi&&typeof relLee==="function"&&typeof EJES!=="undefined"){
    let peor=null;
    EJES.forEach(k=>{ const v=relLee(c,k); if(!peor||v<peor.v) peor={k,v}; });
    if(peor&&peor.v<35) out.push({id:"eje",sev:peor.v<20?2:1,ico:"🤝",t:{k:"at_eje",p:{n:c.compi.n,eje:relNombre(peor.k).toLowerCase()}},
      por:[{k:"at_eje_f",p:{eje:relNombre(peor.k),v:peor.v}},{k:"at_eje_r",p:{}}],tab:"jugador"});
  }
  if(c.compi&&c.promesas&&c.promesas.length&&typeof PROMESAS!=="undefined"){
    c.promesas.forEach(pr=>{
      const P=PROMESAS[pr.id]; if(!P) return;
      const quedan=(pr.sem|0)+P.plazo-(c.semana|0);
      if(quedan>=0&&quedan<=2) out.push({id:"promesa",sev:1,ico:"🤙",t:{k:"at_prom",p:{n:c.compi.n}},
        por:[{k:"at_prom_f",p:{sem:Math.max(0,quedan)}}],tab:"jugador"});
    });
  }
  // la caja: el impago tiene un mes de cuerda, y esto es el aviso con números
  const nomina=Object.keys(c.staff||{}).reduce((s,k)=>s+((c.staff[k]&&c.staff[k].sal)||0),0);
  if(c.dinero<0&&nomina>0){
    const tope=Math.max(1200,nomina*4);
    out.push({id:"caja",sev:c.dinero<-tope*.5?2:1,ico:"💸",t:{k:"at_caja",p:{n:c.dinero}},
      por:[{k:"at_caja_f",p:{nomina}},{k:"at_caja_c",p:{}}],tab:"staff"});
  }
  // el patrocinador mira el objetivo al cierre, y el cierre se acerca
  if(c.sponsor&&typeof miPuesto==="function"&&typeof semanaTemp==="function"){
    const pos=miPuesto();
    if(pos>c.sponsor.objetivo&&semanaTemp()>=SEMANAS_TEMP-10)
      out.push({id:"patro",sev:1,ico:"📉",t:{k:"at_patro",p:{marca:c.sponsor.marca}},
        por:[{k:"at_patro_c",p:{marca:c.sponsor.marca,obj:c.sponsor.objetivo,pos}}],tab:"jugador"});
  }
}

/* ---------------- club ---------------- */
function _atClub(cl,out){
  const jor=(typeof copJornadaDe==="function")?copJornadaDe(cl,semanaTemp()):null;
  const disp=(typeof copDisponibles==="function")?copDisponibles(cl).length:4;
  // LA señal del modo club: la Copa pide cuatro sanos y hoy no los hay
  if(jor&&disp<4){
    out.push({id:"copa_gente",sev:2,ico:"🚑",t:{k:"at_copa_gente",p:{n:disp}},
      por:[{k:"at_copa_gente_f",p:{n:disp}},{k:"at_copa_gente_c",p:{}}],tab:"plantilla"});
  }
  if(jor&&typeof copEsDerbi==="function"&&copEsDerbi(cl,jor.rival)){
    out.push({id:"derbi",sev:1,ico:"🔥",t:{k:"at_club_derbi",p:{}},
      por:[{k:"at_club_derbi_f",p:{}}],tab:null});
  }
  // dos tocados y sin fisio: la decisión del modo club, con la razón entera
  const tocados=(cl.plantilla||[]).filter(j=>j.lesion).length;
  if(tocados>=2&&!(cl.staff&&cl.staff.fisio)){
    out.push({id:"club_fisio",sev:2,ico:"🩺",t:{k:"at_club_fisio",p:{}},
      por:[{k:"at_club_fisio_f",p:{}},{k:"at_club_fisio_r",p:{}}],tab:"club"});
  }
  // la deuda tiene un suelo y la junta lo mira
  const tope=-Math.max(6000,(typeof salariosSemana==="function"?salariosSemana():0)*8);
  if(cl.dinero<0&&tope<0&&cl.dinero<tope*.5){
    out.push({id:"club_deuda",sev:cl.dinero<tope*.8?2:1,ico:"💸",t:{k:"at_club_deuda",p:{n:cl.dinero}},
      por:[{k:"at_club_deuda_f",p:{tope:Math.round(tope)}}],tab:"club"});
  }
  // la junta juzga la Copa, y vas por detrás con media liga jugada
  if(cl.junta&&cl.copa&&typeof copPuesto==="function"&&typeof copJugadas==="function"){
    const jug=copJugadas(cl), pos=copPuesto(cl);
    if(jug>=7&&pos>(cl.junta.objetivo||8))
      out.push({id:"club_junta",sev:1,ico:"🏛",t:{k:"at_club_junta",p:{obj:cl.junta.objetivo,pos}},
        por:[{k:"at_club_junta_f",p:{n:cl.junta.paciencia|0}}],tab:"ranking"});
  }
  // el canterano que se apaga: la ficha ya avisa, esto lo pone delante
  (cl.cantera||[]).forEach(j=>{
    if(j.ilusion!=null&&j.ilusion<25)
      out.push({id:"cantera",sev:1,ico:"🌱",t:{k:"at_club_cantera",p:{n:j.n}},
        por:[{k:"at_club_cantera_f",p:{}},{k:"at_club_cantera_r",p:{}}],tab:"club"});
  });
}

/* ---------------- pintado: las tres capas ---------------- */
function atAbreTab(tab){
  if(!tab) return;
  const id=(G.modo==="carrera"?"tab":"cmTab")+tab[0].toUpperCase()+tab.slice(1);
  const b=document.getElementById(id);
  if(b&&b.onclick) b.onclick();
}
function renderAtencion(el){
  const items=atencionDe(ent());
  if(!items.length) return;
  const caja=document.createElement("div");
  caja.className="evbox";
  caja.style.borderColor=items.some(x=>x.sev>=2)?"var(--rojo)":"#E0A030";
  caja.innerHTML=`<div class="evhd">⚠ ${t("at_hd")}</div>`+items.map((it,i)=>`
    <div class="evrow" data-at="${i}" style="cursor:pointer">
      <b style="color:${it.sev>=2?"var(--rojo)":"var(--oro)"}">${it.ico} ${t(it.t.k,it.t.p)}</b> <span style="color:var(--gris2);font-size:calc(9px * var(--esc))">${t("at_mas")}</span>
      <div class="at-por oculto">${it.por.map(l=>`<div>· ${t(l.k,l.p)}</div>`).join("")}
        ${it.tab?`<button class="selbtn" style="font-size:calc(10px * var(--esc));margin-top:3px" data-attab="${it.tab}">${t("at_ver")}</button>`:""}
      </div>
    </div>`).join("");
  // capa 2 al pulsar la fila; capa 3, el botón que salta a la pestaña experta
  // (el DOM recortado de la suite no trae querySelectorAll: ahí solo se pinta)
  if(typeof caja.querySelectorAll==="function"){
    caja.querySelectorAll("[data-at]").forEach(row=>{
      row.onclick=(ev)=>{
        if(ev.target&&ev.target.dataset&&ev.target.dataset.attab) return;
        const d=row.querySelector(".at-por"); if(d) d.classList.toggle("oculto");
      };
    });
    caja.querySelectorAll("[data-attab]").forEach(b=>{
      b.onclick=(ev)=>{ ev.stopPropagation(); atAbreTab(b.dataset.attab); };
    });
  }
  el.appendChild(caja);
}

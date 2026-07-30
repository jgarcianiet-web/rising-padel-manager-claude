/* ================================================================
   SALA DE TROFEOS

   El juego ya guardaba todo lo que hace falta para contar una carrera —el
   palmarés, la trayectoria temporada a temporada, el cara a cara, los hitos con
   su fecha, las etapas con cada compañero— pero repartido por cinco pestañas y
   dos modales, de modo que nunca se veía junto. Faltaba la pantalla que cierra
   el círculo: la que respondes cuando alguien te pregunta «¿y qué hiciste?».

   Aquí no se calcula nada nuevo. Se reúne y se pinta.
================================================================ */

/* Agrupa el palmarés por categoría leyendo el nombre guardado del torneo.
   Ojo: el palmarés son CADENAS, y las partidas viejas llevan los nombres
   antiguos del circuito (Premier, MAJOR…). Por eso se reconocen los dos. */
function trofeosPorCategoria(palmares){
  const g={corona:[],maestros:[],elite:[],continental:[],otros:[]};
  (palmares||[]).forEach(x=>{
    const s=String(x);
    if(/Corona|Crown|Couronne|Krone|MAJOR|Major/.test(s)) g.corona.push(s);
    else if(/Maestros|Masters|Maîtres|Meister|Maestri|Tour Finals|Finals/.test(s)) g.maestros.push(s);
    else if(/Élite|Elite|Premier/.test(s)) g.elite.push(s);
    else if(/Continental|FIP/.test(s)) g.continental.push(s);
    else g.otros.push(s);
  });
  return g;
}

/* Gráfico de la evolución del ranking. Eje Y invertido a propósito: el puesto 1
   va ARRIBA, que es como se lee un ranking, aunque el número sea el más bajo. */
function trofeosGrafico(hist){
  const serie=(hist||[]).slice(-16);
  if(serie.length<2) return "";
  const W=560,H=140,pad=18;
  const mejor=Math.min(...serie.map(x=>x.pos)), peor=Math.max(...serie.map(x=>x.pos));
  const rango=Math.max(1,peor-mejor);
  const px=i=>pad+(i/Math.max(1,serie.length-1))*(W-2*pad);
  const py=p=>pad+((p-mejor)/rango)*(H-2*pad);
  const linea=serie.map((x,i)=>`${px(i)},${py(x.pos)}`).join(" ");
  const puntos=serie.map((x,i)=>
    `<circle cx="${px(i)}" cy="${py(x.pos)}" r="${x.tit?3.5:2.2}" fill="${x.tit?"var(--oro)":"var(--lima)"}"/>`).join("");
  const etiq=serie.map((x,i)=>(i===0||i===serie.length-1||x.pos===mejor)
    ? `<text x="${px(i)}" y="${py(x.pos)-7}" fill="#8A94A7" font-size="9" text-anchor="middle">#${x.pos}</text>` : "").join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="background:#10151F;border-radius:8px;display:block">
    <polyline points="${linea}" fill="none" stroke="var(--lima)" stroke-width="2" stroke-linejoin="round"/>
    ${puntos}${etiq}
    <text x="${pad}" y="${H-4}" fill="#5E687A" font-size="8">T${serie[0].t}</text>
    <text x="${W-pad}" y="${H-4}" fill="#5E687A" font-size="8" text-anchor="end">T${serie[serie.length-1].t}</text>
  </svg>`;
}

/* Una cifra grande con su rótulo debajo. */
function trofeosCifra(valor,etiqueta,color){
  return `<div class="opcion" style="text-align:center;margin:0">
    <div style="font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:calc(21px * var(--esc));color:${color||"var(--texto)"};line-height:1.1">${valor}</div>
    <div style="font-size:calc(9.5px * var(--esc));color:var(--gris2);text-transform:uppercase;letter-spacing:.6px;margin-top:3px">${etiqueta}</div>
  </div>`;
}

function pintarTrofeos(){
  const e=ent(); if(!e) return;
  const esCarrera=G.modo==="carrera";
  const hist=e.hist||[], pal=e.palmares||[];
  const vd=e.vd||{v:0,d:0}, jugados=(vd.v|0)+(vd.d|0);
  const pct=jugados?Math.round(vd.v/jugados*100):0;
  const mejorPos=hist.length?Math.min(...hist.map(h=>h.pos)):miPuesto();
  const n1=((G.world&&G.world.n1hist)||[]).filter(x=>x.yo).length;
  const cat=trofeosPorCategoria(pal);
  const leg=(esCarrera&&typeof legadoDe==="function")?legadoDe(e,G.world):null;
  const O=[];

  /* --- cabecera: quién eres y qué eres en la historia --- */
  const rango=leg?t("leg_rango_"+leg.rango):"";
  O.push(`<div class="perfil" style="margin-bottom:12px">
    <div class="ava">${esCarrera&&typeof avatarSVG==="function"?avatarSVG({n:e.nombre,ava:e.ava,sexo:e.sexo,edad:e.edad,_ropa:e.color},56):"🏟"}</div>
    <div style="min-width:0">
      <div class="nom">${e.nombre}</div>
      <div class="sub">${rango?`<b style="color:var(--oro)">${rango}</b> · `:""}${t("trf_temporadas",{n:Math.max(1,hist.length)})}${esCarrera?` · ${t("trf_edad",{n:e.edad})}`:""}</div>
    </div>
    <div class="media"><div class="v">${cat.corona.length+cat.maestros.length+cat.elite.length}</div><div class="l">${t("trf_grandes")}</div></div>
  </div>`);
  /* Los arquetipos: lo que esta carrera FUE, aunque no fuera la del número 1.
     Salen de hechos medibles (legadoDe), no de una etiqueta puesta a mano. */
  if(leg&&leg.arqs&&leg.arqs.length){
    O.push(`<div style="display:flex;flex-wrap:wrap;gap:5px;margin:-6px 0 12px">${
      leg.arqs.map(k=>`<span class="pill" style="color:var(--lima)">${t("leg_arq_"+k)}</span>`).join("")}</div>`);
  }

  /* --- las cifras --- */
  O.push(`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px;margin-bottom:14px">
    ${trofeosCifra(`${vd.v|0}-${vd.d|0}`,t("trf_balance"))}
    ${trofeosCifra(pct+"%",t("trf_victorias"),pct>=55?"var(--verde)":pct>=45?"var(--texto)":"var(--rojo)")}
    ${trofeosCifra("#"+mejorPos,t("trf_mejor_puesto"),mejorPos<=3?"var(--oro)":"var(--lima)")}
    ${trofeosCifra(cat.corona.length,t("trf_coronas"),cat.corona.length?"var(--oro)":"var(--gris2)")}
    ${trofeosCifra(esCarrera?(e.finales|0):"—",t("trf_finales"),"var(--texto)")}
    ${trofeosCifra(esCarrera?(e.semN1|0):n1,t("trf_sem_n1"),(esCarrera?(e.semN1|0):n1)?"var(--oro)":"var(--gris2)")}
    ${trofeosCifra(esCarrera?(e.vTop10|0):"—",t("trf_top10"),"var(--lima)")}
    ${trofeosCifra(pal.length,t("trf_titulos"),"var(--gris)")}
    ${trofeosCifra(fmtFans(e.fans||0),t("trf_seguidores"),"var(--azul)")}
  </div>`);
  /* --- los momentos: la memoria, no la estadística --- */
  const moms=(e.momentos||[]);
  if(moms.length){
    O.push(`<div class="anaHd">${t("trf_hd_momentos")}</div>`);
    O.push(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:7px;margin-bottom:14px">${
      moms.map(m=>{
        const ICO={primer_titulo:"🏆",primera_corona:"👑",maestros:"🎓",n1:"⭐",top10:"⚔",nemesis_final:"😤",titulo_tocado:"🩹",titulo_suplente:"🤝",primer_cuadro:"🎫"};
        return `<div class="opcion" style="margin:0">
          <b>${ICO[m.id]||"✦"} ${t("mom_"+m.id)}</b>
          <div class="d">${t("mom_"+m.id+"_d",{t:m.t,sem:m.sem,torneo:(m.d||{}).torneo||"",rival:(m.d||{}).rival||""})}</div>
        </div>`; }).join("")}</div>`);
  }

  /* --- la vitrina --- */
  O.push(`<div class="anaHd">${t("trf_hd_vitrina")}</div>`);
  if(!pal.length){
    O.push(`<div class="foot" style="text-align:left">${t("trf_sin_titulos")}</div>`);
  }else{
    const grupos=[["corona","🏆","var(--oro)"],["maestros","👑","#E6FA50"],["elite","🥇","#9B59D0"],["continental","🎾","var(--azul)"],["otros","·","var(--gris)"]];
    grupos.forEach(([k,ico,col])=>{
      if(!cat[k].length) return;
      const cuerpo=(typeof PAL_DETALLE!=="undefined"&&cat[k].length>PAL_DETALLE&&typeof resumeTitulos==="function")?resumeTitulos(cat[k]):cat[k].join(" · ");
      O.push(`<div style="margin-bottom:7px">
        <div style="font-size:calc(10px * var(--esc));color:${col};letter-spacing:.5px;margin-bottom:2px">${ico} ${t("trf_cat_"+k)} · ${cat[k].length}</div>
        <div style="font-size:calc(11px * var(--esc));color:var(--gris);line-height:1.6">${cuerpo}</div>
      </div>`);
    });
  }

  /* --- evolución en el ranking --- */
  const graf=trofeosGrafico(hist);
  if(graf){
    O.push(`<div class="anaHd">${t("trf_hd_ranking")}</div>`);
    O.push(graf);
    O.push(`<div class="foot" style="text-align:left;margin-top:3px">${t("trf_graf_pie")}</div>`);
  }

  /* --- hitos, con la temporada en que cayeron --- */
  const lista=esCarrera?HITOS_CARRERA:HITOS_CLUB, ok=e.hitosOk||{};
  const logrados=lista.filter(h=>ok[h.id]);
  O.push(`<div class="anaHd">${t("trf_hd_hitos",{n:logrados.length,total:lista.length})}</div>`);
  O.push(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 14px">`
    +lista.map(h=>{
      const cuando=ok[h.id];
      return `<div style="font-size:calc(11px * var(--esc));padding:2px 0;color:${cuando?"var(--texto)":"var(--gris2)"}">
        ${cuando?"✓":"○"} ${hitoTxt(h)}${cuando?` <span style="color:var(--gris2);font-family:'IBM Plex Mono',monospace;font-size:calc(9px * var(--esc))">T${cuando}</span>`:""}</div>`;
    }).join("")+`</div>`);

  /* --- las parejas: con quién lo hiciste --- */
  if(esCarrera){
    const etapas=(e.parejasHist||[]).slice();
    // la etapa en curso también cuenta, aunque todavía no esté cerrada
    if(e.compi&&typeof cierraEtapaPareja==="function"){
      const act=cierraEtapaPareja(e,temporada(),"actual");
      if(act) etapas.push(act);
    }
    if(etapas.length){
      const mejor=(typeof mejorPareja==="function")?mejorPareja(etapas):null;
      O.push(`<div class="anaHd">${t("trf_hd_parejas")}</div>`);
      O.push(etapas.map(x=>`<div class="anaRow">
        <span class="anaK" style="min-width:0;flex:1;text-transform:none">${mejor&&x.n===mejor.n?"★ ":""}${x.n}</span>
        <span class="anaV" style="min-width:74px">T${x.desde}${x.temps>1?`-${x.hasta}`:""}</span>
        <span class="anaV" style="min-width:52px;color:${x.titulos?"var(--oro)":"var(--gris2)"}">${x.titulos||0} 🏆</span>
      </div>`).join(""));
    }
  }

  /* --- cara a cara: el archirrival y los que más te cruzaste --- */
  const h2h=Object.values(e.h2h||{}).filter(x=>x&&x.n&&((x.v|0)+(x.d|0))>=2);
  if(h2h.length){
    h2h.sort((a,b)=>((b.v|0)+(b.d|0))-((a.v|0)+(a.d|0)));
    const nem=e.nemesis&&e.nemesis.id!=null?(e.h2h[e.nemesis.id]||null):null;
    O.push(`<div class="anaHd">${t("trf_hd_h2h")}</div>`);
    if(nem&&nem.n) O.push(`<div class="foot" style="text-align:left;margin-bottom:5px">${t("trf_nemesis",{n:nem.n,v:nem.v|0,d:nem.d|0})}</div>`);
    O.push(h2h.slice(0,8).map(x=>{
      const tot=(x.v|0)+(x.d|0), p=Math.round((x.v|0)/tot*100);
      return `<div class="anaRow">
        <span class="anaK" style="min-width:0;flex:1;text-transform:none">${x.n}</span>
        <span class="anaV" style="min-width:64px;color:${p>=50?"var(--verde)":"var(--rojo)"}">${x.v|0}-${x.d|0}</span>
        <span class="anaV" style="min-width:46px;color:var(--gris2)">${p}%</span>
      </div>`;
    }).join(""));
  }

  document.getElementById("trofeosCuerpo").innerHTML=O.join("");
}

function abrirTrofeos(){
  if(!G||!ent()) return;
  pintarTrofeos();
  document.getElementById("trofeos").classList.remove("oculto");
}
function cerrarTrofeos(){ document.getElementById("trofeos").classList.add("oculto"); }

document.getElementById("btnTrofeos").onclick=abrirTrofeos;
document.getElementById("trofeosCerrar").onclick=cerrarTrofeos;

/* ================================================================
   MODO CLUB
================================================================ */
// lado natural: 0 = DRIVE (derecha, construcción/defensa), 1 = REVÉS (izquierda, remate/finalización)
function ladoPorAttrs(attrs,est){
  if(!attrs) return rnd()<.5?0:1;
  const fin=(attrs.remate+attrs.vibora+attrs.bandeja+attrs.volea)/4;      // finalización
  const con=(attrs.fondo+attrs.pared+attrs.globo+attrs.dejada+attrs.chiquita)/5; // construcción
  const sesgo=fin-con;
  // estilos rematadores tiran a revés, defensivos a drive
  const bonus=est==="rematador"?3:est==="agresivo"?1.5:est==="defensivo"?-3:est==="constructor"?-2:0;
  const p=clamp(.5+(sesgo+bonus)/14,.12,.88);
  return rnd()<p?1:0;
}
function ladoTxt(l){ return t(l===1?"lado_reves":"lado_drive"); }
function ladoChip(l){ if(l!==0&&l!==1) return ""; return `<span class="pill" style="background:${l===1?"#9B59D0":"#4FA3D8"}22;color:${l===1?"#B58BE0":"#6FB8E8"};border-color:${l===1?"#9B59D0":"#4FA3D8"}55">${l===1?"◀ "+t("lado_reves"):t("lado_drive")+" ▶"}</span>`; }
function parejaLadoAviso(j0,j1){
  if(!j0||!j1||j0.lado===undefined||j1.lado===undefined) return "";
  if(j0.lado===j1.lado) return `<span style="color:#E0A030;font-size:10px">${t("lado_aviso_mal",{lado:ladoTxt(j0.lado).toLowerCase()})}</span>`;
  return `<span style="color:var(--lima);font-size:10px">${t("lado_aviso_bien")}</span>`;
}
function mkAgente(nivMin,nivMax,sx){
  const est=pick(Object.keys(ESTILOS));
  const nivel=Math.round(R(nivMin,nivMax));
  sx=sx||(rnd()<.5?"M":"F");
  const apodo=rnd()<.28?` «${pick(APODOS)}»`:"";
  const pot=Math.round(clamp(nivel+R(2,24)-(rnd()<.2?10:0),nivel,93));
  const _p=pickPais();
  return {
    n:nombrePorSexo(sx,_p)+apodo+" "+apellidoPais(_p),pais:_p,sexo:sx,pot,edad:Math.round(R(17,31)),
    estilo:est,perso:pick(Object.keys(PERSONALIDADES)),
    attrs:mkAttrsNivel(nivel,est),
    lado:ladoPorAttrs(mkAttrsNivel(nivel,est),est),
    salario:Math.round(nivel*.7),energia:100,conf:55,lesion:null
  };
}
function nivelTxt(j){
  const n=mediaAttrs(j.attrs), oj=G&&G.modo==="club"&&G.clubG&&G.clubG.staff&&G.clubG.staff.ojeador;
  if(oj){
    const techo=(j.pot||n)>=78?t("clb_techo_alto"):(j.pot||n)>=66?t("clb_techo_medio"):t("clb_techo_corto");
    return `${Math.max(20,n-2)}-${Math.min(96,n+3)} · ${techo}`;
  }
  return `${Math.max(20,n-5)}-${Math.min(96,n+7)}`;
}
function costeFichaje(j){const n=mediaAttrs(j.attrs);return Math.round(n*n*1.1);}

/* ================================================================
   LA CARA DEL CLUB

   El modo club compartía demasiada pantalla con el de carrera: cambiaba quién
   jugaba, pero no quién eras. Tres cosas le dan identidad, y las tres se eligen
   o se sortean al fundar, así que dos partidas de club ya no se parecen:

   - La FILOSOFÍA decide a quién convences. No es un adorno: un jugador que no
     encaja pide más dinero, y uno que no encaja nada no firma aunque tengas la
     caja llena. Ficha condicionada, que es lo que hace que un club tenga estilo.
   - La JUNTA tiene carácter. Cuánta cuerda te da, cuánto aprieta el objetivo,
     cuánto paga por cumplirlo y en qué se fija (la tacaña mira los sueldos).
   - El DERBI: un club rival desde el primer día, con su marcador.
================================================================ */
const FILOS_CLUB={
  cantera:{  n:"cfil_cantera_n",  d:"cfil_cantera_d",  lema:"cfil_cantera_l"},
  estrellas:{n:"cfil_estrellas_n",d:"cfil_estrellas_d",lema:"cfil_estrellas_l"},
  garra:{    n:"cfil_garra_n",    d:"cfil_garra_d",    lema:"cfil_garra_l"},
  oficio:{   n:"cfil_oficio_n",   d:"cfil_oficio_d",   lema:"cfil_oficio_l"},
};
function filoClub(cl){ return (cl&&cl.filo&&FILOS_CLUB[cl.filo])?cl.filo:"oficio"; }
function filoNombre(k){ return t((FILOS_CLUB[k]||FILOS_CLUB.oficio).n); }
function filoDesc(k){ return t((FILOS_CLUB[k]||FILOS_CLUB.oficio).d); }
function filoLema(k){ return t((FILOS_CLUB[k]||FILOS_CLUB.oficio).lema); }

/* Encaje de un jugador con la filosofía, de -2 a +2. Mira la edad, el estilo y
   la personalidad, que es lo que el jugador ve en su ficha: la explicación de
   por qué le sale caro está delante de sus ojos. */
function afinidadFilo(cl,j){
  if(!j) return 0;
  const filo=filoClub(cl), ed=j.edad||24, est=j.estilo||"", per=j.perso||"";
  const niv=mediaAttrs(j.attrs);
  let a=0;
  if(filo==="cantera"){
    a = ed<=21?2 : ed<=24?1 : ed>=31?-2 : ed>=28?-1 : 0;
  } else if(filo==="estrellas"){
    a = niv>=74?2 : niv>=66?1 : niv<=54?-2 : niv<=60?-1 : 0;
    if(ed<=20&&a>0) a--;                       // el proyecto no es lo suyo
  } else if(filo==="garra"){
    a = (per==="valiente"?1:0)+(per==="emocional"?1:0)+(per==="conservador"?-1:0)
      + (est==="defensivo"||est==="agresivo"?1:0)+(est==="constructor"?-1:0);
    a = clamp(a,-2,2);
    if(per==="frio") a=Math.min(a,0);
  } else {                                      // oficio
    a = (est==="constructor"||est==="bandejero"?1:0)+(per==="frio"?1:0)
      + (est==="rematador"?-2:0)+(per==="emocional"?-1:0);
    a = clamp(a,-2,2);
  }
  return a;
}
const AFIN_TXT={2:"cfil_enc_2",1:"cfil_enc_1",0:"cfil_enc_0","-1":"cfil_enc_m1","-2":"cfil_enc_m2"};
function afinidadTxt(a){ return t(AFIN_TXT[a]||"cfil_enc_0"); }
function afinidadColor(a){ return a>=2?"var(--lima)":a===1?"var(--verde)":a<=-2?"var(--rojo)":a===-1?"var(--oro)":"var(--gris)"; }
/* El encaje se cobra en la ficha y en el sueldo: quien no te ve claro pide más.
   A -2 no hay dinero que valga, y por eso el botón se apaga con su motivo. */
function costeFichajeCl(cl,j){ return Math.round(costeFichaje(j)*(1-afinidadFilo(cl,j)*.12)); }
function salarioDeCl(cl,j){ return Math.round(salarioDe(j)*(1-afinidadFilo(cl,j)*.09)); }
function fichable(cl,j){ return afinidadFilo(cl,j)>-2; }

/* Carácter de la junta. `margen` son las temporadas de cuerda; `dureza` cuánto
   aprieta el objetivo cada año; `prima` lo que paga por cumplirlo. */
/* El objetivo es un PUESTO EN LA COPA, no en el ranking mundial. La junta de un
   club juzga al club por su competición; pedirle el top 30 del circuito
   individual a un club recién fundado —cuya pareja A es de nivel 55— era
   despedirlo en la primera evaluación hiciera lo que hiciera. */
const JUNTAS={
  paciente:  {n:"cjun_paciente_n",  d:"cjun_paciente_d",  margen:3,dureza:.92,prima:1,   obj0:6},
  corto:     {n:"cjun_corto_n",     d:"cjun_corto_d",     margen:1,dureza:.80,prima:1.8, obj0:3},
  tacana:    {n:"cjun_tacana_n",    d:"cjun_tacana_d",    margen:2,dureza:.88,prima:.65, obj0:5,mirasueldos:true},
  ambiciosa: {n:"cjun_ambiciosa_n", d:"cjun_ambiciosa_d", margen:2,dureza:.78,prima:1.4, obj0:4},
};
function juntaClub(cl){ const k=cl&&cl.junta&&cl.junta.car; return JUNTAS[k]?k:"paciente"; }
function juntaNombre(k){ return t((JUNTAS[k]||JUNTAS.paciente).n); }
function juntaDesc(k){ return t((JUNTAS[k]||JUNTAS.paciente).d); }
/* La junta se sortea al fundar: no la eliges, igual que no eliges quién te
   contrata. Su objetivo de partida y su paciencia salen de su carácter. */
function mkJunta(){
  const car=pick(Object.keys(JUNTAS)), J=JUNTAS[car];
  /* El primer objetivo se mide DESDE DONDE EMPIEZAS, no en abstracto. Un club
     recién fundado entra por el puesto 91 con jugadores de nivel 55: pedirle el
     top 28 el primer año es despedirlo en la primera evaluación hagas lo que
     hagas. Ahora el objetivo es un puesto de la Copa —su competición— y
     `dureza` lo aprieta cada temporada, que es donde tiene que doler. */
  /* Y siempre al menos dos temporadas de cuerda: fundar un club y que te
     destituyan en la primera evaluación no es exigencia, es no dejarte jugar. */
  return {car,objetivo:J.obj0,paciencia:Math.max(2,J.margen)};
}
/* El club rival del primer día. Sale de los clubes del circuito y se queda
   para siempre: el marcador del derbi es de las pocas cosas que un club
   arrastra temporada tras temporada. */
function mkDerbi(){
  return {club:clubAlAzar(),v:0,d:0};
}
/* ================================================================
   LA CANTERA, CON HISTORIA

   Antes una promesa aparecía con 17 años, se quedaba quieta en una lista y
   acababa subida o vendida. No había nada que seguir: ni crecía, ni se
   frustraba, ni te dejaba en evidencia por tenerla cuatro años en el banquillo.

   Ahora cada promesa cierra temporada como cierra un jugador: crece hacia su
   techo —más deprisa cuanto más lejos esté y mejor sea la escuela—, guarda en
   qué golpe mejoró, y va gastando ilusión si cumple años sin debutar. A las
   cuatro temporadas sin jugar se marcha, y eso sale en el periódico.

   El techo (`pot`) no se enseña: se estima. Con ojeador, la estimación
   aprieta. Es la única información del juego por la que merece la pena pagar
   un sueldo, y por eso conviene que siga siendo cara.
================================================================ */
const CAN_ILUSION0=78, CAN_FUGA=6;
/* Cuánto crece una promesa en una temporada. Lejos del techo se crece a
   zancadas; pegado a él, a centímetros. */
function saltoCantera(cl,j){
  const media=mediaAttrs(j.attrs), techo=j.pot||media+6;
  if(media>=techo) return 0;
  const margen=techo-media;
  let f=1;
  if(cl.reformas&&cl.reformas.escuela) f+=.35;
  if(cl.staff&&cl.staff.entrenador) f+=.2;
  if(filoClub(cl)==="cantera") f+=.3;            // la filosofía se nota donde dice notarse
  f+=(cl.instal||1)*.06;
  if((j.edad||17)>=21) f*=.55;                    // a los 21 ya casi no se enseña nada
  return Math.max(0, Math.min(margen, Math.round(margen*.28*f + R(-.6,1.2))));
}
/* Cierra la temporada de la academia: crece, se anota en su historial y decide
   si sigue teniendo ganas. Devuelve los que se marchan. */
function evolucionaCantera(cl){
  const fuera=[];
  (cl.cantera||[]).forEach(j=>{
    j.edad=(j.edad||17)+1;
    j.aniosCan=(j.aniosCan|0)+1;
    if(j.ilusion==null) j.ilusion=CAN_ILUSION0;
    const antes=mediaAttrs(j.attrs);
    const salto=saltoCantera(cl,j);
    let foco=null;
    if(salto>0){
      // el salto se reparte, pero se nota más en un golpe: es lo que se cuenta
      foco=pick(ATTR_KEYS);
      j.attrs[foco]=clamp((j.attrs[foco]||50)+Math.max(1,Math.round(salto*1.6)),20,99);
      for(let i=0;i<2;i++){ const k=pick(ATTR_KEYS); j.attrs[k]=clamp((j.attrs[k]||50)+Math.round(salto*.7),20,99); }
    }
    const despues=mediaAttrs(j.attrs);
    (j.hist=j.hist||[]).push({t:Math.max(1,temporada()-1),a:antes,b:despues,foco});
    j.hist=j.hist.slice(-8);
    if(despues>antes) avisa(t("can_av_crece",{n:j.n,media:despues,d:"+"+(despues-antes)}),"ok");
    else if(mediaAttrs(j.attrs)>=(j.pot||0)) avisa(t("can_av_techo",{n:j.n,media:despues}));
    // la ilusión se gasta con los años sin debutar, no con la edad a secas
    if(j.aniosCan>=2) j.ilusion-=(j.edad>=21?26:j.edad>=19?18:10);
    if(j.aniosCan===2||j.aniosCan===3) avisa(t("can_av_pide",{n:j.n,a:j.aniosCan}));
    /* Se va cuando se le acaba la ilusión, no por calendario. La curva está
       hecha para que la ficha enseñe «se va a final de temporada» al menos una
       temporada antes: perder a un canterano tiene que ser culpa tuya, no una
       sorpresa. `CAN_FUGA` queda como tope por si algo se descuadra. */
    if(j.ilusion<=0||j.aniosCan>=CAN_FUGA) fuera.push(j);
  });
  fuera.forEach(j=>{
    cl.cantera=cl.cantera.filter(x=>x!==j);
    avisa(t("can_av_fuga",{n:j.n,a:j.aniosCan|0}));
    noticia("ruptura",t("can_not_fuga_t",{n:j.n,club:cl.nombre}),t("can_not_fuga_s"));
  });
  return fuera;
}
/* Cómo se lee su ilusión, que es lo que de verdad decide cuándo subirlo. */
function ilusionTxt(j){
  const i=j.ilusion==null?CAN_ILUSION0:j.ilusion;
  if(i>=65) return {k:"can_il_alta",col:"var(--verde)"};
  if(i>=40) return {k:"can_il_media",col:"var(--gris)"};
  if(i>=25) return {k:"can_il_baja",col:"var(--oro)"};
  return {k:"can_il_fuga",col:"var(--rojo)"};
}
/* El techo, estimado. Sin ojeador es una horquilla ancha; con él, una lectura. */
function techoTxt(cl,j){
  const pot=j.pot||mediaAttrs(j.attrs)+6;
  if(cl.staff&&cl.staff.ojeador) return t("can_techo_ojo",{n:pot});
  return t("can_techo",{a:Math.max(30,pot-7),b:Math.min(99,pot+5)});
}
/* Consejo honesto sobre subirlo ya o esperar: mira lo que le queda por crecer. */
function consejoSubir(cl,j){
  const media=mediaAttrs(j.attrs), pot=j.pot||media+6;
  // primero el techo: a quien ya no le queda nada por aprender aquí se le sube,
  // lleve dos temporadas o cinco. Decir «se te pasó el arroz» de alguien que
  // todavía crece es un consejo que se contradice a sí mismo.
  if(pot-media<=4) return "can_subir_ya";
  if((j.ilusion!=null&&j.ilusion<40)||(j.aniosCan|0)>=4) return "can_subir_tarde";
  return "can_subir_pronto";
}
/* Gráfico de barras de su evolución. Es SVG generado, como todo aquí. */
function canteraGrafico(j){
  const h=(j.hist||[]);
  if(!h.length) return `<div class="foot" style="text-align:left">${t("can_sin_hist")}</div>`;
  const pot=j.pot||mediaAttrs(j.attrs)+6;
  const min=Math.min(...h.map(x=>x.a))-3, max=Math.max(pot,...h.map(x=>x.b))+2;
  const rango=Math.max(1,max-min), H=54;
  // el lienzo reserva sitio para cuatro temporadas aunque solo haya una: con
  // una sola barra el gráfico salía del tamaño de un sello
  const cols=Math.max(4,h.length), paso=Math.floor(160/cols), W=cols*paso+8;
  const barras=h.map((x,i)=>{
    const y=H-((x.b-min)/rango)*H, y0=H-((x.a-min)/rango)*H;
    const w=Math.max(8,paso-10);
    return `<rect x="${i*paso+6}" y="${y}" width="${w}" height="${Math.max(2,H-y)}" fill="var(--lima)" opacity=".8"/>
      <rect x="${i*paso+6}" y="${y0}" width="${w}" height="2" fill="var(--gris2)"/>`;
  }).join("");
  const yTecho=H-((pot-min)/rango)*H;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:340px;height:54px;display:block;margin:5px 0">
    <line x1="0" y1="${yTecho}" x2="${W}" y2="${yTecho}" stroke="var(--oro)" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>
    ${barras}</svg>`;
}
function derbiClub(cl){ const d=cl&&cl.derbi; return (d&&CLUBES_NPC[d.club])?CLUBES_NPC[d.club]:null; }
/* ¿Este rival es el del derbi? Los rivales del circuito llevan su club encima. */
function esDerbi(cl,rival){
  return !!(cl&&cl.derbi&&rival&&rival.club!==undefined&&rival.club===cl.derbi.club);
}
/* Anota el derbi y lo cuenta. Se llama al cerrar un partido del club. */
function anotaDerbi(cl,rival,gane){
  if(!esDerbi(cl,rival)) return false;
  const nom=derbiClub(cl).n;
  cl.derbi[gane?"v":"d"]++;
  if(gane){ fansAdd(Math.round(120+(cl.fans||0)*.05),t("cder_hd")); avisa(t("cder_gana",{rival:nom})); }
  else { avisa(t("cder_pierde",{rival:nom})); }
  post("derbi",{rival:nom});
  noticia(gane?"hito":"circuito",t("cder_not_t",{club:cl.nombre,rival:nom}),t("cder_not_s"));
  return true;
}

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
  pintarFilosClub();
  pintarMercadoInicial();
}
/* La filosofía se elige antes de fichar, y el mercado de abajo se repinta al
   cambiarla: se ve en el sitio quién te acepta y quién no. */
function pintarFilosClub(){
  const cont=document.getElementById("filosClub"); if(!cont) return;
  cont.innerHTML=`<div class="difrow difrow-wrap">${Object.keys(FILOS_CLUB).map(k=>
    `<button type="button" class="difchip${k===filoClubSel?" on":""}" ${ac("setFiloClub",k)} aria-pressed="${k===filoClubSel}">${filoNombre(k)}</button>`
  ).join("")}</div><div class="difdesc">${filoDesc(filoClubSel)}</div>
  <div class="foot" style="text-align:left;margin-top:3px">${t("cfil_ayuda")}</div>`;
}
function setFiloClub(k){ if(!FILOS_CLUB[k]) return; filoClubSel=k; prepararCrearClub(); }
/* La Copa pide cuatro jugadores sanos para poner dos parejas. Con 12.000 —el
   presupuesto de cuando bastaban dos— fundar con cuatro te dejaba en −732€ el
   primer día. */
const PRESUP_CLUB=22000;
function pintarMercadoInicial(){
  const el=document.getElementById("mercadoInicial");el.innerHTML="";
  let gasto=plantillaTmp.reduce((s,j)=>s+costeFichajeCl({filo:filoClubSel},j),0);
  document.getElementById("mercTitulo").textContent=t("clb_caja",{n:(PRESUP_CLUB-gasto).toLocaleString("es")});
  const clFake={filo:filoClubSel};        // aún no hay club: la filosofía elegida basta
  mercadoTmp.forEach(j=>{
    const dentro=plantillaTmp.includes(j);
    const coste=costeFichajeCl(clFake,j);
    const af=afinidadFilo(clFake,j), ok=fichable(clFake,j);
    const d=document.createElement("div");d.className="opcion"+(dentro?" sel":"");
    d.innerHTML=`<b>${j.n}</b> <span class="pill">${t("clb_nivel",{n:nivelTxt(j)})}</span> ${ladoChip(j.lado!==undefined?j.lado:ladoPorAttrs(j.attrs,j.estilo))} <span class="pill">${t("clb_anios",{n:j.edad})}</span> <span class="pill">${estiloNombre(j.estilo)}</span> <span class="pill">${persoNombre(j.perso)}</span> <span class="pill" style="color:${afinidadColor(af)}">${afinidadTxt(af)}</span><div class="d">${t("clb_ficha_linea",{coste,sal:salarioDeCl(clFake,j)})}${(G&&G.clubG&&G.clubG.staff&&G.clubG.staff.ojeador)?"":t("clb_informe_impreciso")}</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=!ok?t("cfil_no_firma"):dentro?t("clb_quitar"):t("clb_fichar",{coste});
    b.disabled=!ok||(!dentro&&(plantillaTmp.length>=4||PRESUP_CLUB-gasto<coste));
    b.onclick=()=>{
      if(dentro) plantillaTmp=plantillaTmp.filter(x=>x!==j);
      else plantillaTmp.push(j);
      pintarMercadoInicial();
    };
    d.appendChild(b);el.appendChild(d);
  });
  const be=document.getElementById("btnEmpezarClub");
  be.disabled=plantillaTmp.length<2;
  be.textContent=plantillaTmp.length<2?t("clb_necesitas",{n:plantillaTmp.length}):t("clb_comenzar");
  be.onclick=()=>{
    if(plantillaTmp.length<2) return;
    const gasto2=plantillaTmp.reduce((s,j)=>s+costeFichajeCl({filo:filoClubSel},j),0);
    const nombre=document.getElementById("inClubNombre").value.trim()||"Rising Pádel Club";
    G={v:1,modo:"club",_slot:slotDestino(),semilla:iniciaSemilla(),dif:difMenu(),world:mkWorld(),carrera:null,clubG:{
      nombre,color:colorClubSel,
      plantilla:plantillaTmp.map(j=>({...j})),
      alin:[0,1],alinB:null,quims:{},
      semana:1,pts:0,dinero:PRESUP_CLUB-gasto2,
      sexo:sexoClubSel,wildcards:2,fans:400,social:[],
      filo:filoClubSel,
      // la junta te toca, no se elige: parte de dirigir es el despacho que te ha caído
      junta:mkJunta(),
      derbi:mkDerbi(),
      sponsor:null,sponsorOferta:null,
      instal:1,academia:false,cantera:[],mercado:mercadoTmp.filter(j=>!plantillaTmp.includes(j)).map(j=>({...j})),
      staff:{entrenador:null,fisio:null,psico:null,fisico:null,ojeador:null},mercadoStaff:null,_staffV2:1,
      reformas:Object.fromEntries(Object.keys(REFORMAS).map(k=>[k,false])),
      _pendB:null,
      lesionNota:null,palmares:[],diario:[],h2h:{},_rivalesSemana:[]
    }};
    mercadoTmp=null;plantillaTmp=[];
    avisa(t("clb_nace",{nombre,lista:G.clubG.plantilla.map(j=>j.n).join(", ")}));
  noticia("debut",t("not_club_debut_t",{nombre}),t("not_club_debut_s"));
    entrarPartida();   // arranca también la guía jugable
  };
}
const STAFF_CLUB={fisio:{n:"Fisioterapeuta",sal:210,desc:"Menos lesiones y recuperaciones más cortas para toda la plantilla."},psico:{n:"Psicólogo deportivo",sal:180,desc:"La confianza de la plantilla se recupera sola cada semana."},fisico:{n:"Preparador físico",sal:210,desc:"+4 de energía semanal extra para todos."},ojeador:{n:"Ojeador",sal:240,desc:"Mercados más grandes y con mejores jugadores."}};
const STAFF_CARR={rep:{n:"Representante",sal:150,desc:"Se lleva el 15% de tus premios, pero te trae contratos de patrocinio de más nivel."},fisio:{n:"Fisioterapeuta",sal:120,desc:"La mitad de lesiones y una semana menos de baja."},psico:{n:"Psicólogo deportivo",sal:100,desc:"Tu confianza no baja de 40 y la moral de tu pareja no se desgasta sola."},fisico:{n:"Preparador físico",sal:120,desc:"+4 de energía semanal extra."}};
/* Reformas de las instalaciones. Los campos n y desc son etiquetas muertas: lo
   que se pinta son las claves t("ref_"+k) y t("ref_"+k+"_d").

   Con cuatro reformas, un club solvente las tenía todas en pocas temporadas y
   se quedaba sin nada en que gastar. Las cuatro nuevas suben el techo y están
   escalonadas en precio, para que la última sea una meta de verdad. */
const REFORMAS={
  video:{n:"Sala de vídeo",coste:5500,desc:"Los entrenos rinden más (otro +1 frecuente)."},
  tienda:{n:"Tienda del club",coste:6500,desc:"La afición deja dinero: ingresos extra según los seguidores."},
  gym:{n:"Gimnasio propio",coste:7500,desc:"+4 de energía semanal para toda la plantilla."},
  medico:{n:"Sala médica",coste:8500,desc:"Menos lesiones y altas más rápidas para toda la plantilla."},
  residencia:{n:"Residencia de jugadores",coste:9500,desc:"La confianza de la plantilla sube +1 cada semana."},
  techada:{n:"Pista central techada",coste:12000,desc:"El club gana caché: +150€/sem de socios y +5 de prestigio."},
  escuela:{n:"Escuela de tecnificación",coste:14000,desc:"La academia saca promesas bastante mejores."},
  gradas:{n:"Gradas nuevas",coste:18000,desc:"Se llena: el club gana seguidores mucho más deprisa."},
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
  /* La pareja B se forma en dos clics, y entre uno y otro queda a medias. Como
     cada clic repinta —y repintar pasa por aquí—, borrar todo lo que no midiera
     dos dejaba la pareja B en null para siempre: era imposible formarla. Se
     respeta el estado intermedio mientras el jugador elegido siga existiendo. */
  if(cl.alinB&&cl.alinB.length===1){
    if(!cl.plantilla[cl.alinB[0]]) cl.alinB=null;
  } else if(cl.alinB&&!val(cl.alinB)) cl.alinB=null;
}
function alineacion(){ repararAlin(); return parejaDe(G.clubG&&G.clubG.alin); }
function alineacionB(){return G.clubG&&G.clubG.alinB?parejaDe(G.clubG.alinB):null;}
/* Salario semanal de un jugador de club. Estaba en media×8: cuatro jugadores
   de nivel 52 costaban 1.664€/semana contra unos ingresos de 765€, así que un
   club recién fundado perdía 900€ todas las semanas desde el minuto uno y no
   había forma de salir. Un Continental Bronce entero paga 1.000€. */
function salarioDe(j){return Math.round(mediaAttrs(j.attrs)*4.5);}
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
  match={p:[0,0],j:[0,0],s:[0,0],hist:[],server:rnd()<.5?0:1,fin:false,ver:false,cpu:true};
  while(!match.fin){PRESION=calcPresion();resolverPunto(buildPoint(match.server).ganador);}
  const gane=match.s[0]>match.s[1];
  const marcador=`${match.s[0]}-${match.s[1]}`;
  match=null;
  return {gane,marcador};
}
/* Pasa una pareja del club al motor de partidos.

   OJO CON LO QUE SE COPIA. Este objeto es lo único que ve `resolveShot`: lo que
   no se ponga aquí, para el motor no existe. Durante mucho tiempo se dejaba
   fuera el LADO de pista y los RASGOS, y eso era una desventaja sistemática
   frente a las parejas del mundo, que sí los llevan: la combinación drive+revés
   vale un 5% (`quimicaLado`) y jugar en tu lado natural hasta un 6% por golpe
   (`ladoNatural`), más lo que aporte cada rasgo. Medido en la Copa: parejas de
   nivel equivalente perdían 0-2 una y otra vez. */
function teamDePareja(par){
  const cl=G.clubG, q=quimDe(cl,par.map(j=>cl.plantilla.indexOf(j)));
  const mkJ=(j)=>{
    const f=(0.86+0.14*(j.energia/100))*(0.94+0.12*(q/100));
    const o={};ATTR_KEYS.forEach(k=>o[k]=Math.round(j.attrs[k]*f));
    const lado=(j.lado===0||j.lado===1)?j.lado:ladoPorAttrs(j.attrs,j.estilo);
    return {n:j.n,estilo:j.estilo,perso:j.perso,conf:j.conf,attrs:o,
      lado, rasgos:(j.rasgos?j.rasgos.slice():undefined), sexo:j.sexo||cl.sexo, _ref:j};
  };
  /* Y los dos lados se reparten: si los dos son del mismo, el segundo se
     coloca en el otro, que es lo que haría cualquiera al formar la pareja. */
  const a=mkJ(par[0]), b=mkJ(par[1]);
  if(a.lado===b.lado) b.lado=1-a.lado;
  return {nombre:G.clubG.nombre+" B",jug:[a,b],atNet:false};
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
    parB.forEach(j=>{j.energia=clamp(j.energia-7,0,100);j.conf=clamp(j.conf+(res.gane?3:-4),15,95);});
    const qk=quimKeyP(idxPar);
    cl.quims[qk]=clamp((cl.quims[qk]??40)+2,10,95);
    rival.pts+=cat.pts[loserIdx(fase)]||0;
    if(!res.gane){
      idxPts=loserIdx(fase);
      resumen.push(`caen en ${faseNombre(fase).toLowerCase()} (${res.marcador}) vs ${rival.nombre}`);
      break;
    }
    if(res.gane&&rnd()<.2){const k=pick(ATTR_KEYS);const j=pick(parB);if(j.attrs[k]<88)j.attrs[k]++;}
    if(fase===5){ idxPts=0; titulo=true; break; }
    fase++;
    // lesión por fatiga a mitad de torneo
    const cansado=parB.find(j=>j.energia<20&&!j.lesion);
    if(cansado&&rnd()<kLesion(cl.staff.fisio?.15:.3)){
      cansado.lesion=pickLesion(clamp(1-cansado.energia/40,0,1));
      if(cl.staff.fisio) cansado.lesion.sem=Math.max(1,cansado.lesion.sem-1);
      cansado.fragil=(cansado.fragil||0)+1;
      idxPts=loserIdx(fase);
      resumen.push(`retirada (W.O.): ${cansado.n}, ${cansado.lesion.n}`);
      break;
    }
  }
  const pts=Math.round((cat.pts[idxPts]||0)*.5), premio=cat.premio[idxPts]||0;  // la pareja B puntúa al 50% para el club
  rkAnota(cl,cl.semana,pts); cl.dinero+=premio;
  if(titulo){
    cl.palmares.push(`${catNombre(cat)} — pareja B (T${temporada()})`);
    noticia("titulo",t("not_parejab_t",{cat:catNombre(cat)}),t("not_parejab_s",{p1:parB[0].n,p2:parB[1].n,pts,premio}));
    avisa(t("clb_b_gana",{j1:parB[0].n,j2:parB[1].n,cat:catNombre(cat),premio}));
  } else {
    avisa(t("clb_b_resumen",{cat:catNombre(cat),resumen:resumen.join("; ")||t("clb_b_eliminados"),pts,premio}));
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
  if(cl.invitacionSL&&cl.invitacionSL.pendiente&&typeof document!=="undefined"&&document.body&&!document.getElementById("slInvitModal"))
    setTimeout(()=>mostrarInvitacionSL(),400);
  document.getElementById("topCtx").innerHTML=`<b>${t("ctx_temporada")} ${temporada()}</b> · S${semanaTemp()}/${SEMANAS_TEMP} · ${cl.sexo==="F"?t("ctx_circuito_f"):t("ctx_circuito_m")}<br>${cl.nombre} · 🎟×${cl.wildcards||0}`;
  document.getElementById("cmSem").textContent="S"+semanaTemp();
  document.getElementById("cmRank").textContent="#"+miPuesto();
  document.getElementById("cmPts").textContent=cl.pts;
  const kD=document.getElementById("cmDin");
  kD.textContent=cl.dinero+"€";
  kD.style.color=cl.dinero<0?"var(--rojo)":cl.dinero<200?"var(--oro)":"";
  document.getElementById("cmSal").textContent="-"+salariosSemana()+"€";
  if(cmTab==="semana"){ pintarCmSemana(); pintarCopa(); }
  if(cmTab==="plantilla") pintarCmPlantilla();
  if(cmTab==="club") pintarCmClub();
  if(cmTab==="ranking"){pintarCopaTabla();renderRanking(document.getElementById("cmTablaRk"));renderClubes(document.getElementById("cmTablaClubes"));renderN1(document.getElementById("cmN1hist"));renderRecords(document.getElementById("cmRecords"));}
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
      d.innerHTML=`<b>${t("clb_pareja_b")}</b> <span class="pill">${alB.map(j=>j.n).join(" + ")}</span> <span class="pill">${t("clb_quimica",{n:quimDe(cl,cl.alinB)})}</span><div class="d">${cl._pendB!==null?t("clb_b_inscrita",{cat:catNombre(cl._pendB)}):t("clb_b_libre")}</div>`;
      if(listosB){
        const f=document.createElement("div");f.className="fila";
        bDisp.forEach(ci=>{
          const b=document.createElement("button");
          b.className=cl._pendB===ci?"pri":"";
          b.textContent=`B → ${catNombre(ci)}`;
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
    d.innerHTML=`<b>${j.n}</b> <span class="pill">${t("clb_nivel_n",{n:mediaAttrs(j.attrs)})}</span> <span class="pill">EN ${j.energia}</span> <span class="pill">CF ${j.conf}</span> <span class="pill lima">${t("clb_plan_de",{p:plan})}</span>${les}${mer}${rasg?`<div style="margin-top:3px">${rasg}</div>`:""}`;
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
    b.textContent=t("ent_int_"+it);
    b.onclick=()=>{cl.intens=it;guardar();pintarClubM();};
    fInt.appendChild(b);
  });
  en.appendChild(fInt);
  const btnAll=document.createElement("button");
  btnAll.className="pri";btnAll.style.width="100%";btnAll.style.marginTop="4px";
  const aptos=cl.plantilla.filter(j=>!j.lesion&&j.energia>=25).length;
  btnAll.textContent=t("clb_semana_entreno",{n:aptos});
  btnAll.disabled=aptos===0;
  btnAll.onclick=entrenarClubTodos;
  en.appendChild(btnAll);
  document.getElementById("cmCalendario").innerHTML=calHtml();
}

/* ================================================================
   LA COPA DE CLUBES EN PANTALLA

   La decisión de la jornada se toma aquí: ves sus dos parejas, colocas las
   tuyas y eliges si vas de tú a tú o cruzas. Y de paso decides a quién guardas
   para el desempate, sabiendo lo que le va a quedar de energía.
================================================================ */
function pintarCopa(){
  const cl=G.clubG, bx=document.getElementById("cmCopa");
  if(!bx||!cl) return;
  bx.innerHTML="";
  const jor=copJornadaDe(cl,semanaTemp());
  const acta=(cl.copa&&cl.copa.ultima&&cl.copa.ultima._verSem===cl.semana)?cl.copa.ultima:null;
  if(!jor&&!acta) return;
  const card=document.createElement("div");card.className="card";
  if(acta){
    card.innerHTML=`<h3>${t("cop_acta_hd")} · <em>${acta.mio}-${acta.suyo}</em></h3>`
      +acta.partidos.map(pt=>pt.wo
        ? `<div class="brief" style="color:var(--rojo)">${t("cop_wo",{rival:pt.rival})}</div>`
        : `<div class="brief"><b style="color:${pt.gane?"var(--verde)":"var(--rojo)"}">${pt.marcador}</b> ${pt.mios.join(" + ")} — ${pt.rival}${pt.desempate?` <span class="pill">${t("cop_pt_des")}</span>`:""}</div>`
      ).join("");
    bx.appendChild(card);
    return;
  }
  const derbi=copEsDerbi(cl,jor.rival);
  card.innerHTML=`<h3>${t("cop_hd")} · <em>${t("cop_jor",{n:jor.jor+1,rival:copNombreDe(cl,jor.rival)})}</em> ${derbi?`<span class="pill" style="color:var(--rojo)">${t("cop_derbi")}</span>`:""} <span class="pill">${t(jor.casa?"cop_casa":"cop_fuera")}</span></h3>
    <div class="foot" style="text-align:left;margin-bottom:8px">${t("cop_sub")}</div>`;
  // sus parejas, con la identidad táctica que ya sabe leer el juego
  const suyas=copParejasRival(cl,jor.rival);
  const sus=document.createElement("div");
  sus.innerHTML=`<div class="phead">${t("cop_ellos")}</div>`
    +suyas.map((p,i)=>{
      const id=(typeof identidadPareja==="function"&&p.jug&&p.jug.length>1)?identidadPareja(p):null;
      return `<div class="brief"><b>${i+1}.</b> ${p.nombre} <span class="pill">${t("clb_nivel_n",{n:nivelPareja(p)})}</span>${id?` <span class="pill" style="color:var(--oro)">${identNombre(id)}</span>`:""}</div>`;
    }).join("");
  card.appendChild(sus);
  // las tuyas
  const mias=copAlineacionAuto(cl,!!cl._copReparte);
  const disp=copDisponibles(cl).length;
  const mis=document.createElement("div");mis.style.marginTop="9px";
  mis.innerHTML=`<div class="phead">${t("cop_tuyas")}</div>`
    +(mias.length?mias.map((par,i)=>`<div class="brief"><b>${i+1}.</b> ${par.map(j=>`${j.n} <span style="color:var(--gris2)">(${mediaAttrs(j.attrs)}·EN ${j.energia})</span>`).join(" + ")}</div>`).join("")
      :`<div class="brief" style="color:var(--rojo)">${t("cop_nadie")}</div>`);
  if(mias.length===1) mis.innerHTML+=`<div class="foot" style="text-align:left;color:var(--oro)">${t("cop_sin_gente",{n:disp})}</div>`;
  card.appendChild(mis);
  if(mias.length){
    // reparto: apilar a los dos mejores o hacer dos parejas parejas
    if(disp>=4){
      const hdR=document.createElement("div");hdR.className="foot";hdR.style.textAlign="left";hdR.style.margin="9px 0 3px";
      hdR.textContent=t("cop_rep_hd");
      card.appendChild(hdR);
      const fR=document.createElement("div");fR.className="fila";
      [0,1].forEach(rp=>{
        const b=document.createElement("button");
        b.className="selbtn"+(((cl._copReparte?1:0)===rp)?" on":"");
        b.style.fontSize="11px";
        b.textContent=t("cop_rep_"+rp);
        b.onclick=()=>{cl._copReparte=!!rp;pintarClubM();};
        fR.appendChild(b);
      });
      card.appendChild(fR);
      const dR=document.createElement("div");dR.className="foot";dR.style.textAlign="left";dR.style.marginTop="3px";
      dR.textContent=t("cop_rep_"+(cl._copReparte?1:0)+"_d");
      card.appendChild(dR);
    }
    // cruce
    const hd=document.createElement("div");hd.className="foot";hd.style.textAlign="left";hd.style.margin="9px 0 3px";
    hd.textContent=t("cop_cruce_hd");
    card.appendChild(hd);
    const fila=document.createElement("div");fila.className="fila";
    [0,1].forEach(cr=>{
      const b=document.createElement("button");
      b.className="selbtn"+(((cl._copCruce|0)===cr)?" on":"");
      b.style.fontSize="11px";
      b.textContent=t("cop_cruce_"+cr);
      b.onclick=()=>{cl._copCruce=cr;pintarClubM();};
      fila.appendChild(b);
    });
    card.appendChild(fila);
    const d=document.createElement("div");d.className="foot";d.style.textAlign="left";d.style.marginTop="3px";
    d.textContent=t("cop_cruce_"+((cl._copCruce|0))+"_d");
    card.appendChild(d);
    // desempate
    if(mias.length>1){
      const hd2=document.createElement("div");hd2.className="foot";hd2.style.textAlign="left";hd2.style.margin="9px 0 3px";
      hd2.textContent=t("cop_des_hd");
      card.appendChild(hd2);
      const f2=document.createElement("div");f2.className="fila";
      mias.forEach((par,i)=>{
        const b=document.createElement("button");
        b.className="selbtn"+(((cl._copDes|0)===i)?" on":"");
        b.style.fontSize="11px";
        b.textContent=par.map(j=>j.n).join(" + ");
        b.onclick=()=>{cl._copDes=i;pintarClubM();};
        f2.appendChild(b);
      });
      card.appendChild(f2);
    }
  }
  const b=document.createElement("button");b.className="pri";b.style.width="100%";b.style.marginTop="9px";
  b.textContent=t("cop_jugar");
  b.onclick=()=>jugarEliminatoria(jor.jor);
  card.appendChild(b);
  bx.appendChild(card);
}
function jugarEliminatoria(jor){
  const cl=G.clubG; if(!cl) return;
  const mias=copAlineacionAuto(cl,!!cl._copReparte);
  const acta=copJuega(cl,jor,mias,cl._copCruce|0,cl._copDes|0);
  if(!acta) return;
  const derbi=copEsDerbi(cl,acta.rival);
  const soc=socTrasEliminatoria(cl,acta,derbi);
  const taq=copTaquilla(cl,acta);
  if(taq){ cl.dinero+=taq; avisa(t("cop_taquilla",{n:taq.toLocaleString("es")})); }
  if(derbi) anotaDerbi(cl,{club:cl.copa.grupo[acta.rival-1]},acta.gane);
  acta._verSem=cl.semana;
  const rival=copNombreDe(cl,acta.rival);
  avisa(t(acta.gane?"cop_gana":"cop_pierde",{a:acta.mio,b:acta.suyo,rival,soc:Math.abs(soc)}));
  noticia(acta.gane?"titulo":"ruptura",
    t("cop_hd")+" · "+t("cop_res",{marc:`${acta.mio}-${acta.suyo}`,rival}),
    acta.partidos.filter(p=>!p.wo).map(p=>`${p.marcador} ${p.mios.join("+")}`).join(" · "));
  guardar(); pintarClubM();
}
function pintarCopaTabla(){
  const cl=G.clubG, el=document.getElementById("cmCopaTabla");
  if(!el||!cl) return;
  const filas=copTabla(cl);
  el.innerHTML=`<tr class="hd"><td>#</td><td>${t("sl_col_club")}</td><td class="pts">${t("cop_col_j")}</td><td class="pts">${t("cop_col_g")}</td><td class="pts">${t("cop_col_p")}</td><td class="pts">Pts</td></tr>`
    +filas.map((f,i)=>`<tr class="${f.yo?"yo":i===0?"top":""}"><td class="pos">${i+1}</td><td><span style="color:${f.color}">●</span> ${f.nombre}</td><td class="pts">${f.g+f.p}</td><td class="pts">${f.g}</td><td class="pts">${f.p}</td><td class="pts">${f.pts}</td></tr>`).join("");
  const pie=document.getElementById("cmCopaPie");
  if(pie) pie.textContent=t("cop_tabla_pie",{j:copJugadas(cl),n:cl.copa.cal.length,pos:copPuesto(cl),clubes:COP_CLUBES});
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
  const alCard=document.createElement("div");alCard.className="card";alCard.id="cmAlin";
  alCard.innerHTML=`<h3>${t("clb_hd_alin")}</h3>`;
  cl.plantilla.forEach((j,idx)=>{
    const row=document.createElement("div");row.className="fila";row.style.marginBottom="5px";row.style.alignItems="center";
    const enA=cl.alin.includes(idx), enB=cl.alinB&&cl.alinB.includes(idx);
    const nom=document.createElement("div");
    nom.style.flex="2";nom.style.fontSize="12px";nom.style.display="flex";nom.style.alignItems="center";nom.style.gap="6px";
    nom.innerHTML=`<span>${avatarSVG(j,30)}</span><span>${enA?"🅰 ":enB?"🅱 ":""}${j.n} ${ladoChip(j.lado)} · <span style="color:var(--gris)">${t("clb_nivel_n",{n:mediaAttrs(j.attrs)})}${j.lesion?" · "+t("clb_lesionado"):""}</span></span>`;
    const bA=document.createElement("button");bA.textContent="A";bA.className=enA?"selbtn on":"selbtn";bA.style.flex=".4";
    bA.onclick=()=>{
      if(enA) return;
      if(cl.alinB){cl.alinB=cl.alinB.filter(x=>x!==idx);if(cl.alinB.length<2)cl.alinB=null;}
      cl.alin=[cl.alin[1],idx];
      guardar();pintarClubM();
    };
    // cesión: al que no juega se le presta. Ahorras ficha y él crece, pero no lo tienes.
    if(j.cedido){
      const ced=document.createElement("div");ced.className="foot";ced.style.flex="1";ced.style.textAlign="right";ced.style.color="var(--oro)";
      ced.textContent=t("ces_cedido",{club:(CLUBES_NPC[j.cedido.club]||{n:"—"}).n,n:Math.max(0,j.cedido.hasta-(cl.semana|0))});
      row.appendChild(nom);row.appendChild(ced);alCard.appendChild(row);
      return;
    }
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
  q.innerHTML=t("clb_quim_a",{a:quimActual(cl)})+(alB2?t("clb_quim_b",{b:quimDe(cl,cl.alinB)}):cl.alinB&&cl.alinB.length===1?t("clb_par_b_elige"):t("clb_par_b_no"));
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
        <div class="chip">${t("kpi_confianza2")} <b style="color:${colAttr(j.conf)}">${j.conf}</b></div>
        <div class="chip">Moral <b style="color:${colAttr(moralC)}">${moralC}</b></div>
        <div class="chip">Contrato <b>${ct.temporadas||1} temp.</b></div>
        <div class="chip">${t("clb_clausula")} <b>${(valorClausula(j)).toLocaleString("es")}€</b></div>
        ${j.dela_casa?`<div class="chip lima">${t("can_pill_casa")}</div>`:""}
        ${rolJ?`<div class="chip lima">${t("clb_titular",{rol:rolJ})}</div>`:""}
      </div>
      <div class="foot" style="text-align:left;margin-top:6px;color:${est.col<0?"var(--rojo)":est.col>0?"var(--verde)":"var(--gris)"}">${est.clave==="salir"?"🚪":est.clave==="exige"?"😠":est.clave==="dudas"?"🤔":"🙂"} ${est.txt}</div>
      ${chipRasgos(j)?`<div style="margin-top:4px">${chipRasgos(j)}</div>`:""}
      <div class="attrs" style="margin-top:10px">${attrHtml(j.attrs)}</div>`;
    /* Ceder es la alternativa a vender: no cobras, pero no lo pierdes y vuelve
       mejor. Solo se puede con el que sobra de verdad. */
    if(j.cedido){
      const cd=document.createElement("div");cd.className="foot";cd.style.textAlign="left";cd.style.color="var(--oro)";cd.style.marginTop="8px";
      cd.textContent=t("ces_cedido",{club:(CLUBES_NPC[j.cedido.club]||{n:"—"}).n,n:Math.max(0,j.cedido.hasta-(cl.semana|0))});
      d.appendChild(cd);
    } else if(!cl.alin.includes(idx)&&!(cl.alinB&&cl.alinB.includes(idx))){
      const bc=document.createElement("button");bc.style.width="100%";bc.style.marginTop="8px";
      const puede=cesionPosible(cl,j);
      bc.textContent=puede?t("ces_ceder",{n:CES_SEMANAS}):t("ces_no");
      bc.disabled=!puede;
      if(puede) bc.onclick=()=>{
        if(!cesionHaz(cl,j)) return;
        avisa(t("ces_av",{n:j.n,sem:CES_SEMANAS}));
        guardar();pintarClubM();
      };
      d.appendChild(bc);
    }
    if(cl.plantilla.length>2&&!j.cedido&&!cl.alin.includes(idx)&&!(cl.alinB&&cl.alinB.includes(idx))){
      const b=document.createElement("button");b.style.width="100%";b.style.marginTop="10px";
      b.textContent=t("clb_traspasar",{n:mediaAttrs(j.attrs)*4});
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
  m.innerHTML=`<h3>${t("clb_mercado_hd")}</h3>`;
  if(cl.plantilla.length>=6){
    m.innerHTML+=`<div class="foot" style="text-align:left">${t("clb_plantilla_llena")}</div>`;
  } else {
    cl.mercado.forEach((j,mi)=>{
      const coste=costeFichajeCl(cl,j), sal=salarioDeCl(cl,j);
      const af=afinidadFilo(cl,j), ok=fichable(cl,j);
      const d=document.createElement("div");d.className="opcion";
      d.innerHTML=`<b>${j.n}</b> <span class="pill">${t("clb_nivel",{n:nivelTxt(j)})}</span> ${ladoChip(j.lado)} <span class="pill">${t("clb_anios",{n:j.edad})}</span> <span class="pill">${estiloNombre(j.estilo)}</span> <span class="pill" style="color:${afinidadColor(af)}">${afinidadTxt(af)}</span><div class="d">${t("clb_merc_ficha",{coste,sal})}</div>`;
      const b=document.createElement("button");b.style.width="100%";
      b.textContent=!ok?t("cfil_no_firma"):cl.dinero<coste?t("clb_sin_caja"):t("clb_ficha_btn",{coste});
      b.disabled=!ok||cl.dinero<coste;
      b.onclick=()=>{
        cl.dinero-=coste;
        cl.plantilla.push({...j,salario:sal});
        cl.mercado.splice(mi,1);
        avisa(t("clb_fichaje",{n:j.n,club:cl.nombre}));
        guardar();pintarClubM();
      };
      d.appendChild(b);m.appendChild(d);
    });
    if(!cl.mercado.length) m.innerHTML+=`<div class="foot" style="text-align:left">${t("clb_mercado_vacio")}</div>`;
  }
  el.appendChild(m);
}
function pintarCmClub(){
  const cl=G.clubG,el=document.getElementById("cm-clubpan");el.innerHTML="";
  const pre=prestigioClub(),socios=25+Math.round(pre*1.5);
  /* Lo primero del panel es quiénes sois: la filosofía que decide a quién
     convencéis, la junta que os ha tocado y el club al que hay que ganar. */
  const cId=document.createElement("div");cId.className="card";
  const der=derbiClub(cl), D=cl.derbi||{v:0,d:0};
  const filo=filoClub(cl), jun=juntaClub(cl);
  cId.innerHTML=`<h3>${t("cid_hd")}</h3>
    <div style="border-left:3px solid ${cl.color};padding-left:9px;margin-bottom:9px">
      <div style="font-size:calc(13px * var(--esc));font-weight:600">${filoNombre(filo)}</div>
      <div style="font-size:calc(11px * var(--esc));color:var(--gris);font-style:italic">«${filoLema(filo)}»</div>
      <div style="font-size:calc(11px * var(--esc));color:var(--gris2);margin-top:4px;line-height:1.45">${filoDesc(filo)}</div>
    </div>
    <div style="border-left:3px solid var(--borde2);padding-left:9px;margin-bottom:9px">
      <div style="font-size:calc(12px * var(--esc));font-weight:600">${juntaNombre(jun)}</div>
      <div style="font-size:calc(11px * var(--esc));color:var(--gris2);margin-top:3px;line-height:1.45">${juntaDesc(jun)}</div>
      <div class="foot" style="text-align:left;margin-top:4px">${t("cid_junta_obj",{obj:(cl.junta||{}).objetivo||"—",pac:(cl.junta||{}).paciencia||0})}</div>
    </div>
    ${der?`<div style="border-left:3px solid ${der.color};padding-left:9px">
      <div style="font-size:calc(12px * var(--esc));font-weight:600">${t("cder_hd")} · <span style="color:${der.color}">${der.n}</span></div>
      <div class="foot" style="text-align:left;margin-top:3px">${(D.v+D.d)?t("cder_marcador",{rival:der.n,v:D.v,d:D.d}):t("cid_derbi_sin")}</div>
    </div>`:""}`;
  el.appendChild(cId);
  const c1=document.createElement("div");c1.className="card";
  c1.innerHTML=`<h3>${cl.nombre} · <em>finanzas</em></h3>
    <div class="meta" style="margin-top:0">
      <div class="chip">Prestigio <b>${pre}</b></div>
      <div class="chip">${t("soc_hd")} <b>${(socAsegura(cl),cl.socios)}</b> <span style="color:var(--gris2)">${t("soc_"+socEstado(cl))}</span> <b style="color:var(--lima)">+${socIngreso(cl)}€/sem</b></div>
      <div class="chip">Salarios <b>-${salariosSemana()}€/sem</b></div>
      <div class="chip">Instalaciones <b>Nv ${cl.instal}</b></div>
      <div class="chip">Récord <b>${(cl.vd||{v:0,d:0}).v}-${(cl.vd||{v:0,d:0}).d}</b></div>
      <div class="chip">Afición <b style="color:var(--lima)">${fmtFans(cl.fans||0)}</b> <span style="color:var(--gris2)">(+${Math.round((cl.fans||0)*.01)}€/sem)</span></div>
    </div>`;
  el.appendChild(c1);
  const c2=document.createElement("div");c2.className="card";
  c2.innerHTML=`<h3>${t("clb_hd_instal")}</h3>`;
  if(cl.instal<3){
    const coste=cl.instal===1?400:900;
    const d=document.createElement("div");d.className="opcion";
    d.innerHTML=`<b>${t("clb_instal_mejorar",{n:cl.instal+1})}</b><div class="d">${t(cl.instal===1?"clb_instal_1_d":"clb_car_desc")} · ${coste}€</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=cl.dinero<coste?t("mkt_caja"):t("clb_instal_btn",{coste});
    b.disabled=cl.dinero<coste;
    b.onclick=()=>{cl.dinero-=coste;cl.instal++;avisa(t("clb_instal",{n:cl.instal}));guardar();pintarClubM();};
    d.appendChild(b);c2.appendChild(d);
  } else c2.innerHTML+=`<div class="foot" style="text-align:left">${t("clb_car_hecho")}</div>`;
  el.appendChild(c2);
  const c3=document.createElement("div");c3.className="card";
  c3.innerHTML=`<h3>${t("can_hd")}</h3>`;
  if(!cl.academia){
    const d=document.createElement("div");d.className="opcion";
    d.innerHTML=`<b>${t("clb_academia")}</b><div class="d">${t("clb_academia_d")}</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=cl.dinero<300?t("mkt_caja"):t("clb_academia_btn");
    b.disabled=cl.dinero<300;
    b.onclick=()=>{cl.dinero-=300;cl.academia=true;avisa(t("clb_academia_ok"),"ok");guardar();pintarClubM();};
    d.appendChild(b);c3.appendChild(d);
  } else if(!cl.cantera.length){
    c3.innerHTML+=`<div class="foot" style="text-align:left">${t("clb_academia_trabaja")}</div>`;
  } else {
    cl.cantera.forEach((j,idx)=>{
      const d=document.createElement("div");d.className="opcion";
      const anios=j.aniosCan|0, il=ilusionTxt(j);
      // el historial: en qué temporada creció, cuánto y en qué golpe
      const hist=(j.hist||[]).slice(-4).map(x=>x.b>x.a
        ? t("can_linea",{t:x.t,a:x.a,b:x.b,d:"+"+(x.b-x.a),golpe:atNombre(x.foco||"fondo")})
        : t("can_estanca",{t:x.t,a:x.a,b:x.b})
      ).map(l=>`<div style="font-size:calc(10.5px * var(--esc));color:var(--gris2);padding:1px 0">${l}</div>`).join("");
      d.innerHTML=`<b>${j.n}</b> <span class="pill">${t("clb_nivel_n",{n:mediaAttrs(j.attrs)})}</span> <span class="pill">${t("clb_anios_n",{n:j.edad})}</span> <span class="pill">${estiloNombre(j.estilo)}</span> <span class="pill oro">${techoTxt(cl,j)}</span>
        <div class="d">${anios<=1?t("can_anio1"):t("can_anios",{n:anios+1})}</div>
        <div style="color:${il.col};font-size:calc(11px * var(--esc));margin-top:3px">${t(il.k)}</div>
        ${canteraGrafico(j)}
        ${hist?`<div style="margin-top:2px"><span class="foot" style="text-align:left">${t("can_evol")}</span>${hist}</div>`:""}
        <div class="foot" style="text-align:left;margin-top:4px">${t(consejoSubir(cl,j))}</div>`;
      const f=document.createElement("div");f.className="fila";
      const b1=document.createElement("button");b1.className="pri";b1.textContent=t("can_subir");
      b1.disabled=cl.plantilla.length>=6;
      b1.onclick=()=>{
        cl.plantilla.push({...j,salario:Math.round(mediaAttrs(j.attrs)*.6),energia:100,conf:55,lesion:null,dela_casa:true,aniosCan:anios});
        cl.cantera.splice(idx,1);cl._subidos=(cl._subidos||0)+1;
        avisa(t("clb_sube",{n:j.n}));
        noticia("fichaje",t("can_not_debut_t",{n:j.n,club:cl.nombre}),t("can_not_debut_s",{a:anios+1}));
        guardar();pintarClubM();
      };
      const b2=document.createElement("button");b2.textContent=t("clb_traspasar",{n:mediaAttrs(j.attrs)*6});
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
    dS.innerHTML=`<b>🏟 ${of.marca}</b> <span class="pill">${tierTxt(of.tier)}</span><div class="d">${t("patro_club_oferta",{sec:t(of.sec),sem:of.sem})}</div>`;
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
  c6.innerHTML=`<h3>${t("clb_hd_hitos")}</h3><div id="cmHitos"></div>`;
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
  let g=v<55?2:v<70?1:(rnd()<.5?1:0);
  if(cl.instal>=2&&rnd()<.4) g+=1;
  if(cl.instal>=3&&rnd()<.3) g+=1;
  if(cl.reformas&&cl.reformas.video&&rnd()<.35) g+=1;
  const entNiv=(cl.staff&&cl.staff.entrenador&&cl.staff.entrenador.niv)||0;
  if(entNiv&&rnd()<.12*entNiv) g+=1;   // buen entrenador jefe = mejor progresión
  g=ajustaGanancia(g,it,j.edad);
  if(v>=58&&g>0&&rnd()<.5) g--;
  if(v>=72&&g>0&&rnd()<.5) g--;
  if(factor<1&&g>0&&rnd()>factor) g=Math.max(0,g-1);
  if(factor<1&&rnd()>factor+.25) g=0;
  if(g>0){ const rf=rasgosEntreno(j); if(rf>1&&rnd()<rf-1) g++; else if(rf<1&&rnd()<1-rf) g=Math.max(0,g-1); }   // talento / entrena mal
  j.attrs[k]=clamp(v+g,20,Math.min(96,(j.pot||96)+4));
  if(factor===1) j.energia=clamp(j.energia-(it==="suave"?7:it==="intensa"?19:12),0,100);
  if(factor===1&&it==="intensa"&&rnd()<.05&&!j.lesion){
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
  avisa(t("clb_descanso"));
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
  evSemana(cl,cl.semana,.16);      // el circuito también le cambia las reglas al club
  semanaDeRumores(cl,cl.semana);   // el mercado también habla en el modo club
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
  const _cae=caducaSemanaRanking(cl.semana);
  if(_cae>0) avisa(t("av_defiende_cae",{n:_cae}));
  /* Mismo presupuesto que en carrera: con 10 de recuperación, un jugador que
     entrena (17) y juega una eliminatoria (13) vivía a cero de energía, se caía
     de `copDisponibles` y el club perdía las jornadas sin jugarlas. Medido:
     0 de 20 eliminatorias con cuatro jugadores sanos en plantilla. */
  const regen=24+(cl.reformas.gym?4:0)+(cl.staff.fisico?4:0);
  cl.plantilla.forEach((j,idx)=>{
    j.energia=clamp(j.energia+regen,0,100);
    /* LA CONFIANZA SE ENFRÍA HACIA EL CENTRO. Sin esto era un trinquete de un
       solo sentido: cada derrota resta 4 y nada devolvía nunca nada, así que
       una mala racha dejaba a la segunda pareja clavada en 15 para siempre
       —medido: conf 23 en la temporada 2 y ahí seguía en la 5—. Y encima era
       una asimetría, porque las parejas del mundo se rehacen de cero en cada
       eliminatoria y llegan siempre a 55: tus jugadores cargaban con las
       cicatrices y los rivales no. Una mala racha tiene que doler unas
       semanas, no marcarte la carrera. */
    j.conf=clamp(j.conf+(j.conf<55?2:j.conf>55?-1:0),15,95);
    if(cl.reformas.residencia) j.conf=clamp(j.conf+1,15,95);
    if(cl.staff.psico&&j.conf<50) j.conf=clamp(j.conf+2,15,95);
    if((cl.staff.fisio||cl.reformas.medico)&&j.lesion&&rnd()<(cl.staff.fisio&&cl.reformas.medico?.5:.3)){j.lesion.sem--;if(j.lesion.sem<=0){const s=curarLesion(j);avisa(`El fisio adelanta el alta de ${j.n}.`+(s?` (mermado -${s.pct}%, ${s.sem} sem)`:""));}}
    decaeMerma(j);
    // moral por minutos: el rol (titular A / B / banquillo) sube o quema la moral
    const rol=cl.alin.includes(idx)?"A":(cl.alinB&&cl.alinB.includes(idx))?"B":"banquillo";
    const antes=estadoJugadorClub(j).clave;
    j.moralC=clamp((j.moralC==null?70:j.moralC)+moralMinutosDelta(j,rol),5,95);
    const est=estadoJugadorClub(j);
    if(est.clave!==antes&&(est.clave==="exige"||est.clave==="salir")) avisa(`${est.clave==="salir"?"🚪":"😠"} ${j.n}: ${est.txt}`);
  });
  const posC_=miPuesto();
  // Las gradas nuevas hacen que la afición crezca mucho más deprisa
  fansAdd(Math.round((Math.round((cl.fans||0)*.002)+(posC_<=10?25:posC_<=20?8:1))*(cl.reformas.gradas?2.2:1)));
  // Ingresos semanales. La tienda convierte afición en caja (el doble de lo que
  // ya rendían los seguidores), así que cuanto más grande es el club más renta.
  /* Un club vive de sus pistas y su bar todas las semanas, tenga prestigio o
     no. Con 120€ de base un club recién fundado perdía 350€/semana haga lo que
     haga, y ninguna decisión podía arreglarlo. */
  cl.dinero+=420+Math.round(prestigioClub()*10)+(cl.reformas.techada?150:0)
    +Math.round((cl.fans||0)*(cl.reformas.tienda?.03:.01));
  if(cl.sponsor) cl.dinero+=cl.sponsor.sem;
  // el patrocinador principal aparece/mejora con el prestigio
  if(!cl._sponsorCheck||cl._sponsorCheck<temporada()){
    cl._sponsorCheck=temporada();
    const pre=prestigioClub(), tr=pre>=60?4:pre>=35?3:pre>=15?2:1;   // ojo: no llamar `t` (taparía i18n)
    if(!cl.sponsor||cl.sponsor.tier<tr){
      const of=ofertaPatro(tr);
      cl.sponsorOferta={marca:of.marca,sec:of.sec,tier:tr,sem:Math.round(of.sem*1.4),nombre:`${["","Bar","Deportes","","Grupo"][Math.floor(rnd()*5)]} ${of.marca}`.trim()};
      avisa(t("patro_club_av_oferta",{marca:cl.sponsorOferta.marca,tier:tierTxt(tr),sem:cl.sponsorOferta.sem}));
    }
  }
  // los socios pagan cuota, y lo que pagan depende de cómo estén de contentos
  socAsegura(cl);
  cl.dinero+=socIngreso(cl);
  if(cl.humorSocios<25&&!cl._avisoSoc){ cl._avisoSoc=true; avisa(t("soc_av_hartos")); }
  if(cl.humorSocios>=45) cl._avisoSoc=false;
  // los cedidos vuelven cuando toca, y vuelven crecidos
  cesionSemana(cl).forEach(({j,k})=>avisa(t("ces_vuelve",{n:j.n,g:atNombre(k)})));
  cl.dinero-=salariosSemana()-cesionAhorro(cl);
  if(cl.dinero<0) avisa(`⚠ Caja en números rojos (${cl.dinero}€). Los premios y socios tendrán que salvarte.`);
  /* La deuda no puede crecer sola para siempre. A partir de cierto agujero la
     junta interviene: primero vende al mejor que no sea titular, y si aun así
     no se sanea, te destituye. Antes se llegaba a −480.000€ sin que pasara
     nada, y eso convierte la economía en un adorno. */
  const _tope=-Math.max(6000,salariosSemana()*8);
  if(cl.dinero<_tope){
    const _fuera=cl.plantilla
      .map((j,i)=>({j,i}))
      .filter(x=>!cl.alin.includes(x.i)&&!(cl.alinB&&cl.alinB.includes(x.i))&&!x.j.cedido)
      // nunca por debajo de los cuatro que la Copa necesita: vender hasta
      // dejarte sin segunda pareja es empujar al club al pozo, no salvarlo
      .filter(()=>cl.plantilla.length>4)
      .sort((a,b)=>mediaAttrs(b.j.attrs)-mediaAttrs(a.j.attrs))[0];
    if(_fuera){
      const monto=valorClausula(_fuera.j);
      cl.dinero+=monto;
      cl.plantilla.splice(_fuera.i,1);
      cl.alin=cl.alin.map(a=>a>_fuera.i?a-1:a);
      if(cl.alinB){ cl.alinB=cl.alinB.filter(x=>x!==_fuera.i).map(a=>a>_fuera.i?a-1:a); if(cl.alinB.length<2) cl.alinB=null; }
      socMueve(cl,-40,-8);
      avisa(t("clb_venta_forzosa",{n:_fuera.j.n,monto:monto.toLocaleString("es")}));
      noticia("venta",t("clb_venta_forzosa_t"),t("clb_venta_forzosa",{n:_fuera.j.n,monto:monto.toLocaleString("es")}));
    } else if(cl.junta){
      cl.junta.paciencia=Math.min(cl.junta.paciencia,1);
      if(!cl._avisoQuiebra){ cl._avisoQuiebra=true; avisa(t("clb_quiebra")); }
    }
  }
  if((cl.semana-1)%SEMANAS_TEMP===0){
    /* La Copa se cierra antes que nada: es la competición del club. OJO con la
       comparación: aquí `cl.semana` ya se ha incrementado, así que `temporada()`
       devuelve la NUEVA, y la copa que hay que cerrar es la de la anterior. Con
       `===temporada()` no se cerraba nunca: ni campeón, ni premio, ni título. */
    if(cl.copa&&cl.copa.temp===temporada()-1){
      // la tabla se lee de ESA copa, no por la vía normal: pedirla reconstruiría
      // la competición a cero justo antes de mirar quién ha ganado
      const pos=copPuestoDe(cl,cl.copa), premio=copPremio(pos);
      cl.dinero+=premio;
      if(pos===1){
        cl.palmares.push(t("cop_palmares",{t:temporada()}));
        socMueve(cl,320,12);
        avisa(t("cop_fin_campeon",{club:cl.nombre,premio}));
        noticia("titulo",t("cop_hd"),t("cop_fin_campeon",{club:cl.nombre,premio}));
      } else {
        socMueve(cl,pos<=3?90:pos>=7?-120:0,pos<=3?4:pos>=7?-6:0);
        avisa(t("cop_fin_pos",{pos,n:COP_CLUBES,premio}));
      }
    }
    /* Lo que se juzga es el puesto en la Copa de la temporada que acaba, leído
       de esa copa (no por la vía normal, que la reconstruiría a cero). */
    const posFin=(cl.copa&&typeof copPuestoDe==="function")?copPuestoDe(cl,cl.copa):miPuesto();
    const ptsFin=cl.pts;
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
    const J=cl.junta||{objetivo:34,paciencia:2,car:"paciente"};
    const CAR=JUNTAS[juntaClub(cl)];
    // la tacaña se fija en lo que cuesta la plantilla, no en dónde ha quedado
    if(CAR.mirasueldos){
      const sal=cl.plantilla.reduce((n,j)=>n+salarioDe(j),0)+staffSalarios();
      if(sal>Math.max(900,(cl.fans||400)*1.6)) avisa(t("cjun_aviso_sal",{sal}));
    }
    if(posFin<=J.objetivo){
      J.paciencia=CAR.margen;
      cl._juntaOk=(cl._juntaOk||0)+1;
      const bonus=Math.round((3000+Math.max(0,(J.objetivo-posFin))*200)*CAR.prima);
      cl.dinero+=bonus;
      avisa(t("clb_junta_ok",{pos:posFin,obj:J.objetivo,bonus}));
    } else {
      J.paciencia--;
      if(J.paciencia===1) avisa(t("cjun_ultima"));
      if(J.paciencia<=0){
        noticia("hito",t("not_destituido_t"),t("not_destituido_s",{obj:J.objetivo}));
        avisa(t("clb_destituido",{pos:posFin,obj:J.objetivo}));
        cl._despedido=true;
      } else {
        avisa(t("clb_junta_aviso",{obj:J.objetivo,pos:posFin}));
        post("junta");
      }
    }
    // LA INVITACIÓN: a partir del segundo año puede llegar sin avisar
    if(typeof evaluaInvitacionSL==="function"){
      const inv=evaluaInvitacionSL(cl,temporada(),null);
      if(inv){
        cl.invitacionSL=inv;
        noticia("contrato",t("not_sl_invit_t",{club:cl.nombre}),t("not_sl_invit_s"));
        avisa(t("sl_av_llega"));
      }
    }
    J.objetivo=Math.max(1,Math.round(Math.min(posFin,J.objetivo)*CAR.dureza));
    cl.junta=J;
    avisa(t("clb_junta_nuevo",{obj:J.objetivo}));
    evolucionaMundo();
    // los puntos caducan solos a las 52 semanas: no hay recorte de cierre
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
    if(cl.mercado.length>4&&rnd()<.8){
      const qi=Math.floor(rnd()*cl.mercado.length);
      const jj=cl.mercado.splice(qi,1)[0];
      avisa(`📰 ${jj.n} ficha por el ${pick(CLUBES_NPC).n}.`);
    }
    // ...y vienen a por los tuyos (nunca por tu pareja A)
    if(!cl.ofertaRival&&cl.plantilla.length>2&&rnd()<.55){
      // van antes a por los descontentos (los que piden salir), y ofrecen en torno a la cláusula
      const cands=cl.plantilla.map((j,i)=>i).filter(i=>!cl.alin.includes(i));
      if(cands.length){
        const descon=cands.filter(i=>estadoJugadorClub(cl.plantilla[i]).clave==="salir");
        const ji=pick(descon.length?descon:cands), cr=clubAlAzar(), jj=cl.plantilla[ji];
        const quiereIrse=estadoJugadorClub(jj).clave==="salir";
        cl.ofertaRival={clubIdx:cr,jugIdx:ji,monto:Math.round(valorClausula(jj)*R(quiereIrse?.75:.85,1.1))};
        avisa(`📋 El ${CLUBES_NPC[cr].n} ofrece ${cl.ofertaRival.monto}€ por ${jj.n} (cláusula ${valorClausula(jj).toLocaleString("es")}€).${quiereIrse?` ${jj.n} quiere salir: presiona por marcharse.`:""} Decide en Plantilla.`);
      }
    }
    avisa(`— Cierre de temporada ${temporada()-1}. El ranking arrastra el 55% y llegan nuevos agentes libres${cl.staff.ojeador?t("clb_ojeador_extra"):""}.`);
    // la academia cierra su temporada: los de casa crecen, se cansan o se van
    if(cl.academia) evolucionaCantera(cl);
    if(cl.academia&&cl.cantera.length<3){
      // La escuela de tecnificación sube el suelo Y el techo de lo que sale
      const bono=cl.reformas&&cl.reformas.escuela?8:0;
      const j=mkAgente(42+cl.instal*2+bono,50+cl.instal*2+bono,cl.sexo||"M");
      j.edad=Math.round(R(15,17));
      if(bono) j.pot=Math.min(95,(j.pot||60)+6);
      j.aniosCan=0; j.ilusion=CAN_ILUSION0; j.hist=[];
      cl.cantera.push(j);
      avisa(t("clb_academia_presenta",{n:j.n,media:mediaAttrs(j.attrs)}),"ok");
    }
  }
  ofertaStaffSemanal();
  chequeaHitos();
  guardaPosiciones();
  guardar();
  pintarClubM();
}


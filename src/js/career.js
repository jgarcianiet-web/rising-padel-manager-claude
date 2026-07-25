/* ================================================================
   MODO CARRERA
================================================================ */
const CHINO={id:"chino",n:"Chino",estilo:"constructor",perso:"frio",nivel:44,quim:70};
const CHINA={id:"chino",n:"China",estilo:"constructor",perso:"frio",nivel:44,quim:70};
function compiInicial(sx){return {...(sx==="F"?CHINA:CHINO),sexo:sx};}
function ladoCompiOpuesto(){ return (typeof lado==="number"&&lado===1)?0:(typeof lado==="number"&&lado===0)?1:0; }
const ROLES_STAFF={
  entrenador:{n:"Entrenador",salBase:45,ico:"🎾"},
  fisio:{n:"Fisioterapeuta",salBase:55,ico:"🩺"},
  psico:{n:"Psicólogo/a deportivo",salBase:50,ico:"🧠"},
  fisico:{n:"Preparador/a físico",salBase:55,ico:"🏋"},
  rep:{n:"Representante",salBase:70,ico:"💼"},
  ojeador:{n:"Ojeador",salBase:60,ico:"🔭"},
};
const ESP_GRUPOS=[["fondo","globo","pared"],["remate","vibora","bandeja"],["volea","chiquita","dejada"],["remate","volea","fondo"],["bandeja","globo","dejada"]];
const FRASES_STAFF={
  entrenador:["Pizarra vieja, ideas nuevas.","No grita: mira. Y con eso basta.","Formó a media cantera de su región.","Obsesión: que el fácil no se falle."],
  fisio:["Manos de oro, agenda llena.","Detecta la sobrecarga antes que tú.","Sus vendajes son leyenda regional.","Cree en el hielo como otros creen en la suerte."],
  psico:["Convierte el miedo en rutina.","Trabaja el punto siguiente, no el anterior.","Sesiones cortas, cabezas largas.","El tie-break es su oficina."],
  fisico:["Piernas frescas en el tercer set.","Su pretemporada es temida y bendecida.","Mide todo: hasta el sueño.","Contrataciones que se notan en abril."],
  rep:["Tiene el teléfono de todas las marcas.","Negocia como juega: al cuerpo.","Su comisión duele menos que su ausencia.","Vende humo solo cuando hay fuego."],
  ojeador:["Ve el techo donde otros ven el nivel.","Kilómetros y libretas.","Su ojo llega donde no llega el ranking.","Las gangas lo persiguen."],
};
function mkStaff(rol,nivFijo){
  const niv=nivFijo||Math.min(5,Math.max(1,Math.round(R(1,3.6)+(Math.random()<.18?1:0))));
  const sx=Math.random()<.5?"M":"F";
  const nom=`${nombrePorSexo(sx)} ${pick(APELL)}`;
  const st={rol,n:nom,sexo:sx,edad:Math.round(R(30,62)),niv,
    sal:Math.round(ROLES_STAFF[rol].salBase*niv*(1+R(-.12,.15))),
    frase:pick(FRASES_STAFF[rol]||["Profesional contrastado."])};
  if(rol==="entrenador") st.esp=pick(ESP_GRUPOS);
  if(rol==="rep") st.com=Math.max(8,20-niv*2);   // % de comisión: mejor agente, menos muerde
  return st;
}
function rolesDeModo(){ return G.modo==="carrera"?["entrenador","fisio","psico","fisico","rep"]:["entrenador","fisio","psico","fisico","ojeador"]; }
function mkMercadoStaff(){
  const roles=rolesDeModo();
  const m=[];
  // BOLSA DE EMPLEO: varios agentes libres de cada rol (una lista de verdad, no dos)
  roles.forEach(r=>{ const n=r==="entrenador"?4:3; for(let i=0;i<n+(Math.random()<.5?1:0);i++) m.push(mkStaff(r)); });
  // Y TODOS los entrenadores que ya trabajan con parejas del circuito: contactables (con rescisión)
  if(roles.includes("entrenador")&&G.world){
    const pares=G.world.parejas.filter(p2=>(p2.sexo||"M")===miSexo()&&!p2.yo);
    pares.forEach(par=>{
      if(!par._entrenador){
        const nivPar=Math.round((mediaAttrs(par.jug[0].attrs)+mediaAttrs(par.jug[1].attrs))/2);
        const niv=clamp(Math.round(nivPar/18)+(Math.random()<.3?1:0),1,5);
        par._entrenador=Object.assign(mkStaff("entrenador",niv),{equipoDe:par.nombre});
      }
      m.push(par._entrenador);
    });
  }
  return m;
}
function puestoDePareja(nombre){
  const f=rankingFilas().find(x=>x.nombre===nombre);
  return f?f.pos:40;
}
// cláusula escala con el PRESTIGIO de la pareja (su puesto), no con el sueldo del técnico
function clausulaEntrenador(st){
  if(!st.equipoDe) return 0;
  const pos=puestoDePareja(st.equipoDe);
  const tot=rankingFilas().length;
  const prestigio=(tot-pos+1)/tot;                 // 1.0 el nº1, ~0 el último
  // nº1 ~60k, top10 ~25k, media ~6k, cola ~1.2k — al cuadrado para castigar la élite
  const base=1200+Math.round(58000*prestigio*prestigio);
  return base;
}
// ¿aceptaría este técnico venir a MI proyecto? los buenos no bajan de nivel
function aceptaProyecto(st){
  if(!st.equipoDe) return {ok:true};              // agente libre: siempre acepta
  const posEl=puestoDePareja(st.equipoDe);        // dónde trabaja ahora
  const posYo=miPuesto();                          // dónde estoy yo
  const salto=posYo-posEl;                         // >0 = yo estoy peor clasificado
  // no baja más de cierto margen según su nivel (los top son inflexibles)
  const margen=[99,30,20,12,7,4][st.niv]||15;      // niv5 solo baja 4 puestos; niv1 casi cualquiera
  if(salto>margen) return {ok:false,motivo:t("staff_proy_top",{n:st.n,posEl,posYo})};
  // aunque esté en margen, a veces declina (proyecto poco convincente)
  const prob=clamp(.9-salto/(margen*1.6),.25,.97);
  if(Math.random()>prob) return {ok:false,motivo:t("staff_proy_duda",{n:st.n,equipo:st.equipoDe}),reintento:true};
  return {ok:true};
}
function refrescaMercadoStaff(){
  const e=ent(); if(!e) return;
  e.mercadoStaff=mkMercadoStaff();
}
function ofertaStaffSemanal(){
  const e=ent(); if(!e||!e.mercadoStaff) return;
  if(Math.random()>.07) return;
  const calidad=miPuesto()<=10?4:miPuesto()<=20?3:undefined;
  const st=mkStaff(pick(rolesDeModo()),calidad);
  st.seOfrece=true; st.sal=Math.round(st.sal*.82); st.caduca=semanaTemp()+2;
  e.mercadoStaff.unshift(st);
  e.mercadoStaff=e.mercadoStaff.slice(0,14);
  avisa(`📇 ${ROLES_STAFF[st.rol].ico} ${st.n} (${"★".repeat(st.niv)}) se ofrece a trabajar contigo: ${st.sal}€/sem (rebajado). La oferta caduca pronto — pestaña ${G.modo==="carrera"?"STAFF":"Club"}.`);
}
function ficharStaff(idx){
  const e=ent(), st=e.mercadoStaff[idx];
  if(!st) return;
  const prima=st.equipoDe?clausulaEntrenador(st):0;
  // 1) ¿le convence tu proyecto? (los buenos no bajan de nivel)
  if(st.equipoDe){
    const dec=aceptaProyecto(st);
    if(!dec.ok){ avisa(`✗ ${dec.motivo}`); if(!dec.reintento){ /* rechazo duro: se queda visible */ } guardar(); pintarTodo(); return; }
  }
  // 2) ¿llega la caja para la cláusula?
  if(prima&&e.dinero<prima){ avisa(t("staff_av_clausula",{n:st.n,equipo:st.equipoDe,pos:puestoDePareja(st.equipoDe),prima:prima.toLocaleString("es")})); return; }
  if(e.staff[st.rol]) avisa(t("staff_av_relevo",{sale:e.staff[st.rol].n,entra:st.n}));
  if(prima){ e.dinero-=prima; noticia("fichaje",t("not_staff_deja_t",{jug:st.n,equipo:st.equipoDe}),t("not_staff_deja_s",{prima:prima.toLocaleString("es")}),);
    if(G.world){ const par=G.world.parejas.find(p2=>p2.nombre===st.equipoDe); if(par) par._entrenador=null; }
    delete st.equipoDe; }
  e.staff[st.rol]=st;
  e.mercadoStaff.splice(idx,1);
  avisa(t("staff_av_firma",{ico:ROLES_STAFF[st.rol].ico,n:st.n,estrellas:"★".repeat(st.niv),rol:t("rol_"+st.rol).toLowerCase(),sal:st.sal}));
  if(st.niv>=4) post("fichaje");
  guardar(); pintarTodo();
}
function despedirStaff(rol){
  const e=ent(), st=e.staff[rol];
  if(!st) return;
  e.staff[rol]=null;
  avisa(t("staff_av_adios",{n:st.n,sal:st.sal}));
  guardar(); pintarTodo();
}
function pintarTodo(){ if(G.modo==="carrera") pintarCarrera(); else pintarClubM(); }
function renderEquipoStaff(el){
  const e=ent(), roles=rolesDeModo();
  el.innerHTML=roles.map(r=>{
    const st=e.staff[r];
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--borde)">
      <div style="font-size:11.5px">${ROLES_STAFF[r].ico} <b>${st?st.n:"—"}</b> <span style="color:var(--gris2)">· ${t("rol_"+r)}</span>
        ${st?`<div style="font-size:10px;color:var(--gris)">${"★".repeat(st.niv)}${"☆".repeat(5-st.niv)} · ${st.sal}€/sem${st.rol==="rep"?` · ${t("staff_comision",{c:st.com})}`:""}${st.esp?` · ${st.esp.join("/")}`:""}<br><em style="color:var(--gris2)">«${st.frase}»</em></div>`:`<div style="font-size:10px;color:var(--gris2)">${t("staff_vacante")}</div>`}
      </div>
      ${st?`<button style="font-size:10px;padding:3px 7px" onclick="despedirStaff('${r}')">${t("staff_despedir")}</button>`:""}
    </div>`;}).join("");
}
function renderMercadoStaff(el){
  const e=ent();
  if(!e.mercadoStaff) e.mercadoStaff=mkMercadoStaff();
  e.mercadoStaff=e.mercadoStaff.filter(st=>!st.caduca||st.caduca>=semanaTemp());
  // filtro por rol (bolsa grande → pestañas de rol)
  e._staffFiltro=e._staffFiltro||"todos";
  const roles=rolesDeModo();
  const filtroBar=`<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:8px">${["todos",...roles].map(r=>`<button class="selbtn${e._staffFiltro===r?" on":""}" style="font-size:9px;padding:4px 6px" onclick="ent()._staffFiltro='${r}';${G.modo==="carrera"?"pintarCarrera":"pintarClubM"}()">${r==="todos"?t("staff_todos"):ROLES_STAFF[r].ico+" "+t("rol_"+r).split("/")[0]}</button>`).join("")}</div>`;
  let listaVis=e.mercadoStaff.filter(st=>e._staffFiltro==="todos"||st.rol===e._staffFiltro);
  listaVis=listaVis.slice().sort((a,b)=>(a.equipoDe?1:0)-(b.equipoDe?1:0)||b.niv-a.niv);
  if(!listaVis.length){ el.innerHTML=filtroBar+`<div class="foot" style="text-align:left">${t("staff_nadie")}</div>`; return; }
  el.innerHTML=filtroBar+`<div class="foot" style="text-align:left;margin-bottom:6px">${t("staff_bolsa",{n:listaVis.length})}</div>`+listaVis.map((st)=>{const i=e.mercadoStaff.indexOf(st);return `
    <div class="opcion" style="padding:8px">
      <div style="font-size:11.5px">${ROLES_STAFF[st.rol].ico} <b>${st.n}</b>, ${st.edad} <span class="pill">${t("rol_"+st.rol)}</span> ${st.seOfrece?`<span class="pill" style="color:var(--lima)">${t("staff_se_ofrece")}</span>`:""}${st.equipoDe?`<span class="pill" style="color:var(--oro)">${t("staff_entrena_a",{pos:puestoDePareja(st.equipoDe),equipo:st.equipoDe})}</span>`:""}</div>
      <div style="font-size:10px;color:var(--gris);margin:3px 0">${"★".repeat(st.niv)}${"☆".repeat(5-st.niv)} · ${st.sal}€/sem${st.rol==="rep"?` · ${t("staff_comision",{c:st.com})}`:""}${st.esp?` · ${t("staff_especialista",{lista:st.esp.join(", ")})}`:""} · <em>«${st.frase}»</em>${st.equipoDe?(()=>{const cl=clausulaEntrenador(st);const alcanza=miPuesto()-puestoDePareja(st.equipoDe)<=([99,30,20,12,7,4][st.niv]||15);return `<br><span style="color:var(--oro)">${t("staff_clausula",{cl:cl.toLocaleString("es")})}</span>${alcanza?"":` <span style="color:#E05656">${t("staff_fuera_alcance")}</span>`}`;})():""}</div>
      ${st.equipoDe?(()=>{const cl=clausulaEntrenador(st);const alcanza=miPuesto()-puestoDePareja(st.equipoDe)<=([99,30,20,12,7,4][st.niv]||15);return `<button style="width:100%;font-size:11px" onclick="ficharStaff(${i})"${(!alcanza||e.dinero<cl)?' disabled':''}>${!alcanza?t("staff_no_aceptaria"):e.dinero<cl?t("staff_clausula_sin_caja",{cl:cl.toLocaleString("es")}):t("staff_negociar",{cl:cl.toLocaleString("es")})}</button>`;})():`<button style="width:100%;font-size:11px" onclick="ficharStaff(${i})">${t("staff_contratar",{sal:st.sal})}</button>`}
    </div>`;}).join("");
}
function entrenadorActual(){
  const e=ent();
  return (e&&e.staff&&e.staff.entrenador)||{n:"Sin entrenador",sal:0,esp:[],niv:0,frase:"Tu plan y tu instinto."};
}
function staffNiv(rol){ const e=ent(); return (e&&e.staff&&e.staff[rol])?(e.staff[rol].niv||2):0; }
const ENTRENADORES=[
  {id:0,n:"Sin entrenador",sal:0,esp:[],desc:"Tu plan y tu instinto. Nadie te corrige."},
  {id:1,n:"Míster del club",sal:60,esp:["fondo","globo","pared"],desc:"Viejo zorro de la defensa: fondo, globo y pared."},
  {id:2,n:"Ex profesional ofensivo",sal:160,esp:["remate","vibora","bandeja"],desc:"Vivió de la bandeja y la víbora. Ataque puro."},
  {id:3,n:"Maestra técnica",sal:160,esp:["volea","chiquita","dejada"],desc:"El toque: volea, chiquita y dejada de manual."},
];
/* Del bar de la esquina a la multinacional: cuatro escalones de patrocinio */
const MARCAS=[
  // tier 1 · el barrio
  {n:"Paletería Rincón",tier:1,sec:"tienda de palas del barrio"},
  {n:"Bar Manolo",tier:1,sec:"el bar de la esquina"},
  {n:"Ferretería El Clavo",tier:1,sec:"ferretería de toda la vida"},
  {n:"Gimnasio Hierro Viejo",tier:1,sec:"gimnasio de barrio"},
  {n:"Autoescuela Volante",tier:1,sec:"autoescuela local"},
  {n:"Kebab Estrella",tier:1,sec:"el kebab de después de entrenar"},
  // tier 2 · marca nacional
  {n:"RisingWear",tier:2,sec:"ropa deportiva nacional"},
  {n:"VoltIso",tier:2,sec:"bebida isotónica"},
  {n:"PalaTech",tier:2,sec:"palas de gama media"},
  {n:"Seguros Peninsular",tier:2,sec:"aseguradora nacional"},
  {n:"Colchones Morfeo",tier:2,sec:"descanso deportivo"},
  {n:"Gasolineras Petro-Lite",tier:2,sec:"red de gasolineras"},
  // tier 3 · gigante del deporte
  {n:"Toropádel",tier:3,sec:"palas de élite"},
  {n:"Cabeza Sport",tier:3,sec:"multinacional de raqueta"},
  {n:"Knoxx",tier:3,sec:"palas profesionales"},
  {n:"Adipala",tier:3,sec:"gigante deportivo"},
  {n:"Babolate",tier:3,sec:"marca histórica de raqueta"},
  {n:"Banco Meridional",tier:3,sec:"banca deportiva"},
  {n:"Peña El Revés",tier:1,sec:"peña padelística local"},
  {n:"Panadería La Miga",tier:1,sec:"la panadería de abajo"},
  // tier 2 · marca nacional
  {n:"Deportes Zabala",tier:2,sec:"cadena de deportes"},
  {n:"Clínica FisioVida",tier:2,sec:"clínica de fisioterapia"},
  // tier 3 · gigante del deporte
  {n:"Puwma",tier:3,sec:"multinacional del felino"},
  {n:"Relojes Tissec",tier:3,sec:"relojería suiza"},
  // tier 4 · multinacional global
  {n:"Colavola",tier:4,sec:"el refresco de siempre"},
  {n:"RedToro",tier:4,sec:"bebida energética global"},
  {n:"Nikke",tier:4,sec:"el gigante del swoosh"},
  {n:"Catarí Airways",tier:4,sec:"aerolínea del Golfo"},
  {n:"Movistrella",tier:4,sec:"teleco multinacional"},
  {n:"Amazonia Prime",tier:4,sec:"tecnológica global"},
  {n:"Rolox",tier:4,sec:"lujo de alta gama"},
  {n:"Emiratos Fly",tier:4,sec:"aerolínea de bandera"},
];
const SPOT_TIPOS=["spot_1","spot_2","spot_3","spot_4","spot_5","spot_6"];   // claves i18n; los guardados antiguos llevan el texto literal (t() lo devuelve tal cual)
/* catálogo de primas por objetivos (se cobran una vez al lograrse, mientras dure el contrato) */
const PRIMAS_CAT={
  2:[["titP","Primer título Premier",1200],["racha10","Racha de 10 victorias",800],["top20","Cerrar en el top 20",900]],
  3:[["titP","Título Premier",3000],["top10","Entrar en el top 10",4000],["racha10","Racha de 10 victorias",2000],["major","Ganar un Major",8000]],
  4:[["major","Ganar un Major",20000],["top10","Top 10 mundial",10000],["n1","Cerrar como Nº1",50000],["titP","Título Premier",6000]],
};
const TIER_TXT={1:"MARCA DE BARRIO",2:"MARCA NACIONAL",3:"GIGANTE DEL DEPORTE",4:"MULTINACIONAL"};
function ofertaPatro(tier){
  const m=pick(MARCAS.filter(x=>x.tier===tier));
  const base={1:{sem:120,bonus:500,objetivo:34},2:{sem:350,bonus:1500,objetivo:20},3:{sem:900,bonus:4000,objetivo:11},4:{sem:2400,bonus:12000,objetivo:5}}[tier];
  const dur=tier>=3?pick([2,3,3]):pick([1,2,2]);
  const of={marca:m.n,sec:m.sec,tier,sem:base.sem,bonus:base.bonus,objetivo:base.objetivo,tRest:dur,durTotal:dur,primas:[],primasCobradas:{},spots:0};
  const cat=PRIMAS_CAT[tier]||[];
  if(cat.length){
    const n=tier>=3?2:1;
    const pool=[...cat];
    for(let i=0;i<n&&pool.length;i++){ of.primas.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); }
  }
  return of;
}
/* mercado de parejas: agentes libres + jugadores del circuito dispuestos a escucharte */
function mkLibre(nivMin,nivMax,sx){
  const est=pick(Object.keys(ESTILOS));
  const nivel=Math.round(R(nivMin,nivMax));
  sx=sx||"M";
  const apodo=Math.random()<.28?` «${pick(APODOS)}»`:"";
  return {n:nombrePorSexo(sx)+apodo+" "+pick(APELL),pais:pickPais(),sexo:sx,origen:"libre",estilo:est,perso:pick(Object.keys(PERSONALIDADES)),attrs:mkAttrsNivel(nivel,est)};
}
function mkMercadoParejas(){
  const c=G.carrera, pos=miPuesto(), lista=[];
  const miNivel=mediaAttrs(c.attrs), miSexo=c.sexo||"M";
  for(let i=0;i<3;i++) lista.push(mkLibre(Math.max(42,miNivel-8),miNivel+8,miSexo));
  // 2 jugadores de parejas del circuito del MISMO SEXO: solo escuchan si estás mejor o parecido
  const filas=rankingFilas();
  const cand=G.world.parejas.filter(p=>!p.retiraT&&(p.sexo||"M")===miSexo).map(p=>({p,pos:filas.find(f=>f.id===p.id).pos}))
    .filter(x=>x.pos>pos-4).sort(()=>Math.random()-.5).slice(0,2);
  cand.forEach(x=>{
    const idx=Math.random()<.5?0:1, j=x.p.jug[idx];
    lista.push({n:j.n,pais:j.pais,origen:"circuito",worldId:x.p.id,jugIdx:idx,estilo:j.estilo,perso:j.perso,attrs:{...j.attrs},parejaNombre:x.p.nombre,parejaPos:x.pos});
  });
  return lista;
}
function primaFichaje(cand){const n=mediaAttrs(cand.attrs);return Math.round(n*n*1.2+(cand.origen==="circuito"?1000:0));}

let AVA_EDIT={piel:0,pelo:0,tipoPelo:0,barba:0,gafas:0};
function avaJugPreview(){
  return {n:document.getElementById("inNombre")?document.getElementById("inNombre").value:"J",sexo:sexoSel,_ropa:colorSel,ava:{...AVA_EDIT}};
}
function ciclaAva(campo,dir,mod){ AVA_EDIT[campo]=((AVA_EDIT[campo]||0)+dir+mod)%mod; pintarAvaEditor(); }
function pintarAvaEditor(){
  const pv=document.getElementById("avaPreview"); if(!pv) return;
  pv.innerHTML=avatarSVG(avaJugPreview(),72);
  const ctrls=document.getElementById("avaCtrls");
  const campos=[["piel","Piel",AVA_PIEL.length],["pelo","Pelo",AVA_PELO.length],["tipoPelo","Peinado",5],["gafas","Gafas",2],["barba","Barba",2]];
  ctrls.innerHTML=campos.map(([c,lbl,mod])=>`<button class="selbtn" style="font-size:10px;padding:5px 4px" onclick="ciclaAva('${c}',1,${mod})">${lbl} ▸</button>`).join("")+`<button class="selbtn" style="font-size:10px;padding:5px 4px" onclick="AVA_EDIT={piel:(hashStr(document.getElementById('inNombre').value+Math.random()))%5,pelo:Math.floor(Math.random()*AVA_PELO.length),tipoPelo:Math.floor(Math.random()*5),gafas:Math.random()<.2?1:0,barba:Math.random()<.25?1:0};pintarAvaEditor();">🎲 Aleatorio</button>`;
}
function pintarCrear(){
  pintarAvaEditor();
  const cont=document.getElementById("colores");
  cont.innerHTML="";
  COLORES.forEach(c=>{
    const b=document.createElement("button");
    b.style.background=c;b.style.minHeight="34px";b.style.color="#10141C";b.textContent=colorSel===c?"✓":"";
    b.onclick=()=>{colorSel=c;pintarCrear();};
    cont.appendChild(b);
  });
  const pc=document.getElementById("persos");
  pc.innerHTML="";
  Object.entries(PERSONALIDADES).forEach(([k,p])=>{
    const b=document.createElement("button");
    b.className="selbtn"+(persoSel===k?" on":"");
    b.style.fontSize="11px";b.textContent=persoNombre(k);
    b.onclick=()=>{persoSel=k;document.getElementById("persoDesc").textContent=persoDesc(k);pintarCrear();};
    pc.appendChild(b);
  });
  const est=document.getElementById("estilos");
  est.innerHTML="";
  Object.entries(ESTILOS).forEach(([k,e])=>{
    const d=document.createElement("div");
    d.className="opcion";
    d.innerHTML=`<b>${estiloNombre(k)}</b> <span class="pill">media ${mediaAttrs(e.attrs)}</span><div class="d">${estiloDesc(k)}</div>`;
    const b=document.createElement("button");
    b.className="pri";b.style.width="100%";b.textContent=t("btn_debutar",{x:estiloNombre(k).toLowerCase()});
    b.onclick=()=>empezarCarrera(k);
    d.appendChild(b);
    est.appendChild(d);
  });
  document.getElementById("ladoRev").onclick=()=>{lado=0;marcaLado();};
  document.getElementById("ladoDer").onclick=()=>{lado=1;marcaLado();};
  document.getElementById("sexoM").onclick=()=>{sexoSel="M";marcaSexo();pintarAvaEditor();};
  document.getElementById("sexoF").onclick=()=>{sexoSel="F";marcaSexo();pintarAvaEditor();};
  document.getElementById("inNombre").oninput=()=>pintarAvaEditor();
  marcaSexo();
}
function marcaLado(){
  document.getElementById("ladoRev").className="selbtn"+(lado===0?" on":"");
  document.getElementById("ladoDer").className="selbtn"+(lado===1?" on":"");
}
function marcaSexo(){
  document.getElementById("sexoM").className="selbtn"+(sexoSel==="M"?" on":"");
  document.getElementById("sexoF").className="selbtn"+(sexoSel==="F"?" on":"");
}
function empezarCarrera(estiloKey){
  if(lado===null){lado=0;marcaLado();}
  if(persoSel===null) persoSel="frio";
  const nombre=document.getElementById("inNombre").value.trim()||"Jugador";
  G={v:1,modo:"carrera",dif:difMenu(),world:mkWorld(),clubG:null,carrera:{
    nombre,estilo:estiloKey,perso:persoSel,lado,color:colorSel,ava:{...AVA_EDIT},_ropa:colorSel,
    attrs:{...ESTILOS[estiloKey].attrs},
    semana:1,edad:16,pts:0,dinero:2500,energia:100,conf:55,
    sexo:sexoSel,planJug:"auto",dia:1,_sesEntreno:0,fans:120,social:[],
    compi:{...compiInicial(sexoSel),attrs:mkAttrsNivel(CHINO.nivel,CHINO.estilo)},quimica:CHINO.quim,
    compiMoral:70,racha:[],mercadoP:null,sponsor:null,ofertasPatro:[],staff:{entrenador:null,rep:null,fisio:null,psico:null,fisico:null},mercadoStaff:null,_staffV2:1,
    wildcards:2,
    entrenador:0,lesion:null,merma:null,fragil:0,pro:false,
    palmares:[],diario:[],h2h:{},_rivalesSemana:[]
  }};
  G.carrera.mercadoP=mkMercadoParejas();
  G.carrera.objetivos=mkObjetivosTemporada(G.carrera,miPuesto());
  avisa(`Debut de ${nombre} (16 años, ${estiloNombre(estiloKey).toLowerCase()}, ${persoNombre(persoSel).toLowerCase()}). Semanas de lunes a domingo, calendario oficial de 52 semanas y el puesto 41 del ranking como punto de partida. Administra tus 2.500€.`);
  noticia("debut",t("not_debut_t",{nombre}),t("not_debut_s"));
  entrarPartida();
  verTuto("carrera");
}

["semana","entreno","staff","jugador","ranking","diario"].forEach(t=>{
  document.getElementById("tab"+t[0].toUpperCase()+t.slice(1)).onclick=()=>{
    tabActiva=t;
    ["semana","entreno","staff","jugador","ranking","diario"].forEach(x=>{
      document.getElementById("tab-"+x).classList.toggle("oculto",x!==t);
      document.getElementById("tab"+x[0].toUpperCase()+x.slice(1)).classList.toggle("on",x===t);
    });
    pintarCarrera();
  };
});

// Se rompe la pareja: el compañero se va y Chino/China vuelve al rescate.
function rompeConCompi(c){
  const ex=c.compi.n;
  const protRup={jug:[{n:c.nombre,sexo:c.sexo,_ropa:"#C6F53C"},{n:ex,sexo:c.sexo}]};
  c.compi={...compiInicial(c.sexo||"M"),attrs:mkAttrsNivel(CHINO.nivel,CHINO.estilo)};
  c.quimica=CHINO.quim;c.compiMoral=70;c.compiPlan="auto";c._crisisPareja=null;
  noticia("ruptura",t("not_ruptura_t",{ex}),t("not_ruptura_s",{compi:c.sexo==="F"?"China":"Chino"}),protRup);
  avisa(t("rup_av_rompe",{ex,compi:c.sexo==="F"?"China":"Chino"}));
}
// Evento de ruptura VISIBLE: el compañero expone su motivo y tú eliges cómo
// reconducirlo (o dejarlo ir). Sustituye a la vieja ruptura por umbral en seco.
function mostrarRuptura(c){
  const ev=c._crisisPareja; if(!ev||!ev.crisis){ c._crisisPareja=null; return; }
  const ov=document.getElementById("ruptModal")||(()=>{const d=document.createElement("div");d.id="ruptModal";d.style.cssText="position:fixed;inset:0;background:rgba(10,13,19,.93);z-index:82;display:flex;align-items:center;justify-content:center;padding:16px";document.body.appendChild(d);return d;})();
  const botones=ev.ops.map(o=>`<button class="${o.id==="dejar"?"":"pri"}" style="width:100%;text-align:left;margin-top:7px;line-height:1.35" data-op="${o.id}"><b>${o.txt}</b><div style="font-size:11px;color:${o.id==="dejar"?"var(--gris)":"rgba(0,0,0,.7)"};font-weight:400;margin-top:2px">${o.desc}</div></button>`).join("");
  ov.innerHTML=`<div class="card" style="max-width:440px;width:100%">
    <h3 style="margin-top:0">${t("rup_titulo",{n:c.compi.n})}</h3>
    <div style="font-size:12.5px;color:var(--gris);line-height:1.5;margin-bottom:4px">${ev.motivo.txt}</div>
    <div class="foot" style="text-align:left;margin-bottom:6px">${t("rup_moral",{m:c.compiMoral})}</div>
    ${botones}</div>`;
  ov.querySelectorAll("button[data-op]").forEach(b=>b.onclick=()=>{
    const res=aplicarOpcionRuptura(c,b.getAttribute("data-op"),ev.motivo);
    quitarEl(ov);
    if(res.rompio){ rompeConCompi(c); }
    else { c._crisisPareja=null; avisa("🤝 "+res.txt); }
    guardar(); pintarCarrera();
  });
}
// Panel de objetivos de la temporada con su progreso (barra + estado).
function pintarObjetivos(){
  const box=document.getElementById("objTemp"); if(!box) return;
  const c=G.carrera; if(!c) return;
  if(!c.objetivos) c.objetivos=mkObjetivosTemporada(c,miPuesto());
  box.innerHTML=`<div class="foot" style="text-align:left;margin:-2px 0 8px" title="${difDesc(difId())}">${t("dif_label")}: <b style="color:var(--lima)">${dif().emoji} ${difNombre(difId())}</b></div>`+c.objetivos.map(o=>{
    const pr=progresoObjetivo(c,o,miPuesto());
    const rec=o.rec?[o.rec.dinero?`+${o.rec.dinero}€`:"",o.rec.fans?t("obj_seg",{n:o.rec.fans}):"",o.rec.moral?t("obj_moral_rec",{n:o.rec.moral}):""].filter(Boolean).join(" · "):"";
    return `<div class="opcion" style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <b style="font-size:12px">${o.hecho?"✅":"○"} ${o.txt}</b>
        <span class="pill" style="color:${o.hecho?"var(--verde)":"var(--gris)"}">${pr.txt}</span>
      </div>
      ${rec?`<div class="foot" style="text-align:left;margin-top:2px">${t("obj_recompensa",{rec})}</div>`:""}
    </div>`;
  }).join("");
}
// Evento de dilema: decisión con consecuencia diferida (se encola para semanas después).
function mostrarDilema(c){
  const d=(typeof _dilemaPorId==="function")&&c.dilemaActivo&&_dilemaPorId(c.dilemaActivo.id);
  if(!d){ c.dilemaActivo=null; return; }
  const ov=document.getElementById("dilModal")||(()=>{const x=document.createElement("div");x.id="dilModal";x.style.cssText="position:fixed;inset:0;background:rgba(10,13,19,.93);z-index:82;display:flex;align-items:center;justify-content:center;padding:16px";document.body.appendChild(x);return x;})();
  const val=v=>typeof v==="function"?v(c):v;   // txt/desc pasan por t() (i18n)
  const botones=d.ops.map((o,i)=>`<button class="${i===d.ops.length-1&&d.ops.length>1?"":"pri"}" style="width:100%;text-align:left;margin-top:7px;line-height:1.35" data-op="${i}"><b>${val(o.txt)}</b><div style="font-size:11px;color:${(i===d.ops.length-1&&d.ops.length>1)?"var(--gris)":"rgba(0,0,0,.7)"};font-weight:400;margin-top:2px">${val(o.desc)}</div></button>`).join("");
  ov.innerHTML=`<div class="card" style="max-width:460px;width:100%">
    <h3 style="margin-top:0">⚖ ${(typeof d.titulo==="function"?d.titulo(c):d.titulo)}</h3>
    <div style="font-size:12.5px;color:var(--gris);line-height:1.5;margin-bottom:8px">${(typeof d.texto==="function"?d.texto(c):d.texto)}</div>
    ${botones}</div>`;
  ov.querySelectorAll("button[data-op]").forEach(b=>b.onclick=()=>{
    const res=aplicarOpcionDilema(c,parseInt(b.getAttribute("data-op"),10),c.semana);
    quitarEl(ov);
    if(res){ avisa(`⚖ ${val(res.op.txt)}.${res.pend?t("dil_consec"):""}`); }
    guardar(); pintarCarrera();
  });
}
function pintarCarrera(){
  const c=G.carrera;
  if(c._crisisPareja&&typeof document!=="undefined"&&document.body&&!document.getElementById("ruptModal")) setTimeout(()=>mostrarRuptura(c),350);
  else if(c.dilemaActivo&&typeof document!=="undefined"&&document.body&&!document.getElementById("dilModal")) setTimeout(()=>mostrarDilema(c),350);
  document.getElementById("topCtx").innerHTML=`<b>${t("ctx_temporada")} ${temporada()}</b> · S${semanaTemp()}/${SEMANAS_TEMP} · ${c.sexo==="F"?t("ctx_circuito_f"):t("ctx_circuito_m")}<br>${c.nombre}, ${c.edad} ${t("ctx_anios")} · 🎟×${c.wildcards||0} · ${t("ctx_forma")} ${rachaHtml(c.racha)}`;
  const nOf=(c.ofertasPatro||[]).length;
  document.getElementById("tabJugador").innerHTML=`${t("nav_jugador")}${nOf?` <span style="color:var(--lima)">●</span>`:""}`;
  document.getElementById("kSem").textContent="S"+semanaTemp();
  document.getElementById("kRank").textContent="#"+miPuesto();
  document.getElementById("kPts").textContent=c.pts;
  document.getElementById("kDin").textContent=c.dinero+"€";
  const kE=document.getElementById("kEne");
  kE.textContent=c.energia;
  kE.style.color=c.energia<30?"var(--rojo)":c.energia<60?"var(--oro)":"var(--verde)";
  document.getElementById("kDin").style.color=c.dinero<0?"var(--rojo)":"";
  document.getElementById("proBanner").classList.toggle("oculto",!c.pro);
  if(tabActiva==="semana") pintarSemana();
  if(tabActiva==="entreno") pintarEntreno();
  if(tabActiva==="staff"){
    renderEquipoStaff(document.getElementById("equipoStaff"));
    renderMercadoStaff(document.getElementById("mercadoStaff"));
    const cst=Object.keys(ent().staff||{}).reduce((x,k)=>x+((ent().staff[k]&&ent().staff[k].sal)||0),0);
    document.getElementById("staffCoste").textContent=t("staff_coste",{cst});
  }
  if(tabActiva==="jugador"){pintarJugador();renderHitos(document.getElementById("hitos"));renderRivalidades(document.getElementById("rivalidades"));}
  if(tabActiva==="ranking"){renderRanking(document.getElementById("tablaRk"));renderClubes(document.getElementById("tablaClubes"));renderN1(document.getElementById("n1hist"));renderRecords(document.getElementById("records"));}
  if(tabActiva==="diario"){renderNoticias(document.getElementById("feedNoti"));renderDiario(document.getElementById("diario"),document.getElementById("palmares"));renderSocial(document.getElementById("social"));renderTrayectoria(document.getElementById("trayec"));}
}
function pintarEventosSemana(td, disponible, motivoNo){
  const slot=slotSemana(semanaTemp());
  const lista=[];
  if(slot.premier!==undefined) lista.push(slot.premier);
  lista.push(slot.fip);
  const pos=miPuesto();
  lista.forEach(ci=>{
    const cat=CATS[ci], ent2=entradaEn(ci);
    const tag=cat.premier?'<span class="pill oro">PREMIER</span>':'<span class="pill lima">FIP</span>';
    const d=document.createElement("div");d.className="opcion";
    if(ent2===-1){
      const wc=ent().wildcards||0;
      d.innerHTML=`<b>${cat.n}</b> ${tag}<div class="d">${cat.tf?`Reservado al <b>top 8</b> de la temporada — sois #${pos}. Sin previas ni wildcards: hay que ganárselo.`:`Corte de inscripción: top ${cat.cupoP} del ranking — sois #${pos}. ${cat.premier?`Puedes usar una <b>wildcard</b> para entrar por la previa (te quedan ${wc} este año).`:"Suma puntos en el circuito FIP para entrar."}`}</div>`;
      if(cat.premier&&!cat.tf&&wc>0){
        const b=document.createElement("button");
        b.className="pri";b.style.width="100%";
        b.textContent=`Usar wildcard → previa del ${cat.n} (${wc} restantes)`;
        b.disabled=!disponible||wc<=0;
        if(wc<=0) b.textContent=`Sin wildcards este año`;
        b.onclick=()=>{
          if(ent().wildcards<=0){ avisa("No te quedan wildcards esta temporada."); return; }
          const viaje=costeViaje(ci);
          if(ent().dinero<viaje){ avisa(`✗ No hay caja para el viaje a ${cat.n} (${viaje}€).`); return; }
          ent().wildcards--;
          avisa(`🎟 Wildcard usada: entráis a la previa del ${cat.n}. Quedan ${ent().wildcards}.`);
          abrirTorneo(ci,true);
        };
        d.appendChild(b);
      }
      td.appendChild(d);return;
    }
    const modo=cat.tf
      ?`<b>Solo el top 8</b> de la temporada. Cuadro de maestros: cuartos, semis y final.`
      :ent2===2
      ?`Vuestro ranking (#${pos}) os mete <b>directos al cuadro final</b>: 4 partidos hasta el título.`
      :`Entráis por la <b>previa clasificatoria</b>: hasta 6 partidos.`;
    const slotE=slotSemana(semanaTemp());
    const sede=(cat.premier&&slotE.premier===ci)?`${slotE.ciudad}`:"sede nacional";
    const viaje=costeViaje(ci);
    d.innerHTML=`<b>${cat.n}</b> ${tag} <span class="pill">📍 ${sede}</span> <span class="pill">viaje ${viaje}€</span> <span class="pill">campeón ${cat.premio[0]}€</span><div class="d">${modo}</div>`;
    const b=document.createElement("button");
    b.className=cat.premier?"pri":"azul";b.style.width="100%";
    const sinCaja=ent().dinero<viaje;
    b.textContent=sinCaja?`Sin caja para el viaje (${viaje}€)`:`Inscribirse: ${cat.n} (${viaje}€ de viaje)`;
    b.disabled=!disponible||sinCaja;
    b.onclick=()=>abrirTorneo(ci);
    d.appendChild(b);td.appendChild(d);
  });
  if(!disponible){const p=document.createElement("div");p.className="foot";p.textContent=motivoNo;td.appendChild(p);}
  const sep=document.createElement("div");sep.className="foot";sep.textContent="— o dedica la semana a entrenar —";sep.style.margin="8px 0";td.appendChild(sep);
}
function pintarSemana(){
  const c=G.carrera;
  const dia=c.dia||1, esT=esSemanaTorneo();
  document.getElementById("semTitulo").innerHTML=c.lesion?`${t("sem_baja")} · <em>${c.lesion.n} (${c.lesion.sem} ${t("sem_abrev")})</em>`:`${t("kpi_semana")} ${semanaTemp()} · <em>${diaNombre(dia-1).toUpperCase()}</em>`+(c.merma?` · <span style="color:#E0A030">${t("sem_mermado")} -${c.merma.pct}% (${c.merma.sem} ${t("sem_abrev")})</span>`:"");
  pintarObjetivos();
  const td=document.getElementById("torneosDisp");td.innerHTML="";
  // tira lunes-domingo
  const ds=document.createElement("div");ds.className="diastrip";
  for(let d=1;d<=7;d++){
    const cel=document.createElement("div");
    let cls="diacel"+(d===dia?" hoy":"")+(d<dia?" pasado":"");
    let txt=DIAS[d-1].slice(0,3).toUpperCase();
    if(torneo&&d>=dia){
      for(let f2=torneo.fase;f2<6;f2++) if(d===diaDeFase(f2)){cls+=" partido";txt=(f2===torneo.fase?"🎾":"·")+txt;break;}
    }
    cel.className=cls;cel.textContent=txt;
    ds.appendChild(cel);
  }
  td.appendChild(ds);
  // contexto del día
  if(torneo){
    const dPart=diaDeFase(torneo.fase);
    const d=document.createElement("div");d.className="opcion";
    if(dia===dPart){
      const r=torneo.rivales[torneo.fase];
      d.innerHTML=`<b>HOY: ${faseNombre(torneo.fase)}</b> <span class="pill oro">${torneo.nombre}</span><div class="d">Rival: ${r.nombre} (nivel ${nivelPareja(r)}).</div>`;
    } else {
      d.innerHTML=`<b>En el ${torneo.nombre}</b><div class="d">Próxima ronda: ${faseNombre(torneo.fase).toLowerCase()} el ${DIAS[dPart-1]}. Hasta entonces, cada día decides: entrenar o descansar.</div>`;
    }
    td.appendChild(d);
  } else if(esT&&dia===1&&!c.lesion){
    const info=document.createElement("div");info.className="foot";info.style.textAlign="left";info.style.marginBottom="6px";
    info.textContent="LUNES: día de inscripciones. Si lo dejas pasar, la semana es toda tuya.";
    td.appendChild(info);
    pintarEventosSemana(td, c.energia>=30, "Necesitas 30 de energía para competir.");
  } else if(!esT||dia>1){
    const info=document.createElement("div");info.className="foot";info.style.textAlign="left";info.style.marginBottom="6px";
    info.textContent=dia===1?"Semana sin torneo disponible para vosotros.":"Las inscripciones cerraron el lunes. Semana de trabajo en casa.";
    td.appendChild(info);
  }
  // ===== ACCIONES DEL DÍA (siempre visibles) =====
  const ac=document.getElementById("accionesDia");ac.innerHTML="";
  const tit=document.createElement("div");tit.className="foot";tit.style.textAlign="left";tit.style.margin="4px 0 6px";
  tit.innerHTML=`¿Qué haces HOY, ${DIAS[dia-1]}? · sesiones de entreno esta semana: <b style="color:var(--lima)">${c._sesEntreno||0}</b>/5`;
  ac.appendChild(tit);
  const fila=document.createElement("div");fila.className="fila";
  const esDiaPartido=torneo&&dia===diaDeFase(torneo.fase);
  if(esDiaPartido){
    const bJ=document.createElement("button");bJ.className="pri";bJ.style.flex="1.4";
    bJ.textContent=`🎾 Jugar: ${faseNombre(torneo.fase)}`;
    bJ.onclick=()=>{pintarTorneo();irA("torneo");};
    fila.appendChild(bJ);
  }
  const bE=document.createElement("button");
  bE.textContent="🏋 Entrenar hoy";
  bE.disabled=!!c.lesion||esDiaPartido||c.energia<10;
  bE.title=c.lesion?"De baja: solo fisioterapia":esDiaPartido?"Hoy toca partido":"Sesión según tu plan (pestaña Entreno)";
  bE.onclick=()=>entrenarDia();
  fila.appendChild(bE);
  if(c._spot&&(!c._spot.caduca||c._spot.caduca>=semanaTemp())&&!esDiaPartido&&!c.lesion){
    const bSpot=document.createElement("button");
    bSpot.style.flex="1.2";
    bSpot.textContent=`🎬 Rodar (+${c._spot.pago}€)`;
    bSpot.title=`${c._spot.tipo||"Rodaje"} para ${c._spot.marca}`;
    bSpot.onclick=()=>{
      const sp=c._spot; c._spot=null;
      c.dinero+=sp.pago;
      if(c.sponsor) c.sponsor.spots=(c.sponsor.spots||0)+1;
      fansAdd(sp.fans||Math.round(R(80,220)),`salir en ${sp.tipo||"el anuncio"}`);
      noticia("contrato",t("not_anuncio_t",{marca:sp.marca,tipo:sp.tipo?t(sp.tipo):t("not_anuncio_default")}),t("not_anuncio_s",{entidad:nombreEntidad().replace("★ ","")}));
      avisa(t("spot_av_hecho",{tipo:sp.tipo?t(sp.tipo):t("spot_rodaje"),marca:sp.marca,pago:sp.pago}));
      post("picante");
      avanzarDia();
    };
    fila.appendChild(bSpot);
  }
  if(c._spot&&c._spot.caduca&&c._spot.caduca<semanaTemp()) c._spot=null;
  const bD=document.createElement("button");bD.className="azul";
  bD.textContent=c.lesion?"🏥 Fisio hoy":"😴 Descansar hoy";
  bD.disabled=esDiaPartido&&!c.lesion;
  bD.title=esDiaPartido?"Hoy toca partido: el torneo no espera":"";
  bD.onclick=()=>descansarDia();
  fila.appendChild(bD);
  ac.appendChild(fila);
  if(torneo&&dia<diaDeFase(torneo.fase)){
    const bS=document.createElement("button");bS.style.width="100%";bS.style.marginTop="6px";
    bS.textContent=`⏩ Saltar al ${DIAS[diaDeFase(torneo.fase)-1]} (descansando)`;
    bS.onclick=()=>{while(G.carrera.dia<diaDeFase(torneo.fase)){G.carrera.energia=clamp(G.carrera.energia+5,0,100);G.carrera.dia++;}guardar();pintarCarrera();};
    ac.appendChild(bS);
  }
  const nota=document.createElement("div");nota.className="foot";nota.style.textAlign="left";nota.style.marginTop="6px";
  nota.textContent="El plan de entrenamiento (golpe, intensidad, entrenador y plan de tu pareja) se ajusta en la pestaña ENTRENO.";
  ac.appendChild(nota);
  document.getElementById("calendario").innerHTML=calHtml();
}
function attrHtml(attrs){
  return ATTR_KEYS.map(k=>`<div class="acell"><div class="arow"><span class="k">${k}</span><span class="v" style="color:${colAttr(attrs[k])}">${attrs[k]}</span></div><div class="abar"><i style="width:${attrs[k]}%;background:${colAttr(attrs[k])}"></i></div></div>`).join("");
}
function rachaHtml(r){
  if(!r||!r.length) return '<span style="color:var(--gris2)">—</span>';
  return r.slice(-5).map(x=>`<span style="color:${x==="V"?"var(--verde)":"var(--rojo)"}">●</span>`).join("");
}
function pintarEntreno(){
  const c=G.carrera;
  const be=document.getElementById("btnsEntreno");be.innerHTML="";
  const cp=document.getElementById("compiPlanRow");cp.innerHTML="";
  const ent_=entrenadorActual();
  const info=document.createElement("div");info.className="foot";info.style.textAlign="left";info.style.marginBottom="7px";
  info.innerHTML=`Cada día que entrenas suma una sesión; el <b>domingo</b> llega el balance (5 sesiones = rendimiento pleno). Entrenador: <b>${ent_.n}</b>${ent_.esp.length?` — especialista en ${ent_.esp.join(", ")} (★)`:""} · se cambia en la pestaña Jugador.`;
  be.appendChild(info);
  const bAuto=document.createElement("button");
  bAuto.className="selbtn"+((c.planJug||"auto")==="auto"?" on":"");
  bAuto.style.width="100%";bAuto.style.marginBottom="5px";
  bAuto.textContent=ent_.esp.length?`Plan automático (${ent_.n} decide)`:"Plan automático (tu golpe más flojo)";
  bAuto.onclick=()=>{c.planJug="auto";guardar();pintarCarrera();};
  be.appendChild(bAuto);
  const grid=document.createElement("div");grid.className="attrs";grid.style.gap="4px";
  ATTR_KEYS.forEach(k=>{
    const b=document.createElement("button");
    b.className=(c.planJug===k?"selbtn on":"selbtn");
    b.innerHTML=`${k} <b style="color:${colAttr(c.attrs[k])}">${c.attrs[k]}</b>${ent_.esp.includes(k)?" ★":""}`;
    b.onclick=()=>{c.planJug=k;guardar();pintarCarrera();};
    grid.appendChild(b);
  });
  be.appendChild(grid);
  // intensidad
  const tInt=document.createElement("div");tInt.className="foot";tInt.style.textAlign="left";tInt.style.margin="9px 0 4px";
  tInt.textContent="Intensidad de las sesiones:";
  be.appendChild(tInt);
  const fInt=document.createElement("div");fInt.className="fila";
  ["suave","normal","intensa"].forEach(it=>{
    const b=document.createElement("button");
    b.className="selbtn"+((c.intens||"normal")===it?" on":"");
    b.style.fontSize="11px";
    b.textContent=it==="suave"?"Suave (-3 en./día)":it==="normal"?"Normal (-4 en./día)":"Intensa (-6 en./día ⚠)";
    b.onclick=()=>{c.intens=it;guardar();pintarCarrera();};
    fInt.appendChild(b);
  });
  be.appendChild(fInt);
  // plan del compañero
  const tCo=document.createElement("div");tCo.className="foot";tCo.style.textAlign="left";tCo.style.margin="9px 0 4px";
  tCo.textContent=`Plan de ${c.compi.n} (entrena contigo):`;
  cp.appendChild(tCo);
  const sel=document.createElement("select");sel.style.width="100%";
  const op0=document.createElement("option");op0.value="auto";op0.textContent="Automático (su golpe más flojo)";
  sel.appendChild(op0);
  ATTR_KEYS.forEach(k=>{
    const o=document.createElement("option");o.value=k;
    o.textContent=`${k} (${c.compi.attrs[k]})`;
    sel.appendChild(o);
  });
  sel.value=c.compiPlan||"auto";
  sel.onchange=()=>{c.compiPlan=sel.value;guardar();};
  cp.appendChild(sel);
}
function pintarJugador(){
  const c=G.carrera;
  const hav=document.getElementById("hAva");
  hav.style.background="#1a2130";hav.textContent="";
  hav.innerHTML=avatarSVG({n:c.nombre,sexo:c.sexo,ava:c.ava,_ropa:c._ropa||c.color},52);
  document.getElementById("hNom").textContent=c.nombre;
  const _hsub=document.getElementById("hSub");
  _hsub.innerHTML=`${c.edad} años · ${ladoTxt(c.lado)} · ${estiloNombre(c.estilo)} · ${persoNombre(c.perso)}`+(()=>{const r=chipRasgos(c);return r?`<div style="margin-top:4px">${r}</div>`:"";})();
  document.getElementById("hMedia").textContent=mediaAttrs(c.attrs);
  document.getElementById("hMeta").innerHTML=`
    <div class="chip">Confianza <b style="color:${colAttr(c.conf)}">${c.conf}</b></div>
    <div class="chip">Química <b style="color:${colAttr(c.quimica)}">${c.quimica}</b></div>
    <div class="chip">Forma ${rachaHtml(c.racha)}</div>
    <div class="chip">Récord <b>${(c.vd||{v:0,d:0}).v}-${(c.vd||{v:0,d:0}).d}</b></div>
    <div class="chip">Seguidores <b style="color:var(--lima)">${fmtFans(c.fans||0)}</b></div>
    <div class="chip">Ranking <b>#${miPuesto()}</b></div>`;
  document.getElementById("attrs").innerHTML=attrHtml(c.attrs);
  document.getElementById("compName").textContent=`${c.compi.pais||""} ${c.compi.n}`;
  const moral=c.compiMoral??65;
  const afin=afinidadPareja(_comoJugador(c),c.compi);
  document.getElementById("compMeta").innerHTML=`
    <div class="chip">${t("comp_media")} <b>${mediaAttrs(c.compi.attrs)}</b></div>
    <div class="chip">${estiloNombre(c.compi.estilo)}</div>
    <div class="chip">${persoNombre(c.compi.perso)}</div>
    <div class="chip">${t("comp_moral")} <b style="color:${colAttr(moral)}">${moral}</b></div>
    <div class="chip">${t("comp_afinidad")} <b style="color:${colAttr(afin)}">${afin}</b></div>
    ${(()=>{const r=chipRasgos(c.compi);return r?`<div style="width:100%;margin-top:3px">${r}</div>`:"";})()}`;
  const mk=document.getElementById("mercado");mk.innerHTML="";
  const morAviso=document.createElement("div");
  morAviso.className="foot";morAviso.style.textAlign="left";morAviso.style.marginBottom="7px";
  morAviso.textContent=moral<35?t("comp_moral_baja",{n:c.compi.n})
    :moral<50?t("comp_moral_media",{n:c.compi.n})
    :t("comp_moral_ok",{n:c.compi.n});
  mk.appendChild(morAviso);
  const tit=document.createElement("div");tit.className="foot";tit.style.textAlign="left";tit.style.marginBottom="4px";
  tit.textContent=t("mkt_titulo");
  mk.appendChild(tit);
  (c.mercadoP||[]).forEach((cand,ci)=>{
    const prima=primaFichaje(cand);
    const d=document.createElement("div");d.className="opcion";
    const origen=cand.origen==="circuito"
      ?t("mkt_origen_circuito",{pareja:cand.parejaNombre,pos:cand.parejaPos})
      :t("mkt_origen_libre");
    const exPrev=exigenciasCompi(cand), prest=prestigioJugador(miPuesto(),c.fans,c.pro);
    const prestOk=prest>=exPrev.prestigioMin;
    d.innerHTML=`<b>${cand.pais||""} ${cand.n}</b> <span class="pill">${t("mkt_nivel",{n:mediaAttrs(cand.attrs)})}</span> <span class="pill">${estiloNombre(cand.estilo)}</span> <span class="pill">${persoNombre(cand.perso)}</span>${chipRasgos(cand)}<div class="d">${origen} · ${t("mkt_prima",{prima})} · ${t("mkt_exige_prest")} <b style="color:${prestOk?"var(--verde)":"var(--rojo)"}">${exPrev.prestigioMin}</b> ${t("mkt_tienes",{p:prest})}</div>`;
    const b=document.createElement("button");b.style.width="100%";
    b.textContent=c.dinero<prima?t("mkt_caja"):t("mkt_negociar",{prima});
    b.disabled=c.dinero<prima;
    b.onclick=()=>negociarPareja(ci);
    d.appendChild(b);mk.appendChild(d);
  });
  const st=document.getElementById("staff");st.innerHTML="";
  const pEnt=entrenadorActual();
  st.innerHTML=`<div class="foot" style="text-align:left">${t("staff_panel_ent",{n:pEnt.niv?pEnt.n:t("staff_sin_ent"),niv:pEnt.niv?` (${"★".repeat(pEnt.niv)})`:""})}</div>`;
  // patrocinio: contrato activo + ofertas
  if(c.sponsor){
    const s=c.sponsor;
    const d=document.createElement("div");d.className="opcion";
    d.innerHTML=`<b>${t("patro_contrato",{marca:s.marca})}</b> ${s.tier?`<span class="pill" style="color:${s.tier===4?"var(--oro)":s.tier===3?"#9B59D0":s.tier===2?"#4FA3D8":"var(--gris)"}">${tierTxt(s.tier)}</span>`:""}${s.sec?`<div class="d" style="font-style:italic">${s.sec}</div>`:""}<div class="d">${t("patro_detalle",{sem:s.sem,bonus:s.bonus,obj:s.objetivo,n:s.tRest})}${miPuesto()>s.objetivo?` <span style="color:var(--rojo)">${t("patro_no_cumples",{p:miPuesto()})}</span>`:` <span style="color:var(--verde)">${t("patro_cumples",{p:miPuesto()})}</span>`}</div>${(s.primas&&s.primas.length)?`<div class="d">${t("patro_primas")} ${s.primas.map(pr=>`${(s.primasCobradas&&s.primasCobradas[pr[0]])?"✔":"○"} ${pr[1]} <b style="color:var(--lima)">+${pr[2]}€</b>`).join(" · ")}</div>`:""}`;
    st.appendChild(d);
  } else {
    const d=document.createElement("div");d.className="foot";d.style.textAlign="left";
    d.textContent=t("patro_sin");
    st.appendChild(d);
  }
  if((c.ofertasPatro||[]).length){
    const h=document.createElement("div");h.className="foot";h.style.textAlign="left";h.style.margin="4px 0";
    h.textContent=c.sponsor?t("patro_ofertas_sust"):t("patro_ofertas_elige");
    st.appendChild(h);
  }
  (c.ofertasPatro||[]).forEach((of,oi)=>{
    const d=document.createElement("div");d.className="opcion";
    d.innerHTML=`<b>${t("patro_oferta",{marca:of.marca})}</b> ${of.tier?`<span class="pill" style="color:${of.tier===4?"var(--oro)":of.tier===3?"#9B59D0":of.tier===2?"#4FA3D8":"var(--gris)"}">${tierTxt(of.tier)}</span>`:""}${of._perfil?`<span class="pill" style="color:${of._perfil==="fijo alto"?"var(--lima)":"var(--oro)"}">${t(of._perfil==="fijo alto"?"patro_perfil_fijo":"patro_perfil_obj")}</span>`:""}${of.sec?`<div class="d" style="font-style:italic">${of.sec}</div>`:""}<div class="d">${t("patro_of_detalle",{sem:of.sem,bonus:of.bonus,obj:of.objetivo,n:of.tRest})}${(of.primas&&of.primas.length)?`<br>${t("patro_of_primas")} ${of.primas.map(pr=>`${pr[1]} +${pr[2]}€`).join(" · ")}`:""}</div>`;
    const b=document.createElement("button");b.className="pri";b.style.width="100%";
    b.textContent=c.sponsor?t("patro_firmar_sust",{marca:c.sponsor.marca}):t("patro_firmar");
    b.onclick=()=>{c.sponsor={...of};c.ofertasPatro=[];noticia("contrato",t("patro_not_t",{marca:of.marca,quien:nombreEntidad().replace("★ ","")}),t("patro_not_s",{tier:tierTxt(of.tier),sem:of.sem,obj:of.objetivo}));avisa(t("patro_av_firma",{marca:of.marca,tier:tierTxt(of.tier),sem:of.sem,obj:of.objetivo}));fansAdd(of.tier>=3?300:60,"nuevo patrocinador");guardar();pintarCarrera();};
    d.appendChild(b);st.appendChild(d);
  });
}
// Mesa de negociación: ves lo que exige el candidato, ajustas tu oferta (ceder
// el lado), compruebas la afinidad prevista y firmas si acepta.
function negociarPareja(ci){
  const c=G.carrera, cand=c.mercadoP[ci]; if(!cand) return;
  const prima=primaFichaje(cand);
  const oferta={cederLado:false, tieneEntrenador:!!(c.staff&&c.staff.entrenador)};
  const ov=document.getElementById("negModal")||(()=>{const d=document.createElement("div");d.id="negModal";d.style.cssText="position:fixed;inset:0;background:rgba(10,13,19,.93);z-index:82;display:flex;align-items:center;justify-content:center;padding:16px";document.body.appendChild(d);return d;})();
  const pintar=()=>{
    const yo={estilo:c.estilo,perso:c.perso,lado:(c.lado===0||c.lado===1)?c.lado:0,rasgos:c.rasgos,n:c.nombre};
    const prest=prestigioJugador(miPuesto(),c.fans,c.pro);
    const r=evaluaOfertaCompi(yo,cand,oferta,prest);
    const ex=r.ex, ladoTxt=l=>l===0?t("mkt_lado_drive"):t("mkt_lado_reves");
    const fila=(ok,txt)=>`<div style="font-size:11.5px;color:${ok?"var(--verde)":"var(--rojo)"};padding:1px 0">${ok?"✓":"✗"} ${txt}</div>`;
    const puedePagar=c.dinero>=prima;
    ov.innerHTML=`<div class="card" style="max-width:460px;width:100%">
      <h3 style="margin-top:0">${t("mkt_neg_titulo",{n:cand.n})}</h3>
      <div class="foot" style="text-align:left;margin-bottom:6px">${t("mkt_neg_sub",{niv:ex.niv,estilo:estiloNombre(cand.estilo),perso:persoNombre(cand.perso),prima})}</div>
      <div style="margin-bottom:8px">
        ${fila(prest>=ex.prestigioMin,t("mkt_f_prestigio",{min:ex.prestigioMin,p:prest}))}
        ${fila(!ex.exigeEntrenador||oferta.tieneEntrenador,ex.exigeEntrenador?(oferta.tieneEntrenador?t("mkt_f_ent_si"):t("mkt_f_ent_no")):t("mkt_f_ent_noexige"))}
        ${fila(!r.colision||r.cede,t("mkt_f_lado",{lado:ladoTxt(ex.ladoQuiere)})+(r.colision?(r.cede?t("mkt_f_lado_cedes",{otro:ladoTxt(1-ex.ladoQuiere)}):t("mkt_f_lado_choca")):t("mkt_f_lado_ok")))}
        ${ex.objetivoRanking?fila(true,t("mkt_f_ambicioso",{n:ex.objetivoRanking})):""}
      </div>
      ${r.colision?`<label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:8px;cursor:pointer"><input type="checkbox" id="negCede" style="width:auto" ${oferta.cederLado?"checked":""}> ${t("mkt_ceder",{lado:ladoTxt(ex.ladoQuiere),otro:ladoTxt(1-ex.ladoQuiere)})}</label>`:""}
      <div class="scout" style="margin:0 0 10px"><div class="scoutHd">${t("mkt_afinidad")}</div><div style="font-size:22px;font-weight:700;color:${colAttr(r.afinidad)};font-family:'Chakra Petch',sans-serif">${r.afinidad}<span style="font-size:11px;color:var(--gris);font-weight:400"> / 95</span></div></div>
      ${r.faltan.length?`<div class="foot" style="text-align:left;color:var(--rojo);margin-bottom:8px">${t("mkt_no_firma")} ${r.faltan.join(" ")}</div>`:""}
      <button class="pri" id="negFirmar" style="width:100%" ${(!r.acepta||!puedePagar)?"disabled":""}>${!puedePagar?t("mkt_caja"):r.acepta?t("mkt_firmar",{prima}):t("mkt_no_acepta")}</button>
      <button id="negCancel" style="width:100%;margin-top:7px;background:none;color:var(--gris)">${t("mkt_cancelar")}</button>
    </div>`;
    const cb=document.getElementById("negCede"); if(cb) cb.onchange=()=>{ oferta.cederLado=cb.checked; pintar(); };
    document.getElementById("negCancel").onclick=()=>quitarEl(ov);
    const bf=document.getElementById("negFirmar");
    if(bf&&r.acepta&&puedePagar) bf.onclick=()=>{ quitarEl(ov); ficharPareja(ci,{suLado:r.suLado,tuLado:r.tuLado,objetivoRanking:ex.objetivoRanking,reparto:ex.reparto}); };
  };
  pintar();
}
function ficharPareja(ci,acuerdo){
  const c=G.carrera, cand=c.mercadoP[ci], prima=primaFichaje(cand);
  if(c.dinero<prima) return;
  c.dinero-=prima;
  if(cand.origen==="circuito"){
    const p=G.world.parejas.find(x=>x.id===cand.worldId);
    if(p){  // su pareja se busca un recambio joven; el circuito habla de ti
      const j=mkJovenNPC(p.sexo||"M");
      j.attrs=mkAttrsNivel(Math.max(44,mediaAttrs(cand.attrs)-6),j._est);
      p.jug[cand.jugIdx]=j;
      p.nombre=`${p.jug[0].n}/${p.jug[1].n}`;
      avisa(t("mkt_av_bombazo",{n:cand.n,ex:cand.parejaNombre.split("/")[cand.jugIdx===0?1:0]||t("obj_tu_pareja"),nuevo:j.n}));
    }
  }
  post("fichaje");
  fansAdd(cand.origen==="circuito"?200:40,cand.origen==="circuito"?"bombazo de mercado":null);
  const ac=acuerdo||{};
  c.compi={id:"m"+Date.now(),n:cand.n,pais:cand.pais,estilo:cand.estilo,perso:cand.perso,attrs:{...cand.attrs},rasgos:(cand.rasgos?cand.rasgos.slice():undefined),
    lado:(ac.suLado===0||ac.suLado===1)?ac.suLado:undefined, _acuerdo:{objetivo:ac.objetivoRanking||null,reparto:ac.reparto||50}};
  if(ac.tuLado===0||ac.tuLado===1) c.lado=ac.tuLado;   // si cediste el lado, te recolocas
  c.quimica=35; c.compiMoral=70; c.compiPlan="auto";
  c.mercadoP.splice(ci,1);
  noticia("fichaje",t("not_fichaje_t",{n:cand.n}),cand.origen==="circuito"?t("not_fichaje_s_circuito",{pareja:cand.parejaNombre}):t("not_fichaje_s_libre"));
  avisa(t("mkt_av_nueva",{n:cand.n}));
  guardar();pintarCarrera();
}
function renderRanking(el){
  const filas=rankingFilas();
  const yo=filas.find(f=>f.yo);
  let html=`<tr class="hd"><td>#</td><td>Pareja</td><td class="niv">Niv</td><td class="pts">Pts</td></tr>`;
  html+=filas.slice(0,12).map(f=>filaRk(f)).join("");
  if(yo.pos>13){
    html+=`<tr class="sep"><td colspan="4">···</td></tr>`;
    html+=filas.slice(yo.pos-2,Math.min(filas.length,yo.pos+1)).map(f=>filaRk(f)).join("");
  } else if(yo.pos===13){
    html+=filaRk(filas[12]);
  }
  el.innerHTML=html;
}
function filaRk(f){
  const h2=ent().h2h[f.id];
  const h2txt=h2?` <span style="color:#5E687A">(${h2.v}-${h2.d})</span>`:"";
  const tag=f.pro?` <span class="tagpro">PRO</span>`:"";
  const cls=f.yo?"yo":(f.pos<=3?"top":"");
  let mov="";
  const prev=G.world.prevPos?G.world.prevPos[f.id]:undefined;
  if(prev!==undefined){
    const d=prev-f.pos;
    mov=d>0?` <span style="color:var(--verde);font-size:9px">▲${d}</span>`:d<0?` <span style="color:var(--rojo);font-size:9px">▼${-d}</span>`:"";
  } else if(G.world.prevPos){ mov=` <span style="color:var(--lima);font-size:9px">NUEVO</span>`; }
  const cd=clubDe(f);
  const dot=cd?`<span style="color:${cd.color}" title="${cd.n}">●</span> `:(f.yo?`<span style="color:${G.modo==="club"?G.clubG.color:G.carrera.color}">●</span> `:"");
  return `<tr class="${cls}"><td class="pos">${f.pos}</td><td>${dot}${f.nombre}${tag}${mov}${f.yo?"":h2txt}</td><td class="niv">${f.nivel}</td><td class="pts">${f.pts}</td></tr>`;
}
function clubPalma(clubIdx,txt){
  if(clubIdx===undefined||clubIdx===null||!CLUBES_NPC[clubIdx]) return;
  G.world._clubPalm=G.world._clubPalm||{};
  const k=clubIdx;
  G.world._clubPalm[k]=G.world._clubPalm[k]||[];
  G.world._clubPalm[k].unshift(txt);
  G.world._clubPalm[k]=G.world._clubPalm[k].slice(0,12);
}
function clubTitulos(clubIdx){ return (G.world&&G.world._clubPalm&&G.world._clubPalm[clubIdx])||[]; }
function clubDe(f){
  if(f.yo) return null;
  const p=G.world.parejas.find(x=>x.id===f.id);
  return (p&&p.club!==undefined)?CLUBES_NPC[p.club]:null;
}
function renderClubes(el){
  const sx=miSexo();
  const acc=CLUBES_NPC.map((c,i)=>({n:c.n,color:c.color,pts:0,idx:i,parejas:0,tit:clubTitulos(i).length}));
  G.world.parejas.forEach(p=>{ if(p.club!==undefined&&(p.sexo||"M")===sx){ acc[p.club].pts+=p.pts; acc[p.club].parejas++; } });
  if(G.modo==="club") acc.push({n:"★ "+G.clubG.nombre,color:G.clubG.color,pts:G.clubG.pts,yo:true,tit:(G.clubG.palmares||[]).length,parejas:(G.clubG.plantilla||[]).length});
  acc.sort((a,b)=>b.pts-a.pts);
  let html=`<tr class="hd"><td>#</td><td>Club</td><td class="pts">🏆</td><td class="pts">Pts</td></tr>`;
  html+=acc.map((c,i)=>`<tr class="${c.yo?"yo":i<3?"top":""}" ${c.idx!==undefined?`style="cursor:pointer" onclick="verClub(${c.idx})"`:""}><td class="pos">${i+1}</td><td><span style="color:${c.color}">●</span> ${c.n}${c.idx!==undefined?' <span style="color:var(--gris2);font-size:9px">▸</span>':""}</td><td class="pts">${c.tit||0}</td><td class="pts">${c.pts}</td></tr>`).join("");
  el.innerHTML=html;
}
function verClub(idx){
  const c=CLUBES_NPC[idx]; if(!c) return;
  const sx=miSexo();
  const pares=G.world.parejas.filter(p=>p.club===idx&&(p.sexo||"M")===sx).sort((a,b)=>nivelPareja(b)-nivelPareja(a));
  const filas=rankingFilas();
  const posDe=(nm)=>{const f=filas.find(x=>x.nombre===nm);return f?f.pos:"—";};
  const tit=clubTitulos(idx);
  const ov=document.getElementById("clubModal")||(()=>{const d=document.createElement("div");d.id="clubModal";d.style.cssText="position:fixed;inset:0;background:rgba(10,13,19,.9);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px";document.body.appendChild(d);return d;})();
  ov.innerHTML=`<div class="card" style="max-width:440px;width:100%;max-height:86vh;overflow:auto">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><div style="width:14px;height:14px;border-radius:3px;background:${c.color}"></div><h3 style="margin:0">${c.n}</h3></div>
    <div class="foot" style="text-align:left;margin-bottom:8px">📍 ${c.sede} · <em>«${c.lema}»</em><br>${FILOSOFIAS[c.fil]||""}</div>
    <div style="font-size:11px;color:var(--gris);text-transform:uppercase;letter-spacing:1px;margin:8px 0 3px">Plantel (${pares.length})</div>
    <table class="rk">${pares.map(p=>`<tr><td style="font-size:11px"><span style="display:inline-block;vertical-align:middle;margin-right:3px">${avatarSVG(p.jug[0],18)}${avatarSVG(p.jug[1],18)}</span>${p.nombre}</td><td class="pts">#${posDe(p.nombre)}</td><td class="pts">${nivelPareja(p)}</td></tr>`).join("")||'<tr><td class="foot">Sin parejas esta temporada</td></tr>'}</table>
    <div style="font-size:11px;color:var(--gris);text-transform:uppercase;letter-spacing:1px;margin:10px 0 3px">Palmarés reciente (${tit.length})</div>
    ${tit.length?`<div class="foot" style="text-align:left">${tit.slice(0,8).map(t=>`🏆 ${t}`).join("<br>")}</div>`:'<div class="foot" style="text-align:left">Aún sin títulos. La historia se escribe.</div>'}
    <button class="pri" style="width:100%;margin-top:10px" onclick="quitarEl(document.getElementById('clubModal'))">Cerrar</button>
  </div>`;
  ov.onclick=(e)=>{ if(e.target===ov) quitarEl(ov); };
}
/* ---------- seguidores y red social ---------- */
const SOCIAL_USERS=["PadelManiaco_88","LaBandejaDeOro","GrisPistaCentral","TiaDelGlobo","ViboraFan","ElMuroSur","PuntoDeOro_","CholoPadelero","MatchballEterno","RinconDelReves","SmashRonco","La4Paredes","CristaleraLoca","PibeDeLaPala"];
function clasificaRiv(h2){
  if(!h2) return null;
  const tot=h2.v+h2.d; if(tot<3) return null;
  const wr=h2.v/tot;
  if(tot>=4&&Math.abs(h2.v-h2.d)<=2) return {tag:"RIVALIDAD",emo:"🔥",col:"var(--oro)"};
  if(wr<=.25) return {tag:"BESTIA NEGRA",emo:"😈",col:"#E05656"};
  if(wr>=.75) return {tag:"CLIENTE",emo:"😏",col:"var(--verde)"};
  return null;
}
function renderRivalidades(el){
  const e=ent();
  const filas=Object.entries(e.h2h||{})
    .map(([id,h2])=>({id,...h2,tot:h2.v+h2.d,cl:clasificaRiv(h2)}))
    .filter(x=>x.tot>=2&&x.n)
    .sort((a,b)=>b.tot-a.tot).slice(0,6);
  if(!filas.length){ el.innerHTML=`<div class="foot" style="text-align:left">Aún no hay historia con nadie. Los rivales se hacen cruzándose.</div>`; return; }
  el.innerHTML=filas.map(x=>`
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px solid var(--borde)">
      <div style="font-size:11.5px">${x.cl?`<span style="color:${x.cl.col};font-weight:700">${x.cl.emo} ${x.cl.tag}</span> · `:""}${x.n}
        <div style="font-size:9.5px;color:var(--gris2)">${x.tot} cruces${x.alta?` · ${x.alta} en semis o más`:""}</div>
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:${x.v>=x.d?"var(--verde)":"#E05656"}">${x.v}-${x.d}</div>
    </div>`).join("");
}
function fmtFans(n){return n>=1000?(n/1000).toFixed(1).replace(".0","")+"k":""+n;}
function fansAdd(n,motivo){
  const e=ent(); if(!e) return;
  e.fans=Math.max(0,(e.fans||0)+n);
  if(n>=100&&motivo) avisa(`📈 +${n} seguidores: ${motivo}. Total: ${fmtFans(e.fans)}.`);
}
function post(tipo,ctx){
  const e=ent(); if(!e) return;
  ctx=ctx||{};
  const yo=G.modo==="carrera"?G.carrera.nombre:G.clubG.nombre;
  const T={
    victoria:[`Vaya nivel hoy de ${yo} 🔥 ese ${ctx.rival||"rival"} no sabía dónde meterse`,`Menudo partido acabo de ver. ${yo} está en modo serio 👏`,`Lo de hoy en ${ctx.torneo||"el torneo"} hay que enmarcarlo. VAMOS ${yo.toUpperCase()}`],
    derrota:[`Duro palo hoy... pero se sale. Confianza ciega en ${yo} 💪`,`Alguien me explica qué ha pasado en ${ctx.torneo||"el torneo"} porque yo no doy crédito`,`Día malo lo tiene cualquiera. El lunes a seguir, ${yo} ❤`],
    titulo:[`CAMPEONES 🏆🏆🏆 ${yo} ES OTRA COSA`,`Se me ha caído una lagrimilla con este título, no os voy a engañar 🥹`,`${(ctx.torneo||"título").toUpperCase()} PARA CASA. QUÉ MOMENTO`],
    fichaje:[`Ojo al movimiento 👀 me gusta MUCHO para ${yo}`,`Bombazo del mercado!! esto cambia la temporada`,`No sé si es el fichaje que necesitábamos pero ilusión hay 🤞`],
    picante:[`JAJAJA las declaraciones de hoy 🌶 así se habla`,`Se va a liar con lo que ha dicho en prensa... y me encanta`,`Menos titulares y más bandeja, opino 🤷`],
    lesion:[`No no no la lesión no 😭 recupérate pronto`,`Qué mala suerte de verdad... a cuidarse y volver más fuerte`],
    forma:[`${ctx.racha||3} victorias seguidas... esto empieza a dar miedito 👀`,`La grada nota algo especial esta temporada. Ojalá no equivocarme`],
    junta:[`La directiva apretando... confianza en el proyecto o no? Yo ya no sé`,`Si la junta echa al míster me doy de baja de socio, aviso`],
    gala:[`PAREJA DEL AÑO. Lo demás son opiniones 🏆`,`Qué orgullo de gala, en serio. Historia.`],
    rivalidad:[`Lo de hoy contra ${ctx.rival||"esos dos"} ya es personal y me ENCANTA 🔥`,`Cada cruce con ${ctx.rival||"ellos"} es una final. Qué rivalidad nos están regalando`,`Necesito ya el próximo capítulo contra ${ctx.rival||"ellos"} 🍿`],
    maldicion:[`POR FIN cae ${ctx.rival||"la bestia negra"} 😭😭 qué peso fuera`,`Se rompió la maldición!! Sabía que este día llegaba`,`A ${ctx.rival||"esos"} ya no se les teme. Punto de inflexión TOTAL`],
    campanada:[`NADIE daba un duro y mirad 🏆 CAMPANADA HISTÓRICA`,`Esto es una sorpresa MAYÚSCULA y lo sabéis todos`,`Contra pronóstico y contra el mundo. Qué barbaridad 👏👏`],
  }[tipo];
  if(!T) return;
  e.social=(e.social||[]);
  e.social.unshift({user:pick(SOCIAL_USERS),txt:pick(T),likes:Math.round(R(2,12)+Math.sqrt(e.fans||100)*R(.5,2)),t:temporada(),sem:semanaTemp()});
  e.social=e.social.slice(0,18);
}
function renderSocial(el){
  const e=ent(), posts=e.social||[];
  const head=`<div class="foot" style="text-align:left;margin-bottom:7px">Seguidores: <b style="color:var(--lima)">${fmtFans(e.fans||0)}</b> — suben ganando, con títulos y dando que hablar.</div>`;
  if(!posts.length){ el.innerHTML=head+`<div class="foot" style="text-align:left">La grada todavía no habla de vosotros. Dales motivos.</div>`; return; }
  el.innerHTML=head+posts.map(p2=>`
    <div class="spost">
      <div class="sava" style="background:${["#4FA3D8","#E06AA0","#3FBF8F","#E0A030","#9B59D0","#5CC8E6"][p2.user.length%6]}">${p2.user[0]}</div>
      <div class="scuerpo">
        <div class="suser">@${p2.user} <span class="stime">T${p2.t}·S${p2.sem}</span></div>
        <div class="stxt">${p2.txt}</div>
        <div class="slikes">♥ ${p2.likes}</div>
      </div>
    </div>`).join("");
}
function renderTrayectoria(el){
  const h=ent().hist||[];
  if(!h.length){ el.innerHTML=`<tr><td class="foot" style="border:none;text-align:left">${t("tray_vacia")}</td></tr>`; return; }
  let html=`<tr class="hd"><td>T</td><td>${t("tray_puesto")}</td><td class="pts">Pts</td><td class="niv">🏆</td></tr>`;
  html+=h.slice(-12).map(x=>`<tr><td class="pos">T${x.t}</td><td>#${x.pos}</td><td class="pts">${x.pts}</td><td class="niv">${x.tit||"·"}</td></tr>`).join("");
  el.innerHTML=html;
}
const HITOS_CARRERA=[
  {id:"v1",txt:"Primera victoria en el circuito",ck:(c)=>((c.vd||{}).v||0)>=1,fans:30,din:100},
  {id:"tit1",txt:"Primer título (el que nunca se olvida)",ck:(c)=>c.palmares.length>=1,fans:100,din:300},
  {id:"top30",txt:"Entrar en el top 30",ck:(c)=>miPuesto()<=30,fans:150,din:500},
  {id:"top20",txt:"Entrar en el top 20",ck:(c)=>miPuesto()<=20,fans:300,din:1200},
  {id:"pro",txt:"Debutar en un cuadro Premier",ck:(c)=>!!c.pro,fans:400,din:1500},
  {id:"titP",txt:"Primer título Premier",ck:(c)=>c.palmares.some(x=>x.includes("Premier")||x.includes("MAJOR")),fans:1000,din:5000},
  {id:"top10",txt:"Entrar en el top 10",ck:(c)=>miPuesto()<=10,fans:800,din:3000},
  {id:"v100",txt:"100 victorias como profesional",ck:(c)=>((c.vd||{}).v||0)>=100,fans:400,din:1500},
  {id:"racha10",txt:"Racha de 10 victorias",ck:(c)=>(c.rachaMax||0)>=10,fans:300,din:1000},
  {id:"major",txt:"Ganar un MAJOR",ck:(c)=>(c.recMajors||0)>=1,fans:3000,din:15000},
  {id:"n1",txt:"Cerrar una temporada como Nº1",ck:(c)=>(G.world.n1hist||[]).some(x=>x.yo),fans:5000,din:25000},
];
const HITOS_CLUB=[
  {id:"tit1",txt:"Primer título del club",ck:(cl)=>cl.palmares.length>=1,fans:120,din:800},
  {id:"p4",txt:"Plantilla de 4 jugadores",ck:(cl)=>cl.plantilla.length>=4,fans:80,din:0},
  {id:"parB",txt:"Título de la pareja B",ck:(cl)=>cl.palmares.some(x=>x.includes("pareja B")),fans:200,din:1000},
  {id:"top20",txt:"Club en el top 20",ck:(cl)=>miPuesto()<=20,fans:300,din:2000},
  {id:"reforma",txt:"Primera reforma terminada",ck:(cl)=>Object.values(cl.reformas||{}).some(Boolean),fans:100,din:0},
  {id:"top10",txt:"Club en el top 10",ck:(cl)=>miPuesto()<=10,fans:800,din:5000},
  {id:"junta2",txt:"Cumplir el objetivo de la junta dos veces",ck:(cl)=>(cl._juntaOk||0)>=2,fans:400,din:3000},
  {id:"titP",txt:"Título Premier para las vitrinas",ck:(cl)=>cl.palmares.some(x=>x.includes("Premier")||x.includes("MAJOR")),fans:1500,din:8000},
  {id:"top3",txt:"Podio del ranking de clubes",ck:(cl)=>miPuesto()<=3,fans:2000,din:12000},
];
function chequeaHitos(){
  const e=ent(); if(!e) return;
  e.hitosOk=e.hitosOk||{};
  const lista=G.modo==="carrera"?HITOS_CARRERA:HITOS_CLUB;
  lista.forEach(h=>{
    if(e.hitosOk[h.id]) return;
    let ok=false;
    try{ ok=h.ck(e); }catch(err){}
    if(ok){
      e.hitosOk[h.id]=temporada();
      e.dinero+=h.din;
      fansAdd(h.fans);
      avisa(`🎯 HITO conseguido: ${h.txt}. ${h.din?`+${h.din}€ de premios federativos, `:""}+${h.fans} seguidores.`);
      if(h.fans>=800) noticia("hito",h.txt,t("not_hito_s"));
      // ¿el contrato de patrocinio tenía prima por este objetivo?
      const sp=G.modo==="carrera"?G.carrera.sponsor:null;
      if(sp&&sp.primas){
        const pr=sp.primas.find(x=>x[0]===h.id&&!(sp.primasCobradas&&sp.primasCobradas[h.id]));
        if(pr){
          sp.primasCobradas=sp.primasCobradas||{};
          sp.primasCobradas[h.id]=true;
          e.dinero+=pr[2];
          avisa(`💶 ${sp.marca} paga la prima por objetivo «${pr[1]}»: +${pr[2]}€.`);
          noticia("contrato",t("not_prima_t",{marca:sp.marca}),t("not_prima_s",{prima:pr[2],motivo:pr[1].toLowerCase()}));
        }
      }
    }
  });
}
function renderHitos(el){
  const e=ent(), lista=G.modo==="carrera"?HITOS_CARRERA:HITOS_CLUB, ok=e.hitosOk||{};
  el.innerHTML=lista.map(h=>`<div style="font-size:11.5px;padding:3px 0;color:${ok[h.id]?"var(--verde)":"var(--gris)"}">${ok[h.id]?"✓":"○"} ${h.txt}${ok[h.id]?` <span style="color:var(--gris2);font-family:'IBM Plex Mono',monospace;font-size:9px">T${ok[h.id]}</span>`:` <span style="color:var(--gris2)">· +${h.din}€ +${h.fans} seg.</span>`}</div>`).join("");
}
function renderRecords(el){
  const e=ent(), fem=miSexo()==="F";
  const filas=[
    ["Majors ganados",fem?"D. Brisa / G. Triana · 8":"A. Cotelo / A. Tapias · 9",e.recMajors||0],
    ["Títulos Premier en una temporada",fem?"Sánchiz/Ustera · 10":"Gabán/Chingorro · 11",Math.max(0,...(e.hist||[]).map(h=>h.tit||0),0)],
    ["Racha de victorias",fem?"Gonzálvez/Josemarí · 19":"J. Lebrín/F. Stupak · 21",e.rachaMax||0],
    ["Temporadas como nº1",fem?"D. Brisa / G. Triana · 4":"A. Cotelo / A. Tapias · 5",(G.world.n1hist||[]).filter(x=>x.yo).length],
  ];
  el.innerHTML=`<tr class="hd"><td>Récord</td><td>Leyenda</td><td class="pts">Tú</td></tr>`+
    filas.map(([r,l,t])=>`<tr><td style="font-size:11px">${r}</td><td style="font-size:11px;color:var(--gris)">${l}</td><td class="pts" style="color:${t>0?"var(--lima)":"var(--gris2)"}">${t}</td></tr>`).join("");
}
function renderN1(el){
  const h=(G.world.n1hist||[]);
  if(!h.length){ el.innerHTML=`<tr><td class="foot" style="border:none;text-align:left">Aún no se ha cerrado ninguna temporada.</td></tr>`; return; }
  let html=`<tr class="hd"><td>T</td><td>Nº1 al cierre</td><td class="pts">Pts</td></tr>`;
  html+=h.slice(-10).map(x=>`<tr class="${x.yo?"yo":""}"><td class="pos">T${x.t}</td><td>${x.yo?"👑 ":""}${x.nombre}</td><td class="pts">${x.pts}</td></tr>`).join("");
  el.innerHTML=html;
}
/* noticias importantes: tarjetas de prensa con foto SVG generada */
function noticia(tipo,titular,sub,prot){
  const e=ent(); if(!e) return;
  e.noticias=e.noticias||[];
  const caras=prot&&prot.jug?prot.jug.map(j=>({n:j.n,sexo:j.sexo,_ropa:j._ropa})):null;
  e.noticias.unshift({tipo,titular,sub,t:temporada(),sem:semanaTemp(),caras});
  e.noticias=e.noticias.slice(0,14);
}
function miParejaProt(){
  // la "pareja" del usuario para escenas protagonistas
  if(G.modo==="carrera"){const c=G.carrera;return {jug:[{n:c.nombre,sexo:c.sexo,_ropa:c._ropa||c.color||"#C6F53C",ava:c.ava},{n:c.compi.n,sexo:c.sexo}]};}
  const al=alineacion&&alineacion();return al?{jug:al.map(j=>({n:j.n,sexo:j.sexo}))}:null;
}
function fotoNoticia(tipo,acc){
  const EST={titulo:["#39300f","#E8C15A"],n1:["#39300f","#F4D97A"],lesion:["#381713","#E06456"],
    fichaje:["#13253a","#4FA3D8"],venta:["#13253a","#5CC8E6"],ruptura:["#38121f","#E06AA0"],
    retirada:["#20242e","#9AA3B5"],debut:["#1b3512","#C6F53C"],contrato:["#2e2810","#E8C15A"],hito:["#1b3512","#C6F53C"],
    circuito:["#1d2430","#8FB6D8"],mercado:["#2a2136","#B08AD8"]};
  const [b,a0]=EST[tipo]||EST.fichaje;
  const a=acc||a0;
  const pista=`<g opacity=".08" stroke="#fff" stroke-width="1.5"><rect x="14" y="10" width="132" height="70" fill="none"/><line x1="80" y1="10" x2="80" y2="80"/><line x1="14" y1="30" x2="146" y2="30"/><line x1="14" y1="60" x2="146" y2="60"/></g>`;
  let art="";
  if(tipo==="titulo"){
    art=`<path d="M62 24h36v10c0 13-7 21-18 21s-18-8-18-21z" fill="${a}"/><rect x="75" y="55" width="10" height="8" fill="${a}"/><rect x="66" y="63" width="28" height="5" fill="${a}"/><path d="M54 26h8v9c-6-1-8-5-8-9zM106 26h-8v9c6-1 8-5 8-9z" fill="${a}" opacity=".75"/><g fill="${a}"><circle cx="34" cy="22" r="2"/><circle cx="126" cy="18" r="2"/><circle cx="44" cy="60" r="1.6"/><circle cx="120" cy="52" r="1.6"/><circle cx="30" cy="42" r="1.3"/><circle cx="132" cy="38" r="1.3"/></g>`;
  } else if(tipo==="n1"){
    art=`<path d="M52 58 48 30l16 12 16-20 16 20 16-12-4 28z" fill="${a}"/><rect x="50" y="60" width="60" height="7" fill="${a}"/><circle cx="48" cy="28" r="3.5" fill="${a}"/><circle cx="80" cy="20" r="3.5" fill="${a}"/><circle cx="112" cy="28" r="3.5" fill="${a}"/>`;
  } else if(tipo==="lesion"){
    art=`<rect x="70" y="24" width="20" height="44" rx="3" fill="${a}"/><rect x="58" y="36" width="44" height="20" rx="3" fill="${a}"/><polyline points="20,74 40,74 46,64 54,80 60,70 140,70" stroke="${a}" stroke-width="2.5" fill="none" opacity=".8"/>`;
  } else if(tipo==="fichaje"||tipo==="venta"){
    art=`<circle cx="52" cy="32" r="9" fill="${a}"/><path d="M38 62c0-10 6-16 14-16s14 6 14 16z" fill="${a}"/><circle cx="108" cy="32" r="9" fill="${a}" opacity=".55"/><path d="M94 62c0-10 6-16 14-16s14 6 14 16z" fill="${a}" opacity=".55"/><path d="M70 44h18m0 0-6-5m6 5-6 5" stroke="${a}" stroke-width="3" fill="none"/>`;
  } else if(tipo==="ruptura"){
    art=`<circle cx="46" cy="34" r="9" fill="${a}"/><path d="M32 64c0-10 6-16 14-16s14 6 14 16z" fill="${a}"/><circle cx="114" cy="34" r="9" fill="${a}"/><path d="M100 64c0-10 6-16 14-16s14 6 14 16z" fill="${a}"/><path d="M84 18 74 40l10 4-12 22 22-28-10-4z" fill="#F2E14C"/>`;
  } else if(tipo==="retirada"){
    art=`<g transform="rotate(24 80 44)"><ellipse cx="80" cy="36" rx="16" ry="20" fill="${a}"/><rect x="76" y="54" width="8" height="18" rx="3" fill="${a}"/><g fill="${b}"><circle cx="74" cy="30" r="2"/><circle cx="86" cy="30" r="2"/><circle cx="74" cy="40" r="2"/><circle cx="86" cy="40" r="2"/><circle cx="80" cy="35" r="2"/></g></g><line x1="80" y1="8" x2="88" y2="20" stroke="${a}" stroke-width="2"/>`;
  } else if(tipo==="debut"){
    art=`<path d="M80 16l7 18 19 1-15 12 6 19-17-11-17 11 6-19-15-12 19-1z" fill="${a}"/><g fill="${a}" opacity=".6"><circle cx="36" cy="26" r="2"/><circle cx="124" cy="24" r="2"/><circle cx="40" cy="62" r="1.5"/><circle cx="122" cy="58" r="1.5"/></g>`;
  } else if(tipo==="contrato"){
    art=`<rect x="48" y="24" width="64" height="42" rx="3" fill="#E9EDF4"/><path d="M56 38h48M56 46h48M56 54h28" stroke="#9AA6BB" stroke-width="2.5"/><path d="M88 58c6-6 10 4 16-4" stroke="${a}" stroke-width="2.5" fill="none"/><path d="M104 22l10 10-4 4-10-10z" fill="${a}"/>`;
  } else if(tipo==="hito"){
    art=`<rect x="42" y="50" width="24" height="20" fill="${a}" opacity=".55"/><rect x="68" y="38" width="24" height="32" fill="${a}"/><rect x="94" y="56" width="24" height="14" fill="${a}" opacity=".55"/><circle cx="80" cy="26" r="7" fill="${a}"/>`;
  }
  return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g${tipo}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="#0E1218"/></linearGradient></defs><rect width="160" height="90" fill="url(#g${tipo})"/>${pista}${art}</svg>`;
}
// escena de noticia CON los protagonistas (2 caras) en una pista con gradas
function escenaNoticia(n){
  if(!n.caras||!n.caras.length) return fotoNoticia(n.tipo);
  const [j1,j2]=n.caras;
  const grad=`<rect width="160" height="90" fill="#0E1520"/><rect y="0" width="160" height="34" fill="#141C28"/>
    <g opacity=".5">${[...Array(11)].map((_,i)=>[...Array(4)].map((_,r)=>`<circle cx="${8+i*15}" cy="${6+r*7}" r="1.7" fill="${["#4FA3D8","#E0A030","#E05656","#3FBF8F","#9B59D0"][(i+r)%5]}"/>`).join("")).join("")}</g>
    <rect y="34" width="160" height="56" fill="#2E5A46"/><rect y="34" width="160" height="56" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>
    <line x1="80" y1="34" x2="80" y2="90" stroke="#fff" stroke-opacity=".25"/><line x1="10" y1="58" x2="150" y2="58" stroke="#fff" stroke-opacity=".2"/>
    <g opacity=".18"><rect x="14" y="2" width="3" height="12" fill="#fff"/><rect x="143" y="2" width="3" height="12" fill="#fff"/><circle cx="15.5" cy="3" r="4" fill="#FFF6C0"/><circle cx="144.5" cy="3" r="4" fill="#FFF6C0"/></g>`;
  const desSVG=(svg)=>svg.replace(/<svg[^>]*>/,"").replace("</svg>","");
  const cara=(j,x,y,s2,extra)=>`<g transform="translate(${x} ${y}) scale(${s2})">${extra||""}${desSVG(avatarSVG(j,64))}</g>`;
  let esc="";
  if(n.tipo==="titulo"||n.tipo==="n1"||n.tipo==="hito"){
    // levantando el trofeo
    const trofeo=`<g transform="translate(60 0) scale(.82)"><path d="M20 6h24v6c0 9-5 14-12 14s-12-5-12-14z" fill="#E8C15A"/><rect x="28" y="26" width="8" height="7" fill="#E8C15A"/><rect x="22" y="33" width="20" height="4" fill="#E8C15A"/><path d="M16 8h6v7c-4-1-6-4-6-7zM48 8h-6v7c4-1 6-4 6-7z" fill="#E8C15A" opacity=".8"/><path d="M30 2h4v5h-4z" fill="#F4D97A"/></g>`;
    esc=cara(j1,6,20,1.05,`<path d="M40 44 L34 10" stroke="${j1._ropa||"#C6F53C"}" stroke-width="0" fill="none"/>`)+cara(j2,82,20,1.05,"")+trofeo+`<g opacity=".5">${[...Array(12)].map((_,i)=>`<rect x="${10+i*12}" y="${18+((i*13)%20)}" width="2.5" height="2.5" fill="${["#E8C15A","#4FA3D8","#E05656","#fff"][i%4]}"/>`).join("")}</g>`;
  } else if(n.tipo==="ruptura"){
    esc=cara(j1,2,22,1,"")+cara(j2,90,22,1,"")+`<path d="M80 20 L70 44 L82 48 L68 74" stroke="#F2E14C" stroke-width="4" fill="none"/>`;
  } else if(n.tipo==="lesion"){
    esc=`<g transform="translate(20 40) rotate(-14)">${desSVG(avatarSVG(j1,60))}</g>`+cara(j2,86,24,.95,"")+`<path d="M96 20l-4 8 6 2-6 10" stroke="#E05656" stroke-width="2.5" fill="none"/>`;
  } else if(n.tipo==="fichaje"||n.tipo==="contrato"){
    esc=cara(j1,20,22,1.05,"")+cara(j2,74,22,1.05,"")+`<path d="M64 40h32m0 0-6-5m6 5-6 5" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/>`;
  } else {
    esc=cara(j1,20,22,1.05,"")+cara(j2,74,22,1.05,"");
  }
  return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">${grad}${esc}</svg>`;
}
const NOTI_KICK={titulo:"CAMPEONES",n1:"HISTORIA",lesion:"PARTE MÉDICO",fichaje:"MERCADO",venta:"TRASPASO",ruptura:"BOMBAZO",retirada:"ADIÓS A UNA LEYENDA",debut:"PROMESA",contrato:"PATROCINIO",hito:"PROFESIONALES",circuito:"CRÓNICA DEL CIRCUITO",mercado:"RUMORES"};
function renderNoticias(el){
  const ns=ent().noticias||[];
  const kcol={titulo:"#8A6A00",n1:"#8A6A00",contrato:"#8A6A00",lesion:"#8A1E1E",ruptura:"#8A1E1E",retirada:"#5A5548",fichaje:"#1E4E8A",venta:"#1E4E8A",debut:"#3E6B1E",hito:"#3E6B1E"};
  const mast=`<div class="mast">RISING <em>PÁDEL</em></div>
    <div class="mastsub">EL DIARIO DEL CIRCUITO · TEMPORADA ${temporada()} · SEMANA ${semanaTemp()} · ${miSexo()==="F"?"CIRCUITO FEMENINO":"CIRCUITO MASCULINO"} · 1,50€</div>`;
  if(!ns.length){
    el.innerHTML=`<div class="paper">${mast}
      <div class="apertura"><div class="atit">El circuito espera su próxima historia</div>
      <div class="asub">Esta portada se escribirá con tus títulos, tus fichajes y tus batallas. La rotativa está lista.</div></div>
      <div class="pfoot">RISING PÁDEL · PRENSA DEPORTIVA DESDE 2026</div></div>`;
    return;
  }
  const [a,...resto]=ns;
  const minis=resto.slice(0,2), tambien=resto.slice(2,7);
  el.innerHTML=`<div class="paper">${mast}
    <div class="apertura">
      <div class="afoto">${escenaNoticia(a)}</div>
      <div class="akick" style="color:${kcol[a.tipo]||"#1E4E8A"}">${NOTI_KICK[a.tipo]||"CIRCUITO"} · T${a.t} S${a.sem}</div>
      <div class="atit">${a.titular}</div>
      <div class="asub">${a.sub||""}</div>
    </div>
    ${minis.length?`<div class="pgrid">${minis.map(n=>`
      <div class="pmini">
        <div class="mfoto">${escenaNoticia(n)}</div>
        <div class="mkick" style="color:${kcol[n.tipo]||"#1E4E8A"}">${NOTI_KICK[n.tipo]||"CIRCUITO"}</div>
        <div class="mtit">${n.titular}</div>
      </div>`).join("")}</div>`:""}
    ${tambien.length?`<div class="tambien"><b>TAMBIÉN EN PORTADA</b>${tambien.map(n=>`<div>· ${n.titular} <span style="color:#7A7462;font-size:9px">T${n.t}S${n.sem}</span></div>`).join("")}</div>`:""}
    ${(()=>{const e2=ent();const ops=[[fmtFans(e2.fans||0),"seguidores y subiendo"],["#"+miPuesto(),"en el ranking del circuito"],[(e2.rachaAct||0)>=3?e2.rachaAct:(e2.vd||{v:0}).v,(e2.rachaAct||0)>=3?"victorias seguidas y contando":"victorias esta carrera"],[e2.palmares.length,"títulos en las vitrinas"]];const [num,txt]=ops[semanaTemp()%ops.length];return `<div class="lacifra"><span>LA CIFRA</span><b>${num}</b>${txt}</div>`;})()}
    <div class="pfoot">RISING PÁDEL · PRENSA DEPORTIVA DESDE 2026 · EDICIÓN ${G.modo==="carrera"?"CARRERA":"CLUBES"}</div>
  </div>`;
}
function colorNoticia(x){
  if(x.includes("🏆")||x.includes("✍")) return "var(--oro)";
  if(x.includes("✔")) return "var(--verde)";
  if(x.includes("✗")||x.includes("💥")||x.includes("⚠")||x.includes("👋")) return "var(--rojo)";
  if(x.includes("📰")||x.includes("🚀")||x.includes("📋")) return "var(--azul)";
  return "";
}
function renderDiario(elD,elP){
  const e=ent();
  const briefs=e.diario.slice(0,14).map(x=>{
    const col=colorNoticia(x);
    return `<div class="brief" style="border-left-color:${col||"var(--borde2)"}${col?`;color:${col}`:""}">${x}</div>`;
  }).join("");
  elD.innerHTML=e.diario.length
    ?`<div class="teletipo"><div class="thead">ÚLTIMA HORA · AGENCIA RPD · CIRCUITO ${miSexo()==="F"?"FEMENINO":"MASCULINO"}</div>${briefs}</div>`
    :"<div class='foot' style='text-align:left'>Sin novedades.</div>";
  elP.innerHTML=e.palmares.length?e.palmares.map(x=>`<div style="color:var(--oro)">🏆 ${x}</div>`).join(""):"<div>Sin títulos todavía.</div>";
}

function ingresosSemanaCarrera(){
  return G.carrera.sponsor?G.carrera.sponsor.sem:0;
}
function guardaPosiciones(){
  const m={};
  rankingFilas().forEach(f=>m[f.id]=f.pos);
  G.world.prevPos=m;
}
function entrenarDia(){
  const c=G.carrera, it=c.intens||"normal";
  c._sesEntreno=(c._sesEntreno||0)+1;
  c.energia=clamp(c.energia-(it==="suave"?3:it==="intensa"?6:4),0,100);
  avanzarDia();
}
function descansarDia(){
  const c=G.carrera;
  c.energia=clamp(c.energia+5,0,100);
  avanzarDia();
}
function avanzarDia(){
  const c=G.carrera;
  c.dia=(c.dia||1)+1;
  if(torneo&&c.dia>diaDeFase(torneo.fase)){
    avisa(`✗ No os presentáis a ${faseNombre(torneo.fase).toLowerCase()} del ${torneo.nombre}: eliminados por W.O.`);
    const e=ent();
    e.calRes=e.calRes||{}; e.calRes[semanaTemp()]="•";
    torneo=null;
  }
  if(c.dia>7){ c.dia=1; avanzarSemanaCarrera(); return; }
  guardar(); pintarCarrera();
}
function avanzarSemanaCarrera(){
  const c=G.carrera;
  c._accion=null;
  const factor=Math.min(1,(c._sesEntreno||0)/5);
  c._sesEntreno=0;
  const it=c.intens||"normal";
  if(!c.lesion&&factor>0){
    const log=entrenoSemanalCarrera(factor);
    if(log) avisa(`Balance de entrenos de la semana (${it}) — ${log}.`);
  }
  simCircuito(c._rivalesSemana);c._rivalesSemana=[];
  prensaSemanal();
  if(c.sponsor&&!c._spot&&Math.random()<(c.sponsor.tier>=3?.14:.08)){
    const pago=Math.round(c.sponsor.sem*(c.sponsor.tier>=4?4:c.sponsor.tier===3?3:c.sponsor.tier===2?2.2:1.6));
    const fansB=[0,120,400,1200,3500][c.sponsor.tier]||0;
    c._spot={marca:c.sponsor.marca,pago,fans:fansB,tipo:pick(SPOT_TIPOS),caduca:semanaTemp()+3};
    avisa(t("spot_av_oferta",{marca:c.sponsor.marca,tipo:t(c._spot.tipo),pago,fans:fansB}));
  }
  c.semana++;
  if(c.lesion){
    c.lesion.sem--;
    if(c.lesion.sem<=0){
      const nom=lesNombre(c.lesion), sec=curarLesion(c);
      avisa(t("les_alta",{n:nom})+(sec?t("les_merma",{pct:sec.pct,sem:sec.sem}):""));
    }
    else avisa(t("les_recup",{n:lesNombre(c.lesion),sem:c.lesion.sem}));
  }
  decaeMerma(c);   // la secuela de la última lesión se va disipando
  let regen=12+(staffNiv("fisico")?2+staffNiv("fisico"):0);
  c.energia=clamp(c.energia+regen,0,100);
  const pos_=miPuesto();
  fansAdd(Math.round((c.fans||0)*.002)+(pos_<=10?25:pos_<=20?8:1));
  if(!c._jugoTorneo&&c.dinero<600){
    c.dinero+=90;
    if(!c._avisoClases){c._avisoClases=true;avisa("Semana sin competir y caja floja: clases en el club, +90€.");}
  } else if(c.dinero>=600) c._avisoClases=false;
  c._jugoTorneo=false;
  c.dinero+=ingresosSemanaCarrera();
  const fijos=Object.keys(c.staff||{}).reduce((x,k)=>x+((c.staff[k]&&c.staff[k].sal)||0),0);
  if(c.dinero<300&&fijos>100&&!c._avisoFijos){c._avisoFijos=true;avisa(`⚠ Tu estructura te cuesta ${fijos}€/sem y la caja está seca. Plantéate recortar staff o entrenador.`);}
  if(c.dinero>1500) c._avisoFijos=false;
  const vida=40+(c.pro?180:0)+(miPuesto()<=15?180:0);
  c.dinero-=Math.min(vida,Math.max(0,c.dinero));  // no puedes gastar lo que no tienes: vives al día
  c.dinero-=Object.keys(c.staff||{}).reduce((s2,k)=>s2+((c.staff[k]&&c.staff[k].sal)||0),0);
  if(!(c.staff&&c.staff.psico)){
    // la moral se desgasta sola según la afinidad de la pareja: si os entendéis,
    // aguanta; si no, se erosiona. El leal aguanta más; el ambicioso mal clasificado, menos.
    const af=afinidadPareja(_comoJugador(c),c.compi);
    let d=af>=65?0:af>=50?1:2;
    if(tieneRasgo(c.compi,"leal")) d=Math.max(0,d-1);
    if(tieneRasgo(c.compi,"ambicioso")&&miPuesto()>20) d+=1;
    if(d) c.compiMoral=clamp((c.compiMoral??65)-d,5,95);
  }
  if(c.staff&&c.staff.psico&&c.conf<35+staffNiv("psico")*2) c.conf=35+staffNiv("psico")*2;
  if(c.compiMoral===29&&!c._avisoMoral){
    c._avisoMoral=true;
    avisa(`⚠ ${c.compi.n} está harto de perder. O cambiáis la dinámica o te deja a final de temporada.`);
  }
  // dilemas encadenados: primero llegan las consecuencias de decisiones pasadas...
  resolverPendientes(c,c.semana).forEach(p=>avisa(`⏳ ${p.txt}`));
  // ...y de vez en cuando surge un nuevo dilema (si no hay uno pendiente de decidir)
  if(!c.dilemaActivo && !c.lesion && Math.random()<.28) eligeDilema(c,c.semana);
  // objetivos de temporada: premia los que se van cumpliendo
  if(!c.objetivos) c.objetivos=mkObjetivosTemporada(c,miPuesto());
  evaluaObjetivos(c,miPuesto()).forEach(o=>{
    if(o.rec){ if(o.rec.dinero) c.dinero+=o.rec.dinero; if(o.rec.fans) fansAdd(o.rec.fans,"objetivo cumplido"); if(o.rec.moral) c.compiMoral=clamp((c.compiMoral??65)+o.rec.moral,5,95); }
    noticia("hito",t("not_objetivo_t"),o.txt);
    avisa(`🎯 Objetivo cumplido: ${o.txt}${o.rec&&o.rec.dinero?` (+${o.rec.dinero}€)`:""}.`);
  });
  if((c.semana-1)%SEMANAS_TEMP===0){
    const posFin=miPuesto(), ptsFin=c.pts;
    const titsT=c.palmares.filter(x=>x.includes(`(T${temporada()-1})`)).length;
    c.hist=(c.hist||[]); c.hist.push({t:temporada()-1,pos:posFin,pts:ptsFin,tit:titsT});
    c.calRes={}; c.wildcards=2;
    const cumplidos=(c.objetivos||[]).filter(o=>o.hecho).length, totalObj=(c.objetivos||[]).length;
    c.edad++;evolucionaMundo();
    c.pts=Math.round(c.pts*.55);
    avisa(`— Cierre de temporada ${temporada()-1}: #${posFin} con ${ptsFin} pts y ${titsT} título(s). Objetivos ${cumplidos}/${totalObj}. Cumples ${c.edad} años.`);
    if(totalObj&&cumplidos<totalObj) c.compiMoral=clamp((c.compiMoral??65)-(totalObj-cumplidos)*3,5,95);
    c.objetivos=mkObjetivosTemporada(c,miPuesto());   // metas para la nueva temporada
    cierreTemporadaCarrera();
  }
  ofertaStaffSemanal();
  chequeaHitos();
  guardaPosiciones();
  guardar();
  pintarCarrera();
}
function cierreTemporadaCarrera(){
  const c=G.carrera, pos=miPuesto();
  // contrato de patrocinio: evaluación de objetivo
  if(c.sponsor){
    const s=c.sponsor;
    if(pos>s.objetivo){
      noticia("contrato",t("not_rescinde_t",{marca:s.marca}),t("not_rescinde_s",{obj:s.objetivo,pos}));
      avisa(`✗ ${s.marca} rescinde el contrato: exigían top ${s.objetivo} y habéis cerrado #${pos}.`);
      c.sponsor=null;
    } else {
      s.tRest--;
      if(s.tRest<=0){
        avisa(`✔ Contrato con ${s.marca} cumplido con éxito. Quieren renovar al alza.`);
        c.sponsor=null;
        const t=(pos<=8&&(c.fans||0)>=6000)?4:pos<=11?3:pos<=20?2:1;
        c.ofertasPatro.push({...ofertaPatro(t),sem:Math.round(ofertaPatro(t).sem*1.2)});
      } else {
        avisa(`✔ Objetivo de ${s.marca} cumplido (#${pos}). ${s.tRest} temporada(s) de contrato.`);
      }
    }
  }
  // nuevas ofertas según ranking — el agente trae varias para que elijas
  c.ofertasPatro=[];
  let tier=pos<=11?3:pos<=20?2:pos<=34?1:0;
  if(pos<=8&&(c.fans||0)>=6000) tier=4;   // las multinacionales quieren caras conocidas
  const rep_=c.staff&&c.staff.rep;
  if(rep_&&tier>0&&tier<4) tier=Math.min(pos<=8?4:3,tier+1);
  if(tier>0){
    const nOf=rep_?3:pos<=20?2:2;
    const tiers=[tier]; if(tier>1) tiers.push(tier-1);
    let intent=0;
    while(c.ofertasPatro.length<nOf&&intent++<20){
      const t2=tiers[c.ofertasPatro.length%tiers.length];
      const of=ofertaPatro(t2);
      if(rep_) of.sem=Math.round(of.sem*1.2);
      if(Math.random()<.4){ of.sem=Math.round(of.sem*1.3); of.primas=of.primas.slice(0,1); of._perfil="fijo alto"; }
      else if(of.primas.length){ of.sem=Math.round(of.sem*.8); of._perfil="por objetivos"; }
      if(!c.ofertasPatro.some(x=>x.marca===of.marca)) c.ofertasPatro.push(of);
    }
  }
  if(c.ofertasPatro.length) avisa(`📋 ${c.ofertasPatro.length} oferta(s) de patrocinio sobre la mesa. Elige en la pestaña Jugador.`);
  // la marca a veces te quiere delante de una cámara

  // moral del compañero: ¿sigue contigo? Si la relación está rota, no salta un
  // umbral en seco: se abre una CRISIS con un motivo concreto y alternativas para
  // reconducirla (se resuelve con un evento al volver al panel de carrera).
  const moral=c.compiMoral??65;
  const evPar=evaluarRuptura(c,miPuesto());
  if(evPar.crisis&&Math.random()<.85){
    c._crisisPareja=evPar;
    avisa(`💔 Tensión con ${c.compi.n} al cierre de temporada: quiere hablar. (Resuélvelo en el panel de carrera.)`);
  } else if(moral<50){
    avisa(`📰 ${c.compi.n} renueva contigo, pero con dudas. Los resultados mandan.`);
    c.compiMoral=clamp(moral+10,5,95);
  } else {
    c.compiMoral=clamp(moral+(tieneRasgo(c.compi,"leal")?7:5),5,95);
  }
  c._avisoMoral=false;
  c.mercadoP=mkMercadoParejas();
  // === guardar el año para el anuario ===
  c.historia=c.historia||[];
  const titTemp=(c.palmares||[]).filter(t=>t.includes(`T${temporada()}`)).length;
  const campNombre=(()=>{const l=G.world["lider_"+miSexo()];const p=l&&G.world.parejas.find(x=>x.id===l);return p?p.nombre:"—";})();
  c.historia.push({temp:temporada(),pos,tit:titTemp,fans:c.fans||0,dinero:c.dinero,campeon:campNombre});
  c.historia=c.historia.slice(-15);
  mostrarAnuario();
}
function mostrarAnuario(){
  const c=G.carrera; if(!c||!c.historia||!c.historia.length) return;
  const h=c.historia[c.historia.length-1];
  const prev=c.historia.length>1?c.historia[c.historia.length-2]:null;
  const flechaPos=prev?(prev.pos>h.pos?`<span style="color:var(--lima)">▲ ${prev.pos-h.pos}</span>`:prev.pos<h.pos?`<span style="color:#E05656">▼ ${h.pos-prev.pos}</span>`:'<span style="color:var(--gris)">=</span>'):"";
  // mini-gráfico de evolución de puesto (menos es mejor → invertido)
  const serie=c.historia.slice(-8);
  const maxP=Math.max(...serie.map(x=>x.pos),10), minP=Math.min(...serie.map(x=>x.pos),1);
  const W=260,H=70, pad=6;
  const px=(i)=>pad+i*((W-2*pad)/Math.max(1,serie.length-1));
  const py=(p)=>pad+((p-minP)/Math.max(1,maxP-minP))*(H-2*pad);
  const pts=serie.map((x,i)=>`${px(i)},${py(x.pos)}`).join(" ");
  const graf=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="background:#10151F;border-radius:8px"><polyline points="${pts}" fill="none" stroke="#C6F53C" stroke-width="2"/>${serie.map((x,i)=>`<circle cx="${px(i)}" cy="${py(x.pos)}" r="2.5" fill="#C6F53C"/><text x="${px(i)}" y="${H-1}" font-size="6" fill="#6A7488" text-anchor="middle">T${x.temp}</text>`).join("")}</svg>`;
  const balDinero=prev?h.dinero-prev.dinero:h.dinero;
  const ov=document.getElementById("anuarioModal")||(()=>{const d=document.createElement("div");d.id="anuarioModal";d.style.cssText="position:fixed;inset:0;background:rgba(10,13,19,.92);z-index:70;display:flex;align-items:center;justify-content:center;padding:16px";document.body.appendChild(d);return d;})();
  ov.innerHTML=`<div class="card" style="max-width:440px;width:100%;max-height:88vh;overflow:auto">
    <div style="text-align:center;font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:13px;letter-spacing:3px;color:var(--oro)">ANUARIO</div>
    <h3 style="text-align:center;margin:2px 0 10px">Temporada ${h.temp}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="opcion" style="text-align:center"><div style="font-size:22px;font-weight:700;font-family:'Chakra Petch'">#${h.pos} ${flechaPos}</div><div class="foot">puesto final</div></div>
      <div class="opcion" style="text-align:center"><div style="font-size:22px;font-weight:700;font-family:'Chakra Petch';color:var(--oro)">${h.tit} 🏆</div><div class="foot">títulos del año</div></div>
      <div class="opcion" style="text-align:center"><div style="font-size:18px;font-weight:700;font-family:'Chakra Petch'">${fmtFans(h.fans)}</div><div class="foot">seguidores</div></div>
      <div class="opcion" style="text-align:center"><div style="font-size:16px;font-weight:700;font-family:'Chakra Petch';color:${balDinero>=0?"var(--lima)":"#E05656"}">${balDinero>=0?"+":""}${balDinero.toLocaleString("es")}€</div><div class="foot">balance del año</div></div>
    </div>
    <div class="foot" style="text-align:left;margin-bottom:3px">Evolución en el ranking</div>
    ${graf}
    <div class="foot" style="text-align:left;margin-top:10px">👑 Nº1 del circuito: <b>${h.campeon}</b></div>
    ${anuarioMerito(c,h,prev)}
    <button class="pri" style="width:100%;margin-top:12px" onclick="quitarEl(document.getElementById('anuarioModal'))">Empezar nueva temporada</button>
  </div>`;
  ov.onclick=(e)=>{ if(e.target===ov) quitarEl(ov); };
}
function anuarioMerito(c,h,prev){
  const frases=[];
  if(h.tit>=3) frases.push("🌟 Temporada de época: tres o más títulos.");
  else if(h.tit>0) frases.push(`✨ ${h.tit} título(s) que quedan para la historia.`);
  if(prev&&prev.pos-h.pos>=8) frases.push(`🚀 Escalada brutal: ${prev.pos-h.pos} puestos de un año a otro.`);
  if(h.pos===1) frases.push("👑 Cerráis el año como número uno del mundo.");
  else if(h.pos<=5) frases.push("🏅 Entre los cinco mejores del circuito.");
  if(prev&&h.pos-prev.pos>=8) frases.push("📉 Año duro: toca recomponerse.");
  if(!frases.length) frases.push("📈 Un año más de rodaje. La progresión es carrera de fondo.");
  return `<div style="border-top:1px solid var(--borde);margin-top:8px;padding-top:7px">${frases.map(f=>`<div style="font-size:11.5px;line-height:1.5;color:var(--gris)">${f}</div>`).join("")}</div>`;
}
function ajustaGanancia(g,intens,edad){
  if(intens==="suave"&&g>0&&Math.random()<.4) g--;
  if(intens==="intensa"&&Math.random()<.5) g++;
  if(edad!==undefined){
    if(edad<20&&Math.random()<.3) g++;
    if(edad>=29&&g>0&&Math.random()<.4) g--;
  }
  return Math.max(0,g);
}
/* Entrenamiento CONTINUO: todas las semanas se entrena según el plan.
   factor 1 = semana dedicada · 0.4 = semana de torneo · 0 = descanso total */
function golpePlan(atleta,plan,ent_){
  if(plan&&plan!=="auto") return plan;
  // auto: el entrenador prioriza sus especialidades entre los golpes flojos
  const deb=[...ATTR_KEYS].sort((a,b)=>atleta.attrs[a]-atleta.attrs[b]);
  if(ent_&&ent_.esp.length){
    const espDeb=deb.filter(k=>ent_.esp.includes(k));
    if(espDeb.length&&atleta.attrs[espDeb[0]]<80) return espDeb[0];
  }
  return deb[0];
}
function prensaSemanal(){
  const e=ent(); if(!e) return;
  const sl=slotSemana(semanaTemp());
  const filas=rankingFilas();
  // 1) crónica del Premier de la semana (si tú no lo ganaste)
  if(sl.premier!==undefined&&e._campPremSem!==semanaTemp()){
    const cands=filas.filter(f=>!f.yo).slice(0,10);
    const w=cands[Math.floor(Math.random()*Math.min(5,cands.length))];
    if(w){
      const giro=pick(["exhibición y título","final épica decidida en el tercer set","remontada imposible ante la grada","paliza sin contemplaciones en la final","título tras salvar tres bolas de partido"]);
      noticia("circuito",`${w.nombre} conquistan ${CATS[sl.premier].n==="Tour Finals"?"las Finals":"el "+CATS[sl.premier].n} de ${sl.ciudad}`,`${giro.charAt(0).toUpperCase()+giro.slice(1)} en ${sl.ciudad}`);
    }
  } else if(Math.random()<.55&&G.world.prevPos){
    // 2) el movimiento de la semana en el ranking
    let mejor=null,salto=0;
    filas.slice(0,28).forEach(f=>{
      if(f.yo) return;
      const pr=G.world.prevPos[f.id];
      if(pr!==undefined&&pr-f.pos>salto){salto=pr-f.pos;mejor=f;}
    });
    if(mejor&&salto>=2){
      noticia("mercado",t("not_mercado_t",{nombre:mejor.nombre,verbo:salto>=5?t("not_mercado_verbo_up"):t("not_mercado_verbo"),pos:mejor.pos}),t("not_mercado_s",{salto,frase:t(pick(["not_mercado_v1","not_mercado_v2","not_mercado_v3","not_mercado_v4"]))}));
    }
  } else if(Math.random()<.3){
    // 3) pieza de color con una estrella parodiada
    const star=filas.filter(f=>!f.yo&&f.pos<=6)[Math.floor(Math.random()*Math.min(6,filas.length-1))];
    if(star) noticia("circuito",t(pick(["not_circuito_v1","not_circuito_v2","not_circuito_v3","not_circuito_v4"])),t("not_circuito_star_s",{star:star.nombre}));
  }
}
function entrenoSemanalCarrera(factor){
  if(factor<=0) return null;
  const c=G.carrera, it=c.intens||"normal", ent_=entrenadorActual();
  const res=[];
  const sesion=(atleta,plan,edad)=>{
    const k=golpePlan(atleta,plan,ent_);
    const v=atleta.attrs[k];
    let g=v<55?2:v<70?1:(Math.random()<.5?1:0);
    if(ent_.esp.includes(k)&&Math.random()<(.3+.08*(ent_.niv||2))) g+=1;   // el especialista exprime su tema
    g=ajustaGanancia(g,it,edad);
    if(v>=58&&g>0&&Math.random()<.5) g--;               // los cimientos van rápido...
    if(v>=72&&g>0&&Math.random()<.5) g--;               // ...y la élite cuesta sudor doble
    if(factor<1&&g>0&&Math.random()>factor) g=Math.max(0,g-1);
    if(factor<1&&Math.random()>factor+.25) g=0;         // semana de torneo: poco tiempo de pista de entreno
    if(g>0){ const rf=rasgosEntreno(atleta); if(rf>1&&Math.random()<rf-1) g++; else if(rf<1&&Math.random()<1-rf) g=Math.max(0,g-1); }   // talento / entrena mal
    atleta.attrs[k]=clamp(v+g,20,95);
    return `${k} ${g>0?"+"+g:"·"}`;
  };
  res.push("tú: "+sesion(c,c.planJug,c.edad));
  res.push(`${c.compi.n}: `+sesion(c.compi,c.compiPlan));
  if(factor>=.8&&it==="intensa"&&Math.random()<.06&&!c.lesion){
    c.lesion={n:"sobrecarga por exceso de entrenamiento",k:"les_sobre",sem:1};
    res.push(t("les_sobre_log"));
  }
  return res.join(" · ");
}




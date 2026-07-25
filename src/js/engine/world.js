/* ================================================================
   DATOS DEL MUNDO Y CALENDARIO
================================================================ */
const ATTR_KEYS=["fondo","globo","chiquita","volea","dejada","bandeja","vibora","remate","pared"];
const ESTILOS={
  defensivo:{nombre:"Defensivo",desc:"Globos, paredes y paciencia infinita.",attrs:{fondo:46,globo:55,chiquita:48,volea:34,dejada:36,bandeja:34,vibora:30,remate:30,pared:55}},
  agresivo:{nombre:"Agresivo",desc:"Presión constante, víboras y riesgo.",attrs:{fondo:40,globo:30,chiquita:34,volea:48,dejada:36,bandeja:48,vibora:52,remate:50,pared:34}},
  bandejero:{nombre:"Especialista en bandejas",desc:"Domina la red sin regalar nada.",attrs:{fondo:42,globo:42,chiquita:40,volea:46,dejada:38,bandeja:57,vibora:50,remate:38,pared:40}},
  rematador:{nombre:"Rematador",desc:"Si la bola sube, se acaba el punto.",attrs:{fondo:38,globo:30,chiquita:34,volea:44,dejada:34,bandeja:48,vibora:42,remate:58,pared:32}},
  constructor:{nombre:"Constructor",desc:"Chiquitas, dejadas y cabeza fría.",attrs:{fondo:50,globo:46,chiquita:55,volea:42,dejada:54,bandeja:36,vibora:32,remate:30,pared:44}},
};
const COLORES=["#C6F53C","#E6B837","#E66837","#9B37E6","#37C8E6"];
const SEMANAS_TEMP=52;

/* ================================================================
   DIFICULTAD: un ajuste global de partida que reequilibra el DISEÑO, no solo
   los atributos de la CPU. Cada perfil trae multiplicadores que el resto del
   juego consulta a través de dif(); así un mismo cambio afecta de forma
   coherente a los tres modos (carrera, club y Superliga).

     · lesion   → multiplica la probabilidad de lesionarse (riesgo médico).
     · economia → multiplica los ingresos por premios (margen económico).
     · junta    → holgura del objetivo de la junta / patrocinador; positivo
                  afloja (top-N más alto y alcanzable), negativo aprieta.

   Estas funciones son PURAS o deterministas dado el estado, y se prueban sin
   navegador. La dificultad elegida vive en G.dif (se guarda con la partida) y,
   como preferencia por defecto del menú, en localStorage "rpm_dif". Los nombres
   y descripciones visibles viven en i18n (difNombre/difDesc), no aquí. */
const PERFILES_DIF={
  accesible:{id:"accesible",emoji:"🌤",lesion:0.6, economia:1.35,junta:2},
  manager:  {id:"manager",  emoji:"🎯",lesion:1.0, economia:1.0, junta:0},
  experto:  {id:"experto",  emoji:"🔥",lesion:1.45,economia:0.72,junta:-2},
};
const DIF_DEF="manager";
// Mapea un id a su perfil (pura). Ante un id desconocido, devuelve el perfil por defecto.
function perfilDif(id){ return PERFILES_DIF[id]||PERFILES_DIF[DIF_DEF]; }
// Id de dificultad vigente: la de la partida en curso (G.dif) manda; si no hay
// partida, la preferencia guardada en el menú; y si tampoco, el valor por defecto.
function difId(){
  try{ if(typeof G!=="undefined"&&G&&PERFILES_DIF[G.dif]) return G.dif; }catch(e){}
  try{ const s=localStorage.getItem("rpm_dif"); if(PERFILES_DIF[s]) return s; }catch(e){}
  return DIF_DEF;
}
// Perfil vigente completo. Es el punto de entrada que usa el resto del juego.
function dif(){ return perfilDif(difId()); }
// Preferencia elegida en el menú (localStorage), para fijarla en G.dif al crear
// una partida nueva. Sin partida en curso, coincide con difId().
function difMenu(){ try{ const s=localStorage.getItem("rpm_dif"); if(PERFILES_DIF[s]) return s; }catch(e){} return DIF_DEF; }
// Ingreso ajustado por el margen económico de la dificultad (redondeado).
function ecoIngreso(x){ return Math.round((x||0)*dif().economia); }
// Umbral de probabilidad de lesión ajustado por el riesgo médico (0..0.95).
function kLesion(base){ return clamp((base||0)*dif().lesion,0,0.95); }
// Objetivo de la junta ajustado por su exigencia (top-N; positivo afloja).
function juntaTop(base){ return clamp(Math.round((base||8)+dif().junta),1,40); }
/* Calendario OFICIAL Premier Padel 2026: 25 torneos con sus ciudades y semanas reales
   (4 Majors, 10 P1, 10 P2 y las Finals de Barcelona), y un torneo FIP cada semana. */
const TRAVEL={ES:60,EU:180,AF:450,ME:550,AM:750};
const PREM_CAL=(()=>{
  const c=new Array(52).fill(null);
  const ev=[
    [6,5,"Riad","ME"],[9,4,"Gijón","ES"],[11,4,"Cancún","AM"],[12,5,"Miami","AM"],
    [15,6,"Doha","ME"],[16,4,"Giza","AF"],[17,4,"Bruselas","EU"],[19,4,"Asunción","AM"],
    [20,5,"Buenos Aires","AM"],[23,6,"Roma","EU"],[24,5,"Valencia","ES"],[26,4,"Valladolid","ES"],
    [27,4,"Burdeos","EU"],[29,5,"Málaga","ES"],[31,4,"Pretoria","AF"],[32,5,"Londres","EU"],
    [36,5,"Madrid","ES"],[37,6,"París","EU"],[40,4,"Rotterdam","EU"],[41,4,"Colonia","EU"],
    [42,5,"Milán","EU"],[44,5,"Kuwait","ME"],[46,5,"Dubái","ME"],[48,6,"Acapulco","AM"],
    [50,7,"Barcelona","ES"],
  ];
  ev.forEach(([w,cat,ciudad,region])=>c[w-1]={cat,ciudad,region});
  return c;
})();
const FIP_CAL=(()=>{
  const pat=[0,1,0,2,1,0,3,1,2,0];
  return new Array(52).fill(0).map((_,i)=>pat[i%pat.length]);
})();
function slotSemana(st){
  const p=PREM_CAL[st-1];
  return {premier:p?p.cat:undefined, ciudad:p?p.ciudad:undefined, region:p?p.region:undefined, tf:p?p.cat===7:false, fip:FIP_CAL[st-1]};
}
function costeViaje(ci){
  const slot=slotSemana(semanaTemp());
  const base=(CATS[ci].premier&&slot.premier===ci)?(TRAVEL[slot.region]||180):30;
  return G.modo==="club"?Math.round(base*1.5):base;
}
const FASES=["Previa 1","Previa 2","Octavos","Cuartos","Semifinal","FINAL"];
const DIAS=["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
function diaDeFase(f){return f+2;}  // previa mar-mié · octavos jue · cuartos vie · semis sáb · FINAL domingo
const FASE_OFFSET=[-8,-5,-2,0,3,5];
/* Modelo real del circuito: Premier (Major/P1/P2, con corte de entrada por ranking)
   + circuito FIP paralelo (Bronze/Silver/Gold/Platinum, abierto) para sumar puntos */
/* Premios por PAREJA calcados a la escala real del circuito (FIP modesto, Premier serio) */
const CATS=[
  {n:"FIP Bronze",  premier:false,base:44,cupoD:30,        pts:[40,24,14,8,4,2],          premio:[1000,500,260,140,60,20]},
  {n:"FIP Silver",  premier:false,base:52,cupoD:26,        pts:[80,48,28,16,8,4],         premio:[2000,1000,520,280,120,40]},
  {n:"FIP Gold",    premier:false,base:60,cupoD:22,        pts:[150,90,55,30,15,8],       premio:[4000,2000,1000,520,240,80]},
  {n:"FIP Platinum",premier:false,base:67,cupoD:18,        pts:[300,180,105,60,30,15],    premio:[7500,3800,1900,950,420,150]},
  {n:"Premier P2",  premier:true, base:73,cupoD:20,cupoP:32,pts:[500,300,180,100,50,25],  premio:[9000,4500,2200,1100,500,180]},
  {n:"Premier P1",  premier:true, base:79,cupoD:16,cupoP:26,pts:[1000,600,360,200,100,50],premio:[17000,8500,4200,2000,900,300]},
  {n:"MAJOR",       premier:true, base:85,cupoD:12,cupoP:20,pts:[2000,1200,720,400,200,100],premio:[35000,17500,8800,4200,1800,500]},
  {n:"Tour Finals", premier:true, tf:true, base:87,cupoD:8,cupoP:8,pts:[1500,900,540,330,0,0],premio:[24000,12000,6000,3000,0,0]},
];
function entradaEn(ci){
  const cat=CATS[ci],pos=miPuesto();
  if(cat.tf) return pos<=8?3:-1;      // Finals: solo top 8, arranca en cuartos
  if(cat.premier){
    if(pos<=cat.cupoD) return 2;      // directos al cuadro final
    if(pos<=cat.cupoP) return 0;      // previa clasificatoria
    return -1;                        // fuera del corte
  }
  return pos<=cat.cupoD?2:0;          // FIP: abierto a todos
}
/* ================================================================
   RASGOS: identidad sistémica de cada jugador. No son etiquetas: cada rasgo
   tiene efectos concretos (en partido, lesiones o desarrollo). Se asignan de
   forma DETERMINISTA a partir del nombre, así el mismo jugador tiene siempre
   los mismos rasgos, sin necesidad de migrar guardados antiguos.
================================================================ */
const RASGOS={
  clutch:{n:"Especialista",desc:"En los puntos decisivos, aparece.",bueno:1},
  fragil:{n:"Cristal frágil",desc:"Bajo presión, tiembla.",bueno:-1},
  escenario:{n:"De grandes escenarios",desc:"Crece bajo los focos de un Premier.",bueno:1},
  pegador:{n:"Pura pegada",desc:"Winner o error: no conoce el término medio.",bueno:0},
  muro:{n:"Muro",desc:"Devuelve una más. Rara vez regala.",bueno:1},
  propenso:{n:"Propenso a lesiones",desc:"Su físico da sustos.",bueno:-1},
  hierro:{n:"Físico de hierro",desc:"No se rompe ni a tiros.",bueno:1},
  talento:{n:"Talento precoz",desc:"Aprende a una velocidad rara.",bueno:1},
  vago:{n:"Entrena mal, compite bien",desc:"Un desastre entrenando; un jugador el domingo.",bueno:0},
  leal:{n:"Leal",desc:"Aguanta contigo en las malas.",bueno:1},
  ambicioso:{n:"Ambicioso",desc:"Quiere ganar ya, y lo exige.",bueno:0},
  conflictivo:{n:"Conflictivo",desc:"El vestuario le queda pequeño.",bueno:-1},
};
const _RASGO_IDS=Object.keys(RASGOS);
const _RASGO_INC={clutch:"fragil",fragil:"clutch",propenso:"hierro",hierro:"propenso",talento:"vago",vago:"talento",leal:"conflictivo",conflictivo:"leal"};
function _rngStr(s){ let h=Math.abs(hashStr(s||"?"))||1; return ()=>{ h=(h*1103515245+12345)&0x7fffffff; return h/0x7fffffff; }; }
function _generaRasgos(nom,j){
  const rnd=_rngStr("rasgo:"+nom);
  const r0=rnd(), n = r0<.42?0 : r0<.85?1 : 2;    // 42% ninguno · 43% uno · 15% dos
  const est=j&&j.estilo, per=j&&j.perso, bias={};
  if(est==="rematador"||est==="agresivo"){ bias.pegador=3; bias.escenario=1.5; }
  if(est==="defensivo"||est==="constructor") bias.muro=3;
  if(per==="valiente"){ bias.clutch=2.5; bias.ambicioso=1.8; }
  if(per==="emocional"){ bias.fragil=2.5; bias.conflictivo=1.6; }
  if(per==="frio"){ bias.clutch=1.6; bias.leal=1.6; }
  if(per==="conservador") bias.leal=1.8;
  const out=[], pool=_RASGO_IDS.slice();
  let guard=0;
  while(out.length<n && guard++<20){
    const items=pool.filter(id=>!out.includes(id)&&!(  _RASGO_INC[id]&&out.includes(_RASGO_INC[id])  )).map(id=>({id,w:bias[id]||1}));
    if(!items.length) break;
    let s=items.reduce((a,i)=>a+i.w,0), r=rnd()*s, sel=items[items.length-1].id;
    for(const it of items){ r-=it.w; if(r<=0){ sel=it.id; break; } }
    out.push(sel);
  }
  return out;
}
// Rasgos de un jugador (los cachea y los genera de forma determinista si faltan).
// Acepta cualquier objeto con nombre (n o nombre): jugador NPC, tú (carrera), compi…
function rasgosDe(j){
  if(!j) return [];
  if(Array.isArray(j.rasgos)) return j.rasgos;
  return (j.rasgos=_generaRasgos(j.n||j.nombre||"?",j));
}
function tieneRasgo(j,id){ return rasgosDe(j).indexOf(id)>=0; }
// Efecto de los rasgos del ejecutor sobre un golpe: multiplicadores {win,err}.
function rasgosMatch(j,shotKey,ctx){
  const rg=rasgosDe(j); let win=1,err=1; if(!rg.length) return {win,err};
  const pres=(ctx&&ctx.presion)||0;
  if(pres>=.5){
    if(rg.indexOf("clutch")>=0){ win*=1.12; err*=.90; }
    if(rg.indexOf("fragil")>=0){ win*=.88; err*=1.15; }
  }
  if(ctx&&ctx.premier&&rg.indexOf("escenario")>=0){ win*=1.08; err*=.95; }
  if(ctx&&ctx.agresivo&&rg.indexOf("pegador")>=0){ win*=1.12; err*=1.06; }
  if(rg.indexOf("muro")>=0) err*=.92;
  if(rg.indexOf("vago")>=0) win*=1.05;
  return {win,err};
}
// Ajuste de fragilidad ante la lesión por rasgos: +propenso, −hierro.
function rasgosLesionAjuste(j){ const rg=rasgosDe(j); return (rg.indexOf("propenso")>=0?2:0)-(rg.indexOf("hierro")>=0?2:0); }
// Multiplicador de ganancia de entrenamiento por rasgos.
function rasgosEntreno(j){ const rg=rasgosDe(j); return rg.indexOf("talento")>=0?1.4:(rg.indexOf("vago")>=0?0.6:1); }

/* ================================================================
   RELACIONES: la pareja no es solo química, es un vínculo con causas. La
   afinidad (compatibilidad de juego + carácter) marca cuánto aguanta la moral,
   y cuando se resquebraja hay un motivo concreto y alternativas para salvarla.
================================================================ */
function _perfilEstilo(est){ return (est==="agresivo"||est==="rematador")?"ataque":(est==="defensivo"||est==="constructor")?"defensa":"mixto"; }
// Afinidad 5..95 entre dos jugadores: estilos que se complementan, lados
// (drive+revés ideal) y carácter (leal suma, conflictivo resta, dos ambiciosos chocan).
function afinidadPareja(a,b){
  if(!a||!b) return 55;
  let af=58;
  const pa=_perfilEstilo(a.estilo), pb=_perfilEstilo(b.estilo);
  if((pa==="ataque"&&pb==="defensa")||(pa==="defensa"&&pb==="ataque")) af+=12;   // se complementan
  else if(pa==="ataque"&&pb==="ataque") af-=8;                                    // dos gallos en el corral
  else if(pa==="defensa"&&pb==="defensa") af-=3;
  if(a.lado!==undefined&&b.lado!==undefined) af += (a.lado!==b.lado)?8:-10;        // drive+revés vs pisarse
  const ra=rasgosDe(a), rb=rasgosDe(b);
  if(ra.indexOf("conflictivo")>=0) af-=12; if(rb.indexOf("conflictivo")>=0) af-=12;
  if(ra.indexOf("leal")>=0) af+=8; if(rb.indexOf("leal")>=0) af+=8;
  if(ra.indexOf("ambicioso")>=0&&rb.indexOf("ambicioso")>=0) af-=6;
  return clamp(Math.round(af),5,95);
}
// Un jugador de carrera (c) visto como objeto de afinidad.
function _comoJugador(c){ return {estilo:c.estilo,perso:c.perso,lado:c.lado,rasgos:c.rasgos,n:c.nombre}; }
// Motivo concreto del descontento del compañero (carrera). puesto = ranking actual.
function motivoDescontento(c,puesto){
  const compi=c.compi||{}, rc=rasgosDe(compi), racha=c.racha||[];
  const derr=racha.slice(-5).filter(x=>x==="D").length, jugados=Math.min(5,racha.length);
  if(derr>=3) return {clave:"resultados",txt:t("rup_m_result",{d:derr,j:jugados}),grave:derr>=4};
  if(rc.indexOf("ambicioso")>=0 && (puesto||99)>25) return {clave:"ambicion",txt:t("rup_m_ambicion",{p:puesto}),grave:(puesto||99)>40};
  const af=afinidadPareja(_comoJugador(c),compi);
  if(rc.indexOf("conflictivo")>=0||af<45) return {clave:"encaje",txt:t("rup_m_encaje",{af}),grave:af<35};
  return {clave:"desgaste",txt:t("rup_m_desgaste"),grave:false};
}
// Probabilidad (0..1) de que una opción de reconducción funcione, según el compañero.
function probReconduccion(c,id,motivo){
  const rc=rasgosDe(c.compi||{}), leal=rc.indexOf("leal")>=0, amb=rc.indexOf("ambicioso")>=0, conf=rc.indexOf("conflictivo")>=0;
  let p = leal?.85 : conf?.35 : .6;
  if(id==="promesa"&&amb) p+=.2;                       // al ambicioso le va la promesa de gloria
  if(id==="lado"&&motivo&&motivo.clave==="encaje") p+=.12;
  if(id==="foco"&&motivo&&motivo.clave==="resultados") p+=.12;
  if(motivo&&motivo.grave) p-=.15;
  return Math.max(.08,Math.min(.95,p));
}
// Evalúa si hay crisis de pareja (moral baja) y, si la hay, el motivo y las
// alternativas para reconducirla. Puro: la UI lo usa para pintar el evento.
function evaluarRuptura(c,puesto){
  if((c.compiMoral??65)>=35) return {crisis:false};
  const motivo=motivoDescontento(c,puesto);
  const ops=[{id:"hablar",txt:t("rup_o_hablar"),desc:t("rup_o_hablar_d")}];
  if(motivo.clave==="ambicion") ops.push({id:"promesa",txt:t("rup_o_promesa"),desc:t("rup_o_promesa_d")});
  if(motivo.clave==="encaje") ops.push({id:"lado",txt:t("rup_o_lado"),desc:t("rup_o_lado_d")});
  if(motivo.clave==="resultados") ops.push({id:"foco",txt:t("rup_o_foco"),desc:t("rup_o_foco_d")});
  ops.push({id:"dejar",txt:t("rup_o_dejar"),desc:t("rup_o_dejar_d")});
  return {crisis:true,motivo,ops};
}
/* ================================================================
   NEGOCIACIÓN: fichar un compañero no es pagar y listo. El candidato tiene
   exigencias (prestigio, lado, entrenador, reparto, ambición) y hay que
   convencerle. Puro y testable; la UI monta el modal sobre estas funciones.
================================================================ */
// Prestigio/reputación del jugador 0..100 (ranking + fama + estatus pro).
function prestigioJugador(puesto,fans,pro){
  const porRank=clamp(100-((puesto||40)-1)*2,0,100);              // #1→100, #50→2
  const porFama=clamp(Math.round(Math.log10((fans||100)+10)*22-20),0,100);
  return clamp(Math.round(porRank*.6+porFama*.4)+(pro?6:0),0,100);
}
// Exigencias de un candidato según su nivel, lado natural y rasgos.
function exigenciasCompi(cand){
  const niv=mediaAttrs(cand.attrs), rc=rasgosDe(cand);
  const ladoQuiere=(cand.lado===0||cand.lado===1)?cand.lado:((typeof ladoPorAttrs==="function")?ladoPorAttrs(cand.attrs,cand.estilo):1);
  return {
    niv,
    prestigioMin:clamp(Math.round((niv-42)*2.2),0,92),            // una estrella no se va con un don nadie
    ladoQuiere,
    exigeEntrenador:(niv>=68)||rc.indexOf("ambicioso")>=0,
    reparto:clamp(40+Math.round((niv-50)*0.6),40,60),            // % de premios que pide
    objetivoRanking:rc.indexOf("ambicioso")>=0?Math.max(5,Math.round(100-niv)):null,
    conflictivo:rc.indexOf("conflictivo")>=0,
    leal:rc.indexOf("leal")>=0,
  };
}
// Evalúa tu oferta. yo = {estilo,perso,lado,rasgos,n}; oferta = {cederLado, tieneEntrenador}.
// Devuelve {acepta, faltan:[motivos], afinidad, ex}.
function evaluaOfertaCompi(yo,cand,oferta,prestigio){
  const ex=exigenciasCompi(cand), faltan=[]; oferta=oferta||{};
  if(prestigio<ex.prestigioMin) faltan.push(t("mkt_falta_prest",{min:ex.prestigioMin,p:prestigio}));
  if(ex.exigeEntrenador&&!oferta.tieneEntrenador) faltan.push(t("mkt_falta_ent"));
  const colision = yo.lado!==undefined && yo.lado===ex.ladoQuiere, cede=colision&&!!oferta.cederLado;
  // lado final de cada uno
  let suLado, tuLado;
  if(!colision){ suLado=ex.ladoQuiere; tuLado=yo.lado; }
  else if(cede){ suLado=ex.ladoQuiere; tuLado=1-ex.ladoQuiere; }   // cedes: te mueves al opuesto
  else { suLado=1-yo.lado; tuLado=yo.lado; }                       // juega forzado en su lado no preferido
  if(colision&&!cede&&ex.conflictivo) faltan.push(t("mkt_falta_lado",{lado:ex.ladoQuiere===0?t("mkt_lado_drive"):t("mkt_lado_reves")}));
  let afin=afinidadPareja(Object.assign({},yo,{lado:tuLado}),{estilo:cand.estilo,perso:cand.perso,lado:suLado,rasgos:cand.rasgos,n:cand.n});
  if(colision&&!cede) afin=clamp(afin-14,5,95);                    // descontento por el lado forzado
  return {acepta:faltan.length===0,faltan,afinidad:afin,ex,colision,cede,suLado,tuLado};
}

/* ================================================================
   CONTRATOS DE CLUB: los jugadores tienen contrato (duración, salario, cláusula)
   y moral por minutos: un crack en el banquillo se quema, exige jugar y acaba
   pidiendo salir. Al vencer el contrato, renuevan o se van libres.
================================================================ */
// Contrato inicial según nivel: duración, salario semanal, cláusula y prima.
function mkContratoClub(nivel,rnd){
  const r=rnd||Math.random;
  return {
    temporadas: nivel>=68?(r()<.5?3:2):(r()<.6?2:1),
    salario:Math.round(nivel*8),
    clausula:Math.round(nivel*nivel*1.3),
    prima:Math.round(nivel*4),
  };
}
// Delta semanal de moral de plantilla según el rol (A titular / B / banquillo) y carácter.
function moralMinutosDelta(j,rol){
  const rc=rasgosDe(j), amb=rc.indexOf("ambicioso")>=0, leal=rc.indexOf("leal")>=0, conf=rc.indexOf("conflictivo")>=0;
  let d = rol==="A"?2 : rol==="B"?0 : -3;      // el banquillo desgasta
  if(rol!=="A"&&amb) d-=2;                       // el ambicioso quiere ser titular
  if(rol!=="A"&&conf) d-=1;
  if(rol!=="A"&&leal) d+=1;                      // el leal aguanta la suplencia
  if(rol==="A"&&amb) d+=1;
  return d;
}
// Estado del jugador según su moral de club (0..100): a gusto, con dudas, exige jugar o pide salir.
function estadoJugadorClub(j){
  const m=(j.moralC==null?70:j.moralC);
  if(m<25) return {clave:"salir",txt:"Pide salir: harto de no jugar.",col:-1};
  if(m<42) return {clave:"exige",txt:"Exige ser pareja A: se siente relegado.",col:-1};
  if(m<58) return {clave:"dudas",txt:"Con dudas: necesita sentirse importante.",col:0};
  return {clave:"ok",txt:"A gusto en el club.",col:1};
}
// Cláusula de rescisión de un jugador (la del contrato o, en su defecto, por nivel).
function valorClausula(j){ return (j.contrato&&j.contrato.clausula)||Math.round(mediaAttrs(j.attrs)*mediaAttrs(j.attrs)*1.3); }
// ¿Acepta renovar por el salario ofrecido? Espera acorde a nivel (más si es ambicioso, menos si es leal).
function evaluaRenovacionClub(j,salarioOfrecido){
  const niv=mediaAttrs(j.attrs), rc=rasgosDe(j);
  let espera=Math.round(niv*8*(rc.indexOf("ambicioso")>=0?1.25:1));
  if(rc.indexOf("leal")>=0) espera=Math.round(espera*0.85);
  return {acepta:salarioOfrecido>=espera, espera};
}

/* ================================================================
   OBJETIVOS DE TEMPORADA: metas de medio plazo (personales, de pareja y de
   patrocinador) para que las 52 semanas tengan arcos, no solo el nº1 a lo lejos.
================================================================ */
function mkObjetivosTemporada(c,puesto){
  const p=puesto||40, objs=[];
  const metaBase = p<=5?Math.max(1,p-1) : p<=20?Math.max(4,p-4) : Math.max(15,p-6);
  const metaRank = juntaTop(metaBase);   // la dificultad afloja o aprieta la meta de ranking
  objs.push({clave:"rank",txt:t("obj_rank",{m:metaRank}),meta:metaRank,rec:{dinero:600,fans:400,moral:8}});
  const metaTit = p<=10?2:1;
  objs.push({clave:"titulos",txt:t("obj_titulos",{m:metaTit}),meta:metaTit,base:(c.palmares||[]).length,rec:{dinero:900,fans:600,moral:6}});
  if(tieneRasgo(c.compi,"ambicioso")) objs.push({clave:"parejaPts",txt:t("obj_pareja",{n:(c.compi&&c.compi.n)||t("obj_tu_pareja")}),meta:2500,base:c.pts||0,rec:{dinero:0,fans:200,moral:16}});
  else objs.push({clave:"racha",txt:t("obj_racha"),meta:5,rec:{dinero:400,fans:500,moral:6}});
  return objs;
}
function progresoObjetivo(c,obj,puesto){
  if(obj.clave==="rank"){ const p=puesto||40; return {actual:p,hecho:p<=obj.meta,txt:t("obj_p_rank",{p,m:obj.meta})}; }
  if(obj.clave==="titulos"){ const n=(c.palmares||[]).length-(obj.base||0); return {actual:n,hecho:n>=obj.meta,txt:`${n}/${obj.meta}`}; }
  if(obj.clave==="parejaPts"){ const n=(c.pts||0)-(obj.base||0); return {actual:Math.max(0,n),hecho:n>=obj.meta,txt:t("obj_p_pts",{n:Math.max(0,n),m:obj.meta})}; }
  if(obj.clave==="racha"){ const n=c.rachaAct||0; return {actual:n,hecho:n>=obj.meta,txt:`${n}/${obj.meta}`}; }
  return {actual:0,hecho:false,txt:""};
}
// Marca los objetivos recién cumplidos (una sola vez) y los devuelve para premiar/avisar.
function evaluaObjetivos(c,puesto){
  const logr=[];
  (c.objetivos||[]).forEach(o=>{ if(o.hecho) return; if(progresoObjetivo(c,o,puesto).hecho){ o.hecho=true; logr.push(o); } });
  return logr;
}

/* ================================================================
   DILEMAS ENCADENADOS: decisiones cuyas consecuencias no son inmediatas, sino
   que llegan semanas después. Una elección de hoy reaparece más tarde: rodar el
   anuncio da dinero ahora pero te deja cansado para el Major de la semana que viene.
================================================================ */
// Todos los textos son funciones que pasan por t(): así el dilema se muestra en
// el idioma activo, y la consecuencia diferida se materializa (vía _efVal) en el
// idioma vigente en el momento de decidir.
const DILEMAS=[
  { id:"dubai",
    cond:c=>!!c.sponsor && (c.energia==null?100:c.energia)>40,
    titulo:c=>t("dil_dubai_t",{marca:c.sponsor.marca}),
    texto:c=>t("dil_dubai_x",{marca:c.sponsor.marca}),
    ops:[
      {txt:c=>t("dil_dubai_o1"),desc:c=>t("dil_dubai_o1d"),
       inm:{dinero:c=>Math.max(300,(c.sponsor?c.sponsor.sem*2:300)),fans:400},
       dif:{en:1,txt:c=>t("dil_dubai_o1c"),ef:{energia:-24}}},
      {txt:c=>t("dil_dubai_o2"),desc:c=>t("dil_dubai_o2d"),
       inm:{fans:-60},
       dif:{en:2,txt:c=>t("dil_dubai_o2c",{marca:c.sponsor?c.sponsor.marca:t("dil_patro_default")}),ef:{dinero:c=>-(c.sponsor?Math.round(c.sponsor.sem*0.6):0)}}}]},
  { id:"molestia",
    cond:c=>(c.energia==null?100:c.energia)<55 && !c.lesion,
    titulo:c=>t("dil_gemelo_t"),
    texto:c=>t("dil_gemelo_x"),
    ops:[
      {txt:c=>t("dil_gemelo_o1"),desc:c=>t("dil_gemelo_o1d"),
       inm:{},
       dif:{en:1,txt:c=>t("dil_gemelo_o1c"),ef:{fragil:2,energia:-8}}},
      {txt:c=>t("dil_gemelo_o2"),desc:c=>t("dil_gemelo_o2d"),
       inm:{energia:18,moral:-4},dif:null}]},
  { id:"exhibicion",
    cond:c=>!!c.pro,
    titulo:c=>t("dil_exhib_t"),
    texto:c=>t("dil_exhib_x"),
    ops:[
      {txt:c=>t("dil_exhib_o1"),desc:c=>t("dil_exhib_o1d"),
       inm:{fans:300,dinero:200},
       dif:{en:1,txt:c=>t("dil_exhib_o1c"),ef:{energia:-12}}},
      {txt:c=>t("dil_exhib_o2"),desc:c=>t("dil_exhib_o2d"),inm:{},dif:null}]},
];
function _efVal(v,c){ return typeof v==="function"?v(c):v; }
function _aplicaEf(c,e){
  if(!e) return;
  if(e.dinero!=null) c.dinero=(c.dinero||0)+_efVal(e.dinero,c);
  if(e.fans!=null) c.fans=Math.max(0,(c.fans||0)+_efVal(e.fans,c));
  if(e.energia!=null) c.energia=clamp((c.energia==null?100:c.energia)+_efVal(e.energia,c),0,100);
  if(e.moral!=null) c.compiMoral=clamp((c.compiMoral==null?65:c.compiMoral)+_efVal(e.moral,c),5,95);
  if(e.fragil!=null) c.fragil=Math.max(0,(c.fragil||0)+_efVal(e.fragil,c));
}
function dilemasDisponibles(c){ return DILEMAS.filter(d=>{ try{ return d.cond(c); }catch(e){ return false; } }); }
function _dilemaPorId(id){ return DILEMAS.find(d=>d.id===id); }
// Elige un dilema disponible y lo activa (sin resolver). Devuelve el dilema o null.
function eligeDilema(c,semana,rnd){
  if(c.dilemaActivo) return null;
  const disp=dilemasDisponibles(c); if(!disp.length) return null;
  const d=disp[Math.floor((rnd||Math.random)()*disp.length)];
  c.dilemaActivo={id:d.id,sem:semana};
  return d;
}
// Aplica la opción elegida: efecto inmediato ahora y encola la consecuencia diferida.
function aplicarOpcionDilema(c,opIdx,semana){
  const d=_dilemaPorId(c.dilemaActivo&&c.dilemaActivo.id); c.dilemaActivo=null;
  if(!d) return null;
  const op=d.ops[opIdx]; if(!op) return null;
  _aplicaEf(c,op.inm);
  let pend=null;
  if(op.dif){
    pend={sem:semana+(op.dif.en||1),txt:_efVal(op.dif.txt,c),ef:{}};
    const e=op.dif.ef||{}; ["dinero","fans","energia","moral","fragil"].forEach(k=>{ if(e[k]!=null) pend.ef[k]=_efVal(e[k],c); });
    (c.pendientes=c.pendientes||[]).push(pend);
  }
  return {op,pend};
}
// Resuelve (aplica y retira) las consecuencias cuya semana ya ha llegado. Devuelve las resueltas.
function resolverPendientes(c,semana){
  const out=[],keep=[];
  (c.pendientes||[]).forEach(p=>{ if(p.sem<=semana){ _aplicaEf(c,p.ef); out.push(p); } else keep.push(p); });
  c.pendientes=keep;
  return out;
}

// Aplica la opción elegida (muta c.compiMoral). Devuelve {rompio, txt}.
function aplicarOpcionRuptura(c,id,motivo){
  if(id==="dejar") return {rompio:true,txt:t("rup_r_rota")};
  const leal=tieneRasgo(c.compi||{},"leal");
  const ok=Math.random()<probReconduccion(c,id,motivo);
  if(ok){ c.compiMoral=clamp((c.compiMoral??65)+(leal?32:24),5,95); return {rompio:false,txt:t("rup_r_funciona")}; }
  c.compiMoral=clamp((c.compiMoral??65)+6,5,95);
  return {rompio:(c.compiMoral??65)<35,txt:t("rup_r_nocala")};
}

// Informe de ojeo del rival: lee sus atributos, estilo y personalidad y produce
// lecturas CONCRETAS (debilidades y fortalezas) más una táctica recomendada, para
// que el jugador pueda leer el partido antes de jugarlo. Función pura y testable:
// mismos atributos → mismo informe. miNivel = nivel de tu pareja (para el consejo).
function informeRival(par, miNivel){
  const j=(par&&par.jug)||[];
  if(j.length<2) return null;
  const niv=nivelPareja(par);
  const med=[mediaAttrs(j[0].attrs),mediaAttrs(j[1].attrs)];
  const pa=k=>Math.round(((j[0].attrs[k]||60)+(j[1].attrs[k]||60))/2);   // media de la pareja en un golpe
  const esRematador=j[0].estilo==="rematador"||j[1].estilo==="rematador";
  const deb=[], fue=[];
  // fortalezas (todo pasa por t(): el informe sale en el idioma activo)
  const redAtq=Math.round((pa("volea")+pa("remate")+pa("bandeja")+pa("vibora"))/4);
  if(redAtq>=niv+4) fue.push(t("inf_fue_red"));
  if(esRematador) fue.push(t("inf_fue_remate"));
  if(pa("dejada")>=niv+5) fue.push(t("inf_fue_dejada"));
  // debilidades
  if(pa("globo")<=niv-5) deb.push(t("inf_deb_globo"));
  if(pa("pared")<=niv-5) deb.push(t("inf_deb_pared"));
  if(pa("bandeja")<=niv-5) deb.push(t("inf_deb_bandeja"));
  if(esRematador && pa("fondo")<=niv-3) deb.push(t("inf_deb_largo"));
  else if(pa("fondo")<=niv-6) deb.push(t("inf_deb_fondo"));
  // eslabón débil de la pareja
  let objetivo=null;
  if(Math.abs(med[0]-med[1])>=6){ objetivo=med[0]<med[1]?0:1; deb.push(t("inf_deb_eslabon",{n:j[objetivo].n,m1:med[objetivo],m2:med[1-objetivo]})); }
  // lectura mental
  const emo=j.find(p=>p.perso==="emocional");
  if(emo) deb.push(t("inf_deb_emocional",{n:emo.n}));
  else { const val=j.find(p=>p.perso==="valiente"); if(val) fue.push(t("inf_fue_valiente",{n:val.n})); }
  // rasgos del rival (el ojeador los revela): identidad que cambia el partido
  j.forEach(p=>{
    if(tieneRasgo(p,"fragil")) deb.push(t("inf_deb_fragil",{n:p.n}));
    if(tieneRasgo(p,"propenso")) deb.push(t("inf_deb_propenso",{n:p.n}));
    if(tieneRasgo(p,"clutch")) fue.push(t("inf_fue_clutch",{n:p.n}));
    if(tieneRasgo(p,"muro")) fue.push(t("inf_fue_muro",{n:p.n}));
    if(tieneRasgo(p,"pegador")) fue.push(t("inf_fue_pegador",{n:p.n}));
  });
  if(!deb.length) deb.push(t("inf_deb_ninguna"));
  if(!fue.length) fue.push(t("inf_fue_ninguna"));
  // táctica recomendada
  const rec={agres:"normal", diana:objetivo!=null?"debil":"repartir", red:"normal", clutch:"normal"};
  const d=miNivel!=null?miNivel-niv:0;
  if(miNivel!=null) rec.agres = d>=4?"agresiva" : d<=-4?"conservadora" : "normal";
  // red: si defienden mal el globo o son flojos arriba, súbete; si son temibles
  // en la red, aguanta y no te expongas
  if(pa("globo")<=niv-5 || redAtq<=niv-4) rec.red="subir";
  else if(redAtq>=niv+5) rec.red="aguantar";
  // puntos calientes: de favorito, administra; de menos, arriesga para robar
  rec.clutch = d>=5?"conservar" : d<=-3?"arriesgar" : "normal";
  const redTxt=rec.red==="subir"?t("inf_rec_subir"):rec.red==="aguantar"?t("inf_rec_aguantar"):"";
  const recTxt=t("inf_rec_frase",{
    quien:objetivo!=null?t("inf_rec_carga",{n:j[objetivo].n}):t("inf_rec_reparte"),
    como:rec.agres==="agresiva"?t("inf_rec_deguello"):rec.agres==="conservadora"?t("inf_rec_seguro"):t("inf_rec_normal"),
    red:redTxt});
  return {niv, med, deb:deb.slice(0,4), fue:fue.slice(0,2), objetivo, rec, recTxt};
}
// Lesiones con gravedad (grav 1 leve … 3 grave). Las graves tiran más semanas
// y, sobre todo, dejan secuela al volver.
const LESIONES=[
  {n:"sobrecarga en el gemelo",k:"les_gemelo",sem:1,grav:1},
  {n:"fascitis plantar",k:"les_fascitis",sem:2,grav:1},
  {n:"tendinitis en el hombro",k:"les_hombro",sem:2,grav:2},
  {n:"rotura fibrilar en el sóleo",k:"les_soleo",sem:3,grav:2},
  {n:"epicondilitis (codo de pádel)",k:"les_codo",sem:3,grav:2},
  {n:"esguince grave de tobillo",k:"les_tobillo",sem:5,grav:3},
  {n:"rotura del tendón de Aquiles",k:"les_aquiles",sem:8,grav:3},
];
// Elige una lesión ponderando por gravedad: las graves son raras y casi solo
// aparecen cuando el riesgo es alto (energía por los suelos, fragilidad). riesgo 0..1.
function pickLesion(riesgo){
  riesgo=clamp(riesgo==null?.4:riesgo,0,1);
  const items=LESIONES.map(l=>{
    let w=l.grav===1?6:l.grav===2?3:1;
    if(l.grav===3) w*=.25+riesgo*1.6;      // graves: se disparan con riesgo alto
    if(l.grav===1) w*=1.4-riesgo*.7;       // leves: dominan cuando el riesgo es bajo
    return {l,w:Math.max(.04,w)};
  });
  let s=items.reduce((a,i)=>a+i.w,0), r=Math.random()*s;
  for(const i of items){ r-=i.w; if(r<=0) return {...i.l}; }
  return {...LESIONES[0]};
}
// Secuela al recibir el alta: una merma temporal de rendimiento (pct de atributos)
// durante unas semanas. Las lesiones leves no dejan secuela.
function secuelaDe(lesion){
  const g=(lesion&&lesion.grav)||1;
  if(g<=1) return null;
  return {sem:g===3?3:2, pct:g===3?10:5};
}
// Factor de forma 0..~1.1 combinando energía, química y secuela (merma).
function factorForma(energia,quimica,merma){
  let f=(0.86+0.14*(clamp(energia==null?100:energia,0,100)/100))*(0.94+0.12*(clamp(quimica==null?60:quimica,0,100)/100));
  if(merma&&merma.pct) f*=(1-merma.pct/100);
  return f;
}
// Probabilidad de lesión tras un partido según energía y fragilidad (historial).
function riesgoLesionPost(energia,fragil,tieneFisio){
  const en=energia==null?100:energia;
  let base = en<20 ? .30 : (en<35 ? .06 : 0);   // muy justo de fuerzas → riesgo real
  base += Math.min(.15,(fragil||0)*.03);        // cada lesión previa te hace más frágil
  if(tieneFisio) base*=.5;
  return clamp(base,0,.5);
}
// Intenta lesionar a un portador (carrera o jugador de club) tras un partido.
// Devuelve la lesión (y sube su fragilidad) o null. Muta port.fragil.
function intentaLesion(port,tieneFisio){
  const fragilEf=Math.max(0,(port.fragil||0)+rasgosLesionAjuste(port));   // rasgos: propenso/hierro
  const r=kLesion(riesgoLesionPost(port.energia,fragilEf,tieneFisio));    // la dificultad modula el riesgo médico
  if(Math.random()>=r) return null;
  const les=pickLesion(clamp(1-(port.energia==null?100:port.energia)/40,0,1));
  if(tieneFisio) les.sem=Math.max(1,les.sem-1);
  port.fragil=(port.fragil||0)+1;
  return les;
}
// Alta médica: limpia la baja y, si toca, deja la secuela (merma). Devuelve la secuela.
function curarLesion(port){
  const sec=secuelaDe(port.lesion);
  port.lesion=null;
  if(sec) port.merma=sec;
  return sec;
}
// Enfría la merma una semana; la elimina cuando se agota.
function decaeMerma(port){
  if(port.merma){ port.merma.sem--; if(port.merma.sem<=0) port.merma=null; }
}
// La moral pesa en la pista: 5..95 → ajuste de confianza -11..+7.
function moralAjusteConf(moral){
  return Math.round((clamp(moral==null?65:moral,5,95)-60)/5);
}
const WORLD_N=80;
const PAISES=[["🇪🇸",46],["🇦🇷",30],["🇧🇷",5],["🇫🇷",4],["🇮🇹",4],["🇵🇹",3],["🇸🇪",2],["🇲🇽",2],["🇨🇱",2],["🇧🇪",2]];
// hash determinista del nombre → siempre la misma cara para el mismo jugador
function hashStr(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const AVA_PIEL=["#EFC49E","#E3AE85","#D2996E","#BE8154","#A26940","#7F4E2E","#5E3A22"];
const AVA_PELO=["#140F0C","#2E2118","#4A2E1B","#6E4423","#9A6B2E","#B98A44","#241A14"];
const AVA_ROPA=["#4FA3D8","#E05656","#3FBF8F","#E0A030","#9B59D0","#5CC8E6","#E06AA0","#C6F53C","#D8D8D8","#2A2A32","#E85040","#40C0A0"];
/* ================================================================
   AVATAR: retrato ilustrado con volumen. Todo se dibuja por código (SVG puro,
   sin recursos externos) y es DETERMINISTA por nombre, así el mismo jugador
   tiene siempre la misma cara sin guardar nada.
   El realismo viene de tres cosas: sombras DIFUMINADAS (filtros de desenfoque)
   en vez de manchas planas, ojos pequeños con párpado que recorta el iris, y
   una textura de piel granulada. Además el retrato ENVEJECE: desde los 29
   aparecen canas progresivas y a partir de 32/38 arrugas de expresión.
================================================================ */
let _avId=0;
const AVA_COMPL=["nada","gorra","visera","cinta","gafas"];
function _avaMez(a,b,t){
  if(!a||a[0]!=="#"||!b||b[0]!=="#") return a||"#8A94A7";
  const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16);
  const r=Math.round(((A>>16)&255)*(1-t)+((B>>16)&255)*t),
        g=Math.round(((A>>8)&255)*(1-t)+((B>>8)&255)*t),
        c=Math.round((A&255)*(1-t)+(B&255)*t);
  return "#"+((1<<24)+(r<<16)+(g<<8)+c).toString(16).slice(1);
}
function avatarSVG(jug,tam,edadOverride){
  tam=tam||44;
  const nom=(jug&&jug.n)||"?";
  const h=Math.abs(hashStr(nom));
  const av=(jug&&jug.ava)||{};
  const id="a"+(_avId=(_avId||0)+1);
  const piel=av.piel!==undefined?AVA_PIEL[av.piel%AVA_PIEL.length]:AVA_PIEL[h%AVA_PIEL.length];
  const ropa=(jug&&jug._ropa)||AVA_ROPA[(h>>6)%AVA_ROPA.length];
  const fem=(jug&&jug.sexo==="F");
  const edad=edadOverride!==undefined?edadOverride:((jug&&jug.edad)||24);
  // canas progresivas desde 29; arrugas desde 32 y 38
  let pelo=av.pelo!==undefined?AVA_PELO[av.pelo%AVA_PELO.length]:AVA_PELO[(h>>3)%AVA_PELO.length];
  const cana=edad<29?0:Math.min(.9,(edad-29)/15);
  if(cana>0) pelo=_avaMez(pelo,"#CFCCC6",cana);
  const vet=edad>=32, may=edad>=38;
  // peinado: catálogos distintos por sexo (0-2 femeninos · 3-6 masculinos)
  const tipos=fem?[0,1,2]:[3,4,5,6];
  const tp=av.tipoPelo!==undefined?tipos[av.tipoPelo%tipos.length]:tipos[(h>>9)%tipos.length];
  const barba=fem?0:(av.barba!==undefined?(av.barba%3):(((h>>12)%3===0)?(((h>>13)%2)?1:2):0));
  const cmp=av.compl!==undefined?(av.compl%AVA_COMPL.length):[0,0,0,1,1,2,3,4][(h>>15)%8];
  const S1=aclara(piel,.80), S2=aclara(piel,.62), S3=aclara(piel,.46),
        LUZ=aclara(piel,1.13), LUZ2=aclara(piel,1.24), lab=_avaMez(piel,"#8E4038",.55);
  return `<svg viewBox="0 0 64 76" width="${tam}" height="${Math.round(tam*76/64)}" preserveAspectRatio="xMidYMid meet">
 <defs>
  <filter id="b${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.7"/></filter>
  <filter id="bb${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter>
  <filter id="bs${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation=".7"/></filter>
  <filter id="gr${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.9" numOctaves="3" seed="${h%97}" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".13"/></feComponentTransfer></filter>
  <linearGradient id="bg${id}" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#2B3543"/><stop offset="1" stop-color="#121820"/></linearGradient>
  <linearGradient id="tr${id}" x1="0" y1="0" x2="1" y2=".7"><stop offset="0" stop-color="${aclara(ropa,1.18)}"/><stop offset=".55" stop-color="${ropa}"/><stop offset="1" stop-color="${aclara(ropa,.58)}"/></linearGradient>
  <clipPath id="cf${id}"><path d="M32 10.5 C41 10.5 45.6 17.5 45.6 27 C45.6 33.5 43.8 39 41 43.2 C38.4 47.2 35.2 50 32 50 C28.8 50 25.6 47.2 23 43.2 C20.2 39 18.4 33.5 18.4 27 C18.4 17.5 23 10.5 32 10.5z"/></clipPath>
 </defs>
 <rect width="64" height="76" fill="url(#bg${id})"/>
 <ellipse cx="30" cy="26" rx="24" ry="26" fill="#fff" opacity=".055" filter="url(#bb${id})"/>
 <path d="M32 55 C22.5 55 12.5 61.5 10.5 76 h43 C51.5 61.5 41.5 55 32 55z" fill="url(#tr${id})"/>
 <path d="M23 57.5 C20 62 18 68 17.4 76 h-6.9 C12.5 63.5 17 58 23 57.5z" fill="#000" opacity=".16" filter="url(#b${id})"/>
 <path d="M26.4 44 h11.2 v10 q-5.6 3.4 -11.2 0z" fill="${S1}"/>
 <path d="M26 44 q6 7 12 0 v5 q-6 5 -12 0z" fill="${S3}" opacity=".85" filter="url(#b${id})"/>
 <path d="M32 10.5 C41 10.5 45.6 17.5 45.6 27 C45.6 33.5 43.8 39 41 43.2 C38.4 47.2 35.2 50 32 50 C28.8 50 25.6 47.2 23 43.2 C20.2 39 18.4 33.5 18.4 27 C18.4 17.5 23 10.5 32 10.5z" fill="${piel}"/>
 <g clip-path="url(#cf${id})">
   <path d="M38 8 C46 14 48 24 47 34 C46 42 43 48 39 52 L52 52 L52 6z" fill="${S2}" opacity=".85" filter="url(#bb${id})"/>
   <path d="M40 40 C38 46 35 50 32 52 C29 50 26 46 24 40 C27 46 37 46 40 40z" fill="${S2}" opacity=".5" filter="url(#b${id})"/>
   <ellipse cx="25.5" cy="24" rx="7" ry="9" fill="${LUZ2}" opacity=".5" filter="url(#bb${id})"/>
   <ellipse cx="32" cy="17" rx="9" ry="5" fill="${LUZ}" opacity=".45" filter="url(#bb${id})"/>
   <ellipse cx="25.6" cy="29.6" rx="5" ry="3.4" fill="${S2}" opacity=".45" filter="url(#b${id})"/>
   <ellipse cx="38.4" cy="29.6" rx="5" ry="3.4" fill="${S2}" opacity=".55" filter="url(#b${id})"/>
   <ellipse cx="23.8" cy="34.5" rx="4.2" ry="3" fill="${LUZ}" opacity=".4" filter="url(#b${id})"/>
   <ellipse cx="40.2" cy="34.5" rx="4.2" ry="3" fill="${S1}" opacity=".5" filter="url(#b${id})"/>
   <ellipse cx="20.6" cy="26" rx="2.6" ry="4.5" fill="${S1}" opacity=".45" filter="url(#b${id})"/>
   <path d="M30.6 27 q-.9 6 -1.6 9.4 l3 .6 q.4 -5 .6 -10z" fill="${S1}" opacity=".55" filter="url(#bs${id})"/>
   <ellipse cx="32.6" cy="37.4" rx="3.2" ry="1.9" fill="${S1}" opacity=".5" filter="url(#bs${id})"/>
   <ellipse cx="31.4" cy="35.6" rx="2.2" ry="1.6" fill="${LUZ}" opacity=".5" filter="url(#bs${id})"/>
   <ellipse cx="30" cy="37.6" rx=".85" ry=".6" fill="${S3}" opacity=".6" filter="url(#bs${id})"/>
   <ellipse cx="34" cy="37.6" rx=".85" ry=".6" fill="${S3}" opacity=".6" filter="url(#bs${id})"/>
   <path d="M28.4 38.4 q-1.4 3 -.6 5.4" stroke="${S2}" stroke-width=".9" fill="none" opacity=".3" filter="url(#bs${id})"/>
   <path d="M35.6 38.4 q1.4 3 .6 5.4" stroke="${S2}" stroke-width=".9" fill="none" opacity=".35" filter="url(#bs${id})"/>
   <path d="M23.4 30.1 q2.5 -2.6 5.2 -.4 q-2.5 2.1 -5.2 .4z" fill="#E8E2D9"/>
   <path d="M35.6 29.7 q2.7 -2.2 5.2 .4 q-2.7 1.7 -5.2 -.4z" fill="#E1DBD2"/>
   <circle cx="26" cy="29.8" r="1.45" fill="#4A3220"/><circle cx="38.1" cy="29.8" r="1.45" fill="#422C1D"/>
   <circle cx="26" cy="29.8" r=".68" fill="#140E08"/><circle cx="38.1" cy="29.8" r=".68" fill="#140E08"/>
   <circle cx="25.6" cy="29.3" r=".38" fill="#fff" opacity=".95"/><circle cx="37.7" cy="29.3" r=".38" fill="#fff" opacity=".8"/>
   <path d="M23 29.8 q2.9 -2.9 5.8 -.7 l0 -1.3 q-3 -2 -6.1 .5z" fill="${S1}"/>
   <path d="M35.3 29.4 q3 -2.5 5.9 .5 l.2 -1.3 q-3 -2.2 -6.3 -.3z" fill="${S1}"/>
   <path d="M23.1 29.9 q2.9 -2.8 5.7 -.6" stroke="${S3}" stroke-width=".65" fill="none" opacity=".85"/>
   <path d="M35.4 29.5 q2.9 -2.5 5.8 .5" stroke="${S3}" stroke-width=".65" fill="none" opacity=".85"/>
   <path d="M23.6 31.1 q2.5 1.3 5 -.35" stroke="${S1}" stroke-width=".5" fill="none" opacity=".6"/>
   <path d="M35.8 30.8 q2.5 1.4 5 -.4" stroke="${S1}" stroke-width=".5" fill="none" opacity=".6"/>
   <path d="M22.4 26.2 q3.2 -2.3 6.4 -.8 q-3.2 -.4 -6.4 .8z" fill="${pelo}" opacity=".92"/>
   <path d="M35.2 25.4 q3.2 -1.5 6.6 1 q-3.4 -1.2 -6.6 -1z" fill="${pelo}" opacity=".92"/>
   <path d="M27.4 42.6 q4.6 -1.9 9.2 -.2 q-4.6 1.5 -9.2 .2z" fill="${lab}" opacity=".85"/>
   <path d="M27.6 42.6 q4.5 3.2 8.9 -.2 q-4.4 1.7 -8.9 .2z" fill="${_avaMez(lab,'#000',.25)}" opacity=".7"/>
   <path d="M28.6 44.4 q3.4 1.2 6.8 -.2" stroke="${LUZ}" stroke-width=".7" fill="none" opacity=".35" filter="url(#bs${id})"/>
   <path d="M27.3 42.5 q4.7 -1.6 9.4 -.1" stroke="${S3}" stroke-width=".6" fill="none" opacity=".5"/>
   <ellipse cx="32" cy="47" rx="3.4" ry="2.2" fill="${LUZ}" opacity=".28" filter="url(#b${id})"/>
   <rect x="16" y="8" width="32" height="44" filter="url(#gr${id})" opacity=".9"/>
   ${vet?`<path d="M22 35.6 q1.8 2.8 1.2 5.2" stroke="${S3}" stroke-width=".5" fill="none" opacity=".35"/><path d="M42 35.6 q-1.8 2.8 -1.2 5.2" stroke="${S3}" stroke-width=".5" fill="none" opacity=".4"/><path d="M22.2 26.8 q3.2 -1.6 6.4 -.6" stroke="${S2}" stroke-width=".45" fill="none" opacity=".35"/>`:""}
   ${may?`<path d="M25 21.4 q7 -1.9 14 0" stroke="${S2}" stroke-width=".5" fill="none" opacity=".4"/><path d="M25.8 23.8 q6.2 -1.6 12.4 0" stroke="${S2}" stroke-width=".45" fill="none" opacity=".32"/><path d="M20.6 31.6 q1.6 -.8 3 -.3" stroke="${S2}" stroke-width=".45" fill="none" opacity=".35"/><path d="M43.4 31.6 q-1.6 -.8 -3 -.3" stroke="${S2}" stroke-width=".45" fill="none" opacity=".35"/>`:""}
   ${barba===2?`<path d="M20.6 33 C22.6 44 27 50 32 50 C37 50 41.4 44 43.4 33 C41 41 37.4 43.4 32 43.8 C26.6 43.4 23 41 20.6 33z" fill="${pelo}" opacity=".5" filter="url(#bs${id})"/>`:""}
   ${barba===1?`<path d="M28.4 45.6 q3.6 1.6 7.2 0 q-.6 4.4 -3.6 4.6 q-3 -.2 -3.6 -4.6z" fill="${pelo}" opacity=".55" filter="url(#bs${id})"/><path d="M27.8 41.4 q-.8 1.6 -.4 2.6 M36.2 41.4 q.8 1.6 .4 2.6" stroke="${pelo}" stroke-width="1.4" fill="none" opacity=".45"/>`:""}
 </g>
 <path d="M18.8 27.6 C16.2 27.4 15.4 31.6 17.2 33.8 C18.2 35 19.2 34.4 19.3 33.6z" fill="${piel}"/>
 <path d="M18.4 29 C17.4 29.6 17.4 32 18.4 33" stroke="${S2}" stroke-width=".7" fill="none" opacity=".6"/>
 <path d="M45.2 27.6 C47.8 27.4 48.6 31.6 46.8 33.8 C45.8 35 44.8 34.4 44.7 33.6z" fill="${S1}"/>
 ${tp===0?`<path d="M32 9.4 C41.6 9.4 46.4 17 45.8 27.4 C45 22 43.4 18.4 41 15.8 C37.4 19 26.6 19 23 15.8 C20.6 18.4 19 22 18.2 27.4 C17.6 17 22.4 9.4 32 9.4z" fill="${pelo}"/><path d="M23 15.8 C26.6 19 37.4 19 41 15.8 C39.2 12.8 35.8 11.2 32 11.2 C28.2 11.2 24.8 12.8 23 15.8z" fill="${pelo}"/><path d="M44 16.4 C49.6 20 51 28.4 48.2 36 C47.2 38.8 45.6 39.6 44.8 39 C47 33.4 47.2 23.4 44 16.4z" fill="${aclara(pelo,.82)}"/><path d="M24 13 C27.6 15.6 36.4 15.6 40 13 C41.6 14.6 43 17 43.8 19.6 C43 15.8 41 12.8 38 11.4 C35.4 13.4 28.6 13.4 26 11.4 C23 12.8 21 15.8 20.2 19.6 C21 17 22.4 14.6 24 13z" fill="#fff" opacity=".1"/>`
  :tp===1?`<path d="M32 9 C41.6 9 47 16.4 46.2 30 C45.6 23 44 18.4 41.4 15.4 C37.6 19.4 26.4 19.4 22.6 15.4 C20 18.4 18.4 23 17.8 30 C17 16.4 22.4 9 32 9z" fill="${pelo}"/><path d="M22.6 15.4 C26.4 19.4 37.6 19.4 41.4 15.4 C39.4 12.4 35.8 10.8 32 10.8 C28.2 10.8 24.6 12.4 22.6 15.4z" fill="${pelo}"/><path d="M17.8 29 C14 37.4 14.2 51 17.6 59.4 l4.6 -1.6 C19 50.2 18.8 37.6 20 30z" fill="${pelo}"/><path d="M46.2 29 C50 37.4 49.8 51 46.4 59.4 l-4.6 -1.6 C45 50.2 45.2 37.6 44 30z" fill="${aclara(pelo,.78)}"/><path d="M25 12.4 C28.6 14.6 35.4 14.6 39 12.4 C41 14 42.8 16.8 43.8 20 C43 15.6 40.8 12.2 37.6 10.8 C35 12.4 29 12.4 26.4 10.8 C23.2 12.2 21 15.6 20.2 20 C21.2 16.8 23 14 25 12.4z" fill="#fff" opacity=".1"/>`
  :tp===2?`<path d="M32 10 C40.8 10 46.6 16.6 45.8 28 C45 23 43.6 19.4 41.2 17 C37.6 20 26.4 20 22.8 17 C20.4 19.4 19 23 18.2 28 C17.4 16.6 23.2 10 32 10z" fill="${pelo}"/><path d="M22.8 17 C26.4 20 37.6 20 41.2 17 C39.4 14.2 35.8 12.6 32 12.6 C28.2 12.6 24.6 14.2 22.8 17z" fill="${pelo}"/><ellipse cx="32" cy="7.6" rx="5" ry="4.4" fill="${pelo}"/><ellipse cx="30.2" cy="6.4" rx="1.8" ry="1.4" fill="#fff" opacity=".13"/>`
  :tp===3?`<path d="M32 10 C40 10 45.8 15 45.4 27.4 C44.6 22 43 19 41 15.4 C36.6 19.4 27.4 19.4 23 15.4 C21 19 19.4 22 18.6 27.4 C18.2 15 24 10 32 10z" fill="${pelo}"/><path d="M23 15.4 C27.4 19.4 36.6 19.4 41 15.4 C38.8 13.8 35.6 12.2 32 12.2 C28.4 12.2 25.2 13.8 23 15.4z" fill="${pelo}"/><path d="M24.4 13.4 C28 15.6 36 15.6 39.6 13.4 C41.4 15 43 17.6 43.8 20.6 C43 16.4 41 13 38.2 11.6 C35.4 13.4 28.6 13.4 25.8 11.6 C23 13 21 16.4 20.2 20.6 C21 17.6 22.6 15 24.4 13.4z" fill="#fff" opacity=".12"/>`
  :tp===4?`<path d="M32 10.4 C39.2 10.4 44.4 15.4 45 25 C43.4 20.2 38.4 17.2 32 17.2 C25.6 17.2 20.6 20.2 19 25 C19.6 15.4 24.8 10.4 32 10.4z" fill="${pelo}" opacity=".92"/><path d="M20 23.6 C21.8 16.6 26.2 12.4 32 12.4 C37.8 12.4 42.2 16.6 44 23.6 C41.6 19.2 37.2 16.6 32 16.6 C26.8 16.6 22.4 19.2 20 23.6z" fill="#fff" opacity=".1"/>`
  :tp===5?`<path d="M32 9.4 C40 9.4 46.6 15 45.4 28.4 C44.8 23 43.4 19.6 41.6 17.2 C37 22.2 27 22.2 22.4 17.2 C20.6 19.6 19.2 23 18.6 28.4 C17.4 15 24 9.4 32 9.4z" fill="${pelo}"/><path d="M22.4 17.2 C27 22.2 37 22.2 41.6 17.2 C39.4 13.8 35.8 12 32 12 C28.2 12 24.6 13.8 22.4 17.2z" fill="${pelo}"/><path d="M22.6 18.2 C27 23 37 23 41.4 18.2 C41.4 20.6 41 22.6 40.2 23.8 C36 26.6 28 26.6 23.8 23.8 C23 22.6 22.6 20.6 22.6 18.2z" fill="${pelo}"/>`
  :`<path d="M32 11 C38.6 11 43.4 15.6 44.6 24.6 C43.6 21.2 42.2 18.8 40.6 17.4 C40.2 14.8 38.4 13 36 12.2 C38 14.4 39 17.2 39.2 20.2 C36 22 28 22 24.8 20.2 C25 17.2 26 14.4 28 12.2 C25.6 13 23.8 14.8 23.4 17.4 C21.8 18.8 20.4 21.2 19.4 24.6 C20.6 15.6 25.4 11 32 11z" fill="${pelo}"/><path d="M18.9 30 C18.7 26.6 19.1 23.6 19.9 21.8 C19.5 25.2 19.5 28.2 19.9 31z" fill="${pelo}"/><path d="M45.1 30 C45.3 26.6 44.9 23.6 44.1 21.8 C44.5 25.2 44.5 28.2 44.1 31z" fill="${pelo}"/>`}
 ${cmp===1?`<path d="M17.6 24.6 C17.6 14.4 24 8.6 32 8.6 C40 8.6 46.4 14.4 46.4 24.6 q-14.4 -5.4 -28.8 0z" fill="${ropa}"/><path d="M32 8.6 C24 8.6 17.6 14.4 17.6 24.6 q3.4 -1.3 6.9 -2.1 C25.2 15.4 28 10.6 32 8.6z" fill="#fff" opacity=".16"/><path d="M17.6 23.4 C11.6 24.2 8.6 26.6 8.4 29.4 q11.6 -3.8 23.6 -3.8 q-7.6 -2.4 -14.4 -2.2z" fill="${aclara(ropa,.72)}"/><ellipse cx="32" cy="8.4" rx="1.5" ry="1.5" fill="${aclara(ropa,1.3)}"/><path d="M18 22.6 q14 -4.6 28 0 l0 1.6 q-14 -4.4 -28 0z" fill="#000" opacity=".12"/>`
  :cmp===2?`<path d="M18.2 23.6 q13.8 -5.2 27.6 0 l-.4 2.6 q-13.4 -4.6 -26.8 0z" fill="${ropa}"/><path d="M18.4 24.6 C12 25.4 8.8 28 8.6 31 q11.8 -4 24 -4 q-7 -2.8 -14.2 -2.4z" fill="${aclara(ropa,.78)}"/><path d="M19 23 q13 -4.4 26 0 l0 1.2 q-13 -4.2 -26 0z" fill="#fff" opacity=".18"/>`
  :cmp===3?`<path d="M18.4 23.8 q13.6 -5 27.2 0 l-.5 3.4 q-13.1 -4.6 -26.2 0z" fill="${ropa}"/><path d="M18.6 24.6 q13.4 -4.6 26.8 0" stroke="#fff" stroke-width=".8" fill="none" opacity=".22"/><path d="M18.4 26.6 q13.6 -4.6 27.2 0 l-.2 .8 q-13.4 -4.4 -26.8 0z" fill="#000" opacity=".14"/>`
  :cmp===4?`<g><path d="M20.4 27.4 q5.6 -1.6 10.8 -.2 q.8 4.6 -1.6 6.2 q-4 1.8 -7 -.6 q-2 -2 -2.2 -5.4z" fill="#1A1D24" opacity=".92"/><path d="M33 27.2 q5.4 -1.4 10.8 .2 q-.2 3.4 -2.2 5.4 q-3 2.4 -7 .6 q-2.4 -1.6 -1.6 -6.2z" fill="#1A1D24" opacity=".92"/><path d="M30.6 27.5 q1.4 -.4 2.8 0" stroke="#1A1D24" stroke-width="1.3" fill="none"/><path d="M19.6 27.6 q1 -1 2 -1.2 M42.4 26.4 q1.4 .2 2.4 1.2" stroke="#1A1D24" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M22 28.4 q3 -.9 5.6 -.3 q-.4 1.6 -1.4 2.2 q-3 .4 -4.2 -1.9z" fill="#fff" opacity=".22"/><path d="M34.6 28.1 q2.6 -.6 5.6 .3 q-1.2 2.3 -4.2 1.9 q-1 -.6 -1.4 -2.2z" fill="#fff" opacity=".14"/></g>`:""}
</svg>`;
}
function sombraPiel(hex){
  // oscurece un tono de piel para sombras
  if(!hex||hex[0]!=="#") return "#6A5A4A";
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(r*.7);g=Math.round(g*.7);b=Math.round(b*.7);
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function aclara(hex,f){
  if(!hex||hex[0]!=="#") return "#8A94A7";
  const n=parseInt(hex.slice(1),16);
  const r=Math.min(255,Math.round(((n>>16)&255)*f)),g=Math.min(255,Math.round(((n>>8)&255)*f)),b=Math.min(255,Math.round((n&255)*f));
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function parejaAvatares(pareja,tam){
  const js=pareja&&pareja.jug?pareja.jug:[];
  return `<span style="display:inline-flex">${js.map(j=>avatarSVG(j,tam)).join("")}</span>`;
}
function pickPais(){let r=Math.random()*100;for(const [f,w] of PAISES){r-=w;if(r<=0)return f;}return "🇪🇸";}
const APODOS=["Muro","Cañón","Víbora","Zurdo","Rayo","Mago","Torre","Pistola","Lobo","Búho","Motor","Fino","Tanque","Chispa","Pulpo"];
const PROS=[
  {p:["A. Cotelo","frio","rematador",89,"🇪🇸"],q:["A. Tapias","valiente","agresivo",90,"🇦🇷"]},
  {p:["A. Gabán","frio","rematador",88,"🇪🇸"],q:["F. Chingorro","conservador","defensivo",85,"🇦🇷"]},
  {p:["J. Lebrín","emocional","agresivo",87,"🇪🇸"],q:["F. Stupak","valiente","rematador",84,"🇦🇷"]},
  {p:["P. Navarra","emocional","agresivo",83,"🇪🇸"],q:["M. Di Nono","conservador","constructor",82,"🇦🇷"]},
  {p:["S. Gutiérez","frio","constructor",81,"🇦🇷"],q:["M. Gonzálvez","conservador","defensivo",80,"🇪🇸"]},
  {p:["M. Yanguez","valiente","bandejero",78,"🇪🇸"],q:["J. Garrudo","conservador","defensivo",78,"🇪🇸"]},
  {p:["L. Ausberger","valiente","rematador",79,"🇦🇷"],q:["L. Cabra","emocional","agresivo",77,"🇪🇸"]},
  {p:["P. Cardoso","frio","bandejero",76,"🇧🇷"],q:["M. Del Castizo","conservador","constructor",76,"🇪🇸"]},
  {p:["J. Sainz","conservador","defensivo",75,"🇪🇸"],q:["C. Prieto","frio","constructor",75,"🇪🇸"]},
  {p:["T. Bergamino","valiente","agresivo",74,"🇮🇹"],q:["G. Patiniotas","frio","bandejero",74,"🇦🇷"]},
  {p:["J. Alonzo","emocional","rematador",73,"🇪🇸"],q:["P. Leral","conservador","defensivo",73,"🇫🇷"]},
  {p:["A. Ruix","frio","constructor",72,"🇪🇸"],q:["D. Semler","valiente","bandejero",72,"🇸🇪"]},
  {p:["T. Galarza","valiente","rematador",77,"🇦🇷"],q:["I. Cepero","frio","defensivo",76,"🇪🇸"]},
  {p:["N. Bruel","emocional","bandejero",75,"🇫🇷"],q:["R. Sanchís","conservador","constructor",74,"🇪🇸"]},
  {p:["F. Maidana","valiente","agresivo",73,"🇦🇷"],q:["D. Quintana","frio","bandejero",73,"🇪🇸"]},
  {p:["L. Björk","conservador","defensivo",72,"🇸🇪"],q:["M. Oliva","emocional","rematador",71,"🇪🇸"]},
  {p:["S. Fontana","frio","constructor",70,"🇮🇹"],q:["A. Ponce","valiente","agresivo",70,"🇦🇷"]},
  {p:["J. Do Vale","emocional","rematador",69,"🇵🇹"],q:["C. Ledesma","conservador","defensivo",69,"🇦🇷"]},
];
const CLUBES_NPC=[
  {n:"Indomable PC",color:"#D84A4A",sede:"Madrid",lema:"Nunca se rinden",fil:"garra"},
  {n:"Marbella Racket",color:"#E0A030",sede:"Marbella",lema:"Lujo y potencia",fil:"ataque"},
  {n:"Nórdico Lab",color:"#4FA3D8",sede:"Estocolmo",lema:"Datos y precisión",fil:"tactica"},
  {n:"La Fábrica Pádel",color:"#9B59D0",sede:"Valladolid",lema:"Cantera antes que cartera",fil:"cantera"},
  {n:"Atlético Cristal",color:"#3FBF8F",sede:"Sevilla",lema:"El muro del sur",fil:"defensa"},
  {n:"Barrio Sur PC",color:"#E06AA0",sede:"Cádiz",lema:"De la pista de tierra a la gloria",fil:"humilde"},
  {n:"Academia Delta",color:"#5CC8E6",sede:"Buenos Aires",lema:"Talento en bruto",fil:"cantera"},
  {n:"Real Pala Club",color:"#C2C84A",sede:"Barcelona",lema:"Tradición y galones",fil:"ataque"},
  {n:"Faro Padel Team",color:"#E07A3C",sede:"Lisboa",lema:"Luz en cada golpe",fil:"tactica"},
  {n:"Vértice Pádel",color:"#7B68E0",sede:"Málaga",lema:"Al ataque desde el primer punto",fil:"ataque"},
  {n:"Muralla Norte",color:"#4A8C6A",sede:"Bilbao",lema:"Aquí no entra ni el aire",fil:"defensa"},
  {n:"Sol Naciente PC",color:"#E0C040",sede:"Valencia",lema:"Cada día un jugador nuevo",fil:"cantera"},
  {n:"Cóndor Andino",color:"#C85A3C",sede:"Bogotá",lema:"Volamos alto",fil:"garra"},
  {n:"Old School Pádel",color:"#8A96A8",sede:"Londres",lema:"Oficio y paciencia",fil:"tactica"},
  {n:"Cantera del Sur",color:"#D8804A",sede:"Granada",lema:"De abajo se sube más fuerte",fil:"humilde"},
  {n:"Titanes PC",color:"#5CA0C8",sede:"México DF",lema:"Fuerza bruta con cabeza",fil:"garra"},
];
const FILOSOFIAS={garra:"Aprietan cada punto como si fuera el último.",ataque:"Viven del remate y la víbora.",tactica:"Estudian al rival y no regalan nada.",cantera:"Fabrican jugadores, no los compran.",defensa:"Devuelven una bola más. Siempre una más.",humilde:"Sin presupuesto, a base de corazón."};
const PROS_F=[
  {p:["D. Brisa","frio","agresivo",89,"🇦🇷"],q:["G. Triana","valiente","rematador",90,"🇪🇸"]},
  {p:["A. Sánchiz","valiente","agresivo",87,"🇪🇸"],q:["A. Ustera","frio","constructor",84,"🇪🇸"]},
  {p:["B. Gonzálvez","emocional","rematador",86,"🇪🇸"],q:["P. Josemarí","valiente","agresivo",86,"🇪🇸"]},
  {p:["C. Fernándiz","frio","rematador",83,"🇪🇸"],q:["M. Calva","conservador","defensivo",78,"🇪🇸"]},
  {p:["S. Araúja","emocional","bandejero",80,"🇵🇹"],q:["T. Icardi","conservador","defensivo",79,"🇪🇸"]},
  {p:["M. Ortiga","frio","constructor",79,"🇪🇸"],q:["C. Jansen","valiente","bandejero",78,"🇪🇸"]},
  {p:["A. Salazur","conservador","constructor",77,"🇪🇸"],q:["A. Alonsa","emocional","agresivo",77,"🇪🇸"]},
  {p:["M. Guinarda","valiente","rematador",76,"🇪🇸"],q:["V. Virsera","frio","defensivo",75,"🇪🇸"]},
  {p:["B. Calderón","emocional","agresivo",75,"🇪🇸"],q:["C. Goenago","conservador","constructor",74,"🇪🇸"]},
  {p:["A. Osora","frio","bandejero",74,"🇦🇷"],q:["V. Iglesía","valiente","rematador",73,"🇪🇸"]},
  {p:["L. Sáinz","conservador","defensivo",73,"🇪🇸"],q:["P. Llagunes","frio","constructor",72,"🇪🇸"]},
  {p:["R. Eugenia","emocional","rematador",72,"🇪🇸"],q:["M. Fassia","valiente","agresivo",71,"🇦🇷"]},
  {p:["J. Castella","frio","bandejero",71,"🇪🇸"],q:["L. Rufa","conservador","defensivo",70,"🇪🇸"]},
  {p:["C. Orsina","valiente","agresivo",70,"🇮🇹"],q:["J. Velasca","emocional","constructor",70,"🇪🇸"]},
  {p:["V. Rieral","conservador","defensivo",69,"🇦🇷"],q:["M. Barreira","frio","rematador",69,"🇪🇸"]},
  {p:["N. Duprés","emocional","bandejero",72,"🇫🇷"],q:["K. Lindqvist","frio","defensivo",71,"🇸🇪"]},
  {p:["Y. Nakamura","conservador","constructor",70,"🇧🇷"],q:["F. Do Campo","valiente","rematador",70,"🇵🇹"]},
  {p:["M. Juárez","valiente","agresivo",69,"🇲🇽"],q:["C. Riveros","emocional","bandejero",69,"🇨🇱"]},
];
const APELL=["García","López","Santos","Vega","Marín","Ortega","Robles","Pardo","Ferrer","Campos","Nieto","Salas","Rueda","Bravo","Cano","Mora","Peña","Gil","Serna","Lara","Prieto","Soto","Reyes","Varela","Aguirre","Toledo","Baena","Cruz","Duarte","Escudero","Fuentes","Galán","Herrero","Ibarra","Juárez","Lozano","Miranda","Navas","Osuna","Quirós","Acosta","Benítez","Sosa","Giménez","Cabrera","Ríos","Coronel","Ledesma","Paz","Quiroga","Ponce","Funes","Bustos","Arce","Maidana","Villalba","Alcaraz","Beltrán","Carrasco","Estévez","Fajardo","Garrido","Hidalgo","Iglesias","Jurado","Llorente","Machado","Naranjo","Oliva","Pizarro","Quintana","Redondo","Trujillo","Urrutia","Zamora","Molina","Herrera","Vidal","Rocamora","Cifuentes"];
const NOMBRES_M=["Hugo","Iker","Mateo","Leo","Adri","Nico","Dani","Marc","Pau","Álex","Bruno","Izan","Javi","Sergio","Rubén","Curro","Facu","Lauti","Thiago","Franco","Agus","Joaco","Santi","Guille","Rafa","Emi","Ciro","Teo","Coco","Manu","Fer","Gonzalo","Bauti","Tomás"];
const NOMBRES_F=["Lucía","Marta","Vera","Noa","Ari","Bea","Carla","Elena","Irene","Julia","Laura","Nerea","Paula","Sara","Valen","Alba","Claudia","Emma","Gala","Lola","María","Nadia","Ona","Rocío","Triana","Delfi","Gemma","Vicky","Bel","Sofi","Aitana","Candela"];
function nombrePorSexo(sx){return pick(sx==="F"?NOMBRES_F:NOMBRES_M);}


/* ================================================================
   ENTRENAR DEJA DE SER RESOLUBLE

   Hasta aquí el entrenamiento tenía respuesta correcta: elige tu golpe más
   flojo, pon intensa, dale a «entrenar» los siete días. No había nada que
   decidir, solo que ejecutar. Este fichero le mete cuatro cosas que se pelean
   entre ellas, y por eso ya no hay una jugada que gane siempre.

   1. CONTEXTO. Además de qué entrenas y cuánto, dónde: en casa, con sparring,
      en el gimnasio, viendo vídeo o en una concentración que te deja sin
      competir esa semana. Cada sitio cuesta y da cosas distintas.

   2. ADAPTACIÓN. Machacar la volea seis semanas seguidas deja de dar volea. El
      cuerpo se adapta a lo conocido; hay que rotar.

   3. CARGA ACUMULADA. No es la energía de la semana: es el poso de dos meses.
      Poca carga y no creces; demasiada y creces peor, te lesionas y pierdes
      forma. El punto bueno está en medio y se mueve.

   4. FORMA Y RITMO. Los golpes que tocas esta semana salen mejor las siguientes
      y se enfrían solos. Y competir da ritmo: quien lleva un mes sin jugar un
      partido de verdad, compite peor cuando el marcador aprieta.

   Y encima no lo ves con números exactos: el cuerpo técnico te lo estima en
   horquillas, más estrechas cuanto mejor sea tu staff.
================================================================ */

/* ---------------- 1 · el contexto ---------------- */
/* `gan` multiplica la ganancia de atributo, `carga` cuánto poso deja, `coste`
   lo que cuesta por semana. Lo demás son efectos propios de cada sitio. */
const CTX_ENTRENO = {
  pista:    { coste:0,    gan:1.00, carga:1.00 },
  casa:     { coste:0,    gan:.65,  carga:.50, energia:7 },
  sparring: { coste:420,  gan:1.28, carga:1.15, quimica:2 },
  gimnasio: { coste:180,  gan:.80,  carga:1.35, lesionX:.70, fisico:true },
  video:    { coste:130,  gan:.75,  carga:.40, presion:3 },
  stage:    { coste:1600, gan:1.60, carga:1.70, sinTorneo:true, energia:-8 },
};
const CTX_DEF="pista";
/* En el gimnasio no se entrena la dejada: se entrena el cuerpo. Estos son los
   golpes que sí mejoran ahí. */
const ATTR_FISICOS=["fondo","pared","bandeja","remate"];

function ctxEntreno(c){ const k=c&&c.ctxEnt; return CTX_ENTRENO[k]?k:CTX_DEF; }
function ctxDatos(c){ return CTX_ENTRENO[ctxEntreno(c)]; }
function ctxNombre(k){ return t("ctx_"+k+"_n"); }
function ctxDesc(k){ return t("ctx_"+k+"_d"); }
function ctxEfecto(k){ return t("ctx_"+k+"_e"); }
function ctxElige(c,k){ if(!CTX_ENTRENO[k]) return false; c.ctxEnt=k; return true; }
/* La concentración te deja fuera del circuito esa semana: es el precio de irse
   diez días a la montaña a no hacer otra cosa. */
function ctxBloqueaTorneo(c){ return !!(ctxDatos(c)||{}).sinTorneo; }

/* ---------------- 2 · adaptación ---------------- */
/* 0 = golpe fresco, 100 = el cuerpo ya se sabe el ejercicio de memoria. */
const ADAPT_SUBE=17, ADAPT_BAJA=5, ADAPT_MERMA=.60;
function frAsegura(c){
  if(!c) return null;
  if(!c.adapt) c.adapt={};
  if(!c.forma) c.forma={};
  if(typeof c.carga!=="number") c.carga=32;
  if(typeof c.ritmo!=="number") c.ritmo=50;
  if(!CTX_ENTRENO[c.ctxEnt]) c.ctxEnt=CTX_DEF;
  return c;
}
function adaptLee(c,k){ frAsegura(c); return clamp(c.adapt[k]|0,0,100); }
/* Lo que rinde hoy entrenar `k`: de 1 (fresco) a 0,40 (machacado). */
function adaptFactor(c,k){ return 1-ADAPT_MERMA*(adaptLee(c,k)/100); }
function adaptTrabaja(c,k){
  frAsegura(c);
  c.adapt[k]=clamp(adaptLee(c,k)+ADAPT_SUBE,0,100);
}
/* Lo que no se toca se desentumece solo. Se llama una vez por semana. */
function adaptDescansa(c,salvo){
  frAsegura(c);
  ATTR_KEYS.forEach(k=>{ if(k!==salvo) c.adapt[k]=clamp(adaptLee(c,k)-ADAPT_BAJA,0,100); });
}

/* ---------------- 3 · carga acumulada ---------------- */
/* No es la energía: la energía se recupera durmiendo, la carga tarda meses. */
const CARGA_POSO=.80;      // lo que queda de la carga de la semana pasada
const CARGA_OPT=52;        // el punto donde el cuerpo rinde mejor
/* Calibrado para que una semana normal en pista deje la carga rondando el
   óptimo: el estado estable de este filtro es 5× lo que entra, así que la
   constante sale de CARGA_OPT/5. Con 26 —el primer valor— cualquiera acababa
   clavado en 100 y el punto bueno no existía. */
const CARGA_BASE=CARGA_OPT/5;
function cargaSemanal(c,sesiones){
  const d=ctxDatos(c), it=c.intens||"normal";
  /* La intensa deja casi el doble de poso: es lo que impide que «siempre
     intensa» sea la respuesta correcta. Con 1,35 la carga se quedaba en «bien»
     para siempre y el sistema no mordía. */
  const mult=it==="suave"?.6:it==="intensa"?1.75:1;
  return CARGA_BASE*d.carga*mult*clamp(sesiones/5,0,1.2);
}
/* El poso baja con la clínica: recuperarse antes es poder entrenar más. */
function cargaPoso(c){
  return (typeof invCargaPoso==="function")?invCargaPoso(c):CARGA_POSO;
}
function cargaAplica(c,sesiones){
  frAsegura(c);
  c.carga=clamp(Math.round(c.carga*cargaPoso(c)+cargaSemanal(c,sesiones)),0,100);
  return c.carga;
}
/* Campana: por debajo del óptimo faltan estímulos, por encima el cuerpo no
   asimila. Ni el sofá ni la paliza. */
function cargaGanX(c){
  frAsegura(c);
  const d=c.carga-CARGA_OPT;
  return clamp(1-(d<0?(-d/CARGA_OPT)*.55:(d/(100-CARGA_OPT))*.70),.30,1);
}
function cargaLesionX(c){
  frAsegura(c);
  return c.carga<=62?1:1+(c.carga-62)/48;
}
/* Estado leíble de la carga: es lo que te dice el preparador. */
function cargaEstado(c){
  frAsegura(c);
  return c.carga<25?"parado":c.carga<42?"suave":c.carga<66?"bien":c.carga<82?"cargado":"pasado";
}

/* ---------------- 4 · forma y ritmo ---------------- */
/* La forma es temporal y por golpe: lo que has tocado esta semana sale mejor la
   que viene, y se enfría solo si lo abandonas. */
const FORMA_TOPE=7;
function formaLee(c,k){ frAsegura(c); return clamp(c.forma[k]|0,-FORMA_TOPE,FORMA_TOPE); }
function formaSube(c,k,n){
  frAsegura(c);
  c.forma[k]=clamp(formaLee(c,k)+n,-FORMA_TOPE,FORMA_TOPE);
}
/* Cada semana todo tira hacia cero: la forma no se guarda en un cajón. */
function formaEnfria(c){
  frAsegura(c);
  /* El preparador «de picos» alarga la punta de forma: lo trabajado se enfría
     a la mitad de velocidad, que es justo lo que compra preparar una semana
     grande. El «motor» no toca esto: lo suyo es la recuperación semanal. */
  if(typeof staffPerfil==="function"&&staffPerfil("fisico")==="picos"&&((c.semana|0)%2)===1) return;
  ATTR_KEYS.forEach(k=>{
    const v=formaLee(c,k);
    if(v>0) c.forma[k]=v-1; else if(v<0) c.forma[k]=v+1;
  });
}
/* ---------------- fatiga residual: el poso de la gira (P3) ----------------
   La energía visible se recupera cada semana, y eso dejaba el calendario sin
   dientes arriba: medido, un nivel 86 competía 51 semanas de 52. La gira es lo
   que la energía no cuenta: semanas de torneo seguidas, rondas jugadas, viajes
   lejanos, el estilo explosivo y la edad. No se gasta compitiendo UNA semana:
   se acumula compitiendo SIEMPRE, y solo la baja quedarse en casa.

   OJO: esto NO toca el entreno (la trampa histórica del repo es que entrenar
   deje de compensar). Sube solo con torneos; entrenar en casa la baja. */
const GIRA_MAX=100;
function giraLee(c){ return clamp(((c&&c.gira)|0),0,GIRA_MAX); }
/* Una llamada por cierre semanal, con lo vivido: si hubo torneo, cuántos
   partidos se jugaron y cuánto costó el viaje (TRAVEL de la sede). */
function giraSemana(c,jugo,partidos,viaje){
  if(!c) return 0;
  let g=giraLee(c);
  if(jugo){
    let sube=5+Math.min(6,partidos|0);              // llegar lejos pesa más
    if((viaje|0)>=400){ sube+=4; c.viajesLejos=(c.viajesLejos|0)+1; }   // cruzar medio mundo se paga (y se cuenta: arquetipo viajero)
    if(c.estilo==="agresivo"||c.estilo==="rematador") sube=Math.round(sube*1.15);
    g+=sube;
  } else {
    let baja=13;
    if((c.edad|0)>=30) baja-=3;                     // con 30 el cuerpo tarda más
    if((c.edad|0)>=34) baja-=2;
    g-=baja;
  }
  c.gira=clamp(g,0,GIRA_MAX);
  return c.gira;
}
/* Lo que la gira le come a la recuperación semanal: es SU único gran efecto,
   y por eso se nota justo donde duele —en si puedes encadenar otra semana—. */
function giraRegen(c){ return Math.round(giraLee(c)*.18); }
function giraEstado(c){ const g=giraLee(c); return g<30?"fresco":g<55?"rodado":g<75?"cargado":"fundido"; }

/* El golpe en el que mejor y peor estás, para contarlo sin dar el número. */
function formaMejor(c){ frAsegura(c); return ATTR_KEYS.reduce((p,k)=>formaLee(c,k)>formaLee(c,p)?k:p,ATTR_KEYS[0]); }
function formaPeor(c){ frAsegura(c); return ATTR_KEYS.reduce((p,k)=>formaLee(c,k)<formaLee(c,p)?k:p,ATTR_KEYS[0]); }

/* Ritmo de competición: no es lo mismo llegar de jugar tres torneos que de dos
   meses de gimnasio. Se paga cuando el marcador aprieta. */
const RITMO_GANA=13, RITMO_PIERDE=6;
function ritmoSemana(c,jugo){
  frAsegura(c);
  c.ritmo=clamp(c.ritmo+(jugo?RITMO_GANA:-RITMO_PIERDE),0,100);
  return c.ritmo;
}
function ritmoAjusteConf(c){
  if(!c||typeof c.ritmo!=="number") return 0;
  return Math.round((c.ritmo-55)/11);
}
function ritmoEstado(c){
  frAsegura(c);
  return c.ritmo<25?"frio":c.ritmo<50?"tibio":c.ritmo<75?"rodado":"lanzado";
}

/* ---------------- lo que se lleva a la pista ---------------- */
/* Suma de forma que ve el motor. Se aplica en miTeam, sobre el atributo, antes
   del factor de energía y química. */
function formaDe(c,k){
  if(!c||!c.forma) return 0;
  return formaLee(c,k);
}

/* ---------------- 5 · el staff no te da números ---------------- */
/* La precisión sale del cuerpo técnico: sin nadie, el margen es enorme; con un
   preparador y un entrenador buenos, casi te clavan el dato. Nunca es exacto:
   ese es justo el punto. */
function precisionStaff(c){
  const n=(typeof staffNiv==="function")?((staffNiv("fisico")||0)+(staffNiv("entrenador")||0)):0;
  // el departamento de analítica es la otra manera de saber en qué estado estás
  const inv=(typeof invPrecision==="function")?invPrecision(c):0;
  return clamp(n+inv,0,8);
}
/* Horquilla alrededor de `v`. `esc` es lo ancha que es sin staff. */
function banda(v,prec,esc){
  const m=Math.max(1,Math.round((esc||10)*(1-prec/10)));
  return {lo:Math.max(0,Math.round(v-m)), hi:Math.round(v+m)};
}
function bandaTxt(v,prec,esc){
  const b=banda(v,prec,esc);
  return b.lo===b.hi?String(b.lo):`${b.lo}–${b.hi}`;
}
/* Lo que el entrenador cree que dará el plan de esta semana, en horquilla. */
function pronosticoEntreno(c,k){
  frAsegura(c);
  const base=3.0*adaptFactor(c,k)*cargaGanX(c)*ctxDatos(c).gan
    *((c.intens||"normal")==="intensa"?1.25:(c.intens==="suave")?.75:1);
  const prec=precisionStaff(c);
  const m=Math.max(.6,1.7*(1-prec/10));
  return {lo:Math.max(0,+(base-m).toFixed(1)), hi:+(base+m).toFixed(1)};
}

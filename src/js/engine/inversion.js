/* ================================================================
   EL DINERO SE CONVIERTE EN ESTRUCTURA

   Medido con un bot de diez temporadas: hasta la octava el dinero aprieta de
   verdad —la caja se mueve entre 14.000 y 31.000 y hay semanas en números
   rojos—, pero en cuanto entras en el top 10 se dispara: 262.000 en la caja y
   nada que hacer con ellos. Un recurso que deja de escasear deja de ser una
   decisión, y con él se cae media partida: fichar staff, elegir torneo o pagar
   un sparring dejan de doler.

   Esto son cinco sitios donde meter el dinero. No son mejoras de «+1 a todo»:
   cada una cambia qué te puedes permitir hacer después.

   - CENTRO DE ENTRENAMIENTO en una región: los viajes a tu región se abaratan
     y las horas de pista y la semana en casa rinden como un sparring de pago.
     Comprarlo es dejar de pagar 420€ todas las semanas.
   - CLÍNICA: las lesiones duran menos, las secuelas se van antes y la carga se
     descarga más rápido. Con clínica puedes vivir en intensa.
   - ANALÍTICA: el cuerpo técnico deja de darte horquillas anchas y el rival de
     turno impone menos. Es información, que aquí es la moneda cara.
   - ACADEMIA con tu nombre: renta semanal proporcional a tus seguidores. Solo
     sale a cuenta si eres conocido, y tarda temporadas en amortizarse.
   - AGENCIA DE IMAGEN: más seguidores y mejores contratos, o sea más prestigio,
     o sea que te aceptan parejas que hoy te dicen que no.

   LA REGLA QUE LAS HACE UNA DECISIÓN: el mantenimiento semanal. Tenerlas las
   cinco al máximo cuesta más de lo que ingresa un número uno del mundo, así que
   hay que elegir dos o tres y vivir con ello.
================================================================ */

const INV_NIV_MAX=3;
const INVERSIONES={
  centro:    { coste:[42000, 96000,190000], sem:[240, 520, 980],  region:true },
  clinica:   { coste:[30000, 72000,150000], sem:[300, 640,1200] },
  analitica: { coste:[22000, 54000,110000], sem:[180, 400, 760] },
  academia:  { coste:[60000,130000,260000], sem:[420, 880,1650] },
  imagen:    { coste:[26000, 62000,125000], sem:[260, 560,1080] },
};
const INV_IDS=Object.keys(INVERSIONES);
/* Las regiones son las del calendario (TRAVEL en world.js): donde plantas el
   centro decide a qué media temporada llegas barato. */
const INV_REGIONES=["ES","EU","AF","ME","AM"];

function invAsegura(c){
  if(!c) return null;
  if(!c.inv) c.inv={};
  return c.inv;
}
function invNiv(c,id){
  if(!c||!c.inv||!INVERSIONES[id]) return 0;
  return clamp((c.inv[id]&&c.inv[id].niv)|0,0,INV_NIV_MAX);
}
function invNombre(id){ return t("inv_"+id+"_n"); }
function invDesc(id){ return t("inv_"+id+"_d"); }
function invEfecto(id,niv){ return t("inv_"+id+"_e"+clamp(niv||1,1,INV_NIV_MAX)); }
function invRegion(c){ const x=c&&c.inv&&c.inv.centro; return x&&INV_REGIONES.indexOf(x.region)>=0?x.region:null; }
/* Lo que cuesta subir al nivel siguiente (o estrenar, si no la tienes). */
function invPrecio(c,id){
  const d=INVERSIONES[id]; if(!d) return 0;
  const n=invNiv(c,id);
  return n>=INV_NIV_MAX?0:d.coste[n];
}
function invUpkeep(c,id){
  const d=INVERSIONES[id], n=invNiv(c,id);
  return (d&&n)?d.sem[n-1]:0;
}
/* El freno: la suma de mantenimientos. Es lo que impide tenerlo todo. */
function invUpkeepTotal(c){
  return INV_IDS.reduce((s,id)=>s+invUpkeep(c,id),0);
}
function invCompra(c,id,region){
  const d=INVERSIONES[id]; if(!d) return false;
  const n=invNiv(c,id); if(n>=INV_NIV_MAX) return false;
  const precio=d.coste[n];
  if((c.dinero|0)<precio) return false;
  invAsegura(c);
  c.dinero-=precio;
  const prev=c.inv[id]||{};
  c.inv[id]={niv:n+1, region:d.region?(region||prev.region||INV_REGIONES[0]):undefined, desde:prev.desde==null?(c.semana|0):prev.desde};
  return true;
}
/* Cerrarla libera el mantenimiento y devuelve una parte: vender no es gratis. */
function invCierra(c,id){
  if(!c||!c.inv||!invNiv(c,id)) return 0;
  const d=INVERSIONES[id], n=invNiv(c,id);
  const devuelto=Math.round(d.coste.slice(0,n).reduce((s,x)=>s+x,0)*.35);
  delete c.inv[id];
  c.dinero=(c.dinero|0)+devuelto;
  return devuelto;
}

/* ---------------- lo que cambia cada una ---------------- */

/* CENTRO · el viaje. A tu región llegas casi de casa; fuera pagas el capricho
   de haberte instalado lejos. */
const INV_VIAJE_CASA=[1,.55,.35,.20], INV_VIAJE_FUERA=[1,1.15,1.25,1.35];
function invViajeX(c,region){
  const n=invNiv(c,"centro"); if(!n) return 1;
  return (region&&region===invRegion(c))?INV_VIAJE_CASA[n]:INV_VIAJE_FUERA[n];
}
/* CENTRO · las horas de pista y la semana en casa rinden como algo pagado. */
const INV_CTX_GAN=[0,.12,.20,.30];
function invCtxGanX(c,ctxId){
  const n=invNiv(c,"centro"); if(!n) return 1;
  return (ctxId==="pista"||ctxId==="casa")?1+INV_CTX_GAN[n]:1;
}

/* CLÍNICA · lesiones más cortas, secuelas más breves y carga que se va antes. */
const INV_LESION_DUR=[1,.75,.60,.45];
function invLesionDurX(c){ return INV_LESION_DUR[invNiv(c,"clinica")]; }
function invMermaPasos(c){ return 1+invNiv(c,"clinica"); }
const INV_CARGA_POSO=[.80,.76,.72,.68];
function invCargaPoso(c){ return INV_CARGA_POSO[invNiv(c,"clinica")]; }

/* ANALÍTICA · información: horquillas más estrechas y rivales que imponen menos. */
const INV_PRECISION=[0,2,4,6];
function invPrecision(c){ return INV_PRECISION[invNiv(c,"analitica")]; }
const INV_PRESION=[1,.75,.60,.45];
function invPresionX(c){ return INV_PRESION[invNiv(c,"analitica")]; }

/* ACADEMIA · renta por seguidores. Con pocos fans no cubre ni el mantenimiento:
   es la inversión del que ya es alguien. */
const INV_ACADEMIA_FAN=[0,.004,.007,.011];
function invRenta(c){
  const n=invNiv(c,"academia"); if(!n) return 0;
  return Math.round((c.fans||0)*INV_ACADEMIA_FAN[n]);
}

/* IMAGEN · seguidores y contratos. El prestigio se compra, y el prestigio es lo
   que mira una pareja buena antes de decirte que sí. */
const INV_FANS=[1,1.25,1.50,1.85];
function invFansX(c){ return INV_FANS[invNiv(c,"imagen")]; }
const INV_PATRO=[1,1.10,1.22,1.38];
function invPatroX(c){ return INV_PATRO[invNiv(c,"imagen")]; }
function invSubeTier(c){ return invNiv(c,"imagen")>=2; }

/* Balance semanal de las inversiones: renta menos mantenimiento. Lo devuelve
   desglosado para poder contarlo en el panel. */
function invSemana(c){
  invAsegura(c);
  const gasto=invUpkeepTotal(c), renta=invRenta(c);
  c.dinero=(c.dinero|0)+renta-gasto;
  return {renta,gasto};
}

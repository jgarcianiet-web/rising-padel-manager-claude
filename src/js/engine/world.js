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
// Lesiones con gravedad (grav 1 leve … 3 grave). Las graves tiran más semanas
// y, sobre todo, dejan secuela al volver.
const LESIONES=[
  {n:"sobrecarga en el gemelo",sem:1,grav:1},
  {n:"fascitis plantar",sem:2,grav:1},
  {n:"tendinitis en el hombro",sem:2,grav:2},
  {n:"rotura fibrilar en el sóleo",sem:3,grav:2},
  {n:"epicondilitis (codo de pádel)",sem:3,grav:2},
  {n:"esguince grave de tobillo",sem:5,grav:3},
  {n:"rotura del tendón de Aquiles",sem:8,grav:3},
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
  const r=riesgoLesionPost(port.energia,port.fragil||0,tieneFisio);
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
const AVA_PIEL=["#F2C9A0","#E8B183","#D89B6A","#C6824E","#A9683B","#8A5230","#6E3F24"];
const AVA_PELO=["#1A1512","#3A2A1A","#5A3820","#8A5A2A","#B07830","#D9C9A8","#9A9A9A","#E8E8E8","#6A3020"];
const AVA_ROPA=["#4FA3D8","#E05656","#3FBF8F","#E0A030","#9B59D0","#5CC8E6","#E06AA0","#C6F53C","#D8D8D8","#2A2A32","#E85040","#40C0A0"];
/* Avatar SVG minimalista geométrico. tam=lado px. Determinista por nombre. */
let _avId=0;
function avatarSVG(jug,tam){
  tam=tam||44;
  const nom=(jug&&jug.n)||"?";
  const h=Math.abs(hashStr(nom));   // no-negativo: evita índices negativos → undefined
  const av=(jug&&jug.ava)||{};
  const piel=av.piel!==undefined?AVA_PIEL[av.piel%AVA_PIEL.length]:AVA_PIEL[h%AVA_PIEL.length];
  const pelo=av.pelo!==undefined?AVA_PELO[av.pelo%AVA_PELO.length]:AVA_PELO[(h>>3)%AVA_PELO.length];
  const ropa=(jug&&jug._ropa)||AVA_ROPA[(h>>6)%AVA_ROPA.length];
  const tipoPelo=av.tipoPelo!==undefined?av.tipoPelo%5:(h>>9)%5;
  const barba=av.barba!==undefined?!!av.barba:((h>>12)%4===0);
  const fem=(jug&&jug.sexo==="F");
  const gafas=av.gafas!==undefined?!!av.gafas:((h>>14)%5===0);
  const compl=(h>>16)%3;                       // complexión: 0 normal, 1 ancho, 2 fino
  const pielSombra=sombraPiel(piel);
  const id="a"+(_avId=(_avId||0)+1);
  const ropaAlta=aclara(ropa,1.28), pielAlta=aclara(piel,1.12);
  const defs=`<defs>`
    +`<linearGradient id="pk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pielAlta}"/><stop offset=".62" stop-color="${piel}"/><stop offset="1" stop-color="${pielSombra}"/></linearGradient>`
    +`<linearGradient id="sh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ropaAlta}"/><stop offset="1" stop-color="${ropa}"/></linearGradient>`
    +`</defs>`;
  const hombroW=compl===1?23:compl===2?18:20.5;
  // ── cuerpo/hombros (atlético, con cuello) ──
  let el=defs+`<path d="M${32-3.2} 52 h6.4 v5 h-6.4 z" fill="${piel}"/>`;   // cuello
  el+=`<path d="M${32-3.5} 55 q-1 1.5 -2 2 L${32-hombroW} 68 h${hombroW*2} L${32+3.5+1.5} 57 q-1 -.5 -2 -2 z" fill="${pielSombra}" opacity=".25"/>`;
  el+=`<path d="M32 55 C${32-9} 55 ${32-hombroW} 60 ${32-hombroW} 68 h${hombroW*2} C${32+hombroW} 60 ${32+9} 55 32 55 z" fill="url(#sh${id})"/>`;
  // detalle camiseta (cuello en V y sombra lateral)
  el+=`<path d="M32 55 l-4 6 l4 3 l4 -3 z" fill="#fff" opacity=".12"/>`;
  el+=`<path d="M${32-hombroW} 68 l3 -6 q${hombroW-3} -4 ${hombroW*2-6} 0 l3 6 z" fill="#000" opacity=".08"/>`;
  // ── cabeza (óvalo adulto, mandíbula) ──
  el+=`<path d="M32 12 C${32+11} 12 ${32+12.5} 22 ${32+12} 30 C${32+11.5} 40 ${32+7} 50 32 50 C${32-7} 50 ${32-11.5} 40 ${32-12} 30 C${32-12.5} 22 ${32-11} 12 32 12 z" fill="url(#pk${id})"/>`;
  // brillo suave (luz de estudio)
  el+=`<ellipse cx="27" cy="24" rx="6" ry="7.5" fill="#fff" opacity=".07"/>`;
  // orejas
  el+=`<circle cx="20" cy="31" r="2.6" fill="${piel}"/><circle cx="44" cy="31" r="2.6" fill="${piel}"/>`;
  // sombra de mandíbula (definición adulta)
  el+=`<path d="M22 40 C26 47 38 47 42 40 C40 45 24 45 22 40 z" fill="${pielSombra}" opacity=".18"/>`;
  // ── pelo por tipo (adaptado al óvalo nuevo) ──
  if(tipoPelo===3){ // rapado
    el+=`<path d="M21 26 C22 16 27 12 32 12 C37 12 42 16 43 26 C39 20 25 20 21 26 z" fill="${pelo}" opacity=".9"/>`;
  } else if(fem||tipoPelo===2){ // melena / recogido
    el+=`<path d="M19 32 C17 18 24 10 32 10 C40 10 47 18 45 32 C46 29 47 22 44 16 C41 10 37 8 32 8 C27 8 23 10 20 16 C17 22 18 29 19 32 z" fill="${pelo}"/>`;
    el+= fem?`<path d="M19 30 C15 37 15 48 18 55 l4 -1 C19 47 19 38 20 32 z M45 30 C49 37 49 48 46 55 l-4 -1 C45 47 45 38 44 32 z" fill="${pelo}"/>`
            :`<path d="M28 9 h8 l-1 4 h-6 z" fill="${pelo}"/>`;
  } else if(tipoPelo===1){ // flequillo
    el+=`<path d="M20 30 C18 16 25 11 32 11 C39 11 46 16 44 30 C43 24 40 21 40 21 C36 25 28 25 24 21 C24 21 21 24 20 30 z" fill="${pelo}"/>`;
  } else if(tipoPelo===4){ // con cinta
    el+=`<path d="M21 27 C22 16 27 12 32 12 C37 12 42 16 43 27 C39 21 25 21 21 27 z" fill="${pelo}"/><rect x="19" y="21" width="26" height="4" rx="2" fill="${ropa}"/>`;
  } else { // corto peinado
    el+=`<path d="M20 29 C19 16 25 12 32 12 C39 12 45 16 44 29 C42 23 39 21 39 21 C35 24 29 24 25 21 C25 21 22 23 20 29 z" fill="${pelo}"/>`;
  }
  // ── ojos (más separados y adultos) ──
  const ey=31;
  if(gafas){
    el+=`<g fill="none" stroke="#23232B" stroke-width="1.3"><rect x="22.5" y="${ey-3}" width="7.5" height="6" rx="2.5"/><rect x="34" y="${ey-3}" width="7.5" height="6" rx="2.5"/><line x1="30" y1="${ey}" x2="34" y2="${ey}"/></g>`;
    el+=`<circle cx="26.2" cy="${ey}" r="1.5" fill="#23232B"/><circle cx="37.8" cy="${ey}" r="1.5" fill="#23232B"/>`;
  } else {
    el+=`<ellipse cx="26.2" cy="${ey}" rx="1.6" ry="1.9" fill="#fff"/><ellipse cx="37.8" cy="${ey}" rx="1.6" ry="1.9" fill="#fff"/>`;
    el+=`<circle cx="26.4" cy="${ey+.2}" r="1.5" fill="#3A2A22"/><circle cx="38" cy="${ey+.2}" r="1.5" fill="#3A2A22"/>`;
  }
  // cejas marcadas
  el+=`<path d="M23 ${ey-4.5} q3 -1.5 6 -.3" stroke="${pelo}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M35 ${ey-4.8} q3 -1.2 6 .3" stroke="${pelo}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  // nariz (sombra sutil)
  el+=`<path d="M32 32 l-1.4 5 q1.4 1 2.8 0 z" fill="${pielSombra}" opacity=".22"/>`;
  // boca
  el+=`<path d="M28.5 42 q3.5 2.6 7 0" stroke="#8A4A3C" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  // barba
  if(barba&&!fem){ el+=`<path d="M21 36 C23 46 27 50 32 50 C37 50 41 46 43 36 C40 41 38 43 32 43.5 C26 43 24 41 21 36 z" fill="${pelo}" opacity=".5"/>`; }
  return `<svg viewBox="0 0 64 70" width="${tam}" height="${Math.round(tam*70/64)}" preserveAspectRatio="xMidYMid meet">${el}</svg>`;
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


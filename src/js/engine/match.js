/* ================================================================
   MOTOR DE PARTIDO
================================================================ */
const SHOTS = {
  saque:{label:"saque",err:.04,win:.02},
  fondo:{label:"golpe de fondo",err:.09,win:.12,attr:"fondo"},
  globo:{label:"globo profundo",err:.07,win:.03,attr:"globo"},
  globoRapido:{label:"globo rápido",err:.11,win:.07,attr:"globo"},
  chiquita:{label:"chiquita",err:.10,win:.04,attr:"chiquita"},
  volea:{label:"volea",err:.09,win:.15,attr:"volea"},
  dejada:{label:"dejada",err:.16,win:.32,attr:"dejada"},
  bandeja:{label:"bandeja",err:.08,win:.10,attr:"bandeja"},
  vibora:{label:"víbora",err:.13,win:.18,attr:"vibora"},
  remate:{label:"remate plano",err:.15,win:.27,attr:"remate"},
  remate3:{label:"remate por tres",err:.24,win:.48,attr:"remate"},
  remate4:{label:"remate por cuatro",err:.28,win:.55,attr:"remate"},
  bajada:{label:"bajada de pared",err:.14,win:.22,attr:"remate"},
};
const AGRESIVOS=["vibora","remate","remate3","remate4","bajada","dejada"];
const STYLE_BIAS = {
  defensivo:{globo:2.0,globoRapido:1.3,chiquita:1.5,fondo:1.2,bandeja:1.2,vibora:.4,remate:.3,remate3:.15,remate4:.15,dejada:.7,volea:1,saque:1,bajada:.7},
  agresivo:{globo:.3,globoRapido:.5,chiquita:.6,fondo:1.1,bandeja:1.0,vibora:1.5,remate:1.7,remate3:1.4,remate4:1.4,dejada:.9,volea:1.2,saque:1,bajada:1.6},
  bandejero:{globo:.9,globoRapido:1,chiquita:1.1,fondo:1,bandeja:2.0,vibora:1.7,remate:.7,remate3:.5,remate4:.5,dejada:1,volea:1.2,saque:1,bajada:1},
  rematador:{globo:.4,globoRapido:.7,chiquita:.6,fondo:1,bandeja:1.3,vibora:1.0,remate:2.0,remate3:1.7,remate4:1.7,dejada:.8,volea:1.1,saque:1,bajada:1.8},
  constructor:{globo:1.2,globoRapido:1.1,chiquita:1.7,fondo:1.4,bandeja:1.0,vibora:.8,remate:.6,remate3:.4,remate4:.4,dejada:1.8,volea:1.1,saque:1,bajada:.9},
};
const PERSONALIDADES={
  valiente:{n:"Valiente",desc:"En los puntos calientes, arriesga."},
  conservador:{n:"Conservador",desc:"Bajo presión, busca el golpe seguro."},
  frio:{n:"Frío",desc:"Juega igual un 0-0 que un punto de oro."},
  emocional:{n:"Emocional",desc:"Con confianza vuela; sin ella, se hunde."},
};
const W=10,L=20,NET=10;
const R=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function wchoice(items){let s=items.reduce((x,i)=>x+i.w,0),r=Math.random()*s;for(const i of items){r-=i.w;if(r<=0)return i.k;}return items[items.length-1].k;}

let PRESION=0;
function calcPresion(){return Math.min(1,calcPresion_base()+(match&&match.rivBoost||0));}
let TACT={agres:"normal",diana:"repartir"};
let torneo_ultimo=null;
function factorPerso(pl){
  if(PRESION<.5) return {aggr:1,err:1};
  const p=pl.perso||"frio", conf=pl.conf??55;
  if(p==="valiente") return {aggr:1.4,err:1.05};
  if(p==="conservador") return {aggr:.55,err:.92};
  if(p==="emocional") return conf>=60?{aggr:1.35,err:.95}:{aggr:.7,err:1.3};
  return {aggr:1,err:1};
}
function chooseShot(pl,ctx,opp){
  let cands=[];
  if(ctx.atNet&&ctx.high) cands=["bandeja","vibora","remate","remate3","remate4"];
  else if(ctx.atNet) cands=["volea","dejada"];
  else if(ctx.high) cands=["bajada","globo"];
  else cands=["fondo","globo","globoRapido","chiquita"];
  const bias=STYLE_BIAS[pl.estilo]||STYLE_BIAS.constructor;
  const fp=factorPerso(pl);
  const items=cands.map(k=>{
    const a=(pl.attrs[SHOTS[k].attr]||70)/100;
    let w=a*a*a*(bias[k]||1);
    if(opp.atNet&&(k==="globo"||k==="globoRapido")) w*=1.7;
    if(opp.atNet&&k==="chiquita") w*=1.4;
    if(!opp.atNet&&k==="dejada") w*=1.6;
    if(!opp.atNet&&(k==="globo"||k==="globoRapido")) w*=.35;
    if(AGRESIVOS.includes(k)) w*=fp.aggr;
    return {k,w:Math.max(w,.02)};
  });
  return wchoice(items);
}
const GOLPE_FIN=["remate","vibora","bandeja","volea"];   // finalización → revés
const GOLPE_CON=["fondo","pared","globo","dejada","chiquita"]; // construcción → drive
function quimicaLado(team){
  const j=team.jug; if(!j||j.length<2) return 1;
  const l0=j[0].lado, l1=j[1].lado;
  if(l0===undefined||l1===undefined) return 1;   // sin datos: neutro
  if(l0!==l1) return 1.05;    // combinación ideal drive+revés: +5% de rendimiento
  return .93;                 // dos del mismo lado: se estorban, -7%
}
function ladoNatural(pl,shotKey){
  // ¿este jugador ejecuta este golpe desde su lado natural?
  const l=pl.lado; if(l===undefined) return 1;   // sin lado definido: neutro
  const esFin=GOLPE_FIN.includes(s0key(shotKey)), esCon=GOLPE_CON.includes(s0key(shotKey));
  if(l===1&&esFin) return 1.06;   // revés rematando: en su salsa
  if(l===0&&esCon) return 1.06;   // drive construyendo: en su salsa
  if(l===1&&esCon) return .95;    // revés obligado a construir
  if(l===0&&esFin) return .95;    // drive obligado a rematar
  return 1;
}
function s0key(k){ return SHOTS[k]?SHOTS[k].attr:k; }
function resolveShot(pl,shotKey,ctx,rallyLen){
  const s=SHOTS[shotKey];
  const attr=(pl.attrs[s.attr]||75);
  const ladoMod=ladoNatural(pl,shotKey)*(ctx._quimLado||1);
  const q=clamp(((attr-35)/55)*ladoMod,.12,1.2);
  const fp=factorPerso(pl);
  let err=s.err*(1.28-q*.68)*fp.err;
  // táctica del equipo del jugador (solo tu equipo la fija)
  const mia=ctx.team===0&&match&&!match.cpu;
  if(mia&&TACT.agres==="agresiva") err*=1.14;
  if(mia&&TACT.agres==="conservadora") err*=.88;
  const conf=pl.conf??55;
  if(conf<40) err*=1.15; else if(conf>75) err*=.92;
  if(ctx.afterGlass) err*=(1.35-pl.attrs.pared/160);
  if(ctx.pressure) err*=1+ctx.pressure*.55;
  let win=Math.min(.52,s.win*q*(1+.25*q));
  if(ctx.oppDef) win*=clamp(1.25-ctx.oppDef/160,.7,1.1);   // la defensa rival llega a más bolas
  const mia2=ctx.team===0&&match&&!match.cpu;
  if(mia2&&TACT.agres==="agresiva") win*=1.22;
  if(mia2&&TACT.agres==="conservadora") win*=.85;
  if(mia2&&TACT.diana==="debil") win*=1.09;   // buscas al flojo: más bola ganadora
  if(ctx.oppScrambling) win*=1.7;
  if(rallyLen>18){err*=1.38;win*=1.25;}
  // fatiga: un jugador cansado falla más y cierra menos puntos
  const fat=ctx.fatiga||0;
  if(fat>0){ err*=1+fat/240; win*=1-Math.min(.4,fat/300); }
  const r=Math.random();
  if(r<err) return "error";
  if(r<err+win) return "winner";
  return "sigue";
}
function contactPoint(teamIdx,deep,x){
  const y = teamIdx===0 ? (deep?R(2,3.6):R(6.6,8)) : (deep?L-R(2,3.6):L-R(6.6,8));
  return {x:x!==undefined?x:R(1.5,8.5),y,z:deep?R(.5,.9):R(.6,1.1)};
}
function incomingFor(shotKey,recvIdxTeam,recvTeam){
  const deepGlass=["vibora","remate","globo"].includes(shotKey)&&Math.random()<(shotKey==="globo"?.55:.7);
  if(shotKey==="chiquita"||((shotKey==="fondo")&&recvTeam.atNet)){
    return {ctx:{atNet:recvTeam.atNet,high:false,afterGlass:false,pressure:shotKey==="chiquita"?.5:.2},c:contactPoint(recvIdxTeam,false),vuelo:"volea"};
  }
  if(shotKey==="globo"||shotKey==="globoRapido"){
    const glass=shotKey==="globo"&&Math.random()<.5;
    return {ctx:{atNet:false,high:false,afterGlass:glass,pressure:.1},c:contactPoint(recvIdxTeam,true),vuelo:glass?"pared":"bote"};
  }
  const glass=deepGlass||(shotKey==="saque"&&Math.random()<.35);
  const high=glass&&Math.random()<.18;
  const press={vibora:.5,remate:.6,bandeja:.3,bajada:.5,volea:.3}[shotKey]||.15;
  return {ctx:{atNet:false,high,afterGlass:glass,pressure:press},c:contactPoint(recvIdxTeam,true),vuelo:glass?"pared":"bote"};
}
const F_WIN=["¡No llega nadie a eso!","¡Bola imposible!","¡Qué barbaridad!","¡La pista se queda pequeña!"];
const F_ERR=["Se le va por poco...","¡A la red! Error no forzado.","La bola muere en el cristal sin botar.","Se precipita y la manda fuera."];
const F_PERSO={valiente:" — no le tiembla el pulso",conservador:" — a lo seguro",frio:" — hielo en las venas",emocionalAlto:" — está en racha y se nota",emocionalBajo:" — se le nota la tensión"};

let teams=[],stats;
function mkStats(){return {jug:[{w:0,e:0},{w:0,e:0}], tiros:0, bp:{jugados:0,ganados:0}, fatiga:[0,0], pganados:0};}


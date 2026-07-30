/* ================================================================
   MOTOR DE PARTIDO
================================================================ */
/* Golpes del pádel. `label` es una CLAVE i18n, no texto: la narración del punto
   la pinta en cada golpe, así que estaba saliendo en castellano en las cinco
   versiones del juego. Se resuelve con golpeNombre(). */
const SHOTS = {
  saque:{label:"sh_saque",err:.04,win:.02},
  fondo:{label:"sh_fondo",err:.09,win:.12,attr:"fondo"},
  globo:{label:"sh_globo",err:.07,win:.03,attr:"globo"},
  globoRapido:{label:"sh_globoRapido",err:.11,win:.07,attr:"globo"},
  chiquita:{label:"sh_chiquita",err:.10,win:.04,attr:"chiquita"},
  volea:{label:"sh_volea",err:.09,win:.15,attr:"volea"},
  /* OJO CON LA DEJADA. Con win .32 era el mejor golpe del juego —ganaba el
     punto más veces que un remate (.27) arriesgando poco más que una víbora—
     y además, si no lo ganaba, dejaba al rival descolocado (`_scr`, ×1,7 en el
     siguiente). Medido: el 78% de los puntos que cerraba el `constructor`
     morían en dejada, y ese estilo ganaba el 93-98% a todos los demás a
     igualdad de nivel. El partido entero era «quién tiene más dejada».
     Una dejada es un golpe de riesgo que ROBA la iniciativa, no que cierra
     el punto: el premio está en el desajuste que provoca, no en el winner. */
  dejada:{label:"sh_dejada",err:.20,win:.15,attr:"dejada"},
  bandeja:{label:"sh_bandeja",err:.07,win:.11,attr:"bandeja"},
  vibora:{label:"sh_vibora",err:.13,win:.18,attr:"vibora"},
  remate:{label:"sh_remate",err:.15,win:.27,attr:"remate"},
  remate3:{label:"sh_remate3",err:.24,win:.48,attr:"remate"},
  remate4:{label:"sh_remate4",err:.28,win:.55,attr:"remate"},
  bajada:{label:"sh_bajada",err:.14,win:.22,attr:"remate"},
};
/* Nombre visible de un golpe, ya traducido. */
function golpeNombre(k){ const s=SHOTS[k]; return s?t(s.label):k; }
const AGRESIVOS=["vibora","remate","remate3","remate4","bajada","dejada"];
const STYLE_BIAS = {
  defensivo:{globo:2.0,globoRapido:1.3,chiquita:1.5,fondo:1.2,bandeja:1.2,vibora:.4,remate:.3,remate3:.15,remate4:.15,dejada:.7,volea:1,saque:1,bajada:.7},
  agresivo:{globo:.3,globoRapido:.5,chiquita:.6,fondo:1.1,bandeja:1.0,vibora:1.5,remate:1.7,remate3:1.4,remate4:1.4,dejada:.9,volea:1.2,saque:1,bajada:1.6},
  bandejero:{globo:.9,globoRapido:1,chiquita:.8,fondo:1,bandeja:2.0,vibora:1.7,remate:.7,remate3:.5,remate4:.5,dejada:.7,volea:1.2,saque:1,bajada:1},
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
const R=(a,b)=>a+rnd()*(b-a);
const pick=a=>a[Math.floor(rnd()*a.length)];
/* Elegir la FRASE que narra un punto no decide nada: el punto ya está jugado.
   Va por azar visual a propósito. El comentario ya se emite detrás de una
   moneda visual, así que si la frase bebiera del flujo con semilla, esa moneda
   acabaría moviendo la simulación: dos partidas con la misma semilla dejarían
   de coincidir (pasó al ampliar el repertorio del narrador). */
const pickVis=a=>a[Math.floor(Math.random()*a.length)];   // azar-visual
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function wchoice(items){let s=items.reduce((x,i)=>x+i.w,0),r=rnd()*s;for(const i of items){r-=i.w;if(r<=0)return i.k;}return items[items.length-1].k;}

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
  // En la red con bola baja hay tres respuestas, no dos. Con solo volea y
  // dejada, cada bola en la red era una moneda entre las dos y ganaba siempre
  // quien tuviera más dejada; la bola a los pies es la tercera opción real.
  else if(ctx.atNet) cands=["volea","dejada","chiquita"];
  else if(ctx.high) cands=["bajada","globo"];
  else cands=["fondo","globo","globoRapido","chiquita"];
  const bias=STYLE_BIAS[pl.estilo]||STYLE_BIAS.constructor;
  const fp=factorPerso(pl);
  const items=cands.map(k=>{
    const a=(pl.attrs[SHOTS[k].attr]||70)/100;
    let w=a*a*a*(bias[k]||1);
    if(opp.atNet&&(k==="globo"||k==="globoRapido")) w*=1.7;
    if(opp.atNet&&k==="chiquita") w*=1.4;
    if(!opp.atNet&&k==="dejada") w*=1.25;
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
/* EL DÍA QUE SE LEVANTA CADA PAREJA.
   Un partido son cien y pico puntos, así que una ventaja mínima por punto se
   convierte en una certeza al final: sin esto, +4 de nivel ganaba el 75%, +8 el
   92% y +12 el 98%. Con esos números el ranking es un orden estricto por nivel,
   no pasa NUNCA nada raro, y todo lo demás que el juego te deja tocar —la
   táctica, el plan de la pareja, la forma, la confianza, que valen uno a tres
   niveles— queda ahogado debajo. Además el propio juego se contradecía: el
   cuadro del torneo resuelve los cruces con `probGana`, que da un 91% a esos
   mismos 12 puntos.

   Esto no enturbia la simulación: no toca ni la elección de golpe ni el modelo
   del punto (por eso no descoloca el equilibrio de estilos). Solo reconoce que
   una pareja no rinde igual todos los días. Se sortea UNA vez por partido y por
   pareja, y sale del flujo con semilla, así que dos partidas iguales lo viven
   igual. Media de dos uniformes: los días muy buenos y muy malos son raros. */
const DIA_AMPL=.22;
function diaDePartido(){ return 1+((rnd()+rnd())-1)*DIA_AMPL; }
function resolveShot(pl,shotKey,ctx,rallyLen){
  const s=SHOTS[shotKey];
  const attr=(pl.attrs[s.attr]||75);
  const ladoMod=ladoNatural(pl,shotKey)*(ctx._quimLado||1)*(ctx._dia||1);
  /* El techo de q es 1,35 y no 1,2 POR EL FACTOR DE DÍA. El atributo máximo es
     96, o sea q=1,109: con 1,2 el tope casi nunca mordía. Al multiplicar el día
     dentro del recorte, a una pareja de élite se le cortaban los días buenos
     (1,109×1,22 = 1,35) pero no los malos, así que el factor de día la
     penalizaba en neto. Medido: una pareja con todo a 95 ganaba solo el 71% a
     una de 88, cuando sin el sesgo son 30 puntos de nivel de diferencia. */
  const q=clamp(((attr-35)/55)*ladoMod,.12,1.35);
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
  // OFICIO del veterano: quien lleva temporadas compitiendo falla menos cuando
  // el punto quema. Solo se aplica a TU jugador (el que tiene carrera detrás).
  if(pl.me&&typeof factorOficio==="function"&&typeof G!=="undefined"&&G&&G.carrera)
    err*=factorOficio(G.carrera,typeof PRESION!=="undefined"?PRESION:0);
  /* Eventos de circuito: la pista lenta, la pelota nueva o la altitud cambian
     lo que le sale a cada golpe. Se consulta una bolsa ya calculada, no la
     lista de eventos: esto se ejecuta decenas de veces por punto. */
  const _ev=(typeof evGolpe==="function")?evGolpe(shotKey):null;
  if(_ev) err*=_ev.err;
  /* El plan de la pareja, escalado por lo dominado que esté. Solo se aplica a
     TU equipo: es vuestro trabajo de meses, no una regla del circuito. */
  const _mio=ctx.team===0&&match&&!match.cpu;
  const _pj=(_mio&&typeof pjGolpe==="function")?pjGolpe(shotKey):null;
  if(_pj) err*=_pj.err;
  /* Y lo que el rival ya te ha leído: un golpe que repites hasta el aburrimiento
     deja de sorprender a nadie. */
  const _lec=(_mio&&typeof tacLecturaX==="function")?tacLecturaX(shotKey):null;
  if(_lec) err*=_lec.err;
  let win=Math.min(.52,s.win*q*(1+.25*q));
  if(_ev) win*=_ev.win;
  if(_pj) win*=_pj.win;
  if(_lec) win*=_lec.win;
  if(ctx.oppDef) win*=clamp(1.25-ctx.oppDef/160,.7,1.1);   // la defensa rival llega a más bolas
  const mia2=ctx.team===0&&match&&!match.cpu;
  if(mia2&&TACT.agres==="agresiva") win*=1.22;
  if(mia2&&TACT.agres==="conservadora") win*=.85;
  if(mia2&&TACT.diana==="debil") win*=1.09;   // buscas al flojo: más bola ganadora
  if(mia2){
    // estrategia de red (tu equipo): subir (mucha pegada arriba, pero te expones a
    // que un buen globeador te pase) o aguantar atrás (sólido, pero cierras menos)
    const red=TACT.red||"normal";
    if(red==="subir"){ if(ctx.atNet||shotKey==="volea"||shotKey==="bandeja"||AGRESIVOS.includes(shotKey)) win*=1.20; err*=1.06; }
    else if(red==="aguantar"){ win*=.85; err*=.82; }
    // puntos calientes: en los puntos importantes, arriesgar (muchos más winners y
    // fallos) o conservar (menos de ambos)
    const clutch=TACT.clutch||"normal";
    if(typeof PRESION!=="undefined"&&PRESION>=.5){
      if(clutch==="arriesgar"){ win*=1.28; err*=1.22; }
      else if(clutch==="conservar"){ win*=.78; err*=.75; }
    }
  } else if(match&&!match.cpu){
    // el rival castiga tu plan: si subiste a la red, un buen globeador te pasa por
    // arriba; si aguantas atrás, al rival le cuesta más cerrar el punto desde la red
    if(TACT.red==="subir"&&(shotKey==="globo"||shotKey==="globoRapido")) win*=1+clamp(((pl.attrs.globo||60)-58)/95,0,.55);
    else if(TACT.red==="aguantar"&&(shotKey==="remate"||shotKey==="vibora"||shotKey==="bandeja")) win*=.9;
  }
  // rasgos del ejecutor: identidad sistémica (especialista, cristal frágil, pura
  // pegada, muro…). Afecta a los dos equipos, así que los NPC también tienen carácter.
  if(typeof rasgosMatch==="function"){
    const rm=rasgosMatch(pl,shotKey,{presion:(typeof PRESION!=="undefined"?PRESION:0),premier:(typeof torneo!=="undefined"&&torneo&&torneo.premierT),agresivo:AGRESIVOS.includes(shotKey)});
    win*=rm.win; err*=rm.err;
  }
  if(ctx.oppScrambling) win*=1.7;
  if(rallyLen>18){err*=1.38;win*=1.25;}
  // fatiga: un jugador cansado falla más y cierra menos puntos
  const fat=ctx.fatiga||0;
  if(fat>0){ err*=1+fat/240; win*=1-Math.min(.4,fat/300); }
  const r=rnd();
  if(r<err) return "error";
  if(r<err+win) return "winner";
  return "sigue";
}
function contactPoint(teamIdx,deep,x){
  const y = teamIdx===0 ? (deep?R(2,3.6):R(6.6,8)) : (deep?L-R(2,3.6):L-R(6.6,8));
  return {x:x!==undefined?x:R(1.5,8.5),y,z:deep?R(.5,.9):R(.6,1.1)};
}
function incomingFor(shotKey,recvIdxTeam,recvTeam){
  const deepGlass=["vibora","remate","globo"].includes(shotKey)&&rnd()<(shotKey==="globo"?.55:.7);
  if(shotKey==="chiquita"||((shotKey==="fondo")&&recvTeam.atNet)){
    return {ctx:{atNet:recvTeam.atNet,high:false,afterGlass:false,pressure:shotKey==="chiquita"?.5:.2},c:contactPoint(recvIdxTeam,false),vuelo:"volea"};
  }
  if(shotKey==="globo"||shotKey==="globoRapido"){
    const glass=shotKey==="globo"&&rnd()<.5;
    return {ctx:{atNet:false,high:false,afterGlass:glass,pressure:.1},c:contactPoint(recvIdxTeam,true),vuelo:glass?"pared":"bote"};
  }
  const glass=deepGlass||(shotKey==="saque"&&rnd()<.35);
  const high=glass&&rnd()<.18;
  /* La BANDEJA aprieta tanto como una víbora. No cierra el punto —para eso
     están el remate y la víbora— pero cae larga y te deja pegado al fondo:
     su trabajo es que el de abajo tenga que levantar la bola incómodo otra
     vez. Con .3 no compensaba elegirla nunca teniendo bola alta, y el estilo
     entero (`bandejero`) era el peor del juego por goleada. */
  const press={vibora:.5,remate:.6,bandeja:.5,bajada:.5,volea:.3}[shotKey]||.15;
  return {ctx:{atNet:false,high,afterGlass:glass,pressure:press},c:contactPoint(recvIdxTeam,true),vuelo:glass?"pared":"bote"};
}
/* Frases del narrador: claves i18n. Se resuelven al construir el comentario. */
/* Frases del narrador, por lo que se ve en pantalla. Antes había una sola bolsa
   de cuatro para todos los errores, así que el narrador decía «¡a la red!»
   mientras la bola moría en el cristal: el punto contaba una cosa y el texto
   otra. Ahora cada final tiene su repertorio, y hay tres veces más frases,
   que es lo que se lee de verdad —una por punto, cien por partido—. */
const F_WIN={
  winner:["nar_win_1","nar_win_2","nar_win_3","nar_win_4","nar_win_5","nar_win_6","nar_win_7","nar_win_8"],
  porTres:["nar_p3_1","nar_p3_2","nar_p3_3","nar_p3_4"],
};
const F_ERR={
  net:["nar_err_2","nar_err_net_2","nar_err_net_3","nar_err_net_4"],
  out:["nar_err_1","nar_err_4","nar_err_out_3","nar_err_out_4"],
  glass:["nar_err_3","nar_err_gl_2","nar_err_gl_3","nar_err_gl_4"],
};
const F_PERSO={
  valiente:["nar_p_valiente","nar_p_valiente2"],
  conservador:["nar_p_conservador","nar_p_conservador2"],
  frio:["nar_p_frio","nar_p_frio2"],
  emocionalAlto:["nar_p_emoAlto","nar_p_emoAlto2"],
  emocionalBajo:["nar_p_emoBajo","nar_p_emoBajo2"],
};
// La frase acompaña al final que se pinta: si la bola muere en el cristal, se dice.
function frasePunto(mapa,modo){ const arr=mapa[modo]||mapa[Object.keys(mapa)[0]]; return pickVis(arr); }

let teams=[],stats;
function mkStats(){return {jug:[{w:0,e:0},{w:0,e:0}], tiros:0, bp:{jugados:0,ganados:0}, fatiga:[0,0], pganados:0, red:0, wShot:{}, eShot:{}, uso:{}, presion:{jug:0,gan:0}};}


/* ================================================================
   LAS PRIMERAS SEMANAS TIENEN QUE CONTAR ALGO

   El arranque de una carrera era el tramo más pobre del juego: aparecías con
   una pareja que no sabías de dónde salía, jugabas contra desconocidos que no
   volvías a ver y, a las diez semanas, nadie te había dicho en qué te estabas
   convirtiendo. La guía enseñaba a pulsar botones; esto cuenta una historia con
   los mismos botones.

   Tres escenas, y las tres leen el estado de la partida en vez de inventarse
   nada:

   1. QUIÉN ES TU PRIMERA PAREJA y qué le dices. No es un texto de bienvenida:
      cómo plantees la sociedad mueve los ejes de la relación desde el minuto
      uno, y eso te acompaña meses.

   2. EL PRIMER RIVAL, con nombre. Se elige uno de tu nivel al empezar y el
      sorteo lo pone en tu camino más a menudo, así que la primera cara conocida
      del circuito aparece antes de que el sistema de némesis —que necesita
      varias eliminaciones— tenga nada que decir.

   3. EL BALANCE DE LAS DIEZ SEMANAS: qué estás construyendo, según lo que has
      hecho de verdad. No es un resumen de resultados, es un espejo.
================================================================ */

const ARR_SEM_RIVAL=3;      // la semana en la que se presenta el primer rival
const ARR_SEM_BALANCE=10;   // y aquella en la que se hace el primer balance

/* ---------------- 1 · la primera pareja ---------------- */
/* Cómo planteas la sociedad. Cada opción mueve los ejes de engine/pareja.js:
   una promesa de lealtad no cuesta nada hoy y pesa dentro de un año. */
const ARR_PACTOS=[
  { id:"serio",    ef:{lealtad:12, personal:8,  ambicion:-6} },
  { id:"temporal", ef:{ambicion:10, lealtad:-8, personal:-5} },
  { id:"veremos",  ef:{convivencia:8, personal:3} },
];
function arrPactoEf(id){ const p=ARR_PACTOS.find(x=>x.id===id); return p?p.ef:null; }
function arrPacto(c,id){
  const ef=arrPactoEf(id);
  if(!c||!ef) return false;
  if(typeof relMueve==="function") Object.keys(ef).forEach(k=>relMueve(c,k,ef[k]));
  c.pactoInicial=id;
  return true;
}

/* ---------------- 2 · el primer rival ---------------- */
/* Uno de tu quinta y de tu nivel: ni un top 10 al que no vas a ver, ni un
   relleno. Se guarda su id para que el sorteo lo traiga de vuelta. */
function arrEligeRival(c){
  if(!c||c.rivalDebut) return null;
  const sx=c.sexo||"M";
  const mio=Math.round((mediaAttrs(c.attrs)+mediaAttrs(c.compi.attrs))/2);
  const cand=G.world.parejas.filter(p=>(p.sexo||"M")===sx&&Math.abs(nivelPareja(p)-mio)<=7);
  const r=cand.length?pick(cand):null;
  if(!r) return null;
  c.rivalDebut={id:r.id, nombre:r.nombre, desde:c.semana|0, v:0, d:0};
  return r;
}
function arrRivalDebut(c){ return (c&&c.rivalDebut)?c.rivalDebut:null; }
/* ¿Le toca aparecer? El sorteo lo trae más a menudo mientras la historia esté
   viva: las primeras temporadas. Después, el sistema de némesis toma el relevo. */
const ARR_PROB_SORTEO=.42, ARR_TEMPS=2;
function arrSorteaRival(c,fase){
  const rd=arrRivalDebut(c);
  if(!rd||fase>3) return null;
  if(temporada()>ARR_TEMPS) return null;
  if(rnd()>=ARR_PROB_SORTEO) return null;
  return G.world.parejas.find(p=>String(p.id)===String(rd.id))||null;
}
/* Se anota cada cruce: el marcador de la primera rivalidad de tu carrera. */
function arrAnotaRival(c,rivalId,gane){
  const rd=arrRivalDebut(c);
  if(!rd||String(rd.id)!==String(rivalId)) return;
  if(gane) rd.v=(rd.v|0)+1; else rd.d=(rd.d|0)+1;
}

/* ---------------- 3 · el balance de las diez semanas ---------------- */
/* Un espejo, no un marcador: qué dicen de ti las decisiones que has tomado.
   Cada línea sale de un dato del estado, y si el dato no existe, la línea no
   se pinta —antes que rellenar con vaguedades. */
function arrBalance(c){
  const L=[];
  if(!c) return L;
  const vd=c.vd||{v:0,d:0}, jug=vd.v+vd.d;
  // cómo compites
  if(jug>=3){
    const pct=Math.round(100*vd.v/jug);
    L.push({k:"record", txt:t(pct>=55?"arr_bal_gana":pct>=30?"arr_bal_pelea":"arr_bal_sufre",{v:vd.v,d:vd.d,pct})});
  } else L.push({k:"pocos", txt:t("arr_bal_pocos",{n:jug})});
  // en qué te estás convirtiendo: el golpe más trabajado y el más flojo
  if(typeof adaptLee==="function"&&c.adapt){
    const mas=ATTR_KEYS.slice().sort((a,b)=>adaptLee(c,b)-adaptLee(c,a))[0];
    if(adaptLee(c,mas)>0) L.push({k:"entreno", txt:t("arr_bal_entreno",{g:atNombre(mas)})});
  }
  const flojo=ATTR_KEYS.slice().sort((a,b)=>c.attrs[a]-c.attrs[b])[0];
  const fuerte=ATTR_KEYS.slice().sort((a,b)=>c.attrs[b]-c.attrs[a])[0];
  L.push({k:"perfil", txt:t("arr_bal_perfil",{fuerte:atNombre(fuerte),flojo:atNombre(flojo)})});
  // la pareja
  if(typeof relPeor==="function"&&c.rel){
    const peor=relPeor(c), v=relLee(c,peor);
    L.push({k:"pareja", txt:t(v<50?"arr_bal_pareja_mal":"arr_bal_pareja_bien",{n:c.compi.n,eje:relNombre(peor).toLowerCase()})});
  }
  // el dinero
  L.push({k:"caja", txt:t((c.dinero|0)<800?"arr_bal_caja_mal":(c.dinero|0)>4000?"arr_bal_caja_bien":"arr_bal_caja_justa",{n:c.dinero|0})});
  // el primer rival
  const rd=arrRivalDebut(c);
  if(rd&&(rd.v+rd.d)>0) L.push({k:"rival", txt:t("arr_bal_rival",{n:rd.nombre,v:rd.v|0,d:rd.d|0})});
  // y hacia dónde vas
  const pos=(typeof miPuesto==="function")?miPuesto():99;
  L.push({k:"rumbo", txt:t("arr_bal_rumbo",{pos})});
  return L;
}
/* ¿Toca alguna escena esta semana? Devuelve la clave o null. Se pregunta una
   vez por semana y cada escena se marca vista para que no vuelva. */
function arrEscenaPendiente(c){
  if(!c||G.modo!=="carrera") return null;
  c.arrVistas=c.arrVistas||{};
  const s=c.semana|0;
  if(!c.arrVistas.pareja&&s<=2) return "pareja";
  if(!c.arrVistas.rival&&s>=ARR_SEM_RIVAL) return "rival";
  if(!c.arrVistas.balance&&s>=ARR_SEM_BALANCE) return "balance";
  return null;
}
function arrMarca(c,k){ c.arrVistas=c.arrVistas||{}; c.arrVistas[k]=c.semana|0; }

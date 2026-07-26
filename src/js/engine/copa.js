/* ================================================================
   EL CLUB TIENE COMPETICIÓN PROPIA

   Hasta aquí el modo club era una carrera con dos parejas: la A jugaba los
   mismos torneos individuales que un jugador y la B iba a otro por su cuenta.
   Todo lo demás —plantilla, cantera, filosofía, junta— colgaba de una
   competición que no era del club, sino de sus parejas. (La Superliga de
   `engine/liga.js` es otra cosa: un modo aparte, con plantilla propia y un
   motor de fuerzas abstractas. Esto se juega con TUS jugadores.)

   La Copa de Clubes son ocho equipos a ida y vuelta, y cada jornada una
   ELIMINATORIA a dos partidos con desempate:

   - Ves las dos parejas del rival ANTES de alinear y decides quién juega contra
     quién. Poner tu mejor pareja contra la suya asegura ese punto y deja el
     otro en el aire; cruzarlas es apostar a llevarte los dos.
   - En los dos primeros partidos un jugador solo juega UNO. Sin cuatro
     jugadores sanos el segundo punto se pierde sin jugarlo: la plantilla corta
     se paga aquí, y esa es la razón de tener fondo de armario.
   - Si queda 1-1 hay desempate y ahí sí se repite pareja, pero con lo que les
     quede de energía. Gastar a los mejores en el primer punto o guardarlos para
     el tercero es la decisión de la jornada.

   Y hay dos jefes que no quieren lo mismo: la junta mira la clasificación y los
   SOCIOS miran el derbi, la cantera y que no vendas al ídolo. Los socios pagan
   cuota todas las semanas, así que enfadarlos cuesta dinero de verdad.
================================================================ */

const COP_CLUBES=8;                 // tu club y siete rivales
const COP_PTS_VICT=3;
const COP_ENERGIA=13;               // lo que cuesta jugar un partido de la eliminatoria
const COP_MIN_ENERGIA=25;           // por debajo de esto no se sale a jugar

/* ---------------- calendario ---------------- */
/* Las jornadas caen en semanas SIN premier: bastante tiene el club con que su
   pareja A esté en un torneo grande. Sí coinciden con Continentales, y ahí es
   donde la fatiga empieza a decidir alineaciones. */
function copSemanasLibres(){
  const libres=[];
  for(let s=2;s<=SEMANAS_TEMP-2;s++) if(slotSemana(s).premier===undefined) libres.push(s);
  return libres;
}
/* Round robin de ida y vuelta para `n` equipos (algoritmo del círculo). */
function copRondas(n){
  const eq=[...Array(n).keys()];
  const rondas=[];
  const fijo=eq[0], resto=eq.slice(1);
  for(let r=0;r<n-1;r++){
    const par=[[fijo,resto[0]]];
    for(let i=1;i<n/2;i++) par.push([resto[i],resto[resto.length-i]]);
    rondas.push(par.map(x=>x.slice()));
    resto.unshift(resto.pop());
  }
  // vuelta: los mismos cruces con el campo cambiado
  return rondas.concat(rondas.map(par=>par.map(([a,b])=>[b,a])));
}
/* Monta la competición de la temporada. El índice 0 del grupo eres tú. */
function copCrea(cl){
  const rivales=[], usados=new Set();
  // los siete rivales salen del mundo, no de la nada: son clubes del circuito
  let guard=0;
  while(rivales.length<COP_CLUBES-1&&guard++<200){
    const i=clubAlAzar();
    if(usados.has(i)) continue;
    usados.add(i); rivales.push(i);
  }
  // el derbi entra siempre: una liga sin el vecino no es una liga
  const d=cl&&cl.derbi&&cl.derbi.club;
  if(d!=null&&rivales.indexOf(d)<0){ rivales[rivales.length-1]=d; }
  const rondas=copRondas(COP_CLUBES);
  const libres=copSemanasLibres();
  const paso=Math.max(1,Math.floor(libres.length/rondas.length));
  const cal=rondas.map((par,i)=>({sem:libres[Math.min(libres.length-1,i*paso)],par}));
  return {
    temp:temporada(), grupo:rivales, cal,
    tabla:Array.from({length:COP_CLUBES},()=>({pts:0,g:0,p:0,pf:0,pc:0})),
    jugadas:{}, ultima:null,
  };
}
function copAsegura(cl){
  if(!cl) return null;
  if(!cl.copa||cl.copa.temp!==temporada()) cl.copa=copCrea(cl);
  return cl.copa;
}
function copNombreDe(cl,i){
  if(i===0) return cl.nombre;
  const idx=copAsegura(cl).grupo[i-1];
  return (CLUBES_NPC[idx]&&CLUBES_NPC[idx].n)||"—";
}
function copColorDe(cl,i){
  if(i===0) return cl.color;
  const idx=copAsegura(cl).grupo[i-1];
  return (CLUBES_NPC[idx]&&CLUBES_NPC[idx].color)||"#8A96A8";
}
function copEsDerbi(cl,iGrupo){
  const d=cl&&cl.derbi&&cl.derbi.club;
  return d!=null&&copAsegura(cl).grupo[iGrupo-1]===d;
}
/* La eliminatoria de esta semana, si la hay y no está jugada. */
function copJornadaDe(cl,semana){
  const L=copAsegura(cl); if(!L) return null;
  for(let i=0;i<L.cal.length;i++){
    if(L.cal[i].sem!==semana||L.jugadas[i]) continue;
    const cruce=L.cal[i].par.find(p=>p[0]===0||p[1]===0);
    if(!cruce) continue;
    return {jor:i, sem:L.cal[i].sem, rival:cruce[0]===0?cruce[1]:cruce[0], casa:cruce[0]===0};
  }
  return null;
}
/* Las dos parejas del rival: las mejores que ese club tiene en el circuito. */
function copParejasRival(cl,iGrupo){
  const idx=copAsegura(cl).grupo[iGrupo-1];
  const sx=cl.sexo||"M";
  const pares=G.world.parejas
    .filter(p=>p.club===idx&&(p.sexo||"M")===sx)
    .sort((a,b)=>nivelPareja(b)-nivelPareja(a))
    .slice(0,2);
  while(pares.length<2) pares.push(pares[0]||{nombre:"—",jug:[],pts:0});
  return pares;
}

/* ---------------- la eliminatoria ---------------- */
/* Quién puede jugar hoy: ni lesionado, ni cedido, ni fundido. */
function copDisponibles(cl){
  return (cl.plantilla||[]).filter(j=>!j.lesion&&!j.cedido&&j.energia>=COP_MIN_ENERGIA);
}
/* Cómo repartes a los cuatro entre las dos parejas. Es la decisión de verdad:
   APILAR junta a los dos mejores —un punto casi seguro y el otro regalado— y
   REPARTIR hace dos parejas parejas, que es apostar a llevarte los dos.
   Con menos de cuatro disponibles no hay nada que repartir. */
function copAlineacionAuto(cl,reparte){
  const libres=copDisponibles(cl).slice().sort((a,b)=>mediaAttrs(b.attrs)-mediaAttrs(a.attrs));
  if(libres.length<2) return [];
  if(libres.length<4||!reparte){
    const par=[];
    while(libres.length>=2&&par.length<2) par.push([libres.shift(),libres.shift()]);
    return par;
  }
  return [[libres[0],libres[3]],[libres[1],libres[2]]];
}
/* Fuerza de un club del grupo, para resolver los cruces que no juegas tú. */
function copFuerza(cl,i){
  if(i===0){
    const p=copAlineacionAuto(cl)[0];
    return p?Math.round((mediaAttrs(p[0].attrs)+mediaAttrs(p[1].attrs))/2):50;
  }
  const par=copParejasRival(cl,i);
  return Math.round((nivelPareja(par[0])+nivelPareja(par[1]))/2)||55;
}
/* Resuelve la eliminatoria. `cruce` decide contra quién juega tu pareja 1:
   0 = la tuya 1 contra su 1 · 1 = cruzadas. `desempate` es cuál de tus dos
   parejas sale al tercer partido. Devuelve el acta. */
function copJuega(cl,jor,mias,cruce,desempate){
  const L=copAsegura(cl);
  const j=L.cal[jor]; if(!j||L.jugadas[jor]) return null;
  const cruceP=j.par.find(p=>p[0]===0||p[1]===0); if(!cruceP) return null;
  const iRival=cruceP[0]===0?cruceP[1]:cruceP[0];
  const acta={jor, rival:iRival, casa:cruceP[0]===0, partidos:[], mio:0, suyo:0, socios:0};
  const suyas=copParejasRival(cl,iRival);
  const orden=cruce?[1,0]:[0,1];
  const juega=(mia,suya,esDes)=>{
    if(!mia){
      // sin cuatro jugadores sanos no hay segundo punto: se pierde en la mesa
      acta.partidos.push({wo:true, rival:suya.nombre, desempate:esDes});
      acta.suyo++;
      return;
    }
    const res=quickMatch(teamDePareja(mia),{...suya,jug:(suya.jug||[]).map(x=>({...x}))});
    mia.forEach(x=>{ x.energia=clamp(x.energia-COP_ENERGIA,0,100); x.conf=clamp(x.conf+(res.gane?4:-4),15,95); });
    acta.partidos.push({gane:res.gane, marcador:res.marcador, mios:mia.map(x=>x.n), rival:suya.nombre, desempate:esDes});
    if(res.gane) acta.mio++; else acta.suyo++;
  };
  for(let i=0;i<2;i++) juega(mias[i],suyas[orden[i]],false);
  // 1-1: desempate, y aquí sí se puede repetir pareja (con lo que les quede)
  if(acta.mio===1&&acta.suyo===1) juega(mias[desempate===1?1:0]||mias[0],suyas[0],true);
  acta.gane=acta.mio>acta.suyo;
  copAnota(cl,acta,j);
  return acta;
}
/* Clasificación y resto de la jornada. Separado de copJuega para poder probarlo. */
function copAnota(cl,acta,j){
  const L=copAsegura(cl), T=L.tabla, iRival=acta.rival;
  T[0].pf+=acta.mio; T[0].pc+=acta.suyo;
  T[iRival].pf+=acta.suyo; T[iRival].pc+=acta.mio;
  if(acta.gane){ T[0].pts+=COP_PTS_VICT; T[0].g++; T[iRival].p++; }
  else { T[iRival].pts+=COP_PTS_VICT; T[iRival].g++; T[0].p++; }
  L.jugadas[acta.jor]=true; L.ultima=acta;
  (j&&j.par||[]).forEach(([a,b])=>{
    if(a===0||b===0) return;
    const ga=rnd()<probGana(copFuerza(cl,a),copFuerza(cl,b));
    const [gan,per]=ga?[a,b]:[b,a];
    T[gan].pts+=COP_PTS_VICT; T[gan].g++; T[gan].pf+=2; T[gan].pc+=1;
    T[per].p++; T[per].pf+=1; T[per].pc+=2;
  });
}
/* Clasificación ordenada, con tu club marcado. */
function copTabla(cl){
  const L=copAsegura(cl);
  return L.tabla.map((f,i)=>({...f, i, yo:i===0, nombre:copNombreDe(cl,i), color:copColorDe(cl,i)}))
    .sort((a,b)=>b.pts-a.pts||(b.pf-b.pc)-(a.pf-a.pc)||b.pf-a.pf);
}
function copPuesto(cl){ return copTabla(cl).findIndex(f=>f.yo)+1; }
function copJugadas(cl){ const L=copAsegura(cl); return Object.keys(L.jugadas).length; }
/* Premio de final de temporada por puesto. El campeón cobra y llena el club. */
function copPremio(pos){ return Math.round(Math.max(0,(COP_CLUBES+1-clamp(pos||8,1,COP_CLUBES))*2600)); }

/* ---------------- los socios ---------------- */
/* Segunda moneda y segundo jefe: pagan cuota todas las semanas y no quieren lo
   mismo que la junta. La junta mira la clasificación; ellos, el derbi, la
   cantera y que no vendas al que quieren. */
const SOC_CUOTA=1.6;              // € por socio y semana, al humor máximo
const SOC_BASE=400;
function socAsegura(cl){
  if(!cl) return null;
  if(typeof cl.socios!=="number") cl.socios=SOC_BASE;
  if(typeof cl.humorSocios!=="number") cl.humorSocios=60;
  return cl;
}
function socMueve(cl,n,humor){
  socAsegura(cl);
  cl.socios=Math.max(50,Math.round(cl.socios+(n||0)));
  if(humor) cl.humorSocios=clamp(cl.humorSocios+humor,0,100);
}
/* Lo que ingresan esta semana. El humor manda: un socio enfadado no renueva. */
function socIngreso(cl){
  socAsegura(cl);
  return Math.round(cl.socios*SOC_CUOTA*(.55+.0075*cl.humorSocios));
}
function socEstado(cl){
  socAsegura(cl);
  return cl.humorSocios>=75?"entregados":cl.humorSocios>=55?"contentos":cl.humorSocios>=35?"inquietos":"hartos";
}
/* Efecto de una eliminatoria en la grada. Ganar suma; el derbi, mucho más;
   perder en casa duele el doble. */
function socTrasEliminatoria(cl,acta,derbi){
  socAsegura(cl);
  const barrido=acta.mio===2&&acta.suyo===0;
  let dn=acta.gane?(barrido?70:40):(acta.casa?-45:-20);
  let dh=acta.gane?(barrido?5:3):(acta.casa?-6:-3);
  if(derbi){ dn=Math.round(dn*2.2); dh=Math.round(dh*2); }
  socMueve(cl,dn,dh);
  acta.socios=dn;
  return dn;
}

/* ---------------- cesiones ---------------- */
/* Al que no juega se le cede: ahorras salario y él crece jugando, pero no lo
   tienes para la eliminatoria. Y si es de la casa, la grada se lo toma a mal. */
const CES_SEMANAS=16;
function cesionPosible(cl,j){
  if(!j||j.cedido||j.lesion) return false;
  return copDisponibles(cl).length>4;   // solo sobra el que sobra
}
function cesionHaz(cl,j){
  if(!cesionPosible(cl,j)) return false;
  j.cedido={club:clubAlAzar(), hasta:(cl.semana|0)+CES_SEMANAS};
  if(j.dela_casa) socMueve(cl,-30,-5);   // ceder a un canterano no gusta
  return true;
}
/* Se llama cada semana: devuelve los que vuelven, ya crecidos. */
function cesionSemana(cl){
  const vuelven=[];
  (cl.plantilla||[]).forEach(j=>{
    if(!j.cedido) return;
    if((cl.semana|0)<j.cedido.hasta) return;
    j.cedido=null;
    // ha jugado todas las semanas: vuelve mejor de lo que se fue
    const k=[...ATTR_KEYS].sort((a,b)=>j.attrs[a]-j.attrs[b])[0];
    j.attrs[k]=clamp(j.attrs[k]+2+Math.floor(rnd()*2),20,95);
    j.energia=100;
    vuelven.push({j,k});
  });
  return vuelven;
}
function cesionAhorro(cl){
  return (cl.plantilla||[]).filter(j=>j.cedido).reduce((s,j)=>s+Math.round(salarioDe(j)*.6),0);
}

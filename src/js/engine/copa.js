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
const COP_ENERGIA=10;               // lo que cuesta jugar un partido de la eliminatoria
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
/* Fuerza de UNA pareja. No es la media de los dos: manda el BUENO, y cuenta el
   doble. Un crack con un compañero discreto rinde más que dos medianías de la
   misma media, porque el bueno toca muchas más bolas decisivas.

   Esto estaba justo al revés («el más flojo pesa el doble»), y no por capricho:
   la medición que lo justificaba se hizo con el motor roto, cuando el partido
   lo decidía quién tenía más `dejada` y un especialista en cualquier otra cosa
   parecía un lastre. Vuelto a medir con el motor arreglado, a media 55 contra
   una pareja equilibrada 55/55: 58/52 gana el 55%, 62/48 el 56%, 66/44 el 74%
   y 70/40 el 79%. Es decir, apilar SUMA. Si vuelves a tocar esta fórmula,
   vuelve a sacar esa tabla antes. */
function copFuerzaPar(a,b){ return Math.round((2*Math.max(a,b)+Math.min(a,b))/3); }
/* Fuerza de un club NPC: la de su MEJOR pareja, que es la que decide el primer
   punto de la eliminatoria. */
function copFuerzaClub(cl,idx){
  const sx=cl.sexo||"M";
  const p=G.world.parejas.filter(x=>x.club===idx&&(x.sexo||"M")===sx)
    .sort((a,b)=>nivelPareja(b)-nivelPareja(a))[0];
  if(!p||!p.jug||p.jug.length<2) return 55;
  return copFuerzaPar(mediaAttrs(p.jug[0].attrs),mediaAttrs(p.jug[1].attrs));
}
/* Y la tuya: la mejor pareja que puedes poner hoy, medida igual. */
function copFuerzaTuya(cl){
  const j=(cl.plantilla||[]).filter(x=>!x.cedido).slice()
    .sort((a,b)=>mediaAttrs(b.attrs)-mediaAttrs(a.attrs));
  if(j.length<2) return 50;
  return copFuerzaPar(mediaAttrs(j[0].attrs),mediaAttrs(j[1].attrs));
}
function copCrea(cl){
  const rivales=[];
  /* Los siete rivales son los de TU DIVISIÓN, no siete al azar. Con el sorteo
     aleatorio te tocaban los mejores clubes del circuito desde la primera
     temporada: medido con un bot de cinco años, el club terminaba octavo las
     cinco, perdiendo todas las eliminatorias. Una competición que no se puede
     ganar el primer año no es una competición, es un peaje. */
  /* La división se busca UN PUNTO POR DEBAJO de tu mejor pareja: un club recién
     fundado tiene que poder ganar alguna eliminatoria el primer año, y jugar
     contra tus iguales exactos con una plantilla corta es perder siempre. */
  const mia=copFuerzaTuya(cl)-3;
  const orden=CLUBES_NPC.map((_,i)=>i)
    .sort((a,b)=>Math.abs(copFuerzaClub(cl,a)-mia)-Math.abs(copFuerzaClub(cl,b)-mia));
  orden.slice(0,COP_CLUBES-1).forEach(i=>rivales.push(i));
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
    mia.forEach(x=>{ x.energia=clamp(x.energia-COP_ENERGIA,0,100); x.conf=clamp(x.conf+(res.gane?4:-4),15,95);
      /* La memoria del canterano se escribe donde ocurre el hecho: su debut y
         su primer punto ganado para el club quedan con fecha y rival, y la
         ficha los contará años después. Si no se vivió, no existe. */
      if(x.dela_casa&&!x.debut){
        x.debut={t:temporada(),sem:semanaTemp()};
        if(typeof avisa==="function") avisa(t("can_av_debut",{n:x.n}),"ok");
        if(typeof noticia==="function") noticia("fichaje",t("can_not_debut2_t",{n:x.n}),t("can_not_debut2_s",{n:x.n,club:cl.nombre}));
      }
      if(x.dela_casa&&res.gane&&!x.primerPunto){
        x.primerPunto={t:temporada(),rival:suya.nombre};
        if(typeof avisa==="function") avisa(t("can_av_punto",{n:x.n,rival:suya.nombre}),"ok");
      }
    });
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
/* Clasificación ordenada, con tu club marcado.
   `copTablaDe` lee UNA copa concreta sin pasar por `copAsegura`. Hace falta al
   cerrar la temporada: allí la semana ya ha avanzado y pedir la tabla por la vía
   normal reconstruía la competición a cero justo antes de mirar quién había
   ganado —con lo que el campeón siempre eras tú, con cero puntos—. */
function copTablaDe(cl,L){
  if(!L) return [];
  const nom=i=>i===0?cl.nombre:((CLUBES_NPC[L.grupo[i-1]]||{}).n||"—");
  const col=i=>i===0?cl.color:((CLUBES_NPC[L.grupo[i-1]]||{}).color||"#8A96A8");
  return L.tabla.map((f,i)=>({...f, i, yo:i===0, nombre:nom(i), color:col(i)}))
    .sort((a,b)=>b.pts-a.pts||(b.pf-b.pc)-(a.pf-a.pc)||b.pf-a.pf);
}
function copTabla(cl){ return copTablaDe(cl,copAsegura(cl)); }
function copPuestoDe(cl,L){ return copTablaDe(cl,L).findIndex(f=>f.yo)+1; }
function copPuesto(cl){ return copPuestoDe(cl,copAsegura(cl)); }
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

/* La taquilla de la jornada. La Copa exige cuatro jugadores sanos —el doble de
   masa salarial que antes— y hasta aquí no pagaba nada hasta el cierre de
   temporada: el club se arruinaba por competir. Una eliminatoria en casa llena
   el club, y eso es dinero. */
const COP_TAQUILLA=1.15;      // € por socio en un partido en casa
function copTaquilla(cl,acta){
  if(!acta||!acta.casa) return 0;
  socAsegura(cl);
  const x=(acta.gane?1.25:1)*(1+.006*cl.humorSocios);
  return Math.round(cl.socios*COP_TAQUILLA*x);
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

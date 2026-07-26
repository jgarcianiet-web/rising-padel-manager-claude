/* ================================================================
   NO TODOS LOS PARTIDOS VALEN LO MISMO

   El juego trataba igual una primera ronda de un Continental Bronce que la
   final de una Corona: mismo cartel, misma grada, misma ficha al acabar. Y una
   carrera necesita que la final SE NOTE, o todo acaba pareciendo la misma
   semana repetida quince años.

   Aquí se calcula el PESO de un partido (0..100) a partir de lo que de verdad
   hay encima de la mesa —la categoría, la ronda, quién está enfrente y qué te
   llevas si ganas— y se traduce en tres cosas que sí se ven y se oyen:

   - Un cartel de «lo que te juegas» antes de empezar, con frases concretas y no
     con adjetivos: «primer título», «serías el número 1», «defiendes 500».
   - La grada: el ruido y la tensión escalan con el peso.
   - El cierre: ganar algo histórico no se cuenta con el mismo aviso que ganar
     un torneo cualquiera.

   La regla al tocar esto: **el peso sale de hechos comprobables del estado de
   la partida**, no de una etiqueta puesta a mano. Si un partido «parece»
   importante pero no cambia nada, no es importante.
================================================================ */

const DRAMA_TIERS=["rutina","seria","grande","historica"];
/* Umbrales del peso. Están altos a propósito: si la mitad de los partidos son
   «grandes», ninguno lo es. */
const DRAMA_CORTES=[34,52,72];
function pesoTier(p){
  const x=clamp(p|0,0,100);
  for(let i=0;i<DRAMA_CORTES.length;i++) if(x<DRAMA_CORTES[i]) return DRAMA_TIERS[i];
  return DRAMA_TIERS[3];
}
function tierNombre(k){ return t("dra_"+k+"_n"); }
function tierColor(k){
  return k==="historica"?"var(--oro)":k==="grande"?"#E06456":k==="seria"?"var(--azul)":"var(--gris)";
}

/* ---------------- lo que te juegas ---------------- */
/* Devuelve una lista de hechos: cada uno es algo que cambia si ganas o pierdes
   este partido concreto. Se pintan como frases y se suman al peso. */
function enJuego(e,cat,fase,rival){
  const L=[];
  if(!e||!cat) return L;
  const esFinal=fase===5;
  const pts=(cat.pts||[])[esFinal?0:Math.max(0,6-fase)]||0;
  // el título
  if(esFinal){
    const tit=(e.palmares||[]).length;
    L.push({k:"titulo", peso:12, txt:t("dra_ej_titulo",{cat:catNombre(cat)})});
    if(!tit) L.push({k:"primero", peso:16, txt:t("dra_ej_primero")});
    if(cat.premier) L.push({k:"elite", peso:8, txt:t("dra_ej_elite")});
  }
  // ¿te pone en lo más alto?
  if(pts>0&&typeof rkSuma==="function"){
    const tras=(e.pts|0)+pts;
    const filas=(typeof rankingFilas==="function")?rankingFilas():[];
    const lider=filas.length?filas[0]:null;
    if(lider&&!lider.yo&&tras>=(lider.pts|0)&&esFinal) L.push({k:"numero1", peso:25, txt:t("dra_ej_n1")});
    else if(esFinal&&filas.length){
      const pos=filas.findIndex(f=>f.yo)+1;
      // el mejor puesto sale del historial de temporadas cerradas, no de un campo
      const mejor=Math.min(99,...(e.hist||[]).map(h=>h.pos||99));
      if(pos>0&&pos<mejor) L.push({k:"record", peso:8, txt:t("dra_ej_record",{n:pos})});
    }
  }
  // lo que defiendes esta semana: perderlo te tira para abajo
  if(typeof rkDefiende==="function"){
    const def=rkDefiende(e,e.semana)|0;
    if(def>=200) L.push({k:"defiende", peso:10, txt:t("dra_ej_defiende",{n:def})});
  }
  // el de enfrente
  if(rival){
    if(e.nemesis&&String(e.nemesis.id)===String(rival.id)) L.push({k:"nemesis", peso:14, txt:t("dra_ej_nemesis",{n:rival.nombre})});
    const h=(e.h2h||{})[rival.id];
    if(h&&h.d>=3&&h.v===0) L.push({k:"bestia", peso:8, txt:t("dra_ej_bestia",{n:rival.nombre,d:h.d})});
  }
  // el último baile: cada partido puede ser el último
  if(e.ultimoBaile&&temporada()>=e.ultimoBaile) L.push({k:"ultimo", peso:14, txt:t("dra_ej_ultimo")});
  return L;
}
/* Peso del partido: la base sale de la categoría y la ronda; lo demás, de lo
   que hay en juego. */
function pesoPartido(e,cat,fase,rival){
  if(!e||!cat) return 0;
  const iCat=CATS.indexOf(cat);
  /* Calibrado midiendo: con la primera tabla, CUALQUIER final salía «histórica»
     —hasta la de un Continental Bronce— y la palabra dejaba de significar nada.
     Ahora una final grande es «grande», y para que sea histórica tiene que
     haber algo más encima: el número 1, la némesis o el último año. */
  let p=6+Math.max(0,iCat)*4;                         // Bronce 6 · Corona 30 · Maestros 34
  p+=[0,0,4,6,12,20][clamp(fase,0,5)]||0;             // la ronda pesa, y la final mucho
  enJuego(e,cat,fase,rival).forEach(x=>p+=x.peso);
  return Math.round(clamp(p,0,100));
}
/* Intensidad de grada 0,2..1 a partir del peso. Es lo que se le pasa a sfxGrada. */
function dramaGrada(peso){ return clamp(.25+(peso/100)*.75,.2,1); }

/* ---------------- el cartel ---------------- */
/* «Lo que te juegas», en frases concretas. Sin lista no se pinta nada: un
   partido sin nada en juego no merece cartel. */
function enJuegoHTML(e,cat,fase,rival){
  const L=enJuego(e,cat,fase,rival);
  if(!L.length) return "";
  const p=pesoPartido(e,cat,fase,rival), k=pesoTier(p), col=tierColor(k);
  return `<div class="drama" style="border-color:${col}">
    <div class="dramaHd" style="color:${col}">${tierNombre(k)}</div>
    ${L.map(x=>`<div class="dramaLn">${x.txt}</div>`).join("")}
  </div>`;
}

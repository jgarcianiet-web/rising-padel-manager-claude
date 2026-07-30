/* ================================================================
   EL PARTIDO TE CONTESTA

   La táctica ya cambiaba el partido —agresividad, a quién buscas, red y puntos
   calientes están enganchados a `resolveShot` desde hace tiempo—, pero el
   partido no te contestaba: tocabas un botón y nunca sabías si había servido.
   Y el rival era un saco: podías machacar la víbora cuarenta veces y seguía
   funcionando igual de bien la última que la primera.

   Tres cosas, y las tres son la misma idea: que lo que haces tenga respuesta.

   1. EL RIVAL TE LEE. Si un golpe pasa de un tercio de lo que juegas, al cabo
      de unos juegos empiezan a esperarlo, y ese golpe deja de rendir. Se les
      olvida si varías. Cuanto mejores son, antes te leen.

   2. EL INFORME TÁCTICO. Cada combinación táctica lleva su cuenta: cuántos
      puntos jugaste así, cuántos ganaste, cuántos winners te dio y cuánto te
      costó. En el descanso y al final se cuenta en cristiano —«subir a la red:
      7 de 12 puntos, 4 winners, 3 globos por encima»— para que la siguiente
      decisión sea informada y no una corazonada.

   3. LA IDENTIDAD DEL RIVAL, ANTES DE EMPEZAR. Sus atributos ya decidían cómo
      juegan; lo que faltaba era decírtelo y decirte qué suele funcionar contra
      eso. Un muro y unos pegadores no se juegan igual.
================================================================ */

/* ---------------- 1 · el rival te lee ---------------- */
const LEC_MIN_TIROS=16;    // antes de esto no hay patrón, hay ruido
/* Los umbrales salen de medir, no de la intuición: el golpe más repetido de un
   partido real está en el 27% para una pareja completa y llega al 31-35% para
   un muro o un especialista, porque la situación de pista ya limita lo que se
   puede jugar. Con el 32%-62% de la primera versión la lectura no saltaba
   nunca —una función muerta—; con esto distingue al variado del monotemático. */
const LEC_CUOTA=.29;       // un golpe que pasa de aquí empieza a ser un patrón
const LEC_TECHO=.40;       // y aquí ya eres monotemático
const LEC_OLVIDO=.16;      // lo que se les olvida por juego si varías
function lecPaso(nivelRival){ return clamp(.06+((nivelRival||60)-50)*.0035,.05,.20); }
/* Hasta dónde pueden leerte: no es lo mismo que un golpe sea un tercio de lo que
   juegas —eso lo hace cualquiera— que sea la mitad larga. Sin esto, la lectura
   caía sobre todo el mundo por igual y no premiaba variar, solo castigaba. */
function lecTecho(cuota){ return clamp((cuota-LEC_CUOTA)/(LEC_TECHO-LEC_CUOTA),0,1); }

function tacUsoAnota(st,shotKey){
  if(!st) return;
  if(!st.uso) st.uso={};
  st.uso[shotKey]=(st.uso[shotKey]||0)+1;
}
/* El golpe del que abusas y cuánto: {golpe, cuota, tiros}. */
function tacPatron(st){
  const uso=(st&&st.uso)||{};
  let tot=0, mejor=null, n=0;
  for(const k in uso){ tot+=uso[k]; if(uso[k]>n){ n=uso[k]; mejor=k; } }
  return {golpe:mejor, cuota:tot?n/tot:0, tiros:tot};
}
/* Se llama al cerrar cada juego. Devuelve el aviso si acaban de leerte. */
function tacLee(m,st,nivelRival){
  if(!m) return null;
  const l=m.lectura||(m.lectura={golpe:null,nivel:0});
  const p=tacPatron(st);
  if(p.tiros<LEC_MIN_TIROS) return null;
  if(p.golpe&&p.cuota>=LEC_CUOTA){
    const techo=lecTecho(p.cuota);
    if(l.golpe!==p.golpe){ l.golpe=p.golpe; l.nivel=Math.min(lecPaso(nivelRival),techo); return null; }
    const antes=l.nivel;
    l.nivel=clamp(Math.min(l.nivel+lecPaso(nivelRival),techo),0,1);
    // el aviso salta una sola vez, cuando la lectura empieza a doler de verdad
    if(antes<.45&&l.nivel>=.45) return l.golpe;
    return null;
  }
  // has variado: se les va olvidando
  l.nivel=clamp(l.nivel-LEC_OLVIDO,0,1);
  if(l.nivel<=0) l.golpe=null;
  return null;
}
/* Lo que cuesta jugar el golpe que ya te esperan. */
function tacLecturaX(shotKey){
  const l=(typeof match!=="undefined"&&match)?match.lectura:null;
  if(!l||!l.golpe||l.golpe!==shotKey||l.nivel<=0) return {win:1,err:1};
  return {win:1-.22*l.nivel, err:1+.18*l.nivel};
}
function tacLecturaEstado(){
  const l=(typeof match!=="undefined"&&match)?match.lectura:null;
  if(!l||!l.golpe||l.nivel<.2) return null;
  return {golpe:l.golpe, nivel:l.nivel, fuerte:l.nivel>=.55};
}

/* ---------------- 1b · el circuito también te lee (entre partidos) ----------------
   La lectura moría con el partido: podías jugar CINCO torneos seguidos a globo
   y cada rival te descubría de cero. Ahora el patrón de cada partido tuyo se
   guarda (`c.tacHist`, los últimos TAC_HIST), y si el mismo golpe domina en
   tres o más, el siguiente rival NO empieza de cero: sale esperándolo. Variar
   entre partidos pasa a ser táctica, no solo variar dentro de uno. */
const TAC_HIST=5;
function tacHistAnota(c,st){
  if(!c||!st) return;
  const p=tacPatron(st);
  if(!p.golpe||p.tiros<LEC_MIN_TIROS) return;
  (c.tacHist=c.tacHist||[]).push({golpe:p.golpe,cuota:Math.round(p.cuota*100)/100});
  c.tacHist=c.tacHist.slice(-TAC_HIST);
}
/* ¿Te espera ya el circuito? {golpe, n de m, nivel de salida} o null. */
function tacPreLectura(c){
  const h=(c&&c.tacHist)||[];
  if(h.length<3) return null;
  const cnt={};
  h.forEach(x=>{ if(x.cuota>=LEC_CUOTA) cnt[x.golpe]=(cnt[x.golpe]||0)+1; });
  let golpe=null,n=0;
  for(const k in cnt) if(cnt[k]>n){ n=cnt[k]; golpe=k; }
  if(!golpe||n<3) return null;
  return {golpe, n, m:h.length, nivel:.18};
}

/* ---------------- 2 · el informe táctico ---------------- */
/* La firma es la combinación de ajustes en vigor. Cambiar cualquiera abre una
   línea nueva del informe, que es justo lo que se quiere comparar. */
function tacFirma(ta){
  const x=ta||(typeof TACT!=="undefined"?TACT:{})||{};
  return [x.agres||"normal",x.diana||"repartir",x.red||"normal",x.clutch||"normal"].join("|");
}
function tacAnota(m,ganador,punto,ta){
  if(!m) return;
  const log=m.tac||(m.tac={});
  const f=tacFirma(ta);
  const L=log[f]||(log[f]={pts:0,gan:0,w:0,e:0,globos:0});
  L.pts++;
  if(ganador===0) L.gan++;
  const ev=(punto&&punto.ev)||[];
  const fin=ev[ev.length-1];
  if(fin){
    if(fin.team===0&&fin.end==="winner") L.w++;
    else if(fin.team===0&&fin.end==="porTres") L.w++;
    else if(fin.team===0&&fin.end&&fin.end!=="winner"&&fin.end!=="porTres") L.e++;
  }
  /* «Te expuso al globo»: el rival cierra el punto pasándote por arriba. Es el
     precio concreto de haber subido, y sin contarlo la decisión es a ciegas. */
  if(ganador===1&&ev.some(x=>x.team===1&&(x.shotKey==="globo"||x.shotKey==="globoRapido"))) L.globos++;
}
/* Líneas del informe, de más jugadas a menos, sin las anecdóticas. */
function tacInforme(m,min){
  const log=(m&&m.tac)||{};
  return Object.keys(log).map(f=>({firma:f,...log[f]}))
    .filter(x=>x.pts>=(min||4))
    .sort((a,b)=>b.pts-a.pts);
}
/* De la firma a palabras: solo se nombra lo que no es lo normal. */
function tacFirmaTxt(f){
  const [agres,diana,red,clutch]=String(f).split("|");
  const p=[];
  if(agres!=="normal") p.push(t("tac_ag_"+agres));
  if(diana==="debil") p.push(t("tac_al_flojo").toLowerCase());
  if(red!=="normal") p.push(t("tac_red_"+red).toLowerCase());
  if(clutch!=="normal") p.push(t("tac_cl_"+clutch).toLowerCase());
  return p.length?p.join(" · "):t("tac_inf_plan_base");
}
function tacInformeHTML(m,min){
  const filas=tacInforme(m,min);
  if(!filas.length) return `<div class="foot" style="text-align:left">${t("tac_inf_vacio")}</div>`;
  return filas.map(L=>{
    const pct=Math.round(100*L.gan/Math.max(1,L.pts));
    const col=pct>=55?"var(--verde)":pct>=45?"var(--oro)":"var(--rojo)";
    const detalle=[
      L.w?t("tac_inf_w",{n:L.w}):"",
      L.e?t("tac_inf_e",{n:L.e}):"",
      L.globos?t("tac_inf_globos",{n:L.globos}):"",
    ].filter(Boolean).join(" · ");
    return `<div class="brief"><b>${tacFirmaTxt(L.firma)}</b> — <span style="color:${col}">${t("tac_inf_pts",{gan:L.gan,pts:L.pts,pct})}</span>${detalle?`<div class="d" style="margin:2px 0 0">${detalle}</div>`:""}</div>`;
  }).join("");
}

/* ---------------- 3 · la identidad del rival ---------------- */
/* Sale de sus atributos, que son los que ya deciden cómo juegan: esto no añade
   una etiqueta encima del motor, la lee. */
const IDENTIDADES={
  muro:     { attrs:["fondo","pared"] },
  red:      { attrs:["volea","bandeja"] },
  pegada:   { attrs:["remate","vibora"] },
  globo:    { attrs:["globo","chiquita"] },
  finos:    { attrs:["dejada","chiquita"] },
};
const IDENT_MARGEN=6;   // cuánto tiene que destacar para tener nombre propio
function identidadPareja(team){
  const jug=(team&&team.jug)||[];
  if(jug.length<2) return "completos";
  const med=k=>((jug[0].attrs[k]||60)+(jug[1].attrs[k]||60))/2;
  const global=ATTR_KEYS.reduce((s,k)=>s+med(k),0)/ATTR_KEYS.length;
  let mejor="completos", dif=IDENT_MARGEN;
  for(const id in IDENTIDADES){
    const a=IDENTIDADES[id].attrs;
    const v=a.reduce((s,k)=>s+med(k),0)/a.length;
    if(v-global>dif){ dif=v-global; mejor=id; }
  }
  return mejor;
}
function identNombre(id){ return t("iden_"+id+"_n"); }
function identDesc(id){ return t("iden_"+id+"_d"); }
function identContra(id){ return t("iden_"+id+"_c"); }

/* ================================================================
   GUÍA DE LAS PRIMERAS SEMANAS

   El juego tenía un tutorial de doce fichas que se LEEN y se cierran. Eso no
   enseña a jugar a un juego de gestión: quien abandona lo hace en los primeros
   diez minutos, y no porque el texto fuera malo, sino porque nadie le dijo qué
   tenía que hacer AHORA.

   Esto es lo contrario: una tira fija abajo que pide UNA cosa cada vez, señala
   dónde está, y se pasa sola al paso siguiente cuando la haces. No bloquea la
   interfaz —puedes ignorarla y seguir a lo tuyo— y se puede cerrar para
   siempre con un botón.

   Los pasos se comprueban sobre el ESTADO DEL JUEGO, no sobre el DOM: da igual
   si llegas al entrenamiento pulsando la pestaña o desde otro sitio, lo que
   importa es que entrenaste. Así la guía no se rompe al tocar la interfaz.
================================================================ */

/* Cada paso: qué se pide, dónde mirar (id de elemento a resaltar, opcional) y
   cómo se sabe que está hecho. `hecho` recibe la entidad protagonista.

   `hito:true` marca los pasos que son un hecho consumado de la partida —
   entrenaste, jugaste, pasó la semana— y no un estado de la interfaz. Solo
   esos sirven para saltar hacia adelante: «estás en la pestaña Semana» es
   cierto nada más empezar y no significa que hayas hecho nada. */
const GUIA_CARRERA=[
  {id:"ficha",   foco:"tabJugador", hecho:()=>tabActiva==="jugador"},
  {id:"entreno", foco:"tabEntreno", hecho:()=>tabActiva==="entreno"},
  {id:"golpe",   foco:"btnsEntreno",hecho:(c)=>!!c.planJug&&c.planJug!=="auto"},
  {id:"semana",  foco:"tabSemana",  hecho:()=>tabActiva==="semana"},
  /* El botón de entrenar vive en la pestaña Semana, no en la de Entreno: allí
     se elige EN QUÉ se entrena, aquí se gasta el día. */
  {id:"entrenar",foco:"btnEntrenarHoy",hito:true, hecho:(c)=>(c._sesEntreno|0)>=1},
  {id:"inscribir",foco:null,        hito:true, hecho:()=>!!torneo},
  /* El informe se lee cuando se usa: el paso se da por hecho cuando el jugador
     toca el plan (con el botón del ojeador o a mano). Mirar el plan resultante
     no vale: dejarlo en «normal» también es una decisión. */
  {id:"ojeador", foco:"scoutCaja", hecho:(c)=>!!(c.tactica&&c.tactica._plan)},
  {id:"jugar",   foco:null,         hito:true, hecho:(c)=>(((c.vd||{}).v|0)+((c.vd||{}).d|0))>=1},
  {id:"avanzar", foco:null,         hito:true, hecho:(c)=>(c.semana|0)>=2},
  {id:"fin",     foco:null,         hecho:()=>false},
];
const GUIA_CLUB=[
  {id:"plantilla",foco:"cmTabPlantilla",hecho:()=>cmTab==="plantilla"},
  /* La pareja A viene puesta de fábrica; la B no, y es la que enseña que el
     club puede competir en dos categorías la misma semana. Con menos de cuatro
     jugadores no hay con quién formarla: el paso no aplica y se salta. */
  {id:"alinear",  foco:"cmAlin",      hito:true,
   salta:(cl)=>((cl.plantilla||[]).length<4),
   hecho:(cl)=>!!(cl.alinB&&cl.alinB.length===2)},
  {id:"panel",    foco:"cmTabClub",   hecho:()=>cmTab==="club"},
  {id:"semana",   foco:"cmTabSemana", hecho:()=>cmTab==="semana"},
  {id:"jugar",    foco:null,          hito:true, hecho:(cl)=>(cl.semana|0)>=2},
  {id:"fin",      foco:null,          hecho:()=>false},
];

let _guiaPaso=0, _guiaModo=null;

function guiaPasos(){ return _guiaModo==="club"?GUIA_CLUB:GUIA_CARRERA; }
function guiaClave(modo){ return "rpm_guia_"+(modo||"carrera"); }
/* El guardado es un número: el paso por el que va, o -1 si se cerró para
   siempre. Así la guía sobrevive a una recarga, que es justo lo que hace
   alguien que está probando el juego por primera vez. */
function guiaLee(modo){
  try{ const v=localStorage.getItem(guiaClave(modo)); return v===null?0:(v==="1"?-1:parseInt(v,10)|0); }
  catch(e){ return 0; }
}
function guiaEscribe(modo,v){ try{ localStorage.setItem(guiaClave(modo),String(v)); }catch(e){} }
function guiaTerminada(modo){ return guiaLee(modo)<0; }
/* Arranca (o retoma) la guía. Se llama al crear la partida y al entrar en una
   guardada: si ya se cerró, no vuelve a aparecer. */
function guiaEmpieza(modo){
  if(guiaTerminada(modo)) return;
  _guiaModo=modo;
  const pasos=guiaPasos();
  _guiaPaso=Math.max(0,Math.min(guiaLee(modo),pasos.length-1));
  guiaComprueba();
}
function guiaCierra(){
  guiaEscribe(_guiaModo,-1);
  _guiaModo=null;
  const el=document.getElementById("guia"); if(el) el.classList.add("oculto");
  guiaQuitaFoco();
  guiaAjustaHueco(el);
}
/* Resalta el elemento del paso actual con un aro. Se hace por clase para no
   pelearse con los estilos en línea que el juego escribe por todas partes. */
function guiaQuitaFoco(){
  document.querySelectorAll(".guiaFoco").forEach(el=>el.classList.remove("guiaFoco"));
}
function guiaPonFoco(id){
  guiaQuitaFoco();
  if(!id) return;
  const el=document.getElementById(id);
  if(el&&el.classList) el.classList.add("guiaFoco");
}

/* Comprueba si el paso actual ya está hecho y avanza los que hagan falta.
   Se llama después de cada repintado y de cada clic: no hay temporizadores. */
function guiaComprueba(){
  if(!_guiaModo||!G) return;
  const e=ent(); if(!e) return;
  const pasos=guiaPasos(), antes=_guiaPaso;
  // un paso que no aplica a esta partida cuenta como hecho: no se pide lo imposible
  const hecho=i=>{ try{ return (pasos[i].salta&&pasos[i].salta(e))||!!pasos[i].hecho(e); }catch(err){ return false; } };
  while(_guiaPaso<pasos.length-1){
    if(hecho(_guiaPaso)){ _guiaPaso++; continue; }
    /* Nadie juega en el orden que uno escribe. Si un HITO posterior ya está
       cumplido, la guía salta hasta ahí en vez de quedarse pidiendo algo que
       el jugador se saltó (o que ya no puede hacer). */
    let salto=-1;
    for(let i=pasos.length-2;i>_guiaPaso;i--){ if(pasos[i].hito&&hecho(i)){ salto=i; break; } }
    if(salto<0) break;
    _guiaPaso=salto+1;
  }
  const movido=_guiaPaso!==antes;
  if(movido) guiaEscribe(_guiaModo,_guiaPaso);
  guiaPinta(movido);
}

/* La guía y los avisos emergentes viven los dos abajo y en el centro: sin esto
   el aviso tapaba justo lo que hay que leer. La altura real se publica en una
   variable CSS porque cambia con el tamaño de letra y con el texto de cada
   paso, que no siempre cabe en una línea. */
function guiaAjustaHueco(caja){
  const b=document.body; if(!b||!b.classList) return;
  if(!_guiaModo){ b.classList.remove("con-guia"); return; }
  b.classList.add("con-guia");
  const alto=(caja&&caja.offsetHeight)|0;
  if(alto&&document.documentElement&&document.documentElement.style)
    document.documentElement.style.setProperty("--guiaAlto",alto+"px");
}
function guiaPinta(conAviso){
  const caja=document.getElementById("guia"); if(!caja) return;
  if(!_guiaModo){ caja.classList.add("oculto"); guiaAjustaHueco(caja); return; }
  const pasos=guiaPasos(), p=pasos[_guiaPaso];
  const ultimo=_guiaPaso===pasos.length-1;
  caja.classList.remove("oculto");
  caja.innerHTML=`<div class="guiaCaja">
    <div class="guiaNum">${ultimo?"✓":(_guiaPaso+1)+"/"+(pasos.length-1)}</div>
    <div class="guiaTxt">
      <b>${t("guia_"+_guiaModo+"_"+p.id+"_t")}</b>
      <div>${t("guia_"+_guiaModo+"_"+p.id+"_x")}</div>
    </div>
    <button class="guiaX" id="guiaCerrar" title="${t("guia_cerrar")}">${ultimo?t("guia_listo"):"✕"}</button>
  </div>`;
  const b=document.getElementById("guiaCerrar"); if(b) b.onclick=guiaCierra;
  guiaPonFoco(p.foco);
  guiaAjustaHueco(caja);
  if(conAviso&&!ultimo&&typeof sfxAviso==="function"){ try{ sfxAviso("ok"); }catch(e){} }
}

/* ================================================================
   LA PAREJA COMO COPROTAGONISTA

   Hasta aquí la pareja era un segundo bloque de atributos con una barra de
   moral. En pádel la pareja es el juego: quién cubre qué, quién decide la bola
   caliente, cuántos años lleváis aguantándoos. Este fichero le da tres cosas
   que la convierten en personaje y no en recurso.

   1. UN PLAN CONJUNTO que se domina con el tiempo. Elegir «dominio de red» no
      hace nada el primer día: los automatismos tardan semanas. Y cambiar de
      compañero se lleva casi todo por delante, que es exactamente lo que pasa
      cuando dos que se entienden dejan de jugar juntos.

   2. SEIS EJES en vez de una barra. No es lo mismo que tu pareja no crea en tu
      juego que que esté harta de compartir aeropuertos contigo: el primero se
      arregla ganando, el segundo no.

   3. CONVERSACIONES QUE EMPIEZAS TÚ. Los dilemas llegan del sistema; esto no.
      Pedir compromiso, negociar el calendario, defenderlo en público o
      prepararle una salida amistosa son decisiones tuyas, con su precio.
================================================================ */

/* ---------------- 1 · el plan de la pareja ---------------- */
/* Los modificadores son los mismos que entienden los eventos de circuito, y se
   aplican ESCALADOS POR EL DOMINIO: al 20% casi no se nota, al 100% define
   cómo juega la pareja. Por eso cambiar de plan es una inversión, no un botón. */
const PLANES_PAREJA = {
  libre: { mods:{} },
  muro: { mods:{ "golpe:fondo":{err:.86}, "golpe:pared":{err:.84}, "golpe:globo":{win:1.20},
                 "golpe:remate":{win:.92} } },
  /* El castigo de subir siempre va en los golpes de atrás, no en un `golpeTodo`:
     un +3% de error global pesa más que todo lo que gana arriba —la mayoría de
     los golpes de un punto no son voleas— y convertía el plan en una trampa. */
  red: { mods:{ "golpe:volea":{win:1.40}, "golpe:bandeja":{win:1.26}, "golpe:remate":{win:1.22},
                "golpe:fondo":{err:1.14}, "golpe:pared":{err:1.12} } },
  /* Los tres de abajo hubo que rehacerlos al arreglar el motor, y es el mejor
     ejemplo de por qué un número afinado se queda mentira cuando cambia lo que
     medía. Con el motor viejo el 85% de los puntos moría en error, así que
     cualquier recorte de error valía oro y cualquier bonificación de golpe daba
     igual; hoy es el 69%/31% y el reparto se ha dado la vuelta. Medidos otra
     vez, estos tres valían +1, +1 y **−4**: dos eran ruido y el tercero, un
     castigo por elegirlo. */
  desgaste: { mods:{ "golpe:bandeja":{win:1.24,err:.88}, "golpe:globo":{win:1.16},
                     "golpe:remate":{win:.90}, golpeTodo:{err:.985} } },
  // la dejada ya no cierra puntos, así que este plan se apoya en la víbora
  reves: { mods:{ "golpe:vibora":{win:1.34}, "golpe:chiquita":{win:1.24}, "golpe:dejada":{win:1.12} } },
  /* Cuidado con este: recortar el error de TODOS los golpes es la palanca más
     fuerte del motor, y por eso `tests/casos.js` no deja bajar de .95. Pero el
     castigo en winners tampoco puede pasarse: a win .92 el plan salía −4 frente
     a no tener plan, o sea que la opción «protegerse» era una trampa. */
  escudo: { mods:{ golpeTodo:{err:.95, win:.96} }, protege:true },
};
const PLAN_DOM_MAX=100;
/* Cuánto se pierde al cambiar de compañero. No es cero: algo de lo aprendido
   te lo llevas puesto tú, pero los automatismos eran de los dos. */
const PLAN_DOM_RUPTURA=.18;

function planPareja(c){ const k=c&&c.plan&&PLANES_PAREJA[c.plan.id]?c.plan.id:"libre"; return k; }
function planDominio(c){ return clamp((c&&c.plan&&c.plan.dominio)|0,0,PLAN_DOM_MAX); }
function planNombre(k){ return t("plan_"+k+"_n"); }
function planDesc(k){ return t("plan_"+k+"_d"); }
function planComo(k){ return t("plan_"+k+"_c"); }
/* Asegura la estructura en partidas antiguas. */
function planAsegura(c){
  if(!c) return null;
  if(!c.plan||!PLANES_PAREJA[c.plan.id]) c.plan={id:"libre",dominio:0};
  return c.plan;
}
function planElige(c,id){
  if(!PLANES_PAREJA[id]) return false;
  planAsegura(c);
  if(c.plan.id===id) return false;
  /* EL COMPAÑERO RECUERDA EL PLAN. Elegir un plan es un compromiso de meses
     (el dominio empieza en cero y se entrena); cambiarlo a las pocas semanas
     tira ese trabajo y el compañero lo dice, porque el trabajo era de los dos.
     No es un castigo grande —es una frase y un roce en la deportiva—, pero es
     la diferencia entre un menú y una persona. */
  const desde=c._planDesdeSem|0, edad=(c.semana|0)-desde;
  if(c.plan.id!=="libre"&&desde&&edad<PLAN_PACIENCIA&&c.compi){
    relMueve(c,"deportiva",-3);
    if(typeof avisa==="function") avisa(t("prom_plan_cambiado",{n:nomCompi(c),sem:edad}));
  }
  c.plan={id,dominio:0};      // el plan nuevo empieza de cero: hay que entrenarlo
  c._planDesdeSem=c.semana|0;
  return true;
}
const PLAN_PACIENCIA=10;   // semanas que el compañero espera antes de darse por vencido con un plan
/* Crece con el trabajo semanal y con los partidos jugados juntos. */
function planEntrena(c,cuanto){
  planAsegura(c);
  if(c.plan.id==="libre") return 0;
  const antes=c.plan.dominio|0;
  c.plan.dominio=clamp(antes+cuanto,0,PLAN_DOM_MAX);
  return c.plan.dominio-antes;
}
/* Al romper la pareja se van los automatismos. */
function planRompe(c){
  planAsegura(c);
  c.plan.dominio=Math.round(c.plan.dominio*PLAN_DOM_RUPTURA);
}
/* Multiplicadores del golpe `k` según el plan y su dominio. Se combinan con los
   de los eventos en resolveShot. */
function pjGolpe(k){
  const c=(typeof G!=="undefined"&&G&&G.modo==="carrera")?G.carrera:null;
  if(!c||!c.plan) return {win:1,err:1};
  const P=PLANES_PAREJA[c.plan.id]; if(!P||!P.mods) return {win:1,err:1};
  const d=planDominio(c)/PLAN_DOM_MAX;
  if(d<=0) return {win:1,err:1};
  const mezcla=(m)=>({win:1+((m.win||1)-1)*d, err:1+((m.err||1)-1)*d});
  let win=1,err=1;
  if(P.mods.golpeTodo){ const x=mezcla(P.mods.golpeTodo); win*=x.win; err*=x.err; }
  const propio=P.mods["golpe:"+k];
  if(propio){ const x=mezcla(propio); win*=x.win; err*=x.err; }
  return {win,err};
}

/* ---------------- 2 · los seis ejes ---------------- */
/* `compiMoral` sigue existiendo y sigue mandando en la ruptura: todo el código
   que ya la usaba funciona igual. Los ejes explican POR QUÉ está como está, y
   cada uno se mueve por sus motivos y se arregla de otra manera. */
const EJES = ["deportiva","personal","ambicion","protagonismo","lealtad","convivencia"];
const EJE_BASE = 65;
function relAsegura(c){
  if(!c) return null;
  if(!c.rel){ c.rel={}; EJES.forEach(k=>c.rel[k]=EJE_BASE); }
  EJES.forEach(k=>{ if(typeof c.rel[k]!=="number") c.rel[k]=EJE_BASE; });
  return c.rel;
}
function relNombre(k){ return t("eje_"+k+"_n"); }
function relDesc(k){ return t("eje_"+k+"_d"); }
function relLee(c,k){ relAsegura(c); return clamp(c.rel[k]|0,0,100); }
function relMueve(c,k,n){
  relAsegura(c);
  if(EJES.indexOf(k)<0) return 0;
  const antes=c.rel[k];
  c.rel[k]=clamp(antes+n,0,100);
  return c.rel[k]-antes;
}
function relMedia(c){ relAsegura(c); return Math.round(EJES.reduce((a,k)=>a+c.rel[k],0)/EJES.length); }
/* El eje que peor está: es el que hay que atender y el que dispara la crisis. */
function relPeor(c){
  relAsegura(c);
  return EJES.reduce((p,k)=>c.rel[k]<c.rel[p]?k:p,EJES[0]);
}
function relEstado(v){ return v>=75?"bien":v>=55?"normal":v>=35?"tocado":"roto"; }
/* Reset al cambiar de pareja: se empieza de cero con alguien nuevo. */
function relReinicia(c){
  c.rel=null; relAsegura(c);
  relMueve(c,"personal",-10);       // todavía no os conocéis
  relMueve(c,"convivencia",12);     // pero tampoco os habéis cansado
}
/* Empieza una etapa con otra persona: se van los automatismos, la relación
   arranca de cero y las conversaciones que ya tuviste no cuentan. Lo llaman los
   tres sitios donde cambia el compañero (fichaje, ruptura y retirada). */
function parejaNueva(c){
  if(!c) return;
  planRompe(c); relReinicia(c);
  c._parejaDesdeSem=c.semana|0; c.charlas={};
}
/* La relación deja huella en la pista: creer en tu juego se nota, la
   convivencia gastada también. Se suma a lo que ya hacía la moral. */
function relAjusteConf(c){
  if(!c||!c.rel) return 0;
  return Math.round((relLee(c,"deportiva")-EJE_BASE)/9) + Math.round((relLee(c,"personal")-EJE_BASE)/14);
}

/* ---------------- 3 · las conversaciones ---------------- */
/* Cada una cuesta algo (energía, dinero o exponerte), toca ejes concretos y
   tiene enfriamiento. La gracia es que no siempre salen bien: `riesgo` es la
   probabilidad de que se te vuelva en contra, y depende del eje que peor esté. */
const CHARLAS = [
  { id:"compromiso", enf:26, energia:4,
    ef:{ambicion:12,lealtad:10,personal:4}, mal:{ambicion:-8,lealtad:-6}, riesgo:.2,
    cond:c=>relLee(c,"lealtad")<85 },
  { id:"calendario", enf:20, energia:3,
    ef:{convivencia:14,ambicion:-6,personal:5}, mal:{ambicion:-10}, riesgo:.15,
    cond:c=>relLee(c,"convivencia")<80 },
  { id:"tactica", enf:16, energia:5,
    ef:{deportiva:12,protagonismo:5}, mal:{deportiva:-8,personal:-4}, riesgo:.25,
    cond:c=>relLee(c,"deportiva")<85 },
  { id:"critica", enf:22, energia:2,
    ef:{deportiva:9,protagonismo:-8,personal:-5}, mal:{personal:-14,deportiva:-6}, riesgo:.42,
    cond:c=>true },
  { id:"defender", enf:18, fans:1,
    ef:{personal:14,lealtad:10}, mal:{}, riesgo:.05,
    cond:c=>true },
  { id:"psicologo", enf:24, dinero:900,
    ef:{personal:8,deportiva:8,convivencia:6}, mal:{personal:-6}, riesgo:.18,
    cond:c=>relMedia(c)<70 },
  { id:"bolas", enf:20, energia:2,
    ef:{protagonismo:16,deportiva:-4}, mal:{protagonismo:-6,personal:-6}, riesgo:.22,
    cond:c=>relLee(c,"protagonismo")<80 },
  { id:"salida", enf:52, energia:6,
    ef:{lealtad:18,personal:10,ambicion:-10}, mal:{lealtad:-10}, riesgo:.12,
    cond:c=>relMedia(c)<55 },
];
function _charlaPorId(id){ return CHARLAS.find(x=>x.id===id); }
function charlaNombre(id){ return t("chr_"+id+"_n"); }
function charlaDesc(id){ return t("chr_"+id+"_d"); }
function charlaEfecto(id){ return t("chr_"+id+"_e"); }
/* ¿Se puede tener esta conversación ahora? Mira enfriamiento, condición y precio. */
function charlaDisponible(c,id){
  const d=_charlaPorId(id); if(!d||!c||!c.compi) return false;
  const ult=(c.charlas||{})[id];
  if(ult!=null&&(c.semana|0)-ult<d.enf) return false;
  if(d.dinero&&(c.dinero|0)<d.dinero) return false;
  if(d.energia&&(c.energia|0)<d.energia+8) return false;
  try{ return d.cond?d.cond(c):true; }catch(e){ return false; }
}
function charlaEspera(c,id){
  const d=_charlaPorId(id); if(!d) return 0;
  const ult=(c.charlas||{})[id];
  return ult==null?0:Math.max(0,d.enf-((c.semana|0)-ult));
}
/* Tiene la conversación. Devuelve {ok, deltas} para que la UI lo cuente. */
function charlaHabla(c,id,azar){
  const d=_charlaPorId(id);
  if(!d||!charlaDisponible(c,id)) return null;
  const r=azar||rnd;
  (c.charlas=c.charlas||{})[id]=c.semana|0;
  if(d.energia) c.energia=clamp((c.energia|0)-d.energia,0,100);
  if(d.dinero) c.dinero=(c.dinero|0)-d.dinero;
  /* El riesgo sube cuando la relación ya está mal: hablar con alguien que no te
     escucha es más fácil que salga peor. */
  const peor=relLee(c,relPeor(c));
  const riesgo=clamp(d.riesgo*(peor<40?1.6:peor<60?1.2:1),0,.85);
  const sale=r()>=riesgo;
  const tabla=sale?d.ef:d.mal;
  const deltas={};
  Object.keys(tabla||{}).forEach(k=>{ deltas[k]=relMueve(c,k,tabla[k]); });
  // la moral general se mueve con la media de lo que haya pasado
  const suma=Object.values(deltas).reduce((a,x)=>a+x,0);
  c.compiMoral=clamp((c.compiMoral==null?65:c.compiMoral)+Math.round(suma/3),5,95);
  /* Dos charlas no terminan al cerrar el modal: dejan una PROMESA con plazo.
     Hablar del calendario es prometer levantar el pie; pedir compromiso es
     prometer ir a por un torneo grande. Si la conversación salió mal no hay
     promesa: no os habéis entendido. */
  if(sale&&id==="calendario") promAnota(c,"descanso");
  /* La promesa del torneo grande solo se hace si es POSIBLE cumplirla: fuera
     del corte de los premier (top 56), prometerla era firmar su ruptura cada
     ocho semanas —medido: −9 de ambición recurrentes que hundían el eje a cero
     hiciera lo que hiciera el jugador—. Fuera del corte, la charla sigue
     moviendo los ejes; el compromiso concreto llegará cuando se pueda. */
  if(sale&&id==="compromiso"&&typeof miPuesto==="function"&&miPuesto()<=56) promAnota(c,"grande");
  return {ok:sale,deltas};
}

/* ---------------- lo que mueve los ejes solo ---------------- */
/* Se llama al cerrar la semana. Cada eje se desgasta o se recupera por sus
   propios motivos, que es lo que hace que no sean una sola barra. */
function relSemana(c){
  if(!c||!c.compi) return;
  relAsegura(c);
  // convivencia: viajar juntos cansa; las semanas en casa la recuperan
  if(c._jugoTorneo) relMueve(c,"convivencia",-2);
  else relMueve(c,"convivencia",+3);
  // deportiva: sigue a los resultados recientes
  if((c.rachaAct||0)>=2) relMueve(c,"deportiva",+2);
  else if((c.rachaAct||0)===0&&c._jugoTorneo) relMueve(c,"deportiva",-2);
  // ambición: si el calendario es flojo para lo que da la pareja, se impacienta…
  if(!c._jugoTorneo) relMueve(c,"ambicion",-1);
  // …y jugar donde duele la alimenta. Sin esto la ambición solo podía bajar y
  // la queja del compañero era crónica e irresoluble: 58 veces la misma frase
  // en tres temporadas, medido. Un eje sin camino de vuelta no es un eje, es
  // un contador de culpa.
  /* OJO al fuera-por-uno: el cierre incrementa `c.semana` ANTES de llegar
     aquí, así que la semana del premier es la ANTERIOR a la actual. Con `===`
     esto no se cumplía jamás y la ambición seguía sin camino de vuelta. */
  if(c._jugoTorneo&&(c.semana|0)-(c._ultPremierSem|0)<=1) relMueve(c,"ambicion",+3);
  // lealtad: se gana con el tiempo juntos, despacio
  if(((c.semana|0)-(c._parejaDesdeSem||0))%8===0) relMueve(c,"lealtad",+1);
  // el plan compartido se afianza jugando; el entrenador de pizarra acelera
  // los automatismos, que es exactamente lo que vende
  if(c._jugoTorneo) planEntrena(c,(typeof staffPerfil==="function"&&staffPerfil("entrenador")==="pizarra")?3:2);
}

/* ================================================================
   PROMESAS: el compañero recuerda lo que le dijiste.
   Una conversación que solo mueve barras se olvida; una que deja un
   compromiso con plazo, no. Cada promesa nace de una decisión concreta
   (una charla, hoy), tiene un plazo en semanas y una comprobación contra el
   ESTADO de la partida —no contra lo que digas, contra lo que hagas—. Al
   resolverse, el compañero lo dice con su nombre y la relación se mueve.
   Se comprueban en el cierre semanal, ANTES de apagar `_jugoTorneo`, como
   todo lo que distingue una semana de competición de una semana en casa.
================================================================ */
const PROMESAS={
  /* de la charla «calendario»: prometes levantar el pie — al menos una semana
     sin competir dentro del plazo */
  descanso:{ plazo:4,
    cumple:c=>!c._jugoTorneo,
    ef:{convivencia:5,personal:3}, mal:{convivencia:-8,lealtad:-5} },
  /* de la charla «compromiso»: prometes ir a por un torneo grande — entrar en
     un premier dentro del plazo */
  grande:{ plazo:8,
    cumple:c=>(c._ultPremierSem|0)>=(c._promGrandeDesde|0),
    ef:{ambicion:6,deportiva:3}, mal:{ambicion:-9,personal:-4} },
};
function promAnota(c,id){
  if(!c||!PROMESAS[id]) return false;
  c.promesas=c.promesas||[];
  if(c.promesas.some(x=>x.id===id)) return false;   // una promesa viva por tipo
  c.promesas.push({id,sem:c.semana|0});
  if(id==="grande") c._promGrandeDesde=c.semana|0;
  return true;
}
function promSemana(c){
  if(!c||!c.promesas||!c.promesas.length||!c.compi) return;
  const quedan=[];
  c.promesas.forEach(pr=>{
    const d=PROMESAS[pr.id]; if(!d){ return; }
    let fin=null;
    try{ if(d.cumple(c)) fin="ok"; }catch(e){}
    if(!fin&&(c.semana|0)-(pr.sem|0)>=d.plazo) fin="rota";
    if(!fin){ quedan.push(pr); return; }
    const tabla=fin==="ok"?d.ef:d.mal;
    Object.keys(tabla).forEach(k=>relMueve(c,k,tabla[k]));
    c.compiMoral=clamp((c.compiMoral==null?65:c.compiMoral)+(fin==="ok"?3:-5),5,95);
    if(typeof avisa==="function")
      avisa(t("prom_"+pr.id+"_"+(fin==="ok"?"ok":"rota"),{n:nomCompi(c),sem:(c.semana|0)-(pr.sem|0)}),fin==="ok"?"ok":"bad");
  });
  c.promesas=quedan;
}

/* ================================================================
   LA VOZ DEL COMPAÑERO: comenta lo que está pasando DE VERDAD.
   Una frase como mucho, con enfriamiento, elegida por prioridad sobre el
   estado real: jugar tocado, el eje que se está rompiendo, la mala racha, el
   torneo grande que viene con el depósito vacío (y ahí lo que dice depende de
   su ambición: la misma semana produce dos personas distintas), o la racha
   buena. Sale de `rnd()`: es visible, pero es la MISMA voz en la misma
   partida con la misma semilla.
================================================================ */
const CC_ENFRIA=3;     // semanas entre comentarios, sea cual sea el tema
const CC_REPITE=12;    // y las que tarda en volver sobre EL MISMO tema
function compiComenta(c){
  if(!c||!c.compi) return null;
  if((c.semana|0)-(c._ccSem|0)<CC_ENFRIA) return null;
  /* Doble enfriamiento: uno global (que no hable cada semana) y uno POR TEMA
     (que no repita la misma queja). Sin el segundo, un eje que se queda bajo
     producía la misma frase cada tres semanas para siempre —58 veces en tres
     temporadas, medido— y una frase repetida ya no es una persona, es un
     tablón de avisos. */
  c._ccVisto=c._ccVisto||{};
  const fresco=k=>(c.semana|0)-(c._ccVisto[k]|0)>=CC_REPITE;
  const linea=(clave,datos,eje,delta,tema)=>{
    c._ccSem=c.semana|0;
    c._ccVisto[tema||clave]=c.semana|0;
    if(eje) relMueve(c,eje,delta||0);
    const msg="💬 "+nomCompi(c)+": "+t(clave,datos||{});
    if(typeof avisa==="function") avisa(msg);
    return clave;
  };
  // 1 · jugar tocado: si compites con secuelas, te lo dice a la cara
  if(c.merma&&c._jugoTorneo&&fresco("cc_infiltrado")) return linea("cc_infiltrado",{});
  // 2 · el eje que se está rompiendo, con su nombre (y sin repetirse: cada eje es un tema)
  const peor=relPeor(c);
  if(relLee(c,peor)<35&&fresco("eje:"+peor)&&rnd()<.6)
    return linea("cc_eje",{eje:relNombre(peor).toLowerCase()},null,0,"eje:"+peor);
  // 3 · tres derrotas seguidas
  const r=(c.racha||[]);
  if(r.length>=3&&r.slice(-3).every(x=>x==="D")&&fresco("cc_derrotas")) return linea("cc_derrotas",{});
  // 4 · torneo grande a la vista: la misma semana, dos personas distintas
  const sig=(typeof slotSemana==="function")?slotSemana((semanaTemp()%SEMANAS_TEMP)+1):null;
  if(sig&&sig.premier!=null&&sig.premier>=5&&(c.energia|0)<45&&fresco("cc_grande")&&rnd()<.7){
    const cat=(typeof catNombre==="function")?catNombre(sig.premier):"";
    return relLee(c,"ambicion")>=60
      ? linea("cc_grande_juega",{torneo:cat},"ambicion",1,"cc_grande")
      : linea("cc_grande_descansa",{torneo:cat},"convivencia",1,"cc_grande");
  }
  // 5 · la racha buena también se comenta
  if((c.rachaAct|0)>=4&&fresco("cc_racha")&&rnd()<.5) return linea("cc_racha",{n:c.rachaAct|0});
  return null;
}

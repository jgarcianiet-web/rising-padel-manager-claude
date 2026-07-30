/* ================================================================
   EVENTOS DE CIRCUITO

   Los dilemas enriquecen la ficción; esto enriquece el bucle. Una carrera de
   quince temporadas no se sostiene con textos distintos: necesita semanas que
   cambien las reglas, para que la temporada 7 no se juegue igual que la 3.

   La regla que ordena todo el fichero: **un evento que no cambia una decisión
   es una noticia, no un evento**. Cada uno de los que hay aquí toca algo que el
   jugador tiene en la mano —qué golpe le sale, cuánto cuesta viajar, con quién
   juega, cuánta energía recupera, cuántos puntos reparte el torneo— y por eso
   `tests/casos.js` exige que todos declaren efecto.

   Cómo funciona
   -------------
   Un evento activo vive en `e.eventos` con la semana en que empieza y en la que
   acaba. Todo lo que la simulación necesita saber se resume en una BOLSA de
   modificadores que se recalcula cuando la lista cambia (`_evBolsa`), porque
   `resolveShot` se llama decenas de veces por punto y no puede recorrer una
   lista de eventos cada vez.

   Alcances, de más corto a más largo:
     semana     · una semana suelta
     torneo     · lo que dure el torneo de esa semana
     racha      · tres a seis semanas
     temporada  · una temporada entera, cambia una regla del circuito
     era        · varias temporadas, cambia el circuito por dentro
     propio     · te apunta a ti: la némesis, la expareja, el viejo entrenador
================================================================ */

const EV_ALCANCES = ["semana", "torneo", "racha", "temporada", "era", "propio"];

/* Los modificadores que entiende el juego. Añadir uno nuevo obliga a
   engancharlo donde toque; si no, el evento sería decorado.

   golpe:<k>  {win,err} multiplicadores de un golpe concreto
   golpeTodo  {win,err} para todos
   viaje      multiplicador del coste de viaje
   energia    suma a la recuperación semanal
   energiaTope tope de energía mientras dure
   lesion     multiplicador del riesgo de lesión
   ptsX       multiplicador de los puntos de ranking del torneo
   quimica    suma a la química con tu pareja
   confTope   tope de confianza
   Banderas: suplente, oro, nemesis, sinContinental                        */

const EVENTOS = [
  /* ---------- una semana ---------- */
  { id:"humedad", alcance:"semana", dur:1, peso:1.4,
    mods:{ "golpe:globo":{win:1.18}, "golpe:fondo":{err:.88}, "golpe:remate":{win:.82}, "golpe:vibora":{win:.85} } },

  { id:"vuelo", alcance:"semana", dur:1, peso:1.1,
    cond:c=>(c.dinero||0)>300,
    mods:{ viaje:2, energia:-16 } },

  { id:"gripe", alcance:"semana", dur:1, peso:1,
    mods:{ energiaTope:58, lesion:1.4 } },

  { id:"compi_tocado", alcance:"semana", dur:1, peso:1.2,
    cond:c=>!!c.compi,
    mods:{ quimica:-22, "golpe:volea":{win:.9} } },

  /* ---------- un torneo ---------- */
  { id:"suplente", alcance:"torneo", dur:1, peso:.9,
    cond:c=>!!c.compi,
    flags:["suplente"] },

  { id:"hostil", alcance:"torneo", dur:1, peso:1.1,
    cond:c=>(c.fans||0)>=800,
    mods:{ confTope:52 }, fansX:2 },

  { id:"pelota", alcance:"torneo", dur:1, peso:1.2,
    mods:{ "golpe:remate":{win:1.2}, "golpe:vibora":{win:1.15}, "golpe:globo":{win:.82}, "golpe:dejada":{err:1.25} } },

  { id:"altitud", alcance:"torneo", dur:1, peso:1,
    mods:{ golpeTodo:{win:1.14,err:1.16} } },

  /* ---------- varias semanas ---------- */
  { id:"crisis", alcance:"racha", dur:4, peso:1.3,
    cond:c=>((c.vd||{}).d||0)>=5 && (c.rachaAct||0)===0,
    mods:{ confTope:46 } },

  { id:"comprimido", alcance:"racha", dur:3, peso:1.2,
    mods:{ energia:-7 } },

  { id:"gira", alcance:"racha", dur:5, peso:1.1,
    cond:c=>!!c.pro,
    mods:{ viaje:1.8, ptsX:1.15 } },

  { id:"impago", alcance:"racha", dur:4, peso:1,
    cond:c=>!!c.sponsor,
    mods:{}, cortaSponsor:true },

  /* ---------- una temporada ---------- */
  { id:"punto_oro", alcance:"temporada", dur:52, peso:1.2,
    flags:["oro"] },

  { id:"puntos_nuevos", alcance:"temporada", dur:52, peso:1,
    mods:{ ptsX:1.3 } },

  { id:"calendario_corto", alcance:"temporada", dur:52, peso:.9,
    flags:["sinContinental"] },

  /* ---------- varias temporadas ---------- */
  { id:"generacion", alcance:"era", dur:120, peso:.8, unico:true,
    cond:c=>(c.semana|0)>=60,
    mundo:"generacion" },

  { id:"caida_dominio", alcance:"era", dur:80, peso:.8, unico:true,
    cond:c=>(c.semana|0)>=100,
    mundo:"caida" },

  /* ---------- te apunta a ti ---------- */
  { id:"sorteo_nemesis", alcance:"propio", dur:1, peso:1.5,
    cond:c=>!!c.nemesis,
    flags:["nemesis"] },

  { id:"ex_provoca", alcance:"propio", dur:2, peso:1.1,
    cond:c=>(c.parejasHist||[]).length>=1,
    mods:{ quimica:-10 }, moral:-12 },

  { id:"entrenador_revela", alcance:"propio", dur:4, peso:1,
    cond:c=>(c.fans||0)>=2500,
    mods:{ golpeTodo:{win:.93} } },
];

function _evPorId(id){ return EVENTOS.find(x=>x.id===id); }
function evNombre(id){ return t("ev_"+id+"_n"); }
function evTexto(id){ return t("ev_"+id+"_x"); }
function evEfecto(id){ return t("ev_"+id+"_e"); }

/* ---------- la bolsa: lo único que consulta la simulación ---------- */
/* Se recalcula al cambiar la lista de eventos activos. Guardarla suelta evita
   recorrer eventos dentro del bucle de puntos, que es el sitio más caliente
   del juego. */
function evRecalcula(e){
  const bolsa={ golpe:{}, todo:{win:1,err:1}, viaje:1, energia:0, energiaTope:100,
                lesion:1, ptsX:1, quimica:0, confTope:100, flags:{} };
  (e&&e.eventos||[]).forEach(a=>{
    const d=_evPorId(a.id); if(!d) return;
    const m=d.mods||{};
    Object.keys(m).forEach(k=>{
      if(k==="golpeTodo"){ bolsa.todo.win*=(m[k].win||1); bolsa.todo.err*=(m[k].err||1); return; }
      if(k.indexOf("golpe:")===0){
        const g=k.slice(6);
        bolsa.golpe[g]=bolsa.golpe[g]||{win:1,err:1};
        bolsa.golpe[g].win*=(m[k].win||1); bolsa.golpe[g].err*=(m[k].err||1);
        return;
      }
      if(k==="viaje"||k==="lesion"||k==="ptsX") bolsa[k]*=m[k];
      else if(k==="energia"||k==="quimica") bolsa[k]+=m[k];
      else if(k==="energiaTope"||k==="confTope") bolsa[k]=Math.min(bolsa[k],m[k]);
    });
    (d.flags||[]).forEach(f=>bolsa.flags[f]=true);
  });
  if(e) e._evBolsa=bolsa;
  return bolsa;
}
function evBolsa(){
  const e=(typeof ent==="function")?ent():null;
  if(!e) return { golpe:{}, todo:{win:1,err:1}, viaje:1, energia:0, energiaTope:100, lesion:1, ptsX:1, quimica:0, confTope:100, flags:{} };
  return e._evBolsa||evRecalcula(e);
}
/* Multiplicadores del golpe `k`, ya combinados con los que afectan a todos. */
function evGolpe(k){
  const b=evBolsa(), g=b.golpe[k];
  return { win:(g?g.win:1)*b.todo.win, err:(g?g.err:1)*b.todo.err };
}
function evNum(clave,base){
  const b=evBolsa();
  if(clave==="viaje") return base*b.viaje;
  if(clave==="lesion") return base*b.lesion;
  if(clave==="ptsX") return base*b.ptsX;
  if(clave==="energia") return base+b.energia;
  if(clave==="quimica") return base+b.quimica;
  if(clave==="energiaTope") return Math.min(base,b.energiaTope);
  if(clave==="confTope") return Math.min(base,b.confTope);
  return base;
}
function evFlag(f){ return !!evBolsa().flags[f]; }
function evActivos(e){ return (e&&e.eventos)||[]; }
function evActivo(e,id){ return evActivos(e).some(a=>a.id===id); }

/* ---------- ciclo de vida ---------- */
/* Los eventos caducan por semana. Devuelve los que se han ido. */
function evCaduca(e,semana){
  const fuera=(e.eventos||[]).filter(a=>a.hasta<semana);
  if(fuera.length){
    e.eventos=(e.eventos||[]).filter(a=>a.hasta>=semana);
    evRecalcula(e);
  }
  return fuera;
}
/* ¿Puede saltar este evento ahora? Mira condición, repetición y solapes. */
function evDisponibles(e,semana){
  const vistos=e.evVistos||{};
  return EVENTOS.filter(d=>{
    if(evActivo(e,d.id)) return false;
    const cuando=vistos[d.id];
    if(cuando){
      if(d.unico) return false;
      if(semana-cuando<(d.alcance==="era"?200:d.alcance==="temporada"?104:26)) return false;
    }
    if(d.cond){ try{ if(!d.cond(e)) return false; }catch(err){ return false; } }
    return true;
  });
}
/* Activa un evento concreto. Devuelve el activo o null. */
function evActiva(e,id,semana){
  const d=_evPorId(id); if(!d||evActivo(e,id)) return null;
  const dur=typeof d.dur==="function"?d.dur(e):d.dur;
  const a={id,desde:semana,hasta:semana+Math.max(0,dur-1)};
  (e.eventos=e.eventos||[]).push(a);
  (e.evVistos=e.evVistos||{})[id]=semana;
  evRecalcula(e);
  if(d.mundo&&typeof evEfectoMundo==="function") evEfectoMundo(d.mundo);
  return a;
}
/* Sortea uno de los disponibles, con peso. Los de alcance largo pesan menos
   porque cambian la temporada entera y no pueden salir cada dos por tres. */
function evSortea(e,semana,azar){
  const r=azar||rnd;
  const disp=evDisponibles(e,semana);
  if(!disp.length) return null;
  const peso=d=>(d.peso||1)*(d.alcance==="era"?.25:d.alcance==="temporada"?.4:1);
  const total=disp.reduce((s,d)=>s+peso(d),0);
  let x=r()*total, elegido=disp[disp.length-1];
  for(const d of disp){ x-=peso(d); if(x<0){ elegido=d; break; } }
  return evActiva(e,elegido.id,semana);
}

/* ---------- lo que cambia el mundo, no a ti ---------- */
/* Los eventos de alcance «era» tocan el circuito por dentro: una generación
   irrepetible que entra de golpe, o la pareja dominante que se desmorona. */
function evEfectoMundo(tipo){
  if(!G||!G.world) return;
  const sx=miSexo();
  if(tipo==="generacion"){
    for(let i=0;i<4;i++){
      const j1=mkJovenNPC(sx), j2=mkJovenNPC(sx);
      const nivel=Math.round(R(70,78));
      j1.attrs=mkAttrsNivel(nivel,j1._est); j2.attrs=mkAttrsNivel(nivel,j2._est);
      const p={id:G.world.nextId++,nombre:`${j1.n}/${j2.n}`,jug:[j1,j2],edad:Math.round(R(18,20)),
               pro:true,sexo:sx,pts:0,club:clubAlAzar(),atNet:false};
      if(typeof rkAsegura==="function") rkAsegura(p);
      G.world.parejas.push(p);
    }
  } else if(tipo==="caida"){
    const top=[...G.world.parejas].filter(p=>(p.sexo||"M")===sx).sort((a,b)=>(b.pts|0)-(a.pts|0))[0];
    if(top&&top.jug) top.jug.forEach(j=>{ if(j.attrs) ATTR_KEYS.forEach(k=>{ j.attrs[k]=clamp(j.attrs[k]-4,25,96); }); });
  }
}

/* ---------- el paso semanal ---------- */
/* Caduca lo vencido, sortea lo nuevo y cuenta las dos cosas. Se llama desde el
   avance de semana de los dos modos. */
function evSemana(e,semana,prob){
  const idos=evCaduca(e,semana);
  idos.forEach(a=>avisa(t("ev_termina",{n:evNombre(a.id)})));
  if(rnd()<(prob==null?.22:prob)){
    const nuevo=evSortea(e,semana);
    if(nuevo){
      const d=_evPorId(nuevo.id);
      avisa(`⚡ ${evNombre(nuevo.id)}: ${evTexto(nuevo.id)}`);
      noticia(d.alcance==="era"?"circuito":"hito",evNombre(nuevo.id),evTexto(nuevo.id));
      // los que traen coletilla propia la aplican al activarse
      if(d.moral!=null) e.compiMoral=clamp((e.compiMoral==null?65:e.compiMoral)+d.moral,5,95);
      if(d.cortaSponsor&&e.sponsor) e._sponsorRetenido=true;
      return nuevo;
    }
  }
  return null;
}

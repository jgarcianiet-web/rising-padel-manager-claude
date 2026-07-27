/* Casos de prueba
   ---------------
   OJO: este archivo NO es un módulo. El arnés lo lee como texto y lo ejecuta
   pegado al código del juego, como si fuera un segundo <script> de la página.
   Por eso aquí se pueden usar directamente las funciones del juego.

   Cada caso cubre un fallo real que apareció jugando. Si vuelve a aparecer,
   la prueba lo caza antes de compilar. */

function comprueba(nombre, fn) {
  try {
    const detalle = fn();
    RESULTADOS.push({ nombre, ok: true, detalle: detalle || "" });
  } catch (e) {
    RESULTADOS.push({ nombre, ok: false, detalle: e.message });
  }
}
function exige(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje || "no se cumple lo esperado");
}

/* utilidades ---------------------------------------------------------- */
function pulsarFicha() {
  const ok = document.getElementById("fichaOk");
  if (ok && ok.onclick) { const f = ok.onclick; ok.onclick = null; f(); }
}
function nuevaCarrera(estilo) {
  persoSel = "frio"; sexoSel = "M"; lado = 1;
  empezarCarrera(estilo || "agresivo");
  return G.carrera;
}
function jugarTorneoEntero(limite) {
  let vueltas = 0;
  while (torneo && vueltas++ < (limite || 8)) { empezarPartido(false); pulsarFicha(); }
  return vueltas;
}
function fundarClub() {
  G = null; sexoClubSel = "M"; colorClubSel = "#C6F53C";
  prepararCrearClub();
  plantillaTmp = [mercadoTmp[0], mercadoTmp[1]];
  pintarMercadoInicial();
  document.getElementById("btnEmpezarClub").onclick();
  return G.clubG;
}

/* ---------------------------------------------------------------------- */

comprueba("El juego carga y define sus funciones principales", () => {
  ["empezarCarrera", "miTeam", "abrirTorneo", "empezarPartido", "guardar", "abrirModo",
   "prepararCrearClub", "repararAlin", "quitarEl", "pintarLogos"].forEach(f => {
    exige(typeof this[f] === "function" || typeof eval(f) === "function", "falta la función " + f);
  });
  return "10 funciones clave presentes";
});

comprueba("Los logos de marca van embebidos", () => {
  exige(typeof LOGO_ESTUDIO === "string" && LOGO_ESTUDIO.indexOf("data:image/") === 0, "falta el logo del estudio");
  exige(typeof LOGO_JUEGO === "string" && LOGO_JUEGO.indexOf("data:image/") === 0, "falta el logo del juego");
  pintarLogos();
  exige(document.getElementById("splImgJuego").src, "el splash no recibe el logo del juego");
  return Math.round((LOGO_ESTUDIO.length + LOGO_JUEGO.length) / 1024) + " KB de logos";
});

comprueba("El menú se dibuja sin partida empezada", () => {
  G = null;
  pintarMenu();
  return "menú listo";
});

comprueba("Se puede abrir 'crear club' sin partida (regresión: Script error)", () => {
  G = null;
  prepararCrearClub();
  pintarMercadoInicial();
  exige(mercadoTmp && mercadoTmp.length >= 2, "el mercado inicial viene vacío");
  return mercadoTmp.length + " jugadores en el mercado";
});

comprueba("El presupuesto inicial permite fichar una pareja", () => {
  G = null; prepararCrearClub();
  const costes = mercadoTmp.map(j => costeFichaje(j)).sort((a, b) => a - b);
  exige(costes[0] + costes[1] <= PRESUP_CLUB, "los dos jugadores más baratos no caben en la caja inicial");
  return "los 2 más baratos: " + (costes[0] + costes[1]) + "€ de " + PRESUP_CLUB + "€";
});

comprueba("Carrera: crear jugador y disputar un torneo", () => {
  const c = nuevaCarrera("agresivo");
  const sl = slotSemana(semanaTemp());
  if (entradaEn(sl.fip) !== -1) { abrirTorneo(sl.fip); jugarTorneoEntero(); }
  exige(typeof c.pts === "number", "la carrera no lleva puntos");
  return "puesto #" + miPuesto();
});

comprueba("Carrera: se puede avanzar una temporada entera", () => {
  const c = nuevaCarrera("agresivo");
  const tempInicial = temporada();
  let pasos = 0;
  while (temporada() === tempInicial && pasos++ < 1200) {
    if (torneo) { empezarPartido(false); pulsarFicha(); continue; }
    const dia = c.dia || 1;
    if (dia === 1) {
      const sl = slotSemana(semanaTemp());
      if (entradaEn(sl.fip) !== -1 && c.dinero > costeViaje(sl.fip)) { abrirTorneo(sl.fip); continue; }
    }
    descansarDia();
  }
  exige(temporada() > tempInicial, "no se llegó a cerrar la temporada");
  exige(c.historia && c.historia.length >= 1, "no se guardó el anuario de la temporada");
  return "temporada cerrada, anuario con " + c.historia.length + " año(s)";
});

comprueba("Partido: fatiga, tiros y break points se registran", () => {
  // Mini-partido controlado con el motor compartido (sin depender del calendario).
  const jugadorTest = (n, l) => ({
    n, estilo: "constructor", perso: "frio", conf: 55, lado: l,
    attrs: { fondo: 75, globo: 75, chiquita: 75, volea: 75, dejada: 75, bandeja: 75, vibora: 75, remate: 75, pared: 75 },
  });
  teams = [
    { nombre: "Test A", jug: [jugadorTest("A1", 0), jugadorTest("A2", 1)] },
    { nombre: "Test B", jug: [jugadorTest("B1", 0), jugadorTest("B2", 1)] },
  ];
  stats = [mkStats(), mkStats()];
  match = { p: [0, 0], j: [0, 0], s: [0, 0], hist: [], server: 0, fin: false, cpu: true };
  PRESION = 0; TACT = { agres: "normal", diana: "repartir" };
  let guarda = 0;
  while (!match.fin && guarda++ < 5000) { PRESION = calcPresion(); resolverPunto(buildPoint(match.server).ganador); }
  exige(match.fin, "el partido de prueba no llegó a terminar");
  const tiros = (stats[0].tiros || 0) + (stats[1].tiros || 0);
  exige(tiros > 0, "un partido entero no registró ni un tiro");
  const fatMax = Math.max(...stats[0].fatiga, ...stats[1].fatiga);
  exige(fatMax >= 0 && fatMax <= 100, "la fatiga se sale del rango 0..100");
  exige(fatMax > 0, "nadie acumuló fatiga en un partido entero");
  [0, 1].forEach(t => exige(stats[t].bp.ganados <= stats[t].bp.jugados, "hay más roturas convertidas que ocasiones de rotura"));
  // dominio de red: puntos cerrados desde arriba, nunca más que los puntos ganados
  [0, 1].forEach(t => exige((stats[t].red || 0) >= 0 && (stats[t].red || 0) <= (stats[t].pganados || 0), "los puntos de red exceden a los puntos ganados"));
  const red = (stats[0].red || 0) + (stats[1].red || 0);
  exige(red > 0, "en un partido entero no se cerró ni un punto en la red");
  // análisis post-partido: desglose por golpe, presión y narrativa del "por qué"
  const wShotN = Object.values(stats[0].wShot).reduce((a, v) => a + v, 0);
  const wTot = stats[0].jug[0].w + stats[0].jug[1].w;
  exige(wShotN === wTot, "los winners por golpe no cuadran con los winners totales");
  exige(stats[0].presion.gan <= stats[0].presion.jug, "puntos de presión ganados > jugados");
  const an = analisisPartido();
  exige(Array.isArray(an) && an.length > 0, "el análisis post-partido no produjo ninguna lectura");
  return `${tiros} tiros, red ${stats[0].red}-${stats[1].red}, presión ${stats[0].presion.gan}/${stats[0].presion.jug}, análisis con ${an.length} lecturas`;
});

comprueba("SQLite: la proyección relacional produce filas coherentes", () => {
  nuevaCarrera("agresivo");
  const p = filasProyeccion();
  exige(Array.isArray(p.ranking) && p.ranking.length > 0, "no se proyectó el ranking");
  exige(Array.isArray(p.jugadores) && p.jugadores.length > 0, "no se proyectaron jugadores");
  // cada sexo empieza en la posición 1 y no repite posiciones
  const porSexo = {};
  p.ranking.forEach(r => { (porSexo[r.sexo] = porSexo[r.sexo] || []).push(r.pos); });
  Object.keys(porSexo).forEach(s => {
    const pos = porSexo[s].slice().sort((a, b) => a - b);
    exige(pos[0] === 1, "el ranking " + s + " no empieza en la posición 1");
    exige(new Set(pos).size === pos.length, "hay posiciones repetidas en el ranking " + s);
  });
  // jugadores: media en rango y lado válido
  const mal = p.jugadores.filter(j => !(j.media >= 0 && j.media <= 100) || (j.lado !== "drive" && j.lado !== "revés"));
  exige(mal.length === 0, mal.length + " jugadores con media o lado inválidos");
  return p.ranking.length + " parejas y " + p.jugadores.length + " jugadores proyectados";
});

comprueba("SQLite Fase 3: el modelo normalizado hace ida y vuelta sin pérdida", () => {
  nuevaCarrera("agresivo");
  const orig = G.world.parejas;
  // campos NO modelados (deben sobrevivir vía `extras`, para poder cargar el
  // mundo desde SQLite sin perder datos en la Fase 4b)
  orig[0]._titulos = 3; orig[0].retiraT = 41;
  if (orig[0].jug && orig[0].jug[0]) orig[0].jug[0]._ropa = "#123456";
  const snap = normalizar();
  exige(snap.parejas.length === orig.length, "el nº de parejas normalizadas no coincide");
  const totJug = orig.reduce((n, p) => n + (p.jug ? p.jug.length : 0), 0);
  exige(snap.jugadores.length === totJug, "el nº de jugadores normalizados no coincide");
  exige(snap.atributos.length > 0, "no se normalizó ningún atributo");
  const recon = denormalizar(snap);
  exige(recon.length === orig.length, "la reconstrucción cambia el nº de parejas");
  const byId = {}; recon.forEach(p => byId[p.id] = p);
  let fallos = 0;
  orig.forEach(o => {
    const r = byId[o.id];
    if (!r) { fallos++; return; }
    if (r.nombre !== o.nombre || Math.round(o.pts) !== r.pts || (o.sexo || "M") !== r.sexo) fallos++;
    (o.jug || []).forEach((oj, i) => {
      const rj = r.jug[i];
      if (!rj || rj.n !== oj.n || rj.estilo !== oj.estilo || (oj.lado === 1 ? 1 : 0) !== rj.lado) { fallos++; return; }
      ATTR_KEYS.forEach(k => { if (oj.attrs && oj.attrs[k] != null && Math.round(oj.attrs[k]) !== rj.attrs[k]) fallos++; });
    });
  });
  exige(fallos === 0, fallos + " discrepancias en la ida y vuelta del modelo");
  // los campos no modelados sobreviven (extras)
  const r0 = byId[orig[0].id];
  exige(r0._titulos === 3 && r0.retiraT === 41, "los campos extra de la pareja no sobreviven (extras)");
  exige(!orig[0].jug[0] || r0.jug[0]._ropa === "#123456", "el campo extra del jugador no sobrevive (extras)");
  return orig.length + " parejas, " + snap.jugadores.length + " jugadores y " + snap.atributos.length + " atributos: round-trip exacto";
});

comprueba("SQLite Fase 4a: la comparación mundo↔BD detecta identidad y discrepancias", () => {
  nuevaCarrera("agresivo");
  const recon = denormalizar(normalizar());   // lo que devolvería la BD tras un round-trip
  const igual = compararMundos(recon, G.world.parejas);
  exige(igual.ok, "no reconoce dos mundos idénticos: " + (igual.msg || ""));
  // quitar una pareja debe detectarse
  exige(!compararMundos(recon.slice(0, recon.length - 1), G.world.parejas).ok, "no detecta que falta una pareja");
  // cambiar el nombre de un jugador debe detectarse
  const alterado = JSON.parse(JSON.stringify(recon));
  if (alterado[0] && alterado[0].jug && alterado[0].jug[0]) alterado[0].jug[0].n = "XxX";
  exige(!compararMundos(alterado, G.world.parejas).ok, "no detecta un jugador cambiado");
  return "identidad y discrepancias detectadas (" + igual.n + " parejas)";
});

comprueba("Marcador: star point (ventajas y punto de oro tras dos ventajas)", () => {
  stats = [mkStats(), mkStats()];
  match = { p: [3, 3], j: [0, 0], s: [0, 0], hist: [], server: 0, fin: false, ventaja: null, ventajasFallidas: 0, golden: false };
  // 40-40: gana 0 → ventaja de 0 (no juego)
  let r = resolverPunto(0);
  exige(r.juego === undefined && match.ventaja === 0, "40-40 debería dar ventaja, no juego");
  // gana 1 → vuelve a deuce, 1 ventaja sin concretar
  resolverPunto(1);
  exige(match.ventaja === null && match.ventajasFallidas === 1 && !match.golden, "romper la ventaja debe volver a deuce (fallida 1)");
  // deuce: gana 1 → ventaja de 1
  resolverPunto(1);
  exige(match.ventaja === 1, "debería dar ventaja al equipo 1");
  // gana 0 → deuce, 2 ventajas sin concretar → star point
  resolverPunto(0);
  exige(match.golden === true, "tras dos ventajas sin concretar debe activarse el star point");
  // star point: gana 0 → juego para 0
  r = resolverPunto(0);
  exige(r.juego === 0 && match.j[0] === 1, "el star point debe decidir el juego");
  exige(!match.golden && match.ventaja === null && match.ventajasFallidas === 0, "ganar el juego debe resetear el estado de ventajas");
  // caso normal: 40 con el rival por debajo cierra el juego sin ventajas
  match.p = [3, 1]; match.golden = false; match.ventaja = null; match.ventajasFallidas = 0;
  r = resolverPunto(0);
  exige(r.juego === 0, "40-30 ganado debe cerrar el juego directamente");
  return "ventajas + star point correctos";
});

comprueba("Partido: el momentum (parciales) se registra y contagia confianza", () => {
  const jt = (n) => ({ n, estilo: "constructor", perso: "frio", conf: 55, lado: 0, attrs: { fondo: 70, globo: 70, chiquita: 70, volea: 70, dejada: 70, bandeja: 70, vibora: 70, remate: 70, pared: 70 } });
  teams = [{ nombre: "Momento A", jug: [jt("A1"), jt("A2")] }, { nombre: "Momento B", jug: [jt("B1"), jt("B2")] }];
  stats = [mkStats(), mkStats()];
  match = { p: [0, 0], j: [0, 0], s: [0, 0], hist: [], server: 0, fin: false, cpu: true, momento: { team: -1, run: 0, best: [0, 0], aviso: null } };
  // cinco puntos seguidos del equipo 0: un parcial que prende
  for (let i = 0; i < 5; i++) resolverPunto(0);
  exige(match.momento.team === 0 && match.momento.run === 5, "no se registró el parcial de 5 puntos");
  exige(match.momento.best[0] >= 5, "no se guardó el mejor parcial del equipo caliente");
  exige(teams[0].jug[0].conf > 55, "un parcial largo no dio confianza al equipo caliente");
  exige(teams[1].jug[0].conf < 55, "un parcial en contra no restó confianza al equipo frío");
  // el rival corta la racha: el parcial se reinicia
  resolverPunto(1);
  exige(match.momento.team === 1 && match.momento.run === 1, "al cambiar de manos el parcial no se reinició");
  return `mejor parcial ${match.momento.best[0]}-${match.momento.best[1]}`;
});

comprueba("Lesiones y moral: gravedad, secuela, fragilidad y moral en pista", () => {
  // pickLesion siempre da una lesión válida; el riesgo alto favorece las graves
  const N = 500;
  let graves = 0, gravesBajo = 0;
  for (let i = 0; i < N; i++) { const l = pickLesion(0.95); exige(l && l.sem > 0, "pickLesion no devuelve una lesión válida"); if (l.grav === 3) graves++; }
  for (let i = 0; i < N; i++) { if (pickLesion(0.05).grav === 3) gravesBajo++; }
  exige(graves > gravesBajo, `el riesgo alto no aumenta las graves (${graves} vs ${gravesBajo})`);
  // secuela: las leves no dejan merma; las graves sí
  exige(secuelaDe({ grav: 1 }) === null, "una lesión leve no debería dejar secuela");
  const sg = secuelaDe({ grav: 3 }); exige(sg && sg.pct > 0 && sg.sem > 0, "una lesión grave debe dejar secuela");
  // la merma reduce el rendimiento (factor de forma)
  exige(factorForma(100, 80, null) > factorForma(100, 80, { sem: 2, pct: 8 }), "la merma no reduce el factor de forma");
  // alta médica: transfiere la secuela y limpia la baja; la merma se disipa con el tiempo
  const port = { lesion: { grav: 3, sem: 0 }, fragil: 0, merma: null };
  const sec = curarLesion(port);
  exige(port.lesion === null && port.merma && sec, "curarLesion no limpia la baja / no aplica la secuela");
  decaeMerma(port); decaeMerma(port); decaeMerma(port);
  exige(!port.merma, "la merma no desaparece tras varias semanas");
  // fragilidad: con energía muy baja se lesiona y sube el historial
  const fr = { energia: 5, fragil: 0, lesion: null };
  let veces = 0;
  for (let i = 0; i < 200; i++) { fr.energia = 5; fr.lesion = null; if (intentaLesion(fr, false)) veces++; }
  exige(veces > 0, "con energía a 5 no se lesiona nunca");
  exige(fr.fragil > 0, "lesionarse no aumenta la fragilidad");
  /* Con energía llena y sin poso el riesgo es residual, pero no cero: si lo
     fuera, al cuadrar el presupuesto de energía nadie volvería a lesionarse
     nunca —medido: 0% de semanas lesionado en seis temporadas y tres formas de
     jugar— y con las lesiones se caen el fisio, la clínica y media razón de ser
     de la carga acumulada. Lo que rompe a un deportista sano es el poso. */
  const sano = riesgoLesionPost(100, 0, false, 0);
  const fundido = riesgoLesionPost(15, 0, false, 0);
  const pasado = riesgoLesionPost(100, 0, false, 95);
  exige(sano > 0 && sano < .03, "con energía llena el riesgo debería ser residual: " + sano);
  exige(fundido > sano * 8, "quedarse sin fuerzas no dispara el riesgo");
  exige(pasado > sano * 2, "vivir pasado de vueltas no rompe a nadie: " + pasado);
  exige(riesgoLesionPost(100, 0, true, 95) < pasado, "el fisio no protege al que arrastra carga");
  // la moral pesa en la pista: alta suma confianza, baja resta
  exige(moralAjusteConf(90) > 0 && moralAjusteConf(20) < 0, "la moral no ajusta la confianza en pista");
  return `graves ${graves}/${N} (riesgo alto) vs ${gravesBajo}/${N} (bajo); ${veces}/200 lesiones con energía a 5`;
});

comprueba("Informe del ojeador: lee debilidades, eslabón débil y táctica", () => {
  const mk = (n, over) => ({
    n, estilo: over.estilo || "constructor", perso: over.perso || "frio", lado: over.lado ?? 0,
    attrs: Object.assign({ fondo: 70, globo: 70, chiquita: 70, volea: 70, dejada: 70, bandeja: 70, vibora: 70, remate: 70, pared: 70 }, over.attrs || {}),
  });
  // rival con globo y bandeja flojos, y un jugador claramente más débil
  const par = {
    nombre: "X / Y",
    jug: [mk("Fuerte", { attrs: { fondo: 82, globo: 82, bandeja: 82, remate: 82, volea: 82, pared: 82, vibora: 82, chiquita: 82, dejada: 82 } }),
          mk("Débil", { perso: "emocional", attrs: { globo: 55, bandeja: 55 } })],
  };
  const inf = informeRival(par, 84);   // claramente por encima del nivel del rival
  exige(inf && Array.isArray(inf.deb) && inf.deb.length > 0, "el informe no devuelve debilidades");
  const txt = inf.deb.join(" | ");
  exige(/globo/i.test(txt), "no detecta la debilidad de globo");
  exige(/bandeja/i.test(txt), "no detecta la bandeja endeble");
  exige(inf.objetivo === 1, "no identifica al jugador débil como eslabón (índice 1)");
  exige(/Débil/.test(txt), "no señala por nombre al eslabón débil");
  exige(/emocional/i.test(txt), "no lee la fragilidad mental del emocional");
  // táctica recomendada: cargar sobre el flojo y, con más nivel, ir arriba
  exige(inf.rec.diana === "debil", "no recomienda cargar sobre el flojo");
  exige(inf.rec.agres === "agresiva", "con nivel superior debería recomendar agresividad");
  // una pareja pareja y sólida no deja eslabón débil
  const par2 = { nombre: "P / Q", jug: [mk("A", {}), mk("B", {})] };
  const inf2 = informeRival(par2, 70);
  exige(inf2.objetivo === null, "no debería haber eslabón débil en una pareja equilibrada");
  return `${inf.deb.length} debilidades, objetivo=${inf.objetivo}, plan ${inf.rec.agres}/${inf.rec.diana}`;
});

comprueba("Táctica: las palancas de red y puntos calientes cambian el partido", () => {
  const pl = { n: "P", estilo: "constructor", perso: "frio", conf: 55, lado: 0, attrs: { fondo: 72, globo: 72, chiquita: 72, volea: 72, dejada: 72, bandeja: 72, vibora: 72, remate: 72, pared: 72 } };
  const N = 20000;
  // Monte Carlo directo sobre resolveShot: aísla el efecto de cada palanca
  const mc = (tac, pres, shot, ctx) => {
    TACT = Object.assign({ agres: "normal", diana: "repartir", red: "normal", clutch: "normal" }, tac);
    PRESION = pres; match = { cpu: false };
    let w = 0, e = 0;
    for (let i = 0; i < N; i++) { const o = resolveShot(pl, shot, Object.assign({ team: 0, oppDef: 70 }, ctx), 3); if (o === "winner") w++; else if (o === "error") e++; }
    return { w: w / N, e: e / N };
  };
  // estrategia de red: subir cierra más arriba que aguantar
  const subir = mc({ red: "subir" }, 0, "volea", { atNet: true });
  const aguantar = mc({ red: "aguantar" }, 0, "volea", { atNet: true });
  exige(subir.w > aguantar.w + 0.01, `subir debería cerrar más en la red que aguantar (${subir.w.toFixed(3)} vs ${aguantar.w.toFixed(3)})`);
  // puntos calientes: arriesgar sube winners Y errores; conservar baja ambos
  const arr = mc({ clutch: "arriesgar" }, 0.7, "volea", { atNet: true });
  const cons = mc({ clutch: "conservar" }, 0.7, "volea", { atNet: true });
  exige(arr.w > cons.w + 0.01, "arriesgar en punto caliente debería dar más winners que conservar");
  exige(arr.e > cons.e + 0.01, "arriesgar en punto caliente debería dar más errores que conservar");
  // el riesgo de subir: un rival que globea bien te pasa por arriba
  const rivalPl = { attrs: { globo: 90 } };
  const punir = (tac) => { TACT = Object.assign({ agres: "normal", diana: "repartir", red: "normal", clutch: "normal" }, tac); PRESION = 0; match = { cpu: false }; let w = 0; for (let i = 0; i < N; i++) if (resolveShot(rivalPl, "globo", { team: 1, oppDef: 70 }, 3) === "winner") w++; return w / N; };
  exige(punir({ red: "subir" }) > punir({ red: "normal" }) + 0.005, "subir a la red debería exponerte al globo de un buen globeador");
  // el informe recomienda red/clutch, no solo agresividad/diana
  const rival = { nombre: "R", jug: [{ n: "R1", estilo: "constructor", perso: "frio", lado: 0, attrs: Object.assign({}, pl.attrs, { globo: 55 }) }, { n: "R2", estilo: "constructor", perso: "frio", lado: 1, attrs: Object.assign({}, pl.attrs, { globo: 55 }) }] };
  const inf = informeRival(rival, 74);
  exige(inf.rec.red === "subir", "con globo rival flojo, el plan debería recomendar subir a la red");
  exige(["conservar", "normal", "arriesgar"].includes(inf.rec.clutch), "el plan no propone estrategia de puntos calientes");
  return `red subir/aguantar w ${subir.w.toFixed(3)}/${aguantar.w.toFixed(3)}, clutch arr/cons w ${arr.w.toFixed(3)}/${cons.w.toFixed(3)}, plan red=${inf.rec.red}`;
});

comprueba("Rasgos: identidad de jugador con efectos concretos", () => {
  // deterministas por nombre
  exige(JSON.stringify(rasgosDe({ n: "Fulano de Tal" })) === JSON.stringify(rasgosDe({ n: "Fulano de Tal" })), "los rasgos no son deterministas por nombre");
  // nunca pares incompatibles, y no todos van vacíos
  let choca = 0, conAlgo = 0;
  for (let i = 0; i < 300; i++) {
    const r = rasgosDe({ n: "J" + i + " Test" });
    if (r.length) conAlgo++;
    if ((r.includes("clutch") && r.includes("fragil")) || (r.includes("propenso") && r.includes("hierro")) || (r.includes("talento") && r.includes("vago"))) choca++;
  }
  exige(choca === 0, "aparecen rasgos incompatibles juntos");
  exige(conAlgo > 0, "nadie tiene ningún rasgo en 300 jugadores");
  // efecto en partido: especialista mejora bajo presión; cristal frágil empeora
  const esp = rasgosMatch({ n: "E", rasgos: ["clutch"] }, "volea", { presion: .7 });
  const fra = rasgosMatch({ n: "F", rasgos: ["fragil"] }, "volea", { presion: .7 });
  exige(esp.win > 1 && esp.err < 1, "el especialista no mejora bajo presión");
  exige(fra.win < 1 && fra.err > 1, "el cristal frágil no empeora bajo presión");
  // sin presión, el especialista no altera el punto
  const calma = rasgosMatch({ n: "E", rasgos: ["clutch"] }, "volea", { presion: 0 });
  exige(calma.win === 1 && calma.err === 1, "el especialista no debería alterar un punto tranquilo");
  // lesiones y entrenamiento
  exige(rasgosLesionAjuste({ n: "P", rasgos: ["propenso"] }) > 0, "propenso no aumenta el riesgo");
  exige(rasgosLesionAjuste({ n: "H", rasgos: ["hierro"] }) < 0, "hierro no reduce el riesgo");
  exige(rasgosEntreno({ n: "T", rasgos: ["talento"] }) > 1, "talento no entrena mejor");
  exige(rasgosEntreno({ n: "V", rasgos: ["vago"] }) < 1, "quien entrena mal no entrena peor");
  // el ojeador revela los rasgos del rival
  const at = { fondo: 72, globo: 72, chiquita: 72, volea: 72, dejada: 72, bandeja: 72, vibora: 72, remate: 72, pared: 72 };
  const rival = { nombre: "R", jug: [{ n: "R1", estilo: "constructor", perso: "frio", lado: 0, attrs: at, rasgos: ["fragil"] }, { n: "R2", estilo: "constructor", perso: "frio", lado: 1, attrs: at, rasgos: ["clutch"] }] };
  const inf = informeRival(rival, 72);
  const all = inf.deb.concat(inf.fue).join(" | ");
  exige(/cristal frágil/i.test(all), "el ojeador no revela el cristal frágil del rival");
  exige(/especialista/i.test(all), "el ojeador no revela al especialista del rival");
  return `${conAlgo}/300 con rasgo; esp win ${esp.win.toFixed(2)}, frágil err ${fra.err.toFixed(2)}`;
});

comprueba("Relaciones: afinidad, motivo de crisis y ruptura con alternativas", () => {
  const j = (est, lado, rasgos) => ({ n: est + lado + (rasgos || []).join(""), estilo: est, perso: "frio", lado, rasgos: rasgos || [] });
  // estilos complementarios + lados distintos > dos atacantes del mismo lado
  const comp = afinidadPareja(j("defensivo", 0, []), j("agresivo", 1, []));
  const choque = afinidadPareja(j("agresivo", 0, []), j("agresivo", 0, []));
  exige(comp > choque, `complementaria (${comp}) debería superar a dos gallos pisándose (${choque})`);
  exige(afinidadPareja(j("defensivo", 0, ["conflictivo"]), j("agresivo", 1, [])) < comp, "conflictivo no reduce la afinidad");
  exige(afinidadPareja(j("defensivo", 0, ["leal"]), j("agresivo", 1, [])) > comp, "leal no aumenta la afinidad");
  // motivo concreto: racha de derrotas / ambición estancada
  const c1 = { nombre: "Yo", estilo: "agresivo", perso: "frio", lado: 0, rasgos: [], compiMoral: 30, racha: ["D", "D", "D", "V", "D"], compi: j("agresivo", 1, []) };
  exige(motivoDescontento(c1, 5).clave === "resultados", "no detecta la racha de derrotas");
  const c2 = { nombre: "Yo", estilo: "agresivo", perso: "frio", lado: 0, rasgos: [], compiMoral: 30, racha: ["V", "V"], compi: j("defensivo", 1, ["ambicioso"]) };
  exige(motivoDescontento(c2, 45).clave === "ambicion", "no detecta la ambición estancada");
  // crisis: moral alta = sin crisis; moral baja = crisis con alternativas (incluida 'dejar')
  exige(evaluarRuptura({ compiMoral: 60, compi: j("agresivo", 1, []), racha: [] }, 10).crisis === false, "no debería haber crisis con moral alta");
  const ev = evaluarRuptura(c1, 5);
  exige(ev.crisis === true && ev.ops.some(o => o.id === "dejar"), "la crisis no ofrece alternativas / la de dejarlo");
  // el leal se reconduce más fácil que el conflictivo
  exige(probReconduccion({ compi: j("d", 1, ["leal"]) }, "hablar") > probReconduccion({ compi: j("d", 1, ["conflictivo"]) }, "hablar"), "el leal no es más fácil de reconducir");
  // aplicar: 'dejar' rompe; una charla exitosa (forzando el azar) sube la moral y NO rompe
  exige(aplicarOpcionRuptura(c1, "dejar").rompio === true, "dejar debería romper la pareja");
  const _r = rnd, _est = rndEstado(); rnd = () => 0;
  const antes = c1.compiMoral, res = aplicarOpcionRuptura(c1, "hablar", ev.motivo);
  rnd = _r; rndSemilla(_est.semilla, _est.pos);
  exige(res.rompio === false && c1.compiMoral > antes, "una reconducción exitosa debería subir la moral sin romper");
  return `comp ${comp} vs choque ${choque}; motivos ${motivoDescontento(c1, 5).clave}/${motivoDescontento(c2, 45).clave}`;
});

comprueba("Mercado: negociación de compañero con exigencias reales", () => {
  const at = (n) => { const o = {}; ATTR_KEYS.forEach(k => o[k] = n); return o; };
  // prestigio: nº1 con fama >> nº200 sin fama
  exige(prestigioJugador(1, 20000, true) > prestigioJugador(200, 50, false), "el prestigio no refleja ranking/fama");
  // un crack exige más prestigio y entrenador; un modesto, poco
  const crack = { n: "Crack", estilo: "agresivo", perso: "frio", lado: 1, attrs: at(85), rasgos: [] };
  const modesto = { n: "Modesto", estilo: "constructor", perso: "frio", lado: 0, attrs: at(48), rasgos: [] };
  exige(exigenciasCompi(crack).prestigioMin > exigenciasCompi(modesto).prestigioMin, "el crack no exige más prestigio");
  exige(exigenciasCompi(crack).exigeEntrenador === true, "un crack debería exigir entrenador");
  exige(exigenciasCompi(modesto).exigeEntrenador === false, "un modesto no debería exigir entrenador");
  exige(exigenciasCompi({ n: "A", estilo: "agresivo", perso: "frio", lado: 1, attrs: at(70), rasgos: ["ambicioso"] }).objetivoRanking != null, "el ambicioso no fija objetivo de ranking");
  // sin prestigio ni entrenador, el crack no firma
  const yo = { estilo: "constructor", perso: "frio", lado: 0, rasgos: [], n: "Yo" };
  const r1 = evaluaOfertaCompi(yo, crack, { tieneEntrenador: false }, 20);
  exige(r1.acepta === false && r1.faltan.length >= 1, "el crack no debería firmar sin prestigio");
  // con prestigio y entrenador, y lado que no colisiona (él revés, tú drive), firma
  const r2 = evaluaOfertaCompi(yo, { n: "C", estilo: "agresivo", perso: "frio", lado: 1, attrs: at(60), rasgos: [] }, { tieneEntrenador: true }, 90);
  exige(r2.acepta === true, "con prestigio y entrenador debería firmar");
  // colisión de lado con un conflictivo (ambos drive): no firma salvo que cedas tu lado
  const conf = { n: "Conf", estilo: "constructor", perso: "frio", lado: 0, attrs: at(55), rasgos: ["conflictivo"] };
  const rCol = evaluaOfertaCompi(yo, conf, { tieneEntrenador: true }, 90);
  const rCede = evaluaOfertaCompi(yo, conf, { tieneEntrenador: true, cederLado: true }, 90);
  exige(rCol.acepta === false, "el conflictivo no debería aceptar el lado forzado");
  exige(rCede.acepta === true, "cediendo el lado, el conflictivo debería firmar");
  exige(rCede.afinidad > rCol.afinidad, "ceder el lado debería mejorar la afinidad");
  return `crack pide prestigio ${exigenciasCompi(crack).prestigioMin}; afinidad forzada ${rCol.afinidad} → cediendo ${rCede.afinidad}`;
});

comprueba("Club: contratos, moral por minutos y renovación", () => {
  const at = (n) => { const o = {}; ATTR_KEYS.forEach(k => o[k] = n); return o; };
  const ct = mkContratoClub(70);
  exige(ct.salario === 70 * 8 && ct.clausula > 0 && ct.temporadas >= 1 && ct.temporadas <= 3, "contrato inicial incoherente");
  // moral por minutos: titular sube, banquillo baja; el ambicioso en el banquillo sufre más
  exige(moralMinutosDelta({ n: "T", rasgos: [] }, "A") > 0, "el titular no gana moral");
  exige(moralMinutosDelta({ n: "B", rasgos: [] }, "banquillo") < 0, "el banquillo no pierde moral");
  exige(moralMinutosDelta({ n: "Amb", rasgos: ["ambicioso"] }, "banquillo") < moralMinutosDelta({ n: "N", rasgos: [] }, "banquillo"), "el ambicioso no sufre más en el banquillo");
  // estado según moral de plantilla
  exige(estadoJugadorClub({ moralC: 20 }).clave === "salir", "moral 20 debería pedir salir");
  exige(estadoJugadorClub({ moralC: 35 }).clave === "exige", "moral 35 debería exigir jugar");
  exige(estadoJugadorClub({ moralC: 80 }).clave === "ok", "moral 80 debería estar a gusto");
  // renovación: acepta si el salario cubre su expectativa; el ambicioso pide más
  const j = { n: "R", attrs: at(60), rasgos: [] }, amb = { n: "A", attrs: at(60), rasgos: ["ambicioso"] };
  exige(evaluaRenovacionClub(j, 60 * 8).acepta === true, "debería aceptar un salario acorde a su nivel");
  exige(evaluaRenovacionClub(j, 60 * 4).acepta === false, "no debería aceptar un salario a la baja");
  exige(evaluaRenovacionClub(amb, 60 * 8).espera > evaluaRenovacionClub(j, 60 * 8).espera, "el ambicioso no exige más salario");
  exige(valorClausula({ contrato: { clausula: 12345 } }) === 12345, "no usa la cláusula del contrato");
  return `contrato ${ct.temporadas} temp, salario ${ct.salario}; ambicioso espera ${evaluaRenovacionClub(amb, 0).espera}`;
});

comprueba("Objetivos: metas de temporada con progreso y recompensa", () => {
  const c = { palmares: [], pts: 1000, rachaAct: 0, compi: { n: "P", rasgos: ["ambicioso"] } };
  c.objetivos = mkObjetivosTemporada(c, 30);
  exige(c.objetivos.length >= 3, "no se generan suficientes objetivos");
  exige(c.objetivos.some(o => o.clave === "rank") && c.objetivos.some(o => o.clave === "titulos"), "faltan objetivos base");
  exige(c.objetivos.some(o => o.clave === "parejaPts"), "el compañero ambicioso no añade su objetivo");
  // el de títulos progresa al ganar torneos esta temporada
  const objTit = c.objetivos.find(o => o.clave === "titulos");
  exige(progresoObjetivo(c, objTit, 30).hecho === false, "el objetivo de títulos no debería estar cumplido de inicio");
  c.palmares.push("FIP (T1)"); c.palmares.push("Major (T1)");
  exige(progresoObjetivo(c, objTit, 30).actual === 2, "no cuenta los títulos de la temporada");
  // rank: cumplido al alcanzar la meta, no por encima
  const objRank = c.objetivos.find(o => o.clave === "rank");
  exige(progresoObjetivo(c, objRank, objRank.meta).hecho === true, "el ranking no se cumple al alcanzar la meta");
  exige(progresoObjetivo(c, objRank, objRank.meta + 5).hecho === false, "el ranking no debería cumplirse por encima de la meta");
  // evaluaObjetivos marca y reporta los recién cumplidos, una sola vez
  const logr = evaluaObjetivos(c, objRank.meta);
  exige(logr.some(o => o.clave === "rank") && objRank.hecho === true, "no marca/reporta el ranking cumplido");
  exige(evaluaObjetivos(c, objRank.meta).some(o => o.clave === "rank") === false, "reporta dos veces el mismo objetivo");
  return `${c.objetivos.length} objetivos; títulos ${progresoObjetivo(c, objTit, 30).actual}/${objTit.meta}, meta rank ${objRank.meta}`;
});

comprueba("Dilemas: decisiones con consecuencias diferidas", () => {
  const c = { sponsor: { marca: "X", sem: 200 }, energia: 90, fans: 500, dinero: 1000, compiMoral: 65, pendientes: [] };
  // con patrocinador está disponible el dilema del anuncio
  exige(dilemasDisponibles(c).some(d => d.id === "dubai"), "no aparece el dilema del anuncio con patrocinador");
  // decidir "rodar" aplica el efecto inmediato y encola la consecuencia diferida
  c.dilemaActivo = { id: "dubai", sem: 10 };
  const dAntes = c.dinero, fAntes = c.fans;
  const r = aplicarOpcionDilema(c, 0, 10);
  exige(c.dinero > dAntes && c.fans > fAntes, "el efecto inmediato no se aplica");
  exige(c.dilemaActivo === null, "el dilema no se cierra al decidir");
  exige((c.pendientes || []).length === 1 && c.pendientes[0].sem > 10, "no se encola la consecuencia diferida");
  // la consecuencia NO llega hasta su semana
  const enAntes = c.energia;
  exige(resolverPendientes(c, 10).length === 0 && c.energia === enAntes, "la consecuencia se aplicó antes de tiempo");
  const res = resolverPendientes(c, c.pendientes[0].sem);
  exige(res.length === 1 && c.energia < enAntes, "la consecuencia diferida no se aplica al llegar su semana");
  exige((c.pendientes || []).length === 0, "la consecuencia resuelta no se retira de la cola");
  return `energía ${enAntes}→${c.energia} al resolverse la consecuencia diferida`;
});

comprueba("Superliga: liga a doble vuelta, tabla y playoffs", () => {
  // calendario doble vuelta: 16 equipos → 30 jornadas de 8 cruces
  const cal = mkCalendarioLiga(16);
  exige(cal.length === 30, "el calendario de 16 equipos debería tener 30 jornadas");
  exige(cal.every(j => j.length === 8), "cada jornada debería tener 8 cruces");
  cal.forEach(j => { const v = new Set(); j.forEach(([a, b]) => { v.add(a); v.add(b); }); exige(v.size === 16, "un equipo se repite o falta en una jornada"); });
  // cruce a 3 parejas: el club fuerte gana la mayoría de las veces
  let ganaFuerte = 0;
  for (let i = 0; i < 300; i++) if (resuelveCruce(75, 55).ganador === 0) ganaFuerte++;
  exige(ganaFuerte > 200, `el club fuerte debería ganar la mayoría (${ganaFuerte}/300)`);
  exige([0, 1].includes(resuelveCruce(60, 60).ganador), "el cruce no devuelve un ganador válido");
  // jugar la liga entera lleva a playoffs (top 8) y a un campeón
  const sl = mkSuperliga("Test SC", 64, "#fff");
  exige(sl.equipos.length === 16 && sl.equipos[0].tuyo === true, "la liga debería tener 16 clubes con el tuyo el primero");
  let g = 0; while (sl.fase === "liga" && g++ < 60) jugarJornadaLiga(sl);
  exige(sl.fase === "playoff" && sl.playoff.ronda === "cuartos", "al acabar la liga no arrancan los cuartos de playoff");
  exige(sl.playoff.cuartos.length === 4, "los cuartos deberían tener 4 cruces (top 8)");
  exige(sl.tabla.every(t => t.pj === 30), "no todos los equipos han jugado sus 30 partidos");
  exige(sl.tabla.reduce((s, t) => s + t.pts, 0) === 8 * 30 * 3, "los puntos totales no cuadran con las victorias");
  jugarPlayoff(sl); exige(sl.playoff.ronda === "semis", "tras los cuartos no se llega a semis");
  jugarPlayoff(sl); exige(sl.playoff.ronda === "final", "tras las semis no se llega a la final");
  jugarPlayoff(sl); exige(sl.fase === "fin" && sl.playoff.campeon != null, "no se corona un campeón");
  return `${cal.length} jornadas; campeón #${sl.playoff.campeon}; fuerte gana ${ganaFuerte}/300`;
});

comprueba("Superliga: plantilla y alineación de tus 3 parejas", () => {
  const sl = mkSuperliga("Test SC", 62, "#fff");
  sl.plantilla = mkPlantillaSuperliga();
  exige(sl.plantilla.length === 6, "la plantilla debería tener 6 jugadores");
  sl.alin = [[0, 1], [2, 3], [4, 5]];
  sincronizaClubSL(sl);
  const tu = sl.equipos.find(e => e.tuyo);
  exige(Array.isArray(tu.parejas) && tu.parejas.length === 3, "no se calculan las 3 fuerzas de tu club");
  exige(tu.parejas[0] >= tu.parejas[1] && tu.parejas[1] >= tu.parejas[2], "las fuerzas de pareja no van ordenadas");
  exige(tu.fuerza > 0, "la fuerza del club no se deriva de la alineación");
  // reasignar mantiene 2 jugadores por pareja y mueve al jugador
  reasignaPareja(sl.alin, 4, 0);   // el jugador 4 pasa a la pareja 1
  exige(sl.alin.every(p => p.length === 2), "una pareja se queda con distinto número de jugadores");
  exige(sl.alin[0].includes(4), "el jugador no se movió a la pareja destino");
  const todos = new Set(sl.alin.flat());
  exige(todos.size === 6, "se ha perdido o duplicado algún jugador al reasignar");
  // una mejor alineación da más fuerza: subir el nivel de dos jugadores sube la fuerza del club
  const antes = (sincronizaClubSL(sl), sl.equipos.find(e => e.tuyo).fuerza);
  ATTR_KEYS.forEach(k => { sl.plantilla[0].attrs[k] = 95; sl.plantilla[1].attrs[k] = 95; });
  sincronizaClubSL(sl);
  exige(sl.equipos.find(e => e.tuyo).fuerza > antes, "mejorar la plantilla no sube la fuerza del club");
  // el enfrentamiento usa las parejas reales del equipo
  const fuerte = { parejas: [90, 88, 85] }, flojo = { parejas: [50, 48, 45] };
  let gf = 0; for (let i = 0; i < 200; i++) if (resuelveCruceEquipos(fuerte, flojo).ganador === 0) gf++;
  exige(gf > 150, `el equipo con mejores parejas debería ganar la mayoría (${gf}/200)`);
  return `fuerza club ${sl.equipos.find(e => e.tuyo).fuerza}; equipo fuerte gana ${gf}/200`;
});

comprueba("Superliga: economía, objetivo, desarrollo y fichajes", () => {
  const at = (n) => { const o = {}; ATTR_KEYS.forEach(k => o[k] = n); return o; };
  // premios: mejor posición paga más; campeón/finalista suman bonus
  exige(premioSuperliga(1) > premioSuperliga(16), "el 1º debería cobrar más que el 16º");
  const sl = mkSuperliga("Test SC", 62, "#fff");
  sl.plantilla = mkPlantillaSuperliga(); sl.alin = [[0, 1], [2, 3], [4, 5]]; sincronizaClubSL(sl);
  // salarios positivos y coherentes con el nivel
  exige(salariosSuperliga(sl.plantilla) > 0, "los salarios deberían ser positivos");
  // cierre de temporada: la caja cambia por premios menos salarios y evalúa el objetivo
  let g = 0; while (sl.fase === "liga" && g++ < 60) jugarJornadaLiga(sl);
  while (sl.fase === "playoff") jugarPlayoff(sl);
  const cajaAntes = sl.caja, res = cierreTempSuperliga(sl);
  exige(res.caja === cajaAntes + res.premio - res.sal, "la caja no cuadra con premios y salarios");
  exige(typeof res.objetivoCumplido === "boolean" && res.pos >= 1 && res.pos <= 16, "no calcula posición/objetivo");
  // desarrollo: un joven con techo alto mejora al pasar de temporada. Se compara
  // la SUMA de atributos (no la media redondeada): evolucionaPlantillaSL sube un
  // atributo en +1/+2, y mirar la media redondeada hacía el test no determinista
  // (si las subidas caían todas en +1, la media redondeada no cambiaba).
  const suma = (a) => ATTR_KEYS.reduce((s, k) => s + a[k], 0);
  const joven = { n: "Joven", edad: 20, pot: 90, attrs: at(60), estilo: "constructor", lado: 0 };
  const sumaAntes = suma(joven.attrs);
  evolucionaPlantillaSL([joven]);   // edad 20→21 (≤24) y muy por debajo del techo: mejora seguro
  exige(suma(joven.attrs) > sumaAntes, "un joven con techo alto debería mejorar con el tiempo");
  // fichaje: paga con caja y entra en la plantilla; sin caja, no
  sl.caja = 100000; const antesN = sl.plantilla.length;
  const cand = { n: "Fichaje", edad: 24, pot: 80, attrs: at(66), estilo: "agresivo", lado: 1 };
  const f1 = ficharSL(sl, cand);
  exige(f1.ok === true && sl.plantilla.length === antesN + 1 && sl.caja < 100000, "el fichaje no entra o no descuenta caja");
  sl.caja = 0;
  exige(ficharSL(sl, { n: "Caro", attrs: at(80) }).ok === false, "no debería poder fichar sin caja");
  return `premio 1º ${premioSuperliga(1)}€; cierre ${res.pos}º, caja ${res.caja}€`;
});

comprueba("Analítica: sin la base lista muestra un aviso claro", () => {
  abrirAnalitica();
  const cuerpo = document.getElementById("analiticaCuerpo");
  exige(cuerpo.innerHTML.indexOf("no está lista") >= 0, "no se avisa de que la base de datos aún no está lista");
  return "aviso de reserva correcto sin sql.js";
});

comprueba("IA de clubes: personalidad de mercado y movimientos de temporada", () => {
  nuevaCarrera("agresivo");
  // el mercado de cada club se deriva de su filosofía
  exige(mercadoDeClub(3) === "cantera", "no se detecta un club de cantera");
  exige(mercadoDeClub(1) === "rico", "no se detecta un club rico");
  exige(mercadoDeClub(5) === "vendedor", "no se detecta un club vendedor");
  exige(mercadoDeClub(0) === "conservador", "no se detecta un club conservador");
  // a lo largo de varias temporadas, los clubes mueven el mercado
  const w = G.world;
  const noticias = [];
  for (let t = 0; t < 40; t++) accionesDeClub(w, noticias);
  exige(noticias.length > 0, "los clubes no hacen ningún movimiento en 40 intentos");
  // invariantes: los clubes siguen siendo válidos y los atributos, en rango
  let mal = 0;
  w.parejas.forEach(p => {
    if (p.club < 0 || p.club >= CLUBES_NPC.length) mal++;
    (p.jug || []).forEach(j => ATTR_KEYS.forEach(k => { if (j.attrs && (j.attrs[k] < 25 || j.attrs[k] > 96)) mal++; }));
  });
  exige(mal === 0, mal + " incoherencias tras los movimientos de club");
  return noticias.length + " movimientos de club en 40 temporadas simuladas";
});

comprueba("Club: fundar y competir", () => {
  const cl = fundarClub();
  exige(cl.plantilla.length === 2, "la plantilla no se creó");
  exige(cl.dinero >= 0, "el club nace en números rojos");
  const sl = slotSemana(semanaTemp());
  abrirTorneo(sl.fip);
  jugarTorneoEntero();
  return "club fundado con " + cl.dinero + "€";
});

comprueba("Club: una alineación imposible se repara sola (regresión)", () => {
  fundarClub();
  G.clubG.alin = [0, 7];          // apunta a un jugador que no existe
  exige(alineacion(), "miTeam se queda sin pareja con una alineación inválida");
  G.clubG.alin = null;
  exige(alineacion(), "alineación nula no se repara");
  return "reparada en los dos casos";
});

/* Limpia las ranuras y devuelve la ranura de destino a la 1. Sin esto último,
   un caso que abra la ranura 3 deja apuntando ahí al siguiente, y la partida
   nueva del caso de al lado se guarda donde no toca. */
function limpiaRanuras(modo) {
  for (let n = 1; n <= N_RANURAS; n++) borrarSlot(modo || "carrera", n);
  if (!modo) for (let n = 1; n <= N_RANURAS; n++) borrarSlot("club", n);
  _slotDestino = 1;
}

comprueba("Guardado: con partida empezada se puede elegir 'nueva' (regresión WebView)", () => {
  limpiaRanuras();
  nuevaCarrera("agresivo");
  guardar();
  exige(slotInfo("carrera", 1), "la partida no se guardó");
  G = null;
  abrirModo("carrera");
  // la ranura 1 está ocupada, así que la 2 debe ofrecer empezar de cero
  const btn = document.getElementById("mmNueva2");
  exige(btn && btn.onclick, "el selector no ofrece empezar una partida nueva");
  btn.onclick();                  // aquí es donde antes reventaba por .remove()
  exige(slotInfo("carrera", 1), "empezar una nueva borró la partida guardada antes de tiempo");
  return "selector correcto y guardado intacto";
});

comprueba("Guardado: 'continuar' recupera la partida", () => {
  limpiaRanuras();
  const c = nuevaCarrera("agresivo");
  const nombre = c.nombre;
  guardar();
  G = null;
  abrirModo("carrera");
  const btn = document.getElementById("mmCont1");
  exige(btn && btn.onclick, "el selector no ofrece continuar");
  btn.onclick();
  exige(G && G.carrera && G.carrera.nombre === nombre, "no se recuperó la partida");
  return "partida recuperada";
});

comprueba("Ranuras: tres partidas por modo, independientes entre sí", () => {
  limpiaRanuras();
  const nombres = [];
  for (let n = 1; n <= N_RANURAS; n++) {
    G = null; _slotDestino = n;
    const c = nuevaCarrera("agresivo");
    nombres.push(c.nombre);
    guardar();
    exige(G._slot === n, "la partida no recuerda su ranura: " + G._slot);
  }
  // las tres existen y cada una guarda a quien le toca
  for (let n = 1; n <= N_RANURAS; n++) {
    const inf = slotInfo("carrera", n);
    exige(inf && !inf.roto, "la ranura " + n + " no se guardó");
    exige(inf.nombre === nombres[n - 1], "la ranura " + n + " tiene el nombre de otra: " + inf.nombre);
  }
  // avanzar en una NO toca a las demás
  G = null; abrirModo("carrera");
  document.getElementById("mmCont2").onclick();
  G.carrera.semana += 4; guardar();
  exige(slotInfo("carrera", 2).semana === 5, "la ranura 2 no avanzó");
  exige(slotInfo("carrera", 1).semana === 1, "avanzar en la 2 movió la 1");
  exige(slotInfo("carrera", 3).semana === 1, "avanzar en la 2 movió la 3");
  // borrar una deja las otras
  borrarSlot("carrera", 2);
  exige(!slotInfo("carrera", 2), "borrar no vació la ranura");
  exige(slotInfo("carrera", 1) && slotInfo("carrera", 3), "borrar una se llevó las demás");
  limpiaRanuras();
  return N_RANURAS + " ranuras independientes";
});

comprueba("Ranuras: la primera es la clave de siempre (guardados antiguos)", () => {
  // Una partida guardada antes de que existieran las ranuras vive en
  // "rpm_carrera_v1" sin sufijo; tiene que aparecer como ranura 1 sin migrar nada.
  limpiaRanuras();
  exige(slotKey("carrera", 1) === SLOTS.carrera, "la ranura 1 cambió de clave: " + slotKey("carrera", 1));
  exige(slotKey("carrera") === SLOTS.carrera, "sin número debería ser la ranura 1");
  exige(slotKey("carrera", 2) !== SLOTS.carrera, "la ranura 2 pisa la clave antigua");
  nuevaCarrera("agresivo");
  const viejo = JSON.stringify(G); const nombre = G.carrera.nombre;
  G = null; limpiaRanuras();
  lsSet(SLOTS.carrera, viejo);                     // simula el guardado antiguo
  const inf = slotInfo("carrera", 1);
  exige(inf && inf.nombre === nombre, "el guardado antiguo no aparece como ranura 1");
  limpiaRanuras();
  return "compatible sin migración";
});

comprueba("Importar: valida el fichero antes de tocar la ranura", () => {
  limpiaRanuras();
  const c = nuevaCarrera("agresivo"); guardar();
  const bueno = JSON.stringify(G); const nombre = c.nombre;
  G = null; limpiaRanuras();

  // lo que NO debe entrar
  exige(importarPartida("esto no es json", "carrera", 1) === "imp_err_formato", "acepta texto que no es JSON");
  exige(importarPartida("[1,2,3]", "carrera", 1) === "imp_err_formato", "acepta un JSON que no es una partida");
  exige(importarPartida(bueno, "club", 1) === "imp_err_modo", "acepta una carrera como si fuera un club");
  exige(importarPartida(JSON.stringify({ modo: "carrera", carrera: {} }), "carrera", 1) === "imp_err_incompleta", "acepta una carrera sin nombre");
  exige(importarPartida(JSON.stringify({ modo: "carrera", carrera: { nombre: "X", semana: 1 } }), "carrera", 1) === "imp_err_mundo", "acepta una partida sin mundo");
  exige(!slotInfo("carrera", 1), "un fichero inválido dejó algo escrito en la ranura");

  // lo que sí
  exige(importarPartida(bueno, "carrera", 3) === null, "rechaza una partida válida");
  const inf = slotInfo("carrera", 3);
  exige(inf && inf.nombre === nombre, "la partida importada no se lee bien");
  // y se puede continuar de verdad
  G = null; abrirModo("carrera");
  document.getElementById("mmCont3").onclick();
  exige(G && G.carrera && G.carrera.nombre === nombre, "no se puede continuar lo importado");
  exige(G._slot === 3, "lo importado no se abre en su ranura");
  limpiaRanuras();
  return "ida y vuelta completa";
});

comprueba("Avisos: se pueden dar desde el menú, sin partida abierta", () => {
  // avisa() llamaba a ent(), que hacía G.modo con G a null y reventaba. Salta
  // desde el selector de ranuras, que vive en el menú: importar una partida
  // escribía el fichero pero moría antes de repintar, y la ranura recién
  // importada seguía apareciendo vacía.
  G = null;
  exige(ent() === null, "ent() debería devolver null sin partida abierta");
  avisa("prueba desde el menú");     // no debe lanzar
  avisa("prueba con tipo", "ok");
  return "avisa() tolera G nulo";
});

comprueba("Ranuras: una partida corrupta se muestra y se puede borrar", () => {
  limpiaRanuras();
  lsSet(slotKey("carrera", 2), "{roto");
  const inf = slotInfo("carrera", 2);
  exige(inf && inf.roto, "una ranura ilegible debería marcarse como rota, no desaparecer");
  G = null; abrirModo("carrera");   // el selector debe pintarse sin reventar con basura dentro
  borrarSlot("carrera", 2);
  exige(!slotInfo("carrera", 2), "no se pudo borrar la ranura rota");
  limpiaRanuras();
  return "visible y recuperable";
});

comprueba("Trofeos: la sala reúne la carrera entera sin reventar", () => {
  const c = nuevaCarrera("agresivo");
  // una carrera vivida, con de todo
  c.vd = { v: 120, d: 60 }; c.recMajors = 2; c.fans = 30000; c.edad = 27;
  c.palmares = ["Corona · París (T4)", "Élite 1 · Madrid (T3)", "Continental Oro (T2)", "Maestros · Barcelona (T5)"];
  c.hist = [{ t: 1, pos: 70, pts: 100, tit: 0 }, { t: 2, pos: 30, pts: 900, tit: 1 }, { t: 3, pos: 9, pts: 3000, tit: 2 }];
  c.hitosOk = { v1: 1, tit1: 2, top30: 2, top10: 3 };
  c.h2h = { 10: { n: "A/B", v: 3, d: 7 }, 11: { n: "C/D", v: 5, d: 2 } };
  c.nemesis = { id: 10, elim: 3 };
  c.parejasHist = [{ n: "C. Hinojosa", desde: 1, hasta: 2, temps: 2, titulos: 1, motivo: "ruptura" }];
  pintarTrofeos();
  const html = document.getElementById("trofeosCuerpo").innerHTML;
  exige(html.length > 500, "la sala sale casi vacía: " + html.length + " caracteres");
  // las secciones importantes tienen que estar
  ["trf_hd_vitrina", "trf_hd_hitos", "trf_hd_h2h", "trf_hd_parejas"].forEach(k => {
    exige(html.indexOf(t(k).split("·")[0].trim()) >= 0, "falta la sección " + k);
  });
  exige(!/\btrf_[a-z_]+/.test(html), "alguna clave se queda sin traducir en la sala");
  exige(html.indexOf("120-60") >= 0, "no aparece el balance de partidos");
  exige(html.indexOf("#9") >= 0, "no aparece el mejor puesto del historial");
  return "sala completa con " + c.palmares.length + " títulos";
});

comprueba("Trofeos: el palmarés se agrupa bien, incluidos los nombres viejos", () => {
  const g = trofeosPorCategoria([
    "Corona · Roma (T3)", "MAJOR París (T1)",            // nuevo y viejo: los dos son Corona
    "Maestros · Barcelona (T4)", "Tour Finals (T2)",      // ídem
    "Élite 1 · Madrid (T3)", "Premier P1 · Doha (T1)",    // ídem
    "Continental Oro (T2)", "FIP Gold (T1)",              // ídem
    "Open del barrio (T1)",
  ]);
  exige(g.corona.length === 2, "Coronas mal agrupadas: " + g.corona.length);
  exige(g.maestros.length === 2, "Maestros mal agrupados: " + g.maestros.length);
  exige(g.elite.length === 2, "Élite mal agrupada: " + g.elite.length);
  exige(g.continental.length === 2, "Continental mal agrupado: " + g.continental.length);
  exige(g.otros.length === 1, "lo que no encaja debería ir a otros");
  return "5 categorías, con guardados nuevos y viejos";
});

comprueba("Trofeos: la sala también funciona en club y sin datos", () => {
  // recién empezada: no debe reventar aunque no haya nada que enseñar
  const c = nuevaCarrera("agresivo");
  c.hist = []; c.palmares = []; c.h2h = {}; c.hitosOk = {};
  pintarTrofeos();
  exige(document.getElementById("trofeosCuerpo").innerHTML.indexOf(t("trf_sin_titulos")) >= 0,
    "una carrera nueva debería decir que la vitrina está vacía");
  // el gráfico necesita dos temporadas: con una no se pinta y no pasa nada
  exige(trofeosGrafico([{ t: 1, pos: 50, pts: 0, tit: 0 }]) === "", "con una sola temporada no debería haber gráfico");
  exige(trofeosGrafico([]) === "", "sin historial no debería haber gráfico");
  exige(trofeosGrafico([{ t: 1, pos: 50 }, { t: 2, pos: 20 }]).indexOf("<svg") === 0, "con dos temporadas sí");
  // y en modo club
  fundarClub();
  pintarTrofeos();
  exige(document.getElementById("trofeosCuerpo").innerHTML.length > 300, "la sala del club sale vacía");
  return "carrera vacía y club";
});

comprueba("Cuadro: el torneo tiene un cuadro de 16 con siembra", () => {
  const c = nuevaCarrera("agresivo");
  c.pts = 99999;                       // nº1: te toca ser cabeza de serie
  abrirTorneo(6);
  const cu = torneo.cuadro;
  exige(cu, "el torneo no genera cuadro");
  exige(cu.ronda[2].length === CUADRO_N, `el cuadro tiene ${cu.ronda[2].length} y no ${CUADRO_N}`);
  exige(cu.mi >= 0, "tu pareja no está en el cuadro");
  // sin repetidos: nadie juega dos veces en la misma ronda
  const ids = cu.ronda[2].filter(p => p && !p.yo).map(p => p.id);
  exige(new Set(ids).size === ids.length, "hay parejas repetidas en el cuadro");
  // el mejor sembrado va a una punta y el segundo a la otra: no se cruzan antes de la final
  exige(cu.mi === 0, "el nº1 del ranking debería estar sembrado en la primera casilla, está en " + cu.mi);
  // tu rival de octavos sale del cuadro, no de una tirada suelta
  const rival = torneo.rivales[2];
  exige(rival && rival === cu.ronda[2][1], "el rival de octavos no viene del cuadro");
  return `${CUADRO_N} parejas, sembrado en la casilla ${cu.mi}`;
});

comprueba("Cuadro: el resto del torneo también juega, ronda a ronda", () => {
  /* OJO: esta prueba comprueba la MECÁNICA del cuadro, no que tú ganes. Antes
     ponía los atributos a 95 y daba por hecho llegar a la final; con el motor
     equilibrado eso ya no es seguro (ni debe serlo), así que se juega hasta
     donde se llegue y se comprueban las rondas que se hayan resuelto. Se
     reintenta con otra semilla si caes a la primera, porque con una sola ronda
     no hay nada que mirar. */
  let c, cu, octavos, rivales, llegue;
  for (let intento = 0; intento < 6; intento++) {
    c = nuevaCarrera("agresivo");
    c.pts = 99999;
    ATTR_KEYS.forEach(k => { c.attrs[k] = 95; c.compi.attrs[k] = 95; });
    rndSemilla(4100 + intento * 97, 4100 + intento * 97);
    abrirTorneo(6);
    cu = torneo.cuadro;
    octavos = cu.ronda[2].filter(Boolean).length;
    rivales = [];
    let v = 0;
    while (torneo && v++ < 6) {
      rivales.push({ fase: torneo.fase, riv: torneo.rivales[torneo.fase] });
      empezarPartido(false);
      pulsarFicha();
    }
    llegue = rivales.length;
    if (llegue >= 3) break;   // al menos octavos, cuartos y semis: hay rondas que mirar
  }
  exige(llegue >= 2, "no se pudo pasar de la primera ronda en seis intentos");
  // las rondas que se han disputado tienen que haberse resuelto enteras
  for (let f = 3; f < 2 + llegue; f++) {
    const esperados = octavos / Math.pow(2, f - 2);
    exige(cu.ronda[f] && cu.ronda[f].filter(Boolean).length === esperados,
      `la ronda ${f} no se resuelve entera: ${cu.ronda[f] ? cu.ronda[f].filter(Boolean).length : "—"} de ${esperados}`);
  }
  // cada rival tuyo tiene que haber ganado su cruce anterior
  rivales.forEach(({ fase, riv }) => {
    if (!riv || fase < 3) return;
    exige(cu.ronda[fase].includes(riv), `el rival de la fase ${fase} no había ganado su partido`);
  });
  // nadie eliminado reaparece más adelante
  const enSemis = new Set((cu.ronda[4] || []).filter(Boolean).map(p => p.yo ? "yo" : p.id));
  (cu.ronda[5] || []).filter(Boolean).forEach(p => {
    exige(enSemis.has(p.yo ? "yo" : p.id), "una pareja llega a la final sin haber jugado la semifinal");
  });
  return `${octavos} en octavos → ${(cu.ronda[5] || []).filter(Boolean).length} en la final`;
});

comprueba("Cuadro: el favorito gana casi siempre, pero la campanada existe", () => {
  // probGana es la que decide los cruces entre parejas del ordenador
  exige(Math.abs(probGana(70, 70) - .5) < 1e-9, "a igual nivel debería ser 50%");
  exige(probGana(82, 70) > .85 && probGana(82, 70) < .96, "12 puntos de ventaja deberían dar ~90%: " + probGana(82, 70).toFixed(3));
  exige(probGana(70, 82) < .15, "y al revés");
  exige(probGana(95, 40) < 1, "nunca debería ser certeza absoluta");
  exige(probGana(40, 95) > 0, "la campanada nunca debería ser imposible");
  // en 2000 cruces con 8 puntos de diferencia, el flojo gana alguna vez
  let sorpresas = 0;
  for (let i = 0; i < 2000; i++) if (rnd() >= probGana(78, 70)) sorpresas++;
  exige(sorpresas > 100 && sorpresas < 700, `${sorpresas}/2000 campanadas: el equilibrio se ha ido`);
  return `8 puntos de ventaja → ${(100 - sorpresas / 20).toFixed(0)}% para el favorito`;
});

comprueba("Contenido: los catálogos tienen volumen para una carrera larga", () => {
  // Antes: 3 dilemas, 7 lesiones, 4 reformas, 11+9 hitos. Una carrera de diez
  // temporadas los agotaba y empezaba a repetir de forma visible.
  exige(DILEMAS.length >= 15, `solo ${DILEMAS.length} dilemas`);
  exige(LESIONES.length >= 12, `solo ${LESIONES.length} lesiones`);
  exige(Object.keys(REFORMAS).length >= 8, `solo ${Object.keys(REFORMAS).length} reformas`);
  exige(HITOS_CARRERA.length >= 16, `solo ${HITOS_CARRERA.length} hitos de carrera`);
  exige(HITOS_CLUB.length >= 14, `solo ${HITOS_CLUB.length} hitos de club`);
  // sin ids repetidos, que romperían el seguimiento de hitos y dilemas
  const dup = (arr) => arr.filter((x, i) => arr.indexOf(x) !== i);
  exige(!dup(DILEMAS.map(d => d.id)).length, "dilemas con id repetido: " + dup(DILEMAS.map(d => d.id)));
  exige(!dup(HITOS_CARRERA.map(h => h.id)).length, "hitos de carrera repetidos: " + dup(HITOS_CARRERA.map(h => h.id)));
  exige(!dup(HITOS_CLUB.map(h => h.id)).length, "hitos de club repetidos: " + dup(HITOS_CLUB.map(h => h.id)));
  exige(!dup(LESIONES.map(l => l.k)).length, "lesiones repetidas: " + dup(LESIONES.map(l => l.k)));
  // el muro de fans y el mercado de staff se leen muchas más veces que un dilema:
  // ahí la repetición canta antes que en ningún otro sitio
  const nPosts = Object.values(POSTS_FAN).reduce((n, a2) => n + a2.length, 0);
  const nStaff = Object.values(FRASES_STAFF).reduce((n, a2) => n + a2.length, 0);
  exige(nPosts >= 90, `solo ${nPosts} posts de fans`);
  exige(nStaff >= 72, `solo ${nStaff} frases de staff`);
  exige(SOCIAL_USERS.length >= 30, `solo ${SOCIAL_USERS.length} usuarios en el muro`);
  Object.entries(POSTS_FAN).forEach(([k, arr]) => exige(arr.length >= 6, `la categoría ${k} solo tiene ${arr.length} posts`));
  exige(!dup(SOCIAL_USERS).length, "usuarios del muro repetidos: " + dup(SOCIAL_USERS));
  const todos = Object.values(POSTS_FAN).flat();
  exige(!dup(todos).length, "posts de fans repetidos entre categorías: " + dup(todos));
  return `${DILEMAS.length} dilemas · ${nPosts} posts · ${nStaff} frases de staff · ${LESIONES.length} lesiones · ${HITOS_CARRERA.length + HITOS_CLUB.length} hitos`;
});

comprueba("Contenido: todos los dilemas se pueden pintar y resolver", () => {
  const c = nuevaCarrera("agresivo");
  // un protagonista con de todo, para que se cumplan las condiciones
  c.dinero = 500; c.fans = 3000; c.energia = 80; c.pro = true; c.edad = 31;
  c.vd = { v: 20, d: 5 }; c.compiMoral = 70;
  c.sponsor = { marca: "Nébula", sem: 300, tier: 2 };
  c.staff = c.staff || {}; c.staff.entrenador = { n: "R. Vela", sal: 200, niv: 3 };
  let pintados = 0;
  DILEMAS.forEach(d => {
    // el texto debe resolverse sin lanzar y sin dejar claves crudas a la vista
    const tit = d.titulo(c), tx = d.texto(c);
    exige(tit && tx, `${d.id}: título o texto vacío`);
    exige(!/^dil_/.test(tit), `${d.id}: el título se queda en la clave (${tit})`);
    exige(!/^dil_/.test(tx), `${d.id}: el texto se queda en la clave`);
    exige(d.ops.length >= 2, `${d.id}: menos de dos opciones`);
    d.ops.forEach((o, i) => {
      const ot = o.txt(c), od = o.desc(c);
      exige(ot && !/^dil_/.test(ot), `${d.id} op${i}: opción sin traducir (${ot})`);
      exige(od && !/^dil_/.test(od), `${d.id} op${i}: descripción sin traducir`);
      if (o.dif) exige(o.dif.txt(c) && !/^dil_/.test(o.dif.txt(c)), `${d.id} op${i}: consecuencia sin traducir`);
    });
    pintados++;
  });
  exige(pintados === DILEMAS.length, "algún dilema no se pudo pintar");

  // y resolverlos de verdad muta al protagonista sin romper nada
  DILEMAS.forEach(d => {
    const antes = { dinero: c.dinero, fans: c.fans };
    c.dilemaActivo = { id: d.id, sem: 1 };
    const r = aplicarOpcionDilema(c, 0, 1);
    exige(r && r.op, `${d.id}: no se pudo resolver`);
    exige(Number.isFinite(c.dinero) && Number.isFinite(c.fans), `${d.id} deja valores no numéricos`);
    exige(c.fans >= 0, `${d.id} deja los seguidores en negativo`);
    c.dinero = antes.dinero; c.fans = antes.fans;
  });
  return DILEMAS.length + " dilemas pintados y resueltos";
});

comprueba("Contenido: las reformas se declaran al fundar y cuestan de menos a más", () => {
  const cl = fundarClub();
  Object.keys(REFORMAS).forEach(k => {
    exige(k in cl.reformas, `el club nace sin declarar la reforma ${k}`);
    exige(cl.reformas[k] === false, `la reforma ${k} nace ya construida`);
    exige(REFORMAS[k].coste > 0, `la reforma ${k} no cuesta nada`);
  });
  // el catálogo va escalonado: la primera se alcanza pronto y la última es meta
  const costes = Object.values(REFORMAS).map(r => r.coste);
  exige(Math.min(...costes) <= 6000, "no hay ninguna reforma asequible de salida");
  exige(Math.max(...costes) >= 15000, "falta una reforma que sea una meta de verdad");
  return `${costes.length} reformas de ${Math.min(...costes)}€ a ${Math.max(...costes)}€`;
});

comprueba("Circuito: 90 parejas por categoría y se debuta por el puesto 91", () => {
  const c = nuevaCarrera("agresivo");
  exige(G.world.parejas.length === WORLD_N, `el circuito tiene ${G.world.parejas.length}, esperaba ${WORLD_N}`);
  const porSexo = { M: 0, F: 0 };
  G.world.parejas.forEach(p => porSexo[p.sexo || "M"]++);
  exige(porSexo.M === porSexo.F, `categorías desiguales: ${porSexo.M}M / ${porSexo.F}F`);
  exige(porSexo.M >= 80 && porSexo.M <= 100, `deberían ser 80-100 por categoría, hay ${porSexo.M}`);
  // el jugador debuta por el fondo del ranking, no a mitad de tabla
  const puesto = miPuesto();
  exige(puesto >= 80, `se debuta demasiado arriba: puesto ${puesto}`);
  exige(puesto <= porSexo.M + 1, `puesto imposible: ${puesto} de ${porSexo.M + 1}`);
  return `${WORLD_N} parejas · ${porSexo.M} por categoría · debut en el ${puesto}`;
});

comprueba("Circuito: el nivel cubre toda la escalera en ambas categorías", () => {
  nuevaCarrera("agresivo");
  ["M", "F"].forEach(sx => {
    const niveles = G.world.parejas.filter(p => (p.sexo || "M") === sx).map(p => nivelPareja(p));
    const min = Math.min(...niveles), max = Math.max(...niveles);
    // si el nivel se repartiera por índice global, cada sexo tendría media escalera
    exige(min <= 45, `${sx}: la pareja más floja está en ${min}, debería haber novatos`);
    exige(max >= 80, `${sx}: la mejor pareja está en ${max}, falta la élite`);
  });
  return "de novato a élite en las dos categorías";
});

comprueba("Circuito: las parejas se reparten por TODOS los clubes", () => {
  nuevaCarrera("agresivo");
  repartirClubes();
  const porClub = {};
  G.world.parejas.forEach(p => { porClub[p.club] = (porClub[p.club] || 0) + 1; });
  const usados = Object.keys(porClub).length;
  exige(usados === CLUBES_NPC.length, `solo ${usados} de ${CLUBES_NPC.length} clubes tienen parejas`);
  // clubAlAzar() debe poder devolver cualquier índice, no solo los 9 primeros
  const vistos = new Set();
  for (let i = 0; i < 3000; i++) vistos.add(clubAlAzar());
  exige(vistos.size === CLUBES_NPC.length, `clubAlAzar solo alcanza ${vistos.size} de ${CLUBES_NPC.length} clubes`);
  exige(Math.max(...vistos) === CLUBES_NPC.length - 1, "clubAlAzar no llega al último club");
  return `${CLUBES_NPC.length} clubes, todos con plantilla`;
});

comprueba("Circuito: los nombres respetan la bandera del jugador", () => {
  nuevaCarrera("agresivo");
  // muestras de repertorios inconfundibles
  const marcas = {
    "🇸🇪": /Lindqvist|Bergström|Sandberg|Nyström|Åkerlund|Hedlund|Sjöberg|Wallin|Ekström|Holmberg|Dahl/,
    "🇶🇦": /\bAl-/,          // el nombre va abreviado ("R. Al-Hajri"), no anclar al principio
    "🇳🇱": /Van Dijk|De Vries|Bakker|Visser|Hoekstra|Kuipers|Van Leeuwen|Smits|Verhoeven|Blom/,
  };
  let comprobados = 0;
  G.world.parejas.forEach(p => (p.jug || []).forEach(j => {
    const re = marcas[j.pais];
    if (!re || p.pro) return;                 // la élite lleva nombres escritos a mano
    comprobados++;
    exige(re.test(j.n), `${j.pais} con nombre que no es de ahí: ${j.n}`);
  }));
  exige(comprobados >= 3, "casi no salieron jugadores de esos países para comprobar (" + comprobados + ")");
  // y el generador acepta países sin repertorio propio sin reventar
  exige(nombrePorSexo("M", "🇯🇵").length > 0, "un país sin repertorio debería caer al español");
  exige(apellidoPais("🇯🇵").length > 0, "apellido de país sin repertorio");
  return comprobados + " jugadores con nombre acorde a su bandera";
});

comprueba("Circuito: el mundo grande se genera y simula rápido", () => {
  const t0 = Date.now();
  nuevaCarrera("agresivo");
  const tMundo = Date.now() - t0;
  const t1 = Date.now();
  for (let i = 0; i < 26; i++) simCircuito([]);
  const tSim = Date.now() - t1;
  const kb = Math.round(JSON.stringify(G).length / 1024);
  // márgenes anchos: la prueba es contra una regresión de orden de magnitud,
  // no contra el ruido de una máquina más lenta
  exige(tMundo < 2000, `generar el mundo tarda ${tMundo}ms`);
  exige(tSim < 2000, `26 semanas de circuito tardan ${tSim}ms`);
  exige(kb < 400, `la partida ocupa ${kb} KB, demasiado para localStorage con 3 ranuras`);
  return `mundo ${tMundo}ms · 26 semanas ${tSim}ms · ${kb} KB`;
});

comprueba("Pádel: todas las parejas combinan drive y revés", () => {
  nuevaCarrera("agresivo");
  let mal = 0;
  G.world.parejas.forEach(p => {
    if (p.jug && p.jug[0].lado !== undefined && p.jug[0].lado === p.jug[1].lado) mal++;
  });
  exige(mal === 0, mal + " parejas llevan dos jugadores del mismo lado");
  exige(quimicaLado({ jug: [{ lado: 0 }, { lado: 1 }] }) > quimicaLado({ jug: [{ lado: 1 }, { lado: 1 }] }),
        "combinar lados no da ventaja");
  return G.world.parejas.length + " parejas bien formadas";
});

comprueba("Mercado: el técnico del nº1 no se va a un proyecto de cola", () => {
  nuevaCarrera("agresivo");
  const c = G.carrera;
  c.dinero = 999999;
  c.mercadoStaff = mkMercadoStaff();
  const conEquipo = c.mercadoStaff.filter(s => s.equipoDe);
  exige(conEquipo.length > 0, "no hay entrenadores del circuito en la bolsa");
  const mejor = conEquipo.sort((a, b) => puestoDePareja(a.equipoDe) - puestoDePareja(b.equipoDe))[0];
  exige(clausulaEntrenador(mejor) > 20000, "la cláusula del técnico del nº1 es demasiado barata");
  const antes = c.staff.entrenador;
  ficharStaff(c.mercadoStaff.indexOf(mejor));
  exige(c.staff.entrenador === antes, "el técnico del nº1 aceptó un proyecto de cola con solo pagar");
  return "cláusula " + clausulaEntrenador(mejor) + "€ y rechaza el proyecto";
});

comprueba("Club: el entrenador se puede contratar en modo club", () => {
  fundarClub();
  G.clubG.mercadoStaff = mkMercadoStaff();
  exige(rolesDeModo().indexOf("entrenador") >= 0, "el club no ofrece el puesto de entrenador");
  const libres = G.clubG.mercadoStaff.filter(s => s.rol === "entrenador" && !s.equipoDe);
  exige(libres.length > 0, "no hay entrenadores libres para el club");
  return libres.length + " entrenadores libres";
});

comprueba("Circuito: ningún club acumula demasiadas parejas", () => {
  nuevaCarrera("agresivo");
  let peor = 0;
  ["M", "F"].forEach(sx => {
    CLUBES_NPC.forEach((_, i) => {
      const n = G.world.parejas.filter(p => p.club === i && (p.sexo || "M") === sx).length;
      if (n > peor) peor = n;
    });
  });
  exige(peor <= 4, "hay un club con " + peor + " parejas del mismo sexo");
  return CLUBES_NPC.length + " clubes, máximo " + peor + " parejas por club y sexo";
});

comprueba("Escritorio: el panel de mando se rellena en carrera y en club", () => {
  nuevaCarrera("agresivo");
  pintarCarrera();
  const hud = document.getElementById("hud");
  exige(hud.innerHTML.length > 300, "el panel lateral queda vacío en carrera");
  exige(hud.innerHTML.indexOf("Puesto") >= 0, "el panel no muestra el puesto");
  exige(hud.innerHTML.indexOf("Equipo técnico") >= 0, "el panel no muestra el equipo técnico");
  fundarClub();
  pintarClubM();
  exige(hud.innerHTML.indexOf("Instalaciones") >= 0, "el panel no se adapta al modo club");
  return "panel completo en ambos modos";
});

/* ===================== DIFICULTAD ===================== */

comprueba("Dificultad: tres perfiles bien formados y fallback seguro", () => {
  ["accesible", "manager", "experto"].forEach(id => {
    const p = PERFILES_DIF[id];
    exige(p && p.id === id, "falta el perfil " + id);
    exige(typeof p.lesion === "number" && typeof p.economia === "number" && typeof p.junta === "number", "perfil " + id + " sin multiplicadores");
    exige(p.emoji, "perfil " + id + " sin emoji");
    exige(difNombre(id) && difDesc(id), "perfil " + id + " sin textos i18n");
  });
  exige(perfilDif("no-existe") === PERFILES_DIF[DIF_DEF], "un id desconocido no cae al perfil por defecto");
  return DIF_DEF + " por defecto; 3 perfiles";
});

comprueba("Dificultad: G.dif manda sobre la preferencia del menú", () => {
  const prev = (typeof G !== "undefined" && G) ? G.dif : undefined;
  try {
    localStorage.setItem("rpm_dif", "accesible");
    G = { dif: "experto" };
    exige(difId() === "experto", "G.dif debería tener prioridad sobre localStorage");
    exige(dif().id === "experto", "dif() no refleja la dificultad de la partida");
    G = null;
    exige(difId() === "accesible", "sin partida debería mandar la preferencia del menú");
  } finally {
    localStorage.removeItem("rpm_dif");
    G = (prev !== undefined) ? { dif: prev } : null;
  }
  return "prioridad partida > menú > defecto";
});

comprueba("Dificultad: la economía escala accesible > mánager > experto", () => {
  const g = G; G = null;
  try {
    const eco = id => { G = { dif: id }; return ecoIngreso(1000); };
    const a = eco("accesible"), m = eco("manager"), x = eco("experto");
    exige(a > m && m > x, `orden económico incorrecto: ${a}/${m}/${x}`);
    exige(m === 1000, "en mánager el premio no debería alterarse");
    return `1000€ → ${a} / ${m} / ${x}`;
  } finally { G = g; }
});

comprueba("Dificultad: el riesgo de lesión sube con la exigencia y se acota", () => {
  const g = G; G = null;
  try {
    const k = id => { G = { dif: id }; return kLesion(0.3); };
    exige(k("experto") > k("manager") && k("manager") > k("accesible"), "el riesgo no ordena por dificultad");
    G = { dif: "experto" };
    exige(kLesion(2) <= 0.95, "el riesgo de lesión no está acotado");
    exige(kLesion(0) === 0, "riesgo base 0 debe seguir siendo 0");
    return "experto > mánager > accesible, tope 0.95";
  } finally { G = g; }
});

comprueba("Dificultad: la junta afloja o aprieta el objetivo top-N", () => {
  const g = G; G = null;
  try {
    const t = id => { G = { dif: id }; return juntaTop(8); };
    exige(t("accesible") > t("manager") && t("manager") > t("experto"), "el objetivo no se ajusta por dificultad");
    exige(t("manager") === 8, "en mánager el objetivo base no debería cambiar");
    G = { dif: "experto" };
    exige(juntaTop(1) >= 1, "el objetivo no puede bajar de top 1");
    return `top 8 → ${t("accesible")} / ${t("manager")} / ${t("experto")}`;
  } finally { G = g; }
});

comprueba("Dificultad: cada partida nueva fija su propia dificultad en G.dif", () => {
  try {
    localStorage.setItem("rpm_dif", "experto");
    nuevaCarrera("agresivo");
    exige(G.dif === "experto", "la carrera no hereda la dificultad elegida en el menú");
    exige(G.superliga === undefined && G.modo === "carrera", "estado de carrera inconsistente");
  } finally { localStorage.removeItem("rpm_dif"); }
  return "G.dif = experto en la partida nueva";
});

comprueba("Dificultad: la Superliga nace con el objetivo de junta ajustado", () => {
  const g = G;
  try {
    localStorage.setItem("rpm_dif", "experto"); G = null;
    const dura = mkSuperliga("Test", 62, "#C6F53C").objetivo;
    localStorage.setItem("rpm_dif", "accesible");
    const blanda = mkSuperliga("Test", 62, "#C6F53C").objetivo;
    exige(blanda > dura, `accesible (${blanda}) debería exigir un top más holgado que experto (${dura})`);
    return `experto top ${dura} · accesible top ${blanda}`;
  } finally { localStorage.removeItem("rpm_dif"); G = g; }
});

comprueba("Dificultad: el selector del menú marca y persiste la elección", () => {
  try {
    setDif("experto");
    exige(localStorage.getItem("rpm_dif") === "experto", "setDif no persiste la preferencia");
    const cont = document.getElementById("selDif");
    exige(cont.innerHTML.indexOf("difchip") >= 0, "el selector no se pinta");
    exige(cont.innerHTML.indexOf('aria-pressed="true"') >= 0, "ningún chip queda marcado como activo");
    setDif("bla-bla");
    exige(localStorage.getItem("rpm_dif") === "experto", "un id inválido no debería cambiar la preferencia");
  } finally { localStorage.removeItem("rpm_dif"); }
  return "chip activo y persistencia correctos";
});

/* ===================== IDIOMAS (i18n) ===================== */

comprueba("Idiomas: los cinco están disponibles con nombre y bandera", () => {
  const ids = IDIOMAS.map(l => l.id).sort().join(",");
  exige(ids === "de,en,es,fr,it", "faltan idiomas: " + ids);
  IDIOMAS.forEach(l => exige(l.n && l.bandera, "idioma " + l.id + " sin nombre o bandera"));
  return "fr/en/es/de/it";
});

comprueba("Idiomas: cada idioma traduce todas las claves de la portada", () => {
  const claves = Object.keys(I18N[IDIOMA_DEF]);
  IDIOMAS.forEach(l => {
    claves.forEach(k => exige(I18N[l.id] && I18N[l.id][k] != null && I18N[l.id][k] !== "", `${l.id} sin traducir "${k}"`));
  });
  return claves.length + " claves × 5 idiomas";
});

comprueba("Idiomas: t() traduce y cae con red de seguridad", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(idiomaActual() === "en", "no toma el idioma guardado");
    exige(t("dif_label") === "Difficulty", "no traduce al inglés");
    exige(t("clave-que-no-existe") === "clave-que-no-existe", "una clave desconocida debería devolverse tal cual");
    localStorage.setItem("rpm_idioma", "zz-inventado");
    exige(idiomaActual() === IDIOMA_DEF, "un idioma inválido debería caer al por defecto");
    exige(t("dif_label") === "Dificultad", "sin idioma válido debería usar español");
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "traduce, fallback de idioma y de clave";
});

comprueba("El último baile: declive diferenciado, oficio y legado", () => {
  // 1) antes de los 31 no declina nadie
  const at = () => ({ fondo: 70, globo: 70, chiquita: 70, volea: 70, dejada: 70, bandeja: 70, vibora: 70, remate: 70, pared: 70 });
  const joven = at();
  exige(aplicaDeclive(joven, 27) === 0, "un jugador de 27 no debería declinar");
  // 2) lo explosivo cae ANTES y MÁS que el toque (Monte Carlo con rnd real)
  let expl = 0, toque = 0;
  for (let i = 0; i < 400; i++) {
    const a = at(); aplicaDeclive(a, 35);
    expl += (70 - a.remate) + (70 - a.vibora) + (70 - a.bandeja) + (70 - a.volea);
    toque += (70 - a.chiquita) + (70 - a.dejada) + (70 - a.globo) + (70 - a.fondo);
  }
  exige(expl > toque * 1.5, `lo explosivo debería caer bastante más que el toque (${expl} vs ${toque})`);
  // 3) el declive se acelera con la edad
  let d33 = 0, d41 = 0;
  for (let i = 0; i < 300; i++) { const a = at(), b = at(); d33 += aplicaDeclive(a, 33); d41 += aplicaDeclive(b, 41); }
  exige(d41 > d33 * 1.4, `a los 41 se debería perder mucho más que a los 33 (${d41} vs ${d33})`);
  // 4) OFICIO: sin temporadas no hace nada; con carrera larga reduce el error en presión alta
  exige(factorOficio({ hist: [] }, .9) === 1, "sin temporadas no debería haber oficio");
  exige(factorOficio({ hist: new Array(12).fill({}) }, .2) === 1, "sin presión el oficio no debería actuar");
  const fo = factorOficio({ hist: new Array(12).fill({}) }, 1);
  exige(fo < 1 && fo >= .75, "el oficio debería reducir el error entre 0 y 25%: " + fo);
  // 5) puertas de la retirada
  exige(!puedeRetirarse({ edad: 30 }), "a los 30 no se puede anunciar la retirada");
  exige(puedeRetirarse({ edad: 34 }), "a los 34 sí se puede");
  exige(!puedeRetirarse({ edad: 34, ultimoBaile: 3 }), "no se puede anunciar dos veces");
  exige(retiroForzado({ edad: 45 }) && !retiroForzado({ edad: 40 }), "el retiro forzado no cae donde debe");
  // 6) legado: rangos y rival más repetido
  const leyenda = legadoDe({ edad: 38, hist: [{ pos: 1 }], palmares: [], recMajors: 6, h2h: {} }, { n1hist: [{ yo: true }, { yo: true }, { yo: true }] });
  exige(leyenda.rango === "leyenda" && leyenda.n1 === 3, "no reconoce una leyenda: " + leyenda.rango);
  const modesto = legadoDe({ edad: 35, hist: [{ pos: 44 }], palmares: [], recMajors: 0, h2h: {} }, { n1hist: [] });
  exige(modesto.rango === "promesa", "no clasifica una carrera modesta: " + modesto.rango);
  const conRival = legadoDe({ edad: 35, hist: [{ pos: 12 }], palmares: ["a", "b", "c"], h2h: { 5: { v: 2, d: 1, n: "Poca" }, 9: { v: 4, d: 5, n: "Mucha" } } }, { n1hist: [] });
  exige(conRival.rival && conRival.rival.nombre === "Mucha" && conRival.rival.n === 9, "no identifica al rival más repetido");
  exige(conRival.mejorPuesto === 12, "no calcula el mejor puesto");
  return `explosivo ${expl} vs toque ${toque}; oficio ${fo.toFixed(2)}; rangos ok`;
});

comprueba("Archirrival: se declara al eliminarte, manda en la presión y cierra el legado", () => {
  // hace falta ELIMINAR, no solo ganar: 5 derrotas normales no bastan sin eliminaciones
  exige(candidatoNemesis({ 1: { v: 0, d: 5, n: "Solo derrotas" } }) === null, "no debería declararse sin eliminaciones");
  exige(candidatoNemesis({ 1: { v: 1, d: 2, elim: 2, n: "Casi" } }) === null, "con 2 eliminaciones aún no");
  const c1 = candidatoNemesis({ 1: { v: 1, d: 3, elim: 3, n: "Justo" } });
  exige(c1 && c1.nombre === "Justo" && c1.elim === 3, "a las 3 eliminaciones debería declararse");
  // desempate: gana quien más te ha eliminado; a igualdad, quien lo hizo en fases altas
  const c2 = candidatoNemesis({ 1: { v: 0, d: 4, elim: 4, n: "Cuatro" }, 2: { v: 0, d: 9, elim: 3, altaElim: 3, n: "Tres" } });
  exige(c2.nombre === "Cuatro", "debería ganar quien más elimina: " + c2.nombre);
  const c3 = candidatoNemesis({ 1: { v: 0, d: 4, elim: 3, altaElim: 0, n: "Rondas bajas" }, 2: { v: 0, d: 4, elim: 3, altaElim: 2, n: "Fases altas" } });
  exige(c3.nombre === "Fases altas", "a igualdad debería pesar la fase alta: " + c3.nombre);
  // no se destrona al archirrival actual si el nuevo no le supera
  const carrera = { h2h: { 1: { v: 0, d: 4, elim: 4, n: "Actual" }, 2: { v: 0, d: 3, elim: 3, n: "Aspirante" } }, nemesis: { id: "1", elim: 4 } };
  exige(nuevoNemesis(carrera) === null, "un aspirante con menos eliminaciones no debería destronar");
  carrera.h2h[2].elim = 5;
  exige(nuevoNemesis(carrera).nombre === "Aspirante", "con más eliminaciones sí debería destronar");
  // presión: solo contra él, y crece con las eliminaciones
  exige(presionNemesis(carrera, "9") === 0, "no debería haber presión extra contra otro rival");
  const p4 = presionNemesis({ nemesis: { id: "1", elim: 4 } }, "1");
  const p6 = presionNemesis({ nemesis: { id: "1", elim: 6 } }, "1");
  exige(p4 > 0 && p6 > p4 && p6 <= .14, `la presión debería crecer y estar acotada (${p4} → ${p6})`);
  // el legado cierra con el archirrival aunque otro se haya cruzado más veces
  const L = legadoDe({ edad: 36, hist: [{ pos: 8 }], palmares: ["a"], h2h: { 1: { v: 1, d: 4, n: "Nemesis" }, 2: { v: 9, d: 9, n: "Muy visto" } }, nemesis: { id: "1", nombre: "Nemesis" } }, { n1hist: [] });
  exige(L.rival.nombre === "Nemesis" && L.rival.nemesis === true, "el legado debería cerrar con el archirrival: " + L.rival.nombre);
  return `declarado a las ${NEMESIS_ELIM} eliminaciones; presión ${p4.toFixed(2)}→${p6.toFixed(2)}`;
});

comprueba("Superliga: la invitación llega sola a partir del segundo año", () => {
  // el primer año no llega nunca, por muy bueno que seas
  exige(probInvitacionSL(60, 1, 0) === 0, "no debería haber invitación en la temporada 1");
  exige(evaluaInvitacionSL({}, 1, () => 0) === null, "la temporada 1 nunca invita");
  // a partir del segundo, la probabilidad sube con el prestigio
  const bajo = probInvitacionSL(0, 2, 0), alto = probInvitacionSL(60, 2, 0);
  exige(alto > bajo && bajo > 0, `el prestigio debería pesar (${bajo} vs ${alto})`);
  // y con los años de espera, y si ya dijiste que no, insisten
  exige(probInvitacionSL(30, 6, 0) > probInvitacionSL(30, 2, 0), "esperar años debería subir la probabilidad");
  exige(probInvitacionSL(30, 3, 2) > probInvitacionSL(30, 3, 0), "tras rechazar deberían insistir más");
  exige(probInvitacionSL(60, 12, 5) <= .85, "la probabilidad debe estar acotada");
  // no se invita a quien ya está dentro ni si hay una carta sobre la mesa
  exige(evaluaInvitacionSL({ enSuperliga: true }, 5, () => 0) === null, "no debería invitar a quien ya juega la Superliga");
  exige(evaluaInvitacionSL({ invitacionSL: { pendiente: true } }, 5, () => 0) === null, "no debería duplicar la invitación pendiente");
  // con rnd forzado sí llega, y trae la temporada
  const inv = evaluaInvitacionSL({}, 4, () => 0);
  exige(inv && inv.pendiente === true && inv.temporada === 4, "la invitación no llega con rnd favorable");
  // el club se convierte en equipo: 6 jugadores, 3 parejas y fuerza real
  const mk = n => ({ n, attrs: { fondo: 70, globo: 70, chiquita: 70, volea: 70, dejada: 70, bandeja: 70, vibora: 70, remate: 70, pared: 70 } });
  const sl = clubASuperliga({ nombre: "Mi Club", color: "#fff", dinero: 30000, plantilla: [mk("a"), mk("b"), mk("c")] });
  exige(sl.plantilla.length === 6, "debería completar hasta 6 jugadores: " + sl.plantilla.length);
  exige(sl.alin.length === 3 && sl.equipos[0].n === "Mi Club" && sl.equipos[0].tuyo === true, "el equipo propio no se monta bien");
  exige(sl.caja === 30000 && sl.desdeClub && sl.desdeClub.nombre === "Mi Club", "no arrastra caja ni procedencia");
  return `T1 imposible; prestigio ${bajo.toFixed(2)}→${alto.toFixed(2)}; club convertido a 3 parejas`;
});

comprueba("La pareja como personaje: acuerdo, retirada e historia común", () => {
  // sin acuerdo firmado no hay nada que exigir
  exige(evaluaAcuerdoCompi({ compi: { n: "X" } }, 10) === null, "sin acuerdo no debería evaluar nada");
  // cumplirlo sube la moral; incumplirlo la baja, y más cuanto más lejos quedaste
  const ok = evaluaAcuerdoCompi({ compi: { _acuerdo: { objetivo: 15 } } }, 9);
  exige(ok.cumplido && ok.delta > 0, "cumplir el acuerdo debería subir la moral");
  const malRoce = evaluaAcuerdoCompi({ compi: { _acuerdo: { objetivo: 15 } } }, 18);
  const malLejos = evaluaAcuerdoCompi({ compi: { _acuerdo: { objetivo: 15 } } }, 40);
  exige(!malRoce.cumplido && malRoce.delta < 0, "incumplir debería bajar la moral");
  exige(malLejos.delta < malRoce.delta, `quedarse lejos debería doler más (${malLejos.delta} vs ${malRoce.delta})`);
  exige(malLejos.delta >= -20, "el castigo debe estar acotado");
  // retirada: imposible antes de los 35, segura a edades altas
  exige(!compiSeRetira({ edad: 33 }, () => 0), "un compañero de 33 no debería retirarse");
  exige(compiSeRetira({ edad: 36 }, () => 0), "con rnd favorable a los 36 sí");
  exige(!compiSeRetira({ edad: 36 }, () => .99), "con rnd desfavorable a los 36 no");
  let ret38 = 0, ret42 = 0;
  for (let i = 0; i < 400; i++) { if (compiSeRetira({ edad: 38 })) ret38++; if (compiSeRetira({ edad: 42 })) ret42++; }
  exige(ret42 > ret38, `la retirada debería ser más probable a los 42 (${ret42} vs ${ret38})`);
  // etapa de pareja: se cierra con sus años y títulos
  const et = cierraEtapaPareja({ compi: { n: "Chino" }, _parejaDesde: 2, _parejaTitulos: 3, quimica: 80 }, 5, "ruptura");
  exige(et.n === "Chino" && et.desde === 2 && et.hasta === 5 && et.temps === 4 && et.titulos === 3, "la etapa no se cierra bien: " + JSON.stringify(et));
  // la mejor pareja es la que más títulos dio; a igualdad, la más duradera
  const mejor = mejorPareja([{ n: "A", titulos: 2, temps: 6 }, { n: "B", titulos: 5, temps: 2 }, { n: "C", titulos: 5, temps: 4 }]);
  exige(mejor.n === "C", "no elige la mejor pareja: " + mejor.n);
  return `acuerdo ${ok.delta}/${malLejos.delta}; retiro 38→${ret38} 42→${ret42}; etapa de ${et.temps} temporadas`;
});

comprueba("Circuito: las categorías guardan claves y se traducen", () => {
  exige(CATS.length === 8, "deberían seguir siendo 8 categorías");
  CATS.forEach((c, i) => {
    exige(c.k === "cat_" + i, "la categoría " + i + " no guarda su clave: " + JSON.stringify(c.k));
    exige(c.n === undefined, "la categoría " + i + " conserva un nombre literal");
  });
  // catNombre resuelve por índice y por objeto, y cambia con el idioma
  exige(catNombre(0) === catNombre(CATS[0]), "catNombre no acepta índice y objeto por igual");
  const es = CATS.map((_, i) => catNombre(i));
  try {
    localStorage.setItem("rpm_idioma", "de");
    const de = CATS.map((_, i) => catNombre(i));
    exige(de[6] === "Krone" && de[7] === "Meister", "las categorías no se traducen: " + de.join("/"));
    exige(de.every(x => x && x.indexOf("cat_") < 0), "alguna categoría se queda en la clave sin traducir");
  } finally { localStorage.removeItem("rpm_idioma"); }
  return es.join(" · ");
});

/* El juego se vende: no puede llevar los nombres reales del circuito ni de
   otros productos. Esta prueba mira el texto que VE el jugador, en los cinco
   idiomas, más los literales del código. */
comprueba("Circuito: no aparecen marcas de terceros en ningún idioma", () => {
  // Las marcas van siempre en mayúscula inicial, así que la comparación es
  // sensible a la caja: en francés "premier tableau" es el ordinal y es legítimo.
  const PROHIBIDAS = [/\bFIP\b/, /\bPremier\b/, /\bMAJOR\b/, /Tour Finals/i, /Football Manager/i, /World Padel/i];
  const malas = [];
  for (const idioma of ["es", "en", "fr", "de", "it"]) {
    const dicc = I18N[idioma];
    for (const [k, v] of Object.entries(dicc)) {
      if (typeof v !== "string") continue;
      // Al principio de frase el francés escribe "Premier titre" con mayúscula
      // y sigue siendo el ordinal: se descarta si le sigue palabra en minúscula
      const texto = idioma === "fr" ? v.replace(/\bPremier(?= [a-zà-ÿ])/g, "…") : v;
      PROHIBIDAS.forEach(re => { if (re.test(texto)) malas.push(idioma + "." + k + ": " + v.slice(0, 60)); });
    }
  }
  exige(!malas.length, malas.slice(0, 6).join(" | "));
  return Object.keys(I18N.es).length + " claves × 5 idiomas limpias";
});

comprueba("Circuito: el hito de título Élite usa contador y respeta guardados viejos", () => {
  const c = nuevaCarrera("agresivo");
  exige(!tituloElite(c), "de inicio no debería haber título Élite");
  // partida nueva: manda el contador, no el texto del palmarés
  c.palmares.push("Continental Oro (T1)");
  exige(!tituloElite(c), "un título Continental no debería contar como Élite");
  c.recTitElite = 1;
  exige(tituloElite(c), "el contador no activa el hito");
  // partida vieja: no tiene contador, pero su palmarés lleva los nombres de antes
  const viejo = { recTitElite: 0, palmares: ["Premier P1 · Roma (T3)"] };
  exige(tituloElite(viejo), "un guardado antiguo con título Premier pierde su hito");
  exige(!tituloElite({ palmares: ["FIP Gold (T2)"] }), "un FIP antiguo no era título Premier");
  return "contador + compatibilidad";
});

comprueba("Idiomas: los catálogos de datos guardan CLAVES, no frases", () => {
  // los catálogos que se pintan deben referenciar claves i18n existentes en los
  // 5 idiomas; si alguien mete una frase suelta, esto lo caza
  const revisa = (nombre, claves) => claves.forEach(k => {
    exige(typeof k === "string", `${nombre}: entrada que no es clave`);
    exige(I18N.es[k] !== undefined, `${nombre}: clave inexistente «${k}»`);
    ["en", "fr", "de", "it"].forEach(l => exige(I18N[l][k], `${nombre}: falta ${k} en ${l}`));
  });
  revisa("FRASES_STAFF", Object.values(FRASES_STAFF).flat());
  revisa("SPOT_TIPOS", SPOT_TIPOS);
  revisa("LESIONES", LESIONES.map(l => l.k));
  revisa("HITOS_CARRERA", HITOS_CARRERA.map(h => "hito_ca_" + h.id));
  revisa("HITOS_CLUB", HITOS_CLUB.map(h => "hito_cl_" + h.id));
  revisa("REFORMAS", Object.keys(REFORMAS).flatMap(k => ["ref_" + k, "ref_" + k + "_d"]));
  revisa("ATTR_KEYS", ATTR_KEYS.map(k => "at_" + k));
  revisa("MARCAS (sectores)", [...new Set(MARCAS.map(m => m.sec))]);
  revisa("RASGOS", Object.values(RASGOS).flatMap(r => [r.n, r.desc]));
  revisa("CATS", CATS.map(c => c.k));
  revisa("PRIMAS_CAT", [...new Set(Object.values(PRIMAS_CAT).flat().map(p => "prima_" + p[0]))]);
  revisa("TUTO", TUTO.carrera.concat(TUTO.club).flat());
  // y ningún sector de marca puede haber quedado como frase en español
  exige(MARCAS.every(m => /^sec_\d+$/.test(m.sec)), "alguna marca guarda el sector como texto en vez de clave");
  return `${MARCAS.length} marcas, ${LESIONES.length} lesiones, ${HITOS_CARRERA.length + HITOS_CLUB.length} hitos y el resto de catálogos por clave`;
});

comprueba("Idiomas: catálogo completo y sin claves huérfanas en los 5 idiomas", () => {
  // toda clave definida en español existe en los otros 4 y no está vacía
  const claves = Object.keys(I18N.es);
  exige(claves.length > 700, "el catálogo español parece incompleto: " + claves.length);
  const faltan = [];
  ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => {
    if (typeof I18N[l][k] !== "string" || !I18N[l][k].length) faltan.push(l + ":" + k);
  }));
  exige(faltan.length === 0, "claves sin traducir: " + faltan.slice(0, 8).join(", "));
  // y ningún idioma tiene claves que no estén en español (huérfanas por typo)
  const huerfanas = [];
  ["en", "fr", "de", "it"].forEach(l => Object.keys(I18N[l]).forEach(k => {
    if (!(k in I18N.es)) huerfanas.push(l + ":" + k);
  }));
  exige(huerfanas.length === 0, "claves huérfanas: " + huerfanas.slice(0, 8).join(", "));
  // las claves con interpolación deben llevar los mismos campos en todos los idiomas
  const campos = s => (s.match(/\{(\w+)\}/g) || []).sort().join(",");
  const desajuste = [];
  claves.forEach(k => {
    const ref = campos(I18N.es[k]);
    ["en", "fr", "de", "it"].forEach(l => { if (campos(I18N[l][k]) !== ref) desajuste.push(l + ":" + k); });
  });
  exige(desajuste.length === 0, "interpolaciones desalineadas: " + desajuste.slice(0, 8).join(", "));
  return `${claves.length} claves × 5 idiomas, interpolaciones alineadas`;
});

comprueba("Idiomas: golpes y frases del staff en el idioma activo", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(atNombre("fondo") === "baseline" && atNombre("remate") === "smash" && atNombre("pared") === "wall play",
      "los nombres de golpe no se traducen: " + atNombre("fondo"));
    exige(atLista(["globo", "volea"]).join("/") === "lob/volley", "atLista no traduce la lista de especialidades");
    // mkStaff guarda la frase como CLAVE, no como texto
    const st = mkStaff("fisio", 3);
    exige(FRASES_STAFF.fisio.indexOf(st.frase) >= 0, "mkStaff no guarda la frase como clave i18n: " + st.frase);
    exige(FRASES_STAFF.fisio.length >= 12, "el catálogo de frases se quedó corto: " + FRASES_STAFF.fisio.length);
    exige(t(st.frase) !== st.frase && /[a-z]/i.test(t(st.frase)), "la frase del staff no resuelve a texto");
    // fallback: un guardado antiguo con la frase literal sigue mostrándose
    exige(t("Manos de oro, agenda llena.") === "Manos de oro, agenda llena.", "el fallback de frases antiguas no funciona");
    localStorage.setItem("rpm_idioma", "es");
    exige(atNombre("vibora") === "víbora", "los golpes no vuelven al español");
    // todos los golpes y todas las frases del catálogo tienen clave en los 5 idiomas
    ATTR_KEYS.forEach(k => ["en", "fr", "de", "it"].forEach(l => exige(I18N[l]["at_" + k], `falta at_${k} en ${l}`)));
    Object.values(FRASES_STAFF).forEach(arr => arr.forEach(k => exige(I18N.es[k] && I18N.de[k], "frase de staff sin clave: " + k)));
  } finally { localStorage.removeItem("rpm_idioma"); }
  const nFr = Object.values(FRASES_STAFF).reduce((n, a2) => n + a2.length, 0);
  return "9 golpes y " + nFr + " frases de staff en 5 idiomas";
});

comprueba("Idiomas: avisos sueltos, hitos, primas y club en el idioma activo", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(t("av_wildcard", { cat: "P1", n: 1 }).includes("Wildcard used"), "el aviso de wildcard no interpola en inglés");
    exige(t("clb_junta_nuevo", { obj: 20 }) === "📋 New board goal: finish the season in the top 20.", "el aviso de la junta no sale en inglés");
    exige(t("hito_ca_major") === "Win a CROWN" && t("hito_cl_top3").includes("Podium"), "los hitos no se traducen");
    exige(t("prima_n1") === "Close as No. 1", "las primas no se traducen");
    // los hitos referencian claves existentes en ambos modos
    HITOS_CARRERA.forEach(h => exige(I18N.es["hito_ca_" + h.id] && I18N.en["hito_ca_" + h.id], "hito de carrera sin clave: " + h.id));
    HITOS_CLUB.forEach(h => exige(I18N.es["hito_cl_" + h.id] && I18N.en["hito_cl_" + h.id], "hito de club sin clave: " + h.id));
    Object.keys(REFORMAS).forEach(k => exige(I18N.es["ref_" + k] && I18N.it["ref_" + k + "_d"], "reforma sin clave: " + k));
    localStorage.setItem("rpm_idioma", "es");
    exige(t("hito_ca_major") === "Ganar una CORONA", "los hitos no vuelven al español");
    const claves = Object.keys(I18N.es).filter(k => /^(av_|ent_|fan_|hito_|prima_|clb_|ref_|rec_)/.test(k));
    exige(claves.length >= 95, "faltan claves de avisos/hitos/club: " + claves.length);
    ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => exige(typeof I18N[l][k] === "string" && I18N[l][k].length > 0, `falta ${k} en ${l}`)));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "avisos, hitos, primas, junta y reformas en 5 idiomas";
});

comprueba("Idiomas: ruptura, lesiones, gala y prensa en el idioma activo", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    // crisis de pareja: motivo y opciones traducidos
    const ev = evaluarRuptura({ compiMoral: 20, compi: { n: "Chino" }, racha: ["D", "D", "D", "D"] }, 30);
    exige(ev.crisis && /can't stomach/.test(ev.motivo.txt), "el motivo de la crisis no sale en inglés: " + ev.motivo.txt);
    exige(ev.ops[0].txt === "Honest talk" && ev.ops[ev.ops.length - 1].txt === "Accept the breakup", "las opciones no salen en inglés");
    // lesiones: nombre por clave con fallback para guardados antiguos
    exige(lesNombre({ k: "les_aquiles", n: "rotura del tendón de Aquiles" }) === "Achilles tendon rupture", "lesNombre no traduce por clave");
    exige(lesNombre({ n: "lesión antigua sin clave" }) === "lesión antigua sin clave", "lesNombre no respeta el fallback");
    exige(LESIONES.every(l => l.k && I18N.en[l.k]), "alguna lesión del catálogo no tiene clave i18n");
    localStorage.setItem("rpm_idioma", "es");
    exige(evaluarRuptura({ compiMoral: 20, compi: { n: "X" }, racha: [] }, 30).ops[0].txt === "Charla sincera", "las opciones no vuelven al español");
    const claves = Object.keys(I18N.es).filter(k => /^(rup_|les_|gala_|pr_|spot_)/.test(k));
    exige(claves.length >= 61, "faltan claves de ruptura/lesiones/gala/prensa: " + claves.length);
    ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => exige(typeof I18N[l][k] === "string" && I18N[l][k].length > 0, `falta ${k} en ${l}`)));
    SPOT_TIPOS.forEach(k => exige(I18N.es[k] && I18N.de[k], "SPOT_TIPOS referencia una clave inexistente: " + k));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "crisis, catálogo de lesiones, gala, prensa y spots en 5 idiomas";
});

comprueba("Idiomas: tutorial y panel de mando en el idioma activo", () => {
  try {
    localStorage.setItem("rpm_idioma", "de");
    exige(t("tuto_ca_1_t") === "Deine Karriere", "el primer paso del tutorial no sale en alemán");
    exige(t("tuto_paso", { i: 2, n: 6 }) === "SCHRITT 2 / 6", "el contador de pasos no interpola");
    exige(t("hud_temporada", { t: 3 }) === "Saison 3" && t("hud_caja") === "Kasse", "el HUD no se traduce");
    localStorage.setItem("rpm_idioma", "es");
    exige(t("tuto_ca_1_t") === "Tu carrera", "el tutorial no vuelve al español");
    // TUTO referencia pares de claves y todas existen en los 5 idiomas
    exige(TUTO.carrera.length === 6 && TUTO.club.length === 6, "TUTO no tiene 6+6 pasos");
    const claves = Object.keys(I18N.es).filter(k => /^(tuto_|hud_|tray_)/.test(k));
    exige(claves.length >= 43, "faltan claves de tutorial/HUD: " + claves.length);
    ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => exige(typeof I18N[l][k] === "string" && I18N[l][k].length > 0, `falta ${k} en ${l}`)));
    TUTO.carrera.concat(TUTO.club).forEach(p => exige(I18N.es[p[0]] && I18N.es[p[1]], "TUTO referencia una clave inexistente: " + p[0]));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "12 fichas del tutorial + HUD en 5 idiomas";
});

comprueba("Idiomas: mercado de parejas y objetivos en el idioma activo", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    const objs = mkObjetivosTemporada({ compi: { n: "Chino" }, palmares: [], pts: 0 }, 40);
    exige(objs[0].txt.includes("Break into the top"), "el objetivo de ranking no se crea en inglés: " + objs[0].txt);
    exige(progresoObjetivo({ palmares: [] }, objs[0], 38).txt.includes("target top"), "el progreso de ranking no sale en inglés");
    const r = evaluaOfertaCompi({ estilo: "constructor", perso: "frio", lado: 0, n: "Yo" },
      { n: "Cand", estilo: "rematador", perso: "frio", attrs: { fondo: 80, globo: 80, chiquita: 80, volea: 80, dejada: 80, bandeja: 80, vibora: 80, remate: 80, pared: 80 } }, {}, 0);
    exige(!r.acepta && r.faltan.join(" ").includes("prestige"), "los motivos de rechazo no salen en inglés: " + r.faltan.join(" | "));
    localStorage.setItem("rpm_idioma", "es");
    exige(mkObjetivosTemporada({ compi: { n: "X" }, palmares: [], pts: 0 }, 40)[0].txt.includes("Meterte en el top"), "los objetivos no vuelven al español");
    const claves = Object.keys(I18N.es).filter(k => /^(mkt_|obj_|comp_)/.test(k));
    exige(claves.length >= 49, "faltan claves de mercado/objetivos: " + claves.length);
    ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => exige(typeof I18N[l][k] === "string" && I18N[l][k].length > 0, `falta ${k} en ${l}`)));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "mercado, negociación y objetivos en 5 idiomas";
});

comprueba("Idiomas: staff y patrocinio traducidos en los 5 idiomas", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(t("rol_entrenador") === "Coach" && t("rol_ojeador") === "Scout", "los roles de staff no se traducen");
    exige(t("staff_av_firma", { ico: "🎾", n: "Ana", estrellas: "★★★", rol: "coach", sal: 300 }).includes("signs as coach"),
      "el aviso de firma no interpola en inglés");
    exige(t("patro_detalle", { sem: 100, bonus: 500, obj: 20, n: 2 }).includes("top 20"), "el detalle del contrato no interpola");
    localStorage.setItem("rpm_idioma", "es");
    exige(t("rol_entrenador") === "Entrenador", "los roles no vuelven al español");
    // las claves staff_/rol_/patro_ existen en los 5 idiomas
    const claves = Object.keys(I18N.es).filter(k => /^(staff_|rol_|patro_)/.test(k));
    exige(claves.length >= 53, "faltan claves de staff/patrocinio: " + claves.length);
    ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => exige(typeof I18N[l][k] === "string" && I18N[l][k].length > 0, `falta ${k} en ${l}`)));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "roles, avisos de fichaje y contratos en 5 idiomas";
});

comprueba("Idiomas: el informe del ojeador y el plan salen en el idioma activo", () => {
  const at = (o) => Object.assign({ fondo: 70, globo: 70, chiquita: 70, volea: 70, dejada: 70, bandeja: 70, vibora: 70, remate: 70, pared: 70 }, o || {});
  const par = { nombre: "X / Y", jug: [
    { n: "Fuerte", estilo: "constructor", perso: "frio", lado: 0, attrs: at({ fondo: 82, globo: 82, bandeja: 82, remate: 82, volea: 82, pared: 82, vibora: 82, chiquita: 82, dejada: 82 }) },
    { n: "Flojo", estilo: "constructor", perso: "emocional", lado: 1, attrs: at({ globo: 55, bandeja: 55 }) }] };
  try {
    localStorage.setItem("rpm_idioma", "en");
    const inf = informeRival(par, 84);
    const txt = inf.deb.join(" | ");
    exige(/weak link/.test(txt) && /Flojo/.test(txt), "el eslabón débil no sale en inglés: " + txt);
    exige(/emotional/.test(txt), "la lectura mental no sale en inglés");
    exige(/Load onto Flojo/.test(inf.recTxt), "el plan sugerido no sale en inglés: " + inf.recTxt);
    localStorage.setItem("rpm_idioma", "it");
    const infIt = informeRival(par, 84);
    exige(/anello debole/.test(infIt.deb.join(" | ")), "el eslabón débil no sale en italiano");
    // las claves tac_/scout_/inf_ existen en los 5 idiomas
    const claves = Object.keys(I18N.es).filter(k => /^(tac_|scout_|inf_)/.test(k));
    exige(claves.length >= 52, "faltan claves de tácticas: " + claves.length);
    ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => exige(typeof I18N[l][k] === "string" && I18N[l][k].length > 0, `falta ${k} en ${l}`)));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "informe y plan sugerido en 5 idiomas";
});

comprueba("Idiomas: los dilemas se muestran en el idioma activo", () => {
  const c = { sponsor: { marca: "PadelPro", sem: 200 }, energia: 90 };
  const d = _dilemaPorId("dubai");
  try {
    localStorage.setItem("rpm_idioma", "en");
    const tEn = d.titulo(c), o1En = d.ops[0].txt(c);
    exige(tEn.includes("PadelPro"), "el título no interpola la marca en inglés");
    exige(o1En === "Shoot the ad", "la opción 1 no está en inglés: " + o1En);
    // la consecuencia diferida se materializa en el idioma vigente al decidir
    const c2 = { sponsor: { marca: "PadelPro", sem: 200 }, energia: 90, dilemaActivo: { id: "dubai", sem: 5 } };
    const r = aplicarOpcionDilema(c2, 0, 5);
    exige(r.pend && r.pend.txt.includes("Dubai") && r.pend.txt.includes("toll"), "la consecuencia no se guarda en inglés: " + r.pend.txt);
    localStorage.setItem("rpm_idioma", "es");
    exige(d.ops[0].txt(c) === "Rodar el anuncio", "la opción 1 no vuelve al español");
    exige(d.titulo(c).includes("PadelPro"), "el título no interpola la marca en español");
    // las 24 claves dil_* existen en los 5 idiomas
    const claves = Object.keys(I18N.es).filter(k => k.indexOf("dil_") === 0);
    exige(claves.length >= 24, "faltan claves dil_* en español: " + claves.length);
    ["en", "fr", "de", "it"].forEach(l => claves.forEach(k => exige(typeof I18N[l][k] === "string" && I18N[l][k].length > 0, `falta ${k} en ${l}`)));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "títulos, opciones y consecuencias diferidas en 5 idiomas";
});

comprueba("Idiomas: los nombres de dificultad cambian con el idioma", () => {
  try {
    localStorage.setItem("rpm_idioma", "it");
    const it = difNombre("experto");
    localStorage.setItem("rpm_idioma", "es");
    const es = difNombre("experto");
    exige(it === "Esperto" && es === "Experto", `traducción de dificultad incorrecta: ${it} / ${es}`);
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "Esperto (it) · Experto (es)";
});

comprueba("Idiomas: el selector aplica el idioma y repinta el menú traducido", () => {
  try {
    setIdioma("fr");
    exige(localStorage.getItem("rpm_idioma") === "fr", "setIdioma no persiste");
    const cont = document.getElementById("selIdioma");
    exige(cont.innerHTML.indexOf('aria-pressed="true"') >= 0, "ningún idioma queda marcado");
    exige(document.getElementById("btnSuperliga").textContent.indexOf("Superligue") >= 0, "el menú no se repinta en francés");
    setIdioma("bla");
    exige(localStorage.getItem("rpm_idioma") === "fr", "un idioma inválido no debería cambiar la preferencia");
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "menú en francés y selector marcado";
});

/* ===================== BALANCE (semillas reproducibles) =====================
   Estas pruebas simulan temporadas enteras de Superliga con un RNG sembrado
   (sustituyendo Math.random) para que el resultado sea 100% reproducible. Sirven
   de red contra desequilibrios: que la economía no se descontrole, que las
   palancas de dificultad ordenen como se espera y que el objetivo de la junta no
   sea ni trivial ni imposible en la dificultad estándar. */

// mulberry32: misma semilla → misma secuencia.
/* OBSOLETO: el juego ya trae su propio generador con semilla (src/js/rng.js).
   Se conserva solo por si algún caso viejo lo llama. */
function rngSemilla(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simula `temporadas` de Superliga con una dificultad y semilla dadas. Devuelve
// métricas de balance. Determinista: no depende de Math.random del entorno.
function simulaSuperliga(dificultad, seed, temporadas) {
  const gPrev = G, estPrev = rndEstado();
  try {
    G = { dif: dificultad };
    rndSemilla(seed);          // siembra el generador del juego (antes se pisaba Math.random)
    const tuyo = { n: "Test SC", color: "#C6F53C", fuerza: 62 };
    let sl = mkSuperliga(tuyo.n, tuyo.fuerza, tuyo.color);
    sl.plantilla = mkPlantillaSuperliga();
    sl.alin = [[0, 1], [2, 3], [4, 5]];
    sincronizaClubSL(sl);
    let cumplidos = 0, titulos = 0, res = { caja: sl.caja };
    for (let temp = 0; temp < temporadas; temp++) {
      let g = 0;
      while (sl.fase === "liga" && g++ < 200) jugarJornadaLiga(sl);
      g = 0;
      while (sl.fase === "playoff" && g++ < 40) jugarPlayoff(sl);
      res = cierreTempSuperliga(sl);
      if (res.objetivoCumplido) cumplidos++;
      if (res.campeon) titulos++;
      // encadena la temporada siguiente igual que nuevaTempSuperliga, sin DOM
      const nueva = mkSuperliga(tuyo.n, tuyo.fuerza, tuyo.color);
      nueva.temporada = (sl.temporada || 1) + 1;
      nueva.plantilla = sl.plantilla; nueva.alin = sl.alin;
      nueva.caja = sl.caja; nueva.objetivo = sl.objetivo;
      sincronizaClubSL(nueva);
      sl = nueva;
    }
    return { caja: res.caja, cumplidos, titulos, objetivo: sl.objetivo, temporadas };
  } finally { rndSemilla(estPrev.semilla, estPrev.pos); G = gPrev; }
}

comprueba("Semilla: ida y vuelta del texto que ve el jugador", () => {
  [1, 12345, 4294967295, 999999999].forEach(s => {
    exige(semillaDe(semillaTxt(s)) === s, "no sobrevive la ida y vuelta: " + s + " → " + semillaTxt(s));
  });
  exige(/^[0-9A-Z]+$/.test(semillaTxt(123456789)), "la semilla debería ser legible: " + semillaTxt(123456789));
  exige(semillaDe("") === 0, "vacío debería dar 0 (y entonces se sortea una)");
  exige(semillaDe("  ") === 0, "espacios deberían dar 0");
  exige(semillaDe("no-existe-esto") >= 0, "un texto raro no debería reventar");
  exige(semillaNueva() > 0 && semillaNueva() !== semillaNueva(), "semillaNueva debería dar valores distintos");
  return "base 36 legible y reversible";
});

comprueba("Semilla: el mismo flujo da la misma secuencia, y otro flujo no", () => {
  const saca = (s, n) => { rndSemilla(s); return Array.from({ length: n }, () => rnd()); };
  const a = saca(2024, 40), b = saca(2024, 40), c = saca(2025, 40);
  exige(a.every((v, i) => v === b[i]), "la misma semilla da secuencias distintas");
  exige(a.some((v, i) => v !== c[i]), "dos semillas distintas dan lo mismo");
  exige(a.every(v => v >= 0 && v < 1), "algún valor se sale de [0,1)");
  // reanudar por posición: retomar a mitad continúa la misma secuencia
  rndSemilla(2024); for (let i = 0; i < 17; i++) rnd();
  const pos = rndEstado().pos;
  const sigue = [rnd(), rnd(), rnd()];
  rndSemilla(2024, pos);
  exige([rnd(), rnd(), rnd()].every((v, i) => v === sigue[i]), "retomar por posición no continúa la misma secuencia");
  return "secuencia estable y reanudable";
});

/* La prueba que justifica todo el ejercicio: dos carreras con la misma semilla
   tienen que vivir el mismo torneo, punto por punto. */
comprueba("Semilla: dos partidas con la misma semilla juegan el mismo torneo", () => {
  const juega = (semilla) => {
    G = null; _slotDestino = 1;
    // se teclea en el campo de la pantalla de creación, que es el camino real:
    // empezarCarrera() lee de ahí y pisa cualquier SEMILLA_ELEGIDA puesta a mano
    document.getElementById("inSemilla").value = semillaTxt(semilla);
    const c = nuevaCarrera("agresivo");
    abrirTorneo(0);
    const marcadores = [];
    let v = 0;
    while (torneo && v++ < 8) {
      empezarPartido(false);
      marcadores.push(document.getElementById("mkSets") ? "" : "");
      marcadores.push(JSON.stringify(stats && stats.pganados));
      pulsarFicha();
    }
    return { rival: c.h2h, pts: c.pts, dinero: c.dinero, marcadores: marcadores.join("|"),
             mundo: G.world.parejas.slice(0, 5).map(p => p.nombre + ":" + p.pts).join(",") };
  };
  const a = juega(777777), b = juega(777777), c = juega(888888);
  exige(a.mundo === b.mundo, "el mundo generado difiere con la misma semilla");
  exige(a.pts === b.pts && a.dinero === b.dinero, `el torneo difiere: ${a.pts}pts/${a.dinero}€ vs ${b.pts}pts/${b.dinero}€`);
  exige(a.marcadores === b.marcadores, "los partidos se juegan distinto con la misma semilla");
  exige(a.mundo !== c.mundo || a.pts !== c.pts, "dos semillas distintas dan exactamente lo mismo");
  limpiaRanuras();
  return `semilla 777777 → ${a.pts} pts, ${a.dinero}€`;
});

comprueba("Semilla: la partida la guarda y continuarla retoma el flujo donde iba", () => {
  limpiaRanuras();
  G = null; _slotDestino = 1;
  document.getElementById("inSemilla").value = semillaTxt(4242);
  nuevaCarrera("agresivo");
  exige(G.semilla === 4242, "la partida no guarda la semilla elegida: " + G.semilla);
  for (let i = 0; i < 25; i++) rnd();          // consume flujo, como haría jugar
  guardar();
  const posGuardada = G._rngS;
  exige(posGuardada === rndEstado().pos, "guardar no anota la posición del flujo");
  const siguientes = [rnd(), rnd(), rnd()];

  // continuar la partida: debe seguir por donde iba, no volver al principio
  G = null; rndSemilla(1, 1);                  // ensucia el flujo a propósito
  abrirModo("carrera");
  document.getElementById("mmCont1").onclick();
  exige(G.semilla === 4242, "al continuar se pierde la semilla");
  exige([rnd(), rnd(), rnd()].every((v, i) => v === siguientes[i]),
        "continuar no retoma el flujo: recargar y repetir daría otro resultado");
  limpiaRanuras();
  return "semilla y posición viajan con la partida";
});

comprueba("Semilla: una partida antigua sin semilla recibe una al abrirse", () => {
  limpiaRanuras();
  nuevaCarrera("agresivo"); guardar();
  // simula un guardado de antes de que existiera la semilla
  const d = JSON.parse(lsGet(slotKey("carrera", 1)));
  delete d.semilla; delete d._rngS;
  lsSet(slotKey("carrera", 1), JSON.stringify(d));
  G = null;
  abrirModo("carrera");
  document.getElementById("mmCont1").onclick();
  exige(G.semilla > 0, "una partida antigua debería recibir semilla al abrirse");
  exige(rndEstado().semilla === G.semilla, "el flujo no arranca con la semilla de la partida");
  limpiaRanuras();
  return "compatible con guardados de antes";
});

comprueba("Balance: la simulación es reproducible con la misma semilla", () => {
  const a = simulaSuperliga("manager", 12345, 5);
  const b = simulaSuperliga("manager", 12345, 5);
  exige(a.caja === b.caja && a.cumplidos === b.cumplidos && a.titulos === b.titulos, "la misma semilla da resultados distintos");
  const c = simulaSuperliga("manager", 67890, 5);
  exige(c.caja !== a.caja || c.cumplidos !== a.cumplidos, "dos semillas distintas dan lo mismo (RNG sospechoso)");
  return `semilla 12345 → caja ${a.caja}€, ${a.cumplidos}/5 objetivos`;
});

comprueba("Balance: la economía ordena accesible > mánager > experto (misma semilla)", () => {
  const seeds = [1, 7, 42, 100, 2024];
  seeds.forEach(s => {
    const a = simulaSuperliga("accesible", s, 4).caja;
    const m = simulaSuperliga("manager", s, 4).caja;
    const x = simulaSuperliga("experto", s, 4).caja;
    exige(a > m && m > x, `semilla ${s}: la caja no ordena por dificultad (${a}/${m}/${x})`);
  });
  return seeds.length + " semillas: accesible > mánager > experto";
});

comprueba("Balance: el objetivo de la junta ordena y no es degenerado", () => {
  const seeds = [1, 7, 42, 100, 2024, 555, 808, 9001];
  const temps = 4, total = seeds.length * temps;
  let A = 0, M = 0, X = 0;
  seeds.forEach(s => {
    A += simulaSuperliga("accesible", s, temps).cumplidos;
    M += simulaSuperliga("manager", s, temps).cumplidos;
    X += simulaSuperliga("experto", s, temps).cumplidos;
  });
  exige(A >= M && M >= X, `los objetivos no ordenan por dificultad: ${A}/${M}/${X}`);
  exige(M > 0 && M < total, `en mánager el objetivo es degenerado (trivial o imposible): ${M}/${total}`);
  return `objetivos cumplidos de ${total}: A${A} ≥ M${M} ≥ X${X}`;
});

comprueba("Balance: la caja no se descontrola en dificultad estándar", () => {
  const seeds = [1, 7, 42, 100, 2024, 555, 808, 9001];
  seeds.forEach(s => {
    const r = simulaSuperliga("manager", s, 6);
    exige(r.caja > -500000 && r.caja < 3000000, `semilla ${s}: caja fuera de un rango sano tras 6 temporadas (${r.caja}€)`);
  });
  return "6 temporadas × " + seeds.length + " semillas dentro de rango";
});

/* ===================== AVISOS EMERGENTES (feedback) ===================== */

comprueba("Avisos: tipoAviso clasifica por contenido", () => {
  exige(tipoAviso("🏆 ¡CAMPEONES del Major!") === "ok", "campeón debería ser ok");
  exige(tipoAviso("✔ Objetivo de la junta cumplido") === "ok", "check debería ser ok");
  exige(tipoAviso("✗ Eliminados en semifinales") === "bad", "eliminados debería ser bad");
  exige(tipoAviso("⚠ lesión: 3 semanas de baja") === "warn", "lesión debería ser warn");
  exige(tipoAviso("Semana 3 · lunes, a entrenar") === "info", "texto neutro debería ser info");
  return "ok / bad / warn / info";
});

comprueba("Avisos: avisa() guarda en el diario y emite un toast con su tipo", () => {
  const c = nuevaCarrera("agresivo");
  avisa("🏆 ¡CAMPEONES del torneo!");
  exige(c.diario[0].indexOf("CAMPEONES") >= 0, "el aviso no se guardó en el diario");
  const cont = document.getElementById("toasts");
  const ult = cont.children[cont.children.length - 1];
  exige(ult && /\bt-ok\b/.test(ult.className), "el toast no refleja el tipo ok: " + (ult && ult.className));
  return "diario + toast (t-ok)";
});

comprueba("Avisos: no se apilan más de 4 toasts a la vez", () => {
  nuevaCarrera("agresivo");
  const cont = document.getElementById("toasts");
  for (let i = 0; i < 12; i++) avisa("Aviso de prueba número " + i);
  exige(cont.children.length <= 4, "se apilaron " + cont.children.length + " toasts (máx 4)");
  return "tope de 4 respetado tras 12 avisos";
});

/* ===================== SONIDO DE NAVEGACIÓN ===================== */

comprueba("Navegación: esClicable detecta la UI interactiva y excluye lo demás", () => {
  exige(esClicable({ tagName: "BUTTON", parentElement: null }) === true, "un <button> debería ser clicable");
  exige(esClicable({ tagName: "DIV", onclick: function () {}, parentElement: null }) === true, "un div con onclick debería ser clicable");
  exige(esClicable({ tagName: "SPAN", getAttribute: () => "button", parentElement: null }) === true, "role=button debería ser clicable");
  exige(esClicable({ tagName: "SPAN", parentElement: { tagName: "BUTTON", parentElement: null } }) === true, "un hijo de <button> debería contar (closest)");
  exige(esClicable({ tagName: "INPUT", parentElement: null }) === false, "un input de texto no debería sonar");
  exige(esClicable({ tagName: "P", parentElement: null }) === false, "un párrafo suelto no debería sonar");
  return "button/a/select/onclick/role/ancestro detectados; texto e input excluidos";
});

/* ===================== JERARQUÍA VISUAL ===================== */

comprueba("Jerarquía: colAttr escala con el valor y diferencia el rango bajo", () => {
  const cols = [90, 70, 60, 48, 36, 20].map(colAttr);
  cols.forEach(c => exige(/^#[0-9A-Fa-f]{6}$/.test(c), "colAttr debería devolver un color hex: " + c));
  exige(new Set(cols).size === cols.length, "cada escalón debería dar un color distinto: " + cols.join(","));
  // antes todo lo <55 caía en un único gris; ahora 48 y 36 se distinguen
  exige(colAttr(48) !== colAttr(36), "48 y 36 deberían distinguirse");
  exige(colAttr(90) === colAttr(85), "valores de la misma banda comparten color");
  return "6 escalones distintos; rango bajo diferenciado";
});

/* ===================== PERSISTENCIA (Fase 4c) ===================== */

comprueba("Persistencia (4c): sin sql.js, guardar es seguro y no marca migración", () => {
  const c = nuevaCarrera("agresivo");
  guardar();
  exige(c === G.carrera, "la partida debería seguir activa tras guardar");
  exige(!G._vSql, "no debería marcar _vSql cuando la base SQLite no está disponible");
  return "guardado seguro sin la base; sin marca de migración";
});

comprueba("Idiomas: aplicarI18n traduce el texto marcado con data-i18n", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    const el = { at: { "data-i18n": "nav_semana" }, getAttribute(k) { return this.at[k]; }, setAttribute() {}, textContent: "Semana" };
    const elT = { at: { "data-i18n-title": "bar_export_title" }, getAttribute(k) { return this.at[k]; }, _title: "", setAttribute(k, v) { if (k === "title") this._title = v; }, textContent: "" };
    const root = { querySelectorAll(sel) { return sel.indexOf("title") >= 0 ? [elT] : [el]; } };
    aplicarI18n(root);
    exige(el.textContent === "Week", "no tradujo data-i18n: " + el.textContent);
    exige(elT._title === "Export game", "no tradujo data-i18n-title: " + elT._title);
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "data-i18n → contenido; data-i18n-title → tooltip";
});

comprueba("Idiomas: aplicarI18n traduce encabezados con formato via data-i18n-html", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    const el = { at: { "data-i18n-html": "hd_ranking_html" }, getAttribute(k) { return this.at[k]; }, setAttribute() {}, innerHTML: "", textContent: "" };
    const root = { querySelectorAll(sel) { return sel.indexOf("html") >= 0 ? [el] : []; } };
    aplicarI18n(root);
    exige(el.innerHTML.indexOf("world ranking") >= 0 && el.innerHTML.indexOf("<em>") >= 0, "no aplicó data-i18n-html: " + el.innerHTML);
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "data-i18n-html → innerHTML con <em>";
});

comprueba("Idiomas: t() interpola parámetros {campo} y diaNombre traduce", () => {
  exige(t("Semana {n}", { n: 5 }) === "Semana 5", "no interpola: " + t("Semana {n}", { n: 5 }));
  exige(diaNombre(0) === t("dia_lunes"), "diaNombre(0) debería ser el lunes");
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(diaNombre(0) === "Monday" && diaNombre(6) === "Sunday", "días no traducidos: " + diaNombre(0) + "/" + diaNombre(6));
    exige(t("Week {n}", { n: 3 }) === "Week 3", "interpolación en inglés");
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "interpolación {campo} y días de la semana";
});

comprueba("Idiomas: catálogo de estilos y personalidades traducido", () => {
  exige(estiloNombre("agresivo") === "Agresivo" && persoNombre("frio") === "Frío", "catálogo base en español");
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(estiloNombre("rematador") === "Smasher", "estilo no traducido: " + estiloNombre("rematador"));
    exige(persoNombre("valiente") === "Brave", "personalidad no traducida: " + persoNombre("valiente"));
    exige(estiloDesc("defensivo").length > 0 && persoDesc("emocional").length > 0, "faltan descripciones");
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "estilos y personalidades ES/EN";
});

comprueba("Idiomas: avisos de resultado de partido y fases traducen e interpolan", () => {
  exige(faseNombre(5) === "FINAL" && faseNombre(2) === "Octavos", "fases base en español");
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(faseNombre(2) === "Round of 16", "fase no traducida: " + faseNombre(2));
    const a = t("aviso_res_carrera", { res: "✔ Win", marc: "6-4 6-3", rival: "X", fase: "final", w: 5, e: 2 });
    exige(a === "✔ Win 6-4 6-3 vs X (final). You: 5W/2E.", "aviso mal interpolado: " + a);
    const camp = t("aviso_campeones", { torneo: "Madrid", pts: 1000, din: 5000 });
    exige(camp.indexOf("CHAMPIONS of the Madrid") >= 0 && camp.indexOf("🏆") >= 0, "campeones: " + camp);
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "avisos de partido y fases en inglés";
});

comprueba("Idiomas: avisos de inscripción y estado de semana traducen e interpolan", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(t("aviso_numeros_rojos", { din: -500 }) === "⚠ In the red (-500€). You need prize money now: every round counts.", "num rojos: " + t("aviso_numeros_rojos", { din: -500 }));
    const insc = t("aviso_inscritos", { torneo: "Madrid", wc: "", debut: t("insc_previa", { debut: "Monday" }), viaje: 60 });
    exige(insc === "📋 Entered the Madrid. Qualifying starts on Monday. Trip: 60€.", "inscritos: " + insc);
    exige(t("aviso_rivalidad", { rival: "X", v: 3, d: 1, n: 4 }).indexOf("RIVALRY with X: 3-1 in 4") >= 0, "rivalidad mal interpolada");
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "avisos de torneo/semana en inglés";
});

comprueba("Idiomas: noticias de carrera traducen e interpolan", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(t("not_debut_t", { nombre: "Jesús" }) === "Jesús, 16: a career is born", "debut: " + t("not_debut_t", { nombre: "Jesús" }));
    exige(t("not_rescinde_s", { obj: 5, pos: 9 }) === "They demanded top 5; you finished #9", "rescinde: " + t("not_rescinde_s", { obj: 5, pos: 9 }));
    exige(t("not_objetivo_t") === "Objective met", "objetivo: " + t("not_objetivo_t"));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "noticias de carrera en inglés";
});

comprueba("Idiomas: noticias de torneo traducen e interpolan", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(t("not_campanada_t") === "SHOCK RESULT!", "campanada: " + t("not_campanada_t"));
    exige(t("not_campeones_s", { entidad: "A/B", pts: 1000, premio: 5000 }) === "A/B · +1000 pts and 5000€", "campeones: " + t("not_campeones_s", { entidad: "A/B", pts: 1000, premio: 5000 }));
    exige(t("not_maldicion_s", { rival: "X", v: 1, d: 5 }).indexOf("X finally falls (1-5)") >= 0, "maldición mal interpolada");
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "noticias de torneo en inglés";
});

comprueba("Idiomas: noticias de club/estado y tiers de patrocinio traducen", () => {
  exige(tierTxt(4) === "MULTINACIONAL", "tier base");
  try {
    localStorage.setItem("rpm_idioma", "en");
    exige(tierTxt(3) === "SPORTS GIANT", "tier: " + tierTxt(3));
    exige(t("not_destituido_s", { obj: 8 }).indexOf("top 8") >= 0, "destituido mal interpolado");
    exige(t("not_n1_t") === "WORLD No. 1", "n1: " + t("not_n1_t"));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "club/estado/tiers en inglés";
});

comprueba("Idiomas: noticias de carrera con variantes aleatorias (pick) traducen", () => {
  try {
    localStorage.setItem("rpm_idioma", "en");
    ["not_mercado_v1", "not_mercado_v2", "not_mercado_v3", "not_mercado_v4"].forEach(k => exige(t(k) !== k && /[A-Za-z]/.test(t(k)), "variante sin traducir: " + k));
    exige(t("not_mercado_t", { nombre: "A/B", verbo: t("not_mercado_verbo_up"), pos: 3 }) === "A/B shoot up to #3", "mercado: " + t("not_mercado_t", { nombre: "A/B", verbo: t("not_mercado_verbo_up"), pos: 3 }));
    exige(t("not_anuncio_t", { marca: "Wilson", tipo: t("not_anuncio_default") }) === "Wilson launches an ad", "anuncio: " + t("not_anuncio_t", { marca: "Wilson", tipo: t("not_anuncio_default") }));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "variantes y contrato/mercado en inglés";
});

/* Guía de las primeras semanas -------------------------------------------
   Fallos reales que cazó la verificación en navegador y que no vuelven:
   la guía se quedaba clavada en el paso 1 (nada la despertaba al cambiar de
   pestaña) y, al arreglarlo con un salto hacia adelante, se comía media
   carrera de golpe porque `tabActiva` ya vale "semana" nada más empezar. */
function guiaLimpia() {
  ["carrera", "club"].forEach(m => localStorage.removeItem("rpm_guia_" + m));
  _guiaModo = null; _guiaPaso = 0;
  torneo = null;            // el torneo abierto de otro caso es un hito de la guía
}
function guiaId() { return guiaPasos()[_guiaPaso].id; }

comprueba("Guía: empieza por el principio aunque la pestaña ya sea la de la semana", () => {
  guiaLimpia();
  const c = nuevaCarrera();
  exige(tabActiva === "semana", "el juego debería arrancar en la pestaña Semana");
  guiaEmpieza("carrera");
  exige(_guiaModo === "carrera", "la guía no arrancó");
  exige(guiaId() === "ficha", "arrancó en el paso '" + guiaId() + "' en vez del primero");
  exige(c.semana === 1, "la carrera no empieza en la semana 1");
  return "paso 1 de 9, sin saltos";
});

comprueba("Guía: cada paso se da por hecho con su acción, no con otra", () => {
  guiaLimpia();
  const c = nuevaCarrera();
  guiaEmpieza("carrera");
  const paso = (etiqueta, hacer) => { hacer(); guiaComprueba(); return guiaId(); };
  exige(paso("jugador", () => tabActiva = "jugador") === "entreno", "tras abrir Jugador: " + guiaId());
  exige(paso("entreno", () => tabActiva = "entreno") === "golpe", "tras abrir Entreno: " + guiaId());
  exige(paso("golpe", () => c.planJug = "remate") === "semana", "tras elegir golpe: " + guiaId());
  exige(paso("semana", () => tabActiva = "semana") === "entrenar", "tras volver a Semana: " + guiaId());
  exige(paso("entrenar", () => c._sesEntreno = 1) === "inscribir", "tras entrenar: " + guiaId());
  return "5 pasos encadenados";
});

comprueba("Guía: el plan del ojeador cuenta aunque se deje en normal", () => {
  guiaLimpia();
  const c = nuevaCarrera();
  guiaEmpieza("carrera");
  tabActiva = "jugador"; guiaComprueba();
  tabActiva = "entreno"; guiaComprueba();
  c.planJug = "remate"; guiaComprueba();
  tabActiva = "semana"; guiaComprueba();
  c._sesEntreno = 1; guiaComprueba();
  abrirTorneo(0); guiaComprueba();
  exige(guiaId() === "ojeador", "no llegó al informe: " + guiaId());
  // el plan recomendado puede ser exactamente el neutro: lo que vale es haberlo tocado
  aplicarTacticaRec("normal", "repartir", "normal", "normal");
  guiaComprueba();
  exige(guiaId() === "jugar", "aplicar el plan neutro no contó: " + guiaId());
  return "el plan se marca al tocarlo";
});

comprueba("Guía: un hito posterior desatasca; el estado de la interfaz no", () => {
  guiaLimpia();
  const c = nuevaCarrera();
  guiaEmpieza("carrera");
  tabActiva = "semana"; guiaComprueba();
  exige(guiaId() === "ficha", "una pestaña no es un hito: " + guiaId());
  c.semana = 2; guiaComprueba();          // hito: se pasó de semana sin seguir la guía
  exige(guiaId() === "fin", "el hito no desatascó la guía: " + guiaId());
  return "salta solo con hechos consumados";
});

comprueba("Guía: se retoma donde estaba y no vuelve si se cierra", () => {
  guiaLimpia();
  const c = nuevaCarrera();
  guiaEmpieza("carrera");
  tabActiva = "jugador"; guiaComprueba();
  tabActiva = "entreno"; guiaComprueba();
  const donde = guiaId();
  exige(localStorage.getItem("rpm_guia_carrera") === "2", "no guardó el paso: " + localStorage.getItem("rpm_guia_carrera"));
  _guiaModo = null; _guiaPaso = 0;                       // como si se recargara la página
  guiaEmpieza("carrera");
  exige(guiaId() === donde, "no retomó en '" + donde + "' sino en '" + guiaId() + "'");
  guiaCierra();
  exige(guiaTerminada("carrera"), "cerrarla no queda registrado");
  guiaEmpieza("carrera");
  exige(_guiaModo === null, "la guía cerrada volvió a salir");
  guiaLimpia();
  return "sobrevive a la recarga, no al cierre";
});

comprueba("Guía: no pide la pareja B a un club que no tiene con quién formarla", () => {
  guiaLimpia();
  const cl = fundarClub();                 // se funda con dos jugadores
  exige(cl.plantilla.length < 4, "el club de prueba debería tener menos de cuatro");
  guiaEmpieza("club");
  cmTab = "plantilla"; guiaComprueba();
  exige(guiaId() === "panel", "pidió la pareja B siendo imposible: " + guiaId());
  guiaLimpia();
  return "el paso imposible se salta";
});

comprueba("Club: la pareja B se forma en dos clics (regresión: se borraba sola)", () => {
  const cl = fundarClub();
  while (cl.plantilla.length < 4) cl.plantilla.push({ ...cl.plantilla[0], n: "Suplente " + cl.plantilla.length });
  cl.alin = [0, 1]; cl.alinB = null;
  cl.alinB = [2];                          // primer clic: pareja a medias
  repararAlin();
  exige(cl.alinB && cl.alinB.length === 1, "el estado intermedio se borró al repintar");
  cl.alinB = [2, 3];                       // segundo clic
  repararAlin();
  exige(cl.alinB && cl.alinB.length === 2, "la pareja B completa no se conserva");
  cl.plantilla.length = 3;                 // se va el jugador elegido a medias
  cl.alinB = [3]; repararAlin();
  exige(cl.alinB === null, "un índice que ya no existe debería limpiarse");
  return "pareja B formable y a prueba de bajas";
});

/* Cuaderno de dilemas: memoria y cadenas ---------------------------------
   Antes era una bolsa de la que se sacaba al azar: la misma escena volvía tres
   veces en una temporada y ninguna decisión dejaba rastro. */
comprueba("Dilemas: una escena no se repite mientras esté fresca", () => {
  const c = nuevaCarrera();
  c.dilVistos = { furgoneta: 10 };
  const ids = dilemasDisponibles(c, 20).map(d => d.id);
  exige(ids.indexOf("furgoneta") < 0, "repitió una escena de hace 10 semanas");
  const luego = dilemasDisponibles(c, 10 + DIL_DESCANSO + 1).map(d => d.id);
  c.dinero = 500; c.pro = false;
  exige(dilemasDisponibles(c, 10 + DIL_DESCANSO + 1).some(d => d.id === "furgoneta"), "no vuelve nunca, ni pasado el descanso");
  return "descanso de " + DIL_DESCANSO + " semanas";
});

comprueba("Dilemas: los marcados como únicos no vuelven jamás", () => {
  const c = nuevaCarrera();
  c.edad = 19; c.dilVistos = { universidad: 5 };
  exige(!dilemasDisponibles(c, 5 + DIL_DESCANSO * 3).some(d => d.id === "universidad"), "un dilema único se repitió");
  return "los únicos se viven una vez";
});

comprueba("Dilemas: la decisión queda registrada y abre la escena que la sigue", () => {
  const c = nuevaCarrera();
  c.fans = 3000; c.dinero = 1000;
  c.dilemaActivo = { id: "inversor", sem: 12 };
  aplicarOpcionDilema(c, 0, 12);                    // firmar el adelanto
  exige(dilHizo(c, "inversor", 0), "la decisión no quedó registrada");
  exige(!dilHizo(c, "inversor", 1), "registró una decisión que no se tomó");
  exige((c.pendientes || []).some(p => p.abre === "cobro_inversor"), "la consecuencia no encadena");
  exige(!dilemasDisponibles(c, 13).some(d => d.id === "cobro_inversor"), "el cobro salta antes de tiempo");
  resolverPendientes(c, 18);                        // seis semanas después
  exige(c.dilemaActivo && c.dilemaActivo.id === "cobro_inversor", "el inversor no vino a cobrar");
  return "firmar hoy es un dilema dentro de seis semanas";
});

comprueba("Dilemas: las cadenas por condición solo existen si hiciste aquello", () => {
  const a = nuevaCarrera(); a.edad = 31; a.fragil = 3;
  a.decis = { infiltracion: 1 };                     // dijo que no a la infiltración
  exige(!dilemasDisponibles(a, 60).some(d => d.id === "operacion"), "la operación aparece sin haberse infiltrado");
  a.decis = { infiltracion: 0 };
  exige(dilemasDisponibles(a, 60).some(d => d.id === "operacion"), "infiltrarse no abre la operación");
  return "la resonancia es de quien se infiltró";
});

comprueba("Dilemas: un texto con nombres sobrevive a una partida sin ellos", () => {
  const c = nuevaCarrera();
  c.compi = null; c.nemesis = null;                  // guardado viejo, pareja rota
  ["nemesis_adios", "compi_oferta", "compi_boda", "hermano_compi"].forEach(id => {
    const d = _dilemaPorId(id);
    exige(d, "falta el dilema " + id);
    const tit = d.titulo(c), tx = d.texto(c);
    exige(tit && !/undefined/.test(tit), id + ": título roto (" + tit + ")");
    exige(tx && !/undefined/.test(tx), id + ": texto roto");
    d.ops.forEach(o => { if (o.dif) exige(!/undefined/.test(o.dif.txt(c)), id + ": consecuencia rota"); });
  });
  return "sin pareja y sin némesis, el modal aguanta";
});

comprueba("Dilemas: hay cuaderno para una carrera larga sin repetirse", () => {
  const c = nuevaCarrera();
  c.dinero = 4000; c.fans = 2600; c.pro = true; c.edad = 26; c.energia = 70;
  c.sponsor = { marca: "Nébula", sem: 300, tier: 2 };
  c.vd = { v: 30, d: 6 }; c.compiMoral = 60;
  const disp = dilemasDisponibles(c, 60).length;
  exige(DILEMAS.length >= 45, "el cuaderno se quedó corto: " + DILEMAS.length);
  exige(disp >= 12, "para un perfil normal solo hay " + disp + " escenas posibles");
  const ids = new Set(DILEMAS.map(d => d.id));
  exige(ids.size === DILEMAS.length, "hay ids de dilema repetidos");
  return DILEMAS.length + " dilemas, " + disp + " posibles para un profesional de 26";
});

comprueba("Narrador: la frase encaja con el final que se pinta", () => {
  // Antes había una sola bolsa de frases: el narrador decía «a la red» mientras
  // la bola moría en el cristal.
  const dentro = (k, pool) => pool.indexOf(k) >= 0;
  ["net", "out", "glass"].forEach(modo => {
    for (let i = 0; i < 30; i++) {
      const k = frasePunto(F_ERR, modo);
      exige(dentro(k, F_ERR[modo]), `error ${modo}: salió ${k}, de otra bolsa`);
      exige(I18N.es[k] && I18N.de[k], "frase de narrador sin clave: " + k);
    }
  });
  ["winner", "porTres"].forEach(modo => {
    for (let i = 0; i < 30; i++) {
      const k = frasePunto(F_WIN, modo);
      exige(dentro(k, F_WIN[modo]), `${modo}: salió ${k}, de otra bolsa`);
    }
  });
  const total = Object.values(F_ERR).flat().length + Object.values(F_WIN).flat().length;
  exige(total >= 24, "el narrador se quedó corto: " + total);
  exige(Object.values(F_PERSO).every(a => a.length >= 2), "cada personalidad necesita más de una coletilla");
  return total + " frases de punto repartidas por final";
});

comprueba("Narrador: elegir frase no toca el flujo con semilla", () => {
  // La frase es decoración: si consumiera azar de simulación, comentar o no
  // comentar cambiaría el resultado del partido siguiente.
  rndSemilla(12345, 0);
  const antes = rndEstado().pos;
  for (let i = 0; i < 50; i++) { frasePunto(F_ERR, "net"); frasePunto(F_WIN, "winner"); }
  exige(rndEstado().pos === antes, `la narración movió el flujo: ${antes} → ${rndEstado().pos}`);
  return "50 frases sin gastar una sola tirada con semilla";
});

/* La cara del club ------------------------------------------------------- */
comprueba("Club: la filosofía decide a quién convences y a qué precio", () => {
  const joven = { n: "Chaval", edad: 19, estilo: "agresivo", perso: "valiente", attrs: mkAttrsNivel(60, "agresivo") };
  const crack = { n: "Estrella", edad: 27, estilo: "rematador", perso: "frio", attrs: mkAttrsNivel(80, "rematador") };
  const casa = { filo: "cantera" }, estrellas = { filo: "estrellas" };
  exige(afinidadFilo(casa, joven) > afinidadFilo(estrellas, joven), "la cantera debería querer al chaval más que los nombres propios");
  exige(afinidadFilo(estrellas, crack) > afinidadFilo(casa, crack), "los nombres propios deberían querer al crack");
  exige(costeFichajeCl(casa, joven) < costeFichajeCl(estrellas, joven), "al que encaja debería salirle más barato");
  exige(salarioDeCl(casa, joven) < salarioDe(joven), "el que quiere venir debería pedir menos sueldo");
  // el veterano no firma en un club de cantera: no es cuestión de dinero
  const viejo = { n: "Veterano", edad: 33, estilo: "constructor", perso: "frio", attrs: mkAttrsNivel(70, "constructor") };
  exige(!fichable(casa, viejo), "un club de cantera no debería poder fichar a un jugador de 33");
  exige(fichable(estrellas, viejo), "un club de nombres propios sí debería poder");
  Object.keys(FILOS_CLUB).forEach(k => {
    exige(filoNombre(k) && !/^cfil_/.test(filoNombre(k)), "filosofía sin traducir: " + k);
    exige(filoLema(k) && !/^cfil_/.test(filoLema(k)), "lema sin traducir: " + k);
  });
  return Object.keys(FILOS_CLUB).length + " filosofías con efecto sobre el mercado";
});

comprueba("Club: la junta tiene carácter y no todas aprietan igual", () => {
  const cars = Object.keys(JUNTAS);
  exige(cars.length >= 4, "solo " + cars.length + " caracteres de junta");
  const corto = JUNTAS.corto, paciente = JUNTAS.paciente;
  exige(corto.margen < paciente.margen, "la cortoplacista debería dar menos cuerda");
  exige(corto.prima > paciente.prima, "la cortoplacista debería pagar más por cumplir");
  exige(JUNTAS.tacana.prima < paciente.prima, "la tacaña debería pagar menos");
  exige(corto.obj0 < paciente.obj0, "la cortoplacista debería pedir más desde el principio");
  cars.forEach(k => exige(juntaNombre(k) && !/^cjun_/.test(juntaNombre(k)), "junta sin traducir: " + k));
  // el sorteo devuelve siempre un carácter válido y su margen
  /* La paciencia sale del carácter, pero con un suelo de dos temporadas:
     fundar un club y ser destituido en la primera evaluación no es exigencia,
     es no dejar jugar. La cortoplacista sigue dando menos cuerda que las demás
     en cuanto la primera temporada pasa. */
  for (let i = 0; i < 30; i++) {
    const J = mkJunta();
    exige(JUNTAS[J.car], "mkJunta inventó un carácter: " + J.car);
    exige(J.paciencia === Math.max(2, JUNTAS[J.car].margen), "la paciencia no sale del carácter");
    exige(J.paciencia >= 2, "te pueden destituir tras la primera temporada");
  }
  // y el objetivo es un puesto de SU competición, no del ranking individual
  cars.forEach(k => exige(JUNTAS[k].obj0 <= COP_CLUBES, k + " pide un puesto que no existe en la Copa: " + JUNTAS[k].obj0));
  return cars.length + " juntas con margen, dureza y prima propios";
});

comprueba("Club: el derbi se anota y solo cuenta contra su rival", () => {
  const cl = fundarClub();
  cl.derbi = { club: 3, v: 0, d: 0 };
  const rivalDerbi = { id: 1, nombre: "A/B", club: 3, jug: cl.plantilla.slice(0, 2) };
  const otro = { id: 2, nombre: "C/D", club: 7, jug: cl.plantilla.slice(0, 2) };
  exige(esDerbi(cl, rivalDerbi), "no reconoce al rival del derbi");
  exige(!esDerbi(cl, otro), "cuenta como derbi a quien no lo es");
  exige(anotaDerbi(cl, rivalDerbi, true), "no anotó el derbi ganado");
  exige(cl.derbi.v === 1 && cl.derbi.d === 0, "marcador mal: " + JSON.stringify(cl.derbi));
  anotaDerbi(cl, rivalDerbi, false);
  exige(cl.derbi.d === 1, "no anotó la derrota");
  exige(!anotaDerbi(cl, otro, true), "anotó un partido que no era el derbi");
  exige(cl.derbi.v === 1, "el marcador se movió con un rival cualquiera");
  exige(derbiClub(cl) && derbiClub(cl).n, "el club del derbi no tiene nombre");
  return "marcador " + cl.derbi.v + "-" + cl.derbi.d + " contra " + derbiClub(cl).n;
});

comprueba("Club: fundar da identidad y las partidas viejas también la reciben", () => {
  const cl = fundarClub();
  exige(FILOS_CLUB[cl.filo], "el club nace sin filosofía: " + cl.filo);
  exige(cl.junta && JUNTAS[cl.junta.car], "el club nace sin carácter de junta");
  exige(cl.derbi && CLUBES_NPC[cl.derbi.club], "el club nace sin derbi");
  // guardado antiguo: sin filo, sin carácter, sin derbi
  delete cl.filo; delete cl.derbi; cl.junta = { objetivo: 30, paciencia: 2 };
  entrarPartida();
  exige(FILOS_CLUB[G.clubG.filo], "la migración no puso filosofía");
  exige(JUNTAS[G.clubG.junta.car], "la migración no puso carácter de junta");
  exige(G.clubG.junta.objetivo === 30, "la migración pisó el objetivo que traía la partida");
  exige(G.clubG.derbi && CLUBES_NPC[G.clubG.derbi.club], "la migración no puso derbi");
  return "identidad al fundar y al abrir una guardada antigua";
});

/* Rumores: el mercado se cuenta antes de pasar, y la mitad no pasa ---------- */
comprueba("Rumores: nacen con desenlace decidido y no se repite el tipo vivo", () => {
  const c = nuevaCarrera();
  c.rumores = [];
  const r1 = mkRumor(c, 5);
  exige(r1, "no nació ningún rumor");
  exige(typeof r1.cierto === "boolean", "el desenlace no se fija al nacer");
  exige(r1.sem > 5, "el rumor se resuelve el mismo día que nace");
  exige(c.rumores.length === 1, "no se encoló");
  // el mismo tipo no vuelve a abrirse mientras el primero siga en boca de todos
  for (let i = 0; i < 12; i++) mkRumor(c, 5);
  const tipos = c.rumores.map(x => x.tipo);
  exige(tipos.length === new Set(tipos).size, "se abrieron dos rumores del mismo tipo: " + tipos.join(","));
  c.rumores.forEach(r => {
    const tx = rumorTexto(r);
    exige(tx.t && !/^rum_|\{[a-z]+\}|undefined/.test(tx.t), r.tipo + ": titular roto (" + tx.t + ")");
    exige(tx.x && !/^rum_|\{[a-z]+\}/.test(tx.x), r.tipo + ": cuerpo roto");
  });
  return c.rumores.length + " rumores vivos, uno por tipo";
});

comprueba("Rumores: el confirmado mueve el mundo y el falso no deja rastro", () => {
  const c = nuevaCarrera();
  const par = G.world.parejas.find(p => (p.sexo || "M") === c.sexo && p.jug && p.jug.length === 2);
  const antesNombre = par.nombre, antesJug = par.jug.map(j => j.n).join("+");
  // ruptura CIERTA: la pareja cambia de verdad
  c.rumores = [{ id: "r1", tipo: "ruptura", pid: par.id, pareja: par.nombre, jIdx: 0, sem: 10, cierto: true }];
  const out = resolverRumores(c, 10);
  exige(out.length === 1 && out[0].ok, "la ruptura cierta no se aplicó");
  exige(par.jug.map(j => j.n).join("+") !== antesJug, "la pareja no cambió de jugadores");
  exige(par.nombre !== antesNombre, "la pareja conserva el nombre viejo: " + par.nombre);
  exige(!c.rumores.length, "el rumor resuelto sigue en la lista");
  // fichaje FALSO: no toca nada
  const otra = G.world.parejas.find(p => p.id !== par.id && (p.sexo || "M") === c.sexo);
  const clubAntes = otra.club;
  c.rumores = [{ id: "r2", tipo: "fichaje", pid: otra.id, pareja: otra.nombre, club: (clubAntes + 3) % CLUBES_NPC.length, sem: 10, cierto: false }];
  const out2 = resolverRumores(c, 10);
  exige(!out2[0].ok, "un rumor falso se dio por bueno");
  exige(otra.club === clubAntes, "el rumor falso cambió de club a la pareja");
  exige(out2[0].txt && !/^rum_|\{[a-z]+\}/.test(out2[0].txt), "desmentido sin traducir: " + out2[0].txt);
  return "confirmado mueve el circuito, desmentido no";
});

comprueba("Rumores: el que va de tu pareja le cuesta moral", () => {
  const c = nuevaCarrera();
  c.compiMoral = 70;
  c.rumores = [{ id: "r3", tipo: "pareja", compi: c.compi.n, pareja: "A/B", sem: 4, cierto: true }];
  resolverRumores(c, 4);
  exige(c.compiMoral < 70, "enterarse por la prensa debería costar moral: " + c.compiMoral);
  const antes = c.compiMoral;
  c.rumores = [{ id: "r4", tipo: "pareja", compi: c.compi.n, pareja: "A/B", sem: 5, cierto: false }];
  resolverRumores(c, 5);
  exige(c.compiMoral === antes, "un desmentido no debería mover la moral");
  return "de 70 a " + antes + " al confirmarse";
});

comprueba("Rumores: en el club le cuesta la cabeza al jugador señalado", () => {
  const cl = fundarClub();
  const j = cl.plantilla[0];
  j.moralC = 80;
  cl.rumores = [{ id: "r5", tipo: "puja", j: j.n, club: 2, sem: 6, cierto: true }];
  const out = resolverRumores(cl, 6);
  exige(out[0].ok, "la puja cierta no se aplicó");
  exige(j.moralC < 80, "saber lo que pagan fuera debería mover al jugador: " + j.moralC);
  return "moral " + j.moralC + " tras enterarse de la oferta";
});

comprueba("Periódico: rumores y columna salen traducidos y sin claves crudas", () => {
  const c = nuevaCarrera();
  c.rumores = []; mkRumor(c, 3);
  const el = document.getElementById("feedNoti");
  noticia("titulo", "Prueba", "Sub");
  renderNoticias(el);
  const html = el.innerHTML;
  exige(html.indexOf(t("pre_seccion_rum")) >= 0, "falta la sección de mercado");
  exige(html.indexOf(t("pre_opinion")) >= 0, "falta la columna de opinión");
  exige(!/>(rum|pre|soc)_[a-z0-9_]+</.test(html), "hay claves crudas en la portada");
  exige(html.indexOf("TAMBIÉN EN PORTADA") < 0 || t("pre_tambien") === "TAMBIÉN EN PORTADA", "el rótulo de portada no pasa por t()");
  // la columna cambia con tu momento
  c.rachaAct = 5; const subiendo = columnaHTML();
  c.rachaAct = 0; c.vd = { v: 1, d: 9 }; const bajando = columnaHTML();
  exige(subiendo !== bajando, "la columna dice lo mismo ganando que perdiendo");
  return "mercado, columna y opinión según el momento";
});

comprueba("Muro: la grada habla de ti, de tu pareja y del torneo", () => {
  const c = nuevaCarrera();
  c.social = [];
  ["victoria", "compi", "torneo", "rumor", "derbi"].forEach(k => {
    exige(POSTS_FAN[k] && POSTS_FAN[k].length >= 6, "categoría corta o ausente: " + k);
    post(k, { rival: "A/B", torneo: "Corona de Madrid" });
  });
  exige(c.social.length === 5, "no se publicaron los cinco");
  const el = document.getElementById("social");
  renderSocial(el);
  const html = el.innerHTML;
  exige(!/\{[a-z]+\}/.test(html), "el muro dejó una interpolación sin resolver");
  exige(html.indexOf(c.compi.n) >= 0, "la grada no nombra a tu pareja");
  exige(html.indexOf("Corona de Madrid") >= 0, "la grada no nombra el torneo");
  return "5 categorías nuevas publicando con nombres reales";
});

/* Cantera con historia ---------------------------------------------------- */
comprueba("Cantera: una promesa crece hacia su techo y deja historial", () => {
  const cl = fundarClub();
  cl.academia = true;
  const j = mkAgente(44, 50, cl.sexo);
  j.edad = 16; j.pot = 78; j.aniosCan = 0; j.ilusion = 78; j.hist = [];
  cl.cantera = [j];
  const media0 = mediaAttrs(j.attrs);
  evolucionaCantera(cl);
  exige(cl.cantera.length === 1, "la promesa desapareció en su primera temporada");
  exige(j.edad === 17, "no cumplió años");
  exige(j.aniosCan === 1, "no cuenta las temporadas en la academia");
  exige(j.hist.length === 1, "no dejó línea de historial");
  exige(j.hist[0].b >= j.hist[0].a, "el historial guarda un retroceso");
  exige(mediaAttrs(j.attrs) > media0, `no creció: ${media0} → ${mediaAttrs(j.attrs)}`);
  // y crecer se frena al acercarse al techo
  const lejos = saltoCantera(cl, { attrs: mkAttrsNivel(50, "agresivo"), pot: 85, edad: 17 });
  const cerca = saltoCantera(cl, { attrs: mkAttrsNivel(80, "agresivo"), pot: 82, edad: 17 });
  exige(lejos > cerca, `lejos del techo debería crecer más: ${lejos} vs ${cerca}`);
  exige(saltoCantera(cl, { attrs: mkAttrsNivel(80, "agresivo"), pot: 70, edad: 17 }) === 0, "creció por encima de su techo");
  return `${media0} → ${mediaAttrs(j.attrs)} con techo ${j.pot}`;
});

comprueba("Cantera: la escuela y la filosofía se notan en lo que crece", () => {
  const base = fundarClub(); base.academia = true; base.filo = "oficio"; base.reformas = {};
  const casa = fundarClub(); casa.academia = true; casa.filo = "cantera"; casa.reformas = { escuela: true };
  const molde = { attrs: mkAttrsNivel(50, "agresivo"), pot: 85, edad: 17 };
  let a = 0, b = 0;
  for (let i = 0; i < 40; i++) { a += saltoCantera(base, molde); b += saltoCantera(casa, molde); }
  exige(b > a, `la escuela y la filosofía de cantera deberían crecer más: ${a} vs ${b}`);
  return `${Math.round(a / 40)} frente a ${Math.round(b / 40)} por temporada`;
});

comprueba("Cantera: quien no debuta pierde la ilusión y acaba yéndose", () => {
  const cl = fundarClub();
  cl.academia = true;
  const j = mkAgente(44, 50, cl.sexo);
  j.edad = 18; j.pot = 70; j.aniosCan = 0; j.ilusion = 78; j.hist = [];
  cl.cantera = [j];
  let temporadas = 0, fuera = [];
  while (cl.cantera.length && temporadas < 8) { fuera = evolucionaCantera(cl); temporadas++; }
  exige(!cl.cantera.length, "el chaval sigue ahí después de ocho temporadas");
  exige(fuera.length === 1 && fuera[0] === j, "no devolvió a quien se marcha");
  exige(temporadas <= CAN_FUGA, `tardó ${temporadas} temporadas en irse, y el límite es ${CAN_FUGA}`);
  // y su estado se lee antes de que pase
  exige(ilusionTxt({ ilusion: 80 }).k === "can_il_alta", "una ilusión alta no se lee como tal");
  exige(ilusionTxt({ ilusion: 10 }).k === "can_il_fuga", "no avisa de la fuga");
  return "se marcha a las " + temporadas + " temporadas sin debutar";
});

comprueba("Cantera: el panel dice el techo, el consejo y el gráfico sin claves crudas", () => {
  const cl = fundarClub();
  cl.academia = true; cl.staff = cl.staff || {};
  const j = mkAgente(44, 50, cl.sexo);
  j.edad = 17; j.pot = 80; j.aniosCan = 1; j.ilusion = 60;
  j.hist = [{ t: 1, a: 44, b: 51, foco: "remate" }, { t: 2, a: 51, b: 57, foco: "globo" }];
  cl.cantera = [j];
  cl.staff.ojeador = null;
  const sinOjeador = techoTxt(cl, j);
  cl.staff.ojeador = mkStaff("ojeador", 3);
  const conOjeador = techoTxt(cl, j);
  exige(sinOjeador !== conOjeador, "el ojeador no aprieta la estimación del techo");
  exige(conOjeador.indexOf("80") >= 0, "con ojeador debería decirse el techo: " + conOjeador);
  [sinOjeador, conOjeador].forEach(x => exige(!/^can_|\{[a-z]+\}/.test(x), "techo sin traducir: " + x));
  const cons = consejoSubir(cl, j);
  exige(t(cons) !== cons, "el consejo no está traducido: " + cons);
  const g = canteraGrafico(j);
  exige(g.indexOf("<svg") === 0, "el gráfico no es SVG");
  exige(g.indexOf("http") < 0, "el gráfico pide algo a la red");
  exige(canteraGrafico({ hist: [] }).indexOf(t("can_sin_hist")) >= 0, "sin historial debería decirlo");
  // el consejo cambia según lo que le quede por crecer
  exige(consejoSubir(cl, { attrs: mkAttrsNivel(76, "agresivo"), pot: 78, aniosCan: 0 }) === "can_subir_ya", "no recomienda subir al que está listo");
  exige(consejoSubir(cl, { attrs: mkAttrsNivel(50, "agresivo"), pot: 80, aniosCan: 4 }) === "can_subir_tarde", "no avisa de que se pasó el arroz");
  return "techo estimado, consejo y gráfico de " + j.hist.length + " temporadas";
});

comprueba("Cantera: subir a un canterano deja marca y desbloquea hitos", () => {
  const cl = fundarClub();
  const j = { ...mkAgente(50, 60, cl.sexo), dela_casa: true };
  cl.plantilla.push(j);
  cl.alin = [cl.plantilla.length - 1, 0];
  const hA = HITOS_CLUB.find(h => h.id === "canteraA");
  exige(hA && hA.ck(cl), "no reconoce a un canterano en la pareja A");
  cl.alin = [0, 1];
  exige(!hA.ck(cl), "lo da por bueno con el canterano en el banquillo");
  const h3 = HITOS_CLUB.find(h => h.id === "cantera3");
  exige(!h3.ck(cl), "cuenta tres canteranos habiendo uno");
  cl.plantilla.push({ ...j, n: "B" }, { ...j, n: "C" });
  exige(h3.ck(cl), "no reconoce los tres canteranos");
  return "dos hitos que piden ponerlos a jugar, no solo subirlos";
});

/* Un rumor confirmado abre conversación ----------------------------------- */
comprueba("Rumores: el confirmado sobre ti abre su dilema", () => {
  const c = nuevaCarrera();
  c.dilemaActivo = null; c.dilVistos = {}; c.decis = {};
  c.rumores = [{ id: "r9", tipo: "tuyo", pid: G.world.parejas[0].id, pareja: "A/B", sem: 3, cierto: true }];
  const out = resolverRumores(c, 3);
  exige(out[0].ok, "el rumor no se confirmó");
  exige(out[0].abre === "rum_oferta", "no señala qué escena abre: " + out[0].abre);
  abreDilema(c, out[0].abre, 3);
  exige(c.dilemaActivo && c.dilemaActivo.id === "rum_oferta", "no se abrió el dilema");
  const d = _dilemaPorId("rum_oferta");
  exige(d.cadena, "la escena de la oferta debería salir solo por cadena");
  exige(!dilemasDisponibles(c, 3).some(x => x.id === "rum_oferta"), "la escena de cadena entró en el sorteo");
  exige(d.texto(c).indexOf("A/B") >= 0, "el dilema no usa la pareja del rumor: " + d.texto(c));
  return "el rumor de la semana 3 se sienta a hablar contigo";
});

comprueba("Rumores: cada tipo abre la escena que le toca, y el falso ninguna", () => {
  const c = nuevaCarrera();
  const par = G.world.parejas.find(p => (p.sexo || "M") === c.sexo && p.jug && p.jug.length === 2);
  const casos = [
    [{ tipo: "pareja", compi: c.compi.n, pareja: "A/B" }, "rum_traicion"],
    [{ tipo: "ruptura", pid: par.id, pareja: par.nombre, jIdx: 0 }, "rum_suelto"],
  ];
  casos.forEach(([base, esperado]) => {
    c.rumores = [Object.assign({ id: "x", sem: 2, cierto: true }, base)];
    const out = resolverRumores(c, 2);
    exige(out[0].abre === esperado, `${base.tipo} debería abrir ${esperado}, abrió ${out[0].abre}`);
  });
  // un fichaje de otros no es asunto tuyo, y un desmentido no abre nada
  c.rumores = [{ id: "y", tipo: "fichaje", pid: par.id, pareja: par.nombre, club: 1, sem: 2, cierto: true }];
  exige(!resolverRumores(c, 2)[0].abre, "un fichaje ajeno abrió una escena tuya");
  c.rumores = [{ id: "z", tipo: "pareja", compi: c.compi.n, pareja: "A/B", sem: 2, cierto: false }];
  const outF = resolverRumores(c, 2);
  exige(!outF[0].ok && !outF[0].abre, "un desmentido abrió conversación");
  return "tres escenas encadenadas al rumor que las provoca";
});

/* El ranking: puntúa quien juega y gana, no quien existe -------------------
   Antes `simCircuito` daba puntos a TODAS las parejas del mundo cada semana
   (0.045·(nivel−40)²): una pareja de nivel 70 se llevaba ~47 puntos semanales
   sin jugar, y ganar un Continental Bronce entero daba 40. Medido: cuatro
   temporadas ganando 7 títulos dejaban el ranking peor (91→95) que cuatro
   perdiendo en primera ronda de torneos grandes (91→66). */
function semanaConTorneos() {
  // una semana del calendario que tenga premier Y continental
  for (let s = 1; s <= SEMANAS_TEMP; s++) {
    const sl = slotSemana(s);
    if (sl.premier !== undefined && sl.premier !== null && sl.fip !== undefined) return s;
  }
  return 1;
}

comprueba("Ranking: nadie cobra por existir; solo puntúa quien juega", () => {
  const c = nuevaCarrera();
  c.semana = semanaConTorneos();
  const sx = c.sexo || "M";
  const mundo = G.world.parejas.filter(p => (p.sexo || "M") === sx);
  const antes = new Map(mundo.map(p => [p.id, p.pts]));
  simCircuito([]);
  const subieron = mundo.filter(p => p.pts > antes.get(p.id));
  exige(subieron.length > 0, "no puntuó nadie");
  exige(subieron.length < mundo.length, "puntuaron TODAS las parejas: sigue pagándose por existir");
  // dos cuadros de 32 como mucho
  exige(subieron.length <= 64, `puntuaron ${subieron.length} parejas: más de dos cuadros`);
  return subieron.length + " de " + mundo.length + " parejas puntúan esa semana";
});

comprueba("Ranking: el cuadro reparte como un cuadro y el campeón cobra lo suyo", () => {
  const c = nuevaCarrera();
  c.semana = semanaConTorneos();
  const sl = slotSemana(semanaTemp());
  const cat = CATS[sl.premier];
  const sx = c.sexo || "M";
  const mundo = G.world.parejas.filter(p => (p.sexo || "M") === sx);
  const antes = new Map(mundo.map(p => [p.id, p.pts]));
  simCircuito([]);
  const ganancias = mundo.map(p => p.pts - antes.get(p.id)).filter(x => x > 0).sort((a, b) => b - a);
  exige(ganancias[0] === cat.pts[0], `el campeón se llevó ${ganancias[0]} y la categoría paga ${cat.pts[0]}`);
  exige(ganancias.filter(x => x === cat.pts[0]).length === 1, "hubo más de un campeón del premier");
  // y el reparto decrece: no es una tarifa plana
  exige(ganancias[0] > ganancias[ganancias.length - 1], "todos cobraron lo mismo");
  return `campeón ${ganancias[0]} · último que puntúa ${ganancias[ganancias.length - 1]}`;
});

comprueba("Ranking: una pareja, un torneo por semana (como tú)", () => {
  const c = nuevaCarrera();
  c.semana = semanaConTorneos();
  const sl = slotSemana(semanaTemp());
  const tope = Math.max(CATS[sl.premier].pts[0], CATS[sl.fip].pts[0]);
  const sx = c.sexo || "M";
  const mundo = G.world.parejas.filter(p => (p.sexo || "M") === sx);
  const antes = new Map(mundo.map(p => [p.id, p.pts]));
  simCircuito([]);
  const maxGanancia = Math.max(...mundo.map(p => p.pts - antes.get(p.id)));
  exige(maxGanancia <= tope, `alguien se llevó ${maxGanancia} jugando los dos torneos (el tope de uno es ${tope})`);
  return "nadie cobra por dos cuadros la misma semana";
});

comprueba("Ranking: ganar sube más que perder, a igualdad de partidos", () => {
  // dos parejas del mismo nivel: una gana el Continental de su categoría y la
  // otra pierde en primera ronda del premier. La que gana tiene que acabar por
  // delante, que es justo lo que NO pasaba antes.
  const c = nuevaCarrera();
  const cont = CATS[1], prem = CATS[5];
  const puntosGanando = cont.pts[0];                    // campeón del Continental
  const puntosPerdiendo = prem.pts[5];                  // primera ronda del premier
  exige(puntosGanando > puntosPerdiendo,
    `ganar un ${catNombre(1)} da ${puntosGanando} y caer en primera ronda de un ${catNombre(5)} da ${puntosPerdiendo}`);
  return `${puntosGanando} por ganar frente a ${puntosPerdiendo} por presentarse`;
});

comprueba("Ranking: la previa de la Élite pequeña se abre antes del top 32", () => {
  // sin esto, una pareja de nivel 73 clasificada la 50 no podía jugar ni la
  // previa del torneo más pequeño de su nivel: sin premier no hay puntos, y sin
  // puntos no se llega al corte. Un callejón sin salida.
  exige(CATS[4].cupoP >= 48, `la previa del ${catNombre(4)} corta en ${CATS[4].cupoP}`);
  exige(CATS[4].cupoP > CATS[4].cupoD, "la previa no puede ser más estrecha que el cuadro final");
  [4, 5, 6].forEach(i => exige(CATS[i].cupoP > CATS[i].cupoD, `la categoría ${i} tiene la previa mal puesta`));
  // y el corte del cuadro final sigue siendo exigente
  exige(CATS[4].cupoD <= 20, "el cuadro final se ha aflojado de más");
  return `previa hasta el puesto ${CATS[4].cupoP}, cuadro final hasta el ${CATS[4].cupoD}`;
});

comprueba("Ranking: tras varias temporadas, el orden se parece al nivel", () => {
  const c = nuevaCarrera();
  // se simulan dos temporadas de circuito sin que el jugador juegue nada
  for (let s = 0; s < SEMANAS_TEMP * 2; s++) { c.semana = (s % SEMANAS_TEMP) + 1; simCircuito([]); }
  const filas = rankingFilas().filter(f => !f.yo);
  const n = filas.length;
  const rangoNivel = new Map([...filas].sort((a, b) => b.nivel - a.nivel).map((f, i) => [f.id, i]));
  let sd = 0;
  filas.forEach((f, i) => { const d = i - rangoNivel.get(f.id); sd += d * d; });
  const rho = 1 - 6 * sd / (n * (n * n - 1));
  exige(rho > 0.6, `el ranking no sigue al nivel: ρ=${rho.toFixed(3)}`);
  return "ρ(puntos, nivel) = " + rho.toFixed(3) + " con " + n + " parejas";
});

comprueba("Maestros: los ocho mejores pueden jugarlos (regresión: reventaba)", () => {
  // El cuadro de los Maestros no es el de 16 con previa: son ocho parejas y
  // empiezan en cuartos. Como mkCuadro solo llenaba la ronda de octavos, entrar
  // dejaba la fase vacía y la pantalla del torneo petaba al buscar rival. No se
  // veía porque con el ranking viejo nadie llegaba nunca al top 8.
  const c = nuevaCarrera();
  // los puntos entran por la ventana del ranking, no asignando c.pts a mano
  rkAnota(c, c.semana, 999999);
  c.dinero = 90000; c.energia = 100; c.pro = true;
  let semTF = -1;
  for (let s = 1; s <= SEMANAS_TEMP; s++) if (slotSemana(s).premier === 7) { semTF = s; break; }
  exige(semTF > 0, "el calendario no tiene semana de Maestros");
  c.semana = semTF;
  exige(miPuesto() <= 8, "el protagonista debería estar en el top 8: #" + miPuesto());
  exige(entradaEn(7) === 3, "los Maestros deberían arrancar en cuartos, no en " + entradaEn(7));
  abrirTorneo(7);
  exige(torneo, "no se pudo abrir el torneo");
  exige(torneo.fase === 3, "arranca en la fase " + torneo.fase);
  const ronda = torneo.cuadro.ronda[3];
  exige(ronda && ronda.length === 8, "el cuadro no tiene ocho casillas: " + (ronda && ronda.length));
  exige(ronda.filter(Boolean).length === 8, "hay huecos en el cuadro de los Maestros");
  exige(ronda.some(p => p && p.yo), "no estás en tu propio cuadro");
  exige(torneo.rivales[3] && torneo.rivales[3].jug, "no hay rival en cuartos");
  pintarTorneo();                                  // esto es lo que lanzaba
  const html = pintarCuadroHTML();
  exige(html && html.length > 40, "el cuadro no se pinta");
  /* Y se juega. Lo que esta prueba guarda es que NO REVIENTE en ninguna de las
     tres rondas y que el recorrido sean fases consecutivas desde cuartos; que
     ganes o no ya no depende de ella —el motor equilibrado no regala el título
     a nadie—. El premio del campeón se comprueba aparte, buscando una semilla
     en la que sí se gane. */
  Object.keys(c.attrs).forEach(k => c.attrs[k] = 95);
  Object.keys(c.compi.attrs).forEach(k => c.compi.attrs[k] = 95);
  let fases = [];
  let vueltas = 0;
  while (torneo && vueltas++ < 6) {
    fases.push(torneo.fase);
    if (!torneo.rivales[torneo.fase]) throw new Error("sin rival en la fase " + torneo.fase);
    empezarPartido(false);
    pulsarFicha();
  }
  exige(fases[0] === 3, "no arranca en cuartos: " + fases.join(","));
  exige(fases.join(",") === "3,4,5".slice(0, fases.join(",").length),
    "el recorrido no son rondas consecutivas desde cuartos: " + fases.join(","));
  // el premio del campeón: en cuanto se gana una vez, tiene que ser el de CATS[7]
  let campeon = false;
  for (let intento = 0; intento < 12 && !campeon; intento++) {
    const c2 = nuevaCarrera();
    rkAnota(c2, c2.semana, 999999);
    c2.dinero = 90000; c2.energia = 100; c2.pro = true; c2.semana = semTF;
    Object.keys(c2.attrs).forEach(k => c2.attrs[k] = 96);
    Object.keys(c2.compi.attrs).forEach(k => c2.compi.attrs[k] = 96);
    rndSemilla(7700 + intento * 131, 7700 + intento * 131);
    const ptsAntes = c2.pts;
    abrirTorneo(7);
    let v2 = 0;
    while (torneo && v2++ < 6) { empezarPartido(false); pulsarFicha(); }
    if (c2.palmares.some(x => /Maestros/.test(x))) {
      campeon = true;
      exige(c2.pts - ptsAntes === CATS[7].pts[0], `el campeón se llevó ${c2.pts - ptsAntes} y toca ${CATS[7].pts[0]}`);
    }
  }
  exige(campeon, "no se ganan los Maestros ni una vez en doce intentos con el tope de atributos");
  return "cuartos, semis y final con ocho parejas · " + CATS[7].pts[0] + " puntos al campeón";
});

/* Ranking por ventana de 52 semanas (como la FIP) -------------------------
   Cada resultado vale un año y luego se cae. Lo de antes —acumular y recortar
   un 45% al cerrar temporada— dejaba el ranking quieto once meses y le daba un
   salto artificial en diciembre. */
comprueba("Ranking: un resultado vale exactamente 52 semanas", () => {
  const x = { pts: 0 };
  rkAsegura(x);
  rkAnota(x, 10, 1000);
  exige(x.pts === 1000, "no sumó al anotarlo: " + x.pts);
  // durante el año siguiente sigue ahí
  [11, 30, 61].forEach(w => { rkCaduca(x, w); exige(x.pts === 1000, `se cayó antes de tiempo en la semana ${w}: ${x.pts}`); });
  // y en la misma semana del año siguiente, se cae
  const cae = rkCaduca(x, 10 + RK_SEMANAS);
  exige(cae === 1000, "no devolvió lo que se cae: " + cae);
  exige(x.pts === 0, "los puntos siguen ahí un año después: " + x.pts);
  return "1000 puntos vivos 52 semanas y ni una más";
});

comprueba("Ranking: defender es real (repetir mantiene, fallar hunde)", () => {
  const bueno = { pts: 0 }, malo = { pts: 0 };
  rkAsegura(bueno); rkAsegura(malo);
  // los dos ganan el torneo de la semana 5 del año 1
  rkAnota(bueno, 5, 1000); rkAnota(malo, 5, 1000);
  exige(bueno.pts === malo.pts, "no empiezan iguales");
  // un año después: uno repite el título, el otro cae en primera ronda
  const sem = 5 + RK_SEMANAS;
  rkCaduca(bueno, sem); rkAnota(bueno, sem, 1000);
  rkCaduca(malo, sem); rkAnota(malo, sem, 50);
  exige(bueno.pts === 1000, "repetir el título debería dejarte igual: " + bueno.pts);
  exige(malo.pts === 50, "fallar debería hundirte: " + malo.pts);
  exige(bueno.pts > malo.pts, "defender no sirve de nada");
  return "repetir: 1000 → 1000 · fallar: 1000 → 50";
});

comprueba("Ranking: lo que defiendes se puede saber antes de jugar", () => {
  const c = nuevaCarrera();
  rkAsegura(c);
  c.rk = rkNuevo();
  c.pts = 0;
  rkAnota(c, 7, 300);
  exige(rkDefiende(c, 7) === 300, "no dice lo que defiendes esa semana");
  exige(rkDefiende(c, 7 + RK_SEMANAS) === 300, "la ventana no es de un año");
  exige(rkDefiende(c, 8) === 0, "dice que defiendes puntos de otra semana");
  return "300 puntos a defender en la semana 7";
});

comprueba("Ranking: entrar y salir de la partida no cuesta puntos", () => {
  const c = nuevaCarrera();
  rkAnota(c, c.semana, 500);
  const antes = c.pts;
  // caducar la misma semana dos veces (recargar, repintar) no puede robar nada
  caducaSemanaRanking(c.semana);
  const trasUna = c.pts;
  caducaSemanaRanking(c.semana);
  caducaSemanaRanking(c.semana);
  exige(c.pts === trasUna, `caducó de más al repetir: ${trasUna} → ${c.pts}`);
  exige(antes - trasUna === 500 || trasUna === antes, "la primera caducidad hizo algo raro");
  return "la escoba pasa una vez por semana";
});

comprueba("Ranking: los guardados antiguos reciben su historial sin perder puntos", () => {
  const viejo = { pts: 5200 };          // partida de antes: solo el total
  rkAsegura(viejo);
  exige(Array.isArray(viejo.rk) && viejo.rk.length === RK_SEMANAS, "no le puso ventana");
  exige(viejo.pts === 5200, "la migración le cambió los puntos: " + viejo.pts);
  exige(rkSuma(viejo) === 5200, "la ventana no suma lo que decía el total");
  // y se reparte, no se amontona en una semana (si no, se caería todo de golpe)
  const maximo = Math.max(...viejo.rk);
  exige(maximo < 5200 / 4, "se amontonó en una semana: se caería todo de golpe");
  return "5200 puntos repartidos por el año, sin saltos";
});


/* Eventos de circuito: semanas que cambian las reglas ----------------------
   La regla del catálogo: un evento que no cambia una decisión es una noticia,
   no un evento. Estas pruebas la hacen cumplir. */
comprueba("Eventos: todos declaran efecto y todos se pueden leer", () => {
  exige(EVENTOS.length >= 18, "solo hay " + EVENTOS.length + " eventos");
  const ids = EVENTOS.map(e => e.id);
  exige(ids.length === new Set(ids).size, "hay eventos con el mismo id");
  EVENTOS.forEach(d => {
    const tieneEfecto = (d.mods && Object.keys(d.mods).length) || (d.flags && d.flags.length) ||
      d.mundo || d.moral != null || d.cortaSponsor || d.fansX;
    exige(tieneEfecto, `${d.id} no cambia nada: es una noticia, no un evento`);
    exige(EV_ALCANCES.indexOf(d.alcance) >= 0, `${d.id} tiene un alcance inventado: ${d.alcance}`);
    exige(d.dur >= 1, `${d.id} no dura nada`);
    [evNombre, evTexto, evEfecto].forEach(f => {
      const x = f(d.id);
      exige(x && !/^ev_/.test(x), `${d.id}: sin traducir (${x})`);
    });
  });
  // los seis alcances están cubiertos: de una semana a varias temporadas
  EV_ALCANCES.forEach(a => exige(EVENTOS.some(d => d.alcance === a), "no hay ningún evento de alcance " + a));
  return EVENTOS.length + " eventos en " + EV_ALCANCES.length + " alcances, todos con efecto";
});

comprueba("Eventos: la pista lenta cambia de verdad lo que sale cada golpe", () => {
  const c = nuevaCarrera();
  c.eventos = []; evRecalcula(c);
  const antes = evGolpe("globo"), antesR = evGolpe("remate");
  exige(antes.win === 1 && antesR.win === 1, "sin eventos no debería haber modificador");
  evActiva(c, "humedad", c.semana);
  const conGlobo = evGolpe("globo"), conRemate = evGolpe("remate");
  exige(conGlobo.win > 1, "el globo no mejora con pista lenta: " + conGlobo.win);
  exige(conRemate.win < 1, "el remate no empeora con pista lenta: " + conRemate.win);
  exige(evGolpe("fondo").err < 1, "el fondo no gana fiabilidad");
  return `globo ×${conGlobo.win.toFixed(2)} · remate ×${conRemate.win.toFixed(2)}`;
});

comprueba("Eventos: el viaje, la energía y los puntos se mueven", () => {
  const c = nuevaCarrera();
  c.eventos = []; evRecalcula(c);
  exige(evNum("viaje", 100) === 100, "sin eventos el viaje no debería cambiar");
  evActiva(c, "vuelo", c.semana);
  exige(evNum("viaje", 100) === 200, "el vuelo perdido no dobla el viaje: " + evNum("viaje", 100));
  exige(evNum("energia", 12) === -4, "el vuelo perdido no cuesta energía: " + evNum("energia", 12));
  c.eventos = []; evRecalcula(c);
  evActiva(c, "gira", c.semana);
  exige(evNum("ptsX", 1000) === 1150, "la gira no paga más puntos: " + evNum("ptsX", 1000));
  exige(evNum("viaje", 100) === 180, "la gira no encarece el viaje");
  c.eventos = []; evRecalcula(c);
  evActiva(c, "gripe", c.semana);
  exige(evNum("energiaTope", 100) === 58, "la gripe no limita la energía");
  exige(evNum("lesion", 0.5) > 0.5, "la gripe no sube el riesgo de lesión");
  return "viaje ×2, energía −16, puntos ×1,15 y techo de energía 58";
});

comprueba("Eventos: con suplente juegas con otro y sin química", () => {
  const c = nuevaCarrera();
  c.eventos = []; evRecalcula(c);
  const normal = miTeam();
  exige(normal.nombre.indexOf(c.compi.n) >= 0, "sin evento deberías jugar con tu pareja");
  evActiva(c, "suplente", c.semana);
  exige(evFlag("suplente"), "la bandera no se activa");
  const conSup = miTeam();
  exige(conSup.nombre.indexOf(c.compi.n) < 0, "sigues jugando con tu pareja: " + conSup.nombre);
  const sup = compiSuplente(c);
  exige(sup && sup.n, "no se generó suplente");
  exige(mediaAttrs(sup.attrs) < mediaAttrs(c.compi.attrs), "el suplente no es peor que tu pareja");
  // y es el mismo durante el torneo, no uno nuevo cada partido
  exige(compiSuplente(c).n === sup.n, "el suplente cambia de nombre entre partidos");
  return "juegas con " + sup.n + " (nivel " + mediaAttrs(sup.attrs) + " frente a " + mediaAttrs(c.compi.attrs) + ")";
});

comprueba("Eventos: caducan solos y no se solapan consigo mismos", () => {
  const c = nuevaCarrera();
  c.eventos = []; c.evVistos = {}; evRecalcula(c);
  const a = evActiva(c, "comprimido", 10);
  exige(a && a.hasta === 12, "la duración no cuadra: " + JSON.stringify(a));
  exige(!evActiva(c, "comprimido", 10), "se activó dos veces el mismo evento");
  exige(evCaduca(c, 12).length === 0, "caducó antes de tiempo");
  exige(evActivos(c).length === 1, "el evento se fue solo");
  const idos = evCaduca(c, 13);
  exige(idos.length === 1, "no caducó al terminar");
  exige(!evActivos(c).length, "sigue en la lista");
  exige(evNum("energia", 12) === 12, "el efecto sigue puesto tras caducar");
  return "tres semanas y fuera, sin solaparse";
});

comprueba("Eventos: los de temporada y era no salen cada dos por tres", () => {
  const c = nuevaCarrera();
  c.eventos = []; c.evVistos = { punto_oro: 5 };
  // recién vivido, no puede repetirse
  exige(!evDisponibles(c, 30).some(d => d.id === "punto_oro"), "un evento de temporada se repite al mes");
  exige(evDisponibles(c, 5 + 110).some(d => d.id === "punto_oro"), "no vuelve nunca");
  // los únicos no vuelven jamás
  c.evVistos = { generacion: 5 };
  c.semana = 300;
  exige(!evDisponibles(c, 400).some(d => d.id === "generacion"), "una generación irrepetible se repitió");
  return "descansos por alcance y los únicos, una vez";
});

comprueba("Eventos: una generación nueva llega al circuito de verdad", () => {
  const c = nuevaCarrera();
  c.semana = 80;
  const antes = G.world.parejas.length;
  const nivelAntes = Math.max(...G.world.parejas.filter(p => (p.sexo || "M") === c.sexo).map(p => nivelPareja(p)));
  evActiva(c, "generacion", c.semana);
  exige(G.world.parejas.length === antes + 4, `entraron ${G.world.parejas.length - antes} parejas, no 4`);
  const nuevas = G.world.parejas.slice(-4);
  nuevas.forEach(p => {
    exige(p.jug && p.jug.length === 2, "pareja mal formada");
    exige(nivelPareja(p) >= 68, "la generación irrepetible es del montón: " + nivelPareja(p));
    exige(Array.isArray(p.rk), "la pareja nueva no tiene ventana de ranking");
  });
  return "4 parejas de nivel " + nuevas.map(p => nivelPareja(p)).join("/") + " (el tope era " + nivelAntes + ")";
});


/* La pareja como copiloto: plan, ejes y conversaciones --------------------
   Tres reglas que sostienen todo lo demás: un plan nuevo no hace nada hasta
   que se rueda, cambiar de compañero se lleva los automatismos, y los seis
   ejes se mueven por motivos distintos (si no, sobraba con una barra). */
comprueba("Pareja: cada plan declara efecto y todos están traducidos", () => {
  const ids = Object.keys(PLANES_PAREJA);
  exige(ids.length >= 6, "solo hay " + ids.length + " planes");
  ids.forEach(id => {
    const P = PLANES_PAREJA[id];
    if (id !== "libre") {
      const golpes = Object.keys(P.mods || {});
      exige(golpes.length, id + " no cambia ningún golpe: es un cartel, no un plan");
    }
    /* El error global es la palanca más fuerte del motor: la mayoría de los
       puntos mueren en fallo, no en winner. Un plan que recorte el error de
       TODOS los golpes por debajo de este umbral gana solo. */
    const gt = (P.mods || {}).golpeTodo;
    if (gt && gt.err) exige(gt.err >= .95, id + " recorta el error global a " + gt.err + ": gana solo");
    [planNombre, planDesc, planComo].forEach(f => {
      const x = f(id);
      exige(x && !/^plan_/.test(x), id + ": sin traducir (" + x + ")");
    });
  });
  return ids.length + " planes, todos con efecto en pista";
});

comprueba("Pareja: un plan nuevo no se nota hasta que se rueda", () => {
  const c = nuevaCarrera();
  c.eventos = []; evRecalcula(c);
  planAsegura(c);
  exige(planPareja(c) === "libre", "no arranca sin plan");
  exige(planElige(c, "red"), "no dejó elegir el plan");
  exige(planDominio(c) === 0, "el plan nuevo nace ya dominado");
  const cero = pjGolpe("volea");
  exige(cero.win === 1 && cero.err === 1, "sin rodaje ya modifica la volea: " + JSON.stringify(cero));
  planEntrena(c, 50);
  const medio = pjGolpe("volea");
  planEntrena(c, 50);
  const pleno = pjGolpe("volea");
  exige(medio.win > 1 && pleno.win > medio.win, "el dominio no escala: " + medio.win + " / " + pleno.win);
  exige(Math.abs(pleno.win - PLANES_PAREJA.red.mods["golpe:volea"].win) < 1e-9,
    "al 100% no aplica el plan entero: " + pleno.win);
  // y el dominio tiene techo
  planEntrena(c, 80);
  exige(planDominio(c) === PLAN_DOM_MAX, "el dominio se pasa del tope");
  return "volea ×1,00 → ×" + medio.win.toFixed(2) + " → ×" + pleno.win.toFixed(2);
});

comprueba("Pareja: cambiar de compañero se lleva los automatismos", () => {
  const c = nuevaCarrera();
  planElige(c, "muro"); planEntrena(c, 100);
  exige(planDominio(c) === 100, "no llegó al tope");
  planRompe(c);
  exige(planDominio(c) === 18, "la ruptura no cuesta lo que debe: " + planDominio(c));
  // cambiar de plan con la misma pareja también empieza de cero
  planElige(c, "red");
  exige(planDominio(c) === 0, "el plan nuevo hereda el rodaje del viejo");
  // la etapa nueva se lleva además la relación y las conversaciones tenidas
  planEntrena(c, 100);
  relMueve(c, "lealtad", 25); c.charlas = { defender: 3 }; c.semana = 60;
  parejaNueva(c);
  exige(planDominio(c) === 18, "la etapa nueva no descuenta el rodaje");
  exige(relLee(c, "lealtad") === EJE_BASE, "la lealtad se hereda del compañero anterior");
  exige(!Object.keys(c.charlas).length, "las conversaciones del anterior siguen en enfriamiento");
  exige(c._parejaDesdeSem === 60, "no se anota cuándo empieza la etapa");
  return "100 → 18 al romper, 0 al cambiar de plan";
});

comprueba("Pareja: los seis ejes se mueven por motivos distintos", () => {
  const c = nuevaCarrera();
  relReinicia(c);
  EJES.forEach(k => exige(typeof relLee(c, k) === "number", "falta el eje " + k));
  exige(EJES.length === 6, "no son seis ejes: " + EJES.length);
  // semana de torneo: gasta convivencia; semana en casa: la recupera
  const conv0 = relLee(c, "convivencia");
  c._jugoTorneo = true; relSemana(c);
  const conv1 = relLee(c, "convivencia");
  exige(conv1 < conv0, "competir no gasta convivencia");
  c._jugoTorneo = false; relSemana(c); relSemana(c);
  exige(relLee(c, "convivencia") > conv1, "quedarse en casa no la recupera");
  // pero la semana en casa impacienta al ambicioso
  const amb0 = relLee(c, "ambicion");
  relSemana(c);
  exige(relLee(c, "ambicion") < amb0, "no competir no le pesa a nadie");
  // el eje peor es el que se señala
  relMueve(c, "protagonismo", -40);
  exige(relPeor(c) === "protagonismo", "no detecta el eje que peor está");
  exige(relEstado(20) === "roto" && relEstado(90) === "bien", "los estados no cuadran");
  return "convivencia " + conv0 + "→" + conv1 + " compitiendo, y sube en casa";
});

comprueba("Pareja: la confianza deportiva se nota en pista", () => {
  const c = nuevaCarrera();
  relReinicia(c);
  EJES.forEach(k => c.rel[k] = EJE_BASE);
  exige(relAjusteConf(c) === 0, "en el punto de partida ya ajusta algo");
  relMueve(c, "deportiva", +27);
  exige(relAjusteConf(c) === 3, "creer en tu juego no suma: " + relAjusteConf(c));
  relMueve(c, "deportiva", -54);
  exige(relAjusteConf(c) < 0, "que no crea en ti no resta");
  return "±3 de confianza por el eje deportivo";
});

comprueba("Pareja: las conversaciones cuestan, esperan y pueden salir mal", () => {
  const c = nuevaCarrera();
  relReinicia(c);
  CHARLAS.forEach(ch => {
    [charlaNombre, charlaDesc, charlaEfecto].forEach(f => {
      const x = f(ch.id);
      exige(x && !/^chr_/.test(x), ch.id + ": sin traducir (" + x + ")");
    });
    const toca = Object.keys(ch.ef || {});
    exige(toca.length, ch.id + " no mueve ningún eje");
    toca.forEach(k => exige(EJES.indexOf(k) >= 0, ch.id + " toca un eje inventado: " + k));
  });
  c.semana = 40; c.energia = 90; c.dinero = 9000;
  relMueve(c, "personal", -20);
  exige(charlaDisponible(c, "defender"), "no se puede defender al compañero");
  const bien = charlaHabla(c, "defender", () => 0.99);   // sale bien
  exige(bien && bien.ok, "con la moneda a favor debería salir bien");
  exige(bien.deltas.personal > 0, "defenderlo no sube la afinidad");
  // enfriamiento: no se puede repetir a la semana siguiente
  exige(!charlaDisponible(c, "defender"), "se puede repetir sin esperar");
  exige(charlaEspera(c, "defender") === 18, "el enfriamiento no cuadra: " + charlaEspera(c, "defender"));
  c.semana += 18;
  exige(charlaDisponible(c, "defender"), "no vuelve a estar disponible");
  // la que sale mal, sale mal de verdad
  const per0 = relLee(c, "personal");
  const mal = charlaHabla(c, "critica", () => 0);        // moneda en contra
  exige(mal && !mal.ok, "con la moneda en contra debería salir mal");
  exige(relLee(c, "personal") < per0, "criticarle mal no cuesta nada");
  // y el dinero se cobra
  const din0 = c.dinero;
  relMueve(c, "personal", -30);   // para que cumpla la condición de media baja
  EJES.forEach(k => c.rel[k] = 40);
  exige(charlaDisponible(c, "psicologo"), "el psicólogo no está disponible con la relación rota");
  charlaHabla(c, "psicologo", () => 0.99);
  exige(c.dinero === din0 - 900, "el psicólogo no se cobra: " + (din0 - c.dinero));
  return CHARLAS.length + " conversaciones con precio, espera y riesgo";
});


/* Entrenar deja de ser resoluble -----------------------------------------
   La regla: no puede haber una jugada que gane siempre. Machacar el mismo
   golpe rinde cada vez menos, la carga tiene un punto bueno del que se sale
   por arriba y por abajo, y el sitio donde entrenas renuncia a algo. */
comprueba("Entreno: cada contexto cuesta y renuncia a algo", () => {
  const ids = Object.keys(CTX_ENTRENO);
  exige(ids.length >= 6, "solo hay " + ids.length + " sitios donde entrenar");
  ids.forEach(id => {
    const d = CTX_ENTRENO[id];
    exige(typeof d.gan === "number" && typeof d.carga === "number", id + " no declara ganancia ni carga");
    // gratis y sin inconveniente sería la respuesta correcta siempre
    const barato = !d.coste;
    const renuncia = d.gan < 1 || d.sinTorneo || d.fisico;
    exige(!barato || renuncia || id === "pista", id + " es gratis y no renuncia a nada: gana siempre");
    [ctxNombre, ctxDesc, ctxEfecto].forEach(f => {
      const x = f(id);
      exige(x && !/^ctx_/.test(x), id + ": sin traducir (" + x + ")");
    });
  });
  // la concentración cierra el circuito esa semana
  const c = nuevaCarrera();
  exige(!ctxBloqueaTorneo(c), "sin elegir nada ya te deja fuera del circuito");
  ctxElige(c, "stage");
  exige(ctxBloqueaTorneo(c), "la concentración no te deja fuera del circuito");
  return ids.length + " sitios, todos con su renuncia";
});

comprueba("Entreno: machacar el mismo golpe rinde cada vez menos", () => {
  const c = nuevaCarrera();
  frAsegura(c);
  exige(adaptFactor(c, "volea") === 1, "el golpe fresco ya viene trillado");
  for (let i = 0; i < 3; i++) { adaptTrabaja(c, "volea"); adaptDescansa(c, "volea"); }
  const tres = adaptFactor(c, "volea");
  for (let i = 0; i < 4; i++) { adaptTrabaja(c, "volea"); adaptDescansa(c, "volea"); }
  const siete = adaptFactor(c, "volea");
  exige(tres < 1 && siete < tres, "no baja el rendimiento: " + tres + " / " + siete);
  exige(siete <= .45, "siete semanas seguidas y aún rinde al " + Math.round(siete * 100) + "%");
  // y lo que se deja de tocar se desentumece
  const antes = adaptLee(c, "volea");
  for (let i = 0; i < 6; i++) adaptDescansa(c, "fondo");
  exige(adaptLee(c, "volea") < antes, "abandonar el golpe no lo devuelve a fresco");
  return "de ×1,00 a ×" + siete.toFixed(2) + " en siete semanas seguidas";
});

comprueba("Entreno: la carga tiene un punto bueno y dos maneras de fallarlo", () => {
  const c = nuevaCarrera();
  frAsegura(c);
  c.carga = CARGA_OPT;
  const optimo = cargaGanX(c);
  c.carga = 5;   const parado = cargaGanX(c);
  c.carga = 98;  const pasado = cargaGanX(c);
  exige(optimo > parado && optimo > pasado, "el óptimo no es el óptimo");
  exige(parado < .6 && pasado < .6, "fallar la carga no cuesta nada: " + parado + " / " + pasado);
  exige(cargaEstado({ carga: 5 }) === "parado" && cargaEstado({ carga: 98 }) === "pasado", "los estados no cuadran");
  // pasarse además rompe cuerpos
  c.carga = 40; const sano = cargaLesionX(c);
  c.carga = 95; const roto = cargaLesionX(c);
  exige(sano === 1 && roto > 1.5, "pasarse de carga no sube el riesgo: " + roto);
  // y la carga se acumula despacio y se va despacio
  c.carga = 0; ctxElige(c, "pista"); c.intens = "intensa";
  cargaAplica(c, 5); const s1 = c.carga;
  cargaAplica(c, 5); const s2 = c.carga;
  exige(s1 > 0 && s2 > s1, "no se acumula");
  c.intens = "normal"; ctxElige(c, "casa");
  cargaAplica(c, 0); const s3 = c.carga;
  exige(s3 < s2, "no baja al parar");
  return `óptimo ×${optimo.toFixed(2)} · parado ×${parado.toFixed(2)} · pasado ×${pasado.toFixed(2)}, y ×${roto.toFixed(2)} de lesión`;
});

comprueba("Entreno: la forma es temporal y el ritmo se pierde parado", () => {
  const c = nuevaCarrera();
  frAsegura(c);
  exige(formaDe(c, "volea") === 0, "se nace con forma");
  formaSube(c, "volea", 3);
  exige(formaDe(c, "volea") === 3, "no coge forma");
  exige(formaMejor(c) === "volea", "no detecta el golpe fino");
  for (let i = 0; i < 3; i++) formaEnfria(c);
  exige(formaDe(c, "volea") === 0, "la forma no se enfría: " + formaDe(c, "volea"));
  // y no se desborda ni por arriba ni por abajo
  for (let i = 0; i < 40; i++) formaSube(c, "volea", 3);
  exige(formaDe(c, "volea") === FORMA_TOPE, "la forma se desborda");
  // ritmo: competir da, parar quita, y se paga en la cabeza
  c.ritmo = 55;
  exige(ritmoAjusteConf(c) === 0, "en el punto de partida ya ajusta");
  for (let i = 0; i < 4; i++) ritmoSemana(c, true);
  const alto = ritmoAjusteConf(c);
  exige(alto > 0 && ritmoEstado(c) === "lanzado", "competir no da ritmo: " + c.ritmo);
  for (let i = 0; i < 14; i++) ritmoSemana(c, false);
  exige(ritmoAjusteConf(c) < 0 && ritmoEstado(c) === "frio", "parar no enfría: " + c.ritmo);
  return `±${alto} de confianza por el ritmo, y se pierde en ${Math.ceil((100 - 25) / RITMO_PIERDE)} semanas paradas`;
});

comprueba("Entreno: el cuerpo técnico da horquillas, no números", () => {
  const c = nuevaCarrera();
  frAsegura(c);
  c.staff = {};
  exige(precisionStaff(c) === 0, "sin staff ya hay precisión");
  const ciego = banda(50, 0, 13);
  exige(ciego.hi - ciego.lo >= 20, "sin nadie la horquilla es estrecha: " + JSON.stringify(ciego));
  const conStaff = banda(50, 8, 13);
  exige(conStaff.hi - conStaff.lo < ciego.hi - ciego.lo, "el staff no estrecha la horquilla");
  exige(conStaff.lo <= 50 && conStaff.hi >= 50, "la horquilla no contiene el valor real");
  // el pronóstico también es una horquilla, y baja cuando el golpe está trillado
  const fresco = pronosticoEntreno(c, "volea");
  exige(fresco.hi > fresco.lo, "el pronóstico es un número exacto");
  for (let i = 0; i < 6; i++) { adaptTrabaja(c, "volea"); adaptDescansa(c, "volea"); }
  const trillado = pronosticoEntreno(c, "volea");
  exige(trillado.hi < fresco.hi, "el pronóstico ignora la adaptación");
  return `sin staff ±${(ciego.hi - ciego.lo) / 2}, con staff ±${(conStaff.hi - conStaff.lo) / 2}`;
});

comprueba("Entreno: en el gimnasio no se trabaja la dejada", () => {
  const c = nuevaCarrera();
  frAsegura(c);
  const ent_ = { n: "—", niv: 0, esp: [] };
  exige(golpeReal(c, "dejada", ent_, CTX_ENTRENO.pista) === "dejada", "en pista no respeta tu plan");
  const k = golpeReal(c, "dejada", ent_, CTX_ENTRENO.gimnasio);
  exige(ATTR_FISICOS.indexOf(k) >= 0, "el gimnasio entrena la dejada: " + k);
  // y la forma llega a la pista
  c.forma = {}; formaSube(c, "fondo", 5);
  const eq = miTeam();
  const yo = eq.jug.find(j => j.me);
  c.forma = {};
  const eq2 = miTeam();
  const yo2 = eq2.jug.find(j => j.me);
  exige(yo.attrs.fondo > yo2.attrs.fondo, "la forma no llega a la pista: " + yo.attrs.fondo + " vs " + yo2.attrs.fondo);
  return "gimnasio → " + k + ", y la forma se nota en pista";
});


/* El dinero se convierte en estructura -----------------------------------
   Medido: hasta la octava temporada la caja aprieta, y a partir del top 10 se
   dispara a 262.000 sin nada que hacer con ellos. Estas pruebas defienden que
   lo que se compra cambia una decisión y que no se puede comprar todo. */
comprueba("Inversiones: todas cuestan, se mantienen y están traducidas", () => {
  exige(INV_IDS.length >= 5, "solo hay " + INV_IDS.length + " sitios donde meter el dinero");
  INV_IDS.forEach(id => {
    const d = INVERSIONES[id];
    exige(d.coste.length === INV_NIV_MAX && d.sem.length === INV_NIV_MAX, id + " no tiene los tres niveles");
    for (let i = 1; i < INV_NIV_MAX; i++) {
      exige(d.coste[i] > d.coste[i - 1], id + ": subir de nivel no cuesta más");
      exige(d.sem[i] > d.sem[i - 1], id + ": mantener el nivel alto no cuesta más");
    }
    [invNombre, invDesc].forEach(f => {
      const x = f(id);
      exige(x && !/^inv_/.test(x), id + ": sin traducir (" + x + ")");
    });
    for (let n = 1; n <= INV_NIV_MAX; n++) {
      const e = invEfecto(id, n);
      exige(e && !/^inv_/.test(e), id + " nivel " + n + ": sin efecto traducido");
    }
  });
  return INV_IDS.length + " inversiones de " + INV_NIV_MAX + " niveles";
});

comprueba("Inversiones: el mantenimiento impide tenerlo todo", () => {
  const c = nuevaCarrera();
  invAsegura(c);
  c.dinero = 5000000;
  INV_IDS.forEach(id => { for (let n = 0; n < INV_NIV_MAX; n++) invCompra(c, id, "ES"); });
  INV_IDS.forEach(id => exige(invNiv(c, id) === INV_NIV_MAX, id + " no llegó al tope"));
  const tope = invUpkeepTotal(c);
  /* Referencia medida con un bot: un número uno del mundo ingresa del orden de
     3.500€ por semana. Si el mantenimiento total cupiera ahí, tenerlo todo
     sería lo obvio y no habría decisión. */
  exige(tope > 3500, "tenerlo todo cuesta " + tope + "€/sem: cabe en lo que ingresa un nº1");
  // y dos o tres sí caben: si no, el sistema sería decorado
  const c2 = nuevaCarrera(); invAsegura(c2); c2.dinero = 5000000;
  for (let n = 0; n < INV_NIV_MAX; n++) { invCompra(c2, "centro", "ES"); invCompra(c2, "clinica"); }
  exige(invUpkeepTotal(c2) < 3500, "ni dos al máximo caben: " + invUpkeepTotal(c2));
  return `las cinco al máximo: ${tope}€/sem · dos al máximo: ${invUpkeepTotal(c2)}€/sem`;
});

comprueba("Inversiones: cada una cambia algo del motor", () => {
  const c = nuevaCarrera();
  invAsegura(c); c.dinero = 5000000; c.fans = 200000; c.staff = {};
  // centro: viaje y rendimiento del entreno gratis
  exige(invViajeX(c, "AM") === 1 && invCtxGanX(c, "pista") === 1, "sin centro ya hay efecto");
  invCompra(c, "centro", "ES");
  exige(invViajeX(c, "ES") < 1, "el centro no abarata su región");
  exige(invViajeX(c, "AM") > 1, "instalarse lejos no se paga en ningún sitio");
  exige(invCtxGanX(c, "pista") > 1, "el centro no mejora las horas de pista");
  exige(invCtxGanX(c, "sparring") === 1, "el centro también regala el sparring de pago");
  // clínica: bajas más cortas y carga que se descarga antes
  const poso0 = invCargaPoso(c);
  invCompra(c, "clinica");
  exige(invLesionDurX(c) < 1, "la clínica no acorta las bajas");
  exige(invMermaPasos(c) > 1, "la clínica no acelera las secuelas");
  exige(invCargaPoso(c) < poso0, "la clínica no descarga antes");
  // analítica: información
  const p0 = precisionStaff(c);
  invCompra(c, "analitica");
  exige(precisionStaff(c) > p0, "la analítica no estrecha las horquillas");
  exige(invPresionX(c) < 1, "la analítica no baja la presión del rival");
  // academia: renta por fans
  exige(invRenta(c) === 0, "sin academia ya renta");
  invCompra(c, "academia");
  const renta = invRenta(c);
  exige(renta > 0, "la academia no renta");
  const pobre = { fans: 2000, inv: c.inv };
  exige(invRenta(pobre) < INVERSIONES.academia.sem[0], "la academia renta aunque no seas nadie");
  // imagen: seguidores y contratos
  exige(invFansX(c) === 1, "sin agencia ya multiplica");
  invCompra(c, "imagen"); invCompra(c, "imagen");
  exige(invFansX(c) > 1 && invPatroX(c) > 1, "la agencia no hace nada");
  exige(invSubeTier(c), "a nivel 2 la agencia no abre las marcas grandes");
  return `renta de la academia con 200.000 fans: ${renta}€/sem`;
});

comprueba("Inversiones: abrir, subir y cerrar mueven la caja", () => {
  const c = nuevaCarrera();
  invAsegura(c); c.dinero = 20000;
  exige(!invCompra(c, "centro", "ES"), "se abre un centro sin tener el dinero");
  c.dinero = 50000;
  exige(invCompra(c, "centro", "AM"), "no deja abrirlo con dinero de sobra");
  exige(c.dinero === 50000 - INVERSIONES.centro.coste[0], "no cobró el precio: " + c.dinero);
  exige(invRegion(c) === "AM", "no guardó la región");
  exige(invUpkeep(c, "centro") === INVERSIONES.centro.sem[0], "no cobra mantenimiento");
  // subir de nivel mantiene la región
  c.dinero = 200000;
  invCompra(c, "centro");
  exige(invNiv(c, "centro") === 2 && invRegion(c) === "AM", "subir de nivel pierde la región");
  // cerrarla devuelve una parte, no todo
  const antes = c.dinero, dev = invCierra(c, "centro");
  const puesto = INVERSIONES.centro.coste[0] + INVERSIONES.centro.coste[1];
  exige(dev > 0 && dev < puesto, "cerrar devuelve " + dev + " de " + puesto);
  exige(c.dinero === antes + dev, "no ingresó lo devuelto");
  exige(invNiv(c, "centro") === 0 && invUpkeepTotal(c) === 0, "sigue costando mantenimiento");
  // el balance semanal cobra y paga
  c.dinero = 300000; c.fans = 400000;
  invCompra(c, "academia");
  const caja = c.dinero, b = invSemana(c);
  exige(b.renta > 0 && b.gasto > 0, "el balance no mueve nada");
  exige(c.dinero === caja + b.renta - b.gasto, "la caja no cuadra con el balance");
  return `cierre: ${dev}€ de vuelta de ${puesto}€ puestos`;
});


/* El partido te contesta ---------------------------------------------------
   Tres reglas: abusar de un golpe deja de funcionar, cada plan lleva su cuenta
   para que la siguiente decisión sea informada, y la etiqueta del rival sale de
   sus atributos (nunca miente). */
comprueba("Táctica: el rival lee al que solo sabe hacer una cosa", () => {
  const m = { lectura: null, cpu: false };
  const st = { uso: {} };
  // un jugador variado: nadie le lee nada
  ["fondo", "volea", "globo", "bandeja", "vibora", "remate"].forEach(k => { for (let i = 0; i < 6; i++) st.uso[k] = (st.uso[k] || 0) + 1; });
  for (let g = 0; g < 8; g++) tacLee(m, st, 85);
  exige(!m.lectura || m.lectura.nivel <= 0, "leen a alguien que varía: " + JSON.stringify(m.lectura));
  // y ahora uno que solo pega víboras
  const m2 = { lectura: null, cpu: false };
  const st2 = { uso: { vibora: 40, fondo: 10, globo: 8 } };
  const p = tacPatron(st2);
  exige(p.golpe === "vibora" && p.cuota > .6, "no detecta el patrón: " + JSON.stringify(p));
  let aviso = null;
  for (let g = 0; g < 10; g++) aviso = tacLee(m2, st2, 85) || aviso;
  exige(m2.lectura.golpe === "vibora", "no le leen la víbora");
  exige(m2.lectura.nivel >= .9, "la lectura se queda a medias: " + m2.lectura.nivel);
  exige(aviso === "vibora", "no avisa de que te han leído");
  return "variando: sin lectura · 62% de víboras: lectura al " + Math.round(m2.lectura.nivel * 100) + "%";
});

comprueba("Táctica: lo leído rinde menos, y se les olvida si varías", () => {
  const guarda = (typeof match !== "undefined") ? match : null;
  match = { lectura: { golpe: "vibora", nivel: 1 } };
  const leido = tacLecturaX("vibora"), otro = tacLecturaX("volea");
  exige(otro.win === 1 && otro.err === 1, "castiga a un golpe que no te han leído");
  exige(leido.win < 1 && leido.err > 1, "el golpe leído no se paga: " + JSON.stringify(leido));
  exige(leido.win > .7, "la lectura decide el partido ella sola: ×" + leido.win);
  exige(tacLecturaEstado() && tacLecturaEstado().fuerte, "no se puede saber que te tienen leído");
  // variar lo apaga
  const m = { lectura: { golpe: "vibora", nivel: 1 } };
  const variado = { uso: {} };
  ["fondo", "volea", "globo", "bandeja", "vibora", "remate", "dejada"].forEach(k => variado.uso[k] = 5);
  for (let g = 0; g < 8; g++) tacLee(m, variado, 85);
  exige(m.lectura.nivel === 0 && !m.lectura.golpe, "no se les olvida nunca: " + JSON.stringify(m.lectura));
  match = guarda;
  return `leído: win ×${leido.win.toFixed(2)} · err ×${leido.err.toFixed(2)}, y se olvida variando`;
});

comprueba("Táctica: el informe cuenta lo que dio cada plan", () => {
  const m = {};
  const plan = (agres, red) => ({ agres, diana: "repartir", red, clutch: "normal" });
  // subir a la red: winners tuyos y globos en contra
  const gana = { ev: [{ team: 0, shotKey: "volea", end: "winner" }] };
  const globo = { ev: [{ team: 1, shotKey: "globo" }, { team: 1, shotKey: "remate", end: "winner" }] };
  for (let i = 0; i < 6; i++) tacAnota(m, 0, gana, plan("normal", "subir"));
  for (let i = 0; i < 4; i++) tacAnota(m, 1, globo, plan("normal", "subir"));
  for (let i = 0; i < 5; i++) tacAnota(m, 0, gana, plan("conservadora", "normal"));
  const inf = tacInforme(m, 4);
  exige(inf.length === 2, "no separa los planes: " + inf.length);
  const subir = inf.find(x => /subir/.test(x.firma));
  exige(subir.pts === 10 && subir.gan === 6, "las cuentas no salen: " + JSON.stringify(subir));
  exige(subir.w === 6, "no cuenta tus winners: " + subir.w);
  exige(subir.globos === 4, "no cuenta los globos que te pasan por encima: " + subir.globos);
  // y se cuenta en palabras, traducidas
  const txt = tacFirmaTxt(subir.firma);
  exige(txt && !/^tac_/.test(txt) && /\|/.test(txt) === false, "la firma no se lee: " + txt);
  exige(tacFirmaTxt("normal|repartir|normal|normal") === t("tac_inf_plan_base"), "el plan de siempre no tiene nombre");
  const html = tacInformeHTML(m, 4);
  exige(html.indexOf("undefined") < 0 && !/tac_inf_/.test(html), "el informe sale sin traducir");
  return `«${txt}»: 6 de 10 puntos, 6 winners y 4 globos por encima`;
});

comprueba("Táctica: la identidad del rival sale de sus atributos", () => {
  const mk = (mod) => ({ jug: [0, 1].map(() => ({ attrs: Object.fromEntries(ATTR_KEYS.map(k => [k, 60 + (mod[k] || 0)])) })) });
  exige(identidadPareja(mk({ fondo: 20, pared: 20 })) === "muro", "no reconoce un muro");
  exige(identidadPareja(mk({ volea: 20, bandeja: 20 })) === "red", "no reconoce a los de la red");
  exige(identidadPareja(mk({ remate: 22, vibora: 22 })) === "pegada", "no reconoce la pegada");
  exige(identidadPareja(mk({})) === "completos", "una pareja plana debería ser «sin fisuras»");
  // y una diferencia pequeña no es identidad: es ruido
  exige(identidadPareja(mk({ fondo: 4, pared: 4 })) === "completos", "convierte el ruido en identidad");
  // todas están traducidas y todas dicen qué hacer contra ellas
  Object.keys(IDENTIDADES).concat("completos").forEach(id => {
    [identNombre, identDesc, identContra].forEach(f => {
      const x = f(id);
      exige(x && !/^iden_/.test(x), id + ": sin traducir (" + x + ")");
    });
  });
  return Object.keys(IDENTIDADES).length + 1 + " identidades, todas con su antídoto";
});


/* La Copa de Clubes: el modo club tiene competición propia -----------------
   Hasta aquí el club era una carrera con dos parejas: todo colgaba de torneos
   individuales. Estas pruebas defienden que la eliminatoria es una decisión
   (alineación contra el rival y fatiga) y que los socios son un segundo jefe. */
comprueba("Copa: el calendario es de verdad, ida y vuelta y sin premier", () => {
  const cl = fundarClub();
  const L = copAsegura(cl);
  exige(L.grupo.length === COP_CLUBES - 1, "el grupo no tiene siete rivales: " + L.grupo.length);
  exige(new Set(L.grupo).size === L.grupo.length, "hay un club repetido en el grupo");
  exige(L.cal.length === (COP_CLUBES - 1) * 2, "no es ida y vuelta: " + L.cal.length + " jornadas");
  // cada equipo juega una vez por jornada
  L.cal.forEach((j, i) => {
    const vistos = j.par.flat();
    exige(vistos.length === COP_CLUBES, "la jornada " + i + " no empareja a todos");
    exige(new Set(vistos).size === COP_CLUBES, "alguien juega dos veces en la jornada " + i);
  });
  // ida y vuelta: el mismo cruce con el campo cambiado
  const ida = L.cal.slice(0, COP_CLUBES - 1).map(j => j.par.map(p => p.join(">")).sort().join("|"));
  const vue = L.cal.slice(COP_CLUBES - 1).map(j => j.par.map(p => p.slice().reverse().join(">")).sort().join("|"));
  exige(ida.join("#") === vue.join("#"), "la vuelta no invierte la ida");
  // ninguna jornada cae en semana de premier: bastante tiene el club
  L.cal.forEach(j => exige(slotSemana(j.sem).premier === undefined, "hay jornada en semana de premier: " + j.sem));
  return L.cal.length + " jornadas en semanas libres, ida y vuelta";
});

comprueba("Copa: sin cuatro jugadores sanos se pierde un punto sin jugarlo", () => {
  const cl = fundarClub();
  copAsegura(cl);
  exige(cl.plantilla.length === 2, "el club de prueba debería tener dos jugadores");
  exige(copAlineacionAuto(cl).length === 1, "con dos jugadores solo hay una pareja");
  // con cuatro sanos ya hay dos parejas, y nadie se repite
  while (cl.plantilla.length < 4) cl.plantilla.push({ ...cl.plantilla[0], n: "R" + cl.plantilla.length, energia: 100, conf: 55, lesion: null });
  const dos = copAlineacionAuto(cl);
  exige(dos.length === 2, "con cuatro sanos deberían salir dos parejas");
  const nombres = dos.flat().map(j => j.n);
  exige(new Set(nombres).size === 4, "un jugador aparece en las dos parejas: " + nombres.join(","));
  // el lesionado y el fundido no cuentan
  cl.plantilla[0].lesion = { n: "x", sem: 2 };
  cl.plantilla[1].energia = 10;
  exige(copDisponibles(cl).length === 2, "cuenta a lesionados o fundidos: " + copDisponibles(cl).length);
  exige(copAlineacionAuto(cl).length === 1, "alinea a quien no puede jugar");
  return "cuatro sanos → dos parejas · lesionado y fundido fuera";
});

comprueba("Copa: la eliminatoria se juega, cuesta energía y mueve la tabla", () => {
  const cl = fundarClub();
  const L = copAsegura(cl);
  while (cl.plantilla.length < 4) cl.plantilla.push({ ...cl.plantilla[0], n: "R" + cl.plantilla.length, energia: 100, conf: 55, lesion: null });
  cl.plantilla.forEach(j => { j.energia = 100; ATTR_KEYS.forEach(k => j.attrs[k] = 92); });
  // buscamos una jornada en la que juegues tú
  let jor = -1;
  for (let i = 0; i < L.cal.length; i++) if (L.cal[i].par.some(p => p[0] === 0 || p[1] === 0)) { jor = i; break; }
  exige(jor >= 0, "no hay ninguna jornada tuya");
  const mias = copAlineacionAuto(cl);
  const acta = copJuega(cl, jor, mias, 0, 0);
  exige(acta, "la eliminatoria no se resolvió");
  exige(acta.mio + acta.suyo >= 2, "no se jugaron los dos partidos: " + JSON.stringify(acta.partidos));
  exige(acta.mio !== acta.suyo, "una eliminatoria no puede acabar en empate: " + acta.mio + "-" + acta.suyo);
  exige(cl.plantilla.every(j => j.energia < 100), "jugar no cansó a nadie");
  // la tabla recoge el resultado y toda la jornada
  const T = L.tabla;
  exige(T[0].g + T[0].p === 1, "tu club no tiene la eliminatoria anotada");
  const jugados = T.reduce((s, f) => s + f.g + f.p, 0);
  exige(jugados === COP_CLUBES, "no se resolvió la jornada entera: " + jugados);
  exige(T.reduce((s, f) => s + f.pts, 0) === COP_PTS_VICT * (COP_CLUBES / 2), "los puntos de la jornada no cuadran");
  // y no se puede volver a jugar
  exige(!copJuega(cl, jor, mias, 0, 0), "la eliminatoria se puede jugar dos veces");
  exige(copPuesto(cl) >= 1 && copPuesto(cl) <= COP_CLUBES, "el puesto se va de rango");
  return `${acta.mio}-${acta.suyo} · ${acta.partidos.length} partidos · toda la jornada resuelta`;
});

comprueba("Copa: el cruce decide contra quién juega tu mejor pareja", () => {
  const cl = fundarClub();
  const L = copAsegura(cl);
  while (cl.plantilla.length < 4) cl.plantilla.push({ ...cl.plantilla[0], n: "R" + cl.plantilla.length, energia: 100, conf: 55, lesion: null });
  let jor = -1;
  for (let i = 0; i < L.cal.length; i++) if (L.cal[i].par.some(p => p[0] === 0 || p[1] === 0)) { jor = i; break; }
  const cruceP = L.cal[jor].par.find(p => p[0] === 0 || p[1] === 0);
  const iRival = cruceP[0] === 0 ? cruceP[1] : cruceP[0];
  const suyas = copParejasRival(cl, iRival);
  exige(suyas.length === 2, "el rival no presenta dos parejas");
  exige(nivelPareja(suyas[0]) >= nivelPareja(suyas[1]), "sus parejas no vienen ordenadas por nivel");
  const mias = copAlineacionAuto(cl);
  const acta = copJuega(cl, jor, mias, 1, 0);   // cruzadas
  const primero = acta.partidos[0];
  exige(primero.rival === suyas[1].nombre, "cruzando, tu pareja 1 debería jugar contra su 2: " + primero.rival);
  return "cruzadas: tu 1 contra su 2";
});

comprueba("Copa: los socios son el otro jefe y pagan la cuota", () => {
  const cl = fundarClub();
  socAsegura(cl);
  const base = cl.socios, ing0 = socIngreso(cl);
  exige(base > 0 && ing0 > 0, "el club nace sin socios");
  // ganar suma, ganar barriendo suma más, y el derbi lo multiplica
  const acta = (mio, suyo, casa) => ({ mio, suyo, casa, gane: mio > suyo, partidos: [] });
  const c2 = fundarClub(); socAsegura(c2);
  const s0 = c2.socios;
  socTrasEliminatoria(c2, acta(2, 0, true), false);
  const barrido = c2.socios - s0;
  const c3 = fundarClub(); socAsegura(c3);
  const s3 = c3.socios;
  socTrasEliminatoria(c3, acta(2, 1, true), false);
  const sufrido = c3.socios - s3;
  exige(sufrido > 0, "ganar sufriendo no suma socios");
  exige(barrido > sufrido, `barrer (+${barrido}) no vale más que ganar sufriendo (+${sufrido})`);
  // perder en casa duele más que perder fuera
  const c4 = fundarClub(); socAsegura(c4); socTrasEliminatoria(c4, acta(0, 2, true), false);
  const c5 = fundarClub(); socAsegura(c5); socTrasEliminatoria(c5, acta(0, 2, false), false);
  exige(c4.socios < c5.socios, "perder en casa no duele más que perder fuera");
  // y el derbi multiplica lo que pase
  const c6 = fundarClub(); socAsegura(c6); socTrasEliminatoria(c6, acta(2, 0, true), true);
  exige(c6.socios - s0 > barrido, "el derbi no pesa más que una jornada normal");
  // un socio harto no paga igual que uno entregado
  cl.humorSocios = 5; const pobre = socIngreso(cl);
  cl.humorSocios = 95; const rico = socIngreso(cl);
  exige(pobre < rico * .75, "el humor de la grada no se nota en la caja: " + pobre + " vs " + rico);
  exige(socEstado({ humorSocios: 95, socios: 1 }) === "entregados" && socEstado({ humorSocios: 5, socios: 1 }) === "hartos", "los estados no cuadran");
  return `barrido en el derbi: +${c6.socios - s0} socios · cuota ${pobre}€ hartos vs ${rico}€ entregados`;
});

comprueba("Copa: ceder libera ficha y devuelve al jugador mejorado", () => {
  const cl = fundarClub();
  copAsegura(cl); socAsegura(cl);
  const j = cl.plantilla[0];
  exige(!cesionPosible(cl, j), "se puede ceder con la plantilla justa");
  while (cl.plantilla.length < 6) cl.plantilla.push({ ...cl.plantilla[0], n: "R" + cl.plantilla.length, energia: 100, conf: 55, lesion: null, attrs: { ...cl.plantilla[0].attrs } });
  const sobra = cl.plantilla[5];
  exige(cesionPosible(cl, sobra), "con plantilla larga no deja ceder");
  const antes = ATTR_KEYS.reduce((s, k) => s + sobra.attrs[k], 0);
  exige(cesionHaz(cl, sobra), "no cedió");
  exige(sobra.cedido && sobra.cedido.hasta === (cl.semana | 0) + CES_SEMANAS, "la cesión no tiene fecha de vuelta");
  exige(copDisponibles(cl).indexOf(sobra) < 0, "el cedido sigue disponible para la eliminatoria");
  exige(cesionAhorro(cl) > 0, "ceder no ahorra ficha");
  // no vuelve antes de tiempo
  cl.semana += CES_SEMANAS - 1;
  exige(cesionSemana(cl).length === 0, "vuelve antes de tiempo");
  cl.semana += 1;
  const vuelven = cesionSemana(cl);
  exige(vuelven.length === 1, "no vuelve nunca");
  exige(!sobra.cedido, "vuelve pero sigue marcado como cedido");
  exige(ATTR_KEYS.reduce((s, k) => s + sobra.attrs[k], 0) > antes, "vuelve igual que se fue");
  return "cedido " + CES_SEMANAS + " semanas, vuelve mejorado y con la ficha ahorrada";
});

comprueba("Copa: apilar o repartir cambia quién juega con quién", () => {
  const cl = fundarClub();
  copAsegura(cl);
  // cuatro jugadores de nivel escalonado
  const niveles = [90, 80, 70, 60];
  cl.plantilla = niveles.map((n, i) => ({
    ...cl.plantilla[0], n: "J" + n, energia: 100, conf: 55, lesion: null,
    attrs: Object.fromEntries(ATTR_KEYS.map(k => [k, n])),
  }));
  const apila = copAlineacionAuto(cl, false);
  const reparte = copAlineacionAuto(cl, true);
  const nivPar = par => Math.round((mediaAttrs(par[0].attrs) + mediaAttrs(par[1].attrs)) / 2);
  exige(nivPar(apila[0]) === 85 && nivPar(apila[1]) === 65, "apilar no junta a los dos mejores: " + apila.map(nivPar));
  exige(nivPar(reparte[0]) === 75 && nivPar(reparte[1]) === 75, "repartir no equilibra: " + reparte.map(nivPar));
  // apilar da una pareja más fuerte y otra más débil; repartir, dos iguales
  exige(nivPar(apila[0]) > nivPar(reparte[0]), "apilar no hace más fuerte a la primera");
  exige(nivPar(apila[1]) < nivPar(reparte[1]), "apilar no hace más débil a la segunda");
  // con tres disponibles no hay nada que repartir: solo sale una pareja
  cl.plantilla[3].lesion = { n: "x", sem: 1 };
  exige(copAlineacionAuto(cl, true).length === 1, "con tres jugadores inventa una segunda pareja");
  return "apilar 85/65 · repartir 75/75";
});


/* Jerarquía dramática: no todos los partidos valen lo mismo ----------------
   La regla: el peso sale de hechos comprobables del estado de la partida. Si un
   partido «parece» importante pero no cambia nada, no es importante. */
comprueba("Drama: una final de Corona pesa más que una primera ronda", () => {
  const c = nuevaCarrera();
  const bronce = CATS[0], corona = CATS[6];
  const p1 = pesoPartido(c, bronce, 2);      // octavos del torneo más pequeño
  const p2 = pesoPartido(c, bronce, 5);      // su final
  const p3 = pesoPartido(c, corona, 2);      // octavos del más grande
  const p4 = pesoPartido(c, corona, 5);      // su final
  exige(p1 < p2 && p1 < p3, "la ronda y la categoría no pesan: " + [p1, p2, p3].join("/"));
  exige(p4 > p2 && p4 > p3, "la final del torneo grande no es lo que más pesa");
  exige(pesoTier(p1) === "rutina", "una primera ronda de Bronce ya es un partidazo: " + pesoTier(p1));
  exige(pesoTier(p4) === "historica", "la final de una Corona no llega a histórica: " + p4);
  // los cortes están altos a propósito: si todo es grande, nada lo es
  const medios = [CATS[2], CATS[3]].map(cat => pesoTier(pesoPartido(c, cat, 3)));
  exige(medios.every(x => x === "rutina" || x === "seria"), "unos cuartos cualesquiera ya son «grandes»: " + medios);
  return `Bronce 1ª ronda ${p1} · Corona final ${p4}`;
});

comprueba("Drama: lo que te juegas son hechos, no adjetivos", () => {
  const c = nuevaCarrera();
  const corona = CATS[6];
  // sin palmarés, la final es tu primer título
  const L = enJuego(c, corona, 5, null);
  exige(L.some(x => x.k === "titulo"), "una final no pone el título en juego");
  exige(L.some(x => x.k === "primero"), "el primer título no se nombra");
  // con títulos ya no
  c.palmares.push("algo");
  exige(!enJuego(c, corona, 5, null).some(x => x.k === "primero"), "sigue diciendo que es el primero");
  // en octavos no hay título en juego
  exige(!enJuego(c, corona, 2, null).some(x => x.k === "titulo"), "unos octavos reparten título");
  // la némesis y la bestia negra se reconocen
  const riv = { id: "r1", nombre: "Rivales SA" };
  c.nemesis = { id: "r1", elim: 2 };
  exige(enJuego(c, corona, 3, riv).some(x => x.k === "nemesis"), "la némesis no cuenta");
  c.nemesis = null;
  c.h2h = { r1: { v: 0, d: 4 } };
  exige(enJuego(c, corona, 3, riv).some(x => x.k === "bestia"), "la bestia negra no cuenta");
  // y todo lo que se pinta está traducido
  enJuego(c, corona, 5, riv).forEach(x => exige(x.txt && !/^dra_/.test(x.txt), "sin traducir: " + x.txt));
  DRAMA_TIERS.forEach(k => exige(tierNombre(k) && !/^dra_/.test(tierNombre(k)), k + " sin traducir"));
  // un partido sin nada en juego no saca cartel
  const vacio = enJuegoHTML(c, CATS[0], 2, null);
  exige(vacio === "", "pinta cartel sin nada que contar");
  const lleno = enJuegoHTML(c, corona, 5, riv);
  exige(lleno.indexOf("drama") > 0 && !/dra_/.test(lleno), "el cartel sale mal: " + lleno.slice(0, 80));
  return enJuego(c, corona, 5, riv).length + " hechos en juego en una final con bestia negra";
});

comprueba("Drama: la grada escala con lo que hay en juego", () => {
  const flojo = dramaGrada(10), fuerte = dramaGrada(95);
  exige(flojo < fuerte, "la grada suena igual en todo");
  exige(flojo >= .2 && fuerte <= 1, "la intensidad se sale del rango que acepta sfxGrada");
  exige(fuerte - flojo > .5, "la diferencia no se va a oír: " + flojo + " vs " + fuerte);
  return `grada ${flojo.toFixed(2)} en un partido menor · ${fuerte.toFixed(2)} en uno histórico`;
});


/* El arranque cuenta algo -------------------------------------------------
   Las tres escenas leen el estado de la partida y una de ellas es una decisión
   con consecuencias, no un texto de bienvenida. */
comprueba("Arranque: el pacto con tu primera pareja mueve los ejes", () => {
  const c = nuevaCarrera();
  relAsegura(c);
  exige(ARR_PACTOS.length >= 3, "hay menos de tres maneras de plantear la sociedad");
  ARR_PACTOS.forEach(p => {
    exige(Object.keys(p.ef).length, p.id + " no mueve nada: es un texto, no un pacto");
    Object.keys(p.ef).forEach(k => exige(EJES.indexOf(k) >= 0, p.id + " toca un eje inventado: " + k));
    [t("arr_pac_" + p.id), t("arr_pac_" + p.id + "_d")].forEach(x =>
      exige(x && !/^arr_/.test(x), p.id + ": sin traducir"));
  });
  // y cada uno deja la relación en un sitio distinto
  const leal = relLee(c, "lealtad"), amb = relLee(c, "ambicion");
  exige(arrPacto(c, "serio"), "no deja pactar");
  exige(relLee(c, "lealtad") > leal && relLee(c, "ambicion") < amb, "el pacto serio no hace lo que dice");
  const c2 = nuevaCarrera(); relAsegura(c2);
  arrPacto(c2, "temporal");
  exige(relLee(c2, "lealtad") < leal && relLee(c2, "ambicion") > amb, "el pacto temporal no hace lo que dice");
  exige(c.pactoInicial === "serio" && c2.pactoInicial === "temporal", "no se recuerda lo que prometiste");
  return "tres pactos, tres relaciones distintas desde la semana 1";
});

comprueba("Arranque: el primer rival es de tu nivel y vuelve", () => {
  const c = nuevaCarrera();
  const mio = Math.round((mediaAttrs(c.attrs) + mediaAttrs(c.compi.attrs)) / 2);
  const r = arrEligeRival(c);
  exige(r, "no elige primer rival");
  exige(Math.abs(nivelPareja(r) - mio) <= 7, "el primer rival no es de tu nivel: " + nivelPareja(r) + " vs " + mio);
  exige((r.sexo || "M") === (c.sexo || "M"), "el primer rival no es de tu circuito");
  exige(!arrEligeRival(c), "elige un primer rival nuevo cada vez que se pregunta");
  // el sorteo lo trae en las rondas de entrada, y solo las dos primeras temporadas
  let veces = 0;
  for (let i = 0; i < 200; i++) if (arrSorteaRival(c, 1)) veces++;
  exige(veces > 40 && veces < 160, "la probabilidad de que aparezca se va de madre: " + veces + "/200");
  exige(!arrSorteaRival(c, 5), "aparece hasta en la final: eso es una némesis, no un compañero de quinta");
  c.semana = SEMANAS_TEMP * 3 + 1;   // tercera temporada
  exige(!arrSorteaRival(c, 1), "sigue apareciendo pasadas dos temporadas");
  // y se lleva el marcador del duelo
  c.semana = 5;
  arrAnotaRival(c, r.id, true); arrAnotaRival(c, r.id, false); arrAnotaRival(c, "otro", true);
  exige(arrRivalDebut(c).v === 1 && arrRivalDebut(c).d === 1, "el marcador del duelo no cuadra");
  return "rival de nivel " + nivelPareja(r) + " (tú " + mio + "), aparece en " + Math.round(veces / 2) + "% de los sorteos de entrada";
});

comprueba("Arranque: el balance lee la partida, no rellena", () => {
  const c = nuevaCarrera();
  relAsegura(c); frAsegura(c);
  const L = arrBalance(c);
  exige(L.length >= 4, "el balance dice muy poco: " + L.length + " líneas");
  L.forEach(x => exige(x.txt && !/^arr_/.test(x.txt), "sin traducir: " + x.txt));
  // lo que dice cambia con lo que has hecho
  exige(L.some(x => x.k === "pocos"), "sin partidos jugados debería decirlo");
  c.vd = { v: 8, d: 2 };
  exige(arrBalance(c).some(x => /8/.test(x.txt)), "no lee tu récord");
  // el golpe más trabajado sale del registro de adaptación, no del aire
  adaptTrabaja(c, "vibora"); adaptTrabaja(c, "vibora");
  const conEntreno = arrBalance(c).find(x => x.k === "entreno");
  exige(conEntreno && conEntreno.txt.indexOf(atNombre("vibora")) >= 0, "no dice qué has trabajado: " + (conEntreno && conEntreno.txt));
  // y la caja se lee en tres tramos distintos
  const caja = d => { c.dinero = d; return arrBalance(c).find(x => x.k === "caja").txt; };
  exige(caja(100) !== caja(2000) && caja(2000) !== caja(9000), "la caja se cuenta igual con 100€ que con 9.000€");
  // las escenas se preguntan una vez y se marcan vistas
  c.semana = 1; c.arrVistas = {};
  exige(arrEscenaPendiente(c) === "pareja", "la primera semana no presenta a la pareja");
  arrMarca(c, "pareja");
  exige(arrEscenaPendiente(c) === null, "en la semana 1 ya pide la escena del rival");
  c.semana = ARR_SEM_RIVAL;
  exige(arrEscenaPendiente(c) === "rival", "no presenta al rival cuando toca");
  arrMarca(c, "rival");
  c.semana = ARR_SEM_BALANCE;
  exige(arrEscenaPendiente(c) === "balance", "no hace balance cuando toca");
  arrMarca(c, "balance");
  c.semana = 40;
  exige(arrEscenaPendiente(c) === null, "las escenas del arranque vuelven más tarde");
  return L.length + " líneas, todas leídas del estado";
});

comprueba("Copa: la temporada se cierra y paga (regresión: no se cerraba nunca)", () => {
  /* El cierre comparaba `cl.copa.temp === temporada()`, pero al llegar ahí la
     semana ya se ha incrementado y `temporada()` es la NUEVA: la condición era
     falsa siempre y la Copa no daba ni campeón, ni premio, ni título. Cinco
     temporadas de bot terminaron con la tabla a cero sin que nadie lo notara. */
  const cl = fundarClub();
  const L = copAsegura(cl);
  exige(L.temp === temporada(), "la copa no nace en la temporada en curso");
  // la comparación del cierre es contra la temporada anterior
  const src = String(avanzarSemanaClub);
  exige(/copa\.temp\s*===\s*temporada\(\)\s*-\s*1/.test(src),
    "el cierre de la Copa no compara con la temporada anterior: volverá a no cerrarse nunca");
  // y el premio existe y crece hacia arriba de la tabla
  exige(copPremio(1) > copPremio(4) && copPremio(4) > copPremio(8), "el premio no premia acabar arriba");
  exige(copPremio(1) > 15000, "ganar la Copa paga menos que un torneo pequeño: " + copPremio(1));
  return "campeón " + copPremio(1) + "€ · 4º " + copPremio(4) + "€ · último " + copPremio(8) + "€";
});

comprueba("Copa: jugar en casa da taquilla, y fuera no", () => {
  /* La Copa pide cuatro jugadores sanos —el doble de masa salarial— y no pagaba
     nada hasta el cierre: el club se arruinaba por competir. Medido con un bot
     de cinco temporadas, la caja acababa en −490.000€. */
  const cl = fundarClub();
  socAsegura(cl);
  const casa = { casa: true, gane: true, mio: 2, suyo: 0 };
  const fuera = { casa: false, gane: true, mio: 2, suyo: 0 };
  exige(copTaquilla(cl, fuera) === 0, "jugar fuera da taquilla");
  const t1 = copTaquilla(cl, casa);
  exige(t1 > 0, "jugar en casa no da taquilla");
  // gana más el que gana, y el que tiene la grada contenta
  const perdida = copTaquilla(cl, { casa: true, gane: false, mio: 0, suyo: 2 });
  exige(t1 > perdida, "ganar en casa no llena más que perder");
  cl.humorSocios = 95; const contentos = copTaquilla(cl, casa);
  cl.humorSocios = 5; const hartos = copTaquilla(cl, casa);
  exige(contentos > hartos, "el humor de la grada no se nota en la taquilla");
  // y escala con el tamaño del club
  cl.humorSocios = 60; cl.socios = 4000;
  exige(copTaquilla(cl, casa) > t1 * 5, "un club grande no recauda más que uno pequeño");
  return `${t1}€ con ${SOC_BASE} socios · ${copTaquilla(cl, casa)}€ con 4.000`;
});

comprueba("Copa: los rivales son de tu división (regresión: eran los mejores)", () => {
  /* Con el sorteo al azar te tocaban los mejores clubes del circuito desde la
     primera temporada: cinco años de bot, octavo las cinco y todas las
     eliminatorias perdidas. Una competición que no se puede ganar el primer año
     no es una competición. */
  const cl = fundarClub();
  const L = copAsegura(cl);
  const mia = copFuerzaTuya(cl);
  /* El derbi entra siempre, sea del nivel que sea: una liga sin el vecino no es
     una liga. Se aparta para juzgar el resto del grupo. */
  const derbi = cl.derbi && cl.derbi.club;
  const vecinos = L.grupo.filter(i => i !== derbi);
  const fuerzas = vecinos.map(i => copFuerzaClub(cl, i));
  const dist = fuerzas.map(f => Math.abs(f - mia));
  exige(Math.max(...dist) <= 20, "hay un rival a " + Math.max(...dist) + " puntos de nivel: " + fuerzas.join(","));
  // y son los más cercanos que hay en el mundo, salvo el derbi
  const todas = CLUBES_NPC.map((_, i) => i).filter(i => i !== derbi)
    .map(i => Math.abs(copFuerzaClub(cl, i) - mia)).sort((a, b) => a - b);
  exige(Math.max(...dist) <= todas[vecinos.length - 1] + 1,
    "no coge los más cercanos: " + dist.join(",") + " frente a " + todas.slice(0, vecinos.length).join(","));
  // al crecer el club, la división también sube
  cl.plantilla.forEach(j => ATTR_KEYS.forEach(k => j.attrs[k] = 90));
  cl.copa = null;
  const L2 = copAsegura(cl);
  const f2 = L2.grupo.filter(i => i !== derbi).map(i => copFuerzaClub(cl, i));
  exige(f2.reduce((s, x) => s + x, 0) > fuerzas.reduce((s, x) => s + x, 0),
    "subir de nivel no te sube de división: " + f2.join(",") + " vs " + fuerzas.join(","));
  return `tu club ${mia} · rivales ${fuerzas.join("/")} → al subir a 90: ${f2.join("/")}`;
});

comprueba("Copa: la tabla del cierre es la de la temporada que acaba", () => {
  /* `copPuesto` pasa por `copAsegura`, que reconstruye la competición si ha
     cambiado la temporada. Al cerrar, la semana ya ha avanzado: pedir la tabla
     por la vía normal la borraba y el campeón salía siendo siempre tú con cero
     puntos. `copTablaDe` lee la copa que se le da y no reconstruye nada. */
  const cl = fundarClub();
  const L = copAsegura(cl);
  L.tabla[0].pts = 3; L.tabla[3].pts = 30;   // tú tercero, otro campeón
  exige(copPuestoDe(cl, L) > 1, "con 3 puntos frente a 30 sales primero");
  // y con la temporada ya avanzada sigue leyendo la copa vieja
  cl.semana += SEMANAS_TEMP;
  exige(copPuestoDe(cl, L) > 1, "al cambiar de temporada la tabla se borra antes de leerla");
  exige(copPuesto(cl) === 1, "la vía normal debería haber empezado una copa nueva");
  return "cierre y copa nueva, cada uno con su tabla";
});


/* La economía del club tiene que poder cuadrar -----------------------------
   Medido con un bot de cinco temporadas: fundar con cuatro jugadores dejaba la
   caja en −732€ el primer día y el club perdía 900€/semana desde el minuto uno,
   sin suelo (se llegó a −480.000€ sin que pasara nada). */
comprueba("Club: fundar con la plantilla que pide la Copa deja caja", () => {
  const cl = fundarClub();
  // el presupuesto tiene que dar para cuatro jugadores del mercado inicial
  const cuatro = mercadoTmp ? mercadoTmp.slice(0, 4) : [];
  exige(PRESUP_CLUB >= 20000, "el presupuesto fundacional no da para cuatro: " + PRESUP_CLUB);
  // y los salarios tienen que estar en escala con lo que se ingresa
  const j = { attrs: Object.fromEntries(ATTR_KEYS.map(k => [k, 52])) };
  const sal4 = salarioDe(j) * 4;
  /* Referencia: un Continental Bronce entero paga 1.000€ y las cuotas de 400
     socios contentos rondan los 640€/semana. Cuatro salarios no pueden costar
     el doble de todo lo que entra. */
  exige(sal4 < 1200, "cuatro salarios cuestan " + sal4 + "€/semana: fuera de escala");
  return `presupuesto ${PRESUP_CLUB}€ · cuatro salarios de nivel 52: ${sal4}€/sem`;
});

comprueba("Club: la deuda tiene suelo y consecuencia", () => {
  const cl = fundarClub();
  socAsegura(cl);
  while (cl.plantilla.length < 5) cl.plantilla.push({ ...cl.plantilla[0], n: "R" + cl.plantilla.length, attrs: { ...cl.plantilla[0].attrs }, energia: 100, conf: 55, lesion: null });
  const antes = cl.plantilla.length;
  // un agujero que la junta no puede tolerar
  cl.dinero = -200000;
  cl._accion = "descanso";
  avanzarSemanaClub();
  exige(cl.plantilla.length < antes || cl.dinero > -200000,
    "con la caja hundida no pasa nada: sigue con " + cl.plantilla.length + " jugadores y " + cl.dinero + "€");
  // y si no queda a quién vender, la junta se queda sin paciencia
  const cl2 = fundarClub();
  cl2.dinero = -300000;
  const pac = cl2.junta.paciencia;
  cl2._accion = "descanso";
  avanzarSemanaClub();
  exige(cl2.junta.paciencia <= pac, "la junta no se inmuta con el club arruinado");
  return "venta forzosa por encima del agujero, y la junta pierde la paciencia si no queda nadie";
});


/* El presupuesto de energía ------------------------------------------------
   Medido con carreras completas SIN trucar energía ni dinero: con los números
   viejos (4 por sesión, 11 por partido, 12 de recuperación) el que entrenaba
   cinco días vivía a 1 de energía y jugó dos partidos en dos temporadas, el que
   apenas entrenaba terminaba mejor que los demás, y ninguna forma de jugar ganó
   un título en diez temporadas. */
comprueba("Energía: entrenar y competir caben en la misma semana", () => {
  const c = nuevaCarrera();
  c.staff = {};
  // lo que cuesta una semana de trabajo normal
  const gasto = (it, ses) => { c.intens = it; c.energia = 100; c.dia = 1; for (let i = 0; i < ses; i++) entrenarDia(); return 100 - c.energia; };
  const cinco = gasto("normal", 5);
  const cincoIntensa = gasto("intensa", 5);
  exige(cinco < 20, "cinco sesiones normales cuestan " + cinco + " de energía");
  exige(cincoIntensa > cinco, "la intensa no cuesta más que la normal");
  // y lo que se recupera
  c.energia = 40; c.dia = 1; c.lesion = null;
  const antes = c.energia;
  avanzarSemanaCarrera();
  const regen = c.energia - antes + cinco * 0;   // la semana ya no entrena aquí
  exige(regen >= 20, "la recuperación semanal es de " + regen + ": no da ni para entrenar");
  /* La cuenta que importa, con el reparto real de una semana: si compites, los
     días se van en partidos y entrenas dos; si no, entrenas cinco. Ninguna de
     las dos puede salir en números rojos de energía, o el óptimo pasa a ser no
     entrenar —que es exactamente lo que medimos que pasaba—. */
  const semanaTorneo = gasto("normal", 2) + 3 * 7;
  const semanaTrabajo = cinco;
  exige(semanaTorneo <= regen + 4, `una semana de torneo cuesta ${semanaTorneo} y solo se recuperan ${regen}`);
  exige(semanaTrabajo < regen, `una semana de entrenamiento cuesta ${semanaTrabajo} y solo se recuperan ${regen}`);
  return `semana de torneo ${semanaTorneo} · semana de trabajo ${semanaTrabajo} · recuperación ${regen}`;
});

comprueba("Carrera: el staff sin cobrar se marcha (regresión: deuda infinita)", () => {
  /* El staff cobraba a crédito para siempre. Medido con el banco de carreras,
     un perfil que fichaba a los tres del mercado en cuanto tenía 5.000€
     terminaba seis temporadas a −117.636€ jugando igual de bien: la caja
     dejaba de ser un recurso y fichar dejaba de ser una decisión. */
  const c = nuevaCarrera("agresivo");
  c.staff = { entrenador: mkStaff("entrenador", 3), fisio: mkStaff("fisio", 3), fisico: mkStaff("fisico", 3) };
  const nom = Object.keys(c.staff).reduce((s, k) => s + c.staff[k].sal, 0);
  // con un agujero pequeño aguantan: hay un mes de cuerda para reaccionar
  c.dinero = -Math.round(nom * 1.5);
  impagoStaff(c);
  exige(Object.keys(c.staff).filter(k => c.staff[k]).length === 3,
    "el staff se marcha a la primera semana en rojo: no hay margen para reaccionar");
  // con el agujero hecho se marcha el mejor pagado, y SOLO él: una semana mala
  // no puede costarte la estructura entera
  c.dinero = -Math.round(nom * 6);
  const caro = Object.keys(c.staff).sort((a, b) => c.staff[b].sal - c.staff[a].sal)[0];
  impagoStaff(c);
  exige(!c.staff[caro], "no se marcha el mejor pagado");
  exige(Object.keys(c.staff).filter(k => c.staff[k]).length === 2,
    "se cae toda la estructura en la misma semana: no queda margen de reacción");
  // y semana a semana, con la caja arruinada, la sangría termina parando
  c.dinero = -999999;
  for (let s = 0; s < 6; s++) impagoStaff(c);
  exige(Object.keys(c.staff).filter(k => c.staff[k]).length === 0, "queda staff cobrando con la caja arruinada");
  return "nómina " + nom + "€/sem · aguanta a −" + Math.round(nom * 1.5) + "€ · se rompe a −" + Math.round(nom * 6) + "€";
});

comprueba("Motor: ningún estilo gana siempre (regresión: el constructor barría)", () => {
  /* EL FALLO MÁS GRAVE QUE HA TENIDO EL JUEGO. A igualdad de nivel, el estilo
     `constructor` ganaba entre el 93% y el 98% a los otros cuatro, y el
     `bandejero` el 33% a todos. Con eso, elegir estilo al crearte, fichar por
     estilo en el club y todo el sistema de identidades y antídotos eran
     decoración: el partido lo decidía quién tenía más `dejada`.
     La causa era la dejada (win .32, más que un remate) sumada a que el globo
     SIEMPRE echaba de la red al rival, con lo que la bola alta en la red no
     ocurría nunca y bandeja/víbora/remate eran código muerto. */
  nuevaCarrera("agresivo");
  const E = Object.keys(ESTILOS);
  const mkPar = (e, niv) => {
    const jug = [
      { n: "A", estilo: e, perso: "frio", conf: 55, attrs: mkAttrsNivel(niv, e), sexo: "M" },
      { n: "B", estilo: e, perso: "frio", conf: 55, attrs: mkAttrsNivel(niv, e), sexo: "M" }];
    asignaLadosPareja(jug);
    return { nombre: e, atNet: false, jug };
  };
  const N = 24;
  const medias = E.map(a => {
    let tot = 0;
    E.forEach(b => {
      let v = 0;
      for (let i = 0; i < N; i++) { rndSemilla(2100 + i, 2100 + i); if (quickMatch(mkPar(a, 60), mkPar(b, 60)).gane) v++; }
      tot += 100 * v / N;
    });
    return Math.round(tot / E.length);
  });
  const peor = Math.min(...medias), mejor = Math.max(...medias);
  // banda ancha a propósito: con 24 partidos por celda el ruido es de ±10, así
  // que esto NO afina el equilibrio, caza el desastre (33% contra 88%)
  exige(mejor <= 72, "un estilo gana de más a igualdad de nivel: " + E[medias.indexOf(mejor)] + " " + mejor + "%");
  exige(peor >= 28, "un estilo es una trampa a igualdad de nivel: " + E[medias.indexOf(peor)] + " " + peor + "%");
  return E.map((e, i) => e.slice(0, 4) + " " + medias[i] + "%").join(" · ");
});

comprueba("Motor: el globo contra la red se puede castigar (bandeja y remate existen)", () => {
  /* `chooseShot` ofrece ["bandeja","vibora","remate","remate3","remate4"] solo
     con `atNet && high`, y esa situación no llegaba a darse: el globo echaba
     SIEMPRE de la red. Medido antes del arreglo: en 60 partidos, un bandejero
     no pegaba UNA bandeja y un rematador ni un remate; jugaban el partido
     entero con sus peores atributos. */
  nuevaCarrera("agresivo");
  const mkPar = (e, niv) => {
    const jug = [
      { n: "A", estilo: e, perso: "frio", conf: 55, attrs: mkAttrsNivel(niv, e), sexo: "M" },
      { n: "B", estilo: e, perso: "frio", conf: 55, attrs: mkAttrsNivel(niv, e), sexo: "M" }];
    asignaLadosPareja(jug);
    return { nombre: e, atNet: false, jug };
  };
  let bandejas = 0, remates = 0;
  for (let i = 0; i < 20; i++) {
    rndSemilla(3300 + i, 3300 + i);
    quickMatch(mkPar("bandejero", 60), mkPar("defensivo", 60));
    const s = stats[0];
    ["wShot", "eShot"].forEach(k => {
      bandejas += (s[k].bandeja || 0);
      remates += (s[k].remate || 0) + (s[k].remate3 || 0) + (s[k].remate4 || 0) + (s[k].vibora || 0);
    });
  }
  exige(bandejas > 0, "un bandejero no pega una sola bandeja en 20 partidos: la bola alta en la red no ocurre");
  exige(remates > 0, "no se remata ni se pega una víbora en 20 partidos");
  // y el globo tiene que seguir sirviendo para algo: no puede pasar nunca
  const src = String(buildPoint);
  exige(/globoPasa/.test(src) && /pPasa/.test(src), "el globo ha vuelto a ser todo o nada");
  return bandejas + " bandejas · " + remates + " bolas altas atacadas en 20 partidos";
});

comprueba("Motor: la dejada no es el mejor golpe del juego", () => {
  /* Con win .32 la dejada ganaba el punto más veces que un remate (.27)
     arriesgando poco más que una víbora, y encima dejaba al rival descolocado.
     El 78% de los puntos que cerraba un constructor morían en dejada. */
  exige(SHOTS.dejada.win < SHOTS.remate.win, "la dejada cierra más puntos que un remate");
  exige(SHOTS.dejada.err > SHOTS.vibora.err, "la dejada arriesga menos que una víbora");
  // y en la red hay más de dos respuestas, o vuelve a ser una moneda al aire
  const src = String(chooseShot);
  const m = src.match(/else if\(ctx\.atNet\)\s*cands=\[([^\]]+)\]/);
  exige(m && m[1].split(",").length >= 3, "en la red solo hay dos golpes posibles: gana siempre quien tenga más dejada");
  return "dejada win " + SHOTS.dejada.win + " vs remate " + SHOTS.remate.win + " · " + (m ? m[1] : "?");
});

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
  // con energía llena y sin fragilidad, el riesgo es nulo
  exige(riesgoLesionPost(100, 0, false) === 0, "no debería haber riesgo de lesión con energía llena");
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
  const _r = Math.random; Math.random = () => 0;
  const antes = c1.compiMoral, res = aplicarOpcionRuptura(c1, "hablar", ev.motivo);
  Math.random = _r;
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
  // calendario doble vuelta: 14 jornadas de 4 cruces para 8 equipos
  const cal = mkCalendarioLiga(8);
  exige(cal.length === 14, "el calendario de 8 equipos debería tener 14 jornadas");
  exige(cal.every(j => j.length === 4), "cada jornada debería tener 4 cruces");
  cal.forEach(j => { const v = new Set(); j.forEach(([a, b]) => { v.add(a); v.add(b); }); exige(v.size === 8, "un equipo se repite o falta en una jornada"); });
  // cruce a 3 parejas: el club fuerte gana la mayoría de las veces
  let ganaFuerte = 0;
  for (let i = 0; i < 300; i++) if (resuelveCruce(75, 55).ganador === 0) ganaFuerte++;
  exige(ganaFuerte > 200, `el club fuerte debería ganar la mayoría (${ganaFuerte}/300)`);
  exige([0, 1].includes(resuelveCruce(60, 60).ganador), "el cruce no devuelve un ganador válido");
  // jugar la liga entera lleva a playoffs y a un campeón
  const sl = mkSuperliga("Test SC", 64, "#fff");
  exige(sl.equipos.length === 8 && sl.equipos[0].tuyo === true, "tu club no encabeza la lista de equipos");
  let g = 0; while (sl.fase === "liga" && g++ < 50) jugarJornadaLiga(sl);
  exige(sl.fase === "playoff", "al acabar la liga no arrancan los playoffs");
  exige(sl.tabla.every(t => t.pj === 14), "no todos los equipos han jugado sus 14 partidos");
  exige(sl.tabla.reduce((s, t) => s + t.pts, 0) === 4 * 14 * 3, "los puntos totales no cuadran con las victorias");
  jugarPlayoff(sl); exige(sl.playoff.ronda === "final", "tras las semis no se llega a la final");
  jugarPlayoff(sl); exige(sl.fase === "fin" && sl.playoff.campeon != null, "no se corona un campeón");
  return `${cal.length} jornadas; campeón #${sl.playoff.campeon}; fuerte gana ${ganaFuerte}/300`;
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

comprueba("Guardado: con partida empezada se puede elegir 'nueva' (regresión WebView)", () => {
  nuevaCarrera("agresivo");
  guardar();
  exige(infoSlot("carrera"), "la partida no se guardó");
  G = null;
  abrirModo("carrera");
  const btn = document.getElementById("mmNueva");
  exige(btn && btn.onclick, "el modal no ofrece empezar una partida nueva");
  btn.onclick();                  // aquí es donde antes reventaba por .remove()
  exige(infoSlot("carrera"), "empezar una nueva borró la partida guardada antes de tiempo");
  return "modal correcto y guardado intacto";
});

comprueba("Guardado: 'continuar' recupera la partida", () => {
  const c = nuevaCarrera("agresivo");
  const nombre = c.nombre;
  guardar();
  G = null;
  abrirModo("carrera");
  const btn = document.getElementById("mmCont");
  exige(btn && btn.onclick, "el modal no ofrece continuar");
  btn.onclick();
  exige(G && G.carrera && G.carrera.nombre === nombre, "no se recuperó la partida");
  return "partida recuperada";
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

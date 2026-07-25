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
  return `${DILEMAS.length} dilemas · ${LESIONES.length} lesiones · ${Object.keys(REFORMAS).length} reformas · ${HITOS_CARRERA.length + HITOS_CLUB.length} hitos`;
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
    exige(/^fr_fisio_[1-4]$/.test(st.frase), "mkStaff no guarda la frase como clave i18n: " + st.frase);
    exige(t(st.frase) !== st.frase && /[a-z]/i.test(t(st.frase)), "la frase del staff no resuelve a texto");
    // fallback: un guardado antiguo con la frase literal sigue mostrándose
    exige(t("Manos de oro, agenda llena.") === "Manos de oro, agenda llena.", "el fallback de frases antiguas no funciona");
    localStorage.setItem("rpm_idioma", "es");
    exige(atNombre("vibora") === "víbora", "los golpes no vuelven al español");
    // todos los golpes y todas las frases del catálogo tienen clave en los 5 idiomas
    ATTR_KEYS.forEach(k => ["en", "fr", "de", "it"].forEach(l => exige(I18N[l]["at_" + k], `falta at_${k} en ${l}`)));
    Object.values(FRASES_STAFF).forEach(arr => arr.forEach(k => exige(I18N.es[k] && I18N.de[k], "frase de staff sin clave: " + k)));
  } finally { localStorage.removeItem("rpm_idioma"); }
  return "9 golpes y 24 frases de staff en 5 idiomas";
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

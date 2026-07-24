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
  return `${tiros} tiros, fatiga máx ${Math.round(fatMax)}, red ${stats[0].red}-${stats[1].red}, roturas ${stats[0].bp.ganados}/${stats[0].bp.jugados}-${stats[1].bp.ganados}/${stats[1].bp.jugados}`;
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

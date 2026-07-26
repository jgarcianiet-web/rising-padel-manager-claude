/* Capturas para la ficha de tienda.
   ---------------------------------
   Juega una carrera de verdad hasta un punto interesante —varias temporadas,
   títulos, una rivalidad con nombre— y fotografía las ocho pantallas que
   cuentan el juego en orden. Se hace a 1920 para que salga la maquetación
   ancha, no la de móvil.

   Uso:  NODE_PATH=$PWD/node_modules node tools/capturas.js [idioma]
   Salida: docs/tienda/capturas/<idioma>/NN-<pantalla>.png                     */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const RAIZ = path.join(__dirname, "..");
const IDIOMA = process.argv[2] || "es";
const DESTINO = path.join(RAIZ, "docs/tienda/capturas", IDIOMA);
/* Por encima de 1520 px el juego reparte las tarjetas a lo ancho y deja medio
   lienzo vacío: una captura preciosa de nada. Se fotografía con la maqueta
   densa (1280×720 de CSS) y densidad 1,5, así que el PNG sale a 1920×1080 —el
   tamaño que piden las tiendas— y encima nítido, porque aquí todo es texto y
   SVG y escala sin perder. */
const ANCHO = 1280, ALTO = 720, DENSIDAD = 1.5;

/* Deja la partida en un momento con historia que contar: varias temporadas,
   títulos en las vitrinas y un rival con nombre. Se juega de verdad, no se
   inventa el estado, para que las capturas enseñen números coherentes. */
/* El juego abre modales por su cuenta —anuario de temporada, legado, negociación—
   y cualquiera de ellos tapa la captura y bloquea los clics. */
const MODALES = ["anuarioModal", "legadoModal", "dilModal", "ruptModal", "negModal", "clubModal", "modoModal"];
const BORRA_MODALES = "__limpiaModales();";

const SEMBRAR = (semanas) => `
  persoSel = "frio"; sexoSel = "M"; lado = 1; pintarCrear();
  document.getElementById("inSemilla").value = "TIENDA-1";
  empezarCarrera("agresivo");
  const c = G.carrera;
  /* Se juega como jugaría alguien que sabe: entrenar los días libres y entrar
     en el torneo más alto que se pueda GANAR, no en el más alto que exista.
     Una carrera de 24-92 y cero títulos es una captura preciosa de un fracaso. */
  for (let w = 0; w < ${semanas}; w++) {
    c.dinero = Math.max(c.dinero, 5000);
    c.energia = Math.max(c.energia, 75);
    if (!c.planJug || c.planJug === "auto") c.planJug = "auto";
    for (let d = 0; d < 3; d++) { try { entrenarDia(); } catch (e) {} }
    if (!torneo) {
      const pos = miPuesto();
      /* Al torneo más gordo en el que se pueda competir de verdad: sube mucho
         más el ranking perder en octavos de un Élite que ganar un Bronce, pero
         entrar diez niveles por encima es regalar la primera ronda. */
      const niv = Math.round((mediaAttrs(c.attrs) + mediaAttrs(c.compi.attrs)) / 2);
      for (let i = 7; i >= 0 && !torneo; i--) {
        if ((CATS[i].base || 44) - niv > 8) continue;
        try { abrirTorneo(i); } catch (e) {}
      }
    }
    while (torneo) {
      empezarPartido(false);
      const ok = document.getElementById("fichaOk");
      if (ok && ok.onclick) { const f = ok.onclick; ok.onclick = null; f(); }
    }
    if (c.dilemaActivo) aplicarOpcionDilema(c, 0, c.semana);
    // dos palancas que usa cualquier jugador: mejorar de pareja y tener técnico
    if (w % 26 === 12) {
      c.mercadoP = mkMercadoParejas();
      let mejor = -1, tope = mediaAttrs(c.compi.attrs) + 3;
      (c.mercadoP || []).forEach((cd, i) => { const n = mediaAttrs(cd.attrs); if (n > tope) { mejor = i; tope = n; } });
      if (mejor >= 0) { c.dinero = Math.max(c.dinero, primaFichaje(c.mercadoP[mejor])); ficharPareja(mejor, {}); }
    }
    if (!c.staff.entrenador && c.mercadoStaff && c.mercadoStaff.length) {
      const e0 = c.mercadoStaff.find(x => x.rol === "entrenador");
      if (e0) c.staff.entrenador = e0;
    }
    avanzarSemanaCarrera();
    ${BORRA_MODALES}
  }
  ${BORRA_MODALES}
  guiaCierra();
  c.dilemaActivo = null; c._crisisPareja = null;
  ${BORRA_MODALES}
`;



const limpiarPrimeraVez = (p) => p.evaluate(() => __limpiaModales());

(async () => {
  fs.mkdirSync(DESTINO, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: DENSIDAD });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.addInitScript(([l, ids]) => {
    try { localStorage.clear(); localStorage.setItem("rpm_idioma", l); } catch (e) {}
    // el juego abre modales solo: esta función los barre desde cualquier sitio
    window.__limpiaModales = () => {
      ids.forEach(id => { const m = document.getElementById(id); if (m) m.remove(); });
      // la rueda de prensa vive en el HTML: no se borra, se esconde
      const r = document.getElementById("rueda"); if (r) r.classList.add("oculto");
      const t = document.getElementById("toasts"); if (t) t.innerHTML = "";
    };
  }, [IDIOMA, MODALES]);
  await p.goto("file://" + path.join(RAIZ, "src/index.html"));
  await p.waitForTimeout(900);
  try { await p.click("#splash", { timeout: 1500 }); await p.waitForSelector("#splash", { state: "hidden", timeout: 2500 }); } catch (e) {}

  process.stdout.write("sembrando partida… ");
  await p.evaluate(SEMBRAR(Number(process.argv[3]) || 330));
  await p.waitForTimeout(600); await limpiarPrimeraVez(p);
  const estado = await p.evaluate(() => ({ t: temporada(), pos: miPuesto(), tit: G.carrera.palmares.length, fans: G.carrera.fans }));
  console.log(`T${estado.t} · #${estado.pos} · ${estado.tit} títulos · ${estado.fans} fans`);

  /* La rueda de prensa se abre sola al terminar un torneo y, aunque no se vea,
     tapa la pantalla entera e intercepta los clics. Se barre antes de tocar
     nada, no solo antes de disparar. */
  const limpiar = () => p.evaluate(() => { __limpiaModales(); if (typeof G !== "undefined" && G && ent()) ent().dilemaActivo = null; });
  const clic = async (sel) => { await limpiar(); await p.click(sel); };

  const foto = async (n, nombre) => {
    await limpiar();
    await p.waitForTimeout(250);
    const f = path.join(DESTINO, `${String(n).padStart(2, "0")}-${nombre}.png`);
    await p.screenshot({ path: f });
    console.log("  ✓ " + path.basename(f));
  };

  // 1 · el panel de la semana: el corazón del juego
  await clic("#tabSemana"); await p.waitForTimeout(350);
  await foto(1, "semana");

  // 2 · la ficha del jugador con sus atributos y su trayectoria
  await clic("#tabJugador"); await p.waitForTimeout(400);
  await foto(2, "jugador");

  // 3 · el periódico
  await clic("#tabDiario"); await p.waitForTimeout(400);
  await foto(3, "periodico");

  // 4 · el ranking del circuito
  await clic("#tabRanking"); await p.waitForTimeout(400);
  await foto(4, "ranking");

  // 5 · la sala de trofeos
  await p.evaluate(() => abrirTrofeos()); await p.waitForTimeout(500);
  await foto(5, "trofeos");
  await p.evaluate(() => cerrarTrofeos()); await p.waitForTimeout(200);

  // 6 · el cuadro del torneo y el informe del ojeador
  await p.evaluate(() => { const c = G.carrera; c.dinero = 9000; c.energia = 95;
    for (let i = 3; i >= 0 && !torneo; i--) { try { abrirTorneo(i); } catch (e) {} }
    if (torneo) { pintarTorneo(); irA("torneo"); } });
  await p.waitForTimeout(500);
  await foto(6, "torneo");

  // 7 · un partido en directo, con la retransmisión escrita
  await p.evaluate(() => {
    empezarPartido(true);
    const ok = document.getElementById("fichaOk");
    if (ok && ok.onclick) { const f = ok.onclick; ok.onclick = null; f(); }
    for (let i = 0; i < 26 && match && !match.fin; i++) { const pt = buildPoint(match.server); (pt.ev || []).forEach(e => { if (e.com) addCom(e.com, e.team); if (e.endCom) addCom(e.endCom, e.team); }); resolverPunto(pt.ganador); }
    // el marcador y la retransmisión se repintan por su cuenta cada punto; aquí
    // los puntos se resuelven a mano, así que hay que pedirlo explícitamente
    if (typeof pintaMarcadorP === "function") pintaMarcadorP();
    if (typeof pintaBroadcast === "function") pintaBroadcast();
    if (typeof draw === "function") { resize(); draw(); }
  });
  await p.waitForTimeout(600);
  await foto(7, "partido");

  // 8 · un dilema: la decisión que el juego te pone delante
  await p.evaluate(() => {
    irA("club");
    const c = G.carrera;
    c._rumPareja = "Lebrón/Stupak";
    c.dilemaActivo = { id: "apuestas", sem: c.semana };
    mostrarDilema(c);
  });
  await p.waitForTimeout(400);
  const f8 = path.join(DESTINO, "08-dilema.png");
  await p.screenshot({ path: f8 }); console.log("  ✓ 08-dilema.png");

  // 9 · el modo club: identidad y academia
  await p.evaluate(() => {
    __limpiaModales();
    G = null; sexoClubSel = "M"; colorClubSel = "#C6F53C"; filoClubSel = "cantera";
    irA("crearclub"); prepararCrearClub();
    const bs = [...document.querySelectorAll("#mercadoInicial button")];
    let n = 0; bs.forEach(x => { if (!x.disabled && n < 4) { x.click(); n++; } });
    document.getElementById("btnEmpezarClub").click();
    const cl = G.clubG;
    cl.academia = true; cl.dinero = 24000; cl.staff.ojeador = mkStaff("ojeador", 3);
    const j = mkAgente(52, 58, cl.sexo); j.edad = 18; j.pot = 81; j.aniosCan = 2; j.ilusion = 52;
    j.hist = [{ t: 1, a: 46, b: 53, foco: "remate" }, { t: 2, a: 53, b: 58, foco: "globo" }];
    const j2 = mkAgente(46, 52, cl.sexo); j2.edad = 16; j2.pot = 74; j2.aniosCan = 0; j2.ilusion = 78; j2.hist = [];
    cl.cantera = [j, j2];
    cl.derbi = { club: 0, v: 3, d: 1 };
    guiaCierra();
    cmTab = "club"; pintarClubM();
    ["semana","plantilla","clubpan","ranking","diario"].forEach(x => { const e = document.getElementById("cm-" + x); if (e) e.classList.toggle("oculto", x !== "clubpan"); });
    document.getElementById("cmTabClub").classList.add("on");
    document.getElementById("cmTabSemana").classList.remove("on");
  });
  await p.waitForTimeout(500);
  await foto(9, "club");

  console.log(errs.length ? "ERRORES: " + errs.slice(0, 3).join(" | ") : "sin errores de página");
  await b.close();
})();

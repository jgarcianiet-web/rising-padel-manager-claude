/* Graba los treinta segundos del tráiler jugando de verdad.
   -----------------------------------------------------------------
   El guion plano a plano está en docs/tienda/TRAILER.md; aquí solo se ejecuta.
   Playwright graba el vídeo por su cuenta (webm), así que no hace falta ffmpeg
   ni ninguna otra herramienta externa: se abre el juego, se juega, y al cerrar
   la página el vídeo queda escrito.

   Lo que este script NO hace, a propósito: rótulos y música. Eso se monta
   encima en cualquier editor y así el bruto se puede volver a generar sin
   perder el trabajo de montaje.

   Uso:  NODE_PATH=$PWD/node_modules node tools/trailer.js [idioma]
   Sale: docs/tienda/trailer/trailer-bruto.webm                              */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const RAIZ = path.join(__dirname, "..");
const IDIOMA = process.argv[2] || "es";
const DESTINO = path.join(RAIZ, "docs/tienda/trailer");
const ANCHO = 1280, ALTO = 720;

/* Al añadir un modal nuevo al juego hay que añadirlo aquí: si no, se cuela en
   el plano o bloquea el bot que siembra la partida. */
const MODALES = ["anuarioModal", "legadoModal", "dilModal", "ruptModal", "negModal", "clubModal", "modoModal",
                 "arrModal", "celebraModal", "tmuerto"];

/* Cada plano dura lo que dice el guion. Se respeta al segundo porque un plano
   corto en un juego de leer no enseña nada. */
const PLANOS = { punto: 5000, ojeador: 4000, pareja: 4000, dilema: 4000, diario: 4000, ranking: 4000, trofeos: 4000, cierre: 5000 };

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/* Juega la carrera que se va a enseñar. Se ejecuta dentro de la página. */
const SEMBRAR = (semanas) => {
    persoSel = "frio"; sexoSel = "M"; lado = 1; pintarCrear();
    document.getElementById("inSemilla").value = "TIENDA-1";   // la misma partida de las capturas: la ficha y el tráiler cuentan lo mismo
    empezarCarrera("agresivo");
    const c = G.carrera;
    for (let w = 0; w < semanas; w++) {
      c.dinero = Math.max(c.dinero, 5000); c.energia = Math.max(c.energia, 75);
      // las cinco sesiones y la intensidad según la carga: es lo que hace que la
      // carrera del tráiler sea la de un número uno y no la de un jugador medio
      if (typeof cargaEstado === "function") c.intens = c.carga > 70 ? "suave" : c.carga < 40 ? "intensa" : "normal";
      for (let d = 0; d < 5; d++) { try { entrenarDia(); } catch (e) {} }
      const niv = Math.round((mediaAttrs(c.attrs) + mediaAttrs(c.compi.attrs)) / 2);
      for (let i = 7; i >= 0 && !torneo; i--) { if ((CATS[i].base || 44) - niv > 8) continue; try { abrirTorneo(i); } catch (e) {} }
      while (torneo) { empezarPartido(false); const ok = document.getElementById("fichaOk"); if (ok && ok.onclick) { const f = ok.onclick; ok.onclick = null; f(); } }
      if (c.dilemaActivo) aplicarOpcionDilema(c, 0, c.semana);
      // las escenas del arranque se responden solas: esperan un clic que aquí no llega
      if (typeof arrEscenaPendiente === "function") {
        const esc = arrEscenaPendiente(c);
        if (esc === "pareja") { arrPacto(c, "serio"); arrMarca(c, "pareja"); }
        else if (esc) { if (esc === "rival") arrEligeRival(c); arrMarca(c, esc); }
      }
      if (typeof planElige === "function" && w === 8) planElige(c, "red");
      if (typeof invCompra === "function" && w > 120) {
        ["centro", "clinica", "analitica"].some(id => (invPrecio(c, id) && c.dinero - invPrecio(c, id) > 40000) ? invCompra(c, id, "ES") : false);
      }
      if (w % 26 === 12 && w < semanas - 90) {
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
      __limpiaModales();
    }
    guiaCierra(); c.dilemaActivo = null; c._crisisPareja = null;
    __limpiaModales();
};

/* El vídeo se graba por contexto y desde que se crea, así que sembrar la
   partida dentro de la grabación mete dos minutos y medio de simulación en el
   tráiler. Se hace en dos pasos: un contexto SIN vídeo que juega la carrera y
   guarda la partida, y otro CON vídeo que la carga ya hecha y solo actúa. */
const ARRANQUE = ([l, ids]) => {
  try { localStorage.setItem("rpm_idioma", l); } catch (e) {}
  window.__limpiaModales = () => {
    ids.forEach(id => { const m = document.getElementById(id); if (m) m.remove(); });
    // la rueda de prensa vive en el HTML: no se borra, se esconde
    const r = document.getElementById("rueda"); if (r) r.classList.add("oculto");
    const t = document.getElementById("toasts"); if (t) t.innerHTML = "";
  };
  /* La grabación arranca al crear el contexto, así que los primeros segundos
     son la página cargando y la partida abriéndose: menú, splash y parpadeos.
     Se tapa en negro desde el primer fotograma y se descubre justo cuando
     empieza el primer plano. Va en try porque en el momento en que corre este
     script puede que todavía no haya ni documentElement, y si peta aquí se
     lleva por delante lo definido arriba. */
  const tapa = () => {
    try {
      if (document.getElementById("__telon")) return;
      const raiz = document.body || document.documentElement;
      if (!raiz) return;
      const d = document.createElement("div");
      d.id = "__telon";
      d.style.cssText = "position:fixed;inset:0;background:#000;z-index:99999";
      raiz.appendChild(d);
    } catch (e) {}
  };
  try { document.addEventListener("DOMContentLoaded", tapa); } catch (e) {}
  tapa();
  window.__abreTelon = () => {
    const d = document.getElementById("__telon"); if (d) d.remove();
    /* Los avisos emergentes son útiles jugando y un estorbo en el tráiler:
       aparecen solos y tapan justo los botones que se están enseñando. */
    setInterval(() => { const t = document.getElementById("toasts"); if (t && t.innerHTML) t.innerHTML = ""; }, 300);
  };
};


(async () => {
  fs.mkdirSync(DESTINO, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

  // ---------- paso 1: jugar la carrera, sin cámara ----------
  const ctx0 = await b.newContext({ viewport: { width: ANCHO, height: ALTO } });
  const p0 = await ctx0.newPage();
  await p0.addInitScript(([l, ids]) => { try { localStorage.clear(); } catch (e) {} }, [IDIOMA, MODALES]);
  await p0.addInitScript(ARRANQUE, [IDIOMA, MODALES]);
  await p0.goto("file://" + path.join(RAIZ, "src/index.html"));
  await p0.waitForTimeout(900);
  try { await p0.click("#splash", { timeout: 1500 }); await p0.waitForSelector("#splash", { state: "hidden", timeout: 2500 }); } catch (e) {}
  process.stdout.write("preparando la partida (sin cámara)… ");
  await p0.evaluate(SEMBRAR, Number(process.argv[3]) || 330);
  const est = await p0.evaluate(() => { guardar(); return { t: temporada(), pos: miPuesto(), tit: G.carrera.palmares.length }; });
  const guardado = await p0.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  console.log(`T${est.t} · #${est.pos} · ${est.tit} títulos · ${Object.keys(guardado).length} claves guardadas`);
  await ctx0.close();

  // ---------- paso 2: la misma partida, ya con cámara ----------
  const ctx = await b.newContext({
    viewport: { width: ANCHO, height: ALTO },
    recordVideo: { dir: DESTINO, size: { width: ANCHO, height: ALTO } },
  });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  // el orden importa: primero se define el barrido, y DESPUÉS se restaura la
  // partida. Al revés, el clear() del arranque se llevaba la carrera por delante.
  await p.addInitScript(ARRANQUE, [IDIOMA, MODALES]);
  await p.addInitScript((datos) => { try { Object.keys(datos).forEach(k => localStorage.setItem(k, datos[k])); } catch (e) {} }, guardado);

  await p.goto("file://" + path.join(RAIZ, "src/index.html"));
  await p.waitForTimeout(900);
  try { await p.click("#splash", { timeout: 1500 }); await p.waitForSelector("#splash", { state: "hidden", timeout: 2500 }); } catch (e) {}

  // ---- se retoma la partida guardada por el mismo camino que el botón
  // «continuar» del menú, pero sin pasar por el modal: aquí no hay nadie
  // mirando todavía y lo que interesa es entrar limpio.
  const cargada = await p.evaluate(() => {
    for (let n = 1; n <= (typeof N_RANURAS === "number" ? N_RANURAS : 3); n++) {
      const raw = lsGet(slotKey("carrera", n));
      if (!raw) continue;
      try { G = JSON.parse(raw); } catch (e) { continue; }
      G._slot = n;
      G._fuenteSql = hidratarDesdeSql();
      entrarPartida();
      guiaCierra(); __limpiaModales();
      return { ok: true, slot: n, t: temporada(), pos: miPuesto() };
    }
    return { ok: false };
  });
  if (!cargada.ok) { console.error("no se pudo cargar la partida guardada"); await b.close(); process.exit(1); }
  console.log(`partida cargada de la ranura ${cargada.slot}: T${cargada.t} · #${cargada.pos}`);
  await p.waitForTimeout(500);

  // se levanta el telón: aquí empieza el tráiler de verdad
  const t0 = Date.now();
  await p.evaluate(() => window.__abreTelon && window.__abreTelon());
  console.log("grabando…");

  const limpiar = () => p.evaluate(() => __limpiaModales());

  // ---- 1 · un punto en directo (0:00 – 0:05)
  await p.evaluate(() => {
    const c = G.carrera; c.dinero = 20000; c.energia = 95;
    for (let i = 7; i >= 0 && !torneo; i--) { try { abrirTorneo(i); } catch (e) {} }
    if (torneo) { pintarTorneo(); irA("torneo"); empezarPartido(true); }
    const ok = document.getElementById("fichaOk");
    if (ok && ok.onclick) { const f = ok.onclick; ok.onclick = null; f(); }
    speed = 1; if (typeof jugarPuntoAnim === "function") jugarPuntoAnim();
  });
  await esperar(PLANOS.punto);

  // ---- 2 · el informe del ojeador y la táctica (0:05 – 0:09)
  await p.evaluate(() => {
    if (typeof anim !== "undefined" && anim) { clearInterval(anim); anim = null; }
    match = null; pintarTorneo(); irA("torneo");
    document.getElementById("scoutCaja") && document.getElementById("scoutCaja").scrollIntoView({ block: "center" });
  });
  await esperar(1200);
  await p.evaluate(() => { const b2 = document.querySelector('[data-ac="aplicarTacticaRec"]'); if (b2) b2.click(); });
  await esperar(PLANOS.ojeador - 1200);

  // ---- 3 · la pareja: el plan conjunto y los seis ejes (0:09 – 0:13)
  await limpiar();
  await p.evaluate(() => {
    irA("club");
    if (typeof tabActiva !== "undefined") tabActiva = "jugador";
    const b2 = document.getElementById("tabJugador"); if (b2 && b2.onclick) b2.onclick();
    const e2 = document.getElementById("parejaEjes"); if (e2) e2.scrollIntoView({ block: "center" });
  });
  await esperar(PLANOS.pareja);

  // ---- 4 · un dilema (0:13 – 0:17)
  await limpiar();
  await p.evaluate(() => {
    irA("club");
    const c = G.carrera;
    c.dilemaActivo = { id: "apuestas", sem: c.semana };
    mostrarDilema(c);
  });
  await esperar(PLANOS.dilema - 900);
  await p.evaluate(() => { const b2 = document.querySelector('#dilModal button[data-op="1"]'); if (b2) b2.click(); });
  await esperar(900);

  // ---- 5 · el periódico (0:17 – 0:21)
  await limpiar();
  await p.click("#tabDiario");
  await esperar(PLANOS.diario);

  // ---- 6 · el ranking (0:21 – 0:25)
  await limpiar();
  await p.click("#tabRanking");
  await esperar(PLANOS.ranking);

  // ---- 7 · la sala de trofeos (0:25 – 0:29)
  await limpiar();
  await p.evaluate(() => abrirTrofeos());
  await esperar(1600);
  await p.evaluate(() => { const g = document.querySelector("#trofeos .card"); if (g) g.scrollTop = 260; });
  await esperar(PLANOS.trofeos - 1600);

  // ---- 8 · cierre (0:29 – 0:34)
  await p.evaluate(() => {
    cerrarTrofeos();
    const tapa = document.createElement("div");
    tapa.id = "tapaTrailer";
    tapa.style.cssText = "position:fixed;inset:0;background:#0B0E14;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;opacity:0;transition:opacity .9s";
    tapa.innerHTML = `<img src="${LOGO_JUEGO}" style="width:min(46vw,420px)">
      <div style="font-family:'IBM Plex Mono',monospace;letter-spacing:4px;font-size:15px;color:#C6F53C">6 € · ITCH.IO</div>
      <div style="font-family:'IBM Plex Mono',monospace;letter-spacing:2px;font-size:11px;color:#8B94A7">ESPAÑOL · ENGLISH · FRANÇAIS · DEUTSCH · ITALIANO</div>`;
    document.body.appendChild(tapa);
    requestAnimationFrame(() => { tapa.style.opacity = "1"; });
  });
  await esperar(PLANOS.cierre);

  console.log(`el tráiler dura ${((Date.now() - t0) / 1000).toFixed(1)} s desde que se levanta el telón`);
  console.log(errs.length ? "ERRORES: " + errs.slice(0, 3).join(" | ") : "sin errores de página");
  await p.close();           // cerrar la página es lo que escribe el vídeo
  await ctx.close();
  await b.close();

  // Playwright nombra el fichero con un hash: se le pone nombre de persona.
  const brutos = fs.readdirSync(DESTINO).filter(f => f.endsWith(".webm"));
  const nuevo = brutos.map(f => ({ f, t: fs.statSync(path.join(DESTINO, f)).mtimeMs })).sort((a, b2) => b2.t - a.t)[0];
  if (nuevo) {
    const destino = path.join(DESTINO, "trailer-bruto.webm");
    console.log("corta en el editor por donde termina el negro del principio.");
    if (path.join(DESTINO, nuevo.f) !== destino) fs.renameSync(path.join(DESTINO, nuevo.f), destino);
    console.log("→ " + path.relative(RAIZ, destino) + " · " + Math.round(fs.statSync(destino).size / 1024) + " KB");
  }
})();

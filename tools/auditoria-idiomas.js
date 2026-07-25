/* Auditoría cruzada de idiomas
   ----------------------------
   Uso:  NODE_PATH=./node_modules node tools/auditoria-idiomas.js

   Juega lo mismo en los cinco idiomas, recoge TODO el texto visible de cada
   pantalla y compara. Una cadena que aparece idéntica en tres o más idiomas es
   casi siempre texto sin traducir; las excepciones legítimas son los nombres
   propios (jugadores, clubes, ciudades) y los números.

   Esta es la única prueba que caza lo que los tests de claves no ven: texto que
   nunca pasó por t(). */
const { chromium } = require("playwright-core");
const IDIOMAS = ["es", "en", "fr", "de", "it"];

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const porIdioma = {};
  const errores = [];

  for (const lang of IDIOMAS) {
    const p = await b.newPage(); await p.setViewportSize({ width: 1200, height: 950 });
    p.on("pageerror", e => errores.push(lang + ": " + e.message));
    await p.addInitScript(l => { try { localStorage.clear(); localStorage.setItem("rpm_idioma", l); localStorage.setItem("rpm_tuto_carrera", "1"); localStorage.setItem("rpm_tuto_club", "1"); } catch (e) {} }, lang);
    await p.goto("file:///home/user/rising-padel-manager-claude/src/index.html");
    await p.waitForTimeout(800);
    try { await p.click("#splash", { timeout: 1500 }); await p.waitForSelector("#splash", { state: "hidden", timeout: 2500 }); } catch (e) {}

    const textos = await p.evaluate(() => {
      const out = [];
      const cap = (etq) => {
        document.querySelectorAll("#scr-menu,#scr-crear,#scr-crearclub,#scr-club,#scr-clubm,#scr-torneo,#scr-partido,#scr-superliga,#hud,#modoModal,.card").forEach(el => {
          if (el.offsetParent === null && el.id !== "hud") return;
          (el.innerText || "").split("\n").forEach(l => { const x = l.trim(); if (x.length > 3) out.push(etq + "|" + x); });
        });
      };
      cap("menu");
      // creación
      pintarCrear(); irA("crear"); cap("crear");
      // carrera completa
      persoSel = "frio"; sexoSel = "M"; lado = 1; empezarCarrera("agresivo");
      const c = G.carrera;
      c.dinero = 900; c.fans = 4000; c.energia = 70; c.pro = true; c.edad = 31; c.vd = { v: 30, d: 8 };
      c.sponsor = { marca: "Nébula", sem: 300, tier: 2, sec: "sec_00", primas: [], primasCobradas: {}, spots: 0, tRest: 2, objetivo: 20 };
      ["semana", "entreno", "staff", "jugador", "ranking", "diario"].forEach(tab => { tabActiva = tab; pintarCarrera(); cap("ca-" + tab); });
      // torneo y partido
      abrirTorneo(0); pintarTorneo(); cap("torneo");
      empezarPartido(false); cap("partido");
      const ok = document.getElementById("fichaOk"); if (ok && ok.onclick) { const f = ok.onclick; ok.onclick = null; f(); }
      cap("ficha");
      // club
      G = null; sexoClubSel = "M"; colorClubSel = "#C6F53C";
      prepararCrearClub(); plantillaTmp = [mercadoTmp[0], mercadoTmp[1]]; pintarMercadoInicial();
      document.getElementById("btnEmpezarClub").onclick();
      ["semana", "plantilla", "clubpan", "ranking", "diario"].forEach(tab => { cmTab = tab; pintarClubM(); cap("cl-" + tab); });
      // superliga
      G = null; crearSuperliga();
      let g = 0; while (G.superliga.fase === "liga" && g++ < 40) accionSuperliga();
      pintarSuperliga(); cap("sl");
      return out;
    });
    porIdioma[lang] = textos;
    await p.close();
  }

  // Una línea es sospechosa si aparece IDÉNTICA en 3+ idiomas
  const cuenta = {};
  IDIOMAS.forEach(l => new Set(porIdioma[l]).forEach(x => (cuenta[x] = cuenta[x] || new Set()).add(l)));
  const sosp = Object.entries(cuenta)
    .filter(([txt, langs]) => langs.size >= 3)
    .map(([txt]) => txt.split("|").slice(1).join("|"))
    .filter(x => !/^[\d\s.,:%€·\-+#ºª/()]+$/.test(x))          // solo números y símbolos
    .filter(x => !/^[A-ZÁÉÍÓÚÑ]\.\s/.test(x))                   // "A. Cotelo"
    .filter(x => x.length > 3);

  const unicas = [...new Set(sosp)].sort();
  console.log("líneas recogidas por idioma:", IDIOMAS.map(l => l + ":" + porIdioma[l].length).join(" "));
  console.log("\nSOSPECHOSAS (idénticas en 3+ idiomas):", unicas.length);
  unicas.slice(0, 60).forEach(x => console.log("  «" + x.slice(0, 100) + "»"));
  if (errores.length) { console.log("\nERRORES:", errores.length); errores.slice(0, 5).forEach(e => console.log("  " + e)); }
  await b.close();
})();

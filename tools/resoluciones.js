/* Barrido de resoluciones
   -----------------------
   Uso:  NODE_PATH=./node_modules node tools/resoluciones.js

   Recorre nueve tamaños de pantalla, de móvil mínimo a monitor ancho, juega un
   poco en cada uno y mide dos cosas: si algo se sale por los lados y qué
   porcentaje del ancho aprovecha el contenido.

   Lo primero debe ser SIEMPRE cero. Lo segundo importa en pantallas grandes:
   el contenido estuvo mucho tiempo clavado en 1240 px, así que un monitor de
   2560 se quedaba con media pantalla en negro. */
const { chromium } = require("playwright-core");

const PANTALLAS = [
  [320, 640, "móvil mínimo"],
  [360, 740, "móvil"],
  [414, 896, "móvil grande"],
  [768, 1024, "tableta vertical"],
  [1024, 768, "tableta apaisada"],
  [1280, 800, "portátil"],
  [1440, 900, "portátil grande"],
  [1920, 1080, "monitor"],
  [2560, 1440, "monitor ancho"],
];

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  console.log("pantalla".padEnd(20), "desb".padStart(5), "scrollX".padStart(8), "usado".padStart(7), "  vistas problemáticas");
  for (const [w, h, etq] of PANTALLAS) {
    const p = await b.newPage(); await p.setViewportSize({ width: w, height: h });
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem("rpm_tuto_carrera", "1"); localStorage.setItem("rpm_tuto_club", "1"); } catch (e) {} });
    await p.goto("file:///home/user/rising-padel-manager-claude/src/index.html");
    await p.waitForTimeout(600);
    try { await p.click("#splash", { timeout: 1200 }); await p.waitForSelector("#splash", { state: "hidden", timeout: 2000 }); } catch (e) {}

    const r = await p.evaluate(() => {
      const medidas = [];
      const mide = (etq) => {
        const W = document.documentElement.clientWidth;
        let desb = 0;
        document.querySelectorAll(".card,.opcion,.chip,.pill,button,table,.rk,.paper,canvas,.spost").forEach(el => {
          const b = el.getBoundingClientRect();
          if (b.width > 0 && (b.right > W + 1 || b.left < -1)) desb++;
        });
        const cont = document.querySelector(".cont:not(.oculto)") || document.querySelector(".cont");
        const usado = cont ? Math.round(cont.getBoundingClientRect().width / W * 100) : 0;
        medidas.push({ etq, desb, scrollX: document.documentElement.scrollWidth - W, usado });
      };
      mide("menu");
      persoSel = "frio"; sexoSel = "M"; lado = 1;
      pintarCrear(); irA("crear"); mide("crear");
      empezarCarrera("agresivo");
      ["semana", "entreno", "jugador", "ranking", "diario"].forEach(tb => { tabActiva = tb; pintarCarrera(); mide("ca-" + tb); });
      abrirTorneo(0); pintarTorneo(); mide("torneo");
      empezarPartido(false); mide("partido");
      const ok = document.getElementById("fichaOk"); if (ok && ok.onclick) { const f = ok.onclick; ok.onclick = null; f(); }
      G = null; crearSuperliga(); pintarSuperliga(); mide("superliga");
      return medidas;
    });

    const desb = r.reduce((a, x) => a + x.desb, 0);
    const sx = Math.max(...r.map(x => x.scrollX));
    const usado = Math.round(r.filter(x => x.usado).reduce((a, x) => a + x.usado, 0) / r.filter(x => x.usado).length);
    const malas = r.filter(x => x.desb || x.scrollX > 0).map(x => x.etq).join(",");
    console.log(`${etq.padEnd(20)} ${String(desb).padStart(5)} ${String(sx).padStart(8)} ${String(usado + "%").padStart(7)}   ${malas || "—"}${errs.length ? " ERR:" + errs.length : ""}`);
    await p.close();
  }
  await b.close();
})();

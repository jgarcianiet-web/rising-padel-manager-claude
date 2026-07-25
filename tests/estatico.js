/* Comprobaciones estáticas sobre los ficheros del juego
   -----------------------------------------------------
   Estas pruebas no ejecutan el juego: leen el código fuente y verifican
   propiedades que se pierden por descuido y que no se notan hasta que el
   juego ya está empaquetado en la máquina de alguien (normalmente, sin
   conexión). Cada una corresponde a un fallo real. */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const leer = p => fs.readFileSync(path.join(RAIZ, p), "utf8");
const ficheros = d => fs.readdirSync(path.join(RAIZ, d)).map(f => path.join(d, f));

module.exports = function pruebasEstaticas() {
  const res = [];
  const comprueba = (nombre, fn) => {
    try { res.push({ nombre, ok: true, detalle: fn() || "" }); }
    catch (e) { res.push({ nombre, ok: false, detalle: e.message }); }
  };
  const exige = (c, m) => { if (!c) throw new Error(m || "no se cumple lo esperado"); };

  /* El juego se vende empaquetado y tiene que funcionar sin conexión. Cualquier
     URL remota en el HTML o el CSS significa que algo se ve mal (o no se ve) en
     cuanto el jugador no tiene red. Ya pasó con las cuatro tipografías de
     Google, que dejaban la cabecera del periódico en un serif del sistema. */
  comprueba("Sin red: ni el HTML ni el CSS piden recursos remotos", () => {
    const objetivo = ["src/index.html", ...ficheros("src/css")].filter(f => /\.(html|css)$/.test(f));
    const malos = [];
    for (const f of objetivo) {
      // Se ignoran las data: URI (las fuentes incrustadas viven ahí dentro)
      const txt = leer(f).replace(/url\(data:[^)]*\)/g, "url(data:…)");
      for (const m of txt.matchAll(/https?:\/\/[^\s"')]+/g)) {
        // Los comentarios pueden citar una URL como documentación
        const antes = txt.lastIndexOf("/*", m.index), cierra = txt.indexOf("*/", antes);
        const enComentario = antes >= 0 && cierra > m.index;
        const enComentarioHtml = /<!--(?:(?!-->)[\s\S])*$/.test(txt.slice(0, m.index));
        if (!enComentario && !enComentarioHtml) malos.push(f + " → " + m[0].slice(0, 70));
      }
    }
    exige(!malos.length, "recurso remoto: " + malos.join(", "));
    return objetivo.length + " ficheros limpios";
  });

  /* La CSP es lo que hace cumplir lo anterior en vez de confiar en la buena
     memoria de quien toque el HTML el mes que viene. Durante mucho tiempo el
     README afirmaba que existía y no existía. */
  comprueba("Sin red: la CSP existe y es restrictiva de verdad", () => {
    const html = leer("src/index.html");
    const m = /<meta http-equiv="Content-Security-Policy" content="([\s\S]*?)">/.exec(html);
    exige(m, "no hay etiqueta Content-Security-Policy en index.html");
    const csp = m[1].replace(/\s+/g, " ");
    // Se parte en directivas: si no, el 'unsafe-inline' legítimo de style-src
    // hace pasar por bueno un script-src que también lo llevara
    const dir = {};
    csp.split(";").forEach(d => { const p = d.trim().split(/\s+/); if (p[0]) dir[p[0]] = p.slice(1); });
    exige((dir["default-src"] || []).join(" ") === "'none'", "default-src debería ser 'none'");
    exige((dir["connect-src"] || []).join(" ") === "'none'", "connect-src debería ser 'none' (corta fetch y XHR)");
    exige((dir["script-src"] || []).join(" ") === "'self'",
      "script-src debe ser solo 'self': " + (dir["script-src"] || []).join(" "));
    // frame-ancestors se ignora en <meta>: si alguien la mete, ensucia la consola
    exige(!/frame-ancestors/.test(csp), "frame-ancestors no funciona en <meta>, va en la CSP de Tauri");

    const tauri = JSON.parse(leer("src-tauri/tauri.conf.json"));
    const ct = tauri.app && tauri.app.security && tauri.app.security.csp;
    exige(ct && typeof ct === "string", "la CSP de tauri.conf.json sigue en null");
    exige(/default-src 'none'/.test(ct), "la CSP de Tauri debería partir de default-src 'none'");
    return "navegador y Tauri";
  });

  /* Las tipografías incrustadas son OFL: se pueden usar y vender, pero hay que
     distribuir el aviso. Y sql.js es MIT, que también lo exige. */
  comprueba("Licencias: se distribuyen los avisos de los terceros", () => {
    const lic = leer("LICENSE");
    ["sql.js", "Inter", "Chakra Petch", "IBM Plex Mono", "Playfair Display"].forEach(k =>
      exige(lic.indexOf(k) >= 0, "falta el aviso de " + k + " en LICENSE"));
    exige(/MIT/.test(lic), "falta la licencia MIT de sql.js");
    exige(/Open Font License/.test(lic), "falta la OFL de las tipografías");

    // Si el CSS declara una familia que no está en LICENSE, falta un aviso
    const fuentes = leer("src/css/fuentes.css");
    const familias = [...new Set([...fuentes.matchAll(/font-family:\s*'([^']+)'/g)].map(m => m[1]))];
    familias.forEach(f => exige(lic.indexOf(f) >= 0, "la fuente " + f + " se incrusta pero no está en LICENSE"));
    return familias.length + " familias declaradas";
  });

  return res;
};

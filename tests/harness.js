/* Arnés de pruebas
   -----------------
   Permite ejecutar el juego (que vive dentro de src/index.html) en Node, sin
   navegador, para comprobar automáticamente que nada se ha roto.

   Detalle importante: los elementos simulados NO tienen .remove(), a propósito.
   Así detectamos los fallos que solo se manifiestan en el WebView de móvil/app,
   que es donde nos han aparecido varios errores del tipo "Script error.".

   Los temporizadores no se ejecutan, para que las pruebas sean deterministas
   y no se queden colgadas.
*/

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeEl() {
  return {
    innerHTML: "", textContent: "", value: "Jugador", className: "", disabled: false,
    style: {}, dataset: {}, children: [], files: [], src: "",
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); }, prepend() {}, removeChild() {},
    addEventListener() {}, click() {}, focus() {}, blur() {},
    getContext() { return {}; },
    getBoundingClientRect() { return { width: 400, height: 300, top: 0, left: 0 }; },
    parentElement: { clientWidth: 400 },
    parentNode: { removeChild() {} },
    onclick: null, onchange: null, oninput: null,
  };
}

function almacenFalso() {
  const d = {};
  return {
    getItem(k) { return k in d ? d[k] : null; },
    setItem(k, v) { d[k] = String(v); },
    removeItem(k) { delete d[k]; },
    clear() { for (const k of Object.keys(d)) delete d[k]; },
  };
}

/** Devuelve el código JavaScript del juego.
 *
 *  El juego ya no vive en un único <script> dentro de index.html: está
 *  repartido en varios ficheros clásicos (src/js/**). Aquí leemos index.html,
 *  extraemos los <script src="js/..."> en el mismo orden en que el navegador
 *  los carga y concatenamos su contenido. Así el arnés queda siempre
 *  sincronizado con lo que realmente ejecuta la app: basta con añadir o
 *  reordenar un <script src> en index.html para que las pruebas lo recojan. */
function codigoDelJuego() {
  const dir = path.join(__dirname, "..", "src");
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const orden = [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)].map((m) => m[1]);
  if (!orden.length) {
    throw new Error("No se encontró ningún <script src=\"js/...\"> en src/index.html");
  }
  return orden.map((rel) => fs.readFileSync(path.join(dir, rel), "utf8")).join("\n;\n");
}

/** Crea el navegador simulado. */
function crearSandbox() {
  const els = {};
  const sandbox = {
    console,
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Map, Set,
    isNaN, parseInt, parseFloat,
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => {},
    devicePixelRatio: 1,
    alert: () => {}, confirm: () => true, prompt: () => "",
    localStorage: almacenFalso(),
    addEventListener: () => {}, removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    AudioContext: undefined, webkitAudioContext: undefined,
    RESULTADOS: [],
    __els: els,
  };
  sandbox.document = {
    getElementById(id) { if (!els[id]) els[id] = makeEl(); return els[id]; },
    createElement() { return makeEl(); },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    body: makeEl(),
    addEventListener() {},
  };
  sandbox.window = sandbox;
  return sandbox;
}

/**
 * Ejecuta el juego junto con un bloque de código de pruebas, en un mismo
 * ámbito (igual que si fueran dos <script> de la misma página).
 * Devuelve el sandbox, con RESULTADOS relleno por las pruebas.
 */
function ejecutar(codigoPruebas) {
  const sandbox = crearSandbox();
  vm.createContext(sandbox);
  const completo = codigoDelJuego() + "\n;\n" + (codigoPruebas || "");
  vm.runInContext(completo, sandbox, { filename: "juego+pruebas.js", timeout: 180000 });
  return sandbox;
}

module.exports = { ejecutar, codigoDelJuego, crearSandbox, makeEl };

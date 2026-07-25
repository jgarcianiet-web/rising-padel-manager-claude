/* ================================================================
   GENERADOR DE src/css/fuentes.css

   Descarga de Google Fonts las cuatro familias que usa el juego y las deja
   incrustadas en un CSS como data: URI, para que el juego no pida nada a la
   red al abrirse. Uso:

     node tools/fuentes.js src/css/fuentes.css

   Dos decisiones que explican el tamaño del resultado:

   - Solo el subconjunto "latin". Cubre de sobra los cinco idiomas del juego
     (es/en/fr/de/it) incluidas todas sus tildes, ñ, ç, ü y ß. Traerse
     latin-ext, cirílico y griego multiplicaba el peso por tres para cubrir
     idiomas que no hablamos.

   - Pesos pedidos por rango cuando la familia es variable (Inter, Playfair).
     Un único fichero variable cubre todos los pesos intermedios, así que
     pedir "400..700" baja de cuatro ficheros a uno.
================================================================ */
const { execFileSync } = require("child_process");
const fs = require("fs");

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const get = (url, bin) => execFileSync("curl", ["-sS", "-m", "60", "-A", UA, url], {
  maxBuffer: 1 << 28, encoding: bin ? "buffer" : "utf8",
});

// Los pesos y estilos son exactamente los que aparecen en main.css y
// dashboard.css. Si añades un peso nuevo al CSS, añádelo también aquí.
const FAMILIAS = [
  "Inter:wght@400..700",                          // interfaz
  "Chakra+Petch:ital,wght@0,600;0,700;1,700",     // titulares y marcador
  "IBM+Plex+Mono:wght@400;600",                   // cifras y monoespaciado
  "Playfair+Display:ital,wght@0,700..900;1,700",  // cabecera del periódico
];

const CABECERA = `/* ================================================================
   TIPOGRAFÍAS INCRUSTADAS · fichero generado, no lo edites a mano

   Las cuatro familias viajan aquí dentro como data: URI en vez de pedirse a
   fonts.googleapis.com. Tres motivos:

     1. El juego se empaqueta con Tauri y tiene que verse igual sin conexión.
        Antes, sin red, la cabecera del periódico y el logo caían a las
        tipografías genéricas del sistema y se perdía media identidad visual.
     2. La CSP de index.html ya no permite orígenes remotos.
     3. Un producto de escritorio que llama a Google al abrirse es un
        problema de privacidad que no hace falta tener.

   Regenerar con:  node tools/fuentes.js src/css/fuentes.css

   Inter, Chakra Petch, IBM Plex Mono y Playfair Display se distribuyen bajo
   SIL Open Font License 1.1. Ver LICENSE.
================================================================ */

`;

let salida = CABECERA, bytes = 0, caras = 0;
for (const fam of FAMILIAS) {
  const css = get(`https://fonts.googleapis.com/css2?family=${fam}&display=swap`);
  // La respuesta trae cada @font-face precedido del nombre del subconjunto
  for (const bloque of css.split("/* ").slice(1)) {
    if (bloque.slice(0, bloque.indexOf(" */")) !== "latin") continue;
    const cara = bloque.slice(bloque.indexOf("@font-face"));
    const url = /url\((https:[^)]+\.woff2)\)/.exec(cara);
    if (!url) continue;
    const woff = get(url[1], true);
    bytes += woff.length; caras++;
    salida += cara
      .replace(/url\(https:[^)]+\.woff2\)/, `url(data:font/woff2;base64,${woff.toString("base64")})`)
      .trim() + "\n\n";
  }
}

fs.writeFileSync(process.argv[2] || "src/css/fuentes.css", salida);
console.log(`${caras} caras · ${(bytes / 1024).toFixed(0)} KB de woff2 · ${(salida.length / 1024).toFixed(0)} KB de CSS`);

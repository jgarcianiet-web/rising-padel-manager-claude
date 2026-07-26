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

  /* El ranking va por ventana de 52 semanas, como la FIP: cada resultado
     caduca un año después de conseguirse. El recorte de un 45% al cerrar
     temporada era lo contrario —el ranking quieto once meses y un salto en
     diciembre— y volver a meterlo rompería la defensa de puntos sin que
     ninguna prueba de comportamiento lo notara. */
  comprueba("Ranking: nadie recorta los puntos al cerrar temporada", () => {
    const objetivo = ["src/js/state.js", "src/js/career.js", "src/js/club.js"];
    const malos = [];
    objetivo.forEach(f => {
      leer(f).split("\n").forEach((l, i) => {
        if (/^\s*\/\//.test(l)) return;                       // comentarios, no
        if (/\bpts\s*=\s*Math\.round\([^)]*\*\s*\.?0?\.55\)/.test(l)) malos.push(`${f}:${i + 1}`);
      });
    });
    exige(!malos.length, "recorte de temporada en " + malos.join(", "));
    // y la ventana tiene que seguir siendo de un año
    exige(/const RK_SEMANAS\s*=\s*52\b/.test(leer("src/js/state.js")), "la ventana del ranking ya no son 52 semanas");
    return "los puntos caducan por fecha, no por decreto";
  });

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

  /* Con script-src 'self', un manejador escrito como atributo del marcado es
     código en línea y el navegador se niega a ejecutarlo. Pasó de verdad: al
     poner la CSP, los selectores de dificultad e idioma dejaron de responder y
     ninguna prueba se enteró, porque el arnés no aplica CSP. Los botones que se
     pintan con plantillas usan data-ac + el despachador de ui.js. */
  comprueba("CSP: ninguna plantilla genera manejadores inline", () => {
    const objetivo = [...ficheros("src/js"), ...ficheros("src/js/engine")].filter(f => f.endsWith(".js") && !f.includes("vendor"));
    const malos = [];
    for (const f of objetivo.concat("src/index.html")) {
      leer(f).split("\n").forEach((l, i) => {
        // se ignora la línea del comentario que documenta el problema
        if (/\bonclick\s*=\s*["']/.test(l) && !/despachador|documenta|llevaban/.test(l)) malos.push(f + ":" + (i + 1));
        if (/\son(change|input|submit|keyup|mouse\w+)\s*=\s*["']/.test(l)) malos.push(f + ":" + (i + 1));
      });
    }
    exige(!malos.length, "manejador inline en " + malos.join(", "));
    return objetivo.length + " ficheros sin código en el marcado";
  });

  /* El despachador falla en silencio a propósito, así que un data-ac mal escrito
     daría un botón muerto sin ningún aviso. Esta prueba lo caza en frío. */
  comprueba("CSP: toda acción declarada está registrada", () => {
    const fuentes = [...ficheros("src/js"), ...ficheros("src/js/engine")].filter(f => f.endsWith(".js") && !f.includes("vendor"));
    const todo = fuentes.map(leer).join("\n");
    // nombres usados en las plantillas: ac("nombre", …)
    const usadas = [...new Set([...todo.matchAll(/\bac\(\s*"([^"]+)"/g)].map(m => m[1]))];
    // nombres registrados: el bloque registraAcciones({...}) de extras.js
    const bloque = /registraAcciones\(\{([\s\S]*?)\n\}/.exec(leer("src/js/extras.js"));
    exige(bloque, "no se encuentra el bloque registraAcciones de extras.js");
    // Se recogen todos los identificadores seguidos de coma o dos puntos: capta
    // tanto "cerrarModal:(id)=>…" como las abreviadas "setDif, setIdioma,". Puede
    // recoger de más (algún nombre del cuerpo de una lambda), y da igual: esto es
    // una lista blanca, y de más solo la hace más permisiva. Lo que importa es
    // que no se escape ningún nombre registrado.
    const registradas = new Set([...bloque[1].matchAll(/([A-Za-z_$][\w$]*)\s*[,:]/g)].map(m => m[1]));
    const huerfanas = usadas.filter(u => !registradas.has(u));
    exige(!huerfanas.length, "acción usada pero no registrada: " + huerfanas.join(", "));
    exige(usadas.length >= 15, "se esperaban al menos 15 acciones, hay " + usadas.length);
    return usadas.length + " acciones, todas registradas";
  });

  /* Una reforma que el club puede comprar pero que no aparece en el código que
     resuelve la semana es decoración cara: el jugador paga y no pasa nada.
     Esta prueba lee el fuente porque el efecto vive repartido por club.js. */
  comprueba("Contenido: cada reforma tiene efecto en el código", () => {
    const club = leer("src/js/club.js");
    const cat = /const REFORMAS=\{([\s\S]*?)\n\};/.exec(club);
    exige(cat, "no se encuentra el catálogo REFORMAS");
    const claves = [...cat[1].matchAll(/^\s{2}(\w+):\{/gm)].map(m => m[1]);
    exige(claves.length >= 8, "se esperaban al menos 8 reformas, hay " + claves.length);
    // el cuerpo del fichero SIN el catálogo: ahí es donde debe usarse cada una
    const cuerpo = club.replace(cat[0], "");
    const sinEfecto = claves.filter(k => !new RegExp("reformas(\\.|\\[\")" + k + "\\b").test(cuerpo));
    exige(!sinEfecto.length, "reformas que se venden pero no hacen nada: " + sinEfecto.join(", "));
    return claves.length + " reformas con efecto";
  });

  /* La interfaz tiene que servir de un móvil de 320 px a un monitor de 2560.
     Los puntos de ruptura viven repartidos entre main.css y dashboard.css, y es
     fácil quitar uno sin darse cuenta al reordenar reglas. */
  comprueba("Resoluciones: la interfaz cubre de móvil a monitor ancho", () => {
    const css = leer("src/css/main.css") + leer("src/css/dashboard.css");
    const anchos = [...css.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map(m => +m[1]).sort((a, b) => a - b);
    exige(anchos.length >= 4, "solo hay " + anchos.length + " puntos de ruptura por ancho");
    exige(Math.max(...anchos) >= 1600, "no hay nada previsto por encima de 1600px: los monitores grandes se quedan a medias");
    // el tope de ancho tiene que crecer, no quedarse clavado
    const topes = [...css.matchAll(/\.cont\{max-width:(\d+)px\}/g)].map(m => +m[1]);
    exige(topes.length >= 2, "el ancho máximo del contenido no crece con la pantalla");
    exige(Math.max(...topes) >= 1500, "el contenido se queda en " + Math.max(...topes) + "px de ancho máximo");
    // y los extremos raros deben estar contemplados
    exige(/@media\s*\(pointer:coarse\)/.test(css), "no hay nada específico para pantallas táctiles");
    exige(/max-height:\s*\d+px\)\s*and\s*\(orientation:landscape/.test(css), "no se contempla el móvil apaisado");
    return anchos.length + " puntos de ruptura, hasta " + Math.max(...topes) + "px";
  });

  /* Todo el texto del juego escala con --esc, para que quien no vea bien de
     cerca pueda agrandarlo. Un font-size en px pelado se queda fijo y rompe el
     ajuste sin avisar: solo se ve si alguien con la vista cansada lo sufre. */
  comprueba("Accesibilidad: los tamaños de letra escalan con --esc", () => {
    const objetivo = ficheros("src/css").filter(f => f.endsWith(".css") && !f.includes("fuentes"));
    const malos = [];
    for (const f of objetivo) {
      leer(f).split("\n").forEach((l, i) => {
        // font-size:12px sin calc(); se ignora dentro de calc(...)
        const sin = l.replace(/calc\([^)]*\)/g, "");
        if (/font-size:\s*[0-9.]+px/.test(sin)) malos.push(f + ":" + (i + 1) + "  " + l.trim().slice(0, 60));
      });
    }
    exige(!malos.length, "tamaño fijo (no escala):\n      " + malos.join("\n      "));
    const raiz = leer("src/css/main.css");
    exige(/--esc:\s*1\s*;/.test(raiz), "falta el valor por defecto de --esc en :root");
    const n = (raiz.match(/var\(--esc\)/g) || []).length;
    exige(n >= 60, "solo " + n + " tamaños escalan; deberían ser casi todos");
    return n + " tamaños escalables";
  });

  /* El azar de simulación sale de rnd() (src/js/rng.js), que tiene semilla y se
     puede reproducir. Math.random solo se admite en lo presentacional: si el
     sonido bebiera del mismo flujo, jugar con el sonido apagado daría
     resultados distintos que con el sonido puesto. */
  comprueba("Azar: la simulación no usa Math.random", () => {
    const PRESENTACION = ["src/js/rng.js", "src/js/boot.js"];   // semilla y barra de carga
    const objetivo = [...ficheros("src/js"), ...ficheros("src/js/engine")]
      .filter(f => f.endsWith(".js") && !f.includes("vendor") && !PRESENTACION.includes(f));
    const malos = [];
    let marcadas = 0;
    for (const f of objetivo) {
      leer(f).split("\n").forEach((l, i) => {
        if (!/Math\.random/.test(l)) return;
        if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;              // un comentario que la nombra
        // El azar que solo se oye o se lee (ruido de la grada, frases del
        // narrador) se marca a mano. Obliga a justificar cada excepción en vez
        // de adivinarla desde aquí con una expresión regular frágil.
        if (/\/\/\s*azar-visual/.test(l)) { marcadas++; return; }
        malos.push(f + ":" + (i + 1) + "  " + l.trim().slice(0, 70));
      });
    }
    exige(!malos.length, "Math.random sin marcar en simulación:\n      " + malos.join("\n      "));
    return objetivo.length + " ficheros · " + marcadas + " excepciones marcadas";
  });

  /* EL FALLO QUE MÁS VECES HA VUELTO. Una variable local llamada `t` tapa la
     función de traducción dentro de toda su función —incluida la zona muerta
     anterior a su declaración—, y el juego revienta o se queda en blanco sin
     que ninguna prueba de claves lo note. Ha pasado con la táctica, el tier de
     patrocinador, la tabla de récords y el bucle del punto.

     La regla: si en una función hay una local `t`, esa función NO puede llamar
     a t(). Esta prueba mira exactamente eso. */
  comprueba("Idiomas: nadie tapa t() con una variable local", () => {
    const objetivo = [...ficheros("src/js"), ...ficheros("src/js/engine")]
      .filter(f => f.endsWith(".js") && !f.includes("vendor") && !f.endsWith("i18n.js"));
    const malos = [];
    for (const f of objetivo) {
      const txt = leer(f);
      // se trocea por funciones de primer nivel y se mira cada una por separado
      const re = /\bfunction\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
      let m;
      while ((m = re.exec(txt))) {
        let prof = 0, i = txt.indexOf("{", m.index), fin = i;
        while (fin < txt.length) {
          if (txt[fin] === "{") prof++;
          else if (txt[fin] === "}") { prof--; if (!prof) break; }
          fin++;
        }
        const cuerpo = txt.slice(i, fin + 1);
        const declaraT = /\b(const|let|var)\s+t\s*=/.test(cuerpo) || /^\s*t\s*$|(^|[(,])\s*t\s*([,)])/.test(m[2]);
        const usaT = /\bt\(\s*["'`]/.test(cuerpo);
        if (declaraT && usaT) {
          const linea = txt.slice(0, m.index).split("\n").length;
          malos.push(`${f}:${linea} ${m[1]}()`);
        }
      }
    }
    exige(!malos.length, "una local llamada t tapa la traducción en: " + malos.join(", ") + " — renombra la variable (ta, eq, tt...)");
    return objetivo.length + " ficheros sin shadowing de t()";
  });

  /* Mismo cuento que el shadowing de t(): si una función recibe un parámetro
     llamado rnd, tapa la función global y su respaldo deja de estar sembrado.
     Ya pasó al convertir el motor: once funciones lo hacían. */
  comprueba("Azar: nadie tapa rnd() con un parámetro del mismo nombre", () => {
    const objetivo = [...ficheros("src/js"), ...ficheros("src/js/engine")].filter(f => f.endsWith(".js") && !f.includes("vendor"));
    const malos = [];
    for (const f of objetivo) {
      leer(f).split("\n").forEach((l, i) => {
        if (/function\s+\w+\s*\([^)]*\brnd\b[^)]*\)/.test(l)) malos.push(f + ":" + (i + 1) + " (parámetro)");
        // const rnd = … dentro de una función también la tapa
        if (/^\s*(const|let|var)\s+rnd\s*=/.test(l) && !f.endsWith("rng.js")) malos.push(f + ":" + (i + 1) + " (variable)");
        if (/\brnd\s*\|\|\s*Math\.random/.test(l)) malos.push(f + ":" + (i + 1) + " (respaldo sin semilla)");
      });
    }
    exige(!malos.length, "rnd tapado en " + malos.join(", ") + " — usa otro nombre (azar)");
    return objetivo.length + " ficheros sin shadowing";
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

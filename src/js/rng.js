/* ================================================================
   AZAR CON SEMILLA

   Todo el azar de simulación del juego sale de aquí, no de Math.random. El
   motivo no es la calidad del generador —Math.random va sobrada para un juego—
   sino que su secuencia no se puede reproducir, y eso cerraba varias puertas:

   - No había forma de repetir un partido. Cuando alguien dice «pierdo siempre
     en cuartos con estos atributos», no se podía mirar su caso concreto.
   - Las pruebas del motor tenían que ser de Monte Carlo con márgenes anchos,
     cuando pueden ser exactas.
   - Recargar la partida y volver a jugar el mismo punto daba otro resultado, o
     sea que bastaba con recargar hasta que saliera bien.

   El generador es un mulberry32: 32 bits de estado, rápido, con período de
   sobra para una partida y con muy buena distribución para lo que se le pide.

   DOS RELOJES SEPARADOS. Este flujo lo consume SOLO la simulación (mundo,
   partidos, lesiones, mercado, eventos). Lo puramente presentacional —el
   sonido, la barra de la pantalla de carga— sigue con Math.random a propósito:
   si el audio bebiera de aquí, jugar con el sonido apagado daría resultados
   distintos que con el sonido puesto, que es justo lo que se quiere evitar.

   La semilla y la posición del flujo viajan dentro de la partida guardada
   (G.semilla y G._rngS), así que continuar una partida la retoma donde estaba.
================================================================ */

let _rngS = 0;          // posición actual del flujo (32 bits)
let _rngSemilla = 0;    // semilla con la que nació la partida (no cambia)

/* Semilla nueva al azar, para cuando empieza una partida. Usa Math.random
   adrede: es el único sitio donde hace falta impredecibilidad de verdad. */
function semillaNueva(){ return (Math.floor(Math.random()*4294967296)>>>0)||1; }

/* Arranca el flujo. `pos` permite retomar una partida guardada justo donde
   se quedó, en vez de volver al principio de la secuencia. */
function rndSemilla(semilla,pos){
  _rngSemilla=(semilla>>>0)||1;
  _rngS=(pos===undefined?_rngSemilla:(pos>>>0));
}
function rndEstado(){ return {semilla:_rngSemilla,pos:_rngS}; }

/* mulberry32. Devuelve [0,1), igual que Math.random, para que sustituirlo sea
   un cambio de nombre y nada más. */
function rnd(){
  _rngS=(_rngS+0x6D2B79F5)>>>0;
  let t=_rngS;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}

/* Texto corto y legible de la semilla, para enseñárselo al jugador: en base 36
   son 6-7 caracteres en vez de diez dígitos. */
function semillaTxt(s){ return (((s===undefined?_rngSemilla:s)>>>0)).toString(36).toUpperCase(); }
/* Y la vuelta: acepta lo que teclee el jugador, en base 36 o en decimal. */
function semillaDe(txt){
  const s=String(txt||"").trim().toUpperCase();
  if(!s) return 0;
  const v=/^[0-9]+$/.test(s)?parseInt(s,10):parseInt(s,36);
  return Number.isFinite(v)?(v>>>0):0;
}

/* ---------- puente con la partida ----------

   La pantalla de creación deja escribir una semilla; si el jugador no toca
   nada, se usa la que se le ofrece ya generada. iniciaSemilla() se llama al
   construir G y ANTES de mkWorld(), porque generar el mundo ya consume azar:
   las propiedades de un objeto se evalúan de izquierda a derecha, así que el
   campo `semilla` va delante de `world` a propósito. */
let SEMILLA_ELEGIDA=0;
function iniciaSemilla(){
  const s=SEMILLA_ELEGIDA||semillaNueva();
  SEMILLA_ELEGIDA=0;              // de un solo uso: la siguiente partida vuelve a ser al azar
  rndSemilla(s);
  return s;
}

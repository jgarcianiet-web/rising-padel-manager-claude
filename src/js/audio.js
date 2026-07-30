/* ================= SONIDO (WebAudio sintetizado) ================= */
let AC=null, SND=true;
try{ SND=(localStorage.getItem("rpm_snd")??"1")==="1"; }catch(e){}
function ac(){
  if(AC) return AC;
  try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ AC=null; }
  return AC;
}
function tone(f,d,type,vol,when,f2){
  const a=ac(); if(!a||!SND) return;
  try{
    const t0=a.currentTime+(when||0);
    const o=a.createOscillator(),g=a.createGain();
    o.type=type||"sine"; o.frequency.setValueAtTime(f,t0);
    if(f2) o.frequency.linearRampToValueAtTime(f2,t0+d);
    g.gain.setValueAtTime(vol||.1,t0);
    g.gain.exponentialRampToValueAtTime(.0001,t0+d);
    o.connect(g);g.connect(a.destination);
    o.start(t0);o.stop(t0+d+.02);
  }catch(e){}
}
function ruido(d,vol,when){
  const a=ac(); if(!a||!SND) return;
  try{
    const t0=a.currentTime+(when||0);
    const buf=a.createBuffer(1,a.sampleRate*d,a.sampleRate);
    const ch=buf.getChannelData(0);
    for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;   // azar-visual
    const src=a.createBufferSource();src.buffer=buf;
    const g=a.createGain(), fl=a.createBiquadFilter();
    fl.type="lowpass";fl.frequency.value=1400;
    g.gain.setValueAtTime(vol||.06,t0);
    g.gain.exponentialRampToValueAtTime(.0001,t0+d);
    src.connect(fl);fl.connect(g);g.connect(a.destination);
    src.start(t0);
  }catch(e){}
}
const SFX_GOLPE={remate:170,remate3:160,remate4:150,bajada:190,vibora:230,bandeja:290,volea:340,fondo:300,globo:430,globoRapido:400,chiquita:390,dejada:440,saque:320};
function sfxGolpe(k){ tone(SFX_GOLPE[k]||300,.055,"triangle",.09); ruido(.035,.045); }
function sfxWinner(){ tone(520,.1,"square",.07); tone(784,.14,"square",.06,.08); ruido(.55,.05,.12); sfxGrada(.6); }
function sfxError(){ tone(150,.22,"sawtooth",.06,0,110); sfxGrada(.28); }
function sfxSet(){ tone(660,.1,"sine",.09); tone(880,.2,"sine",.09,.11); sfxGrada(1); }
function sfxTitulo(){ [523,659,784,1047].forEach((f,i)=>tone(f,.17,"square",.08,i*.13)); ruido(1.3,.06,.25); }
function sfxClick(){ tone(720,.03,"square",.04); }
/* El sonido de las cabeceras de momento: la gloria sube, el duelo baja y
   apaga la música (el silencio tras una lesión también es sonido), y la
   vuelta es una nota corta de alivio. */
function sfxMomento(tipo){
  if(tipo==="duelo"){ musicaOff(); tone(196,.7,"sine",.05); tone(147,1.1,"sine",.045,.45); return; }
  if(tipo==="vuelta"){ tone(440,.12,"sine",.06); tone(554,.22,"sine",.06,.14); return; }
  [392,523,659,784].forEach((f,i)=>tone(f,.2,"square",.07,i*.14));
  ruido(1.1,.05,.28);
}
// Blip de notificación para los avisos emergentes, con matiz según el tipo:
// alegre y ascendente para lo bueno, grave y descendente para lo malo. Sutil
// (volumen bajo) para no competir con los efectos del partido.
function sfxAviso(tipo){
  if(tipo==="ok"){ tone(660,.07,"sine",.05); tone(920,.12,"sine",.045,.07); }
  else if(tipo==="bad"){ tone(240,.16,"sawtooth",.05,0,165); }
  else if(tipo==="warn"){ tone(440,.09,"triangle",.05); tone(392,.12,"triangle",.045,.08); }
  else { tone(560,.05,"sine",.04); }
}
// Reacción de la grada: un vítor de público que crece rápido y cae despacio.
// int 0..1 marca la intensidad (punto normal → set/partido).
function sfxGrada(int){
  const a=ac(); if(!a||!SND) return;
  try{
    int=Math.max(.2,Math.min(1,int||.5));
    const t0=a.currentTime, d=.5+int*1.1;
    const buf=a.createBuffer(1,Math.floor(a.sampleRate*d),a.sampleRate), ch=buf.getChannelData(0);
    for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;   // azar-visual
    const src=a.createBufferSource(); src.buffer=buf;
    const bp=a.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=650+int*550; bp.Q.value=.8;
    const g=a.createGain();
    g.gain.setValueAtTime(.0001,t0);
    g.gain.exponentialRampToValueAtTime(.05+int*.11,t0+.12);   // el rugido sube
    g.gain.exponentialRampToValueAtTime(.0001,t0+d);           // y se apaga
    src.connect(bp); bp.connect(g); g.connect(a.destination);
    src.start(t0);
  }catch(e){}
}
// Ambiente de grada: un murmullo de estadio (ruido filtrado, SIN tonos) que
// respira despacio. Sustituye al antiguo pad sintético que molestaba de fondo.
let MUS=null;
function musicaOn(){
  const a=ac(); if(!a||!SND||MUS) return;
  try{
    const dur=2.5, buf=a.createBuffer(1,Math.floor(a.sampleRate*dur),a.sampleRate), ch=buf.getChannelData(0);
    let last=0;
    for(let i=0;i<ch.length;i++){ const w=Math.random()*2-1; last=(last+.02*w)/1.02; ch[i]=last*3.2; }   // azar-visual
    const src=a.createBufferSource(); src.buffer=buf; src.loop=true;
    const bp=a.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=500; bp.Q.value=.6;
    const g=a.createGain(); g.gain.value=0; g.connect(a.destination);
    src.connect(bp); bp.connect(g);
    g.gain.linearRampToValueAtTime(.045,a.currentTime+2.5);   // murmullo suave
    // vaivén lento: la grada respira
    const lfo=a.createOscillator(), lg=a.createGain();
    lfo.type="sine"; lfo.frequency.value=.11; lg.gain.value=.018;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.start();
    MUS={src,g,lfo};
  }catch(e){ MUS=null; }
}
function musicaOff(){
  if(!MUS) return;
  const a=ac();
  try{
    MUS.g.gain.linearRampToValueAtTime(.0001,a.currentTime+1.2);
    const m=MUS; MUS=null;
    setTimeout(()=>{ try{ m.src.stop(); m.lfo&&m.lfo.stop(); }catch(e){} },1400);
  }catch(e){ MUS=null; }
}
/* Sonido de click en la navegación. Un único listener global da respuesta sonora
   a TODA la interfaz sin anotar cada handler. esClicable sube unos niveles
   buscando un elemento realmente interactivo, para sonar en botones, pestañas y
   filas con onclick, pero no en clics sueltos sobre texto o campos de formulario. */
function esClicable(el){
  let n=el, hops=0;
  while(n && n!==document && hops++<4){
    if(n.tagName==="BUTTON"||n.tagName==="A"||n.tagName==="SELECT") return true;
    if(typeof n.onclick==="function") return true;
    if(n.getAttribute && n.getAttribute("role")==="button") return true;
    n=n.parentElement;
  }
  return false;
}
if(typeof document.addEventListener==="function"){
  document.addEventListener("click",e=>{
    if(e&&e.target&&esClicable(e.target)){ ac(); sfxClick(); }
  },true);
}

function buildPoint(server){
  // El índice de equipo se llama `eq` y no `t`: una local llamada t taparía la
  // función de traducción en TODA la función (zona muerta incluida), y este
  // bucle necesita traducir. Es el mismo cuento que avisa CLAUDE.md.
  const TXT_RED=t("com_ganan_red"), TXT_REMATE=t("com_remate_final"), TXT_PELOTEO=t("com_peloteo_eterno");
  const ev=[]; const A=teams[0],B=teams[1];
  A.atNet=false;B.atNet=false;A._scr=false;B._scr=false;
  // dominio de red: quien cierra el punto controlando la red se lleva el crédito
  // (en pádel, la red es el sitio: casi todos los puntos se ganan desde arriba).
  const netCredit=(g)=>{ if(stats&&stats[g]&&teams[g]&&teams[g].atNet) stats[g].red=(stats[g].red||0)+1; };
  // entre punto y punto los cuatro recuperan un poco de fatiga
  if(stats){[0,1].forEach(tt=>{ if(stats[tt]&&stats[tt].fatiga) stats[tt].fatiga=stats[tt].fatiga.map(f=>clamp(f-.8,0,100)); });}
  let eq=server,rally=0;
  let contact=contactPoint(eq,true,eq===0?7.6:2.4);
  let ctx={atNet:false,high:false,afterGlass:false,pressure:0};
  let shotKey="saque";
  let hIdx=contact.x<5?0:1;
  while(true){
    rally++;
    const team=teams[eq],opp=teams[1-eq];
    const pl=team.jug[hIdx];
    if(shotKey!=="saque") shotKey=chooseShot(pl,{...ctx,atNet:team.atNet},opp);
    const jug=pl.n;
    const s=SHOTS[shotKey];
    // tiros y fatiga: cada golpe cuenta y desgasta a quien lo ejecuta
    let _fat=0;
    if(stats&&stats[eq]){
      stats[eq].tiros++;
      // qué golpes juegas: es el patrón que el rival acabará leyendo
      if(typeof tacUsoAnota==="function"&&shotKey!=="saque") tacUsoAnota(stats[eq],shotKey);
      _fat=stats[eq].fatiga[hIdx];
      const coste=(shotKey==="saque"?.3:.7)+(AGRESIVOS.includes(shotKey)?.4:0)+rally*.04;
      stats[eq].fatiga[hIdx]=clamp(_fat+coste,0,100);
    }
    let com=t("com_golpe",{jug,golpe:golpeNombre(shotKey)});
    if(ctx.afterGlass&&!ctx.high) com=t("com_pared",{jug,golpe:golpeNombre(shotKey)});
    if(shotKey==="bajada") com=t("com_bajada",{jug});
    if(ctx.mia) com=t("com_mia",{com});
    if(PRESION>.6&&Math.random()<.3){   // azar-visual
      const p=pl.perso||"frio";
      com+=t(pickVis(p==="emocional" ? ((pl.conf??55)>=60?F_PERSO.emocionalAlto:F_PERSO.emocionalBajo) : (F_PERSO[p]||F_PERSO.frio)));
    } else if(s.attr&&pl.attrs[s.attr]>=85&&Math.random()<.35) com+=` (${atNombre(s.attr)} ${pl.attrs[s.attr]})`;   // azar-visual

    /* Lo que se calcula una vez por PARTIDO va colgado de `match`, no de la
       pareja. Una pareja del mundo es un objeto que vive en `G.world` y dura
       toda la partida: cachearle nada encima es dejárselo puesto para siempre
       —`_defQ` se quedaba con el nivel que tenía el día que jugasteis por
       primera vez, aunque el mundo llevara cinco temporadas mejorando—. */
    if(!match._cache) match._cache={dia:[diaDePartido(),diaDePartido()],defQ:[,], quim:[,]};
    const _c=match._cache;
    if(_c.defQ[1-eq]===undefined) _c.defQ[1-eq]=Math.round((mediaAttrs(opp.jug[0].attrs)+mediaAttrs(opp.jug[1].attrs))/2);
    if(_c.quim[eq]===undefined) _c.quim[eq]=quimicaLado(team);
    const outcome=shotKey==="saque"?"sigue":resolveShot(pl,shotKey,{...ctx,team:eq,oppDef:_c.defQ[1-eq],oppScrambling:opp._scr,_quimLado:_c.quim[eq],_dia:_c.dia[eq],fatiga:_fat},rally);

    if(outcome==="error"){
      stats[eq].jug[hIdx].e++;
      stats[eq].eShot[shotKey]=(stats[eq].eShot[shotKey]||0)+1;   // origen del error (por golpe)
      pl.conf=clamp((pl.conf??55)-4,10,95);
      const modo=pick(["net","out","glass"]);
      ev.push({team:eq,jug,shotKey,com,from:contact,end:modo,endCom:t("com_error",{jug,frase:t(frasePunto(F_ERR,modo))}),net:[A.atNet,B.atNet]});
      netCredit(1-eq);
      return {ev,ganador:1-eq};
    }
    if(outcome==="winner"){
      stats[eq].jug[hIdx].w++;
      stats[eq].wShot[shotKey]=(stats[eq].wShot[shotKey]||0)+1;   // arma que cierra el punto (por golpe)
      pl.conf=clamp((pl.conf??55)+3,10,95);
      const lateral=["remate3","remate4"].includes(shotKey);
      const fin=lateral?"porTres":"winner";
      ev.push({team:eq,jug,shotKey,com,from:contact,end:fin,endCom:t("com_winner",{jug,frase:t(frasePunto(F_WIN,fin))}),net:[A.atNet,B.atNet]});
      netCredit(eq);
      return {ev,ganador:eq};
    }

    const inc=incomingFor(shotKey,1-eq,opp);
    /* EL GLOBO CONTRA LA RED: O LOS PASA, O LES REGALA LA BOLA ARRIBA.
       Antes el globo SIEMPRE echaba de la red al rival, y esa línea se llevaba
       por delante medio juego: la situación «bola alta estando en la red» —la
       única que abre las candidatas ["bandeja","vibora","remate",…]— no podía
       ocurrir nunca, así que ese trozo de `chooseShot` era código muerto.
       Medido: en 60 partidos un bandejero no pegaba UNA bandeja y un rematador
       ni un remate; jugaban los puntos con sus peores atributos y ganaban el
       29% y el 36% a igualdad de nivel, mientras el que menos fallaba se lo
       llevaba todo.

       Ahora el globo se mide contra la defensa aérea del rival: si es bueno,
       los pasa y te quedas la red; si se queda corto, se la dejas alta y te la
       van a pegar. Eso devuelve el bucle que ES el pádel —globo, bandeja,
       globo, bandeja— y le pone al globo el riesgo que le faltaba. */
    let globoPasa=null;
    if(["globo","globoRapido"].includes(shotKey)&&opp.atNet){
      const q=pl.attrs.globo||55;
      const def=Math.max(opp.jug[0].attrs.bandeja||50,opp.jug[1].attrs.bandeja||50);
      /* Y un globo se sube desde donde te dejan subirlo. Éste es el pago de la
         BANDEJA: no gana puntos (win .10, la recompensa más baja del juego),
         gana la posición —te mantiene arriba y obliga al de atrás a levantar
         la bola incómodo, hasta que uno sale corto y se acaba—. Sin este
         término el bandejero era el peor estilo con diferencia (33% a igualdad
         de nivel) porque elegía siempre la más segura de las tres bolas altas
         y la más segura no pagaba nada. */
      const pPasa=clamp(.46+(q-def)/150,.22,.78)-(shotKey==="globoRapido"?.08:0)-(ctx.pressure||0)*.35;
      globoPasa=rnd()<pPasa;
      if(!globoPasa){ inc.ctx={atNet:true,high:true,afterGlass:false,pressure:.15}; inc.c=contactPoint(1-eq,false); inc.vuelo="volea"; }
    }
    let nIdx=inc.c.x<5?0:1;
    if(inc.ctx.high||Math.abs(inc.c.x-5)<1.7){
      const val=j=>inc.ctx.high?opp.jug[j].attrs.remate+opp.jug[j].attrs.bandeja:opp.jug[j].attrs[opp.atNet?"volea":"fondo"]*2;
      const best=val(0)>=val(1)?0:1;
      if(best!==nIdx&&val(best)-val(1-best)>24){nIdx=best;inc.ctx.mia=true;}
    }
    if(globoPasa){
      opp.atNet=false;team.atNet=true;
      ev.push({team:eq,jug,shotKey,com:com+" · "+TXT_RED,from:contact,to:inc.c,vuelo:inc.vuelo,net:[A.atNet,B.atNet],recvIdx:nIdx});
    } else {
      if(shotKey==="saque") team.atNet=true;
      if(shotKey==="dejada"&&!opp.atNet){opp.atNet=true;opp._scr=true;}
      if(shotKey==="bajada"){team.atNet=true;opp.atNet=false;}
      ev.push({team:eq,jug,shotKey,com,from:contact,to:inc.c,vuelo:inc.vuelo,net:[A.atNet,B.atNet],recvIdx:nIdx});
    }
    // rnd() y no Math.random: esto decide oppScrambling, que multiplica por 1,7
    // la probabilidad de winner del siguiente golpe. Es simulación, no adorno,
    // aunque viva en el mismo fichero que el sonido.
    teams[1-eq]._scr=["dejada","vibora","remate"].includes(shotKey)&&rnd()<.5;
    contact=inc.c;ctx=inc.ctx;eq=1-eq;hIdx=nIdx;
    if(rally>26){
      stats[eq].jug[hIdx].w++;
      stats[eq].wShot["remate"]=(stats[eq].wShot["remate"]||0)+1;
      ev.push({team:eq,jug:teams[eq].jug[hIdx].n,shotKey:"remate",com:TXT_REMATE,from:contact,end:"winner",endCom:TXT_PELOTEO,net:[A.atNet,B.atNet]});
      netCredit(eq);
      return {ev,ganador:eq};
    }
    shotKey="_";
  }
}

function segsFor(evt){
  const f=evt.from,segs=[];
  const S=(a,b,h,d)=>segs.push({a:{...a},b:{...b},h,d});
  const heights={saque:.9,fondo:1.1,globo:5.2,globoRapido:3.2,chiquita:.7,volea:.8,dejada:1.2,bandeja:1.9,vibora:1.1,remate:1.4,remate3:2.2,remate4:2.4,bajada:1.2};
  const h=heights[evt.shotKey]||1.2;
  if(evt.end){
    const t=evt.team;
    if(evt.end==="net"){S(f,{x:clamp(f.x+R(-1,1),1,9),y:NET,z:.4},h*.6,.55);S({x:f.x,y:NET,z:.4},{x:f.x,y:NET+(t===0?.4:-.4),z:0},.2,.3);}
    else if(evt.end==="glass"){const gy=t===0?L-0.05:0.05;S(f,{x:clamp(f.x+R(-2,2),1,9),y:gy,z:.5},h*.7,.7);S({x:f.x,y:gy,z:.5},{x:f.x,y:gy+(t===0?-1:1),z:0},.3,.35);}
    else if(evt.end==="out"){S(f,{x:clamp(f.x+R(-2,2),.5,9.5),y:t===0?L+1.2:-1.2,z:1.5},h,.8);}
    else if(evt.end==="porTres"){const bx=f.x<5?-1.6:11.6;S(f,{x:f.x<5?1:9,y:t===0?L-R(2,4):R(2,4),z:0},h,.55);S({x:f.x<5?1:9,y:t===0?L-3:3,z:0},{x:bx,y:t===0?L-2:2,z:2.2},2.2,.6);}
    else {const b1={x:R(1,9),y:evt.team===0?L-R(1.5,4):R(1.5,4),z:0};
      S(f,b1,h,.65);S(b1,{x:clamp(b1.x+R(-1.5,1.5),.5,9.5),y:clamp(b1.y+(evt.team===0?R(.8,2):-R(.8,2)),.3,L-.3),z:0},.5,.45);}
    return segs;
  }
  const c=evt.to;
  if(evt.vuelo==="volea"){S(f,c,h,.6);return segs;}
  if(evt.vuelo==="pared"){
    const gy=evt.team===0?L-0.1:0.1;
    const b1={x:clamp(c.x+R(-.6,.6),1,9),y:evt.team===0?L-R(.6,1.6):R(.6,1.6),z:0};
    S(f,b1,h,.7);S(b1,{x:b1.x,y:gy,z:.45},.15,.16);S({x:b1.x,y:gy,z:.45},c,.6,.5);
    return segs;
  }
  const b1={x:clamp(c.x+R(-.8,.8),1,9),y:evt.team===0?clamp(c.y-R(1,2.2),NET+.5,L-1):clamp(c.y+R(1,2.2),1,NET-.5),z:0};
  S(f,b1,h,.7);S(b1,c,.7,.5);
  return segs;
}


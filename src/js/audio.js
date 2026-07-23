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
    for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;
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
function sfxWinner(){ tone(520,.1,"square",.07); tone(784,.14,"square",.06,.08); ruido(.55,.05,.12); }
function sfxError(){ tone(150,.22,"sawtooth",.06,0,110); }
function sfxSet(){ tone(660,.1,"sine",.09); tone(880,.2,"sine",.09,.11); }
function sfxTitulo(){ [523,659,784,1047].forEach((f,i)=>tone(f,.17,"square",.08,i*.13)); ruido(1.3,.06,.25); }
function sfxClick(){ tone(720,.03,"square",.04); }
let MUS=null;
function musicaOn(){
  const a=ac(); if(!a||!SND||MUS) return;
  try{
    MUS={osc:[],g:a.createGain(),lfo:null};
    MUS.g.gain.value=0; MUS.g.connect(a.destination);
    MUS.g.gain.linearRampToValueAtTime(.028,a.currentTime+2);   // fade in suave
    // acorde de pad (La menor add9): respiración de estadio
    [165,220,277,330].forEach((f,i)=>{
      const o=a.createOscillator(); o.type=i%2?"sine":"triangle";
      o.frequency.value=f;
      const og=a.createGain(); og.gain.value=i===0?.5:.3;
      o.connect(og); og.connect(MUS.g); o.start();
      MUS.osc.push(o);
    });
    // LFO lento que mece el volumen (respiración)
    const lfo=a.createOscillator(), lg=a.createGain();
    lfo.frequency.value=.08; lg.gain.value=.012;
    lfo.connect(lg); lg.connect(MUS.g.gain); lfo.start();
    MUS.lfo=lfo;
  }catch(e){ MUS=null; }
}
function musicaOff(){
  if(!MUS) return;
  const a=ac();
  try{
    MUS.g.gain.linearRampToValueAtTime(.0001,a.currentTime+1.2);
    const m=MUS; MUS=null;
    setTimeout(()=>{ try{ m.osc.forEach(o=>o.stop()); m.lfo&&m.lfo.stop(); }catch(e){} },1400);
  }catch(e){ MUS=null; }
}
if(typeof document.addEventListener==="function"){
  document.addEventListener("click",e=>{
    if(e&&e.target&&e.target.tagName==="BUTTON"){ ac(); sfxClick(); }
  },true);
}

function buildPoint(server){
  const ev=[]; const A=teams[0],B=teams[1];
  A.atNet=false;B.atNet=false;A._scr=false;B._scr=false;
  // entre punto y punto los cuatro recuperan un poco de fatiga
  if(stats){[0,1].forEach(tt=>{ if(stats[tt]&&stats[tt].fatiga) stats[tt].fatiga=stats[tt].fatiga.map(f=>clamp(f-.8,0,100)); });}
  let t=server,rally=0;
  let contact=contactPoint(t,true,t===0?7.6:2.4);
  let ctx={atNet:false,high:false,afterGlass:false,pressure:0};
  let shotKey="saque";
  let hIdx=contact.x<5?0:1;
  while(true){
    rally++;
    const team=teams[t],opp=teams[1-t];
    const pl=team.jug[hIdx];
    if(shotKey!=="saque") shotKey=chooseShot(pl,{...ctx,atNet:team.atNet},opp);
    const jug=pl.n;
    const s=SHOTS[shotKey];
    // tiros y fatiga: cada golpe cuenta y desgasta a quien lo ejecuta
    let _fat=0;
    if(stats&&stats[t]){
      stats[t].tiros++;
      _fat=stats[t].fatiga[hIdx];
      const coste=(shotKey==="saque"?.3:.7)+(AGRESIVOS.includes(shotKey)?.4:0)+rally*.04;
      stats[t].fatiga[hIdx]=clamp(_fat+coste,0,100);
    }
    let com=`${jug} — ${s.label}`;
    if(ctx.afterGlass&&!ctx.high) com=`${jug} — salida de pared → ${s.label}`;
    if(shotKey==="bajada") com=`¡${jug} baja la pared con todo!`;
    if(ctx.mia) com=`«¡Mía!» ${com}`;
    if(PRESION>.6&&Math.random()<.3){
      const p=pl.perso||"frio";
      com+= p==="emocional" ? ((pl.conf??55)>=60?F_PERSO.emocionalAlto:F_PERSO.emocionalBajo) : F_PERSO[p];
    } else if(s.attr&&pl.attrs[s.attr]>=85&&Math.random()<.35) com+=` (${s.attr} ${pl.attrs[s.attr]})`;

    if(opp._defQ===undefined) opp._defQ=Math.round((mediaAttrs(opp.jug[0].attrs)+mediaAttrs(opp.jug[1].attrs))/2);
    if(team._quimLado===undefined) team._quimLado=quimicaLado(team);
    const outcome=shotKey==="saque"?"sigue":resolveShot(pl,shotKey,{...ctx,team:t,oppDef:opp._defQ,oppScrambling:opp._scr,_quimLado:team._quimLado,fatiga:_fat},rally);

    if(outcome==="error"){
      stats[t].jug[hIdx].e++;
      pl.conf=clamp((pl.conf??55)-4,10,95);
      const modo=pick(["net","out","glass"]);
      ev.push({team:t,jug,shotKey,com,from:contact,end:modo,endCom:`✗ ${jug}: ${pick(F_ERR)}`,net:[A.atNet,B.atNet]});
      return {ev,ganador:1-t};
    }
    if(outcome==="winner"){
      stats[t].jug[hIdx].w++;
      pl.conf=clamp((pl.conf??55)+3,10,95);
      const lateral=["remate3","remate4"].includes(shotKey);
      ev.push({team:t,jug,shotKey,com,from:contact,end:lateral?"porTres":"winner",endCom:`★ WINNER de ${jug}. ${pick(F_WIN)}`,net:[A.atNet,B.atNet]});
      return {ev,ganador:t};
    }

    const inc=incomingFor(shotKey,1-t,opp);
    let nIdx=inc.c.x<5?0:1;
    if(inc.ctx.high||Math.abs(inc.c.x-5)<1.7){
      const val=j=>inc.ctx.high?opp.jug[j].attrs.remate+opp.jug[j].attrs.bandeja:opp.jug[j].attrs[opp.atNet?"volea":"fondo"]*2;
      const best=val(0)>=val(1)?0:1;
      if(best!==nIdx&&val(best)-val(1-best)>24){nIdx=best;inc.ctx.mia=true;}
    }
    if(["globo","globoRapido"].includes(shotKey)&&opp.atNet){
      opp.atNet=false;team.atNet=true;
      ev.push({team:t,jug,shotKey,com:com+" · ¡y ganan la red!",from:contact,to:inc.c,vuelo:inc.vuelo,net:[A.atNet,B.atNet],recvIdx:nIdx});
    } else {
      if(shotKey==="saque") team.atNet=true;
      if(shotKey==="dejada"&&!opp.atNet){opp.atNet=true;opp._scr=true;}
      if(shotKey==="bajada"){team.atNet=true;opp.atNet=false;}
      ev.push({team:t,jug,shotKey,com,from:contact,to:inc.c,vuelo:inc.vuelo,net:[A.atNet,B.atNet],recvIdx:nIdx});
    }
    teams[1-t]._scr=["dejada","vibora","remate"].includes(shotKey)&&Math.random()<.5;
    contact=inc.c;ctx=inc.ctx;t=1-t;hIdx=nIdx;
    if(rally>26){
      stats[t].jug[hIdx].w++;
      ev.push({team:t,jug:teams[t].jug[hIdx].n,shotKey:"remate",com:"remate definitivo",from:contact,end:"winner",endCom:"★ Cae el punto tras un peloteo eterno.",net:[A.atNet,B.atNet]});
      return {ev,ganador:t};
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


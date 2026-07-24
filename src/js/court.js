/* ================= PISTA ================= */
const cv=document.getElementById("pista"),cx=cv.getContext("2d");
let PW=0,PH=0,SC=0,OX=0,OY=0;
let players=[],ball={x:5,y:2.5,z:0,vis:false,trail:[]};
let TEAM0_COLOR="#4FA3D8", ME_COLOR="#C6F53C", TEAM1_COLOR="#E06456";
function resize(){
  let w=cv.parentElement.clientWidth||360;
  // En escritorio, no dejar que la pista se haga gigante: se limita para que
  // quepa a lo alto y se centra, dejando aire a la retransmisión. En móvil se
  // usa todo el ancho de la columna, como siempre.
  if((window.innerWidth||0)>=760){
    // reservar sitio para la barra superior, el marcador y los controles de
    // debajo, para que la pista entera quepa sin cortarse. A pantalla completa
    // la pista aprovecha bastante más el alto disponible.
    const capAlto=Math.round(((window.innerHeight||760)-300)/1.5);
    w=Math.max(280,Math.min(w,capAlto,560));
  }
  PW=w;PH=Math.round(w*1.5);
  cv.width=PW*devicePixelRatio;cv.height=PH*devicePixelRatio;
  cv.style.width=PW+"px";cv.style.height=PH+"px";cv.style.margin="0 auto";
  cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  SC=(PH-40)/L;OX=(PW-W*SC)/2;OY=20;
}
window.addEventListener("resize",()=>{if(!document.getElementById("scr-partido").classList.contains("oculto")){resize();draw();}});
const px=(x,y)=>({x:OX+x*SC,y:OY+(L-y)*SC});
function homes(net){
  const pos=[];
  for(let t=0;t<2;t++){
    const y=net[t]?(t===0?7.6:L-7.6):(t===0?2.6:L-2.6);
    pos.push({x:2.8,y},{x:7.2,y});
  }
  return pos;
}
function initPlayers(){
  players=[];
  const h=homes([false,false]);
  for(let t=0;t<2;t++) for(let i=0;i<2;i++){
    const p=h[t*2+i];
    players.push({t,i,nombre:teams[t].jug[i].n,me:teams[t].jug[i].me||false,x:p.x,y:p.y,tx:p.x,ty:p.y});
  }
}
function setTargets(net,runner){
  const h=homes(net);
  players.forEach((p,idx)=>{p.tx=h[idx].x;p.ty=h[idx].y;});
  if(runner){
    const who=players.find(p=>p.t===runner.t&&p.i===runner.idx)||players.find(p=>p.t===runner.t);
    who.tx=clamp(runner.x,0.6,9.4);who.ty=clamp(runner.y,0.6,L-0.6);
  }
}
function stepPlayers(dt){
  const v=6.5;
  players.forEach(p=>{
    const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);
    if(d>.02){const m=Math.min(1,v*dt/d);p.x+=dx*m;p.y+=dy*m;}
  });
}
function draw(){
  cx.clearRect(0,0,PW,PH);
  // fondo (grada en penumbra)
  const bg=cx.createRadialGradient(PW/2,PH*.32,40,PW/2,PH/2,PH*.82);
  bg.addColorStop(0,"#1A2C40");bg.addColorStop(1,"#080B11");
  cx.fillStyle=bg;cx.fillRect(0,0,PW,PH);
  const p0=px(0,L),p1=px(W,0);
  const cw=p1.x-p0.x, chh=p1.y-p0.y;
  // muro de cristal (marco exterior con brillo azulado)
  cx.save();
  cx.shadowColor="rgba(95,175,235,.45)";cx.shadowBlur=18;
  cx.strokeStyle="rgba(150,205,240,.28)";cx.lineWidth=7;
  cx.strokeRect(p0.x-7,p0.y-7,cw+14,chh+14);
  cx.restore();
  // superficie de la pista (moqueta)
  const court=cx.createLinearGradient(0,p0.y,0,p1.y);
  court.addColorStop(0,"#20597F");court.addColorStop(.5,"#173F60");court.addColorStop(1,"#20597F");
  cx.fillStyle=court;cx.fillRect(p0.x,p0.y,cw,chh);
  // iluminación de estadio: 4 mástiles a cada lado (8 focos), como una pista real
  const yMast=[.15,.38,.62,.85];
  // charcos de luz proyectados sobre la pista desde ambos lados largos
  cx.save();
  cx.beginPath();cx.rect(p0.x,p0.y,cw,chh);cx.clip();
  cx.globalCompositeOperation="lighter";
  yMast.forEach(fy=>{
    [px(2,L*fy),px(W-2,L*fy)].forEach(c=>{
      const r=SC*3.8, lg=cx.createRadialGradient(c.x,c.y,2,c.x,c.y,r);
      lg.addColorStop(0,"rgba(222,236,255,.15)");lg.addColorStop(.6,"rgba(210,228,255,.05)");lg.addColorStop(1,"rgba(210,228,255,0)");
      cx.fillStyle=lg;cx.beginPath();cx.arc(c.x,c.y,r,0,7);cx.fill();
    });
  });
  cx.restore();
  // áreas de saque, sombreadas suavemente para que se lea la estructura
  const box=(x0,y0,x1,y1,al)=>{const A=px(x0,y1);cx.fillStyle=`rgba(255,255,255,${al})`;cx.fillRect(A.x,A.y,(x1-x0)*SC,(y1-y0)*SC);};
  box(0,3,W/2,NET,.055); box(W/2,3,W,NET,.03); box(0,NET,W/2,L-3,.03); box(W/2,NET,W,L-3,.055);
  // líneas de pista
  cx.strokeStyle="#EAF3FB";cx.lineWidth=1.6;
  cx.strokeRect(p0.x,p0.y,cw,chh);
  [3,L-3].forEach(y=>{const a=px(0,y),b=px(W,y);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();});
  // línea central de saque (de una línea de servicio a la otra, cruzando la red)
  let a=px(W/2,3),b=px(W/2,L-3);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();
  // red (con sus postes)
  a=px(0,NET);b=px(W,NET);
  cx.strokeStyle="#070A0F";cx.lineWidth=5;cx.beginPath();cx.moveTo(a.x-7,a.y);cx.lineTo(b.x+7,b.y);cx.stroke();
  cx.strokeStyle="rgba(233,243,251,.5)";cx.lineWidth=1;cx.beginPath();cx.moveTo(a.x-7,a.y-2);cx.lineTo(b.x+7,b.y-2);cx.stroke();
  cx.fillStyle="#070A0F";[a.x-7,b.x+7].forEach(xx=>cx.fillRect(xx-1.5,a.y-5,3,10));
  // mástiles con sus focos a ambos lados largos, fuera del cristal (4 por lado)
  yMast.forEach(fy=>{
    const yy=px(0,L*fy).y;
    [p0.x-9,p1.x+9].forEach(x=>{
      cx.save();
      cx.shadowColor="rgba(232,242,255,.95)";cx.shadowBlur=11;
      cx.fillStyle="#EAF2FF";
      cx.beginPath();cx.ellipse(x,yy,3,4.6,0,0,7);cx.fill();
      cx.restore();
    });
  });
  players.forEach(p=>{
    const q=px(p.x,p.y);
    cx.fillStyle="rgba(0,0,0,.42)";cx.beginPath();cx.ellipse(q.x,q.y+4,9,4,0,0,7);cx.fill();
    const base=p.t===0?(p.me?ME_COLOR:TEAM0_COLOR):TEAM1_COLOR;
    const g=cx.createRadialGradient(q.x-2.6,q.y-3,1,q.x,q.y,9);
    g.addColorStop(0,"#FFFFFF");g.addColorStop(.3,base);g.addColorStop(1,base);
    cx.fillStyle=g;
    cx.beginPath();cx.arc(q.x,q.y,8,0,7);cx.fill();
    cx.strokeStyle=p.me?"#FFFFFF":"rgba(255,255,255,.7)";cx.lineWidth=p.me?2.4:1.3;cx.stroke();
    cx.fillStyle="#EAF0F8";cx.font="600 8px 'IBM Plex Mono',monospace";cx.textAlign="center";
    cx.fillText((p.me?"★":"")+p.nombre,q.x,q.y-12);
  });
  ball.trail.forEach((tr,i)=>{
    const q=px(tr.x,tr.y);const al=(i/ball.trail.length)*.45;
    cx.fillStyle=`rgba(230,250,80,${al})`;cx.beginPath();cx.arc(q.x,q.y-tr.z*SC*.45,2.6,0,7);cx.fill();
  });
  if(ball.vis){
    const q=px(ball.x,ball.y);
    cx.fillStyle="rgba(0,0,0,.4)";cx.beginPath();cx.ellipse(q.x,q.y,4.5,2.5,0,0,7);cx.fill();
    cx.save();cx.shadowColor="#E6FA50";cx.shadowBlur=7;
    const r2=4.5+ball.z*1.1;
    cx.fillStyle="#E6FA50";
    cx.beginPath();cx.arc(q.x,q.y-ball.z*SC*.45,r2,0,7);cx.fill();
    cx.restore();
  }
}


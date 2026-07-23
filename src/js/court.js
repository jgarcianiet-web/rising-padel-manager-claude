/* ================= PISTA ================= */
const cv=document.getElementById("pista"),cx=cv.getContext("2d");
let PW=0,PH=0,SC=0,OX=0,OY=0;
let players=[],ball={x:5,y:2.5,z:0,vis:false,trail:[]};
let TEAM0_COLOR="#4FA3D8", ME_COLOR="#C6F53C", TEAM1_COLOR="#E06456";
function resize(){
  const w=cv.parentElement.clientWidth;
  PW=w;PH=Math.round(w*1.5);
  cv.width=PW*devicePixelRatio;cv.height=PH*devicePixelRatio;
  cv.style.height=PH+"px";
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
  const bg=cx.createRadialGradient(PW/2,PH*.35,40,PW/2,PH/2,PH*.75);
  bg.addColorStop(0,"#182A3E");bg.addColorStop(1,"#0C1017");
  cx.fillStyle=bg;cx.fillRect(0,0,PW,PH);
  const p0=px(0,L),p1=px(W,0);
  const court=cx.createLinearGradient(0,p0.y,0,p1.y);
  court.addColorStop(0,"#1D537F");court.addColorStop(.5,"#174468");court.addColorStop(1,"#1D537F");
  cx.fillStyle=court;cx.fillRect(p0.x,p0.y,(p1.x-p0.x),(p1.y-p0.y));
  cx.strokeStyle="rgba(150,205,240,.35)";cx.lineWidth=4;
  cx.strokeRect(p0.x-5,p0.y-5,(p1.x-p0.x)+10,(p1.y-p0.y)+10);
  cx.strokeStyle="#E9F3FB";cx.lineWidth=1.6;
  cx.strokeRect(p0.x,p0.y,(p1.x-p0.x),(p1.y-p0.y));
  [[0,3],[0,L-3]].forEach(([_,y])=>{const a=px(0,y),b=px(W,y);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();});
  let a=px(W/2,0),b=px(W/2,3);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();
  a=px(W/2,L-3);b=px(W/2,L);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();
  a=px(0,NET);b=px(W,NET);
  cx.strokeStyle="#0A0E14";cx.lineWidth=5;cx.beginPath();cx.moveTo(a.x-6,a.y);cx.lineTo(b.x+6,b.y);cx.stroke();
  cx.strokeStyle="rgba(233,243,251,.55)";cx.lineWidth=1;cx.beginPath();cx.moveTo(a.x-6,a.y-2);cx.lineTo(b.x+6,b.y-2);cx.stroke();
  players.forEach(p=>{
    const q=px(p.x,p.y);
    cx.fillStyle="rgba(0,0,0,.45)";cx.beginPath();cx.ellipse(q.x,q.y+3,8,4,0,0,7);cx.fill();
    cx.fillStyle=p.t===0?(p.me?ME_COLOR:TEAM0_COLOR):TEAM1_COLOR;
    cx.strokeStyle=p.me?"#FFFFFF":"rgba(255,255,255,.75)";cx.lineWidth=p.me?2.2:1.4;
    cx.beginPath();cx.arc(q.x,q.y,7.5,0,7);cx.fill();cx.stroke();
    cx.fillStyle="#DCE3EE";cx.font="600 8px 'IBM Plex Mono'";cx.textAlign="center";
    cx.fillText((p.me?"★":"")+p.nombre,q.x,q.y-11);
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


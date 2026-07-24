/* ---------- arranque ---------- */
irA("menu");
pintarMenu();
pintarLogos();
// En la app de escritorio: restaura desde SQLite lo que falte en localStorage
// y repinta el menú (para que aparezca «Continuar» si había partida en disco).
// Inicializa el motor SQLite del frontend (sql.js) y repinta el menú al estar listo.
if(typeof dbSqlInit==="function"){ dbSqlInit().then(()=>{ if(!G) pintarMenu(); }).catch(()=>{}); }
(function(){
  const spl=document.getElementById("splash");
  const est=document.getElementById("splEstudio"), jue=document.getElementById("splJuego"), bar=document.getElementById("splBar");
  if(!spl||!est||!jue||!bar) return;
  let fin=false; const timers=[];
  const T=(fn,ms)=>{ timers.push(setTimeout(fn,ms)); };
  const cerrar=()=>{
    if(fin) return; fin=true;
    timers.forEach(clearTimeout);
    spl.style.transition="opacity .45s"; spl.style.opacity="0";
    setTimeout(()=>quitarEl(spl),470);
  };
  spl.onclick=cerrar;                       // tocar la pantalla salta la intro
  T(()=>{ est.style.opacity="1"; },80);     // 1) logo del estudio
  T(()=>{ est.style.opacity="0"; },1650);
  T(()=>{ jue.style.opacity="1"; },2200);   // 2) logo del juego
  T(()=>{
    let pct=0;
    const iv=setInterval(()=>{
      if(fin){ clearInterval(iv); return; }
      pct=Math.min(100,pct+Math.random()*20+10);
      bar.style.width=pct+"%";
      if(pct>=100){ clearInterval(iv); T(cerrar,450); }
    },130);
  },2400);
})();

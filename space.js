/* =====================================================================
   NOVA SURVIVOR — living space background.
   Parallax multi-layer starfield + drifting nebula (baked offscreen) +
   shooting stars + vignette. Reacts subtly to pointer. Drawn on the menu
   and behind menu-opened overlays so the whole shell feels alive.
   Exposes window.Space.draw(ctx, W, H, timeSeconds).
   ===================================================================== */
(() => {
'use strict';
const TAU = Math.PI*2, rnd = (a,b)=>a+Math.random()*(b-a);
const STAR_COLS = ['#ffffff','#d4e7ff','#bcd0ff','#e7d4ff','#fff0cf','#bff6ff'];
let W=0, H=0, neb=null, stars=[], shoots=[], px=0.5, py=0.5, tx=0.5, ty=0.5, lastT=0;
try { window.addEventListener('pointermove', e => { tx=e.clientX/innerWidth; ty=e.clientY/innerHeight; }); } catch(e){}

const hexA = (h,a)=>{ const n=parseInt(h.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; };

function buildNebula() {
  neb = document.createElement('canvas'); neb.width=W; neb.height=H;
  const g = neb.getContext('2d');
  const base = g.createRadialGradient(W*0.5,H*0.30,0, W*0.5,H*0.34,Math.max(W,H));
  base.addColorStop(0,'#1a2150'); base.addColorStop(0.42,'#0c1130'); base.addColorStop(1,'#04050d');
  g.fillStyle=base; g.fillRect(0,0,W,H);
  // drifting colour clouds
  const blobs = [[0.20,0.24,0.58,'#6e2eb0'],[0.84,0.16,0.5,'#1b63b6'],[0.64,0.82,0.62,'#b02a78'],
                 [0.10,0.84,0.46,'#1f72a8'],[0.50,0.52,0.74,'#3c2c86'],[0.9,0.7,0.4,'#7a2ea0']];
  g.globalCompositeOperation='lighter';
  for (const [x,y,r,c] of blobs) {
    const cx=x*W, cy=y*H, rr=r*Math.max(W,H)*0.72;
    const ng=g.createRadialGradient(cx,cy,0,cx,cy,rr);
    ng.addColorStop(0,hexA(c,0.24)); ng.addColorStop(0.5,hexA(c,0.08)); ng.addColorStop(1,hexA(c,0));
    g.fillStyle=ng; g.beginPath(); g.arc(cx,cy,rr,0,TAU); g.fill();
  }
  // faint dust band
  g.globalAlpha=0.5;
  for (let i=0;i<3;i++){ const yy=H*(0.35+i*0.16); const dg=g.createLinearGradient(0,yy-40,0,yy+40);
    dg.addColorStop(0,'rgba(120,150,255,0)'); dg.addColorStop(0.5,'rgba(150,170,255,0.05)'); dg.addColorStop(1,'rgba(120,150,255,0)');
    g.fillStyle=dg; g.fillRect(0,yy-40,W,80); }
  g.globalAlpha=1; g.globalCompositeOperation='source-over';
}
function build() {
  stars = [];
  const layers = [[120,0.4,0.9,0.45],[72,0.7,1.4,0.7],[34,1.2,2.4,1]];
  layers.forEach((L,li)=>{ for(let i=0;i<L[0];i++) stars.push({
    x:Math.random()*W, y:Math.random()*H, r:rnd(L[1],L[2]), a:L[3], tw:Math.random()*TAU,
    sp:rnd(0.5,1)*(li+1), layer:li, c:STAR_COLS[(Math.random()*STAR_COLS.length)|0] }); });
  buildNebula();
}
function draw(ctx, w, h, t) {
  if (w!==W || h!==H) { W=w; H=h; build(); }
  const dt = Math.min(0.05, Math.max(0, t-lastT)); lastT=t;
  px += (tx-px)*Math.min(1,dt*3); py += (ty-py)*Math.min(1,dt*3);
  const ox=(px-0.5), oy=(py-0.5);

  // nebula (parallax + slow drift); slight overscan so edges never show
  const dx = ox*-32 + Math.sin(t*0.05)*16, dy = oy*-32 + Math.cos(t*0.04)*14;
  if (neb) ctx.drawImage(neb, dx-24, dy-24, W+48, H+48);
  else { ctx.fillStyle='#06070f'; ctx.fillRect(0,0,w,h); }

  // stars, parallax by layer + twinkle
  for (const s of stars) {
    const par = (s.layer+1)*10;
    const x = ((s.x - ox*par - t*s.sp*6) % W + W) % W;
    const y = ((s.y - oy*par) % H + H) % H;
    const tw = 0.5 + 0.5*Math.sin(t*1.8 + s.tw);
    ctx.globalAlpha = s.a*tw; ctx.fillStyle = s.c;
    ctx.beginPath(); ctx.arc(x,y,s.r,0,TAU); ctx.fill();
    if (s.layer===2) { ctx.globalAlpha=s.a*tw*0.6; ctx.shadowColor=s.c; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(x,y,s.r,0,TAU); ctx.fill(); ctx.shadowBlur=0; }
  }
  ctx.globalAlpha=1;

  // occasional shooting stars
  if (Math.random()<0.014 && shoots.length<3)
    shoots.push({ x:rnd(0,W), y:rnd(0,H*0.5), vx:rnd(420,680), vy:rnd(140,260), life:1 });
  for (const sh of shoots) {
    sh.x += sh.vx*dt; sh.y += sh.vy*dt; sh.life -= dt*0.85;
    ctx.globalAlpha = Math.max(0,sh.life)*0.9;
    const ex=sh.x-sh.vx/6, ey=sh.y-sh.vy/6;
    const grd=ctx.createLinearGradient(sh.x,sh.y,ex,ey);
    grd.addColorStop(0,'rgba(255,255,255,.95)'); grd.addColorStop(1,'rgba(120,200,255,0)');
    ctx.strokeStyle=grd; ctx.lineWidth=2.2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(sh.x,sh.y); ctx.lineTo(ex,ey); ctx.stroke();
  }
  shoots = shoots.filter(s=>s.life>0 && s.x<W+120 && s.y<H+120);
  ctx.globalAlpha=1;

  // vignette for focus + depth
  const vg=ctx.createRadialGradient(w*0.5,h*0.44,h*0.22, w*0.5,h*0.52,h*0.95);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(0.7,'rgba(0,0,0,0.18)'); vg.addColorStop(1,'rgba(0,0,0,0.62)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
}
// ---- gameplay background: subtle scrolling parallax (reads behind the action) ----
let pW=0, pH=0, pStars=null, pNeb=null;
function buildPlay(w,h){
  pW=w; pH=h; pStars=[];
  // [count, parallax, rMin, rMax, alpha]
  const layers=[[80,0.05,0.5,1.0,0.30],[54,0.14,0.7,1.5,0.50],[26,0.30,1.1,2.2,0.75]];
  layers.forEach(L=>{ for(let i=0;i<L[0];i++) pStars.push({
    x:Math.random()*w, y:Math.random()*h, r:rnd(L[2],L[3]), a:L[4], par:L[1],
    tw:Math.random()*TAU, c:STAR_COLS[(Math.random()*STAR_COLS.length)|0] }); });
  pNeb=document.createElement('canvas'); pNeb.width=w; pNeb.height=h;
  const g=pNeb.getContext('2d'); g.globalCompositeOperation='lighter';
  for (const [x,y,r,c] of [[0.28,0.22,0.55,'#3a2a7a'],[0.82,0.7,0.55,'#1b4a86'],[0.55,0.92,0.45,'#5a1e5e'],[0.1,0.6,0.4,'#243f86']]) {
    const cx=x*w, cy=y*h, rr=r*Math.max(w,h); const ng=g.createRadialGradient(cx,cy,0,cx,cy,rr);
    ng.addColorStop(0,hexA(c,0.16)); ng.addColorStop(1,hexA(c,0)); g.fillStyle=ng; g.fillRect(0,0,w,h);
  }
}
function drawPlay(ctx,w,h,camX,camY,t){
  if (w!==pW || h!==pH || !pStars) buildPlay(w,h);
  const bg=ctx.createRadialGradient(w*0.5,h*0.4,0, w*0.5,h*0.5,Math.max(w,h)*0.9);
  bg.addColorStop(0,'#0b1130'); bg.addColorStop(0.6,'#070a1c'); bg.addColorStop(1,'#04050d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  if (pNeb) ctx.drawImage(pNeb,0,0);                 // static ambient nebula glow
  for (const s of pStars) {                          // stars scroll with the camera (parallax)
    const x=((s.x - camX*s.par) % w + w) % w;
    const y=((s.y - camY*s.par) % h + h) % h;
    const tw=0.6+0.4*Math.sin(t*1.5+s.tw);
    ctx.globalAlpha=s.a*tw; ctx.fillStyle=s.c;
    ctx.beginPath(); ctx.arc(x,y,s.r,0,TAU); ctx.fill();
  }
  ctx.globalAlpha=1;
}
window.Space = { draw, drawPlay };
})();

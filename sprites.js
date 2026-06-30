/* =====================================================================
   NOVA SURVIVOR — procedural sprite atlas
   Every sprite is drawn once into an offscreen canvas (neon-vector style),
   so the whole game ships with ZERO image files => fully offline / Android-safe.
   Exposes window.Sprites.{ draw, drawMask }.
   Sprites are authored "facing up" (nose toward -Y); rotate by (angle + PI/2).
   ===================================================================== */
(() => {
'use strict';
const TAU = Math.PI * 2;

// ---- offscreen factory ------------------------------------------------
// Shapes are authored in fractions of S; a uniform 0.82 down-scale leaves a
// padding ring so the baked neon glow (shadowBlur) never clips at the edges.
function mk(S, drawFn) {
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.save();
  g.translate(S/2, S/2);
  g.scale(0.82, 0.82);
  g.lineJoin = 'round'; g.lineCap = 'round';
  drawFn(g, S);
  g.restore();
  // bake a "lit from above" sheen + lower ambient shade onto the drawn shape — cheap fake-3D volume
  g.globalCompositeOperation = 'source-atop';
  const lit = g.createLinearGradient(0, 0, 0, S);
  lit.addColorStop(0,    'rgba(255,255,255,0.22)');
  lit.addColorStop(0.45, 'rgba(255,255,255,0)');
  lit.addColorStop(1,    'rgba(8,10,22,0.36)');
  g.fillStyle = lit; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-over';
  return c;
}
// white silhouette (for hit-flash), preserves alpha
function whiteMask(src) {
  const S = src.width;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, S, S);
  return c;
}

// ---- small drawing helpers -------------------------------------------
function glow(g, color, S, k=0.10) { g.shadowColor = color; g.shadowBlur = S*k; }
function noglow(g) { g.shadowBlur = 0; }
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x+r, y);
  g.arcTo(x+w, y,   x+w, y+h, r);
  g.arcTo(x+w, y+h, x,   y+h, r);
  g.arcTo(x,   y+h, x,   y,   r);
  g.arcTo(x,   y,   x+w, y,   r);
  g.closePath();
}
function poly(g, pts) { g.beginPath(); pts.forEach((p,i)=> i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath(); }
function ngon(g, r, n, rot=0) {
  g.beginPath();
  for (let i=0;i<n;i++){ const a=rot+i*TAU/n; const x=Math.cos(a)*r, y=Math.sin(a)*r; i?g.lineTo(x,y):g.moveTo(x,y); }
  g.closePath();
}
function starPath(g, points, outer, inner, rot=-Math.PI/2) {
  g.beginPath();
  for (let i=0;i<points*2;i++){ const a=rot+i*Math.PI/points; const r=i%2?inner:outer; const x=Math.cos(a)*r, y=Math.sin(a)*r; i?g.lineTo(x,y):g.moveTo(x,y); }
  g.closePath();
}

// ---- the sprites ------------------------------------------------------
// Player ships share one hull, recolored per pilot (see SHIPS in game.js).
const SHIP_PALS = {
  player:         { glow:'#3df0ff', top:'#cffaff', mid:'#3df0ff', bot:'#1b6fb8', accent:'#8a5bff', stroke:'#eafcff', canopy:'#8af2ff' },
  ship_reaper:    { glow:'#ff4d6d', top:'#ffd0d8', mid:'#ff4d6d', bot:'#8a1030', accent:'#ffcf3a', stroke:'#ffe0e6', canopy:'#ff9bb0' },
  ship_bastion:   { glow:'#ff8a5b', top:'#ffe0c0', mid:'#ff8a5b', bot:'#9a4a1a', accent:'#3df0ff', stroke:'#ffd2b4', canopy:'#ffd2b4' },
  ship_specter:   { glow:'#34e07a', top:'#c4ffd9', mid:'#34e07a', bot:'#0e6b3e', accent:'#b56bff', stroke:'#e2fff0', canopy:'#a0ffce' },
  ship_sovereign: { glow:'#ffcf3a', top:'#fff3b0', mid:'#ffcf3a', bot:'#c98a10', accent:'#ff4d6d', stroke:'#fff7d0', canopy:'#ffe79a' },
};
// shared finishing touches so every pilot ship reads as the same family
function hullFill(g, S, pal, lo, hi) {       // gradient body fill for the current path
  const grad = g.createLinearGradient(0, lo, 0, hi);
  grad.addColorStop(0, pal.top); grad.addColorStop(0.5, pal.mid); grad.addColorStop(1, pal.bot);
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.022; g.strokeStyle = pal.stroke; g.stroke();
}
function cockpit(g, S, pal, cy=-S*0.12, rr=S*0.10) {
  g.beginPath(); g.arc(0, cy, rr, 0, TAU);
  const cg = g.createLinearGradient(0, cy-rr, 0, cy+rr);     // reflective glass dome
  cg.addColorStop(0, pal.canopy); cg.addColorStop(0.5, '#0b1024'); cg.addColorStop(1, '#05060f');
  g.fillStyle = cg; g.fill();
  g.lineWidth=S*0.018; g.strokeStyle=pal.canopy; g.stroke();
  g.beginPath(); g.arc(-rr*0.30, cy-rr*0.34, rr*0.42, 0, TAU); g.fillStyle='rgba(255,255,255,.92)'; g.fill();   // specular glint
}
function engines(g, S, xs, y=S*0.34, w=S*0.07, h=S*0.10) {
  glow(g, '#ffcf3a', S, 0.09); g.fillStyle='#ffcf3a';
  xs.forEach(x => { roundRect(g, x-w/2, y, w, h, S*0.02); g.fill(); });
  noglow(g); g.fillStyle='#fff6d8';                          // hot bright core
  xs.forEach(x => { roundRect(g, x-w*0.28, y+h*0.10, w*0.56, h*0.6, S*0.02); g.fill(); });
}

// 1) Vanguard — balanced interceptor: slim fuselage + broad swept delta wings
function drawVanguard(g, S) {
  const p = SHIP_PALS.player;
  glow(g, p.glow, S, 0.08); g.fillStyle = p.accent;
  poly(g, [[-S*0.05,-S*0.04],[-S*0.42,S*0.22],[-S*0.24,S*0.31],[-S*0.05,S*0.20]]); g.fill();
  poly(g, [[ S*0.05,-S*0.04],[ S*0.42,S*0.22],[ S*0.24,S*0.31],[ S*0.05,S*0.20]]); g.fill();
  noglow(g);
  glow(g, p.glow, S, 0.11);
  poly(g, [[0,-S*0.46],[S*0.13,-S*0.06],[S*0.11,S*0.28],[0,S*0.40],[-S*0.11,S*0.28],[-S*0.13,-S*0.06]]);
  hullFill(g, S, p, -S*0.46, S*0.40); noglow(g);
  cockpit(g, S, p, -S*0.12, S*0.095);
  engines(g, S, [-S*0.06, S*0.06]);
}

// 2) Reaper — glass cannon: needle dagger with forward-swept scythe blades
function drawReaper(g, S) {
  const p = SHIP_PALS.ship_reaper;
  glow(g, p.glow, S, 0.09); g.fillStyle = p.accent;
  poly(g, [[-S*0.07,S*0.04],[-S*0.47,-S*0.18],[-S*0.33,-S*0.30],[-S*0.10,-S*0.04]]); g.fill();
  poly(g, [[ S*0.07,S*0.04],[ S*0.47,-S*0.18],[ S*0.33,-S*0.30],[ S*0.10,-S*0.04]]); g.fill();
  noglow(g);
  glow(g, p.glow, S, 0.12);
  poly(g, [[0,-S*0.48],[S*0.08,-S*0.10],[S*0.11,S*0.26],[0,S*0.42],[-S*0.11,S*0.26],[-S*0.08,-S*0.10]]);
  hullFill(g, S, p, -S*0.48, S*0.42); noglow(g);
  cockpit(g, S, p, -S*0.18, S*0.07);
  engines(g, S, [0], S*0.34, S*0.10, S*0.13);
}

// 3) Bastion — fortress: broad armored hex hull with heavy shoulder plates
function drawBastion(g, S) {
  const p = SHIP_PALS.ship_bastion;
  glow(g, p.glow, S, 0.08); g.fillStyle = p.accent;
  roundRect(g, -S*0.47, -S*0.08, S*0.16, S*0.38, S*0.05); g.fill();
  roundRect(g,  S*0.31, -S*0.08, S*0.16, S*0.38, S*0.05); g.fill();
  noglow(g);
  glow(g, p.glow, S, 0.11);
  poly(g, [[0,-S*0.42],[S*0.30,-S*0.20],[S*0.34,S*0.22],[0,S*0.40],[-S*0.34,S*0.22],[-S*0.30,-S*0.20]]);
  hullFill(g, S, p, -S*0.42, S*0.40);
  g.lineWidth=S*0.028; g.strokeStyle=p.stroke; g.stroke();
  noglow(g);
  g.fillStyle = p.bot; roundRect(g, -S*0.22, -S*0.30, S*0.44, S*0.13, S*0.04); g.fill();
  cockpit(g, S, p, -S*0.02, S*0.115);
  engines(g, S, [-S*0.15, S*0.15], S*0.34, S*0.10, S*0.10);
}

// 4) Specter — assassin: thin swept-back arrow / flying-wing, minimal hull
function drawSpecter(g, S) {
  const p = SHIP_PALS.ship_specter;
  glow(g, p.glow, S, 0.10);
  poly(g, [[0,-S*0.48],[S*0.40,S*0.30],[S*0.13,S*0.17],[0,S*0.36],[-S*0.13,S*0.17],[-S*0.40,S*0.30]]);
  hullFill(g, S, p, -S*0.48, S*0.36); noglow(g);
  g.fillStyle = p.accent;
  poly(g, [[0,-S*0.40],[S*0.05,S*0.08],[0,S*0.22],[-S*0.05,S*0.08]]); g.fill();
  cockpit(g, S, p, -S*0.20, S*0.065);
  engines(g, S, [-S*0.05, S*0.05], S*0.26, S*0.055, S*0.10);
}

// 5) Sovereign — flagship: regal hull crowned with prongs, ornate wings, core jewel
function drawSovereign(g, S) {
  const p = SHIP_PALS.ship_sovereign;
  glow(g, p.glow, S, 0.08); g.fillStyle = p.accent;
  poly(g, [[-S*0.08,0],[-S*0.45,S*0.08],[-S*0.40,S*0.26],[-S*0.18,S*0.30],[-S*0.08,S*0.18]]); g.fill();
  poly(g, [[ S*0.08,0],[ S*0.45,S*0.08],[ S*0.40,S*0.26],[ S*0.18,S*0.30],[ S*0.08,S*0.18]]); g.fill();
  noglow(g);
  glow(g, p.glow, S, 0.12);
  poly(g, [[0,-S*0.30],[S*0.16,-S*0.10],[S*0.14,S*0.28],[0,S*0.42],[-S*0.14,S*0.28],[-S*0.16,-S*0.10]]);
  hullFill(g, S, p, -S*0.30, S*0.42);
  g.lineWidth=S*0.024; g.strokeStyle=p.stroke; g.stroke();
  noglow(g);
  // crown prongs at the nose
  g.fillStyle = p.top;
  poly(g, [[0,-S*0.50],[S*0.055,-S*0.28],[-S*0.055,-S*0.28]]); g.fill();
  poly(g, [[-S*0.17,-S*0.36],[-S*0.10,-S*0.20],[-S*0.20,-S*0.22]]); g.fill();
  poly(g, [[ S*0.17,-S*0.36],[ S*0.10,-S*0.20],[ S*0.20,-S*0.22]]); g.fill();
  // core jewel
  glow(g, p.accent, S, 0.10); g.fillStyle = p.accent;
  g.beginPath(); g.arc(0, S*0.05, S*0.06, 0, TAU); g.fill(); noglow(g);
  cockpit(g, S, p, -S*0.10, S*0.06);
  engines(g, S, [-S*0.11, S*0.11], S*0.36, S*0.08, S*0.10);
}

function drawGrunt(g, S) {
  const r = S*0.40;
  glow(g, '#b56bff', S, 0.10);
  ngon(g, r, 6, Math.PI/6);
  const grad = g.createRadialGradient(0,-r*0.3,r*0.2,0,0,r);
  grad.addColorStop(0,'#e0bcff'); grad.addColorStop(1,'#6a2fb0');
  g.fillStyle=grad; g.fill();
  g.lineWidth=S*0.028; g.strokeStyle='#ecd6ff'; g.stroke();
  noglow(g);
  // angry visor
  g.fillStyle='#190b2c';
  poly(g, [[-r*0.6,-S*0.05],[r*0.6,-S*0.05],[r*0.42,S*0.10],[-r*0.42,S*0.10]]); g.fill();
  // glowing eyes
  glow(g, '#ff4d6d', S, 0.10); g.fillStyle='#ff4d6d';
  g.beginPath(); g.arc(-r*0.28,S*0.02,S*0.05,0,TAU); g.fill();
  g.beginPath(); g.arc( r*0.28,S*0.02,S*0.05,0,TAU); g.fill();
  noglow(g);
}

function drawSwarm(g, S) {
  glow(g, '#34e07a', S, 0.10);
  // wings
  g.fillStyle='#1f9e54';
  poly(g, [[0,-S*0.05],[-S*0.40,S*0.05],[-S*0.10,S*0.18]]); g.fill();
  poly(g, [[0,-S*0.05],[ S*0.40,S*0.05],[ S*0.10,S*0.18]]); g.fill();
  // body
  poly(g, [[0,-S*0.34],[S*0.16,0],[0,S*0.30],[-S*0.16,0]]);
  const grad=g.createLinearGradient(0,-S*0.34,0,S*0.30);
  grad.addColorStop(0,'#c4ffd9'); grad.addColorStop(1,'#1f9e54');
  g.fillStyle=grad; g.fill();
  g.lineWidth=S*0.022; g.strokeStyle='#e2fff0'; g.stroke();
  noglow(g);
  // eye
  g.fillStyle='#052010'; g.beginPath(); g.arc(0,-S*0.05,S*0.06,0,TAU); g.fill();
  g.fillStyle='#eafff0'; g.beginPath(); g.arc(-S*0.02,-S*0.08,S*0.025,0,TAU); g.fill();
}

function drawTank(g, S) {
  const w=S*0.74, h=S*0.74;
  glow(g, '#ff8a5b', S, 0.10);
  roundRect(g,-w/2,-h/2,w,h,S*0.14);
  const grad=g.createLinearGradient(0,-h/2,0,h/2);
  grad.addColorStop(0,'#5e3c2b'); grad.addColorStop(0.5,'#3a2418'); grad.addColorStop(1,'#211009');
  g.fillStyle=grad; g.fill();
  g.lineWidth=S*0.03; g.strokeStyle='#ff8a5b'; g.stroke();
  noglow(g);
  // top plate
  g.fillStyle='#ff8a5b'; roundRect(g,-w*0.34,-h*0.42,w*0.68,h*0.16,S*0.04); g.fill();
  // rivets
  g.fillStyle='#ffd2b4';
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{ g.beginPath(); g.arc(sx*w*0.30,sy*h*0.30,S*0.035,0,TAU); g.fill(); });
  // core eye
  glow(g, '#ffcf3a', S, 0.10);
  g.fillStyle='#ffcf3a'; g.beginPath(); g.arc(0,S*0.05,S*0.12,0,TAU); g.fill();
  g.fillStyle='#fff7e0'; g.beginPath(); g.arc(0,S*0.05,S*0.05,0,TAU); g.fill();
  noglow(g);
}

function drawShooter(g, S) {
  glow(g, '#3df0ff', S, 0.10);
  // saucer disc
  g.beginPath(); g.ellipse(0,S*0.06,S*0.42,S*0.16,0,0,TAU);
  const grad=g.createLinearGradient(0,-S*0.1,0,S*0.22);
  grad.addColorStop(0,'#cffaff'); grad.addColorStop(1,'#1b6fb8');
  g.fillStyle=grad; g.fill();
  g.lineWidth=S*0.022; g.strokeStyle='#eafcff'; g.stroke();
  noglow(g);
  // dome
  g.beginPath(); g.ellipse(0,-S*0.03,S*0.20,S*0.18,0,Math.PI,0);
  g.fillStyle='rgba(190,247,255,.9)'; g.fill();
  g.lineWidth=S*0.02; g.strokeStyle='#eafcff'; g.stroke();
  // rim lights
  glow(g, '#ffcf3a', S, 0.08); g.fillStyle='#ffcf3a';
  for (let i=-2;i<=2;i++){ g.beginPath(); g.arc(i*S*0.15,S*0.12,S*0.026,0,TAU); g.fill(); }
  noglow(g);
  // under-core
  glow(g, '#ff4d6d', S, 0.10); g.fillStyle='#ff4d6d';
  g.beginPath(); g.arc(0,S*0.16,S*0.05,0,TAU); g.fill();
  noglow(g);
}

function drawBoss(g, S) {
  glow(g, '#ff4d6d', S, 0.10);
  starPath(g, 10, S*0.44, S*0.30, 0);
  const grad=g.createRadialGradient(0,0,S*0.1,0,0,S*0.44);
  grad.addColorStop(0,'#ff8aa0'); grad.addColorStop(1,'#82102a');
  g.fillStyle=grad; g.fill();
  g.lineWidth=S*0.022; g.strokeStyle='#ffd2da'; g.stroke();
  noglow(g);
  // armor ring
  g.beginPath(); g.arc(0,0,S*0.26,0,TAU); g.fillStyle='#290810'; g.fill();
  g.lineWidth=S*0.03; g.strokeStyle='#ff4d6d'; g.stroke();
  // eye core
  glow(g, '#ffcf3a', S, 0.10);
  g.beginPath(); g.arc(0,0,S*0.13,0,TAU);
  const eg=g.createRadialGradient(0,0,1,0,0,S*0.13);
  eg.addColorStop(0,'#fff7e0'); eg.addColorStop(0.6,'#ffcf3a'); eg.addColorStop(1,'#ff7a00');
  g.fillStyle=eg; g.fill();
  noglow(g);
  g.fillStyle='#180400'; g.beginPath(); g.ellipse(0,0,S*0.03,S*0.08,0,0,TAU); g.fill();
}

function drawCoin(g, S) {
  glow(g, '#ffcf3a', S, 0.10);
  g.beginPath(); g.arc(0,0,S*0.40,0,TAU);
  const grad=g.createRadialGradient(-S*0.12,-S*0.12,S*0.05,0,0,S*0.40);
  grad.addColorStop(0,'#fff3b0'); grad.addColorStop(0.6,'#ffcf3a'); grad.addColorStop(1,'#c98a10');
  g.fillStyle=grad; g.fill();
  g.lineWidth=S*0.04; g.strokeStyle='#fff3b0'; g.stroke();
  noglow(g);
  g.lineWidth=S*0.03; g.strokeStyle='#c98a10'; g.beginPath(); g.arc(0,0,S*0.27,0,TAU); g.stroke();
  g.fillStyle='#fff7d0'; starPath(g,5,S*0.17,S*0.075); g.fill();
}

function drawGem(g, S) {
  glow(g, '#34e07a', S, 0.10);
  poly(g, [[0,-S*0.40],[S*0.30,-S*0.10],[S*0.18,S*0.36],[-S*0.18,S*0.36],[-S*0.30,-S*0.10]]);
  const grad=g.createLinearGradient(0,-S*0.40,0,S*0.36);
  grad.addColorStop(0,'#c4ffd9'); grad.addColorStop(1,'#16a85a');
  g.fillStyle=grad; g.fill();
  g.lineWidth=S*0.03; g.strokeStyle='#eafff0'; g.stroke();
  noglow(g);
  g.lineWidth=S*0.02; g.strokeStyle='rgba(255,255,255,.6)';
  g.beginPath(); g.moveTo(0,-S*0.40); g.lineTo(0,S*0.36);
  g.moveTo(-S*0.30,-S*0.10); g.lineTo(S*0.30,-S*0.10); g.stroke();
}

function drawMissile(g, S) {
  glow(g, '#ff8a5b', S, 0.10);
  roundRect(g,-S*0.12,-S*0.26,S*0.24,S*0.48,S*0.10);
  g.fillStyle='#e2e8ff'; g.fill();
  g.lineWidth=S*0.02; g.strokeStyle='#8a93c0'; g.stroke();
  noglow(g);
  // nose
  poly(g, [[-S*0.12,-S*0.18],[0,-S*0.40],[S*0.12,-S*0.18]]); g.fillStyle='#ff4d6d'; g.fill();
  // fins
  g.fillStyle='#ff8a5b';
  poly(g, [[-S*0.12,S*0.10],[-S*0.24,S*0.24],[-S*0.12,S*0.22]]); g.fill();
  poly(g, [[ S*0.12,S*0.10],[ S*0.24,S*0.24],[ S*0.12,S*0.22]]); g.fill();
  // flame
  glow(g, '#ffcf3a', S, 0.10); g.fillStyle='#ffcf3a';
  poly(g, [[-S*0.07,S*0.22],[0,S*0.42],[S*0.07,S*0.22]]); g.fill();
  noglow(g);
}

// ---- new enemy types --------------------------------------------------
function drawDasher(g, S) {         // fast charger — aggressive red dart (rendered facing player)
  glow(g, '#ff4d6d', S, 0.10);
  poly(g, [[0,-S*0.42],[S*0.30,S*0.20],[0,S*0.05],[-S*0.30,S*0.20]]);
  const grad = g.createLinearGradient(0,-S*0.42,0,S*0.20);
  grad.addColorStop(0,'#ffd0d8'); grad.addColorStop(1,'#b3122f');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.025; g.strokeStyle = '#ffe0e6'; g.stroke();
  noglow(g);
  g.strokeStyle = 'rgba(255,150,170,.85)'; g.lineWidth = S*0.03;
  g.beginPath(); g.moveTo(-S*0.12,S*0.24); g.lineTo(-S*0.07,S*0.42);
  g.moveTo(S*0.12,S*0.24); g.lineTo(S*0.07,S*0.42); g.moveTo(0,S*0.26); g.lineTo(0,S*0.46); g.stroke();
  g.fillStyle = '#2a0008'; g.beginPath(); g.arc(0,-S*0.12,S*0.06,0,TAU); g.fill();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0,-S*0.12,S*0.03,0,TAU); g.fill();
}
function drawBrute(g, S) {          // huge elite — maroon, horned, armored
  glow(g, '#ff4d6d', S, 0.10);
  g.fillStyle = '#7a0f22';
  poly(g, [[-S*0.34,-S*0.16],[-S*0.50,-S*0.44],[-S*0.16,-S*0.30]]); g.fill();
  poly(g, [[ S*0.34,-S*0.16],[ S*0.50,-S*0.44],[ S*0.16,-S*0.30]]); g.fill();
  ngon(g, S*0.40, 6, Math.PI/6);
  const grad = g.createRadialGradient(0,-S*0.1,S*0.1,0,0,S*0.42);
  grad.addColorStop(0,'#e0556e'); grad.addColorStop(1,'#5e0a1a');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.035; g.strokeStyle = '#ffb0bf'; g.stroke();
  noglow(g);
  g.fillStyle = '#3a0510'; roundRect(g,-S*0.22,-S*0.04,S*0.44,S*0.22,S*0.05); g.fill();
  glow(g, '#ffcf3a', S, 0.08); g.fillStyle = '#ffcf3a';
  g.beginPath(); g.arc(-S*0.14,-S*0.10,S*0.055,0,TAU); g.fill();
  g.beginPath(); g.arc( S*0.14,-S*0.10,S*0.055,0,TAU); g.fill();
  noglow(g);
}
function drawBomber(g, S) {         // walking mine — spiked, blinking warning core
  glow(g, '#ff8a5b', S, 0.10);
  g.fillStyle = '#2a1810';
  for (let i=0;i<8;i++){ g.save(); g.rotate(i*TAU/8); poly(g,[[-S*0.055,-S*0.30],[0,-S*0.47],[S*0.055,-S*0.30]]); g.fill(); g.restore(); }
  g.beginPath(); g.arc(0,0,S*0.32,0,TAU);
  const grad = g.createRadialGradient(-S*0.1,-S*0.1,S*0.04,0,0,S*0.34);
  grad.addColorStop(0,'#5a3a2a'); grad.addColorStop(1,'#170d06');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.03; g.strokeStyle = '#ff8a5b'; g.stroke();
  noglow(g);
  glow(g, '#ffcf3a', S, 0.12); g.fillStyle = '#ffcf3a';
  g.beginPath(); g.arc(0,0,S*0.13,0,TAU); g.fill();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0,0,S*0.06,0,TAU); g.fill();
  noglow(g);
}
function drawSplitter(g, S) {       // dividing cell — splits into swarmlings on death
  glow(g, '#34e07a', S, 0.10);
  g.beginPath(); g.arc(0,0,S*0.40,0,TAU);
  const grad = g.createRadialGradient(-S*0.1,-S*0.1,S*0.05,0,0,S*0.42);
  grad.addColorStop(0,'#bfffd6'); grad.addColorStop(1,'#12824a');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.03; g.strokeStyle = '#d8ffe7'; g.stroke();
  noglow(g);
  g.strokeStyle = 'rgba(5,40,20,.5)'; g.lineWidth = S*0.03;
  g.beginPath(); g.moveTo(0,-S*0.36); g.lineTo(0,S*0.36); g.stroke();
  g.fillStyle = 'rgba(6,60,30,.45)';
  g.beginPath(); g.arc(-S*0.16,0,S*0.11,0,TAU); g.fill();
  g.beginPath(); g.arc( S*0.16,0,S*0.11,0,TAU); g.fill();
  g.fillStyle = '#05210f';
  g.beginPath(); g.arc(-S*0.16,-S*0.02,S*0.04,0,TAU); g.fill();
  g.beginPath(); g.arc( S*0.16,-S*0.02,S*0.04,0,TAU); g.fill();
}
function drawHealer(g, S) {         // support — heals nearby enemies; white cross + halo
  glow(g, '#34e07a', S, 0.12);
  g.strokeStyle = 'rgba(130,255,190,.85)'; g.lineWidth = S*0.04;
  g.beginPath(); g.arc(0,0,S*0.42,0,TAU); g.stroke();
  poly(g, [[0,-S*0.34],[S*0.30,0],[0,S*0.34],[-S*0.30,0]]);
  const grad = g.createLinearGradient(0,-S*0.34,0,S*0.34);
  grad.addColorStop(0,'#eafff2'); grad.addColorStop(1,'#1f9e54');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.025; g.strokeStyle = '#d8ffe7'; g.stroke();
  noglow(g);
  g.fillStyle = '#ffffff';
  roundRect(g,-S*0.05,-S*0.18,S*0.10,S*0.36,S*0.02); g.fill();
  roundRect(g,-S*0.18,-S*0.05,S*0.36,S*0.10,S*0.02); g.fill();
}

// ---- ULTIMATE bosses (large, ornate, distinct) ------------------------
function drawUOverlord(g, S) {        // purple summoner — crowned eye with gear ring
  glow(g, '#b56bff', S, 0.10);
  starPath(g, 12, S*0.46, S*0.36, 0);
  let grad = g.createRadialGradient(0,0,S*0.1,0,0,S*0.46);
  grad.addColorStop(0,'#d9a8ff'); grad.addColorStop(1,'#3f1574');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.02; g.strokeStyle = '#e6c4ff'; g.stroke();
  noglow(g);
  g.beginPath(); g.arc(0,0,S*0.28,0,TAU); g.fillStyle = '#180a2a'; g.fill();
  g.lineWidth = S*0.025; g.strokeStyle = '#b56bff'; g.stroke();
  g.fillStyle = '#ffcf3a';
  for (let i=-2;i<=2;i++){ const x=i*S*0.10; poly(g,[[x-S*0.03,-S*0.30],[x,-S*0.42],[x+S*0.03,-S*0.30]]); g.fill(); }
  glow(g, '#ff4d6d', S, 0.12);
  g.beginPath(); g.arc(0,S*0.02,S*0.14,0,TAU);
  grad = g.createRadialGradient(0,S*0.02,2,0,S*0.02,S*0.14);
  grad.addColorStop(0,'#fff'); grad.addColorStop(0.5,'#ff8aa0'); grad.addColorStop(1,'#b3122f');
  g.fillStyle = grad; g.fill(); noglow(g);
  g.fillStyle = '#1a0005'; g.beginPath(); g.ellipse(0,S*0.02,S*0.04,S*0.09,0,0,TAU); g.fill();
}
function drawUWarden(g, S) {           // cyan bullet-hell turret — octagon w/ barrels & rings
  glow(g, '#3df0ff', S, 0.10);
  ngon(g, S*0.44, 8, Math.PI/8);
  const grad = g.createRadialGradient(0,0,S*0.1,0,0,S*0.44);
  grad.addColorStop(0,'#cffaff'); grad.addColorStop(1,'#1b6fb8');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.02; g.strokeStyle = '#eafcff'; g.stroke();
  noglow(g);
  g.fillStyle = '#0d2a44';
  for (let i=0;i<8;i++){ g.save(); g.rotate(i*TAU/8); roundRect(g,-S*0.035,-S*0.46,S*0.07,S*0.12,S*0.02); g.fill(); g.restore(); }
  g.strokeStyle = 'rgba(61,240,255,.6)'; g.lineWidth = S*0.02;
  g.beginPath(); g.arc(0,0,S*0.30,0,TAU); g.stroke();
  g.beginPath(); g.arc(0,0,S*0.20,0,TAU); g.stroke();
  glow(g, '#ffcf3a', S, 0.12); g.fillStyle = '#ffcf3a';
  g.beginPath(); g.arc(0,0,S*0.10,0,TAU); g.fill(); noglow(g);
  g.fillStyle = '#3df0ff'; g.beginPath(); g.arc(0,0,S*0.05,0,TAU); g.fill();
}
function drawUColossus(g, S) {         // orange charging titan — big horns, heavy armor
  glow(g, '#ff8a5b', S, 0.10);
  g.fillStyle = '#7a3a1a';
  poly(g, [[-S*0.32,-S*0.20],[-S*0.52,-S*0.48],[-S*0.14,-S*0.32]]); g.fill();
  poly(g, [[ S*0.32,-S*0.20],[ S*0.52,-S*0.48],[ S*0.14,-S*0.32]]); g.fill();
  ngon(g, S*0.42, 6, 0);
  const grad = g.createRadialGradient(0,-S*0.1,S*0.1,0,0,S*0.44);
  grad.addColorStop(0,'#ffd0a0'); grad.addColorStop(1,'#8a3a14');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.03; g.strokeStyle = '#ffd0b0'; g.stroke();
  noglow(g);
  g.fillStyle = '#3a1c0c'; roundRect(g,-S*0.26,-S*0.06,S*0.52,S*0.26,S*0.05); g.fill();
  g.fillStyle = '#ffae80';
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{ g.beginPath(); g.arc(sx*S*0.30,sy*S*0.26,S*0.04,0,TAU); g.fill(); });
  glow(g, '#ff4d6d', S, 0.10); g.fillStyle = '#ff4d6d';
  g.beginPath(); g.arc(-S*0.13,-S*0.02,S*0.06,0,TAU); g.fill();
  g.beginPath(); g.arc( S*0.13,-S*0.02,S*0.06,0,TAU); g.fill(); noglow(g);
}
function drawULeech(g, S) {            // green draining organism — wavy body, pulsing core
  glow(g, '#34e07a', S, 0.12);
  g.beginPath();
  for (let i=0;i<=24;i++){ const ang=i/24*TAU, rr=S*0.40+Math.sin(ang*5)*S*0.045, x=Math.cos(ang)*rr, y=Math.sin(ang)*rr; i?g.lineTo(x,y):g.moveTo(x,y); }
  g.closePath();
  let grad = g.createRadialGradient(0,0,S*0.05,0,0,S*0.44);
  grad.addColorStop(0,'#bfffd6'); grad.addColorStop(1,'#0e6b3e');
  g.fillStyle = grad; g.fill();
  g.lineWidth = S*0.025; g.strokeStyle = '#d8ffe7'; g.stroke();
  noglow(g);
  g.fillStyle = 'rgba(6,60,30,.5)';
  g.beginPath(); g.arc(-S*0.14,-S*0.06,S*0.09,0,TAU); g.fill();
  g.beginPath(); g.arc( S*0.13,S*0.05,S*0.07,0,TAU); g.fill();
  glow(g, '#ff4d6d', S, 0.10);
  g.beginPath(); g.arc(0,0,S*0.13,0,TAU);
  grad = g.createRadialGradient(0,0,2,0,0,S*0.13);
  grad.addColorStop(0,'#fff'); grad.addColorStop(0.6,'#ff8aa0'); grad.addColorStop(1,'#8a0f25');
  g.fillStyle = grad; g.fill(); noglow(g);
}

// ---- build atlas ------------------------------------------------------
const cache = {}, masks = {};
const DEFS = [
  ['player', 128, drawVanguard],
  ['ship_reaper', 128, drawReaper],
  ['ship_bastion', 132, drawBastion],
  ['ship_specter', 128, drawSpecter],
  ['ship_sovereign', 132, drawSovereign],
  ['grunt', 128, drawGrunt], ['swarm', 128, drawSwarm],
  ['tank', 128, drawTank], ['shooter', 128, drawShooter], ['boss', 200, drawBoss],
  ['dasher', 128, drawDasher], ['brute', 150, drawBrute], ['bomber', 128, drawBomber],
  ['splitter', 128, drawSplitter], ['healer', 128, drawHealer],
  ['u_overlord', 200, drawUOverlord], ['u_warden', 200, drawUWarden],
  ['u_colossus', 200, drawUColossus], ['u_leech', 200, drawULeech],
  ['coin', 128, drawCoin], ['gem', 128, drawGem], ['missile', 128, drawMissile],
];
for (const [key, S, fn] of DEFS) { cache[key] = mk(S, fn); masks[key] = whiteMask(cache[key]); }

// ---- public draw ------------------------------------------------------
function draw(ctx, key, x, y, size, rot) {
  const c = cache[key];
  if (!c) { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,size/2,0,TAU); ctx.fill(); return; }
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, -size/2, -size/2, size, size);
  ctx.restore();
}
function drawMask(ctx, key, x, y, size, rot, alpha) {
  const c = masks[key]; if (!c) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, -size/2, -size/2, size, size);
  ctx.restore();
}

// soft contact-shadow blob (baked once) + helper to drop it under any sprite for grounding/depth
const SHADOW = (() => {
  const S = 64, sc = document.createElement('canvas'); sc.width = S; sc.height = S;
  const sg = sc.getContext('2d');
  const gr = sg.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = gr; sg.beginPath(); sg.arc(S/2, S/2, S/2, 0, TAU); sg.fill();
  return sc;
})();
function shadow(ctx, x, y, w, h, alpha=1) {
  if (alpha !== 1) { ctx.save(); ctx.globalAlpha = alpha; }
  ctx.drawImage(SHADOW, x - w/2, y - h/2, w, h);
  if (alpha !== 1) ctx.restore();
}
window.Sprites = { draw, drawMask, shadow, _cache: cache };
})();

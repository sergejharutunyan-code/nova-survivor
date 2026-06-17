/* =====================================================================
   NOVA SURVIVOR — Idle Galaxy Defender
   A single-file HTML5 auto-survivor with roguelite upgrades + P2W economy.
   Pure Canvas + emoji sprites => no asset loading => Android-portable.
   ===================================================================== */
(() => {
'use strict';

// ------------------------------------------------------------------ utils
const $  = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const rand  = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick  = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (ax, ay, bx, by) => { const dx = ax-bx, dy = ay-by; return dx*dx + dy*dy; };
const fmt   = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : Math.floor(n);
const mmss  = (s) => Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
// deep clone with a fallback for older WebViews that predate structuredClone (the save is plain JSON)
const deepClone = (o) => (typeof structuredClone === 'function') ? structuredClone(o) : JSON.parse(JSON.stringify(o));

// ------------------------------------------------------------------ save
const SAVE_KEY = 'nova_survivor_save_v1';
const DEFAULT_SAVE = {
  coins: 0, gems: 25,
  meta:   { might:0, vitality:0, swift:0, greed:0, magnet:0, haste:0 },
  p2w:    { coinDoubler:0, megaDmg:0, guardian:0, vip:0, arsenal:0, gameSpeed:0 },
  relics: { dmg:0, hp:0, speed:0, firerate:0, magnet:0, xp:0, crit:0 },
  best:   { time:0, kills:0 },
  // wave progression: highest wave ever reached + the chosen / unlocked start wave
  maxWave: 1, skipMax: 1, startWave: 1, skipOn: true,
  // lifetime + best stats that feed quests
  lifeStats: { kills:0, coins:0, bosses:0, runs:0, bestTime:0, bestLevel:0, bestWeapons:1, bestWave:0 },
  // per-field count of quests completed (chain progress)
  quests: { slayer:0, survivor:0, tycoon:0, ascend:0, boss:0, veteran:0 },
  // progress toward the CURRENT active step, counted only since it became active
  questProg: { slayer:0, survivor:0, tycoon:0, ascend:0, boss:0, veteran:0 },
  // ultimate weapons unlocked at the end of quest trails
  unlockedWeapons: [],
  // daily challenge set
  daily:  { date:'', tier:0, chals:[] },
  // pilot ships (hangar)
  ships: ['vanguard'], ship: 'vanguard',
  // daily login streak + rewarded-ad free-gem counter
  login:  { last:'', streak:0 },
  adGems: { date:'', n:0 },
  // mastery tier — lifetime weapon-evolution + per-ship piloting achievements
  mastery: { evolved:[], shipKills:{}, shipRuns:{}, shipBestTime:{}, shipBestLevel:{}, claimed:{} },
  pity:   0, muted:0,
};
let save = load();
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return deepClone(DEFAULT_SAVE);
    const s = JSON.parse(raw);
    // merge to be forward-compatible
    return {
      ...deepClone(DEFAULT_SAVE), ...s,
      meta:      { ...DEFAULT_SAVE.meta,      ...(s.meta||{})      },
      p2w:       { ...DEFAULT_SAVE.p2w,       ...(s.p2w||{})       },
      relics:    { ...DEFAULT_SAVE.relics,    ...(s.relics||{})    },
      best:      { ...DEFAULT_SAVE.best,      ...(s.best||{})      },
      lifeStats: { ...DEFAULT_SAVE.lifeStats, ...(s.lifeStats||{}) },
      quests:    { ...DEFAULT_SAVE.quests,    ...(s.quests||{})    },
      questProg: { ...DEFAULT_SAVE.questProg, ...(s.questProg||{}) },
      daily:     { ...DEFAULT_SAVE.daily,     ...(s.daily||{})     },
      login:     { ...DEFAULT_SAVE.login,     ...(s.login||{})     },
      adGems:    { ...DEFAULT_SAVE.adGems,    ...(s.adGems||{})    },
      mastery:   { ...deepClone(DEFAULT_SAVE.mastery), ...(s.mastery||{}),
                   evolved: Array.isArray(s.mastery&&s.mastery.evolved) ? s.mastery.evolved : [] },
      unlockedWeapons: Array.isArray(s.unlockedWeapons) ? s.unlockedWeapons : [],
      ships: Array.isArray(s.ships) && s.ships.length ? s.ships : ['vanguard'],
      ship:  typeof s.ship === 'string' ? s.ship : 'vanguard',
    };
  } catch { return deepClone(DEFAULT_SAVE); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} }

// ------------------------------------------------------------------ audio (tiny synth, lazy)
let actx = null;
function beep(freq, dur=0.06, type='square', vol=0.04) {
  if (save.muted) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch {}
}
const SFX = {
  shoot:()=>beep(420,0.04,'square',0.015),
  hit:  ()=>beep(180,0.05,'sawtooth',0.02),
  coin: ()=>beep(880,0.05,'triangle',0.03),
  level:()=>{beep(660,0.08,'square',0.05);setTimeout(()=>beep(990,0.1,'square',0.05),80);},
  hurt: ()=>beep(110,0.12,'sawtooth',0.05),
  boss: ()=>beep(80,0.4,'sawtooth',0.06),
  buy:  ()=>{beep(520,0.06,'triangle',0.05);setTimeout(()=>beep(780,0.08,'triangle',0.05),70);},
  legend:()=>{[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.12,'square',0.05),i*90));},
};

// ------------------------------------------------------------------ canvas
const canvas = $('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ definitions
// Every normal weapon EVOLVES (the survivors-like signature mechanic): max its
// level AND own at least one stack of its catalyst stat, and a special EVOLVE
// card appears at level-up that transforms it into a far stronger form.
const WEAPONS = {
  blaster: { name:'Plasma Blaster', icon:'gun', desc:'Fires a fan of bolts ahead — snaps onto enemies in your sights. More bolts as it levels.',
             cd:0.55, dmg:12, speed:520, pierce:0, color:'#3df0ff', max:7, normal:true,
             evolve:{ name:'Astral Railstorm', stat:'proj', statName:'Multishot', dmgMul:1.5,
                      desc:'Bolts become astral lances that pierce through everything, forever.' } },
  spread:  { name:'Scatter Cannon', icon:'scatter', desc:'Point-blank shotgun — a wide spray of pellets that knocks enemies back. Crowd shredder.',
             cd:0.95, dmg:7, speed:460, pierce:0, color:'#ffcf3a', max:7, normal:true,
             evolve:{ name:'Supernova Burst', stat:'dmg', statName:'Amplify', dmgMul:1.6,
                      desc:'Every pellet detonates on impact, blasting everything nearby.' } },
  missile: { name:'Homing Swarm', icon:'rocket', desc:'Launches seeking micro-missiles that fan out, then chase enemies down.',
             cd:1.15, dmg:18, speed:300, pierce:0, color:'#ff8a5b', max:7, normal:true,
             evolve:{ name:'Dragonfire Swarm', stat:'fire', statName:'Rapid Fire', dmgMul:1.7,
                      desc:'+2 missiles with explosive warheads that erupt on impact.' } },
  orbit:   { name:'Aegis Orbs', icon:'orbit', desc:'Energy orbs circle you, smashing anything they touch.',
             cd:0, dmg:18, color:'#8a5bff', max:7,
             evolve:{ name:'Halo of Ruin', stat:'speed', statName:'Thrusters', dmgMul:2.0,
                      desc:'+3 golden blades on a wider, faster, far deadlier halo.' } },
  nova:    { name:'Nova Pulse', icon:'nova', desc:'Periodic shockwave damaging everything around you.',
             cd:2.2, dmg:30, color:'#ff4d6d', max:7,
             evolve:{ name:'Solar Flare', stat:'hp', statName:'Reinforce', dmgMul:1.7,
                      desc:'A wider shockwave that sets every enemy it touches ablaze.' } },
  laser:   { name:'Rail Beam', icon:'beam', desc:'Instant piercing beam through a whole line of enemies.',
             cd:1.3, dmg:34, color:'#34e07a', max:7,
             evolve:{ name:'Prism Array', stat:'range', statName:'Targeting Array', dmgMul:1.6,
                      desc:'Splits into three beams, lancing three targets at once.' } },

  // ===== ULTIMATES — unlocked at the end of quest trails. Cooldown-based, each
  // has its OWN mechanic & scaling (they ignore the standard per-level/fire-rate rules). =====
  tempest:     { name:'Tempest',      icon:'tempest', unique:true, cd:4.5, color:'#3df0ff', max:5,
                 desc:'Chain lightning leaps between many enemies for huge burst damage.' },
  meteor:      { name:'Meteor Strike',icon:'comet', unique:true, cd:6,   color:'#ff8a5b', max:5,
                 desc:'Calls a meteor onto the densest swarm — devastating area damage.' },
  singularity: { name:'Singularity',  icon:'blackhole', unique:true, cd:9,   color:'#b56bff', max:5,
                 desc:'Tears open a black hole that drags enemies in, then implodes.' },
  cryo:        { name:'Cryo Nova',    icon:'snow', unique:true, cd:7,   color:'#bff6ff', max:5,
                 desc:'Flash-freezes nearby foes solid; frozen enemies take +50% damage.' },
  chrono:      { name:'Chrono Field', icon:'hourglass', unique:true, cd:11,  color:'#8a5bff', max:5,
                 desc:'Warps time — drastically slows every enemy on the field for seconds.' },
  annihilate:  { name:'Annihilation', icon:'starburst', unique:true, cd:14,  color:'#ffcf3a', max:5,
                 desc:'Unleashes a screen-wide blast that obliterates everything in view.' },
};
const WEAPON_KEYS = Object.keys(WEAPONS);

const STAT_UPS = [
  // every stat has a natural cap (max stacks); once maxed it stops appearing
  { key:'dmg',    icon:'sword', title:'Amplify',     desc:'+18% damage',          apply:p=>p.damageMult+=0.18,                                  max:12 },
  { key:'fire',   icon:'fire', title:'Rapid Fire',  desc:'+14% fire rate',        apply:p=>p.fireRateMult+=0.14,                                max:10 },
  { key:'speed',  icon:'boot', title:'Thrusters',   desc:'+12% move speed',       apply:p=>p.moveSpeed*=1.12,                                   max:8 },
  { key:'hp',     icon:'heart', title:'Reinforce',  desc:'+30 max HP & heal',     apply:p=>{p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+30);},       max:12 },
  { key:'regen',  icon:'heartplus', title:'Nanobots', desc:'+0.8 HP/sec regen',   apply:p=>p.regen+=0.8,                                        max:8 },
  { key:'proj',   icon:'plus', title:'Multishot',   desc:'+1 projectile (all guns)', apply:p=>p.projBonus+=1,                                   max:5 },
  { key:'range',  icon:'range', title:'Targeting Array', desc:'+20% firing range', apply:p=>p.rangeMult+=0.20,                                   max:6 },
  { key:'magnet', icon:'magnet', title:'Magnet',     desc:'+45% pickup range',    apply:p=>p.pickupRange*=1.45,                                 max:5 },
  { key:'xp',     icon:'graph', title:'Brilliance',  desc:'+20% XP gain',         apply:p=>p.xpMult+=0.20,                                      max:8 },
  { key:'crit',   icon:'target', title:'Precision',  desc:'+6% crit chance',      apply:p=>p.crit=Math.min(1,p.crit+0.06),                      max:10 },
  { key:'haste2', icon:'fastforward', title:'Adrenaline', desc:'+8% fire & +8% speed', apply:p=>{p.fireRateMult+=0.08;p.moveSpeed*=1.08;},      max:8 },
];

// gacha pool: permanent relic boosts. weight by rarity.
const GACHA = [
  { rar:'common', w:55, items:[
    {icon:'nut',nm:'Scrap Bolt',  stat:'dmg', amt:1}, {icon:'shield',nm:'Plate', stat:'hp', amt:1},
    {icon:'swirl',nm:'Gyro',        stat:'speed',amt:1}, {icon:'clock',nm:'Spring',stat:'firerate',amt:1},
  ]},
  { rar:'rare', w:28, items:[
    {icon:'shard',nm:'Core Shard',  stat:'dmg', amt:2}, {icon:'magnet',nm:'Lodestone',stat:'magnet',amt:2},
    {icon:'book',nm:'Codex',       stat:'xp',  amt:2}, {icon:'target',nm:'Scope',    stat:'crit', amt:1},
  ]},
  { rar:'epic', w:12, items:[
    {icon:'sword',nm:'Trident Core',stat:'dmg', amt:4}, {icon:'heart',nm:'Heart Engine',stat:'hp',amt:4},
    {icon:'gear',nm:'Overclock',   stat:'firerate',amt:4},
  ]},
  { rar:'legend', w:4, items:[
    {icon:'crown',nm:'Crown of Power', stat:'dmg', amt:8}, {icon:'trophy',nm:'Titan Heart', stat:'hp', amt:8},
    {icon:'medal',nm:'Warlord Sigil',  stat:'crit',amt:4},
  ]},
  { rar:'mythic', w:1, items:[
    {icon:'starburst',nm:'Singularity', stat:'dmg', amt:16}, {icon:'starburst',nm:'Star Forge', stat:'firerate',amt:10},
  ]},
];
const RAR_LABEL = { common:'Common', rare:'Rare', epic:'Epic', legend:'Legendary', mythic:'MYTHIC' };

// ------------------------------------------------------------------ pilot ships
// Unlockable ships = the "character roster" retention layer every top
// survivors-like has. Each flies differently: own starting weapon + stat trade-offs.
const SHIPS = {
  vanguard:  { name:'Vanguard',  sprite:'player',         weapon:'blaster', cost:0,    cur:null,  role:'All-Rounder',
               desc:'Balanced strike craft. Where every legend begins.', mods:{} },
  reaper:    { name:'Reaper',    sprite:'ship_reaper',    weapon:'spread',  cost:800,  cur:'coins', role:'Glass Cannon',
               desc:'Hits like a truck, folds like paper — pure aggression.', mods:{ dmg:0.15, hp:-0.20 } },
  bastion:   { name:'Bastion',   sprite:'ship_bastion',   weapon:'orbit',   cost:2500, cur:'coins', role:'Fortress',
               desc:'A walking wall. Outlasts anything, in no hurry to do it.', mods:{ hp:0.40, regen:1, speed:-0.12 } },
  specter:   { name:'Specter',   sprite:'ship_specter',   weapon:'missile', cost:800,  cur:'gems', role:'Assassin',
               desc:'Fast, surgical, deadly on the crit — but fragile.', mods:{ speed:0.15, crit:0.10, hp:-0.10 } },
  sovereign: { name:'Sovereign', sprite:'ship_sovereign', weapon:'laser',   cost:1500, cur:'gems', role:'Flagship',
               desc:'The complete package — strong at everything, weak at nothing.', mods:{ dmg:0.10, fire:0.10, hp:0.10, speed:0.10, xp:0.10 } },
};
if (!SHIPS[save.ship] || !save.ships.includes(save.ship)) save.ship = 'vanguard';

// ------------------------------------------------------------------ game state
const G = {
  state: 'menu',        // menu | play | levelup | pause | gameover
  player: null,
  enemies: [], bullets: [], ebullets: [], gems: [], coins: [], parts: [], texts: [], orbs: [],
  beams: [],            // transient laser visuals
  hazards: [],          // black holes, meteors (ultimate effects)
  time: 0, kills: 0, runCoins: 0,
  wave: 1, waveT: 0, bossWave: false, bestWave: 1,
  spawnT: 0, bossesKilled: 0, bossesAlive: 0, bossEvent: 0, ultraIndex: 0,
  camX: 0, camY: 0, shake: 0, slowT: 0, flash: 0, zoom: 1,
  revives: 0, pendingCards: [], pendingLevels: 0,
};

// Derived starting stats from all permanent sources (meta + premium + relics + ship).
// Shared by newPlayer() and the Loadout/Stats screen so they never drift apart.
function baseStats() {
  const m = save.meta, p = save.p2w, r = save.relics;
  const vip = p.vip ? 1 : 0;
  const sh = SHIPS[save.ship] || SHIPS.vanguard, mod = sh.mods;
  return {
    maxHp:        (100 + m.vitality*10 + r.hp*8 + vip*20) * (1 + (mod.hp||0)),
    moveSpeed:    (200 + m.swift*7 + r.speed*4) * (1 + (mod.speed||0)),
    damageMult:   (1 + m.might*0.06 + r.dmg*0.03 + p.megaDmg*0.5 + vip*0.2) * (1 + (mod.dmg||0)),
    fireRateMult: (1 + m.haste*0.04 + r.firerate*0.02 + vip*0.2) * (1 + (mod.fire||0)),
    pickupRange:  75 + m.magnet*8 + r.magnet*5,
    coinMult:     (1 + m.greed*0.06) * (p.coinDoubler?2:1) * (vip?1.2:1),
    xpMult:       (1 + r.xp*0.02 + vip*0.2) * (1 + (mod.xp||0)),
    crit:         0.05 + r.crit*0.01 + (mod.crit||0),
    critMult:     2.1,
    regen:        mod.regen || 0,
    startLevel:   p.arsenal ? 5 : 1,
    sprite:       sh.sprite,
    weapon:       sh.weapon,
  };
}
function newPlayer() {
  const s = baseStats(), p = save.p2w;
  const player = {
    x:0, y:0, r:18, face:0, moving:false, sprite: s.sprite,
    maxHp: s.maxHp, regen: s.regen,
    moveSpeed: s.moveSpeed, damageMult: s.damageMult, fireRateMult: s.fireRateMult,
    pickupRange: s.pickupRange, coinMult: s.coinMult, xpMult: s.xpMult,
    crit: s.crit, critMult: s.critMult, projBonus: 0, projMult: 1, rangeMult: 1, statLvl: {},
    level: 1, xp: 0, xpNext: xpForLevel(1),
    weapons: [{ key: s.weapon, level:1 }],
    invuln: 0, guardianUsed: false,
  };
  player.hp = player.maxHp;
  // Pay-to-win starting arsenal (never duplicates the ship's starting weapon)
  if (p.arsenal) {
    player.level = s.startLevel; player.xpNext = xpForLevel(s.startLevel);
    const pool = ['spread','orbit','nova'].filter(k => !getW(player, k));
    player.weapons.push({ key: pick(pool.length ? pool : ['missile']), level:1 });
  }
  return player;
}
function getW(p, key) { return p.weapons.find(w => w.key === key); }
function xpForLevel(lv) { return Math.floor(5 + (lv-1)*4 + Math.pow(lv,1.7)); }

// ------------------------------------------------------------------ input (floating joystick + keyboard)
const input = { active:false, sx:0, sy:0, cx:0, cy:0, kx:0, ky:0 };
const keys = {};
const TURN_RATE = 11;   // player facing turns at this rate (rad/s) — smooth, not instant
function moveVector() {
  let dx = 0, dy = 0;
  if (input.active) {
    dx = input.cx - input.sx; dy = input.cy - input.sy;
    const m = Math.hypot(dx, dy);
    // analog: direction = unit vector, magnitude ramps 0→1 over a 6px deadzone up to a 60px throw
    if (m > 6) { const k = Math.min(m, 60) / 60; dx = dx/m * k; dy = dy/m * k; } else { dx = dy = 0; }
  }
  // keyboard overrides/adds
  let kx = (keys['d']||keys['arrowright']?1:0) - (keys['a']||keys['arrowleft']?1:0);
  let ky = (keys['s']||keys['arrowdown']?1:0) - (keys['w']||keys['arrowup']?1:0);
  if (kx || ky) { const m = Math.hypot(kx,ky); dx = kx/m; dy = ky/m; }
  return { x:dx, y:dy };
}
function pointerDown(e) {
  if (G.state !== 'play') return;
  const t = e.touches ? e.touches[0] : e;
  input.active = true; input.sx = input.cx = t.clientX; input.sy = input.cy = t.clientY;
  if (actx && actx.state === 'suspended') actx.resume();
}
function pointerMove(e) {
  if (!input.active) return;
  const t = e.touches ? e.touches[0] : e;
  input.cx = t.clientX; input.cy = t.clientY;
}
function pointerUp() { input.active = false; }
canvas.addEventListener('mousedown', pointerDown);
window.addEventListener('mousemove', pointerMove);
window.addEventListener('mouseup', pointerUp);
canvas.addEventListener('touchstart', e=>{e.preventDefault();pointerDown(e);}, {passive:false});
canvas.addEventListener('touchmove',  e=>{e.preventDefault();pointerMove(e);}, {passive:false});
canvas.addEventListener('touchend',   e=>{e.preventDefault();pointerUp(e);},  {passive:false});
window.addEventListener('keydown', e=>{ keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   e=>{ keys[e.key.toLowerCase()] = false; });

// ------------------------------------------------------------------ waves
// Wave-based progression (Brotato-style): difficulty steps per discrete wave
// instead of a continuous clock — easier to scale, and the basis for wave-skip.
// Normal waves clear on a timer; every Nth wave is a BOSS wave that holds the
// run until the boss(es) die.
const WAVE_TIME = 20;                 // seconds per normal wave  (tuning knob)
const BOSS_EVERY = 10;                // every Nth wave is a boss wave
const isBossWave = (w) => w % BOSS_EVERY === 0;
function updateWaves(dt) {
  if (G.bossWave) {                   // a boss wave holds the run until it's cleared
    if (G.bossesAlive === 0) { G.bossWave = false; advanceWave(); }
    return;
  }
  G.waveT += dt;
  if (G.waveT >= WAVE_TIME) advanceWave();
}
function advanceWave() {
  G.wave++; G.waveT = 0;
  if (G.wave > G.bestWave) G.bestWave = G.wave;
  if (isBossWave(G.wave)) { G.bossWave = true; spawnBossEvent(); announceWave(G.wave, true); }
  else                    announceWave(G.wave, false);
}
function announceWave(w, boss) {
  const el = $('waveBanner');
  if (el) {
    el.className = 'wave-banner' + (boss ? ' boss' : '');
    el.innerHTML = boss ? ico('boss',20)+' WAVE '+w+' · BOSS' : 'WAVE '+w;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');  // restart anim
  }
  const wc = $('waveChip'); if (wc) wc.textContent = w;
}

// ------------------------------------------------------------------ spawning
function spawnWave(dt) {
  G.spawnT -= dt;
  if (G.spawnT > 0) return;
  const w = G.wave;
  const interval = clamp(1.5 - w*0.045, 0.22, 1.5);     // spawns quicken with the wave
  G.spawnT = interval;
  const cap = Math.min(320, 150 + w*9);                 // and the field gets more crowded
  if (G.enemies.length > cap) return;
  let budget = 1 + Math.floor(w*0.6);                   // more enemies per wave
  if (G.bossWave) budget = Math.ceil(budget*0.5);       // boss waves spawn fewer adds
  for (let i = 0; i < budget; i++) spawnEnemy(w);
}
// Weighted spawn pool. Basics (grunt/swarm) dominate the opening and slowly thin out to a
// floor (never zero). Specials are introduced ONE at a time on a complexity ramp — each enters
// rare at its intro wave and grows more common with the wave — so early runs are almost all
// fodder and late runs are mostly specials/elites with only a trickle of basics.
function enemyTypeFor(w) {
  const pool = [['grunt', Math.max(3, 14 - w*0.45)]];
  if (w >= 2) pool.push(['swarm', Math.max(2, 9 - w*0.25)]);
  const add = (type, intro, base, growth) => { if (w >= intro) pool.push([type, base + (w-intro)*growth]); };
  add('tank',     4,  2,   0.45);   // slow bullet-sponge — "some enemies take more hits"
  add('dasher',   6,  2,   0.50);   // telegraphed charge — dodging
  add('shooter',  8,  2,   0.40);   // ranged fire — incoming bullets
  add('splitter', 11, 2,   0.40);   // splits on death
  add('bomber',   14, 2,   0.45);   // detonates on death
  add('healer',   17, 1.5, 0.30);   // heals nearby — priority target
  add('brute',    20, 1.5, 0.50);   // recurring elite mini-boss
  let total = 0; for (const e of pool) total += e[1];
  let r = Math.random()*total;
  for (const [type,wt] of pool) { r -= wt; if (r <= 0) return type; }
  return 'grunt';
}
const E_DEF = {
  grunt:   { r:16, hp:22,   spd:62,  dmg:8,  xp:1, coin:0.18, color:'#b56bff' },
  swarm:   { r:13, hp:11,   spd:104, dmg:6,  xp:1, coin:0.12, color:'#34e07a' },
  tank:    { r:26, hp:90,   spd:40,  dmg:16, xp:3, coin:0.5,  color:'#ff8a5b' },
  shooter: { r:18, hp:38,   spd:50,  dmg:10, xp:3, coin:0.5,  color:'#3df0ff', shoots:true },
  dasher:  { r:15, hp:30,   spd:50,  dmg:16, xp:2, coin:0.3,  color:'#ff4d6d', dash:true },
  splitter:{ r:22, hp:75,   spd:52,  dmg:12, xp:3, coin:0.5,  color:'#34e07a', splits:true },
  bomber:  { r:18, hp:42,   spd:74,  dmg:9,  xp:3, coin:0.5,  color:'#ff8a5b', bomb:true },
  healer:  { r:18, hp:64,   spd:44,  dmg:6,  xp:4, coin:0.7,  color:'#34e07a', heals:true },
  brute:   { r:34, hp:300,  spd:33,  dmg:30, xp:8, coin:1.5,  color:'#ff4d6d', elite:true },
  boss:    { r:54, hp:1400, spd:46,  dmg:28, xp:40,coin:18,   color:'#ff4d6d', boss:true },
};
// HP scales EXPONENTIALLY per wave: trivial early, then runaway — you become
// dependent on permanent + in-run upgrades to keep killing fast enough to survive.
function difficultyScale(w) { return Math.pow(1.14, w-1) + G.bossesKilled*0.4; }
// damage scales more gently so late-wave hits HURT but don't instantly one-shot.
function dmgScale(w) { return Math.pow(1.09, w-1) + (w-1)*0.06; }
function spawnEnemy(w, type) {
  type = type || enemyTypeFor(w);
  const d = E_DEF[type];
  const hs = difficultyScale(w), ds = dmgScale(w);
  const ang = Math.random() * TAU;
  const range = (Math.max(W, H) * 0.62 + 80) / G.zoom;  // spawn beyond the (zoom-aware) view
  const speedRamp = 1 + Math.min(0.45, (w-1)*0.02);     // enemies get a bit faster too
  const e = {
    type, r:d.r, color:d.color,
    x: G.player.x + Math.cos(ang)*range,
    y: G.player.y + Math.sin(ang)*range,
    hp: d.hp * hs, maxHp: d.hp * hs,
    spd: d.spd * (type==='boss'?1:rand(0.85,1.1)) * speedRamp,
    dmg: d.dmg * ds,
    xp: d.xp, coin: d.coin, shoots: d.shoots, boss: d.boss, elite: d.elite,
    dash: d.dash, splits: d.splits, bomb: d.bomb, heals: d.heals,
    hitFlash:0, orbCD:0, novaCD:0, shootCD:rand(1,2.5), knock:{x:0,y:0}, frozen:0, hazCD:0,
    healCD:rand(2,3.5), dashState:'approach', dashCD:rand(1.5,3), dashT:0, dvx:0, dvy:0, isChild:false,
  };
  G.enemies.push(e);
  return e;
}
function spawnBoss() {
  const b = spawnEnemy(G.wave, 'boss');
  b.hp = b.maxHp = E_DEF.boss.hp * difficultyScale(G.wave);
  G.bossesAlive++;
  G.shake = 14; SFX.boss();
  toast(ico('boss',16)+' BOSS INCOMING', 1600);
  return b;
}

// ===== ULTIMATE BOSSES — unique, with their own attacks =====
const NORMAL_PER_ULTIMATE = 3;   // after this many normal bosses, a (rare) MEGA-boss event fires
const MEGA_HP = 1.3, MEGA_DMG = 1.25;  // mega bosses tank & hit harder than a normal boss of the same wave
const ULTRA_BOSSES = [
  { sprite:'u_overlord', name:'The Overlord', hp:3200, r:60, spd:40, dmg:34, attack:'summon', color:'#b56bff' },
  { sprite:'u_warden',   name:'The Warden',   hp:3000, r:58, spd:34, dmg:30, attack:'radial', color:'#3df0ff' },
  { sprite:'u_colossus', name:'The Colossus', hp:4400, r:70, spd:38, dmg:42, attack:'charge', color:'#ff8a5b' },
  { sprite:'u_leech',    name:'The Leech',    hp:3000, r:58, spd:42, dmg:28, attack:'drain',  color:'#34e07a' },
];
// every unique combination, ordered by size: all singles, then all pairs, then triples … (2^n − 1 total)
function buildCombos(n) {
  const all = [];
  for (let size = 1; size <= n; size++) {
    (function rec(start, cur) {
      if (cur.length === size) { all.push(cur.slice()); return; }
      for (let i = start; i < n; i++) { cur.push(i); rec(i+1, cur); cur.pop(); }
    })(0, []);
  }
  return all;
}
const ULTRA_COMBOS = buildCombos(ULTRA_BOSSES.length);
function ultraComboFor(u) {                    // u = 0,1,2,… ; loops with rising "ascension"
  const total = ULTRA_COMBOS.length;
  return { keys: ULTRA_COMBOS[u % total], asc: Math.floor(u / total) };
}
function spawnUltra(def, hs, angle) {
  const range = Math.max(W, H) * 0.55 + 60;
  const e = {
    type: def.sprite, ultra:true, boss:true, name:def.name, attack:def.attack,
    r:def.r, color:def.color,
    x: G.player.x + Math.cos(angle)*range,
    y: G.player.y + Math.sin(angle)*range,
    hp: def.hp*hs*MEGA_HP, maxHp: def.hp*hs*MEGA_HP,
    spd: def.spd, dmg: def.dmg * dmgScale(G.wave) * MEGA_DMG,
    xp:90, coin:30, boss:true,
    hitFlash:0, knock:{x:0,y:0}, frozen:0, hazCD:0, orbCD:0,
    atkCD: rand(2,4), spin:0, chargeT:0, spdMul:1,
  };
  G.enemies.push(e); G.bossesAlive++;
  return e;
}
function spawnBossEvent() {
  const isUltra = (G.bossEvent % (NORMAL_PER_ULTIMATE + 1)) === NORMAL_PER_ULTIMATE;
  if (isUltra) {
    const { keys, asc } = ultraComboFor(G.ultraIndex++);
    const hs = difficultyScale(G.wave) * (1 + asc*0.6);
    keys.forEach((idx, k) => spawnUltra(ULTRA_BOSSES[idx], hs, (k/keys.length)*TAU + rand(-0.3,0.3)));
    const names = keys.map(i => ULTRA_BOSSES[i].name);
    const title = ico('boss',16) + (keys.length > 1 ? ' ULTIMATE: ' + names.join(' + ') : ' ULTIMATE BOSS: ' + names[0]);
    G.shake = 18; SFX.boss();
    toast(title + (asc > 0 ? '  ✦' + (asc+1) : ''), 2400);
  } else {
    spawnBoss();
  }
  G.bossEvent++;
}
function updateUltraAttack(e, p, dt, a) {
  e.atkCD -= dt;
  switch (e.attack) {
    case 'summon':
      if (e.atkCD <= 0) { e.atkCD = 5;
        for (let i = 0; i < 4; i++) { const c = spawnEnemy(G.wave, Math.random()<0.5?'grunt':'dasher');
          c.x = e.x + rand(-50,50); c.y = e.y + rand(-50,50); }
        ring(e.x, e.y, e.r+30, e.color);
      }
      break;
    case 'radial':
      if (e.atkCD <= 0) { e.atkCD = 2.4; const num = 20;
        for (let i = 0; i < num; i++) { const ang = i/num*TAU + e.spin;
          G.ebullets.push({ x:e.x, y:e.y, vx:Math.cos(ang)*210, vy:Math.sin(ang)*210, r:7, dmg:e.dmg*0.5, life:5 }); }
        e.spin += 0.4; G.shake = Math.max(G.shake, 4);
      }
      break;
    case 'charge':
      if (e.chargeT > 0) { e.chargeT -= dt; if (e.chargeT <= 0) { e.spdMul = 1; e.atkCD = rand(3, 4.5); } }
      else if (e.atkCD <= 0) { e.chargeT = 0.85; e.spdMul = 4.5; G.shake = Math.max(G.shake, 8); ring(e.x, e.y, e.r+24, e.color); }
      break;
    case 'drain':
      if (e.atkCD <= 0) { e.atkCD = 4;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp*0.06); ring(e.x, e.y, e.r+20, '#34e07a');
        for (let k = -1; k <= 1; k++) { const ang = a + k*0.25;
          G.ebullets.push({ x:e.x, y:e.y, vx:Math.cos(ang)*240, vy:Math.sin(ang)*240, r:8, dmg:e.dmg*0.6, life:5 }); }
      }
      break;
  }
}

// ------------------------------------------------------------------ combat helpers
function dealDamage(e, dmg, knockX=0, knockY=0, crit=false) {
  if (e.frozen > 0) dmg *= 1.5;          // frozen enemies take +50% (Cryo Nova shatter)
  e.hp -= dmg; e.hitFlash = 0.08;
  if (knockX || knockY) { e.knock.x += knockX; e.knock.y += knockY; }
  spawnText(e.x, e.y - e.r, Math.round(dmg), crit ? '#ffcf3a' : '#ffffff', crit);
  if (e.hp <= 0) killEnemy(e);
}
function rollDamage(base) {
  const crit = Math.random() < Math.min(1, G.player.crit);
  return { dmg: base * (crit ? G.player.critMult : 1), crit };
}
function killEnemy(e) {
  e.dead = true;
  G.kills++;
  const gemN = e.ultra ? 6 : e.boss ? 14 : e.elite ? 5 : 1;   // mega bosses pay out in coins, not XP-gem orbs
  for (let i = 0; i < gemN; i++) {
    G.gems.push({ x:e.x+rand(-e.r,e.r), y:e.y+rand(-e.r,e.r), vx:rand(-40,40), vy:rand(-40,40), xp:e.xp, r:5 });
  }
  // coin drops (bosses & elites always drop a handful; ultimates a hoard)
  const coinN = e.ultra ? 48 : e.boss ? 12 : e.elite ? 3 : 1;
  if (e.boss || e.elite || Math.random() < e.coin) {
    for (let i=0;i<coinN;i++)
      G.coins.push({ x:e.x+rand(-e.r,e.r), y:e.y+rand(-e.r,e.r), vx:rand(-50,50), vy:rand(-50,50), v: e.ultra?5:e.boss?2:1, r:6 });
  }
  // splitter — bursts into fast swarmlings
  if (e.splits && !e.isChild) {
    for (let i = 0; i < 3; i++) {
      const c = spawnEnemy(G.wave, 'swarm');
      c.x = e.x + rand(-18,18); c.y = e.y + rand(-18,18);
      c.isChild = true; c.hp = c.maxHp = Math.max(8, c.maxHp*0.4); c.spd *= 1.25;
    }
  }
  // bomber — detonates, hitting the player if caught in the blast
  if (e.bomb && !e._exploded) {
    e._exploded = true; const R = 115;
    ring(e.x, e.y, R, '#ff8a5b'); burst(e.x, e.y, '#ffcf3a', 22); G.shake = Math.max(G.shake, 8); SFX.boss();
    if (dist2(e.x, e.y, G.player.x, G.player.y) < R*R) hurtPlayer(e.dmg * 2.5);
  }
  burst(e.x, e.y, e.color, e.boss?26:8);
  if (e.boss) {
    G.bossesAlive = Math.max(0, G.bossesAlive - 1); G.bossesKilled++; G.shake = 12;
    const bonus = Math.round((e.ultra ? 60 : 8) * G.player.coinMult);
    G.runCoins += bonus;
    toast((e.ultra ? (e.name||'Ultimate')+' down!' : 'Boss down!') + ' &nbsp;+'+bonus+' '+ico('coin',14), 1500);
  }
  SFX.hit();
}

// ------------------------------------------------------------------ weapons fire
function nearestEnemy(x, y, maxR=Infinity) {
  let best = null, bd = maxR*maxR;
  const arr = G.enemies;
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i]; if (e.dead) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function fireBullet(x, y, ang, def, dmgBase, extra={}) {
  const { dmg, crit } = rollDamage(dmgBase);
  const sp = def.speed * (extra.speedMul||1);
  G.bullets.push({
    x, y, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp,
    dmg, crit, r: extra.r||6, pierce: extra.pierce||0, life: extra.life||1.6,
    color: def.color, homing: extra.homing||false, emoji: extra.emoji,
    blast: extra.blast||0, knock: extra.knock || 0.15, twirl: extra.twirl || 0, spin: extra.spin || 0,
  });
}
function updateWeapons(dt) {
  const p = G.player;
  for (const w of p.weapons) {
    const def = WEAPONS[w.key];
    if (w.key === 'orbit') continue; // continuous
    if (w._cd === undefined) w._cd = 0;
    w._cd -= dt;
    if (w._cd > 0) continue;
    // Ultimates ignore fire-rate scaling; their cooldown shrinks with their OWN level instead.
    w._cd = def.unique ? def.cd * Math.max(0.5, 1 - (w.level-1)*0.08) : def.cd / p.fireRateMult;
    fireWeapon(w, def, p);
  }
  updateOrbs(dt);
}
// base projectile count per normal weapon, before multishot + overcharge multiplier
function baseProj(key, lvl) {
  if (key === 'blaster') return 1 + (lvl-1);        // 1..7
  if (key === 'spread')  return 2 + lvl;            // 3..9
  if (key === 'missile') return 1 + Math.floor(lvl/2); // 1..4
  return 1;
}
// multishot (+N) and overcharge (×projMult) apply to ALL normal weapons
function projCount(w, p) {
  return Math.max(1, Math.round((baseProj(w.key, w.level) + p.projBonus) * p.projMult));
}
function fireWeapon(w, def, p) {
  if (def.unique) { uniqueFire(w, def, p); return; }
  const lvl = w.level, evo = w.evolved ? def.evolve.dmgMul : 1;
  // normal weapons scale damage GENTLY (projectile count already grows w/ level + overcharge);
  // single-instance weapons (orbit/nova/laser) keep the steeper curve.
  const ndmg = def.dmg * (1 + (lvl-1)*0.16) * p.damageMult * evo;
  const dmg  = def.dmg * (1 + (lvl-1)*0.35) * p.damageMult * evo;
  switch (w.key) {
    case 'blaster': {                               // fan of bolts ahead, with semi-autoaim
      // snaps onto the nearest enemy inside a cone in front of you; otherwise fires straight
      const target = aimAssist(p, 0.6, firingRange(p));
      const aim = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.face;
      const count = projCount(w, p);
      const step = count > 1 ? Math.min(0.11, 0.9/(count-1)) : 0;
      for (let i = 0; i < count; i++) {
        const off = (i - (count-1)/2) * step;
        // evolved: lances pierce everything and fly faster
        fireBullet(p.x, p.y, aim+off, def, ndmg,
          { pierce: w.evolved ? 999 : Math.floor((lvl-1)/3), r: w.evolved?8:6, life: firingRange(p)/def.speed, speedMul: w.evolved?1.3:1 });
      }
      SFX.shoot(); break;
    }
    case 'spread': {                                // shotgun: a wide, jittery spray with real punch
      const pellets = projCount(w, p) + 2;          // always a thicker spread than the blaster's fan
      const arc = 1.2;                               // wider cone than the blaster
      for (let i = 0; i < pellets; i++) {
        const base = pellets > 1 ? (i/(pellets-1) - 0.5) * arc : 0;
        const off = base + rand(-0.06, 0.06);        // organic scatter, not a neat fan
        // shares the blaster's range (the ring); pellets knock enemies back
        fireBullet(p.x, p.y, p.face+off, def, ndmg, { r:5, life: firingRange(p)/def.speed, blast: w.evolved?70:0, knock:0.32 });
      }
      SFX.shoot(); break;
    }
    case 'missile': {                               // burst out to the sides & back, twirl, then hunt
      const want = projCount(w, p) + (w.evolved ? 2 : 0);
      const cap = 6 + w.level*2 + (w.evolved ? 6 : 0) + p.projBonus*2;   // limit how many linger at once
      let active = 0; for (const b of G.bullets) if (b.homing && !b.dead) active++;
      const launch = Math.max(0, Math.min(want, cap - active));
      const arc = Math.PI * 1.5;                    // spread across the rear ~270° (sides + back, not straight ahead)
      for (let i = 0; i < launch; i++) {
        const a = (p.face + Math.PI) + (launch > 1 ? (i/(launch-1) - 0.5) * arc : 0) + rand(-0.1, 0.1);
        const spin = (Math.random() < 0.5 ? -1 : 1) * rand(3.5, 5.5);   // twirl direction
        fireBullet(p.x, p.y, a, def, ndmg*1.1,
          { homing:true, r:7, life:3.8*p.rangeMult, pierce:1, emoji:'missile', blast: w.evolved?90:0, twirl: rand(0.5, 0.9), spin });
      }
      if (launch > 0) SFX.shoot();
      break;
    }
    case 'nova': {
      const radius = firingRange(p) * (w.evolved ? 1.4 : 1);   // base matches the blaster's range ring; Solar Flare is wider
      ring(p.x, p.y, radius, w.evolved ? '#ff8a5b' : def.color);
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist2(p.x,p.y,e.x,e.y) < radius*radius) {
          const a = Math.atan2(e.y-p.y, e.x-p.x);
          const { dmg:d, crit } = rollDamage(dmg);
          dealDamage(e, d, Math.cos(a)*160, Math.sin(a)*160, crit);
          // evolved: Solar Flare ignites everything it touches
          if (w.evolved && !e.dead) { e.burnT = 3; e.burnDps = dmg*0.25; e.burnTick = 0.5; }
        }
      }
      G.shake = Math.max(G.shake, 4); break;
    }
    case 'laser': {
      // evolved: Prism Array lances the 3 nearest targets at once
      const lr = firingRange(p) * 3;                 // Rail Beam reaches 3x the plasma range
      const targets = w.evolved
        ? nearestEnemies(p.x, p.y, 3).filter(e => dist2(p.x, p.y, e.x, e.y) <= lr*lr)
        : [nearestEnemy(p.x, p.y, lr)].filter(Boolean);
      if (!targets.length) { w._cd = 0.2; break; }
      for (const target of targets) {
        const ang = Math.atan2(target.y-p.y, target.x-p.x);
        const len = lr, ex = p.x+Math.cos(ang)*len, ey = p.y+Math.sin(ang)*len;
        G.beams.push({ x1:p.x, y1:p.y, x2:ex, y2:ey, life:0.12, color:def.color });
        const thick = 16 + lvl*3;
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (pointSegDist2(e.x, e.y, p.x, p.y, ex, ey) < (thick+e.r)*(thick+e.r)) {
            const { dmg:d, crit } = rollDamage(dmg*1.2);
            dealDamage(e, d, Math.cos(ang)*60, Math.sin(ang)*60, crit);
          }
        }
      }
      SFX.shoot(); break;
    }
  }
}
// nearest living enemy within a cone (±maxAng radians) of the facing direction
function aimAssist(p, maxAng, maxR) {
  let best = null, bd = maxR*maxR;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = dist2(p.x, p.y, e.x, e.y);
    if (d >= bd) continue;
    let da = Math.atan2(e.y - p.y, e.x - p.x) - p.face;
    while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    if (Math.abs(da) <= maxAng) { bd = d; best = e; }
  }
  return best;
}
// the n nearest living enemies (for Prism Array)
function nearestEnemies(x, y, n) {
  const arr = [];
  for (const e of G.enemies) { if (!e.dead) arr.push([dist2(x,y,e.x,e.y), e]); }
  arr.sort((a,b) => a[0]-b[0]);
  return arr.slice(0, n).map(a => a[1]);
}
function updateOrbs(dt) {
  const p = G.player, w = getW(p, 'orbit');
  if (!w) { G.orbs.length = 0; return; }
  // evolved Halo of Ruin: +3 orbs, wider ring, faster spin, double damage
  const count = 2 + Math.floor(w.level*0.8) + (w.evolved ? 3 : 0);
  const radius = firingRange(p) * 0.5 * (w.evolved ? 1.25 : 1);   // half the blaster's range; Halo of Ruin is wider
  if (G.orbs.length !== count) {
    G.orbs = Array.from({length:count}, (_,i)=>({ a:(i/count)*TAU }));
  }
  const dmg = WEAPONS.orbit.dmg * (1+(w.level-1)*0.3) * p.damageMult * (w.evolved ? 2 : 1);
  for (const o of G.orbs) {
    o.a += dt * (w.evolved ? 3.4 : 2.4);
    o.x = p.x + Math.cos(o.a)*radius;
    o.y = p.y + Math.sin(o.a)*radius;
  }
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.orbCD -= dt;
    if (e.orbCD > 0) continue;
    for (const o of G.orbs) {
      if (dist2(o.x,o.y,e.x,e.y) < (18+e.r)*(18+e.r)) {
        const a = Math.atan2(e.y-p.y, e.x-p.x);
        const { dmg:d, crit } = rollDamage(dmg);
        dealDamage(e, d, Math.cos(a)*120, Math.sin(a)*120, crit);
        e.orbCD = 0.28; break;
      }
    }
  }
}
function pointSegDist2(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay; const l2=dx*dx+dy*dy;
  let t = l2 ? ((px-ax)*dx+(py-ay)*dy)/l2 : 0; t=clamp(t,0,1);
  const cx=ax+t*dx, cy=ay+t*dy; return dist2(px,py,cx,cy);
}

// ------------------------------------------------------------------ ULTIMATE weapons
// the enemy with the most neighbours within R (best cluster to hit)
function densestPoint(R=150) {
  const arr = G.enemies; let best = null, bc = -1;
  for (const e of arr) { if (e.dead) continue;
    let c = 0; for (const o of arr) { if (!o.dead && dist2(e.x,e.y,o.x,o.y) < R*R) c++; }
    if (c > bc) { bc = c; best = e; }
  }
  return best;
}
function chainLightning(p, chains, dmg) {
  let from = { x:p.x, y:p.y }; const hit = new Set();
  for (let i = 0; i < chains; i++) {
    let best = null, bd = 520*520;
    for (const e of G.enemies) { if (e.dead || hit.has(e)) continue;
      const d = dist2(from.x,from.y,e.x,e.y); if (d < bd) { bd = d; best = e; } }
    if (!best) break;
    hit.add(best);
    G.beams.push({ x1:from.x, y1:from.y, x2:best.x, y2:best.y, life:0.18, color:'#3df0ff' });
    const { dmg:d, crit } = rollDamage(dmg);
    dealDamage(best, d, 0, 0, crit);
    from = { x:best.x, y:best.y };
  }
}
function uniqueFire(w, def, p) {
  const lvl = w.level, dm = p.damageMult;
  switch (w.key) {
    case 'tempest': {                                   // chain lightning burst
      const target = nearestEnemy(p.x, p.y); if (!target) { w._cd = 0.3; break; }
      chainLightning(p, 4 + lvl*2, (40 + lvl*18) * dm); SFX.legend(); break;
    }
    case 'meteor': {                                    // delayed AoE on densest cluster
      const t = densestPoint() || nearestEnemy(p.x, p.y); if (!t) { w._cd = 0.3; break; }
      G.hazards.push({ type:'meteor', x:t.x, y:t.y, life:0.85, t:0, radius:150 + lvl*22,
                       dmg:(120 + lvl*45) * dm, done:false });
      SFX.boss(); break;
    }
    case 'singularity': {                               // black hole: pull + DoT + implode
      const t = densestPoint() || nearestEnemy(p.x, p.y); if (!t) { w._cd = 0.3; break; }
      G.hazards.push({ type:'blackhole', x:t.x, y:t.y, life:2.2, t:0, radius:150 + lvl*22,
                       dmg:(22 + lvl*8) * dm, pull:240, exploded:false });
      SFX.legend(); break;
    }
    case 'cryo': {                                      // freeze nearby + damage
      const radius = 180 + lvl*26, dur = 1.6 + lvl*0.35;
      let any = false;
      for (const e of G.enemies) { if (e.dead) continue;
        if (dist2(p.x,p.y,e.x,e.y) < radius*radius) {
          e.frozen = Math.max(e.frozen, dur); any = true;
          const { dmg:d, crit } = rollDamage((16 + lvl*7) * dm); dealDamage(e, d, 0, 0, crit);
        } }
      ring(p.x, p.y, radius, '#bff6ff'); if (any) G.shake = Math.max(G.shake, 6); SFX.hit(); break;
    }
    case 'chrono': {                                    // global slow
      G.slowT = Math.max(G.slowT, 2.5 + lvl*0.5);
      ring(p.x, p.y, 260, '#8a5bff'); SFX.legend(); break;
    }
    case 'annihilate': {                                // screen-wide nuke
      const dmg = (90 + lvl*45) * dm;
      for (const e of G.enemies) { if (e.dead) continue;
        const ex = e.x - G.camX, ey = e.y - G.camY;
        if (ex > -60 && ex < W+60 && ey > -60 && ey < H+60) {
          const { dmg:d, crit } = rollDamage(dmg); dealDamage(e, d, 0, 0, crit);
        } }
      G.flash = 0.35; G.shake = 16; ring(p.x, p.y, Math.max(W,H), '#ffcf3a'); SFX.legend(); break;
    }
  }
}
function updateHazards(dt) {
  const p = G.player;
  for (const hz of G.hazards) {
    hz.t += dt; hz.life -= dt;
    if (hz.type === 'blackhole') {
      for (const e of G.enemies) { if (e.dead) continue;
        if (dist2(hz.x,hz.y,e.x,e.y) < hz.radius*hz.radius) {
          const a = Math.atan2(hz.y-e.y, hz.x-e.x);
          e.x += Math.cos(a)*hz.pull*dt; e.y += Math.sin(a)*hz.pull*dt;
          e.hazCD -= dt; if (e.hazCD <= 0) { e.hazCD = 0.18;
            const { dmg:d, crit } = rollDamage(hz.dmg*0.25); dealDamage(e, d, 0, 0, crit); }
        } }
      if (hz.life <= 0 && !hz.exploded) { hz.exploded = true;
        for (const e of G.enemies) { if (e.dead) continue;
          if (dist2(hz.x,hz.y,e.x,e.y) < hz.radius*hz.radius) {
            const { dmg:d, crit } = rollDamage(hz.dmg*3); dealDamage(e, d, 0, 0, crit); } }
        burst(hz.x, hz.y, '#8a5bff', 26); ring(hz.x, hz.y, hz.radius, '#b56bff'); G.shake = 9;
      }
    } else if (hz.type === 'meteor') {
      if (hz.life <= 0 && !hz.done) { hz.done = true;
        for (const e of G.enemies) { if (e.dead) continue;
          if (dist2(hz.x,hz.y,e.x,e.y) < hz.radius*hz.radius) {
            const { dmg:d, crit } = rollDamage(hz.dmg); dealDamage(e, d, 0, 0, crit); } }
        burst(hz.x, hz.y, '#ff8a5b', 30); ring(hz.x, hz.y, hz.radius, '#ffcf3a'); G.shake = 13;
      }
    }
  }
  G.hazards = G.hazards.filter(h => !((h.type==='blackhole'&&h.exploded) || (h.type==='meteor'&&h.done)));
}

// ------------------------------------------------------------------ fx
function spawnText(x,y,txt,color,big=false){ G.texts.push({x,y,txt,color,life:0.7,vy:-34,big}); }
function burst(x,y,color,n){ for(let i=0;i<n;i++){const a=Math.random()*TAU,s=rand(40,200);G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(0.25,0.6),color,r:rand(2,4)});} }
function ring(x,y,radius,color){ G.parts.push({x,y,ring:true,radius:10,maxR:radius,life:0.35,color}); }

// ------------------------------------------------------------------ core update
function update(dt) {
  const p = G.player;
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt*40);

  // movement
  const mv = moveVector();
  p.moving = !!(mv.x || mv.y);
  if (mv.x || mv.y) {
    // rotate toward the input direction at a fixed turn rate instead of snapping
    let d = Math.atan2(mv.y, mv.x) - p.face;
    while (d >  Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const step = TURN_RATE * dt;
    p.face += Math.abs(d) <= step ? d : Math.sign(d) * step;
    if (p.face >  Math.PI) p.face -= TAU; else if (p.face < -Math.PI) p.face += TAU;
  }
  p.x += mv.x * p.moveSpeed * dt;
  p.y += mv.y * p.moveSpeed * dt;

  // regen + invuln + ultimate timers
  if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen*dt);
  if (p.invuln > 0) p.invuln -= dt;
  if (G.slowT > 0) G.slowT -= dt;
  if (G.flash > 0) G.flash -= dt;
  // camera eases out slightly as firing range grows, so you can see your reach
  const zTarget = clamp(1 - (p.rangeMult - 1) * 0.12, 0.80, 1);
  G.zoom += (zTarget - G.zoom) * Math.min(1, dt*4);

  // camera follows
  G.camX += (p.x - W/2 - G.camX) * Math.min(1, dt*12);
  G.camY += (p.y - H/2 - G.camY) * Math.min(1, dt*12);

  // wave progression — advances on a timer; boss waves hold until cleared
  updateWaves(dt);

  spawnWave(dt);
  updateWeapons(dt);
  updateHazards(dt);

  // enemies
  const slowMul = G.slowT > 0 ? 0.4 : 1;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.frozen > 0) e.frozen -= dt;
    // burn DoT (Solar Flare) — ticks every half second
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) { e.burnTick = 0.5; dealDamage(e, e.burnDps*0.5); if (e.dead) continue; }
    }
    const a = Math.atan2(p.y-e.y, p.x-e.x);
    const move = (e.frozen > 0 ? 0 : 1) * slowMul;          // frozen = stopped; chrono = slowed

    if (e.dash) {
      // charger: approach -> wind-up (telegraph) -> high-speed dash
      if (e.dashState === 'dash') {
        e.dashT -= dt;
        e.x += e.dvx*dt*slowMul; e.y += e.dvy*dt*slowMul;
        if (e.dashT <= 0) { e.dashState = 'approach'; e.dashCD = rand(2, 3.5); }
      } else if (e.dashState === 'telegraph') {
        e.dashT -= dt;                                       // winds up in place
        if (e.dashT <= 0 && e.frozen <= 0) { e.dashState = 'dash'; e.dashT = 0.45; const sp = 540; e.dvx = Math.cos(a)*sp; e.dvy = Math.sin(a)*sp; }
      } else {
        e.x += Math.cos(a)*e.spd*dt*move; e.y += Math.sin(a)*e.spd*dt*move;
        e.dashCD -= dt*move;
        if (e.dashCD <= 0 && dist2(e.x,e.y,p.x,p.y) < 380*380) { e.dashState = 'telegraph'; e.dashT = 0.5; }
      }
      e.x += e.knock.x*dt; e.y += e.knock.y*dt;
    } else {
      const sp = e.spd * (e.spdMul || 1);                 // ultimate chargers lunge fast
      e.x += Math.cos(a)*sp*dt*move + e.knock.x*dt;
      e.y += Math.sin(a)*sp*dt*move + e.knock.y*dt;
    }
    e.knock.x *= 0.86; e.knock.y *= 0.86;

    // ultimate boss attack patterns
    if (e.ultra && e.frozen <= 0) updateUltraAttack(e, p, dt, a);

    // healer — periodically restores HP to nearby enemies (prioritize killing it!)
    if (e.heals && e.frozen <= 0) {
      e.healCD -= dt;
      if (e.healCD <= 0) {
        e.healCD = 3; let healed = false;
        for (const o of G.enemies) {
          if (o.dead || o === e || o.hp >= o.maxHp) continue;
          if (dist2(e.x,e.y,o.x,o.y) < 170*170) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp*0.12); healed = true; }
        }
        if (healed) ring(e.x, e.y, 170, '#34e07a');
      }
    }
    // shooter behavior (frozen enemies can't shoot)
    if (e.shoots && e.frozen <= 0) {
      e.shootCD -= dt;
      if (e.shootCD <= 0 && dist2(e.x,e.y,p.x,p.y) < 520*520) {
        e.shootCD = rand(1.8,3);
        G.ebullets.push({ x:e.x, y:e.y, vx:Math.cos(a)*220, vy:Math.sin(a)*220, r:7, dmg:e.dmg*0.6, life:4 });
      }
    }
    // contact damage (dashing/charging enemies hit much harder)
    if (dist2(e.x,e.y,p.x,p.y) < (e.r+p.r)*(e.r+p.r)) {
      const cm = (e.dashState==='dash' ? 2.4 : 1) * ((e.spdMul||1) > 1 ? 1.8 : 1);
      hurtPlayer(e.dmg*dt*1.4 * cm);
    }
  }

  // player bullets
  for (const b of G.bullets) {
    if (b.homing) {
      if (b.twirl > 0) {
        b.twirl -= dt;                               // twirl/circle phase — lingers before hunting
        const sp = Math.hypot(b.vx, b.vy);
        const na = Math.atan2(b.vy, b.vx) + b.spin * dt;
        b.vx = Math.cos(na)*sp; b.vy = Math.sin(na)*sp;
      } else {
        const t = nearestEnemy(b.x, b.y, firingRange(p) * 3);   // finds targets at 3x plasma range
        if (t) {
          const want = Math.atan2(t.y-b.y, t.x-b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let da = want - cur; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU;
          const na = cur + clamp(da, -6*dt, 6*dt);
          const sp = Math.hypot(b.vx,b.vy);
          b.vx = Math.cos(na)*sp; b.vy = Math.sin(na)*sp;
        }
      }
    }
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(b.x,b.y,e.x,e.y) < (b.r+e.r)*(b.r+e.r)) {
        const km = b.knock || 0.15, kx = b.vx*km, ky = b.vy*km;
        dealDamage(e, b.dmg, kx, ky, b.crit);
        // evolved explosive rounds: detonate on first impact, splashing 60% damage
        if (b.blast) {
          ring(b.x, b.y, b.blast, b.color); burst(b.x, b.y, b.color, 6);
          for (const o of G.enemies) {
            if (o.dead || o === e) continue;
            if (dist2(b.x,b.y,o.x,o.y) < b.blast*b.blast) dealDamage(o, b.dmg*0.6);
          }
          b.dead = true; break;
        }
        if (b.pierce > 0) { b.pierce--; } else { b.dead = true; break; }
      }
    }
  }

  // enemy bullets
  for (const b of G.ebullets) {
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (dist2(b.x,b.y,p.x,p.y) < (b.r+p.r)*(b.r+p.r)) { hurtPlayer(b.dmg); b.dead = true; }
  }

  // beams fade
  for (const bm of G.beams) bm.life -= dt;

  // gems (xp) pickup + magnet
  const pr = p.pickupRange, pr2 = pr*pr;
  for (const g of G.gems) {
    g.x += g.vx*dt; g.y += g.vy*dt; g.vx*=0.9; g.vy*=0.9;
    const d2 = dist2(g.x,g.y,p.x,p.y);
    if (d2 < pr2*2.4) {
      const a = Math.atan2(p.y-g.y, p.x-g.x), pull = 320;
      g.x += Math.cos(a)*pull*dt; g.y += Math.sin(a)*pull*dt;
    }
    if (d2 < (p.r+8)*(p.r+8)) { g.dead = true; gainXP(g.xp); }
  }
  // coins pickup
  for (const c of G.coins) {
    c.x += c.vx*dt; c.y += c.vy*dt; c.vx*=0.9; c.vy*=0.9;
    const d2 = dist2(c.x,c.y,p.x,p.y);
    if (d2 < pr2*2.4) {
      const a = Math.atan2(p.y-c.y, p.x-c.x), pull = 340;
      c.x += Math.cos(a)*pull*dt; c.y += Math.sin(a)*pull*dt;
    }
    if (d2 < (p.r+8)*(p.r+8)) { c.dead = true; G.runCoins += c.v * p.coinMult; SFX.coin(); }
  }

  // particles & text
  for (const pt of G.parts) {
    if (pt.ring) { pt.radius += (pt.maxR-pt.radius)*Math.min(1,dt*12); pt.life-=dt; }
    else { pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vx*=0.92; pt.vy*=0.92; pt.life-=dt; }
  }
  for (const t of G.texts) { t.y += t.vy*dt; t.vy*=0.92; t.life-=dt; }

  // cull
  G.enemies = G.enemies.filter(e=>!e.dead);
  G.bullets = G.bullets.filter(b=>!b.dead);
  G.ebullets= G.ebullets.filter(b=>!b.dead);
  G.gems    = G.gems.filter(g=>!g.dead);
  G.coins   = G.coins.filter(c=>!c.dead);
  G.parts   = G.parts.filter(p=>p.life>0);
  G.texts   = G.texts.filter(t=>t.life>0);
  G.beams   = G.beams.filter(b=>b.life>0);

  updateHUD();
}

function hurtPlayer(amount) {
  const p = G.player;
  if (p.invuln > 0) return;
  p.hp -= amount;
  if (amount > 2) { p.invuln = 0.4; G.shake = Math.max(G.shake, 6); SFX.hurt(); }
  if (p.hp <= 0) {
    p.hp = 0;
    // pay-to-win Guardian Angel auto-revive
    if (save.p2w.guardian && !p.guardianUsed) {
      p.guardianUsed = true; doRevive(true);
      toast(ico('shield',16)+' Guardian Angel saved you!', 1600); return;
    }
    gameOver();
  }
}
function gainXP(n) {
  const p = G.player;
  p.xp += n * p.xpMult;
  // Crossing several thresholds at once (boss gem showers, big single gems) queues one
  // card pick PER level; they're presented one at a time so no level-up is ever skipped.
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext; p.level++; p.xpNext = xpForLevel(p.level);
    G.pendingLevels++;
  }
  if (G.pendingLevels > 0 && G.state !== 'levelup') openLevelUp();
}
function updateHUD() {
  const p = G.player;
  $('hpFill').style.width = clamp(p.hp/p.maxHp*100,0,100) + '%';
  $('hpText').textContent = Math.ceil(p.hp) + '/' + Math.ceil(p.maxHp);
  $('xpFill').style.width = clamp(p.xp/p.xpNext*100,0,100) + '%';
  $('xpText').textContent = 'Lv ' + p.level;
  $('timeText').textContent = mmss(G.time);
  $('coinRun').textContent = fmt(G.runCoins);
  $('killText').textContent = G.kills;
  const wc = $('waveChip'); if (wc) wc.textContent = G.wave;
}

// ------------------------------------------------------------------ rendering
function render() {
  ctx.clearRect(0,0,W,H);
  // living starfield behind the menu and any menu-opened overlay (shops/stats/goals)
  if (G.state === 'menu') { Space.draw(ctx, W, H, performance.now()*0.001); return; }

  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = rand(-G.shake,G.shake); sy = rand(-G.shake,G.shake); }
  const ox = -G.camX + sx, oy = -G.camY + sy;
  Space.drawPlay(ctx, W, H, G.camX, G.camY, performance.now()*0.001);   // scrolling space backdrop (screen-space)

  const p = G.player;
  // ---- world layer (zoomed around the player) ----
  ctx.save();
  ctx.translate(W/2, H/2); ctx.scale(G.zoom, G.zoom); ctx.translate(-W/2, -H/2);
  drawGrid(ox, oy);

  // firing-range indicator — where your shots stop
  const rr = firingRange(p);
  ctx.save();
  ctx.strokeStyle = 'rgba(120,200,255,0.12)'; ctx.lineWidth = 1.5/G.zoom; ctx.setLineDash([9, 13]);
  ctx.beginPath(); ctx.arc(p.x+ox, p.y+oy, rr, 0, TAU); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // gems (XP)
  for (const g of G.gems) Sprites.draw(ctx, 'gem', g.x+ox, g.y+oy, 16);
  // coins
  for (const c of G.coins) Sprites.draw(ctx, 'coin', c.x+ox, c.y+oy, 22);

  // hazards (black holes / meteors) — under enemies
  for (const hz of G.hazards) drawHazard(hz, ox, oy);

  // enemy bullets
  for (const b of G.ebullets) {
    ctx.fillStyle = '#ff4d6d'; ctx.shadowColor='#ff4d6d'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(b.x+ox, b.y+oy, b.r, 0, TAU); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // enemies
  for (const e of G.enemies) {
    const ex = e.x+ox, ey = e.y+oy, m = e.r*2;
    if (Math.abs(ex-W/2) > W/2/G.zoom + m || Math.abs(ey-H/2) > H/2/G.zoom + m) continue;   // zoom-aware cull
    let rot = 0;
    if (e.boss) rot = G.time*0.6;
    else if (e.dash) rot = Math.atan2(p.y-e.y, p.x-e.x) + Math.PI/2;   // charger faces the player
    const sz = e.r*2.7;
    Sprites.draw(ctx, e.type, ex, ey, sz, rot);
    if (e.hitFlash > 0) Sprites.drawMask(ctx, e.type, ex, ey, sz, rot, clamp(e.hitFlash/0.08,0,1)*0.85);
    if (e.dash && e.dashState === 'telegraph') {              // wind-up warning flash
      ctx.save(); ctx.globalAlpha = 0.35 + 0.35*Math.abs(Math.sin(G.time*38));
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ex, ey, e.r+7, 0, TAU); ctx.stroke(); ctx.restore();
    }
    if (e.frozen > 0) {                      // icy tint on frozen enemies
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#bff6ff';
      ctx.beginPath(); ctx.arc(ex, ey, e.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    if (e.burnT > 0) {                       // flickering ember tint on burning enemies
      ctx.save(); ctx.globalAlpha = 0.30 + 0.15*Math.abs(Math.sin(G.time*20));
      ctx.fillStyle = '#ff8a5b';
      ctx.beginPath(); ctx.arc(ex, ey, e.r*0.9, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (e.boss) drawBossBar(e, ex, ey);
    else if (e.elite && e.hp < e.maxHp) drawMiniBar(e, ex, ey);
  }

  // player bullets
  for (const b of G.bullets) {
    const bx=b.x+ox, by=b.y+oy;
    if (b.emoji) { Sprites.draw(ctx, 'missile', bx, by, b.r*3.4, Math.atan2(b.vy,b.vx)+Math.PI/2); continue; }
    ctx.fillStyle = b.crit ? '#ffcf3a' : b.color;
    ctx.shadowColor = b.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(bx, by, b.r, 0, TAU); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // laser beams
  for (const bm of G.beams) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, bm.life/0.12);
    ctx.strokeStyle = bm.color; ctx.lineWidth = 6; ctx.shadowColor=bm.color; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.moveTo(bm.x1+ox,bm.y1+oy); ctx.lineTo(bm.x2+ox,bm.y2+oy); ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  // orbit orbs (evolved Halo of Ruin glows gold and bigger)
  const ow = getW(p, 'orbit'), orbGold = ow && ow.evolved;
  for (const o of G.orbs) {
    const oc = orbGold ? '#ffcf3a' : '#8a5bff';
    ctx.fillStyle = oc; ctx.shadowColor = oc; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(o.x+ox, o.y+oy, orbGold ? 14 : 11, 0, TAU); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // player
  const px = p.x+ox, py = p.y+oy;
  // thruster flame (flickers while moving)
  if (p.moving) {
    ctx.save();
    ctx.translate(px, py); ctx.rotate(p.face + Math.PI/2);
    ctx.shadowColor = '#3df0ff'; ctx.shadowBlur = 14;
    const fl = p.r*(0.8 + Math.random()*0.6);
    ctx.fillStyle = 'rgba(61,240,255,'+(0.45+Math.random()*0.3).toFixed(2)+')';
    ctx.beginPath();
    ctx.moveTo(-p.r*0.34, p.r*0.66); ctx.lineTo(0, p.r*0.66+fl); ctx.lineTo(p.r*0.34, p.r*0.66);
    ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.shadowBlur = 0;
  }
  // shield ring
  ctx.save();
  ctx.strokeStyle = p.invuln>0 ? 'rgba(255,255,255,.85)' : 'rgba(61,240,255,.45)';
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, p.r+8, 0, TAU); ctx.stroke();
  ctx.restore();
  Sprites.draw(ctx, p.sprite || 'player', px, py, p.r*3.0, p.face + Math.PI/2);

  // particles
  for (const pt of G.parts) {
    ctx.globalAlpha = clamp(pt.life*2,0,1);
    if (pt.ring) {
      ctx.strokeStyle = pt.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x+ox, pt.y+oy, pt.radius, 0, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x+ox, pt.y+oy, pt.r, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // floating text
  for (const t of G.texts) {
    ctx.globalAlpha = clamp(t.life*1.6,0,1);
    ctx.fillStyle = t.color; ctx.textAlign='center';
    ctx.font = `900 ${t.big?22:15}px Segoe UI, Arial`;
    ctx.fillText(t.txt, t.x+ox, t.y+oy);
  }
  ctx.globalAlpha = 1;

  ctx.restore();   // ---- end world layer (back to screen space) ----

  // ultimate screen-space overlays (chrono slow tint + nuke flash)
  if (G.slowT > 0) { ctx.save(); ctx.fillStyle = 'rgba(138,91,255,0.10)'; ctx.fillRect(0,0,W,H); ctx.restore(); }
  if (G.flash > 0) { ctx.save(); ctx.globalAlpha = clamp(G.flash*2.6,0,1); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H); ctx.restore(); ctx.globalAlpha = 1; }

  // joystick
  if (input.active) {
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(input.sx, input.sy, 52, 0, TAU); ctx.stroke();
    let dx=input.cx-input.sx, dy=input.cy-input.sy; const m=Math.hypot(dx,dy);
    if (m>52){dx=dx/m*52;dy=dy/m*52;}
    ctx.fillStyle='rgba(61,240,255,.55)';
    ctx.beginPath(); ctx.arc(input.sx+dx, input.sy+dy, 24, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function drawHazard(hz, ox, oy) {
  const hx = hz.x+ox, hy = hz.y+oy;
  if (hz.type === 'blackhole') {
    const pulse = 0.85 + 0.15*Math.sin(hz.t*12);
    const g = ctx.createRadialGradient(hx, hy, 3, hx, hy, hz.radius*pulse);
    g.addColorStop(0, 'rgba(10,0,25,.95)'); g.addColorStop(0.45, 'rgba(138,91,255,.40)'); g.addColorStop(1, 'rgba(138,91,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, hz.radius*pulse, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(hz.t*4);
    ctx.strokeStyle = 'rgba(200,170,255,.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 12 + 4*Math.sin(hz.t*16), 0, TAU*0.7); ctx.stroke();
    ctx.restore();
  } else if (hz.type === 'meteor') {
    const k = clamp(hz.t/0.85, 0, 1);
    ctx.strokeStyle = 'rgba(255,138,91,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, hz.radius, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,207,58,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, hz.radius*(1-k), 0, TAU); ctx.stroke();
    const sx2 = hx + (1-k)*260, sy2 = hy - (1-k)*460;     // incoming streak
    ctx.strokeStyle = 'rgba(255,190,120,.95)'; ctx.lineWidth = 5; ctx.shadowColor = '#ff8a5b'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.lineTo(sx2-44, sy2+86); ctx.stroke(); ctx.shadowBlur = 0;
  }
}
function drawBossBar(e, ex, ey) {
  const w = 72, h = 6, x = ex-w/2, y = ey - e.r - 14;
  ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#ff4d6d'; ctx.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),h);
}
function drawMiniBar(e, ex, ey) {
  const w = 42, h = 4, x = ex-w/2, y = ey - e.r - 11;
  ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#ff8a5b'; ctx.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),h);
}
// world radius your shots reach (blaster is the reference gun)
function firingRange(p) { return WEAPONS.blaster.speed * 0.5 * p.rangeMult; }   // short to start; range upgrades visibly widen it
function drawGrid(ox, oy) {
  const s = 60, Z = G.zoom;
  const padX = (W/2)*(1/Z - 1) + s, padY = (H/2)*(1/Z - 1) + s;   // extra area revealed by zoom-out
  const x0 = -padX, x1 = W+padX, y0 = -padY, y1 = H+padY;
  ctx.strokeStyle = 'rgba(120,150,255,.05)'; ctx.lineWidth = 1;
  const startX = ox + Math.ceil((x0-ox)/s)*s, startY = oy + Math.ceil((y0-oy)/s)*s;
  ctx.beginPath();
  for (let x = startX; x <= x1; x += s) { ctx.moveTo(x,y0); ctx.lineTo(x,y1); }
  for (let y = startY; y <= y1; y += s) { ctx.moveTo(x0,y); ctx.lineTo(x1,y); }
  ctx.stroke();
}
// ------------------------------------------------------------------ main loop
// Game-speed steps: the baseline plays as "×1"; each owned tier unlocks a faster step the player
// can switch to live (×2, ×3, …). gameSpeedSet is the chosen step (defaults to the fastest owned).
function curSpeedTier() {
  const owned = save.p2w.gameSpeed || 0;
  return clamp(save.gameSpeedSet == null ? owned : save.gameSpeedSet, 0, owned);
}
function gameSpeedMult() { return (1 + curSpeedTier()) / 3; }
function updateSpeedBtn() {
  const btn = $('speedBtn'); if (!btn) return;
  if ((save.p2w.gameSpeed || 0) <= 0) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden'); btn.textContent = '×' + (curSpeedTier() + 1);
}
function cycleGameSpeed() {
  const owned = save.p2w.gameSpeed || 0; if (owned <= 0) return;
  save.gameSpeedSet = (curSpeedTier() + 1) % (owned + 1); persist(); updateSpeedBtn();
}
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  dt = Math.min(dt, 0.05);
  if (G.state === 'play') update(dt * gameSpeedMult());
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ================================================================== UI / FLOW
function show(id){ $(id).classList.remove('hidden'); }
function hide(id){ $(id).classList.add('hidden'); }
let toastT = null;
function toast(msg, ms=1200) {
  const el = $('toast'); el.innerHTML = msg; el.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(()=>el.classList.add('hidden'), ms);
}
function refreshWallet() {
  for (const id of ['coinBal','coinBal2','coinBal3']) { const el=$(id); if(el) el.textContent = fmt(save.coins); }
  for (const id of ['gemBal','gemBal2','gemBal3','gemBal4']) { const el=$(id); if(el) el.textContent = fmt(save.gems); }
}

function startRun() {
  const startWave = save.skipOn === false ? 1 : clamp(save.startWave||1, 1, save.skipMax||1);
  Object.assign(G, {
    state:'play', enemies:[], bullets:[], ebullets:[], gems:[], coins:[], parts:[], texts:[], orbs:[], beams:[], hazards:[],
    time:0, kills:0, runCoins:0, spawnT:0, bossesKilled:0, bossesAlive:0, bossEvent:0, ultraIndex:0, revives:0, finalized:false, pendingLevels:0,
    wave:startWave, waveT:0, bossWave:false, bestWave:startWave,
    slowT:0, flash:0, zoom:1, adRevived:false, adDoubled:false,
  });
  G.player = newPlayer();
  if (startWave > 1) applyWaveSkip(startWave);     // auto-leveled head start for skipped runs
  G.camX = G.player.x - W/2; G.camY = G.player.y - H/2;
  hide('menu'); hide('gameover'); show('hud'); updateSpeedBtn();
  // skip targets (5, 10, 15…) are boss waves — start the boss event instead of silently passing it
  if (isBossWave(startWave)) { G.bossWave = true; spawnBossEvent(); announceWave(startWave, true); }
  else announceWave(startWave, false);
  if (actx && actx.state==='suspended') actx.resume();
}
// Defeat screen (death OR surrender). Does NOT bank yet — revive can continue the run.
function gameOver() {
  if (G.state === 'gameover') return;
  G.state = 'gameover';
  hide('hud'); hide('pause');
  const earned = Math.round(G.runCoins);
  $('goTime').textContent  = mmss(G.time);
  $('goKills').textContent = G.kills;
  const gw = $('goWave'); if (gw) gw.textContent = G.bestWave;
  $('goCoins').innerHTML = ico('coin',18)+' '+fmt(earned);
  const cost = reviveCost();
  $('reviveCost').textContent = cost;
  $('reviveBtn').disabled = false;
  $('reviveBtn').style.opacity = save.gems >= cost ? 1 : .5;
  // one free ad-revive and one ad coin-doubler per run
  $('adReviveBtn').style.display = G.adRevived ? 'none' : 'flex';
  $('adDoubleBtn').style.display = G.adDoubled ? 'none' : 'flex';
  show('gameover');
  SFX.hurt();
}
// Run truly ends here — bank coins + commit objective progress exactly ONCE.
function finalizeRun() {
  if (G.finalized) return;
  G.finalized = true;
  const earned = Math.round(G.runCoins);
  save.coins += earned;
  if (G.time > save.best.time) save.best.time = G.time;
  if (G.kills > save.best.kills) save.best.kills = G.kills;
  commitRun(earned);
  persist(); refreshWallet(); updateBadges();
  const ready = claimableCount();
  if (ready > 0) toast(ico('quests',16)+' '+ready+' reward'+(ready>1?'s':'')+' ready to claim!', 2000);
}
function reviveCost(){ return 5 + G.revives*5; }
function doRevive(free=false) {
  if (!free) {
    const cost = reviveCost();
    if (save.gems < cost) { toast('Not enough '+ico('gem',13)); return; }
    save.gems -= cost; G.revives++; persist(); refreshWallet();
  }
  const p = G.player; p.hp = p.maxHp; p.invuln = 2.5;
  // clear nearby threats
  for (const e of G.enemies) {
    if (dist2(e.x,e.y,p.x,p.y) < 320*320 && !e.boss) { e.dead = true; burst(e.x,e.y,e.color,6); }
  }
  ring(p.x, p.y, 320, '#3df0ff'); G.shake = 10;
  hide('gameover'); show('hud'); G.state = 'play'; SFX.level();
}

// ---- level up
function openLevelUp() {
  G.state = 'levelup';
  G.pendingCards = rollCards();
  renderCards();
  show('levelup'); hide('hud'); SFX.level();
  $('rerollBtn').style.display = save.gems >= 1 ? 'flex' : 'none';
}
function rollCards() {
  const p = G.player, pool = [];
  // weapon level-ups
  for (const w of p.weapons) {
    const def = WEAPONS[w.key];
    if (w.level < def.max) pool.push({ kind:'wlvl', key:w.key, weight:3 });
    // EVOLUTION — maxed weapon + at least one stack of its catalyst stat
    if (def.evolve && !w.evolved && w.level >= def.max && (p.statLvl[def.evolve.stat]||0) >= 1)
      pool.push({ kind:'evolve', key:w.key, weight:8 });
  }
  // new weapons (ultimates only appear once unlocked via quests)
  if (p.weapons.length < 6) {
    for (const k of WEAPON_KEYS) {
      if (getW(p,k)) continue;
      const def = WEAPONS[k];
      if (def.unique && !save.unlockedWeapons.includes(k)) continue;
      pool.push({ kind:'wnew', key:k, weight: def.unique ? 4 : 2 });   // bias unlocked ultimates
    }
  }
  // stats — only offered until they hit their natural cap (max stacks)
  for (const s of STAT_UPS) if ((p.statLvl[s.key]||0) < s.max) pool.push({ kind:'stat', key:s.key, weight:2 });
  // OVERCHARGE — unlocked once the Plasma Blaster is fully upgraded; multiplies projectiles 1 → 2.5
  const blaster = getW(p, 'blaster');
  if (blaster && blaster.level >= WEAPONS.blaster.max && p.projMult < 2.5)
    pool.push({ kind:'overcharge', weight:4 });

  const chosen = [];
  const bag = pool.slice();
  while (chosen.length < 3 && bag.length) {
    let total = bag.reduce((a,c)=>a+c.weight,0), r = Math.random()*total, idx=0;
    for (let i=0;i<bag.length;i++){ r-=bag[i].weight; if(r<=0){idx=i;break;} }
    chosen.push(bag.splice(idx,1)[0]);
  }
  // once everything is maxed, fall back to consumable cards so there are always 3 choices
  const fillers = [{kind:'heal'},{kind:'coins'}];
  let fi = 0;
  while (chosen.length < 3) chosen.push(fillers[fi++ % fillers.length]);
  return chosen;
}
function renderCards() {
  const wrap = $('cards'); wrap.innerHTML = '';
  for (const c of G.pendingCards) {
    let icon, title, desc, tag, rar='';
    if (c.kind === 'wnew') { const d=WEAPONS[c.key]; icon=d.icon; title=d.name; desc=d.desc; tag=d.unique?'★ ULTIMATE':'NEW WEAPON'; rar=d.unique?'legend':'new'; }
    else if (c.kind === 'evolve') { const d=WEAPONS[c.key]; icon=d.icon; title=d.evolve.name; desc=d.evolve.desc; tag='⤴ EVOLVE'; rar='evolve'; }
    else if (c.kind === 'wlvl') { const d=WEAPONS[c.key], w=getW(G.player,c.key); icon=d.icon; title=d.name; desc=d.desc; tag=(d.unique?'★ ':'')+'LV '+w.level+' → '+(w.level+1); if(w.level+1===d.max){tag='MAX LEVEL';} if(d.unique){rar='legend';} else if(w.level+1===d.max){rar='legend';} }
    else if (c.kind === 'overcharge') { const nv=Math.min(2.5,G.player.projMult+0.3); icon='power'; title='Overcharge'; desc=`All gun projectiles ×${nv.toFixed(2)} (now ×${G.player.projMult.toFixed(2)})`; tag='⚡ OVERCHARGE'; rar='legend'; }
    else if (c.kind === 'heal')  { icon='heartplus'; title='Repair Kit'; desc='Instantly restore 35% HP'; tag='RECOVER'; }
    else if (c.kind === 'coins') { icon='coin'; title='Windfall'; desc='Bonus coins for this run'; tag='BONUS'; }
    else { const s=STAT_UPS.find(x=>x.key===c.key); const lv=(G.player.statLvl[c.key]||0); icon=s.icon; title=s.title; desc=s.desc; tag='UPGRADE '+(lv+1)+'/'+s.max; if(lv+1>=s.max) rar='legend'; }
    const el = document.createElement('div');
    el.className = 'card'; if (rar) el.dataset.rar = rar;
    el.innerHTML = `<div class="ic">${ico(icon,38)}</div><span class="lvl">${tag}</span><h3>${title}</h3><p>${desc}</p>`;
    el.onclick = () => applyCard(c);
    wrap.appendChild(el);
  }
}
// pure mutation — no UI/SFX, so it can also drive the silent auto-build on wave-skip
function applyCardEffect(c) {
  const p = G.player;
  if (c.kind === 'wnew') p.weapons.push({ key:c.key, level:1 });
  else if (c.kind === 'evolve') {
    getW(p, c.key).evolved = true;
    if (!save.mastery.evolved.includes(c.key)) save.mastery.evolved.push(c.key);
  }
  else if (c.kind === 'wlvl') getW(p, c.key).level++;
  else if (c.kind === 'overcharge') p.projMult = Math.min(2.5, p.projMult + 0.3);
  else if (c.kind === 'heal')  p.hp = Math.min(p.maxHp, p.hp + p.maxHp*0.35);
  else if (c.kind === 'coins') G.runCoins += Math.round(8 * p.coinMult * (1 + G.bossesKilled*0.5));
  else { p.statLvl[c.key] = (p.statLvl[c.key]||0) + 1; STAT_UPS.find(x=>x.key===c.key).apply(p); }
}
function applyCard(c) {
  const p = G.player;
  applyCardEffect(c);
  if (c.kind === 'evolve') {
    const d = WEAPONS[c.key];
    persist(); updateBadges();            // mastery progress recorded in applyCardEffect
    ring(p.x, p.y, 220, d.color); G.shake = Math.max(G.shake, 8); SFX.legend();
    toast(ico(d.icon,16)+' '+d.name+' evolved into <b>'+d.evolve.name+'</b>!', 2400);
  } else if (c.kind === 'wlvl') {
    const w = getW(p, c.key), d = WEAPONS[c.key];
    // teach the pairing the moment the weapon maxes without its catalyst
    if (d.evolve && w.level >= d.max && !(p.statLvl[d.evolve.stat] >= 1))
      toast(ico(d.icon,15)+' '+d.name+' can EVOLVE — pick up <b>'+d.evolve.statName+'</b>!', 2600);
  }
  SFX.buy();
  // resolve queued level-ups one at a time; only return to play once the queue is empty
  G.pendingLevels = Math.max(0, G.pendingLevels - 1);
  if (G.pendingLevels > 0) openLevelUp();
  else { hide('levelup'); show('hud'); G.state = 'play'; }
}
// Wave-skip head start: drop in at a level scaled to the wave with an auto-built
// loadout, so a skipped run is actually playable (skipping is a fast-forward, not a
// handicap). Permanent power still carries from meta/relics/ship as usual.
function applyWaveSkip(w) {
  const p = G.player;
  const target = clamp(1 + Math.round((w-1)*0.45), 1, 80);   // ~half the head-start you'd earn organically
  let guard = 0;
  while (p.level < target && guard++ < 300) {
    const cards = rollCards();
    // bias toward a strong build: new weapons first, then weapon levels, then anything
    const chosen = cards.find(c=>c.kind==='wnew') || cards.find(c=>c.kind==='wlvl')
                || cards.find(c=>c.kind==='evolve') || cards.find(c=>c.kind==='overcharge')
                || cards.find(c=>c.kind==='stat') || cards[0];
    applyCardEffect(chosen);
    p.level++;
  }
  p.xp = 0; p.xpNext = xpForLevel(p.level);
  p.hp = p.maxHp;
}

// ---- pause
function pauseGame(){ if (G.state!=='play') return; G.state='pause'; hide('hud'); show('pause'); }
function resumeGame(){ if (G.state!=='pause') return; G.state='play'; hide('pause'); show('hud'); last=performance.now(); }

// ================================================================== SHOPS
// Meta upgrades are LIMITLESS: a smaller per-level effect, gated by an
// exponential coin cost (base * step^level). No cap — the price is the cap.
const META_DEFS = [
  { key:'might',    icon:'sword',       name:'Might',     desc:'+6% base damage / lvl',    base:30, step:1.22 },
  { key:'vitality', icon:'heart',       name:'Vitality',  desc:'+10 max HP / lvl',         base:25, step:1.20 },
  { key:'swift',    icon:'boot',        name:'Swiftness', desc:'+7 move speed / lvl',      base:25, step:1.20 },
  { key:'haste',    icon:'fastforward', name:'Haste',     desc:'+4% base fire rate / lvl', base:35, step:1.24 },
  { key:'magnet',   icon:'magnet',      name:'Magnetism', desc:'+8 pickup range / lvl',    base:20, step:1.18 },
  { key:'greed',    icon:'coins',       name:'Greed',     desc:'+6% coin gain / lvl',      base:45, step:1.26 },
];
function metaCost(d){ return Math.floor(d.base * Math.pow(d.step, save.meta[d.key])); }
let metaBuyQty = 1;                                    // 1 / 10 / 100 / 'max' bulk-buy amount
function metaCostN(d, n) {                              // total coins to buy the next n levels
  let lvl = save.meta[d.key], total = 0;
  for (let i = 0; i < n; i++) total += Math.floor(d.base * Math.pow(d.step, lvl + i));
  return total;
}
function affordableMeta(d) {                            // how many levels you can buy with current coins
  let coins = save.coins, lvl = save.meta[d.key], n = 0;
  for (; n < 100000; n++) { const c = Math.floor(d.base * Math.pow(d.step, lvl + n)); if (coins < c) break; coins -= c; }
  return n;
}
function buyMetaLevels(d, n) {                          // buy up to n levels, as many as affordable
  let bought = 0;
  for (let i = 0; i < n; i++) { const c = metaCost(d); if (save.coins < c) break; save.coins -= c; save.meta[d.key]++; bought++; }
  if (!bought) { toast('Not enough '+ico('coin',13)); return; }
  persist(); refreshWallet(); renderMeta(); SFX.buy();
  if (bought > 1) toast(d.name+' +'+bought+' lvls');
}
function renderMeta() {
  const list = $('metaList'); list.innerHTML = '';
  const qsel = $('metaQty');
  if (qsel) {
    qsel.innerHTML = [1,10,100,'max'].map(o =>
      `<button class="qty-btn${metaBuyQty===o?' active':''}" data-q="${o}">${o==='max'?'MAX':'×'+o}</button>`).join('');
    qsel.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
      const q = b.dataset.q; metaBuyQty = (q === 'max') ? 'max' : +q; renderMeta();
    });
  }
  const isMax = metaBuyQty === 'max';
  for (const d of META_DEFS) {
    const lvl = save.meta[d.key];
    const n = isMax ? affordableMeta(d) : metaBuyQty;
    const costN = (isMax && n === 0) ? metaCost(d) : metaCostN(d, n);
    const can = save.coins >= metaCost(d);
    const el = document.createElement('div'); el.className='shop-item';
    el.innerHTML = `<div class="ic">${ico(d.icon,26)}</div>
      <div class="info"><h4>${d.name} <span class="lvltag">Lv ${lvl}</span></h4><p>${d.desc}</p></div>
      <button ${can?'':'disabled'}>${ico('coin',14)} ${fmt(costN)}${n>1?` <span class="cost">×${n}</span>`:''}</button>`;
    el.querySelector('button').onclick = () => buyMetaLevels(d, isMax ? affordableMeta(d) : metaBuyQty);
    list.appendChild(el);
  }
}

// ---- wave-skip upgrade — buy the right to start runs at a later wave.
// Each tier is GATED behind having actually reached that wave (save.maxWave).
const SKIP_STEP = 5;                                   // start-wave tiers: 5, 10, 15, …
function skipTierCost(w) { return Math.floor(150 * Math.pow(1.7, w/SKIP_STEP - 1)); }
function allowedStartWaves() {                          // [1, 5, 10, … up to what's unlocked]
  const arr = [1];
  for (let w = SKIP_STEP; w <= (save.skipMax||1); w += SKIP_STEP) arr.push(w);
  return arr;
}
function renderSkip() {
  const list = $('skipList'); if (!list) return;
  const cur = save.skipMax || 1, next = cur + SKIP_STEP;
  const reached = (save.maxWave||1) >= next, cost = skipTierCost(next), can = reached && save.coins >= cost;
  const btn = !reached
    ? `<button disabled>${ico('lock',13)} Reach W${next}</button>`
    : `<button data-skip="${next}" ${can?'':'disabled'}>${ico('coin',14)} ${fmt(cost)}</button>`;
  list.innerHTML = `<div class="shop-item"><div class="ic">${ico('fastforward',26)}</div>
    <div class="info"><h4>Wave Skip <span class="lvltag">Start: Wave ${cur}</span></h4>
    <p>Unlock the next start wave (&rarr; Wave ${next}), then choose it on the menu. Skipped runs start level-scaled but grant only <b>half the XP</b> of running from Wave 1 — and you can switch skipping off anytime.</p></div>${btn}</div>`;
  list.querySelectorAll('[data-skip]').forEach(b => b.onclick = () => buySkip(+b.dataset.skip));
}
function buySkip(w) {
  const cost = skipTierCost(w);
  if ((save.maxWave||1) < w) { toast('Reach wave '+w+' first'); return; }
  if (save.coins < cost)     { toast('Not enough '+ico('coin',13)); return; }
  save.coins -= cost; save.skipMax = Math.max(save.skipMax||1, w); save.startWave = w; save.skipOn = true;
  persist(); refreshWallet(); renderSkip(); renderWaveSelect(); SFX.buy();
  toast(ico('fastforward',15)+' Wave '+w+' unlocked — set as your start wave', 1900);
}
// menu control to choose which unlocked wave to start the next run at
function renderWaveSelect() {
  const wrap = $('waveSelect'); if (!wrap) return;
  const waves = allowedStartWaves();
  if (waves.length <= 1) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  if (!waves.includes(save.startWave)) save.startWave = waves.reduce((a,b)=> b<=(save.startWave||1)?b:a, 1);
  const on = save.skipOn !== false;
  const tgl = $('skipToggle'); if (tgl) tgl.checked = on;
  wrap.classList.toggle('skip-off', !on);
  $('startWaveVal').textContent = on ? save.startWave : 1;
}
function cycleStartWave(dir) {
  const waves = allowedStartWaves();
  let i = waves.indexOf(save.startWave); if (i < 0) i = 0;
  i = clamp(i + dir, 0, waves.length-1);
  save.startWave = waves[i]; persist(); renderWaveSelect();
}

const P2W_DEFS = [
  { key:'gameSpeed',   icon:'fastforward', name:'Game Speed',         desc:'Unlock faster game speeds. Tap the in-game speed button to switch between any speed you own (×1 up to ×5) at any time. Each tier costs far more than the last.', cost:60, step:3, max:4 },
  { key:'coinDoubler', icon:'coin', name:'×2 Coins — Forever', desc:'Permanently DOUBLE all coins earned. The classic.', cost:100,  once:true },
  { key:'megaDmg',     icon:'skull', name:'Mega Damage +50%',   desc:'Stacks. Each tier adds +50% base damage to every run.', cost:80, max:5 },
  { key:'guardian',    icon:'shield', name:'Guardian Angel',     desc:'Auto-revive once per run, free. Never lose to one mistake.', cost:120, once:true },
  { key:'arsenal',     icon:'medal', name:'Starting Arsenal',   desc:'Begin every run at Level 5 with a bonus weapon equipped.', cost:160, once:true },
  { key:'vip',         icon:'crown', name:'VIP Pass',           desc:'+20% to ALL stats forever, +20% coins, +20% XP. Whale tier.', cost:240, once:true },
];
function renderP2W() {
  const list = $('p2wList'); list.innerHTML = '';
  for (const d of P2W_DEFS) {
    const owned = save.p2w[d.key];
    const maxed = d.once ? owned>=1 : owned >= d.max;
    const cost = Math.floor(d.cost * Math.pow(d.step||1, d.once ? 0 : owned));   // tiered defs can scale exponentially
    const tag = d.once ? (owned?'OWNED':'') : `Tier ${owned}/${d.max}`;
    const can = !maxed && save.gems >= cost;
    const el = document.createElement('div'); el.className='shop-item';
    el.innerHTML = `<div class="ic">${ico(d.icon,26)}</div>
      <div class="info"><h4>${d.name} ${tag?`<span class="lvltag">${tag}</span>`:''}</h4><p>${d.desc}</p></div>
      <button class="gemcost" ${maxed||!can?'disabled':''}>${maxed?(d.once?'OWNED':'MAX'):ico('gem',14)+' '+cost}</button>`;
    if (!maxed) el.querySelector('button').onclick = () => {
      if (save.gems < cost) { toast('Not enough '+ico('gem',13)+' — grab some below!'); return; }
      save.gems -= cost; save.p2w[d.key]++;
      if (d.key === 'gameSpeed') { save.gameSpeedSet = save.p2w.gameSpeed; updateSpeedBtn(); }   // auto-select the new top speed
      persist(); refreshWallet(); renderP2W(); SFX.buy();
      toast(d.name+' unlocked!');
    };
    list.appendChild(el);
  }
}
// simulated IAP
const IAP_DEFS = [
  { gems:50,   price:'$0.99',  icon:'gem',      name:'Pouch of Gems' },
  { gems:300,  price:'$4.99',  icon:'gemstack', name:'Stack of Gems', bonus:'+20% bonus' },
  { gems:800,  price:'$9.99',  icon:'vault',    name:'Vault of Gems', bonus:'+33% bonus' },
  { gems:2000, price:'$19.99', icon:'whale',    name:'Whale Hoard',   bonus:'+60% bonus' },
];
function renderIAP() {
  const list = $('iapList'); list.innerHTML = '';
  // rewarded-ad freebie first — builds the daily shop-check habit
  {
    const left = adGemsLeft();
    const el = document.createElement('div'); el.className = 'shop-item';
    el.innerHTML = `<div class="ic">${ico('ad',26)}</div>
      <div class="info"><h4>Free Gems <span class="lvltag">${left}/${FREE_GEMS_PER_DAY} today</span></h4><p>Watch a short ad for ${FREE_GEM_AMT} gems</p></div>
      <button ${left <= 0 ? 'disabled' : ''}>${left <= 0 ? 'Tomorrow' : 'FREE'}</button>`;
    if (left > 0) el.querySelector('button').onclick = () => playRewardedAd(() => {
      save.adGems.n++; save.gems += FREE_GEM_AMT;
      persist(); refreshWallet(); renderIAP(); renderP2W(); SFX.coin();
      toast('+'+FREE_GEM_AMT+' '+ico('gem',14)+' &nbsp;<span style="opacity:.6">(simulated ad)</span>');
    });
    list.appendChild(el);
  }
  for (const d of IAP_DEFS) {
    const el = document.createElement('div'); el.className='shop-item';
    el.innerHTML = `<div class="ic">${ico(d.icon,26)}</div>
      <div class="info"><h4>${d.name} <span class="lvltag">${d.bonus||''}</span></h4><p>${fmt(d.gems)} gems</p></div>
      <button class="gemcost">${d.price}</button>`;
    el.querySelector('button').onclick = () => {
      // === REAL BILLING HOOK: replace this block with Google Play purchase ===
      save.gems += d.gems; persist(); refreshWallet(); renderP2W(); SFX.legend();
      toast('+'+fmt(d.gems)+' '+ico('gem',14)+' added &nbsp;<span style="opacity:.6">(simulated)</span>');
    };
    list.appendChild(el);
  }
}

// ---- rewarded ads (simulated)
// Top survivors-likes earn ~1/3 of revenue from rewarded video. These three
// placements (free revive, double coins, daily free gems) are the standard set.
let adCb = null;
function playRewardedAd(onDone) {
  // === REAL AD HOOK: replace this overlay with an AdMob rewarded ad (see README) ===
  show('adOverlay'); adCb = onDone;
  const fill = $('adFill');
  fill.style.transition = 'none'; fill.style.width = '0%';
  requestAnimationFrame(() => { fill.style.transition = 'width 2.2s linear'; fill.style.width = '100%'; });
  setTimeout(() => { hide('adOverlay'); const cb = adCb; adCb = null; if (cb) cb(); }, 2300);
}
const FREE_GEMS_PER_DAY = 3, FREE_GEM_AMT = 5;
function adGemsLeft() {
  const today = todayStr();
  if (save.adGems.date !== today) { save.adGems.date = today; save.adGems.n = 0; }
  return FREE_GEMS_PER_DAY - save.adGems.n;
}

// ---- hangar (pilot ships)
const SHIP_MOD_LABELS = { dmg:'DMG', hp:'HULL', fire:'FIRE RATE', speed:'SPEED', crit:'CRIT', xp:'XP', regen:'REGEN' };
function shipModChips(mods) {
  const chips = [];
  for (const k in mods) {
    const v = mods[k];
    if (k === 'regen') { chips.push(`<span class="ship-tag pos">+${v} HP/s</span>`); continue; }
    const pct = Math.round(v * 100);
    chips.push(`<span class="ship-tag ${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${pct}% ${SHIP_MOD_LABELS[k] || k.toUpperCase()}</span>`);
  }
  if (!chips.length) chips.push('<span class="ship-tag neutral">No trade-offs</span>');
  return `<div class="ship-tags">${chips.join('')}</div>`;
}
function renderHangar() {
  refreshWallet();
  const list = $('shipList'); list.innerHTML = '';
  for (const key in SHIPS) {
    const d = SHIPS[key], owned = save.ships.includes(key), sel = save.ship === key;
    const el = document.createElement('div'); el.className = 'shop-item' + (sel ? ' selected-ship' : '');
    const btn = sel ? '<button disabled>EQUIPPED</button>'
      : owned ? '<button>EQUIP</button>'
      : `<button class="${d.cur==='gems'?'gemcost':''}">${ico(d.cur==='gems'?'gem':'coin',14)} ${fmt(d.cost)}</button>`;
    el.innerHTML = `<canvas class="ship-cv" width="128" height="128" data-ship="${key}"></canvas>
      <div class="info">
        <h4>${d.name} <span class="ship-role">${d.role}</span></h4>
        <p class="ship-wpn">${ico('rocket',12)} ${WEAPONS[d.weapon].name}</p>
        <p>${d.desc}</p>
        ${shipModChips(d.mods)}
      </div>${btn}`;
    const b = el.querySelector('button');
    if (!sel) b.onclick = () => {
      if (!owned) {
        const wallet = d.cur === 'gems' ? 'gems' : 'coins';
        if (save[wallet] < d.cost) { toast('Not enough '+ico(wallet==='gems'?'gem':'coin',13)); return; }
        save[wallet] -= d.cost; save.ships.push(key); SFX.legend();
        toast(d.name+' unlocked!', 1600);
      } else SFX.buy();
      save.ship = key; persist(); refreshWallet(); renderHangar(); updateShipTag();
    };
    list.appendChild(el);
  }
  list.querySelectorAll('canvas[data-ship]').forEach(cv => {
    const c2 = cv.getContext('2d');
    Sprites.draw(c2, SHIPS[cv.dataset.ship].sprite, cv.width/2, cv.height/2, cv.width*0.94, 0);
  });
}
function updateShipTag() {
  const el = $('shipTag'); if (el) el.textContent = (SHIPS[save.ship] || SHIPS.vanguard).name;
}

// ---- daily login streak (7-day cycle)
const LOGIN_REWARDS = [
  { coins:50 }, { gems:5 }, { coins:120 }, { gems:8 }, { coins:250 }, { gems:12 }, { gems:30 },
];
// today's claimable day index, or null if already claimed. Missing a day resets the streak.
function loginDayIndex() {
  const today = todayStr();
  if (save.login.last === today) return null;
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (save.login.last && save.login.last !== y.toISOString().slice(0,10)) save.login.streak = 0;
  return save.login.streak % 7;
}
function renderDaily() {
  const idx = loginDayIndex(); if (idx === null) return;
  $('dailySub').textContent = save.login.streak > 0
    ? 'Streak: '+save.login.streak+' day'+(save.login.streak>1?'s':'')+' — keep it alive!'
    : 'Log in every day for bigger rewards';
  $('dailyGrid').innerHTML = LOGIN_REWARDS.map((r, i) => {
    const cls = i < idx ? 'past' : i === idx ? 'today' : '';
    return `<div class="day-tile ${cls}"><span class="d">Day ${i+1}</span>${ico(r.gems?'gem':'coin',22)}<b>${r.gems||r.coins}</b></div>`;
  }).join('');
}
function claimDaily() {
  const idx = loginDayIndex(); if (idx === null) { hide('daily'); return; }
  const r = LOGIN_REWARDS[idx];
  if (r.coins) save.coins += r.coins;
  if (r.gems) save.gems += r.gems;
  save.login.last = todayStr(); save.login.streak++;
  persist(); refreshWallet(); SFX.legend();
  toast('Day '+(idx+1)+' reward claimed &nbsp;+'+(r.gems ? r.gems+' '+ico('gem',14) : r.coins+' '+ico('coin',14)), 1800);
  hide('daily');
}

// ---- loadout / stats overview
const RELIC_META = {
  dmg:['shard','Damage'], hp:['shield','Health'], speed:['swirl','Move Speed'],
  firerate:['gear','Fire Rate'], magnet:['magnet','Magnet'], xp:['book','XP Gain'], crit:['target','Crit'],
};
function powerRating(s) {
  // a single feel-good number combining offense, survivability and crit
  return Math.round(s.damageMult * s.fireRateMult * (s.maxHp/100) * (1 + s.crit*(s.critMult-1)) * 100);
}
// mode: 'base' (permanent build from menu) or 'live' (current run, from pause)
function renderStats(mode='base') {
  const live = mode === 'live' && G.player;
  const pl = G.player;
  const s = live
    ? { damageMult:pl.damageMult, fireRateMult:pl.fireRateMult, maxHp:pl.maxHp, moveSpeed:pl.moveSpeed,
        crit:pl.crit, critMult:pl.critMult, pickupRange:pl.pickupRange, coinMult:pl.coinMult, xpMult:pl.xpMult }
    : baseStats();
  const lvlLabel = live ? 'Level' : 'Start Level';
  const lvlVal   = live ? pl.level : baseStats().startLevel;
  $('statsTitle').innerHTML = ico('stats',22) + ' ' + (live ? 'Run Loadout' : 'Loadout');
  $('powerVal').textContent = fmt(powerRating(s));

  const rows = [
    ['sword','Damage',       '×'+s.damageMult.toFixed(2)],
    ['fire','Fire Rate',     '×'+s.fireRateMult.toFixed(2)],
    ['heart','Max HP',        Math.round(s.maxHp)],
    ['boot','Move Speed',     Math.round(s.moveSpeed)],
    ['target','Crit Chance',  Math.round(s.crit*100)+'%'],
    ['starburst','Crit Damage','×'+s.critMult.toFixed(1)],
    ['magnet','Pickup Range',  Math.round(s.pickupRange)],
    ['coin','Coin Bonus',     '×'+s.coinMult.toFixed(2)],
    ['graph','XP Bonus',      '×'+s.xpMult.toFixed(2)],
    ['power', lvlLabel,        lvlVal],
  ];
  $('statGrid').innerHTML = rows.map(([ic,l,v]) =>
    `<div class="stat-card"><div class="ic">${ico(ic,22)}</div><div class="sc-meta"><span>${l}</span><b>${v}</b></div></div>`
  ).join('');

  const comps = [];
  const sh = SHIPS[save.ship] || SHIPS.vanguard;
  comps.push(['rocket', 'Ship · '+sh.name, WEAPONS[sh.weapon].name, 'p2w']);
  if (live) {
    for (const w of pl.weapons) {
      const d = WEAPONS[w.key], evoName = w.evolved && d.evolve;
      comps.push([d.icon, evoName ? d.evolve.name : d.name, evoName ? '★ EVO' : 'Lv '+w.level, 'weapon']);
    }
    if (pl.projBonus > 0) comps.push(['plus','Multishot','+'+pl.projBonus,'weapon']);
    if (pl.projMult > 1)  comps.push(['power','Overcharge','×'+pl.projMult.toFixed(2),'weapon']);
    if (pl.rangeMult > 1) comps.push(['range','Firing Range','×'+pl.rangeMult.toFixed(2),'weapon']);
    if (pl.regen > 0)     comps.push(['heartplus','Regen','+'+pl.regen.toFixed(1)+'/s','weapon']);
  } else {
    const m = save.meta, p = save.p2w, r = save.relics;
    for (const d of META_DEFS)  if (m[d.key] > 0) comps.push([d.icon, d.name, 'Lv '+m[d.key], 'meta']);
    for (const d of P2W_DEFS) { const o = p[d.key]; if (o > 0) comps.push([d.icon, d.name, d.once?'OWNED':('Tier '+o), 'p2w']); }
    for (const k in r) if (r[k] > 0) { const [ic,nm] = RELIC_META[k]; comps.push([ic, 'Relic · '+nm, '+'+r[k], 'relic']); }
  }
  $('compSection').textContent = live ? 'Equipped Weapons' : 'Active Components';

  $('compList').innerHTML = comps.length
    ? comps.map(([ic,nm,tag,cls]) =>
        `<div class="comp-row c-${cls}"><span class="ic">${ico(ic,18)}</span><span class="nm">${nm}</span><span class="tag">${tag}</span></div>`).join('')
    : `<p class="empty-hint">No permanent upgrades yet. Earn coins in runs for <b>Upgrades</b>, and spend gems in the <b>Premium Store</b> — everything you buy shows up here.</p>`;

  // ---- records / high scores (lifetime personal bests) ----
  const L = save.lifeStats || {};
  const recGrid = $('recordGrid');
  if (recGrid) {
    const recs = [
      ['fastforward','Best Wave',   L.bestWave||0],
      ['clock','Best Survival',     mmss(L.bestTime||0)],
      ['power','Best Level',        L.bestLevel||1],
      ['gun','Most Weapons',        L.bestWeapons||1],
      ['skull','Total Kills',       fmt(L.kills||0)],
      ['boss','Bosses Slain',       fmt(L.bosses||0)],
      ['coin','Lifetime Coins',     fmt(L.coins||0)],
      ['refresh','Runs Played',     fmt(L.runs||0)],
    ];
    recGrid.innerHTML = recs.map(([ic,l,v]) =>
      `<div class="stat-card"><div class="ic">${ico(ic,22)}</div><div class="sc-meta"><span>${l}</span><b>${v}</b></div></div>`
    ).join('');
  }
}

// ---- gacha
function rarityRoll() {
  // pity: every 10 pulls without legend+ forces epic+; counter in save.pity
  let total = GACHA.reduce((a,g)=>a+g.w,0), r = Math.random()*total;
  for (const g of GACHA) { r -= g.w; if (r <= 0) return g; }
  return GACHA[0];
}
let lastPull = { n:1, cost:10 };   // last crate pull, so the result popup can offer "Pull Again ×N"
function doPull(n, cost) {
  if (save.gems < cost) { toast('Not enough '+ico('gem',13)+' — get more below!'); return; }
  lastPull = { n, cost };
  save.gems -= cost;
  const results = [];
  for (let i = 0; i < n; i++) {
    let tier = rarityRoll();
    // pity
    if (tier.rar==='legend' || tier.rar==='mythic') save.pity = 0; else save.pity++;
    if (save.pity >= 10) { tier = GACHA.find(g=>g.rar==='legend'); save.pity = 0; }
    const item = pick(tier.items);
    save.relics[item.stat] += item.amt;
    results.push({ ...item, rar:tier.rar });
  }
  persist(); refreshWallet();
  if (results.some(r=>r.rar==='legend'||r.rar==='mythic')) SFX.legend(); else SFX.buy();
  showGacha(results);
}
function showGacha(results) {
  $('gachaTitle').textContent = results.length>1 ? results.length+'× Pull Results!' : 'You Got…';
  const wrap = $('gachaItems'); wrap.innerHTML='';
  results.forEach((r,i)=>{
    const el = document.createElement('div');
    el.className = 'gacha-card r-'+r.rar; el.style.animationDelay = Math.min(i*0.05, 1.2)+'s';
    el.innerHTML = `<div class="ic">${ico(r.icon,30)}</div><div class="nm">${r.nm}</div>
      <div class="rr">${RAR_LABEL[r.rar]}</div><div style="font-size:11px;color:#8a90c0">+${r.amt} ${r.stat}</div>`;
    wrap.appendChild(el);
  });
  const again = $('gachaAgain');
  again.classList.remove('hidden');
  again.innerHTML = `${ico('refresh',15)} Pull Again ×${lastPull.n} <span class="cost">${ico('gem',13)} ${lastPull.cost}</span>`;
  show('gachaResult');
}

// ================================================================== GOALS: quests + daily challenges
// Quest tracks: each is a CHAIN — step N unlocks only after step N-1 is claimed.
// A whole track also stays hidden until you've claimed `unlockAt` quests overall
// (the "finish a prior SET" gate). Rewards start HIGH then settle to NORMAL,
// while targets balloon — so later goals get steadily harder for the same payout.
function questSteps(base, mult, count) {
  const s = []; let t = base;
  for (let i = 0; i < count; i++) { s.push({ target: Math.round(t), reward: Math.max(6, 22 - i*2) }); t *= mult; }
  return s;
}
// agg 'sum'  => each step counts events accumulated SINCE the step became active (resets on claim)
// agg 'max'  => each step needs a single run (after activation) to hit the target
// Progress only counts AFTER a track unlocks — nothing earned beforehand carries over.
// The final step of every trail unlocks that track's ULTIMATE weapon.
const QUEST_FIELDS = [
  { id:'slayer',   icon:'skull', name:'Slayer',      stat:'kills',     agg:'sum', verb:'Defeat',      unit:'enemies',      unlockAt:0,  weapon:'tempest',     steps:questSteps(25,  1.5,  12) },
  { id:'survivor', icon:'clock', name:'Survivor',    stat:'bestTime',  agg:'max', verb:'Survive',     unit:'s in a run',   unlockAt:0,  weapon:'chrono',      steps:questSteps(30,  1.35, 10) },
  { id:'tycoon',   icon:'coin', name:'Tycoon',      stat:'coins',     agg:'sum', verb:'Earn',        unit:'coins',        unlockAt:3,  weapon:'meteor',      steps:questSteps(150, 1.5,  12) },
  { id:'ascend',   icon:'starburst', name:'Ascendant',   stat:'bestLevel', agg:'max', verb:'Reach level', unit:'in one run',   unlockAt:6,  weapon:'singularity', steps:questSteps(5,   1.3,  10) },
  { id:'boss',     icon:'boss', name:'Boss Hunter', stat:'bosses',    agg:'sum', verb:'Slay',        unit:'bosses',       unlockAt:9,  weapon:'annihilate',  steps:questSteps(1,   1.55, 10) },
  { id:'veteran',  icon:'medal', name:'Veteran',     stat:'runs',      agg:'sum', verb:'Complete',    unit:'runs',         unlockAt:12, weapon:'cryo',        steps:questSteps(3,   1.4,  10) },
];
function questRunContribution(f, earned) {
  switch (f.stat) {
    case 'kills':     return G.kills;
    case 'coins':     return earned;
    case 'bosses':    return G.bossesKilled;
    case 'runs':      return 1;
    case 'bestTime':  return Math.floor(G.time);
    case 'bestLevel': return G.player.level;
  }
  return 0;
}
// Daily challenge templates (per-run objectives). 3 picked per day, seeded by date.
const CHAL_POOL = [
  { id:'kills',  stat:'kills',       icon:'skull', verb:'Defeat',             unit:'enemies', base:80,  reward:12 },
  { id:'time',   stat:'time',        icon:'clock', verb:'Survive',            unit:'seconds', base:90,  reward:12 },
  { id:'level',  stat:'level',       icon:'starburst', verb:'Reach level',        unit:'',        base:9,   reward:10 },
  { id:'wave',   stat:'wave',        icon:'fastforward', verb:'Reach wave',         unit:'',        base:6,   reward:12 },
  { id:'coins',  stat:'coins',       icon:'coin', verb:'Collect',            unit:'coins',   base:150, reward:10 },
  { id:'boss',   stat:'bosses',      icon:'boss', verb:'Kill',               unit:'boss(es)',base:1,   reward:14 },
  { id:'weapon', stat:'weaponLevel', icon:'gun', verb:'Get a weapon to Lv', unit:'',        base:5,   reward:10 },
];

// ---- Mastery tier — one-time achievements tied to specific weapons & ships.
// Lifetime (never resets); progress is committed at run-end like quests.
function evHas(k)   { return save.mastery.evolved.includes(k) ? 1 : 0; }
function evCount()  { return new Set(save.mastery.evolved).size; }
function shKills(s) { return save.mastery.shipKills[s]     || 0; }
function shRuns(s)  { return save.mastery.shipRuns[s]      || 0; }
function shTime(s)  { return save.mastery.shipBestTime[s]  || 0; }
function shLevel(s) { return save.mastery.shipBestLevel[s] || 0; }
const MASTERY_DEFS = [
  // ---- weapon mastery: evolve each weapon (lifetime) ----
  { id:'evo_blaster', tier:'weapon', icon:'gun',     name:'Astral Railstorm', desc:'Evolve the Plasma Blaster', reward:12, prog:()=>[evHas('blaster'),1] },
  { id:'evo_spread',  tier:'weapon', icon:'scatter', name:'Supernova Burst',  desc:'Evolve the Scatter Cannon', reward:12, prog:()=>[evHas('spread'),1] },
  { id:'evo_missile', tier:'weapon', icon:'rocket',  name:'Dragonfire Swarm', desc:'Evolve the Homing Swarm',   reward:12, prog:()=>[evHas('missile'),1] },
  { id:'evo_orbit',   tier:'weapon', icon:'orbit',   name:'Halo of Ruin',     desc:'Evolve the Aegis Orbs',     reward:12, prog:()=>[evHas('orbit'),1] },
  { id:'evo_nova',    tier:'weapon', icon:'nova',    name:'Solar Flare',      desc:'Evolve the Nova Pulse',     reward:12, prog:()=>[evHas('nova'),1] },
  { id:'evo_laser',   tier:'weapon', icon:'beam',    name:'Prism Array',      desc:'Evolve the Rail Beam',      reward:12, prog:()=>[evHas('laser'),1] },
  { id:'evo_all',     tier:'weapon', icon:'trophy',  name:'Master of Arms',   desc:'Evolve all 6 weapons',      reward:60, prog:()=>[evCount(),6] },
  // ---- hangar mastery: own & pilot each ship ----
  { id:'ship_all',    tier:'hangar', icon:'rocket',  name:'Full Hangar',        desc:'Unlock all 5 ships',                   reward:50, prog:()=>[save.ships.length,5] },
  { id:'m_vanguard',  tier:'hangar', icon:'medal',   name:'Old Reliable',       desc:'2,000 lifetime kills in the Vanguard', reward:15, prog:()=>[shKills('vanguard'),2000] },
  { id:'m_reaper',    tier:'hangar', icon:'skull',   name:'Glass Tactician',    desc:'Reach level 18 in a Reaper run',       reward:18, prog:()=>[shLevel('reaper'),18] },
  { id:'m_bastion',   tier:'hangar', icon:'shield',  name:'Immovable',          desc:'Survive 4 min in a Bastion run',       reward:18, prog:()=>[shTime('bastion'),240] },
  { id:'m_specter',   tier:'hangar', icon:'swirl',   name:'Ghost in the Dark',  desc:'1,500 lifetime kills in the Specter',  reward:18, prog:()=>[shKills('specter'),1500] },
  { id:'m_sovereign', tier:'hangar', icon:'crown',   name:'Long Live the King', desc:'Complete 10 runs in the Sovereign',    reward:18, prog:()=>[shRuns('sovereign'),10] },
];
const masteryDone      = (d) => { const [c,t]=d.prog(); return c>=t; };
const masteryClaimable = (d) => !save.mastery.claimed[d.id] && masteryDone(d);

function todayStr() { return new Date().toISOString().slice(0,10); }
function hashStr(s) { let h=2166136261>>>0; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function seededRng(seed) { let a=seed>>>0; return () => { a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function genDailyChallenges(dateStr, tier) {
  const rng = seededRng(hashStr(dateStr));
  const pool = CHAL_POOL.slice(), picks = [];
  for (let i=0;i<3 && pool.length;i++) picks.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
  const diff = 1 + tier*0.35;                       // targets creep up each new day...
  return picks.map(t => ({
    tmpl:t.id, stat:t.stat, icon:t.icon, verb:t.verb, unit:t.unit,
    target: Math.max(1, Math.round(t.base * diff)),
    reward: t.reward,                                // ...reward stays the same.
    prog: 0, claimed: false,
  }));
}
function ensureDaily() {
  const today = todayStr();
  if (save.daily.date !== today) {
    if (save.daily.date) save.daily.tier = (save.daily.tier||0) + 1;  // played a new day => harder
    save.daily.date = today;
    save.daily.chals = genDailyChallenges(today, save.daily.tier||0);
    persist();
  }
}
function resetCountdown() {
  const now = new Date(), end = new Date(now); end.setHours(24,0,0,0);
  const ms = end-now, h = Math.floor(ms/3.6e6), m = Math.floor(ms%3.6e6/6e4);
  return h+'h '+m+'m';
}
// current run's value for a given stat (0 when not in a run)
function runValue(stat) {
  if (G.state === 'menu' || !G.player) return 0;
  switch (stat) {
    case 'kills':       return G.kills;
    case 'time':        return Math.floor(G.time);
    case 'wave':        return G.wave;
    case 'coins':       return Math.floor(G.runCoins);
    case 'level':       return G.player.level;
    case 'bosses':      return G.bossesKilled;
    case 'weaponLevel': return Math.max(1, ...G.player.weapons.map(w=>w.level));
  }
  return 0;
}
const challengeName  = (c) => `${c.verb} ${fmt(c.target)}${c.unit?' '+c.unit:''} in a run`;
const challengeEffProg = (c) => Math.max(c.prog, runValue(c.stat));
const totalQuestsClaimed = () => Object.values(save.quests).reduce((a,b)=>a+b,0);
const questProgressVal = (f) => save.questProg[f.id] || 0;
function commitRun(earned) {
  const L = save.lifeStats;
  L.kills      += G.kills;
  L.coins      += earned;
  L.bosses     += G.bossesKilled;
  L.runs       += 1;
  L.bestTime    = Math.max(L.bestTime,  Math.floor(G.time));
  L.bestLevel   = Math.max(L.bestLevel, G.player.level);
  L.bestWeapons = Math.max(L.bestWeapons||1, G.player.weapons.length);
  L.bestWave    = Math.max(L.bestWave||0, G.bestWave);
  if (G.bestWave > (save.maxWave||1)) save.maxWave = G.bestWave;   // unlocks wave-skip tiers
  // per-ship piloting stats (drives the hangar Mastery challenges)
  const ship = save.ship || 'vanguard', mk = save.mastery;
  mk.shipKills[ship]     = (mk.shipKills[ship]||0) + G.kills;
  mk.shipRuns[ship]      = (mk.shipRuns[ship]||0) + 1;
  mk.shipBestTime[ship]  = Math.max(mk.shipBestTime[ship]||0,  Math.floor(G.time));
  mk.shipBestLevel[ship] = Math.max(mk.shipBestLevel[ship]||0, G.player.level);
  // quests: accumulate ONLY for unlocked, not-yet-finished tracks (counts from unlock onward)
  const total = totalQuestsClaimed();
  for (const f of QUEST_FIELDS) {
    if (total < f.unlockAt || save.quests[f.id] >= f.steps.length) continue;
    const v = questRunContribution(f, earned);
    if (f.agg === 'max') save.questProg[f.id] = Math.max(save.questProg[f.id], v);
    else                 save.questProg[f.id] += v;
  }
  ensureDaily();
  for (const c of save.daily.chals) c.prog = Math.max(c.prog, runValue(c.stat));
}
function claimableCount() {
  ensureDaily();
  let n = 0;
  for (const c of save.daily.chals) if (!c.claimed && challengeEffProg(c) >= c.target) n++;
  const total = totalQuestsClaimed();
  for (const f of QUEST_FIELDS) {
    if (total < f.unlockAt) continue;
    const step = f.steps[save.quests[f.id]];
    if (step && questProgressVal(f) >= step.target) n++;
  }
  for (const d of MASTERY_DEFS) if (masteryClaimable(d)) n++;
  return n;
}
function updateBadges() {
  const n = claimableCount();
  for (const id of ['goalsBadge','pauseGoalsBadge']) {
    const el = $(id); if (!el) continue;
    if (n > 0) { el.textContent = n; el.classList.remove('hidden'); } else el.classList.add('hidden');
  }
}
function claimChallenge(i) {
  const c = save.daily.chals[i];
  if (!c || c.claimed || challengeEffProg(c) < c.target) return;
  c.prog = challengeEffProg(c); c.claimed = true; save.gems += c.reward;
  persist(); refreshWallet(); SFX.legend(); toast('Challenge complete &nbsp;+'+c.reward+' '+ico('gem',14), 1600);
  renderChallenges(); updateBadges();
}
function claimQuest(id) {
  const f = QUEST_FIELDS.find(x=>x.id===id); if (!f) return;
  if (totalQuestsClaimed() < f.unlockAt) return;
  const idx = save.quests[id], step = f.steps[idx];
  if (!step || questProgressVal(f) < step.target) return;
  save.quests[id] = idx + 1;
  save.questProg[id] = 0;                 // the next step starts counting fresh
  save.gems += step.reward;
  let unlocked = null;
  if (save.quests[id] >= f.steps.length && f.weapon && !save.unlockedWeapons.includes(f.weapon)) {
    save.unlockedWeapons.push(f.weapon); unlocked = f.weapon;       // finished the trail!
  }
  persist(); refreshWallet(); SFX.legend();
  if (unlocked) showWeaponUnlock(unlocked);
  else toast('Quest complete &nbsp;+'+step.reward+' '+ico('gem',14), 1600);
  renderQuests(); updateBadges();
}
function showWeaponUnlock(key) {
  const d = WEAPONS[key];
  $('gachaTitle').innerHTML = ico('sword',24) + ' ULTIMATE UNLOCKED!';
  $('gachaItems').innerHTML =
    `<div class="gacha-card r-legend"><div class="ic">${ico(d.icon,40)}</div><div class="nm">${d.name}</div>
     <div class="rr">Ultimate</div>
     <div style="font-size:11px;color:#8a90c0;max-width:150px;line-height:1.4">${d.desc}<br><b style="color:#ffcf3a">Now appears in your level-up choices.</b></div></div>`;
  $('gachaAgain').classList.add('hidden');   // not a crate pull — no "pull again" here
  show('gachaResult');
}
function renderGoals() {
  ensureDaily(); refreshWallet();
  $('chalReset').textContent = resetCountdown();
  renderChallenges(); renderQuests(); renderMastery(); updateBadges();
}
function renderChallenges() {
  const list = $('chalList');
  list.innerHTML = save.daily.chals.map((c,i) => {
    const prog = challengeEffProg(c), pct = clamp(prog/c.target*100,0,100), can = !c.claimed && prog>=c.target;
    const btn = c.claimed ? `<button disabled>✓ Done</button>`
      : can ? `<button class="gemcost claimable" data-cidx="${i}">Claim ${ico('gem',13)}${c.reward}</button>`
      : `<button disabled>${ico('gem',13)}${c.reward}</button>`;
    return `<div class="goal-item ${c.claimed?'done':''}"><div class="ic">${ico(c.icon,24)}</div>
      <div class="info"><h4>${challengeName(c)}</h4>
      <div class="pbar"><div class="pfill" style="width:${pct}%"></div><span>${fmt(Math.min(prog,c.target))}/${fmt(c.target)}</span></div></div>${btn}</div>`;
  }).join('');
  list.querySelectorAll('[data-cidx]').forEach(b => b.onclick = () => claimChallenge(+b.dataset.cidx));
}
function renderQuests() {
  const total = totalQuestsClaimed();
  $('questList').innerHTML = QUEST_FIELDS.map(f => {
    const done = save.quests[f.id];
    if (total < f.unlockAt)
      return `<div class="goal-item locked"><div class="ic">${ico('lock',24)}</div>
        <div class="info"><h4>${f.name}</h4><p class="qsub">Finish ${f.unlockAt} quests to unlock this track</p></div></div>`;
    const step = f.steps[done];
    if (!step)
      return `<div class="goal-item done"><div class="ic">${ico(f.icon,24)}</div>
        <div class="info"><h4>${f.name} <span class="lvltag">★ MAXED</span></h4><p class="qsub">All quests complete!</p></div><button disabled>✓</button></div>`;
    const prog = questProgressVal(f), pct = clamp(prog/step.target*100,0,100), can = prog>=step.target;
    const isFinal = done === f.steps.length-1;
    const wd = f.weapon ? WEAPONS[f.weapon] : null;
    const reward = isFinal && wd
      ? `<button class="gemcost ${can?'claimable':''}" ${can?`data-qid="${f.id}"`:'disabled'}>${ico(wd.icon,15)} Unlock</button>`
      : (can ? `<button class="gemcost claimable" data-qid="${f.id}">Claim ${ico('gem',13)}${step.reward}</button>`
             : `<button disabled>${ico('gem',13)}${step.reward}</button>`);
    const finalHint = isFinal && wd ? ` <span class="lvltag ult">${ico('trophy',12)} ${wd.name}</span>` : '';
    return `<div class="goal-item ${isFinal?'final':''}"><div class="ic">${ico(f.icon,24)}</div>
      <div class="info"><h4>${f.name} <span class="lvltag">Tier ${done+1}/${f.steps.length}</span>${finalHint}</h4>
      <p class="qsub">${f.verb} ${fmt(step.target)} ${f.unit}</p>
      <div class="pbar"><div class="pfill" style="width:${pct}%"></div><span>${fmt(Math.min(prog,step.target))}/${fmt(step.target)}</span></div></div>${reward}</div>`;
  }).join('');
  $('questList').querySelectorAll('[data-qid]').forEach(b => b.onclick = () => claimQuest(b.dataset.qid));
}
function renderMastery() {
  const m = save.mastery, fmtT = (d,c) => d.id==='m_bastion' ? mmss(c) : fmt(c);
  $('masteryList').innerHTML = MASTERY_DEFS.map(d => {
    const [cur, tgt] = d.prog(), claimed = !!m.claimed[d.id], done = cur >= tgt;
    const pct = clamp(cur/tgt*100, 0, 100);
    const tierTag = d.tier === 'weapon'
      ? `<span class="lvltag">${ico('power',12)} WEAPON</span>`
      : `<span class="lvltag ult">${ico('rocket',12)} HANGAR</span>`;
    const btn = claimed ? `<button disabled>✓ Done</button>`
      : done ? `<button class="gemcost claimable" data-mid="${d.id}">Claim ${ico('gem',13)}${d.reward}</button>`
      : `<button disabled>${ico('gem',13)}${d.reward}</button>`;
    return `<div class="goal-item ${claimed?'done':''}"><div class="ic">${ico(d.icon,24)}</div>
      <div class="info"><h4>${d.name} ${tierTag}</h4><p class="qsub">${d.desc}</p>
      <div class="pbar"><div class="pfill" style="width:${pct}%"></div><span>${fmtT(d,Math.min(cur,tgt))}/${fmtT(d,tgt)}</span></div></div>${btn}</div>`;
  }).join('');
  $('masteryList').querySelectorAll('[data-mid]').forEach(b => b.onclick = () => claimMastery(b.dataset.mid));
}
function claimMastery(id) {
  const d = MASTERY_DEFS.find(x => x.id === id);
  if (!d || !masteryClaimable(d)) return;
  save.mastery.claimed[id] = true; save.gems += d.reward;
  persist(); refreshWallet(); SFX.legend();
  toast(ico('trophy',16)+' Mastery complete &nbsp;+'+d.reward+' '+ico('gem',14), 1600);
  renderMastery(); updateBadges();
}
function switchGoalTab(tab) {
  document.querySelectorAll('#goals .tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
  $('chalPane').classList.toggle('hidden', tab!=='chal');
  $('questPane').classList.toggle('hidden', tab!=='quest');
  $('masteryPane').classList.toggle('hidden', tab!=='mastery');
}

// ================================================================== wire up
$('playBtn').onclick    = () => { startRun(); };
$('hangarBtn').onclick  = () => { renderHangar(); show('hangar'); };
$('statsBtn').onclick   = () => { renderStats('base'); show('stats'); };
$('dailyClaim').onclick = () => claimDaily();
$('adReviveBtn').onclick = () => {
  if (G.adRevived) return;
  playRewardedAd(() => { G.adRevived = true; doRevive(true); toast(ico('ad',15)+' Free revive!', 1500); });
};
$('adDoubleBtn').onclick = () => {
  if (G.adDoubled) return;
  playRewardedAd(() => {
    G.adDoubled = true; G.runCoins *= 2;
    $('goCoins').innerHTML = ico('coin',18)+' '+fmt(Math.round(G.runCoins));
    $('adDoubleBtn').style.display = 'none';
    SFX.coin(); toast('Coins doubled &nbsp;'+ico('coin',14)+' ×2!', 1600);
  });
};
$('goalsBtn').onclick   = () => { renderGoals(); show('goals'); };
$('metaBtn').onclick    = () => { renderMeta(); renderSkip(); refreshWallet(); show('metashop'); };
$('waveUp')   && ($('waveUp').onclick   = () => cycleStartWave(1));
$('waveDown') && ($('waveDown').onclick = () => cycleStartWave(-1));
$('skipToggle') && ($('skipToggle').onchange = e => { save.skipOn = e.target.checked; persist(); renderWaveSelect(); });
$('premiumBtn').onclick = () => { renderP2W(); renderIAP(); refreshWallet(); show('premiumshop'); };
$('pauseBtn').onclick   = () => pauseGame();
$('speedBtn') && ($('speedBtn').onclick = () => cycleGameSpeed());
updateSpeedBtn();
$('resumeBtn').onclick  = () => resumeGame();
$('pauseStatsBtn').onclick = () => { renderStats('live'); show('stats'); };
$('pauseGoalsBtn').onclick = () => { renderGoals(); show('goals'); };
// surrender counts as a DEFEAT (run is banked) instead of a cold quit
$('quitBtn').onclick    = () => { gameOver(); };
$('rerollBtn').onclick  = () => {
  if (save.gems < 1) { toast('Not enough '+ico('gem',13)); return; }
  save.gems--; persist(); refreshWallet();
  G.pendingCards = rollCards(); renderCards();
  $('rerollBtn').style.display = save.gems >= 1 ? 'flex' : 'none';
};
$('reviveBtn').onclick  = () => doRevive(false);
$('claimBtn').onclick   = () => { finalizeRun(); G.state='menu'; hide('gameover'); refreshWallet(); show('menu'); };
$('pull1').onclick      = () => doPull(1, 10);
$('pull10').onclick     = () => doPull(10, 90);
$('pull100')  && ($('pull100').onclick = () => doPull(100, 850));
$('gachaAgain').onclick = () => doPull(lastPull.n, lastPull.cost);
$('gachaClose').onclick = () => hide('gachaResult');
document.querySelectorAll('#goals .tab').forEach(t => t.onclick = () => switchGoalTab(t.dataset.tab));
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => hide(b.dataset.close));
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (G.state==='play') pauseGame(); else if (G.state==='pause') resumeGame(); }
});
// pause when tab hidden
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state==='play') pauseGame(); });

// boot
hydrateIcons();
ensureDaily();
refreshWallet();
updateBadges();
updateShipTag();
renderWaveSelect();
show('menu');
// fade out the boot splash once the first frames are up
setTimeout(() => { const sp = $('splash'); if (sp) { sp.classList.add('gone'); setTimeout(() => sp.remove(), 700); } }, 1400);
// daily login reward pops right after the splash (once per day)
setTimeout(() => { if (loginDayIndex() !== null) { renderDaily(); show('daily'); } }, 1800);

// lightweight debug handle (also useful from the browser console: NOVA.save, NOVA.claimableCount(), …)
window.NOVA = {
  get save(){ return save; }, get G(){ return G; },
  claimQuest, claimChallenge, claimableCount, genDailyChallenges, baseStats,
  runValue, finalizeRun, ensureDaily, persist, rollCards,
  difficultyScale, dmgScale, enemyTypeFor, spawnEnemy, killEnemy, E_DEF,
  updateWaves, advanceWave, applyWaveSkip, isBossWave, allowedStartWaves,
  renderSkip, buySkip, renderWaveSelect, cycleStartWave, WAVE_TIME, BOSS_EVERY,
  spawnBossEvent, ultraComboFor, ULTRA_BOSSES, ULTRA_COMBOS,
  projCount, baseProj, applyCard,
  QUEST_FIELDS, CHAL_POOL, WEAPONS, SHIPS, LOGIN_REWARDS,
  MASTERY_DEFS, renderMastery, claimMastery, masteryClaimable,
  loginDayIndex, claimDaily, playRewardedAd, adGemsLeft,
  // deterministic frame-stepping for headless tests / balance sims
  step: (dt = 0.016, n = 1) => { for (let i = 0; i < n; i++) update(dt); },
};
console.log('%cNOVA SURVIVOR loaded ⭐','color:#3df0ff;font-weight:bold');

})();

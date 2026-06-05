const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  biome: document.getElementById("biome-label"),
  wave: document.getElementById("wave-label"),
  waveState: document.getElementById("wave-state-label"),
  rank: document.getElementById("rank-label"),
  healthValue: document.getElementById("health-value"),
  healthFill: document.getElementById("health-fill"),
  waterValue: document.getElementById("water-value"),
  waterFill: document.getElementById("water-fill"),
  score: document.getElementById("score-label"),
  best: document.getElementById("best-label"),
  flock: document.getElementById("flock-label"),
  materials: document.getElementById("materials-label"),
  banner: document.getElementById("pickup-banner"),
  buffRack: document.getElementById("buff-rack"),
  buildPanel: document.getElementById("build-panel"),
  buildPhase: document.getElementById("build-phase-label"),
  buildMaterials: document.getElementById("build-materials-label"),
  buildButtons: Array.from(document.querySelectorAll(".build-button")),
  upgradeButtons: Array.from(document.querySelectorAll(".upgrade-button")),
  rotateBuild: document.getElementById("rotate-build-button"),
  salvage: document.getElementById("salvage-button"),
  startWave: document.getElementById("start-wave-button"),
  selectedCode: document.getElementById("selected-code"),
  selectedLabel: document.getElementById("selected-label"),
  hotbarSlots: Array.from(document.querySelectorAll(".hotbar-slot")),
  pause: document.getElementById("pause-button"),
  restart: document.getElementById("restart-button"),
};

const TAU = Math.PI * 2;
const WORLD = { w: 2600, h: 1780 };
const DPR_LIMIT = 2;

const BIOMES = [
  {
    id: "farmyard",
    name: "Farmyard",
    start: 1,
    end: 10,
    groundA: "#8bd85e",
    groundB: "#5ab957",
    path: "#d8a456",
    texture: "#ffe07c",
    waterNames: ["Stone Well", "Cow Trough"],
  },
  {
    id: "forest",
    name: "Forest",
    start: 11,
    end: 20,
    groundA: "#5ab66a",
    groundB: "#287a52",
    path: "#8e6a3d",
    texture: "#a9df82",
    waterNames: ["Tree Stump", "Spring"],
  },
  {
    id: "tundra",
    name: "Tundra",
    start: 21,
    end: 30,
    groundA: "#e6fbff",
    groundB: "#a9deed",
    path: "#cbe7f0",
    texture: "#ffffff",
    waterNames: ["Frozen Well"],
  },
];

const HOTBAR = [
  {
    id: "watergun",
    code: "WG",
    name: "Watergun",
    unlock: true,
    cooldown: 0.17,
    cost: 1,
  },
  {
    id: "triple",
    code: "3X",
    name: "Tri-Barrel",
    unlock: false,
    cooldown: 0.24,
    cost: 2,
  },
  {
    id: "sword",
    code: "SW",
    name: "Sword",
    unlock: false,
    cooldown: 0.48,
    cost: 0,
  },
  {
    id: "hammer",
    code: "HM",
    name: "Hammer",
    unlock: false,
    cooldown: 0.82,
    cost: 0,
  },
];

const BUFFS = {
  hot: { code: "HOT", name: "Hot Sauce", duration: 10 },
  boots: { code: "BT", name: "Golden Boots", duration: 10 },
  yolk: { code: "YLK", name: "Mega Yolk", duration: 9 },
  acid: { code: "ACD", name: "Acid Water", duration: 12 },
  flame: { code: "FLM", name: "Flame Water", duration: 9 },
  multi: { code: "MUL", name: "Multi Stream", duration: 12 },
  leak: { code: "LEK", name: "Leaky Tank", duration: 999 },
};

const BUILDABLES = [
  {
    id: "wall",
    code: "WL",
    name: "Wall",
    cost: 25,
    r: 38,
    w: 118,
    h: 36,
    hp: 170,
  },
  {
    id: "turret",
    code: "TR",
    name: "Turret",
    cost: 55,
    r: 34,
    hp: 120,
    range: 430,
    cooldown: 0.62,
  },
  {
    id: "spikes",
    code: "SP",
    name: "Spikes",
    cost: 35,
    r: 42,
    hp: 105,
  },
];

const WATER_UPGRADES = [
  {
    id: "twin",
    code: "TW",
    name: "Twin Mount",
    cost: 60,
  },
  {
    id: "rapid",
    code: "RF",
    name: "Rapid Pump",
    cost: 75,
  },
  {
    id: "shotgun",
    code: "SG",
    name: "Spray Nozzle",
    cost: 90,
  },
  {
    id: "bazooka",
    code: "BZ",
    name: "Boozooka",
    cost: 120,
  },
];

const keys = new Set();
let lastFrame = performance.now();
let backgroundCanvas = null;
let backgroundBiome = null;
let chickId = 1;
let bannerTimer = 0;
let hudTimer = 0;

const game = {
  view: { w: window.innerWidth, h: window.innerHeight, dpr: 1 },
  camera: { x: 0, y: 0 },
  mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, wx: 0, wy: 0, down: false },
  aim: { x: 0, y: 0, angle: 0, snapped: false },
  score: 0,
  best: Number(localStorage.getItem("fowl-play-best") || 0),
  wave: 1,
  rank: "S",
  state: "playing",
  paused: false,
  nextWaveTimer: 0,
  spawnTimer: 0,
  pendingFoxes: 0,
  waveDamage: 0,
  materials: 0,
  selectedBuild: "wall",
  buildAction: "build",
  buildRotation: 0,
  biome: BIOMES[0],
  player: null,
  history: [],
  flock: [],
  foxes: [],
  bullets: [],
  particles: [],
  eggs: [],
  feed: [],
  pickups: [],
  waterSources: [],
  hazards: [],
  obstacles: [],
  cover: [],
  fire: [],
  logs: [],
  bull: null,
  hotbar: [],
  waterUpgrades: {},
  selectedSlot: 0,
  buffs: {},
  pressureLevel: 0,
  runWon: false,
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function chance(value) {
  return Math.random() < value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(a, b, c, d) {
  return Math.hypot(a - c, b - d);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function circleRectOverlap(cx, cy, cr, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return dist(cx, cy, nx, ny) < cr;
}

function resolveCircleRect(body, rect) {
  const nx = clamp(body.x, rect.x, rect.x + rect.w);
  const ny = clamp(body.y, rect.y, rect.y + rect.h);
  const dx = body.x - nx;
  const dy = body.y - ny;
  const d = Math.hypot(dx, dy) || 1;
  if (d < body.r) {
    const push = body.r - d;
    body.x += (dx / d) * push;
    body.y += (dy / d) * push;
    if ("vx" in body) body.vx *= 0.35;
    if ("vy" in body) body.vy *= 0.35;
  }
}

function isWallCover(cover) {
  return cover && ["wall", "haywall", "logwall"].includes(cover.kind);
}

function getWallDims(wall) {
  return {
    w: wall.w || wall.r * 3.1,
    h: wall.h || wall.r * 0.95,
  };
}

function circleRotatedWallOverlap(cx, cy, cr, wall) {
  const dims = getWallDims(wall);
  const angle = -(wall.angle || 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = cx - wall.x;
  const dy = cy - wall.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const nearestX = clamp(lx, -dims.w / 2, dims.w / 2);
  const nearestY = clamp(ly, -dims.h / 2, dims.h / 2);
  return dist(lx, ly, nearestX, nearestY) < cr;
}

function resolveCircleWall(body, wall) {
  const dims = getWallDims(wall);
  const angle = wall.angle || 0;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx = body.x - wall.x;
  const dy = body.y - wall.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const nearestX = clamp(lx, -dims.w / 2, dims.w / 2);
  const nearestY = clamp(ly, -dims.h / 2, dims.h / 2);
  let nx = lx - nearestX;
  let ny = ly - nearestY;
  let d = Math.hypot(nx, ny);
  let push = body.r - d;

  if (d < 0.001) {
    const overlapX = body.r + dims.w / 2 - Math.abs(lx);
    const overlapY = body.r + dims.h / 2 - Math.abs(ly);
    if (overlapX < overlapY) {
      nx = Math.sign(lx) || 1;
      ny = 0;
      push = overlapX;
    } else {
      nx = 0;
      ny = Math.sign(ly) || 1;
      push = overlapY;
    }
    d = 1;
  }

  if (push <= 0) return false;
  nx /= d;
  ny /= d;
  const worldNx = nx * Math.cos(angle) - ny * Math.sin(angle);
  const worldNy = nx * Math.sin(angle) + ny * Math.cos(angle);
  body.x += worldNx * (push + 0.8);
  body.y += worldNy * (push + 0.8);
  if ("vx" in body) body.vx *= 0.18;
  if ("vy" in body) body.vy *= 0.18;
  return true;
}

function resizeCanvas() {
  game.view.w = window.innerWidth;
  game.view.h = window.innerHeight;
  game.view.dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  canvas.width = Math.floor(game.view.w * game.view.dpr);
  canvas.height = Math.floor(game.view.h * game.view.dpr);
  canvas.style.width = `${game.view.w}px`;
  canvas.style.height = `${game.view.h}px`;
}

function getBiomeForWave(wave) {
  return BIOMES.find((biome) => wave >= biome.start && wave <= biome.end) || BIOMES[2];
}

function randomWorldPoint(margin = 120) {
  return {
    x: rand(margin, WORLD.w - margin),
    y: rand(margin, WORLD.h - margin),
  };
}

function safeWorldPoint(margin = 160) {
  let point = randomWorldPoint(margin);
  let tries = 0;
  while (tries < 40 && dist(point.x, point.y, game.player.x, game.player.y) < 420) {
    point = randomWorldPoint(margin);
    tries += 1;
  }
  return point;
}

function getObstacleCircle(obstacle) {
  return {
    x: obstacle.x + obstacle.w / 2,
    y: obstacle.y + obstacle.h / 2,
    r: Math.max(obstacle.w, obstacle.h) * 0.62,
  };
}

function getPlacedCircles(includeHazards = false) {
  const circles = [
    ...game.waterSources.map((source) => ({ x: source.x, y: source.y, r: source.r })),
    ...game.obstacles.map(getObstacleCircle),
    ...game.logs.map((log) => ({ x: log.x, y: log.y, r: Math.max(log.w, log.h) * 0.55 })),
    ...game.cover.map((cover) => ({ x: cover.x, y: cover.y, r: cover.r })),
  ];
  if (game.bull) circles.push({ x: game.bull.x, y: game.bull.y, r: game.bull.r });
  if (includeHazards) circles.push(...game.hazards.map((hazard) => ({ x: hazard.x, y: hazard.y, r: hazard.r })));
  return circles;
}

function isClearMapPoint(x, y, radius, padding = 28, includeHazards = false) {
  for (const circle of getPlacedCircles(includeHazards)) {
    if (dist(x, y, circle.x, circle.y) < radius + circle.r + padding) return false;
  }
  return true;
}

function clearWorldPoint(radius, margin = 180, padding = 28, includeHazards = false) {
  let point = randomWorldPoint(margin);
  for (let tries = 0; tries < 90; tries += 1) {
    if (isClearMapPoint(point.x, point.y, radius, padding, includeHazards)) return point;
    point = randomWorldPoint(margin);
  }
  return point;
}

function resetRun() {
  chickId = 1;
  game.score = 0;
  game.wave = 1;
  game.rank = "S";
  game.state = "playing";
  game.paused = false;
  game.nextWaveTimer = 0;
  game.spawnTimer = 0;
  game.pendingFoxes = 0;
  game.waveDamage = 0;
  game.materials = 0;
  game.selectedBuild = "wall";
  game.buildAction = "build";
  game.buildRotation = 0;
  game.runWon = false;
  game.biome = getBiomeForWave(game.wave);
  game.player = {
    x: WORLD.w / 2,
    y: WORLD.h / 2,
    vx: 0,
    vy: 0,
    r: 21,
    baseSpeed: 285,
    health: 100,
    maxHealth: 100,
    water: 42,
    maxWater: 42,
    invuln: 0,
    fireCooldown: 0,
    kickCooldown: 0,
    swordCooldown: 0,
    hammerCooldown: 0,
    sizeScale: 1,
    inLog: false,
  };
  game.history = [];
  game.flock = [];
  game.foxes = [];
  game.bullets = Array.from({ length: 520 }, () => ({ active: false }));
  game.particles = [];
  game.eggs = [];
  game.feed = [];
  game.pickups = [];
  game.waterSources = [];
  game.hazards = [];
  game.obstacles = [];
  game.cover = [];
  game.fire = [];
  game.logs = [];
  game.bull = null;
  game.hotbar = HOTBAR.map((item) => ({ ...item }));
  game.waterUpgrades = {};
  game.selectedSlot = 0;
  game.buffs = {};
  game.pressureLevel = 0;
  backgroundBiome = null;
  setupBiome();
  startWave();
  showBanner("Wave 1");
}

function setupBiome() {
  game.biome = getBiomeForWave(game.wave);
  document.body.dataset.biome = game.biome.id;
  game.waterSources = [];
  game.hazards = [];
  game.obstacles = [];
  game.logs = [];
  game.cover = [];
  game.bull = null;
  createWaterSources();
  createHazardsAndObjects();
  rebuildBackground();
}

function createWaterSources() {
  const sourceCount = game.biome.id === "tundra" ? 3 : 4;
  for (let i = 0; i < sourceCount; i += 1) {
    const sourceRadius = game.biome.id === "farmyard" && i % 2 ? 34 : 42;
    const point = clearWorldPoint(sourceRadius, 260, 50, true);
    game.waterSources.push({
      x: point.x,
      y: point.y,
      r: sourceRadius,
      kind: game.biome.waterNames[i % game.biome.waterNames.length],
      frozen: game.biome.id === "tundra",
      cracks: 0,
      active: game.biome.id !== "tundra",
      pulse: rand(0, TAU),
    });
  }
}

function createHazardsAndObjects() {
  if (game.biome.id === "farmyard") {
    for (let i = 0; i < 8; i += 1) {
      const radius = rand(54, 88);
      const p = clearWorldPoint(radius, 150, 18, true);
      game.hazards.push({ kind: "mud", x: p.x, y: p.y, r: radius });
    }
    for (let i = 0; i < 3; i += 1) {
      const w = 120;
      const h = 78;
      const p = clearWorldPoint(Math.max(w, h) * 0.62, 220, 54, true);
      game.obstacles.push({ kind: "tractor", x: p.x - w / 2, y: p.y - h / 2, w, h, color: chance(0.5) ? "#e64f35" : "#44a35c" });
    }
    for (let i = 0; i < 3; i += 1) {
      const w = 138;
      const h = 76;
      const p = clearWorldPoint(Math.max(w, h) * 0.62, 220, 54, true);
      game.obstacles.push({ kind: "wagon", x: p.x - w / 2, y: p.y - h / 2, w, h, color: chance(0.5) ? "#b87942" : "#a84f33" });
    }
    for (let i = 0; i < 2; i += 1) {
      const w = 92;
      const h = 118;
      const p = clearWorldPoint(Math.max(w, h) * 0.62, 260, 58, true);
      game.obstacles.push({ kind: "windmill", x: p.x - w / 2, y: p.y - h / 2, w, h, color: "#d8d4c3" });
    }
    const bullPoint = clearWorldPoint(52, 360, 62, true);
    game.bull = {
      x: bullPoint.x,
      y: bullPoint.y,
      r: 42,
      state: "sleeping",
      vx: 0,
      vy: 0,
      timer: 0,
      cooldown: 0,
      angle: 0,
    };
  }

  if (game.biome.id === "forest") {
    for (let i = 0; i < 7; i += 1) {
      const radius = rand(48, 76);
      const p = clearWorldPoint(radius, 150, 18, true);
      game.hazards.push({ kind: "web", x: p.x, y: p.y, r: radius });
    }
    for (let i = 0; i < 7; i += 1) {
      const radius = rand(38, 58);
      const p = clearWorldPoint(radius, 130, 16, true);
      game.hazards.push({ kind: "thorns", x: p.x, y: p.y, r: radius, damageTick: 0 });
    }
    for (let i = 0; i < 5; i += 1) {
      const p = clearWorldPoint(96, 220, 48, true);
      game.logs.push({ x: p.x, y: p.y, w: 175, h: 62, angle: chance(0.5) ? 0 : Math.PI / 2 });
    }
  }

  if (game.biome.id === "tundra") {
    for (let i = 0; i < 7; i += 1) {
      const radius = rand(54, 92);
      const p = clearWorldPoint(radius, 140, 18, true);
      game.hazards.push({ kind: "ice", x: p.x, y: p.y, r: radius });
    }
    for (let i = 0; i < 8; i += 1) {
      const radius = rand(48, 78);
      const p = clearWorldPoint(radius, 140, 18, true);
      game.hazards.push({ kind: "snow", x: p.x, y: p.y, r: radius });
    }
    for (let i = 0; i < 6; i += 1) {
      const p = clearWorldPoint(42, 190, 38, true);
      game.cover.push({ kind: "snowman", x: p.x, y: p.y, r: 34, hp: 95, maxHp: 95, built: false });
    }
  }
}

function rebuildBackground() {
  if (backgroundCanvas && backgroundBiome === game.biome.id) return;
  backgroundBiome = game.biome.id;
  backgroundCanvas = document.createElement("canvas");
  backgroundCanvas.width = WORLD.w;
  backgroundCanvas.height = WORLD.h;
  const bg = backgroundCanvas.getContext("2d");
  const gradient = bg.createLinearGradient(0, 0, WORLD.w, WORLD.h);
  gradient.addColorStop(0, game.biome.groundA);
  gradient.addColorStop(1, game.biome.groundB);
  bg.fillStyle = gradient;
  bg.fillRect(0, 0, WORLD.w, WORLD.h);

  bg.save();
  bg.globalAlpha = 0.28;
  for (let i = 0; i < 7; i += 1) {
    const y = rand(140, WORLD.h - 140);
    bg.beginPath();
    bg.moveTo(-80, y);
    for (let x = -80; x <= WORLD.w + 80; x += 170) {
      bg.quadraticCurveTo(x + 70, y + Math.sin((x + i * 60) * 0.01) * 75, x + 170, y + rand(-40, 40));
    }
    bg.lineWidth = rand(54, 92);
    bg.strokeStyle = game.biome.path;
    bg.lineCap = "round";
    bg.stroke();
  }
  bg.restore();

  for (let i = 0; i < 140; i += 1) {
    const x = Math.random() * WORLD.w;
    const y = Math.random() * WORLD.h;
    const rx = rand(35, 140);
    const ry = rand(18, 70);
    const patch = bg.createRadialGradient(x - rx * 0.3, y - ry * 0.45, 4, x, y, rx);
    if (game.biome.id === "farmyard") {
      patch.addColorStop(0, "rgba(185, 232, 104, 0.45)");
      patch.addColorStop(1, "rgba(64, 139, 65, 0.05)");
    } else if (game.biome.id === "forest") {
      patch.addColorStop(0, "rgba(44, 110, 67, 0.38)");
      patch.addColorStop(1, "rgba(159, 218, 111, 0.04)");
    } else {
      patch.addColorStop(0, "rgba(255, 255, 255, 0.62)");
      patch.addColorStop(1, "rgba(96, 178, 211, 0.06)");
    }
    bg.globalAlpha = rand(0.32, 0.78);
    bg.fillStyle = patch;
    bg.beginPath();
    bg.ellipse(x, y, rx, ry, rand(-0.8, 0.8), 0, TAU);
    bg.fill();
  }

  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * WORLD.w;
    const y = Math.random() * WORLD.h;
    const s = rand(1, 4);
    bg.globalAlpha = rand(0.07, 0.22);
    bg.fillStyle = chance(0.6) ? game.biome.texture : "#fffdf2";
    bg.beginPath();
    bg.ellipse(x, y, s * 1.6, s, rand(0, TAU), 0, TAU);
    bg.fill();
  }

  for (let i = 0; i < 3200; i += 1) {
    const x = Math.random() * WORLD.w;
    const y = Math.random() * WORLD.h;
    const blade = rand(4, 13);
    const lean = rand(-4, 4);
    bg.globalAlpha = game.biome.id === "tundra" ? rand(0.06, 0.15) : rand(0.12, 0.34);
    bg.strokeStyle = game.biome.id === "forest" ? (chance(0.55) ? "#1f6b42" : "#93ce62") : game.biome.id === "tundra" ? "#ffffff" : (chance(0.5) ? "#3f9e4e" : "#bee86a");
    bg.lineWidth = rand(1, 2.5);
    bg.beginPath();
    bg.moveTo(x, y);
    bg.quadraticCurveTo(x + lean * 0.4, y - blade * 0.45, x + lean, y - blade);
    bg.stroke();
  }

  for (let i = 0; i < 220; i += 1) {
    const x = Math.random() * WORLD.w;
    const y = Math.random() * WORLD.h;
    bg.globalAlpha = rand(0.2, 0.5);
    bg.fillStyle = chance(0.5) ? "#ffd84a" : "#fff7dc";
    bg.beginPath();
    bg.arc(x, y, rand(1.4, 3.2), 0, TAU);
    bg.fill();
  }
  bg.globalAlpha = 1;

  bg.save();
  bg.strokeStyle = "rgba(37,25,13,0.12)";
  bg.lineWidth = 12;
  bg.strokeRect(6, 6, WORLD.w - 12, WORLD.h - 12);
  bg.strokeStyle = "rgba(255,255,255,0.36)";
  bg.lineWidth = 4;
  bg.strokeRect(12, 12, WORLD.w - 24, WORLD.h - 24);
  bg.restore();
}

function startWave() {
  game.waveDamage = 0;
  game.rank = "S";
  game.pendingFoxes = Math.floor(8 + game.wave * 2.25);
  game.spawnTimer = 0.4;
  game.state = "playing";
  game.nextWaveTimer = 0;
  spawnWaveLoot();
  showBanner(`Wave ${game.wave}`);
}

function spawnWaveLoot() {
  const eggCount = 2 + Math.floor(game.wave / 4);
  for (let i = 0; i < eggCount; i += 1) spawnEgg();
  for (let i = 0; i < 3 + Math.floor(game.wave / 3); i += 1) spawnMaterialPickup();
  if (game.wave === 2) spawnWeaponPickup("triple");
  if (game.wave === 3) spawnWeaponPickup("sword");
  if (game.wave === 5) spawnWeaponPickup("hammer");
  if (chance(0.65)) spawnPowerPickup();
  if (chance(0.35 + game.wave * 0.01)) spawnFeed();
}

function spawnEgg() {
  const p = safeWorldPoint();
  game.eggs.push({ x: p.x, y: p.y, r: 20, bob: rand(0, TAU) });
}

function spawnFeed() {
  const p = safeWorldPoint();
  game.feed.push({ x: p.x, y: p.y, r: 19, bob: rand(0, TAU) });
}

function spawnMaterialPickup(x = null, y = null, value = null) {
  const p = x === null || y === null ? safeWorldPoint() : { x, y };
  const amount = value === null ? Math.floor(rand(8, 15)) : value;
  game.pickups.push({
    x: p.x,
    y: p.y,
    r: 20,
    kind: "material",
    item: "parts",
    code: `+${amount}`,
    name: "Parts",
    value: amount,
    bob: rand(0, TAU),
  });
}

function spawnWeaponPickup(kind) {
  const p = safeWorldPoint();
  const names = { triple: "Tri-Barrel", sword: "Sword", hammer: "Hammer" };
  const codes = { triple: "3X", sword: "SW", hammer: "HM" };
  game.pickups.push({
    x: p.x,
    y: p.y,
    r: 23,
    kind: "weapon",
    item: kind,
    code: codes[kind],
    name: names[kind],
    bob: rand(0, TAU),
  });
}

function spawnPowerPickup() {
  const p = safeWorldPoint();
  const pool = ["hot", "boots", "yolk", "acid", "flame", "multi", "pressure", "leak"];
  const item = pool[Math.floor(Math.random() * pool.length)];
  const code = item === "pressure" ? "PWR" : BUFFS[item].code;
  const name = item === "pressure" ? "Pressure Pump" : BUFFS[item].name;
  game.pickups.push({ x: p.x, y: p.y, r: 23, kind: "power", item, code, name, bob: rand(0, TAU) });
}

function showBanner(text) {
  ui.banner.textContent = text;
  ui.banner.classList.add("show");
  bannerTimer = 2.2;
}

function addScore(points) {
  game.score += points;
  if (game.score > game.best) {
    game.best = game.score;
    localStorage.setItem("fowl-play-best", String(game.best));
  }
}

function updateMouseWorld() {
  game.mouse.wx = game.mouse.x + game.camera.x;
  game.mouse.wy = game.mouse.y + game.camera.y;
}

function updateAim() {
  updateMouseWorld();
  let targetX = game.mouse.wx;
  let targetY = game.mouse.wy;
  let best = null;
  let bestD = 9999;
  for (const fox of game.foxes) {
    const sx = fox.x - game.camera.x;
    const sy = fox.y - game.camera.y;
    const d = dist(sx, sy, game.mouse.x, game.mouse.y);
    if (d < bestD && d < 92) {
      best = fox;
      bestD = d;
    }
  }
  game.aim.snapped = Boolean(best);
  if (best) {
    targetX = lerp(targetX, best.x, 0.58);
    targetY = lerp(targetY, best.y, 0.58);
  }
  game.aim.x = targetX;
  game.aim.y = targetY;
  game.aim.angle = angleTo(game.player.x, game.player.y, targetX, targetY);
}

function update(dt) {
  if (game.paused) {
    hudTimer += dt;
    if (hudTimer > 0.12) updateHud();
    return;
  }

  if (bannerTimer > 0) {
    bannerTimer -= dt;
    if (bannerTimer <= 0) ui.banner.classList.remove("show");
  }

  updateAim();
  updateBuffs(dt);

  if (game.state === "gameover") {
    updateParticles(dt);
    updateCamera(dt);
    hudTimer += dt;
    if (hudTimer > 0.1) updateHud();
    return;
  }

  updatePlayer(dt);
  updateHistory();
  updateFlockPositions();
  updateCooldowns(dt);

  if (game.state === "playing") {
    updateWave(dt);
    updateFoxes(dt);
    updateDefenses(dt);
    updateBullets(dt);
    updateFire(dt);
    updateBull(dt);
  }

  updateParticles(dt);
  updatePickups(dt);
  updateCamera(dt);

  if ((game.mouse.down || keys.has(" ")) && game.state === "playing") {
    attemptUseSelectedWeapon();
  }

  hudTimer += dt;
  if (hudTimer > 0.08) updateHud();
}

function updateCooldowns(dt) {
  const player = game.player;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.kickCooldown = Math.max(0, player.kickCooldown - dt);
  player.swordCooldown = Math.max(0, player.swordCooldown - dt);
  player.hammerCooldown = Math.max(0, player.hammerCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);
}

function updateBuffs(dt) {
  game.player.sizeScale = game.buffs.yolk ? 1.55 : 1;
  if (game.state !== "playing") return;
  for (const [key, buff] of Object.entries(game.buffs)) {
    buff.time -= dt;
    if (buff.time <= 0) delete game.buffs[key];
  }
  if (game.buffs.leak && game.state === "playing") {
    game.player.water = Math.max(0, game.player.water - dt * 1.8);
  }
}

function getTerrainEffect(x, y) {
  const effect = { slow: 1, ice: false, damage: 0, inLog: false };
  for (const hazard of game.hazards) {
    const d = dist(x, y, hazard.x, hazard.y);
    if (d < hazard.r) {
      if (hazard.kind === "mud") effect.slow = Math.min(effect.slow, 0.56);
      if (hazard.kind === "web") effect.slow = Math.min(effect.slow, 0.34);
      if (hazard.kind === "snow") effect.slow = Math.min(effect.slow, 0.52);
      if (hazard.kind === "ice") effect.ice = true;
      if (hazard.kind === "thorns") {
        effect.slow = Math.min(effect.slow, 0.78);
        effect.damage = 7;
      }
    }
  }
  for (const log of game.logs) {
    if (pointInLog(x, y, log)) effect.inLog = true;
  }
  return effect;
}

function pointInLog(x, y, log) {
  const horizontal = Math.abs(log.angle) < 0.01;
  const w = horizontal ? log.w : log.h;
  const h = horizontal ? log.h : log.w;
  return x > log.x - w / 2 && x < log.x + w / 2 && y > log.y - h / 2 && y < log.y + h / 2;
}

function updatePlayer(dt) {
  const p = game.player;
  let ix = 0;
  let iy = 0;
  if (keys.has("w") || keys.has("arrowup")) iy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) iy += 1;
  if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
  if (keys.has("d") || keys.has("arrowright")) ix += 1;
  const len = Math.hypot(ix, iy) || 1;
  ix /= len;
  iy /= len;

  const terrain = getTerrainEffect(p.x, p.y);
  p.inLog = terrain.inLog;
  let speed = p.baseSpeed * terrain.slow;
  if (game.buffs.boots) speed *= 1.5;
  if (game.buffs.yolk) speed *= 0.92;

  const desiredX = ix * speed;
  const desiredY = iy * speed;
  if (terrain.ice) {
    p.vx = lerp(p.vx, desiredX, dt * 2.4);
    p.vy = lerp(p.vy, desiredY, dt * 2.4);
  } else {
    p.vx = lerp(p.vx, desiredX, dt * 13);
    p.vy = lerp(p.vy, desiredY, dt * 13);
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = clamp(p.x, 30, WORLD.w - 30);
  p.y = clamp(p.y, 30, WORLD.h - 30);

  for (const obstacle of game.obstacles) resolveCircleRect(p, obstacle);
  if (terrain.damage > 0) damagePlayer(terrain.damage * dt);

  if (game.buffs.boots && Math.hypot(p.vx, p.vy) > 120 && chance(0.45)) {
    game.fire.push({ x: p.x - Math.cos(game.aim.angle) * 16, y: p.y - Math.sin(game.aim.angle) * 16, r: 25, life: 1.4, maxLife: 1.4, damage: 16 });
  }

  for (const source of game.waterSources) {
    const near = dist(p.x, p.y, source.x, source.y) < source.r + p.r + 48;
    if (near && source.active) {
      p.water = Math.min(p.maxWater, p.water + 24 * dt);
      if (p.water < p.maxWater) spawnParticle(source.x, source.y - 24, "#38bdf8", 1);
    }
  }
}

function damagePlayer(amount) {
  const p = game.player;
  if (p.invuln > 0 || game.state !== "playing") return;
  p.health = Math.max(0, p.health - amount);
  p.invuln = 0.42;
  game.waveDamage += amount;
  game.rank = game.waveDamage <= 0 ? "S" : game.waveDamage < 22 ? "A" : game.waveDamage < 55 ? "B" : "C";
  for (let i = 0; i < 12; i += 1) spawnParticle(p.x, p.y, "#e64f35", rand(0.7, 1.2));
  if (p.health <= 0) endRun(false);
}

function updateHistory() {
  game.history.unshift({ x: game.player.x, y: game.player.y, angle: game.aim.angle });
  const maxHistory = Math.max(260, game.flock.length * 18 + 180);
  if (game.history.length > maxHistory) game.history.length = maxHistory;
}

function updateFlockPositions() {
  for (let i = 0; i < game.flock.length; i += 1) {
    const bird = game.flock[i];
    const index = Math.min(game.history.length - 1, 16 + i * 15);
    const point = game.history[index] || game.history[game.history.length - 1] || game.player;
    bird.x = point.x;
    bird.y = point.y;
    bird.angle = point.angle || 0;
  }
}

function addChick() {
  game.flock.push({
    id: chickId,
    x: game.player.x,
    y: game.player.y,
    angle: 0,
    adult: false,
    glow: 0,
  });
  chickId += 1;
  addScore(50);
}

function attemptUseSelectedWeapon() {
  if (game.state !== "playing") return;
  const item = game.hotbar[game.selectedSlot];
  if (!item || !item.unlock) {
    game.selectedSlot = 0;
    return;
  }
  if (item.id === "sword") {
    swingSword();
    return;
  }
  if (item.id === "hammer") {
    useHammer();
    return;
  }
  shootWatergun(item);
}

function shootWatergun(item) {
  const p = game.player;
  if (p.inLog) return;
  if (p.fireCooldown > 0) return;
  if (p.water <= 0) {
    kick();
    return;
  }
  const hasTwin = Boolean(game.waterUpgrades.twin);
  const hasRapid = Boolean(game.waterUpgrades.rapid);
  const hasShotgun = Boolean(game.waterUpgrades.shotgun);
  const hasBazooka = Boolean(game.waterUpgrades.bazooka);
  const cost = Math.min(p.water, item.cost + (hasBazooka ? 1 : 0));
  p.water -= cost;
  p.fireCooldown = item.cooldown * (hasRapid ? 0.58 : 1) * (game.buffs.flame ? 0.78 : 1);
  const angle = game.aim.angle;
  const streams = (item.id === "triple" ? 3 : 1) + (hasTwin ? 1 : 0) + (game.buffs.multi ? 2 : 0);
  const spread = (streams - 1) * (game.buffs.yolk ? 0.16 : hasShotgun ? 0.13 : 0.095);
  const baseDamage = 20 + game.pressureLevel * 5;
  const damageMult = game.buffs.hot ? 2 : 1;
  const knockMult = game.buffs.hot ? 1.8 : 1;

  if (game.buffs.flame) {
    for (let i = 0; i < 7; i += 1) {
      const offset = rand(-0.33, 0.33) + (game.buffs.yolk ? rand(-0.18, 0.18) : 0);
      spawnBullet(p.x + Math.cos(angle) * 30, p.y + Math.sin(angle) * 30, angle + offset, rand(340, 430), 230, 11 * damageMult, rand(8, 12), 86 * knockMult, "#ff7a24", { kind: "player" }, "flame");
    }
  } else {
    for (let i = 0; i < streams; i += 1) {
      const t = streams === 1 ? 0 : i / (streams - 1) - 0.5;
      const shotAngle = angle + t * spread;
      const color = game.buffs.acid ? "#62e36d" : game.buffs.hot ? "#e64f35" : "#38bdf8";
      spawnBullet(p.x + Math.cos(shotAngle) * 30, p.y + Math.sin(shotAngle) * 30, shotAngle, 620, 650, baseDamage * damageMult, game.buffs.yolk ? 10 : 7, 165 * knockMult, color, { kind: "player" }, game.buffs.acid ? "acid" : "water");
    }
    if (hasShotgun) {
      for (let i = 0; i < 5; i += 1) {
        const t = i / 4 - 0.5;
        const pelletAngle = angle + t * 0.46 + rand(-0.035, 0.035);
        const color = game.buffs.acid ? "#62e36d" : game.buffs.hot ? "#e64f35" : "#9af8ff";
        spawnBullet(p.x + Math.cos(pelletAngle) * 32, p.y + Math.sin(pelletAngle) * 32, pelletAngle, 540, 360, 8.5 * damageMult, 4.2, 58 * knockMult, color, { kind: "player" }, "pellet");
      }
    }
    if (hasBazooka) {
      const color = game.buffs.acid ? "#62e36d" : game.buffs.hot ? "#e64f35" : "#38bdf8";
      spawnBullet(p.x + Math.cos(angle) * 38, p.y + Math.sin(angle) * 38, angle, 420, 760, (36 + game.pressureLevel * 4) * damageMult, 12, 270 * knockMult, color, { kind: "player" }, "splash");
    }
  }

  for (const bird of game.flock) {
    const birdDamage = (bird.adult ? 15 : 8) * damageMult + game.pressureLevel * 1.5;
    const radius = bird.adult ? 6.5 : 4.5;
    const color = bird.adult ? "#9af8ff" : "#bdefff";
    spawnBullet(bird.x, bird.y, angle + rand(-0.08, 0.08), 520, 560, birdDamage, radius, 92 * knockMult, color, { kind: "flock", id: bird.id }, "flock");
  }

  spawnParticle(p.x + Math.cos(angle) * 28, p.y + Math.sin(angle) * 28, game.buffs.flame ? "#ffb347" : "#38bdf8", 1.2);
}

function kick() {
  const p = game.player;
  if (p.kickCooldown > 0) return;
  p.kickCooldown = 0.78;
  const range = 92 * p.sizeScale;
  for (const fox of game.foxes) {
    const d = dist(p.x, p.y, fox.x, fox.y);
    if (d < range + fox.r) {
      const angle = angleTo(p.x, p.y, fox.x, fox.y);
      fox.vx += Math.cos(angle) * 290;
      fox.vy += Math.sin(angle) * 290;
      damageFox(fox, 22, 250, { kind: "kick" });
    }
  }
  for (const source of game.waterSources) {
    if (source.frozen && !source.active && dist(p.x, p.y, source.x, source.y) < source.r + 78) {
      source.cracks += 1;
      showBanner(source.cracks >= 2 ? "Frozen Well Open" : "Frozen Well Cracked");
      if (source.cracks >= 2) source.active = true;
      for (let i = 0; i < 18; i += 1) spawnParticle(source.x, source.y, "#e6fbff", 1);
    }
  }
  for (let i = 0; i < 20; i += 1) spawnParticle(p.x, p.y, "#fffdf2", 1.1);
}

function swingSword() {
  const p = game.player;
  if (p.swordCooldown > 0) return;
  p.swordCooldown = 0.48;
  const arc = 1.05;
  const range = 118 * p.sizeScale;
  let hits = 0;
  for (const fox of game.foxes) {
    const d = dist(p.x, p.y, fox.x, fox.y);
    if (d > range + fox.r) continue;
    let delta = Math.atan2(Math.sin(angleTo(p.x, p.y, fox.x, fox.y) - game.aim.angle), Math.cos(angleTo(p.x, p.y, fox.x, fox.y) - game.aim.angle));
    if (Math.abs(delta) < arc) {
      damageFox(fox, 42 + game.wave * 1.2, 240, { kind: "sword" });
      fox.vx += Math.cos(game.aim.angle) * 180;
      fox.vy += Math.sin(game.aim.angle) * 180;
      hits += 1;
    }
  }
  game.particles.push({ kind: "slash", x: p.x, y: p.y, angle: game.aim.angle, life: 0.18, maxLife: 0.18, r: range });
  if (hits > 0) addScore(hits * 8);
}

function useHammer() {
  const p = game.player;
  if (p.hammerCooldown > 0) return;
  p.hammerCooldown = 0.82;
  const target = findNearestRepairTarget(118);
  if (!target) {
    hammerPulse(p.x + Math.cos(game.aim.angle) * 58, p.y + Math.sin(game.aim.angle) * 58, "#ffd84a");
    showBanner("No Repair Target");
    return;
  }
  if (game.materials < 6) {
    hammerPulse(target.x, target.y, "#e64f35");
    showBanner("Need Parts");
    return;
  }
  const repair = Math.min(target.maxHp - target.hp, 42);
  const cost = Math.max(4, Math.ceil(repair / 7));
  if (repair <= 0) {
    showBanner("Already Repaired");
    return;
  }
  game.materials = Math.max(0, game.materials - cost);
  target.hp = Math.min(target.maxHp, target.hp + repair);
  hammerPulse(target.x, target.y, "#ffd84a");
  showBanner(`Repaired -${cost}`);
}

function hammerPulse(x, y, color) {
  for (let i = 0; i < 18; i += 1) spawnParticle(x, y, color, 1);
}

function findNearestRepairTarget(range) {
  let best = null;
  let bestD = Infinity;
  for (const cover of game.cover) {
    if (!cover.built || cover.hp >= cover.maxHp) continue;
    const d = dist(game.player.x, game.player.y, cover.x, cover.y);
    if (d < bestD && d < range + cover.r) {
      best = cover;
      bestD = d;
    }
  }
  return best;
}

function getBuildable(id) {
  return BUILDABLES.find((item) => item.id === id) || BUILDABLES[0];
}

function getWaterUpgrade(id) {
  return WATER_UPGRADES.find((item) => item.id === id) || WATER_UPGRADES[0];
}

function buyWaterUpgrade(id) {
  if (game.state !== "between") return;
  const upgrade = getWaterUpgrade(id);
  if (game.waterUpgrades[upgrade.id]) {
    showBanner("Already Owned");
    return;
  }
  if (game.materials < upgrade.cost) {
    showBanner("Need Parts");
    return;
  }
  game.materials -= upgrade.cost;
  game.waterUpgrades[upgrade.id] = true;
  if (upgrade.id === "bazooka") game.player.maxWater = Math.min(86, game.player.maxWater + 12);
  if (upgrade.id === "rapid") game.player.maxWater = Math.min(82, game.player.maxWater + 6);
  game.player.water = Math.min(game.player.maxWater, game.player.water + 18);
  showBanner(upgrade.name);
  updateHud();
}

function tryPlaceBuild() {
  if (game.state !== "between") return;
  const blueprint = getBuildable(game.selectedBuild);
  const x = clamp(game.mouse.wx, 60, WORLD.w - 60);
  const y = clamp(game.mouse.wy, 60, WORLD.h - 60);
  if (game.materials < blueprint.cost) {
    showBanner("Need Parts");
    return;
  }
  if (!canPlaceBuild(x, y, blueprint)) {
    showBanner("Blocked");
    return;
  }
  game.materials -= blueprint.cost;
  const built = {
    kind: blueprint.id,
    x,
    y,
    r: blueprint.r,
    w: blueprint.w,
    h: blueprint.h,
    hp: blueprint.hp,
    maxHp: blueprint.hp,
    built: true,
    angle: blueprint.id === "wall" ? game.buildRotation : game.aim.angle,
    cooldown: 0,
    range: blueprint.range || 0,
  };
  game.cover.push(built);
  addScore(25);
  hammerPulse(x, y, "#ffd84a");
  showBanner(`${blueprint.name} Built`);
}

function trySalvageBuild() {
  if (game.state !== "between") return;
  const target = getSalvageTargetAt(game.mouse.wx, game.mouse.wy);
  if (!target) {
    showBanner("No Built Object");
    return;
  }
  const refund = getSalvageValue(target);
  game.materials += refund;
  const index = game.cover.indexOf(target);
  if (index >= 0) game.cover.splice(index, 1);
  for (let i = 0; i < 22; i += 1) spawnParticle(target.x, target.y, "#ffd84a", rand(0.7, 1.2));
  showBanner(`Salvaged +${refund}`);
  updateHud();
}

function getSalvageTargetAt(x, y) {
  for (let i = game.cover.length - 1; i >= 0; i -= 1) {
    const cover = game.cover[i];
    if (!cover.built) continue;
    if (isWallCover(cover) && circleRotatedWallOverlap(x, y, 14, cover)) return cover;
    if (!isWallCover(cover) && dist(x, y, cover.x, cover.y) < cover.r + 16) return cover;
  }
  return null;
}

function getStructureCost(cover) {
  if (isWallCover(cover)) return getBuildable("wall").cost;
  if (cover.kind === "turret") return getBuildable("turret").cost;
  if (cover.kind === "spikes") return getBuildable("spikes").cost;
  return 0;
}

function getSalvageValue(cover) {
  const base = getStructureCost(cover);
  const healthRatio = clamp(cover.hp / cover.maxHp, 0.25, 1);
  return Math.max(1, Math.floor(base * 0.65 * healthRatio));
}

function canPlaceBuild(x, y, blueprint) {
  const radius = blueprint.r;
  if (dist(x, y, game.player.x, game.player.y) < radius + game.player.r + 34) return false;
  for (const source of game.waterSources) {
    if (dist(x, y, source.x, source.y) < radius + source.r + 34) return false;
  }
  for (const cover of game.cover) {
    if (blueprint.id === "wall" && isWallCover(cover)) {
      const closeEnoughToOverlap = dist(x, y, cover.x, cover.y) < Math.min(blueprint.w || 118, getWallDims(cover).w) * 0.42;
      if (closeEnoughToOverlap) return false;
      continue;
    }
    if (dist(x, y, cover.x, cover.y) < radius + cover.r + 22) return false;
  }
  for (const obstacle of game.obstacles) {
    if (circleRectOverlap(x, y, radius + 8, obstacle)) return false;
  }
  return true;
}

function rotateBuildSelection() {
  if (game.state !== "between" || game.buildAction !== "build" || game.selectedBuild !== "wall") return;
  game.buildRotation = (game.buildRotation + Math.PI / 4) % Math.PI;
  showBanner(`Wall ${getBuildRotationLabel()}`);
  updateHud();
}

function getBuildRotationLabel() {
  return `${Math.round((game.buildRotation * 180) / Math.PI)}deg`;
}

function spawnBullet(x, y, angle, speed, range, damage, r, knock, color, owner, type) {
  let bullet = game.bullets.find((item) => !item.active);
  if (!bullet) {
    bullet = { active: false };
    game.bullets.push(bullet);
  }
  Object.assign(bullet, {
    active: true,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    startX: x,
    startY: y,
    range,
    damage,
    r,
    knock,
    color,
    owner,
    type,
    life: range / speed,
  });
}

function updateWave(dt) {
  game.spawnTimer -= dt;
  if (game.pendingFoxes > 0 && game.spawnTimer <= 0) {
    spawnFox();
    game.pendingFoxes -= 1;
    game.spawnTimer = Math.max(0.18, 1.05 - game.wave * 0.025 + rand(-0.09, 0.12));
  }

  if (game.pendingFoxes <= 0 && game.foxes.length === 0 && game.state === "playing") {
    completeWave();
  }
}

function completeWave() {
  game.state = "between";
  delete game.buffs.leak;
  const rank = game.waveDamage <= 0 ? "S" : game.waveDamage < 22 ? "A" : game.waveDamage < 55 ? "B" : "C";
  const mult = rank === "S" ? 2.5 : rank === "A" ? 1.8 : rank === "B" ? 1.25 : 1;
  const waveScore = Math.floor((450 + game.wave * 130 + game.flock.length * 28) * mult);
  addScore(waveScore);
  game.rank = rank;
  game.nextWaveTimer = 0;
  if (chance(0.38)) spawnPowerPickup();
  if (chance(0.5)) spawnFeed();
  showBanner(`${rank} Rank Clear`);
}

function startNextWave() {
  if (game.state !== "between") return;
  game.buildAction = "build";
  game.wave += 1;
  if (game.wave > 30) {
    endRun(true);
    return;
  }
  if (getBiomeForWave(game.wave).id !== game.biome.id) setupBiome();
  startWave();
}

function spawnFox() {
  const edge = Math.floor(rand(0, 4));
  const fox = {
    x: edge === 0 ? -40 : edge === 1 ? WORLD.w + 40 : rand(0, WORLD.w),
    y: edge === 2 ? -40 : edge === 3 ? WORLD.h + 40 : rand(0, WORLD.h),
    vx: 0,
    vy: 0,
    r: 24,
    hp: 48 + game.wave * 5,
    maxHp: 48 + game.wave * 5,
    speed: 92 + game.wave * 2.3,
    variant: "fox",
    attackTimer: 0,
    wobble: rand(0, TAU),
  };
  const roll = Math.random();
  if (roll < Math.min(0.22, 0.05 + game.wave * 0.008)) {
    fox.variant = "runt";
    fox.r = 16;
    fox.hp = 30 + game.wave * 2.8;
    fox.maxHp = fox.hp;
    fox.speed = 150 + game.wave * 3;
  } else if (roll > Math.max(0.73, 0.9 - game.wave * 0.012)) {
    fox.variant = "bruiser";
    fox.r = 28;
    fox.hp = 108 + game.wave * 9;
    fox.maxHp = fox.hp;
    fox.speed = 66 + game.wave * 1.2;
  }
  game.foxes.push(fox);
}

function updateFoxes(dt) {
  for (let i = game.foxes.length - 1; i >= 0; i -= 1) {
    const fox = game.foxes[i];
    fox.attackTimer = Math.max(0, fox.attackTimer - dt);
    let target = game.player;
    let targetCover = null;

    for (const cover of game.cover) {
      const dCover = dist(fox.x, fox.y, cover.x, cover.y);
      const dPlayer = dist(fox.x, fox.y, game.player.x, game.player.y);
      const coverBetween = dist(cover.x, cover.y, (fox.x + game.player.x) / 2, (fox.y + game.player.y) / 2) < dPlayer * 0.34;
      if (dCover < 160 || coverBetween) {
        target = cover;
        targetCover = cover;
        break;
      }
    }

    for (const log of game.logs) {
      if (pointInLog(fox.x, fox.y, log)) {
        const horizontal = Math.abs(log.angle) < 0.01;
        fox.x += horizontal ? 0 : (fox.x < log.x ? -60 : 60) * dt;
        fox.y += horizontal ? (fox.y < log.y ? -60 : 60) * dt : 0;
      }
    }

    const angle = angleTo(fox.x, fox.y, target.x, target.y);
    fox.vx = lerp(fox.vx, Math.cos(angle) * fox.speed, dt * 3.8);
    fox.vy = lerp(fox.vy, Math.sin(angle) * fox.speed, dt * 3.8);

    for (const other of game.foxes) {
      if (other === fox) continue;
      const d = dist(fox.x, fox.y, other.x, other.y);
      if (d > 0 && d < fox.r + other.r + 8) {
        fox.vx += ((fox.x - other.x) / d) * 36;
        fox.vy += ((fox.y - other.y) / d) * 36;
      }
    }

    fox.x += fox.vx * dt;
    fox.y += fox.vy * dt;
    fox.x = clamp(fox.x, -80, WORLD.w + 80);
    fox.y = clamp(fox.y, -80, WORLD.h + 80);

    for (const obstacle of game.obstacles) resolveCircleRect(fox, obstacle);

    for (const cover of game.cover) {
      if (!isWallCover(cover)) continue;
      if (resolveCircleWall(fox, cover)) {
        cover.hp -= (fox.variant === "bruiser" ? 54 : 36) * dt;
        targetCover = cover;
        if (chance(0.12)) spawnParticle(cover.x, cover.y, "#d8a456", 0.8);
      }
    }

    if (targetCover && !isWallCover(targetCover) && dist(fox.x, fox.y, targetCover.x, targetCover.y) < fox.r + targetCover.r + 6) {
      targetCover.hp -= (fox.variant === "bruiser" ? 42 : 28) * dt;
      fox.vx *= 0.2;
      fox.vy *= 0.2;
      if (chance(0.08)) spawnParticle(targetCover.x, targetCover.y, "#fffdf2", 0.8);
    }

    for (const cover of game.cover) {
      if (cover.kind !== "spikes") continue;
      if (dist(fox.x, fox.y, cover.x, cover.y) < fox.r + cover.r) {
        fox.vx *= 0.82;
        fox.vy *= 0.82;
        cover.hp -= 5 * dt;
        damageFox(fox, 24 * dt, 34 * dt, { kind: "spikes" }, "impact", angleTo(cover.x, cover.y, fox.x, fox.y));
        if (fox.hp <= 0) break;
      }
    }
    if (fox.hp <= 0) continue;

    const playerRadius = game.player.r * game.player.sizeScale;
    if (!game.player.inLog && dist(fox.x, fox.y, game.player.x, game.player.y) < fox.r + playerRadius) {
      if (fox.attackTimer <= 0) {
        fox.attackTimer = fox.variant === "runt" ? 0.55 : 0.72;
        damagePlayer(fox.variant === "bruiser" ? 20 : 13);
        const push = angleTo(fox.x, fox.y, game.player.x, game.player.y);
        game.player.vx += Math.cos(push) * 260;
        game.player.vy += Math.sin(push) * 260;
      }
    }

    if (game.bull && game.bull.state === "sleeping" && dist(fox.x, fox.y, game.bull.x, game.bull.y) < fox.r + game.bull.r) {
      triggerBull(angleTo(fox.x, fox.y, game.bull.x, game.bull.y));
    }
  }

  for (let i = game.cover.length - 1; i >= 0; i -= 1) {
    if (game.cover[i].hp <= 0) {
      for (let p = 0; p < 14; p += 1) spawnParticle(game.cover[i].x, game.cover[i].y, "#fffdf2", 1);
      game.cover.splice(i, 1);
    }
  }
}

function updateDefenses(dt) {
  for (const cover of game.cover) {
    if (cover.kind !== "turret") continue;
    cover.cooldown = Math.max(0, cover.cooldown - dt);
    const target = findNearestFox(cover.x, cover.y, cover.range);
    if (!target) continue;
    cover.angle = angleTo(cover.x, cover.y, target.x, target.y);
    if (cover.cooldown > 0) continue;
    cover.cooldown = 0.64;
    spawnBullet(
      cover.x + Math.cos(cover.angle) * 28,
      cover.y + Math.sin(cover.angle) * 28,
      cover.angle,
      560,
      cover.range,
      17 + game.wave * 0.75,
      5.5,
      96,
      "#76f0ff",
      { kind: "turret" },
      "water"
    );
    spawnParticle(cover.x + Math.cos(cover.angle) * 30, cover.y + Math.sin(cover.angle) * 30, "#76f0ff", 0.8);
  }
}

function findNearestFox(x, y, range) {
  let best = null;
  let bestD = Infinity;
  for (const fox of game.foxes) {
    const d = dist(x, y, fox.x, fox.y);
    if (d < bestD && d < range) {
      best = fox;
      bestD = d;
    }
  }
  return best;
}

function updateBullets(dt) {
  for (const bullet of game.bullets) {
    if (!bullet.active) continue;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0 || dist(bullet.x, bullet.y, bullet.startX, bullet.startY) > bullet.range) {
      bullet.active = false;
      continue;
    }

    let blocked = false;
    for (const obstacle of game.obstacles) {
      if (circleRectOverlap(bullet.x, bullet.y, bullet.r, obstacle)) blocked = true;
    }
    if (blocked) {
      bullet.active = false;
      for (let i = 0; i < 4; i += 1) spawnParticle(bullet.x, bullet.y, bullet.color, 0.8);
      continue;
    }

    if (game.bull && game.bull.state === "sleeping" && dist(bullet.x, bullet.y, game.bull.x, game.bull.y) < bullet.r + game.bull.r) {
      triggerBull(Math.atan2(bullet.vy, bullet.vx));
      bullet.active = false;
      continue;
    }

    for (const fox of game.foxes) {
      if (!bullet.active) break;
      if (dist(bullet.x, bullet.y, fox.x, fox.y) < bullet.r + fox.r) {
        damageFox(fox, bullet.damage, bullet.knock, bullet.owner, bullet.type, Math.atan2(bullet.vy, bullet.vx));
        if (bullet.type === "splash") splashDamage(bullet.x, bullet.y, bullet.damage * 0.72, bullet.owner);
        bullet.active = false;
        for (let i = 0; i < 5; i += 1) spawnParticle(bullet.x, bullet.y, bullet.color, 1);
      }
    }
  }
}

function splashDamage(x, y, damage, owner) {
  for (const fox of [...game.foxes]) {
    const d = dist(x, y, fox.x, fox.y);
    if (d > 96 + fox.r) continue;
    const falloff = clamp(1 - d / 120, 0.25, 1);
    damageFox(fox, damage * falloff, 170 * falloff, owner, "impact", angleTo(x, y, fox.x, fox.y));
  }
  for (let i = 0; i < 22; i += 1) spawnParticle(x, y, "#9af8ff", rand(0.7, 1.4));
}

function damageFox(fox, amount, knock, owner, type = "impact", angle = angleTo(game.player.x, game.player.y, fox.x, fox.y)) {
  if (type === "acid") amount += 7;
  fox.hp -= amount;
  fox.vx += Math.cos(angle) * knock;
  fox.vy += Math.sin(angle) * knock;
  if (fox.hp <= 0) killFox(fox, owner);
}

function killFox(fox, owner) {
  const index = game.foxes.indexOf(fox);
  if (index === -1) return;
  game.foxes.splice(index, 1);
  addScore(fox.variant === "bruiser" ? 180 : fox.variant === "runt" ? 80 : 110);
  for (let i = 0; i < 18; i += 1) spawnParticle(fox.x, fox.y, fox.variant === "bruiser" ? "#b85e33" : "#ff8a31", rand(0.7, 1.2));

  if (owner && owner.kind === "flock") {
    const bird = game.flock.find((item) => item.id === owner.id);
    if (bird && !bird.adult) {
      bird.adult = true;
      bird.glow = 1.4;
      addScore(250);
      showBanner("Chick Evolved");
    }
  }

  if (chance(0.07)) spawnEgg();
  if (chance(0.055)) spawnPowerPickup();
  if (chance(0.045)) spawnFeed();
}

function updateFire(dt) {
  for (let i = game.fire.length - 1; i >= 0; i -= 1) {
    const flame = game.fire[i];
    flame.life -= dt;
    flame.r += dt * 7;
    for (const fox of game.foxes) {
      if (dist(flame.x, flame.y, fox.x, fox.y) < flame.r + fox.r) {
        damageFox(fox, flame.damage * dt, 42 * dt, { kind: "fire" }, "fire", angleTo(flame.x, flame.y, fox.x, fox.y));
      }
    }
    if (flame.life <= 0) game.fire.splice(i, 1);
  }
}

function updatePickups(dt) {
  for (const collection of [game.eggs, game.feed, game.pickups]) {
    for (const item of collection) item.bob += dt * 3.2;
  }

  for (let i = game.eggs.length - 1; i >= 0; i -= 1) {
    const egg = game.eggs[i];
    if (dist(game.player.x, game.player.y, egg.x, egg.y) < game.player.r * game.player.sizeScale + egg.r) {
      game.eggs.splice(i, 1);
      addChick();
      showBanner("Egg Hatched");
      for (let p = 0; p < 14; p += 1) spawnParticle(egg.x, egg.y, "#fffdf2", 1);
    }
  }

  for (let i = game.feed.length - 1; i >= 0; i -= 1) {
    const feed = game.feed[i];
    if (dist(game.player.x, game.player.y, feed.x, feed.y) < game.player.r * game.player.sizeScale + feed.r) {
      game.feed.splice(i, 1);
      game.player.health = Math.min(game.player.maxHealth, game.player.health + 34);
      addScore(35);
      showBanner("Chicken Feed");
    }
  }

  for (let i = game.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = game.pickups[i];
    if (pickup.kind === "material" && game.state !== "playing") continue;
    if (dist(game.player.x, game.player.y, pickup.x, pickup.y) < game.player.r * game.player.sizeScale + pickup.r) {
      game.pickups.splice(i, 1);
      applyPickup(pickup);
    }
  }
}

function applyPickup(pickup) {
  addScore(60);
  if (pickup.kind === "material") {
    game.materials += pickup.value;
    showBanner(`+${pickup.value} Parts`);
    return;
  }

  if (pickup.kind === "weapon") {
    const slot = game.hotbar.find((item) => item.id === pickup.item);
    if (slot) slot.unlock = true;
    game.selectedSlot = game.hotbar.findIndex((item) => item.id === pickup.item);
    showBanner(pickup.name);
    return;
  }

  if (pickup.item === "pressure") {
    game.pressureLevel = Math.min(5, game.pressureLevel + 1);
    game.player.maxWater = Math.min(72, game.player.maxWater + 5);
    game.player.water = Math.min(game.player.maxWater, game.player.water + 18);
    showBanner("Pressure Pump");
    return;
  }

  if (pickup.item === "yolk") {
    game.player.health = game.player.maxHealth;
  }

  game.buffs[pickup.item] = {
    ...BUFFS[pickup.item],
    time: BUFFS[pickup.item].duration,
    total: BUFFS[pickup.item].duration,
  };
  showBanner(BUFFS[pickup.item].name);
}

function updateBull(dt) {
  const bull = game.bull;
  if (!bull) return;
  bull.cooldown = Math.max(0, bull.cooldown - dt);
  if (bull.state !== "charging") return;
  bull.timer -= dt;
  bull.x += bull.vx * dt;
  bull.y += bull.vy * dt;
  bull.x = clamp(bull.x, 70, WORLD.w - 70);
  bull.y = clamp(bull.y, 70, WORLD.h - 70);
  for (const fox of game.foxes) {
    if (dist(bull.x, bull.y, fox.x, fox.y) < bull.r + fox.r) {
      damageFox(fox, 80, 420, { kind: "bull" }, "impact", bull.angle);
    }
  }
  if (dist(bull.x, bull.y, game.player.x, game.player.y) < bull.r + game.player.r) {
    damagePlayer(22);
    game.player.vx += Math.cos(bull.angle) * 420;
    game.player.vy += Math.sin(bull.angle) * 420;
  }
  if (bull.timer <= 0) {
    bull.state = "sleeping";
    bull.cooldown = 2.5;
    bull.vx = 0;
    bull.vy = 0;
  }
}

function triggerBull(angle) {
  const bull = game.bull;
  if (!bull || bull.cooldown > 0 || bull.state === "charging") return;
  bull.state = "charging";
  bull.angle = angle;
  bull.vx = Math.cos(angle) * 520;
  bull.vy = Math.sin(angle) * 520;
  bull.timer = 1.45;
  showBanner("Bull Charge");
}

function spawnParticle(x, y, color, scale = 1) {
  game.particles.push({
    kind: "dot",
    x,
    y,
    vx: rand(-90, 90) * scale,
    vy: rand(-110, 70) * scale,
    color,
    r: rand(3, 7) * scale,
    life: rand(0.32, 0.72),
    maxLife: 0.72,
  });
  if (game.particles.length > 380) game.particles.splice(0, game.particles.length - 380);
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const p = game.particles[i];
    p.life -= dt;
    if (p.kind === "dot") {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 140 * dt;
    }
    if (p.life <= 0) game.particles.splice(i, 1);
  }
}

function updateCamera(dt) {
  const targetX = clamp(game.player.x - game.view.w / 2, 0, WORLD.w - game.view.w);
  const targetY = clamp(game.player.y - game.view.h / 2, 0, WORLD.h - game.view.h);
  game.camera.x = lerp(game.camera.x, targetX, 1 - Math.pow(0.001, dt));
  game.camera.y = lerp(game.camera.y, targetY, 1 - Math.pow(0.001, dt));
}

function endRun(won) {
  game.state = "gameover";
  game.paused = false;
  game.runWon = won;
  if (game.score > game.best) {
    game.best = game.score;
    localStorage.setItem("fowl-play-best", String(game.best));
  }
  showBanner(won ? "Level 30 Cleared" : "Run Over");
}

function togglePause() {
  if (game.state === "gameover") return;
  game.paused = !game.paused;
  showBanner(game.paused ? "Paused" : game.state === "between" ? "Build Phase" : "Resumed");
  updateHud();
}

function draw() {
  ctx.setTransform(game.view.dpr, 0, 0, game.view.dpr, 0, 0);
  ctx.clearRect(0, 0, game.view.w, game.view.h);
  ctx.save();
  ctx.translate(-game.camera.x, -game.camera.y);

  ctx.drawImage(backgroundCanvas, 0, 0);
  drawHazards();
  drawWaterSources();
  drawObstacles();
  drawLogs();
  drawCover();
  drawBull();
  drawPickups();
  drawFire();
  drawBullets();
  drawFlock();
  drawPlayer();
  drawFoxes();
  drawParticles();
  drawBuildPreview();

  ctx.restore();
  drawReticle();
  if (game.paused) drawPauseOverlay();
  if (game.state === "gameover") drawGameOver();
}

function drawShadow(x, y, rx, ry, alpha = 0.22) {
  ctx.save();
  ctx.fillStyle = `rgba(37, 25, 13, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y + ry * 0.8, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawHazards() {
  for (const hazard of game.hazards) {
    if (hazard.kind === "mud") {
      const g = ctx.createRadialGradient(hazard.x - 16, hazard.y - 18, 4, hazard.x, hazard.y, hazard.r);
      g.addColorStop(0, "rgba(255, 220, 132, 0.72)");
      g.addColorStop(0.35, "rgba(143, 92, 48, 0.72)");
      g.addColorStop(1, "rgba(79, 48, 29, 0.5)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(hazard.x, hazard.y, hazard.r * 1.28, hazard.r * 0.74, rand(0, 0.01), 0, TAU);
      ctx.fill();
    }
    if (hazard.kind === "web") {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.74)";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.86;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, TAU);
      ctx.arc(hazard.x, hazard.y, hazard.r * 0.62, 0, TAU);
      ctx.arc(hazard.x, hazard.y, hazard.r * 0.32, 0, TAU);
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * TAU;
        ctx.moveTo(hazard.x, hazard.y);
        ctx.lineTo(hazard.x + Math.cos(a) * hazard.r, hazard.y + Math.sin(a) * hazard.r);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (hazard.kind === "thorns") {
      drawShadow(hazard.x, hazard.y, hazard.r, hazard.r * 0.35, 0.13);
      for (let i = 0; i < 13; i += 1) {
        const a = (i / 13) * TAU + Math.sin(hazard.x) * 0.2;
        ctx.strokeStyle = i % 2 ? "#315d37" : "#7ac765";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(hazard.x, hazard.y);
        ctx.quadraticCurveTo(hazard.x + Math.cos(a + 0.5) * hazard.r * 0.5, hazard.y + Math.sin(a + 0.5) * hazard.r * 0.5, hazard.x + Math.cos(a) * hazard.r, hazard.y + Math.sin(a) * hazard.r);
        ctx.stroke();
      }
    }
    if (hazard.kind === "ice") {
      const g = ctx.createRadialGradient(hazard.x - 20, hazard.y - 20, 4, hazard.x, hazard.y, hazard.r);
      g.addColorStop(0, "rgba(255,255,255,0.82)");
      g.addColorStop(0.55, "rgba(133,230,242,0.54)");
      g.addColorStop(1, "rgba(85,159,208,0.22)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(hazard.x, hazard.y, hazard.r * 1.24, hazard.r * 0.78, -0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hazard.x - hazard.r * 0.5, hazard.y - 4);
      ctx.lineTo(hazard.x + hazard.r * 0.42, hazard.y - hazard.r * 0.18);
      ctx.moveTo(hazard.x - 8, hazard.y + hazard.r * 0.36);
      ctx.lineTo(hazard.x + hazard.r * 0.58, hazard.y + hazard.r * 0.2);
      ctx.stroke();
    }
    if (hazard.kind === "snow") {
      const g = ctx.createRadialGradient(hazard.x - 12, hazard.y - 24, 4, hazard.x, hazard.y, hazard.r);
      g.addColorStop(0, "rgba(255,255,255,0.94)");
      g.addColorStop(1, "rgba(210,236,246,0.66)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(hazard.x, hazard.y, hazard.r * 1.16, hazard.r * 0.82, 0.16, 0, TAU);
      ctx.fill();
    }
  }
}

function drawWaterSources() {
  for (const source of game.waterSources) {
    source.pulse += 0.025;
    drawShadow(source.x, source.y, source.r * 1.08, source.r * 0.48, 0.2);
    if (game.biome.id === "forest") {
      const bark = ctx.createRadialGradient(source.x - 16, source.y - 18, 2, source.x, source.y, source.r);
      bark.addColorStop(0, "#c4874a");
      bark.addColorStop(1, "#6f4328");
      ctx.fillStyle = bark;
      ctx.beginPath();
      ctx.ellipse(source.x, source.y, source.r, source.r * 0.78, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = source.active ? "#38bdf8" : "#3c2a1c";
      ctx.beginPath();
      ctx.ellipse(source.x, source.y - 7, source.r * 0.58, source.r * 0.35, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = "#8d918a";
      ctx.beginPath();
      ctx.ellipse(source.x, source.y, source.r, source.r * 0.72, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#d9dfd4";
      ctx.lineWidth = 8;
      ctx.stroke();
      const water = ctx.createRadialGradient(source.x - 12, source.y - 12, 2, source.x, source.y, source.r * 0.75);
      water.addColorStop(0, source.active ? "#e6fbff" : "#ffffff");
      water.addColorStop(1, source.active ? "#38bdf8" : "#8ad9ef");
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.ellipse(source.x, source.y - 2, source.r * 0.62, source.r * 0.4, 0, 0, TAU);
      ctx.fill();
      if (source.frozen && !source.active) {
        ctx.strokeStyle = source.cracks ? "#7ab4c4" : "rgba(255,255,255,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(source.x - 24, source.y - 5);
        ctx.lineTo(source.x + 4, source.y - 16);
        ctx.lineTo(source.x + 24, source.y + 8);
        if (source.cracks > 0) {
          ctx.moveTo(source.x, source.y - 12);
          ctx.lineTo(source.x - 10, source.y + 18);
        }
        ctx.stroke();
      }
    }
  }
}

function drawObstacles() {
  for (const obstacle of game.obstacles) {
    if (obstacle.kind === "wagon") drawWagon(obstacle);
    else if (obstacle.kind === "windmill") drawWindmill(obstacle);
    else drawTractor(obstacle);
  }
}

function drawTractor(obstacle) {
  const cx = obstacle.x + obstacle.w / 2;
  const cy = obstacle.y + obstacle.h / 2;
  drawShadow(cx, cy + 16, obstacle.w * 0.52, obstacle.h * 0.42, 0.25);
  const body = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
  body.addColorStop(0, "#fff082");
  body.addColorStop(0.16, obstacle.color);
  body.addColorStop(1, "#843e2b");
  ctx.fillStyle = body;
  roundRect(obstacle.x + 18, obstacle.y + 18, obstacle.w * 0.72, obstacle.h * 0.48, 12);
  ctx.fill();
  ctx.fillStyle = "#353128";
  roundRect(obstacle.x + obstacle.w * 0.58, obstacle.y + 4, obstacle.w * 0.26, obstacle.h * 0.36, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(118,240,255,0.46)";
  roundRect(obstacle.x + obstacle.w * 0.62, obstacle.y + 8, obstacle.w * 0.18, obstacle.h * 0.2, 5);
  ctx.fill();
  ctx.strokeStyle = "#232018";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(obstacle.x + 14, obstacle.y + 18);
  ctx.lineTo(obstacle.x + 6, obstacle.y - 6);
  ctx.stroke();
  drawWheel(obstacle.x + 28, obstacle.y + obstacle.h + 1, 23);
  drawWheel(obstacle.x + obstacle.w - 24, obstacle.y + obstacle.h + 2, 29);
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.fillRect(obstacle.x + 30, obstacle.y + 25, obstacle.w * 0.42, 4);
}

function drawWagon(obstacle) {
  const cx = obstacle.x + obstacle.w / 2;
  const cy = obstacle.y + obstacle.h / 2;
  drawShadow(cx, cy + 20, obstacle.w * 0.54, obstacle.h * 0.42, 0.24);
  const bed = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
  bed.addColorStop(0, "#f0c16b");
  bed.addColorStop(0.28, obstacle.color);
  bed.addColorStop(1, "#613820");
  ctx.fillStyle = bed;
  roundRect(obstacle.x + 10, obstacle.y + 18, obstacle.w - 20, obstacle.h * 0.54, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.24)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i += 1) {
    const x = obstacle.x + 24 + i * ((obstacle.w - 48) / 3);
    ctx.beginPath();
    ctx.moveTo(x, obstacle.y + 20);
    ctx.lineTo(x, obstacle.y + obstacle.h * 0.68);
    ctx.stroke();
  }
  ctx.strokeStyle = "#6b3e22";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(obstacle.x + obstacle.w - 8, obstacle.y + obstacle.h * 0.52);
  ctx.lineTo(obstacle.x + obstacle.w + 38, obstacle.y + obstacle.h * 0.43);
  ctx.stroke();
  drawWheel(obstacle.x + 30, obstacle.y + obstacle.h, 18);
  drawWheel(obstacle.x + obstacle.w - 28, obstacle.y + obstacle.h, 18);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(obstacle.x + 20, obstacle.y + 25, obstacle.w * 0.64, 4);
}

function drawWindmill(obstacle) {
  const cx = obstacle.x + obstacle.w / 2;
  const cy = obstacle.y + obstacle.h / 2;
  drawShadow(cx, obstacle.y + obstacle.h, obstacle.w * 0.48, obstacle.h * 0.18, 0.22);
  const tower = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
  tower.addColorStop(0, "#fffdf2");
  tower.addColorStop(0.44, "#d8d4c3");
  tower.addColorStop(1, "#8d918a");
  ctx.fillStyle = tower;
  ctx.beginPath();
  ctx.moveTo(cx - 16, obstacle.y + obstacle.h);
  ctx.lineTo(cx + 16, obstacle.y + obstacle.h);
  ctx.lineTo(cx + 9, obstacle.y + 30);
  ctx.lineTo(cx - 9, obstacle.y + 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.24)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "#8b6a3d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 18, obstacle.y + obstacle.h * 0.72);
  ctx.lineTo(cx + 18, obstacle.y + obstacle.h * 0.46);
  ctx.moveTo(cx + 18, obstacle.y + obstacle.h * 0.72);
  ctx.lineTo(cx - 18, obstacle.y + obstacle.h * 0.46);
  ctx.stroke();
  const hubY = obstacle.y + 26;
  ctx.save();
  ctx.translate(cx, hubY);
  ctx.rotate((performance.now() * 0.0005) % TAU);
  ctx.strokeStyle = "#f2efe2";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i += 1) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -34);
    ctx.stroke();
    ctx.fillStyle = "rgba(118,240,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(4, -16);
    ctx.lineTo(18, -36);
    ctx.lineTo(-2, -30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#6b3e22";
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawWheel(x, y, r) {
  ctx.fillStyle = "#232018";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5c5545";
  ctx.lineWidth = Math.max(3, r * 0.16);
  ctx.stroke();
  ctx.fillStyle = "#fff7dc";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.38, 0, TAU);
  ctx.fill();
}

function drawLogs() {
  for (const log of game.logs) {
    ctx.save();
    ctx.translate(log.x, log.y);
    ctx.rotate(log.angle);
    drawShadow(0, 0, log.w * 0.5, log.h * 0.44, 0.18);
    const g = ctx.createLinearGradient(-log.w / 2, -log.h / 2, log.w / 2, log.h / 2);
    g.addColorStop(0, "#c98b4d");
    g.addColorStop(1, "#6d3c20");
    ctx.fillStyle = g;
    roundRect(-log.w / 2, -log.h / 2, log.w, log.h, 28);
    ctx.fill();
    ctx.fillStyle = "#2c1b12";
    ctx.beginPath();
    ctx.ellipse(-log.w / 2 + 18, 0, 26, 22, 0, 0, TAU);
    ctx.ellipse(log.w / 2 - 18, 0, 26, 22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawCover() {
  for (const cover of game.cover) {
    if (cover.kind === "turret") drawTurret(cover);
    else if (cover.kind === "spikes") drawSpikes(cover);
    else if (cover.kind === "snowman") drawSnowmanCover(cover);
    else drawBuiltWall(cover);
    drawStructureHealth(cover);
  }
}

function drawStructureHealth(cover) {
  const barW = isWallCover(cover) ? getWallDims(cover).w : cover.r * 2;
  ctx.fillStyle = "rgba(37,25,13,0.24)";
  ctx.fillRect(cover.x - barW / 2, cover.y + cover.r + 8, barW, 5);
  ctx.fillStyle = cover.hp / cover.maxHp > 0.36 ? "#55b86f" : "#e64f35";
  ctx.fillRect(cover.x - barW / 2, cover.y + cover.r + 8, barW * clamp(cover.hp / cover.maxHp, 0, 1), 5);
}

function drawSnowmanCover(cover) {
  drawShadow(cover.x, cover.y, cover.r * 1.15, cover.r * 0.5, 0.2);
  const g = ctx.createRadialGradient(cover.x - 14, cover.y - 18, 2, cover.x, cover.y, cover.r * 1.2);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#b9e6f2");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cover.x, cover.y + 10, cover.r, 0, TAU);
  ctx.arc(cover.x, cover.y - 22, cover.r * 0.68, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#25190d";
  ctx.beginPath();
  ctx.arc(cover.x - 8, cover.y - 27, 2.4, 0, TAU);
  ctx.arc(cover.x + 8, cover.y - 27, 2.4, 0, TAU);
  ctx.fill();
}

function drawBuiltWall(cover, preview = false) {
  const dims = getWallDims(cover);
  drawShadow(cover.x, cover.y, dims.w * 0.52, dims.h * 0.8, preview ? 0.11 : 0.22);
  const colorA = cover.kind === "logwall" ? "#b87942" : cover.kind === "haywall" ? "#f3c854" : "#b87942";
  const colorB = cover.kind === "logwall" ? "#6b3e22" : cover.kind === "haywall" ? "#c9892e" : "#674426";
  ctx.save();
  ctx.translate(cover.x, cover.y);
  ctx.rotate(cover.angle || 0);
  for (let i = -1; i <= 1; i += 1) {
    const y = i * dims.h * 0.3;
    const g = ctx.createLinearGradient(-dims.w / 2, y - 10, dims.w / 2, y + 18);
    g.addColorStop(0, "#fff0a7");
    g.addColorStop(0.18, colorA);
    g.addColorStop(1, colorB);
    ctx.fillStyle = g;
    roundRect(-dims.w / 2, y - dims.h * 0.16, dims.w, dims.h * 0.32, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(37,25,13,0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(-dims.w * 0.42, y - dims.h * 0.11, dims.w * 0.68, 3);
  }
  ctx.fillStyle = "rgba(37,25,13,0.18)";
  ctx.fillRect(-dims.w * 0.32, -dims.h * 0.64, 8, dims.h * 1.28);
  ctx.fillRect(dims.w * 0.32, -dims.h * 0.64, 8, dims.h * 1.28);
  ctx.restore();
}

function drawTurret(cover, preview = false) {
  drawShadow(cover.x, cover.y, cover.r * 1.05, cover.r * 0.5, preview ? 0.12 : 0.24);
  ctx.save();
  ctx.translate(cover.x, cover.y);
  const base = ctx.createRadialGradient(-cover.r * 0.3, -cover.r * 0.35, 2, 0, 0, cover.r * 1.15);
  base.addColorStop(0, "#fffdf2");
  base.addColorStop(0.42, "#7fd7f4");
  base.addColorStop(1, "#2e7cab");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.ellipse(0, cover.r * 0.1, cover.r * 0.78, cover.r * 0.58, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#4c6e7d";
  ctx.beginPath();
  ctx.ellipse(0, -cover.r * 0.16, cover.r * 0.52, cover.r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.rotate(cover.angle || 0);
  ctx.strokeStyle = "#21506d";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cover.r * 0.12, -cover.r * 0.16);
  ctx.lineTo(cover.r * 1.1, -cover.r * 0.16);
  ctx.stroke();
  ctx.strokeStyle = "#76f0ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cover.r * 0.64, -cover.r * 0.16);
  ctx.lineTo(cover.r * 1.22, -cover.r * 0.16);
  ctx.stroke();
  ctx.restore();
}

function drawSpikes(cover, preview = false) {
  drawShadow(cover.x, cover.y, cover.r * 1.05, cover.r * 0.42, preview ? 0.1 : 0.2);
  ctx.save();
  ctx.translate(cover.x, cover.y);
  ctx.fillStyle = "rgba(95,63,35,0.56)";
  ctx.beginPath();
  ctx.ellipse(0, 4, cover.r * 0.9, cover.r * 0.55, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * TAU + 0.22;
    const px = Math.cos(a) * cover.r * 0.45;
    const py = Math.sin(a) * cover.r * 0.28 + 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI / 2);
    const g = ctx.createLinearGradient(0, -cover.r * 0.54, 0, cover.r * 0.16);
    g.addColorStop(0, "#fff7dc");
    g.addColorStop(0.32, "#d8a456");
    g.addColorStop(1, "#6b3e22");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -cover.r * 0.6);
    ctx.lineTo(cover.r * 0.14, cover.r * 0.12);
    ctx.lineTo(-cover.r * 0.14, cover.r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBull() {
  const bull = game.bull;
  if (!bull) return;
  drawShadow(bull.x, bull.y, 54, 24, 0.24);
  ctx.save();
  ctx.translate(bull.x, bull.y);
  ctx.rotate(bull.state === "charging" ? bull.angle : 0);
  const g = ctx.createRadialGradient(-18, -16, 4, 0, 0, 62);
  g.addColorStop(0, "#b98652");
  g.addColorStop(1, "#5b3821");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 32, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#6f4328";
  ctx.beginPath();
  ctx.ellipse(38, -5, 26, 22, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#fff7dc";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(45, -20);
  ctx.quadraticCurveTo(66, -28, 70, -6);
  ctx.moveTo(45, 12);
  ctx.quadraticCurveTo(66, 24, 70, 3);
  ctx.stroke();
  if (bull.state === "sleeping") {
    ctx.fillStyle = "#fff7dc";
    ctx.font = "900 18px Nunito";
    ctx.fillText("Z", -8, -42);
    ctx.fillText("z", 10, -54);
  }
  ctx.restore();
}

function drawPickups() {
  for (const egg of game.eggs) drawEggPickup(egg.x, egg.y + Math.sin(egg.bob) * 4, egg.r);
  for (const feed of game.feed) drawFeedPickup(feed.x, feed.y + Math.sin(feed.bob) * 4, feed.r);
  for (const pickup of game.pickups) {
    if (pickup.kind === "material") {
      drawPartsPickup(pickup.x, pickup.y + Math.sin(pickup.bob) * 4, pickup.r, pickup.value);
      continue;
    }
    if (pickup.kind === "weapon") {
      drawWeaponPickup(pickup.x, pickup.y + Math.sin(pickup.bob) * 4, pickup.r, pickup.item);
      continue;
    }
    drawPowerPickup(pickup.x, pickup.y + Math.sin(pickup.bob) * 4, pickup.r, pickup.item, pickup.code);
  }
}

function drawEggPickup(x, y, r) {
  drawShadow(x, y, r * 0.9, r * 0.34, 0.18);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.45, 3, x, y, r * 1.1);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.62, "#fff7dc");
  g.addColorStop(1, "#d9b35c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.72, r, 0.08, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.22, y - r * 0.32, r * 0.18, r * 0.34, 0.5, 0, TAU);
  ctx.fill();
}

function drawFeedPickup(x, y, r) {
  drawShadow(x, y, r, r * 0.34, 0.18);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, "#fff0a7");
  g.addColorStop(0.48, "#f4c54f");
  g.addColorStop(1, "#a85c2a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - r * 0.7);
  ctx.lineTo(x + r * 0.62, y - r * 0.56);
  ctx.lineTo(x + r * 0.78, y + r * 0.72);
  ctx.lineTo(x - r * 0.64, y + r * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#8e5930";
  ctx.font = `900 ${Math.max(9, r * 0.48)}px Nunito`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FEED", x, y + 1);
}

function drawPartsPickup(x, y, r, value) {
  drawShadow(x, y, r * 1.05, r * 0.36, 0.2);
  const crate = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  crate.addColorStop(0, "#f0c16b");
  crate.addColorStop(0.45, "#b87942");
  crate.addColorStop(1, "#613820");
  ctx.fillStyle = crate;
  roundRect(x - r * 0.82, y - r * 0.62, r * 1.64, r * 1.18, 5);
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.3)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.72, y - r * 0.28);
  ctx.lineTo(x + r * 0.72, y + r * 0.28);
  ctx.moveTo(x + r * 0.72, y - r * 0.28);
  ctx.lineTo(x - r * 0.72, y + r * 0.28);
  ctx.stroke();
  ctx.fillStyle = "#d7dee0";
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y - r * 0.18, r * 0.16, 0, TAU);
  ctx.arc(x + r * 0.34, y + r * 0.2, r * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#25190d";
  ctx.font = `900 ${Math.max(9, r * 0.44)}px Nunito`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), x, y + r * 0.02);
}

function drawWeaponPickup(x, y, r, item) {
  drawShadow(x, y, r * 1.1, r * 0.36, 0.19);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.22);
  if (item === "hammer") {
    ctx.strokeStyle = "#8e5930";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.48);
    ctx.lineTo(r * 0.42, -r * 0.44);
    ctx.stroke();
    ctx.fillStyle = "#7f8b91";
    roundRect(r * 0.1, -r * 0.76, r * 0.72, r * 0.34, 5);
    ctx.fill();
  } else if (item === "sword") {
    ctx.strokeStyle = "#d7dee0";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, r * 0.52);
    ctx.lineTo(r * 0.62, -r * 0.62);
    ctx.stroke();
    ctx.strokeStyle = "#8e5930";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.18);
    ctx.lineTo(-r * 0.18, r * 0.55);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#2b6791";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 0.64, r * 0.18);
    ctx.lineTo(r * 0.68, -r * 0.24);
    ctx.stroke();
    ctx.strokeStyle = "#76f0ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * 0.03);
    ctx.lineTo(r * 0.78, -r * 0.28);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPowerPickup(x, y, r, item, code) {
  drawShadow(x, y, r, r * 0.34, 0.18);
  if (item === "boots") {
    ctx.fillStyle = "#ffd84a";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y, r * 0.42, r * 0.7, -0.35, 0, TAU);
    ctx.ellipse(x + r * 0.28, y, r * 0.42, r * 0.7, 0.35, 0, TAU);
    ctx.fill();
  } else if (item === "yolk") {
    ctx.fillStyle = "#fff7dc";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.86, r * 0.74, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffd84a";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42, 0, TAU);
    ctx.fill();
  } else {
    const color = item === "acid" ? "#62e36d" : item === "flame" ? "#e64f35" : item === "leak" ? "#7161ef" : "#ff8a31";
    ctx.fillStyle = color;
    roundRect(x - r * 0.42, y - r * 0.72, r * 0.84, r * 1.34, 6);
    ctx.fill();
    ctx.fillStyle = "#fff7dc";
    roundRect(x - r * 0.24, y - r * 0.96, r * 0.48, r * 0.32, 4);
    ctx.fill();
  }
  ctx.fillStyle = "#25190d";
  ctx.font = `900 ${Math.max(8, r * 0.42)}px Nunito`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(code, x, y + r * 0.08);
}

function drawPickupDisc(x, y, r, code, inner, outer) {
  drawShadow(x, y, r * 1.1, r * 0.42, 0.2);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, 3, x, y, r * 1.25);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.28, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.24)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#25190d";
  ctx.font = `900 ${Math.max(10, r * 0.52)}px Nunito`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(code, x, y + 1);
}

function drawFire() {
  for (const flame of game.fire) {
    const alpha = clamp(flame.life / flame.maxLife, 0, 1);
    const g = ctx.createRadialGradient(flame.x, flame.y, 2, flame.x, flame.y, flame.r);
    g.addColorStop(0, `rgba(255, 244, 117, ${0.65 * alpha})`);
    g.addColorStop(0.5, `rgba(255, 122, 36, ${0.45 * alpha})`);
    g.addColorStop(1, `rgba(230, 79, 53, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(flame.x, flame.y, flame.r, 0, TAU);
    ctx.fill();
  }
}

function drawBullets() {
  for (const bullet of game.bullets) {
    if (!bullet.active) continue;
    const g = ctx.createRadialGradient(bullet.x - bullet.r * 0.35, bullet.y - bullet.r * 0.5, 1, bullet.x, bullet.y, bullet.r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, bullet.color);
    g.addColorStop(1, "rgba(34,88,118,0.42)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(bullet.x, bullet.y, bullet.r * 1.25, bullet.r * 0.86, Math.atan2(bullet.vy, bullet.vx), 0, TAU);
    ctx.fill();
  }
}

function drawFlock() {
  for (let i = game.flock.length - 1; i >= 0; i -= 1) {
    const bird = game.flock[i];
    drawChicken(bird.x, bird.y, bird.adult ? 0.72 : 0.46, bird.angle, bird.adult ? "#fff1b9" : "#ffe66a", false);
    if (bird.glow > 0) {
      bird.glow -= 0.016;
      ctx.strokeStyle = `rgba(255, 216, 74, ${bird.glow})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, 33 + (1.4 - bird.glow) * 30, 0, TAU);
      ctx.stroke();
    }
  }
}

function drawPlayer() {
  const p = game.player;
  drawChicken(p.x, p.y, p.sizeScale, game.aim.angle, "#fff7dc", true);
}

function drawChicken(x, y, scale, angle, bodyColor, isPlayer) {
  const r = 24 * scale;
  drawShadow(x, y, r * 1.18, r * 0.5, isPlayer ? 0.26 : 0.18);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const body = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 2, -r * 0.08, 0, r * 1.38);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.34, bodyColor);
  body.addColorStop(1, isPlayer ? "#e6c06d" : "#d5a841");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, 0, r * 1.02, r * 0.72, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "rgba(214,141,44,0.2)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.18, -r * 0.43, r * 0.44, r * 0.22, -0.12, 0, TAU);
  ctx.ellipse(-r * 0.18, r * 0.43, r * 0.44, r * 0.22, 0.12, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  ctx.arc(-r * 0.18, -r * 0.04, r * 0.58, -2.65, -0.58);
  ctx.stroke();

  ctx.fillStyle = "#f4d86d";
  ctx.beginPath();
  ctx.moveTo(-r * 0.98, 0);
  ctx.quadraticCurveTo(-r * 1.32, -r * 0.34, -r * 1.08, -r * 0.55);
  ctx.quadraticCurveTo(-r * 0.82, -r * 0.34, -r * 0.68, -r * 0.1);
  ctx.quadraticCurveTo(-r * 0.82, r * 0.34, -r * 1.08, r * 0.55);
  ctx.quadraticCurveTo(-r * 1.32, r * 0.34, -r * 0.98, 0);
  ctx.fill();

  const head = ctx.createRadialGradient(r * 0.52, -r * 0.2, 2, r * 0.7, 0, r * 0.68);
  head.addColorStop(0, "#ffffff");
  head.addColorStop(0.5, bodyColor);
  head.addColorStop(1, isPlayer ? "#e7c673" : "#d1a53e");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(r * 0.64, 0, r * 0.48, r * 0.43, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#ffcf48";
  ctx.beginPath();
  ctx.moveTo(r * 1.05, -r * 0.12);
  ctx.lineTo(r * 1.44, 0);
  ctx.lineTo(r * 1.05, r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e64f35";
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(r * 0.48 + i * r * 0.13, -r * 0.36 - (i === 1 ? r * 0.08 : 0), r * 0.13, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#25190d";
  ctx.beginPath();
  ctx.arc(r * 0.82, -r * 0.14, Math.max(2, r * 0.07), 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(r * 0.84, -r * 0.16, Math.max(1, r * 0.023), 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#d88737";
  ctx.lineWidth = Math.max(2, r * 0.055);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.18, -r * 0.44);
  ctx.lineTo(-r * 0.22, -r * 0.72);
  ctx.moveTo(-r * 0.18, r * 0.44);
  ctx.lineTo(-r * 0.22, r * 0.72);
  ctx.stroke();
  ctx.strokeStyle = "#ffcf48";
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, -r * 0.72);
  ctx.lineTo(-r * 0.4, -r * 0.82);
  ctx.moveTo(-r * 0.22, -r * 0.72);
  ctx.lineTo(-r * 0.05, -r * 0.84);
  ctx.moveTo(-r * 0.22, r * 0.72);
  ctx.lineTo(-r * 0.4, r * 0.82);
  ctx.moveTo(-r * 0.22, r * 0.72);
  ctx.lineTo(-r * 0.05, r * 0.84);
  ctx.stroke();

  if (isPlayer) {
    const twin = Boolean(game.waterUpgrades.twin);
    const rapid = Boolean(game.waterUpgrades.rapid);
    const shotgun = Boolean(game.waterUpgrades.shotgun);
    const bazooka = Boolean(game.waterUpgrades.bazooka);
    const barrels = twin ? [-r * 0.25, r * 0.25] : [0];
    ctx.strokeStyle = bazooka ? "#27485d" : "#2b6791";
    ctx.lineWidth = (bazooka ? 11 : rapid ? 6 : 8) * scale;
    ctx.lineCap = "round";
    for (const offset of barrels) {
      ctx.beginPath();
      ctx.moveTo(r * 0.35, offset);
      ctx.lineTo(r * (bazooka ? 1.72 : 1.46), offset * 0.86);
      ctx.stroke();
      ctx.strokeStyle = shotgun ? "#76f0ff" : "#173d56";
      ctx.lineWidth = (shotgun ? 5 : 3) * scale;
      ctx.beginPath();
      ctx.moveTo(r * 0.86, offset * 0.9);
      ctx.lineTo(r * (shotgun ? 1.58 : 1.28), offset * 0.84);
      ctx.stroke();
      ctx.strokeStyle = bazooka ? "#27485d" : "#2b6791";
      ctx.lineWidth = (bazooka ? 11 : rapid ? 6 : 8) * scale;
    }
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4 * scale;
    for (const offset of barrels) {
      ctx.beginPath();
      ctx.moveTo(r * 1.1, offset * 0.86);
      ctx.lineTo(r * (bazooka ? 1.82 : 1.66), offset * 0.8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFoxes() {
  for (const fox of game.foxes) {
    drawShadow(fox.x, fox.y, fox.r * 1.38, fox.r * 0.38, 0.22);
    ctx.save();
    ctx.translate(fox.x, fox.y);
    ctx.rotate(angleTo(fox.x, fox.y, game.player.x, game.player.y));

    ctx.strokeStyle = "#6b2e22";
    ctx.lineWidth = Math.max(2, fox.r * 0.09);
    ctx.lineCap = "round";
    for (let leg = -1; leg <= 1; leg += 2) {
      ctx.beginPath();
      ctx.moveTo(-fox.r * 0.2, leg * fox.r * 0.28);
      ctx.lineTo(-fox.r * 0.1, leg * fox.r * 0.56);
      ctx.lineTo(fox.r * 0.16, leg * fox.r * 0.62);
      ctx.moveTo(fox.r * 0.44, leg * fox.r * 0.2);
      ctx.lineTo(fox.r * 0.58, leg * fox.r * 0.5);
      ctx.lineTo(fox.r * 0.82, leg * fox.r * 0.56);
      ctx.stroke();
    }

    const g = ctx.createRadialGradient(-fox.r * 0.34, -fox.r * 0.36, 2, 0, 0, fox.r * 1.45);
    g.addColorStop(0, fox.variant === "bruiser" ? "#d0935d" : "#ffc06e");
    g.addColorStop(0.46, "#d7652d");
    g.addColorStop(1, fox.variant === "bruiser" ? "#7a3d2a" : "#913421");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-fox.r * 0.08, 0, fox.r * 1.16, fox.r * 0.48, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,214,146,0.35)";
    ctx.lineWidth = Math.max(2, fox.r * 0.1);
    ctx.beginPath();
    ctx.arc(-fox.r * 0.28, -fox.r * 0.18, fox.r * 0.62, -2.6, -0.38);
    ctx.stroke();

    ctx.fillStyle = "#fff7dc";
    ctx.beginPath();
    ctx.moveTo(-fox.r * 0.86, -fox.r * 0.05);
    ctx.quadraticCurveTo(-fox.r * 1.72, -fox.r * 0.72, -fox.r * 2.08, -fox.r * 0.08);
    ctx.quadraticCurveTo(-fox.r * 1.6, fox.r * 0.26, -fox.r * 0.86, fox.r * 0.1);
    ctx.fill();

    ctx.fillStyle = fox.variant === "bruiser" ? "#a74d2f" : "#d94d2e";
    ctx.beginPath();
    ctx.ellipse(fox.r * 0.83, -fox.r * 0.04, fox.r * 0.5, fox.r * 0.36, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = fox.variant === "bruiser" ? "#8e3e2b" : "#bd4c27";
    ctx.beginPath();
    ctx.moveTo(fox.r * 0.48, -fox.r * 0.32);
    ctx.lineTo(fox.r * 0.62, -fox.r * 0.86);
    ctx.lineTo(fox.r * 0.86, -fox.r * 0.32);
    ctx.closePath();
    ctx.moveTo(fox.r * 0.88, -fox.r * 0.3);
    ctx.lineTo(fox.r * 1.1, -fox.r * 0.72);
    ctx.lineTo(fox.r * 1.18, -fox.r * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f5d3a2";
    ctx.beginPath();
    ctx.ellipse(fox.r * 1.18, fox.r * 0.03, fox.r * 0.24, fox.r * 0.15, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#25190d";
    ctx.beginPath();
    ctx.arc(fox.r * 1.38, fox.r * 0.02, fox.r * 0.065, 0, TAU);
    ctx.arc(fox.r * 0.88, -fox.r * 0.16, fox.r * 0.065, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(37,25,13,0.18)";
    ctx.lineWidth = Math.max(1, fox.r * 0.04);
    ctx.beginPath();
    ctx.moveTo(-fox.r * 0.58, fox.r * 0.08);
    ctx.quadraticCurveTo(-fox.r * 0.05, fox.r * 0.24, fox.r * 0.44, fox.r * 0.12);
    ctx.stroke();

    ctx.restore();
    ctx.fillStyle = "rgba(37,25,13,0.25)";
    ctx.fillRect(fox.x - fox.r, fox.y - fox.r - 16, fox.r * 2, 5);
    ctx.fillStyle = fox.variant === "bruiser" ? "#e64f35" : "#55b86f";
    ctx.fillRect(fox.x - fox.r, fox.y - fox.r - 16, fox.r * 2 * clamp(fox.hp / fox.maxHp, 0, 1), 5);
  }
}

function drawParticles() {
  for (const p of game.particles) {
    if (p.kind === "slash") {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, -0.8, 0.8);
      ctx.stroke();
      ctx.strokeStyle = `rgba(56,189,248,${alpha * 0.7})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.82, -0.75, 0.75);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawReticle() {
  const x = game.aim.x - game.camera.x;
  const y = game.aim.y - game.camera.y;
  ctx.save();
  ctx.strokeStyle = game.aim.snapped ? "#ffcf48" : "rgba(255,255,255,0.92)";
  ctx.lineWidth = game.aim.snapped ? 3 : 2;
  ctx.beginPath();
  ctx.arc(x, y, game.aim.snapped ? 17 : 13, 0, TAU);
  ctx.moveTo(x - 24, y);
  ctx.lineTo(x - 9, y);
  ctx.moveTo(x + 9, y);
  ctx.lineTo(x + 24, y);
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x, y - 9);
  ctx.moveTo(x, y + 9);
  ctx.lineTo(x, y + 24);
  ctx.stroke();
  ctx.restore();
}

function drawBuildPreview() {
  if (game.state !== "between" || game.paused) return;
  if (game.buildAction === "salvage") {
    drawSalvagePreview();
    return;
  }
  const blueprint = getBuildable(game.selectedBuild);
  const x = clamp(game.mouse.wx, 60, WORLD.w - 60);
  const y = clamp(game.mouse.wy, 60, WORLD.h - 60);
  const valid = game.materials >= blueprint.cost && canPlaceBuild(x, y, blueprint);
  ctx.save();
  ctx.globalAlpha = valid ? 0.72 : 0.38;
  if (blueprint.id === "wall") {
    drawBuiltWall({ x, y, r: blueprint.r, w: blueprint.w, h: blueprint.h, hp: blueprint.hp, maxHp: blueprint.hp, kind: "wall", angle: game.buildRotation }, true);
  } else if (blueprint.id === "turret") {
    drawTurret({ x, y, r: blueprint.r, hp: blueprint.hp, maxHp: blueprint.hp, kind: "turret", angle: game.aim.angle, range: blueprint.range }, true);
  } else {
    drawSpikes({ x, y, r: blueprint.r, hp: blueprint.hp, maxHp: blueprint.hp, kind: "spikes" }, true);
  }
  ctx.globalAlpha = valid ? 0.18 : 0.24;
  ctx.fillStyle = valid ? "#38bdf8" : "#e64f35";
  ctx.beginPath();
  ctx.arc(x, y, blueprint.r + 12, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSalvagePreview() {
  const target = getSalvageTargetAt(game.mouse.wx, game.mouse.wy);
  const x = game.mouse.wx;
  const y = game.mouse.wy;
  ctx.save();
  ctx.strokeStyle = target ? "#ffd84a" : "rgba(230,79,53,0.82)";
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 7]);
  if (target && isWallCover(target)) {
    const dims = getWallDims(target);
    ctx.translate(target.x, target.y);
    ctx.rotate(target.angle || 0);
    ctx.strokeRect(-dims.w / 2 - 8, -dims.h / 2 - 8, dims.w + 16, dims.h + 16);
  } else if (target) {
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.r + 16, 0, TAU);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(37,25,13,0.38)";
  ctx.fillRect(0, 0, game.view.w, game.view.h);
  const w = Math.min(360, game.view.w - 36);
  const h = 126;
  const x = (game.view.w - w) / 2;
  const y = (game.view.h - h) / 2;
  ctx.fillStyle = "rgba(255,247,220,0.94)";
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#25190d";
  ctx.textAlign = "center";
  ctx.font = "30px 'Bowlby One SC'";
  ctx.fillText("Paused", game.view.w / 2, y + 55);
  ctx.font = "900 15px Nunito";
  ctx.fillStyle = "rgba(37,25,13,0.68)";
  ctx.fillText("Resume when ready", game.view.w / 2, y + 88);
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(37,25,13,0.5)";
  ctx.fillRect(0, 0, game.view.w, game.view.h);
  const w = Math.min(460, game.view.w - 36);
  const h = 220;
  const x = (game.view.w - w) / 2;
  const y = (game.view.h - h) / 2;
  ctx.fillStyle = "rgba(255,247,220,0.94)";
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(37,25,13,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#25190d";
  ctx.textAlign = "center";
  ctx.font = "32px 'Bowlby One SC'";
  ctx.fillText(game.runWon ? "Clean Coop" : "Run Over", game.view.w / 2, y + 58);
  ctx.font = "900 18px Nunito";
  ctx.fillText(`Score ${Math.floor(game.score).toLocaleString()}`, game.view.w / 2, y + 104);
  ctx.fillText(`Wave ${Math.min(game.wave, 30)} | Best ${Math.floor(game.best).toLocaleString()}`, game.view.w / 2, y + 136);
  ctx.font = "900 14px Nunito";
  ctx.fillStyle = "rgba(37,25,13,0.68)";
  ctx.fillText("Restart button is ready", game.view.w / 2, y + 174);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function updateHud() {
  hudTimer = 0;
  ui.biome.textContent = game.biome.name;
  ui.wave.textContent = String(game.wave);
  ui.waveState.textContent = game.paused
    ? "Paused"
    : game.state === "between"
      ? "Build Phase"
      : game.state === "gameover"
        ? "Final Score"
        : `${game.pendingFoxes + game.foxes.length} Foxes`;
  ui.rank.textContent = game.rank;
  ui.healthValue.textContent = Math.ceil(game.player.health);
  ui.waterValue.textContent = Math.ceil(game.player.water);
  ui.healthFill.style.width = `${clamp(game.player.health / game.player.maxHealth, 0, 1) * 100}%`;
  ui.waterFill.style.width = `${clamp(game.player.water / game.player.maxWater, 0, 1) * 100}%`;
  ui.score.textContent = Math.floor(game.score).toLocaleString();
  ui.best.textContent = Math.floor(game.best).toLocaleString();
  ui.flock.textContent = String(game.flock.length);
  ui.materials.textContent = Math.floor(game.materials).toLocaleString();
  const selected = game.hotbar[game.selectedSlot] || game.hotbar[0];
  ui.selectedCode.textContent = selected.code;
  ui.selectedLabel.textContent = selected.name;
  ui.hotbarSlots.forEach((button, index) => {
    const item = game.hotbar[index];
    button.classList.toggle("selected", index === game.selectedSlot);
    button.classList.toggle("locked", !item.unlock);
  });
  updateBuildPanel();
  updateBuffRack();
}

function updateBuildPanel() {
  const buildPhase = game.state === "between" && !game.paused;
  ui.buildPanel.classList.toggle("active", buildPhase);
  ui.buildPhase.textContent = buildPhase ? "Build Phase" : game.paused ? "Paused" : "Combat";
  ui.buildMaterials.textContent = Math.floor(game.materials).toLocaleString();
  ui.startWave.disabled = !buildPhase;
  ui.rotateBuild.disabled = !buildPhase || game.buildAction !== "build" || game.selectedBuild !== "wall";
  ui.rotateBuild.textContent = `Rotate ${getBuildRotationLabel()}`;
  ui.salvage.disabled = !buildPhase;
  ui.salvage.classList.toggle("selected", buildPhase && game.buildAction === "salvage");
  ui.pause.textContent = game.paused ? "Resume" : "Pause";
  ui.buildButtons.forEach((button) => {
    const blueprint = getBuildable(button.dataset.build);
    button.disabled = !buildPhase || game.materials < blueprint.cost;
    button.classList.toggle("selected", game.buildAction === "build" && game.selectedBuild === blueprint.id);
  });
  ui.upgradeButtons.forEach((button) => {
    const upgrade = getWaterUpgrade(button.dataset.upgrade);
    const owned = Boolean(game.waterUpgrades[upgrade.id]);
    button.disabled = !buildPhase || owned || game.materials < upgrade.cost;
    button.classList.toggle("owned", owned);
  });
}

function updateBuffRack() {
  ui.buffRack.innerHTML = "";
  const entries = Object.entries(game.buffs);
  for (const [, buff] of entries) {
    const pill = document.createElement("div");
    pill.className = "buff-pill";
    const progress = clamp((buff.time / buff.total) * 100, 0, 100);
    pill.style.setProperty("--buff-progress", `${progress}%`);
    pill.innerHTML = `<b>${buff.code}</b><span>${buff.name}<i></i></span>`;
    ui.buffRack.appendChild(pill);
  }
}

function gameLoop(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000 || 0);
  lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
  if (["1", "2", "3", "4"].includes(key)) {
    const slot = Number(key) - 1;
    if (game.hotbar[slot] && game.hotbar[slot].unlock) game.selectedSlot = slot;
  }
  if (key === "q") {
    const unlocked = game.hotbar.map((item, index) => (item.unlock ? index : -1)).filter((index) => index >= 0);
    const current = unlocked.indexOf(game.selectedSlot);
    game.selectedSlot = unlocked[(current - 1 + unlocked.length) % unlocked.length] || 0;
  }
  if (key === "e") {
    const unlocked = game.hotbar.map((item, index) => (item.unlock ? index : -1)).filter((index) => index >= 0);
    const current = unlocked.indexOf(game.selectedSlot);
    game.selectedSlot = unlocked[(current + 1) % unlocked.length] || 0;
  }
  if (key === "p") {
    togglePause();
  }
  if (key === "r") {
    rotateBuildSelection();
  }
  if (key === "enter" && game.state === "between" && !game.paused) {
    startNextWave();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  game.mouse.x = event.clientX - rect.left;
  game.mouse.y = event.clientY - rect.top;
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    game.mouse.down = true;
    updateMouseWorld();
    if (game.state === "between" && !game.paused) {
      if (game.buildAction === "salvage") trySalvageBuild();
      else tryPlaceBuild();
      return;
    }
    attemptUseSelectedWeapon();
  }
});

window.addEventListener("mouseup", () => {
  game.mouse.down = false;
});

ui.hotbarSlots.forEach((button) => {
  button.addEventListener("click", () => {
    const slot = Number(button.dataset.slot);
    if (game.hotbar[slot] && game.hotbar[slot].unlock) game.selectedSlot = slot;
  });
});

ui.buildButtons.forEach((button) => {
  button.addEventListener("click", () => {
    game.selectedBuild = button.dataset.build;
    game.buildAction = "build";
    updateHud();
  });
});

ui.upgradeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    buyWaterUpgrade(button.dataset.upgrade);
  });
});

ui.startWave.addEventListener("click", () => {
  startNextWave();
});

ui.rotateBuild.addEventListener("click", () => {
  rotateBuildSelection();
});

ui.salvage.addEventListener("click", () => {
  if (game.state !== "between") return;
  game.buildAction = game.buildAction === "salvage" ? "build" : "salvage";
  updateHud();
});

ui.pause.addEventListener("click", () => {
  togglePause();
});

ui.restart.addEventListener("click", () => {
  resetRun();
});

resizeCanvas();
resetRun();
updateHud();
requestAnimationFrame((now) => {
  lastFrame = now;
  requestAnimationFrame(gameLoop);
});

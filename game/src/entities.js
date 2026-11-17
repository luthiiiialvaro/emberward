// The things that live in the Hollow: bullets, enemies, embers, pickups, sparks
// and floating score text. Each spawn and update is a plain function over the
// world's state, so the simulation stays deterministic for a fixed seed.
import { ENEMIES, FIELD, LANTERN, PLAYER } from './config.js';

let nextId = 1;

export function makeBullet(x, y, angle, damage, pierce, speed) {
  return {
    id: nextId, x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, pierce, radius: 5, life: 1.4, hitIds: new Set(),
  };
}

export function makeEnemy(kind, x, y, wave, random) {
  const base = ENEMIES[kind];
  const hpScale = 1 + (wave - 1) * 0.16 + (kind === 'boss' ? (wave - 5) * 0.12 : 0);
  const elite = kind !== 'boss' && random() < Math.min(0.04 + wave * 0.012, 0.16);
  return {
    id: nextId, kind, x, y,
    radius: base.radius * (elite ? 1.3 : 1),
    hp: base.hp * hpScale * (elite ? 2.2 : 1),
    maxHp: base.hp * hpScale * (elite ? 2.2 : 1),
    speed: base.speed * (0.9 + random() * 0.25),
    damage: base.damage,
    score: base.score * (elite ? 3 : 1),
    ember: base.ember * (elite ? 2 : 1),
    elite,
    angle: 0, fireCd: 1.5 + random(), zigPhase: random() * Math.PI * 2,
    flash: 0, spawnTime: 0.35, knockX: 0, knockY: 0,
  };
}

/** A spawn point on the arena's edge, away from the player. */
export function edgeSpawn(state, random) {
  const margin = 30;
  const side = Math.floor(random() * 4);
  let x;
  let y;
  if (side === 0) { x = margin + random() * (FIELD.width - margin * 2); y = margin; }
  else if (side === 1) { x = margin + random() * (FIELD.width - margin * 2); y = FIELD.height - margin; }
  else if (side === 2) { x = margin; y = margin + random() * (FIELD.height - margin * 2); }
  else { x = FIELD.width - margin; y = margin + random() * (FIELD.height - margin * 2); }
  const player = state.player;
  if (Math.hypot(x - player.x, y - player.y) < 260) {
    x = FIELD.width - x;
    y = FIELD.height - y;
  }
  return { x, y };
}

export function makeEmber(x, y, value, random) {
  return {
    id: nextId, x, y,
    vx: (random() - 0.5) * 120, vy: (random() - 0.5) * 120,
    value, radius: 6, life: 14, magnet: false,
  };
}

export function makePickup(kind, x, y) {
  return { id: nextId, kind, x, y, radius: 14, life: 12, bob: 0 };
}

export function makeParticle(x, y, color, count, speed, life, size) {
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      x, y, color,
      vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
      life: life * (0.6 + Math.random() * 0.6), maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
    });
  }
  return particles;
}

export function makeFloatText(x, y, text, color) {
  return { x, y, text, color, life: 0.9, maxLife: 0.9 };
}

/** Distance from the player to the lantern's centre. */
export function lanternDistance(state) {
  return Math.hypot(state.player.x - LANTERN.x, state.player.y - LANTERN.y);
}

/** The player heals while standing in the lantern's glow. */
export function lanternHeals(state) {
  return lanternDistance(state) < LANTERN.radius;
}

/** Move the player, clamped to the arena, and return nothing. */
export function movePlayer(state, dt, move) {
  const player = state.player;
  if (player.dashTime > 0) {
    player.x += player.dashX * PLAYER.dashSpeed * dt;
    player.y += player.dashY * PLAYER.dashSpeed * dt;
  } else {
    player.x += move.x * player.speed * dt;
    player.y += move.y * player.speed * dt;
  }
  player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, player.x));
  player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, player.y));
}

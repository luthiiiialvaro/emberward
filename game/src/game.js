// Emberward's world: one fixed-step simulation over a plain state object. The main
// loop owns the screen (title, play, draft, paused, over, victory); the world owns
// everything that moves, and reports what happened as event bits the loop turns
// into sounds and announcements. Nothing here touches the DOM or the clock, so a
// seeded world replays exactly — which is how the screenshots are staged.
import { COMBO, ENEMIES, FIELD, FINAL_WAVE, LANTERN, PALETTE, PLAYER, STEP } from './config.js';
import {
  edgeSpawn, lanternHeals, makeBullet, makeEmber, makeEnemy, makeFloatText,
  makeParticle, makePickup, movePlayer,
} from './entities.js';
import { buildWave, spawnInterval, waveBanner } from './waves.js';
import { drawDraft } from './upgrades.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_VICTORY = 8;
export const EVENT_KILL = 16;
export const EVENT_PICKUP = 32;
export const EVENT_DASH = 64;
export const EVENT_SHOOT = 128;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

function freshPlayer() {
  return {
    x: FIELD.width / 2, y: FIELD.height / 2 + 170,
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
    speed: PLAYER.speed, angle: -Math.PI / 2,
    fireCd: 0, dashCd: 0, dashCooldownMax: PLAYER.dashCooldown,
    dashTime: 0, dashX: 0, dashY: 1, invuln: 0,
    pickupRadius: 90, overcharge: 0,
    weapon: {
      damage: PLAYER.bulletDamage, fireInterval: PLAYER.fireInterval,
      shots: 1, pierce: 0, bulletSpeed: PLAYER.bulletSpeed,
    },
  };
}

export function createWorld(random) {
  const state = {
    random, time: 0, wave: 1, screen: SCREEN_TITLE,
    score: 0, best: 0, combo: 0, comboTimer: 0, comboKills: 0,
    kills: 0, embersCollected: 0,
    player: freshPlayer(),
    bullets: [], enemyBullets: [], enemies: [], embers: [], pickups: [],
    particles: [], floats: [], fireflies: [],
    spawnQueue: [], spawnTimer: 0, boss: null,
    banner: '', bannerTimer: 0,
    shake: 0, draft: [], taken: {},
    stats: { shots: 0, hits: 0, damageDealt: 0 },
    victoryStats: null,
  };
  for (let i = 0; i < 46; i += 1) {
    state.fireflies.push({
      x: random() * FIELD.width, y: random() * FIELD.height,
      phase: random() * Math.PI * 2, speed: 0.2 + random() * 0.5,
    });
  }

  function startWave(wave) {
    state.wave = wave;
    state.spawnQueue = buildWave(wave, random);
    state.spawnTimer = 0.8;
    state.banner = waveBanner(wave);
    state.bannerTimer = 2.6;
  }

  function reset() {
    state.time = 0;
    state.wave = 1;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.comboKills = 0;
    state.kills = 0;
    state.embersCollected = 0;
    state.player = freshPlayer();
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.embers = [];
    state.pickups = [];
    state.particles = [];
    state.floats = [];
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.boss = null;
    state.draft = [];
    state.taken = {};
    state.stats = { shots: 0, hits: 0, damageDealt: 0 };
    state.victoryStats = null;
    state.screen = SCREEN_TITLE;
    startWave(1);
  }

  function comboMultiplier() {
    return Math.min(COMBO.max, 1 + state.comboKills * COMBO.perKill);
  }

  function burst(x, y, color, count, speed, life, size) {
    state.particles.push(...makeParticle(x, y, color, count, speed, life, size));
  }

  function killEnemy(enemy, index) {
    const gained = Math.round(enemy.score * comboMultiplier());
    state.score += gained;
    state.kills += 1;
    state.comboKills += 1;
    state.comboTimer = COMBO.window;
    state.combo = Math.round(comboMultiplier() * 10) / 10;
    state.floats.push(makeFloatText(enemy.x, enemy.y - 18, `+${gained}`, '#ffe08a'));
    burst(enemy.x, enemy.y, ENEMIES[enemy.kind].color, enemy.kind === 'boss' ? 60 : 14, 260, 0.7, 4);
    for (let i = 0; i < enemy.ember; i += 1) {
      state.embers.push(makeEmber(enemy.x, enemy.y, 10, random));
    }
    const roll = random();
    if (enemy.kind === 'boss') {
      state.pickups.push(makePickup('heart', enemy.x - 30, enemy.y));
      state.pickups.push(makePickup('star', enemy.x + 30, enemy.y));
    } else if (roll < 0.07) {
      state.pickups.push(makePickup('heart', enemy.x, enemy.y));
    } else if (roll < 0.11) {
      state.pickups.push(makePickup('star', enemy.x, enemy.y));
    }
    state.enemies.splice(index, 1);
    if (enemy.kind === 'boss') state.boss = null;
    state.shake = Math.max(state.shake, enemy.kind === 'boss' ? 14 : 5);
    return gained;
  }

  function hurtPlayer(damage, fromX, fromY) {
    const player = state.player;
    if (player.invuln > 0 || player.dashTime > 0 || state.screen !== SCREEN_PLAY) return 0;
    player.hp -= damage;
    player.invuln = PLAYER.invulnerable;
    state.shake = Math.max(state.shake, 8);
    burst(player.x, player.y, '#ff5c7a', 16, 300, 0.6, 4);
    const away = Math.atan2(player.y - fromY, player.x - fromX);
    player.x += Math.cos(away) * 14;
    player.y += Math.sin(away) * 14;
    if (player.hp <= 0) {
      player.hp = 0;
      state.screen = SCREEN_OVER;
      burst(player.x, player.y, '#ffd166', 50, 380, 1.1, 5);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function updatePlayer(dt, input) {
    const player = state.player;
    player.fireCd -= dt;
    player.dashCd -= dt;
    player.invuln -= dt;
    if (player.dashTime > 0) player.dashTime -= dt;
    if (player.overcharge > 0) player.overcharge -= dt;
    if (input.dash && player.dashCd <= 0 && player.dashTime <= 0) {
      const dir = input.move.x !== 0 || input.move.y !== 0
        ? input.move
        : { x: Math.cos(player.angle), y: Math.sin(player.angle) };
      player.dashX = dir.x;
      player.dashY = dir.y;
      player.dashTime = PLAYER.dashTime;
      player.dashCd = player.dashCooldownMax;
      player.invuln = Math.max(player.invuln, PLAYER.dashTime + 0.1);
      burst(player.x, player.y, '#8ef1ff', 10, 200, 0.4, 3);
    }
    movePlayer(state, dt, input.move);
    player.angle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
    if (lanternHeals(state) && player.hp > 0) {
      player.hp = Math.min(player.maxHp, player.hp + LANTERN.healPerSecond * dt);
    }
    if (input.firing && player.fireCd <= 0) {
      const interval = player.overcharge > 0 ? player.weapon.fireInterval * 0.55 : player.weapon.fireInterval;
      player.fireCd = interval;
      const spread = 0.11;
      const count = player.weapon.shots;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * spread;
        state.bullets.push(makeBullet(
          player.x + Math.cos(player.angle) * 22,
          player.y + Math.sin(player.angle) * 22,
          player.angle + offset,
          player.weapon.damage,
          player.weapon.pierce,
          player.weapon.bulletSpeed,
        ));
      }
      state.stats.shots += count;
      return EVENT_SHOOT;
    }
    return 0;
  }

  function updateEnemies(dt) {
    const player = state.player;
    let events = 0;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (enemy.flash > 0) enemy.flash -= dt;
      if (enemy.spawnTime > 0) {
        enemy.spawnTime -= dt;
        continue;
      }
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      enemy.angle = Math.atan2(dy, dx);
      if (enemy.kind === 'darter') {
        enemy.zigPhase += dt * 6;
        const strafe = Math.sin(enemy.zigPhase) * 0.8;
        enemy.x += (nx + -ny * strafe) * enemy.speed * dt + enemy.knockX * dt;
        enemy.y += (ny + nx * strafe) * enemy.speed * dt + enemy.knockY * dt;
      } else if (enemy.kind === 'spitter') {
        if (dist > 320) {
          enemy.x += nx * enemy.speed * dt;
          enemy.y += ny * enemy.speed * dt;
        } else if (dist < 220) {
          enemy.x -= nx * enemy.speed * dt;
          enemy.y -= ny * enemy.speed * dt;
        }
        enemy.fireCd -= dt;
        if (enemy.fireCd <= 0 && dist < 560) {
          enemy.fireCd = 2.4;
          state.enemyBullets.push({
            x: enemy.x, y: enemy.y, vx: nx * 230, vy: ny * 230,
            radius: 8, damage: enemy.damage, life: 5,
          });
          burst(enemy.x, enemy.y, '#7dff9e', 6, 140, 0.35, 3);
        }
      } else if (enemy.kind === 'boss') {
        enemy.fireCd -= dt;
        enemy.x += nx * enemy.speed * dt + enemy.knockX * dt;
        enemy.y += ny * enemy.speed * dt + enemy.knockY * dt;
        if (enemy.fireCd <= 0) {
          enemy.fireCd = enemy.hp < enemy.maxHp / 2 ? 2.0 : 2.8;
          const shots = enemy.hp < enemy.maxHp / 2 ? 12 : 8;
          for (let s = 0; s < shots; s += 1) {
            const angle = (s / shots) * Math.PI * 2 + state.time;
            state.enemyBullets.push({
              x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 170, vy: Math.sin(angle) * 170,
              radius: 9, damage: 12, life: 6,
            });
          }
          burst(enemy.x, enemy.y, '#ff4d6d', 18, 220, 0.5, 4);
          if (random() < 0.6) {
            for (let m = 0; m < 2; m += 1) {
              const spawn = edgeSpawn(state, random);
              state.enemies.push(makeEnemy('mote', spawn.x, spawn.y, state.wave, random));
            }
          }
        }
      } else {
        enemy.x += nx * enemy.speed * dt + enemy.knockX * dt;
        enemy.y += ny * enemy.speed * dt + enemy.knockY * dt;
      }
      enemy.knockX *= 0.86;
      enemy.knockY *= 0.86;
      enemy.x = Math.max(enemy.radius, Math.min(FIELD.width - enemy.radius, enemy.x));
      enemy.y = Math.max(enemy.radius, Math.min(FIELD.height - enemy.radius, enemy.y));
      if (dist < enemy.radius + PLAYER.radius + 2) {
        events |= hurtPlayer(enemy.damage, enemy.x, enemy.y);
        enemy.x -= nx * 26;
        enemy.y -= ny * 26;
      }
    }
    return events;
  }

  function updateBullets(dt) {
    let events = 0;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.bullets.splice(i, 1);
        continue;
      }
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        if (enemy.spawnTime > 0 || bullet.hitIds.has(enemy.id)) continue;
        const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
        if (dist < bullet.radius + enemy.radius) {
          bullet.hitIds.add(enemy.id);
          enemy.hp -= bullet.damage;
          enemy.flash = 0.12;
          enemy.knockX += bullet.vx * 0.12;
          enemy.knockY += bullet.vy * 0.12;
          state.stats.hits += 1;
          state.stats.damageDealt += bullet.damage;
          burst(bullet.x, bullet.y, '#ffe08a', 4, 160, 0.3, 3);
          if (enemy.hp <= 0) {
            const wasBoss = enemy.kind === 'boss';
            const wasFinal = state.wave === FINAL_WAVE;
            killEnemy(enemy, j);
            events |= EVENT_KILL;
            if (wasBoss && wasFinal) {
              state.screen = SCREEN_VICTORY;
              state.victoryStats = {
                score: state.score, kills: state.kills, wave: state.wave,
                accuracy: state.stats.shots > 0 ? Math.round((state.stats.hits / state.stats.shots) * 100) : 0,
                embers: state.embersCollected,
              };
              events |= EVENT_VICTORY;
            }
          }
          if (bullet.hitIds.size > bullet.pierce) {
            state.bullets.splice(i, 1);
          }
          break;
        }
      }
    }
    return events;
  }

  function updateEnemyBullets(dt) {
    let events = 0;
    const player = state.player;
    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const glob = state.enemyBullets[i];
      glob.x += glob.vx * dt;
      glob.y += glob.vy * dt;
      glob.life -= dt;
      if (glob.life <= 0 || glob.x < -20 || glob.x > FIELD.width + 20 || glob.y < -20 || glob.y > FIELD.height + 20) {
        state.enemyBullets.splice(i, 1);
        continue;
      }
      if (Math.hypot(glob.x - player.x, glob.y - player.y) < glob.radius + PLAYER.radius) {
        state.enemyBullets.splice(i, 1);
        events |= hurtPlayer(glob.damage, glob.x - glob.vx, glob.y - glob.vy);
      }
    }
    return events;
  }

  function updatePickups(dt) {
    let events = 0;
    const player = state.player;
    for (let i = state.embers.length - 1; i >= 0; i -= 1) {
      const ember = state.embers[i];
      ember.life -= dt;
      const dx = player.x - ember.x;
      const dy = player.y - ember.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < player.pickupRadius * 2.2) {
        ember.x += (dx / dist) * 420 * dt;
        ember.y += (dy / dist) * 420 * dt;
      } else {
        ember.x += ember.vx * dt;
        ember.y += ember.vy * dt;
        ember.vx *= 0.92;
        ember.vy *= 0.92;
      }
      if (dist < PLAYER.radius + ember.radius + 6) {
        state.embers.splice(i, 1);
        state.score += ember.value;
        state.embersCollected += 1;
        events |= EVENT_PICKUP;
      } else if (ember.life <= 0) {
        state.embers.splice(i, 1);
      }
    }
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      pickup.life -= dt;
      pickup.bob += dt;
      if (Math.hypot(pickup.x - player.x, pickup.y - player.y) < PLAYER.radius + pickup.radius + 8) {
        state.pickups.splice(i, 1);
        if (pickup.kind === 'heart') {
          player.hp = Math.min(player.maxHp, player.hp + 25);
          state.floats.push(makeFloatText(player.x, player.y - 26, '+25 HP', '#ff6b81'));
        } else {
          player.overcharge = 6;
          state.floats.push(makeFloatText(player.x, player.y - 26, 'OVERCHARGE!', '#8ef1ff'));
        }
        events |= EVENT_PICKUP;
      } else if (pickup.life <= 0) {
        state.pickups.splice(i, 1);
      }
    }
    return events;
  }

  function stepPlay(dt, input) {
    let events = 0;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.comboKills = 0;
        state.combo = 0;
      }
    }
    events |= updatePlayer(dt, input);
    if (state.screen !== SCREEN_PLAY) return events;
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = spawnInterval(state.wave);
        const kind = state.spawnQueue.shift();
        const spawn = edgeSpawn(state, random);
        const enemy = makeEnemy(kind, spawn.x, spawn.y, state.wave, random);
        state.enemies.push(enemy);
        if (kind === 'boss') {
          state.boss = enemy;
          burst(spawn.x, spawn.y, '#ff4d6d', 30, 300, 0.8, 5);
        }
      }
    }
    events |= updateEnemies(dt);
    if (state.screen !== SCREEN_PLAY) return events;
    events |= updateBullets(dt);
    if (state.screen !== SCREEN_PLAY) return events;
    events |= updateEnemyBullets(dt);
    if (state.screen !== SCREEN_PLAY) return events;
    events |= updatePickups(dt);
    if (state.spawnQueue.length === 0 && state.enemies.length === 0 && state.screen === SCREEN_PLAY) {
      if (state.wave >= FINAL_WAVE) {
        state.screen = SCREEN_VICTORY;
        state.victoryStats = {
          score: state.score, kills: state.kills, wave: state.wave,
          accuracy: state.stats.shots > 0 ? Math.round((state.stats.hits / state.stats.shots) * 100) : 0,
          embers: state.embersCollected,
        };
        events |= EVENT_VICTORY;
      } else {
        state.draft = drawDraft(random, state.taken);
        state.screen = SCREEN_DRAFT;
        events |= EVENT_WAVE_CLEAR;
      }
    }
    return events;
  }

  function stepTitle(dt) {
    if (state.enemies.length < 7 && random() < dt * 0.5) {
      const spawn = edgeSpawn(state, random);
      state.enemies.push(makeEnemy(random() < 0.7 ? 'mote' : 'darter', spawn.x, spawn.y, 1, random));
    }
    const player = state.player;
    player.x = LANTERN.x + Math.cos(state.time * 0.5) * 190;
    player.y = LANTERN.y + Math.sin(state.time * 0.5) * 120;
    player.angle = Math.atan2(-player.y + LANTERN.y, -player.x + LANTERN.x) + Math.PI;
    for (const enemy of state.enemies) {
      const dx = LANTERN.x - enemy.x;
      const dy = LANTERN.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / dist) * 24 * dt;
      enemy.y += (dy / dist) * 24 * dt;
      enemy.angle = Math.atan2(dy, dx);
    }
  }

  function step(dt, input, demo) {
    state.time += dt;
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= dt;
      if (particle.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const float = state.floats[i];
      float.y -= 34 * dt;
      float.life -= dt;
      if (float.life <= 0) state.floats.splice(i, 1);
    }
    for (const firefly of state.fireflies) {
      firefly.phase += dt * firefly.speed;
      firefly.x += Math.cos(firefly.phase) * 12 * dt;
      firefly.y += Math.sin(firefly.phase * 1.3) * 10 * dt;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (demo || state.screen === SCREEN_TITLE) {
      stepTitle(dt);
      return 0;
    }
    if (state.screen === SCREEN_PLAY) return stepPlay(dt, input);
    return 0;
  }

  /** Apply a draft choice, then open the next wave. */
  function chooseUpgrade(index) {
    const upgrade = state.draft[index];
    if (!upgrade) return false;
    upgrade.apply(state.player);
    state.taken[upgrade.id] = (state.taken[upgrade.id] ?? 0) + 1;
    state.draft = [];
    startWave(state.wave + 1);
    state.screen = SCREEN_PLAY;
    return true;
  }

  /** Stage the victory screen over a battlefield of spent embers, for screenshots. */
  function stageVictory(score, kills, embers) {
    state.screen = SCREEN_VICTORY;
    state.wave = FINAL_WAVE;
    state.score = score;
    state.kills = kills;
    state.embersCollected = embers;
    state.victoryStats = { score, kills, wave: FINAL_WAVE, accuracy: 68, embers };
    state.player.hp = 64;
    for (let i = 0; i < 26; i += 1) {
      state.embers.push(makeEmber(
        LANTERN.x + (random() - 0.5) * 520,
        LANTERN.y + (random() - 0.5) * 320, 10, random,
      ));
    }
    burst(LANTERN.x, LANTERN.y, '#ffc46b', 40, 320, 1.2, 5);
    burst(state.player.x, state.player.y, '#ffd166', 24, 260, 1.0, 4);
  }

  return {
    state, reset, step, chooseUpgrade, startWave, stageVictory,
    comboMultiplier,
  };
}

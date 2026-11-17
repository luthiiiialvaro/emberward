// The screenshot scenes behind ?shot=start|play|boss|victory. Each one stages a
// real game state with the game's own rules: the title over a living Hollow, a
// mid-fight wave played forward by an autopilot, the wave-5 boss fight, and the
// victory screen over a battlefield of spent embers. The same seed always gives
// the same frame: fixed 1/60 s steps, a seeded world, no wall clock.
import { FIELD, LANTERN, STEP } from './config.js';
import { makeEnemy } from './entities.js';
import { waveBanner } from './waves.js';
import { SCREEN_DRAFT, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './game.js';

const SAMPLE = 1 / 30;

/** Steer the wisp: flee what is near, chase the nearest foe's line, grab embers. */
function autopilot(state) {
  const player = state.player;
  let threat = null;
  let threatDist = Infinity;
  let target = null;
  let targetDist = Infinity;
  for (const enemy of state.enemies) {
    if (enemy.spawnTime > 0) continue;
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < threatDist) {
      threat = enemy;
      threatDist = dist;
    }
    if (dist < targetDist) {
      target = enemy;
      targetDist = dist;
    }
  }
  let moveX = 0;
  let moveY = 0;
  if (threat && threatDist < 150) {
    moveX = (player.x - threat.x) / threatDist;
    moveY = (player.y - threat.y) / threatDist;
  } else if (target) {
    // Hold a firing distance: close in when far, drift when near.
    if (targetDist > 320) {
      moveX = (target.x - player.x) / targetDist;
      moveY = (target.y - player.y) / targetDist;
    } else if (targetDist < 150) {
      moveX = (player.x - target.x) / targetDist;
      moveY = (player.y - target.y) / targetDist;
    } else {
      // Strafe around the foe so the frame shows motion, not a stand-off.
      moveX = -(target.y - player.y) / targetDist;
      moveY = (target.x - player.x) / targetDist;
    }
  } else {
    // Nothing to shoot: drift toward the lantern and its embers.
    const dx = LANTERN.x - player.x;
    const dy = LANTERN.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > 60) {
      moveX = dx / dist;
      moveY = dy / dist;
    }
  }
  const length = Math.hypot(moveX, moveY) || 1;
  const aim = target
    ? { x: target.x, y: target.y }
    : { x: player.x + Math.cos(player.angle), y: player.y + Math.sin(player.angle) };
  return {
    move: { x: moveX / length, y: moveY / length },
    aimX: aim.x,
    aimY: aim.y,
    firing: true,
    dash: threatDist < 90 && player.dashCd <= 0,
  };
}

function simulate(world, seconds, inputFor) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = inputFor(world.state);
    world.step(STEP, input, false);
    if (world.state.screen === SCREEN_OVER || world.state.screen === SCREEN_VICTORY) break;
  }
}

/** Stage a mid-duel boss fight: boss, three motes, a hurt-but-standing wisp. */
function stageBossDuel(world) {
  const state = world.state;
  state.wave = 5;
  state.spawnQueue = [];
  state.banner = waveBanner(5);
  state.bannerTimer = 2.6;
  const boss = makeEnemy('boss', FIELD.width / 2 + 200, 280, 5, state.random);
  boss.spawnTime = 0;
  boss.fireCd = 0.2;
  state.enemies.push(boss);
  state.boss = boss;
  for (const [x, y] of [[420, 180], [860, 520], [300, 500]]) {
    const mote = makeEnemy('mote', x, y, 5, state.random);
    mote.spawnTime = 0;
    state.enemies.push(mote);
  }
  state.player.x = FIELD.width / 2 - 220;
  state.player.y = FIELD.height / 2 + 80;
  state.player.angle = Math.atan2(280 - state.player.y, (FIELD.width / 2 + 200) - state.player.x);
}

/**
 * Set `world` to the named scene and return the screen to draw and the best
 * score to show. Any unknown name is the title.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name === 'play') {
    world.reset();
    state.screen = SCREEN_PLAY;
    // Give the wisp a wave-2 fight with a draft already taken, so the HUD shows
    // a grown weapon: twin bolts, faster trigger, a combo running.
    state.player.weapon.shots = 2;
    state.player.weapon.fireInterval = 0.18;
    state.player.weapon.damage = 15;
    simulate(world, 26, autopilot);
    if (state.screen === SCREEN_DRAFT) {
      // Wave 1 cleared: take Twin Flame and fight on into wave 2, so the frame
      // shows a live fight with a grown weapon, not an empty field.
      world.chooseUpgrade(1);
      state.screen = SCREEN_PLAY;
      simulate(world, 5, autopilot);
    }
    if (state.screen === SCREEN_DRAFT) state.screen = SCREEN_PLAY;
    return { screen: state.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  if (name === 'boss') {
    // The duel, composed: boss, three motes, a hurt-but-standing wisp, the
    // boss's first radial burst already in the air. One short breath of
    // simulation (0.6 s) so bolts and globs are mid-flight, then the frame.
    world.reset();
    state.screen = SCREEN_PLAY;
    state.player.weapon.shots = 3;
    state.player.weapon.fireInterval = 0.16;
    state.player.weapon.damage = 18;
    state.player.maxHp = 125;
    state.player.hp = 96;
    state.score = 7420;
    state.kills = 96;
    stageBossDuel(world);
    simulate(world, 0.6, autopilot);
    return { screen: state.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  if (name === 'victory') {
    world.reset();
    state.screen = SCREEN_PLAY;
    state.player.weapon.shots = 3;
    state.player.weapon.damage = 22;
    world.stageVictory(18470, 214, 486);
    // Let the embers settle for a breath so the frame is calm, not mid-burst.
    for (let i = 0; i < 30; i += 1) world.step(STEP, { move: { x: 0, y: 0 }, aimX: FIELD.width / 2, aimY: FIELD.height / 2, firing: false, dash: false }, false);
    return { screen: SCREEN_VICTORY, best: 18470 };
  }
  // start: the title, over a Hollow that has been living for a while.
  world.reset();
  state.screen = SCREEN_TITLE;
  for (let i = 0; i < Math.round(6 / STEP); i += 1) {
    world.step(STEP, { move: { x: 0, y: 0 }, aimX: FIELD.width / 2, aimY: FIELD.height / 2, firing: false, dash: false }, true);
  }
  return { screen: SCREEN_TITLE, best: 12480 };
}

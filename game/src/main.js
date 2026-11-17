// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, draft,
// paused, game over and victory.
//
// ?seed=N fixes the pattern. ?shot=start|play|boss|victory (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT,
  EVENT_VICTORY, EVENT_WAVE_CLEAR, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY,
} from './game.js';
import {
  ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE,
  ACTION_UPGRADE_1, ACTION_UPGRADE_2, ACTION_UPGRADE_3, createInput,
} from './input.js';
import { createRenderer } from './render.js';
import { playSound, toggleMute, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dashQueued = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.state.screen = SCREEN_PLAY;
    accumulator = 0;
    screen = SCREEN_PLAY;
    playSound('wave');
    announce(`Playing. Wave 1. ${world.state.player.hp} health.`);
  }

  function endGame(victory) {
    screen = victory ? SCREEN_VICTORY : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    playSound(victory ? 'win' : 'lose');
    announce(victory
      ? `Victory. Score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_SHOOT) playSound('shoot');
    if (events & EVENT_KILL) playSound('kill');
    if (events & EVENT_PICKUP) playSound('pickup');
    if (events & EVENT_HIT) {
      playSound('hurt');
      announce(world.state.player.hp <= 25
        ? 'Hit. Low health — fall back to the lantern’s glow.'
        : `Hit. ${Math.ceil(world.state.player.hp)} health left.`);
    }
    if (events & EVENT_WAVE_CLEAR) {
      playSound('upgrade');
      announce(`Wave ${world.state.wave} clear. Choose a boon.`);
    }
    if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_VICTORY) endGame(true);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const nowMuted = toggleMute();
      announce(nowMuted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_DASH) dashQueued = true;
    if (actions & ACTION_CONFIRM) {
      unlockAudio();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        world.state.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        world.state.screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        world.state.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (screen === SCREEN_DRAFT) {
      if (actions & ACTION_UPGRADE_1) pickUpgrade(0);
      else if (actions & ACTION_UPGRADE_2) pickUpgrade(1);
      else if (actions & ACTION_UPGRADE_3) pickUpgrade(2);
    }
  }

  function pickUpgrade(index) {
    const upgrade = world.state.draft[index];
    if (!upgrade) return;
    unlockAudio();
    playSound('upgrade');
    world.chooseUpgrade(index);
    screen = SCREEN_PLAY;
    announce(`Took ${upgrade.name}. Wave ${world.state.wave}.`);
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    unlockAudio();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      startGame();
      return;
    }
    if (screen === SCREEN_DRAFT) {
      const cardWidth = 280;
      const gap = 28;
      const total = cardWidth * 3 + gap * 2;
      const startX = (1280 - total) / 2;
      for (let index = 0; index < 3; index += 1) {
        const x = startX + index * (cardWidth + gap);
        if (click.x >= x && click.x <= x + cardWidth && click.y >= 210 && click.y <= 450) {
          pickUpgrade(index);
          return;
        }
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { move: { x: 0, y: 0 }, aimX: 640, aimY: 360, firing: false, dash: false }, true);
      return;
    }
    const direction = input.direction();
    const dash = dashQueued;
    dashQueued = false;
    const events = world.step(STEP, {
      move: direction,
      aimX: input.state.mouseX,
      aimY: input.state.mouseY,
      firing: input.firing(),
      dash,
    }, false);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
        // The world may have moved to draft, game over or victory mid-step.
        if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) screen = world.state.screen;
      }
    } else {
      accumulator = 0;
    }
    world.state.screen = screen;
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the dark close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      world.state.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberward. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

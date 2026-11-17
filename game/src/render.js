// Everything the player sees: the Hollow, the lantern's glow, the wisp, the dark's
// creatures, the HUD, and the title, draft, pause, game-over and victory screens.
// One canvas, one logical 1280x720 field, scaled to the window with letterboxing.
import { ENEMIES, FIELD, FINAL_WAVE, LANTERN, PALETTE } from './config.js';
import {
  SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY,
} from './game.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale * window.devicePixelRatio);
    canvas.height = Math.round(FIELD.height * scale * window.devicePixelRatio);
    canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  function circle(x, y, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function text(string, x, y, size, color, align = 'center', weight = 700) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(string, x, y);
  }

  function panel(x, y, width, height, radius = 14) {
    ctx.fillStyle = 'rgba(23, 20, 46, 0.92)';
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    ctx.stroke();
  }

  function drawBackground(state) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const gradient = ctx.createRadialGradient(
      LANTERN.x, LANTERN.y, 40, LANTERN.x, LANTERN.y, 560,
    );
    gradient.addColorStop(0, '#241d4e');
    gradient.addColorStop(0.55, '#171233');
    gradient.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = 'rgba(61, 52, 120, 0.5)';
    ctx.lineWidth = 2;
    for (const radius of [210, 300, 390]) {
      ctx.beginPath();
      ctx.arc(LANTERN.x, LANTERN.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const firefly of state.fireflies) {
      const glow = 0.25 + 0.55 * Math.abs(Math.sin(firefly.phase * 2));
      ctx.fillStyle = `rgba(255, 196, 107, ${glow.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(firefly.x, firefly.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // The Last Lantern: a stone ring, a warm glow, a flame that breathes.
    const pulse = 1 + Math.sin(state.time * 2.2) * 0.06;
    const glow = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 8, LANTERN.x, LANTERN.y, LANTERN.radius * pulse);
    glow.addColorStop(0, 'rgba(255, 196, 107, 0.34)');
    glow.addColorStop(0.6, 'rgba(255, 150, 80, 0.12)');
    glow.addColorStop(1, 'rgba(255, 150, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(LANTERN.x - LANTERN.radius, LANTERN.y - LANTERN.radius, LANTERN.radius * 2, LANTERN.radius * 2);
    ctx.strokeStyle = '#4a3f7d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(LANTERN.x, LANTERN.y, 34, 0, Math.PI * 2);
    ctx.stroke();
    circle(LANTERN.x, LANTERN.y, 26, '#3a2f66');
    const flame = 16 + Math.sin(state.time * 5) * 2.5;
    ctx.fillStyle = PALETTE.lanternCore;
    ctx.beginPath();
    ctx.ellipse(LANTERN.x, LANTERN.y - 2, 7, flame, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(LANTERN.x, LANTERN.y - 4, 5, '#fff8dd');
  }

  function drawEmbers(state) {
    for (const ember of state.embers) {
      const blink = 0.7 + 0.3 * Math.sin(state.time * 6 + ember.id);
      ctx.fillStyle = `rgba(255, 179, 71, ${blink.toFixed(3)})`;
      ctx.save();
      ctx.translate(ember.x, ember.y);
      ctx.rotate(state.time * 2 + ember.id);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  function drawPickups(state) {
    for (const pickup of state.pickups) {
      const bob = Math.sin(pickup.bob * 4) * 3;
      const y = pickup.y + bob;
      const glow = 0.5 + 0.5 * Math.sin(pickup.bob * 4);
      ctx.fillStyle = pickup.kind === 'heart'
        ? `rgba(255, 107, 129, ${0.25 + glow * 0.2})`
        : `rgba(142, 241, 255, ${0.25 + glow * 0.2})`;
      ctx.beginPath();
      ctx.arc(pickup.x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      if (pickup.kind === 'heart') {
        ctx.fillStyle = '#ff6b81';
        ctx.font = `700 22px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♥', pickup.x, y + 1);
      } else {
        ctx.fillStyle = '#8ef1ff';
        ctx.font = `700 22px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', pickup.x, y + 1);
      }
    }
  }

  function drawEnemies(state) {
    for (const enemy of state.enemies) {
      if (enemy.spawnTime > 0) {
        const alpha = 1 - enemy.spawnTime / 0.35;
        ctx.fillStyle = `rgba(183, 140, 255, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius * (1.6 - alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const base = ENEMIES[enemy.kind];
      const color = enemy.flash > 0 ? '#ffffff' : base.color;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      if (enemy.kind === 'darter') {
        ctx.rotate(enemy.angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(enemy.radius, 0);
        ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.7);
        ctx.lineTo(-enemy.radius * 0.8, -enemy.radius * 0.7);
        ctx.closePath();
        ctx.fill();
      } else if (enemy.kind === 'boss') {
        ctx.fillStyle = 'rgba(255, 77, 109, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 12 + Math.sin(state.time * 4) * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b0a12';
        ctx.beginPath();
        ctx.arc(-14, -8, 7, 0, Math.PI * 2);
        ctx.arc(14, -8, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9b0';
        ctx.beginPath();
        ctx.arc(-14, -8, 3, 0, Math.PI * 2);
        ctx.arc(14, -8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1b0a12';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 10, 16, 0.3, Math.PI - 0.3);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(11, 10, 26, 0.85)';
        ctx.beginPath();
        ctx.arc(-enemy.radius * 0.35, -enemy.radius * 0.2, enemy.radius * 0.2, 0, Math.PI * 2);
        ctx.arc(enemy.radius * 0.35, -enemy.radius * 0.2, enemy.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(-enemy.radius * 0.35, -enemy.radius * 0.2, enemy.radius * 0.09, 0, Math.PI * 2);
        ctx.arc(enemy.radius * 0.35, -enemy.radius * 0.2, enemy.radius * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (enemy.elite) {
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        text('ELITE', enemy.x, enemy.y - enemy.radius - 12, 11, '#ffe08a');
      }
      if ((enemy.kind === 'brute' || enemy.kind === 'boss') && enemy.hp < enemy.maxHp) {
        const width = enemy.radius * 2;
        ctx.fillStyle = 'rgba(11, 10, 26, 0.8)';
        ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 5);
        ctx.fillStyle = '#ff5c7a';
        ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * Math.max(0, enemy.hp / enemy.maxHp), 5);
      }
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const blink = player.invuln > 0 && player.dashTime <= 0 && Math.floor(state.time * 14) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.5)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(player.angle);
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(3, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c00';
    ctx.beginPath();
    ctx.arc(6, -4, 2.4, 0, Math.PI * 2);
    ctx.arc(6, 4, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(14, -3, 16, 6);
    ctx.restore();
    if (player.overcharge > 0) {
      ctx.strokeStyle = '#8ef1ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24 + Math.sin(state.time * 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawBullets(state) {
    for (const bullet of state.bullets) {
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8dd';
      ctx.beginPath();
      ctx.ellipse(3, 0, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const glob of state.enemyBullets) {
      const pulse = 1 + Math.sin(state.time * 10 + glob.x) * 0.15;
      circle(glob.x, glob.y, glob.radius * pulse, '#7dff9e');
      circle(glob.x, glob.y, glob.radius * 0.5, '#eaffef');
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      circle(particle.x, particle.y, particle.size, particle.color);
    }
    ctx.globalAlpha = 1;
    for (const float of state.floats) {
      ctx.globalAlpha = Math.max(0, float.life / float.maxLife);
      text(float.text, float.x, float.y, 16, float.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    const player = state.player;
    panel(16, 14, 300, 86, 12);
    text('EMBERWARD', 32, 34, 15, PALETTE.muted, 'left');
    text(`SCORE  ${state.score.toLocaleString('en-US')}`, 32, 58, 20, PALETTE.text, 'left');
    text(`BEST  ${Math.max(best, state.score).toLocaleString('en-US')}`, 32, 82, 13, PALETTE.muted, 'left');
    // Health bar.
    panel(16, 110, 300, 34, 10);
    const hpWidth = 220 * Math.max(0, player.hp / player.maxHp);
    ctx.fillStyle = '#3a2440';
    ctx.fillRect(28, 120, 220, 14);
    ctx.fillStyle = player.hp < 30 ? '#ff5c7a' : '#ff8f5c';
    ctx.fillRect(28, 120, hpWidth, 14);
    text('♥', 258, 127, 15, '#ff6b81');
    text(`${Math.ceil(player.hp)}`, 282, 127, 13, PALETTE.text);
    // Dash pip.
    const dashReady = player.dashCd <= 0;
    text(dashReady ? 'DASH READY  [SHIFT]' : 'DASH …', 32, 162, 13, dashReady ? '#8ef1ff' : PALETTE.muted, 'left');
    if (!dashReady) {
      ctx.fillStyle = '#3a2440';
      ctx.fillRect(150, 155, 120, 8);
      ctx.fillStyle = '#8ef1ff';
      ctx.fillRect(150, 155, 120 * (1 - player.dashCd / player.dashCooldownMax), 8);
    }
    // Wave and foes, top right.
    panel(FIELD.width - 316, 14, 300, 86, 12);
    text(`WAVE  ${state.wave} / ${FINAL_WAVE}`, FIELD.width - 32, 34, 15, PALETTE.muted, 'right');
    const remaining = state.enemies.length + state.spawnQueue.length;
    text(state.screen === SCREEN_DRAFT ? 'WAVE CLEAR!' : `FOES LEFT  ${remaining}`, FIELD.width - 32, 58, 20, PALETTE.text, 'right');
    text(player.overcharge > 0 ? `OVERCHARGE ${player.overcharge.toFixed(0)}s` : `BOLTS ×${player.weapon.shots}  ·  DMG ${Math.round(player.weapon.damage)}`, FIELD.width - 32, 82, 13, player.overcharge > 0 ? '#8ef1ff' : PALETTE.muted, 'right');
    if (state.comboKills > 1) {
      text(`COMBO ×${state.combo.toFixed(1)}`, FIELD.width / 2, 40, 22, '#ffe08a');
      ctx.fillStyle = '#3a2440';
      ctx.fillRect(FIELD.width / 2 - 60, 56, 120, 6);
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(FIELD.width / 2 - 60, 56, 120 * Math.max(0, state.comboTimer / 4), 6);
    }
    if (state.boss) {
      panel(FIELD.width / 2 - 220, FIELD.height - 44, 440, 28, 10);
      text('THE GLOOMWARDEN', FIELD.width / 2, FIELD.height - 58, 12, '#ff8fa8');
      ctx.fillStyle = '#3a2440';
      ctx.fillRect(FIELD.width / 2 - 205, FIELD.height - 34, 410, 10);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(FIELD.width / 2 - 205, FIELD.height - 34, 410 * Math.max(0, state.boss.hp / state.boss.maxHp), 10);
    }
    if (state.bannerTimer > 0 && state.banner) {
      const alpha = Math.min(1, state.bannerTimer);
      ctx.globalAlpha = alpha;
      text(state.banner, FIELD.width / 2, 150, 34, '#ffe9b0');
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(11, 10, 26, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('EMBERWARD', FIELD.width / 2, 168, 84, '#ffe9b0');
    text('— THE LAST LANTERN OF THE HOLLOW —', FIELD.width / 2, 224, 20, '#ffc46b');
    text('The dark sends its creatures at the Last Lantern. You are the wisp that keeps it lit.', FIELD.width / 2, 268, 17, PALETTE.text, 'center', 400);
    text('Survive 10 waves. Fell the Gloomwarden. Stand in the lantern’s glow to mend.', FIELD.width / 2, 296, 17, PALETTE.text, 'center', 400);
    panel(FIELD.width / 2 - 330, 336, 660, 132, 14);
    text('MOVE  WASD / ARROWS      AIM  MOUSE      FIRE  HOLD CLICK / SPACE', FIELD.width / 2, 366, 16, PALETTE.text);
    text('DASH  SHIFT      PAUSE  P      MUTE  M', FIELD.width / 2, 398, 16, PALETTE.text);
    text('Between waves, choose one boon. Embers are score — grab them.', FIELD.width / 2, 430, 15, PALETTE.muted, 'center', 400);
    text(best > 0 ? `BEST SCORE  ${best.toLocaleString('en-US')}` : 'NO BEST SCORE YET — LIGHT THE FIRST ONE', FIELD.width / 2, 500, 16, '#ffe08a');
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('▶  PRESS ENTER OR CLICK TO BEGIN', FIELD.width / 2, 548, 22, '#fff3c4');
    ctx.globalAlpha = 1;
    text('A complete game in one page · no downloads · your best score stays in this browser', FIELD.width / 2, 690, 13, PALETTE.muted, 'center', 400);
  }

  function drawDraft(state) {
    ctx.fillStyle = 'rgba(11, 10, 26, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(`WAVE ${state.wave} CLEAR!`, FIELD.width / 2, 108, 40, '#ffe9b0');
    text('The Hollow quiets. Choose one boon — click a card or press 1, 2 or 3.', FIELD.width / 2, 152, 17, PALETTE.text, 'center', 400);
    const cardWidth = 280;
    const cardHeight = 240;
    const gap = 28;
    const total = cardWidth * 3 + gap * 2;
    const startX = (FIELD.width - total) / 2;
    state.draft.forEach((upgrade, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = 210;
      panel(x, y, cardWidth, cardHeight, 16);
      text(upgrade.icon, x + cardWidth / 2, y + 58, 44, '#ffc46b');
      text(upgrade.name, x + cardWidth / 2, y + 118, 21, PALETTE.text);
      text(upgrade.text, x + cardWidth / 2, y + 152, 15, PALETTE.muted, 'center', 400);
      text(`[${index + 1}]`, x + cardWidth / 2, y + 200, 15, '#8ef1ff');
    });
    text(`SCORE ${state.score.toLocaleString('en-US')}   ·   NEXT: WAVE ${state.wave + 1} OF ${FINAL_WAVE}`, FIELD.width / 2, 510, 16, PALETTE.muted);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(11, 10, 26, 0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('PAUSED', FIELD.width / 2, 320, 56, PALETTE.text);
    text('Press P or Enter to keep fighting — the Hollow waits.', FIELD.width / 2, 380, 17, PALETTE.muted, 'center', 400);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(11, 10, 26, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('THE LIGHT GOES OUT', FIELD.width / 2, 190, 56, '#ff8fa8');
    text('The Hollow takes the lantern… this time.', FIELD.width / 2, 244, 18, PALETTE.text, 'center', 400);
    panel(FIELD.width / 2 - 260, 292, 520, 190, 16);
    text(`SCORE  ${state.score.toLocaleString('en-US')}`, FIELD.width / 2, 330, 24, PALETTE.text);
    text(`BEST  ${Math.max(best, state.score).toLocaleString('en-US')}`, FIELD.width / 2, 368, 17, '#ffe08a');
    text(`WAVE REACHED  ${state.wave} / ${FINAL_WAVE}      FOES FELLED  ${state.kills}`, FIELD.width / 2, 404, 16, PALETTE.muted);
    text(`EMBERS GATHERED  ${state.embersCollected}`, FIELD.width / 2, 436, 16, PALETTE.muted);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('↻  PRESS ENTER OR CLICK TO TRY AGAIN', FIELD.width / 2, 540, 22, '#fff3c4');
    ctx.globalAlpha = 1;
  }

  function drawVictory(state, best) {
    ctx.fillStyle = 'rgba(11, 10, 26, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('THE HOLLOW IS LIT AGAIN', FIELD.width / 2, 168, 52, '#ffe9b0');
    text('The Gloomwarden falls. Ten waves, one wisp, one lantern still burning.', FIELD.width / 2, 222, 18, PALETTE.text, 'center', 400);
    panel(FIELD.width / 2 - 280, 268, 560, 216, 16);
    text(`SCORE  ${state.score.toLocaleString('en-US')}`, FIELD.width / 2, 308, 26, PALETTE.text);
    text(`BEST  ${Math.max(best, state.score).toLocaleString('en-US')}`, FIELD.width / 2, 348, 17, '#ffe08a');
    text(`FOES FELLED  ${state.kills}      EMBERS  ${state.embersCollected}`, FIELD.width / 2, 386, 16, PALETTE.muted);
    text(`ACCURACY  ${state.victoryStats ? state.victoryStats.accuracy : 0}%      WAVES  10 / 10`, FIELD.width / 2, 420, 16, PALETTE.muted);
    text('★  ★  ★', FIELD.width / 2, 458, 22, '#ffe08a');
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('↻  PRESS ENTER OR CLICK TO PLAY AGAIN', FIELD.width / 2, 540, 22, '#fff3c4');
    ctx.globalAlpha = 1;
  }

  function draw(state, screen, best) {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    drawEmbers(state);
    drawPickups(state);
    drawEnemies(state);
    drawPlayer(state);
    drawBullets(state);
    drawParticles(state);
    ctx.restore();
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_DRAFT) {
      drawHud(state, best);
      drawDraft(state);
    } else if (screen === SCREEN_PAUSED) {
      drawHud(state, best);
      drawPaused();
    } else if (screen === SCREEN_OVER) {
      drawOver(state, best);
    } else if (screen === SCREEN_VICTORY) {
      drawVictory(state, best);
    } else {
      drawHud(state, best);
    }
    // Vignette, so the edges fall into the dark.
    const vignette = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
    );
    vignette.addColorStop(0, 'rgba(11, 10, 26, 0)');
    vignette.addColorStop(1, 'rgba(11, 10, 26, 0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  return { draw, fit };
}

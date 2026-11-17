// Emberward: every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size. The Last Lantern stands at the arena's heart: its glow
// slowly mends the wisp who stands inside it, and the dark keeps sending things in.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The last wave. Beat the Gloomwarden here and the Hollow is yours. */
export const FINAL_WAVE = 10;

export const PLAYER = {
  radius: 16,
  speed: 300,
  maxHp: 100,
  fireInterval: 0.22,
  bulletSpeed: 640,
  bulletDamage: 12,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 2.4,
  invulnerable: 0.9,
  pickupRadius: 26,
};

export const LANTERN = {
  x: FIELD.width / 2,
  y: FIELD.height / 2,
  radius: 150,
  healPerSecond: 3,
};

export const ENEMIES = {
  mote: { radius: 14, hp: 18, speed: 95, damage: 8, score: 50, ember: 2, color: '#b78cff' },
  darter: { radius: 12, hp: 12, speed: 205, damage: 6, score: 80, ember: 2, color: '#ff7ad9' },
  spitter: { radius: 16, hp: 26, speed: 70, damage: 10, score: 120, ember: 3, color: '#7dff9e' },
  brute: { radius: 26, hp: 110, speed: 52, damage: 16, score: 250, ember: 5, color: '#ff9a5c' },
  boss: { radius: 44, hp: 2400, speed: 58, damage: 22, score: 2500, ember: 20, color: '#ff4d6d' },
};

export const COMBO = { window: 4, perKill: 0.1, max: 4 };

export const PALETTE = {
  backdrop: '#0b0a1a',
  hollow: '#14122e',
  ground: '#1b1840',
  ring: '#2c2560',
  lanternGlow: '#ffc46b',
  lanternCore: '#ffe9b0',
  player: '#ffd166',
  playerCore: '#fff3c4',
  bullet: '#ffe08a',
  ember: '#ffb347',
  heart: '#ff6b81',
  star: '#8ef1ff',
  panel: '#17142e',
  panelEdge: '#3d3478',
  text: '#f4efff',
  muted: '#9a92c8',
  danger: '#ff5c7a',
  boss: '#ff4d6d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberward.best';

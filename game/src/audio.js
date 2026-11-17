// Every sound in Emberward is synthesized with WebAudio: no audio files, no
// network, nothing to load. Short blips and thuds for actions, and a slow
// minor-key bass-and-pad loop for the Hollow itself. Audio only starts after a
// player gesture (or never, in screenshot mode, where it stays silent).
let context = null;
let master = null;
let musicGain = null;
let muted = false;
let musicTimer = null;
let musicStep = 0;

/** The Hollow's drone: A minor, one slow bar of eight eighth-notes. */
const BASS_LINE = [110, 0, 130.81, 0, 98, 0, 146.83, 0];
const PAD_CHORD = [220, 261.63, 329.63];

function ensureContext() {
  if (context) return context;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    musicGain = context.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
  } catch {
    context = null;
  }
  return context;
}

/** Call from any player gesture; resumes the context browsers start suspended. */
export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  startMusic();
}

export function toggleMute() {
  muted = !muted;
  if (master && context) master.gain.setValueAtTime(muted ? 0 : 0.5, context.currentTime);
  return muted;
}

export function isMuted() {
  return muted;
}

function tone({ frequency, endFrequency, duration, type, volume, when = 0, slideTo }) {
  const ctx = ensureContext();
  if (!ctx || !master) return;
  const start = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
  else if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function noise({ duration, volume, frequency, when = 0 }) {
  const ctx = ensureContext();
  if (!ctx || !master) return;
  const start = ctx.currentTime + when;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
}

/** Named effects the game triggers: shoot, hit, kill, hurt, pickup, dash, wave, boss, win, lose. */
export function playSound(name) {
  if (muted) return;
  switch (name) {
    case 'shoot':
      tone({ frequency: 880, endFrequency: 440, duration: 0.07, type: 'square', volume: 0.08 });
      break;
    case 'hit':
      tone({ frequency: 220, endFrequency: 140, duration: 0.06, type: 'triangle', volume: 0.12 });
      break;
    case 'kill':
      tone({ frequency: 523, endFrequency: 1046, duration: 0.16, type: 'sine', volume: 0.16 });
      tone({ frequency: 784, duration: 0.12, type: 'sine', volume: 0.1, when: 0.05 });
      break;
    case 'hurt':
      tone({ frequency: 160, endFrequency: 60, duration: 0.25, type: 'sawtooth', volume: 0.2 });
      noise({ duration: 0.15, volume: 0.12, frequency: 900 });
      break;
    case 'pickup':
      tone({ frequency: 659, duration: 0.09, type: 'sine', volume: 0.14 });
      tone({ frequency: 988, duration: 0.12, type: 'sine', volume: 0.12, when: 0.07 });
      break;
    case 'heart':
      tone({ frequency: 440, duration: 0.12, type: 'sine', volume: 0.14 });
      tone({ frequency: 554, duration: 0.12, type: 'sine', volume: 0.14, when: 0.09 });
      tone({ frequency: 659, duration: 0.18, type: 'sine', volume: 0.14, when: 0.18 });
      break;
    case 'dash':
      noise({ duration: 0.18, volume: 0.1, frequency: 2400 });
      break;
    case 'wave':
      tone({ frequency: 220, duration: 0.35, type: 'triangle', volume: 0.16 });
      tone({ frequency: 330, duration: 0.35, type: 'triangle', volume: 0.12, when: 0.12 });
      break;
    case 'boss':
      tone({ frequency: 98, endFrequency: 49, duration: 0.7, type: 'sawtooth', volume: 0.22 });
      noise({ duration: 0.5, volume: 0.14, frequency: 500 });
      break;
    case 'upgrade':
      tone({ frequency: 523, duration: 0.1, type: 'sine', volume: 0.14 });
      tone({ frequency: 659, duration: 0.1, type: 'sine', volume: 0.14, when: 0.08 });
      tone({ frequency: 784, duration: 0.16, type: 'sine', volume: 0.14, when: 0.16 });
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((frequency, i) =>
        tone({ frequency, duration: 0.3, type: 'sine', volume: 0.15, when: i * 0.13 }));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((frequency, i) =>
        tone({ frequency, duration: 0.32, type: 'triangle', volume: 0.15, when: i * 0.16 }));
      break;
    default:
      break;
  }
}

function musicBar() {
  const ctx = ensureContext();
  if (!ctx || !musicGain) return;
  const bass = BASS_LINE[musicStep % BASS_LINE.length];
  if (bass) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = bass;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
    oscillator.connect(gain);
    gain.connect(musicGain);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.45);
  }
  if (musicStep % 8 === 0) {
    for (const frequency of PAD_CHORD) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.6);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.4);
      oscillator.connect(gain);
      gain.connect(musicGain);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 3.5);
    }
  }
  musicStep += 1;
}

export function startMusic() {
  if (musicTimer || !ensureContext()) return;
  musicTimer = window.setInterval(musicBar, 450);
}

export function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
}

// Keyboard and mouse, read once a frame. Movement is WASD or arrows; the mouse
// aims and the held button (or Space) fires; Shift dashes; P pauses; M mutes.
// Actions are edge-triggered bits the main loop takes and clears each frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_UPGRADE_1 = 16;
export const ACTION_UPGRADE_2 = 32;
export const ACTION_UPGRADE_3 = 64;

const MOVE_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    mouseX: 640,
    mouseY: 300,
    mouseDown: false,
    actions: 0,
    clicked: false,
    clickX: 0,
    clickY: 0,
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const offsetX = (rect.width - 1280 * scale) / 2;
    const offsetY = (rect.height - 720 * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      state.actions |= ACTION_CONFIRM;
      event.preventDefault();
    }
    if (event.code === 'KeyP' || event.code === 'Escape') state.actions |= ACTION_PAUSE;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') state.actions |= ACTION_DASH;
    if (event.code === 'KeyM') state.actions |= ACTION_MUTE;
    if (event.code === 'Digit1') state.actions |= ACTION_UPGRADE_1;
    if (event.code === 'Digit2') state.actions |= ACTION_UPGRADE_2;
    if (event.code === 'Digit3') state.actions |= ACTION_UPGRADE_3;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const point = toLogical(event);
    state.mouseX = point.x;
    state.mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toLogical(event);
    state.mouseX = point.x;
    state.mouseY = point.y;
    state.mouseDown = true;
    state.clicked = true;
    state.clickX = point.x;
    state.clickY = point.y;
  });
  window.addEventListener('mouseup', () => { state.mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    state,
    /** The held movement direction, normalised. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const move = MOVE_KEYS[code];
        if (move) {
          x += move[0];
          y += move[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    firing() {
      return state.mouseDown || keys.has('Space');
    },
    takeActions() {
      const actions = state.actions;
      state.actions = 0;
      return actions;
    },
    takeClick() {
      if (!state.clicked) return null;
      state.clicked = false;
      return { x: state.clickX, y: state.clickY };
    },
  };
}

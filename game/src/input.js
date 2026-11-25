// Mouse and keyboard, translated into intents the main loop consumes: add this ingredient,
// serve, scrap, undo, confirm, pause, mute. The canvas is letterboxed by the renderer; the
// shared `view` transform turns client coordinates back into kitchen coordinates.

import { INGREDIENTS } from './config.js';
import { BIN_RECTS, SERVE_BUTTON, TRASH_BUTTON, UNDO_BUTTON, pointInRect } from './layout.js';
import { view } from './render.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  let actions = 0;
  const ingredientQueue = [];
  let serveQueued = false;
  let scrapQueued = false;
  let undoQueued = false;
  /** What the pointer is over, for the renderer's highlights: {kind:'bin',index} etc. */
  let hover = null;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - view.ox) / view.scale,
      y: (event.clientY - rect.top - view.oy) / view.scale,
    };
  }

  function hitAt(x, y) {
    for (let i = 0; i < BIN_RECTS.length; i += 1) {
      if (pointInRect(x, y, BIN_RECTS[i])) return { kind: 'bin', index: i };
    }
    if (pointInRect(x, y, SERVE_BUTTON)) return { kind: 'serve' };
    if (pointInRect(x, y, TRASH_BUTTON)) return { kind: 'trash' };
    if (pointInRect(x, y, UNDO_BUTTON)) return { kind: 'undo' };
    return null;
  }

  canvas.addEventListener('pointermove', (event) => {
    const { x, y } = toLogical(event);
    hover = hitAt(x, y);
  });

  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = toLogical(event);
    const hit = hitAt(x, y);
    // A click on empty space confirms the title / game-over screens; a click on a control
    // is that control's intent only, so starting a shift never also serves a plate.
    if (!hit) {
      actions |= ACTION_CONFIRM;
      return;
    }
    if (hit.kind === 'bin') ingredientQueue.push(INGREDIENTS[hit.index].id);
    else if (hit.kind === 'serve') serveQueued = true;
    else if (hit.kind === 'trash') scrapQueued = true;
    else if (hit.kind === 'undo') undoQueued = true;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const digit = ['1', '2', '3', '4', '5', '6', '7', '8'].indexOf(event.key);
    if (digit !== -1) {
      ingredientQueue.push(INGREDIENTS[digit].id);
      return;
    }
    switch (event.code) {
      case 'Space':
      case 'Enter':
        actions |= ACTION_CONFIRM;
        event.preventDefault();
        break;
      case 'Backspace':
      case 'Delete':
        undoQueued = true;
        event.preventDefault();
        break;
      case 'KeyT':
        scrapQueued = true;
        break;
      case 'KeyP':
      case 'Escape':
        actions |= ACTION_PAUSE;
        break;
      case 'KeyM':
        actions |= ACTION_MUTE;
        break;
      default:
        break;
    }
  });

  return {
    /** Pending action bits; reading clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Ingredient ids clicked or keyed since the last read, in order. */
    takeIngredients() {
      return ingredientQueue.splice(0, ingredientQueue.length);
    },
    takeServe() {
      const taken = serveQueued;
      serveQueued = false;
      return taken;
    },
    takeScrap() {
      const taken = scrapQueued;
      scrapQueued = false;
      return taken;
    },
    takeUndo() {
      const taken = undoQueued;
      undoQueued = false;
      return taken;
    },
    getHover() {
      return hover;
    },
  };
}

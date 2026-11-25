// Where everything sits in the 1280x720 kitchen. The renderer draws by these numbers and
// the input handler hit-tests by the same numbers, so the two can never drift apart.

import { INGREDIENTS, MAX_ORDERS } from './config.js';

/** Top strip: logo, score, combo, the shift clock and the stars. */
export const HUD = { y: 0, height: 58 };

/** Order tickets hang on the board under the HUD, in slots left to right. */
export const TICKET = { y: 72, width: 292, height: 160, gap: 16, firstX: 24 };

export function ticketRect(index) {
  return { x: TICKET.firstX + index * (TICKET.width + TICKET.gap), y: TICKET.y, w: TICKET.width, h: TICKET.height };
}

/** The "now cooking" card on the left of the pass: target dish and its layer checklist. */
export const RECIPE_CARD = { x: 24, y: 262, w: 276, h: 196 };

/** The plate the dish is stacked on, centre of the pass. Layers rise from baseY. */
export const PLATE = { cx: 640, baseY: 448, width: 320, layerHeight: 15, layerWidth: 218 };

/** Buttons on the right of the pass. */
export const SERVE_BUTTON = { x: 996, y: 292, w: 260, h: 86 };
export const UNDO_BUTTON = { x: 996, y: 392, w: 124, h: 50 };
export const TRASH_BUTTON = { x: 1132, y: 392, w: 124, h: 50 };

/** The ingredient counter along the bottom: one bin per ingredient, keys 1-8. */
export const BIN = { y: 540, height: 152, width: 140, gap: 12, firstX: 38 };

export function binRect(index) {
  return { x: BIN.firstX + index * (BIN.width + BIN.gap), y: BIN.y, w: BIN.width, h: BIN.height };
}

export const BIN_RECTS = INGREDIENTS.map((_, index) => binRect(index));

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export { MAX_ORDERS };

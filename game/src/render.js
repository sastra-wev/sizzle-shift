// All the drawing: a warm little kitchen in canvas 2D — order board with customer tickets
// across the top, the pass with the plate in the middle, the ingredient counter along the
// bottom, and title / pause / shift-summary overlays. One renderer, no DOM, no images:
// every ingredient, face and utensil is drawn from shapes, so the game is one folder of
// text files and plays offline.

import { FIELD, FONT, INGREDIENTS, INGREDIENT_BY_ID, PALETTE, SHIFT_SECONDS } from './config.js';
import { HUD, PLATE, RECIPE_CARD, SERVE_BUTTON, TRASH_BUTTON, UNDO_BUTTON, binRect, ticketRect } from './layout.js';
import { isPrefixOf, nextNeeded, plateIsComplete, targetOrder } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The letterbox transform from client pixels to kitchen coordinates; input.js reads it. */
export const view = { scale: 1, ox: 0, oy: 0 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatClock(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** One ingredient layer of a stack, drawn sitting on `bottomY`, centred on `cx`. */
export function drawLayer(ctx, id, cx, bottomY, width, tall) {
  const ingredient = INGREDIENT_BY_ID[id];
  const half = width / 2;
  ctx.save();
  switch (ingredient.kind) {
    case 'bun': {
      const grad = ctx.createLinearGradient(0, bottomY - tall, 0, bottomY);
      grad.addColorStop(0, '#f2bc66');
      grad.addColorStop(1, ingredient.dark);
      ctx.fillStyle = grad;
      roundRect(ctx, cx - half, bottomY - tall, width, tall, 6);
      ctx.fill();
      break;
    }
    case 'patty': {
      ctx.fillStyle = ingredient.main;
      roundRect(ctx, cx - half - 4, bottomY - tall, width + 8, tall, 7);
      ctx.fill();
      ctx.fillStyle = ingredient.dark;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(cx - half + 20 + i * (width - 40) / 4, bottomY - tall / 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.moveTo(cx - half - 8, bottomY - tall);
      ctx.lineTo(cx + half + 8, bottomY - tall);
      ctx.lineTo(cx + half + 8, bottomY - 3);
      ctx.lineTo(cx + half - 26, bottomY - 3);
      ctx.lineTo(cx + half - 40, bottomY + 4);
      ctx.lineTo(cx + 6, bottomY - 3);
      ctx.lineTo(cx - 12, bottomY + 4);
      ctx.lineTo(cx - 26, bottomY - 3);
      ctx.lineTo(cx - half - 8, bottomY - 3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.moveTo(cx - half - 10, bottomY - 3);
      for (let x = -half - 10; x <= half + 10; x += 14) {
        ctx.quadraticCurveTo(cx + x + 7, bottomY - tall - 6, cx + x + 14, bottomY - 3);
      }
      ctx.lineTo(cx + half + 10, bottomY);
      ctx.lineTo(cx - half - 10, bottomY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ingredient.dark;
      ctx.fillRect(cx - half - 10, bottomY - 2.5, width + 20, 2.5);
      break;
    }
    case 'tomato': {
      for (const offset of [-width / 5, width / 5]) {
        ctx.fillStyle = ingredient.main;
        ctx.beginPath();
        ctx.arc(cx + offset, bottomY - tall / 2, tall * 0.78, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1948a';
        ctx.beginPath();
        ctx.arc(cx + offset, bottomY - tall / 2, tall * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'egg': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.ellipse(cx, bottomY - tall / 2, half * 0.72, tall * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ingredient.dark;
      ctx.beginPath();
      ctx.arc(cx, bottomY - tall / 2, tall * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbc531';
      ctx.beginPath();
      ctx.arc(cx - 2, bottomY - tall / 2 - 2, tall * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bacon': {
      for (const row of [0, 1]) {
        const y = bottomY - 3 - row * (tall / 2 + 1);
        ctx.strokeStyle = ingredient.main;
        ctx.lineWidth = tall / 2.4;
        ctx.beginPath();
        for (let x = -half; x <= half; x += 8) {
          const yy = y - Math.sin((x + half) / 16 + row * 2) * 2.4;
          if (x === -half) ctx.moveTo(cx + x, yy);
          else ctx.lineTo(cx + x, yy);
        }
        ctx.stroke();
        ctx.strokeStyle = '#e5989b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = -half; x <= half; x += 8) {
          const yy = y - Math.sin((x + half) / 16 + row * 2) * 2.4;
          if (x === -half) ctx.moveTo(cx + x, yy);
          else ctx.lineTo(cx + x, yy);
        }
        ctx.stroke();
      }
      break;
    }
    case 'onion': {
      ctx.strokeStyle = ingredient.main;
      for (const r of [0.32, 0.55, 0.78]) {
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(cx, bottomY - tall / 2, half * r, tall * 0.52 * r + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#efe3f5';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, bottomY - tall / 2, half * 0.55, tall * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** The same ingredient as a counter sample, drawn inside a bin tray. */
function drawSample(ctx, id, cx, cy, size) {
  const ingredient = INGREDIENT_BY_ID[id];
  ctx.save();
  switch (ingredient.kind) {
    case 'bun': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.18, size * 0.42, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fdf0d0';
      for (const [dx, dy] of [[-14, -8], [0, -14], [14, -8], [-7, -3], [8, -4]]) {
        ctx.beginPath();
        ctx.ellipse(cx + dx, cy + dy, 2.6, 1.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = ingredient.main;
      roundRect(ctx, cx - size * 0.44, cy - size * 0.16, size * 0.88, size * 0.32, 8);
      ctx.fill();
      ctx.fillStyle = ingredient.dark;
      roundRect(ctx, cx - size * 0.44, cy + size * 0.04, size * 0.88, size * 0.12, 6);
      ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.42, cy + size * 0.2);
      ctx.lineTo(cx, cy - size * 0.3);
      ctx.lineTo(cx + size * 0.42, cy + size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ingredient.dark;
      ctx.beginPath();
      ctx.arc(cx - 6, cy + 2, 3, 0, Math.PI * 2);
      ctx.arc(cx + 9, cy + 7, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.arc(cx - size * 0.2, cy, size * 0.24, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.2, cy, size * 0.24, 0, Math.PI * 2);
      ctx.arc(cx, cy - size * 0.14, size * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ingredient.dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.3);
      ctx.quadraticCurveTo(cx + 4, cy, cx, cy + size * 0.26);
      ctx.stroke();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1948a';
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ingredient.dark;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'egg': {
      ctx.fillStyle = ingredient.main;
      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.42, size * 0.3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ingredient.dark;
      ctx.beginPath();
      ctx.arc(cx + 2, cy - 1, size * 0.17, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bacon': {
      ctx.strokeStyle = ingredient.main;
      ctx.lineWidth = 7;
      for (const dy of [-9, 5]) {
        ctx.beginPath();
        for (let x = -size * 0.4; x <= size * 0.4; x += 7) {
          const yy = cy + dy + Math.sin(x / 9) * 3;
          if (x <= -size * 0.4 + 0.1) ctx.moveTo(cx + x, yy);
          else ctx.lineTo(cx + x, yy);
        }
        ctx.stroke();
      }
      break;
    }
    case 'onion': {
      ctx.strokeStyle = ingredient.main;
      for (const r of [0.16, 0.26, 0.36]) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** A customer's face: friendly while patient, grimacing when the bar runs low. */
function drawCustomer(ctx, customer, cx, cy, r, patienceFrac) {
  ctx.save();
  ctx.fillStyle = customer.skin;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = customer.hair;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.18, r, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 0.55, cx, cy - r * 0.42);
  ctx.quadraticCurveTo(cx - r * 0.4, cy - r * 0.55, cx - r, cy - r * 0.18);
  ctx.fill();
  ctx.fillStyle = '#33241a';
  for (const dx of [-0.34, 0.34]) {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + r * 0.05, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#33241a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (patienceFrac > 0.45) ctx.arc(cx, cy + r * 0.28, r * 0.4, Math.PI * 0.15, Math.PI * 0.85);
  else if (patienceFrac > 0.2) {
    ctx.moveTo(cx - r * 0.28, cy + r * 0.42);
    ctx.lineTo(cx + r * 0.28, cy + r * 0.42);
  } else ctx.arc(cx, cy + r * 0.72, r * 0.34, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, filled) {
  ctx.save();
  ctx.fillStyle = filled ? PALETTE.gold : 'rgba(255,246,230,0.22)';
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFlame(ctx, cx, cy, s) {
  ctx.save();
  ctx.fillStyle = '#e5534b';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.quadraticCurveTo(cx + s * 0.8, cy - s * 0.1, cx + s * 0.55, cy + s * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s, cx, cy + s);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s, cx - s * 0.55, cy + s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.8, cy - s * 0.1, cx, cy - s);
  ctx.fill();
  ctx.fillStyle = '#f7b731';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.2);
  ctx.quadraticCurveTo(cx + s * 0.4, cy + s * 0.3, cx, cy + s * 0.8);
  ctx.quadraticCurveTo(cx - s * 0.4, cy + s * 0.3, cx, cy - s * 0.2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    view.scale = Math.min(w / FIELD.width, h / FIELD.height);
    view.ox = (w - FIELD.width * view.scale) / 2;
    view.oy = (h - FIELD.height * view.scale) / 2;
  }

  function drawKitchen(state, now) {
    // Wall with a faint tile grid.
    const wall = ctx.createLinearGradient(0, 0, 0, 500);
    wall.addColorStop(0, PALETTE.wallTop);
    wall.addColorStop(1, PALETTE.wallBottom);
    ctx.fillStyle = wall;
    ctx.fillRect(0, HUD.height, FIELD.width, 428);
    ctx.strokeStyle = PALETTE.tileLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, HUD.height);
      ctx.lineTo(x, 486);
      ctx.stroke();
    }
    for (let y = HUD.height + 8; y <= 486; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Pennant garland strung across the pass.
    ctx.strokeStyle = PALETTE.shelfDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(330, 246);
    ctx.quadraticCurveTo(640, 268, 950, 246);
    ctx.stroke();
    const flagColours = ['#e5534b', '#f7b731', '#58b368', '#4fc3f7', '#c39bd3'];
    for (let i = 0; i < 9; i += 1) {
      const t = (i + 0.5) / 9;
      const x = 330 + (950 - 330) * t;
      const y = 246 + Math.sin(t * Math.PI) * 15;
      ctx.fillStyle = flagColours[i % flagColours.length];
      ctx.beginPath();
      ctx.moveTo(x - 11, y);
      ctx.lineTo(x + 11, y);
      ctx.lineTo(x, y + 17);
      ctx.closePath();
      ctx.fill();
    }

    // A steaming pot on the left of the plate and a stack of clean plates on the right.
    ctx.fillStyle = PALETTE.steelDark;
    roundRect(ctx, 428, 418, 92, 34, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.steel;
    roundRect(ctx, 422, 408, 104, 14, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const baseX = 452 + i * 22;
      ctx.beginPath();
      for (let s = 0; s <= 20; s += 2) {
        const yy = 404 - s * 2.2;
        const xx = baseX + Math.sin(now * 1.6 + i * 2.1 + s * 0.35) * 4 * (s / 20);
        if (s === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i % 2 ? '#f4f6f8' : '#e3e7ec';
      ctx.beginPath();
      ctx.ellipse(838, 446 - i * 7, 52, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // The wooden pass the plate sits on.
    ctx.fillStyle = PALETTE.counterTop;
    ctx.fillRect(0, 462, FIELD.width, 26);
    ctx.fillStyle = PALETTE.counterDark;
    ctx.fillRect(0, 486, FIELD.width, 6);
  }

  function drawHud(state) {
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, 0, FIELD.width, HUD.height);
    ctx.fillStyle = PALETTE.boardEdge;
    ctx.fillRect(0, HUD.height - 4, FIELD.width, 4);
    drawFlame(ctx, 34, 28, 15);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = `800 25px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIZZLE SHIFT', 58, 30);

    // The shift clock, centre stage: the number and a draining bar under it.
    const frac = state.timeLeft / SHIFT_SECONDS;
    ctx.textAlign = 'center';
    ctx.fillStyle = frac < 0.18 ? PALETTE.bad : PALETTE.cream;
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText(`⏱ ${formatClock(state.timeLeft)}`, 640, 26);
    ctx.fillStyle = 'rgba(255,246,230,0.25)';
    roundRect(ctx, 520, 44, 240, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = frac < 0.18 ? PALETTE.bad : PALETTE.good;
    roundRect(ctx, 520, 44, Math.max(0, 240 * frac), 7, 3.5);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.cream;
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText(`SCORE ${state.score}`, 806, 30);
    if (state.combo >= 2) {
      drawFlame(ctx, 1032, 28, 11);
      ctx.fillStyle = PALETTE.warn;
      ctx.font = `800 21px ${FONT}`;
      ctx.fillText(`COMBO ×${state.combo}`, 1050, 30);
    }
    for (let i = 0; i < 3; i += 1) drawStar(ctx, 1186 + i * 34, 29, 13, i < state.stars);
  }

  function drawTicket(state, order, index, now) {
    const rect = ticketRect(index);
    const frac = Math.max(0, order.patience / order.patienceMax);
    const isTarget = targetOrder(state) === order;
    const complete = plateIsComplete(state) && isTarget;
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((index % 2 === 0 ? -1 : 1) * 0.008);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    ctx.shadowColor = 'rgba(40,20,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = PALETTE.ticket;
    roundRect(ctx, 0, 0, rect.w, rect.h, 8);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = complete ? 4 : isTarget ? 3 : 1;
    ctx.strokeStyle = complete ? PALETTE.good : isTarget ? PALETTE.gold : PALETTE.ticketLine;
    roundRect(ctx, 0, 0, rect.w, rect.h, 8);
    ctx.stroke();
    // Pin.
    ctx.fillStyle = PALETTE.bad;
    ctx.beginPath();
    ctx.arc(rect.w / 2, 7, 5, 0, Math.PI * 2);
    ctx.fill();

    drawCustomer(ctx, order.customer, 36, 38, 21, frac);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(order.customer.name, 64, 34);
    ctx.font = `800 17px ${FONT}`;
    ctx.fillText(order.recipe.name, 64, 56);
    // Price chip.
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, rect.w - 58, 14, 46, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#6b4e00';
    ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`$${order.recipe.price}`, rect.w - 35, 31);

    // The layer list, bottom first, with the layers already on the plate ticked.
    ctx.textAlign = 'left';
    const layers = order.recipe.layers;
    for (let i = 0; i < layers.length; i += 1) {
      const y = 78 + i * 13.5;
      const onPlate = isTarget && i < state.plate.length;
      ctx.fillStyle = onPlate ? PALETTE.good : PALETTE.muted;
      ctx.font = `700 11.5px ${FONT}`;
      ctx.fillText(onPlate ? '✓' : '•', 14, y);
      ctx.fillStyle = onPlate ? PALETTE.text : PALETTE.muted;
      ctx.fillText(INGREDIENT_BY_ID[layers[i]].name, 28, y);
    }
    // Mini stack on the right, drawn like the real plate in miniature.
    const miniCx = rect.w - 62;
    let miniY = 138;
    for (const layer of layers) {
      drawLayer(ctx, layer, miniCx, miniY, 92, 8);
      miniY -= 8.5;
    }
    ctx.fillStyle = '#eef1f5';
    ctx.beginPath();
    ctx.ellipse(miniCx, 141, 56, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patience bar.
    ctx.fillStyle = '#e7dcc2';
    roundRect(ctx, 12, rect.h - 14, rect.w - 24, 8, 4);
    ctx.fill();
    const pulse = frac < 0.25 ? 0.75 + 0.25 * Math.sin(now * 10) : 1;
    ctx.fillStyle = frac > 0.45 ? PALETTE.good : frac > 0.2 ? PALETTE.warn : PALETTE.bad;
    ctx.globalAlpha = pulse;
    roundRect(ctx, 12, rect.h - 14, Math.max(0, (rect.w - 24) * frac), 8, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (complete) {
      ctx.fillStyle = PALETTE.good;
      roundRect(ctx, rect.w - 108, 44, 96, 22, 11);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 12.5px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('✓ READY!', rect.w - 60, 59);
    }
    ctx.restore();
  }

  function drawBoard(state, now) {
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, 12, 64, FIELD.width - 24, 176, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.boardEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, 12, 64, FIELD.width - 24, 176, 10);
    ctx.stroke();
    state.orders.forEach((order, index) => drawTicket(state, order, index, now));
    if (state.orders.length === 0) {
      ctx.fillStyle = PALETTE.cream;
      ctx.font = `700 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('No tickets — next customer on the way…', 640, 155);
    }
  }

  function drawRecipeCard(state) {
    const { x, y, w, h } = RECIPE_CARD;
    ctx.save();
    ctx.shadowColor = 'rgba(40,20,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = PALETTE.ticket;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = PALETTE.ticketLine;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `800 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('NOW COOKING', x + 16, y + 24);
    const target = targetOrder(state);
    if (!target) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 16px ${FONT}`;
      ctx.fillText('No dish on the go.', x + 16, y + 56);
      ctx.font = `500 13.5px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Pick a ticket and start with', x + 16, y + 84);
      ctx.fillText('its bottom layer — usually', x + 16, y + 104);
      ctx.fillText('the bun. Keys 1–8 add layers.', x + 16, y + 124);
      ctx.restore();
      return;
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 19px ${FONT}`;
    ctx.fillText(target.recipe.name, x + 16, y + 52);
    ctx.font = `600 12.5px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`for ${target.customer.name} · $${target.recipe.price}`, x + 16, y + 72);
    const needed = nextNeeded(state);
    target.recipe.layers.forEach((layerId, i) => {
      const rowY = y + 100 + i * 16;
      const done = i < state.plate.length;
      const isNext = layerId === needed && i === state.plate.length;
      ctx.fillStyle = done ? PALETTE.good : isNext ? '#d98a00' : PALETTE.muted;
      ctx.font = `800 13px ${FONT}`;
      ctx.fillText(done ? '✓' : isNext ? '▸' : '○', x + 16, rowY);
      ctx.fillStyle = done ? PALETTE.muted : PALETTE.text;
      ctx.font = `${isNext ? '800' : '600'} 13.5px ${FONT}`;
      ctx.fillText(INGREDIENT_BY_ID[layerId].name + (isNext ? '  ← next' : ''), x + 36, rowY);
    });
    ctx.restore();
  }

  function drawPlateArea(state, now) {
    // Plate and its stack.
    ctx.fillStyle = 'rgba(60,30,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(PLATE.cx, PLATE.baseY + 12, PLATE.width / 2 + 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdfdfd';
    ctx.beginPath();
    ctx.ellipse(PLATE.cx, PLATE.baseY + 4, PLATE.width / 2, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8ecf0';
    ctx.beginPath();
    ctx.ellipse(PLATE.cx, PLATE.baseY + 4, PLATE.width / 2 - 34, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    let layerTop = PLATE.baseY - 2;
    for (const layer of state.plate) {
      drawLayer(ctx, layer, PLATE.cx, layerTop, PLATE.layerWidth, PLATE.layerHeight);
      layerTop -= PLATE.layerHeight;
    }
    if (plateIsComplete(state)) {
      // The closing top bun, sesame and a little flag: this plate is ready to fly.
      const grad = ctx.createLinearGradient(0, layerTop - 34, 0, layerTop);
      grad.addColorStop(0, '#f6c56e');
      grad.addColorStop(1, '#dd9a3e');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(PLATE.cx, layerTop, PLATE.layerWidth / 2, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fdf0d0';
      for (const [dx, dy] of [[-60, -18], [-20, -30], [24, -28], [62, -14], [0, -12]]) {
        ctx.beginPath();
        ctx.ellipse(PLATE.cx + dx, layerTop + dy, 4, 2.2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#8a5527';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PLATE.cx + 66, layerTop - 6);
      ctx.lineTo(PLATE.cx + 66, layerTop - 52);
      ctx.stroke();
      ctx.fillStyle = PALETTE.good;
      ctx.beginPath();
      ctx.moveTo(PLATE.cx + 66, layerTop - 52);
      ctx.lineTo(PLATE.cx + 104, layerTop - 43);
      ctx.lineTo(PLATE.cx + 66, layerTop - 34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.good;
      ctx.font = `800 21px ${FONT}`;
      ctx.textAlign = 'center';
      const bob = Math.sin(now * 3) * 2;
      ctx.fillText('READY TO SERVE!', PLATE.cx, 292 + bob);
    } else if (state.plate.length === 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Your plate is empty — pick a ticket and start stacking', PLATE.cx, 300);
    } else {
      const needed = nextNeeded(state);
      if (needed) {
        ctx.fillStyle = '#7a5a1e';
        ctx.font = `800 17px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`Next: ${INGREDIENT_BY_ID[needed].name}`, PLATE.cx, 300);
      }
    }

    // Popups and the toast.
    for (const popup of state.popups) {
      ctx.globalAlpha = Math.min(1, popup.ttl * 1.6);
      ctx.fillStyle = popup.tone === 'good' ? '#2e7d46' : PALETTE.bad;
      ctx.font = `800 30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.globalAlpha = 1;
    }
    if (state.toast) {
      ctx.globalAlpha = Math.min(1, state.toast.ttl);
      ctx.fillStyle = state.toast.tone === 'bad' ? PALETTE.bad : state.toast.tone === 'warn' ? '#d98a00' : '#2e7d46';
      const w = ctx.measureText(state.toast.text).width + 190;
      roundRect(ctx, 640 - w / 2, 246, w, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(state.toast.text, 640, 266);
      ctx.globalAlpha = 1;
    }
  }

  function drawButtons(state, ui) {
    const complete = plateIsComplete(state);
    const serve = SERVE_BUTTON;
    ctx.save();
    if (complete) {
      ctx.shadowColor = 'rgba(88,179,104,0.85)';
      ctx.shadowBlur = 18 + Math.sin(ui.now * 5) * 6;
    }
    ctx.fillStyle = complete ? PALETTE.good : '#7fae8a';
    roundRect(ctx, serve.x, serve.y, serve.w, serve.h, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 27px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SERVE ▸', serve.x + serve.w / 2, serve.y + 40);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('or press SPACE', serve.x + serve.w / 2, serve.y + 64);
    ctx.restore();

    for (const [rect, label, hint] of [[UNDO_BUTTON, '↩ UNDO', '⌫'], [TRASH_BUTTON, '🗑 TRASH', 'T']]) {
      ctx.fillStyle = '#f4ead2';
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.strokeStyle = PALETTE.shelfDark;
      ctx.lineWidth = 1.5;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.stroke();
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + 22);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 11px ${FONT}`;
      ctx.fillText(`key ${hint}`, rect.x + rect.w / 2, rect.y + 39);
    }
  }

  function drawCounter(state, ui) {
    ctx.fillStyle = PALETTE.counterFront;
    ctx.fillRect(0, 492, FIELD.width, FIELD.height - 492);
    ctx.strokeStyle = PALETTE.counterDark;
    ctx.lineWidth = 2;
    for (let x = 80; x < FIELD.width; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 496);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.cream;
    ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('INGREDIENT COUNTER', 38, 518);
    ctx.fillStyle = 'rgba(255,246,230,0.65)';
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('click a bin — or press its number key — to add that layer', 264, 518);

    const needed = nextNeeded(state);
    for (let i = 0; i < 8; i += 1) {
      const rect = binRect(i);
      const ingredient = INGREDIENTS[i];
      const hovered = ui.hover && ui.hover.kind === 'bin' && ui.hover.index === i;
      const isNext = needed === ingredient.id;
      ctx.save();
      if (isNext) {
        ctx.shadowColor = 'rgba(242,201,76,0.9)';
        ctx.shadowBlur = 16 + Math.sin(ui.now * 5) * 5;
      }
      ctx.fillStyle = hovered ? '#dfe3e8' : PALETTE.steel;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = PALETTE.steelDark;
      roundRect(ctx, rect.x + 8, rect.y + 10, rect.w - 16, 74, 8);
      ctx.fill();
      ctx.fillStyle = '#b7bcc2';
      roundRect(ctx, rect.x + 12, rect.y + 14, rect.w - 24, 66, 7);
      ctx.fill();
      drawSample(ctx, ingredient.id, rect.x + rect.w / 2, rect.y + 48, 64);
      ctx.lineWidth = isNext ? 3.5 : 1.5;
      ctx.strokeStyle = isNext ? PALETTE.gold : 'rgba(51,36,26,0.35)';
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.stroke();
      // Key badge.
      ctx.fillStyle = PALETTE.board;
      ctx.beginPath();
      ctx.arc(rect.x + 17, rect.y + 17, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.cream;
      ctx.font = `800 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(ingredient.key, rect.x + 17, rect.y + 22);
      if (isNext) {
        ctx.fillStyle = PALETTE.gold;
        roundRect(ctx, rect.x + rect.w - 52, rect.y + 5, 46, 19, 9);
        ctx.fill();
        ctx.fillStyle = '#6b4e00';
        ctx.font = `800 11px ${FONT}`;
        ctx.fillText('NEXT', rect.x + rect.w - 29, rect.y + 18);
      }
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 16.5px ${FONT}`;
      ctx.fillText(ingredient.name, rect.x + rect.w / 2, rect.y + 112);
      ctx.fillStyle = 'rgba(51,36,26,0.55)';
      ctx.font = `600 11.5px ${FONT}`;
      ctx.fillText(`press ${ingredient.key}`, rect.x + rect.w / 2, rect.y + 132);
      ctx.restore();
    }
  }

  function drawOverlayCard(w, h) {
    ctx.fillStyle = 'rgba(24,12,2,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = PALETTE.ticket;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, w, h, 16);
    ctx.stroke();
    return { x, y };
  }

  function drawTitleScreen(best) {
    const { x, y } = drawOverlayCard(660, 430);
    drawFlame(ctx, 640, y + 66, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.font = `900 58px ${FONT}`;
    ctx.fillText('SIZZLE SHIFT', 640, y + 128);
    ctx.fillStyle = '#b3541e';
    ctx.font = `700 19px ${FONT}`;
    ctx.fillText('Stack it. Serve it. Beat the clock.', 640, y + 162);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 16.5px ${FONT}`;
    const lines = [
      '🍔  Read the tickets on the order board',
      '🥬  Click the bins (or keys 1–8) to stack each dish in order',
      '⏱  Serve before patience runs out — fast plates earn bonuses',
      '⭐  Three walk-outs and the shift ends early!',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 640, y + 208 + i * 30));
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText(`Best shift so far: ${best} points`, 640, y + 348);
    }
    ctx.fillStyle = PALETTE.good;
    roundRect(ctx, 640 - 170, y + 366, 340, 46, 23);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 18px ${FONT}`;
    ctx.fillText('CLICK OR PRESS SPACE TO START', 640, y + 395);
  }

  function drawOverScreen(state, best) {
    const { x, y } = drawOverlayCard(620, 470);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `900 40px ${FONT}`;
    ctx.fillText(state.stars > 0 ? 'SHIFT COMPLETE!' : 'CLOSED EARLY!', 640, y + 62);
    drawFlame(ctx, 640, y + 108, 20);
    ctx.font = `900 54px ${FONT}`;
    ctx.fillStyle = '#b3541e';
    ctx.fillText(`${state.score}`, 640, y + 168);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText('POINTS', 640, y + 192);
    const rows = [
      ['Dishes served', `${state.served}`],
      ['Customers lost', `${state.lost}`],
      ['Best combo', `×${state.bestCombo}`],
      ['Mistakes', `${state.rejected}`],
      ['Stars kept', '★'.repeat(Math.max(0, state.stars)) + '☆'.repeat(3 - Math.max(0, state.stars))],
    ];
    ctx.font = `600 17px ${FONT}`;
    rows.forEach(([label, value], i) => {
      const rowY = y + 232 + i * 30;
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 90, rowY);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 17px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(value, x + 530, rowY);
      ctx.font = `600 17px ${FONT}`;
    });
    const hats = state.served >= 14 ? 5 : state.served >= 11 ? 4 : state.served >= 8 ? 3 : state.served >= 5 ? 2 : 1;
    const verdicts = { 1: 'Commis in training', 2: 'Line Cook', 3: 'Sous Chef', 4: 'Head Chef', 5: 'Executive Chef!' };
    ctx.textAlign = 'center';
    ctx.font = `800 19px ${FONT}`;
    ctx.fillStyle = '#b3541e';
    ctx.fillText(`${'👨‍🍳'.repeat(hats)}  ${verdicts[hats]}`, 640, y + 400);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 14.5px ${FONT}`;
    ctx.fillText(best > state.score ? `Best shift: ${best} · Press SPACE to work another shift` : 'New best shift! · Press SPACE to work another shift', 640, y + 434);
  }

  function draw(state, screen, best, ui) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    if (state.shake > 0) ctx.translate(Math.sin(ui.now * 70) * state.shake * 14, 0);
    drawKitchen(state, ui.now);
    drawBoard(state, ui.now);
    drawRecipeCard(state);
    drawPlateArea(state, ui.now);
    drawButtons(state, ui);
    drawCounter(state, ui);
    drawHud(state);
    if (state.toast && screen === SCREEN_PLAY) {
      // Toast is drawn in drawPlateArea; nothing extra here.
    }
    if (screen === SCREEN_TITLE) drawTitleScreen(best);
    else if (screen === SCREEN_OVER) drawOverScreen(state, best);
    else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(24,12,2,0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = PALETTE.cream;
      ctx.font = `900 44px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', 640, 340);
      ctx.font = `600 17px ${FONT}`;
      ctx.fillText('Press P or SPACE to get back to the grill', 640, 376);
    }
    if (ui.muted) {
      ctx.fillStyle = 'rgba(255,246,230,0.8)';
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText('🔇 muted (M)', FIELD.width - 16, FIELD.height - 10);
    }
  }

  return { draw };
}

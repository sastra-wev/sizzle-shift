// The kitchen's rules: orders arrive on the board, the player stacks layers on the plate,
// and serving the right stack before a customer's patience runs out scores. The world is
// pure state and rules — no drawing, no input — advanced in fixed steps by main.js and
// steered directly by the screenshot scenes in shots.js.

import {
  CUSTOMER_NAMES, HAIR_COLOURS, INGREDIENT_BY_ID, MAX_ORDERS, RECIPES, RUSH, SCORE,
  SHIFT_SECONDS, SKIN_TONES, STARS,
} from './config.js';

/** Event bits returned by step() and the plate actions, so main.js can react (sound, speech). */
export const EVENT_SERVED = 1;
export const EVENT_WALKOUT = 2;
export const EVENT_SHIFT_OVER = 4;
export const EVENT_REJECTED = 8;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** How far through the shift we are, 0 at the doors opening to 1 at close. */
function rushProgress(state) {
  return Math.min(1, state.elapsed / SHIFT_SECONDS);
}

/** Recipes that can be ordered at this point of the shift. */
function unlockedRecipes(state) {
  return RECIPES.filter((recipe) => recipe.unlockAt <= state.elapsed);
}

/** True when `stack` is exactly the first layers of `recipe`, in order. */
export function isPrefixOf(stack, recipe) {
  if (stack.length > recipe.layers.length) return false;
  for (let i = 0; i < stack.length; i += 1) if (stack[i] !== recipe.layers[i]) return false;
  return true;
}

/** The order the plate is currently building toward: the earliest ticket the stack prefixes. */
export function targetOrder(state) {
  for (const order of state.orders) if (isPrefixOf(state.plate, order.recipe)) return order;
  return null;
}

/** The next layer the target order needs, or null when the plate is complete or off-menu. */
export function nextNeeded(state) {
  const order = targetOrder(state);
  if (!order || state.plate.length >= order.recipe.layers.length) return null;
  return order.recipe.layers[state.plate.length];
}

/** True when the plate exactly matches some open order and can be served. */
export function plateIsComplete(state) {
  return state.orders.some(
    (order) => order.recipe.layers.length === state.plate.length && isPrefixOf(state.plate, order.recipe),
  );
}

export function createWorld(random) {
  const state = {
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    stars: STARS,
    served: 0,
    lost: 0,
    rejected: 0,
    orders: [],
    plate: [],
    spawnTimer: 0,
    nextOrderId: 1,
    popups: [],
    toast: null,
    shake: 0,
    over: false,
    lastServePoints: 0,
  };

  function showToast(text, tone) {
    state.toast = { text, tone, ttl: 2.2 };
  }

  function addPopup(x, y, text, tone) {
    state.popups.push({ x, y, text, tone, ttl: 1.1 });
  }

  /** Deal a new order onto the board; a recipe can be forced (the screenshot scenes do). */
  function spawnOrder(forcedRecipe) {
    if (state.orders.length >= MAX_ORDERS) return null;
    const pool = unlockedRecipes(state);
    const recipe = forcedRecipe ?? random.pick(pool);
    const patienceMax = lerp(RUSH.patienceStart, RUSH.patienceEnd, rushProgress(state)) * random.range(0.9, 1.1);
    const order = {
      id: state.nextOrderId,
      recipe,
      customer: {
        name: random.pick(CUSTOMER_NAMES),
        skin: random.pick(SKIN_TONES),
        hair: random.pick(HAIR_COLOURS),
      },
      patience: patienceMax,
      patienceMax,
    };
    state.nextOrderId += 1;
    state.orders.push(order);
    return order;
  }

  function reset() {
    state.elapsed = 0;
    state.timeLeft = SHIFT_SECONDS;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.stars = STARS;
    state.served = 0;
    state.lost = 0;
    state.rejected = 0;
    state.orders = [];
    state.plate = [];
    state.nextOrderId = 1;
    state.popups = [];
    state.toast = null;
    state.shake = 0;
    state.over = false;
    state.lastServePoints = 0;
    spawnOrder();
    spawnOrder();
    state.spawnTimer = 3.2;
  }

  /**
   * Try to put one layer on the plate. A layer is accepted only while the stack stays a
   * prefix of some open order — the kitchen never builds food nobody ordered. A refused
   * layer breaks the combo and counts as a mistake.
   */
  function addIngredient(id) {
    if (state.over || !INGREDIENT_BY_ID[id]) return 0;
    const candidate = [...state.plate, id];
    if (!state.orders.some((order) => isPrefixOf(candidate, order.recipe))) {
      state.combo = 0;
      state.rejected += 1;
      state.shake = 0.35;
      showToast('No ticket needs that next!', 'bad');
      return EVENT_REJECTED;
    }
    state.plate = candidate;
    return 0;
  }

  /** Take the top layer back off the plate (Backspace). */
  function popTopLayer() {
    if (state.plate.length > 0) state.plate = state.plate.slice(0, -1);
  }

  /** Scrap the whole plate (the trash button). */
  function clearPlate() {
    state.plate = [];
  }

  /**
   * Serve the plate. It must exactly match an open order; the points are the dish price,
   * plus a bonus for the patience left on the ticket and for the running combo.
   */
  function servePlate() {
    if (state.over || state.plate.length === 0) return 0;
    const index = state.orders.findIndex(
      (order) => order.recipe.layers.length === state.plate.length && isPrefixOf(state.plate, order.recipe),
    );
    if (index === -1) {
      state.shake = 0.35;
      showToast('That dish is not finished yet!', 'warn');
      return EVENT_REJECTED;
    }
    const [order] = state.orders.splice(index, 1);
    const patienceBonus = Math.round(SCORE.patienceBonusMax * (order.patience / order.patienceMax));
    const points = order.recipe.price * SCORE.perPricePoint + patienceBonus + state.combo * SCORE.perComboStep;
    state.score += points;
    state.lastServePoints = points;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.served += 1;
    state.plate = [];
    addPopup(640, 300, `+${points}`, 'good');
    showToast(`${order.recipe.name} served!`, 'good');
    return EVENT_SERVED;
  }

  /** Advance the shift: the clock, new orders, draining patience and walk-outs. */
  function step(dt) {
    if (state.over) return 0;
    let events = 0;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    state.shake = Math.max(0, state.shake - dt);
    if (state.toast) {
      state.toast.ttl -= dt;
      if (state.toast.ttl <= 0) state.toast = null;
    }
    for (const popup of state.popups) {
      popup.ttl -= dt;
      popup.y -= 34 * dt;
    }
    state.popups = state.popups.filter((popup) => popup.ttl > 0);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.orders.length < MAX_ORDERS) {
      spawnOrder();
      state.spawnTimer = lerp(RUSH.spawnStart, RUSH.spawnEnd, rushProgress(state)) * random.range(0.85, 1.15);
    }

    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.lost += 1;
        state.combo = 0;
        state.stars -= 1;
        state.score = Math.max(0, state.score - SCORE.walkoutPenalty);
        showToast(`${order.customer.name} walked out!`, 'bad');
        events |= EVENT_WALKOUT;
        if (state.plate.length > 0 && !state.orders.some((o) => isPrefixOf(state.plate, o.recipe))) state.plate = [];
      }
    }

    if (state.timeLeft <= 0 || state.stars <= 0) {
      state.over = true;
      events |= EVENT_SHIFT_OVER;
    }
    return events;
  }

  return { state, reset, step, spawnOrder, addIngredient, popTopLayer, clearPlate, servePlate };
}

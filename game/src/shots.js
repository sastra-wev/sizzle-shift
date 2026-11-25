// The screenshot scenes behind ?shot=start|play|serve|end. Each one arranges a real game
// state — genuine orders, a genuine plate — and hands it to the renderer, so the frame is
// exactly what the game looks like in play and the same seed always gives the same frame.
//   start: the title card over a kitchen with two tickets already on the board
//   play:  mid-rush — three tickets up, a Double Smash half stacked on the plate
//   serve: that same dish finished, top bun on, flagged READY TO SERVE
//   end:   the shift-summary card after a good night's work

import { RECIPES, SHIFT_SECONDS } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe]));

function setPatience(order, fraction) {
  order.patience = order.patienceMax * fraction;
}

/** A busy mid-shift board: three tickets, the first a Double Smash being built. */
function stageRush(world, plateLayers) {
  const { state } = world;
  world.reset();
  state.orders = [];
  const double = world.spawnOrder(RECIPE_BY_ID.double);
  const classic = world.spawnOrder(RECIPE_BY_ID.classic);
  const garden = world.spawnOrder(RECIPE_BY_ID.garden);
  setPatience(double, 0.72);
  setPatience(classic, 0.45);
  setPatience(garden, 0.88);
  state.plate = plateLayers;
  state.elapsed = 63;
  state.timeLeft = SHIFT_SECONDS - 63;
  state.spawnTimer = 2.4;
  return state;
}

export function stageShot(name, world) {
  const { state } = world;
  if (name === 'play') {
    stageRush(world, ['bun', 'patty', 'cheese']);
    state.score = 340;
    state.combo = 4;
    state.bestCombo = 4;
    state.served = 4;
    state.popups.push({ x: 660, y: 330, text: '+85', tone: 'good', ttl: 1 });
    return { screen: SCREEN_PLAY, best: 1240 };
  }
  if (name === 'serve') {
    stageRush(world, ['bun', 'patty', 'cheese', 'patty', 'bacon']);
    state.score = 425;
    state.combo = 5;
    state.bestCombo = 5;
    state.served = 5;
    return { screen: SCREEN_PLAY, best: 1240 };
  }
  if (name === 'end') {
    world.reset();
    state.orders = [state.orders[0]];
    state.elapsed = SHIFT_SECONDS;
    state.timeLeft = 0;
    state.score = 1240;
    state.served = 11;
    state.lost = 1;
    state.bestCombo = 7;
    state.rejected = 3;
    state.stars = 2;
    state.over = true;
    return { screen: SCREEN_OVER, best: 1240 };
  }
  // start (and any unknown name): the title over a fresh kitchen.
  world.reset();
  return { screen: SCREEN_TITLE, best: 1240 };
}

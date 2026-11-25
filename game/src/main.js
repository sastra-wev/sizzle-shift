// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps while a shift is running, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_REJECTED, EVENT_SERVED, EVENT_SHIFT_OVER, EVENT_WALKOUT } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

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
    renderer.draw(world.state, scene.screen, scene.best, { hover: null, muted: false, now: 1.25 });
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
  world.reset();

  function announce(message) {
    status.textContent = message;
  }

  function startShift() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Shift started. Read the tickets and stack the layers in order.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    sound.jingle();
    announce(`Shift over. Score ${world.state.score}. ${world.state.served} dishes served.`);
  }

  function react(events) {
    if (events & EVENT_SERVED) {
      sound.ding();
      announce(`Served! Plus ${world.state.lastServePoints} points.`);
    }
    if (events & EVENT_REJECTED) sound.buzz();
    if (events & EVENT_WALKOUT) {
      sound.thud();
      announce('A customer walked out. One star lost.');
    }
    if (events & EVENT_SHIFT_OVER) endShift();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) sound.toggleMute();
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
        return;
      }
      if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Back to the grill.');
        return;
      }
    }
    if (screen === SCREEN_PLAY) {
      let events = 0;
      for (const id of input.takeIngredients()) {
        if (world.addIngredient(id) === EVENT_REJECTED) events |= EVENT_REJECTED;
        else sound.pop();
      }
      if (input.takeServe()) events |= world.servePlate();
      if (input.takeScrap()) {
        world.clearPlate();
        sound.thud();
      }
      if (input.takeUndo()) world.popTopLayer();
      if ((actions & ACTION_CONFIRM) && !events) events |= world.servePlate();
      react(events);
    } else {
      input.takeIngredients();
      input.takeServe();
      input.takeScrap();
      input.takeUndo();
      if (actions & ACTION_CONFIRM) {
        if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startShift();
        else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        react(world.step(STEP));
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, {
      hover: input.getHover(),
      muted: sound.isMuted(),
      now: now / 1000,
    });
  }

  window.addEventListener('pointerdown', () => sound.unlock());
  window.addEventListener('keydown', () => sound.unlock());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle Shift. Press Space or click to start your shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

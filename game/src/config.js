// Every tuning number, colour and recipe in one place. The kitchen is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on the
// screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Length of one shift, in seconds. */
export const SHIFT_SECONDS = 150;

/** Stars the kitchen starts with; a customer who walks out costs one. */
export const STARS = 3;

/** How many order tickets fit on the board at once. */
export const MAX_ORDERS = 4;

/**
 * The eight ingredients on the counter, in bin order (keys 1-8). Each layer is drawn by the
 * renderer from `kind`: a shape family with its own colours.
 */
export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', key: '1', kind: 'bun', main: '#e8a94e', dark: '#c07f2c' },
  { id: 'patty', name: 'Patty', key: '2', kind: 'patty', main: '#7a4a26', dark: '#5d3719' },
  { id: 'cheese', name: 'Cheese', key: '3', kind: 'cheese', main: '#f7b731', dark: '#e09c12' },
  { id: 'lettuce', name: 'Lettuce', key: '4', kind: 'lettuce', main: '#58b368', dark: '#3f9150' },
  { id: 'tomato', name: 'Tomato', key: '5', kind: 'tomato', main: '#e5534b', dark: '#c23a33' },
  { id: 'egg', name: 'Egg', key: '6', kind: 'egg', main: '#fdf6e3', dark: '#f5a623' },
  { id: 'bacon', name: 'Bacon', key: '7', kind: 'bacon', main: '#b03a48', dark: '#8c2b38' },
  { id: 'onion', name: 'Onion', key: '8', kind: 'onion', main: '#c39bd3', dark: '#9b6fb8' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((item) => [item.id, item]));

/**
 * The menu. A recipe lists its layers from the bottom of the stack to the top; the player
 * must add them in exactly that order. `unlockAt` is the shift second from which the dish
 * can be ordered, so the menu grows as the rush builds.
 */
export const RECIPES = [
  { id: 'classic', name: 'Classic Burger', layers: ['bun', 'patty', 'cheese', 'lettuce'], price: 8, unlockAt: 0 },
  { id: 'garden', name: 'Garden Fresh', layers: ['bun', 'lettuce', 'tomato', 'onion', 'egg'], price: 10, unlockAt: 0 },
  { id: 'breakfast', name: 'Breakfast Bun', layers: ['bun', 'egg', 'bacon', 'cheese'], price: 10, unlockAt: 25 },
  { id: 'blt', name: 'BLT Special', layers: ['bun', 'bacon', 'lettuce', 'tomato'], price: 11, unlockAt: 25 },
  { id: 'double', name: 'Double Smash', layers: ['bun', 'patty', 'cheese', 'patty', 'bacon'], price: 12, unlockAt: 55 },
  { id: 'sunny', name: 'Sunny Stack', layers: ['bun', 'patty', 'egg', 'cheese', 'tomato'], price: 11, unlockAt: 55 },
  { id: 'royal', name: 'Royal Tower', layers: ['bun', 'patty', 'cheese', 'bacon', 'egg', 'onion'], price: 15, unlockAt: 95 },
];

/** First names for the customers on the tickets. */
export const CUSTOMER_NAMES = ['Maya', 'Leo', 'Sofia', 'Ken', 'Aisha', 'Tom', 'Nina', 'Ravi', 'Elena', 'Marco', 'Ivy', 'Omar'];

/** Skin and hair colours the renderer picks from for each customer portrait. */
export const SKIN_TONES = ['#f6cfae', '#eeb98c', '#d99e63', '#a96f3f', '#7c4b26'];
export const HAIR_COLOURS = ['#2d1c10', '#5a3a1a', '#8c5a2b', '#c9c9c9', '#b03a48', '#20303c'];

/** Order spawn gap and patience at the start of a shift and at peak rush (lerped by elapsed). */
export const RUSH = {
  spawnStart: 6.5, spawnEnd: 3.4,
  patienceStart: 52, patienceEnd: 33,
};

/** Scoring: points for a served dish, before the patience and combo bonuses. */
export const SCORE = { perPricePoint: 10, patienceBonusMax: 40, perComboStep: 5, walkoutPenalty: 25 };

export const PALETTE = {
  wallTop: '#f3e2c7',
  wallBottom: '#e8cf9f',
  tileLine: '#dfc491',
  shelf: '#a9713a',
  shelfDark: '#8a5527',
  board: '#3a2a1c',
  boardEdge: '#543d24',
  ticket: '#fff8ea',
  ticketLine: '#d8c9a3',
  counterTop: '#b07a3f',
  counterFront: '#8a5527',
  counterDark: '#6f421e',
  steel: '#c8ccd2',
  steelDark: '#9aa0a8',
  text: '#33241a',
  cream: '#fff6e6',
  muted: '#8a7460',
  good: '#58b368',
  warn: '#f7b731',
  bad: '#e5534b',
  gold: '#f2c94c',
  night: '#201409',
};

export const FONT = '"Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-shift.best';

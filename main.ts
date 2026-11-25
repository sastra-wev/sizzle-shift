// Sizzle Shift — hand-in program (Node 22, standard library only).
//
// The game itself lives in game/ as plain static files (game/index.html plus its ES modules):
// no build step, no library, no network request, so it plays offline in a desktop browser.
// This program performs the hand-in: it copies game/ and screenshots/ from beside this file
// into the output directory and writes dossier.json there with the vendored make.fun library,
// which is the summary the judge reads.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game locally with:  node serve.ts   (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (reference/gate.json). Only text_max_bytes shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse anyway: more than 4
// screenshots or one over 256 KiB, more than 993 files in game/ or 48 MiB of game files in
// all, or a path under game/ over 1000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

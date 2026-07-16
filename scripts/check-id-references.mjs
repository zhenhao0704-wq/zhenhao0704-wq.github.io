#!/usr/bin/env node
// Zero-dependency sanity check: every getElementById('x') in our inline
// scripts must point at an element that actually declares id="x", and no id
// may be declared twice. This catches the exact class of bug where the
// lightbox <img id="lightboxImg"> was referenced as getElementById('lightbox-img').
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'cv.html', 'bodies-left-out.html', 'returned-on-loan.html'];

let failures = 0;

for (const file of files) {
  const html = readFileSync(join(root, file), 'utf8');

  // Collect declared ids.
  const declared = new Map(); // id -> count
  for (const m of html.matchAll(/(?:^|\s)id\s*=\s*["']([^"']+)["']/g)) {
    declared.set(m[1], (declared.get(m[1]) || 0) + 1);
  }

  // Duplicate id check.
  for (const [id, count] of declared) {
    if (count > 1) {
      console.error(`✗ ${file}: id "${id}" declared ${count} times (must be unique)`);
      failures++;
    }
  }

  // Every getElementById('x') must resolve to a declared id.
  for (const m of html.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) {
    const id = m[1];
    if (!declared.has(id)) {
      console.error(`✗ ${file}: getElementById('${id}') has no matching element with id="${id}"`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} id-reference problem(s) found.`);
  process.exit(1);
}
console.log('✓ All getElementById() references resolve and all ids are unique.');

#!/usr/bin/env node
// Regenerates backend/src/words.json (solutions) and backend/src/valid-guesses.json
// (accepted guesses) from two public sources:
//
//   1. words/an-array-of-spanish-words        -> accent-free Spanish dictionary
//   2. hermitdave/FrequencyWords (2018, es)   -> frequency ranking
//
// Solutions = the ~1000 most frequent words that are exactly 5 letters after
// normalization AND present in the dictionary. Valid guesses = every 5-letter
// dictionary word (union with the solutions).
//
// Usage:  node scripts/build-wordlist.mjs [--solutions 1000]
//
// Re-running with a different source or count reshuffles FUTURE daily words;
// days already stored in DynamoDB are frozen and unaffected.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "backend", "src");

const DICT_URL =
  "https://raw.githubusercontent.com/words/an-array-of-spanish-words/master/index.json";
const FREQ_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_full.txt";

const argv = process.argv.slice(2);
const solutionsCount = Number(argv[argv.indexOf("--solutions") + 1] || 1000);

// Strip accents, keep enye, lowercase.
// Must stay behaviourally identical to backend/src/normalize.ts.
const ENYE = String.fromCharCode(0xf1); // "n" with tilde
const PLACEHOLDER = String.fromCharCode(0x01);
const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");
function normalize(word) {
  return word
    .toLowerCase()
    .split(ENYE)
    .join(PLACEHOLDER)
    .normalize("NFD")
    .replace(COMBINING, "")
    .split(PLACEHOLDER)
    .join(ENYE);
}

const FIVE = new RegExp("^[a-z\\u00f1]{5}$");
const isFiveLetters = (w) => FIVE.test(w);

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

console.error("downloading dictionary...");
const dictArray = JSON.parse(await fetchText(DICT_URL));
const fiveLetterDict = new Set(dictArray.map(normalize).filter(isFiveLetters));
console.error("  " + fiveLetterDict.size + " five-letter dictionary words");

console.error("downloading frequency list...");
const freqText = await fetchText(FREQ_URL);
const rankedFive = [];
const seen = new Set();
for (const line of freqText.split("\n")) {
  const token = line.split(/\s+/)[0];
  if (!token) continue;
  const n = normalize(token);
  if (!isFiveLetters(n) || seen.has(n) || !fiveLetterDict.has(n)) continue;
  seen.add(n);
  rankedFive.push(n);
}
console.error(
  "  " + rankedFive.length + " five-letter words with a frequency rank",
);

const solutions = rankedFive.slice(0, solutionsCount).sort();
const validGuesses = Array.from(
  new Set([...fiveLetterDict, ...solutions]),
).sort();

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "words.json"), JSON.stringify(solutions) + "\n");
writeFileSync(
  join(OUT_DIR, "valid-guesses.json"),
  JSON.stringify(validGuesses) + "\n",
);

console.error(
  "wrote words.json (" +
    solutions.length +
    ") and valid-guesses.json (" +
    validGuesses.length +
    ")",
);

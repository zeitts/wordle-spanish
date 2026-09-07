#!/usr/bin/env node
// Regenerates backend/src/words.json (solutions) and backend/src/valid-guesses.json
// (accepted guesses) from two public sources:
//
//   1. words/an-array-of-spanish-words        -> accent-free Spanish dictionary
//   2. hermitdave/FrequencyWords (2018, es)   -> frequency ranking
//
// Solutions = the ~1000 most frequent words that are exactly 5 letters after
// normalization AND present in the dictionary AND are not a conjugated verb
// form -- tú/usted/etc. from Jehle's tables (CONJUGATIONS_URL) plus the derived
// regular voseo forms (vos hablás / hablá). Valid guesses = every 5-letter dictionary
// word, unioned with the (pre-filter) solutions and every 5-letter conjugated
// verb form -- so conjugations stay acceptable as guesses, they just never
// show up as the answer of the day.
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
// Fred Jehle's Spanish verb database: ~600 common verbs, fully conjugated
// (indicative / subjunctive / imperative + gerund + past participle).
const CONJUGATIONS_URL =
  "https://raw.githubusercontent.com/ghidinelli/fred-jehle-spanish-verbs/master/jehle_verb_database.csv";

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

// Minimal RFC-4180 CSV parser: handles quoted fields with embedded commas,
// newlines and doubled quotes. Returns an array of row arrays.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

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

console.error("downloading verb conjugations...");
const conjRows = parseCsv(await fetchText(CONJUGATIONS_URL));
const header = conjRows[0];
// Every column that holds an actual word form (not the english glosses).
const formCols = [
  "form_1s", "form_2s", "form_3s", "form_1p", "form_2p", "form_3p",
  "gerund", "pastparticiple",
].map((name) => header.indexOf(name));
const infinitiveCol = header.indexOf("infinitive");
const conjugatedFive = new Set();
const infinitives = new Set();
for (const r of conjRows.slice(1)) {
  infinitives.add(normalize(r[infinitiveCol] ?? ""));
  for (const col of formCols) {
    const cell = r[col];
    if (!cell) continue;
    // Cells can hold "no hables", "hable/hablá", etc. -- split and check each.
    for (const token of cell.split(/[\s/]+/)) {
      const n = normalize(token);
      if (isFiveLetters(n)) conjugatedFive.add(n);
    }
  }
}

// Jehle's tables are tú/usted only -- they carry no voseo column. Derive the
// regular vos forms (present indicative + affirmative imperative) from each
// infinitive: they're regular for essentially every verb (vos tenés, vos podés
// -- no diphthong), so a rule beats a lookup here.
const VOSEO = { ar: ["as", "a"], er: ["es", "e"], ir: ["is", "i"] };
for (let inf of infinitives) {
  if (inf.endsWith("se") && inf.length > 4) inf = inf.slice(0, -2); // reflexive
  const ending = inf.slice(-2);
  const suffixes = VOSEO[ending];
  if (!suffixes) continue;
  const stem = inf.slice(0, -2);
  for (const s of suffixes) {
    const form = normalize(stem + s);
    if (isFiveLetters(form)) conjugatedFive.add(form);
  }
}
console.error("  " + conjugatedFive.size + " five-letter conjugated forms");

const rankedNonVerb = rankedFive.filter((w) => !conjugatedFive.has(w));
console.error(
  "  " +
    (rankedFive.length - rankedNonVerb.length) +
    " conjugated forms removed from the solution pool",
);

const solutions = rankedNonVerb.slice(0, solutionsCount).sort();
const validGuesses = Array.from(
  new Set([...fiveLetterDict, ...solutions, ...conjugatedFive]),
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

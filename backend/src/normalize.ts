// Normalize a word or guess for comparison: lowercase, strip accents, keep the
// enye as its own letter, drop anything that is not a-z or enye.
// Must stay behaviourally identical to scripts/build-wordlist.mjs and
// frontend/src/lib/normalize.ts.

const ENYE = String.fromCharCode(0xf1); // lowercase n-with-tilde
const PLACEHOLDER = String.fromCharCode(0x01); // never appears in user input
const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");
const NOT_LETTER = new RegExp("[^a-z\\u00f1]", "g");

export function normalize(word: string): string {
  return word
    .toLowerCase()
    .split(ENYE)
    .join(PLACEHOLDER)
    .normalize("NFD")
    .replace(COMBINING, "")
    .split(PLACEHOLDER)
    .join(ENYE)
    .replace(NOT_LETTER, "");
}

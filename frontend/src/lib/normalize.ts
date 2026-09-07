// Lowercase, strip accents, keep the enye, drop anything else.
// Must stay behaviourally identical to backend/src/normalize.ts.

const ENYE = String.fromCharCode(0xf1);
const PLACEHOLDER = String.fromCharCode(0x01);
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

export const ENYE_CHAR = ENYE;

// Central configuration. Anything that changes the daily word (EPOCH_DATE,
// PERMUTATION_SEED, the word list) must stay stable once you go live, or future
// days reshuffle. Days already written to DynamoDB are frozen regardless.

export const EPOCH_DATE = "2026-09-07"; // day 0 of the puzzle calendar (launch day)

// No puzzle is served before this date. Separate from EPOCH_DATE so they can diverge later.
export const LAUNCH_DATE = process.env.WORDLE_LAUNCH ?? "2026-09-07";
export const TIMEZONE = process.env.WORDLE_TZ ?? "America/New_York"; // word flips at local midnight here
export const PERMUTATION_SEED = process.env.WORDLE_SEED ?? "wordle-es-v1";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const TABLE_NAME = process.env.WORDLE_TABLE ?? "wordle_puzzles";
export const AWS_REGION = process.env.AWS_REGION ?? "eu-west-1";

export const PASSWORD_PARAM =
  process.env.WORDLE_PASSWORD_PARAM ?? "/wordle/password";
export const TOKEN_SECRET_PARAM =
  process.env.WORDLE_TOKEN_SECRET_PARAM ?? "/wordle/token-secret";

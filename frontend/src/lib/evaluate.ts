export type LetterState = "correct" | "present" | "absent";

// Standard two-pass Wordle scoring. Duplicate letters in the guess only light up
// as far as the target actually contains them.
export function evaluate(guess: string, target: string): LetterState[] {
  const result: LetterState[] = Array.from(guess, () => "absent");
  const remaining = new Map<string, number>();
  for (const ch of target) remaining.set(ch, (remaining.get(ch) ?? 0) + 1);

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      remaining.set(guess[i]!, remaining.get(guess[i]!)! - 1);
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i]!;
    const left = remaining.get(ch) ?? 0;
    if (left > 0) {
      result[i] = "present";
      remaining.set(ch, left - 1);
    }
  }
  return result;
}

// Best-known state per letter across all guesses, for colouring the keyboard.
const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

export function keyboardStates(
  guesses: string[],
  target: string,
): Record<string, LetterState> {
  const map: Record<string, LetterState> = {};
  for (const guess of guesses) {
    const states = evaluate(guess, target);
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i]!;
      const next = states[i]!;
      if (!(ch in map) || RANK[next] > RANK[map[ch]!]) map[ch] = next;
    }
  }
  return map;
}

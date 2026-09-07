import { keyboardStates, type LetterState } from "../lib/evaluate";

interface Props {
  guesses: string[];
  target: string;
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"],
  ["Enter", "z", "x", "c", "v", "b", "n", "m", "Back"],
];

export function Keyboard({ guesses, target, onKey, onEnter, onBackspace }: Props) {
  const states: Record<string, LetterState> = keyboardStates(guesses, target);

  return (
    <div className="keyboard">
      {ROWS.map((row, r) => (
        <div className="keyboard__row" key={r}>
          {row.map((key) => {
            if (key === "Enter") {
              return (
                <button className="key key--wide" key={key} onClick={onEnter}>
                  Enter
                </button>
              );
            }
            if (key === "Back") {
              return (
                <button
                  className="key key--wide"
                  key={key}
                  onClick={onBackspace}
                  aria-label="Borrar"
                >
                  &#9003;
                </button>
              );
            }
            const s = states[key];
            return (
              <button
                className={`key${s ? ` key--${s}` : ""}`}
                key={key}
                onClick={() => onKey(key)}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

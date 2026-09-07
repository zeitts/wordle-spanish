import { useEffect, useRef, useState } from "react";
import {
  rows,
  REVEAL_STAGGER_MS,
  WORD_LENGTH,
  type GameState,
} from "../lib/game";

interface Props {
  state: GameState;
  target: string;
  draft: string;
  shake: boolean;
}

export function Board({ state, target, draft, shake }: Props) {
  const grid = rows(state, target, draft);
  const activeRow = state.status === "playing" ? state.guesses.length : -1;

  // Reveal the most recently submitted guess one letter at a time.
  const guessCount = state.guesses.length;
  const prevCount = useRef(guessCount);
  const [reveal, setReveal] = useState({ row: -1, shown: 0 });

  useEffect(() => {
    if (guessCount === prevCount.current + 1) {
      const row = guessCount - 1;
      setReveal({ row, shown: 0 });
      let shown = 0;
      const id = window.setInterval(() => {
        shown += 1;
        setReveal({ row, shown });
        if (shown >= WORD_LENGTH) window.clearInterval(id);
      }, REVEAL_STAGGER_MS);
      prevCount.current = guessCount;
      return () => window.clearInterval(id);
    }
    // Jumped (archive switch) or reset (replay): show everything immediately.
    prevCount.current = guessCount;
    setReveal({ row: -1, shown: 0 });
  }, [guessCount]);

  return (
    <div className="board">
      {grid.map((row, r) => (
        <div
          className={`row${shake && r === activeRow ? " row--shake" : ""}`}
          key={r}
        >
          {row.letters.map((letter, c) => {
            const revealing = r === reveal.row;
            const hidden = revealing && c >= reveal.shown;
            const stateClass =
              row.states && !hidden ? ` tile--${row.states[c]}` : "";
            const filledClass = letter ? " tile--filled" : "";
            const flipClass = revealing && !hidden ? " tile--reveal" : "";
            return (
              <div
                className={`tile${stateClass}${filledClass}${flipClass}`}
                key={c}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

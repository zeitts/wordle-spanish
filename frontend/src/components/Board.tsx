import { rows, type GameState } from "../lib/game";

interface Props {
  state: GameState;
  target: string;
  draft: string;
  shake: boolean;
}

export function Board({ state, target, draft, shake }: Props) {
  const grid = rows(state, target, draft);
  const activeRow = state.status === "playing" ? state.guesses.length : -1;

  return (
    <div className="board">
      {grid.map((row, r) => (
        <div
          className={`row${shake && r === activeRow ? " row--shake" : ""}`}
          key={r}
        >
          {row.letters.map((letter, c) => {
            const stateClass = row.states ? ` tile--${row.states[c]}` : "";
            const filledClass = letter ? " tile--filled" : "";
            return (
              <div className={`tile${stateClass}${filledClass}`} key={c}>
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

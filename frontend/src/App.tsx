import { useCallback, useEffect, useState } from "react";
import { ArchivePicker } from "./components/ArchivePicker";
import { Board } from "./components/Board";
import { Keyboard } from "./components/Keyboard";
import { PasswordGate } from "./components/PasswordGate";
import { AuthError, fetchPuzzle, hasToken, logout } from "./lib/api";
import { shareGrid, type Puzzle } from "./lib/game";
import { useGame } from "./hooks/useGame";

export default function App() {
  const [unlocked, setUnlocked] = useState(hasToken());
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <Game onLock={() => { logout(); setUnlocked(false); }} />;
}

function Game({ onLock }: { onLock: () => void }) {
  const [activeDate, setActiveDate] = useState<string | undefined>(undefined);
  const [today, setToday] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPuzzle(null);
    setError(null);
    fetchPuzzle(activeDate)
      .then((p) => {
        if (cancelled) return;
        setPuzzle({ date: p.date, word: p.word, dayNumber: p.dayNumber });
        if (!activeDate) setToday(p.date);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof AuthError) onLock();
        else setError(e instanceof Error ? e.message : "Error");
      });
    return () => {
      cancelled = true;
    };
  }, [activeDate, onLock]);

  const game = useGame(puzzle);

  useEffect(() => {
    if (game.invalidNonce === 0) return;
    setShake(true);
    const t = window.setTimeout(() => setShake(false), 500);
    return () => window.clearTimeout(t);
  }, [game.invalidNonce]);

  const share = useCallback(async () => {
    if (!puzzle) return;
    const header = `Wordle ES ${puzzle.date} ${
      game.state.status === "won" ? game.state.guesses.length : "X"
    }/6`;
    try {
      await navigator.clipboard.writeText(
        `${header}\n\n${shareGrid(game.state, puzzle.word)}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked - ignore */
    }
  }, [puzzle, game.state]);

  const isToday = !activeDate || (today !== null && puzzle?.date === today);
  const finished = game.state.status !== "playing";

  return (
    <div className="app">
      <header className="app__header">
        <button className="linkbtn" onClick={() => setArchiveOpen(true)}>
          Archivo
        </button>
        <h1 className="app__title">
          WORDLE<span className="app__title-es">ES</span>
        </h1>
        <button className="linkbtn" onClick={onLock}>
          Salir
        </button>
      </header>

      <div className="app__subheader">
        <span>
          {puzzle ? (isToday ? `Hoy · ${puzzle.date}` : puzzle.date) : " "}
        </span>
        {puzzle && (
          <button className="linkbtn" onClick={game.replay}>
            Reiniciar
          </button>
        )}
      </div>

      {error && <p className="app__error">{error}</p>}

      {puzzle && (
        <>
          <div className="app__toast" aria-live="polite">
            {game.message && <span className="toast">{game.message}</span>}
          </div>

          <Board
            state={game.state}
            target={puzzle.word}
            draft={game.draft}
            shake={shake}
          />

          {finished && (
            <div className="result">
              <p className="result__word">
                {game.state.status === "won"
                  ? "¡Correcto!"
                  : `La palabra era ${puzzle.word.toUpperCase()}`}
              </p>
              <div className="result__actions">
                <button className="btn" onClick={share}>
                  {copied ? "Copiado" : "Compartir"}
                </button>
                <button className="btn btn--ghost" onClick={game.replay}>
                  Jugar de nuevo
                </button>
              </div>
            </div>
          )}

          <Keyboard
            guesses={game.state.guesses}
            target={puzzle.word}
            onKey={game.type}
            onEnter={game.submit}
            onBackspace={game.backspace}
          />
        </>
      )}

      {archiveOpen && today && (
        <ArchivePicker
          today={today}
          activeDate={puzzle?.date ?? today}
          onPick={(d) => setActiveDate(d === today ? undefined : d)}
          onClose={() => setArchiveOpen(false)}
        />
      )}
    </div>
  );
}

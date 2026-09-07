import { useCallback, useEffect, useRef, useState } from "react";
import { loadDictionary } from "../lib/api";
import {
  applyGuess,
  freshGame,
  REVEAL_DURATION_MS,
  WORD_LENGTH,
  type GameState,
  type Puzzle,
} from "../lib/game";
import { normalize } from "../lib/normalize";
import { sessionStore } from "../lib/storage";

export interface UseGame {
  state: GameState;
  draft: string;
  message: string | null;
  invalidNonce: number; // bumps each time a guess is rejected (drives the shake)
  type: (letter: string) => void;
  backspace: () => void;
  submit: () => void;
  replay: () => void;
}

export function useGame(puzzle: Puzzle | null): UseGame {
  const [state, setState] = useState<GameState>(() =>
    puzzle ? sessionStore.load(puzzle.date) ?? freshGame(puzzle.date) : freshGame(""),
  );
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [invalidNonce, setInvalidNonce] = useState(0);
  const dict = useRef<Set<string> | null>(null);
  const msgTimer = useRef<number | undefined>(undefined);
  const endTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadDictionary()
      .then((d) => (dict.current = d))
      .catch(() => (dict.current = null));
  }, []);

  // Reload persisted progress whenever the puzzle (date) changes.
  useEffect(() => {
    if (!puzzle) return;
    window.clearTimeout(endTimer.current);
    setState(sessionStore.load(puzzle.date) ?? freshGame(puzzle.date));
    setDraft("");
  }, [puzzle?.date]);

  useEffect(
    () => () => {
      window.clearTimeout(msgTimer.current);
      window.clearTimeout(endTimer.current);
    },
    [],
  );

  const toast = useCallback((text: string) => {
    setMessage(text);
    window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMessage(null), 1800);
  }, []);

  const type = useCallback(
    (letter: string) => {
      if (!puzzle || state.status !== "playing") return;
      const ch = normalize(letter);
      if (ch.length !== 1) return;
      setDraft((d) => (d.length >= WORD_LENGTH ? d : d + ch));
    },
    [puzzle, state.status],
  );

  const backspace = useCallback(() => {
    setDraft((d) => d.slice(0, -1));
  }, []);

  const submit = useCallback(() => {
    if (!puzzle || state.status !== "playing") return;
    if (draft.length !== WORD_LENGTH) {
      toast("Faltan letras");
      setInvalidNonce((n) => n + 1);
      return;
    }
    const guess = normalize(draft);
    if (dict.current && !dict.current.has(guess) && guess !== puzzle.word) {
      toast("No está en la lista");
      setInvalidNonce((n) => n + 1);
      return;
    }
    const next = applyGuess(state, guess, puzzle.word);
    setState(next);
    sessionStore.save(next);
    setDraft("");
    if (next.status !== "playing") {
      // Let the letters finish flipping before the verdict lands.
      const text =
        next.status === "won"
          ? WIN_MESSAGES[next.guesses.length - 1] ?? "¡Bien!"
          : puzzle.word.toUpperCase();
      window.clearTimeout(endTimer.current);
      endTimer.current = window.setTimeout(
        () => toast(text),
        REVEAL_DURATION_MS,
      );
    }
  }, [puzzle, state, draft, toast]);

  const replay = useCallback(() => {
    if (!puzzle) return;
    window.clearTimeout(endTimer.current);
    sessionStore.clear(puzzle.date);
    setState(freshGame(puzzle.date));
    setDraft("");
    toast("Tablero reiniciado");
  }, [puzzle, toast]);

  // Physical keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") submit();
      else if (e.key === "Backspace") backspace();
      else if (e.key.length === 1) type(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit, backspace, type]);

  return { state, draft, message, invalidNonce, type, backspace, submit, replay };
}

const WIN_MESSAGES = [
  "¡Genio!",
  "¡Espléndido!",
  "¡Impresionante!",
  "¡Muy bien!",
  "¡Bien!",
  "¡Uff!",
];

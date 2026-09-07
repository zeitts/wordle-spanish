import { sessionStore } from "../lib/storage";
import { LAUNCH_DATE } from "../lib/config";
import type { GameState } from "../lib/game";

interface Props {
  today: string;
  activeDate: string;
  onPick: (date: string) => void;
  onClose: () => void;
}

function statusLabel(s: GameState | null): string {
  if (!s) return "";
  if (s.status === "won") return `resuelto en ${s.guesses.length}/6`;
  if (s.status === "lost") return "fallado";
  if (s.guesses.length) return `en curso (${s.guesses.length}/6)`;
  return "";
}

// Every playable date, newest first: from today back to launch day (inclusive).
function recentDates(today: string): string[] {
  const start = Date.parse(`${today}T00:00:00Z`);
  const floor = Date.parse(`${LAUNCH_DATE}T00:00:00Z`);
  const out: string[] = [];
  for (let t = start; t >= floor; t -= 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function ArchivePicker({ today, activeDate, onPick, onClose }: Props) {
  return (
    <div className="modal" role="dialog" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Días anteriores</h2>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            &times;
          </button>
        </div>
        <ul className="archive">
          {recentDates(today).map((date) => (
            <li key={date}>
              <button
                className={`archive__item${
                  date === activeDate ? " archive__item--active" : ""
                }`}
                onClick={() => {
                  onPick(date);
                  onClose();
                }}
              >
                <span className="archive__date">
                  {date === today ? `${date} · hoy` : date}
                </span>
                <span className="archive__meta">
                  {statusLabel(sessionStore.load(date))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

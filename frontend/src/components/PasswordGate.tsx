import { useState, type FormEvent } from "react";
import { login } from "../lib/api";

export function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onUnlock();
    } catch {
      setError("Contraseña incorrecta");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <h1 className="gate__title">Wordle en Español</h1>
      <p className="gate__hint">Sitio privado. Introduce la contraseña.</p>
      <form className="gate__form" onSubmit={onSubmit}>
        <input
          className="gate__input"
          type="password"
          value={password}
          autoFocus
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
        />
        <button className="gate__button" disabled={busy || !password}>
          {busy ? "..." : "Entrar"}
        </button>
      </form>
      {error && <p className="gate__error">{error}</p>}
    </div>
  );
}

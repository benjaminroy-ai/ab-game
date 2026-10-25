import { useEffect, useState, useSyncExternalStore } from "react";
import { ClientSession, HostSession, makeCode, type AnySession } from "../net/session";
import { Board } from "./Board";
import { Home } from "./Home";
import { Lobby } from "./Lobby";

const SAVED = "abgame-session"; // { code, host, name } pour revenir après un rechargement

function startSession(code: string, host: boolean, name: string, restore: boolean): AnySession {
  localStorage.setItem(SAVED, JSON.stringify({ code, host, name }));
  const url = new URL(location.href);
  url.searchParams.set("salle", code);
  history.replaceState(null, "", url);
  return host ? new HostSession(code, name, restore) : new ClientSession(code, name);
}

function resume(): AnySession | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED) || "null");
    const urlCode = new URLSearchParams(location.search).get("salle");
    if (saved && (!urlCode || urlCode === saved.code)) return startSession(saved.code, saved.host, saved.name, true);
  } catch {
    /* rien à reprendre */
  }
  return null;
}

export function App() {
  const [session, setSession] = useState<AnySession | null>(resume);
  const [homeError, setHomeError] = useState<string | null>(null);

  const leave = () => {
    session?.close();
    localStorage.removeItem(SAVED);
    const url = new URL(location.href);
    url.searchParams.delete("salle");
    history.replaceState(null, "", url);
    setSession(null);
  };

  if (!session)
    return (
      <Home
        initialCode={new URLSearchParams(location.search).get("salle") || ""}
        error={homeError}
        onCreate={(name) => { setHomeError(null); setSession(startSession(makeCode(), true, name, false)); }}
        onJoin={(code, name) => { setHomeError(null); setSession(startSession(code, false, name, false)); }}
      />
    );
  return <Live session={session} onLeave={leave} onFatal={(e) => { setHomeError(e); leave(); }} />;
}

function Live({ session, onLeave, onFatal }: { session: AnySession; onLeave: () => void; onFatal: (e: string) => void }) {
  const st = useSyncExternalStore((f) => session.subscribe(f), () => session.state);
  useEffect(() => {
    if (st.status === "error" && st.error) onFatal(st.error);
  }, [st.status, st.error]);
  const send = (c: Parameters<AnySession["send"]>[0]) => session.send(c);

  if (!st.view)
    return (
      <div className="home">
        <h1>AB Game</h1>
        <p>{session.isHost ? "Ouverture de la salle…" : `Connexion à la salle ${session.code}…`}</p>
        <button className="ghost" onClick={onLeave}>Annuler</button>
      </div>
    );
  return (
    <>
      {st.status !== "online" && <div className="netbar">{st.status === "reconnecting" ? "Connexion perdue, reconnexion…" : "Connexion…"}</div>}
      {st.toast && <div className="toast">{st.toast}</div>}
      {st.view.phase === "lobby" ? <Lobby view={st.view} send={send} onLeave={onLeave} /> : <Board view={st.view} send={send} clockOffset={st.clockOffset} onLeave={onLeave} />}
    </>
  );
}

import { useState } from "react";
import { CEOS } from "../engine/data";
import type { CeoId, Command } from "../engine/types";
import type { PlayerView } from "../engine/view";
import { Tutorial } from "./Tutorial";

export function Lobby({ view, send, onLeave }: { view: PlayerView; send: (c: Command) => void; onLeave: () => void }) {
  const me = view.players.find((p) => p.id === view.me);
  const isHost = view.me === view.hostId;
  const link = `${location.origin}${location.pathname}?salle=${view.code}`;
  const [copied, setCopied] = useState(false);
  const [tuto, setTuto] = useState(false);
  const missing = view.players.filter((p) => !p.ceo).length;
  return (
    <div className="lobby">
      <header className="lobby-head">
        <div>
          <div className="muted">Code de la salle</div>
          <div className="room-code">{view.code}</div>
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? "Lien copié ✓" : "Copier le lien d'invitation"}
        </button>
        <button onClick={() => setTuto(true)}>📖 Règles</button>
        <button className="ghost" onClick={onLeave}>Quitter</button>
      </header>
      {tuto && <Tutorial onClose={() => setTuto(false)} />}

      <section>
        <h2>Les joueurs ({view.players.length}/8)</h2>
        <div className="lobby-players">
          {view.players.map((p) => (
            <div key={p.id} className="lobby-player" style={{ borderColor: p.ceo ? CEOS[p.ceo].color : undefined }}>
              <strong>{p.name}</strong>
              {p.id === view.hostId && <span className="pill">hôte</span>}
              {p.isBot && <span className="pill">bot</span>}
              {p.id === view.me && <span className="pill">vous</span>}
              {!p.connected && !p.isBot && <span className="pill warn">déconnecté</span>}
              <div className="muted">{p.ceo ? `${CEOS[p.ceo].company} · ${CEOS[p.ceo].boss}` : "choisit son PDG…"}</div>
              {isHost && p.id !== view.me && <button className="ghost small" onClick={() => send({ t: "kick", id: p.id })}>retirer</button>}
            </div>
          ))}
        </div>
        {isHost && (
          <div className="lobby-host">
            <button onClick={() => send({ t: "addBot" })} disabled={view.players.length >= 8}>+ Ajouter un bot</button>
            <button className="primary" onClick={() => send({ t: "start" })} disabled={view.players.length < 2 || missing > 0}>
              Lancer la partie
            </button>
            {view.players.length < 2 && <span className="muted">Il faut au moins 2 joueurs (un bot compte).</span>}
            {view.players.length >= 2 && missing > 0 && <span className="muted">En attente du choix des PDG.</span>}
          </div>
        )}
        {!isHost && <p className="muted">L'hôte lancera la partie quand tout le monde sera prêt.</p>}
      </section>

      <section>
        <h2>Choisissez votre PDG</h2>
        <div className="ceo-grid">
          {(Object.keys(CEOS) as CeoId[]).map((id) => {
            const c = CEOS[id];
            const owner = view.players.find((p) => p.ceo === id);
            const mine = me?.ceo === id;
            return (
              <button key={id} className={`ceo${mine ? " selected" : ""}`} style={{ borderColor: c.color }} disabled={!!owner && !mine} onClick={() => send({ t: "setCeo", ceo: id })}>
                <div className="ceo-company" style={{ color: c.color }}>{c.company}</div>
                <div className="ceo-boss">{c.boss}</div>
                <div className="ceo-stats">📣 Hype {c.hype} · 🔬 Tech {c.tech} · 🏛️ Influence {c.influence}</div>
                <div className="ceo-power"><strong>{c.power}</strong> : {c.powerText}</div>
                {owner && !mine && <div className="ceo-taken">pris par {owner.name}</div>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

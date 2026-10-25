import { useState } from "react";

export function Home({ onCreate, onJoin, initialCode, error }: { onCreate: (name: string) => void; onJoin: (code: string, name: string) => void; initialCode: string; error: string | null }) {
  const [name, setName] = useState(localStorage.getItem("abgame-name") || "");
  const [code, setCode] = useState(initialCode);
  const ready = name.trim().length > 0;
  const remember = () => localStorage.setItem("abgame-name", name.trim());
  return (
    <div className="home">
      <h1>AB Game</h1>
      <p className="tagline">Des patrons de la tech. Un monde à conquérir. Aucun scrupule.</p>
      <div className="home-box">
        <label>
          Votre nom
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="ex. Ben" autoFocus />
        </label>
        <div className="home-actions">
          <div className="home-col">
            <h3>Créer une salle</h3>
            <p className="muted">Votre navigateur héberge la partie : gardez l'onglet ouvert.</p>
            <button className="primary" disabled={!ready} onClick={() => { remember(); onCreate(name.trim()); }}>
              Créer une salle
            </button>
          </div>
          <div className="home-col">
            <h3>Rejoindre</h3>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="CODE" className="code-input" />
            <button disabled={!ready || code.length !== 4} onClick={() => { remember(); onJoin(code, name.trim()); }}>
              Rejoindre la salle
            </button>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
      <p className="muted small">2 à 8 joueurs · environ 30 minutes à 3 · chacun sur son écran</p>
    </div>
  );
}

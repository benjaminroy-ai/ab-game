import { useEffect, useMemo, useState } from "react";
import { CARDS, CEOS, EVENTS, MAX_LEVEL, REGIONS, winThreshold } from "../engine/data";
import { checkCoup, dominant, dominatedCount, favori, income, lobbyTokens, presence, projectCost, score, upgradeCost } from "../engine/engine";
import type { Command, GameState, Gauge, ProjectCard, RegionId } from "../engine/types";
import type { PlayerView } from "../engine/view";
import { CardView } from "./CardView";
import { Tutorial } from "./Tutorial";

type VP = PlayerView["players"][number];

function useNow(offset: number) {
  const [now, setNow] = useState(Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(t);
  }, [offset]);
  return now;
}

const name = (p: VP | undefined) => (p?.ceo ? CEOS[p.ceo].company : p?.name ?? "?");
const color = (p: VP | undefined) => (p?.ceo ? CEOS[p.ceo].color : "#888");

export function Board({ view, send, clockOffset, onLeave }: { view: PlayerView; send: (c: Command) => void; clockOffset: number; onLeave: () => void }) {
  const s = view as unknown as GameState; // les fonctions de calcul publiques n'utilisent que des données visibles
  const now = useNow(clockOffset);
  const me = view.players.find((p) => p.id === view.me)!;
  const active = view.phase === "playing" ? view.players.find((p) => p.id === view.order[view.turnIndex]) : undefined;
  const myTurn = active?.id === me.id && !view.pending;
  const [selected, setSelected] = useState<string | null>(null);
  const [lobbyRegion, setLobbyRegion] = useState<RegionId>(view.regions[0]);
  const [lobbyAmount, setLobbyAmount] = useState(1);
  const [tuto, setTuto] = useState(false);
  useEffect(() => setSelected(null), [view.turnIndex, view.year]);
  useEffect(() => setLobbyAmount((a) => Math.max(1, Math.min(a, me.amis || 1))), [me.amis]);

  const secondsLeft = view.turnDeadline ? Math.max(0, Math.ceil((view.turnDeadline - now) / 1000)) : null;
  const event = view.currentEvent ? EVENTS[view.currentEvent] : null;
  const threshold = winThreshold(view.players.length);
  const ranking = useMemo(() => view.players.slice().sort((a, b) => score(s, b as any) - score(s, a as any)), [view]);
  const sel = selected ? CARDS[selected] : null;
  const pendingForMe = view.pending && view.pending.target === me.id;
  const flashBlocked = !active || view.pending || (active.id !== me.id && view.flashUsed.includes(me.id));

  const act = (cmd: Command) => {
    send(cmd);
    setSelected(null);
  };

  return (
    <div className="board">
      {/* ------------------------------------------------ bandeau */}
      <header className="topbar">
        <div className="brand">AB Game</div>
        <div className="year">Exercice {view.year}/{view.maxYears}</div>
        {event && (
          <div className="event" title={event.flavor}>
            <span className="event-name">🌍 {event.name}</span>
            <span className="event-text">{event.text}</span>
          </div>
        )}
        <div className="turn">
          {view.phase === "playing" && active && (
            <>
              <span className="dot" style={{ background: color(active) }} />
              {active.id === me.id ? <strong>À vous de jouer</strong> : <span>Tour de <strong>{name(active)}</strong></span>}
              <span className="muted"> · {view.actionsLeft} action{view.actionsLeft > 1 ? "s" : ""}</span>
              {secondsLeft !== null && <span className={`timer${secondsLeft <= 15 ? " urgent" : ""}`}>⏱ {secondsLeft}s</span>}
            </>
          )}
        </div>
        <button className="small" onClick={() => setTuto(true)}>📖 Règles</button>
        <button className="ghost small" onClick={() => confirm("Quitter la partie ?") && onLeave()}>Quitter</button>
      </header>
      {view.nextEvent && <div className="insider">🔎 Gougle sait déjà que l'an prochain : <strong>{EVENTS[view.nextEvent].name}</strong></div>}
      {view.pending && !pendingForMe && (
        <div className="banner">🗡️ {name(view.players.find((p) => p.id === view.pending!.actor))} joue « {CARDS[view.pending.card].name} » contre {name(view.players.find((p) => p.id === view.pending!.target))}… qui peut riposter.</div>
      )}

      {/* une riposte en attente passe avant la lecture des règles */}
      {tuto && !pendingForMe && <Tutorial onClose={() => setTuto(false)} />}

      <div className="main">
        {/* ------------------------------------------------ joueurs */}
        <aside className="players">
          {ranking.map((p) => (
            <div key={p.id} className={`pcard${p.id === active?.id ? " active" : ""}${p.id === me.id ? " me" : ""}`} style={{ borderColor: color(p) }}>
              <div className="pcard-head">
                <span style={{ color: color(p) }}>{name(p)}</span>
                <span className="score" title="Points d'hégémonie">⭐ {score(s, p as any)}</span>
              </div>
              <div className="muted small">{p.ceo ? CEOS[p.ceo].boss : ""} · {p.name}{p.isBot ? " (bot)" : ""}{!p.connected && !p.isBot ? " · déconnecté" : ""}</div>
              <div className="gauges">
                <span title="Hype">📣 {p.hype}</span>
                <span title="Technologie">🔬 {p.tech}</span>
                <span title="Influence">🏛️ {p.influence}</span>
              </div>
              <div className="res">
                <span title="Capital">💰 {p.capital}</span>
                <span title="Génie">🧠 {p.genie}</span>
                <span title="Amis haut placés">🤝 {p.amis}</span>
                <span title="Réputation" className={p.reputation <= 3 ? "warn-text" : ""}>😇 {p.reputation}</span>
                <span title="Cartes en main">🂠 {p.handCount}</span>
              </div>
              <div className="muted small">
                {p.projects.length} projet{p.projects.length > 1 ? "s" : ""} · domine {dominatedCount(s, p.id)}/{threshold} régions{p.skipNext ? " · convoqué au Sénat" : ""}
              </div>
            </div>
          ))}
          <div className="muted small rules-hint">
            Victoire : dominer {threshold} régions à la fin d'un exercice, ou le plus de ⭐ après le dernier. ⭐ = projets + 3 par région dominée + 1 par tranche de 5 💰.
          </div>
        </aside>

        {/* ------------------------------------------------ monde */}
        <section className="world">
          {view.regions.map((r) => {
            const reg = REGIONS[r];
            const fav = favori(s, r);
            const dom = dominant(s, r);
            const tokens = Object.entries(view.tokens[r] || {}).filter(([, n]) => n > 0);
            const projects = view.players.flatMap((p) => p.projects.filter((x) => x.region === r).map((x) => ({ p, x })));
            const launchable = sel?.kind === "projet" && myTurn;
            const cost = launchable ? projectCost(s, me as any, sel as ProjectCard, r) : null;
            const allowed = launchable && (!(sel as ProjectCard).regions || (sel as ProjectCard).regions!.includes(r)) && me.tech >= (sel as ProjectCard).minTech && me.capital >= cost!.capital && me.genie >= cost!.genie;
            return (
              <div key={r} className="region" style={{ borderColor: dom ? color(view.players.find((p) => p.id === dom)) : undefined }}>
                <div className="region-head">
                  <span className="flag">{reg.flag}</span>
                  <div>
                    <div className="region-name">{reg.name}</div>
                    <div className="muted small">{reg.government} · {reg.personality}</div>
                  </div>
                </div>
                <div className="small">Favori : {fav ? <strong style={{ color: color(view.players.find((p) => p.id === fav)) }}>{name(view.players.find((p) => p.id === fav))}</strong> : <span className="muted">personne</span>} <span className="muted">({reg.favorText}, +2 présence)</span></div>
                <div className="chips">
                  {tokens.map(([id, n]) => (
                    <span key={id} className="chip" style={{ background: color(view.players.find((p) => p.id === id)) }}>🤝 {n}</span>
                  ))}
                </div>
                <div className="presence">
                  {view.players.map((p) => {
                    const n = presence(s, r, p.id);
                    return n > 0 ? <span key={p.id} className="chip outline" style={{ borderColor: color(p), color: color(p) }}>📍 {name(p)} {n}</span> : null;
                  })}
                  {dom && <span className="dominant">👑 domine</span>}
                </div>
                <ul className="projects">
                  {projects.map(({ p, x }, i) => (
                    <li key={i}><span className="dot" style={{ background: color(p) }} /> {CARDS[x.card].name}</li>
                  ))}
                </ul>
                {launchable && (
                  <button className="primary small" disabled={!allowed} onClick={() => act({ t: "launch", card: sel!.id, region: r })}>
                    Lancer ici · 💰 {cost!.capital}{cost!.genie ? ` · 🧠 ${cost!.genie}` : ""}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {/* ------------------------------------------------ journal */}
        <aside className="log">
          <h3>Fil d'actualité</h3>
          {view.log.slice().reverse().map((l) => (
            <div key={l.n} className={`log-line ${l.tone || ""}`}>{l.text}</div>
          ))}
        </aside>
      </div>

      {/* ------------------------------------------------ mon entreprise */}
      <footer className="me-panel">
        <div className="actions">
          <div className="me-summary">
            <strong style={{ color: color(me) }}>{name(me)}</strong>
            <span className="muted small"> · revenu {income(me as any)} 💰/an · {me.tech} 🧠/an · {me.influence} 🤝/an</span>
          </div>
          <button disabled={!myTurn || me.hand.length >= 7} onClick={() => act({ t: "draw" })} title="+2 cartes">🂠 Piocher (+2)</button>
          {(["hype", "tech", "influence"] as Gauge[]).map((g) => (
            <button key={g} disabled={!myTurn || me[g] >= MAX_LEVEL || me.capital < upgradeCost(me[g])} onClick={() => act({ t: "upgrade", gauge: g })}>
              {g === "hype" ? "📣 Hype" : g === "tech" ? "🔬 Tech" : "🏛️ Influence"} → {Math.min(MAX_LEVEL, me[g] + 1)} <span className="muted">({upgradeCost(me[g])} 💰)</span>
            </button>
          ))}
          <div className="lobbying">
            <span>🤝 Lobbying :</span>
            <select value={lobbyRegion} onChange={(e) => setLobbyRegion(e.target.value as RegionId)}>
              {view.regions.map((r) => <option key={r} value={r}>{REGIONS[r].flag} {REGIONS[r].government}</option>)}
            </select>
            <input type="number" min={1} max={Math.max(1, me.amis)} value={lobbyAmount} onChange={(e) => setLobbyAmount(Number(e.target.value))} />
            <button disabled={!myTurn || me.amis < 1 || lobbyTokens(s, lobbyRegion, lobbyAmount) < 1 || lobbyAmount > me.amis} onClick={() => act({ t: "lobby", region: lobbyRegion, amount: lobbyAmount })}>
              Dîner (+{lobbyTokens(s, lobbyRegion, Math.min(lobbyAmount, me.amis))} jeton)
            </button>
          </div>
          <button className="end" disabled={!myTurn} onClick={() => act({ t: "end" })}>Fin du tour ▶</button>
        </div>

        {sel?.kind === "projet" && myTurn && <div className="hint">Choisissez la région où lancer « {sel.name} » (boutons dans les régions).</div>}
        {sel?.kind === "coup" && myTurn && (
          <div className="hint">
            {sel.effect === "loi_sur_mesure" ? (
              <button className="danger" disabled={!checkCoup(s, me as any, sel, me.id).ok} onClick={() => act({ t: "coup", card: sel.id, target: me.id })}>Faire voter la loi</button>
            ) : (
              <>
                Cible :{" "}
                {view.players.filter((p) => p.id !== me.id).map((p) => {
                  const r = checkCoup(s, me as any, sel, p.id);
                  return (
                    <button key={p.id} className="danger" disabled={!r.ok} title={r.error} onClick={() => act({ t: "coup", card: sel.id, target: p.id })}>
                      {name(p)}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}

        <div className="hand">
          {me.hand.map((id, i) => {
            const c = CARDS[id];
            let onClick: (() => void) | undefined;
            let hint: string | undefined;
            if (c.kind === "projet" || c.kind === "coup") {
              if (myTurn) onClick = () => setSelected(selected === id ? null : id);
              else hint = "À jouer pendant votre tour";
            } else if (c.mode === "reaction") hint = "Se joue quand un coup bas vous vise";
            else if (c.mode === "offense") {
              if (active && active.id !== me.id && !flashBlocked) onClick = () => act({ t: "flash", card: id });
              else hint = "Pendant le tour d'un rival (1 flash par tour)";
            } else if (!flashBlocked) onClick = () => act({ t: "flash", card: id });
            return <CardView key={id + i} id={id} onClick={onClick} selected={selected === id} hint={hint} />;
          })}
          {me.hand.length === 0 && <div className="muted">Main vide. Piochez !</div>}
        </div>
      </footer>

      {/* ------------------------------------------------ fenêtre de réaction */}
      {pendingForMe && <ReactionModal view={view} me={me} now={now} send={send} />}

      {/* ------------------------------------------------ fin de partie */}
      {view.phase === "over" && (
        <div className="modal-back">
          <div className="modal">
            <h2>🏆 {view.winners?.map((w) => name(view.players.find((p) => p.id === w))).join(" & ")} règne sur le monde</h2>
            <p>{view.winReason}</p>
            <ol className="final">
              {ranking.map((p) => (
                <li key={p.id}><span style={{ color: color(p) }}>{name(p)}</span> ({p.name}) · ⭐ {score(s, p as any)} · {p.projects.length} projets · 😇 {p.reputation}</li>
              ))}
            </ol>
            <p className="muted">« Ce qui compte, ce n'est pas d'avoir raison. C'est d'avoir gagné. »</p>
            <button className="primary" onClick={onLeave}>Retour à l'accueil</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReactionModal({ view, me, now, send }: { view: PlayerView; me: VP; now: number; send: (c: Command) => void }) {
  const p = view.pending!;
  const actor = view.players.find((x) => x.id === p.actor);
  const left = Math.max(0, Math.ceil((p.deadline - now) / 1000));
  const reactions = me.hand.filter((id) => {
    const c = CARDS[id];
    return c.kind === "flash" && c.mode === "reaction";
  });
  return (
    <div className="modal-back">
      <div className="modal reaction">
        <h2>⚠️ {name(actor)} vous attaque !</h2>
        <p>« {CARDS[p.card].name} » : {(CARDS[p.card] as any).text}</p>
        <div className="timer big">{left}s pour réagir</div>
        <div className="hand">
          {reactions.map((id, i) => {
            const c = CARDS[id] as any;
            const affordable = me.capital >= c.capital && me.amis >= c.amis;
            return <CardView key={id + i} id={id} onClick={affordable ? () => send({ t: "react", card: id }) : undefined} hint={affordable ? "Riposter" : "Pas les moyens"} />;
          })}
        </div>
        <button onClick={() => send({ t: "pass" })}>Encaisser sans broncher</button>
      </div>
    </div>
  );
}

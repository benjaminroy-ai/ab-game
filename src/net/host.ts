import { botMove, botToPlay } from "../engine/bot";
import { addPlayer, apply, createGame, getPlayer, nextDeadline, tick } from "../engine/engine";
import type { Command, GameState } from "../engine/types";
import { viewFor, type PlayerView } from "../engine/view";

export type ClientMsg = { type: "hello"; playerId: string | null; name: string } | { type: "cmd"; cmd: Command };
export type HostMsg = { type: "welcome"; playerId: string } | { type: "view"; view: PlayerView } | { type: "error"; message: string };

const BOT_DELAY_MS = 1400;
const storageKey = (code: string) => `abgame-host-${code}`;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Arbitre de la partie. Il tourne dans le navigateur de l'hôte, détient l'état complet
 * et n'envoie à chaque joueur que ce qu'il a le droit de voir. Indépendant du transport réseau.
 */
export class GameHost {
  state: GameState;
  private send: (playerId: string, msg: HostMsg) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private now: () => number;

  constructor(opts: { code: string; hostId: string; hostName: string; send: (playerId: string, msg: HostMsg) => void; now?: () => number; restore?: boolean }) {
    this.send = opts.send;
    this.now = opts.now ?? Date.now;
    const saved = opts.restore ? GameHost.load(opts.code) : null;
    this.state = saved ?? createGame(opts.code, opts.hostId, opts.hostName);
    for (const p of this.state.players) if (!p.isBot && p.id !== this.state.hostId) p.connected = false;
  }

  static load(code: string): GameState | null {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey(code)) : null;
      return raw ? (JSON.parse(raw) as GameState) : null;
    } catch {
      return null;
    }
  }

  /** Un joueur se présente (nouveau ou qui revient). Renvoie son identifiant, ou une erreur. */
  hello(playerId: string | null, name: string): { playerId?: string; error?: string } {
    const s = this.state;
    if (playerId && getPlayer(s, playerId)) {
      getPlayer(s, playerId)!.connected = true;
      this.changed();
      return { playerId };
    }
    if (s.phase !== "lobby") return { error: "La partie a déjà commencé sans vous." };
    const id = newId();
    const r = addPlayer(s, id, name, false);
    if (!r.ok) return { error: r.error };
    this.changed();
    return { playerId: id };
  }

  disconnected(playerId: string) {
    const p = getPlayer(this.state, playerId);
    if (p) {
      p.connected = false;
      this.changed();
    }
  }

  command(playerId: string, cmd: Command) {
    const r = apply(this.state, playerId, cmd, Math.random, this.now());
    if (!r.ok) this.send(playerId, { type: "error", message: r.error || "Action refusée." });
    else this.changed();
  }

  /** Diffuse l'état, sauvegarde, et programme le prochain réveil (chrono ou bot). */
  changed() {
    const s = this.state;
    const now = this.now();
    for (const p of s.players) if (!p.isBot && (p.connected || p.id === s.hostId)) this.send(p.id, { type: "view", view: viewFor(s, p.id, now) });
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(storageKey(s.code), JSON.stringify(s));
    } catch {
      /* stockage plein ou indisponible : tant pis */
    }
    this.schedule();
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const s = this.state;
    if (s.phase !== "playing") return;
    const bot = botToPlay(s);
    if (bot) {
      this.timer = setTimeout(() => {
        const b = botToPlay(this.state);
        if (!b) return this.schedule();
        const r = apply(this.state, b.id, botMove(this.state, b, Math.random), Math.random, this.now());
        if (!r.ok) apply(this.state, b.id, { t: "end" }, Math.random, this.now());
        this.changed();
      }, BOT_DELAY_MS);
      return;
    }
    const d = nextDeadline(s);
    if (d === null) return;
    this.timer = setTimeout(() => {
      if (tick(this.state, Math.random, this.now())) this.changed();
      else this.schedule();
    }, Math.max(50, d - this.now() + 20));
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }
}

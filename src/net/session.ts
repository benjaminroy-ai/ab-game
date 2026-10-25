import Peer, { type DataConnection } from "peerjs";
import type { Command } from "../engine/types";
import type { PlayerView } from "../engine/view";
import { GameHost, newId, type ClientMsg, type HostMsg } from "./host";

export type Status = "connecting" | "online" | "reconnecting" | "error";

export interface SessionState {
  status: Status;
  error: string | null; // erreur bloquante (salle introuvable…)
  toast: string | null; // action refusée, passagère
  view: PlayerView | null;
  clockOffset: number; // heure de l'hôte - heure locale
}

const PREFIX = "abgame-v1-";
export const peerId = (code: string) => PREFIX + code.toLowerCase();
const playerKey = (code: string) => `abgame-player-${code}`;

export function makeCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
}

abstract class Session {
  state: SessionState = { status: "connecting", error: null, toast: null, view: null, clockOffset: 0 };
  private listeners = new Set<() => void>();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(public code: string, public isHost: boolean) {}
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  protected set(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((f) => f());
  }
  protected showToast(message: string) {
    this.set({ toast: message });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.set({ toast: null }), 3500);
  }
  abstract send(cmd: Command): void;
  abstract close(): void;
}

/** Le joueur qui crée la salle : son navigateur fait office de serveur de jeu. */
export class HostSession extends Session {
  private host: GameHost;
  private peer: Peer | null = null;
  private conns = new Map<string, DataConnection>();
  private retries = 0;
  private me: string;

  constructor(code: string, name: string, restore = false) {
    super(code, true);
    this.me = localStorage.getItem(playerKey(code)) || newId();
    localStorage.setItem(playerKey(code), this.me);
    this.host = new GameHost({
      code, hostId: this.me, hostName: name, restore,
      send: (pid, msg) => (pid === this.me ? this.local(msg) : this.conns.get(pid)?.send(msg)),
    });
    this.host.changed();
    this.open();
  }

  private local(msg: HostMsg) {
    if (msg.type === "view") this.set({ view: msg.view, clockOffset: 0 });
    if (msg.type === "error") this.showToast(msg.message);
  }

  private open() {
    const peer = new Peer(peerId(this.code));
    this.peer = peer;
    peer.on("open", () => {
      this.retries = 0;
      this.set({ status: "online", error: null });
    });
    peer.on("disconnected", () => {
      this.set({ status: "reconnecting" });
      setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on("error", (err: { type?: string }) => {
      if (err.type === "unavailable-id" && this.retries++ < 10) {
        // l'ancien onglet de l'hôte n'est pas encore libéré : on réessaie
        this.set({ status: "reconnecting" });
        peer.destroy();
        setTimeout(() => this.open(), 3000);
      } else if (err.type === "unavailable-id") this.set({ status: "error", error: "Ce code de salle est déjà utilisé." });
      else if (err.type === "network" || err.type === "server-error" || err.type === "socket-error") this.set({ status: "reconnecting" });
    });
    peer.on("connection", (conn) => {
      let pid: string | null = null;
      conn.on("data", (raw) => {
        const msg = raw as ClientMsg;
        if (msg.type === "hello") {
          const r = this.host.hello(msg.playerId, msg.name);
          if (r.error) {
            conn.send({ type: "error", message: r.error } satisfies HostMsg);
            return;
          }
          pid = r.playerId!;
          this.conns.get(pid)?.close();
          this.conns.set(pid, conn);
          conn.send({ type: "welcome", playerId: pid } satisfies HostMsg);
          this.host.changed();
        } else if (msg.type === "cmd" && pid) this.host.command(pid, msg.cmd);
      });
      conn.on("close", () => {
        if (pid && this.conns.get(pid) === conn) {
          this.conns.delete(pid);
          this.host.disconnected(pid);
        }
      });
    });
  }

  send(cmd: Command) {
    this.host.command(this.me, cmd);
  }
  close() {
    this.host.dispose();
    this.peer?.destroy();
  }
}

/** Un joueur qui rejoint une salle avec son code. */
export class ClientSession extends Session {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private closed = false;
  private attempts = 0;

  constructor(code: string, private name: string) {
    super(code, false);
    this.open();
  }

  private open() {
    const peer = new Peer();
    this.peer = peer;
    peer.on("open", () => this.connect());
    peer.on("error", (err: { type?: string }) => {
      if (err.type === "peer-unavailable") {
        if (this.attempts++ < 4) setTimeout(() => this.connect(), 2500);
        else this.set({ status: "error", error: `Salle ${this.code} introuvable. L'hôte a peut-être fermé son onglet.` });
      } else if (!this.closed) this.set({ status: "reconnecting" });
    });
    peer.on("disconnected", () => !this.closed && setTimeout(() => !peer.destroyed && peer.reconnect(), 1500));
  }

  private connect() {
    if (this.closed || !this.peer) return;
    const conn = this.peer.connect(peerId(this.code), { reliable: true });
    this.conn = conn;
    conn.on("open", () => {
      this.attempts = 0;
      conn.send({ type: "hello", playerId: localStorage.getItem(playerKey(this.code)), name: this.name } satisfies ClientMsg);
    });
    conn.on("data", (raw) => {
      const msg = raw as HostMsg;
      if (msg.type === "welcome") {
        localStorage.setItem(playerKey(this.code), msg.playerId);
        this.set({ status: "online", error: null });
      } else if (msg.type === "view") this.set({ view: msg.view, clockOffset: msg.view.hostNow - Date.now(), status: "online" });
      else if (msg.type === "error") {
        if (!this.state.view) this.set({ status: "error", error: msg.message });
        else this.showToast(msg.message);
      }
    });
    conn.on("close", () => {
      if (this.closed) return;
      this.set({ status: "reconnecting" });
      setTimeout(() => this.connect(), 2000);
    });
  }

  send(cmd: Command) {
    if (this.conn?.open) this.conn.send({ type: "cmd", cmd } satisfies ClientMsg);
    else this.showToast("Connexion perdue, reconnexion en cours…");
  }
  close() {
    this.closed = true;
    this.peer?.destroy();
  }
}

export type AnySession = HostSession | ClientSession;

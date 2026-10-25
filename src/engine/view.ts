import type { GameState } from "./types";

/** Ce qu'un joueur a le droit de voir : sa main, pas celle des autres ; pas l'ordre de la pioche. */
export interface PlayerView extends Omit<GameState, "deck" | "events" | "players"> {
  me: string;
  deckCount: number;
  nextEvent: string | null;
  players: (Omit<GameState["players"][number], "hand"> & { hand: string[]; handCount: number })[];
  hostNow: number;
}

export function viewFor(s: GameState, me: string, now: number): PlayerView {
  const { deck, events, players, ...rest } = s;
  const mine = players.find((p) => p.id === me);
  return {
    ...structuredClone(rest),
    me,
    deckCount: deck.length,
    nextEvent: mine?.ceo === "gougle" && s.phase === "playing" ? events[0] ?? null : null,
    players: players.map((p) => ({ ...structuredClone(p), hand: p.id === me ? p.hand.slice() : [], handCount: p.hand.length })),
    hostNow: now,
  };
}

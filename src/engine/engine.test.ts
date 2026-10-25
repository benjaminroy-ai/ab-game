import { describe, expect, it } from "vitest";
import { REACTION_MS, TURN_MS } from "./data";
import { activePlayer, apply, createGame, favori, getPlayer, lobbyTokens, projectCost, tick } from "./engine";
import { seeded } from "./rng";
import type { CeoId, GameState } from "./types";
import { viewFor } from "./view";
import { CARDS } from "./data";

function game(ceos: CeoId[] = ["xcess", "pomme", "openmind"]): GameState {
  const rng = seeded(42);
  const s = createGame("TEST", "p0", "Alice");
  for (let i = 1; i < ceos.length; i++) apply(s, `p${i}`, { t: "setCeo", ceo: ceos[i] }, rng, 0); // ignoré : joueur inconnu
  ceos.slice(1).forEach((_, i) => s.players.push({ ...s.players[0], id: `p${i + 1}`, name: `J${i + 1}`, ceo: null, hand: [], projects: [] }));
  ceos.forEach((c, i) => expect(apply(s, `p${i}`, { t: "setCeo", ceo: c }, rng, 0).ok).toBe(true));
  expect(apply(s, "p0", { t: "start" }, rng, 0).ok).toBe(true);
  return s;
}

describe("salle d'attente", () => {
  it("refuse deux fois le même PDG et un lancement sans PDG", () => {
    const rng = seeded(1);
    const s = createGame("X", "h", "Hôte");
    s.players.push({ ...s.players[0], id: "b", name: "B" });
    expect(apply(s, "h", { t: "start" }, rng, 0).ok).toBe(false);
    apply(s, "h", { t: "setCeo", ceo: "xcess" }, rng, 0);
    expect(apply(s, "b", { t: "setCeo", ceo: "xcess" }, rng, 0).ok).toBe(false);
  });
  it("seul l'hôte ajoute des bots, avec un PDG libre", () => {
    const rng = seeded(1);
    const s = createGame("X", "h", "Hôte");
    apply(s, "h", { t: "setCeo", ceo: "xcess" }, rng, 0);
    expect(apply(s, "h", { t: "addBot" }, rng, 0).ok).toBe(true);
    expect(s.players[1].isBot).toBe(true);
    expect(s.players[1].ceo).not.toBe("xcess");
  });
});

describe("mise en place", () => {
  it("3 joueurs : 4 régions, 6 exercices, 4 cartes en main", () => {
    const s = game();
    expect(s.regions).toEqual(["NA", "EU", "CN", "GO"]);
    expect(s.maxYears).toBe(6);
    expect(s.year).toBe(1);
    for (const p of s.players) expect(p.hand.length).toBe(4);
    expect(s.actionsLeft).toBe(2);
  });
});

describe("tours", () => {
  it("deux actions puis la main passe ; hors tour, refus", () => {
    const s = game();
    const rng = seeded(3);
    const a = activePlayer(s)!;
    const other = s.players.find((p) => p.id !== a.id)!;
    expect(apply(s, other.id, { t: "draw" }, rng, 1).ok).toBe(false);
    a.hand = [];
    expect(apply(s, a.id, { t: "draw" }, rng, 1).ok).toBe(true);
    expect(apply(s, a.id, { t: "draw" }, rng, 1).ok).toBe(true);
    expect(activePlayer(s)!.id).not.toBe(a.id);
  });
  it("le chrono fait passer le tour", () => {
    const s = game();
    const a = activePlayer(s)!;
    tick(s, seeded(1), TURN_MS + 1);
    expect(activePlayer(s)!.id).not.toBe(a.id);
  });
});

describe("coûts et lobbying", () => {
  it("Président ×2, Commission ÷2", () => {
    const s = game();
    s.currentEvent = "e_krach"; // pas la « lune de miel » qui double tout
    expect(lobbyTokens(s, "NA", 2)).toBe(4);
    expect(lobbyTokens(s, "EU", 3)).toBe(1);
    expect(lobbyTokens(s, "GO", 3)).toBe(3);
  });
  it("transfert de technologie en Chine sauf pour Dragon Telecom", () => {
    const s = game(["dragon", "pomme"]);
    const card = CARDS.p_ia as any;
    expect(projectCost(s, getPlayer(s, "p0")!, card, "CN").genie).toBe(4);
    expect(projectCost(s, getPlayer(s, "p1")!, card, "CN").genie).toBe(5);
    expect(favori(s, "CN")).toBe("p0"); // Dragon commence avec 2 jetons chez le Parti
  });
});

describe("coups bas et réactions", () => {
  it("la cible humaine peut contrer avec une Armée d'avocats", () => {
    const s = game(["xcess", "metamorphe"]);
    const rng = () => 0.99; // pas de fuite
    const a = activePlayer(s)!;
    const t = s.players.find((p) => p.id !== a.id)!;
    a.hand = ["c_proces"];
    a.amis = 3;
    t.hand = ["f_avocats"];
    t.capital = 10;
    expect(apply(s, a.id, { t: "coup", card: "c_proces", target: t.id }, rng, 10).ok).toBe(true);
    expect(s.pending?.target).toBe(t.id);
    expect(apply(s, a.id, { t: "draw" }, rng, 11).ok).toBe(false); // bloqué pendant la réaction
    expect(apply(s, t.id, { t: "react", card: "f_avocats" }, rng, 12).ok).toBe(true);
    expect(t.capital).toBe(8); // 2 payés aux avocats, procès annulé
    expect(s.pending).toBeNull();
  });
  it("sans réaction, le coup s'applique à la fin de la fenêtre", () => {
    const s = game(["xcess", "metamorphe"]);
    const rng = () => 0.99;
    const a = activePlayer(s)!;
    const t = s.players.find((p) => p.id !== a.id)!;
    a.hand = ["c_proces"];
    a.amis = 3;
    t.hand = ["f_avocats"];
    t.capital = 10;
    apply(s, a.id, { t: "coup", card: "c_proces", target: t.id }, rng, 10);
    tick(s, rng, 10 + REACTION_MS);
    expect(t.capital).toBe(7);
  });
  it("Pomme est immunisée contre le débauchage", () => {
    const s = game(["xcess", "pomme"]);
    const rng = () => 0.99;
    const a = activePlayer(s)!;
    const t = s.players.find((p) => p.id !== a.id)!;
    a.hand = ["c_debauchage"];
    a.amis = 2;
    t.hand = [];
    const g = t.genie;
    apply(s, a.id, { t: "coup", card: "c_debauchage", target: t.id }, rng, 10);
    if (t.ceo === "pomme") expect(t.genie).toBe(g);
  });
  it("une fuite coûte de la Réputation, et OpenMind ignore son premier scandale", () => {
    const s = game(["openmind", "pomme"]);
    const rng = () => 0; // fuite assurée
    const a = activePlayer(s)!;
    const t = s.players.find((p) => p.id !== a.id)!;
    a.hand = ["c_proces", "c_proces"];
    a.amis = 3;
    t.hand = [];
    const rep = a.reputation;
    apply(s, a.id, { t: "coup", card: "c_proces", target: t.id }, rng, 10);
    if (a.ceo === "openmind") expect(a.reputation).toBe(rep);
    else expect(a.reputation).toBeLessThan(rep);
  });
});

describe("actions flash", () => {
  it("une seule flash par tour adverse, interdite pendant son propre tour", () => {
    const s = game();
    const rng = seeded(9);
    const a = activePlayer(s)!;
    const o = s.players.find((p) => p.id !== a.id)!;
    o.hand = ["f_tweet", "f_delit"];
    a.hand.push("f_tweet");
    expect(apply(s, a.id, { t: "flash", card: "f_tweet" }, rng, 1).ok).toBe(false);
    expect(apply(s, o.id, { t: "flash", card: "f_tweet" }, rng, 1).ok).toBe(true);
    expect(apply(s, o.id, { t: "flash", card: "f_delit" }, rng, 1).ok).toBe(false);
  });
});

describe("vue joueur", () => {
  it("cache la main des autres et la pioche", () => {
    const s = game();
    const v = viewFor(s, "p0", 0);
    expect(v.players[0].hand.length).toBe(4);
    expect(v.players[1].hand).toEqual([]);
    expect(v.players[1].handCount).toBe(4);
    expect((v as any).deck).toBeUndefined();
  });
});

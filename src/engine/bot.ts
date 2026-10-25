import { CARDS } from "./data";
import { activePlayer, canLaunchAnywhere, checkCoup, favori, label, presence, projectCost, score, upgradeCost } from "./engine";
import type { Command, GameState, Player, ProjectCard, RegionId, Rng } from "./types";

/** Choisit la prochaine commande d'un bot dont c'est le tour. Volontairement simple et un peu cynique. */
export function botMove(s: GameState, bot: Player, rng: Rng): Command {
  // 1. Lancer le projet le plus rentable possible, là où il a le plus de chances de dominer
  const projects = bot.hand.map((id) => CARDS[id]).filter((c): c is ProjectCard => c.kind === "projet");
  let best: { card: ProjectCard; region: RegionId; value: number } | null = null;
  for (const card of projects) {
    for (const region of canLaunchAnywhere(s, bot, card)) {
      const mine = presence(s, region, bot.id);
      const theirs = Math.max(0, ...s.players.filter((p) => p.id !== bot.id).map((p) => presence(s, region, p.id)));
      const swing = mine + card.presence > theirs && mine <= theirs ? 3 : 0;
      const cost = projectCost(s, bot, card, region);
      const value = card.points + swing + card.income - cost.capital / 4 + rng() * 0.5;
      if (!best || value > best.value) best = { card, region, value };
    }
  }
  if (best) return { t: "launch", card: best.card.id, region: best.region };

  // 2. Un coup bas contre le leader, de temps en temps
  const rivals = s.players.filter((p) => p.id !== bot.id).sort((a, b) => score(s, b) - score(s, a));
  const coup = bot.hand.find((id) => CARDS[id].kind === "coup");
  if (coup && rivals[0] && rng() < 0.6) {
    const card = CARDS[coup];
    if (card.kind === "coup" && checkCoup(s, bot, card, rivals[0].id).ok) return { t: "coup", card: coup, target: rivals[0].id };
  }

  // 3. Lobbying : tous les Amis là où on peut devenir favori
  if (bot.amis >= 2) {
    const region = s.regions
      .slice()
      .sort((a, b) => {
        const gap = (r: RegionId) => {
          const t = s.tokens[r];
          const mine = t[bot.id] || 0;
          const top = Math.max(0, ...Object.entries(t).filter(([id]) => id !== bot.id).map(([, n]) => n));
          return favori(s, r) === bot.id ? 99 : top - mine;
        };
        return gap(a) - gap(b);
      })[0];
    return { t: "lobby", region, amount: bot.amis };
  }

  // 4. Investir dans la technologie (ou la hype)
  const gauge = bot.tech < 5 && (bot.tech < 4 || rng() < 0.5) ? "tech" : bot.hype < 5 ? "hype" : "influence";
  if (bot[gauge] < 5 && bot.capital >= upgradeCost(bot[gauge]) + 3) return { t: "upgrade", gauge };

  // 5. Piocher, sinon passer
  if (bot.hand.length < 7 && s.deck.length + s.discard.length > 0) return { t: "draw" };
  return { t: "end" };
}

export function botToPlay(s: GameState): Player | null {
  if (s.phase !== "playing") return null;
  if (s.pending) return null; // les bots ne réagissent jamais : le moteur ne leur ouvre pas de fenêtre
  const a = activePlayer(s);
  return a && a.isBot ? a : null;
}

export const botName = label;

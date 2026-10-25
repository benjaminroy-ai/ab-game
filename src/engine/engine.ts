import { CARDS, CEOS, DECK, EVENTS, HAND_MAX, MAX_LEVEL, REACTION_MS, REGIONS, START_CAPITAL, START_REPUTATION, TURN_MS, regionsFor, winThreshold, yearsFor } from "./data";
import type { CeoId, Command, CoupCard, FlashCard, GameState, Gauge, Player, ProjectCard, RegionId, Result, Rng } from "./types";

// ---------------------------------------------------------------- utilitaires

const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getPlayer(s: GameState, id: string): Player | undefined {
  return s.players.find((p) => p.id === id);
}
function must(s: GameState, id: string): Player {
  const p = getPlayer(s, id);
  if (!p) throw new Error("joueur inconnu " + id);
  return p;
}
export const label = (p: Player) => (p.ceo ? `${CEOS[p.ceo].company} (${p.name})` : p.name);

function log(s: GameState, text: string, tone?: GameState["log"][number]["tone"]) {
  s.log.push({ n: ++s.logSeq, text, tone });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}

export function activePlayer(s: GameState): Player | undefined {
  if (s.phase !== "playing") return undefined;
  const id = s.order[s.turnIndex];
  return id ? getPlayer(s, id) : undefined;
}

// ---------------------------------------------------------------- calculs publics

export function favori(s: GameState, region: RegionId): string | null {
  const t = s.tokens[region] || {};
  let best: string | null = null;
  let bestN = 0;
  let tie = false;
  for (const [id, n] of Object.entries(t)) {
    if (n > bestN) { best = id; bestN = n; tie = false; } else if (n === bestN && n > 0) tie = true;
  }
  return tie ? null : best;
}

export function presence(s: GameState, region: RegionId, playerId: string): number {
  const p = getPlayer(s, playerId);
  if (!p) return 0;
  const fromProjects = p.projects.filter((x) => x.region === region).reduce((a, x) => a + (CARDS[x.card] as ProjectCard).presence, 0);
  return fromProjects + (favori(s, region) === playerId ? 2 : 0);
}

export function dominant(s: GameState, region: RegionId): string | null {
  let best: string | null = null;
  let bestN = 0;
  let tie = false;
  for (const p of s.players) {
    const n = presence(s, region, p.id);
    if (n > bestN) { best = p.id; bestN = n; tie = false; } else if (n === bestN && n > 0) tie = true;
  }
  return tie ? null : best;
}

export function dominatedCount(s: GameState, playerId: string): number {
  return s.regions.filter((r) => dominant(s, r) === playerId).length;
}

export function score(s: GameState, p: Player): number {
  let pts = p.projects.reduce((a, x) => a + x.points, 0);
  pts += 3 * dominatedCount(s, p.id);
  if (s.regions.includes("IN") && favori(s, "IN") === p.id) pts += p.projects.filter((x) => x.region === "IN").length;
  pts += Math.floor(p.capital / 5);
  return pts;
}

export function upgradeCost(level: number): number {
  return 2 * (level + 1);
}

export function projectCost(s: GameState, p: Player, card: ProjectCard, region: RegionId): { capital: number; genie: number } {
  let c = card.capital;
  let g = card.genie;
  const ev = s.currentEvent;
  if (p.ceo === "xcess" && card.tags.includes("espace")) c -= 2;
  if (ev === "e_penurie" && card.genie > 0) g += 2;
  if (ev === "e_guerre_commerciale" && (region === "NA" || region === "CN")) c += 3;
  if (ev === "e_ai_act" && region === "EU" && card.tags.includes("ia") && favori(s, "EU") !== p.id) c += 3;
  if (ev === "e_subventions" && card.tags.includes("energie")) c -= 3;
  if (region === "EU") {
    const f = favori(s, "EU");
    if (f && f !== p.id) c += 2;
  }
  if (region === "CN" && p.ceo !== "dragon") g += 1;
  return { capital: Math.max(0, c), genie: Math.max(0, g) };
}

export function lobbyTokens(s: GameState, region: RegionId, amount: number): number {
  let n = region === "NA" ? amount * 2 : region === "EU" ? Math.floor(amount / 2) : amount;
  if (s.currentEvent === "e_lune_de_miel") n *= 2;
  return n;
}

export function canLaunchAnywhere(s: GameState, p: Player, card: ProjectCard): RegionId[] {
  return s.regions.filter((r) => checkLaunch(s, p, card, r).ok);
}

function checkLaunch(s: GameState, p: Player, card: ProjectCard, region: RegionId): Result {
  if (!s.regions.includes(region)) return fail("Cette région n'est pas en jeu.");
  if (card.regions && !card.regions.includes(region)) return fail("Ce projet ne peut pas être lancé dans cette région.");
  if (p.tech < card.minTech) return fail(`Il faut Technologie ${card.minTech}.`);
  const cost = projectCost(s, p, card, region);
  if (p.capital < cost.capital) return fail("Pas assez de Capital.");
  if (p.genie < cost.genie) return fail("Pas assez de Génie.");
  return ok;
}

export function checkCoup(s: GameState, p: Player, card: CoupCard, targetId: string): Result {
  if (p.amis < 1) return fail("Un coup bas coûte 1 Ami haut placé.");
  if (card.effect === "loi_sur_mesure") {
    if (!s.regions.some((r) => favori(s, r) === p.id)) return fail("Il faut être le favori d'un gouvernement.");
    return ok;
  }
  const t = getPlayer(s, targetId);
  if (!t || t.id === p.id) return fail("Choisissez un rival.");
  if (card.effect === "opa") {
    const last = t.projects[t.projects.length - 1];
    if (!last) return fail("Ce rival n'a aucun projet à racheter.");
    if (p.capital < 2 * (CARDS[last.card] as ProjectCard).capital) return fail("Pas assez de Capital pour l'OPA.");
  }
  return ok;
}

// ---------------------------------------------------------------- salle d'attente

export function createGame(code: string, hostId: string, hostName: string): GameState {
  const s: GameState = {
    phase: "lobby", code, hostId, players: [], regions: [], tokens: {} as GameState["tokens"],
    deck: [], discard: [], events: [], currentEvent: null, year: 0, maxYears: 0,
    order: [], turnIndex: 0, actionsLeft: 0, turnDeadline: null, pending: null, flashUsed: [],
    log: [], logSeq: 0, winners: null, winReason: null, version: 0,
  };
  addPlayer(s, hostId, hostName, false);
  return s;
}

function blankPlayer(id: string, name: string, isBot: boolean): Player {
  return {
    id, name, ceo: null, isBot, connected: true, hype: 0, tech: 0, influence: 0, capital: 0, genie: 0, amis: 0,
    reputation: START_REPUTATION, hand: [], projects: [], shieldUsed: false, skipNext: false,
  };
}

export function addPlayer(s: GameState, id: string, name: string, isBot: boolean): Result {
  if (s.phase !== "lobby") return fail("La partie a déjà commencé.");
  if (s.players.length >= 8) return fail("La salle est pleine (8 joueurs).");
  if (getPlayer(s, id)) return ok;
  s.players.push(blankPlayer(id, name.trim().slice(0, 20) || "Anonyme", isBot));
  return ok;
}

const BOT_NAMES = ["Bot-actionnaire", "Algo-trader", "Conseil McKinsé", "Stagiaire IA", "Fonds vautour", "Lobbyiste.exe", "Board fantôme"];

// ---------------------------------------------------------------- déroulement

function drawCard(s: GameState, p: Player, rng: Rng): boolean {
  if (p.hand.length >= HAND_MAX) return false;
  if (s.deck.length === 0) {
    if (s.discard.length === 0) return false;
    s.deck = shuffle(s.discard, rng);
    s.discard = [];
  }
  p.hand.push(s.deck.pop()!);
  return true;
}

function startGame(s: GameState, rng: Rng, now: number): Result {
  if (s.players.length < 2) return fail("Il faut au moins 2 joueurs.");
  if (s.players.some((p) => !p.ceo)) return fail("Chaque joueur doit choisir son PDG.");
  const n = s.players.length;
  s.regions = regionsFor(n);
  s.maxYears = yearsFor(n);
  s.tokens = Object.fromEntries(s.regions.map((r) => [r, {}])) as GameState["tokens"];
  s.deck = shuffle(Object.entries(DECK).flatMap(([id, k]) => Array(k).fill(id)), rng);
  s.events = shuffle(Object.keys(EVENTS), rng);
  for (const p of s.players) {
    const c = CEOS[p.ceo!];
    Object.assign(p, { hype: c.hype, tech: c.tech, influence: c.influence, capital: START_CAPITAL, genie: c.tech, amis: c.influence, reputation: START_REPUTATION, hand: [], projects: [] });
    for (let i = 0; i < 4; i++) drawCard(s, p, rng);
    if (p.ceo === "dragon" && s.regions.includes("CN")) s.tokens.CN[p.id] = 2;
  }
  s.phase = "playing";
  log(s, `La partie commence : ${n} entreprises, ${s.regions.length} régions, ${s.maxYears} exercices fiscaux. Que le moins scrupuleux gagne.`, "info");
  startYear(s, rng, now);
  return ok;
}

function damageRep(s: GameState, p: Player, n: number, why: string) {
  if (n <= 0) return;
  if (p.ceo === "openmind" && !p.shieldUsed) {
    p.shieldUsed = true;
    log(s, `${label(p)} évite le scandale (${why}) : « C'est pour l'humanité. »`, "good");
    return;
  }
  p.reputation -= n;
  log(s, `${label(p)} perd ${n} Réputation (${why}).`, "scandal");
  if (p.reputation <= 0) {
    p.reputation = 3;
    p.skipNext = true;
    log(s, `Commission d'enquête parlementaire : ${label(p)} est convoqué et passe son prochain tour.`, "scandal");
  }
}

function applyEvent(s: GameState) {
  const id = s.currentEvent!;
  const ev = EVENTS[id];
  log(s, `🌍 Exercice ${s.year} · ${ev.name} : ${ev.text}`, "event");
  const ps = s.players;
  switch (id) {
    case "e_election":
      if (s.tokens.NA) s.tokens.NA = {};
      break;
    case "e_scandale": {
      const min = Math.min(...ps.map((p) => p.hype));
      const lows = ps.filter((p) => p.hype === min);
      for (const p of ps) if (!(lows.length === 1 && lows[0] === p)) damageRep(s, p, 1, "scandale des données");
      break;
    }
    case "e_krach":
      for (const p of ps) p.capital = Math.floor(p.capital / 2);
      break;
    case "e_conflit":
      for (const p of ps) if (p.influence >= 3) p.amis += 1;
      break;
    case "e_senat": {
      const max = Math.max(...ps.map((p) => p.capital));
      const top = ps.filter((p) => p.capital === max);
      if (top.length === 1) damageRep(s, top[0], 2, "audition au Sénat");
      break;
    }
    case "e_cerveaux":
      for (const p of ps) if (p.tech >= 4) p.genie += 2;
      break;
  }
  if (ev.war) for (const p of ps) if (p.ceo === "palantear") { p.capital += 3; log(s, `${label(p)} encaisse 3 Capital de contrats de défense.`, "good"); }
}

export function income(p: Player): number {
  const fromProjects = p.projects.reduce((a, x) => a + (CARDS[x.card] as ProjectCard).income, 0);
  return 2 + p.hype + fromProjects + (p.ceo === "amazone" ? p.projects.length : 0) - (p.reputation <= 3 ? 2 : 0);
}

function startYear(s: GameState, rng: Rng, now: number) {
  s.year += 1;
  if (s.year > 1) {
    for (const p of s.players) {
      const inc = income(p);
      p.capital += Math.max(0, inc);
      p.genie += p.tech;
      p.amis += p.influence;
      drawCard(s, p, rng);
    }
  }
  if (s.events.length === 0) s.events = shuffle(Object.keys(EVENTS), rng);
  s.currentEvent = s.events.shift()!;
  applyEvent(s);
  const seat = new Map(s.players.map((p, i) => [p.id, i]));
  s.order = s.players.slice().sort((a, b) => score(s, a) - score(s, b) || seat.get(a.id)! - seat.get(b.id)!).map((p) => p.id);
  s.turnIndex = -1;
  nextTurn(s, rng, now);
}

function endYear(s: GameState, rng: Rng, now: number) {
  s.turnDeadline = null;
  for (const r of s.regions) {
    const f = favori(s, r);
    if (!f) continue;
    const p = must(s, f);
    if (r === "NA") p.capital += 3;
    if (r === "CN") p.genie += 2;
    if (r === "GO") p.capital += 4;
    if (r === "SUD") { p.capital += 1; p.genie += 1; }
  }
  const threshold = winThreshold(s.players.length);
  if (s.year >= 2) {
    const kings = s.players.filter((p) => dominatedCount(s, p.id) >= threshold);
    if (kings.length === 1) {
      finish(s, [kings[0].id], `${label(kings[0])} domine ${threshold} régions : le monde lui appartient.`);
      return;
    }
  }
  if (s.year >= s.maxYears) {
    const best = Math.max(...s.players.map((p) => score(s, p)));
    let top = s.players.filter((p) => score(s, p) === best);
    if (top.length > 1) {
      const cap = Math.max(...top.map((p) => p.capital));
      top = top.filter((p) => p.capital === cap);
    }
    finish(s, top.map((p) => p.id), `Fin du dernier exercice : victoire aux points d'hégémonie (${best}).`);
    return;
  }
  startYear(s, rng, now);
}

function finish(s: GameState, winners: string[], reason: string) {
  s.phase = "over";
  s.winners = winners;
  s.winReason = reason;
  s.turnDeadline = null;
  s.pending = null;
  log(s, `🏆 ${reason}`, "event");
}

function nextTurn(s: GameState, rng: Rng, now: number) {
  s.pending = null;
  s.flashUsed = [];
  while (true) {
    s.turnIndex += 1;
    if (s.turnIndex >= s.order.length) {
      endYear(s, rng, now);
      return;
    }
    const p = must(s, s.order[s.turnIndex]);
    if (p.skipNext) {
      p.skipNext = false;
      log(s, `${label(p)} est retenu par la commission d'enquête et passe son tour.`, "scandal");
      continue;
    }
    s.actionsLeft = 2;
    s.turnDeadline = now + TURN_MS;
    return;
  }
}

function spendAction(s: GameState, rng: Rng, now: number) {
  s.actionsLeft -= 1;
  if (s.actionsLeft <= 0 && !s.pending && s.phase === "playing") nextTurn(s, rng, now);
}

function removeFromHand(p: Player, card: string): boolean {
  const i = p.hand.indexOf(card);
  if (i < 0) return false;
  p.hand.splice(i, 1);
  return true;
}

function resolveCoup(s: GameState, rng: Rng, now: number, counter: FlashCard | null) {
  const pend = s.pending!;
  const actor = must(s, pend.actor);
  const card = CARDS[pend.card] as CoupCard;
  s.pending = null;
  s.discard.push(card.id);
  const target = getPlayer(s, pend.target)!;
  if (counter) {
    log(s, `${label(target)} contre « ${card.name} » avec « ${counter.name} ».`, "good");
    if (counter.effect === "contre_enquete") damageRep(s, actor, 2, "contre-enquête");
  } else {
    switch (card.effect) {
      case "debauchage":
        if (target.ceo === "pomme") log(s, `Les ingénieurs de ${label(target)} refusent de partir : écosystème fermé.`, "info");
        else {
          const n = Math.min(2, target.genie);
          target.genie -= n;
          actor.genie += n;
          log(s, `${label(actor)} débauche les ingénieurs de ${label(target)} : ${n} Génie volé(s).`, "bad");
        }
        break;
      case "fuite_presse":
        damageRep(s, target, target.hype >= 4 ? 1 : 2, "fuite dans la presse");
        break;
      case "proces": {
        const n = Math.min(3, target.capital);
        target.capital -= n;
        log(s, `${label(actor)} attaque ${label(target)} en justice : ${n} Capital de frais d'avocats.`, "bad");
        break;
      }
      case "loi_sur_mesure":
        for (const p of s.players) if (p.id !== actor.id) p.capital = Math.max(0, p.capital - 2);
        log(s, `${label(actor)} fait voter une loi sur mesure : chaque rival perd 2 Capital.`, "bad");
        break;
      case "opa": {
        const proj = target.projects.pop();
        if (proj) {
          const price = 2 * (CARDS[proj.card] as ProjectCard).capital;
          const paid = Math.min(price, actor.capital);
          actor.capital -= paid;
          target.capital += paid;
          actor.projects.push(proj);
          log(s, `${label(actor)} rachète « ${CARDS[proj.card].name} » à ${label(target)} pour ${paid} Capital.`, "bad");
        }
        break;
      }
      case "espionnage":
        if (target.ceo === "pomme") log(s, `L'espion de ${label(actor)} se perd dans l'écosystème fermé de ${label(target)}.`, "info");
        else {
          if (target.hand.length && actor.hand.length < HAND_MAX) {
            const i = Math.floor(rng() * target.hand.length);
            actor.hand.push(target.hand.splice(i, 1)[0]);
          }
          const g = Math.min(1, target.genie);
          target.genie -= g;
          actor.genie += g;
          log(s, `${label(actor)} espionne ${label(target)} : une carte et ${g} Génie volés.`, "bad");
        }
        break;
    }
    const roll = 1 + Math.floor(rng() * 6);
    if (roll <= card.risk) {
      log(s, `📰 Fuite ! Le coup « ${card.name} » de ${label(actor)} fait la une.`, "scandal");
      damageRep(s, actor, card.risk + 1 - (actor.hype >= 4 ? 1 : 0), "scandale");
    }
  }
  if (s.actionsLeft <= 0 && s.phase === "playing") nextTurn(s, rng, now);
}

// ---------------------------------------------------------------- commandes

export function apply(s: GameState, playerId: string, cmd: Command, rng: Rng, now: number): Result {
  const r = applyInner(s, playerId, cmd, rng, now);
  if (r.ok) s.version += 1;
  return r;
}

function applyInner(s: GameState, playerId: string, cmd: Command, rng: Rng, now: number): Result {
  const p = getPlayer(s, playerId);
  if (!p) return fail("Joueur inconnu.");

  // --- salle d'attente
  if (s.phase === "lobby") {
    switch (cmd.t) {
      case "setCeo":
        if (!CEOS[cmd.ceo]) return fail("PDG inconnu.");
        if (s.players.some((x) => x.ceo === cmd.ceo && x.id !== p.id)) return fail("Ce PDG est déjà pris.");
        p.ceo = cmd.ceo;
        return ok;
      case "addBot": {
        if (playerId !== s.hostId) return fail("Seul l'hôte peut ajouter un bot.");
        const free = (Object.keys(CEOS) as CeoId[]).filter((c) => !s.players.some((x) => x.ceo === c));
        if (!free.length) return fail("Plus de PDG disponible.");
        const id = "bot-" + (s.players.length + 1) + "-" + Math.floor(rng() * 1e6);
        const name = BOT_NAMES[s.players.filter((x) => x.isBot).length % BOT_NAMES.length];
        const r = addPlayer(s, id, name, true);
        if (!r.ok) return r;
        must(s, id).ceo = free[Math.floor(rng() * free.length)];
        return ok;
      }
      case "kick":
        if (playerId !== s.hostId || cmd.id === s.hostId) return fail("Impossible.");
        s.players = s.players.filter((x) => x.id !== cmd.id);
        return ok;
      case "start":
        if (playerId !== s.hostId) return fail("Seul l'hôte peut lancer la partie.");
        return startGame(s, rng, now);
      default:
        return fail("La partie n'a pas commencé.");
    }
  }
  if (s.phase !== "playing") return fail("La partie est terminée.");

  // --- réactions (fenêtre flash quand on est visé)
  if (cmd.t === "react" || cmd.t === "pass") {
    if (!s.pending || s.pending.target !== p.id) return fail("Rien à contrer.");
    if (cmd.t === "pass") { resolveCoup(s, rng, now, null); return ok; }
    const card = CARDS[cmd.card];
    if (!card || card.kind !== "flash" || card.mode !== "reaction" || !p.hand.includes(card.id)) return fail("Carte de réaction invalide.");
    if (p.capital < card.capital || p.amis < card.amis) return fail("Pas les moyens de cette réaction.");
    p.capital -= card.capital;
    p.amis -= card.amis;
    removeFromHand(p, card.id);
    s.discard.push(card.id);
    resolveCoup(s, rng, now, card);
    return ok;
  }

  // --- actions flash (pendant le tour des autres, ou à tout moment)
  if (cmd.t === "flash") {
    const card = CARDS[cmd.card];
    if (!card || card.kind !== "flash" || !p.hand.includes(card.id)) return fail("Carte flash invalide.");
    if (card.mode === "reaction") return fail("Cette carte se joue quand un coup bas vous vise.");
    if (s.pending) return fail("Attendez la fin de la réaction en cours.");
    const active = activePlayer(s);
    if (!active) return fail("Aucun tour en cours.");
    const ownTurn = active.id === p.id;
    if (card.mode === "offense" && ownTurn) return fail("Se joue pendant le tour d'un rival.");
    if (!ownTurn && s.flashUsed.includes(p.id)) return fail("Une seule action flash par tour adverse.");
    if (p.capital < card.capital || p.amis < card.amis) return fail("Pas les moyens.");
    if (card.effect === "greve" && s.actionsLeft <= 0) return fail("Il n'a plus d'action à perdre.");
    p.capital -= card.capital;
    p.amis -= card.amis;
    removeFromHand(p, card.id);
    s.discard.push(card.id);
    if (!ownTurn) s.flashUsed.push(p.id);
    switch (card.effect) {
      case "sweat":
        p.reputation = Math.min(10, p.reputation + 2);
        log(s, `⚡ ${label(p)} s'excuse en sweat à capuche : +2 Réputation.`, "good");
        break;
      case "tweet_assassin": {
        const n = Math.min(2, active.capital);
        active.capital -= n;
        log(s, `⚡ ${label(p)} publie un tweet assassin : ${label(active)} perd ${n} Capital.`, "bad");
        break;
      }
      case "delit_initie": {
        const n = Math.min(3, active.projects.length);
        p.capital += n;
        log(s, `⚡ ${label(p)} vend à découvert juste à temps : +${n} Capital.`, "bad");
        break;
      }
      case "greve":
        log(s, `⚡ Grève surprise chez ${label(active)}, organisée par ${label(p)} : une action en moins.`, "bad");
        spendAction(s, rng, now);
        break;
    }
    return ok;
  }

  // --- actions du joueur actif
  const active = activePlayer(s);
  if (!active || active.id !== p.id) return fail("Ce n'est pas votre tour.");
  if (s.pending) return fail("En attente de la réaction de votre cible.");

  switch (cmd.t) {
    case "end":
      log(s, `${label(p)} termine son tour.`, "info");
      nextTurn(s, rng, now);
      return ok;
    case "draw": {
      if (p.hand.length >= HAND_MAX) return fail(`Main pleine (${HAND_MAX} cartes).`);
      let n = 0;
      if (drawCard(s, p, rng)) n++;
      if (drawCard(s, p, rng)) n++;
      if (!n) return fail("La pioche est vide.");
      log(s, `${label(p)} consulte ses cabinets de conseil (+${n} carte${n > 1 ? "s" : ""}).`, "info");
      spendAction(s, rng, now);
      return ok;
    }
    case "upgrade": {
      const g: Gauge = cmd.gauge;
      if (!["hype", "tech", "influence"].includes(g)) return fail("Jauge inconnue.");
      if (p[g] >= MAX_LEVEL) return fail("Niveau maximum atteint.");
      const cost = upgradeCost(p[g]);
      if (p.capital < cost) return fail(`Il faut ${cost} Capital.`);
      p.capital -= cost;
      p[g] += 1;
      const names = { hype: "Hype", tech: "Technologie", influence: "Influence" };
      log(s, `${label(p)} investit ${cost} Capital : ${names[g]} ${p[g]}.`, "info");
      spendAction(s, rng, now);
      return ok;
    }
    case "lobby": {
      if (!s.regions.includes(cmd.region)) return fail("Région hors jeu.");
      const amount = Math.floor(cmd.amount);
      if (amount < 1 || amount > p.amis) return fail("Nombre d'Amis invalide.");
      const tokens = lobbyTokens(s, cmd.region, amount);
      if (tokens < 1) return fail("La Commission exige au moins 2 Amis.");
      p.amis -= amount;
      s.tokens[cmd.region][p.id] = (s.tokens[cmd.region][p.id] || 0) + tokens;
      log(s, `${label(p)} invite ${REGIONS[cmd.region].government} à dîner : +${tokens} jeton${tokens > 1 ? "s" : ""}.`, "info");
      spendAction(s, rng, now);
      return ok;
    }
    case "launch": {
      const card = CARDS[cmd.card];
      if (!card || card.kind !== "projet" || !p.hand.includes(card.id)) return fail("Projet invalide.");
      const r = checkLaunch(s, p, card, cmd.region);
      if (!r.ok) return r;
      const cost = projectCost(s, p, card, cmd.region);
      p.capital -= cost.capital;
      p.genie -= cost.genie;
      removeFromHand(p, card.id);
      const points = card.points + (s.currentEvent === "e_bulle_ia" && card.tags.includes("ia") ? 2 : 0);
      p.projects.push({ card: card.id, region: cmd.region, points });
      log(s, `🚀 ${label(p)} lance « ${card.name} » (${REGIONS[cmd.region].name}). ${card.flavor}`, "good");
      if (card.tags.includes("social") || card.tags.includes("conso"))
        for (const o of s.players) if (o.ceo === "metamorphe" && o.id !== p.id) { o.capital += 1; log(s, `${label(o)} aspire les données des utilisateurs : +1 Capital.`, "info"); }
      spendAction(s, rng, now);
      return ok;
    }
    case "coup": {
      const card = CARDS[cmd.card];
      if (!card || card.kind !== "coup" || !p.hand.includes(card.id)) return fail("Coup bas invalide.");
      const r = checkCoup(s, p, card, cmd.target);
      if (!r.ok) return r;
      p.amis -= 1;
      removeFromHand(p, card.id);
      const targetId = card.effect === "loi_sur_mesure" ? p.id : cmd.target;
      log(s, `🗡️ ${label(p)} joue « ${card.name} »${targetId !== p.id ? ` contre ${label(must(s, targetId))}` : ""}.`, "bad");
      s.actionsLeft -= 1;
      s.pending = { kind: "coup", actor: p.id, target: targetId, card: card.id, deadline: now + REACTION_MS };
      const target = must(s, targetId);
      const canReact = targetId !== p.id && !target.isBot && target.connected && target.hand.some((c) => {
        const f = CARDS[c];
        return f.kind === "flash" && f.mode === "reaction" && target.capital >= f.capital && target.amis >= f.amis;
      });
      if (canReact) {
        if (s.turnDeadline) s.turnDeadline += REACTION_MS;
      } else resolveCoup(s, rng, now, null);
      return ok;
    }
    default:
      return fail("Commande inconnue.");
  }
}

/** Fait avancer le temps : fin de fenêtre de réaction, fin de tour chronométré. */
export function tick(s: GameState, rng: Rng, now: number): boolean {
  if (s.phase !== "playing") return false;
  if (s.pending && now >= s.pending.deadline) {
    resolveCoup(s, rng, now, null);
    s.version += 1;
    return true;
  }
  if (!s.pending && s.turnDeadline && now >= s.turnDeadline) {
    const p = activePlayer(s);
    if (p) log(s, `⏱️ Temps écoulé pour ${label(p)}. Le marché n'attend pas.`, "info");
    nextTurn(s, rng, now);
    s.version += 1;
    return true;
  }
  return false;
}

/** Prochaine échéance à surveiller (ms epoch), ou null. */
export function nextDeadline(s: GameState): number | null {
  if (s.phase !== "playing") return null;
  if (s.pending) return s.pending.deadline;
  return s.turnDeadline;
}

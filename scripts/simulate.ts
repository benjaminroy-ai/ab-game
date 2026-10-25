// Simule des parties entre bots pour vérifier que le jeu se termine et rester attentif à l'équilibre.
import { CEOS } from "../src/engine/data";
import { apply, createGame, label, score, tick } from "../src/engine/engine";
import { botMove, botToPlay } from "../src/engine/bot";
import { seeded } from "../src/engine/rng";

const N = Number(process.argv[2] || 300);
const PLAYERS = Number(process.argv[3] || 3);
const wins: Record<string, number> = {};
const reasons = { domination: 0, points: 0 };
let turns = 0, actions = 0, scoreSum = 0, maxYear = 0;
for (let g = 0; g < N; g++) {
  const rng = seeded(1000 + g);
  let now = 0;
  const s = createGame("SIM", "h", "Hôte");
  for (let i = 1; i < PLAYERS; i++) apply(s, "h", { t: "addBot" }, rng, now);
  // l'hôte est un bot lui aussi pour la simulation
  s.players[0].isBot = true;
  const free = Object.keys(CEOS).filter((c) => !s.players.some((p) => p.ceo === c));
  apply(s, "h", { t: "setCeo", ceo: free[Math.floor(rng() * free.length)] as any }, rng, now);
  const r = apply(s, "h", { t: "start" }, rng, now);
  if (!r.ok) throw new Error(r.error);
  let guard = 0;
  let lastTurn = "";
  while (s.phase === "playing" && guard++ < 5000) {
    const b = botToPlay(s);
    if (!b) { now += 100_000; tick(s, rng, now); continue; }
    const key = s.year + ":" + s.turnIndex;
    if (key !== lastTurn) { turns++; lastTurn = key; }
    now += 3000;
    const cmd = botMove(s, b, rng);
    const res = apply(s, b.id, cmd, rng, now);
    actions++;
    if (!res.ok) apply(s, b.id, { t: "end" }, rng, now);
  }
  if (s.phase !== "over") throw new Error("partie bloquée " + g);
  maxYear = Math.max(maxYear, s.year);
  for (const w of s.winners!) { const c = s.players.find((p) => p.id === w)!.ceo!; wins[c] = (wins[c] || 0) + 1; }
  if (s.winReason!.includes("domine")) reasons.domination++; else reasons.points++;
  scoreSum += Math.max(...s.players.map((p) => score(s, p)));
  if (g === 0) { console.log("Exemple de fin :", s.winReason); console.log(s.log.slice(-8).map((l) => "  " + l.text).join("\n")); }
}
console.log(`\n${N} parties à ${PLAYERS} joueurs`);
console.log(`Tours joués en moyenne : ${(turns / N).toFixed(1)} · actions : ${(actions / N).toFixed(1)} · score gagnant moyen : ${(scoreSum / N).toFixed(1)}`);
console.log(`Fin par domination : ${reasons.domination} · aux points : ${reasons.points}`);
console.log("Victoires par PDG :", Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${CEOS[c as keyof typeof CEOS].company} ${n}`).join(" · "));
void label;

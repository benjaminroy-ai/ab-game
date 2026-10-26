import { useEffect, useState, type ReactNode } from "react";
import { CEOS, EVENTS, HAND_MAX, MAX_LEVEL, REACTION_MS, REGIONS, START_CAPITAL, START_REPUTATION, TURN_MS } from "../engine/data";
import type { CeoId, RegionId } from "../engine/types";
import { CardView } from "./CardView";

// Tutoriel indépendant de la partie : il se lit depuis l'accueil, la salle d'attente ou en cours de jeu.
// Les chiffres viennent des constantes du moteur pour rester à jour si on rééquilibre.

type Quiz = { q: string; options: string[]; answer: number; explain: string };
type Step = { kicker: string; title: string; body: ReactNode; visual?: ReactNode; recap?: string[]; quiz?: Quiz };

const SAVED_STEP = "abgame-tuto-step";
const TURN_S = TURN_MS / 1000;
const REACTION_S = REACTION_MS / 1000;

function Pips({ level }: { level: number }) {
  return (
    <span className="pips">
      {Array.from({ length: MAX_LEVEL }, (_, i) => <span key={i} className={i < level ? "pip on" : "pip"} />)}
    </span>
  );
}

function Flow({ gauge, level, res, why }: { gauge: string; level: number; res: string; why: string }) {
  return (
    <div className="flow">
      <div className="flow-gauge">{gauge} <Pips level={level} /></div>
      <div className="flow-arrow">→</div>
      <div className="flow-res">{res}</div>
      <div className="muted small flow-why">{why}</div>
    </div>
  );
}

function Who({ ceo, children }: { ceo: CeoId; children?: ReactNode }) {
  return <strong style={{ color: CEOS[ceo].color }}>{children ?? CEOS[ceo].company}</strong>;
}

function MiniRegion({ id, rows, verdict }: { id: RegionId; rows: { ceo: CeoId; detail: string; total: number }[]; verdict: ReactNode }) {
  const r = REGIONS[id];
  return (
    <div className="mini-region">
      <div className="region-head"><span className="flag">{r.flag}</span><div className="region-name">{r.name}</div></div>
      {rows.map((x) => (
        <div key={x.ceo} className="mini-row">
          <Who ceo={x.ceo} /> <span className="muted small">{x.detail}</span> <span className="chip outline" style={{ borderColor: CEOS[x.ceo].color, color: CEOS[x.ceo].color }}>📍 {x.total}</span>
        </div>
      ))}
      <div className="mini-verdict">{verdict}</div>
    </div>
  );
}

function QuizBox({ quiz }: { quiz: Quiz }) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === quiz.answer;
  return (
    <div className="quiz">
      <div className="quiz-q">🧐 Testez-vous : {quiz.q}</div>
      <div className="quiz-options">
        {quiz.options.map((o, i) => (
          <button key={i} className={picked === null ? "" : i === quiz.answer ? "quiz-good" : i === picked ? "quiz-bad" : ""} disabled={picked !== null} onClick={() => setPicked(i)}>
            {o}
          </button>
        ))}
      </div>
      {picked !== null && <div className={right ? "quiz-ok" : "quiz-ko"}>{right ? "✅ Exact. " : "❌ Raté. "}{quiz.explain}</div>}
    </div>
  );
}

const STEPS: Step[] = [
  {
    kicker: "Bienvenue",
    title: "Vous êtes un patron de la tech",
    body: (
      <>
        <p>Chaque joueur dirige une entreprise de la tech et son PDG à l'ego démesuré. Votre but est simple : <strong>régner sur le monde</strong>.</p>
        <p>Pour y arriver, vous lancez des projets aux quatre coins de la planète, vous achetez les gouvernements à coups de dîners et vous sabotez vos rivaux. L'éthique est en option.</p>
        <p>La partie dure quelques <strong>exercices fiscaux</strong> (des années). Chacun joue sur son propre écran, à tour de rôle, mais certaines cartes se jouent pendant le tour des autres : restez attentif.</p>
      </>
    ),
    visual: (
      <div className="tuto-ceos">
        {(["xcess", "metamorphe", "dragon"] as CeoId[]).map((id) => (
          <div key={id} className="ceo" style={{ borderColor: CEOS[id].color }}>
            <div className="ceo-company" style={{ color: CEOS[id].color }}>{CEOS[id].company}</div>
            <div className="ceo-boss">{CEOS[id].boss}</div>
          </div>
        ))}
      </div>
    ),
    recap: ["2 à 8 joueurs, chacun sur son écran.", "Environ 30 minutes à 3 joueurs.", "Les bots peuvent compléter la table."],
  },
  {
    kicker: "Le but",
    title: "Deux façons de gagner",
    body: (
      <>
        <p><strong>1. La domination (victoire immédiate).</strong> À la fin de chaque exercice, à partir du 2ᵉ, si une seule entreprise <strong>domine assez de régions</strong>, elle gagne aussitôt. On verra plus loin ce que « dominer » veut dire.</p>
        <p><strong>2. Les points ⭐ (si personne n'a dominé).</strong> Après le dernier exercice, l'entreprise qui a le plus de points d'hégémonie l'emporte. En cas d'égalité, la plus riche gagne.</p>
        <p>Les points se comptent ainsi :</p>
        <ul>
          <li>les ⭐ de chacun de vos projets ;</li>
          <li><strong>+3</strong> par région que vous dominez ;</li>
          <li><strong>+1</strong> par tranche de 5 💰 Capital ;</li>
          <li>un bonus si vous êtes le favori de l'Inde (quand elle est en jeu).</li>
        </ul>
      </>
    ),
    visual: (
      <table className="tuto-table">
        <thead><tr><th>Joueurs</th><th>Régions</th><th>Exercices</th><th>Domination pour gagner</th></tr></thead>
        <tbody>
          <tr><td>2</td><td>4</td><td>6</td><td>les 4 régions</td></tr>
          <tr><td>3</td><td>4</td><td>6</td><td>3 régions</td></tr>
          <tr><td>4-5</td><td>5 (+ Inde)</td><td>5</td><td>3 régions</td></tr>
          <tr><td>6-8</td><td>6 (+ Sud global)</td><td>4</td><td>4 régions</td></tr>
        </tbody>
      </table>
    ),
    quiz: { q: "vous jouez à 3. Combien de régions devez-vous dominer pour gagner tout de suite ?", options: ["2", "3", "4, toutes"], answer: 1, explain: "À 3 joueurs, il y a 4 régions et il en faut 3. Le compteur « domine x/3 » est affiché sous chaque entreprise." },
  },
  {
    kicker: "Votre entreprise",
    title: "3 jauges, 3 ressources",
    body: (
      <>
        <p>Votre entreprise a trois <strong>jauges</strong>, notées de 1 à {MAX_LEVEL}. Chacune produit une <strong>ressource</strong> au début de chaque exercice :</p>
        <ul>
          <li><strong>📣 Hype</strong> : votre cote auprès du public et des investisseurs. Elle rapporte du <strong>💰 Capital</strong>, l'argent qui paie presque tout.</li>
          <li><strong>🔬 Tech</strong> : votre avance technologique. Elle rapporte du <strong>🧠 Génie</strong>, les ingénieurs nécessaires aux projets ambitieux. Certains projets exigent aussi un niveau de Tech minimum.</li>
          <li><strong>🏛️ Influence</strong> : votre carnet d'adresses. Elle rapporte des <strong>🤝 Amis haut placés</strong>, qui servent au lobbying et aux coups bas.</li>
        </ul>
        <p>Il y a aussi la <strong>😇 Réputation</strong>, de 0 à 10. Elle ne rapporte rien, mais la perdre coûte cher (chapitre dédié).</p>
      </>
    ),
    visual: (
      <div className="flows">
        <Flow gauge="📣 Hype" level={4} res="💰 Capital" why={`2 + Hype + revenus 💵 de vos projets`} />
        <Flow gauge="🔬 Tech" level={3} res="🧠 Génie" why="autant que votre niveau de Tech" />
        <Flow gauge="🏛️ Influence" level={2} res="🤝 Amis" why="autant que votre niveau d'Influence" />
      </div>
    ),
    recap: [`Au départ : ${START_CAPITAL} 💰, du 🧠 et des 🤝 selon vos jauges, ${START_REPUTATION} 😇 et 4 cartes.`, "Chaque nouvel exercice : vos revenus tombent et vous piochez 1 carte.", `Main limitée à ${HAND_MAX} cartes.`],
  },
  {
    kicker: "Le déroulement",
    title: "Un exercice fiscal, étape par étape",
    body: (
      <ol className="tuto-steps">
        <li><strong>Revenus.</strong> Chacun encaisse son 💰, son 🧠 et ses 🤝, puis pioche 1 carte (pas au 1er exercice : on part avec le capital de départ).</li>
        <li><strong>Événement mondial.</strong> Une carte est révélée et change les règles pour l'année : krach boursier, pénurie de puces, élection…</li>
        <li><strong>Ordre du tour.</strong> Le <strong>dernier au classement joue en premier</strong>. C'est sa petite consolation.</li>
        <li><strong>Les tours.</strong> Chacun joue à son tour : <strong>2 actions</strong> en <strong>{TURN_S} secondes</strong> maximum. Le chrono est en haut de l'écran.</li>
        <li><strong>Fin de l'exercice.</strong> Les gouvernements récompensent leur favori, puis on vérifie si quelqu'un domine assez de régions pour gagner.</li>
      </ol>
    ),
    recap: [`${TURN_S} s par tour : quand le temps est écoulé, le tour passe. Le marché n'attend pas.`, "Vous pouvez finir votre tour plus tôt avec « Fin du tour ▶ »."],
  },
  {
    kicker: "Votre tour",
    title: "Les actions possibles",
    body: (
      <>
        <p>À votre tour, vous avez <strong>2 actions</strong>. Vous pouvez faire deux fois la même chose.</p>
        <table className="tuto-table">
          <tbody>
            <tr><td>🂠 <strong>Piocher</strong></td><td>+2 cartes. Gratuit.</td></tr>
            <tr><td>📣🔬🏛️ <strong>Monter une jauge</strong></td><td>+1 niveau. Coûte 2 × le niveau visé en 💰 (passer à 3 coûte 6, à 4 coûte 8, à 5 coûte 10).</td></tr>
            <tr><td>🤝 <strong>Lobbying</strong></td><td>Dépensez des Amis pour gagner des jetons d'influence auprès d'un gouvernement.</td></tr>
            <tr><td>🚀 <strong>Lancer un projet</strong></td><td>Cliquez sur une carte projet, puis sur la région choisie. Vous payez son coût.</td></tr>
            <tr><td>🗡️ <strong>Coup bas</strong></td><td>Cliquez sur une carte coup bas, puis sur la cible. Coûte 1 🤝 Ami.</td></tr>
          </tbody>
        </table>
        <p>Les cartes <strong>⚡ flash</strong> ne coûtent pas d'action : on y revient plus loin.</p>
      </>
    ),
    quiz: { q: "votre Tech est à 3. Combien coûte le passage à Tech 4 ?", options: ["4 💰", "6 💰", "8 💰"], answer: 2, explain: "2 × le niveau visé : 2 × 4 = 8 💰. Le coût exact est toujours écrit sur le bouton." },
  },
  {
    kicker: "Les projets",
    title: "Lancer un projet",
    body: (
      <>
        <p>Les projets sont le cœur du jeu. Chaque carte projet indique :</p>
        <ul>
          <li><strong>💰 et 🧠</strong> : ce qu'il coûte ;</li>
          <li><strong>Tech x+</strong> : le niveau de Tech minimum pour le lancer ;</li>
          <li><strong>📍 présence</strong> : le poids qu'il vous donne dans la région ;</li>
          <li><strong>⭐ points</strong> : ce qu'il rapporte en fin de partie ;</li>
          <li><strong>💵 revenu</strong> : le Capital en plus qu'il vous verse chaque année.</li>
        </ul>
        <p>Vous choisissez <strong>la région</strong> où le lancer. Elle compte : en <strong>Chine</strong>, le Parti exige un transfert de technologie (+1 🧠). En <strong>Europe</strong>, si la Commission a un favori, ses rivaux paient +2 💰.</p>
        <p>Les projets bon marché rapportent vite (💵), les gros projets rapportent des ⭐. À vous de doser.</p>
      </>
    ),
    visual: (
      <div className="tuto-cards">
        <CardView id="p_livraison" />
        <CardView id="p_ia" />
      </div>
    ),
    recap: ["Le coût réel, événements et gouvernements compris, s'affiche sur le bouton « Lancer ici » de chaque région."],
  },
  {
    kicker: "Les gouvernements",
    title: "Lobbying : achetez-vous un gouvernement",
    body: (
      <>
        <p>Chaque région a un gouvernement. Avec l'action <strong>Lobbying</strong>, vous dépensez des 🤝 Amis pour poser des <strong>jetons</strong> chez lui. Les jetons restent d'une année sur l'autre.</p>
        <p>Le joueur qui a <strong>strictement le plus de jetons</strong> est le <strong>favori</strong> de ce gouvernement. En cas d'égalité, il n'y a pas de favori. Être favori donne :</p>
        <ul>
          <li><strong>+2 📍 présence</strong> dans la région (très utile pour la dominer) ;</li>
          <li>un <strong>avantage propre</strong> à chaque gouvernement (tableau ci-contre).</li>
        </ul>
        <p>Les gouvernements n'ont pas tous le même prix. Le Président américain est <strong>vénal</strong> : 1 Ami rapporte 2 jetons, mais une <strong>élection</strong> peut tout effacer. La Commission européenne est <strong>lente</strong> : il faut 2 Amis pour 1 jeton.</p>
      </>
    ),
    visual: (
      <table className="tuto-table">
        <thead><tr><th>Gouvernement</th><th>Tarif</th><th>Avantage du favori</th></tr></thead>
        <tbody>
          {(Object.keys(REGIONS) as RegionId[]).map((id) => (
            <tr key={id}>
              <td>{REGIONS[id].flag} {REGIONS[id].government}</td>
              <td>{id === "NA" ? "1 🤝 = 2 jetons" : id === "EU" ? "2 🤝 = 1 jeton" : "1 🤝 = 1 jeton"}</td>
              <td>{REGIONS[id].favorText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
    recap: ["L'Inde n'est en jeu qu'à partir de 4 joueurs, le Sud global qu'à partir de 6.", "Les bonus en 💰 et 🧠 sont versés à la fin de chaque exercice."],
  },
  {
    kicker: "La domination",
    title: "Qui contrôle une région ?",
    body: (
      <>
        <p>Dans chaque région, on calcule la <strong>📍 présence</strong> de chaque entreprise :</p>
        <p className="tuto-formula">📍 présence = 📍 de vos projets dans la région + 2 si vous êtes le favori</p>
        <p>L'entreprise qui a <strong>strictement la plus forte présence</strong> <strong>domine</strong> la région : elle gagne +3 ⭐ et se rapproche de la victoire. En cas d'égalité, personne ne domine.</p>
        <p>À l'écran, la région dominée prend la couleur de son maître et affiche 👑.</p>
      </>
    ),
    visual: (
      <MiniRegion
        id="EU"
        rows={[
          { ceo: "xcess", detail: "Satellites (📍3)", total: 3 },
          { ceo: "metamorphe", detail: "Réseau social (📍2) + favori (+2)", total: 4 },
        ]}
        verdict={<><Who ceo="metamorphe" /> domine l'Europe 👑, grâce à ses dîners avec la Commission.</>}
      />
    ),
    quiz: { q: "dans cet exemple, Xcess lance une appli de livraison (📍2) en Europe. Qui domine ?", options: ["Xcess", "Metamorphe", "Personne"], answer: 0, explain: "Xcess passe à 3 + 2 = 5 contre 4 pour Metamorphe. Pour reprendre la main, Metamorphe devra lancer un projet ou… saboter Xcess." },
  },
  {
    kicker: "Les crasses",
    title: "Les coups bas",
    body: (
      <>
        <p>Les cartes <strong>🗡️ coup bas</strong> attaquent un rival : vol de Génie, procès, fuite dans la presse, OPA hostile… Jouer un coup bas prend <strong>1 action</strong> et coûte <strong>1 🤝 Ami</strong>.</p>
        <p>Mais ça peut se savoir. Chaque coup bas a un <strong>risque</strong> (🔥 à 🔥🔥🔥). Après le coup, on lance un dé à 6 faces : si le résultat est <strong>inférieur ou égal au risque</strong>, c'est la <strong>fuite</strong>. L'auteur perd alors <strong>risque + 1</strong> de 😇 Réputation (1 de moins s'il a 📣 Hype 4 ou plus : ses fans le défendent).</p>
        <p>La cible n'est pas sans défense : si elle a une carte de <strong>réaction</strong>, elle dispose de <strong>{REACTION_S} secondes</strong> pour contrer.</p>
      </>
    ),
    visual: (
      <div className="tuto-cards">
        <CardView id="c_fuite" />
        <CardView id="c_debauchage" />
      </div>
    ),
    quiz: { q: "vous jouez « Fuite dans la presse » (risque 🔥🔥) avec une Hype de 2. Que risquez-vous ?", options: ["1 chance sur 6 de perdre 2 😇", "2 chances sur 6 de perdre 3 😇", "2 chances sur 6 de perdre 2 😇"], answer: 1, explain: "Fuite si le dé fait 1 ou 2, soit 2 chances sur 6. Vous perdez alors risque + 1 = 3 Réputation. Avec Hype 4, ce serait 2." },
  },
  {
    kicker: "La réputation",
    title: "😇 Garder la tête hors de l'eau",
    body: (
      <>
        <p>La Réputation va de 0 à 10, et vous démarrez à {START_REPUTATION}. Elle baisse avec les fuites, les attaques et certains événements.</p>
        <ul>
          <li><strong>À 3 ou moins</strong>, vos investisseurs s'inquiètent : <strong>−2 💰</strong> de revenu par an. Le chiffre devient rouge.</li>
          <li><strong>À 0</strong>, c'est la <strong>commission d'enquête parlementaire</strong> : vous <strong>passez votre prochain tour</strong>, puis vous remontez à 3.</li>
        </ul>
        <p>Pour vous refaire une virginité, il y a la carte flash <strong>« Excuses en sweat à capuche »</strong> : +2 😇, gratuitement, à tout moment.</p>
      </>
    ),
    visual: <div className="tuto-cards"><CardView id="f_sweat" /></div>,
    recap: ["Une Hype haute (4+) amortit les scandales : 1 point de moins à chaque fuite, et la « Fuite dans la presse » vous coûte 1 au lieu de 2."],
  },
  {
    kicker: "Hors de votre tour",
    title: "Les cartes ⚡ flash",
    body: (
      <>
        <p>Les cartes <strong>⚡ flash</strong> se jouent <strong>sans dépenser d'action</strong>. Il en existe trois sortes :</p>
        <ul>
          <li><strong>Offensives</strong> (Tweet assassin, Délit d'initié, Grève surprise) : uniquement <strong>pendant le tour d'un rival</strong>. Elles le visent directement.</li>
          <li><strong>Réactions</strong> (Armée d'avocats, Contre-enquête) : uniquement <strong>quand un coup bas vous vise</strong>. Une fenêtre s'ouvre pendant {REACTION_S} s pour contrer.</li>
          <li><strong>À tout moment</strong> (Excuses en sweat à capuche) : quand vous voulez.</li>
        </ul>
        <p>Limite : <strong>une seule flash par tour adverse</strong> et par joueur. Choisissez bien votre moment, par exemple un Tweet assassin juste avant que le rival lance son gros projet.</p>
      </>
    ),
    visual: (
      <div className="tuto-cards">
        <CardView id="f_tweet" />
        <CardView id="f_avocats" />
      </div>
    ),
    quiz: { q: "c'est votre tour. Pouvez-vous jouer « Tweet assassin » ?", options: ["Oui, sur n'importe quel rival", "Non, seulement pendant le tour d'un rival"], answer: 1, explain: "Les flash offensives visent le joueur actif. Gardez-la pour quand ce sera son tour." },
  },
  {
    kicker: "Le monde bouge",
    title: "Les événements mondiaux",
    body: (
      <>
        <p>Au début de chaque exercice, un <strong>événement mondial</strong> tombe et reste affiché en haut de l'écran toute l'année. Il change les règles du jeu : prix des projets, valeur du lobbying, pertes pour certains…</p>
        <p>Lisez-le avant de jouer : une année de « Subventions vertes » est idéale pour lancer un projet Énergie, et une « Élection présidentielle » efface tous les jetons chez le Président.</p>
        <p>Quelques exemples parmi les {Object.keys(EVENTS).length} :</p>
      </>
    ),
    visual: (
      <div className="tuto-events">
        {["e_krach", "e_election", "e_bulle_ia", "e_lune_de_miel"].map((id) => (
          <div key={id} className="tuto-event">
            <div className="event-name">🌍 {EVENTS[id].name}</div>
            <div className="small">{EVENTS[id].text}</div>
            <div className="card-flavor">« {EVENTS[id].flavor} »</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "Les PDG",
    title: "Chaque PDG a un pouvoir",
    body: <p>Chaque entreprise démarre avec ses propres jauges et possède un <strong>pouvoir spécial</strong>. Jouez-en en fonction : Palantear a beaucoup d'Influence et peu de Hype, Xcess c'est l'inverse.</p>,
    visual: (
      <div className="tuto-ceo-grid">
        {(Object.keys(CEOS) as CeoId[]).map((id) => {
          const c = CEOS[id];
          return (
            <div key={id} className="ceo" style={{ borderColor: c.color }}>
              <div className="ceo-company" style={{ color: c.color }}>{c.company} <span className="ceo-boss small">· {c.boss}</span></div>
              <div className="ceo-stats">📣 {c.hype} · 🔬 {c.tech} · 🏛️ {c.influence}</div>
              <div className="ceo-power"><strong>{c.power}</strong> : {c.powerText}</div>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    kicker: "Pour finir",
    title: "Quelques conseils de requin",
    body: (
      <>
        <ul className="tuto-tips">
          <li>💸 <strong>Investissez tôt.</strong> Monter la Hype au 1er exercice paie à chaque exercice suivant.</li>
          <li>🎯 <strong>Concentrez-vous.</strong> Mieux vaut dominer 3 régions que d'être 2ᵉ partout.</li>
          <li>🤝 <strong>Le favori vaut +2 de présence.</strong> Un dîner bien placé peut faire basculer une région sans lancer de projet.</li>
          <li>👀 <strong>Surveillez le leader.</strong> Quand quelqu'un affiche « domine 2/3 », tout le monde devrait lui tomber dessus.</li>
          <li>🃏 <strong>Gardez une réaction en main.</strong> Une Armée d'avocats au bon moment ruine le plan d'un rival.</li>
          <li>😇 <strong>Ne tombez pas à 0 Réputation.</strong> Passer un tour coûte souvent la partie.</li>
        </ul>
        <p>Vous pouvez rouvrir ce tutoriel à tout moment avec le bouton <strong>📖 Règles</strong>, y compris en pleine partie. Attention : le chrono, lui, continue de tourner.</p>
      </>
    ),
  },
];

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(() => Math.min(STEPS.length - 1, Number(localStorage.getItem(SAVED_STEP)) || 0));
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useEffect(() => localStorage.setItem(SAVED_STEP, String(last ? 0 : i)), [i, last]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(STEPS.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tuto-back" onClick={onClose}>
      <div className="tuto" onClick={(e) => e.stopPropagation()}>
        <nav className="tuto-nav">
          <div className="brand">📖 Règles du jeu</div>
          {STEPS.map((s, k) => (
            <button key={k} className={`tuto-nav-item${k === i ? " active" : ""}${k < i ? " done" : ""}`} onClick={() => setI(k)}>
              <span className="tuto-num">{k + 1}</span> {s.title}
            </button>
          ))}
        </nav>
        <article className="tuto-main">
          <header className="tuto-head">
            <div>
              <div className="tuto-kicker">Chapitre {i + 1}/{STEPS.length} · {step.kicker}</div>
              <h2>{step.title}</h2>
            </div>
            <button className="ghost" onClick={onClose} aria-label="Fermer">✕</button>
          </header>
          <div className="tuto-progress"><div style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div>
          <div className="tuto-content" key={i}>
            <div className="tuto-body">{step.body}</div>
            {step.visual && <div className="tuto-visual">{step.visual}</div>}
            {step.recap && (
              <div className="tuto-recap">
                <strong>📌 À retenir</strong>
                <ul>{step.recap.map((r, k) => <li key={k}>{r}</li>)}</ul>
              </div>
            )}
            {step.quiz && <QuizBox quiz={step.quiz} />}
          </div>
          <footer className="tuto-foot">
            <button disabled={i === 0} onClick={() => setI(i - 1)}>◀ Précédent</button>
            <span className="muted small">← → pour naviguer · Échap pour fermer</span>
            {last ? <button className="primary" onClick={onClose}>C'est parti !</button> : <button className="primary" onClick={() => setI(i + 1)}>Suivant ▶</button>}
          </footer>
        </article>
      </div>
    </div>
  );
}

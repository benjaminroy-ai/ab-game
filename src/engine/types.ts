export type RegionId = "NA" | "EU" | "CN" | "GO" | "IN" | "SUD";
export type Gauge = "hype" | "tech" | "influence";
export type CeoId = "xcess" | "metamorphe" | "amazone" | "pomme" | "dragon" | "openmind" | "palantear" | "gougle";
export type Tag = "social" | "ia" | "espace" | "energie" | "conso";

export interface ProjectCard {
  id: string;
  kind: "projet";
  name: string;
  capital: number;
  genie: number;
  minTech: number;
  presence: number;
  points: number;
  income: number;
  tags: Tag[];
  regions?: RegionId[];
  flavor: string;
}

export type CoupEffect = "debauchage" | "fuite_presse" | "proces" | "loi_sur_mesure" | "opa" | "espionnage";

export interface CoupCard {
  id: string;
  kind: "coup";
  name: string;
  effect: CoupEffect;
  risk: number; // fuite si d6 <= risk
  text: string;
  flavor: string;
}

export type FlashEffect = "avocats" | "contre_enquete" | "sweat" | "tweet_assassin" | "delit_initie" | "greve";

export interface FlashCard {
  id: string;
  kind: "flash";
  name: string;
  effect: FlashEffect;
  // reaction : quand on est visé par un coup bas ; offense : pendant le tour d'un rival ; anytime : quand on veut
  mode: "reaction" | "offense" | "anytime";
  capital: number;
  amis: number;
  text: string;
  flavor: string;
}

export type Card = ProjectCard | CoupCard | FlashCard;

export interface EventCard {
  id: string;
  name: string;
  text: string;
  flavor: string;
  war?: boolean;
}

export interface Ceo {
  id: CeoId;
  company: string;
  boss: string;
  hype: number;
  tech: number;
  influence: number;
  power: string;
  powerText: string;
  color: string;
}

export interface Region {
  id: RegionId;
  name: string;
  flag: string;
  government: string;
  personality: string;
  favorText: string;
}

export interface OwnedProject {
  card: string;
  region: RegionId;
  points: number;
}

export interface Player {
  id: string;
  name: string;
  ceo: CeoId | null;
  isBot: boolean;
  connected: boolean;
  hype: number;
  tech: number;
  influence: number;
  capital: number;
  genie: number;
  amis: number;
  reputation: number;
  hand: string[];
  projects: OwnedProject[];
  shieldUsed: boolean; // OpenMind : premier scandale ignoré
  skipNext: boolean;
}

export interface Pending {
  kind: "coup";
  actor: string;
  target: string;
  card: string;
  deadline: number;
}

export interface LogEntry {
  n: number;
  text: string;
  tone?: "event" | "scandal" | "good" | "bad" | "info";
}

export interface GameState {
  phase: "lobby" | "playing" | "over";
  code: string;
  hostId: string;
  players: Player[];
  regions: RegionId[];
  tokens: Record<RegionId, Record<string, number>>;
  deck: string[];
  discard: string[];
  events: string[];
  currentEvent: string | null;
  year: number;
  maxYears: number;
  order: string[];
  turnIndex: number;
  actionsLeft: number;
  turnDeadline: number | null;
  pending: Pending | null;
  flashUsed: string[];
  log: LogEntry[];
  logSeq: number;
  winners: string[] | null;
  winReason: string | null;
  version: number;
}

export type Command =
  | { t: "setCeo"; ceo: CeoId }
  | { t: "addBot" }
  | { t: "kick"; id: string }
  | { t: "start" }
  | { t: "draw" }
  | { t: "launch"; card: string; region: RegionId }
  | { t: "upgrade"; gauge: Gauge }
  | { t: "lobby"; region: RegionId; amount: number }
  | { t: "coup"; card: string; target: string }
  | { t: "flash"; card: string }
  | { t: "react"; card: string }
  | { t: "pass" }
  | { t: "end" };

export interface Result {
  ok: boolean;
  error?: string;
}

export type Rng = () => number;

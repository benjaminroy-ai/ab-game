import type { Card, Ceo, CeoId, EventCard, Region, RegionId, Tag } from "./types";

export const TURN_MS = 90_000;
export const REACTION_MS = 10_000;
export const HAND_MAX = 7;
export const START_CAPITAL = 8;
export const START_REPUTATION = 7;
export const MAX_LEVEL = 5;

export const CEOS: Record<CeoId, Ceo> = {
  xcess: { id: "xcess", company: "Xcess", boss: "Elon Mask", hype: 4, tech: 3, influence: 2, color: "#e5484d", power: "Rêve martien", powerText: "Ses projets Espace coûtent 2 Capital de moins.", },
  metamorphe: { id: "metamorphe", company: "Metamorphe", boss: "Mark Zuckerbot", hype: 4, tech: 3, influence: 1, color: "#3e63dd", power: "Collecte de données", powerText: "Gagne 1 Capital chaque fois qu'un rival lance un projet Social ou Conso.", },
  amazone: { id: "amazone", company: "Amazone", boss: "Jeff Bazos", hype: 3, tech: 3, influence: 2, color: "#f76b15", power: "Optimisation fiscale", powerText: "+1 Capital de revenu par projet possédé.", },
  pomme: { id: "pomme", company: "Pomme Inc.", boss: "Tim Crook", hype: 4, tech: 3, influence: 1, color: "#8e8c99", power: "Écosystème fermé", powerText: "Immunisé contre le Débauchage et l'Espionnage.", },
  dragon: { id: "dragon", company: "Dragon Telecom", boss: "M. Wei", hype: 2, tech: 3, influence: 3, color: "#d6409f", power: "Ami du Parti", powerText: "Pas de transfert de technologie en Chine. Commence avec 2 jetons chez le Parti.", },
  openmind: { id: "openmind", company: "OpenMind", boss: "Sam Altruman", hype: 3, tech: 4, influence: 1, color: "#12a594", power: "« C'est pour l'humanité »", powerText: "Son premier scandale est ignoré.", },
  palantear: { id: "palantear", company: "Palantear", boss: "Peter Thiel-Mann", hype: 1, tech: 3, influence: 4, color: "#6e56cf", power: "Contrat de défense", powerText: "Gagne 3 Capital à chaque événement de guerre.", },
  gougle: { id: "gougle", company: "Gougle", boss: "Sundar Pichay", hype: 3, tech: 4, influence: 1, color: "#46a758", power: "Moteur de recherche", powerText: "Voit le prochain événement mondial.", },
};

export const REGIONS: Record<RegionId, Region> = {
  NA: { id: "NA", name: "Amérique du Nord", flag: "🇺🇸", government: "Le Président", personality: "Vénal et versatile : 1 Ami = 2 jetons. Tout est perdu à l'élection.", favorText: "+3 Capital par an" },
  EU: { id: "EU", name: "Europe", flag: "🇪🇺", government: "La Commission", personality: "Lente et procédurière : 2 Amis = 1 jeton.", favorText: "Les projets des rivaux en Europe coûtent +2 Capital" },
  CN: { id: "CN", name: "Chine", flag: "🇨🇳", government: "Le Parti", personality: "Exige un transfert de technologie : +1 Génie par projet.", favorText: "+2 Génie par an" },
  GO: { id: "GO", name: "Golfe", flag: "🇸🇦", government: "L'Émir", personality: "Finance tout, sans poser de questions.", favorText: "+4 Capital par an" },
  IN: { id: "IN", name: "Inde", flag: "🇮🇳", government: "Le Premier ministre", personality: "Le marché géant.", favorText: "+1 point par projet en Inde" },
  SUD: { id: "SUD", name: "Sud global", flag: "🌍", government: "Les Partenaires du Sud", personality: "Lithium et terres rares, à prix d'ami.", favorText: "+1 Capital et +1 Génie par an" },
};

export function regionsFor(players: number): RegionId[] {
  if (players <= 3) return ["NA", "EU", "CN", "GO"];
  if (players <= 5) return ["NA", "EU", "CN", "GO", "IN"];
  return ["NA", "EU", "CN", "GO", "IN", "SUD"];
}
export function yearsFor(players: number): number {
  if (players <= 3) return 6;
  if (players <= 5) return 5;
  return 4;
}
export function winThreshold(players: number): number {
  // à 2, dominer 3 régions sur 4 arrive trop vite : il faut tout prendre
  if (players === 2) return 4;
  return players <= 5 ? 3 : 4;
}

const P = (id: string, name: string, capital: number, genie: number, minTech: number, presence: number, points: number, income: number, tags: Tag[], flavor: string, regions?: RegionId[]): Card => ({ id, kind: "projet", name, capital, genie, minTech, presence, points, income, tags, flavor, regions });

export const CARDS: Record<string, Card> = Object.fromEntries(
  ([
    P("p_reseau_social", "Réseau social « libre »", 4, 0, 1, 2, 2, 1, ["social"], "La liberté d'expression. Sauf pour les critiques."),
    P("p_livraison", "Appli de livraison ubérisée", 3, 0, 1, 2, 1, 2, ["social"], "Les livreurs sont des entrepreneurs. Libres de ne pas manger."),
    P("p_smartphone", "Smartphone à 1 500 €", 5, 1, 2, 2, 2, 2, ["conso"], "Nouveau : il fait exactement la même chose."),
    P("p_assistant", "Assistant vocal espion", 4, 2, 2, 2, 2, 1, ["conso", "ia"], "Il n'écoute que quand vous parlez."),
    P("p_crypto", "Cryptomonnaie maison", 3, 1, 2, 1, 1, 3, ["social"], "Révolutionnaire. Pour les premiers entrés."),
    P("p_casque_vr", "Casque de réalité virtuelle", 5, 2, 2, 1, 3, 0, ["conso"], "Le futur. Que personne ne porte."),
    P("p_moteur", "Moteur de recherche « neutre »", 5, 2, 2, 2, 3, 1, ["ia"], "Les meilleurs résultats. Sponsorisés."),
    P("p_ia", "IA générative", 6, 4, 3, 2, 4, 1, ["ia"], "Entraînée sur le travail des autres. Gratuitement."),
    P("p_voiture", "Voiture (presque) autonome", 6, 3, 3, 2, 3, 1, ["energie", "ia"], "Livrée l'an prochain. Depuis 2015."),
    P("p_gigafactory", "Gigafactory de batteries", 7, 2, 2, 3, 3, 1, ["energie"], "Écologique, à condition de ne pas regarder la mine."),
    P("p_satellites", "Constellation de satellites", 8, 2, 3, 3, 4, 1, ["espace"], "Pour connecter le monde. Et l'éteindre si besoin."),
    P("p_fusee", "Fusée réutilisable", 7, 3, 4, 2, 5, 0, ["espace"], "Explose moins souvent qu'avant."),
    P("p_datacenter", "Data center dans le désert", 5, 1, 2, 3, 2, 2, ["ia"], "L'eau, c'est surfait.", ["GO"]),
    P("p_quantique", "Puce quantique", 9, 5, 5, 3, 7, 0, ["ia"], "Elle marche et ne marche pas, en même temps."),
    P("p_reacteur", "Mini-réacteur nucléaire privé", 8, 3, 4, 3, 5, 1, ["energie"], "Pour alimenter l'IA qui écrit nos communiqués."),
    { id: "c_debauchage", kind: "coup", name: "Débauchage massif", effect: "debauchage", risk: 1, text: "Volez 2 Génie à un rival.", flavor: "Ce n'est pas du vol, c'est de la mobilité des talents." },
    { id: "c_fuite", kind: "coup", name: "Fuite dans la presse", effect: "fuite_presse", risk: 2, text: "Le rival perd 2 Réputation.", flavor: "Selon une source anonyme proche du dossier." },
    { id: "c_proces", kind: "coup", name: "Procès en brevets", effect: "proces", risk: 1, text: "Le rival perd 3 Capital en frais d'avocats.", flavor: "Nous avons breveté le rectangle à coins arrondis." },
    { id: "c_loi", kind: "coup", name: "Loi sur mesure", effect: "loi_sur_mesure", risk: 3, text: "Il faut être favori d'un gouvernement. Chaque rival perd 2 Capital.", flavor: "Rédigée par nos juristes, votée par leurs élus." },
    { id: "c_opa", kind: "coup", name: "OPA hostile", effect: "opa", risk: 2, text: "Rachetez le dernier projet du rival pour 2× son coût en Capital (payé au rival).", flavor: "Si tu ne peux pas les battre, achète-les." },
    { id: "c_espionnage", kind: "coup", name: "Espionnage industriel", effect: "espionnage", risk: 2, text: "Volez une carte au hasard et 1 Génie à un rival.", flavor: "Un stagiaire très motivé." },
    { id: "f_avocats", kind: "flash", name: "Armée d'avocats", effect: "avocats", mode: "reaction", capital: 2, amis: 0, text: "Réaction · 2 Capital : annule un coup bas qui vous vise.", flavor: "Facturés 1 000 € de l'heure. Chacun." },
    { id: "f_contre", kind: "flash", name: "Contre-enquête", effect: "contre_enquete", mode: "reaction", capital: 0, amis: 1, text: "Réaction · 1 Ami : annule un coup bas, et son auteur perd 2 Réputation.", flavor: "Il se trouve que nous avions aussi des sources." },
    { id: "f_sweat", kind: "flash", name: "Excuses en sweat à capuche", effect: "sweat", mode: "anytime", capital: 0, amis: 0, text: "À tout moment, gratuit : +2 Réputation.", flavor: "« Nous devons faire mieux. » (Ils ne feront pas mieux.)" },
    { id: "f_tweet", kind: "flash", name: "Tweet assassin", effect: "tweet_assassin", mode: "offense", capital: 0, amis: 0, text: "Pendant le tour d'un rival : il perd 2 Capital.", flavor: "Publié à 3 h du matin. Supprimé à 3 h 05. Capturé à 3 h 01." },
    { id: "f_delit", kind: "flash", name: "Délit d'initié", effect: "delit_initie", mode: "offense", capital: 0, amis: 0, text: "Pendant le tour d'un rival : gagnez 1 Capital par projet qu'il possède (max 3).", flavor: "Un pur hasard de calendrier." },
    { id: "f_greve", kind: "flash", name: "Grève surprise", effect: "greve", mode: "offense", capital: 0, amis: 0, text: "Pendant le tour d'un rival : il perd 1 action.", flavor: "Organisée par un syndicat que vous financez en secret." },
  ] as Card[]).map((c) => [c.id, c]),
);

// Composition de la pioche (nombre d'exemplaires)
export const DECK: Record<string, number> = {
  p_reseau_social: 2, p_livraison: 2, p_smartphone: 2, p_assistant: 2, p_crypto: 2, p_casque_vr: 1, p_moteur: 2,
  p_ia: 2, p_voiture: 1, p_gigafactory: 2, p_satellites: 1, p_fusee: 1, p_datacenter: 2, p_quantique: 1, p_reacteur: 1,
  c_debauchage: 2, c_fuite: 2, c_proces: 2, c_loi: 1, c_opa: 1, c_espionnage: 2,
  f_avocats: 2, f_contre: 1, f_sweat: 2, f_tweet: 2, f_delit: 2, f_greve: 1,
};

export const EVENTS: Record<string, EventCard> = Object.fromEntries(
  ([
    { id: "e_election", name: "Élection présidentielle", text: "Tous les jetons chez le Président sont perdus.", flavor: "Les promesses n'engagent que ceux qui les reçoivent." },
    { id: "e_penurie", name: "Pénurie de puces", text: "Cette année, les projets qui demandent du Génie coûtent +2 Génie.", flavor: "Taïwan a éternué." },
    { id: "e_scandale", name: "Scandale mondial des données", text: "Tout le monde perd 1 Réputation, sauf celui qui a le moins de Hype.", flavor: "Personne n'avait lu les conditions d'utilisation." },
    { id: "e_guerre_commerciale", name: "Guerre commerciale États-Unis/Chine", text: "Cette année, les projets en Amérique du Nord et en Chine coûtent +3 Capital.", flavor: "Les droits de douane, c'est le consommateur qui paie.", war: true },
    { id: "e_krach", name: "Krach boursier", text: "Chacun perd la moitié de son Capital.", flavor: "Les pertes sont socialisées, les gains privatisés." },
    { id: "e_ai_act", name: "Règlement européen sur l'IA", text: "Cette année, les projets IA en Europe coûtent +3 Capital, sauf pour le favori de la Commission.", flavor: "Bruxelles régule ce qu'elle ne sait pas construire." },
    { id: "e_subventions", name: "Subventions vertes", text: "Cette année, les projets Énergie coûtent 3 Capital de moins.", flavor: "L'argent public, mais pour la planète." },
    { id: "e_conflit", name: "Conflit armé", text: "Chaque entreprise avec Influence 3 ou plus gagne 1 Ami.", flavor: "Une tragédie. Et une opportunité.", war: true },
    { id: "e_bulle_ia", name: "Bulle de l'IA", text: "Cette année, les projets IA rapportent +2 points.", flavor: "Ajoutez « IA » au nom, multipliez la valorisation par dix." },
    { id: "e_lune_de_miel", name: "Lune de miel réglementaire", text: "Cette année, le lobbying rapporte le double de jetons.", flavor: "Le nouveau ministre vient de chez nous." },
    { id: "e_senat", name: "Commission d'enquête du Sénat", text: "L'entreprise la plus riche perd 2 Réputation.", flavor: "Sénateur, nous vendons de la publicité." },
    { id: "e_cerveaux", name: "Fuite des cerveaux", text: "Chaque entreprise avec Technologie 4 ou plus gagne 2 Génie.", flavor: "Les chercheurs suivent les stock-options." },
  ] as EventCard[]).map((e) => [e.id, e]),
);

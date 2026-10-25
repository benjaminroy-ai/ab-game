# AB Game

Jeu de cartes satirique, au tour par tour, pour 2 à 8 joueurs, chacun sur son écran : des patrons de la tech
lancent des projets, courtisent les gouvernements et se font des crasses pour régner sur le monde.

- `npm run dev` : serveur de développement · `npm run build` : site statique dans `dist/`
- `npm test` : tests du moteur · `npm run simulate -- 300 3` : 300 parties entre bots à 3 joueurs (durée, équilibre)
- `./deploy.sh` : publie `dist/` sur GitHub Pages

## Architecture

- `src/engine/` : règles pures et testées (`data.ts` cartes, PDG, régions, événements ; `engine.ts` moteur ; `bot.ts` ; `view.ts` ce que chaque joueur a le droit de voir).
- `src/net/` : le navigateur qui crée la salle est l'arbitre (`host.ts`) ; les autres s'y connectent en pair-à-pair via PeerJS (`session.ts`), avec un code de 4 lettres. Pas de serveur à héberger.
- `src/ui/` : React (accueil, salle d'attente, plateau).

Limite assumée du prototype : l'hôte doit garder son onglet ouvert, et un hôte bricoleur pourrait lire l'état complet dans la console.

#!/bin/sh
# Publie la version en ligne sur GitHub Pages (dépôt benjaminroy-ai/ab-game, branche gh-pages).
set -e
npm run build
D=$(mktemp -d)
cp -r dist/. "$D"
cd "$D"
git init -q -b gh-pages
git add -A
git -c user.name=benjaminroy-ai -c user.email=benjamin.roy@blueboxnet.com commit -qm "Mise à jour $(date +%Y-%m-%d)"
git push -qf https://github.com/benjaminroy-ai/ab-game.git gh-pages

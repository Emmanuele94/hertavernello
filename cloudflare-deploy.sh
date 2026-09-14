#!/bin/sh
set -eu

# Il caricamento via browser GitHub può saltare i file che iniziano con un punto.
# Creiamo .assetsignore direttamente nell'ambiente di build Cloudflare a partire
# da un normale file visibile e tracciato nella repository.
cp cloudflare-assetsignore.txt .assetsignore

# Verifica di sicurezza: la cartella .git deve essere ignorata dagli asset.
if [ ! -f .assetsignore ]; then
  echo "Errore: impossibile creare .assetsignore" >&2
  exit 1
fi

echo "Cloudflare asset ignore preparato. Avvio deploy Wrangler..."
exec npx wrangler deploy

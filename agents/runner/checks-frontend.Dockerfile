FROM docker.io/library/node:24-bookworm-slim
# Contexto de build: frontend/ (esqueleto Angular). Las dependencias se descargan aqui;
# los checks corren sin red con la cache npm en /opt/npm-cache.
RUN install -d -o 65532 -g 65532 /opt/npm-cache

COPY --chmod=755 <<'SCRIPT' /usr/local/bin/wallet-frontend-test
#!/bin/sh
# Instala desde la cache npm (sin red) y ejecuta las pruebas unitarias Angular (Vitest/jsdom).
# En solo lectura npm no puede usar /opt/npm-cache directamente: se enlaza el contenido
# (inmutable) y se copia el indice a una cache escribible en /tmp.
set -eu
if [ "${NPM_ONLINE:-0}" = "1" ]; then
  CACHE=/opt/npm-cache; OFFLINE=""
else
  CACHE=/tmp/npm-cache; OFFLINE="--offline"
  mkdir -p "$CACHE/_cacache/tmp"
  ln -s /opt/npm-cache/_cacache/content-v2 "$CACHE/_cacache/content-v2"
  cp -a /opt/npm-cache/_cacache/index-v5 "$CACHE/_cacache/index-v5"
fi
npm install $OFFLINE --no-audit --no-fund --cache "$CACHE"
npm run test -- --watch=false
SCRIPT

ENV HOME=/tmp NG_CLI_ANALYTICS=false NO_UPDATE_NOTIFIER=1 CI=true
USER 65532:65532
WORKDIR /tmp
COPY --chown=65532:65532 . /tmp/skeleton
RUN cd /tmp/skeleton && NPM_ONLINE=1 wallet-frontend-test && rm -rf /tmp/skeleton /tmp/.npm /tmp/*.log

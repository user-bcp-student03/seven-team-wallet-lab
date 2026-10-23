FROM docker.io/library/node:22-bookworm-slim
# OpenSpec se instala al construir la imagen; los checks corren sin red.
RUN npm install --global --no-audit --no-fund @fission-ai/openspec@1.14.3 \
    && npm cache clean --force
ENV HOME=/tmp OPENSPEC_TELEMETRY=0 DO_NOT_TRACK=1 NO_UPDATE_NOTIFIER=1
USER 65532:65532
WORKDIR /tmp

FROM docker.io/library/maven:3.9-eclipse-temurin-21-noble
# Contexto de build: backend/ (pom.xml y fuentes del esqueleto). Las dependencias se
# descargan aqui; los checks corren sin red con la cache en /opt/m2.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-18 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 65532 --no-create-home --home-dir /tmp --shell /usr/sbin/nologin checker \
    && install -d -o 65532 -g 65532 /opt/m2

COPY --chmod=755 <<'SCRIPT' /usr/local/bin/wallet-backend-test
#!/bin/sh
# Levanta un PostgreSQL efimero y privado (solo loopback) y ejecuta mvn test sobre el cwd.
set -eu
export PATH="/usr/lib/postgresql/18/bin:$PATH"
PGDATA=/tmp/pgdata
initdb -D "$PGDATA" -U wallet --auth=trust --encoding=UTF8 >/tmp/initdb.log
pg_ctl -D "$PGDATA" -l /tmp/postgres.log -w start \
  -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp -c shared_buffers=64MB -c max_connections=60 -c fsync=off -c full_page_writes=off"
createdb -h 127.0.0.1 -U wallet wallet
OFFLINE="-o"
[ "${MVN_ONLINE:-0}" = "1" ] && OFFLINE=""
status=0
mvn -B -ntp $OFFLINE test || status=$?
pg_ctl -D "$PGDATA" -m fast stop >/dev/null 2>&1 || true
exit $status
SCRIPT

ENV HOME=/tmp MAVEN_OPTS="-Xmx768m" \
    MAVEN_ARGS="-Dmaven.repo.local=/opt/m2/repository" \
    WALLET_DB_URL=jdbc:postgresql://127.0.0.1:5432/wallet WALLET_DB_USER=wallet WALLET_DB_PASSWORD=wallet
USER 65532:65532
WORKDIR /tmp
COPY --chown=65532:65532 . /tmp/skeleton
RUN cd /tmp/skeleton && MVN_ONLINE=1 wallet-backend-test && rm -rf /tmp/skeleton /tmp/pgdata /tmp/*.log

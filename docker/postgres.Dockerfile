FROM postgres:17-bookworm

COPY scripts/docker/postgres-entrypoint.sh /scripts/postgres-entrypoint.sh

RUN chmod 755 /scripts/postgres-entrypoint.sh

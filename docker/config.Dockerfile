FROM alpine:3.21

COPY scripts/docker/init-config.sh /scripts/init-config.sh

RUN chmod 755 /scripts/init-config.sh

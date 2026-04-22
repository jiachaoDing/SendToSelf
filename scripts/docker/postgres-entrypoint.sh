#!/bin/sh
set -eu

. /config/runtime.env

export POSTGRES_DB
export POSTGRES_USER
export POSTGRES_PASSWORD

exec docker-entrypoint.sh postgres

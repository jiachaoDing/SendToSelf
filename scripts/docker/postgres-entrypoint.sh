#!/bin/sh
set -eu

config_dir="/config"
config_file="${config_dir}/runtime.env"
pgdata="${PGDATA:-/var/lib/postgresql/data}"

generate_secret() {
  bytes="$1"
  length="$2"

  head -c "$bytes" /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n' | cut -c1-"$length"
}

if [ -f "$config_file" ]; then
  echo "Using existing runtime config from $config_file"
elif [ -s "${pgdata}/PG_VERSION" ]; then
  echo "Missing runtime config: $config_file" >&2
  echo "Existing PostgreSQL data was found in $pgdata. Restore the runtime-config volume before starting postgres." >&2
  exit 1
else
  mkdir -p "$config_dir"

  postgres_password="$(generate_secret 24 32)"
  jwt_secret="$(generate_secret 48 64)"

  cat >"$config_file" <<EOF
POSTGRES_DB=${POSTGRES_DB:-send_to_self}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${postgres_password}
JWT_SECRET=${jwt_secret}
EOF

  chmod 600 "$config_file"
  echo "Generated runtime config at $config_file"
fi

. "$config_file"

: "${POSTGRES_DB:?Missing POSTGRES_DB in $config_file}"
: "${POSTGRES_USER:?Missing POSTGRES_USER in $config_file}"
: "${POSTGRES_PASSWORD:?Missing POSTGRES_PASSWORD in $config_file}"

export POSTGRES_DB
export POSTGRES_USER
export POSTGRES_PASSWORD

exec docker-entrypoint.sh postgres

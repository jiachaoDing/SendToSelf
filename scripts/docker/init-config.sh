#!/bin/sh
set -eu

config_dir="/config"
config_file="${config_dir}/runtime.env"

mkdir -p "$config_dir"

if [ -f "$config_file" ]; then
  echo "Using existing runtime config from $config_file"
  exit 0
fi

postgres_password="$(
  head -c 24 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n' | cut -c1-32
)"
jwt_secret="$(
  head -c 48 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n' | cut -c1-64
)"

cat >"$config_file" <<EOF
POSTGRES_DB=${POSTGRES_DB:-send_to_self}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${postgres_password}
JWT_SECRET=${jwt_secret}
EOF

chmod 600 "$config_file"
echo "Generated runtime config at $config_file"

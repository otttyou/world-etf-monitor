#!/usr/bin/env bash
# Idempotent repository bootstrap for the World ETF Monitor cloud environment.
# - Installs Node dependencies
# - Installs and initializes a local MariaDB (MySQL-compatible) server
# - Ensures a local .env exists
# - Creates the application database/user and applies the Drizzle schema
#
# Durable state created here (node_modules, MariaDB data directory with the
# applied schema, .env) is captured by environment builds/snapshots. The MariaDB
# *process* is started per-boot by start.sh, not here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DB_NAME="world_etf"
DB_USER="etf"
DB_PASS="etfpass"
SOCK="/run/mysqld/mysqld.sock"

echo "[install] Installing Node dependencies with pnpm..."
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

echo "[install] Ensuring MariaDB server is installed..."
if ! command -v mariadbd >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq mariadb-server
fi

echo "[install] Preparing MariaDB directories and data files..."
sudo install -d -o mysql -g mysql /var/lib/mysql /run/mysqld
if [ ! -d /var/lib/mysql/mysql ]; then
  sudo mariadb-install-db --user=mysql --datadir=/var/lib/mysql \
    --auth-root-authentication-method=normal >/dev/null
fi

echo "[install] Writing .env if missing..."
if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@127.0.0.1:3306/${DB_NAME}
JWT_SECRET=local-dev-secret-change-me
NODE_ENV=development
PORT=3000
EOF
fi

echo "[install] Starting MariaDB temporarily to create DB + apply schema..."
# Launch directly as the mysql user (this environment's root lacks
# CAP_DAC_OVERRIDE, so the log redirect must be opened by an owner of the
# target path). The mysql-owned datadir is a guaranteed-writable location.
sudo -u mysql bash -c "nohup /usr/sbin/mariadbd --datadir=/var/lib/mysql \
  --socket=${SOCK} --pid-file=/run/mysqld/mysqld.pid \
  >/var/lib/mysql/manus-mariadbd.log 2>&1 &"

for _ in $(seq 1 30); do
  if sudo mysqladmin --socket="${SOCK}" ping >/dev/null 2>&1; then break; fi
  sleep 1
done

sudo mysql --socket="${SOCK}" <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

set -a; . ./.env; set +a
pnpm db:push

echo "[install] Shutting down temporary MariaDB..."
sudo mysqladmin --socket="${SOCK}" shutdown || true

echo "[install] Done."

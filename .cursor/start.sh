#!/usr/bin/env bash
# Per-boot startup for the World ETF Monitor cloud environment.
# Launches the local MariaDB server (data + schema already prepared by install.sh)
# and returns once it is accepting connections. Idempotent: it will not start a
# second instance if one is already running.
set -euo pipefail

SOCK="/run/mysqld/mysqld.sock"

sudo install -d -o mysql -g mysql /var/lib/mysql /run/mysqld

if sudo mysqladmin --socket="${SOCK}" ping >/dev/null 2>&1; then
  echo "[start] MariaDB already running."
  exit 0
fi

echo "[start] Starting MariaDB..."
# Launch directly as the mysql user (this environment's root lacks
# CAP_DAC_OVERRIDE, so the log redirect must be opened by an owner of the
# target path). The mysql-owned datadir is a guaranteed-writable location.
sudo -u mysql bash -c "nohup /usr/sbin/mariadbd --datadir=/var/lib/mysql \
  --socket=${SOCK} --pid-file=/run/mysqld/mysqld.pid \
  >/var/lib/mysql/manus-mariadbd.log 2>&1 &"

for _ in $(seq 1 30); do
  if sudo mysqladmin --socket="${SOCK}" ping >/dev/null 2>&1; then
    echo "[start] MariaDB ready."
    exit 0
  fi
  sleep 1
done

echo "[start] ERROR: MariaDB did not become ready in time." >&2
sudo tail -20 /var/lib/mysql/manus-mariadbd.log >&2 || true
exit 1

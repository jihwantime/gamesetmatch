#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
env_file="${GSM_ENV_FILE:-.env.production}"
state_dir="${GSM_STATE_DIR:-.deployment}"
backup_dir="${GSM_BACKUP_DIR:-backups}"
if test -f "$state_dir/current.env"; then
  set -a
  source "$state_dir/current.env"
  set +a
fi

compose() {
  docker compose --env-file "$env_file" \
    -f compose.yaml -f compose.production.yaml "$@"
}

backup() {
  mkdir -p "$backup_dir"
  local dump="$backup_dir/$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}.dump"
  compose exec -T db pg_dump -U gamesetmatch -d gamesetmatch -Fc > "$dump.tmp"
  test -s "$dump.tmp"
  mv "$dump.tmp" "$dump"
  echo "Backup saved: $dump"
}

case "${1:-}" in
  init)
    domain="${2:?Usage: production.sh init DOMAIN EMAIL}"
    email="${3:?Usage: production.sh init DOMAIN EMAIL}"
    [[ "$domain" =~ ^[a-zA-Z0-9.-]+$ && "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$ ]] || { echo "Invalid domain or email" >&2; exit 1; }
    test ! -e "$env_file" || { echo "$env_file already exists; refusing to overwrite credentials" >&2; exit 1; }
    password="$(openssl rand -hex 32)"
    sed -e "s/POSTGRES_PASSWORD=CHANGE_ME/POSTGRES_PASSWORD=$password/" \
      -e "s/SITE_ADDRESS=staging.example.com/SITE_ADDRESS=$domain/" \
      -e "s/ACME_EMAIL=you@example.com/ACME_EMAIL=$email/" .env.production.example > "$env_file"
    echo "Created $env_file with private permissions and a generated database password."
    ;;
  backup) backup ;;
  refresh)
    backup
    compose --profile data run --build --rm etl
    ;;
  import-season)
    input="${2:?Usage: production.sh import-season /absolute/path/season.xlsx}"
    [[ "$input" = /* ]] && test -f "$input" || { echo "Provide an absolute workbook path" >&2; exit 1; }
    backup
    compose --profile data run --build --rm -v "$input:/import/season.xlsx:ro" \
      -e TENNIS_DATA_FILE=/import/season.xlsx etl
    ;;
  deploy)
    release="${2:?Usage: production.sh deploy RELEASE_TAG}"
    [[ "$release" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]] || { echo "Invalid release tag" >&2; exit 1; }
    mkdir -p "$state_dir"
    # Never overwrite a saved release image: rollback depends on these tags.
    if docker image inspect "gamesetmatch-web:$release" >/dev/null 2>&1; then
      echo "Release tag already exists; choose a new tag" >&2; exit 1
    fi
    export WEB_IMAGE="gamesetmatch-web:$release" MIGRATE_IMAGE="gamesetmatch-migrate:$release"
    compose config --quiet
    compose build web migrate
    if compose ps --status running --services | grep -qx db; then backup; fi
    if test -f "$state_dir/current.env"; then cp "$state_dir/current.env" "$state_dir/previous.env"; fi
    compose up -d --wait --wait-timeout 180
    printf 'WEB_IMAGE=%s\nMIGRATE_IMAGE=%s\n' "$WEB_IMAGE" "$MIGRATE_IMAGE" > "$state_dir/current.env"
    echo "Deployed $release. Run the HTTP smoke check before switching traffic."
    ;;
  rollback)
    test -f "$state_dir/previous.env" || { echo "No previous release recorded" >&2; exit 1; }
    # This file is written by the deploy command with validated image tags.
    set -a
    source "$state_dir/previous.env"
    set +a
    compose up -d --no-deps --no-build --wait --wait-timeout 180 web
    cp "$state_dir/previous.env" "$state_dir/current.env"
    echo "Previous web image restored. Schema is unchanged; never automatically downgrade it."
    ;;
  restore-check)
    dump="${2:?Usage: production.sh restore-check BACKUP.dump}"
    test -s "$dump"
    # Restore into an isolated disposable database, never over the application DB.
    restore_db="gsm_restore_check_$(date -u +%s)_${RANDOM}"
    compose exec -T db createdb -U gamesetmatch "$restore_db"
    trap 'compose exec -T db dropdb -U gamesetmatch "$restore_db"' EXIT
    compose exec -T db pg_restore -U gamesetmatch -d "$restore_db" --exit-on-error < "$dump"
    compose exec -T db psql -U gamesetmatch -d "$restore_db" -v ON_ERROR_STOP=1 -c \
      'SELECT (SELECT count(*) FROM players) AS players, (SELECT count(*) FROM matches) AS matches;'
    ;;
  *) echo "Usage: production.sh {init DOMAIN EMAIL|deploy TAG|backup|refresh|import-season FILE|rollback|restore-check DUMP}" >&2; exit 1 ;;
esac

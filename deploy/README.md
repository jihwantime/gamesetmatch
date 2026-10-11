# Staging deployment runbook

Public staging is pending a server, domain, and a fresh current-season workbook.
Keep the existing live hosting in place while validating staging.

## Server setup

Use a Linux server with Docker Engine, Compose v2.24+ (for `!reset`), Git,
OpenSSL, curl, and systemd. Build images on the server's architecture.
Check out this repository at `/opt/gamesetmatch`. Point the staging domain's
A/AAAA records at the server; only publish AAAA if IPv6 actually works. Allow
ports 80 and 443 through the host firewall. The PostgreSQL and Next.js services
have no public host ports in the production configuration.

Generate the private environment file and deploy a uniquely tagged release:

```sh
cd /opt/gamesetmatch
bash scripts/production.sh init staging.YOUR-DOMAIN.com YOUR-EMAIL
sudo flock /run/lock/gamesetmatch-maintenance.lock bash scripts/production.sh deploy RELEASE_TAG
```

Replace the uppercase placeholders. `init` generates a random 256-bit database
password, sets file permissions to 600, and refuses to overwrite an existing
environment file. Never commit `.env.production`. Image tags must be unique;
the deploy command refuses to overwrite a saved release.

Caddy routes HTTPS to the web container, provisions certificates for the real
domain, and redirects HTTP to HTTPS. Its certificate state is persisted in
dedicated volumes. DNS and inbound ports must work for certificate issuance.
Reference: [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).

## Load and verify data

```sh
sudo flock /run/lock/gamesetmatch-maintenance.lock bash scripts/production.sh refresh
BASE_URL=https://staging.YOUR-DOMAIN.com node scripts/smoke.mjs
```

The smoke check requires real Federer/Nadal records and Elo data. It checks
search, the homepage, rankings, player and match pages, single-player selection,
predictions on all three surfaces, probabilities summing to 100%, and 404s.
Also check the search dropdown, selecting both prediction players, surface
buttons, player filters, and photos in a real browser on staging.

Production refreshes require a valid current-season workbook no older than
21 days. A download failure with no cache, a corrupt workbook, or an old source
blocks the pipeline before the database loader. The limit measures match dates,
not download dates. During the off-season, adjust `MAX_SOURCE_AGE_DAYS`
deliberately to match the season calendar; do not disable the gate silently.

The provider currently returns HTTP 403 from the local container. Its availability
is independently checked by the `Current-season data availability` GitHub workflow.
If you can download the official workbook normally in your browser, import it
without changing the application's source or bypassing the provider's controls:

```sh
bash scripts/production.sh import-season /absolute/path/2026.xlsx
```

The same schema, season, future-date, and freshness checks apply to supplied files.
The loader also retains its existing protection against moving `latest_match`
backwards. Verify the source date and match counts before promoting staging.

## Backups and schedules

```sh
bash scripts/production.sh backup
bash scripts/production.sh restore-check backups/EXACT_BACKUP_FILE.dump
sudo cp deploy/systemd/gamesetmatch-* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now gamesetmatch-backup.timer gamesetmatch-refresh.timer
systemctl list-timers 'gamesetmatch-*'
```

Backups use PostgreSQL custom-format dumps and private file permissions. A daily
timer runs at 03:00 UTC; data refresh runs Mondays at 07:00 UTC. Every refresh
and upgrade also backs up an existing database first. Scheduled operations share
a lock; use the same lock for manual deployments. Persistent timers catch up
after downtime. Check `journalctl -u gamesetmatch-refresh.service` and
`journalctl -u gamesetmatch-backup.service` for failures.

`restore-check` creates a uniquely named disposable database, restores the dump
with errors treated as fatal, prints player/match counts, and removes only that
test database. It never replaces the application database.

Backups stay on the server and are not automatically deleted. Configure an
off-server encrypted copy and retention policy with your chosen storage provider
before production cutover, then test restore from that copy. Neither remote
backup storage nor failure notifications can be configured until providers and
destinations are selected.

## Rollback and promotion

```sh
bash scripts/production.sh rollback
BASE_URL=https://staging.YOUR-DOMAIN.com node scripts/smoke.mjs
```

Deployment records the current and previous web/migration tags under `.deployment`.
Rollback restores only the previous web image and leaves the database intact.
Do not prune saved release images. Schema changes must remain compatible with
the previous app; destructive migrations require a separate reviewed recovery
plan. Database restores should first be rehearsed with `restore-check`, then
performed during a planned maintenance window if required.

Before switching public traffic, require passing build/container checks, passing
data freshness, successful staging browser/HTTP checks, a tested backup, and
confirmed HTTPS. Keep the existing live deployment running. Record its current
domain/DNS settings and deployed revision so traffic can be switched back.
There is no automatic live cutover in these scripts.

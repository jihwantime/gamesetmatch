# GameSetMatch with Docker

This setup runs the Next.js app in `web-next`, PostgreSQL 17, and an optional
Python ETL/ML job. Install Docker with the Compose v2 plugin first (Docker
Desktop includes both on macOS). Run all commands from the repository root.

## Start the app

```sh
cp .env.example .env
docker compose up --build -d --wait
```

Open http://localhost:3000. PostgreSQL starts first; once it is healthy, the
migration job applies the committed Prisma migrations, then the web server
starts. The database initially has an empty schema. Load match data explicitly:

```sh
docker compose --profile data run --build --rm etl
```

This downloads the archive and current-season results, fetches live rankings,
trains performance and Elo models, and loads PostgreSQL. The first run can take
several minutes and requires internet access. Repeat the same command for a
data refresh. It replaces the local dataset using the existing transactional
loader and its protection against regressing the latest match date.

The homepage and rankings query at request time, so refreshed data appears on
the next request and image builds work without database access.

## Develop with hot reload

```sh
docker compose down
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

The source directory is mounted into the web container. Its Linux dependencies
and Next.js build cache live in anonymous volumes, separate from host installs.
After changing `package-lock.json`, refresh those volumes:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up --build --renew-anon-volumes
```

Use the same two `-f` flags for subsequent development commands. The database
and dataset volumes are shared with the production setup. Run the ETL with:

```sh
docker compose -f compose.yaml -f compose.dev.yaml --profile data run --build --rm etl
```

## Useful commands

```sh
docker compose ps -a
docker compose logs -f web
docker compose exec db psql -U gamesetmatch -d gamesetmatch
docker compose run --rm migrate
docker compose down
```

`down` preserves the database, downloaded CSVs, and model outputs in named
volumes. **`docker compose down -v` deletes all of those volumes**, including the
database. Changing the password in `.env` does not change the password of an
already initialized PostgreSQL volume; change it with SQL or intentionally
recreate the local volume.

`WEB_PORT` in `.env` changes the browser port. The web port binds to loopback
and PostgreSQL has no published host port. Containers connect to `db:5432` on
the Compose network. Use a URL-safe database password because it is embedded
in the connection URL.

## Images and deployment

The web Dockerfile has separate development, migration, build, and runtime
stages. The production server runs as the unprivileged `node` user using
Next.js standalone output. Environment files, host dependencies, local data,
and build caches are excluded from image contexts.

Docker uses `npm run build:container` in `web-next`, which only generates Prisma
and builds Next.js. The existing `npm run build` still applies migrations for
hosted deployments. `npm run db:migrate` runs migrations independently.

This Compose file is a local setup. Hosting it publicly also requires your
chosen host's HTTPS/reverse proxy, credentials, and database backups.

The production overlay, HTTPS proxy, release/rollback scripts, backup/restore
tools, and systemd schedules are documented in [the staging runbook](deploy/README.md).

The Docker GitHub Actions workflow builds all images and starts the production
stack with a deterministic fixture to check migrations, search, pages, predictions,
and database backup/restore. A separate data-availability workflow checks the live
source and freshness. The container tests do not run full model training.

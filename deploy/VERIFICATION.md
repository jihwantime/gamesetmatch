# Verification — October 11, 2026

Changes are on the draft [pull request #2](https://github.com/jihwantime/gamesetmatch/pull/2).
The existing live hosting and original local database were not modified.

Locally verified:

- Linux Docker image build with Next.js 16.3.8 and Prisma 7.9.1.
- Full Next.js lint and build/type checking.
- Twelve mocked download, workbook validation, cache preservation, and freshness tests.
- PostgreSQL migration from an empty database.
- Search, homepage, rankings, player/match pages, single-player selection, predictions
  on Hard/Clay/Grass, complementary probabilities, and unknown-player 404s over HTTP.
- The same HTTP feature checks through Caddy HTTPS with certificate validation,
  first with a fixture and then with a copy of the real 79,299-match local database.
- Real browser search, selection of both prediction players, and a surface change.
- Backup restore into a separate disposable database.
- Rollback to a saved previous web image, followed by successful HTTPS feature checks.
- Private test credentials generated without including secrets in the images or Git.

The audit's critical Next.js advisory was resolved with the 16.3.8 patch release.
The audit still reports high advisories in Prisma's tooling dependency chain.
The flagged Prisma CLI, mysql2, and deepmerge-ts packages were verified absent
from the standalone web image; they remain in the migration/build toolchain.
No forced Prisma downgrade or incompatible transitive major override was applied.

Public staging remains pending a host and domain. Real public certificate issuance,
hosted browser checks, off-server backup storage, and installed systemd schedules
cannot be verified until those resources are selected and configured.

The current-season provider returned 403 locally and in GitHub's independent
source-availability check. The existing scheduled workflow also previously reported
success while skipping this download and keeping `latest_match=20260525`.
Production freshness gates now prevent that outcome from being accepted as a
successful refresh. Current data acquisition remains blocked by the provider;
the official workbook can be supplied through the validated import command.

Consult the PR's latest checks for final CI status. Do not promote this setup while
the source/freshness gate is failing.

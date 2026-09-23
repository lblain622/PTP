# Phase 0 foundation checklist

This checklist establishes the minimum secure base for PTP before report, map, routing, or emergency features are built. Checked items reflect completed implementation or verification; Phase 0 is not yet fully complete.

## Completed

- [x] Add Expo CI configuration for clean install, lint, and TypeScript checks on pull requests and pushes to `main`.
- [x] Configure Dependabot for weekly Expo dependency update proposals.
- [x] Document the environment contract and token inventory with tracked example values.
- [x] Ignore local environment files and Supabase credentials/state in Git.
- [x] Connect the confirmed Supabase development project `PTP-db` and authenticate/link the CLI.
- [x] Enable PostGIS and deploy both Phase 0 migrations to development.
- [x] Add profiles, roles, structured safety reports, private exact locations, flags, and moderation audit tables.
- [x] Add RLS for active published reports, author access, staff access, and private exact locations.
- [x] Connect Expo email/password sign-up, sign-in, sign-out, and published-report reads.
- [x] Store native sessions with SecureStore and keep web sessions in memory.
- [x] Reject privileged Supabase keys in the client configuration.
- [x] Add atomic staff moderation with server-attributed audit entries, protected write columns, and existing-account profile backfill.
- [x] Add Supabase CLI configuration and transactional pgTAP permission tests to CI.
- [x] Verify live Auth, report schema, and anonymous moderation denial with `npm run backend:check` in `ui/`.
- [x] Pass all 10 database permission tests against development, including a temporary moderator account; roll back synthetic test records.
- [x] Pass app lint, TypeScript, and web export checks.
- [x] Apply compatible npm security updates and remove the critical dependency advisory.

## Remaining

- [ ] Create separate Supabase staging and production projects.
- [ ] Enable PostGIS, apply migrations, and verify permissions in staging and production.
- [ ] Create a persistent moderator test account and assign the `moderator` role through an admin-only action. The transactional test account was rolled back.
- [ ] Test authentication, session persistence, sign-out, and email confirmation on native devices.
- [ ] Run the local database test workflow with Docker. Docker was unavailable during setup; development database tests passed instead.
- [ ] Verify the configured CI jobs pass on GitHub.
- [ ] Resolve remaining dependency advisories before release. The latest audit reports 18 findings: 14 moderate and 4 high, including Metro's image parser. No forced Expo downgrades were applied.
- [ ] Create and verify restricted public Mapbox tokens for each environment.
- [ ] Add `EAS_TOKEN` only when mobile builds are ready to run in CI.
- [ ] Add Sentry only when error tracking is initialized; keep its auth token in GitHub Secrets.
- [ ] Configure branch protection on `main` to require the mobile quality check and pull-request review.
- [ ] Review retention periods, privacy notice, moderation workflow, and emergency disclaimer before collecting real data.

## Deliberate deferrals

This foundation does not add a production deployment workflow, AI classification, Docker/Kubernetes, automated authority dispatch, continuous tracking, or a general-purpose backend server. Those are not required to validate the reporting MVP and would add risk before the privacy and moderation flows are tested.

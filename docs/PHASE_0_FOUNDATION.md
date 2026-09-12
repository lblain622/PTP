# Phase 0 foundation checklist

This checklist establishes the minimum secure base for PTP before report, map, routing, or emergency features are built.

## Added in this branch

- Expo CI: clean install, lint, and TypeScript type-check on pull requests and pushes to `main`.
- Dependabot: weekly npm dependency update proposals for the Expo app.
- Environment contract: tracked example values and a documented token inventory.
- Supabase migration baseline: profiles, roles, structured safety reports, private exact locations, flags, and moderator audit entries.
- RLS baseline: public reads are limited to active published reports; exact locations are stored separately.
- Secret safeguards: repository and Supabase local environment files are ignored.

## Manual setup still required

- [ ] Create separate Supabase development, staging, and production projects.
- [ ] Enable PostGIS in each Supabase project and apply the migration to development first.
- [ ] Create one moderator test user and assign the `moderator` role with a server-side/admin-only action.
- [ ] Create restricted public Mapbox tokens for each environment.
- [ ] Add `EAS_TOKEN` only when mobile builds are ready to run in CI.
- [ ] Add Sentry only when error tracking is initialized; keep its auth token in GitHub Secrets.
- [ ] Configure branch protection on `main`: require the **Mobile CI** check and pull-request review.
- [ ] Review retention periods, privacy notice, moderation workflow, and emergency disclaimer before collecting real data.

## Deliberate deferrals

This foundation does not add a production deployment workflow, AI classification, Docker/Kubernetes, automated authority dispatch, continuous tracking, or a general-purpose backend server. Those are not required to validate the reporting MVP and would add risk before the privacy and moderation flows are tested.

# PTP environment and token contract

## Local mobile setup

1. Copy `ui/.env.example` to `ui/.env.local`.
2. Fill in the Supabase URL and anon/publishable key from the project settings.
3. Create a **public** Mapbox token with application and API restrictions, then set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.
4. Restart Expo after changing an environment file.

Only values prefixed with `EXPO_PUBLIC_` can be used in the Expo client. They are visible to anyone who installs or inspects the app. Treat them as configuration, never as secrets.

## Token inventory

| Value | Where it belongs | Exposure |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Expo environment | Public configuration |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Expo environment | Public by design; protected by RLS |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Expo environment | Public token; restrict it in Mapbox |
| `EXPO_PUBLIC_SENTRY_DSN` | Expo environment | Public telemetry endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets only | Secret; never client-side or GitHub Actions logs |
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions secret for future migration deploy workflow | Secret |
| `SUPABASE_DB_PASSWORD` | GitHub Actions secret only if a future workflow needs it | Secret |
| `EAS_TOKEN` | GitHub Actions secret for EAS builds/submission | Secret |
| `SENTRY_AUTH_TOKEN` | GitHub Actions secret for source-map upload | Secret |

Do not create a real `.env` file in Git. GitHub Actions uses repository **Secrets** for secrets and **Variables** for non-secret values such as `SUPABASE_PROJECT_REF`.

## Environment separation

| Environment | Purpose | Data |
| --- | --- | --- |
| Development | Local Expo and local/remote development Supabase project | Synthetic only |
| Staging | Internal device testing and moderation-flow review | Synthetic or explicitly approved test data |
| Production | Closed beta and later release | Real user data; restricted access |

Use separate Supabase and Mapbox projects/tokens for each environment. Do not point development builds at production.

## Applying migrations

1. Install and authenticate the Supabase CLI.
2. Link the intended non-production project.
3. Review the SQL in `supabase/migrations/`.
4. Run `supabase db push`.
5. Verify RLS policies using a normal authenticated user, then a moderator test user.

Migrations are append-only. Once applied to a shared environment, never edit the file; create a new timestamped migration instead.

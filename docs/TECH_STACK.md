# PTP MVP Technical Stack

## Decision

Keep the existing **Expo + React Native + TypeScript** client. Replace the Firebase-first backend direction with **Supabase** for the MVP.

PTP is primarily a location-aware, relational application: reports belong to users and jurisdictions; trips have members; alerts have recipients and delivery states; moderators review content. PostgreSQL with PostGIS models that work naturally and keeps map queries, permissions, and audit records in one system.

## Recommended stack

| Layer | Choice | Why it fits PTP |
| --- | --- | --- |
| Mobile app | Expo, React Native, Expo Router, TypeScript | Already in this repository; one codebase for iOS and Android |
| UI | React Native StyleSheet or NativeWind, React Native Paper | Fast accessible mobile UI; avoid adding two competing component libraries |
| App state | TanStack Query + Zustand | Server caching for reports/trips; small local UI state |
| Backend platform | Supabase | Managed Postgres, Auth, Storage, Realtime, Edge Functions, and Row Level Security |
| Database | PostgreSQL + PostGIS | Relational data and “reports within this map area” queries |
| Authentication | Supabase Auth | Email/social sign-in and an app-linked user ID |
| Server logic | Supabase Edge Functions (TypeScript) | Privileged tasks: alert delivery, moderation actions, signed URLs, scheduled check-ins |
| Notifications | Expo Notifications + FCM/APNs through EAS | Fits the Expo client; keep notification sending in server functions |
| Maps & geocoding | Mapbox | Map display, search/geocoding, and directions with a consistent mobile SDK story |
| File attachments | Supabase Storage | Private report photos with signed, time-limited access |
| Admin portal | Next.js + TypeScript, deployed separately | Moderation tools are easier to use on a desktop browser |
| Error tracking | Sentry | Captures client and server errors with release context |
| CI/CD | GitHub Actions + EAS Build/Submit | Test/lint on pull requests; build mobile releases without operating infrastructure |

## Why not Firebase as the primary backend?

Firebase is good for quick prototypes, but Firestore becomes more awkward for PTP's connected data and geographic moderation workflows. Examples include:

- a trip with many members and consent settings;
- reports filtered by map bounds, status, category, and expiry;
- moderator audit logs and permissioned reviews;
- querying published reports near a planned route;
- preventing a user from seeing an exact private location.

Supabase gives PTP a relational database and PostGIS while still removing most backend/infrastructure setup. You may keep Firebase only if there is already significant finished Firestore logic; otherwise avoid running Firebase Auth, Firestore, Supabase Auth, and Postgres together.

## What to remove or avoid for MVP

- **Kubernetes:** unnecessary operational overhead for an MVP.
- **A separate Node/NestJS API:** defer until the Edge Functions become too complex or separate services are truly needed.
- **Docker in production:** not needed with managed Supabase/EAS. A local Supabase container is optional for development.
- **Background continuous tracking:** high privacy, battery, and platform-review cost.
- **An AI system that classifies people or locations as safe/dangerous:** use structured reports and human moderation instead.
- **More than one map provider:** select Mapbox or Google Maps after a small cost/terms comparison; do not integrate both.

## Repository layout

```text
PTP/
├── app/                       # Expo mobile application (move current ui/ here when ready)
│   ├── app/                   # Expo Router screens
│   ├── components/
│   ├── features/
│   │   ├── reports/
│   │   ├── trips/
│   │   ├── alerts/
│   │   └── community/
│   └── lib/                   # Supabase, maps, notifications clients
├── admin/                     # Next.js moderation portal
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── send-emergency-alert/
│   │   ├── process-check-ins/
│   │   └── moderate-report/
│   └── seed.sql
├── docs/
└── .github/workflows/
```

Keep the current `ui/` folder while screens are being built. Rename it to `app/` only as a deliberate cleanup pull request; do not mix that refactor with feature work.

## Required mobile packages

Add only as the related feature begins:

- `@supabase/supabase-js`
- `@tanstack/react-query`
- `zustand`
- `expo-location`
- `expo-notifications`
- `expo-secure-store`
- `expo-image-picker`
- Mapbox's React Native SDK and supported Expo development-build configuration
- `sentry-expo`

Location, notification, and map SDK packages require device permission testing on both Android and iOS; do not rely solely on Expo web.

## Security implementation rules

1. Enable Row Level Security on every application table.
2. Public clients may read only published, non-expired, coarse-location reports.
3. The service-role key stays only in Edge Functions and CI secrets, never in the Expo app.
4. Exact user locations, emergency alerts, and private attachments require an authenticated recipient/member policy.
5. Moderation decisions and alert delivery attempts must be written server-side with audit entries.
6. Store environment values in `.env.example`; commit no real keys.

## First build sequence

1. Create a Supabase project and add local development configuration.
2. Add `profiles`, `safety_reports`, `content_flags`, and `moderation_actions` tables with RLS policies.
3. Connect the Expo app to Supabase Auth and show only published reports on a test map.
4. Add structured report submission and moderator review in the Next.js admin portal.
5. Add trips, trusted contacts, and Edge Function–sent test alerts.
6. Add routing overlays only after the report/moderation flow is reliable.

## Future evolution

Add a dedicated Node.js service only when one of these is true:
- real-time alert delivery needs persistent queues and retry workers;
- moderation integrations need longer-running jobs;
- routing calculations become proprietary or costly enough to manage independently;
- mobile, web, and third-party partners need a versioned public API.

At that point, keep Supabase/Postgres as the source of truth and introduce the API beside it rather than replacing the database.

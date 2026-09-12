# PTP MVP Plan

## 1. Product purpose

PTP is a travel-safety companion that helps people make more informed travel decisions, share timely local updates, and keep trusted contacts informed. It supports user reports, region-specific guidance, group trips, and safety-aware directions.

**PTP must never promise that a route, place, or person is safe.** It provides context and user-selected preferences, while clearly encouraging users to contact local emergency services when there is an immediate danger.

## 2. MVP outcome

A person can:

1. Create an account and set their safety preferences.
2. Browse a map and a feed of reviewed community safety reports.
3. Submit a structured report about a recent incident or travel-relevant local update.
4. Read verified regional laws, policies, and official resources.
5. Plan a route using practical preferences such as avoiding active, verified hazards.
6. Create a trip with trusted friends and send a safety alert to them.
7. Discuss local concerns in moderated, location-scoped posts.

The MVP deliberately does **not** automate dispatch to police, fire, or medical authorities. Direct emergency integrations require local agreements, accurate location handling, testing, and legal review. The first release provides an SOS shortcut to the device's emergency calling flow plus trusted-contact alerts.

## 3. MVP scope

| Area | Include in MVP | Defer after MVP |
| --- | --- | --- |
| Accounts | Email/social sign-in, profile, age confirmation, privacy controls | Public profiles, reputation tiers |
| Reports | Submit, view, filter, upvote as helpful, report content, moderation queue | Anonymous chat, unmoderated live map |
| Resident updates | Structured local updates with source and expiry | Verified-resident badge program |
| Emergency help | Device emergency-call shortcut, trusted-contact alert, live location sharing after opt-in | Dispatching 911/authorities, background always-on tracking |
| Laws & policies | Curated region pages linked to official sources and “last reviewed” date | AI legal advice or legal interpretation |
| Directions | Route choices with verified active hazard overlays and accessibility/road preferences | A claim that any town is objectively safe/unsafe |
| Friends & trips | Consent-based friend requests, shared trip, check-in, alert recipients | Continuous location history |
| Discussions | City/trip channels, replies, moderation/reporting | Direct messages and public real-time chat |

## 4. Key user stories

### Reports and local updates

- As a traveler, I can see nearby reviewed reports, their type, time, source status, and expiry date before deciding what to do.
- As a resident, I can submit a local update (for example, road closure, protest, flooding, poor lighting, or a safety concern) with a location and source.
- As a community member, I can flag misinformation, harassment, doxxing, or an inaccurate location.
- As a moderator, I can approve, reject, edit for privacy, expire, or escalate reports.

### Emergency and trusted contacts

- As a user who feels unsafe, I can press a clearly labeled SOS button that opens my device’s emergency calling option and sends an alert to the contacts I selected.
- As a trusted contact, I can receive an alert with the sender’s chosen location link, timestamp, and a simple “acknowledge” action.
- As a traveler, I can schedule a check-in; if I miss it, PTP asks me to confirm I am okay before alerting the contacts I chose.

### Guidance, routing, and discussion

- As a traveler, I can read current official laws, policies, and emergency resources for my destination.
- As a user, I can choose route filters such as avoiding active verified hazards, road closures, severe weather, low-coverage areas, and accessibility barriers.
- As a group, we can share a trip and discuss relevant updates without exposing our exact location publicly.

## 5. Safety-aware routing principle

The request to avoid “historically racist towns” should be handled as a **Cultural and traveler-safety context** feature, not a claim that a whole town or its residents are dangerous.

For the MVP, support only:
- verified, time-bounded incident reports;
- official road, emergency, weather, and accessibility notices;
- neutral historic/contextual resources from reputable organizations;
- configurable route preferences that disclose data source, update time, and limitation.

Do not rank locations or populations as inherently dangerous, use race or protected characteristics to score people or places, or present a route as guaranteed safe. Provide an explanation screen for every reroute: “This route avoids two active, reviewed hazard reports and one road closure.”

## 6. Core screens

1. **Onboarding & consent** — account, age confirmation, privacy and location choices, trusted contacts.
2. **Home / safety map** — nearby reviewed reports, filters, emergency button, local resource shortcut.
3. **Report incident/update** — type, description, time, approximate location, optional photo/source, visibility, submit confirmation.
4. **Report detail** — status, source, map precision, comments, expiry, “helpful” and “flag” actions.
5. **Plan trip** — origin/destination, filters, routes, route explanations, save/share trip.
6. **Trip & check-in** — members, scheduled check-in, active safety alerts, share/stop sharing location.
7. **Friends & contacts** — invitations, consent settings, alert permissions, remove/block controls.
8. **Local laws & resources** — jurisdiction selector, official-source links, last reviewed date, emergency numbers.
9. **Community** — city/trip discussion feeds, post/reply/flag controls.
10. **Moderation console** — report and post queue, audit log, expiring content, escalation guidance.

## 7. Data model (first pass)

| Entity | Important fields |
| --- | --- |
| User | id, displayName, ageConfirmedAt, privacySettings, emergencyConsentAt |
| SafetyReport | id, authorId, category, description, occurredAt, locationPrecision, coordinates, status, sourceUrl, expiresAt |
| ReportModeration | reportId, reviewerId, decision, reason, reviewedAt, auditNotes |
| LocalUpdate | id, authorId, category, jurisdictionId, content, sourceUrl, status, expiresAt |
| JurisdictionResource | id, region, title, category, officialUrl, reviewedAt, publisher |
| Trip | id, ownerId, origin, destination, routePreferences, startsAt, status |
| TripMember | tripId, userId, role, locationSharingConsent, alertConsent |
| EmergencyAlert | id, senderId, tripId, recipientIds, createdAt, locationSnapshot, deliveryStatus, acknowledgedAt |
| DiscussionPost | id, authorId, scopeType, scopeId, content, status, createdAt |
| ContentFlag | id, reporterId, contentType, contentId, reason, createdAt, status |

Store exact location separately from public display location. Public reports should default to an approximate map area, never a home address.

## 8. Suggested technical architecture

- **Mobile client:** React Native with Expo and TypeScript.
- **Backend:** Node.js/TypeScript API (NestJS, Fastify, or Express) with a REST API.
- **Database:** PostgreSQL with PostGIS for location queries and route/report map bounds.
- **Authentication & push:** Firebase Auth and FCM, or Supabase Auth plus Expo notifications.
- **Maps/routing:** Mapbox or Google Maps Platform. Confirm terms and budget before selecting.
- **File storage:** Private cloud object storage with virus scanning and signed URLs.
- **Admin:** Small React web dashboard with role-based access control.
- **Observability:** error tracking, delivery logs for alerts, audit logs for moderation, and rate-limit monitoring.

Keep safety classification rules on the server. Do not trust the mobile app to decide whether a report is verified or whether an alert was delivered.

## 9. Delivery roadmap

### Phase 0 — foundation (1–2 weeks)
- Set up repository structure, environment configuration, CI, design tokens, database migrations.
- Define report categories, moderation policy, privacy notices, retention period, and emergency disclaimer.
- Build account, consent, and role model.

### Phase 1 — useful reporting MVP (2–4 weeks)
- Map/feed with reviewed reports.
- Structured report submission, image/source attachment, report flags.
- Moderator queue, approval/rejection/expiration, audit entries.
- Jurisdiction resources with official links.

### Phase 2 — trusted trip safety (2–3 weeks)
- Friend requests and trusted-contact consent.
- Trips, optional check-ins, push notifications.
- SOS: emergency-call handoff and trusted-contact alert delivery/acknowledgment.

### Phase 3 — route context and community (2–4 weeks)
- Routing with active reviewed-hazard and road-closure overlays.
- Transparent route explanations and filters.
- City/trip discussions with content flags and moderation.

## 10. MVP success measures

- At least 90% of submitted reports receive a moderation outcome within the chosen service-level target.
- At least 95% of accepted reports have an expiry date, source, or moderator rationale.
- Alert delivery status is logged; the app never says “contact notified” unless delivery succeeds.
- At least 80% of test users can find a jurisdiction resource and create a report without assistance.
- Moderators can remove/expire unsafe content and review an audit trail.

## 11. Definition of done

The MVP is ready for a small closed beta when:
- every user-generated report and discussion post can be flagged, reviewed, hidden, and logged;
- exact user location is opt-in and never public by default;
- the SOS flow clearly states what happens, names recipients, and hands off to device emergency calling;
- law/policy pages link to official sources and show their review date;
- routing only uses documented, explainable sources;
- privacy, retention, and moderation policies are published;
- abuse, notification failure, and basic accessibility tests pass.

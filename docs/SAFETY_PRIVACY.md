# PTP Safety, Privacy, and Moderation Requirements

## Purpose

PTP handles location, incident reports, and emergency-contact information. These requirements apply before a public beta; they are product requirements, not optional polish.

## Emergency feature boundaries

- Label the feature **“Alert trusted contacts”** and explain it is not a replacement for 911, 988, or local emergency services.
- Provide a prominent device emergency-call action. Do not claim PTP contacted authorities unless an approved integration confirms it.
- Before sending, display the selected recipients, shared information, and an optional short message.
- Require explicit permission for location sharing and allow an alert without a location.
- Record delivery status separately for every recipient. “Sent” and “delivered” are different states.
- Offer a test-alert mode that only sends to the user/their chosen test contact.
- Use time-limited location links. Do not keep continuous location history by default.

## Location privacy

- Collect the least precise location needed for each feature.
- Public reports default to an approximate area; remove addresses, apartment/unit numbers, schools, shelters, and other sensitive details.
- Keep exact reporter location private from other users and moderators unless a documented escalation process permits access.
- Give users clear controls to stop sharing, delete a trip, remove a trusted contact, and delete their account.
- Encrypt location and emergency-contact data in transit and at rest.
- Define and implement retention windows for raw location, alert records, reports, attachments, and moderation logs.

## Community reports

Required report categories:
- road closure or travel disruption;
- severe weather or environmental hazard;
- lighting/accessibility issue;
- suspected scam or unsafe business practice;
- public safety concern;
- local event, protest, or crowd disruption;
- other travel-relevant update.

Do not accept:
- accusations identifying private individuals without authoritative sources;
- home addresses or personally identifying information;
- calls for harassment, retaliation, or vigilantism;
- content targeting protected groups.

Each report must have:
- occurred/observed time;
- coarse location;
- category;
- status: pending, reviewed, published, rejected, removed, expired;
- content-policy flagging;
- expiry time or review rule.

## Moderation operations

1. Automated checks rate-limit submissions and scan for personal data, abusive language, malicious links, and duplicate reports.
2. New reports begin as **pending** unless they come from a trusted official source.
3. A moderator verifies relevance, privacy, evidence/source, location precision, and expiry.
4. Published content can be flagged by users and re-reviewed.
5. Every moderator action creates an immutable audit entry containing who acted, when, decision, and rationale.
6. Immediate threats use a documented escalation runbook; moderators should not investigate or confront people.

## Laws and policy information

- Use official government, court, transportation, or agency pages as primary sources.
- Show the jurisdiction, publisher, source URL, and “last reviewed” date.
- Describe the content as general information, not legal advice.
- Do not infer legal status with an LLM without human review.
- Make it easy to report an outdated resource.

## Routing fairness and transparency

- Explain every non-default route choice in plain language.
- Sources must be named and time-stamped.
- Do not label communities, demographics, or towns as inherently “dangerous.”
- Do not make claims based on race, religion, nationality, or another protected trait.
- Let users turn each route preference on or off.
- Provide a feedback channel for disputed or harmful route recommendations.

## Security baseline

- Role-based access: user, moderator, admin.
- Server-side authorization for every object and action.
- Rate limiting, CAPTCHA/abuse controls for account creation and report submission.
- Signed, short-lived URLs for private attachments.
- Virus scan uploads and strip image metadata where possible.
- Secrets kept outside the repository; separate development, staging, and production environments.
- Security logging for logins, permission changes, moderator actions, alert delivery failures, and suspicious bulk access.

## Launch checklist

- [ ] Privacy policy and community standards approved.
- [ ] Incident-response and content-escalation runbook tested.
- [ ] Emergency disclaimer and test-alert flow reviewed.
- [ ] Data deletion and account deletion tested.
- [ ] Public report location is coarse by default.
- [ ] Accessibility checks cover keyboard navigation, screen reader labels, color contrast, and non-color alert cues.
- [ ] Security review covers authorization, uploads, API abuse, and location exposure.
- [ ] Closed beta feedback has been reviewed before public release.

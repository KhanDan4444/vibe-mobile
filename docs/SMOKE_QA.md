# Smoke QA — tablet + date pickers + session

Install the latest **preview** APK (`eas build --profile preview --platform android`) on a phone and a tablet. Confirm web at https://vibe-frontend-coral.vercel.app.

## Build / deploy (Phase 0)

- Web: production URL returned HTTP 200 (latest `main` on Vercel).
- Mobile: run `eas build --profile preview --platform android` while logged into EAS; install the resulting APK on phone + tablet.

## Mobile

- [ ] **Tabs (phone + tablet):** Dashboard, Members (2-col on tablet), Revenue, Plans, More
- [ ] **Change plan:** “Start new term from a different date” — term start cannot pick future; payment date stays on/after term start and ≤ today
- [ ] **Account switch:** logout → login as another gym — no stale members/photos
- [ ] **Member photo:** edit photo → list/detail update without full refresh

## Web

- [ ] Enroll / renew / change-plan calendars only allow valid dates (same rules as mobile)
- [ ] Change plan custom term start capped at today; payment syncs

## API

No redeploy required for this release if Railway volume at `/app/uploads` is mounted.

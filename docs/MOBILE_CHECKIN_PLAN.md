# Mobile Desk Check-in — Implementation Plan

| | |
|---|---|
| **Status** | Implemented (desk search + tap + member QR + Gym QR / self check-in) |
| **Date** | 21 August 2026 (updated 1 September 2026) |
| **Scope** | `vibe-mobile` desk check-in (search + tap, member QR scan, Gym QR poster, self check-in toggle) |
| **Parity** | Mirror web Phase 2 premium UX on React Native |

## Goals

1. Front desk can search members and record today’s visit on phone/tablet.
2. Same rules as web/API (daily cap, weekly ring, expired blocked).
3. Premium polish: SoftSurface cards, visit ring + avatar badge, inline errors, today list.
4. Owners can enable self check-in, share/download Gym QR poster, and regenerate branch station pass.

## Out of scope (this sprint)

- Absence SMS
- Native member self check-in screen (members use web `/check-in?station=…` from Gym QR)

**Nav (updated):** Check-in is a bottom tab (daily desk use). Plans moved to More.

---

## Checklist

### A. API client
- [x] `src/api/checkIns.ts`
- [x] Types + branch_id + `station_self_checkin`
- [x] `ApiError.details` for force / eligibility
- [x] `src/api/branches.ts` — station pass fetch/regenerate

### B. Visit ring
- [x] `src/components/VisitRing.tsx` (amber / month-end red / dashed empty)

### C. Screen `app/check-in.tsx`
- [x] Hero + cap chip + today count
- [x] Debounced search + result cards
- [x] Expired / ALREADY_TODAY / WEEKLY_LIMIT UX
- [x] Force confirm dialog
- [x] Today list polish + Show more
- [x] Owner visit rules chips + self check-in toggle
- [x] Gym QR sheet entry + visit rules link
- [x] BranchFilterBar + refresh + empty/error
- [x] Member QR scan dock button

### D. Gym QR
- [x] `src/components/GymQrSheet.tsx` — poster preview, PDF download, share link, test scan, regenerate
- [x] `CheckInVisitRulesSkeleton` while visit rules load/save

### E. Navigation
- [x] Check-in bottom tab (replaced Plans)
- [x] Plans under More
- [x] Dashboard `checkedInToday` deep link

### F. i18n
- [x] en / am / om (desk + Gym QR / self check-in keys)

### G. QA (manual)
- [ ] Active check-in
- [ ] Second same-day → card error
- [ ] Expired blocked
- [ ] Weekly limit
- [ ] Owner cap change
- [ ] Self check-in toggle + Gym QR sheet
- [ ] Light + dark
- [ ] Multi-branch
- [ ] Show more when today’s list exceeds page size
- [ ] Tab bar: Check in visible; Plans via More

## File map

| File | Action |
|------|--------|
| `docs/MOBILE_CHECKIN_PLAN.md` | This plan |
| `src/api/checkIns.ts` | Attendance settings + `station_self_checkin` |
| `src/api/branches.ts` | Station pass endpoints |
| `src/components/VisitRing.tsx` | Visit ring |
| `src/components/GymQrSheet.tsx` | Gym QR poster sheet |
| `src/components/Skeleton.tsx` | `CheckInVisitRulesSkeleton` |
| `app/(tabs)/check-in.tsx` | Tab screen |
| `app/plans.tsx` | Moved from tabs → stack (More) |
| `app/(tabs)/_layout.tsx` | Tab: check-in instead of plans |
| `app/(tabs)/more.tsx` | Plans entry |
| `src/api/client.ts` | `ApiError.details` |
| `src/i18n/locales/{en,am,om}.json` | Copy |
| `src/types/api.ts` | `checkedInToday?` |

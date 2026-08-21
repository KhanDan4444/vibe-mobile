# Mobile Desk Check-in — Implementation Plan

| | |
|---|---|
| **Status** | Implemented (desk search + tap) |
| **Date** | 21 August 2026 |
| **Scope** | `vibe-mobile` desk check-in (search + tap). QR later. |
| **Parity** | Mirror web Phase 2 premium UX on React Native |

## Goals

1. Front desk can search members and record today’s visit on phone/tablet.
2. Same rules as web/API (daily cap, weekly ring, expired blocked).
3. Premium polish: SoftSurface cards, visit ring + avatar badge, inline errors, today list.

## Out of scope (this sprint)

- Member QR / station QR scan
- Absence SMS

**Nav (updated):** Check-in is a bottom tab (daily desk use). Plans moved to More.

---

## Checklist

### A. API client
- [x] `src/api/checkIns.ts`
- [x] Types + branch_id
- [x] `ApiError.details` for force / eligibility

### B. Visit ring
- [x] `src/components/VisitRing.tsx` (amber / month-end red / dashed empty)

### C. Screen `app/check-in.tsx`
- [x] Hero + cap chip + today count
- [x] Debounced search + result cards
- [x] Expired / ALREADY_TODAY / WEEKLY_LIMIT UX
- [x] Force confirm dialog
- [x] Today list polish + Show more
- [x] Owner visit rules chips
- [x] BranchFilterBar + refresh + empty/error

### D. Navigation
- [x] Check-in bottom tab (replaced Plans)
- [x] Plans under More
- [x] Dashboard `checkedInToday` deep link

### E. i18n
- [x] en / am / om

### F. QA (manual)
- [ ] Active check-in
- [ ] Second same-day → card error
- [ ] Expired blocked
- [ ] Weekly limit
- [ ] Owner cap change
- [ ] Light + dark
- [ ] Multi-branch
- [ ] Show more when today’s list exceeds page size
- [ ] Tab bar: Check in visible; Plans via More

## File map

| File | Action |
|------|--------|
| `docs/MOBILE_CHECKIN_PLAN.md` | This plan |
| `src/api/checkIns.ts` | New |
| `src/components/VisitRing.tsx` | New |
| `app/(tabs)/check-in.tsx` | Tab screen |
| `app/plans.tsx` | Moved from tabs → stack (More) |
| `app/(tabs)/_layout.tsx` | Tab: check-in instead of plans |
| `app/(tabs)/more.tsx` | Plans entry |
| `src/api/client.ts` | `ApiError.details` |
| `src/i18n/locales/{en,am,om}.json` | Copy |
| `src/types/api.ts` | `checkedInToday?` |

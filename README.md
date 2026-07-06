# VibeSaaS Mobile

Expo (React Native) app for **gym owners and front-desk staff** — dashboard, members, enroll, renew, payments, and offline support.

## Prerequisites

- Node 20+
- Backend running (`cd ../vibe && npm start`)
- [Expo Go](https://expo.dev/go) on your phone (iOS or Android) for local dev
- [Expo account](https://expo.dev/signup) for EAS store builds

## Setup

```bash
cd vibe-mobile
npm install
cp .env.example .env
```

Edit `.env` — **use your machine's LAN IP**, not `localhost`, when testing on a physical device:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000
```

| Environment | API URL |
|-------------|---------|
| Physical phone (same Wi‑Fi) | `http://YOUR_LAN_IP:5000` |
| Android emulator | `http://10.0.2.2:5000` |
| iOS simulator (Mac) | `http://localhost:5000` |

## Run (development)

```bash
npm start
```

Scan the QR code with Expo Go.

## Test login

Use a **gym owner** or **help desk staff** account (not platform admin):

- `owner@gym.com` / `password` (if dev seeds are loaded)

## Offline support

- **Read offline:** Dashboard, member list, member detail, plans, and branches are cached locally (7 days).
- **Write offline:** Enroll, renew, payment, change plan, and transfer are queued and sync automatically when back online.
- A banner at the top shows offline status and pending sync count.

## EAS store builds

### One-time setup

```bash
npm install -g eas-cli   # or use npx eas-cli
eas login
eas init               # links project to your Expo account
```

Edit `eas.json` — set `EXPO_PUBLIC_API_URL` to your **production HTTPS API** in the `preview` and `production` profiles.

### Build

```bash
# Internal APK (Android testers)
npm run build:preview

# Store builds
npm run build:android
npm run build:ios
```

### Submit to stores

```bash
npm run submit:android
npm run submit:ios
```

Configure App Store Connect / Google Play credentials when prompted (`eas credentials`).

**Note:** `app.json` uses `com.vibesaas.mobile` as bundle ID / package name — change before publishing if needed.

## Feature checklist

- [x] Login + secure token storage
- [x] Dashboard (active / due soon / expired / unpaid)
- [x] Member list with search + infinite scroll
- [x] Member detail + payment history
- [x] Enroll new member (with optional skip payment)
- [x] Renew membership (expired / due soon)
- [x] Record payment (unpaid members)
- [x] Member photo on enroll + detail view
- [x] Branch picker on enroll (multi-branch gyms)
- [x] Change plan (active members)
- [x] Transfer member between branches (owner only)
- [x] Offline read cache + write queue
- [x] EAS build configuration
- [x] Member filters (due soon / expired / unpaid)
- [x] Dashboard tap-through to filtered lists
- [x] Revenue tab (this month’s payments)
- [x] Edit member name & phone
- [x] Plans tab (view for all; create/edit/delete for owner)
- [x] Activity log tab (owner only)
- [x] Delete member (owner)
- [x] Edit/delete payments on Revenue (owner)
- [x] More tab (profile menu, sign out)
- [x] Team management (owner)
- [x] Branches management (owner)
- [x] Member SMS log (owner)
- [x] Gym profile edit (owner)
- [x] Change password (all users)
- [x] Revenue period filters (today / week / month / etc.)
- [x] Branch filter for owners (dashboard, members, revenue, reports)
- [x] Dashboard alerts & revenue/member trends
- [x] Reports with CSV share (members, revenue, full)

## Project layout

```
app/              Expo Router screens
src/api/          API client
src/auth/         Auth context + SecureStore
src/offline/      Network status, mutation queue, sync
src/query/        TanStack Query client + persistence
src/config/       API base URL
eas.json          EAS Build profiles
```

## iOS & Android

Same codebase. Development uses Expo Go; production uses EAS Build (native modules like NetInfo and AsyncStorage are included automatically).

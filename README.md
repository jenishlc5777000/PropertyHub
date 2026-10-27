# PropertyHub

A real-estate platform for India: a **website**, an **Android + iOS app**, and one shared **REST API**. Buyers and tenants browse for free and reveal owner contacts with credits. Owners and agents list for free. Admins moderate listings and manage revenue.

Everything runs on free tiers. The only paid-per-use service is **Razorpay** (a fee per live transaction, no setup cost).

| Part | Stack | Free hosting |
|---|---|---|
| `backend/` | Node.js 20+, Express 4, MongoDB (Mongoose 8), JWT, Zod, Razorpay, PDFKit, Nodemailer | Render (or Railway) + MongoDB Atlas M0 |
| `web/` | React 18 + Vite 6, React Router 6, TanStack Query 5, Tailwind CSS 4, Leaflet/OSM | Vercel (or Netlify) |
| `mobile/` | Expo SDK 58 (React Native 0.88), React Navigation 7, react-native-razorpay, Leaflet/OSM in a WebView | Expo EAS (free tier) |
| `shared/` | Zod schemas, API client, INR/EMI/GST/masking helpers, translations (en, hi, ta, te, kn, ml) | — (imported by all three) |

---

## Contents

1. [Features](#features)
2. [Repository layout](#repository-layout)
3. [Local setup](#local-setup)
4. [Environment variables](#environment-variables)
5. [How the credit system works](#how-the-credit-system-works)
6. [Tests and quality checks](#tests-and-quality-checks)
7. [Free deployment, step by step](#free-deployment-step-by-step)
8. [Razorpay: test-to-live checklist](#razorpay-test-to-live-checklist)
9. [Building the Android APK and iOS app with EAS](#building-the-android-apk-and-ios-app-with-eas)
10. [Free-tier limits and known caveats](#free-tier-limits-and-known-caveats)

---

## Features

**Buyers and renters:** search by city, locality, price, bedrooms, type, purpose, furnishing and amenities. Sort, scroll infinitely, switch to a map view, or use "near me" (MongoDB 2dsphere). Property pages have a gallery, OSM map, EMI calculator, similar listings and share. Users can save favorites (synced across web and app), send inquiries in in-app threads, request visits with a date picker, and unlock owner contacts.

**Owners and agents:** post listings through a multi-step form with up to 10 photos and a map pin, then manage them (edit, mark sold or rented, relist, delete). A dashboard shows views, unlocks, leads, visits and favorites. Agents reply to leads and confirm visits, and have a public agent profile.

**Admins** (web, `/admin`):
- approve or reject listings (with a reason), feature listings
- manage users: change roles, disable accounts, grant or revoke credits
- edit plans and the free-credit count
- view orders and issue refunds through Razorpay; manage promo codes
- see a revenue dashboard (daily sales, unlocks per day, top properties) and a suspicious-activity log

**Notifications:** in-app plus Expo push for new inquiries and messages, visit updates, listing approved or rejected, price drops on favorites, credits expiring soon (daily cron, 7 days before expiry), and payment success or refund.

**SEO (web):** per-page titles and meta, Open Graph, canonical links, clean URLs (`/property/<slug>`), JSON-LD `RealEstateListing`, `robots.txt`, and a dynamic `sitemap.xml` served by the API.

### Contact credits (the business model)
- Phone, WhatsApp and email are masked **on the server** (`98XXXXXX10`, `pr***@domain`) unless the viewer has unlocked that property, owns it, or is an admin.
- New users get **7 free credits** (lifetime, configurable by admin). After that a paywall offers **100 credits for ₹999** (₹9.99 per contact, valid 12 months, GST-inclusive).
- One credit unlocks one property, forever. Re-opening it is free.
- Free credits are spent first, then the paid batch that expires soonest. Credits from repeat purchases stack.
- You can't unlock your own listing or one that isn't approved.
- The balance ("5 free + 40 paid credits left") is shown in the web header and on the app's home, profile and contact screens.

---

## Repository layout

```
/
├─ backend/                 Express API (MVC)
│  ├─ src/config/           env, db (Atlas or in-memory replica set), OpenAPI spec
│  ├─ src/models/           User, Property, Favorite, Inquiry, Visit, Notification,
│  │                        CreditWallet, ContactUnlock, Order, Plan, Setting, PromoCode, AuditLog…
│  ├─ src/services/         credit (atomic unlock), payment (Razorpay), invoice (PDF),
│  │                        email, push/notifications, upload (Cloudinary), property serializer (masking)
│  ├─ src/controllers/ routes/ middleware/ utils/ jobs/ seed/
│  └─ tests/                node:test + supertest (credits, payments, search)
├─ web/                     React + Vite SPA (pages/, components/, hooks/, lib/)
├─ mobile/                  Expo app (App.js navigator, src/screens, src/components)
├─ shared/                  code used by all three (schemas, API client, i18n, utils)
├─ render.yaml              Render blueprint for the API
└─ README.md
```

The root is an npm workspace (`shared`, `backend`, `web`). `mobile/` has its own `package.json` and lockfile, because Expo pins exact React and React Native versions. It imports `../shared` through `metro.config.js`.

---

## Local setup

### Prerequisites
- **Node.js 20 or newer** and npm 10 or newer, plus Git
- For the mobile app: an Android phone or emulator, or an iPhone (iOS builds need macOS or EAS)
- Optional: a free [Expo account](https://expo.dev/signup) for push notifications and EAS builds

### 1. Install
```bash
git clone <your-repo-url> propertyhub && cd propertyhub
npm install                 # installs shared + backend + web
cp backend/.env.example backend/.env
cp web/.env.example web/.env
```

### 2. Run the API (zero-config mode)
`backend/.env` ships with `MONGODB_URI=memory`. On start, the API launches an **in-memory MongoDB replica set** (transactions need a replica set) and **seeds it automatically**. The data resets on every restart.

```bash
npm run dev:api             # http://localhost:5000  ·  docs: http://localhost:5000/api/docs
```

> The first run downloads a MongoDB binary (about 600 MB). On a slow or flaky connection, download the zip for your OS from https://www.mongodb.com/try/download/community yourself. Then point `MONGOMS_SYSTEM_BINARY` in `backend/.env` at the extracted `mongod` (`mongod.exe` on Windows).

To keep data between restarts, set `MONGODB_URI` to a local MongoDB replica set or a free Atlas cluster (see [deployment](#1-database-mongodb-atlas-m0)), then run `npm run seed`. Add `-- --reset` to wipe the data first.

**Seeded accounts:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@propertyhub.in` | `Admin@12345` (set via `SEED_ADMIN_*`) |
| Agent | `priya@propertyhub.in`, `arjun@propertyhub.in`, `rohit@propertyhub.in` | `Agent@12345` |
| Buyer | `buyer@propertyhub.in` | `Buyer@12345` |

The seed also creates 30 properties across Mumbai, Bengaluru, Delhi, Gurugram, Pune, Hyderabad and Chennai (2 are pending review), the ₹999 / 100-credit plan, and a `WELCOME10` promo code.

**Without Razorpay keys**, the API runs payments in **mock mode** (development only, impossible in production). The web app shows a "simulate success or failure" dialog and the mobile app shows an alert. The full order → verify → credit → invoice flow still runs. With **no SMTP settings**, emails (OTP codes, invoices) are printed to the API console. With **no Cloudinary settings**, uploads go to `backend/uploads/`.

### 3. Run the website
```bash
npm run dev:web             # http://localhost:5173
```

### 4. Run the mobile app
```bash
cd mobile
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL (see below)
```
`EXPO_PUBLIC_API_URL` must be reachable **from the phone**:
- Android emulator: `http://10.0.2.2:5000/api/v1`
- Physical phone on the same Wi-Fi: `http://<your-PC-LAN-IP>:5000/api/v1`
- Or your deployed Render URL

**Option A: development build (recommended; needed for Razorpay and push notifications)**
```bash
npx eas-cli@latest login
npx eas-cli@latest init                 # creates the EAS project and writes projectId into app.json
npm run build:dev                       # eas build --profile development (pick android and/or ios)
# install the build on your device, then:
npm start                               # expo start --dev-client
```
To build locally instead, run `npx expo run:android`. It needs Android Studio and the JDK.

**Option B: Expo Go (quick UI preview only)**
```bash
npm run start:go
```
In Expo Go everything works except the native Razorpay checkout and remote push. Payments still work in mock mode (when the API has no Razorpay keys). With real keys, the app tells you to use the dev build.

---

## Environment variables

### `backend/.env`
Every variable is documented in [`backend/.env.example`](backend/.env.example). The important ones:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | API port (Render sets this automatically) |
| `API_URL`, `WEB_URL` | Public URLs (used in emails, sitemap, reset links) |
| `CORS_ORIGINS` | Comma-separated web origins allowed to call the API |
| `MONGODB_URI` | Atlas connection string, or `memory` for local dev |
| `MONGOMS_SYSTEM_BINARY` | Optional, dev only: path to a local `mongod` for memory mode |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Long random strings. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_DAYS` | Token lifetimes (default 15 minutes / 30 days) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image hosting (required in production) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Brevo or Gmail SMTP |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay API keys (`rzp_test_…` first, then `rzp_live_…`) |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you set on the Razorpay webhook |
| `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_GSTIN` | Printed on GST invoices |
| `DEFAULT_FREE_CREDITS` | Free credits for new users until an admin changes it (default 7) |
| `UNLOCK_RATE_PER_HOUR`, `UNLOCK_SUSPICIOUS_PER_DAY` | Anti-scraping limits (default 20 per hour; flag at 30 per day) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Admin created by `npm run seed` |

### `web/.env`
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base including `/api/v1` |
| `VITE_SITE_URL` | Public site URL (canonical and share links) |

### `mobile/.env` (or `env` per profile in `mobile/eas.json`)
| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base including `/api/v1` |
| `EXPO_PUBLIC_SITE_URL` | Website URL used in share links and legal pages |

> Values prefixed `VITE_` or `EXPO_PUBLIC_` are compiled into the client bundles. Never put secrets in them.

---

## How the credit system works

**Masking happens only on the server.** Every property response goes through `serializeProperty()` in `backend/src/services/property.service.js`. It returns real contact details only when the viewer has a `ContactUnlock` record, owns the listing, or is an admin. A test checks that a raw seeded phone number never appears in an anonymous response.

**Unlocking is atomic and race-safe** (`credit.service.js#unlockContact`). Each unlock runs one MongoDB transaction:
1. `findOneAndUpdate({ user, freeCredits: { $gt: 0 } }, { $inc: { freeCredits: -1 } })`. A conditional decrement can't go below 0.
2. Otherwise, decrement the paid batch that expires soonest and is still valid, using an `$elemMatch` condition on `amount > 0` and `expiresAt > now`.
3. Insert the `ContactUnlock` record. A **unique index on `(user, property)`** means that when a double-tap or parallel request races, the losing transaction aborts and rolls back. That request still returns the contact, at no charge.

The tests fire 8 parallel unlocks for one property (charged once) and 7 parallel unlocks with only 3 credits (exactly 3 succeed, 4 get HTTP 402, balance 0).

**Anti-scraping:** a per-user limit of 20 unlocks per hour, plus an `AuditLog` warning at 30 unlocks per day (critical at 60). Admins see these under *Security*.

**Payments** (`payment.service.js`):
- `create-order` reads the price from the `Plan` in the database (plus any promo code) and never trusts the client.
- `verify` checks the HMAC `order_id|payment_id` signature with `crypto.timingSafeEqual`.
- The `webhook` handles `payment.captured` / `order.paid` and `payment.failed`. It verifies `X-Razorpay-Signature` against the **raw** request body and checks the paid amount.
- Both `verify` and the webhook call `fulfillOrder()`. It flips the order `created|failed → paid` inside a transaction with a conditional update, and `paymentId` has a unique index. So the same payment can never add credits twice, whether from retries, a double submit, or verify and webhook racing.
- Invoices are numbered gap-free per financial year (`PH/2026-27/000001`). The PDF shows the GST breakdown (₹999 = ₹846.61 + ₹152.39 GST at 18%) and is emailed to the buyer.
- Refunds (admin) call the Razorpay refund API and remove any unused credits from that order.

---

## Tests and quality checks

```bash
npm test            # backend: credits, race conditions, payments, webhook idempotency, search (9 tests)
npm run lint        # ESLint across shared, backend, web, mobile
npm run build:web   # production build of the website
cd mobile && npx expo-doctor && npx expo export --platform android   # mobile sanity checks
npm run format      # Prettier
```

---

## Free deployment, step by step

Deploy in this order. Each step gives you a value the next one needs.

### 1. Database: MongoDB Atlas M0
1. Sign up at https://www.mongodb.com/cloud/atlas and create a **free M0** cluster. Choose the AWS Mumbai (`ap-south-1`) region.
2. *Database Access* → add a user with a strong password.
3. *Network Access* → add `0.0.0.0/0`, because Render's free tier has no static IP. The database user's password is the access control.
4. *Connect → Drivers* → copy the URI and add a database name: `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/propertyhub?retryWrites=true&w=majority`
5. Seed it once from your machine: set `MONGODB_URI` in `backend/.env`, then run `npm run seed`. M0 clusters are replica sets, so transactions work.

### 2. Images: Cloudinary (free tier)
Sign up at https://cloudinary.com. The dashboard shows the **Cloud name, API key and API secret**. Images are stored under `propertyhub/…` and resized to at most 1600 px.

### 3. Email: Brevo (300 emails/day free) or Gmail
- **Brevo:** https://www.brevo.com → *SMTP & API* → create an SMTP key. Use `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=<your Brevo login>`, `SMTP_PASS=<SMTP key>`. Verify your sender address or domain.
- **Gmail:** turn on 2-step verification, create an *App password*, then use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`.

### 4. API: Render (free web service)
1. Push this repo to GitHub.
2. In Render: **New → Blueprint** → choose the repo. It reads `render.yaml` (build: `npm ci --workspace backend --omit=dev`; start: `node backend/src/server.js`; health check: `/api/v1/health`).
3. Fill in the secret env vars (Atlas URI, Cloudinary, SMTP, Razorpay) and set:
   - `API_URL=https://<service>.onrender.com`
   - `WEB_URL=https://<your-site>.vercel.app`
   - `CORS_ORIGINS=https://<your-site>.vercel.app` (add your custom domain later)
4. Deploy, then open `https://<service>.onrender.com/api/docs`.

*Railway alternative:* create a new project from the repo with root `/`, the same build and start commands, and the same variables.

> **Render free instances sleep after 15 minutes idle.** The first request after that takes about 30–50 seconds. A free uptime pinger (for example UptimeRobot, every 10 minutes, hitting `/api/v1/health`) keeps it awake. Render's disk is ephemeral, which is why Cloudinary is required in production.

### 5. Website: Vercel (or Netlify)
1. On Vercel: **Add New → Project** → import the repo → set **Root Directory** to `web`. The framework is auto-detected as Vite.
2. Environment variables: `VITE_API_URL=https://<service>.onrender.com/api/v1`, `VITE_SITE_URL=https://<your-site>.vercel.app`.
3. In `web/vercel.json`, replace `propertyhub-api.onrender.com` with your API host so `/sitemap.xml` is proxied. The same file adds the SPA fallback.
4. Deploy. Submit `https://<your-site>/sitemap.xml` in Google Search Console.

*Netlify:* use base directory `web`, build command `npm run build`, publish directory `web/dist`. `web/public/_redirects` handles the SPA fallback and sitemap; edit the API host there too.

### 6. Razorpay webhook
In the Razorpay dashboard (test mode first): **Settings → Webhooks → Add**.
- URL: `https://<service>.onrender.com/api/v1/payments/webhook`
- Secret: any long random string. Put the same value in `RAZORPAY_WEBHOOK_SECRET` on Render.
- Events: `payment.captured`, `payment.failed`, `order.paid`

### 7. Mobile: Expo EAS (free tier)
See [Building the Android APK and iOS app](#building-the-android-apk-and-ios-app-with-eas). Set `EXPO_PUBLIC_API_URL` to your Render URL in `mobile/eas.json` (the `preview` and `production` profiles).

### 8. Push notifications
- Run `npx eas-cli init` in `mobile/` so `app.json` contains `extra.eas.projectId`. Push tokens can't be issued without it.
- **Android:** EAS asks for FCM credentials. Create a free Firebase project → add an Android app with package `in.propertyhub.app` → *Project settings → Service accounts → Generate new private key* → upload it with `npx eas-cli credentials` → Android → *Google Service Account Key for FCM V1*.
- **iOS:** EAS creates the APNs key automatically during `eas build` (needs a paid Apple Developer account).
- The API sends pushes through Expo's free push service. No server key is needed.

---

## Razorpay: test-to-live checklist

1. ☐ Complete **KYC / account activation** in the Razorpay dashboard (business PAN, bank account, GSTIN if registered, website with these pages live).
2. ☐ The website shows **Privacy Policy, Terms, Refund Policy, Contact and About** (they're at `/privacy`, `/terms`, `/refund-policy`, `/contact`, `/about`). Razorpay reviews them during activation. Edit `web/src/pages/Static.jsx` with your real company details first.
3. ☐ Put your real `COMPANY_NAME`, `COMPANY_ADDRESS` and `COMPANY_GSTIN` on Render (they appear on invoices). Check GST treatment with your CA. Invoices currently show a single "GST @ 18%" line; split it into CGST + SGST for intra-state sales if required.
4. ☐ Test the whole flow in **test mode** with `rzp_test_…` keys:
   - successful payment with UPI `success@razorpay` and card `4111 1111 1111 1111`
   - failed payment with UPI `failure@razorpay`
   - closing the checkout (cancelled)
   - kill the app or tab right after paying: the webhook should still credit the wallet (check *Admin → Orders*)
   - an admin refund
5. ☐ Generate **live keys** (*Settings → API Keys* in live mode) and set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` on Render. The web and mobile apps receive the key ID from `create-order`, so nothing needs rebuilding.
6. ☐ Create a **live-mode webhook** (step 6 above) with a new secret and update `RAZORPAY_WEBHOOK_SECRET`.
7. ☐ Confirm `NODE_ENV=production`. Mock payments are then impossible, and the API refuses to start without JWT secrets and a real `MONGODB_URI`.
8. ☐ Make a ₹1 real purchase: create a temporary ₹1 plan in *Admin → Plans & settings*, buy it, refund it from *Admin → Orders*, then deactivate the plan.
9. ☐ Mobile: ship a **production EAS build** (react-native-razorpay is a native module), then test a live payment on Android and iOS.
10. ☐ Turn on payment-failure email alerts in the Razorpay dashboard, and check *Admin → Security* for `payment_amount_mismatch` or `duplicate_payment_id` entries.

---

## Building the Android APK and iOS app with EAS

```bash
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # first time only: links the project and writes projectId
```

**Android APK** (installable file you can share; free):
```bash
npm run build:apk                # = eas build -p android --profile preview
```
EAS prints a link to download the `.apk` when the build finishes. On first build, let EAS generate and store the Android keystore. Back it up with `npx eas-cli credentials`.

**Play Store build (AAB):**
```bash
npm run build:prod -- -p android            # = eas build --profile production -p android
npx eas-cli submit -p android               # needs a Google Play Console account (one-time US$25)
```

**iOS** (needs an **Apple Developer Program** membership, US$99/year):
```bash
npm run build:prod -- -p ios                # EAS creates certificates and provisioning profiles for you
npx eas-cli submit -p ios                   # uploads to App Store Connect / TestFlight
```
For an iOS development build on your own device: `npm run build:dev -- -p ios`, then register the device when prompted.

**Over-the-air JS updates** (no store review for JS-only changes): `npx eas-cli update --branch production`.

Build profiles live in `mobile/eas.json`:
- `development`: dev client, internal distribution
- `preview`: Android APK, internal distribution
- `production`: store builds with auto-incremented version codes

Each profile sets `EXPO_PUBLIC_API_URL`.

---

## Free-tier limits and known caveats

- **Render free:** sleeps when idle (cold start about 30–50 s) and has 750 instance-hours/month. The daily credit-expiry cron runs only while the instance is awake. For guaranteed runs, call it from a free external cron or upgrade.
- **Atlas M0:** 512 MB storage, shared CPU. Fine for thousands of listings.
- **Cloudinary free:** about 25 monthly credits (storage + bandwidth + transformations).
- **Brevo free:** 300 emails/day.
- **OpenStreetMap tiles:** `tile.openstreetmap.org` is a community service with a [usage policy](https://operations.osmfoundation.org/policies/tiles/) that forbids heavy commercial use. For production traffic, switch the tile URL to a free-tier provider (MapTiler, Stadia Maps or Thunderforest, about 100k tiles/month free) in `web/src/components/MapView.jsx`, `web/src/components/LocationPicker.jsx` and `mobile/src/components/OsmMap.js`. Address search uses Nominatim (1 request/second limit). It only runs when an owner taps "Find address on map".
- **Translations:** Hindi, Tamil, Telugu, Kannada and Malayalam strings in `shared/src/i18n/` were machine-drafted. Have a native speaker review them before launch. Listing content (titles and descriptions) is shown as the owner typed it.
- **Mobile maps** use Leaflet inside a WebView, so there is no Google Maps SDK or API key on either platform.
- **Web tokens:** the website keeps the refresh token in `localStorage` so web and mobile share one auth flow. Refresh tokens rotate on every use, and reusing one revokes all sessions. To harden further, move the refresh token to an `httpOnly` cookie.
- **Security notes:**
  - passwords hashed with bcrypt (cost 12)
  - Helmet, CORS allow-list, `express-mongo-sanitize`
  - rate limits: general API, auth, unlock and payments
  - Zod validation on every input, on both client and server
  - OTPs hashed with a 10-minute expiry and 5 attempts
  - no secrets in code (see `.env.example`)
  - run `npm audit` regularly and keep dependencies updated

API reference: `http://localhost:5000/api/docs` (Swagger UI) or `/api/docs.json` (OpenAPI 3).

# ST² — Stop Talking, Start Trying

Personal life-tracking PWA for fitness, study, and notes. Built for Android (Chrome) with full offline support.

---

## Quick Setup

### 1. Deploy to GitHub Pages

1. Push this repository to GitHub (or it's already there)
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` (or your default branch), folder: `/ (root)`
5. Click **Save**
6. Your app will be live at: `https://yourusername.github.io/stoptalking_starttrying/`

> Note: It may take 1–2 minutes for the first deploy to go live.

---

### 2. Add Your Icon

Place your `icon.png` file in the **root** of the repository (same folder as `index.html`).

The app references `icon.png` for:
- The PWA manifest (home screen icon)
- The browser tab favicon
- iOS Add to Home Screen icon

For best results, use a square PNG at **512×512 pixels or larger**.

---

### 3. Set Up Strava Integration (Optional)

Strava lets you automatically import your GPS runs.

#### Step A — Create a Strava API Application

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Click **Create & Manage Your App**
3. Fill in the form:
   - **Application Name:** ST² (or any name)
   - **Category:** Other
   - **Website:** `https://yourusername.github.io/stoptalking_starttrying`
   - **Authorization Callback Domain:** `yourusername.github.io`
   - **Description:** personal tracker
4. Click **Create**
5. You'll now see your **Client ID** and **Client Secret** on the API settings page

#### Step B — Add Credentials to config.js

Open `config.js` and fill in your credentials:

```js
const STRAVA_CONFIG = {
  CLIENT_ID: '12345',           // ← your Client ID (number, as string)
  CLIENT_SECRET: 'abc123...',   // ← your Client Secret
  // ... rest stays the same
};
```

#### Step C — Set the OAuth Redirect URI

Back on the Strava API settings page, ensure the **Authorization Callback Domain** matches your GitHub Pages domain:

```
yourusername.github.io
```

The app automatically uses its own URL as the redirect URI — no extra config needed.

#### Step D — Connect in the App

1. Open the app on your phone
2. Go to **Fitness** tab → tap **+** → **Log Run**
3. Switch to the **Import from Strava** tab
4. Tap **Connect Strava** — you'll be redirected to Strava's authorisation page
5. After authorising, you'll return to the app connected
6. You can also manage the connection in **Settings → Strava**

> **Security note:** `config.js` contains your client secret. For a personal app this is fine, but consider adding `config.js` to `.gitignore` if you make the repo public. Use `config.example.js` as a template.

---

### 4. Install on Android (Add to Home Screen)

1. Open the app URL in **Chrome** on Android
2. Tap the **⋮ menu** (top right) → **Add to Home screen**
3. Tap **Add**
4. The app will appear on your home screen with the ST² icon

Once installed it works **offline** and feels like a native app.

---

### 5. Install on iPhone / iPad

1. Open the app URL in **Safari**
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**

> Note: For best experience use Android + Chrome — some features (voice recording, background timer) work better on Android.

---

## Features

| Tab | What it does |
|-----|-------------|
| **Dashboard** | Morning greeting, weight trend, streak, this-week stats, today's timeline |
| **Fitness** | Workout cards with exercises + 1RM, run cards with map (if GPS), Strava import, manual logging |
| **Study** | Live timer, progress bars for WGU term + degree, calendar heatmap, class management, session history |
| **Notes** | Full-text search, pin, photos, voice transcription, drawing canvas, tags |
| **Settings** | 4 themes, profile/term config, Strava, data export/import |

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript — no frameworks
- **IndexedDB** (via idb library) — all local data persistence
- **Chart.js** — sparklines and bar charts
- **Leaflet.js** — GPS route maps (Strava imports)
- **Web Speech API** — voice notes
- **PWA** — service worker, manifest, offline-first
- **Strava API** — OAuth 2.0 run import

---

## Data & Privacy

All data is stored **locally on your device** in IndexedDB. Nothing is sent to any server except:
- Strava API calls when you import runs (only if you connect Strava)
- Google Fonts (loaded on first visit)

Use **Settings → Data → Export** to back up your data as a JSON file.

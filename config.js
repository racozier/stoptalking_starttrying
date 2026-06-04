/**
 * ST² — Strava API Configuration
 *
 * HOW TO CREATE A STRAVA API APPLICATION:
 * ─────────────────────────────────────────
 * 1. Go to https://www.strava.com/settings/api
 * 2. Click "Create & Manage Your App"
 * 3. Fill in:
 *    - Application Name: ST² (or any name)
 *    - Category: Other
 *    - Club: leave blank
 *    - Website: your GitHub Pages URL (e.g. https://yourusername.github.io/stoptalking_starttrying)
 *    - Authorization Callback Domain: yourusername.github.io
 *    - Description: personal tracker
 * 4. After creating, you will see your Client ID and Client Secret on the API settings page.
 *    Paste them below.
 *
 * REDIRECT URI:
 * ─────────────
 * Your redirect URI must be: https://yourusername.github.io/stoptalking_starttrying/
 * (the root of your GitHub Pages deployment — same as the app URL)
 * The app automatically detects its own URL for the OAuth redirect.
 *
 * SECURITY NOTE:
 * ─────────────
 * The client_secret is visible in this file. For a personal app this is acceptable,
 * but do not share this file or make the repo public with real credentials.
 * If you make the repo public, add config.js to .gitignore and use a template file.
 */

const STRAVA_CONFIG = {
  CLIENT_ID: '',       // e.g. '12345'
  CLIENT_SECRET: '',   // e.g. 'abc123def456...'
  SCOPE: 'read,activity:read_all',
  AUTH_URL: 'https://www.strava.com/oauth/authorize',
  TOKEN_URL: 'https://www.strava.com/oauth/token',
  API_BASE: 'https://www.strava.com/api/v3',
};

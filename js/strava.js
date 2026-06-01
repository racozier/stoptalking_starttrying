window.Strava = {
  get isConfigured() {
    return STRAVA_CONFIG.CLIENT_ID && STRAVA_CONFIG.CLIENT_SECRET;
  },

  getRedirectUri() {
    const { origin, pathname } = window.location;
    const base = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return `${origin}${base}`;
  },

  async startOAuth() {
    if (!this.isConfigured) {
      App.showToast('Add your Strava credentials to config.js first.', 'error');
      return;
    }
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem('strava_oauth_state', state);

    const params = new URLSearchParams({
      client_id: STRAVA_CONFIG.CLIENT_ID,
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      approval_prompt: 'auto',
      scope: STRAVA_CONFIG.SCOPE,
      state,
    });
    window.location.href = `${STRAVA_CONFIG.AUTH_URL}?${params}`;
  },

  async handleCallback(code, state) {
    const savedState = sessionStorage.getItem('strava_oauth_state');
    sessionStorage.removeItem('strava_oauth_state');
    if (state !== savedState) {
      App.showToast('OAuth state mismatch. Try connecting again.', 'error');
      return false;
    }
    try {
      const res = await fetch(STRAVA_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CONFIG.CLIENT_ID,
          client_secret: STRAVA_CONFIG.CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      });
      if (!res.ok) throw new Error('Token exchange failed');
      const data = await res.json();
      await window.db.strava.setTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        athleteId: data.athlete?.id,
        athleteName: `${data.athlete?.firstname} ${data.athlete?.lastname}`,
        lastSync: null,
      });
      App.showToast('Strava connected!', 'success');
      return true;
    } catch (e) {
      App.showToast('Failed to connect Strava: ' + e.message, 'error');
      return false;
    }
  },

  async getValidToken() {
    const tokens = await window.db.strava.getTokens();
    if (!tokens) return null;
    const now = Math.floor(Date.now() / 1000);
    if (tokens.expiresAt > now + 60) return tokens.accessToken;
    // Refresh
    try {
      const res = await fetch(STRAVA_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CONFIG.CLIENT_ID,
          client_secret: STRAVA_CONFIG.CLIENT_SECRET,
          refresh_token: tokens.refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      const updated = { ...tokens, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_at };
      await window.db.strava.setTokens(updated);
      return data.access_token;
    } catch {
      await window.db.strava.clearTokens();
      return null;
    }
  },

  async fetchActivities(page = 1, perPage = 30) {
    const token = await this.getValidToken();
    if (!token) return [];
    const url = `${STRAVA_CONFIG.API_BASE}/athlete/activities?page=${page}&per_page=${perPage}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to fetch activities');
    return res.json();
  },

  async fetchActivityStreams(activityId) {
    const token = await this.getValidToken();
    if (!token) return null;
    const url = `${STRAVA_CONFIG.API_BASE}/activities/${activityId}/streams?keys=latlng,time,velocity_smooth&key_by_type=true`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return res.json();
  },

  async importActivities(stravaActivities) {
    let imported = 0;
    for (const act of stravaActivities) {
      if (act.type !== 'Run') continue;
      const existing = await window.db.runs.getByStravaId(String(act.id));
      if (existing) continue;

      let polyline = null;
      try {
        const streams = await this.fetchActivityStreams(act.id);
        if (streams?.latlng?.data) {
          polyline = streams.latlng.data;
        }
      } catch {}

      const totalSecs = act.elapsed_time;
      const dist = act.distance / 1000;
      const paceSecsPerKm = dist > 0 ? totalSecs / dist : 0;
      const paceMin = Math.floor(paceSecsPerKm / 60);
      const paceSec = Math.round(paceSecsPerKm % 60);

      await window.db.runs.add({
        date: act.start_date_local,
        name: act.name,
        distance: Math.round(dist * 100) / 100,
        durationSeconds: totalSecs,
        paceSecsPerKm,
        paceFormatted: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
        calories: act.calories || null,
        elevation: Math.round(act.total_elevation_gain),
        avgHR: act.average_heartrate || null,
        polyline,
        source: 'strava',
        stravaId: String(act.id),
        weather: null,
        temp: null,
        notes: act.description || '',
      });
      imported++;
    }
    const tokens = await window.db.strava.getTokens();
    if (tokens) await window.db.strava.setTokens({ ...tokens, lastSync: new Date().toISOString() });
    return imported;
  },

  async disconnect() {
    await window.db.strava.clearTokens();
    App.showToast('Strava disconnected.', 'success');
  },
};

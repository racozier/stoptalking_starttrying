window.Charts = {
  _colors() {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      tick:  light ? 'rgba(0,0,0,0.55)'  : 'rgba(255,255,255,0.45)',
      tick2: light ? 'rgba(0,0,0,0.45)'  : 'rgba(255,255,255,0.35)',
      grid:  light ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.06)',
    };
  },

  // Sparkline for the weight card — month labels on X, one value on Y
  createWeightSparkline(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();
    const { tick, tick2, grid } = this._colors();
    const sorted = [...data].reverse();
    const vals = sorted.map((d) => d.value);
    // Only label the oldest and newest entry in the data
    const fmt = (dateStr) => {
      const dt = new Date(dateStr);
      return `${dt.getDate()} ${dt.toLocaleDateString('en-GB', { month: 'short' })}`;
    };
    const firstDate = sorted[0]?.date.slice(0, 10);
    const lastDate = sorted[sorted.length - 1]?.date.slice(0, 10);
    const labels = sorted.map((d, i) => {
      if (i === 0) return fmt(firstDate);
      if (i === sorted.length - 1) return fmt(lastDate);
      return '';
    });
    canvas._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: vals,
          borderColor: 'rgba(37, 99, 235, 0.9)',
          borderWidth: 2,
          pointRadius: vals.map((_, i) => (i === vals.length - 1 ? 3 : 0)),
          pointBackgroundColor: 'rgba(37, 99, 235, 1)',
          tension: 0.5,
          fill: true,
          backgroundColor: (ctx2) => {
            const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, ctx2.chart.height);
            g.addColorStop(0, 'rgba(37, 99, 235, 0.16)');
            g.addColorStop(1, 'rgba(37, 99, 235, 0.0)');
            return g;
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        layout: { padding: { right: 4, top: 2, bottom: 0, left: 6 } },
        scales: {
          x: {
            display: true,
            grid: { display: false, drawTicks: false },
            ticks: { color: tick2, font: { size: 9 }, maxRotation: 0, padding: 2, autoSkip: false },
            border: { display: false },
          },
          y: {
            display: true,
            position: 'left',
            grid: { color: grid, drawTicks: false },
            ticks: { color: tick, font: { size: 10, weight: '500' }, maxTicksLimit: 4, padding: 4 },
            border: { display: false },
          },
        },
      },
    });
  },

  // 7-bar study chart for dashboard "This Week" card
  createWeekStudyBars(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();
    const { tick2 } = this._colors();
    canvas._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        datasets: [{
          data,
          backgroundColor: data.map((v) =>
            v > 0 ? 'rgba(37, 99, 235, 0.85)' : 'rgba(37, 99, 235, 0.15)'
          ),
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: true, grid: { display: false }, ticks: { color: tick2, font: { size: 9 } }, border: { display: false } },
          y: { display: false },
        },
      },
    });
  },

  // 7-bar workout chart (fitness tab "This Week")
  createWeekWorkoutBars(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();
    const { tick2 } = this._colors();
    canvas._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        datasets: [{
          data,
          backgroundColor: data.map((v) =>
            v > 0 ? 'rgba(34, 197, 94, 0.85)' : 'rgba(34, 197, 94, 0.15)'
          ),
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: true, grid: { display: false }, ticks: { color: tick2, font: { size: 9 } }, border: { display: false } },
          y: { display: false },
        },
      },
    });
  },

  // Weight chart for full weight history view
  createWeightHistory(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();
    const { tick, grid } = this._colors();
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    canvas._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map((d) => {
          const dt = new Date(d.date);
          return dt.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          data: sorted.map((d) => d.value),
          borderColor: 'rgba(37, 99, 235, 0.9)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
          backgroundColor: (ctx2) => {
            const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, ctx2.chart.height);
            g.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
            g.addColorStop(1, 'rgba(37, 99, 235, 0.0)');
            return g;
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            display: true,
            grid: { color: grid, drawBorder: false },
            ticks: { color: tick, font: { size: 10 }, maxTicksLimit: 6 },
            border: { display: false },
          },
          y: {
            display: true,
            grid: { color: grid, drawBorder: false },
            ticks: { color: tick, font: { size: 10 } },
            border: { display: false },
          },
        },
      },
    });
  },

  // Study hours full week bar chart (Study Overview)
  createStudyWeekBars(canvasId, labels, data, dailyGoalHours = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();
    const { tick, tick2, grid } = this._colors();
    canvas._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((v) => {
            if (v <= 0) return 'rgba(37, 99, 235, 0.15)';
            if (dailyGoalHours !== null && v >= dailyGoalHours) return 'rgba(234, 179, 8, 0.85)';
            return 'rgba(37, 99, 235, 0.7)';
          }),
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tick2, font: { size: 10 } },
            border: { display: false },
          },
          y: {
            grid: { color: grid, drawBorder: false },
            ticks: { color: tick, font: { size: 10 }, callback: (v) => v + 'h' },
            border: { display: false },
          },
        },
      },
    });
  },

  // Tiny 60×28px bar chart using raw Canvas2D (no Chart.js overhead)
  createMiniBarChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 60, H = 28;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(...data, 1);
    const barW = Math.floor((W - (data.length - 1) * 2) / data.length);
    data.forEach((v, i) => {
      const barH = Math.max(2, Math.round((v / max) * (H - 2)));
      const x = i * (barW + 2);
      const y = H - barH;
      ctx.fillStyle = v > 0 ? color : color + '33';
      ctx.beginPath();
      const r = 2;
      ctx.roundRect(x, y, barW, barH, r);
      ctx.fill();
    });
  },

  destroyAll() {
    ['weight-sparkline', 'week-study-chart', 'week-workout-chart', 'study-week-chart'].forEach((id) => {
      const canvas = document.getElementById(id);
      if (canvas && canvas._chart) { canvas._chart.destroy(); canvas._chart = null; }
    });
  },
};

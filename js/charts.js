window.Charts = {
  // Tiny sparkline for the weight card
  createWeightSparkline(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();
    const vals = [...data].reverse().map((d) => d.value);
    canvas._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: vals.map((_, i) => i),
        datasets: [{
          data: vals,
          borderColor: 'rgba(124, 58, 237, 0.9)',
          borderWidth: 2,
          pointRadius: vals.map((_, i) => (i === vals.length - 1 ? 4 : 0)),
          pointBackgroundColor: 'rgba(124, 58, 237, 1)',
          tension: 0.4,
          fill: true,
          backgroundColor: (ctx2) => {
            const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, ctx2.chart.height);
            g.addColorStop(0, 'rgba(124, 58, 237, 0.25)');
            g.addColorStop(1, 'rgba(124, 58, 237, 0.0)');
            return g;
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 9 }, maxTicksLimit: 3 },
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
    canvas._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        datasets: [{
          data,
          backgroundColor: data.map((v) =>
            v > 0 ? 'rgba(124, 58, 237, 0.85)' : 'rgba(124, 58, 237, 0.15)'
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
          x: { display: true, grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } }, border: { display: false } },
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
          x: { display: true, grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } }, border: { display: false } },
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
          borderColor: 'rgba(124, 58, 237, 0.9)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
          backgroundColor: (ctx2) => {
            const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, ctx2.chart.height);
            g.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
            g.addColorStop(1, 'rgba(124, 58, 237, 0.0)');
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
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 }, maxTicksLimit: 6 },
            border: { display: false },
          },
          y: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
            border: { display: false },
          },
        },
      },
    });
  },

  // Study hours full week bar chart (Study Overview)
  createStudyWeekBars(canvasId, labels, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
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
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: {
              color: 'rgba(255,255,255,0.4)',
              font: { size: 10 },
              callback: (v) => v + 'h',
            },
            border: { display: false },
          },
        },
      },
    });
  },

  destroyAll() {
    ['weight-sparkline', 'week-study-chart', 'week-workout-chart', 'study-week-chart'].forEach((id) => {
      const canvas = document.getElementById(id);
      if (canvas && canvas._chart) { canvas._chart.destroy(); canvas._chart = null; }
    });
  },
};

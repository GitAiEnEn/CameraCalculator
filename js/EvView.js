/**
 * EvView.js
 * Environment (EV) capability view.
 *   Renders an EV -4..16 gradient bar with typical scene labels, marks
 *   where the camera (safe shutter + safe ISO at the current aperture) can
 *   shoot, and one colored marker per custom exposure combo.
 * init(store) registers the view; render() reads from store and draws.
 */
class EvView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = null;
    this.EV_LO = -4;
    this.EV_HI = 16;
    // Marker colors for custom exposure combos (cycled)
    this.palette = ['#22d3ee', '#f472b6', '#facc15', '#a78bfa',
      '#fb923c', '#4ade80', '#38bdf8', '#e879f9'];
  }

  init(store) {
    this.store = store;
  }

  colorAt(i) {
    return this.palette[i % this.palette.length];
  }

  clampEv(v) {
    return Math.min(this.EV_HI, Math.max(this.EV_LO, v));
  }

  render() {
    if (!this.store) return;
    const s = this.store.state;
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const padL = 56, padR = 20;
    const barY = 150, barH = 40;
    const span = W - padL - padR;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const x = (ev) => padL + ((ev - this.EV_LO) / (this.EV_HI - this.EV_LO)) * span;

    // --- Gradient bar (night -> day) ---
    const g = ctx.createLinearGradient(padL, 0, padL + span, 0);
    [[-4, '#020617'], [0, '#172554'], [4, '#1d4ed8'], [8, '#38bdf8'],
     [12, '#fcd34d'], [14, '#fbbf24'], [16, '#fffbeb']].forEach(([ev, c]) => {
      g.addColorStop((ev - this.EV_LO) / 20, c);
    });
    ctx.fillStyle = g;
    ctx.fillRect(padL, barY, span, barH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL + 0.5, barY + 0.5, span - 1, barH - 1);

    // --- EV ticks & numbers ---
    ctx.textAlign = 'center';
    for (let ev = this.EV_LO; ev <= this.EV_HI; ev++) {
      const tx = x(ev);
      ctx.strokeStyle = 'rgba(148,163,184,0.45)';
      ctx.beginPath();
      ctx.moveTo(tx, barY + barH);
      ctx.lineTo(tx, barY + barH + 5);
      ctx.stroke();
      if (ev % 2 === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(String(ev), tx, barY + barH + 19);
      }
    }
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('EV', padL - 26, barY + barH + 19);

    // --- Scene short labels (alternating rows) ---
    const scenes = i18n.evSceneShort || [];
    ctx.font = '10px sans-serif';
    for (let i = 0; i < scenes.length; i++) {
      const tx = x(this.EV_LO + i);
      const row = i % 2;
      ctx.fillStyle = row === 0 ? '#94a3b8' : '#64748b';
      ctx.fillText(scenes[i], tx, barY + barH + 36 + row * 15);
    }

    // --- Camera capability region ---
    const camMinX = x(this.clampEv(s.evMin));
    const camMaxX = x(this.clampEv(s.evMax));
    ctx.fillStyle = 'rgba(34,197,94,0.32)';
    ctx.fillRect(camMinX, barY, Math.max(2, camMaxX - camMinX), barH);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camMinX, barY - 1);
    ctx.lineTo(camMinX, barY + barH + 1);
    ctx.stroke();

    // --- Custom exposure combo markers (stacked above the bar) ---
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px sans-serif';
    (s.evCustoms || []).forEach((c, i) => {
      if (c.ev == null) return;
      const cx = x(this.clampEv(c.ev));
      const tip = Math.max(30, barY - 22 - i * 24);
      ctx.fillStyle = this.colorAt(i);
      ctx.beginPath();
      ctx.moveTo(cx - 6, tip - 12);
      ctx.lineTo(cx + 6, tip - 12);
      ctx.lineTo(cx, tip);
      ctx.closePath();
      ctx.fill();
      const label = i18n.evComboLabel + (i + 1) + ' · EV ' + c.ev.toFixed(1);
      const lx = Math.min(Math.max(cx, padL + 80), W - padR - 80);
      ctx.fillText(label, lx, tip - 17);
    });

    // --- Camera marker + label (closest to the bar) ---
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(camMinX - 6, barY - 12);
    ctx.lineTo(camMinX + 6, barY - 12);
    ctx.lineTo(camMinX, barY);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 12px sans-serif';
    const camText = i18n.evCameraLabel + ' · ' + i18n.evDarkestLabel + ' EV ' + s.evMin.toFixed(1);
    const camTx = Math.min(Math.max(camMinX, padL + 100), W - padR - 100);
    ctx.fillText(camText, camTx, barY - 18);
  }
}

window.EvView = EvView;
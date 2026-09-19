/**
 * BokehPreview.js
 * 焦外光斑预览视图（类）
 * init(store) 绑定 store，render() 从 store 读取数据并绘制。
 */
class BokehPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = null;
  }

  init(store) {
    this.store = store;
  }

  hexA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  render() {
    const s = this.store.state;
    if (s.bokehMm == null || !s.sensor) return;
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1220'); bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const ratio = s.bokehMm / s.sensor.w;
    const physicalD = ratio * W;
    const displayD = Math.min(Math.max(physicalD, 30), H * 0.8);
    const radius = displayD / 2;

    const spots = [
      { x: W * 0.2, y: H * 0.32, c: '#fbbf24', r: 0.9 },
      { x: W * 0.5, y: H * 0.55, c: '#f472b6', r: 1.0 },
      { x: W * 0.78, y: H * 0.28, c: '#60a5fa', r: 0.8 },
      { x: W * 0.35, y: H * 0.72, c: '#34d399', r: 0.7 },
      { x: W * 0.66, y: H * 0.18, c: '#f87171', r: 0.6 }
    ];

    spots.forEach((sp) => {
      const r = radius * sp.r;
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r);
      g.addColorStop(0, sp.c);
      g.addColorStop(0.55, this.hexA(sp.c, 0.85));
      g.addColorStop(0.85, this.hexA(sp.c, 0.35));
      g.addColorStop(1, this.hexA(sp.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    const blurText = I18N[currentLang].blurLevels[(s.bokehBlurLevel || 1) - 1];
    ctx.fillText(
      I18N[currentLang].bokehLabel(s.bokehMm.toFixed(3), (ratio * 100).toFixed(2), blurText),
      16, 26
    );
  }
}

window.BokehPreview = BokehPreview;
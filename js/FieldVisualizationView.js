/**
 * FieldVisualizationView.js
 * 景深可视化视图（类）
 * init(store) 绑定 store 与拖拽交互，render() 从 store 读取 dof 数据并绘制。
 * 支持拖动景深范围两端（近/远边界）来反向调整光圈大小。
 */
class FieldVisualizationView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = null;
    this._drag = null;   // 'near' | 'far'
    this._layout = null; // 最近一次绘制时的布局信息
  }

  init(store) {
    this.store = store;
    this.canvas.addEventListener('pointerdown', (e) => this._down(e));
    this.canvas.addEventListener('pointermove', (e) => this._move(e));
    this.canvas.addEventListener('pointerup', () => this._stop());
    this.canvas.addEventListener('pointercancel', () => this._stop());
  }

  getPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top) * (this.canvas.height / r.height)
    };
  }

  fmtDistance(mm) {
    if (!isFinite(mm)) return '∞';
    const m = mm / 1000;
    if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
    if (m >= 1) return m.toFixed(2) + ' m';
    return (m * 100).toFixed(1) + ' cm';
  }

  _down(e) {
    const pos = this.getPos(e);
    const L = this._layout;
    if (!L) return;
    const yMin = L.barY - 18;
    const yMax = L.barY + L.barH + 18;
    if (pos.y < yMin || pos.y > yMax) return;

    if (Math.abs(pos.x - L.nearX) < 16) {
      this._drag = 'near';
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.style.cursor = 'ew-resize';
    } else if (Math.abs(pos.x - L.farX) < 16) {
      this._drag = 'far';
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.style.cursor = 'ew-resize';
    }
  }

  _move(e) {
    if (this._drag) {
      this._applyDrag(this.getPos(e));
      return;
    }

    // 悬停反馈
    const pos = this.getPos(e);
    const L = this._layout;
    let cursor = 'default';
    if (L && pos.y >= L.barY - 18 && pos.y <= L.barY + L.barH + 18) {
      if (Math.abs(pos.x - L.nearX) < 16 || Math.abs(pos.x - L.farX) < 16) cursor = 'ew-resize';
    }
    this.canvas.style.cursor = cursor;
  }

  _applyDrag(pos) {
    const L = this._layout;
    if (!L) return;
    const s = this.store.state;
    const focal = s.focal || 50;
    const coc = s.coc || 0.030;
    const u = (s.distanceM || 0) * 1000;

    let mm = L.distAt(pos.x);
    let aperture = null;

    if (this._drag === 'near') {
      mm = Math.max(0.001, Math.min(mm, u - 0.001));
      aperture = this._apertureFromNear(mm, focal, coc, u);
    } else if (this._drag === 'far') {
      mm = Math.max(u + 0.001, mm);
      aperture = this._apertureFromFar(mm, focal, coc, u);
    }

    if (aperture && isFinite(aperture) && aperture > 0) {
      s.aperture = Math.max(0.7, Math.min(32, aperture));
      this.store.commit();
    }
  }

  _stop() {
    this._drag = null;
    this.canvas.style.cursor = 'default';
  }

  // 由远景边界反推光圈：DoF 远边界 farMM = u(H-f)/(H-u)
  _apertureFromFar(farMM, focal, coc, u) {
    if (farMM <= u || !(coc > 0)) return null;
    const H = u * (farMM - focal) / (farMM - u);
    return this._apertureFromH(H, focal, coc);
  }

  // 由近景边界反推光圈：DoF 近边界 nearMM = u(H-f)/(H+u-2f)
  _apertureFromNear(nearMM, focal, coc, u) {
    if (nearMM >= u || !(coc > 0)) return null;
    const H = (nearMM * (2 * focal - u) - u * focal) / (nearMM - u);
    return this._apertureFromH(H, focal, coc);
  }

  _apertureFromH(H, focal, coc) {
    const hf = H - focal;
    if (hf <= 0) return null;
    return (focal * focal) / (coc * hf);
  }

  render() {
    const s = this.store.state;
    const dof = s.dof;
    if (!dof) return;
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    const pad = 40, axisY = H - 50;
    const focusMM = (s.distanceM || 0) * 1000;
    let maxDist = Number.isFinite(dof.far)
      ? Math.max(dof.far, focusMM * 1.5)
      : focusMM * 3;
    maxDist = Math.max(maxDist, focusMM * 1.2);
    const xOf = (d) => pad + (d / maxDist) * (W - pad * 2);
    const distAt = (x) => ((x - pad) / (W - pad * 2)) * maxDist;

    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(pad, axisY); ctx.lineTo(W - pad, axisY); ctx.stroke();

    ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const d = (maxDist / 6) * i, x = xOf(d);
      ctx.beginPath(); ctx.moveTo(x, axisY); ctx.lineTo(x, axisY + 5); ctx.stroke();
      ctx.fillText((d / 1000).toFixed(1) + 'm', x, axisY + 18);
    }

    const nearX = xOf(dof.near);
    const farX = Number.isFinite(dof.far) ? xOf(dof.far) : W - pad;
    const barY = axisY - 60, barH = 26;

    const grad = ctx.createLinearGradient(nearX, 0, farX, 0);
    grad.addColorStop(0, '#22c55e'); grad.addColorStop(0.5, '#4ade80'); grad.addColorStop(1, '#22c55e');
    ctx.fillStyle = grad; ctx.fillRect(nearX, barY, farX - nearX, barH);

    const focusX = xOf(focusMM);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(nearX, barY, focusX - nearX, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(focusX, barY, farX - focusX, barH);

    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(focusX, barY - 12); ctx.lineTo(focusX, axisY); ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(focusX, barY - 12, 4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(t('dofRangeLabel'), pad, barY - 20);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f59e0b';
    ctx.fillText(t('focusPoint') + ' ' + (focusMM / 1000).toFixed(2) + 'm', focusX, barY - 20);

    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif';
    ctx.fillText(this.fmtDistance(dof.near), nearX, barY + barH + 16);
    ctx.fillText(this.fmtDistance(dof.far), farX, barY + barH + 16);

    // 可拖拽的近/远边界手柄
    const handleY = barY + barH / 2;
    [[nearX, '#22c55e'], [farX, '#22c55e']].forEach(([hx, color]) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(hx, handleY, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });

    ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(t('dofDragHint'), 12, H - 12);

    this._layout = { pad, axisY, barY, barH, nearX, farX, focusX, distAt };
  }
}

window.FieldVisualizationView = FieldVisualizationView;
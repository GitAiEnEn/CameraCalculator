/**
 * CameraDistanceView.js
 * Camera-to-subject distance view (class)
 *   kind: 'top' horizontal reference | 'side' vertical reference
 * init(store) binds canvas drag interactions, render() reads from store and draws.
 */
class CameraDistanceView {
  constructor(canvas, kind, useVerticalFrame) {
    this.canvas = canvas;
    this.kind = kind;
    // Which frame direction this view measures: true = vertical height as the
    // frame height; false = horizontal length as the imaging length.
    this.useVerticalFrame = useVerticalFrame !== false;
    this.ctx = canvas.getContext('2d');
    this.store = null;
    this._dragMode = null;
    this._grabDx = 0;
    this._grabDy = 0;
  }

  init(store) {
    this.store = store;
    this.canvas.addEventListener('pointerdown', (e) => this._down(e));
    this.canvas.addEventListener('pointermove', (e) => this._move(e));
    this.canvas.addEventListener('pointerup', () => this._stop());
    this.canvas.addEventListener('pointercancel', () => this._stop());
    // CSS size changes (rotation / mobile URL bar) rescale hit targets,
    // so redraw to keep the drawn handles in sync with the display size.
    window.addEventListener('resize', () => { if (this.store) this.render(); });
  }

  // Canvas internal px per displayed CSS px. > 1 when CSS scales the canvas
  // down (typical on mobile: 640px-wide canvas shown at ~300px). Used to keep
  // the camera / angle handles and their hit areas at a usable on-screen
  // size at any display scale.
  uiScale() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return 1;
    const ratio = this.canvas.width / r.width;
    return isFinite(ratio) ? Math.min(3, Math.max(1, ratio)) : 1;
  }

  getPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top) * (this.canvas.height / r.height)
    };
  }

  hitTest(pos) {
    const s = this.store.state;
    const k = this.uiScale();
    // Use this view's own angle: the side view draws/measures angleV
    // (angleH was always used before, so once the two angles diverged the
    // side-view handle could no longer be grabbed).
    const ang = this.kind === 'top' ? s.angleH : s.angleV;
    // Test the smaller target (angle handle) before the camera body.
    const hx = s.camX + Math.cos(ang) * 30 * k;
    const hy = s.camY + Math.sin(ang) * 30 * k;
    if (Math.hypot(pos.x - hx, pos.y - hy) < 16 * k) return 'angle';
    if (Math.hypot(pos.x - s.camX, pos.y - s.camY) < 20 * k) return 'camera';
    return null;
  }

  _down(e) {
    // Disable interaction while framing lock is active
    if (this.store.state.fovLock) return;
    e.preventDefault();
    const pos = this.getPos(e);
    this._dragMode = this.hitTest(pos);
    if (this._dragMode) {
      const s = this.store.state;
      // Remember the grab offset so the camera does not jump under the
      // finger/pointer when the drag starts (a finger covers a large area
      // on mobile and would otherwise hide the camera).
      this._grabDx = s.camX - pos.x;
      this._grabDy = s.camY - pos.y;
      s.dragging = true;
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.style.cursor = 'grabbing';
    }
  }

  _move(e) {
    if (!this._dragMode) {
      // Hover feedback (desktop; harmless on touch)
      if (!this.store.state.fovLock && e.pointerType !== 'touch') {
        this.canvas.style.cursor = this.hitTest(this.getPos(e)) ? 'grab' : 'default';
      }
      return;
    }
    const s = this.store.state;
    const pos = this.getPos(e);

    if (this._dragMode === 'camera') {
      s.autoOrient = false;
      // Move by the grab offset and keep the camera inside the canvas (a
      // finger can easily drag past the edge on mobile).
      s.camX = Math.min(Math.max(pos.x + this._grabDx, 8), this.canvas.width - 8);
      s.camY = Math.min(Math.max(pos.y + this._grabDy, 8), this.canvas.height - 8);
      // Horizontal distance -> focus distance; vertical position -> camera height
      const newDist = Math.max(0.1, (s.subjectX - s.camX) / s.scale);
      s.heightM = Math.max(0, (s.subjectY - s.camY) / s.scale);
      if (s.mode === 'person') { s.eyeHeightM = s.heightM; }
      s.distanceM = newDist;
      this.store.commit();
    } else {
      s.autoOrient = false;
      const ang = Math.max(-1.35, Math.min(1.35,
        Math.atan2(pos.y - s.camY, pos.x - s.camX)));
      if (this.kind === 'top') s.angleH = ang;
      else s.angleV = ang;
      this.store.commit();
    }
  }

  _stop() {
    if (this._dragMode) {
      this._dragMode = null;
      this.store.state.dragging = false;
      // Re-sync the drawn camera position with the derived distance/height
      this.store.commit();
    }
    this.canvas.style.cursor = 'default';
  }

  render() {
    const s = this.store.state;
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    const isPerson = s.mode === 'person';
    const isTop = this.kind === 'top';
    const isPortrait = s.orientation === 'portrait';

    // Sensor dimension corresponding to the frame vertical/horizontal direction
    // (in portrait the frame rotates 90deg, so vertical maps to sensor width)
    const sensorW = s.sensor ? s.sensor.w : 36;
    const sensorH = s.sensor ? s.sensor.h : 24;
    const focal = s.focal || 50;
    const distM = s.distanceM || 3;

    const frameSensorSize = this.useVerticalFrame
      ? (isPortrait ? sensorW : sensorH)
      : (isPortrait ? sensorH : sensorW);

    const fovDeg = Calc.fieldOfView(frameSensorSize, focal);
    const imagingLengthM = (frameSensorSize / focal) * distM;
    const angle = isTop ? s.angleH : s.angleV;

    // Ground line
    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(0, s.subjectY); ctx.lineTo(W, s.subjectY); ctx.stroke();

    // Camera-to-subject connecting line
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(s.camX, s.camY); ctx.lineTo(s.subjectX, s.subjectY); ctx.stroke();
    ctx.setLineDash([]);

    const span = this.drawFovCone(fovDeg, angle);

    // Subject length along this view's measured direction
    const subjectLengthM = this.useVerticalFrame
      ? (isPerson ? (s.refHeightM || s.subjectH) : s.subjectH)
      : s.subjectW;

    // Subject + framing status
    if (this.useVerticalFrame) {
      const hpx = Math.min(subjectLengthM * s.scale, H * 0.7);
      const extent = { top: s.subjectY - hpx, bottom: s.subjectY };
      this.drawSubject(extent, span, 8, W);
    } else {
      const hpx = Math.min((subjectLengthM / 2) * s.scale, 60);
      const extent = { top: s.subjectY - hpx, bottom: s.subjectY + hpx };
      this.drawSubject(extent, span, 6, W);
    }

    ctx.fillStyle = '#e2e8f0'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(i18n.sceneSubject, s.subjectX, s.subjectY + 28);

    this.drawCamera(angle);
    this.drawAnnotations(fovDeg, imagingLengthM, subjectLengthM, isTop);
  }

  drawFovCone(fovDeg, angle) {
    const s = this.store.state, ctx = this.ctx;
    const half = (fovDeg / 2) * Math.PI / 180;
    const end = (ang) => {
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const dx = s.subjectX - s.camX;
      const forward = cosA > 0.03;
      const t = forward ? dx / cosA : 240;
      return { x: s.camX + t * cosA, y: s.camY + t * sinA, forward };
    };
    const a = end(angle - half), b = end(angle + half);
    ctx.strokeStyle = 'rgba(56,189,248,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s.camX, s.camY); ctx.lineTo(a.x, a.y);
    ctx.moveTo(s.camX, s.camY); ctx.lineTo(b.x, b.y); ctx.stroke();

    const span = { a, b, top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y) };
    if (a.forward && b.forward) {
      ctx.strokeStyle = 'rgba(56,189,248,0.6)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(s.subjectX, span.top); ctx.lineTo(s.subjectX, span.bottom); ctx.stroke();
      ctx.setLineDash([]);
    }
    return span;
  }

  frameStatus(extent, span) {
    if (!extent || !span) return 'in';
    if (extent.top >= span.top && extent.bottom <= span.bottom) return 'in';
    if (extent.top < span.bottom && extent.bottom > span.top) return 'partial';
    return 'out';
  }

  drawSubject(extent, span, halfW, W) {
    const ctx = this.ctx;
    const status = this.frameStatus(extent, span);
    ctx.fillStyle = status === 'in' ? '#22c55e' : status === 'partial' ? '#f59e0b' : '#ef4444';
    ctx.fillRect(this.store.state.subjectX - halfW, extent.top, halfW * 2, extent.bottom - extent.top);

    const txt = status === 'in' ? i18n.inFrame : status === 'partial' ? i18n.partialFrame : i18n.outFrame;
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(txt, W - 12, 26);
  }

  drawCamera(angle) {
    const s = this.store.state, ctx = this.ctx;
    const k = this.uiScale();
    // Scale the camera body / label / angle handle with the display size so
    // they stay grabbable on mobile where the canvas is CSS-scaled down.
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(s.camX - 9 * k, s.camY - 9 * k, 18 * k, 18 * k);
    ctx.fillStyle = '#e2e8f0'; ctx.font = Math.round(12 * k) + 'px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(i18n.sceneCamera, s.camX - 8 * k, s.camY + 26 * k);
    const hx = s.camX + Math.cos(angle) * 30 * k, hy = s.camY + Math.sin(angle) * 30 * k;
    ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(hx, hy, 7 * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  }

  drawAnnotations(fovDeg, imagingLengthM, subjectLengthM, isHorizontal) {
    const s = this.store.state, ctx = this.ctx;
    ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText((isHorizontal ? 'FOV H ' : 'FOV V ') + fovDeg.toFixed(1) + '°', 12, 22);
    ctx.fillText(i18n.sceneDistance + ' ' + (s.distanceM || 0).toFixed(2) + 'm', 12, 42);
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif';
    const camH = s.mode === 'person' ? (s.eyeHeightM != null ? s.eyeHeightM : s.heightM) : s.heightM;
    ctx.fillText(i18n.camHeight + ' ' + camH.toFixed(2) + 'm', 12, 62);
    ctx.fillText(i18n.tiltAngle + ' ' + ((isHorizontal ? s.angleH : s.angleV) * 180 / Math.PI).toFixed(1) + '°', 12, 82);
    ctx.fillText(i18n.subjectLength + ' ' + subjectLengthM.toFixed(2) + 'm', 12, 102);
    ctx.fillText(i18n.imagingLength + ' ' + imagingLengthM.toFixed(2) + 'm', 12, 122);
  }
}

window.CameraDistanceView = CameraDistanceView;
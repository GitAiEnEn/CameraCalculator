/**
 * PortraitView.js
 * 人像构图视图（类）
 *
 * init(store) 绑定 canvas 交互（关节拖拽 / 上下移动调整人眼高度）。
 * render()    从 store.state 读取模型并绘制。
 * 交互直接修改 store.state 并触发 store.commit() 统一重算。
 */
class PortraitView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = null;

    this.BONE = {
      shoulderHalf: 0.06,
      upperArm: 0.13,
      foreArm: 0.14,
      torso: 0.34,
      thigh: 0.24,
      shin: 0.24,
      headR: 0.08
    };

    this._mode = null;
    this._active = null;
    this._lastY = 0;
    this._startPos = null;
    this._backup = null;
  }

  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  constrainDist(p, anchor, len) {
    const dx = p.x - anchor.x, dy = p.y - anchor.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    p.x = anchor.x + (dx / d) * len;
    p.y = anchor.y + (dy / d) * len;
  }

  // 将 p 限制在 anchor 的 maxReach 范围内，保证四肢不会因拖拽被拉长。
  clampReach(p, anchor, maxReach) {
    const dx = p.x - anchor.x, dy = p.y - anchor.y;
    const d = Math.hypot(dx, dy);
    if (d <= maxReach) return;
    const k = maxReach / d;
    p.x = anchor.x + dx * k;
    p.y = anchor.y + dy * k;
  }

  solveMiddle(anchor, end, l1, l2) {
    const dx = end.x - anchor.x, dy = end.y - anchor.y;
    let d = Math.hypot(dx, dy);
    d = this.clamp(d, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
    const base = Math.atan2(dy, dx);
    const cos2 = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const delta = Math.acos(this.clamp(cos2, -1, 1));
    const c1 = { x: anchor.x + l1 * Math.cos(base + delta), y: anchor.y + l1 * Math.sin(base + delta) };
    const c2 = { x: anchor.x + l1 * Math.cos(base - delta), y: anchor.y + l1 * Math.sin(base - delta) };
    return Math.abs(c1.x) <= Math.abs(c2.x) ? c1 : c2;
  }

  sideShoulders() {
    const p = this.store.state.pose;
    return {
      L: { x: p.neck.x - this.BONE.shoulderHalf, y: p.neck.y + 0.02 },
      R: { x: p.neck.x + this.BONE.shoulderHalf, y: p.neck.y + 0.02 }
    };
  }

  updateArmsFromEnds() {
    const p = this.store.state.pose, B = this.BONE, sh = this.sideShoulders();
    p.leftElbow = this.solveMiddle(sh.L, p.leftHand, B.upperArm, B.foreArm);
    p.rightElbow = this.solveMiddle(sh.R, p.rightHand, B.upperArm, B.foreArm);
  }

  updateLegsFromEnds() {
    const p = this.store.state.pose, B = this.BONE;
    p.leftKnee = this.solveMiddle(p.hip, p.leftFoot, B.thigh, B.shin);
    p.rightKnee = this.solveMiddle(p.hip, p.rightFoot, B.thigh, B.shin);
  }

  init(store) {
    this.store = store;
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', () => this._stop());
    canvas.addEventListener('pointercancel', () => this._stop());
  }

  getPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top) * (this.canvas.height / r.height)
    };
  }

  hitJoint(pos) {
    const S = this.store.state.pose._screen || {};
    const order = [
      ['leftHand', S.leftHand], ['rightHand', S.rightHand],
      ['leftFoot', S.leftFoot], ['rightFoot', S.rightFoot],
      ['leftElbow', S.leftElbow], ['rightElbow', S.rightElbow],
      ['leftKnee', S.leftKnee], ['rightKnee', S.rightKnee],
      ['neck', S.neck], ['hip', S.hip], ['head', S.head]
    ];
    for (let i = order.length - 1; i >= 0; i--) {
      const [k, pt] = order[i];
      if (pt && Math.hypot(pos.x - pt.x, pos.y - pt.y) < 14) return k;
    }
    return null;
  }

  clonePose() {
    const keys = ['neck','hip','leftHand','rightHand','leftFoot','rightFoot','leftElbow','rightElbow','leftKnee','rightKnee'];
    const p = this.store.state.pose, c = {};
    keys.forEach((k) => { c[k] = { x: p[k].x, y: p[k].y }; });
    return c;
  }

  _down(e) {
    // 构图锁定时禁用交互
    if (this.store.state.fovLock) return;
    const pos = this.getPos(e);
    const j = this.hitJoint(pos);
    if (j) { this._mode = 'joint'; this._active = j; }
    else { this._mode = 'scroll'; this._lastY = e.clientY; }
    this.canvas.setPointerCapture(e.pointerId);
  }

  _move(e) {
    if (!this._mode) {
      this.canvas.style.cursor = this.hitJoint(this.getPos(e)) ? 'grab' : 'default';
      return;
    }
    const st = this.store.state;
    const pos = this.getPos(e);
    const meta = st.personFrame;

    if (this._mode === 'scroll') {
      const dy = (e.clientY - this._lastY) / 40;
      this._lastY = e.clientY;
      st.eyeHeightM = Math.max(0, st.eyeHeightM + dy);
      st.heightM = st.eyeHeightM;
      st.camY = st.subjectY - st.eyeHeightM * st.scale;
      this.store.commit();
      return;
    }

    if (!meta.heightPx) return;
    const nx = (pos.x - meta.cx) / meta.heightPx;
    const ny = this.clamp((pos.y - meta.headY) / meta.heightPx, 0, 1);
    const p = st.pose;

    if (this._active === 'head' || this._active === 'neck') {
      p.neck.x = nx; p.neck.y = this.clamp(ny, 0.05, 0.3);
      this.constrainDist(p.hip, p.neck, this.BONE.torso);
      this.updateArmsFromEnds(); this.updateLegsFromEnds();
    } else if (this._active === 'hip') {
      p.hip.x = nx; p.hip.y = this.clamp(ny, 0.3, 0.8);
      this.constrainDist(p.neck, p.hip, this.BONE.torso);
      this.updateLegsFromEnds();
    } else if (this._active === 'leftHand' || this._active === 'rightHand') {
      p[this._active].x = nx; p[this._active].y = ny;
      const sh = this.sideShoulders();
      const shoulder = this._active.startsWith('left') ? sh.L : sh.R;
      this.clampReach(p[this._active], shoulder, this.BONE.upperArm + this.BONE.foreArm);
      this.updateArmsFromEnds();
    } else if (this._active === 'leftFoot' || this._active === 'rightFoot') {
      p[this._active].x = nx; p[this._active].y = this.clamp(ny, 0.5, 1);
      this.clampReach(p[this._active], p.hip, this.BONE.thigh + this.BONE.shin);
      this.updateLegsFromEnds();
    } else if (this._active === 'leftElbow' || this._active === 'rightElbow') {
      const sh = this.sideShoulders();
      const shoulder = this._active.startsWith('left') ? sh.L : sh.R;
      const handKey = this._active.startsWith('left') ? 'leftHand' : 'rightHand';
      const e = p[this._active]; e.x = nx; e.y = ny;
      this.constrainDist(e, shoulder, this.BONE.upperArm);
      const h = p[handKey];
      const d = Math.hypot(h.x - e.x, h.y - e.y) || 1e-6;
      h.x = e.x + ((h.x - e.x) / d) * this.BONE.foreArm;
      h.y = e.y + ((h.y - e.y) / d) * this.BONE.foreArm;
    } else if (this._active === 'leftKnee' || this._active === 'rightKnee') {
      const footKey = this._active.startsWith('left') ? 'leftFoot' : 'rightFoot';
      const k = p[this._active]; k.x = nx; k.y = ny;
      this.constrainDist(k, p.hip, this.BONE.thigh);
      const f = p[footKey];
      const d = Math.hypot(f.x - k.x, f.y - k.y) || 1e-6;
      f.x = k.x + ((f.x - k.x) / d) * this.BONE.shin;
      f.y = k.y + ((f.y - k.y) / d) * this.BONE.shin;
    }

    this.store.commit();
  }

  _stop() {
    this._mode = null; this._active = null;
    this.canvas.style.cursor = 'default';
  }

  render() {
    const st = this.store.state;
    if (!st.sensor) return;

    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    const isPortrait = st.orientation === 'portrait';
    const frameAspect = isPortrait ? st.sensor.h / st.sensor.w : st.sensor.w / st.sensor.h;

    const frameH = H * 0.86;
    const frameW = Math.min(frameH * frameAspect, W * 0.92);
    const fh = Math.min(frameH, frameW / frameAspect);
    const fw = fh * frameAspect;
    const frameLeft = (W - fw) / 2;
    const frameTop = (H - fh) / 2;

    const avgH = st.avgPersonHeight;
    const eyeH = st.eyeHeightM != null ? st.eyeHeightM : 1.6;
    const frameCenterY = frameTop + fh / 2;
    const camHeightM = eyeH + st.personView.cropOffsetM;

    // 相机垂直倾斜角度（Canvas 约定：正 = 俯视/向下），人像构图视图随之变化。
    const tilt = st.angleV || 0;
    const distM = st.distanceM || 3;
    // 竖屏时取景框“垂直”方向实际对应传感器的水平视角。
    const verticalFovDeg = isPortrait ? (st.fovHdeg || 39.6) : (st.fovVdeg || 27);
    const halfFovRad = verticalFovDeg * Math.PI / 360;

    // 透视投影：世界高度 wm（位于相机前方 distM 平面）→ 屏幕 y
    const worldToScreenY = (wm) => {
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const d = distM * cosT - (wm - camHeightM) * sinT;
      if (Math.abs(d) < 1e-6) return frameCenterY;
      const hUp = distM * sinT + (wm - camHeightM) * cosT;
      const norm = (hUp / d) / Math.tan(halfFovRad);
      return frameCenterY - norm * (fh / 2);
    };

    const headY = worldToScreenY(avgH);
    const footY = worldToScreenY(0);
    const heightPx = Math.abs(footY - headY);

    st.personFrame.cx = W / 2;
    st.personFrame.headY = headY;
    st.personFrame.footY = footY;
    st.personFrame.heightPx = heightPx;

    // 网格
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let j = 0; j < H; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

    if (footY > 0 && footY < H) {
      ctx.strokeStyle = '#334155';
      ctx.beginPath(); ctx.moveTo(0, footY); ctx.lineTo(W, footY); ctx.stroke();
    }
    if (st.eyeHeightM != null) {
      const eyeY = worldToScreenY(eyeH);
      if (eyeY > 0 && eyeY < H) {
        ctx.strokeStyle = '#f472b6'; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(0, eyeY); ctx.lineTo(W, eyeY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f472b6'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(t('eyeHeight') + ' ' + eyeH.toFixed(2) + 'm', 8, eyeY - 6);
      }
    }

    this.drawSkeleton();

    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3;
    ctx.strokeRect(frameLeft, frameTop, fw, fh);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, frameTop);
    ctx.fillRect(0, frameTop + fh, W, H - frameTop - fh);
    ctx.fillRect(0, frameTop, frameLeft, fh);
    ctx.fillRect(frameLeft + fw, frameTop, W - frameLeft - fw, fh);

    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(t(st.shotTypeKey), W - 16, 32);
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px sans-serif';
    ctx.fillText(t('fovHeight') + ' ' + st.verticalFovM.toFixed(2) + 'm', W - 16, 52);

    ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(t('personDragHint'), 12, H - 12);
  }

  drawSkeleton() {
    const st = this.store.state;
    const { cx, headY, heightPx } = st.personFrame;
    if (heightPx <= 0) return;
    const p = st.pose;
    const toS = (j) => ({ x: cx + j.x * heightPx, y: headY + j.y * heightPx });
    const shoulderL = { x: p.neck.x - this.BONE.shoulderHalf, y: p.neck.y + 0.02 };
    const shoulderR = { x: p.neck.x + this.BONE.shoulderHalf, y: p.neck.y + 0.02 };

    const S = {
      neck: toS(p.neck), hip: toS(p.hip),
      leftHand: toS(p.leftHand), rightHand: toS(p.rightHand),
      leftFoot: toS(p.leftFoot), rightFoot: toS(p.rightFoot),
      leftElbow: toS(p.leftElbow), rightElbow: toS(p.rightElbow),
      leftKnee: toS(p.leftKnee), rightKnee: toS(p.rightKnee),
      shoulderL: toS(shoulderL), shoulderR: toS(shoulderR),
      head: { x: toS(p.neck).x, y: toS(p.neck).y - this.BONE.headR * heightPx }
    };
    p._screen = S;

    const torsoW = heightPx * 0.10, limbW = heightPx * 0.06;
    const ctx = this.ctx;
    ctx.strokeStyle = '#22c55e'; ctx.lineCap = 'round';

    ctx.lineWidth = torsoW;
    ctx.beginPath(); ctx.moveTo(S.neck.x, S.neck.y); ctx.lineTo(S.hip.x, S.hip.y); ctx.stroke();

    ctx.lineWidth = limbW;
    ctx.beginPath();
    ctx.moveTo(S.shoulderL.x, S.shoulderL.y); ctx.lineTo(S.leftElbow.x, S.leftElbow.y); ctx.lineTo(S.leftHand.x, S.leftHand.y);
    ctx.moveTo(S.shoulderR.x, S.shoulderR.y); ctx.lineTo(S.rightElbow.x, S.rightElbow.y); ctx.lineTo(S.rightHand.x, S.rightHand.y);
    ctx.stroke();

    ctx.lineWidth = limbW * 1.15;
    ctx.beginPath();
    ctx.moveTo(S.hip.x, S.hip.y); ctx.lineTo(S.leftKnee.x, S.leftKnee.y); ctx.lineTo(S.leftFoot.x, S.leftFoot.y);
    ctx.moveTo(S.hip.x, S.hip.y); ctx.lineTo(S.rightKnee.x, S.rightKnee.y); ctx.lineTo(S.rightFoot.x, S.rightFoot.y);
    ctx.stroke();

    const headR = this.BONE.headR * heightPx;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(S.head.x, S.head.y, headR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    [S.neck, S.hip, S.leftElbow, S.rightElbow, S.leftKnee, S.rightKnee,
     S.leftHand, S.rightHand, S.leftFoot, S.rightFoot].forEach((j) => {
      ctx.beginPath(); ctx.arc(j.x, j.y, 4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.lineCap = 'butt';
  }
}

window.PortraitView = PortraitView;
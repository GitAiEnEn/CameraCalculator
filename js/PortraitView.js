/**
 * PortraitView.js
 * Portrait framing view (class)
 *
 * init(store) binds canvas interactions (joint dragging / vertical scroll to
 * adjust eye height).
 * render() reads the model from store.state and draws it.
 * Interactions mutate store.state directly and call store.commit() to recompute.
 *
 * The stick figure uses a constraint-relaxation solver (inspired by the demo):
 * the pelvis is the root anchor, arms attach at the chest, legs at the pelvis,
 * and every bone keeps its initial length while a joint is dragged.
 */
class PortraitView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = null;

    // Stick figure proportions (fractions of the on-screen person height).
    this.BONE = {
      headR: 0.08,   // head radius
      torsoW: 0.10,  // torso stroke width
      limbW: 0.055,  // limb / neck stroke width
      jointR: 4      // joint dot radius (px)
    };

    // Rest pose used to lock each bone's initial length.
    this.REFERENCE = {
      chest: { x: 0.0, y: 0.16 },
      pelvis: { x: 0.0, y: 0.50 },
      leftElbow: { x: -0.14, y: 0.26 }, rightElbow: { x: 0.14, y: 0.26 },
      leftHand: { x: -0.28, y: 0.38 }, rightHand: { x: 0.28, y: 0.38 },
      leftKnee: { x: -0.03, y: 0.75 }, rightKnee: { x: 0.03, y: 0.75 },
      leftFoot: { x: -0.08, y: 1.00 }, rightFoot: { x: 0.08, y: 1.00 }
    };

    // Constraint bones: torso, arms (upper + forearm), legs (thigh + shin).
    // The head is derived from the chest and therefore not part of the solver.
    this.BONES = [
      ['pelvis', 'chest'],
      ['chest', 'leftElbow'], ['leftElbow', 'leftHand'],
      ['chest', 'rightElbow'], ['rightElbow', 'rightHand'],
      ['pelvis', 'leftKnee'], ['leftKnee', 'leftFoot'],
      ['pelvis', 'rightKnee'], ['rightKnee', 'rightFoot']
    ];

    this.BONE_LENGTHS = {};
    this.BONES.forEach(([a, b]) => {
      const dx = this.REFERENCE[a].x - this.REFERENCE[b].x;
      const dy = this.REFERENCE[a].y - this.REFERENCE[b].y;
      this.BONE_LENGTHS[a + ':' + b] = Math.hypot(dx, dy);
    });

    this._mode = null;
    this._active = null;
    this._lastY = 0;
  }

  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

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

  _down(e) {
    // Disable interaction while framing lock is active
    if (this.store.state.fovLock) return;
    const pos = this.getPos(e);
    const j = this.hitJoint(pos);
    if (j) { this._mode = 'joint'; this._active = j; }
    else { this._mode = 'scroll'; this._lastY = e.clientY; }
    this.canvas.setPointerCapture(e.pointerId);
  }

  // Build mutable working copies of the figure nodes (pose space).
  _workingNodes() {
    const p = this.store.state.pose;
    return {
      chest: { x: p.neck.x, y: p.neck.y },
      pelvis: { x: p.hip.x, y: p.hip.y },
      leftElbow: { x: p.leftElbow.x, y: p.leftElbow.y },
      rightElbow: { x: p.rightElbow.x, y: p.rightElbow.y },
      leftHand: { x: p.leftHand.x, y: p.leftHand.y },
      rightHand: { x: p.rightHand.x, y: p.rightHand.y },
      leftKnee: { x: p.leftKnee.x, y: p.leftKnee.y },
      rightKnee: { x: p.rightKnee.x, y: p.rightKnee.y },
      leftFoot: { x: p.leftFoot.x, y: p.leftFoot.y },
      rightFoot: { x: p.rightFoot.x, y: p.rightFoot.y }
    };
  }

  _writeBack(nodes) {
    const p = this.store.state.pose;
    p.neck.x = nodes.chest.x; p.neck.y = nodes.chest.y;
    p.hip.x = nodes.pelvis.x; p.hip.y = nodes.pelvis.y;
    p.leftElbow.x = nodes.leftElbow.x; p.leftElbow.y = nodes.leftElbow.y;
    p.rightElbow.x = nodes.rightElbow.x; p.rightElbow.y = nodes.rightElbow.y;
    p.leftHand.x = nodes.leftHand.x; p.leftHand.y = nodes.leftHand.y;
    p.rightHand.x = nodes.rightHand.x; p.rightHand.y = nodes.rightHand.y;
    p.leftKnee.x = nodes.leftKnee.x; p.leftKnee.y = nodes.leftKnee.y;
    p.rightKnee.x = nodes.rightKnee.x; p.rightKnee.y = nodes.rightKnee.y;
    p.leftFoot.x = nodes.leftFoot.x; p.leftFoot.y = nodes.leftFoot.y;
    p.rightFoot.x = nodes.rightFoot.x; p.rightFoot.y = nodes.rightFoot.y;
  }

  // Constraint-relaxation solver: move one joint and keep every bone length.
  solveRelaxation(activeKey, target) {
    const nodes = this._workingNodes();

    // Head is driven by the chest, so dragging it moves the chest/neck.
    const pinned =
      activeKey === 'head' ? 'chest' :
      activeKey === 'neck' ? 'chest' :
      activeKey === 'hip' ? 'pelvis' : activeKey;

    // Anchor the pelvis when dragging the upper body/limbs; anchor the chest
    // when dragging the pelvis so the rest of the body stays put.
    const root = pinned === 'pelvis' ? 'chest' : 'pelvis';

    nodes[pinned].x = target.x;
    nodes[pinned].y = target.y;

    for (let pass = 0; pass < 45; pass++) {
      this.BONES.forEach(([aName, bName]) => {
        const a = nodes[aName], b = nodes[bName];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1e-6;
        const correction = (len - this.BONE_LENGTHS[aName + ':' + bName]) / len;
        const aFixed = aName === root || aName === pinned;
        const bFixed = bName === root || bName === pinned;
        if (aFixed && bFixed) return;
        if (aFixed) { b.x -= dx * correction; b.y -= dy * correction; }
        else if (bFixed) { a.x += dx * correction; a.y += dy * correction; }
        else { a.x += dx * correction * 0.5; a.y += dy * correction * 0.5; b.x -= dx * correction * 0.5; b.y -= dy * correction * 0.5; }
      });
      nodes[pinned].x = target.x;
      nodes[pinned].y = target.y;
    }

    this._writeBack(nodes);
  }

  _move(e) {
    if (!this._mode) {
      this.canvas.style.cursor = this.hitJoint(this.getPos(e)) ? 'grab' : 'default';
      return;
    }
    const st = this.store.state;
    const pos = this.getPos(e);

    if (this._mode === 'scroll') {
      const dy = (e.clientY - this._lastY) / 40;
      this._lastY = e.clientY;
      st.eyeHeightM = Math.max(0, st.eyeHeightM + dy);
      st.heightM = st.eyeHeightM;
      st.camY = st.subjectY - st.eyeHeightM * st.scale;
      this.store.commit();
      return;
    }

    const meta = st.personFrame;
    if (!meta.heightPx) return;
    const nx = (pos.x - meta.cx) / meta.heightPx;
    let ny = this.clamp((pos.y - meta.headY) / meta.heightPx, 0, 1);

    // Keep the same per-joint range limits as the previous behavior.
    if (this._active === 'head' || this._active === 'neck') {
      ny = this.clamp(ny, 0.05, 0.3);
    } else if (this._active === 'hip') {
      ny = this.clamp(ny, 0.3, 0.8);
    } else if (this._active === 'leftFoot' || this._active === 'rightFoot') {
      ny = Math.max(ny, 0.5);
    }

    this.solveRelaxation(this._active, { x: nx, y: ny });
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

    // Camera vertical tilt (canvas convention: positive = looking down/downward).
    const tilt = st.angleV || 0;
    const distM = st.distanceM || 3;
    // In portrait orientation the "vertical" direction on the frame actually
    // corresponds to the sensor's horizontal FOV.
    const verticalFovDeg = isPortrait ? (st.fovHdeg || 39.6) : (st.fovVdeg || 27);
    const halfFovRad = verticalFovDeg * Math.PI / 360;

    // Perspective projection: world height wm (on the plane distM ahead of the
    // camera) -> screen y
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

    // Grid
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
        ctx.fillText(i18n.eyeHeight + ' ' + eyeH.toFixed(2) + 'm', 8, eyeY - 6);
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
    ctx.fillText(i18n[st.shotTypeKey], W - 16, 32);
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px sans-serif';
    ctx.fillText(i18n.fovHeight + ' ' + st.verticalFovM.toFixed(2) + 'm', W - 16, 52);

    ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(i18n.personDragHint, 12, H - 12);
  }

  drawSkeleton() {
    const st = this.store.state;
    const { cx, headY, heightPx } = st.personFrame;
    if (heightPx <= 0) return;
    const p = st.pose;
    const toS = (j) => ({ x: cx + j.x * heightPx, y: headY + j.y * heightPx });

    // Internal topology: chest is stored as pose.neck, pelvis as pose.hip,
    // and the head is derived from the chest (no separate shoulder points).
    const chest = { x: p.neck.x, y: p.neck.y };
    const pelvis = { x: p.hip.x, y: p.hip.y };
    const head = { x: chest.x, y: chest.y - this.BONE.headR };

    const S = {
      neck: toS(chest),
      hip: toS(pelvis),
      head: toS(head),
      leftHand: toS(p.leftHand), rightHand: toS(p.rightHand),
      leftFoot: toS(p.leftFoot), rightFoot: toS(p.rightFoot),
      leftElbow: toS(p.leftElbow), rightElbow: toS(p.rightElbow),
      leftKnee: toS(p.leftKnee), rightKnee: toS(p.rightKnee)
    };
    p._screen = S;

    const ctx = this.ctx;
    ctx.lineCap = 'round';

    // Draw bones in the demo's layered style: thick torso, thinner limbs.
    const bones = [
      ['hip', 'neck', this.BONE.torsoW],
      ['neck', 'head', this.BONE.limbW],
      ['neck', 'leftElbow', this.BONE.limbW], ['leftElbow', 'leftHand', this.BONE.limbW],
      ['neck', 'rightElbow', this.BONE.limbW], ['rightElbow', 'rightHand', this.BONE.limbW],
      ['hip', 'leftKnee', this.BONE.limbW], ['leftKnee', 'leftFoot', this.BONE.limbW],
      ['hip', 'rightKnee', this.BONE.limbW], ['rightKnee', 'rightFoot', this.BONE.limbW]
    ];
    ctx.strokeStyle = '#22c55e';
    bones.forEach(([a, b, w]) => {
      ctx.lineWidth = w * heightPx;
      ctx.beginPath();
      ctx.moveTo(S[a].x, S[a].y);
      ctx.lineTo(S[b].x, S[b].y);
      ctx.stroke();
    });

    // Head: filled circle with outline (demo style).
    const headR = this.BONE.headR * heightPx;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(S.head.x, S.head.y, headR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();

    // Joint dots (demo style).
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const joints = ['neck', 'hip', 'leftElbow', 'rightElbow', 'leftKnee', 'rightKnee', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
    joints.forEach((k) => {
      ctx.beginPath(); ctx.arc(S[k].x, S[k].y, this.BONE.jointR, 0, Math.PI * 2); ctx.fill();
    });

    ctx.lineCap = 'butt';
  }
}

window.PortraitView = PortraitView;
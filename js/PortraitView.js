/**
 * PortraitView.js
 * Portrait framing view (class)
 *
 * init(store) binds canvas interactions (joint dragging / vertical scroll to
 * adjust eye height / image upload, zoom, and pan).
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

    // Stick figure colors: red head, complementary teal body.
    this.COLORS = {
      head: '#ef4444',
      headStroke: '#f87171',
      body: '#2dd4bf',
      joint: '#f87171'
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

    // Interaction state.
    this._mode = null;                // 'joint' | 'scroll' | 'pan'
    this._active = null;
    this._lastX = 0;
    this._lastY = 0;
    this._lastPos = { x: 0, y: 0 };
    this._panX = 0;                   // Horizontal pan of the stick figure (fraction of heightPx)

    // Uploaded reference image state.
    this._image = null;
    this._imageLoaded = false;
    this._imageScale = 1;
    this._imageOffsetX = 0;
    this._imageOffsetY = 0;
    this._interaction = 'pose';       // 'pose' | 'pan'
  }

  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Reset the stick figure's horizontal pan offset.
  resetPan() {
    this._panX = 0;
    this.render();
  }

  init(store) {
    this.store = store;
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', () => this._stop());
    canvas.addEventListener('pointercancel', () => this._stop());
    canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

    this._initImageControls();
  }

  // Wire up the image upload / remove / mode buttons owned by the toolbar.
  _initImageControls() {
    const uploadBtn = document.getElementById('personImageUploadBtn');
    const fileInput = document.getElementById('personImageInput');
    const removeBtn = document.getElementById('removePersonImageBtn');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => this._loadImage(fileInput.files[0]));
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => this._removeImage());
    }

    document.querySelectorAll('.person-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => this._setInteraction(btn.getAttribute('data-mode')));
    });
  }

  _setInteraction(mode) {
    this._interaction = mode;
    document.querySelectorAll('.person-mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    this.canvas.style.cursor = (mode === 'pan' && this._imageLoaded) ? 'grab' : 'default';
  }

  _loadImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this._image = img;
        this._imageLoaded = true;
        this._fitImage();
        const removeBtn = document.getElementById('removePersonImageBtn');
        if (removeBtn) removeBtn.hidden = false;
        this.canvas.style.cursor = this._interaction === 'pan' ? 'grab' : 'default';
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  _removeImage() {
    this._image = null;
    this._imageLoaded = false;
    const removeBtn = document.getElementById('removePersonImageBtn');
    if (removeBtn) removeBtn.hidden = true;
    this.canvas.style.cursor = 'default';
    this.render();
  }

  // Fit the image inside the canvas (contain), centered.
  _fitImage() {
    if (!this._image) return;
    const w = this.canvas.width, h = this.canvas.height;
    const scale = Math.min(w / this._image.naturalWidth, h / this._image.naturalHeight);
    this._imageScale = scale;
    this._imageOffsetX = (w - this._image.naturalWidth * scale) / 2;
    this._imageOffsetY = (h - this._image.naturalHeight * scale) / 2;
  }

  _zoomImage(factor, cx, cy) {
    const worldX = (cx - this._imageOffsetX) / this._imageScale;
    const worldY = (cy - this._imageOffsetY) / this._imageScale;
    this._imageScale = Math.max(0.1, Math.min(10, this._imageScale * factor));
    this._imageOffsetX = cx - worldX * this._imageScale;
    this._imageOffsetY = cy - worldY * this._imageScale;
  }

  _onWheel(e) {
    if (!this._imageLoaded) return;
    e.preventDefault();
    const pos = this.getPos(e);
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this._zoomImage(factor, pos.x, pos.y);
    this.render();
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

    // In pan mode (with an image loaded), dragging the empty canvas pans the image.
    if (this._interaction === 'pan' && this._imageLoaded) {
      this._mode = 'pan';
      this._lastPos = pos;
      this.canvas.style.cursor = 'grabbing';
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }

    const j = this.hitJoint(pos);
    if (j) { this._mode = 'joint'; this._active = j; }
    else { this._mode = 'scroll'; this._lastX = e.clientX; this._lastY = e.clientY; }
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
      // Hover feedback only.
      if (this._interaction === 'pan' && this._imageLoaded) {
        this.canvas.style.cursor = 'grab';
      } else {
        this.canvas.style.cursor = this.hitJoint(this.getPos(e)) ? 'grab' : 'default';
      }
      return;
    }

    const st = this.store.state;
    const pos = this.getPos(e);

    // Pan the uploaded reference image.
    if (this._mode === 'pan') {
      this._imageOffsetX += pos.x - this._lastPos.x;
      this._imageOffsetY += pos.y - this._lastPos.y;
      this._lastPos = pos;
      this.render();
      return;
    }

    if (this._mode === 'scroll') {
      const meta = st.personFrame;
      // Horizontal drag pans the whole stick figure left/right.
      if (meta.heightPx) {
        this._panX += (e.clientX - this._lastX) / meta.heightPx;
      }
      const dy = (e.clientY - this._lastY) / 40;
      this._lastX = e.clientX;
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
    if (this._mode === 'pan') {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
    this._mode = null; this._active = null;
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

    // Grid (background reference).
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let j = 0; j < H; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

    // Draw the uploaded reference image clipped to the orange frame.
    if (this._imageLoaded && this._image) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(frameLeft, frameTop, fw, fh);
      ctx.clip();
      ctx.translate(this._imageOffsetX, this._imageOffsetY);
      ctx.scale(this._imageScale, this._imageScale);
      ctx.drawImage(this._image, 0, 0, this._image.naturalWidth, this._image.naturalHeight);
      ctx.restore();
    }

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
    const panPx = this._panX * heightPx;
    const toS = (j) => ({ x: cx + j.x * heightPx + panPx, y: headY + j.y * heightPx });

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
    ctx.strokeStyle = this.COLORS.body;
    bones.forEach(([a, b, w]) => {
      ctx.lineWidth = w * heightPx;
      ctx.beginPath();
      ctx.moveTo(S[a].x, S[a].y);
      ctx.lineTo(S[b].x, S[b].y);
      ctx.stroke();
    });

    // Head: filled circle with outline (red).
    const headR = this.BONE.headR * heightPx;
    ctx.fillStyle = this.COLORS.head;
    ctx.beginPath(); ctx.arc(S.head.x, S.head.y, headR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this.COLORS.headStroke; ctx.lineWidth = 2; ctx.stroke();

    // Joint dots.
    ctx.fillStyle = this.COLORS.joint;
    const joints = ['neck', 'hip', 'leftElbow', 'rightElbow', 'leftKnee', 'rightKnee', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
    joints.forEach((k) => {
      ctx.beginPath(); ctx.arc(S[k].x, S[k].y, this.BONE.jointR, 0, Math.PI * 2); ctx.fill();
    });

    ctx.lineCap = 'butt';
  }
}

window.PortraitView = PortraitView;
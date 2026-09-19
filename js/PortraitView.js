/**
 * PortraitView.js
 * Portrait framing view (class).
 *
 * Responsibilities:
 *  - Framing overlay (orange frame) + perspective projection of the figure.
 *  - Uploaded reference image (upload / remove / zoom / pan, clipped to the frame).
 *  - Manages a StickMan instance that owns the skeleton and its interactions.
 *
 * StickMan exposes its current relative position (horizontal pan and mirrored
 * vertical offset that affects camera height) through the shared data model, so
 * this view reads only from store.state and never touches the joint data.
 */
class PortraitView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = null;

    // Uploaded reference image state.
    this._image = null;
    this._imageLoaded = false;
    this._imageScale = 1;
    this._imageOffsetX = 0;
    this._imageOffsetY = 0;

    // Interaction mode: 'pose' (stick man) | 'pan' (image).
    this._interaction = 'pose';
    this._mode = null;          // 'image' | 'pose'
    this._lastPos = { x: 0, y: 0 };
    this._active = false;       // A pointer interaction is currently active.
  }

  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  init(store) {
    this.store = store;
    this.stickMan = new StickMan(this.canvas, store);

    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', () => this._stop());
    canvas.addEventListener('pointercancel', () => this._stop());
    canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });

    this._initControls();
  }

  // Wire up the image upload / remove / mode / dice buttons.
  _initControls() {
    const uploadBtn = document.getElementById('personImageUploadBtn');
    const fileInput = document.getElementById('personImageInput');
    const removeBtn = document.getElementById('removePersonImageBtn');
    const diceBtn = document.getElementById('randomPoseBtn');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => this._loadImage(fileInput.files[0]));
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => this._removeImage());
    }
    if (diceBtn) {
      diceBtn.addEventListener('click', () => this._randomPose());
    }

    document.querySelectorAll('.person-mode-btn[data-mode]').forEach((btn) => {
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

  _randomPose() {
    if (!this.stickMan) return;
    this.stickMan.randomPose();
    this.store.commit();
  }

  // Reset the stick figure plus any framing offsets.
  reset() {
    if (this.stickMan) this.stickMan.reset();
  }

  // The smallest zoom-out keeps the image at half of the orange frame (1/2).
  _minImageScale() {
    if (!this._image) return 0.1;
    const frame = this._frameRect();
    const fit = Math.min(
      frame.width / this._image.naturalWidth,
      frame.height / this._image.naturalHeight
    );
    return fit * 0.5;
  }

  // Fit the image inside the canvas (contain), centered.
  _fitImage() {
    if (!this._image) return;
    const w = this.canvas.width, h = this.canvas.height;
    const scale = Math.max(
      Math.min(w / this._image.naturalWidth, h / this._image.naturalHeight),
      this._minImageScale()
    );
    this._imageScale = scale;
    this._imageOffsetX = (w - this._image.naturalWidth * scale) / 2;
    this._imageOffsetY = (h - this._image.naturalHeight * scale) / 2;
  }

  _zoomImage(factor, cx, cy) {
    const worldX = (cx - this._imageOffsetX) / this._imageScale;
    const worldY = (cy - this._imageOffsetY) / this._imageScale;
    const minScale = this._minImageScale();
    this._imageScale = Math.max(minScale, Math.min(10, this._imageScale * factor));
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

  // Compute the orange frame rectangle.
  _frameRect() {
    const st = this.store.state;
    const W = this.canvas.width, H = this.canvas.height;
    const isPortrait = st.orientation === 'portrait';
    const frameAspect = isPortrait ? st.sensor.h / st.sensor.w : st.sensor.w / st.sensor.h;

    const frameH = H * 0.86;
    const frameW = Math.min(frameH * frameAspect, W * 0.92);
    const fh = Math.min(frameH, frameW / frameAspect);
    const fw = fh * frameAspect;
    return {
      left: (W - fw) / 2,
      top: (H - fh) / 2,
      width: fw,
      height: fh,
      aspect: frameAspect
    };
  }

  _down(e) {
    // Disable interaction while framing lock is active
    if (this.store.state.fovLock) return;
    const pos = this.getPos(e);

    // In pan mode (with an image loaded), dragging pans the image.
    if (this._interaction === 'pan' && this._imageLoaded) {
      this._mode = 'image';
      this._lastPos = pos;
      this._active = true;
      this.canvas.style.cursor = 'grabbing';
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }

    // Otherwise delegate to the stick man.
    this._mode = 'pose';
    this._active = true;
    this.stickMan.pointerDown(pos, e.clientX, e.clientY);
    this.canvas.setPointerCapture(e.pointerId);
  }

  _move(e) {
    const pos = this.getPos(e);

    // No active interaction: just update the hover cursor.
    if (!this._active) {
      if (this._interaction === 'pan' && this._imageLoaded) {
        this.canvas.style.cursor = 'grab';
      } else if (this.stickMan) {
        this.canvas.style.cursor = this.stickMan.hover(pos);
      }
      return;
    }

    if (this._mode === 'image') {
      this._imageOffsetX += pos.x - this._lastPos.x;
      this._imageOffsetY += pos.y - this._lastPos.y;
      this._lastPos = pos;
      this.render();
      return;
    }

    if (this._mode === 'pose' && this.stickMan) {
      this.stickMan.pointerMove(pos, e.clientX, e.clientY);
    }
  }

  _stop() {
    if (this._mode === 'image') {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
    if (this.stickMan) this.stickMan.pointerUp();
    this._mode = null;
    this._active = false;
  }

  render() {
    const st = this.store.state;
    if (!st.sensor) return;

    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    const frame = this._frameRect();
    const isPortrait = st.orientation === 'portrait';

    const avgH = st.avgPersonHeight;
    const eyeH = st.eyeHeightM != null ? st.eyeHeightM : 1.6;
    const frameCenterY = frame.top + frame.height / 2;
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
      return frameCenterY - norm * (frame.height / 2);
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
      ctx.rect(frame.left, frame.top, frame.width, frame.height);
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

    // Delegate the stick figure rendering to the engine.
    if (this.stickMan) {
      this.stickMan.render(st.personFrame);
    }

    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3;
    ctx.strokeRect(frame.left, frame.top, frame.width, frame.height);

    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(i18n[st.shotTypeKey], W - 16, 32);
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px sans-serif';
    ctx.fillText(i18n.fovHeight + ' ' + st.verticalFovM.toFixed(2) + 'm', W - 16, 52);

    ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(i18n.personDragHint, 12, H - 12);
  }
}

window.PortraitView = PortraitView;
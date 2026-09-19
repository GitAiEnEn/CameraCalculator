/**
 * stickMan.js
 * Stick figure engine (class).
 *
 * StickMan privately owns the stick figure skeleton (joint positions, bone
 * definitions, bone lengths) and is responsible for rendering the figure and
 * handling its interactions:
 *   - dragging a joint re-poses the skeleton (constraint-relaxation solver);
 *   - dragging empty space moves the figure left/right and up/down (the vertical
 *     offset feeds back into the camera height).
 *
 * The figure's *relative position* (the horizontal pan offset and the vertical
 * offset that affects camera height / eye height) is written back into the
 * shared data model (Store.state.personView.panX and Store.state.eyeHeightM) so
 * PortraitView and the rest of the app read a single source of truth.
 *
 * The raw joint data never leaves this class.
 */
class StickMan {
  constructor(canvas, store) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;

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

    // Rest pose: also defines the reference bone lengths.
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

    // Private joint skeleton (pose space).
    this._joints = this._cloneJoints(this.REFERENCE);

    // Pre-built photo poses: every one is normalized so that all body part
    // lengths stay identical to the reference skeleton.
    this.POSES = this._buildPoses();

    // Screen-space joint cache used for hit testing (private).
    this._screen = null;

    // Interaction state: 'joint' | 'scroll' | null.
    this._mode = null;
    this._active = null;
    this._lastX = 0;
    this._lastY = 0;
  }

  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ----- Private joint helpers -----

  _cloneJoints(src) {
    const out = {};
    Object.keys(this.REFERENCE).forEach((k) => {
      out[k] = { x: src[k].x, y: src[k].y };
    });
    return out;
  }

  _workingNodes() {
    return this._cloneJoints(this._joints);
  }

  _writeBack(nodes) {
    Object.keys(this.REFERENCE).forEach((k) => {
      this._joints[k].x = nodes[k].x;
      this._joints[k].y = nodes[k].y;
    });
  }

  // Build a valid pose from approximate joint targets, anchoring the pelvis at
  // the root and relaxing every bone back to its reference length.
  _normalize(targets) {
    const nodes = this._cloneJoints(targets);
    nodes.pelvis.x = 0.0;
    nodes.pelvis.y = 0.50;

    for (let pass = 0; pass < 80; pass++) {
      this.BONES.forEach(([aName, bName]) => {
        const a = nodes[aName], b = nodes[bName];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1e-6;
        const correction = (len - this.BONE_LENGTHS[aName + ':' + bName]) / len;
        const aFixed = aName === 'pelvis';
        const bFixed = bName === 'pelvis';
        if (aFixed && bFixed) return;
        if (aFixed) { b.x -= dx * correction; b.y -= dy * correction; }
        else if (bFixed) { a.x += dx * correction; a.y += dy * correction; }
        else {
          a.x += dx * correction * 0.5; a.y += dy * correction * 0.5;
          b.x -= dx * correction * 0.5; b.y -= dy * correction * 0.5;
        }
      });
      nodes.pelvis.x = 0.0;
      nodes.pelvis.y = 0.50;
    }
    return nodes;
  }

  // ----- Photo pose library (raw approximate targets) -----

  _buildPoses() {
    const base = () => this._cloneJoints(this.REFERENCE);

    // 1. Default / ready.
    const neutral = base();

    // 2. Both arms raised.
    const armsUp = base();
    armsUp.leftElbow = { x: -0.28, y: 0.02 };
    armsUp.rightElbow = { x: 0.28, y: 0.02 };
    armsUp.leftHand = { x: -0.16, y: -0.18 };
    armsUp.rightHand = { x: 0.16, y: -0.18 };

    // 3. Hands on hips.
    const handsOnHips = base();
    handsOnHips.leftElbow = { x: -0.26, y: 0.38 };
    handsOnHips.rightElbow = { x: 0.26, y: 0.38 };
    handsOnHips.leftHand = { x: -0.14, y: 0.52 };
    handsOnHips.rightHand = { x: 0.14, y: 0.52 };

    // 4. Left arm raised, right hand on hip.
    const oneArmUp = base();
    oneArmUp.leftElbow = { x: -0.28, y: 0.02 };
    oneArmUp.leftHand = { x: -0.16, y: -0.18 };
    oneArmUp.rightElbow = { x: 0.26, y: 0.38 };
    oneArmUp.rightHand = { x: 0.14, y: 0.52 };

    // 5. Arms crossed in front of the chest.
    const armsCrossed = base();
    armsCrossed.leftElbow = { x: -0.20, y: 0.26 };
    armsCrossed.rightElbow = { x: 0.20, y: 0.26 };
    armsCrossed.leftHand = { x: -0.04, y: 0.34 };
    armsCrossed.rightHand = { x: 0.04, y: 0.34 };

    // 6. Walking stride (legs split, arms swinging back and forth).
    const walking = base();
    walking.leftKnee = { x: -0.15, y: 0.72 };
    walking.leftFoot = { x: -0.28, y: 0.97 };
    walking.rightKnee = { x: 0.14, y: 0.72 };
    walking.rightFoot = { x: 0.26, y: 0.97 };
    walking.leftElbow = { x: -0.10, y: 0.24 };
    walking.leftHand = { x: 0.06, y: 0.35 };
    walking.rightElbow = { x: 0.20, y: 0.24 };
    walking.rightHand = { x: 0.34, y: 0.36 };

    return [neutral, armsUp, handsOnHips, oneArmUp, armsCrossed, walking]
      .map((joints) => this._normalize(joints));
  }

  // ----- Public API (used by PortraitView) -----

  // Reset the skeleton to the reference pose and clear the horizontal pan.
  reset() {
    this._joints = this._cloneJoints(this.REFERENCE);
    this.store.state.personView.panX = 0;
    this._mode = null;
    this._active = null;
  }

  // Randomly select a pre-built photo pose (all poses share identical bone lengths).
  randomPose() {
    const pose = this.POSES[Math.floor(Math.random() * this.POSES.length)];
    this._joints = this._cloneJoints(pose);
  }

  // Hit test a screen-space point against the cached joints.
  hitJoint(pos) {
    const S = this._screen || {};
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

  // Hover feedback (returns a CSS cursor string).
  hover(pos) {
    return this.hitJoint(pos) ? 'grab' : 'default';
  }

  isActive() {
    return this._mode !== null;
  }

  // Start a pointer interaction (joint drag or figure scroll).
  pointerDown(pos, clientX, clientY) {
    const j = this.hitJoint(pos);
    if (j) {
      this._mode = 'joint';
      this._active = j;
    } else {
      this._mode = 'scroll';
      this._lastX = clientX;
      this._lastY = clientY;
    }
  }

  // Continue the current interaction.
  pointerMove(pos, clientX, clientY) {
    if (!this._mode) return;
    const st = this.store.state;

    if (this._mode === 'scroll') {
      const meta = st.personFrame;
      // Horizontal drag pans the whole stick figure left/right.
      if (meta.heightPx) {
        st.personView.panX += (clientX - this._lastX) / meta.heightPx;
      }
      const dy = (clientY - this._lastY) / 40;
      this._lastX = clientX;
      this._lastY = clientY;
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

    this._solve(this._active, { x: nx, y: ny });
    this.store.commit();
  }

  pointerUp() {
    this._mode = null;
    this._active = null;
  }

  // Move one joint while keeping every bone length (constraint relaxation).
  // The dragged joint is pulled toward the pointer, but every bone (torso and
  // limbs included) is relaxed back to its fixed reference length each pass, so
  // body parts never stretch.
  _solve(activeKey, target) {
    const nodes = this._workingNodes();

    // Head is driven by the chest, so dragging it moves the chest/neck.
    const pinned =
      activeKey === 'head' ? 'chest' :
      activeKey === 'neck' ? 'chest' :
      activeKey === 'hip' ? 'pelvis' : activeKey;

    // Anchor the pelvis when dragging the upper body/limbs; anchor the chest
    // when dragging the pelvis, so the opposite end of the torso stays put.
    const root = pinned === 'pelvis' ? 'chest' : 'pelvis';
    const anchor = { x: nodes[root].x, y: nodes[root].y };

    for (let pass = 0; pass < 60; pass++) {
      // Pull the dragged node toward the pointer.
      nodes[pinned].x += (target.x - nodes[pinned].x) * 0.4;
      nodes[pinned].y += (target.y - nodes[pinned].y) * 0.4;

      // Relax every bone back to its reference length, keeping the root fixed.
      for (let sub = 0; sub < 3; sub++) {
        this.BONES.forEach(([aName, bName]) => {
          const a = nodes[aName], b = nodes[bName];
          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1e-6;
          const correction = (len - this.BONE_LENGTHS[aName + ':' + bName]) / len;
          const aFixed = aName === root;
          const bFixed = bName === root;
          if (aFixed && bFixed) return;
          if (aFixed) { b.x -= dx * correction; b.y -= dy * correction; }
          else if (bFixed) { a.x += dx * correction; a.y += dy * correction; }
          else {
            a.x += dx * correction * 0.5; a.y += dy * correction * 0.5;
            b.x -= dx * correction * 0.5; b.y -= dy * correction * 0.5;
          }
        });
        nodes[root].x = anchor.x;
        nodes[root].y = anchor.y;
      }
    }

    this._writeBack(nodes);
  }

  // Render the stick figure using the frame meta computed by PortraitView.
  render(frame) {
    if (!frame || frame.heightPx <= 0) return;

    const { cx, headY, heightPx } = frame;
    const panPx = (this.store.state.personView.panX || 0) * heightPx;
    const toS = (j) => ({ x: cx + j.x * heightPx + panPx, y: headY + j.y * heightPx });

    // Internal topology: chest is stored as pose.chest, pelvis as pose.pelvis,
    // and the head is derived from the chest (no separate shoulder points).
    const p = this._joints;
    const chest = { x: p.chest.x, y: p.chest.y };
    const pelvis = { x: p.pelvis.x, y: p.pelvis.y };
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
    this._screen = S;

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

window.StickMan = StickMan;
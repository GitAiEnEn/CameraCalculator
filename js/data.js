/**
 * data.js
 * Central data model (reactive state) - the single source of truth.
 *
 * Responsibilities:
 *  - Raw inputs (focal length / aperture / distance / format / orientation / subject ...)
 *  - Camera position, angle, height
 *  - Portrait skeleton pose
 *  - All derived intermediate values (FOV, framing, shot type, DoF, bokeh ...)
 *
 * Any change should go through Store.update() / Store.commit():
 *   update(patch) merges raw inputs then recomputes once;
 *   commit()      recomputes after view-driven direct mutations;
 * Both recompute() then notify(), so every subscribed component reacts.
 */

(function (global) {
  'use strict';

  const AVG_PERSON_HEIGHT = 1.7;

  const state = {
    // ---------- Raw inputs ----------
    sensor: null,          // { w, h, coc, pixels, name, nameEn, ... }
    focal: 50,             // Focal length (mm)
    aperture: 4,           // Aperture f-number
    distanceM: 3,          // Focus distance = shooting distance (m)
    orientation: 'landscape', // 'landscape' | 'portrait'
    mode: 'person',        // 'person' | 'object'
    subjectWidthRaw: 0.6,  // Object width input (m)
    subjectHeightRaw: 1.7, // Object height input (m)
    bgDistanceM: 10,       // Background / out-of-focus point distance (m)
    bgLightSizeM: 0,       // Out-of-focus light source physical diameter (m)
    cocPreset: 'normal',   // '' | 'normal' | 'loose' | 'strict'
    cocValue: 0.030,       // Custom CoC (mm)
    eyeHeightM: 1.6,       // Camera height above ground / portrait-mode camera height (m)
    heightM: 1.6,          // Object-mode camera height (m)

    fovLock: false,        // Framing lock
    lockFrameM: null,      // Vertical FOV height (m) recorded when locked

    // ---------- Camera & scene ----------
    camX: 0,
    camY: 0,
    angleH: 0,             // Horizontal reference angle
    angleV: 0,             // Vertical reference angle (positive = looking down)
    autoOrient: true,
    dragging: false,
    scale: 60,
    subjectX: 0,
    subjectY: 0,

    avgPersonHeight: AVG_PERSON_HEIGHT,

    // ---------- Portrait framing view / skeleton pose ----------
    personView: { cropOffsetM: 0 },
    pose: {
      neck:       { x: 0.0,  y: 0.16 },
      hip:        { x: 0.0,  y: 0.50 },
      leftHand:   { x: -0.28, y: 0.38 },
      rightHand:  { x: 0.28,  y: 0.38 },
      leftFoot:   { x: -0.08, y: 1.00 },
      rightFoot:  { x: 0.08,  y: 1.00 },
      leftElbow:  { x: -0.14, y: 0.26 },
      rightElbow: { x: 0.14,  y: 0.26 },
      leftKnee:   { x: -0.03, y: 0.75 },
      rightKnee:  { x: 0.03,  y: 0.75 },
      _screen: {}
    },
    personFrame: { cx: 0, headY: 0, footY: 0, heightPx: 0 },

    // ---------- Derived data (computed by recompute) ----------
    coc: 0.030,
    crop: 1,
    equivFocal: 50,
    fovHdeg: 39.6,
    fovVdeg: 27,
    m: 0,
    fovWidthM: 2.16,
    fovHeightM: 1.44,
    verticalFovM: 1.44,
    shotTypeKey: 'shotTypeFS',
    subjectW: 0.6,          // Actual subject width (fixed 0.6 for person)
    subjectH: AVG_PERSON_HEIGHT, // Actual subject height (fixed height for person)
    refHeightM: AVG_PERSON_HEIGHT,
    horizontalHeightM: 0.3,
    entrancePupilMm: 12.5,
    bokehBlurLevel: 4,
    dof: null,
    bokehMm: 0
  };

  // ---------- Derived computation ----------
  function resolveCoc() {
    if (!state.sensor) return state.cocValue;
    const p = state.cocPreset;
    if (p === 'normal' || p === 'loose' || p === 'strict') {
      return cocForPreset(state.sensor, p);
    }
    const custom = state.cocValue;
    return isFinite(custom) && custom > 0 ? custom : state.sensor.coc;
  }

  function recompute() {
    const sensor = state.sensor;
    if (!sensor) return;

    const focal = state.focal;
    const aperture = state.aperture;

    // Actual subject size (fixed for person)
    if (state.mode === 'person') {
      state.subjectW = 0.6;
      state.subjectH = AVG_PERSON_HEIGHT;
    } else {
      state.subjectW = state.subjectWidthRaw || 0;
      state.subjectH = state.subjectHeightRaw || 0;
    }
    state.refHeightM = AVG_PERSON_HEIGHT;
    state.horizontalHeightM = state.subjectW / 2;

    // Framing lock: keep vertical FOV height fixed, derive focus distance
    if (state.fovLock && state.lockFrameM != null) {
      const effSensor = state.orientation === 'portrait' ? sensor.w : sensor.h;
      state.distanceM = state.lockFrameM * focal / effSensor;
    }

    const distance = state.distanceM * 1000;
    const coc = resolveCoc();
    state.coc = coc;

    state.crop = cropFactor(sensor);
    state.equivFocal = focal * state.crop;
    state.fovHdeg = Calc.fieldOfView(sensor.w, focal);
    state.fovVdeg = Calc.fieldOfView(sensor.h, focal);
    state.m = Calc.magnification(focal, distance);
    state.fovWidthM = (sensor.w / focal) * distance / 1000;
    state.fovHeightM = (sensor.h / focal) * distance / 1000;
    state.verticalFovM = state.orientation === 'portrait' ? state.fovWidthM : state.fovHeightM;

    state.shotTypeKey = state.mode === 'person'
      ? Calc.classifyPersonShot(state.subjectH, state.verticalFovM).key
      : '';

    state.entrancePupilMm = Calc.entrancePupil(focal, aperture);
    state.dof = Calc.depthOfField(focal, aperture, coc, distance);
    state.bokehMm = Calc.bokehDiameter(
      focal, aperture, distance,
      state.bgDistanceM * 1000, state.bgLightSizeM * 1000
    );
    state.bokehBlurLevel = Calc.blurLevel(state.bokehMm, sensor.w).level;

    // Camera position (derived from focus distance + camera height when not dragging)
    if (!state.dragging) {
      state.camX = state.subjectX - state.distanceM * state.scale;
      const camH = state.mode === 'person' ? state.eyeHeightM : state.heightM;
      state.camY = state.subjectY - camH * state.scale;
      if (state.autoOrient) {
        if (state.mode === 'person') {
          const aimTargetM = AVG_PERSON_HEIGHT - 0.1;
          state.angleV = Math.atan2(camH - aimTargetM, state.distanceM);
          state.angleH = 0;
        } else {
          const base = Math.atan2(state.subjectY - state.camY, state.subjectX - state.camX);
          state.angleH = base;
          state.angleV = base;
        }
        state.autoOrient = false;
      }
    }
  }

  // ---------- Subscribe / notify ----------
  const listeners = new Set();

  function listen(fn) {
    listeners.add(fn);
    return function unsubscribe() { listeners.delete(fn); };
  }

  function notify() {
    listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
  }

  // Merge raw inputs and recompute
  function update(patch) {
    Object.assign(state, patch);
    recompute();
    notify();
  }

  // Recompute and notify after view-driven direct mutations
  function commit() {
    recompute();
    notify();
  }

  function get() {
    return state;
  }

  global.Store = {
    state,
    listen,
    notify,
    update,
    commit,
    set: update, // legacy alias
    get,
    AVG_PERSON_HEIGHT
  };
})(window);
/**
 * data.js
 * 中央数据模型（响应式状态）—— 所有数据的唯一来源。
 *
 * 职责：
 *  - 原始输入（焦距/光圈/距离/画幅/方向/被摄物等）
 *  - 相机位置、角度、高度
 *  - 人像骨骼姿态
 *  - 由原始输入派生的所有计算中间量（视角、视野、景别、景深、焦外等）
 *
 * 任何修改都应通过 Store.update() / Store.commit() 进行：
 *   update(patch) 合并原始输入后统一 recompute()；
 *   commit()      用于视图直接修改后的重新计算；
 * 两者都会 recompute() 然后 notify()，所有订阅组件立即响应。
 */

(function (global) {
  'use strict';

  const AVG_PERSON_HEIGHT = 1.7;

  const state = {
    // ---------- 原始输入 ----------
    sensor: null,          // { w, h, coc, pixels, name, nameEn, ... }
    focal: 50,             // 焦距 (mm)
    aperture: 4,           // 光圈 f 值
    distanceM: 3,          // 对焦距离 = 拍摄距离 (m)
    orientation: 'landscape', // 'landscape' | 'portrait'
    mode: 'person',        // 'person' | 'object'
    subjectWidthRaw: 0.6,  // 物体水平宽度输入值 (m)
    subjectHeightRaw: 1.7, // 物体垂直高度输入值 (m)
    bgDistanceM: 10,       // 背景/焦外点距离 (m)
    bgLightSizeM: 0,       // 焦外光源实际直径 (m)
    cocPreset: 'normal',   // '' | 'normal' | 'loose' | 'strict'
    cocValue: 0.030,       // 自定义 CoC (mm)
    eyeHeightM: 1.6,       // 相机相对地面高度 / 人像模式相机高度 (m)
    heightM: 1.6,          // 物体模式相机高度 (m)

    fovLock: false,        // 构图锁定
    lockFrameM: null,      // 锁定时记录的垂直视野高度(米)

    // ---------- 相机与场景 ----------
    camX: 0,
    camY: 0,
    angleH: 0,             // 水平参考角度
    angleV: 0,             // 垂直参考角度（正=俯视）
    autoOrient: true,
    dragging: false,
    scale: 60,
    subjectX: 0,
    subjectY: 0,

    avgPersonHeight: AVG_PERSON_HEIGHT,

    // ---------- 人像构图视图 / 骨骼姿态 ----------
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

    // ---------- 派生数据（由 recompute 统一计算） ----------
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
    subjectW: 0.6,          // 实际被摄物宽度（人像固定 0.6）
    subjectH: AVG_PERSON_HEIGHT, // 实际被摄物高度（人像固定身高）
    refHeightM: AVG_PERSON_HEIGHT,
    horizontalHeightM: 0.3,
    entrancePupilMm: 12.5,
    bokehBlurLevel: 4,
    dof: null,
    bokehMm: 0
  };

  // ---------- 派生计算 ----------
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

    // 被摄物实际尺寸（人像固定）
    if (state.mode === 'person') {
      state.subjectW = 0.6;
      state.subjectH = AVG_PERSON_HEIGHT;
    } else {
      state.subjectW = state.subjectWidthRaw || 0;
      state.subjectH = state.subjectHeightRaw || 0;
    }
    state.refHeightM = AVG_PERSON_HEIGHT;
    state.horizontalHeightM = state.subjectW / 2;

    // 构图锁定：保持垂直视野高度不变，反推对焦距离
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

    // 相机位置（非拖动时由对焦距离 + 相机高度推导）
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

  // ---------- 订阅 / 通知 ----------
  const listeners = new Set();

  function listen(fn) {
    listeners.add(fn);
    return function unsubscribe() { listeners.delete(fn); };
  }

  function notify() {
    listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
  }

  // 合并原始输入并重新计算
  function update(patch) {
    Object.assign(state, patch);
    recompute();
    notify();
  }

  // 视图直接修改后重新计算并通知
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
    set: update, // 兼容旧写法
    get,
    AVG_PERSON_HEIGHT
  };
})(window);
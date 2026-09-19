/**
 * app.js
 * Camera Calculator - orchestration layer (thin view layer)
 *
 * Responsibilities:
 *  - Read input controls -> Store.update() writes into the data model
 *  - Listen to Store changes -> render result cards and each view
 *  - Mobile collapsing, tick marks, language switching, view reset
 *
 * Principle: all data (raw inputs + derived values) is managed by data.js.
 * Components only render and never compute or hold their own data copies.
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const el = {
    sensor: $('sensor'), sensorInfo: $('sensorInfo'),
    focal: $('focal'), focalRange: $('focalRange'),
    aperture: $('aperture'), apertureRange: $('apertureRange'),
    distance: $('distance'), distanceRange: $('distanceRange'),
    subjectType: $('subjectType'), orientation: $('orientation'),
    orientationWrap: $('orientationWrap'), subjectSizeGroup: $('subjectSizeGroup'),
    personHint: $('personHint'),
    subjectWidth: $('subjectWidth'), subjectHeight: $('subjectHeight'),
    eyeHeight: $('eyeHeight'),
    cocPreset: $('cocPreset'), cocValue: $('cocValue'),
    bgDistance: $('bgDistance'), bgLightSize: $('bgLightSize'),
    resetBtn: $('resetBtn'),

    rEquivFocal: $('rEquivFocal'), rFov: $('rFov'),
    rMagnification: $('rMagnification'), rFovWidth: $('rFovWidth'), rFovHeight: $('rFovHeight'),
    rImageWidth: $('rImageWidth'), rImageHeight: $('rImageHeight'),
    imageWidthCard: $('imageWidthCard'), imageHeightCard: $('imageHeightCard'),
    personImagingCard: $('personImagingCard'), rPersonImaging: $('rPersonImaging'),

    rDofTotal: $('rDofTotal'), rDofNear: $('rDofNear'), rDofFar: $('rDofFar'),
    rDofRange: $('rDofRange'), rHyperfocal: $('rHyperfocal'), rEntrancePupil: $('rEntrancePupil'),
    dofConclusion: $('dofConclusion'),

    rBokehSensor: $('rBokehSensor'), rBokehRatio: $('rBokehRatio'),
    rBokehPixels: $('rBokehPixels'), rBokehBlur: $('rBokehBlur'),

    personSceneWrap: $('personSceneWrap'), topViewWrap: $('topViewWrap'), sideViewWrap: $('sideViewWrap'),
    personCanvas: $('personCanvas'), sceneTopCanvas: $('sceneTopCanvas'), sceneSideCanvas: $('sceneSideCanvas'),
    dofCanvas: $('dofCanvas'), bokehCanvas: $('bokehCanvas'),

    resetPortraitBtn: $('resetPortraitBtn'), resetTopBtn: $('resetTopBtn'),
    resetSideBtn: $('resetSideBtn'), resetDofBtn: $('resetDofBtn'),
    compLockBtn: $('compLockBtn'), compLockIcon: $('compLockIcon')
  };

  const DEFAULTS = {
    focal: 50, aperture: 4, distance: 3,
    subjectType: 'person', orientation: 'landscape',
    subjectWidth: 0.6, subjectHeight: 1.7,
    cocPreset: 'normal', cocValue: 0.030,
    bgDistance: 10, bgLightSize: 0,
    eyeHeight: 1.6
  };

  const LOG = {
    focal:   { min: 10,  center: 50, max: 600 },
    aperture:{ min: 0.7, center: 4,  max: 32 },
    distance:{ min: 0.1, center: 3,  max: 50 }
  };

  const store = Store;
  const state = Store.state;

  let syncingCoC = false;
  let lastDistanceM = DEFAULTS.distance;
  let activeResultTab = 'basic';
  let activeInputGroup = 'basic';

  // ---------- View instances ----------
  const portraitView = new PortraitView(el.personCanvas);
  const topView = new CameraDistanceView(el.sceneTopCanvas, 'top', false);
  const sideView = new CameraDistanceView(el.sceneSideCanvas, 'side', true);
  const fieldView = new FieldVisualizationView(el.dofCanvas);
  const bokehView = new BokehPreview(el.bokehCanvas);

  // ---------- Formatting helpers (display only) ----------
  function fmt(num, digits) {
    if (!isFinite(num)) return '∞';
    if (num === 0) return '0';
    const abs = Math.abs(num);
    if (abs >= 1000) return num.toFixed(0);
    if (abs >= 100) return num.toFixed(1);
    if (abs >= 1) return num.toFixed(digits != null ? digits : 2);
    if (abs >= 0.01) return num.toFixed(3);
    return num.toExponential(2);
  }
  function fmtDistance(mm) {
    if (!isFinite(mm)) return '∞';
    const m = mm / 1000;
    if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
    if (m >= 1) return m.toFixed(2) + ' m';
    return (m * 100).toFixed(1) + ' cm';
  }

  // ---------- CoC helpers ----------
  function applyPresetToCoC(sensor) {
    const preset = el.cocPreset.value;
    if (preset === 'normal' || preset === 'loose' || preset === 'strict') {
      syncingCoC = true;
      el.cocValue.value = cocForPreset(sensor, preset).toFixed(3);
      syncingCoC = false;
    }
  }

  // ---------- Read input controls -> data model ----------
  function applyRawInputs() {
    const sensor = SENSOR_FORMATS[parseInt(el.sensor.value, 10)];
    if (!sensor) return;

    const focal = parseFloat(el.focal.value);
    const aperture = parseFloat(el.aperture.value);
    const distanceM = parseFloat(el.distance.value);
    const subjectWidthRaw = parseFloat(el.subjectWidth.value);
    const subjectHeightRaw = parseFloat(el.subjectHeight.value);
    const bgDistanceM = parseFloat(el.bgDistance.value);
    const bgLightSizeM = parseFloat(el.bgLightSize.value);
    const cocValue = parseFloat(el.cocValue.value);
    const eyeHeightM = parseFloat(el.eyeHeight.value);

    store.update({
      sensor,
      focal: isFinite(focal) ? focal : 1,
      aperture: isFinite(aperture) ? aperture : 1,
      distanceM: isFinite(distanceM) ? distanceM : 0.1,
      orientation: el.orientation.value,
      mode: el.subjectType.value,
      subjectWidthRaw: isFinite(subjectWidthRaw) ? subjectWidthRaw : 0,
      subjectHeightRaw: isFinite(subjectHeightRaw) ? subjectHeightRaw : 0,
      bgDistanceM: isFinite(bgDistanceM) ? bgDistanceM : 0,
      bgLightSizeM: isFinite(bgLightSizeM) ? bgLightSizeM : 0,
      cocPreset: el.cocPreset.value,
      cocValue: isFinite(cocValue) ? cocValue : 0.030,
      eyeHeightM: isFinite(eyeHeightM) ? eyeHeightM : 1.6,
      heightM: isFinite(eyeHeightM) ? eyeHeightM : 1.6
    });
  }

  // ---------- Sync background distance (follow focus distance changes) ----------
  function syncBgDistance() {
    const nd = parseFloat(el.distance.value);
    if (!isFinite(nd)) return;
    const delta = nd - lastDistanceM;
    if (delta !== 0) {
      el.bgDistance.value = Math.max(0.01, (parseFloat(el.bgDistance.value) || 0) + delta).toFixed(2);
    }
    lastDistanceM = nd;
  }

  function onDistanceChange() {
    syncBgDistance();
    applyRawInputs();
  }

  // ---------- Framing lock ----------
  function setCompLock(locked) {
    let lockFrameM = null;
    if (locked && state.sensor) {
      const effSensor = state.orientation === 'portrait' ? state.sensor.w : state.sensor.h;
      lockFrameM = effSensor * state.distanceM / (state.focal || 1);
    }
    state.fovLock = locked;
    state.lockFrameM = lockFrameM;
    store.commit();
  }

  // ---------- Render: result cards (all read from state) ----------
  function renderResultCards() {
    const s = state;
    if (!s.sensor || !s.dof) return;

    if (s.sensor) {
      const diag = sensorDiagonal(s.sensor);
      el.sensorInfo.textContent = i18n.sensorInfo(
        s.sensor.w, s.sensor.h, diag.toFixed(2), s.crop.toFixed(2), s.coc.toFixed(3)
      );
    }

    el.rEquivFocal.textContent = fmt(s.equivFocal, 1);
    el.rFov.textContent = `${s.fovHdeg.toFixed(1)}° × ${s.fovVdeg.toFixed(1)}°`;
    el.rMagnification.textContent = s.m < 0.001 ? s.m.toExponential(2) : s.m.toFixed(4);
    el.rFovWidth.textContent = fmt(s.fovWidthM, 2);
    el.rFovHeight.textContent = fmt(s.fovHeightM, 2);
    el.rImageWidth.textContent = `${fmt(s.m * s.subjectW * 1000, 2)} mm (${((s.m * s.subjectW * 1000) / s.sensor.w * 100).toFixed(1)}%)`;
    el.rImageHeight.textContent = `${fmt(s.m * s.subjectH * 1000, 2)} mm (${((s.m * s.subjectH * 1000) / s.sensor.h * 100).toFixed(1)}%)`;

    if (s.mode === 'person') {
      el.rPersonImaging.textContent = `${fmt(s.m * s.subjectH * 1000, 2)} mm (${((s.m * s.subjectH * 1000) / s.sensor.h * 100).toFixed(1)}%)`;
    }

    el.rDofTotal.textContent = fmtDistance(s.dof.total);
    el.rDofNear.textContent = fmtDistance(s.dof.front);
    el.rDofFar.textContent = fmtDistance(s.dof.back);
    el.rDofRange.textContent = `${fmtDistance(s.dof.near)} ~ ${fmtDistance(s.dof.far)}`;
    el.rHyperfocal.textContent = fmtDistance(s.dof.hyperfocal);
    el.rEntrancePupil.textContent = fmt(s.entrancePupilMm, 2);
    el.dofConclusion.textContent = i18n[Calc.dofConclusion(s.dof.total)];

    const bokehPx = s.bokehMm / pixelPitch(s.sensor);
    el.rBokehSensor.textContent = fmt(s.bokehMm, 3);
    el.rBokehRatio.textContent = ((s.bokehMm / s.sensor.w) * 100).toFixed(2);
    el.rBokehPixels.textContent = bokehPx >= 1000 ? bokehPx.toFixed(0) : bokehPx.toFixed(1);
    el.rBokehBlur.textContent = `${s.bokehBlurLevel} · ${i18n.blurLevels[s.bokehBlurLevel - 1]}`;

    // Write back to input controls (data model -> inputs).
    // Skip the numeric inputs that the user is actively editing, otherwise the
    // store roundtrip would clobber their typing (notably the aperture field).
    el.distance.value = s.distanceM.toFixed(2);
    el.distanceRange.value = Math.round(Calc.sliderFromLog(s.distanceM, LOG.distance) * 1000);
    if (document.activeElement !== el.eyeHeight) {
      el.eyeHeight.value = s.eyeHeightM.toFixed(2);
    }
    if (document.activeElement !== el.aperture) {
      el.aperture.value = s.aperture.toFixed(2);
    }
    el.apertureRange.value = Math.round(Calc.sliderFromLog(s.aperture, LOG.aperture) * 1000);

    // Framing lock UI state
    el.compLockBtn.classList.toggle('active', s.fovLock);
    el.compLockBtn.setAttribute('aria-pressed', s.fovLock ? 'true' : 'false');
    if (el.compLockIcon) el.compLockIcon.textContent = s.fovLock ? '🔒' : '🔓';
    el.distance.disabled = s.fovLock;
    el.distanceRange.disabled = s.fovLock;
    el.resetPortraitBtn.disabled = s.fovLock;
    el.resetTopBtn.disabled = s.fovLock;
    el.resetSideBtn.disabled = s.fovLock;
  }

  function renderViews() {
    portraitView.render();
    if (state.mode === 'person') {
      sideView.render();
    } else {
      topView.render();
      sideView.render();
    }
    fieldView.render();
    bokehView.render();
  }

  // ---------- Display mode ----------
  function updateModeVisibility() {
    const isPerson = el.subjectType.value === 'person';
    el.orientationWrap.hidden = !isPerson;
    el.subjectSizeGroup.hidden = isPerson;
    el.personHint.hidden = !isPerson;
    el.personSceneWrap.hidden = !isPerson;
    el.topViewWrap.hidden = isPerson;
    el.sideViewWrap.hidden = false;
    if (el.imageWidthCard) el.imageWidthCard.hidden = isPerson;
    if (el.imageHeightCard) el.imageHeightCard.hidden = isPerson;
    if (el.personImagingCard) el.personImagingCard.hidden = !isPerson;
  }

  function updateInputGroups() {
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const target = isMobile ? activeInputGroup : activeResultTab;
    document.querySelectorAll('.panel-input [data-group]').forEach((g) => {
      g.hidden = g.getAttribute('data-group') !== target;
    });
  }

  function switchTab(tab) {
    activeResultTab = tab;
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + tab));
    updateInputGroups();
    updateModeVisibility();
  }

  function setupMobileSubtabs() {
    document.querySelectorAll('.mobile-subtab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeInputGroup = btn.getAttribute('data-mobile-group');
        document.querySelectorAll('.mobile-subtab-btn').forEach((b) =>
          b.classList.toggle('active', b.getAttribute('data-mobile-group') === activeInputGroup)
        );
        updateInputGroups();
      });
    });
    window.addEventListener('resize', updateInputGroups);
  }

  // ---------- Translation ----------
  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (i18n[key] != null) node.textContent = i18n[key];
    });
    document.title = i18n.appTitle + ' | ' + i18n.subtitle;
  }

  function rebuildSensorSelect() {
    const prevValue = el.sensor.value;
    el.sensor.innerHTML = '';
    const groups = {};
    SENSOR_FORMATS.forEach((s, idx) => {
      const gkey = sensorGroupName(s, currentLang);
      (groups[gkey] = groups[gkey] || []).push({ s, idx });
    });
    Object.keys(groups).forEach((groupName) => {
      const og = document.createElement('optgroup');
      og.label = groupName;
      groups[groupName].forEach(({ s, idx }) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = sensorDisplayName(s, currentLang);
        og.appendChild(opt);
      });
      el.sensor.appendChild(og);
    });
    if (prevValue !== '' && SENSOR_FORMATS[prevValue]) {
      el.sensor.value = prevValue;
    } else {
      const idx = SENSOR_FORMATS.findIndex((s) => s.name.indexOf('全画幅 36×24') === 0);
      el.sensor.value = idx >= 0 ? idx : 0;
    }
  }

  // ---------- Tick marks ----------
  function renderTickBar(barEl, values, cfg, fmtLabel) {
    barEl.innerHTML = '';
    values.forEach((v) => {
      const t = Calc.sliderFromLog(v, cfg);
      const span = document.createElement('span');
      span.className = 'tick';
      span.style.left = (t * 100).toFixed(2) + '%';
      span.textContent = fmtLabel(v);
      barEl.appendChild(span);
    });
  }
  function populateTicks() {
    renderTickBar($('focalTickBar'), [14,16,20,24,28,35,50, 85, 135, 200, 300, 400, 600], LOG.focal, (v) => v );
    renderTickBar($('apertureTickBar'), [1.2, 1.4,1.8, 2.8, 4.0, 5.6, 8, 12, 22], LOG.aperture, (v) => 'f/' + v);
  }

  // ---------- Mobile collapsing ----------
  function setupMobileToggle() {
    const inputBtn = $('toggleInputBtn'), resultBtn = $('toggleResultBtn');
    const inputPanel = $('panelInput'), resultPanel = $('panelResult');
    const mq = window.matchMedia('(max-width: 600px)');
    function update() {
      if (!mq.matches) {
        inputPanel.hidden = false; resultPanel.hidden = false;
        inputBtn.style.display = 'none'; resultBtn.style.display = 'none';
        return;
      }
      inputBtn.style.display = ''; resultBtn.style.display = '';
      inputPanel.hidden = !inputBtn.classList.contains('active');
      resultPanel.hidden = !resultBtn.classList.contains('active');
    }
    inputBtn.addEventListener('click', () => { inputBtn.classList.add('active'); resultBtn.classList.remove('active'); update(); });
    resultBtn.addEventListener('click', () => { resultBtn.classList.add('active'); inputBtn.classList.remove('active'); update(); });
    window.addEventListener('resize', update);
    inputBtn.classList.remove('active'); resultBtn.classList.add('active');
    update();
  }

  // ---------- Input binding ----------
  function bindLogSync(numEl, rangeEl, cfg, onChange) {
    numEl.addEventListener('input', () => {
      const v = parseFloat(numEl.value);
      if (isFinite(v)) rangeEl.value = Math.round(Calc.sliderFromLog(v, cfg) * 1000);
      onChange();
    });
    rangeEl.addEventListener('input', () => {
      numEl.value = Calc.logFromSlider(parseFloat(rangeEl.value) / 1000, cfg).toFixed(2);
      onChange();
    });
  }

  function bindEvents() {
    bindLogSync(el.focal, el.focalRange, LOG.focal, applyRawInputs);
    bindLogSync(el.aperture, el.apertureRange, LOG.aperture, applyRawInputs);
    bindLogSync(el.distance, el.distanceRange, LOG.distance, onDistanceChange);

    el.sensor.addEventListener('change', () => {
      const sensor = SENSOR_FORMATS[parseInt(el.sensor.value, 10)];
      if (sensor) applyPresetToCoC(sensor);
      applyRawInputs();
    });

    [el.subjectWidth, el.subjectHeight, el.bgDistance, el.bgLightSize].forEach((n) => {
      n.addEventListener('input', applyRawInputs);
      n.addEventListener('change', applyRawInputs);
    });

    el.cocPreset.addEventListener('change', () => {
      const sensor = SENSOR_FORMATS[parseInt(el.sensor.value, 10)];
      if (sensor) applyPresetToCoC(sensor);
      applyRawInputs();
    });
    el.cocValue.addEventListener('input', () => {
      if (syncingCoC) return;
      el.cocPreset.value = '';
      applyRawInputs();
    });

    el.subjectType.addEventListener('change', () => { updateModeVisibility(); applyRawInputs(); });
    el.orientation.addEventListener('change', applyRawInputs);
    el.eyeHeight.addEventListener('input', applyRawInputs);

    document.querySelectorAll('.tab-btn').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab'))));
    document.querySelectorAll('.lang-btn').forEach((btn) => btn.addEventListener('click', () => switchLang(btn.getAttribute('data-lang'))));

    el.compLockBtn.addEventListener('click', () => setCompLock(!state.fovLock));

    // View resets
    el.resetPortraitBtn.addEventListener('click', () => {
      portraitView.reset();
      Object.assign(state, {
        autoOrient: true, dragging: false,
        angleH: 0, angleV: 0
      });
      state.personView.cropOffsetM = 0;
      state.eyeHeightM = DEFAULTS.eyeHeight;
      state.heightM = DEFAULTS.eyeHeight;
      el.eyeHeight.value = DEFAULTS.eyeHeight;
      store.commit();
    });

    el.resetTopBtn.addEventListener('click', () => {
      state.autoOrient = true; state.dragging = false;
      state.angleH = 0; state.angleV = 0;
      store.commit();
    });

    el.resetSideBtn.addEventListener('click', () => {
      state.autoOrient = true; state.dragging = false;
      state.angleH = 0; state.angleV = 0;
      state.eyeHeightM = DEFAULTS.eyeHeight;
      state.heightM = DEFAULTS.eyeHeight;
      el.eyeHeight.value = DEFAULTS.eyeHeight;
      store.commit();
    });

    el.resetDofBtn.addEventListener('click', () => {
      el.aperture.value = DEFAULTS.aperture.toFixed(1);
      el.apertureRange.value = 500;
      applyRawInputs();
    });

    el.resetBtn.addEventListener('click', () => {
      el.focal.value = DEFAULTS.focal; el.focalRange.value = 500;
      el.aperture.value = DEFAULTS.aperture.toFixed(1); el.apertureRange.value = 500;
      el.distance.value = DEFAULTS.distance; el.distanceRange.value = 500;
      el.subjectType.value = DEFAULTS.subjectType;
      el.orientation.value = DEFAULTS.orientation;
      el.subjectWidth.value = DEFAULTS.subjectWidth;
      el.subjectHeight.value = DEFAULTS.subjectHeight;
      el.cocPreset.value = DEFAULTS.cocPreset;
      el.cocValue.value = DEFAULTS.cocValue;
      el.bgDistance.value = DEFAULTS.bgDistance;
      el.bgLightSize.value = DEFAULTS.bgLightSize;
      el.eyeHeight.value = DEFAULTS.eyeHeight;
      lastDistanceM = DEFAULTS.distance;
      state.fovLock = false;
      state.lockFrameM = null;
      updateModeVisibility();
      applyRawInputs();
    });
  }

  function switchLang(lang) {
    setLang(lang);
    applyTranslations();
    rebuildSensorSelect();
    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-lang') === lang));
    applyRawInputs();
  }

  function syncSliderPositions() {
    el.focalRange.value = Math.round(Calc.sliderFromLog(parseFloat(el.focal.value), LOG.focal) * 1000);
    el.apertureRange.value = Math.round(Calc.sliderFromLog(parseFloat(el.aperture.value), LOG.aperture) * 1000);
    el.distanceRange.value = Math.round(Calc.sliderFromLog(parseFloat(el.distance.value), LOG.distance) * 1000);
  }

  // ---------- Single reactive entry: data change -> render all components ----------
  store.listen(() => {
    renderResultCards();
    renderViews();
  });

  function init() {
    const sensor = SENSOR_FORMATS[parseInt(el.sensor.value, 10)];

    portraitView.init(store);
    topView.init(store);
    sideView.init(store);
    fieldView.init(store);
    bokehView.init(store);

    bindEvents();
    applyTranslations();
    rebuildSensorSelect();

    // Initial subject coordinates (fixed position on the scene canvas)
    const c = el.sceneTopCanvas;
    store.update({ subjectX: c.width * 0.78, subjectY: c.height * 0.8 });

    syncSliderPositions();
    updateModeVisibility();
    state.autoOrient = true;
    state.dragging = false;
    switchTab('basic');

    if (sensor) applyPresetToCoC(sensor);
    applyRawInputs();
    populateTicks();
    setupMobileToggle();
    setupMobileSubtabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
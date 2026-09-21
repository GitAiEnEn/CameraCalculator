/**
 * calc.js
 * Optical calculation core (all calculation methods live here)
 *
 * Length units are normalized to millimeters (mm) internally; the UI layer
 * converts on input/output. Shot type and DoF conclusion methods return i18n
 * keys so the UI layer can translate them.
 */

const Calc = (function () {
  'use strict';

  // Generic constraint
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- Log slider mapping (params min/center/max, slider 0..1, 0.5 = center) ----------
  function logFromSlider(t, cfg) {
    if (t <= 0.5) {
      return cfg.center * Math.exp(Math.log(cfg.min / cfg.center) * ((0.5 - t) / 0.5));
    }
    return cfg.center * Math.exp(Math.log(cfg.max / cfg.center) * ((t - 0.5) / 0.5));
  }

  function sliderFromLog(v, cfg) {
    if (v <= cfg.center) {
      return 0.5 - 0.5 * (Math.log(cfg.center / v) / Math.log(cfg.center / cfg.min));
    }
    return 0.5 + 0.5 * (Math.log(v / cfg.center) / Math.log(cfg.max / cfg.center));
  }

  // ---------- Field of view ----------
  function fieldOfView(sensorSize, focal) {
    return 2 * Math.atan(sensorSize / (2 * focal)) * 180 / Math.PI;
  }

  // ---------- Magnification ----------
  function magnification(focal, distance) {
    if (distance <= focal) return Infinity;
    return focal / (distance - focal);
  }

  function imageSize(focal, distance, subjectSize) {
    return magnification(focal, distance) * subjectSize;
  }

  // ---------- Hyperfocal distance ----------
  function hyperfocal(focal, aperture, coc) {
    return (focal * focal) / (aperture * coc) + focal;
  }

  // ---------- Depth of field ----------
  function depthOfField(focal, aperture, coc, distance) {
    const H = hyperfocal(focal, aperture, coc);
    const f = focal;
    const u = distance;

    const denomNear = (H + u - 2 * f);
    const near = denomNear > 0 ? (u * (H - f)) / denomNear : 0;

    const denomFar = (H - u);
    let far;
    if (denomFar <= 0) {
      far = Infinity;
    } else {
      far = (u * (H - f)) / denomFar;
    }

    const front = u - near;
    const back = far === Infinity ? Infinity : far - u;
    const total = far === Infinity ? Infinity : far - near;

    return { near, far, front, back, total, hyperfocal: H };
  }

  // ---------- Entrance pupil diameter ----------
  function entrancePupil(focal, aperture) {
    return focal / aperture;
  }

  // ---------- Bokeh diameter ----------
  // offset is the out-of-focus point's distance from the focus plane:
  //   negative = in front of the focus plane (foreground),
  //   positive = behind the focus plane (background).
  function bokehDiameter(focal, aperture, focusDist, offset, lightSize) {
    const A = entrancePupil(focal, aperture);
    const m = magnification(focal, focusDist);

    if (offset === 0) return 0;

    // Absolute distance of the out-of-focus point: u_bg = u + Δ
    const s = focusDist + offset;
    if (s <= 0) return 0;

    const pointBlur = A * Math.abs(offset) / s * m;
    const sizeBlur = (lightSize || 0) * (focal / s) * m;

    return pointBlur + sizeBlur;
  }

  // ---------- Background blur level ----------
  // Returns a level index (1-7) whose label can be looked up via i18n.blurLevels.
  function blurLevel(bokehMm, sensorWidth) {
    const ratio = bokehMm / sensorWidth;
    if (ratio < 0.005) return { level: 1 };
    if (ratio < 0.015) return { level: 2 };
    if (ratio < 0.03) return { level: 3 };
    if (ratio < 0.06) return { level: 4 };
    if (ratio < 0.12) return { level: 5 };
    if (ratio < 0.25) return { level: 6 };
    return { level: 7 };
  }

  // ---------- Person shot classification ----------
  // Uses r = full person height / vertical frame height as the criterion.
  // The program fixes person height at 1.70m (full body), so the standard
  // ranges are converted to r thresholds:
  //   ECU >= 3.5, CU >= 2.1, MCU >= 1.5, MS >= 1.0,
  //   MFS >= 0.85, FS >= 0.68, LS >= 0.35, ELS < 0.35.
  function classifyPersonShot(subjectHeightM, frameHeightM) {
    const r = frameHeightM > 0 ? subjectHeightM / frameHeightM : 0;
    if (r >= 3.5) return { key: 'shotTypeECU' };
    if (r >= 2.1) return { key: 'shotTypeCU' };
    if (r >= 1.5) return { key: 'shotTypeMCU' };
    if (r >= 1.0) return { key: 'shotTypeMS' };
    if (r >= 0.85) return { key: 'shotTypeMFS' };
    if (r >= 0.68) return { key: 'shotTypeFS' };
    if (r >= 0.35) return { key: 'shotTypeLS' };
    return { key: 'shotTypeELS' };
  }

  // ---------- DoF conclusion ----------
  function dofConclusion(totalMm) {
    const met = totalMm / 1000;
    if (!isFinite(met)) return 'dofConclusionTwoRows';
    if (met < 0.01) return 'dofConclusionEye';
    if (met < 0.05) return 'dofConclusionTiny';
    if (met < 0.3) return 'dofConclusionFace';
    if (met < 1.5) return 'dofConclusionBody';
    if (met < 5) return 'dofConclusionSingleRow';
    return 'dofConclusionTwoRows';
  }

  return {
    clamp,
    logFromSlider,
    sliderFromLog,
    fieldOfView,
    magnification,
    imageSize,
    hyperfocal,
    depthOfField,
    entrancePupil,
    bokehDiameter,
    blurLevel,
    classifyPersonShot,
    dofConclusion
  };
})();
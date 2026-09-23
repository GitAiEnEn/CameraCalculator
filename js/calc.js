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

  // ---------- DoF level (total-DoF magnitude classification) ----------
  // Returns an i18n key for the depth-of-field magnitude card:
  //   extreme / shallow / moderate / wide / huge.
  function dofLevel(totalMm) {
    const met = totalMm / 1000;
    if (!isFinite(met)) return 'dofLevelHuge';
    if (met < 0.05) return 'dofLevelExtreme';
    if (met < 0.3) return 'dofLevelShallow';
    if (met < 1.5) return 'dofLevelModerate';
    if (met < 5) return 'dofLevelWide';
    return 'dofLevelHuge';
  }

  // ---------- DoF sharp subject (portrait experience classification) ----------
  // Returns an i18n key describing what stays acceptably sharp at this DoF:
  //   one eye / eyes / face / half body / full body / multiple rows sharp.
  function dofSharpRange(totalMm) {
    const met = totalMm / 1000;
    if (!isFinite(met)) return 'dofSharpMultiRows';
    if (met < 0.01) return 'dofSharpOneEye';
    if (met < 0.05) return 'dofSharpEyes';
    if (met < 0.3) return 'dofSharpFace';
    if (met < 1.5) return 'dofSharpHalfBody';
    if (met < 5) return 'dofSharpFullBody';
    return 'dofSharpMultiRows';
  }

  // ---------- Safe handheld shutter (static portrait) ----------
  // No stabilization: min(1/focal, 1/60s).
  // With N stops of stabilization: min(1/(focal / 2^N), 1/60s).
  // Returns the shutter DENOMINATOR (e.g. 125 => 1/125s).
  function safeShutterDen(focal, stabStops) {
    const f = focal || 50;
    const k = Math.pow(2, Math.max(0, stabStops || 0));
    return Math.max(f / k, 60);
  }

  // ---------- Default safe ISO by sensor size ----------
  // Full frame tolerates ~ISO 6400 for a clean static portrait; smaller
  // formats scale by 1/crop^2. Snapped down to the standard ISO ladder.
  function defaultSafeIso(sensor) {
    if (!sensor) return 6400;
    const diag = Math.hypot(sensor.w, sensor.h);
    const crop = 43.27 / diag;
    const raw = 6400 / (crop * crop);
    const ladder = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
    let iso = ladder[0];
    ladder.forEach((v) => { if (v <= raw) iso = v; });
    return iso;
  }

  // ---------- Exposure value ----------
  // EV (scene brightness) correctly exposed by ISO / shutter / aperture:
  //   EV = log2(N^2 / t) - log2(ISO / 100)
  function evFromExposure(iso, shutterSec, aperture) {
    return Math.log2((aperture * aperture) / shutterSec) - Math.log2(iso / 100);
  }

  // ---------- Scene bucket for an EV ----------
  // The reference table covers EV -4..16 in integer buckets.
  // Returns an index 0..20 into i18n.evSceneShort / evSceneDesc.
  function evSceneIndex(ev) {
    return Math.round(clamp(ev, -4, 16)) + 4;
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
    dofConclusion,
    dofLevel,
    dofSharpRange,
    safeShutterDen,
    defaultSafeIso,
    evFromExposure,
    evSceneIndex
  };
})();
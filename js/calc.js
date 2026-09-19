/**
 * calc.js
 * 光学计算核心（所有计算方法集中于此）
 *
 * 长度单位内部统一使用毫米 (mm)，输入输出时在 UI 层转换。
 * 景别/结论等返回 i18n key 字符串，由 UI 层负责翻译显示。
 */

const Calc = (function () {
  'use strict';

  // 通用约束
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- 对数滑块映射（参数 min/center/max，滑块 0..1，0.5 为中心） ----------
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

  // ---------- 视角 ----------
  function fieldOfView(sensorSize, focal) {
    return 2 * Math.atan(sensorSize / (2 * focal)) * 180 / Math.PI;
  }

  // ---------- 放大倍率 ----------
  function magnification(focal, distance) {
    if (distance <= focal) return Infinity;
    return focal / (distance - focal);
  }

  function imageSize(focal, distance, subjectSize) {
    return magnification(focal, distance) * subjectSize;
  }

  // ---------- 超焦距 ----------
  function hyperfocal(focal, aperture, coc) {
    return (focal * focal) / (aperture * coc) + focal;
  }

  // ---------- 景深 ----------
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

  // ---------- 入瞳直径 ----------
  function entrancePupil(focal, aperture) {
    return focal / aperture;
  }

  // ---------- 焦外光斑直径 ----------
  function bokehDiameter(focal, aperture, focusDist, bgDist, lightSize) {
    const A = entrancePupil(focal, aperture);
    const m = magnification(focal, focusDist);

    if (bgDist === focusDist) return 0;

    const pointBlur = A * Math.abs(bgDist - focusDist) / bgDist * m;
    const sizeBlur = (lightSize || 0) * (focal / bgDist) * m;

    return pointBlur + sizeBlur;
  }

  // ---------- 背景模糊等级 ----------
  function blurLevel(bokehMm, sensorWidth) {
    const ratio = bokehMm / sensorWidth;
    if (ratio < 0.005) return { level: 1, text: '几乎不可见' };
    if (ratio < 0.015) return { level: 2, text: '轻微' };
    if (ratio < 0.03) return { level: 3, text: '可见' };
    if (ratio < 0.06) return { level: 4, text: '明显' };
    if (ratio < 0.12) return { level: 5, text: '强烈' };
    if (ratio < 0.25) return { level: 6, text: '非常强烈' };
    return { level: 7, text: '奶油般虚化' };
  }

  // ---------- 景别判断（人像） ----------
  // 以“整个人物身高 ÷ 取景框竖直高度” r 作为判定依据。
  // 程序中人物身高固定为 1.70m（完整全身），因此将标准区间换算到 r：
  //   大特写 ≥3.5，特写 ≥2.1，中近景 ≥1.5，中景 ≥1.0，
  //   中全景 ≥0.85，全景 ≥0.68，远景 ≥0.35，大远景 <0.35。
  function classifyPersonShot(subjectHeightM, frameHeightM) {
    const r = frameHeightM > 0 ? subjectHeightM / frameHeightM : 0;
    if (r >= 3.5) return { key: 'shotTypeECU' };  // 大特写
    if (r >= 2.1) return { key: 'shotTypeCU' };   // 特写
    if (r >= 1.5) return { key: 'shotTypeMCU' };  // 中近景
    if (r >= 1.0) return { key: 'shotTypeMS' };   // 中景
    if (r >= 0.85) return { key: 'shotTypeMFS' }; // 中全景
    if (r >= 0.68) return { key: 'shotTypeFS' };  // 全景
    if (r >= 0.35) return { key: 'shotTypeLS' };  // 远景
    return { key: 'shotTypeELS' };                // 大远景
  }

  // ---------- 景深结论 ----------
  function dofConclusion(totalMm) {
    const met = totalMm / 1000;
    if (!isFinite(met)) return 'dofConclusionTwoRows';
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
/**
 * verify.js
 * Calculation verification script (run with Node.js)
 *   node test/verify.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sensorsSrc = fs.readFileSync(path.join(root, 'js', 'sensors.js'), 'utf8');
const calcSrc = fs.readFileSync(path.join(root, 'js', 'calc.js'), 'utf8');

// Execute in a single scope so const declarations are visible.
const combined = sensorsSrc + '\n' + calcSrc + '\n' + `
module.exports = { SENSOR_FORMATS, sensorDiagonal, cropFactor, pixelPitch, cocForPreset, Calc };
`;

const m = { exports: {} };
const fn = new Function('module', 'exports', combined);
fn(m, m.exports);
const { SENSOR_FORMATS, cropFactor, cocForPreset, Calc } = m.exports;

function find(namePart) {
  return SENSOR_FORMATS.find((s) => s.nameEn.indexOf(namePart) === 0);
}

let pass = 0, fail = 0;
function check(label, actual, expected, tol) {
  let ok;
  if (expected === Infinity) {
    ok = actual === Infinity;
  } else {
    ok = Math.abs(actual - expected) <= tol;
  }
  const show = (v) => (v === Infinity ? '∞' : v.toFixed(4));
  console.log(`${ok ? '✅' : '❌'} ${label}: ${show(actual)} (expected ${show(expected)} ±${tol})`);
  ok ? pass++ : fail++;
}

console.log('===== Crop factor =====');
check('Full frame crop factor', cropFactor(find('Full Frame 36×24')), 1.0, 0.001);
check('Canon APS-C crop factor', cropFactor(find('Canon APS-C 22.3')), 1.6, 0.02);
check('Sony APS-C crop factor', cropFactor(find('Sony / Nikon')), 1.534, 0.02);
check('M4/3 crop factor', cropFactor(find('M4/3 17.3')), 2.0, 0.02);

console.log('\n===== FOV (50mm full frame) =====');
check('Horizontal FOV', Calc.fieldOfView(36, 50), 39.6, 0.3);
check('Vertical FOV', Calc.fieldOfView(24, 50), 27.0, 0.3);

console.log('\n===== DoF (50mm f/1.8 full frame CoC0.03 focus 3m) =====');
const dof = Calc.depthOfField(50, 1.8, 0.03, 3000);
check('Near boundary (m)', dof.near / 1000, 2.83, 0.05);
check('Far boundary (m)', dof.far / 1000, 3.19, 0.05);
check('Total DoF (m)', dof.total / 1000, 0.36, 0.05);
check('Hyperfocal (m)', dof.hyperfocal / 1000, 46.3, 1.0);

console.log('\n===== DoF (24mm f/8 full frame CoC0.03 focus 5m) =====');
// H = 24²/(8×0.03)+24 = 2424mm; DN = 5000×(2424−24)/(2424+5000−48) = 1626.9mm
const dof2 = Calc.depthOfField(24, 8, 0.03, 5000);
check('Near boundary (m)', dof2.near / 1000, 1.627, 0.05);
check('Far boundary (m)', dof2.far / 1000, Infinity, 1e9);

console.log('\n===== Magnification / image size =====');
check('50mm @3m magnification', Calc.magnification(50, 3000), 0.01695, 0.0005);
check('50mm @3m 1.7m person image (mm)', Calc.imageSize(50, 3000, 1700), 28.8, 0.5);

console.log('\n===== Bokeh (50mm f/1.8 focus 3m, background +7m) =====');
// offset Δ = +7000 (behind focus): u_bg = u + Δ = 10000
// B = D·|Δ|/(u+Δ) · f/(u−f) = 27.78×7000/10000×50/2950 = 0.3296mm
const b = Calc.bokehDiameter(50, 1.8, 3000, 7000, 0);
check('Bokeh diameter (mm)', b, 0.3296, 0.01);
// Far background limit (Δ → ∞): B = D·f/(u−f) = 27.78×50/2950 = 0.4708mm
check('Far background limit bokeh (mm)', Calc.bokehDiameter(50, 1.8, 3000, 1e9, 0), 0.4708, 0.01);

console.log('\n===== Bokeh (50mm f/1.8 focus 3m, foreground −1m) =====');
// offset Δ = −1000 (in front of focus): u_bg = 2000
// B = 27.78×1000/2000×50/2950 = 0.2354mm
check('Foreground bokeh (mm)', Calc.bokehDiameter(50, 1.8, 3000, -1000, 0), 0.2354, 0.01);

console.log('\n===== Bokeh (85mm f/1.4 focus 2m, background +8m) =====');
// offset Δ = +8000: u_bg = 10000; B = 60.71×8000/10000×85/1915 = 2.156mm
const b2 = Calc.bokehDiameter(85, 1.4, 2000, 8000, 0);
check('Bokeh diameter (mm)', b2, 2.156, 0.05);

console.log('\n===== Entrance pupil =====');
check('50mm f/1.8 entrance pupil (mm)', Calc.entrancePupil(50, 1.8), 27.78, 0.1);

console.log('\n===== CoC presets (loose/normal/strict) =====');
const ff = find('Full Frame 36×24');
// Full frame diagonal ≈ 43.27mm
check('Loose CoC (diag/1000)', cocForPreset(ff, 'loose'), 43.267 / 1000, 0.001);
check('Normal CoC (diag/1500)', cocForPreset(ff, 'normal'), 43.267 / 1500, 0.001);
check('Strict CoC (diag/2000)', cocForPreset(ff, 'strict'), 43.267 / 2000, 0.001);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
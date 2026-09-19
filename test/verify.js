/**
 * verify.js
 * 计算验证脚本（Node.js 运行）
 *   node test/verify.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sensorsSrc = fs.readFileSync(path.join(root, 'js', 'sensors.js'), 'utf8');
const calcSrc = fs.readFileSync(path.join(root, 'js', 'calc.js'), 'utf8');

// 在同一个作用域内执行，使 const 声明可见
const combined = sensorsSrc + '\n' + calcSrc + '\n' + `
module.exports = { SENSOR_FORMATS, sensorDiagonal, cropFactor, pixelPitch, cocForPreset, Calc };
`;

const m = { exports: {} };
const fn = new Function('module', 'exports', combined);
fn(m, m.exports);
const { SENSOR_FORMATS, cropFactor, cocForPreset, Calc } = m.exports;

function find(namePart) {
  return SENSOR_FORMATS.find((s) => s.name.indexOf(namePart) === 0);
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
  console.log(`${ok ? '✅' : '❌'} ${label}: ${show(actual)} (期望 ${show(expected)} ±${tol})`);
  ok ? pass++ : fail++;
}

console.log('===== 裁切系数 =====');
check('全画幅裁切系数', cropFactor(find('全画幅 36×24')), 1.0, 0.001);
check('佳能 APS-C 裁切系数', cropFactor(find('佳能 APS-C 22.3')), 1.6, 0.02);
check('索尼 APS-C 裁切系数', cropFactor(find('索尼 / 尼康')), 1.534, 0.02);
check('M4/3 裁切系数', cropFactor(find('M4/3 17.3')), 2.0, 0.02);

console.log('\n===== 视角 (50mm 全画幅) =====');
check('水平视角', Calc.fieldOfView(36, 50), 39.6, 0.3);
check('垂直视角', Calc.fieldOfView(24, 50), 27.0, 0.3);

console.log('\n===== 景深 (50mm f/1.8 全画幅 CoC0.03 对焦3m) =====');
const dof = Calc.depthOfField(50, 1.8, 0.03, 3000);
check('前景深边界(m)', dof.near / 1000, 2.83, 0.05);
check('后景深边界(m)', dof.far / 1000, 3.19, 0.05);
check('总景深(m)', dof.total / 1000, 0.36, 0.05);
check('超焦距(m)', dof.hyperfocal / 1000, 46.3, 1.0);

console.log('\n===== 景深 (24mm f/8 全画幅 CoC0.03 对焦5m) =====');
// H = 24²/(8×0.03)+24 = 2424mm；DN = 5000×(2424−24)/(2424+5000−48) = 1626.9mm
const dof2 = Calc.depthOfField(24, 8, 0.03, 5000);
check('前景深边界(m)', dof2.near / 1000, 1.627, 0.05);
check('后景深边界(m)', dof2.far / 1000, Infinity, 1e9);

console.log('\n===== 放大倍率 / 成像大小 =====');
check('50mm @3m 放大倍率', Calc.magnification(50, 3000), 0.01695, 0.0005);
check('50mm @3m 1.7m人物成像(mm)', Calc.imageSize(50, 3000, 1700), 28.8, 0.5);

console.log('\n===== 焦外光斑 (50mm f/1.8 对焦3m 背景10m) =====');
// B = D·f·|s−s0| / (s·(s0−f)) = 27.78×50×7000/(10000×2950) = 0.3296mm
const b = Calc.bokehDiameter(50, 1.8, 3000, 10000, 0);
check('光斑直径(mm)', b, 0.3296, 0.01);
// 远景极限（背景→∞）：B = D·f/(s0−f) = 27.78×50/2950 = 0.4708mm
check('远景极限光斑(mm)', Calc.bokehDiameter(50, 1.8, 3000, 1e9, 0), 0.4708, 0.01);

console.log('\n===== 焦外光斑 (85mm f/1.4 对焦2m 背景10m) =====');
// B = 60.71×85×8000/(10000×1915) = 2.156mm
const b2 = Calc.bokehDiameter(85, 1.4, 2000, 10000, 0);
check('光斑直径(mm)', b2, 2.156, 0.05);

console.log('\n===== 入瞳直径 =====');
check('50mm f/1.8 入瞳(mm)', Calc.entrancePupil(50, 1.8), 27.78, 0.1);

console.log('\n===== CoC 预设 (宽松/一般/严格) =====');
const ff = find('全画幅 36×24');
// 全画幅对角线 ≈ 43.27mm
check('宽松 CoC (对角/1000)', cocForPreset(ff, 'loose'), 43.267 / 1000, 0.001);
check('一般 CoC (对角/1500)', cocForPreset(ff, 'normal'), 43.267 / 1500, 0.001);
check('严格 CoC (对角/2000)', cocForPreset(ff, 'strict'), 43.267 / 2000, 0.001);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);

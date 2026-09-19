/**
 * sensors.js
 * 主流画幅 / 传感器数据库（中英双语）
 *
 * 每个条目包含：
 *   name      中文显示名称
 *   nameEn    英文显示名称
 *   w         传感器宽度 (mm)
 *   h         传感器高度 (mm)
 *   coc       默认弥散圆直径 (mm)
 *   pixels    典型像素数（百万）
 *   group     中文分组
 *   groupEn   英文分组
 */

const SENSOR_FORMATS = [
  // 中画幅
  { group: '中画幅', groupEn: 'Medium Format', name: 'Phase One / 哈苏 53.4×40 (IQ4)', nameEn: 'Phase One / Hasselblad 53.4×40 (IQ4)', w: 53.4, h: 40.0, coc: 0.050, pixels: 150 },
  { group: '中画幅', groupEn: 'Medium Format', name: '富士 GFX / 哈苏 X 44×33', nameEn: 'Fujifilm GFX / Hasselblad X 44×33', w: 43.8, h: 32.9, coc: 0.041, pixels: 102 },
  { group: '中画幅', groupEn: 'Medium Format', name: '徕卡 S / 宾得 645D 45×30', nameEn: 'Leica S / Pentax 645D 45×30', w: 45.0, h: 30.0, coc: 0.040, pixels: 64 },

  // 全画幅
  { group: '全画幅', groupEn: 'Full Frame', name: '全画幅 36×24 (135胶片 / 佳能)', nameEn: 'Full Frame 36×24 (135 film / Canon)', w: 36.0, h: 24.0, coc: 0.030, pixels: 45 },
  { group: '全画幅', groupEn: 'Full Frame', name: '全画幅 35.9×23.9 (尼康 / 索尼)', nameEn: 'Full Frame 35.9×23.9 (Nikon / Sony)', w: 35.9, h: 23.9, coc: 0.030, pixels: 45 },

  // APS-H
  { group: 'APS-H', groupEn: 'APS-H', name: '佳能 APS-H 28.7×19.0 (1D Mark IV)', nameEn: 'Canon APS-H 28.7×19.0 (1D Mark IV)', w: 28.7, h: 19.0, coc: 0.026, pixels: 16 },

  // APS-C
  { group: 'APS-C 半画幅', groupEn: 'APS-C', name: '佳能 APS-C 22.3×14.9 (1.6×)', nameEn: 'Canon APS-C 22.3×14.9 (1.6×)', w: 22.3, h: 14.9, coc: 0.019, pixels: 32 },
  { group: 'APS-C 半画幅', groupEn: 'APS-C', name: '佳能 APS-C 22.5×15.0 (1.6× 新版)', nameEn: 'Canon APS-C 22.5×15.0 (1.6× new)', w: 22.5, h: 15.0, coc: 0.019, pixels: 24 },
  { group: 'APS-C 半画幅', groupEn: 'APS-C', name: '索尼 / 尼康 / 富士 APS-C 23.5×15.6 (1.5×)', nameEn: 'Sony / Nikon / Fujifilm APS-C 23.5×15.6 (1.5×)', w: 23.5, h: 15.6, coc: 0.020, pixels: 26 },
  { group: 'APS-C 半画幅', groupEn: 'APS-C', name: '索尼 APS-C 23.5×15.7 (1.5×)', nameEn: 'Sony APS-C 23.5×15.7 (1.5×)', w: 23.5, h: 15.7, coc: 0.020, pixels: 26 },
  { group: 'APS-C 半画幅', groupEn: 'APS-C', name: '宾得 APS-C 23.7×15.7 (1.5×)', nameEn: 'Pentax APS-C 23.7×15.7 (1.5×)', w: 23.7, h: 15.7, coc: 0.020, pixels: 26 },
  { group: 'APS-C 半画幅', groupEn: 'APS-C', name: '适马 Foveon APS-C 23.5×15.7', nameEn: 'Sigma Foveon APS-C 23.5×15.7', w: 23.5, h: 15.7, coc: 0.020, pixels: 20 },

  // APS-C 特殊
  { group: 'APS-C 特殊', groupEn: 'APS-C Special', name: '佳能 APS-C 电影 24.6×13.8 (C70/R7 16:9)', nameEn: 'Canon APS-C Cinema 24.6×13.8 (C70/R7 16:9)', w: 24.6, h: 13.8, coc: 0.020, pixels: 32 },

  // M4/3
  { group: 'M4/3 微四三', groupEn: 'Micro Four Thirds', name: 'M4/3 17.3×13.0 (2.0×)', nameEn: 'M4/3 17.3×13.0 (2.0×)', w: 17.3, h: 13.0, coc: 0.015, pixels: 20 },
  { group: 'M4/3 微四三', groupEn: 'Micro Four Thirds', name: 'M4/3 17.4×13.0 (GH6 新版)', nameEn: 'M4/3 17.4×13.0 (GH6 new)', w: 17.4, h: 13.0, coc: 0.015, pixels: 25 },

  // 1 英寸
  { group: '1 英寸', groupEn: '1 inch', name: '1 英寸 13.2×8.8 (2.7×)', nameEn: '1 inch 13.2×8.8 (2.7×)', w: 13.2, h: 8.8, coc: 0.011, pixels: 20 },
  { group: '1 英寸', groupEn: '1 inch', name: '1 英寸 13.2×8.8 (索尼 RX100)', nameEn: '1 inch 13.2×8.8 (Sony RX100)', w: 13.2, h: 8.8, coc: 0.011, pixels: 20 },

  // 小型传感器
  { group: '小型传感器', groupEn: 'Small Sensor', name: '1/1.7 英寸 7.6×5.7', nameEn: '1/1.7 inch 7.6×5.7', w: 7.6, h: 5.7, coc: 0.006, pixels: 12 },
  { group: '小型传感器', groupEn: 'Small Sensor', name: '1/2.3 英寸 6.17×4.55', nameEn: '1/2.3 inch 6.17×4.55', w: 6.17, h: 4.55, coc: 0.005, pixels: 12 },
  { group: '小型传感器', groupEn: 'Small Sensor', name: '1/2.5 英寸 5.76×4.29', nameEn: '1/2.5 inch 5.76×4.29', w: 5.76, h: 4.29, coc: 0.005, pixels: 8 },
  { group: '小型传感器', groupEn: 'Small Sensor', name: '1/3 英寸 4.8×3.6', nameEn: '1/3 inch 4.8×3.6', w: 4.8, h: 3.6, coc: 0.004, pixels: 4 },

  // 手机
  { group: '手机传感器', groupEn: 'Phone Sensor', name: '手机 1/1.28 英寸 9.8×7.3', nameEn: 'Phone 1/1.28 inch 9.8×7.3', w: 9.8, h: 7.3, coc: 0.008, pixels: 50 },
  { group: '手机传感器', groupEn: 'Phone Sensor', name: '手机 1/1.56 英寸 8.0×6.0', nameEn: 'Phone 1/1.56 inch 8.0×6.0', w: 8.0, h: 6.0, coc: 0.007, pixels: 50 },
  { group: '手机传感器', groupEn: 'Phone Sensor', name: '手机 1/2 英寸 6.4×4.8', nameEn: 'Phone 1/2 inch 6.4×4.8', w: 6.4, h: 4.8, coc: 0.005, pixels: 12 },

  // 电影机
  { group: '电影机', groupEn: 'Cinema', name: 'Super 35 24.89×18.66 (Alexa)', nameEn: 'Super 35 24.89×18.66 (Alexa)', w: 24.89, h: 18.66, coc: 0.021, pixels: 12 },
  { group: '电影机', groupEn: 'Cinema', name: 'Super 35 24.6×13.8 (16:9)', nameEn: 'Super 35 24.6×13.8 (16:9)', w: 24.6, h: 13.8, coc: 0.020, pixels: 12 },
  { group: '电影机', groupEn: 'Cinema', name: '全画幅电影 36×24 (Venice)', nameEn: 'Full Frame Cinema 36×24 (Venice)', w: 36.0, h: 24.0, coc: 0.030, pixels: 12 },
  { group: '电影机', groupEn: 'Cinema', name: 'Micro 4/3 电影 17.3×13.0', nameEn: 'Micro 4/3 Cinema 17.3×13.0', w: 17.3, h: 13.0, coc: 0.015, pixels: 12 },
];

// 全画幅对角线（用于计算裁切系数）
const FULL_FRAME_DIAGONAL = Math.sqrt(36 * 36 + 24 * 24); // ≈ 43.2666 mm

function sensorDiagonal(sensor) {
  return Math.sqrt(sensor.w * sensor.w + sensor.h * sensor.h);
}

function cropFactor(sensor) {
  return FULL_FRAME_DIAGONAL / sensorDiagonal(sensor);
}

function pixelPitch(sensor) {
  const pixels = sensor.pixels || 24;
  const totalPixels = pixels * 1e6;
  const px = Math.sqrt(totalPixels / (sensor.w * sensor.h));
  return 1 / px; // mm per pixel
}

function sensorDisplayName(sensor, lang) {
  return lang === 'zh' ? sensor.name : sensor.nameEn;
}

function sensorGroupName(sensor, lang) {
  return lang === 'zh' ? sensor.group : sensor.groupEn;
}

/**
 * 根据景深宽松/一般/严格预设，计算对应的弥散圆直径 (mm)
 *   loose  (宽松)：对角线 / 1000 —— 景深更深
 *   normal (一般)：对角线 / 1500 —— 标准
 *   strict (严格)：对角线 / 2000 —— 景深更浅
 */
function cocForPreset(sensor, preset) {
  const diag = sensorDiagonal(sensor);
  if (preset === 'loose') return diag / 1000;
  if (preset === 'strict') return diag / 2000;
  return diag / 1500; // normal
}
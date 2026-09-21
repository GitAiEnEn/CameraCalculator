# 📷 相机拍摄计算器 (Camera Calculator)

A pure front-end HTML tool for calculating the relationship between **shooting distance and image size**, **Depth of Field (DoF)**, and **bokeh spot diameter**.

一个纯前端的 HTML 工具，用于计算相机的**拍摄距离与成像大小关系**、**景深 (Depth of Field)** 以及**焦外光斑 (Bokeh) 直径**。

It supports common sensor formats: Medium Format, Full Frame, APS-H, Canon APS-C, Sony/Nikon/Fujifilm APS-C, M4/3, 1-inch, phone sensors, cinema cameras (Super 35), and more.

支持主流画幅：中画幅、全画幅、APS-H、佳能 APS-C、索尼/尼康/富士 APS-C、M4/3、1 英寸、手机传感器、电影机 (Super 35) 等。

## ✨ Features / 功能

| Feature / 功能 | Description / 说明 |
| --- | --- |
| **Format selection / 画幅选择** | 30+ built-in sensor specs with automatic crop factor and default circle of confusion (CoC) / 内置 30+ 种主流传感器规格，自动计算裁切系数与默认弥散圆 (CoC) |
| **Equivalent focal length / 等效焦距** | Converts to 35mm equivalent using the crop factor / 按裁切系数换算 35mm 等效焦距 |
| **Field of view (FOV) / 视角** | Horizontal / vertical FOV / 水平 / 垂直视角 |
| **Image size / 成像大小** | Computes on-sensor image size and frame ratio from subject size / 根据被摄物实际尺寸计算传感器上的成像大小及占画幅比例 |
| **Magnification / 放大倍率** | m = f / (u − f) |
| **Frame coverage / 视野尺寸** | Actual width / height covered at the current distance / 当前距离下画面的实际覆盖宽度 / 高度 |
| **Depth of field / 景深** | Front DoF, rear DoF, total DoF, sharp range, hyperfocal distance, entrance pupil / 前景深、后景深、总景深、清晰范围、超焦距、入瞳直径 |
| **Bokeh / 焦外光斑** | Spot diameter (on sensor), frame ratio, pixel diameter, blur level / 光斑直径（传感器上）、占画幅比例、像素直径、模糊等级 |
| **Visualization / 可视化** | DoF range bar + bokeh preview (Canvas drawn) / 景深范围条 + 焦外光斑预览（Canvas 绘制） |
| **Bilingual / 中英双语** | One-click Chinese / English switching, fully localized UI and sensor names / 一键切换中文 / English，全部 UI 与传感器名称本地化 |
| **Responsive layout / 响应式布局** | Two-column desktop layout, single-column mobile layout with natural page scrolling / 桌面端双栏布局、手机端单栏布局，输入面板不悬浮，随页面自然滚动 |

## 📁 Project Structure / 项目结构

```
CameraCalculator/
├── index.html          # Main page (with data-i18n attributes) / 主页面（含 data-i18n 标记）
├── css/
│   ├── common.css      # Shared styles: theme & component look / 共享样式：主题与组件外观
│   ├── web.css         # Desktop / tablet layout / 桌面与平板布局
│   └── mobile.css      # Mobile layout (<=600px) / 手机端布局
├── js/
│   ├── sensors.js      # Sensor / format database (bilingual) / 传感器/画幅数据库（中英双语）
│   ├── calc.js         # Optical calculation core / 光学计算核心
│   ├── i18n.js         # Translation dictionary + i18n proxy / 中英文翻译字典与 i18n 代理
│   └── app.js          # UI binding and rendering (incl. language switching) / UI 绑定与渲染（含语言切换）
├── test/
│   ├── verify.js       # Calculation verification script / 计算验证脚本
│   └── check_i18n.js   # i18n key coverage check / i18n 键覆盖检查
└── README.md
```

## 🚀 Usage / 使用方法

Open `index.html` directly in a browser; no server or build step is required.

直接用浏览器打开 `index.html` 即可，无需服务器、无需构建。

```bash
# Windows
start index.html

# macOS
open index.html
```

## 🧮 Formulas / 计算公式

### Equivalent focal length / 等效焦距
```
f_equiv = f × crop factor / 裁切系数
crop factor = 43.27mm (full frame diagonal) ÷ sensor diagonal
裁切系数 = 43.27mm (全画幅对角线) ÷ 传感器对角线
```

### Field of view / 视角
```
FOV = 2 × arctan( d / (2f) )
```

### Image size / Magnification / 成像大小 / 放大倍率
```
m  = f / (u − f)
h' = m × h
```

### Depth of field / 景深
```
H  = f² / (N × c) + f              (hyperfocal / 超焦距)
DN = u(H − f) / (H + u − 2f)       (near boundary / 前景深边界)
DF = u(H − f) / (H − u)            (far boundary / 后景深边界)
```

### Bokeh diameter / 焦外光斑直径
```
A = f / N                                    (entrance pupil / 入瞳直径)
B = A × |Δ| / (u + Δ) × (f / (u − f))        (point light / 点光源)
Far limit / 远景极限：B ≈ A × f / (u − f)
```

Where / 其中：
- `f` focal length / 焦距, `N` aperture f-number / 光圈 f 值, `c` circle of confusion diameter / 弥散圆直径
- `u` focus distance / 对焦距离
- `Δ` OOF-to-focus offset / 焦外到对焦点距离：negative = foreground / 负值为前景(对焦点前方), positive = background / 正值为后景(对焦点后方)
- `h` subject actual size / 被摄物实际尺寸, `h'` image size / 成像尺寸

## ✅ Verification / 验证

Run the built-in verification scripts:

运行内置验证脚本：

```bash
# Calculation verification / 计算验证
node test/verify.js

# i18n translation coverage check / i18n 翻译覆盖检查
node test/check_i18n.js
```

Covers crop factor, FOV, DoF, hyperfocal distance, magnification, bokeh diameter, and Chinese/English translation completeness.

覆盖裁切系数、视角、景深、超焦距、放大倍率、焦外光斑等关键计算，以及中英文翻译完整性。

## 📐 Supported Formats / 支持的画幅

- **Medium Format / 中画幅**：Phase One IQ4, Fujifilm GFX, Leica S
- **Full Frame / 全画幅**：36×24 (135 / FX)
- **APS-H**：Canon 1D Mark IV
- **APS-C**：Canon (1.6×), Sony/Nikon/Fujifilm/Pentax (1.5×), Sigma Foveon
- **M4/3**：17.3×13.0 (2.0×)
- **1 inch / 1 英寸**：13.2×8.8
- **Small sensors / 小型传感器**：1/1.7", 1/2.3", 1/2.5", 1/3"
- **Phone / 手机**：1/1.28", 1/1.56", 1/2"
- **Cinema / 电影机**：Super 35, Full Frame Cinema, M4/3 Cinema

## 📄 License

MIT
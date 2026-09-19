/**
 * i18n.js
 * Translation dictionary and proxy for Chinese / English UI strings.
 *
 * All user-visible strings are stored here. Access the current-language
 * translation through the `i18n` proxy using camelCase keys, e.g. i18n.appTitle.
 */

const translations = {
  zh: {
    // Header
    appTitle: '📷 相机拍摄计算器',
    subtitle: '拍摄距离 · 成像大小 · 景深 · 焦外光斑直径',

    // Input panel
    inputTitle: '参数输入',
    sensor: '画幅 / 传感器',
    focal: '焦距 (mm)',
    aperture: '光圈 f 值',
    distance: '对焦距离 (m)',
    compLock: '构图锁定',
    subjectSizeGroup: '被摄物尺寸 (m)',
    subjectWidth: '水平宽度',
    subjectHeight: '垂直高度',
    subjectLength: '物体长度',
    imagingLength: '成像长度',
    eyeHeight: '相机相对地面高度 (m)',
    subjectSizeHint: '用于计算成像大小及构图（如人物宽 0.6m、高 1.7m）',
    cocPreset: '景深清晰度标准',
    cocLoose: '宽松（景深更深）',
    cocNormal: '一般（标准）',
    cocStrict: '严格（景深更浅）',
    cocValueLabel: 'CoC 直径 (mm)',
    cocHint: 'CoC 越小 = 对清晰度要求越严格，计算的景深越浅',
    bgDistance: '背景/焦外点距离 (m)',
    bgDistanceHint: '背景距离与光源尺寸用于计算焦外光斑直径',
    bgLightSize: '焦外光源实际直径 (m)',
    bgLightSizeHint: '0 = 点光源（理想光斑）',
    reset: '重置默认值',
    optional: '可选',
    tabBasic: '基本',
    tabDof: '景深',
    tabBokeh: '焦外',

    // Result panel
    resultTitle: '计算结果',
    shotType: '景别（当前构图）',
    shotTypeUnit: '大特写 / 特写 / 中近景 / 中景 / 中全景 / 全景 / 远景 / 大远景',
    shotTypeECU: '大特写',
    shotTypeCU: '特写',
    shotTypeMCU: '中近景',
    shotTypeMS: '中景',
    shotTypeMFS: '中全景',
    shotTypeFS: '全景',
    shotTypeLS: '远景',
    shotTypeELS: '大远景',
    subjectType: '被摄物类型',
    subjectTypePerson: '人',
    subjectTypeObject: '物体',
    orientation: '画面方向',
    orientationLandscape: '横屏',
    orientationPortrait: '竖屏',
    personHeightHint: '按平均身高 1.7m 计算，已预留头部空间',
    equivFocal: '等效焦距 (35mm 全画幅)',
    fov: '视角 (水平 × 垂直)',
    imageSize: '成像大小（被摄物）',
    imageWidth: '成像宽度',
    imageHeight: '成像高度',
    personImagingLength: '人成像长度',
    magnification: '放大倍率',
    fovWidth: '水平视野宽度',
    fovHeight: '垂直视野高度',

    dofTitle: '景深 (Depth of Field)',
    dofTotal: '总景深',
    dofNear: '前景深',
    dofFar: '后景深',
    dofRange: '清晰范围',
    hyperfocal: '超焦距',
    entrancePupil: '入瞳直径',

    bokehTitle: '焦外光斑 (Bokeh)',
    bokehSensor: '焦外光斑直径（传感器上）',
    bokehRatio: '光斑占画幅比例',
    bokehPixels: '光斑像素直径',
    bokehBlur: '背景模糊程度',

    dofVisual: '景深可视化',
    dofDragHint: '拖动景深范围两端可反向调整光圈',
    viewReset: '重置',
    bokehVisual: '焦外光斑预览',
    sceneTopVisual: '俯视图：相机与被摄物距离',
    sceneSideVisual: '侧视图：被摄物高度 · 垂直视角',
    scenePersonVisual: '人像构图视图',
    scenePersonTopVisual: '俯视图：相机与人物位置',
    camHeight: '相机高度',
    tiltAngle: '倾斜角度',
    personDragHint: '拖动人物上下调整取景位置',

    // Formula
    formulaTitle: '计算公式说明',
    fEquivTitle: '等效焦距',
    fEquivCode: 'f_equiv = f × 裁切系数',
    fEquivDesc: '裁切系数 = 43.27mm（全画幅对角线）÷ 传感器对角线',
    fFovTitle: '视角',
    fFovDesc: 'd 为传感器对应边尺寸（水平/垂直/对角）',
    fMagTitle: '成像大小 / 放大倍率',
    fMagDesc: 'u 为物距，h 为被摄物实际尺寸，h\' 为成像尺寸',
    fDofTitle: '景深',
    fDofDesc: 'H 为超焦距，N 为光圈 f 值，c 为弥散圆直径',
    fBokehTitle: '焦外光斑直径',
    fBokehDesc1: 'A 为入瞳直径 = f / N，u_bg 为背景距离',
    fBokehDesc2: '简化（远景）：B ≈ A × f / (u − f)',

    // Units
    unitMm: 'mm',
    unitDeg: '度',
    unitM: 'm',
    unitPx: 'px',
    unitLevel: '等级',
    unitPercent: '%',
    unitTimes: '×',
    unitMmRatio: 'mm / 占画幅',

    // Sensor info
    sensorInfo: (w, h, diag, crop, coc) =>
      `尺寸 ${w}×${h} mm · 对角线 ${diag} mm · 裁切系数 ${crop}× · CoC ${coc} mm`,

    // Blur levels
    blurLevels: ['几乎不可见', '轻微', '可见', '明显', '强烈', '非常强烈', '奶油般虚化'],

    // Visualization
    dofRangeLabel: '景深范围',
    focusPoint: '对焦点',
    dofConclusionLabel: '景深结论',
    dofConclusionTiny: '景深极浅，仅能保证局部（如眼睛）清晰',
    dofConclusionFace: '景深较浅，仅能保证面部清晰',
    dofConclusionBody: '景深适中，可保证单人身体基本清晰',
    dofConclusionSingleRow: '景深充足，多人单排平面基本清晰',
    dofConclusionTwoRows: '景深很大，多人两排均可清晰',
    bokehLabel: (d, ratio, blur) =>
      `光斑直径 ${d} mm · 占画幅 ${ratio}% · ${blur}`,

    // Scene visualization labels
    sceneCamera: '相机',
    sceneSubject: '被摄物',
    sceneDistance: '拍摄距离',
    inFrame: '完全在画面内',
    partialFrame: '部分在画面内',
    outFrame: '在画面外',

    // Footer
    footer: '相机拍摄计算器 · 纯前端实现 · 所有计算在本地浏览器完成',
    formulaLink: '查看详细公式说明 →',

    // Language switch
    langLabel: '语言',
    langZh: '中文',
    langEn: 'English'
  },

  en: {
    // Header
    appTitle: '📷 Camera Calculator',
    subtitle: 'Shooting Distance · Image Size · Depth of Field · Bokeh Diameter',

    // Input panel
    inputTitle: 'Parameters',
    sensor: 'Format / Sensor',
    focal: 'Focal Length (mm)',
    aperture: 'Aperture f-number',
    distance: 'Focus Distance (m)',
    compLock: 'Lock Framing',
    subjectSizeGroup: 'Subject Size (m)',
    subjectWidth: 'Width',
    subjectHeight: 'Height',
    subjectLength: 'Subject Length',
    imagingLength: 'Imaging Length',
    eyeHeight: 'Camera Height Level (m)',
    subjectSizeHint: 'Used to compute image size & framing (e.g. person 0.6×1.7m)',
    cocPreset: 'Depth-of-field Sharpness',
    cocLoose: 'Loose (deeper DoF)',
    cocNormal: 'Normal (standard)',
    cocStrict: 'Strict (shallower DoF)',
    cocValueLabel: 'CoC Diameter (mm)',
    cocHint: 'Smaller CoC = stricter sharpness, shallower DoF',
    bgDistance: 'Background / OOF Distance (m)',
    bgDistanceHint: 'Background distance & light size are used to compute bokeh diameter',
    bgLightSize: 'OOF Light Source Size (m)',
    bgLightSizeHint: '0 = point light source (ideal bokeh)',
    reset: 'Reset Defaults',
    optional: 'optional',
    tabBasic: 'Basic',
    tabDof: 'Depth of Field',
    tabBokeh: 'Bokeh',

    // Result panel
    resultTitle: 'Results',
    shotType: 'Shot Type (framing)',
    shotTypeUnit: 'ECU / CU / MCU / MS / MFS / FS / LS / ELS',
    shotTypeECU: 'Extreme Close-up',
    shotTypeCU: 'Close-up',
    shotTypeMCU: 'Medium Close-up',
    shotTypeMS: 'Medium Shot',
    shotTypeMFS: 'Medium Full Shot',
    shotTypeFS: 'Full Shot',
    shotTypeLS: 'Long Shot',
    shotTypeELS: 'Extreme Long Shot',
    subjectType: 'Subject Type',
    subjectTypePerson: 'Person',
    subjectTypeObject: 'Object',
    orientation: 'Orientation',
    orientationLandscape: 'Landscape',
    orientationPortrait: 'Portrait',
    personHeightHint: 'Based on average height 1.7m, headroom reserved',
    equivFocal: '35mm Equivalent Focal Length',
    fov: 'Field of View (H × V)',
    imageSize: 'Image Size (Subject)',
    imageWidth: 'Image Width',
    imageHeight: 'Image Height',
    personImagingLength: 'Person Imaging Length',
    magnification: 'Magnification',
    fovWidth: 'Horizontal FOV Width',
    fovHeight: 'Vertical FOV Height',

    dofTitle: 'Depth of Field',
    dofTotal: 'Total DoF',
    dofNear: 'Front DoF',
    dofFar: 'Rear DoF',
    dofRange: 'Sharp Range',
    hyperfocal: 'Hyperfocal Distance',
    entrancePupil: 'Entrance Pupil',

    bokehTitle: 'Bokeh',
    bokehSensor: 'Bokeh Diameter (on sensor)',
    bokehRatio: 'Bokeh / Frame Ratio',
    bokehPixels: 'Bokeh Pixel Diameter',
    bokehBlur: 'Background Blur',

    dofVisual: 'Depth of Field Visualization',
    dofDragHint: 'Drag the DoF range edges to adjust aperture',
    viewReset: 'Reset',
    bokehVisual: 'Bokeh Preview',
    sceneTopVisual: 'Top View: Camera to Subject Distance',
    sceneSideVisual: 'Side View: Subject Height & Vertical FOV',
    scenePersonVisual: 'Portrait Framing View',
    scenePersonTopVisual: 'Top View: Camera & Person Position',
    camHeight: 'Camera Height',
    tiltAngle: 'Tilt Angle',
    personDragHint: 'Drag the person to adjust framing',

    // Formula
    formulaTitle: 'Formulas',
    fEquivTitle: 'Equivalent Focal Length',
    fEquivCode: 'f_equiv = f × crop factor',
    fEquivDesc: 'Crop factor = 43.27mm (FF diagonal) ÷ sensor diagonal',
    fFovTitle: 'Field of View',
    fFovDesc: 'd is the sensor dimension (horizontal/vertical/diagonal)',
    fMagTitle: 'Image Size / Magnification',
    fMagDesc: 'u = object distance, h = subject size, h\' = image size',
    fDofTitle: 'Depth of Field',
    fDofDesc: 'H = hyperfocal, N = f-number, c = circle of confusion',
    fBokehTitle: 'Bokeh Diameter',
    fBokehDesc1: 'A = entrance pupil = f / N, u_bg = background distance',
    fBokehDesc2: 'Simplified (far background): B ≈ A × f / (u − f)',

    // Units
    unitMm: 'mm',
    unitDeg: '°',
    unitM: 'm',
    unitPx: 'px',
    unitLevel: 'level',
    unitPercent: '%',
    unitTimes: '×',
    unitMmRatio: 'mm / frame',

    // Sensor info
    sensorInfo: (w, h, diag, crop, coc) =>
      `Size ${w}×${h} mm · Diagonal ${diag} mm · Crop ${crop}× · CoC ${coc} mm`,

    // Blur levels
    blurLevels: ['Invisible', 'Slight', 'Visible', 'Noticeable', 'Strong', 'Very Strong', 'Creamy'],

    // Visualization
    dofRangeLabel: 'DoF Range',
    focusPoint: 'Focus',
    dofConclusionLabel: 'DoF Conclusion',
    dofConclusionTiny: 'Very shallow DoF, only local area (e.g. eyes) sharp',
    dofConclusionFace: 'Shallow DoF, only the face is sharp',
    dofConclusionBody: 'Moderate DoF, a single person body stays sharp',
    dofConclusionSingleRow: 'Sufficient DoF, a single row of people stays sharp',
    dofConclusionTwoRows: 'Large DoF, two rows of people stay sharp',
    bokehLabel: (d, ratio, blur) =>
      `Bokeh ${d} mm · ${ratio}% of frame · ${blur}`,

    // Scene visualization labels
    sceneCamera: 'Camera',
    sceneSubject: 'Subject',
    sceneDistance: 'Distance',
    inFrame: 'Fully in frame',
    partialFrame: 'Partially in frame',
    outFrame: 'Out of frame',

    // Footer
    footer: 'Camera Calculator · Pure front-end · All calculations run locally',
    formulaLink: 'View detailed formulas →',

    // Language switch
    langLabel: 'Language',
    langZh: '中文',
    langEn: 'English'
  }
};

let currentLang = 'zh';

// Proxy that returns the translation for the current language on every access.
const i18n = new Proxy({}, {
  get(_target, key) {
    return translations[currentLang][key];
  }
});

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}
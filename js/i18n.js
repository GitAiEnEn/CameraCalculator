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
    bgDistance: '焦外到对焦点距离 (m)',
    bgDistanceHint: '负值为对焦点前方（前景），正值为对焦点后方（后景）',
    bgLightSize: '焦外光源实际直径 (m)',
    bgLightSizeHint: '0 = 点光源（理想光斑）',
    reset: '重置默认值',
    optional: '可选',
    tabBasic: '基本',
    tabDof: '景深',
    tabBokeh: '焦外',
    tabEv: '环境',

    evSuitableTitle: '环境适应结论',
    evViewVisual: '环境适应视图',
    evTableTitle: 'EV 典型环境参考表',
    evTableEv: 'EV',
    evTableScene: '典型环境',
    evTableDesc: '描述',

    // Environment (EV) inputs
    evStabStops: '防抖等级 (档)',
    evStabOff: '无防抖',
    evManualShutter: '手动安全快门 (1/x s)',
    evManualTag: '手动',
    evStabHint: '安全快门 = 1/(焦距 ÷ 2^防抖档数)，且不低于 1/60 s；手动填写后优先使用手动值',
    evSafeIsoLabel: '安全 ISO',
    evSafeIsoHint: '按画幅自动给出默认值，可手动修改',
    evCustomGroup: '自定义曝光组合',
    evCustomIso: 'ISO',
    evCustomShutter: '快门 (1/x s)',
    evCompensation: '环境补偿 (EV)',
    evCustomHint: '填写 ISO 与快门后，视图中会用青色标记显示该组合可应对的最暗环境',
    evCustomEmpty: '未填写',

    // EV view combo manager
    evComboLabel: '组合',
    evCombosTitle: '曝光组合（可添加多个，标记显示在上方视图）',
    evAddCombo: '+ 添加曝光组合',
    evComboSceneAt: (ev, scene) => `EV ${ev} · ${scene}`,

    // Environment (EV) cards
    evMinCard: '最暗可拍环境',
    evSafeShutterCard: '安全快门',
    evCustomCard: '自定义组合可拍',
    evCameraLabel: '相机',
    evDarkestLabel: '最暗可拍',
    evCustomLabel: '自定义',
    evSuitableText: (minEv, minScene, maxScene) =>
      `当前设置可应对 EV ${minEv} 及更亮的环境：${minScene} ~ ${maxScene}`,
    evCustomText: (ev, scene) => `自定义组合可应对 EV ${ev} 起：${scene}`,

    // EV typical scene reference (EV -4 .. 16)
    evSceneShort: [
      '深空星空', '无月郊外', '新月野外', '星光微光', '满月野外',
      '郊区深夜', '城市街巷', '昏暗小巷', '夜商业街', '夜间广场',
      '较亮餐厅', '居家灯光', '明亮室内', '明亮商场', '阴天阴影',
      '完全阴天', '薄云阴天', '黄金时刻', '晴天树荫', '正午日光',
      '烈日雪地'
    ],
    evSceneDesc: [
      '没有月亮、远离城市光污染的深空星空，伸手几乎完全看不见',
      '无月郊外深夜，只有微弱银河辉光，勉强分辨物体轮廓',
      '新月夜晚野外，远处零星微光，辨认物体很吃力',
      '郊外，只有星光+微弱环境天光',
      '满月，开阔野外空地，可以徒步，阴影柔和',
      '城市郊区深夜，微弱路灯，远处建筑光晕',
      '城市深夜街巷 / 烛光环境，人脸需要补光才拍得干净',
      '昏暗小巷、公园深夜，少量街灯；室内极暗包间',
      '夜晚商业街、低亮度橱窗；很暗的小酒馆',
      '夜间广场、路边店铺灯光；普通酒吧',
      '较亮的餐厅、暗光漫展场馆、晚会舞台观众席',
      '普通居家室内灯光，灯光一般的展厅',
      '明亮居家、普通会议室、商场通道',
      '明亮商场、灯光充足漫展内场、大型展厅',
      '阴天阴影里，建筑物背阴处（室外）',
      '全天完全阴天、厚乌云笼罩户外',
      '薄云阴天，没有直射阳光',
      '清晨/傍晚黄金时刻，柔和顺光',
      '晴天树荫底下，太阳被遮挡',
      '晴天开阔地，正午日光（摄影常用基准日光）',
      '烈日暴晒、雪地/白沙滩正午，强光反射'
    ],

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

    // DoF conclusion cards
    dofLevel: '景深等级',
    dofLevelUnit: '极浅 / 较浅 / 适中 / 宽 / 极大',
    dofLevelExtreme: '极浅',
    dofLevelShallow: '较浅',
    dofLevelModerate: '适中',
    dofLevelWide: '宽',
    dofLevelHuge: '极大',
    dofSharpRangeTitle: '清晰对象',
    dofSharpUnit: '按人像拍摄经验估算',
    dofSharpOneEye: '单眼清晰',
    dofSharpEyes: '人眼清晰',
    dofSharpFace: '面部清晰',
    dofSharpHalfBody: '半身清晰',
    dofSharpFullBody: '全身清晰',
    dofSharpMultiRows: '多排人物清晰',

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
    uploadImage: '上传图片',
    removeImage: '移除图片',
    editPose: '调整姿势',
    panImage: '调整图片',
    personTab: '人物',
    viewPortrait: '人像构图',
    viewTop: '俯视图',
    viewSide: '侧视图',

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
    fBokehDesc1: 'A 为入瞳直径 = f / N，Δ 为焦外到对焦点距离（负=前景，正=后景）',
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
    dofConclusionEye: '景深极浅，仅能对焦眼部（单眼清晰）',
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
    bgDistance: 'OOF-to-Focus Offset (m)',
    bgDistanceHint: 'Negative = in front of focus (foreground), positive = behind (background)',
    bgLightSize: 'OOF Light Source Size (m)',
    bgLightSizeHint: '0 = point light source (ideal bokeh)',
    reset: 'Reset Defaults',
    optional: 'optional',
    tabBasic: 'Basic',
    tabDof: 'Depth of Field',
    tabBokeh: 'Bokeh',
    tabEv: 'Environment',

    evSuitableTitle: 'Environment Suitability',
    evViewVisual: 'Environment Capability View',
    evTableTitle: 'EV Typical Scene Reference',
    evTableEv: 'EV',
    evTableScene: 'Typical Scene',
    evTableDesc: 'Description',

    // Environment (EV) inputs
    evStabStops: 'Stabilization (stops)',
    evStabOff: 'No stabilization',
    evManualShutter: 'Manual Safe Shutter (1/x s)',
    evManualTag: 'Manual',
    evStabHint: 'Safe shutter = 1/(focal ÷ 2^stops), never slower than 1/60 s; manual entry takes precedence',
    evSafeIsoLabel: 'Safe ISO',
    evSafeIsoHint: 'Defaults by sensor size; adjustable',
    evCustomGroup: 'Custom Exposure Settings',
    evCustomIso: 'ISO',
    evCustomShutter: 'Shutter (1/x s)',
    evCompensation: 'Exposure Compensation (EV)',
    evCustomHint: 'With ISO and shutter filled in, a cyan marker shows the darkest scene that combo can handle',
    evCustomEmpty: 'not filled',

    // EV view combo manager
    evComboLabel: 'Combo',
    evCombosTitle: 'Exposure Combos (add multiple; markers shown on the view above)',
    evAddCombo: '+ Add Exposure Combo',
    evComboSceneAt: (ev, scene) => `EV ${ev} · ${scene}`,

    // Environment (EV) cards
    evMinCard: 'Darkest Usable Scene',
    evSafeShutterCard: 'Safe Shutter',
    evCustomCard: 'Custom Settings Scene',
    evCameraLabel: 'Camera',
    evDarkestLabel: 'darkest OK',
    evCustomLabel: 'Custom',
    evSuitableText: (minEv, minScene, maxScene) =>
      `Current setup handles EV ${minEv} and brighter: ${minScene} ~ ${maxScene}`,
    evCustomText: (ev, scene) => `Custom settings handle EV ${ev} and brighter: ${scene}`,

    // EV typical scene reference (EV -4 .. 16)
    evSceneShort: [
      'Deep sky', 'Moonless rural', 'New-moon wild', 'Starlight', 'Full moon',
      'Suburb night', 'City alley', 'Dim lane', 'Night street', 'Night plaza',
      'Bright diner', 'Home indoor', 'Bright room', 'Bright mall', 'Cloudy shade',
      'Overcast', 'Thin cloud', 'Golden hour', 'Sunny shade', 'Noon sun',
      'Snow noon'
    ],
    evSceneDesc: [
      'Moonless deep-sky night far from city light pollution; can barely see your hand',
      'Moonless suburban late night, faint Milky Way glow; object outlines barely visible',
      'New-moon countryside with a few distant lights; recognizing objects is hard',
      'Countryside with only starlight and faint skyglow',
      'Full moon over an open field; walking is possible, soft shadows',
      'Suburban late night, faint street lamps, distant building glow',
      'Deep-night city alleys / candlelight; faces need fill light',
      'Dim lanes and late-night parks with few lamps; very dark private rooms',
      'Night shopping streets with dim shop windows; dark taverns',
      'Night plazas with roadside shop lighting; ordinary bars',
      'Brighter restaurants, dim convention halls, gala audience seats',
      'Typical home interior lighting, average-lit exhibition halls',
      'Bright homes, ordinary meeting rooms, mall corridors',
      'Bright malls, well-lit convention floors, large exhibition halls',
      'In shade on a cloudy day, building shadow outdoors',
      'Fully overcast all day, thick clouds outdoors',
      'Thin clouds, no direct sunlight',
      'Sunrise/sunset golden hour, soft frontal light',
      'Under tree shade on a sunny day, sun blocked',
      'Open sunny ground at noon (standard photographic daylight)',
      'Blazing sun, snow / white beach at noon, strong reflections'
    ],

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

    // DoF conclusion cards
    dofLevel: 'DoF Level',
    dofLevelUnit: 'Extreme / Shallow / Moderate / Wide / Huge',
    dofLevelExtreme: 'Extreme',
    dofLevelShallow: 'Shallow',
    dofLevelModerate: 'Moderate',
    dofLevelWide: 'Wide',
    dofLevelHuge: 'Huge',
    dofSharpRangeTitle: 'Sharp Subject',
    dofSharpUnit: 'Estimated from portrait experience',
    dofSharpOneEye: 'Single eye sharp',
    dofSharpEyes: 'Eyes sharp',
    dofSharpFace: 'Face sharp',
    dofSharpHalfBody: 'Half body sharp',
    dofSharpFullBody: 'Full body sharp',
    dofSharpMultiRows: 'Multiple rows sharp',

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
    uploadImage: 'Upload Image',
    removeImage: 'Remove Image',
    editPose: 'Edit Pose',
    panImage: 'Adjust Image',
    personTab: 'Person',
    viewPortrait: 'Portrait',
    viewTop: 'Top View',
    viewSide: 'Side View',

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
    fBokehDesc1: 'A = entrance pupil = f / N, Δ = OOF-to-focus offset (neg. = foreground, pos. = background)',
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
    dofConclusionEye: 'Extremely shallow DoF, only the eye can be focused',
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
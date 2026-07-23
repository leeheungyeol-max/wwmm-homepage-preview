(function () {
  "use strict";

  const STORAGE_KEY = "wwmm-language";
  const labels = { ko: "KO", ja: "JA", "zh-CN": "CN", en: "EN" };
  const languages = Object.keys(labels);
  const textRecords = new WeakMap();

  const properNames = {
    "김도윤 원장": { ja: "キム・ドユン院長", "zh-CN": "金道允院长", en: "Dr. Doyun Kim" },
    "이준서 원장": { ja: "イ・ジュンソ院長", "zh-CN": "李俊瑞院长", en: "Dr. Junseo Lee" },
    "박현우 원장": { ja: "パク・ヒョヌ院長", "zh-CN": "朴贤宇院长", en: "Dr. Hyunwoo Park" },
    "정하윤 원장": { ja: "チョン・ハユン院長", "zh-CN": "郑河允院长", en: "Dr. Hayoon Jeong" },
    "서민재 원장": { ja: "ソ・ミンジェ院長", "zh-CN": "徐敏宰院长", en: "Dr. Minjae Seo" },
    "한지율 원장": { ja: "ハン・ジユル院長", "zh-CN": "韩志律院长", en: "Dr. Jiyul Han" },
    "바른턱 치과": { ja: "バルントク歯科クリニック", "zh-CN": "巴伦托克牙科诊所", en: "Barunteok Dental Clinic" },
    "미소라인 치과": { ja: "ミソライン歯科クリニック", "zh-CN": "米索莱恩牙科诊所", en: "Miso Line Dental Clinic" },
    "페이스밸런스 치과": { ja: "フェイスバランス歯科クリニック", "zh-CN": "菲斯拜伦斯牙科诊所", en: "Face Balance Dental Clinic" },
    "라인아트 치과": { ja: "ラインアート歯科クリニック", "zh-CN": "莱茵阿特牙科诊所", en: "Line Art Dental Clinic" },
    "베니어랩 치과": { ja: "ベニアラボ歯科クリニック", "zh-CN": "维尼尔莱博牙科诊所", en: "Veneer Lab Dental Clinic" },
    "하모니덴탈": { ja: "ハーモニーデンタル", "zh-CN": "哈摩尼牙科", en: "Harmony Dental" },
    "Gangnam Signature Dental": { ja: "カンナム・シグネチャー・デンタル", "zh-CN": "江南西格尼彻牙科", en: "Gangnam Signature Dental" },
    "Aurora Dental Studio": { ja: "オーロラ・デンタルスタジオ", "zh-CN": "欧若拉牙科工作室", en: "Aurora Dental Studio" },
    "Harmony Dental House": { ja: "ハーモニー・デンタルハウス", "zh-CN": "哈摩尼牙科会馆", en: "Harmony Dental House" },
    "Aegis Dental": { ja: "イージス・デンタル", "zh-CN": "艾吉斯牙科", en: "Aegis Dental" },
    "Luxe Smile Clinic": { ja: "リュクス・スマイル・クリニック", "zh-CN": "卢克斯微笑诊所", en: "Luxe Smile Clinic" },
    "Luxe Smile Botanical": { ja: "リュクス・スマイル・ボタニカル", "zh-CN": "卢克斯微笑博塔尼科", en: "Luxe Smile Botanical" }
  };

  const copy = {
    "아름다움의 완성을 위한 0.01mm.": {
      ja: "美しさを完成へ導く、0.01mm。", "zh-CN": "成就美的最后0.01mm。", en: "The final 0.01mm of beauty."
    },
    "윔 라인이 아름다움을 약속합니다.": {
      ja: "ww'mm lineが、美しさの調和を約束します。", "zh-CN": "ww'mm line，承诺恰到好处的美。", en: "The ww'mm line, perfected in balance."
    },
    "완벽한 균형(Facial Harmony)은 우연이 아닌, 첨단 기술과 치밀한 계산에서 시작됩니다. 0.01mm의 오차도 허용하지 않는 정교함으로 얼굴 전체의 심미성을 완성합니다.": {
      ja: "Facial Harmonyは偶然ではありません。先端技術と緻密な設計、0.01mmの精度が、顔全体の美しさを完成へ導きます。",
      "zh-CN": "Facial Harmony并非偶然。前沿技术与缜密设计，以0.01mm的精准，成就整体面容之美。",
      en: "Facial Harmony is never accidental. Advanced technology and meticulous design refine the entire face with 0.01mm precision."
    },
    "당신의 얼굴에 숨겨진 황금비율,": { ja: "顔に秘められた黄金比。", "zh-CN": "发现面容中隐匿的黄金比例，", en: "The golden ratio within your face," },
    "완벽한 균형의 ww'mm line.": { ja: "調和を極める、ww'mm line。", "zh-CN": "凝练为和谐有度的ww'mm line。", en: "refined into the ww'mm line." },
    "치아의 각도와 볼륨의 섬세한 조정으로, 안모 전체가 조화를 이루며 당신이 가진 본연의 품격이 새롭게 피어납니다.": {
      ja: "歯の角度とボリュームを繊細に整え、顔立ち全体に調和を。あなた本来の品格が、静かに際立ちます。",
      "zh-CN": "细腻调整牙齿角度与丰盈度，让面容归于和谐，唤醒与生俱来的优雅。",
      en: "Subtle refinements in angle and volume bring the entire face into harmony, revealing an elegance distinctly your own."
    },
    "당신만의 ww'mm line을 찾아 보세요.": { ja: "あなただけのww'mm lineを。", "zh-CN": "遇见专属于你的ww'mm line。", en: "Discover your own ww'mm line." },
    "사진 두 장이면 충분합니다.": { ja: "必要なのは、2枚の写真だけ。", "zh-CN": "只需两张照片。", en: "Two photographs are all it takes." },
    "심미를 향한 0.01mm의 집요함.": { ja: "美を追求する、0.01mmへのこだわり。", "zh-CN": "于0.01mm之间，执着于美。", en: "An unwavering pursuit of beauty, down to 0.01mm." },
    "완벽한 균형을 위한 테크놀로지.": { ja: "完璧な調和を支える、先端技術。", "zh-CN": "以精密技术，成就理想平衡。", en: "Technology engineered for perfect harmony." },
    "ww'mm은 초정밀 교합 조정을 통해 안모의 완벽한 조화를 실현하며, 스마일 라인과 E-line이 입체적인 조화를 이루는 나만의 ww'mm line을 완성합니다.": {
      ja: "ww'mmは精密な咬合調整から、Smile LineとE-lineが立体的に響き合う、あなただけのww'mm lineを設計します。",
      "zh-CN": "ww'mm以超精密咬合调整，让Smile Line与E-line立体相融，塑造专属于你的ww'mm line。",
      en: "Through ultra-precise occlusal refinement, ww'mm brings the Smile Line and E-line into three-dimensional harmony, creating a line uniquely yours."
    },
    "클래스 II 한계 극복": { ja: "Class IIの限界を超えて", "zh-CN": "突破Class II的界限", en: "Beyond Class II Limitations" },
    "무너진 교합을 0.01mm 단위의 첨단 기술로 재설계하여 까다로운 딥바이트까지 심미적으로 해결하는 결과를 설계합니다.": {
      ja: "崩れた咬合を0.01mm単位で再設計。難しいディープバイトにも、機能と美しさを両立する答えを導きます。", "zh-CN": "以0.01mm精度重塑咬合，为复杂深覆合寻得兼顾功能与美感的解决方案。", en: "Occlusion is redesigned with 0.01mm precision to resolve even complex deep bites with both function and aesthetics in mind."
    },
    "안모 밸런스 교정 시스템": { ja: "顔貌バランス設計システム", "zh-CN": "面部平衡设计系统", en: "Facial Balance Design System" },
    "치아만 보지 않습니다. 턱의 위치와 입술의 돌출도까지 복합적으로 판단해 하안면부의 완벽한 균형을 이끌어냅니다.": {
      ja: "見るのは歯だけではありません。顎の位置や唇の突出感まで丁寧に読み解き、下顔面の調和を整えます。", "zh-CN": "不止关注牙齿，更综合考量颌位与唇部突度，细致重塑下半面部的协调感。", en: "We look beyond the teeth, considering jaw position and lip projection to compose balance throughout the lower face."
    },
    "0.01mm 마이크로 세라믹 가공": { ja: "0.01mm精度のマイクロセラミック加工", "zh-CN": "0.01mm微瓷精工", en: "0.01mm Micro-Ceramic Craft" },
    "첨단 디지털 스캐닝과 마스터의 세공 기술로 내 치아처럼 편안하고 품격 있는 핏을 완성합니다.": {
      ja: "先進のデジタルスキャンと熟練の手仕事で、自分の歯のように自然で心地よい仕上がりを叶えます。", "zh-CN": "融合先进数字扫描与匠人技艺，成就如原生牙般舒适、自然且精致的贴合。", en: "Advanced digital scanning meets master craftsmanship for a refined fit that feels naturally your own."
    },
    "0.01mm의 심미적 차이를 만드는": { ja: "0.01mmの美しさを形にする", "zh-CN": "雕琢0.01mm美学差异的", en: "The masters behind a" },
    "마스터 아티잔.": { ja: "熟練のマスター・アルチザン。", "zh-CN": "美学匠人。", en: "0.01mm aesthetic difference." },
    "치과 위치 보기": { ja: "クリニックの所在地", "zh-CN": "查看诊所位置", en: "View Clinic Location" },
    "약력": { ja: "経歴", "zh-CN": "履历", en: "Profile" },
    "교합 안정성과 안모 균형을 동시에 설계하는 초정밀 분석을 이끕니다.": { ja: "咬合の安定と顔貌の調和を同時に見据えた、精密な分析を主導します。", "zh-CN": "以精密分析，同时考量咬合稳定与面部平衡。", en: "Leads precision analysis that considers occlusal stability and facial balance as one." },
    "스마일 아크와 미드라인의 미세한 변화를 조율합니다.": { ja: "スマイルアークとミッドラインの繊細な変化を丁寧に整えます。", "zh-CN": "细致协调微笑弧线与中线的细微变化。", en: "Refines the subtle relationship between the smile arc and midline." },
    "정면과 측면의 데이터를 결합해 개인별 조화 기준을 정교화합니다.": { ja: "正面と側面のデータを統合し、一人ひとりにふさわしい調和を精密に導きます。", "zh-CN": "融合正面与侧面数据，精准建立个性化的和谐标准。", en: "Combines frontal and profile data to define an individual standard of harmony." },
    "0.01mm 단위의 감각으로 표면과 경계를 완성합니다.": { ja: "0.01mm単位の感覚で、表面と境界を美しく仕上げます。", "zh-CN": "以0.01mm级的细腻感知，精修表面与边界。", en: "Finishes every surface and margin with sensitivity measured to 0.01mm." },
    "자연치와 가장 가까운 볼륨, 투명도, 착용감을 설계합니다.": { ja: "天然歯に限りなく近い、ボリューム、透明感、装着感を設計します。", "zh-CN": "细致设计接近天然牙的丰盈度、通透感与佩戴体验。", en: "Designs volume, translucency, and comfort to feel remarkably close to natural teeth." },
    "치아와 입술, 얼굴선이 이어지는 최종 균형을 검수합니다.": { ja: "歯、唇、フェイスラインへと続く、最終的な調和を見極めます。", "zh-CN": "审慎把控牙齿、双唇与面部轮廓相衔接的最终平衡。", en: "Reviews the final balance connecting teeth, lips, and the contours of the face." },
    "인생을 바꾸는 0.01mm의 약속을": { ja: "人生を変える0.01mmの約束を", "zh-CN": "一份关乎人生的0.01mm承诺", en: "A 0.01mm promise" },
    "지켜드립니다.": { ja: "誠実に守り続けます。", "zh-CN": "我们始终郑重守护。", en: "with the power to change a life." },
    "\"인생을 바꾸는 0.01mm의 약속을": { ja: "\"人生を変える0.01mmの約束を", "zh-CN": "\"一份关乎人生的0.01mm承诺", en: "\"A 0.01mm promise" },
    "지켜드립니다.\"": { ja: "誠実に守り続けます。\"", "zh-CN": "我们始终郑重守护。\"", en: "with the power to change a life.\"" },
    "라인이 조화를 이루면,": { ja: "ラインが美しく調和するとき、", "zh-CN": "当每一道线条归于和谐，", en: "When every line finds harmony," },
    "얼굴의 품격이 달라집니다.": { ja: "顔の印象は、品格へ変わる。", "zh-CN": "面容自有不凡气韵。", en: "the face takes on a new elegance." },
    "자연스럽게 조화되는 라인, 대화할 때 돋보이는 스마일 라인. 얼굴의 완벽한 균형을 되찾은 ww'mm line의 사례를 확인해 보세요.": {
      ja: "自然になじむライン、会話の中で美しく映えるSmile Line。顔全体の調和を整えたww'mm lineの症例をご覧ください。", "zh-CN": "自然相融的线条，谈笑间更显动人的Smile Line。见证ww'mm line如何重塑面部和谐。", en: "Naturally balanced lines. A Smile Line that comes alive in conversation. Discover cases refined through the harmony of the ww'mm line."
    },
    "조화는 사진보다 오래 남는": { ja: "調和が生む印象は、", "zh-CN": "和谐所成就的印象，", en: "Harmony creates an impression" },
    "인상을 만듭니다.": { ja: "写真よりも長く記憶に残る。", "zh-CN": "比影像更为长久。", en: "that outlasts the photograph." },
    "시술 전후의 변화는 단순히 치아의 흰색이 아니라, 얼굴 전체에서 읽히는 균형감으로 증명됩니다.": {
      ja: "変化を物語るのは、歯の白さだけではありません。顔全体から伝わる、自然な調和です。", "zh-CN": "改变不只在于牙齿的洁白，更体现在整张面容所呈现的和谐与平衡。", en: "Transformation is measured not simply in whiteness, but in the sense of balance expressed across the entire face."
    },
    "정밀함이 완성하는 자연스러운 균형.": { ja: "精密さが叶える、自然な調和。", "zh-CN": "以精准，成就自然平衡。", en: "Natural balance, perfected by precision." },
    "ww'mm Dental Studio를 만나야 할 시간.": { ja: "ww'mm Dental Studioと出会う時です。", "zh-CN": "此刻，遇见ww'mm Dental Studio。", en: "Now is the time to meet ww'mm Dental Studio." },
    "공식 인증 치과에서 시작하는": { ja: "公式認定クリニックから始まる", "zh-CN": "始于官方认证诊所的", en: "Precision begins at an" },
    "정밀 상담.": { ja: "精密なカウンセリング。", "zh-CN": "精密咨询。", en: "officially certified studio." },
    "선택한 스튜디오의 상세 정보와 위치는 아래 Location 영역에서 바로 확인할 수 있습니다.": { ja: "選択したStudioの詳細と所在地は、下のLocationでご確認いただけます。", "zh-CN": "所选Studio的详细信息与位置，可在下方Location区域查看。", en: "Find details and location information for your selected studio in the Location section below." },
    "가까운 치과 보기": { ja: "近くのクリニック", "zh-CN": "查看附近诊所", en: "FIND NEAREST" },
    "NEAR ME · 가까운 치과 보기": { ja: "NEAR ME · 近くのクリニック", "zh-CN": "NEAR ME · 查看附近诊所", en: "NEAR ME · FIND NEAREST" },
    "NEAR ME · 가까운 원장 보기": { ja: "NEAR ME · 近くのドクター", "zh-CN": "NEAR ME · 查看附近医生", en: "NEAR ME · FIND NEAREST" },
    "현재는 어드민에서 지정한 순서입니다.": { ja: "現在は指定順で表示しています。", "zh-CN": "当前按预设顺序显示。", en: "Currently shown in the curated order." },
    "이전 화면으로 돌아가기": { ja: "前の画面に戻る", "zh-CN": "返回上一页", en: "Back to Previous View" },
    "지도 설정을 확인하고 있습니다.": { ja: "地図の設定を確認しています。", "zh-CN": "正在确认地图设置。", en: "Checking map settings." },
    "완벽한 Facial Harmony를 향한": { ja: "完璧なFacial Harmonyへ。", "zh-CN": "通往至臻Facial Harmony的", en: "A refined moment toward" },
    "품격 있는 시간.": { ja: "美と向き合う、上質な時間。", "zh-CN": "优雅时刻。", en: "perfect Facial Harmony." },
    "프라이빗 상담을 통해 고객님의 아름다움을 함께 이야기합니다.": { ja: "プライベートカウンセリングを通して、あなたらしい美しさを丁寧に見つめます。", "zh-CN": "通过私享咨询，与您从容探寻专属之美。", en: "A private consultation devoted to understanding the beauty that is uniquely yours." },
    "프라이빗 1:1": { ja: "プライベート 1:1", "zh-CN": "私享 1:1", en: "Private 1:1" },
    "상담 예약하기": { ja: "カウンセリング予約", "zh-CN": "预约咨询", en: "Consultation" },
    "본인의 정면 사진과 측면 사진을 보내주세요. 첨단 ww'mm line의 AI 분석 시스템이 얼굴 사진을 입체적으로 분석하여, 0.01mm까지 계산된 가장 품격 있는 ww'mm line을 찾아드립니다.": {
      ja: "正面と側面、2枚の写真をお送りください。ww'mm lineのAI分析が顔立ちを立体的に読み解き、0.01mmまで緻密に設計した、あなたにふさわしいラインをご提案します。", "zh-CN": "请上传正面与侧面照片。ww'mm line AI分析将立体研判面部结构，为您呈现精准至0.01mm的专属优雅线条。", en: "Send us one front and one profile photograph. The ww'mm line AI analysis studies facial structure in three dimensions to reveal your most refined line, calculated to 0.01mm."
    },
    "이름": { ja: "お名前", "zh-CN": "姓名", en: "Name" },
    "전화번호": { ja: "電話番号", "zh-CN": "电话号码", en: "Phone" },
    "이메일": { ja: "メール", "zh-CN": "电子邮箱", en: "Email" },
    "상담 희망 내용": { ja: "ご相談内容", "zh-CN": "咨询内容", en: "How may we assist you?" },
    "Find my ww'mm line 분석 참여": { ja: "Find my ww'mm line 分析に参加", "zh-CN": "参与Find my ww'mm line分析", en: "Join the Find my ww'mm line analysis" },
    "정면 사진 촬영/업로드": { ja: "正面写真を撮影／アップロード", "zh-CN": "拍摄／上传正面照片", en: "Capture / Upload Front Photo" },
    "측면 사진 촬영/업로드": { ja: "側面写真を撮影／アップロード", "zh-CN": "拍摄／上传侧面照片", en: "Capture / Upload Profile Photo" },
    "카메라 촬영 또는 앨범 선택": { ja: "カメラで撮影、またはライブラリから選択", "zh-CN": "使用相机拍摄或从相册选择", en: "Use camera or choose from library" },
    "ww'mm(윔)을 통해 눈부시게 변화할 심미적 균형을 미리 확인해 보세요.": { ja: "ww'mmが描く、あなたらしい美しさの調和をひと足先にご体験ください。", "zh-CN": "提前感受ww'mm为您呈现的专属美学平衡。", en: "Preview the refined aesthetic balance that ww'mm can bring to life." },
    "개인정보 수집 및 상담 연락에 동의합니다": { ja: "個人情報の収集とご連絡に同意します", "zh-CN": "同意收集个人信息并接受咨询联系", en: "I consent to data collection and consultation contact" },
    "현재 위치에서 약": { ja: "現在地から約", "zh-CN": "距当前位置约", en: "Approximately" },
    "기본 순서로 보기": { ja: "指定順に戻す", "zh-CN": "恢复预设顺序", en: "CURATED ORDER" },
    "위치 확인 중...": { ja: "位置を確認中...", "zh-CN": "正在确认位置...", en: "LOCATING..." },
    "현재 위치를 확인하고 있습니다.": { ja: "現在地を確認しています。", "zh-CN": "正在确认当前位置。", en: "Detecting your current location." },
    "현재 위치 기준으로 가까운 순서로 정렬되었습니다.": { ja: "現在地から近い順に表示しています。", "zh-CN": "已按距当前位置由近至远排序。", en: "Sorted by distance from your current location." },
    "거리 계산을 위한 좌표가 없습니다.": { ja: "距離計算に必要な位置情報がありません。", "zh-CN": "暂无用于计算距离的坐标信息。", en: "Location coordinates are unavailable." },
    "어드민에서 지정한 기본 순서로 돌아왔습니다.": { ja: "指定された順序に戻しました。", "zh-CN": "已恢复预设顺序。", en: "Returned to the curated order." },
    "위치 권한이 허용되지 않아 기본 순서로 표시합니다.": { ja: "位置情報が許可されていないため、指定順で表示します。", "zh-CN": "未获位置权限，现按预设顺序显示。", en: "Location permission was not granted; showing the curated order." },
    "이 브라우저에서는 위치 기능을 사용할 수 없어 기본 순서로 표시합니다.": { ja: "このブラウザでは位置情報を利用できないため、指定順で表示します。", "zh-CN": "此浏览器无法使用位置功能，现按预设顺序显示。", en: "Location is unavailable in this browser; showing the curated order." },
    "상담 요청을 접수하고 있습니다.": { ja: "ご相談を送信しています。", "zh-CN": "正在提交咨询请求。", en: "Submitting your consultation request." },
    "상담 요청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.": { ja: "ご相談を承りました。確認後、担当者よりご連絡いたします。", "zh-CN": "咨询请求已提交。专属顾问确认后将与您联系。", en: "Your consultation request has been received. Our team will contact you after review." }
  };

  const placeholders = ["이름", "전화번호", "이메일", "상담 희망 내용"];

  function normalizeLanguage(value) {
    return languages.includes(value) ? value : "ko";
  }

  function countryLanguage(country) {
    const code = String(country || "").toUpperCase();
    if (code === "KR") return "ko";
    if (code === "JP") return "ja";
    if (["CN", "HK", "MO", "TW"].includes(code)) return "zh-CN";
    return code ? "en" : "ko";
  }

  function translated(source, language) {
    if (language === "ko") return source;
    if (copy[source]?.[language]) return copy[source][language];
    return Object.entries(properNames)
      .sort((left, right) => right[0].length - left[0].length)
      .reduce((result, [name, values]) => result.replaceAll(name, values[language] || name), source);
  }

  function applyText(root, language) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let record = textRecords.get(node);
      if (!record || (record.lastRendered != null && node.nodeValue !== record.lastRendered)) {
        record = { source: node.nodeValue, lastRendered: null };
        textRecords.set(node, record);
      }
      const source = record.source.trim();
      const leading = record.source.match(/^\s*/)[0];
      const trailing = record.source.match(/\s*$/)[0];
      const rendered = `${leading}${translated(source, language)}${trailing}`;
      record.lastRendered = rendered;
      if (node.nodeValue !== rendered) node.nodeValue = rendered;
    });
  }

  function applyAttributes(language) {
    document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((element) => {
      if (!element.dataset.originalPlaceholder) element.dataset.originalPlaceholder = element.placeholder;
      const source = element.dataset.originalPlaceholder;
      if (placeholders.includes(source)) element.placeholder = translated(source, language);
    });
  }

  function updateSwitchers(language) {
    document.querySelectorAll("[data-language-switcher] button").forEach((button) => {
      button.setAttribute("aria-current", String(button.dataset.language === language));
    });
  }

  function setLanguage(language, options = {}) {
    const next = normalizeLanguage(language);
    document.documentElement.lang = next;
    document.documentElement.dataset.language = next;
    applyText(document.body, next);
    applyAttributes(next);
    updateSwitchers(next);
    if (options.manual) localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("wwmm:languagechange", { detail: { language: next } }));
  }

  function buildSwitchers() {
    document.querySelectorAll("[data-language-switcher]").forEach((switcher) => {
      switcher.innerHTML = languages.map((language) =>
        `<button type="button" data-language="${language}" aria-label="${labels[language]} language">${labels[language]}</button>`
      ).join("");
      switcher.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-language]");
        if (button) setLanguage(button.dataset.language, { manual: true });
      });
    });
  }

  function useDetectedCountry(country) {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setLanguage(countryLanguage(country));
  }

  buildSwitchers();
  setLanguage(localStorage.getItem(STORAGE_KEY) || "ko");

  const observer = new MutationObserver((mutations) => {
    const language = document.documentElement.dataset.language || "ko";
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) applyText(node, language);
      if (node.nodeType === Node.TEXT_NODE && node.parentElement) applyText(node.parentElement, language);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.wwmmI18n = { setLanguage, useDetectedCountry, t: (source) => translated(source, document.documentElement.dataset.language || "ko") };
})();

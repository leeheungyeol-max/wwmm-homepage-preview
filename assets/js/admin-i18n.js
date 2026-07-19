(function () {
  "use strict";

  const STORAGE_KEY = "wwmm-admin-language";
  const languages = ["ko", "en"];
  const labels = { ko: "KO", en: "EN" };
  const nodeRecords = new WeakMap();
  const attributeRecords = new WeakMap();

  const copy = {
    "Dashboard": {},
    "Home": {},
    "Atelier": {},
    "Gallery": {},
    "Studio": {},
    "Concierge": {},
    "Master": {},
    "Admin": {},
    "Sign In": { ko: "로그인" },
    "Sign Out": { ko: "로그아웃" },
    "Password": { ko: "비밀번호" },
    "Refresh": { ko: "새로고침" },
    "Traffic, demand, and concierge response signals in one operational view.": { ko: "방문 현황과 상담 요청, 응대 상태를 한 화면에서 확인합니다." },
    "Consultations": {},
    "All requests": { ko: "전체 요청" },
    "New": {},
    "Needs review": { ko: "확인 필요" },
    "Confirmed": {},
    "Booked cases": { ko: "확정된 상담" },
    "Find Line": {},
    "Photo analysis": { ko: "사진 분석" },
    "Total Visitors": {},
    "Day": { ko: "일" },
    "Week": { ko: "주" },
    "Month": { ko: "월" },
    "Quarter": { ko: "분기" },
    "Page Hits": {},
    "Access Regions": {},
    "Recent Requests": {},
    "Recent History": {},
    "Page Management": {},
    "Page Signals": {},
    "Atelier card and studio content management.": { ko: "아뜰리에 카드와 스튜디오 콘텐츠를 관리합니다." },
    "원장 카드": { ko: "Doctor Cards", en: "Doctor Cards" },
    "+ 원장 추가하기": { en: "+ Add Doctor" },
    "순서 바꾸기": { en: "Change Order" },
    "순서 변경 완료": { en: "Finish Ordering" },
    "카드 편집": { ko: "Card Editor", en: "Card Editor" },
    "원장 이름": { en: "Doctor Name" },
    "치과 이름": { en: "Clinic Name" },
    "전문 분야": { en: "Specialty" },
    "연결 스튜디오": { en: "Linked Studio" },
    "전화번호": { en: "Phone" },
    "주소": { en: "Address" },
    "원장 약력": { en: "Doctor Profile" },
    "카드 약속 문구": { en: "Card Promise" },
    "원장 이미지": { en: "Doctor Image" },
    "치과 이미지": { en: "Clinic Image" },
    "확대": { en: "Zoom" },
    "가로": { en: "Horizontal" },
    "세로": { en: "Vertical" },
    "이미지는 카드 비율(6:7)을 유지한 채 위치와 확대만 조절됩니다. 입력한 텍스트는 사이트의 정해진 글꼴·굵기·크기로 자동 적용됩니다.": { en: "Images retain the 6:7 card ratio; only position and zoom can be adjusted. Text automatically follows the site's predefined type style, weight, and size." },
    "원장 삭제하기": { en: "Delete Doctor" },
    "저장": { en: "Save" },
    "미리보기": { ko: "Preview", en: "Preview" },
    "치과 이미지 미리보기": { ko: "Clinic Image Preview", en: "Clinic Image Preview" },
    "약력": { en: "Profile" },
    "스튜디오 치과": { ko: "Studio Clinics", en: "Studio Clinics" },
    "+ 스튜디오 추가하기": { en: "+ Add Studio" },
    "스튜디오 편집": { ko: "Studio Editor", en: "Studio Editor" },
    "노출 순서 번호": { en: "Display Order" },
    "전체 주소": { en: "Full Address" },
    "상세 주소": { en: "Address Details" },
    "위도": { en: "Latitude" },
    "경도": { en: "Longitude" },
    "주소로 위치 찾기": { en: "Find Location by Address" },
    "전체 주소를 입력한 뒤 위치를 확인하세요.": { en: "Enter the full address, then verify the location." },
    "순서 번호를 변경하면 해당 번호에 치과가 배치되고, 기존 치과는 한 칸씩 뒤로 이동합니다. 주소는 프런트에서 지역 규칙에 맞게 자동 축약됩니다.": { en: "Changing the order places the clinic at that position and shifts the existing clinics accordingly. Addresses are automatically abbreviated on the public site." },
    "스튜디오 삭제하기": { en: "Delete Studio" },
    "지역": { en: "Region" },
    "전체 주소가 이곳에 표시됩니다.": { en: "The full address appears here." },
    "카카오 JavaScript 키와 좌표가 준비되면 이곳에서 위치를 미리 볼 수 있습니다.": { en: "Once the Kakao JavaScript key and coordinates are available, the location preview will appear here." },
    "이름, 연락처, 스튜디오 검색": { en: "Search name, contact, or studio" },
    "예약 데이터를 불러오세요.": { en: "Load consultation records." },
    "관리자 이름": { en: "Administrator Name" },
    "상담관리 담당자": { en: "Consultation Manager" },
    "신규 상담 문자 수신": { en: "Receive New Consultation Alerts" },
    "담당자 설정을 불러오고 있습니다.": { en: "Loading manager settings." },
    "방문 데이터가 쌓이면 전환 흐름을 빠르게 볼 수 있습니다.": { en: "Conversion trends will appear as visitor data accumulates." },
    "검토용 ww'mm staging 사이트입니다. 공유받은 비밀번호를 입력하면 관리자 페이지로 이동할 수 있습니다.": { en: "This is the ww'mm staging site for review. Enter the shared password to access the admin page." },
    "원장 순서를 저장하지 못했습니다.": { en: "Could not save the doctor order." },
    "원장 카드 순서를 저장했습니다. 프런트에도 같은 순서로 반영됩니다.": { en: "Doctor card order saved and applied to the public site." },
    "등록된 원장이 없습니다. 원장 추가하기를 눌러 새 카드를 만드세요.": { en: "No doctors are registered. Select Add Doctor to create a new card." },
    "저장할 원장 카드를 선택해 주세요.": { en: "Select a doctor card to save." },
    "원장 이름과 치과 이름을 입력해 주세요.": { en: "Enter the doctor and clinic names." },
    "원장 이미지와 치과 이미지를 모두 선택해 주세요.": { en: "Select both doctor and clinic images." },
    "이미지를 정리하고 카드를 저장하고 있습니다.": { en: "Preparing images and saving the card." },
    "카드를 저장했습니다. 공개 Atelier 페이지에도 반영됩니다.": { en: "Card saved and applied to the public Atelier page." },
    "학력, 경력, 전문 분야 등 원장 약력을 입력하세요.": { en: "Enter education, career history, specialties, and other profile details." }
  };

  function translate(source, language) {
    return copy[source]?.[language] || source;
  }

  function renderTextNode(node, language) {
    let record = nodeRecords.get(node);
    if (!record || (record.lastRendered != null && node.nodeValue !== record.lastRendered)) {
      record = { source: node.nodeValue, lastRendered: null };
      nodeRecords.set(node, record);
    }
    const source = record.source;
    const trimmed = source.trim();
    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    const rendered = `${leading}${translate(trimmed, language)}${trailing}`;
    record.lastRendered = rendered;
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
  }

  function applyText(root, language) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (root.nodeValue.trim()) renderTextNode(root, language);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => renderTextNode(node, language));
  }

  function applyAttributes(language) {
    document.querySelectorAll("[placeholder]").forEach((element) => {
      let record = attributeRecords.get(element);
      if (!record) {
        record = { placeholder: element.placeholder };
        attributeRecords.set(element, record);
      }
      element.placeholder = translate(record.placeholder, language);
    });
  }

  function updateSwitchers(language) {
    document.querySelectorAll("[data-admin-language-switcher] button").forEach((button) => {
      button.setAttribute("aria-current", String(button.dataset.language === language));
    });
  }

  function setLanguage(language, manual) {
    const next = languages.includes(language) ? language : "ko";
    document.documentElement.lang = next;
    document.documentElement.dataset.adminLanguage = next;
    applyText(document.body, next);
    applyAttributes(next);
    updateSwitchers(next);
    if (manual) localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("wwmm:adminlanguagechange", { detail: { language: next } }));
  }

  document.querySelectorAll("[data-admin-language-switcher]").forEach((switcher) => {
    switcher.innerHTML = languages.map((language) =>
      `<button type="button" data-language="${language}" aria-label="${labels[language]} 관리자 화면">${labels[language]}</button>`
    ).join("");
    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-language]");
      if (button) setLanguage(button.dataset.language, true);
    });
  });

  setLanguage(localStorage.getItem(STORAGE_KEY) || "en", false);

  const observer = new MutationObserver((mutations) => {
    const language = document.documentElement.dataset.adminLanguage || "en";
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") renderTextNode(mutation.target, language);
      mutation.addedNodes.forEach((node) => applyText(node, language));
    });
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });

  window.wwmmAdminI18n = { setLanguage: (language) => setLanguage(language, true), t: (source) => translate(source, document.documentElement.dataset.adminLanguage || "en") };
})();

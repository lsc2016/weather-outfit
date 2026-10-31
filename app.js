/*
 * 온도별 기본 추천 (옷장에 맞는 옷이 없을 때)
 * ------------------------------------------------------------
 * 품목을 바꾸고 싶으면 아래 OUTFIT_TABLE 만 고치면 된다.
 *  - min  : 이 구간의 최저 온도(이상). 위에서부터 차례로 비교하므로 높은 온도 순서를 지킬 것.
 *  - looks: 이 구간의 룩(완성된 옷차림) 2~3개. 화면에 추천안 카드로 하나씩 나온다.
 *    룩 하나 = 상의 하나 + 하의 하나 + 겉옷 하나(또는 null) + 소품 하나(또는 null) + tip(코치 한마디).
 *  - 각 칸은 { icon: '이모지', name: '품목 이름', art: '캐릭터 그림 이름' }.
 *    한 칸에는 품목 하나만 ("니트 · 셔츠" 처럼 쓰지 않는다 — 둘 다 입으라는 뜻으로 읽힌다).
 *    null 인 칸은 카드에 안 나오고 캐릭터에도 그리지 않는다.
 *  - art 는 character.js 의 PIECES 이름. 쓸 수 있는 이름과 새 그림을 추가하는 방법은 character.js 맨 위 주석 참고.
 */
const OUTFIT_TABLE = [
  {
    min: 28, label: '28° 이상',
    looks: [
      { top:    { icon: '🎽', name: '민소매', art: 'tank' },
        bottom: { icon: '🩳', name: '반바지', art: 'shorts' },
        outer:  null,
        acc:    { icon: '🕶️', name: '선글라스', art: 'sunglasses' },
        tip: '땀이 덜 차게 민소매에 반바지로 가볍게 입어요' },
      { top:    { icon: '👕', name: '반팔 티', art: 'tshirt' },
        bottom: { icon: '👖', name: '린넨 바지', art: 'slacks' },
        outer:  null,
        acc:    { icon: '🧢', name: '모자', art: 'cap' },
        tip: '바람이 잘 통하는 린넨 바지에 모자로 햇볕을 가려요' },
    ],
  },
  {
    min: 23, label: '23–27°',
    looks: [
      { top:    { icon: '👕', name: '반팔 티', art: 'tshirt' },
        bottom: { icon: '🩳', name: '반바지', art: 'shorts' },
        outer:  null,
        acc:    { icon: '🧢', name: '모자', art: 'cap' },
        tip: '가장 편한 여름 차림이에요. 모자 하나면 충분해요' },
      { top:    { icon: '👔', name: '얇은 셔츠', art: 'shirt' },
        bottom: { icon: '👖', name: '면바지', art: 'slacks' },
        outer:  null,
        acc:    null,
        tip: '반팔보다 단정하게, 얇은 셔츠에 면바지로 깔끔하게' },
    ],
  },
  {
    min: 20, label: '20–22°',
    looks: [
      { top:    { icon: '👚', name: '얇은 긴팔', art: 'longsleeve' },
        bottom: { icon: '👖', name: '면바지', art: 'slacks' },
        outer:  { icon: '🧶', name: '얇은 가디건', art: 'cardigan' },
        acc:    null,
        tip: '아침저녁이 쌀쌀하면 가디건만 걸치면 돼요' },
      { top:    { icon: '👚', name: '블라우스', art: 'shirt' },
        bottom: { icon: '👖', name: '슬랙스', art: 'slacks' },
        outer:  { icon: '🧶', name: '얇은 가디건', art: 'cardigan' },
        acc:    null,
        tip: '블라우스에 슬랙스, 단정한 출근 차림이에요' },
      { top:    { icon: '👚', name: '얇은 긴팔', art: 'longsleeve' },
        bottom: { icon: '👖', name: '청바지', art: 'jeans' },
        outer:  { icon: '🧶', name: '얇은 가디건', art: 'cardigan' },
        acc:    null,
        tip: '청바지로 편하게, 주말 나들이에 좋아요' },
    ],
  },
  {
    min: 17, label: '17–19°',
    looks: [
      { top:    { icon: '👕', name: '맨투맨', art: 'sweatshirt' },
        bottom: { icon: '👖', name: '청바지', art: 'jeans' },
        outer:  { icon: '🧥', name: '바람막이', art: 'windbreaker' },
        acc:    null,
        tip: '움직이기 편한 캐주얼이에요. 바람 불면 바람막이를 여며요' },
      { top:    { icon: '🧶', name: '얇은 니트', art: 'knit' },
        bottom: { icon: '👖', name: '면바지', art: 'slacks' },
        outer:  { icon: '🧥', name: '얇은 재킷', art: 'jacket' },
        acc:    null,
        tip: '얇은 니트에 재킷을 걸쳐 단정하게' },
    ],
  },
  {
    min: 12, label: '12–16°',
    looks: [
      { top:    { icon: '🧶', name: '니트', art: 'knit' },
        bottom: { icon: '👖', name: '청바지', art: 'jeans' },
        outer:  { icon: '🧥', name: '재킷', art: 'jacket' },
        acc:    { icon: '🧣', name: '얇은 스카프', art: 'scarf' },
        tip: '니트와 청바지는 실패 없는 조합이에요. 재킷으로 마무리해요' },
      { top:    { icon: '👔', name: '셔츠', art: 'shirt' },
        bottom: { icon: '👖', name: '슬랙스', art: 'slacks' },
        outer:  { icon: '🧥', name: '트렌치코트', art: 'trench' },
        acc:    null,
        tip: '셔츠에 트렌치코트, 단정한 출근 차림이에요' },
    ],
  },
  {
    min: 9, label: '9–11°',
    looks: [
      { top:    { icon: '🧶', name: '니트', art: 'knit' },
        bottom: { icon: '👖', name: '청바지', art: 'jeans' },
        outer:  { icon: '🧥', name: '트렌치코트', art: 'trench' },
        acc:    { icon: '🧣', name: '스카프', art: 'scarf' },
        tip: '트렌치코트에 스카프 하나면 가을 느낌이 나요' },
      { top:    { icon: '👕', name: '기모 맨투맨', art: 'sweatshirt' },
        bottom: { icon: '👖', name: '기모 바지', art: 'warmpants' },
        outer:  { icon: '🧥', name: '점퍼', art: 'jacket' },
        acc:    null,
        tip: '쌀쌀한 날엔 안쪽이 기모인 옷으로 편하고 따뜻하게' },
    ],
  },
  {
    min: 5, label: '5–8°',
    looks: [
      { top:    { icon: '🧶', name: '두꺼운 니트', art: 'knit' },
        bottom: { icon: '👖', name: '기모 바지', art: 'warmpants' },
        outer:  { icon: '🧥', name: '울 코트', art: 'coat' },
        acc:    { icon: '🧣', name: '목도리', art: 'muffler' },
        tip: '울 코트에 목도리를 두르면 따뜻하고 단정해요' },
      { top:    { icon: '👔', name: '기모 셔츠', art: 'shirt' },
        bottom: { icon: '👖', name: '기모 청바지', art: 'jeans' },
        outer:  { icon: '🧥', name: '가죽 재킷', art: 'jacket' },
        acc:    { icon: '🧣', name: '목도리', art: 'muffler' },
        tip: '안에 히트텍을 받쳐 입고 가죽 재킷으로 멋스럽게' },
    ],
  },
  {
    min: -Infinity, label: '4° 이하',
    looks: [
      { top:    { icon: '🧶', name: '두꺼운 니트', art: 'knit' },
        bottom: { icon: '👖', name: '기모 바지', art: 'warmpants' },
        outer:  { icon: '🧥', name: '패딩', art: 'padding' },
        acc:    { icon: '🧤', name: '장갑', art: 'gloves' },
        tip: '히트텍 위에 두꺼운 니트, 패딩으로 단단히 막아요. 장갑도 챙기세요' },
      { top:    { icon: '👕', name: '기모 맨투맨', art: 'sweatshirt' },
        bottom: { icon: '👖', name: '기모 청바지', art: 'jeans' },
        outer:  { icon: '🧥', name: '두꺼운 코트', art: 'coat' },
        acc:    { icon: '🧣', name: '목도리', art: 'muffler' },
        tip: '두꺼운 코트에 목도리로 목까지 따뜻하게 감싸요' },
    ],
  },
];

/*
 * 온도 구간 ↔ 옷장 옷의 따뜻한 정도(1 한여름 반팔 ~ 5 패딩)
 * ------------------------------------------------------------
 * 옷장에 옷이 있으면 이 표의 범위 [최소, 최대] 에 드는 옷으로 조합을 만든다.
 *  - min 은 OUTFIT_TABLE 과 같은 구간. 높은 온도 순서를 지킬 것.
 *  - null 이면 그 칸은 필요 없음 (OUTFIT_TABLE 에서 null 인 칸과 맞춘다).
 *  - 겉옷이 있는 구간에서는 상의 · 겉옷이 범위를 1 벗어나도 후보가 된다 (얇은 상의 + 두꺼운 겉옷).
 *    대신 상의 + 하의 + 겉옷 합이 범위 가운데값의 합과 1 넘게 다르면 뺀다. 자세한 건 coach.js 맨 위 "점수".
 *  - 상의 · 하의 · 겉옷 중 맞는 옷이 하나라도 없으면 OUTFIT_TABLE 기본 추천을 보여준다.
 *    소품만 없으면 소품 칸은 기본 추천으로 채운다.
 */
const WARMTH_TABLE = [
  //  구간               상의      하의      겉옷      소품
  { min: 28,        top: [1, 1], bottom: [1, 1], outer: null,   acc: [1, 2] },
  { min: 23,        top: [1, 2], bottom: [1, 2], outer: null,   acc: [1, 2] },
  { min: 20,        top: [2, 2], bottom: [2, 3], outer: [1, 2], acc: null },
  { min: 17,        top: [2, 3], bottom: [2, 3], outer: [2, 3], acc: null },
  { min: 12,        top: [3, 3], bottom: [3, 3], outer: [3, 3], acc: [2, 3] },
  { min: 9,         top: [3, 4], bottom: [3, 4], outer: [3, 4], acc: [3, 3] },
  { min: 5,         top: [4, 4], bottom: [4, 4], outer: [4, 4], acc: [4, 4] },
  { min: -Infinity, top: [4, 5], bottom: [4, 5], outer: [5, 5], acc: [4, 5] },
];

// 비가 올 때 소품 칸에 더해지는 품목
const RAIN_ITEM = { icon: '☂️', name: '우산', art: 'umbrella' };

/**
 * "다른 옷 입었어요" 시트: 옷장에 없는 옷의 자주 입는 이름 버튼 — [이름, 두께 1~5]
 *  누르면 이름 칸과 두께가 함께 채워진다 (두께는 사람이 바꿀 수 있음). 이 표만 고치면 버튼이 바뀐다.
 *  inner = 상의 · 하의 안에 겹쳐 입은 옷
 */
const WEAR_NAME_HINTS = {
  top:    [['반팔 티', 1], ['긴팔 티', 2], ['셔츠', 2], ['맨투맨', 3], ['니트', 4], ['기모 맨투맨', 4]],
  bottom: [['반바지', 1], ['면바지', 2], ['청바지', 3], ['슬랙스', 3], ['기모 바지', 4]],
  outer:  [['가디건', 2], ['바람막이', 2], ['점퍼', 3], ['재킷', 3], ['코트', 4], ['패딩', 5]],
  inner:  [['내복', 1], ['히트텍', 1], ['레깅스', 1]],
};

// 체감 보정 3단계 (추천에 쓰는 온도에 더해진다)
const SENSITIVITY = {
  cold:   { label: '추위 잘 탐', offset: -2 },
  normal: { label: '보통',       offset: 0 },
  hot:    { label: '더위 잘 탐', offset: +2 },
};

// 위치 권한이 없을 때 쓰는 기본 위치
const DEFAULT_PLACE = { name: '서울', lat: 37.5665, lon: 126.978 };

const CACHE_KEY = 'outfit.weather.v1';
const SENSE_KEY = 'outfit.sensitivity';
const WORN_KEY = 'outfit.worn.v1'; // 입은 기록 { 'YYYY-MM-DD': { ids, title, warmth, need, learned, other?, slots?, inner?, names? } } — 하루 한 벌
const WORN_KEEP_DAYS = 30;          // 이보다 오래된 기록은 버린다
const WORN_NOTE_DAYS = 7;           // 카드에 "어제 입음" 같은 안내를 붙이는 기간
const FEEDBACK_KEY = 'outfit.feedback.v1'; // 입어 본 느낌 { log: { 입은 날: { feel, warmth, need, learned, at } }, since: { 옷 id: 날짜 }, resetAt }
const FEEDBACK_KEEP = 60;                   // 이보다 많으면 오래된 답부터 버린다 (배우는 데는 최근 것만 씀)
const THICKNESS = ['', '아주 얇은', '얇은', '보통', '두꺼운', '아주 두꺼운']; // 옷장에 없는 옷의 두께 1~5
const FEELS = {
  cold: { icon: '🥶', label: '추웠어요' },
  good: { icon: '😊', label: '딱 좋았어요' },
  hot:  { icon: '🥵', label: '더웠어요' },
};
const CACHE_MS = 60 * 60 * 1000; // 1시간
const SLIDER_MIN = -10;
const SLIDER_MAX = 35;

// Open-Meteo 날씨 코드 → 한국어
const WEATHER_TEXT = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '안개',
  51: '약한 이슬비', 53: '이슬비', 55: '강한 이슬비', 56: '어는 이슬비', 57: '어는 이슬비',
  61: '약한 비', 63: '비', 65: '강한 비', 66: '어는 비', 67: '어는 비',
  71: '약한 눈', 73: '눈', 75: '강한 눈', 77: '싸락눈',
  80: '소나기', 81: '소나기', 82: '강한 소나기', 85: '소낙눈', 86: '강한 소낙눈',
  95: '뇌우', 96: '우박 동반 뇌우', 99: '우박 동반 뇌우',
};

// 강수(비·눈·소나기·뇌우)로 보는 날씨 코드
function isPrecipCode(code) {
  return (code >= 51 && code <= 67) || (code >= 71 && code <= 77) || (code >= 80 && code <= 99);
}

/* ===== 상태 ===== */
const state = {
  weather: null,      // { feels, feelsHi, feelsLo, temp, code, precip, isRain, place, savedAt }
  sense: 'normal',
  sliderTemp: 20,     // 슬라이더 값
  custom: false,      // 슬라이더로 다른 온도를 보고 있는지
  combo: { key: '', index: 0 }, // 옷장 추천: 지금 보여주는 추천안 묶음 번호 ("다른 추천안")
  selected: 0,        // 캐릭터에 입힌 추천안 카드 번호
  looks: [],          // 지금 보여주는 추천안들
  looksSig: '',       // 그 추천안들의 이름 (바뀌면 첫 카드부터 선택)
  worn: {},           // 입은 기록 (WORN_KEY)
  feedback: { log: {}, since: {} }, // 입어 본 느낌 (FEEDBACK_KEY)
  feedbackNote: '',   // 피드백에 답한 뒤 잠깐 보여주는 말
  now: { target: 20, need: 0, learned: 0 }, // 지금 추천 온도 · 그 구간이 바라는 따뜻한 정도 합 · 쓰고 있는 배운 보정 (기록할 때 함께 남김)
  justStamped: false, // 방금 도장을 찍었는지 (도장 애니메이션)
};

const $ = (id) => document.getElementById(id);

/* ===== localStorage: 막혀 있어도 앱은 동작하도록 ===== */
function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* 저장 못 해도 무시 */ }
}

/* ===== 입은 기록 ===== */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const WEAR_SLOTS = ['top', 'bottom', 'outer'];
const INNER_SLOTS = ['top', 'bottom'];                      // 안에 겹쳐 입은 옷은 상의 · 하의만, 칸마다 하나까지
const INNER_KEY = { top: 'innerTop', bottom: 'innerBottom' }; // 이름(names) 칸 이름
const WEAR_NAME_KEYS = ['top', 'bottom', 'outer', 'innerTop', 'innerBottom'];
const WEAR_NAME_MAX = 20;
const WEAR_LABEL = { top: '상의', bottom: '하의', outer: '겉옷', innerTop: '안에 입은 상의', innerBottom: '안에 입은 하의' };

// 날짜 → 'YYYY-MM-DD' (기기 시간대)
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 오늘 날짜 'YYYY-MM-DD'
function todayKey() {
  return dateKey(new Date());
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

// 들어온 값을 기록 모양으로 다듬고 오래된 날은 버린다 (예전 기록 [옷 id …] 도 받는다)
function normalizeWorn(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const today = todayKey();
  for (const [date, value] of Object.entries(raw)) {
    if (!DATE_KEY.test(date)) continue;
    const age = Coach.daysBetween(date, today);
    if (!(age >= 0 && age <= WORN_KEEP_DAYS)) continue;
    const entry = Array.isArray(value) ? { ids: value } : value;
    if (!entry || typeof entry !== 'object') continue;
    const clean = { ids: (Array.isArray(entry.ids) ? entry.ids : []).filter((id) => typeof id === 'string' && id) };
    if (typeof entry.title === 'string' && entry.title) clean.title = entry.title.slice(0, 80);
    for (const k of ['warmth', 'need', 'learned']) if (finite(entry[k])) clean[k] = entry[k];
    if (entry.other) clean.other = true;
    if (entry.slots && typeof entry.slots === 'object') {
      clean.slots = {};
      for (const slot of WEAR_SLOTS) if (typeof entry.slots[slot] === 'string') clean.slots[slot] = entry.slots[slot];
    }
    if (entry.inner && typeof entry.inner === 'object') {
      const inner = {};
      for (const slot of INNER_SLOTS) if (typeof entry.inner[slot] === 'string' && entry.inner[slot]) inner[slot] = entry.inner[slot];
      if (Object.keys(inner).length) clean.inner = inner;
    }
    if (entry.names && typeof entry.names === 'object') {
      const names = {};
      for (const key of WEAR_NAME_KEYS) {
        const name = typeof entry.names[key] === 'string' ? entry.names[key].trim().slice(0, WEAR_NAME_MAX) : '';
        if (name) names[key] = name;
      }
      if (Object.keys(names).length) clean.names = names;
    }
    if (clean.ids.length || clean.title) out[date] = clean;
  }
  return out;
}

function loadWorn() {
  try { return normalizeWorn(JSON.parse(storageGet(WORN_KEY) || '{}')); } catch { return {}; }
}

function setWorn(next) {
  state.worn = normalizeWorn(next);
  storageSet(WORN_KEY, JSON.stringify(state.worn));
}

const lookIds = (look) => WEAR_SLOTS.map((slot) => look[slot]?.id).filter(Boolean);

// 입은 기록은 지금 날씨로 볼 때만 (슬라이더로 다른 온도를 볼 땐 그 온도에 입은 게 아니라서)
const canRecord = () => !state.custom;

// 이 추천안에 오늘 도장을 찍었는지
function isStamped(look) {
  const entry = state.worn[todayKey()];
  return Boolean(entry) && !entry.other && entry.title === Coach.lookTitle(look);
}

// 추천안 → 입은 기록 한 날 (기본 룩은 내 옷이 아니라 따뜻한 정도 합을 구간이 바란 합으로 본다)
function lookEntry(look) {
  const ids = lookIds(look);
  const warmths = WEAR_SLOTS.filter((slot) => look[slot]).map((slot) => Wardrobe.get(look[slot].id)?.warmth);
  const known = ids.length && warmths.every(finite);
  return {
    ids,
    title: Coach.lookTitle(look),
    warmth: known ? warmths.reduce((a, b) => a + b, 0) : state.now.need,
    need: state.now.need,
    learned: state.now.learned,
  };
}

// 오늘 기록을 바꾸면 오늘 답한 느낌은 지운다 (바뀐 옷으로 다시 묻게)
function recordToday(entry) {
  const today = todayKey();
  const worn = { ...state.worn };
  if (entry) worn[today] = entry;
  else delete worn[today];
  setWorn(worn);
  if (state.feedback.log[today]) {
    const log = { ...state.feedback.log };
    delete log[today];
    setFeedback({ ...state.feedback, log });
  }
}

// "이대로 입었어요" 도장 · 취소
function stampLook(look) {
  recordToday(lookEntry(look));
  state.justStamped = true;
  renderOutfit();
  state.justStamped = false;
}
function unstamp() {
  recordToday(null);
  renderOutfit();
}

/**
 * "다른 옷 입었어요" 시트에서 고른 것 저장
 *  choice = {
 *    slots: { top: 옷 id | 'w1'~'w5'(옷장에 없는 옷의 두께), bottom: …, outer: … | 'none' },
 *    inner: { top?, bottom? }  — 안에 겹쳐 입은 옷 (옷 id | 'w1'~'w5')
 *    names: { top?, bottom?, outer?, innerTop?, innerBottom? } — 옷장에 없는 옷의 이름
 *    feel: '' | 'cold' | 'good' | 'hot' }
 *  title 은 상의 → 하의 → 겉옷, 안에 입은 옷은 바로 뒤 괄호: "맨투맨 + 청바지(안에 내복) + 점퍼"
 *  오늘이면 지금 추천 온도의 숫자, 지난날이면 그날 기록의 숫자를 함께 남긴다.
 */
function wearPiece(v) {
  if (!v || v === 'none') return null;
  const level = /^w([1-5])$/.exec(v);
  if (level) return { level: Number(level[1]), warmth: Number(level[1]) };
  const item = Wardrobe.get(v);
  return item ? { item, warmth: item.warmth } : null;
}

function saveWear(date, choice) {
  const base = date === todayKey() ? state.now : state.worn[date] || {};
  const given = choice.names || {};
  const ids = [];
  const parts = [];
  const names = {};
  const inner = {};
  let warmth = 0;
  // 옷 하나 → 이름 (옷장 옷 이름 · 적은 이름 · 없으면 "보통 상의" 꼴)
  const label = (piece, key, fallback) => {
    if (piece.item) return piece.item.name;
    const name = String(given[key] || '').trim().slice(0, WEAR_NAME_MAX);
    if (name) names[key] = name;
    return name || fallback;
  };
  const add = (piece) => {
    warmth += piece.warmth;
    if (piece.item && !ids.includes(piece.item.id)) ids.push(piece.item.id);
  };
  for (const slot of WEAR_SLOTS) {
    const piece = wearPiece(choice.slots[slot]);
    if (!piece) continue;
    add(piece);
    let text = label(piece, slot, `${THICKNESS[piece.level]} ${Coach.SLOT_LABEL[slot]}`);
    const under = INNER_SLOTS.includes(slot) ? wearPiece(choice.inner?.[slot]) : null;
    if (under) {
      add(under);
      inner[slot] = choice.inner[slot];
      text += `(안에 ${label(under, INNER_KEY[slot], `${THICKNESS[under.level]} 옷`)})`;
    }
    parts.push(text);
  }
  const entry = { ids, title: parts.join(' + ').slice(0, 80), warmth, other: true, slots: { ...choice.slots } };
  if (Object.keys(inner).length) entry.inner = inner;
  if (Object.keys(names).length) entry.names = names;
  if (finite(base.need)) entry.need = base.need;
  if (finite(base.learned)) entry.learned = base.learned;
  setWorn({ ...state.worn, [date]: entry });

  const log = { ...state.feedback.log };
  delete log[date];
  setFeedback({ ...state.feedback, log });
  if (choice.feel) answerFeel(date, choice.feel);
  else renderOutfit();
}

// 시트에 미리 고를 값 { slots, inner, names }: 그날 "다른 옷" 기록 → 지금 추천안(오늘) / 그날 입은 옷장 옷
function wearPreset(date) {
  const entry = state.worn[date];
  if (entry?.slots) return { slots: { ...entry.slots }, inner: { ...entry.inner }, names: { ...entry.names } };
  const out = {};
  const names = {};
  const look = date === todayKey() && !entry ? state.looks[state.selected] : null;
  if (look) {
    const row = Coach.findRow(WARMTH_TABLE, state.now.target);
    for (const slot of WEAR_SLOTS) {
      if (!look[slot]) out[slot] = 'none';
      else if (look[slot].id) out[slot] = look[slot].id;
      else if (row[slot]) {
        // 기본 룩: 옷장에 없는 옷 → 그 룩의 품목 이름 + 구간 가운데 두께
        out[slot] = `w${Math.round((row[slot][0] + row[slot][1]) / 2)}`;
        if (look[slot].name) names[slot] = look[slot].name.slice(0, WEAR_NAME_MAX);
      }
    }
  } else {
    for (const id of entry?.ids || []) {
      const it = Wardrobe.get(id);
      if (it && WEAR_SLOTS.includes(it.type) && !out[it.type]) out[it.type] = id;
    }
    if (!out.outer && entry) out.outer = 'none';
  }
  return { slots: out, inner: {}, names };
}

/* ===== "다른 옷 입었어요" 시트 ===== */

let wearDate = null; // 시트에서 기록하는 날

function radio(name, value, text, checked, dot) {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  const span = document.createElement('span');
  if (dot) {
    const d = document.createElement('i');
    d.className = 'dot';
    d.style.background = dot;
    span.append(d);
  }
  span.append(text);
  label.append(input, span);
  label.input = input;
  return label;
}

// 시트의 고르는 줄들: key(top · bottom · outer · innerTop · innerBottom) → { radios, thick, nameInput, other, … }
let wearRows = {};

const checkedValue = (radios) => radios.find((r) => r.checked)?.value || '';
const setChecked = (radios, value) => { for (const r of radios) r.checked = r.value === value; };

// 고르는 줄 하나: [안 입음] 옷장 옷 … [옷장에 없는 옷] + (이름 칸 · 자주 입는 이름 버튼 · 두께)
function buildWearRow(key, type, value, name) {
  const inner = key !== type;
  const row = { key, type, inner, radios: [], thick: [] };
  row.box = document.createElement('div');
  row.box.className = inner ? 'wear-row-box inner' : 'wear-row-box';
  if (inner) {
    const head = document.createElement('p');
    head.className = 'inner-head';
    head.textContent = `${Coach.SLOT_LABEL[type]} 안에 입은 옷`;
    row.box.append(head);
  }

  row.picks = document.createElement('div');
  row.picks.className = 'pick';
  row.box.append(row.picks);

  const level = /^w([1-5])$/.exec(value || '');
  row.other = document.createElement('div');
  row.other.className = 'wear-other';
  row.other.hidden = !level;

  row.nameInput = document.createElement('input');
  row.nameInput.type = 'text';
  row.nameInput.maxLength = WEAR_NAME_MAX;
  row.nameInput.autocomplete = 'off';
  row.nameInput.placeholder = '이름 (선택) 예) 맨투맨';
  row.nameInput.setAttribute('aria-label', `${WEAR_LABEL[key]} 이름`);
  row.nameInput.value = level ? name || '' : '';

  const hints = document.createElement('div');
  hints.className = 'name-hints';
  for (const [hint, w] of WEAR_NAME_HINTS[inner ? 'inner' : type]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hint-btn';
    btn.textContent = hint;
    btn.dataset.name = hint;
    btn.dataset.w = String(w);
    btn.addEventListener('click', () => {
      row.nameInput.value = hint;
      setChecked(row.thick, String(w));
    });
    hints.append(btn);
  }

  const thick = document.createElement('div');
  thick.className = 'seg thick';
  for (let w = 1; w <= 5; w++) {
    const label = radio(`wear-${key}W`, String(w), THICKNESS[w], level?.[1] === String(w));
    row.thick.push(label.input);
    thick.append(label);
  }
  row.other.append(row.nameInput, hints, thick);
  row.box.append(row.other);
  fillWearPicks(row, level ? 'other' : value);
  return row;
}

// 줄의 고르는 버튼을 (다시) 채운다. 안에 입은 옷 줄은 바깥에 고른 옷을 뺀다
function fillWearPicks(row, value) {
  row.picks.textContent = '';
  row.radios = [];
  const pick = (v, text, dot) => {
    const label = radio(`wear-${row.key}`, v, text, value === v, dot);
    label.input.addEventListener('change', () => onWearPick(row));
    row.radios.push(label.input);
    row.picks.append(label);
  };
  const outside = row.inner ? checkedValue(wearRows[row.type]?.radios || []) : '';
  if (row.key === 'outer') pick('none', '안 입음');
  for (const it of Wardrobe.list().filter((x) => x.type === row.type && x.id !== outside).sort((a, b) => a.warmth - b.warmth)) {
    pick(it.id, it.name, it.color);
  }
  pick('other', '옷장에 없는 옷');
  if (row.inner) pick('none', '안 입음');
}

// 한 줄에서 고르면: "옷장에 없는 옷"이면 이름 · 두께 칸을 열고, 안에 입은 옷 줄은 "안 입음"이면 닫는다
function onWearPick(row) {
  const v = checkedValue(row.radios);
  row.other.hidden = v !== 'other';
  if (row.inner && v === 'none') {
    closeInnerRow(row);
    return;
  }
  const under = wearRows[INNER_KEY[row.key]];
  if (under && !under.box.hidden) {
    const keep = checkedValue(under.radios);
    fillWearPicks(under, keep === v ? '' : keep);
    under.other.hidden = checkedValue(under.radios) !== 'other';
  }
}

function openInnerRow(row) {
  row.box.hidden = false;
  row.addBtn.hidden = true;
  fillWearPicks(row, checkedValue(row.radios));
}

function closeInnerRow(row) {
  row.box.hidden = true;
  row.addBtn.hidden = false;
  setChecked(row.radios, '');
  row.other.hidden = true;
}

function openWearSheet(date) {
  wearDate = date;
  const preset = wearPreset(date);
  const age = Coach.daysBetween(date, todayKey());
  $('wearTitle').textContent = `${age === 0 ? '오늘' : age === 1 ? '어제' : '그저께'} 실제로 입은 옷`;

  const box = $('wearSlots');
  box.textContent = '';
  wearRows = {};
  for (const slot of WEAR_SLOTS) {
    const set = document.createElement('fieldset');
    set.className = 'field';
    const legend = document.createElement('legend');
    legend.textContent = Coach.SLOT_LABEL[slot];
    set.append(legend);

    const row = buildWearRow(slot, slot, preset.slots[slot], preset.names[slot]);
    wearRows[slot] = row;
    set.append(row.box);

    // 상의 · 하의: "+ 안에 입은 옷" (칸마다 하나까지)
    if (INNER_SLOTS.includes(slot)) {
      const key = INNER_KEY[slot];
      const value = preset.inner[slot] || '';
      const under = buildWearRow(key, slot, value, preset.names[key]);
      wearRows[key] = under;
      under.addBtn = document.createElement('button');
      under.addBtn.type = 'button';
      under.addBtn.className = 'link-btn inner-add';
      under.addBtn.textContent = '+ 안에 입은 옷';
      under.addBtn.addEventListener('click', () => openInnerRow(under));
      set.append(under.addBtn, under.box);
      if (value) openInnerRow(under);
      else closeInnerRow(under);
    }
    box.append(set);
  }
  for (const input of $('wearForm').querySelectorAll('input[name="feel"]')) input.checked = input.value === '';
  $('wearError').textContent = '';
  $('wearDialog').showModal();
}

// 시트에서 고른 것 → { slots, inner, names }, 못 받은 칸은 problems 에 (조용히 "안 입음"으로 바꾸지 않는다)
function readWearSheet() {
  const slots = {};
  const inner = {};
  const names = {};
  const problems = [];
  const read = (row) => {
    const v = checkedValue(row.radios);
    if (v !== 'other') return v;
    const w = checkedValue(row.thick);
    if (!w) {
      problems.push(`${WEAR_LABEL[row.key]} 두께`);
      return null;
    }
    const name = row.nameInput.value.trim().slice(0, WEAR_NAME_MAX);
    if (name) names[row.key] = name;
    return `w${w}`;
  };
  for (const slot of WEAR_SLOTS) {
    const v = read(wearRows[slot]);
    if (v === '' && slot !== 'outer') problems.push(WEAR_LABEL[slot]);
    slots[slot] = v || (slot === 'outer' && v === '' ? 'none' : '');
    const under = wearRows[INNER_KEY[slot]];
    if (under && !under.box.hidden) {
      const u = read(under);
      if (u && u !== 'none') inner[slot] = u;
    }
  }
  return { slots, inner, names, problems };
}

function onWearSubmit(e) {
  e?.preventDefault?.();
  const form = $('wearForm');
  const { slots, inner, names, problems } = readWearSheet();
  if (problems.length) {
    $('wearError').textContent = `${problems.map((p) => `${p}${objectJosa(p)}`).join(' · ')} 골라 주세요 (옷장에 없는 옷은 두께를 꼭 골라 주세요)`;
    return;
  }
  $('wearDialog').close();
  const feel = form.querySelector?.('input[name="feel"]:checked')?.value || '';
  saveWear(wearDate, { slots, inner, names, feel });
}

/* ===== 입어 본 느낌 (피드백) ===== */

function normalizeFeedback(raw) {
  const log = {};
  for (const [date, value] of Object.entries(raw?.log || {})) {
    if (!DATE_KEY.test(date)) continue;
    const entry = typeof value === 'string' ? { feel: value } : value; // 예전 기록은 글자만
    if (!entry || !(FEELS[entry.feel] || entry.feel === 'skip')) continue;
    const clean = { feel: entry.feel };
    for (const k of ['warmth', 'need', 'learned', 'at']) if (finite(entry[k])) clean[k] = entry[k];
    log[date] = clean;
  }
  const keep = Object.keys(log).sort().slice(-FEEDBACK_KEEP);
  const since = {};
  for (const [id, date] of Object.entries(raw?.since || {})) if (DATE_KEY.test(date)) since[id] = date;
  const out = { log: Object.fromEntries(keep.map((date) => [date, log[date]])), since };
  if (finite(raw?.resetAt)) out.resetAt = raw.resetAt;
  return out;
}

function loadFeedback() {
  try { return normalizeFeedback(JSON.parse(storageGet(FEEDBACK_KEY) || '{}')); } catch { return normalizeFeedback({}); }
}

function setFeedback(next) {
  state.feedback = normalizeFeedback(next);
  storageSet(FEEDBACK_KEY, JSON.stringify(state.feedback));
}

// "어땠어요?" 답: 그날 입은 기록의 숫자를 함께 남긴다
function answerFeel(date, feel) {
  const before = learned();
  const entry = state.worn[date] || {};
  const answer = { feel, at: Date.now() };
  for (const k of ['warmth', 'need', 'learned']) if (finite(entry[k])) answer[k] = entry[k];
  setFeedback({ ...state.feedback, log: { ...state.feedback.log, [date]: answer } });
  const after = learned();
  if (feel === 'skip') state.feedbackNote = '';
  else if (after !== before) {
    state.feedbackNote = `고마워요. 입어 본 느낌 보정이 ${signed(after)}가 됐어요 — 앞으로 조금 더 ${after > before ? '시원하게' : '따뜻하게'} 추천할게요.`;
  } else {
    state.feedbackNote = feel === 'good' ? '고마워요. 지금처럼 맞출게요.' : '고마워요. 기록해 둘게요 — 몇 번 더 모이면 추천에 반영돼요.';
  }
  renderOutfit();
}

// 체감 보정 합계: 3단계 + 피드백으로 배운 값
const learned = () => Coach.learnedOffset(state.feedback, WARMTH_TABLE);
const totalOffset = () => SENSITIVITY[state.sense].offset + learned();
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}°`;

// 받침이 있으면 '을', 없으면 '를' (한글이 아니면 '을(를)')
function objectJosa(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '을(를)';
  return code % 28 ? '을' : '를';
}

// 입은 기록 한 날 → "회색 니트 + 청바지" (예전 기록은 옷 이름으로, 지워진 옷은 빼고)
function wornTitle(entry) {
  if (entry?.title) return entry.title;
  const names = (entry?.ids || []).map((id) => Wardrobe.get(id)?.name).filter(Boolean);
  return names.length ? names.slice(0, 2).join(' + ') : '그 옷';
}

// 따뜻한 정도 고치기 제안: 옷마다 고친 날 · "괜찮아요" 한 날 · 마지막으로 수정한 날 이후 피드백만
function suggestions() {
  const items = Wardrobe.list();
  const since = { ...state.feedback.since };
  for (const it of items) {
    const edited = it.updatedAt ? dateKey(new Date(it.updatedAt)) : '';
    if (edited > (since[it.id] || '')) since[it.id] = edited;
  }
  return Coach.warmthSuggestions({ items, worn: state.worn, feedback: state.feedback, since });
}

// "어제 입은 옷 어땠어요?" · 따뜻한 정도 고치기 제안 · 답한 뒤 한마디 — 셋 중 하나만
function renderFeedback() {
  const box = $('feedbackBox');
  box.textContent = '';
  const date = Coach.feedbackDate({ worn: state.worn, feedback: state.feedback, today: todayKey(), hour: new Date().getHours() });
  const fix = date ? null : suggestions()[0];

  const add = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    box.append(node);
    return node;
  };
  const button = (text, data) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.textContent = text;
    Object.assign(btn.dataset, data);
    return btn;
  };

  if (date) {
    const age = Coach.daysBetween(date, todayKey());
    const when = age === 0 ? '오늘' : age === 1 ? '어제' : '그저께';
    add('p', 'feedback-q', `${when} 입은 ${wornTitle(state.worn[date])}, 어땠어요?`);
    const row = add('div', 'feedback-btns', '');
    for (const [feel, f] of Object.entries(FEELS)) row.append(button(`${f.icon} ${f.label}`, { feel, date }));
    const skip = button('×', { feel: 'skip', date });
    skip.classList.add('feedback-skip');
    skip.setAttribute('aria-label', '건너뛰기');
    row.append(skip);
    const other = button('사실 다른 옷 입었어요', { other: date });
    other.className = 'link-btn';
    box.append(other);
  } else if (fix) {
    const more = fix.to < fix.from;
    add('p', 'feedback-q', `${fix.item.name}${objectJosa(fix.item.name)} 입은 날 ${more ? `${fix.hot}번 더웠어요` : `${fix.cold}번 추웠어요`}. `
      + `따뜻한 정도를 ${fix.from} → ${fix.to}로 ${more ? '낮출까요' : '높일까요'}?`);
    const row = add('div', 'feedback-btns', '');
    row.append(button(more ? '낮추기' : '높이기', { fix: fix.item.id, to: String(fix.to) }), button('괜찮아요', { keep: fix.item.id }));
  } else if (state.feedbackNote) {
    add('p', 'feedback-q', state.feedbackNote);
    const row = add('div', 'feedback-btns', '');
    row.append(button('닫기', { close: '1' }));
  }
  box.hidden = !box.children.length;

  // 설정 메뉴: 지금 배운 보정
  const v = learned();
  $('learnedValue').textContent = signed(v);
  $('learnedReset').hidden = v === 0;
}

// 피드백 상자 버튼
function onFeedbackClick(e) {
  const btn = e.target.closest('.chip-btn') || e.target.closest('.link-btn');
  if (!btn) return;
  const d = btn.dataset;
  const today = todayKey();
  if (d.feel) {
    answerFeel(d.date, d.feel);
    return;
  } else if (d.other) {
    openWearSheet(d.other);
    return;
  } else if (d.fix) {
    setFeedback({ ...state.feedback, since: { ...state.feedback.since, [d.fix]: today } });
    state.feedbackNote = '고쳤어요. 다음 추천부터 반영돼요.';
    Wardrobe.update(d.fix, { warmth: Number(d.to) }); // 옷장이 바뀌면 다시 그린다
    return;
  } else if (d.keep) {
    setFeedback({ ...state.feedback, since: { ...state.feedback.since, [d.keep]: today } });
  } else if (d.close) {
    state.feedbackNote = '';
  }
  renderOutfit();
}

// 설정 메뉴 "초기화": 배운 보정을 0으로 (그 전 답은 배우는 데 안 쓰지만, 남겨서 다시 묻지 않게)
function resetLearned() {
  setFeedback({ ...state.feedback, resetAt: Date.now() });
  renderOutfit();
}

/* ===== 날씨 가져오기 ===== */

// 현재 위치. 거부·실패·응답 없음이면 null
function getPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    // 권한 창을 무시하고 있을 때를 대비한 자체 시간 제한
    const timer = setTimeout(() => resolve(null), 10000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
      () => { clearTimeout(timer); resolve(null); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

async function fetchWeather(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}`
    + '&current=temperature_2m,apparent_temperature,precipitation,weather_code'
    + '&hourly=apparent_temperature&forecast_hours=12'
    + '&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const c = json.current;
  // 앞으로 12시간 체감온도 (일교차). 없으면 null
  const hours = (json.hourly?.apparent_temperature ?? []).filter((t) => typeof t === 'number');
  return {
    feelsHi: hours.length ? Math.max(c.apparent_temperature, ...hours) : null,
    feelsLo: hours.length ? Math.min(c.apparent_temperature, ...hours) : null,
    feels: c.apparent_temperature,
    temp: c.temperature_2m,
    code: c.weather_code,
    precip: c.precipitation,
    isRain: c.precipitation > 0 || isPrecipCode(c.weather_code),
  };
}

function readCache() {
  try {
    const cached = JSON.parse(storageGet(CACHE_KEY));
    if (cached && typeof cached.feels === 'number') return cached;
  } catch { /* 깨진 캐시는 무시 */ }
  return null;
}

// force=true 면 캐시를 건너뛰고 새로 가져온다
async function loadWeather(force = false) {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.savedAt < CACHE_MS) {
    applyWeather(cached);
    return;
  }

  $('weatherLine').textContent = '날씨를 불러오는 중…';
  const pos = await getPosition();
  const place = pos
    ? { name: '현재 위치', lat: pos.lat, lon: pos.lon }
    : { ...DEFAULT_PLACE, name: `${DEFAULT_PLACE.name} (기본)` };
  $('place').textContent = place.name;

  try {
    const w = await fetchWeather(place.lat, place.lon);
    const data = { ...w, place: place.name, savedAt: Date.now() };
    storageSet(CACHE_KEY, JSON.stringify(data));
    applyWeather(data);
  } catch (err) {
    console.warn('날씨 불러오기 실패:', err);
    if (cached) {
      // 오래된 캐시라도 있으면 그걸 보여준다
      applyWeather(cached, true);
    } else {
      showWeatherError();
    }
  }
}

function applyWeather(data, stale = false) {
  state.weather = data;
  if (!state.custom) state.sliderTemp = clampSlider(Math.round(data.feels));
  renderAll();

  const t = new Date(data.savedAt);
  const hhmm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  $('updated').textContent = `${stale ? '오래된 정보 · ' : ''}${hhmm} 기준`;
}

function showWeatherError() {
  state.weather = null;
  $('feels').textContent = '--';
  const line = $('weatherLine');
  line.textContent = '날씨를 불러오지 못했어요. ';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'link-btn';
  retry.textContent = '다시 시도';
  retry.addEventListener('click', () => loadWeather(true));
  line.append(retry);
  $('updated').textContent = '';
  renderOutfit();
  renderSlider();
}

/* ===== 추천 계산 ===== */

function clampSlider(t) {
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, t));
}

/* ===== 옷장 추천 → 화면에 쓰는 모양 ===== */

// 옷장 옷 → 추천안 칸에 쓰는 모양 (캐릭터는 기존 그림에 옷 색만 입힌다)
function closetItem(it) {
  return { id: it.id, name: it.name, color: it.color, art: { art: Wardrobe.artFor(it), color: it.color } };
}

// 지금 추천에 쓰는 기준 온도 (보정 전)
function baseTemp() {
  if (!state.custom && state.weather) return Math.round(state.weather.feels);
  return state.sliderTemp;
}

// 앞으로 12시간 체감 최고 · 최저 (보정 포함). 슬라이더로 다른 온도를 볼 때 · 정보가 없을 때는 null
function laterRange(offset) {
  const w = state.weather;
  if (state.custom || !w || typeof w.feelsHi !== 'number' || typeof w.feelsLo !== 'number') return null;
  return { hi: Math.round(w.feelsHi) + offset, lo: Math.round(w.feelsLo) + offset };
}

/**
 * 이 온도의 추천안들 (비 오면 모든 추천안 소품에 우산)
 *  옷장에 맞는 옷이 있으면 옷장 추천, 없으면 OUTFIT_TABLE 기본 룩.
 *  pick 은 Coach.pickFromCloset 결과 (안내 · "다른 추천안" 버튼에 씀)
 *  later 는 앞으로 12시간 체감 최고 · 최저 (일교차 — 점수와 코치 한마디에 씀, 없으면 null)
 */
function buildLooks(target, later = null) {
  const { band, looks: defaults } = Coach.defaultLooks(OUTFIT_TABLE, target);
  const key = String(Coach.findRow(WARMTH_TABLE, target).min);
  if (state.combo.key !== key) state.combo = { key, index: 0 }; // 구간이 바뀌면 첫 묶음부터

  const pick = Coach.pickFromCloset({
    items: Wardrobe.list(),
    temp: target,
    warmthTable: WARMTH_TABLE,
    seed: new Date().toDateString(),
    page: state.combo.index,
    worn: Coach.wornDays(state.worn, todayKey()),
    later,
  });
  // 옷장에 맞는 소품이 없으면 소품 칸만 기본 룩에서
  const fallbackAcc = defaults.find((look) => look.acc)?.acc ?? null;
  let looks = pick.looks
    ? pick.looks.map((look) => ({
      top: closetItem(look.top),
      bottom: closetItem(look.bottom),
      outer: look.outer ? closetItem(look.outer) : null,
      acc: look.acc ? closetItem(look.acc) : fallbackAcc,
      tip: look.tip,
    }))
    : defaults;

  looks = Coach.addSwing(looks, target, later);
  if (state.weather?.isRain) looks = Coach.addRain(looks, RAIN_ITEM);
  return { band, pick, looks };
}

/* ===== 화면 그리기 ===== */

function renderAll() {
  renderHero();
  renderOutfit();
  renderSlider();
}

function renderHero() {
  const w = state.weather;
  if (!w) return;
  $('place').textContent = w.place;
  $('feels').textContent = Math.round(w.feels);

  const line = $('weatherLine');
  line.textContent = '';
  const desc = WEATHER_TEXT[w.code] ?? '날씨 정보';
  line.append(`${desc} · 기온 ${Math.round(w.temp)}° · `);
  const rain = document.createElement('span');
  if (w.isRain) {
    rain.className = 'rain';
    rain.textContent = w.precip > 0 ? `강수 ${w.precip}mm` : '강수 있음';
  } else {
    rain.textContent = '강수 없음';
  }
  line.append(rain);
  if (typeof w.feelsHi === 'number' && typeof w.feelsLo === 'number') {
    line.append(` · 12시간 체감 ${Math.round(w.feelsLo)}~${Math.round(w.feelsHi)}°`);
  }
}

function renderOutfit(direction = null) {
  const offset = totalOffset();
  const base = baseTemp();
  const target = base + offset;
  const { band, pick, looks } = buildLooks(target, laterRange(offset));
  state.now = { target, need: Coach.warmthNeed(Coach.findRow(WARMTH_TABLE, target)), learned: learned() };

  // 기준 문구: "지금 체감 18° 기준" / "슬라이더 10° 기준" (+ 보정: "→ 더위 잘 탐 · 입어 본 느낌 +0.5° 20.5°")
  const basis = $('basis');
  const source = (!state.custom && state.weather) ? `지금 체감 ${base}°` : `${base}°`;
  basis.innerHTML = '';
  basis.append(`${source} 기준`);
  if (offset !== 0) {
    const why = [];
    if (SENSITIVITY[state.sense].offset) why.push(SENSITIVITY[state.sense].label);
    if (learned()) why.push(`입어 본 느낌 ${signed(learned())}`);
    const b = document.createElement('b');
    b.textContent = ` → ${why.join(' · ')} ${target}°`;
    basis.append(b);
  }
  basis.append(` · ${band.label}`);
  renderFeedback();

  // 보여주는 추천안이 바뀌면 첫 코디부터 보여준다
  const sig = JSON.stringify(looks.map((look) => [Coach.lookTitle(look), look.outer?.name, look.acc?.name]));
  const changed = sig !== state.looksSig;
  if (changed) {
    state.looksSig = sig;
    state.selected = 0;
  }
  if (state.selected >= looks.length) state.selected = 0;

  state.looks = looks;
  renderClosetNote(pick);
  renderLookSlide(looks, direction);
  dressFigure(looks[state.selected]);
}

// 코디 넘기기 (버튼 · 스와이프 · 점 클릭)
function selectLook(index, direction = null) {
  if (index < 0 || index >= state.looks.length || index === state.selected) return;
  const dir = direction || (index > state.selected ? 'next' : 'prev');
  state.selected = index;
  renderLookSlide(state.looks, dir);
  dressFigure(state.looks[state.selected]);
}

// 캐릭터: 고른 추천안을 그림으로 (겉옷이 null 이면 그 층은 비운다)
function dressFigure(look) {
  Character.render($('figure'), {
    bottom: look.bottom?.art,
    top: look.top?.art,
    outer: look.outer?.art,
    acc: look.acc?.art,
  });
  const described = Object.entries(Coach.SLOT_LABEL)
    .filter(([slot]) => look[slot])
    .map(([slot, label]) => `${label} ${look[slot].name}`);
  $('figure').setAttribute('aria-label', `추천 옷을 입은 캐릭터: ${described.join(', ')}`);
}

// 현재 보고 있는 코디 설명과 슬라이더 컨트롤 (좌우 버튼 · 인디케이터)
function renderLookSlide(looks, direction = null) {
  const total = looks.length;
  const current = state.selected;
  const look = looks[current];

  // 1. 좌우 넘기기 버튼 활성/비활성
  const prevBtn = $('prevLookBtn');
  const nextBtn = $('nextLookBtn');
  if (prevBtn) {
    prevBtn.disabled = current <= 0;
  }
  if (nextBtn) {
    nextBtn.disabled = current >= total - 1;
  }

  // 2. 인디케이터 (점 + 쪽수)
  const dots = $('slideDots');
  if (dots) {
    dots.textContent = '';
    looks.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slide-dot';
      if (i === current) dot.classList.add('active');
      dot.dataset.index = String(i);
      dot.setAttribute('aria-label', `${i + 1}번째 코디`);
      dot.setAttribute('aria-current', String(i === current));
      dots.append(dot);
    });
  }
  const count = $('slideCount');
  if (count) {
    count.textContent = total > 0 ? `${current + 1} / ${total}` : '';
  }

  // 3. 현재 코디 설명 (룩 이름 · 품목 줄 · 코치 한마디)
  const detail = $('lookDetail');
  if (detail && look) {
    detail.textContent = '';
    const card = document.createElement('div');
    card.className = 'look-card current';

    const title = document.createElement('div');
    title.className = 'look-title';
    title.textContent = Coach.lookTitle(look);
    card.append(title);

    const rows = document.createElement('div');
    rows.className = 'look-rows';
    for (const [slot, label] of Object.entries(Coach.SLOT_LABEL)) {
      const item = look[slot];
      if (!item) continue;
      const row = document.createElement('span');
      row.className = 'look-row';
      const lab = document.createElement('span');
      lab.className = 'look-label';
      lab.textContent = label;
      const icon = document.createElement('span');
      icon.className = 'look-icon';
      icon.textContent = item.icon ?? '';
      if (item.color) {
        // 옷장 옷은 색 동그라미로
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = item.color;
        icon.append(dot);
      }
      const name = document.createElement('span');
      name.className = 'look-name';
      name.textContent = item.name;
      row.append(lab, icon, name);
      rows.append(row);
    }
    card.append(rows);

    const tip = document.createElement('div');
    tip.className = 'look-tip';
    tip.textContent = look.tip;
    card.append(tip);

    // 옷장 추천이면 최근에 입은 옷 안내
    if (lookIds(look).length) {
      const days = Coach.wornDays(state.worn, todayKey());
      const recent = ['top', 'bottom', 'outer']
        .filter((slot) => look[slot] && days[look[slot].id] >= 1 && days[look[slot].id] <= WORN_NOTE_DAYS)
        .map((slot) => {
          const d = days[look[slot].id];
          return `${Coach.SLOT_LABEL[slot]} ${d === 1 ? '어제' : `${d}일 전`} 입음`;
        });
      if (recent.length) {
        const note = document.createElement('div');
        note.className = 'look-worn';
        note.textContent = recent.join(' · ');
        card.append(note);
      }
    }

    // 입은 기록: 도장 · 다른 옷
    renderWearRow(card, look);

    detail.append(card);
  }

  // 4. 슬라이드 애니메이션
  const fig = $('figure');
  if (direction && fig) {
    fig.classList.remove('slide-next', 'slide-prev');
    if (detail) detail.classList.remove('fade');
    if (typeof fig.offsetWidth === 'number') void fig.offsetWidth;
    fig.classList.add(direction === 'next' ? 'slide-next' : 'slide-prev');
    if (detail) detail.classList.add('fade');
  }
}

// 카드 아래 "이대로 입었어요" 도장 버튼 · "다른 옷 입었어요" (기본 룩 · 옷장 추천 모두)
function renderWearRow(card, look) {
  const row = document.createElement('div');
  row.className = 'wear-row';
  const button = (cls, text, act) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.textContent = text;
    btn.dataset.wear = act;
    row.append(btn);
    return btn;
  };
  const say = (cls, text) => {
    const p = document.createElement('span');
    p.className = cls;
    p.textContent = text;
    row.append(p);
  };

  if (!canRecord()) {
    say('wear-note', '지금 날씨로 돌아가면 입은 옷을 기록할 수 있어요');
  } else if (isStamped(look)) {
    const stamp = document.createElement('span');
    stamp.className = 'stamp';
    if (state.justStamped) stamp.classList.add('pop');
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = '오늘 입음';
    card.append(stamp);
    say('wear-done', '✓ 오늘 이대로 입었어요');
    button('link-btn', '취소', 'undo');
  } else {
    const today = state.worn[todayKey()];
    if (today) say('wear-note', `오늘 기록: ${wornTitle(today)}`);
    button('stamp-btn', today ? '🙆 이걸로 바꾸기' : '🙆 이대로 입었어요', 'stamp');
    button('link-btn', today?.other ? '입은 옷 고치기' : '다른 옷 입었어요', 'other');
  }
  card.append(row);
}

// "다른 추천안" 버튼 · 옷장 안내
function renderClosetNote(pick) {
  const more = $('nextComboBtn');
  more.hidden = !(pick.looks && pick.pageCount > 1);
  if (pick.looks) $('comboCount').textContent = `${pick.page + 1}/${pick.pageCount}`;
  $('closetHint').hidden = Boolean(pick.looks);
  $('closetMissing').textContent = pick.missing ? ` (이 온도에 맞는 ${pick.missing.join('·')} 없음)`
    : pick.noFit ? ' (옷장 옷을 합치면 이 온도엔 너무 얇거나 두꺼움)' : '';
}

function renderSlider() {
  const slider = $('slider');
  const value = state.custom || !state.weather ? state.sliderTemp : clampSlider(Math.round(state.weather.feels));
  slider.value = value;
  $('sliderValue').textContent = `${value}°`;
  // 현재 날씨가 있고 다른 온도를 보고 있을 때만 "돌아가기" 활성
  $('resetBtn').disabled = !(state.custom && state.weather);
}

/* ===== 설정 (체감 보정) ===== */

function setSense(value, save = true) {
  if (!SENSITIVITY[value]) value = 'normal';
  state.sense = value;
  $('settingsLabel').textContent = SENSITIVITY[value].label;
  for (const r of document.querySelectorAll('input[name="sense"]')) r.checked = r.value === value;
  if (save) storageSet(SENSE_KEY, value);
  renderOutfit();
}

function toggleMenu(open) {
  const menu = $('settingsMenu');
  const btn = $('settingsBtn');
  const willOpen = open ?? menu.hidden;
  menu.hidden = !willOpen;
  btn.setAttribute('aria-expanded', String(willOpen));
}

/* ===== 하단 탭 (주소 #today · #closet · #me) ===== */

const TABS = ['today', 'closet', 'me'];

/*
 * 길 잃지 않기: 왼쪽 위 앱 이름(누르면 #today) · 오늘이 아닌 탭엔 "← 뒤로"
 *  앱 안에서 넘어온 화면이면 "← 뒤로" = history.back() (브라우저 뒤로가기와 같은 곳)
 *  그 탭 주소로 바로 열었으면 앱 밖으로 나가지 않고 #today 로
 *  어느 쪽인지는 history.state.depth 로 안다: 처음 연 화면 0, 앱 안에서 새로 넘어간 화면은 하나씩 +1
 */
let navDepth = 0;

function currentTab() {
  const hash = location.hash.slice(1);
  return TABS.includes(hash) ? hash : 'today';
}

function trackDepth() {
  const st = history.state;
  if (st && finite(st.depth)) navDepth = st.depth;          // 뒤로 · 앞으로 가서 돌아온 화면
  else {
    navDepth += 1;                                            // 앱 안에서 새로 넘어온 화면
    try { history.replaceState({ ...(st || {}), depth: navDepth }, ''); } catch { /* 못 적어도 동작 */ }
  }
}

function showTab() {
  const tab = currentTab();
  for (const view of document.querySelectorAll('.view')) view.hidden = view.dataset.view !== tab;
  for (const link of document.querySelectorAll('.tab')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('backBtn').hidden = tab === 'today';
  toggleMenu(false);
  window.scrollTo(0, 0);
}

function goBack() {
  if (navDepth > 0) history.back();
  else location.hash = '#today';
}

function goHome(e) {
  e?.preventDefault?.();
  if (currentTab() === 'today') window.scrollTo(0, 0);
  else location.hash = '#today';
}

/* ===== 이벤트 연결 ===== */

function init() {
  // 처음 연 화면은 depth 0 (새로 고침이면 적어 둔 depth 그대로)
  if (history.state && finite(history.state.depth)) navDepth = history.state.depth;
  else {
    try { history.replaceState({ ...(history.state || {}), depth: 0 }, ''); } catch { /* 못 적어도 동작 */ }
  }
  showTab();
  window.addEventListener('hashchange', () => {
    trackDepth();
    showTab();
  });
  $('brandLink').addEventListener('click', goHome);
  $('backBtn').addEventListener('click', goBack);

  state.worn = loadWorn();
  state.feedback = loadFeedback();
  setSense(storageGet(SENSE_KEY) || 'normal', false);

  // 입은 기록도 백업 파일에 함께
  Wardrobe.addBackupPart('worn', {
    label: '입은 기록',
    get: () => state.worn,
    set: (value) => { setWorn(value); renderOutfit(); },
  });

  Wardrobe.addBackupPart('feedback', {
    label: '입어 본 느낌',
    get: () => state.feedback,
    set: (value) => { setFeedback(value); renderOutfit(); },
  });
  $('feedbackBox').addEventListener('click', onFeedbackClick);
  $('learnedReset').addEventListener('click', (e) => {
    e.stopPropagation();
    resetLearned();
  });

  // 코디 설명의 "이대로 입었어요" 도장 · 취소 · "다른 옷 입었어요"
  $('lookDetail').addEventListener('click', (e) => {
    const act = e.target.closest('[data-wear]')?.dataset.wear;
    const look = state.looks[state.selected];
    if (!act || !look) return;
    if (act === 'stamp') stampLook(look);
    else if (act === 'undo') unstamp();
    else if (act === 'other') openWearSheet(todayKey());
  });
  $('wearForm').addEventListener('submit', onWearSubmit);
  // 겹쳐 뜨는 창: ✕ · 바깥(어두운 배경) 누르기 · Esc(dialog 기본)로 닫기
  $('closeWearBtn').addEventListener('click', () => $('wearDialog').close());
  $('wearDialog').addEventListener('click', (e) => { if (e.target === $('wearDialog')) $('wearDialog').close(); });

  $('nextComboBtn').addEventListener('click', () => {
    state.combo.index += 1;
    renderOutfit();
  });

  // 캐릭터 그림 위에서 좌우 스와이프 (왼쪽: 다음 코디, 오른쪽: 이전 코디)
  const fig = $('figure');
  const stage = $('figureStage') || fig;
  let touchStartX = 0;
  let touchStartY = 0;

  function onTouchStart(e) {
    if (!e.touches || !e.touches.length) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    if (!e.changedTouches || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    // 수평 이동이 수직 이동보다 크고 30px 이상일 때 스와이프로 판정
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx < 0) {
        // 왼쪽으로 넘기면 다음 코디
        if (state.selected < state.looks.length - 1) {
          selectLook(state.selected + 1, 'next');
        }
      } else {
        // 오른쪽으로 넘기면 이전 코디
        if (state.selected > 0) {
          selectLook(state.selected - 1, 'prev');
        }
      }
    }
  }

  if (fig) {
    fig.addEventListener('touchstart', onTouchStart, { passive: true });
    fig.addEventListener('touchend', onTouchEnd, { passive: true });
  }
  if (stage && stage !== fig) {
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  // 좌우 넘기기 버튼
  const prevBtn = $('prevLookBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.selected > 0) selectLook(state.selected - 1, 'prev');
    });
  }
  const nextBtn = $('nextLookBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.selected < state.looks.length - 1) selectLook(state.selected + 1, 'next');
    });
  }

  // 인디케이터 점 클릭
  const dots = $('slideDots');
  if (dots) {
    dots.addEventListener('click', (e) => {
      const dot = e.target.closest('.slide-dot');
      if (!dot) return;
      const idx = Number(dot.dataset.index);
      if (!Number.isNaN(idx)) selectLook(idx);
    });
  }

  // 옷장이 바뀌면 첫 묶음부터 다시
  Wardrobe.onChange(() => {
    state.combo = { key: '', index: 0 };
    renderOutfit();
  });

  $('slider').addEventListener('input', (e) => {
    state.sliderTemp = Number(e.target.value);
    state.custom = true;
    $('sliderValue').textContent = `${state.sliderTemp}°`;
    $('resetBtn').disabled = !state.weather;
    renderOutfit();
  });

  $('resetBtn').addEventListener('click', () => {
    state.custom = false;
    if (state.weather) state.sliderTemp = clampSlider(Math.round(state.weather.feels));
    renderOutfit();
    renderSlider();
  });

  $('settingsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  $('settingsCloseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(false);
  });
  $('settingsMenu').addEventListener('change', (e) => {
    if (e.target.name === 'sense') {
      setSense(e.target.value);
      toggleMenu(false);
    }
  });
  // 메뉴 바깥을 누르거나 Esc 면 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.settings')) toggleMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleMenu(false);
  });

  $('refreshBtn').addEventListener('click', () => loadWeather(true));

  renderOutfit();
  renderSlider();
  loadWeather();
}

init();

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
  weather: null,      // { feels, temp, code, precip, isRain, place, savedAt }
  sense: 'normal',
  sliderTemp: 20,     // 슬라이더 값
  custom: false,      // 슬라이더로 다른 온도를 보고 있는지
  combo: { key: '', index: 0 }, // 옷장 추천: 지금 보여주는 추천안 묶음 번호 ("다른 추천안")
  selected: 0,        // 캐릭터에 입힌 추천안 카드 번호
  looks: [],          // 지금 보여주는 추천안들
  looksSig: '',       // 그 추천안들의 이름 (바뀌면 첫 카드부터 선택)
};

const $ = (id) => document.getElementById(id);

/* ===== localStorage: 막혀 있어도 앱은 동작하도록 ===== */
function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* 저장 못 해도 무시 */ }
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
    + '&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const c = json.current;
  return {
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
  return { name: it.name, color: it.color, art: { art: Wardrobe.artFor(it), color: it.color } };
}

// 지금 추천에 쓰는 기준 온도 (보정 전)
function baseTemp() {
  if (!state.custom && state.weather) return Math.round(state.weather.feels);
  return state.sliderTemp;
}

/**
 * 이 온도의 추천안들 (비 오면 모든 추천안 소품에 우산)
 *  옷장에 맞는 옷이 있으면 옷장 추천, 없으면 OUTFIT_TABLE 기본 룩.
 *  pick 은 Coach.pickFromCloset 결과 (안내 · "다른 추천안" 버튼에 씀)
 */
function buildLooks(target) {
  const { band, looks: defaults } = Coach.defaultLooks(OUTFIT_TABLE, target);
  const key = String(Coach.findRow(WARMTH_TABLE, target).min);
  if (state.combo.key !== key) state.combo = { key, index: 0 }; // 구간이 바뀌면 첫 묶음부터

  const pick = Coach.pickFromCloset({
    items: Wardrobe.list(),
    temp: target,
    warmthTable: WARMTH_TABLE,
    seed: new Date().toDateString(),
    page: state.combo.index,
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
}

function renderOutfit() {
  const offset = SENSITIVITY[state.sense].offset;
  const base = baseTemp();
  const target = base + offset;
  const { band, pick, looks } = buildLooks(target);

  // 기준 문구: "지금 체감 18° 기준" / "슬라이더 10° 기준" (+ 보정)
  const basis = $('basis');
  const source = (!state.custom && state.weather) ? `지금 체감 ${base}°` : `${base}°`;
  basis.innerHTML = '';
  basis.append(`${source} 기준`);
  if (offset !== 0) {
    const b = document.createElement('b');
    b.textContent = ` → ${SENSITIVITY[state.sense].label} ${target}°`;
    basis.append(b);
  }
  basis.append(` · ${band.label}`);

  // 보여주는 추천안이 바뀌면 첫 카드를 입힌다
  const sig = JSON.stringify(looks.map((look) => [Coach.lookTitle(look), look.outer?.name, look.acc?.name]));
  const changed = sig !== state.looksSig;
  if (changed) {
    state.looksSig = sig;
    state.selected = 0;
  }
  if (state.selected >= looks.length) state.selected = 0;

  state.looks = looks;
  renderClosetNote(pick);
  renderLookCards(looks, changed);
  dressFigure(looks[state.selected]);
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

// 추천안 카드: 룩 이름 · 상의/하의/겉옷/소품 줄 · 코치 한마디. 누르면 캐릭터가 그 옷으로
function renderLookCards(looks, changed) {
  const list = $('lookList');
  list.textContent = '';
  looks.forEach((look, i) => {
    const li = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'look-card';
    card.dataset.index = String(i);
    card.setAttribute('aria-pressed', String(i === state.selected));
    if (changed) card.classList.add('flash');

    const title = document.createElement('span');
    title.className = 'look-title';
    title.textContent = Coach.lookTitle(look);
    card.append(title);

    const rows = document.createElement('span');
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

    const tip = document.createElement('span');
    tip.className = 'look-tip';
    tip.textContent = look.tip;
    card.append(tip);

    li.append(card);
    list.append(li);
  });
}

// "다른 추천안" 버튼 · 옷장 안내
function renderClosetNote(pick) {
  const more = $('nextComboBtn');
  more.hidden = !(pick.looks && pick.pageCount > 1);
  if (pick.looks) $('comboCount').textContent = `${pick.page + 1}/${pick.pageCount}`;
  $('closetHint').hidden = Boolean(pick.looks);
  $('closetMissing').textContent = pick.missing ? ` (이 온도에 맞는 ${pick.missing.join('·')} 없음)` : '';
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

function showTab() {
  const hash = location.hash.slice(1);
  const tab = TABS.includes(hash) ? hash : 'today';
  for (const view of document.querySelectorAll('.view')) view.hidden = view.dataset.view !== tab;
  for (const link of document.querySelectorAll('.tab')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  toggleMenu(false);
  window.scrollTo(0, 0);
}

/* ===== 이벤트 연결 ===== */

function init() {
  showTab();
  window.addEventListener('hashchange', showTab);

  setSense(storageGet(SENSE_KEY) || 'normal', false);

  $('nextComboBtn').addEventListener('click', () => {
    state.combo.index += 1;
    renderOutfit();
  });
  // 카드를 누르면 캐릭터가 그 추천안으로
  $('lookList').addEventListener('click', (e) => {
    const card = e.target.closest('.look-card');
    if (!card) return;
    state.selected = Number(card.dataset.index);
    for (const c of $('lookList').querySelectorAll('.look-card')) {
      c.setAttribute('aria-pressed', String(c === card));
    }
    dressFigure(state.looks[state.selected]);
  });
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

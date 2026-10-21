/*
 * 온도별 의상 추천
 * ------------------------------------------------------------
 * 품목을 바꾸고 싶으면 아래 OUTFIT_TABLE 만 고치면 된다.
 *  - min  : 이 구간의 최저 온도(이상). 위에서부터 차례로 비교하므로 높은 온도 순서를 지킬 것.
 *  - 각 칸은 { icon: '이모지', name: '품목 이름', art: '캐릭터 그림 이름' }.
 *    필요 없는 칸은 null 로 두면 화면에 "필요 없음"으로 나오고 캐릭터에도 그리지 않는다.
 *  - art 는 character.js 의 PIECES 이름. 여러 개를 겹치려면 배열로 (예: ['muffler', 'gloves']).
 *    쓸 수 있는 이름과 새 그림을 추가하는 방법은 character.js 맨 위 주석 참고.
 */
const OUTFIT_TABLE = [
  {
    min: 28, label: '28° 이상',
    top:    { icon: '🎽', name: '민소매 · 반팔', art: 'tank' },
    bottom: { icon: '🩳', name: '반바지 · 린넨 바지', art: 'shorts' },
    outer:  null,
    acc:    { icon: '🕶️', name: '선글라스 · 모자', art: ['sunglasses', 'cap'] },
  },
  {
    min: 23, label: '23–27°',
    top:    { icon: '👕', name: '반팔 · 얇은 셔츠', art: 'tshirt' },
    bottom: { icon: '🩳', name: '반바지 · 면바지', art: 'shorts' },
    outer:  null,
    acc:    { icon: '🧢', name: '모자', art: 'cap' },
  },
  {
    min: 20, label: '20–22°',
    top:    { icon: '👚', name: '얇은 긴팔 · 블라우스', art: 'longsleeve' },
    bottom: { icon: '👖', name: '면바지 · 슬랙스', art: 'slacks' },
    outer:  { icon: '🧶', name: '얇은 가디건', art: 'cardigan' },
    acc:    null,
  },
  {
    min: 17, label: '17–19°',
    top:    { icon: '👕', name: '맨투맨 · 얇은 니트', art: 'sweatshirt' },
    bottom: { icon: '👖', name: '청바지 · 면바지', art: 'jeans' },
    outer:  { icon: '🧥', name: '바람막이 · 얇은 재킷', art: 'windbreaker' },
    acc:    null,
  },
  {
    min: 12, label: '12–16°',
    top:    { icon: '👔', name: '니트 · 셔츠', art: 'shirt' },
    bottom: { icon: '👖', name: '청바지 · 슬랙스', art: 'jeans' },
    outer:  { icon: '🧥', name: '재킷 · 트렌치코트', art: 'jacket' },
    acc:    { icon: '🧣', name: '얇은 스카프', art: 'scarf' },
  },
  {
    min: 9, label: '9–11°',
    top:    { icon: '🧶', name: '니트 · 기모 맨투맨', art: 'knit' },
    bottom: { icon: '👖', name: '청바지 · 기모 바지', art: 'jeans' },
    outer:  { icon: '🧥', name: '트렌치코트 · 점퍼', art: 'trench' },
    acc:    { icon: '🧣', name: '스카프', art: 'scarf' },
  },
  {
    min: 5, label: '5–8°',
    top:    { icon: '🧶', name: '두꺼운 니트 · 히트텍', art: 'knit' },
    bottom: { icon: '👖', name: '기모 바지', art: 'warmpants' },
    outer:  { icon: '🧥', name: '울 코트 · 가죽 재킷', art: 'coat' },
    acc:    { icon: '🧣', name: '목도리', art: 'muffler' },
  },
  {
    min: -Infinity, label: '4° 이하',
    top:    { icon: '🧶', name: '히트텍 + 두꺼운 니트', art: 'knit' },
    bottom: { icon: '👖', name: '기모 바지 · 내복', art: 'warmpants' },
    outer:  { icon: '🧥', name: '패딩 · 두꺼운 코트', art: 'padding' },
    acc:    { icon: '🧤', name: '목도리 · 장갑 · 비니', art: ['muffler', 'gloves', 'beanie'] },
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

/*
 * 색 조합 규칙
 *  - 상의와 하의가 같은 색 계열이면 피한다 (그런 조합만 있으면 그래도 보여준다).
 *  - 무채색(검정 · 흰 · 회 · 베이지)은 뭐든 어울린다.
 * 색 계열은 색상(hue, 0~360) 범위로 나눈다. max 미만이면 그 계열.
 */
const COLOR_FAMILIES = [
  { name: 'red', max: 15 }, { name: 'orange', max: 45 }, { name: 'yellow', max: 70 },
  { name: 'green', max: 165 }, { name: 'blue', max: 255 }, { name: 'purple', max: 290 },
  { name: 'pink', max: 345 }, { name: 'red', max: 361 },
];

const SLOT_LABEL = { top: '상의', bottom: '하의', outer: '겉옷', acc: '소품' };

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
  combo: { key: '', index: 0 }, // 옷장 추천: 지금 보여주는 조합 번호 ("다른 조합")
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

function findBand(temp) {
  return OUTFIT_TABLE.find((band) => temp >= band.min) || OUTFIT_TABLE[OUTFIT_TABLE.length - 1];
}

/* ===== 옷장에서 조합 고르기 ===== */

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

// 'neutral'(무채색) 또는 COLOR_FAMILIES 의 이름
function colorFamily(hex) {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.12 || l < 0.13 || l > 0.93) return 'neutral';           // 검정 · 흰 · 회
  if (h >= 20 && h <= 50 && s < 0.5 && l > 0.65) return 'neutral';  // 베이지
  return COLOR_FAMILIES.find((f) => h < f.max).name;
}

function colorsGo(combo) {
  if (!combo.top || !combo.bottom) return true;
  const a = colorFamily(combo.top.color);
  const b = colorFamily(combo.bottom.color);
  return a === 'neutral' || b === 'neutral' || a !== b;
}

// 같은 날 같은 구간이면 같은 순서로 섞는다 (날마다 첫 추천이 바뀌게)
function seededShuffle(list, seedText) {
  let seed = 0;
  for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 옷장 옷으로 조합 만들기
 *  - 옷장이 비었으면 { empty: true }
 *  - 맞는 옷이 없는 칸이 있으면 { missing: ['겉옷'] }
 *  - 아니면 { combo: { top, bottom, outer, acc }, index, count } (각 값은 옷장 옷 또는 null)
 */
function pickFromCloset(temp) {
  const items = Wardrobe.list();
  if (!items.length) return { empty: true };

  const row = WARMTH_TABLE.find((r) => temp >= r.min) || WARMTH_TABLE[WARMTH_TABLE.length - 1];
  const pools = {};
  const missing = [];
  for (const slot of Object.keys(SLOT_LABEL)) {
    const range = row[slot];
    const fits = range
      ? items.filter((it) => it.type === slot && it.warmth >= range[0] && it.warmth <= range[1])
      : [];
    if (fits.length) pools[slot] = fits;
    else if (range && slot !== 'acc') missing.push(SLOT_LABEL[slot]);
    else pools[slot] = [null];
  }
  if (missing.length) return { missing };

  const all = [];
  for (const top of pools.top)
    for (const bottom of pools.bottom)
      for (const outer of pools.outer)
        for (const acc of pools.acc) all.push({ top, bottom, outer, acc });
  const good = all.filter(colorsGo);
  const today = new Date().toDateString();
  const combos = seededShuffle(good.length ? good : all, `${today}|${row.min}`);

  // 구간이 바뀌면 첫 조합부터
  const key = String(row.min);
  if (state.combo.key !== key) state.combo = { key, index: 0 };
  const index = state.combo.index % combos.length;
  return { combo: combos[index], index, count: combos.length };
}

// 옷장 옷 → 추천 칸에 쓰는 모양 (캐릭터는 기존 그림에 옷 색만 입힌다)
function closetItem(it) {
  return { name: it.name, color: it.color, art: { art: Wardrobe.artFor(it), color: it.color } };
}

// 지금 추천에 쓰는 기준 온도 (보정 전)
function baseTemp() {
  if (!state.custom && state.weather) return Math.round(state.weather.feels);
  return state.sliderTemp;
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
  const band = findBand(target);

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

  // 옷장에 맞는 옷이 있으면 그걸로, 없으면 OUTFIT_TABLE 기본 추천
  const pick = pickFromCloset(target);
  const picked = pick.combo
    ? {
      top: closetItem(pick.combo.top),
      bottom: closetItem(pick.combo.bottom),
      outer: pick.combo.outer ? closetItem(pick.combo.outer) : null,
      acc: pick.combo.acc ? closetItem(pick.combo.acc) : band.acc,
    }
    : { top: band.top, bottom: band.bottom, outer: band.outer, acc: band.acc };
  renderClosetNote(pick);

  // 비가 오면 소품 칸에 우산 추가
  const rainy = state.weather?.isRain;
  const items = { ...picked, acc: rainy ? mergeItems(RAIN_ITEM, picked.acc) : picked.acc };

  // 캐릭터: 같은 품목을 그림으로 (겉옷이 null 이면 그 층은 비운다)
  Character.render($('figure'), {
    bottom: items.bottom?.art,
    top: items.top?.art,
    outer: items.outer?.art,
    acc: items.acc?.art,
  });
  const described = [['상의', items.top], ['하의', items.bottom], ['겉옷', items.outer], ['소품', items.acc]]
    .filter(([, item]) => item)
    .map(([label, item]) => `${label} ${item.name}`);
  $('figure').setAttribute('aria-label', `추천 옷을 입은 캐릭터: ${described.join(', ')}`);

  for (const slot of document.querySelectorAll('.slot')) {
    const key = slot.dataset.slot;
    const item = items[key];
    const icon = slot.querySelector('.slot-icon');
    const name = slot.querySelector('.slot-name');
    const prev = name.textContent;

    slot.classList.toggle('is-empty', !item);
    icon.textContent = item ? (item.icon ?? '') : '—';
    if (item?.color) {
      // 옷장 옷은 색 동그라미로
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = item.color;
      icon.append(dot);
    }
    name.textContent = item ? item.name : '필요 없음';

    // 품목이 바뀐 칸만 살짝 반짝
    if (prev && prev !== name.textContent) {
      slot.classList.remove('flash');
      void slot.offsetWidth;
      slot.classList.add('flash');
    }
  }
}

// "다른 조합" 버튼 · 옷장 안내
function renderClosetNote(pick) {
  const more = $('nextComboBtn');
  more.hidden = !(pick.combo && pick.count > 1);
  if (pick.combo) $('comboCount').textContent = `${pick.index + 1}/${pick.count}`;
  $('closetHint').hidden = Boolean(pick.combo);
  $('closetMissing').textContent = pick.missing ? ` (이 온도에 맞는 ${pick.missing.join('·')} 없음)` : '';
}

// 우산 + 기존 소품을 한 칸에 합친다
function mergeItems(extra, base) {
  if (!base) return extra;
  return {
    icon: `${extra.icon}${base.icon ?? ''}`,
    name: `${extra.name} · ${base.name}`,
    color: base.color,
    art: [].concat(extra.art ?? [], base.art ?? []), // 우산을 먼저 그려야 장갑이 손잡이 위로 온다
  };
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
  // 옷장이 바뀌면 첫 조합부터 다시
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

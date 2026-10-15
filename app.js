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

  // 비가 오면 소품 칸에 우산 추가
  const rainy = state.weather?.isRain;
  const items = {
    top: band.top,
    bottom: band.bottom,
    outer: band.outer,
    acc: rainy ? mergeItems(RAIN_ITEM, band.acc) : band.acc,
  };

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
    icon.textContent = item ? item.icon : '—';
    name.textContent = item ? item.name : '필요 없음';

    // 품목이 바뀐 칸만 살짝 반짝
    if (prev && prev !== name.textContent) {
      slot.classList.remove('flash');
      void slot.offsetWidth;
      slot.classList.add('flash');
    }
  }
}

// 우산 + 기존 소품을 한 칸에 합친다
function mergeItems(extra, base) {
  if (!base) return extra;
  return {
    icon: `${extra.icon}${base.icon}`,
    name: `${extra.name} · ${base.name}`,
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

/* ===== 이벤트 연결 ===== */

function init() {
  setSense(storageGet(SENSE_KEY) || 'normal', false);

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

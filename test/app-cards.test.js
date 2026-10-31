// 오늘 탭 추천안 슬라이드 시험: app.js 를 아주 작은 가짜 DOM 위에서 돌린다 (브라우저 없이)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Coach = require('../coach.js');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// 앱이 쓰는 만큼만 흉내 낸 요소
class El {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parent = null;
    this.attrs = {};
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.listeners = {};
    this._text = '';
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, on) => (on ?? !classes.has(c) ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c),
    };
  }
  set className(v) { for (const c of String(v).split(/\s+/).filter(Boolean)) this.classList.add(c); }
  get textContent() { return this._text + this.children.map((c) => (typeof c === 'string' ? c : c.textContent)).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  set innerHTML(v) { this.textContent = v; }
  append(...nodes) { for (const n of nodes) { if (typeof n !== 'string') n.parent = this; this.children.push(n); } }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type, eventOrTarget) {
    const isEvent = eventOrTarget && typeof eventOrTarget === 'object' && ('touches' in eventOrTarget || 'changedTouches' in eventOrTarget || 'target' in eventOrTarget);
    const ev = isEvent ? eventOrTarget : { target: eventOrTarget, stopPropagation() {} };
    if (!ev.target) ev.target = this;
    if (!ev.stopPropagation) ev.stopPropagation = () => {};
    for (const fn of this.listeners[type] || []) fn(ev);
  }
  closest(sel) {
    const data = /^\[data-([a-z]+)\]$/.exec(sel); // [data-wear] 꼴
    const cls = sel.replace(/^\./, '');
    for (let el = this; el; el = el.parent) {
      if (data ? el.dataset[data[1]] !== undefined : el.classList.contains(cls)) return el;
    }
    return null;
  }
  querySelectorAll(sel) {
    const cls = sel.replace(/^\./, '');
    const out = [];
    const walk = (el) => {
      for (const c of el.children) {
        if (typeof c === 'string') continue;
        if (c.classList.contains(cls)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  get offsetWidth() { return 0; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

// 아래 요소들을 모두 훑는다
function walkEls(root, pred, out = []) {
  for (const c of root.children) {
    if (typeof c === 'string') continue;
    if (pred(c)) out.push(c);
    walkEls(c, pred, out);
  }
  return out;
}

// 주소(#…) · history 흉내: 주소를 바꾸면 새 칸이 쌓이고 hashchange 가 난다
function fakeNav(hash) {
  const listeners = {};
  const nav = { stack: [{ hash, state: null }], i: 0, backs: 0 };
  const fire = () => (listeners.hashchange || []).forEach((fn) => fn({}));
  nav.location = {
    get hash() { return nav.stack[nav.i].hash; },
    set hash(v) {
      const next = v.startsWith('#') ? v : `#${v}`;
      if (next === nav.stack[nav.i].hash) return;
      nav.stack = nav.stack.slice(0, nav.i + 1);
      nav.stack.push({ hash: next, state: null });
      nav.i += 1;
      fire();
    },
  };
  nav.history = {
    get state() { return nav.stack[nav.i].state; },
    replaceState(s) { nav.stack[nav.i].state = s; },
    back() { nav.backs += 1; if (nav.i > 0) { nav.i -= 1; fire(); } },
  };
  nav.window = { addEventListener: (type, fn) => (listeners[type] ||= []).push(fn), scrollTo() {} };
  return nav;
}

function boot({ wardrobe = [], storage = {}, hash = '#today', closet = false } = {}) {
  const backupParts = {};
  const changeListeners = [];
  const els = {};
  const getEl = (id) => (els[id] ||= new El());
  const renders = [];
  const nav = fakeNav(hash);
  const ctx = {
    console,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
    JSON,
    Math,
    document: {
      getElementById: getEl,
      createElement: (tag) => new El(tag),
      querySelectorAll: () => [],
      addEventListener() {},
    },
    window: nav.window,
    location: nav.location,
    history: nav.history,
    navigator: {},
    localStorage: { getItem: (k) => storage[k] ?? null, setItem: (k, v) => { storage[k] = String(v); } },
    fetch: () => new Promise(() => {}), // 시험에서는 날씨를 안 가져온다 (applyWeather 로 직접 넣음)
    Character: { render: (_el, layers) => renders.push(layers) },
    Wardrobe: {
      list: () => wardrobe,
      artFor: (it) => ({ top: 'knit', bottom: 'jeans', outer: 'jacket', acc: 'scarf' })[it.type],
      get: (id) => wardrobe.find((it) => it.id === id) || null,
      update: (id, fields) => {
        Object.assign(wardrobe.find((it) => it.id === id), fields, { updatedAt: Date.now() });
        changeListeners.forEach((fn) => fn());
      },
      onChange: (fn) => changeListeners.push(fn),
      addBackupPart: (name, part) => { backupParts[name] = part; },
      TYPES: { top: '상의', bottom: '하의', outer: '겉옷', acc: '소품' },
    },
  };
  ctx.window.Coach = undefined;
  vm.createContext(ctx);
  vm.runInContext(read('coach.js'), ctx); // module 이 없으니 window.Coach 로 나온다
  ctx.Coach = ctx.window.Coach;
  if (closet) vm.runInContext(read('closet.js'), ctx); // 옷 추가 · 수정 시트 (index.html 순서대로 app.js 앞)
  vm.runInContext(read('app.js'), ctx);
  return { ctx, els, renders, storage, backupParts, nav, run: (code) => vm.runInContext(code, ctx) };
}

function swipe(el, dx, dy = 0) {
  el.dispatch('touchstart', { touches: [{ clientX: 100, clientY: 50 }] });
  el.dispatch('touchend', { changedTouches: [{ clientX: 100 + dx, clientY: 50 + dy }] });
}

const WEATHER = { feels: 14, temp: 14, code: 3, precip: 0, isRain: false, place: '시험', savedAt: Date.now() };

test('기본 추천: 추천안 2개 이상, 첫 코디가 캐릭터에 입혀지고 인디케이터와 설명이 표시된다', () => {
  const { els, renders, run } = boot();
  run(`applyWeather(${JSON.stringify(WEATHER)})`);

  const dots = els.slideDots.querySelectorAll('.slide-dot');
  assert.ok(dots.length >= 2, `${dots.length}개 추천`);
  assert.strictEqual(els.slideCount.textContent, `1 / ${dots.length}`);
  assert.strictEqual(dots[0].getAttribute('aria-current'), 'true');
  assert.strictEqual(dots[1].getAttribute('aria-current'), 'false');
  assert.strictEqual(els.prevLookBtn.disabled, true);
  assert.strictEqual(els.nextLookBtn.disabled, false);

  const firstLook = run('OUTFIT_TABLE[4].looks[0]');
  assert.strictEqual(renders.at(-1).top, firstLook.top.art);
  assert.strictEqual(els.closetHint.hidden, false);
  assert.strictEqual(els.nextComboBtn.hidden, true);
  assert.match(els.lookDetail.textContent, /니트 \+ 청바지/);
  assert.match(els.lookDetail.textContent, new RegExp(firstLook.tip));
});

test('캐릭터 그림에서 왼쪽으로 슬라이드(스와이프)하면 다음 코디로 바뀌고 캐릭터와 설명이 바뀐다', () => {
  const { els, renders, run } = boot();
  run(`applyWeather(${JSON.stringify(WEATHER)})`);

  // 왼쪽으로 넘기면(swipe left: dx < 0) 다음 코디
  swipe(els.figure, -100);

  const secondLook = run('OUTFIT_TABLE[4].looks[1]');
  assert.strictEqual(renders.at(-1).top, secondLook.top.art);
  assert.strictEqual(renders.at(-1).outer, secondLook.outer.art);
  assert.ok(els.lookDetail.textContent.includes(Coach.lookTitle(secondLook)));
  assert.match(els.lookDetail.textContent, new RegExp(secondLook.tip));

  const dots = els.slideDots.querySelectorAll('.slide-dot');
  assert.strictEqual(els.slideCount.textContent, `2 / ${dots.length}`);
  assert.strictEqual(dots[1].getAttribute('aria-current'), 'true');
  assert.strictEqual(dots[0].getAttribute('aria-current'), 'false');
  assert.strictEqual(els.prevLookBtn.disabled, false);
});

test('오른쪽으로 스와이프하거나 이전/다음 버튼, 인디케이터 점을 눌러도 코디가 올바르게 바뀐다', () => {
  const { els, renders, run } = boot();
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const firstLook = run('OUTFIT_TABLE[4].looks[0]');
  const secondLook = run('OUTFIT_TABLE[4].looks[1]');

  // 1. 다음 버튼 클릭으로 넘기기
  els.nextLookBtn.dispatch('click');
  assert.strictEqual(renders.at(-1).top, secondLook.top.art);
  assert.strictEqual(els.slideCount.textContent, '2 / 2');

  // 2. 오른쪽으로 스와이프(swipe right: dx > 0)로 이전 코디로 돌아오기
  swipe(els.figure, 100);
  assert.strictEqual(renders.at(-1).top, firstLook.top.art);
  assert.strictEqual(els.slideCount.textContent, '1 / 2');

  // 3. 인디케이터 점 클릭으로 2번째 코디로 직접 이동
  const secondDot = els.slideDots.querySelectorAll('.slide-dot')[1];
  els.slideDots.dispatch('click', secondDot);
  assert.strictEqual(renders.at(-1).top, secondLook.top.art);
  assert.strictEqual(els.slideCount.textContent, '2 / 2');

  // 4. 이전 버튼 클릭으로 다시 1번째 코디로 이동
  els.prevLookBtn.dispatch('click');
  assert.strictEqual(renders.at(-1).top, firstLook.top.art);
  assert.strictEqual(els.slideCount.textContent, '1 / 2');
});

test('비 오는 날엔 모든 추천안 소품에 우산이 붙고, 슬라이드로 넘겨도 항상 우산을 든다', () => {
  const { els, renders, run } = boot();
  run(`applyWeather(${JSON.stringify({ ...WEATHER, code: 61, precip: 1.2, isRain: true })})`);

  // 첫 번째 코디 우산 확인
  assert.match(els.lookDetail.textContent, /우산/);
  assert.ok([].concat(renders.at(-1).acc).includes('umbrella'));

  // 다음 코디로 넘겨도 우산 확인
  swipe(els.figure, -100);
  assert.match(els.lookDetail.textContent, /우산/);
  assert.ok([].concat(renders.at(-1).acc).includes('umbrella'));
});

test('옷장 추천: 옷장 옷 색 동그라미 · 슬라이드 넘기기 · 다른 추천안 버튼으로 다음 묶음', () => {
  let n = 0;
  const c = (type, name, color) => ({ id: `w${n++}`, type, name, color, warmth: 3 });
  const wardrobe = [
    c('top', '회색 니트', '#9a9da3'), c('top', '흰 셔츠', '#ffffff'),
    c('bottom', '청바지', '#3b5b8f'), c('bottom', '검정 슬랙스', '#1a1a1a'),
    c('outer', '회색 재킷', '#8a8a8a'),
  ];
  const { els, renders, run } = boot({ wardrobe });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);

  assert.strictEqual(els.slideCount.textContent, '1 / 3');
  assert.strictEqual(els.closetHint.hidden, true);
  assert.strictEqual(els.nextComboBtn.hidden, false);
  assert.strictEqual(els.comboCount.textContent, '1/2');
  assert.ok(els.lookDetail.querySelectorAll('.dot').length >= 3, '옷장 옷은 색 동그라미');
  assert.strictEqual(typeof renders.at(-1).top, 'object'); // { art, color } 로 옷 색을 입힌다

  // 슬라이드로 다음 코디 넘기기
  swipe(els.figure, -100);
  assert.strictEqual(els.slideCount.textContent, '2 / 3');

  // "↻ 다른 추천안" 버튼으로 다음 묶음으로
  els.nextComboBtn.dispatch('click');
  assert.strictEqual(els.comboCount.textContent, '2/2');
  assert.strictEqual(els.slideCount.textContent, '1 / 1'); // 다음 묶음은 1벌이고 1번째 선택됨
  assert.strictEqual(els.prevLookBtn.disabled, true);
  assert.strictEqual(els.nextLookBtn.disabled, true);
});

test('옷장에 맞는 하의가 없으면 기본 추천으로 가고 "없음" 안내를 드러낸다', () => {
  const wardrobe = [{ id: 'x', type: 'top', name: '니트', color: '#9a9da3', warmth: 3 }];
  const { els, run } = boot({ wardrobe });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  assert.strictEqual(els.closetHint.hidden, false);
  assert.match(els.closetMissing.textContent, /하의/);
  assert.match(els.closetMissing.textContent, /없음/);
});

test('"이대로 입었어요" 도장: 옷장 추천 · 기본 룩 모두, 누르면 도장 + 오늘 기록, 취소하면 지움', () => {
  let n = 0;
  const c = (type, name, color) => ({ id: `w${n++}`, type, name, color, warmth: 3 });
  const wardrobe = [
    c('top', '회색 니트', '#9a9da3'), c('top', '흰 셔츠', '#ffffff'),
    c('bottom', '청바지', '#3b5b8f'), c('bottom', '검정 슬랙스', '#1a1a1a'),
    c('outer', '회색 재킷', '#8a8a8a'),
  ];
  const { els, storage, backupParts, run } = boot({ wardrobe });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const today = run('todayKey()');
  const act = (name) => els.lookDetail.querySelectorAll('.wear-row')[0].children.find((b) => b.dataset?.wear === name);

  assert.ok(act('stamp'), '도장 버튼');
  assert.ok(act('other'), '다른 옷 버튼');
  const title = els.lookDetail.querySelectorAll('.look-title')[0].textContent;

  els.lookDetail.dispatch('click', act('stamp'));
  const saved = JSON.parse(storage['outfit.worn.v1'])[today];
  assert.strictEqual(saved.ids.length, 3, '상의 · 하의 · 겉옷');
  assert.strictEqual(saved.title, title);
  assert.deepStrictEqual([saved.warmth, saved.need, saved.learned], [9, 9, 0]);
  assert.strictEqual(els.lookDetail.querySelectorAll('.stamp').length, 1);
  assert.match(els.lookDetail.textContent, /오늘 이대로 입었어요/);
  // 오늘 기록으로는 순서가 안 바뀐다
  assert.strictEqual(els.lookDetail.querySelectorAll('.look-title')[0].textContent, title);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(backupParts.worn.get()))[today].title, title);

  // 다른 추천안으로 넘기면 도장 없음 + "이걸로 바꾸기"
  els.nextLookBtn.dispatch('click');
  assert.strictEqual(els.lookDetail.querySelectorAll('.stamp').length, 0);
  assert.match(act('stamp').textContent, /이걸로 바꾸기/);
  els.prevLookBtn.dispatch('click');

  els.lookDetail.dispatch('click', act('undo'));
  assert.deepStrictEqual(JSON.parse(storage['outfit.worn.v1']), {});
  assert.ok(act('stamp'));

  // 옷장이 비어도(기본 룩) 도장을 찍을 수 있고, 따뜻한 정도 합은 구간이 바란 합으로
  const plain = boot();
  plain.run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const stampBtn = plain.els.lookDetail.querySelectorAll('.stamp-btn')[0];
  plain.els.lookDetail.dispatch('click', stampBtn);
  const entry = JSON.parse(plain.storage['outfit.worn.v1'])[plain.run('todayKey()')];
  assert.deepStrictEqual([entry.ids, entry.warmth, entry.need], [[], 9, 9]);
  assert.strictEqual(plain.els.lookDetail.querySelectorAll('.stamp').length, 1);

  // 슬라이더로 다른 온도를 볼 땐 기록 버튼 대신 안내
  plain.els.slider.dispatch('input', { target: { value: '5' } });
  assert.strictEqual(plain.els.lookDetail.querySelectorAll('.stamp-btn').length, 0);
  assert.match(plain.els.lookDetail.textContent, /지금 날씨로 돌아가면/);
});

test('어제 입은 상의는 뒤로 가고, 그 옷이 나오는 카드엔 "어제 입음" 안내', () => {
  const wardrobe = [
    { id: 'a', type: 'top', name: '흰 셔츠', color: '#ffffff', warmth: 3 },
    { id: 'b', type: 'top', name: '회색 맨투맨', color: '#f0f0f0', warmth: 3 },
    { id: 'p', type: 'bottom', name: '검정 슬랙스', color: '#1a1a1a', warmth: 3 },
    { id: 'j', type: 'outer', name: '회색 재킷', color: '#8a8a8a', warmth: 3 },
  ];
  const d = new Date(); d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const { els, run } = boot({ wardrobe, storage: { 'outfit.worn.v1': JSON.stringify({ [yesterday]: ['a', 'p', 'j'] }) } });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const titles = () => els.lookDetail.querySelectorAll('.look-title')[0].textContent;
  assert.strictEqual(titles(), '회색 맨투맨 + 검정 슬랙스');
  assert.match(els.lookDetail.querySelectorAll('.look-worn')[0].textContent, /하의 어제 입음/);
  els.nextLookBtn.dispatch('click');
  assert.strictEqual(titles(), '흰 셔츠 + 검정 슬랙스');
  assert.match(els.lookDetail.querySelectorAll('.look-worn')[0].textContent, /상의 어제 입음 · 하의 어제 입음/);
});

test('일교차가 크면 모든 추천안 한마디에 붙고 날씨 줄에 12시간 범위, 슬라이더로 다른 온도를 보면 안 붙는다', () => {
  const { els, run } = boot();
  run(`applyWeather(${JSON.stringify({ ...WEATHER, feelsHi: 22, feelsLo: 12 })})`);
  assert.match(els.weatherLine.textContent, /12시간 체감 12~22°/);
  const tip = () => els.lookDetail.querySelectorAll('.look-tip')[0].textContent;
  for (let i = 0; i < run('state.looks.length'); i++) {
    assert.match(tip(), /앞으로 22°까지 올라가요\. 더우면 겉옷을 벗으세요$/);
    els.nextLookBtn.dispatch('click');
  }
  els.slider.value = '14';
  els.slider.dispatch('input', { target: { value: '14' } });
  assert.doesNotMatch(tip(), /앞으로/);
});

const daysAgo = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const feedbackCloset = () => [
  { id: 'a', type: 'top', name: '흰 셔츠', color: '#ffffff', warmth: 3 },
  { id: 'p', type: 'bottom', name: '검정 슬랙스', color: '#1a1a1a', warmth: 3 },
  { id: 'j', type: 'outer', name: '회색 재킷', color: '#8a8a8a', warmth: 3 },
];

test('어제 입은 옷 "어땠어요?" → 더웠어요를 누르면 추천 온도가 0.5° 오르고 설정 메뉴에도 보인다, 초기화하면 0', () => {
  const { els, storage, run } = boot({
    wardrobe: feedbackCloset(),
    storage: { 'outfit.worn.v1': JSON.stringify({ [daysAgo(1)]: { ids: ['a', 'p', 'j'], title: '흰 셔츠 + 검정 슬랙스', warmth: 9, need: 9, learned: 0 } }) },
  });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  assert.strictEqual(els.feedbackBox.hidden, false);
  assert.match(els.feedbackBox.textContent, /어제 입은 흰 셔츠 \+ 검정 슬랙스, 어땠어요\?/);

  const hot = els.feedbackBox.querySelectorAll('.chip-btn').find((b) => b.dataset.feel === 'hot');
  els.feedbackBox.dispatch('click', hot);
  const answer = JSON.parse(storage['outfit.feedback.v1']).log[daysAgo(1)];
  assert.deepStrictEqual([answer.feel, answer.warmth, answer.need, answer.learned], ['hot', 9, 9, 0]);
  assert.match(els.basis.textContent, /입어 본 느낌 \+0\.5° 14\.5°/);
  assert.match(els.feedbackBox.textContent, /\+0\.5°가 됐어요 — 앞으로 조금 더 시원하게/);
  assert.strictEqual(els.learnedValue.textContent, '+0.5°');
  assert.strictEqual(els.learnedReset.hidden, false);

  // 닫으면 상자가 사라지고 다시 묻지 않는다
  els.feedbackBox.dispatch('click', els.feedbackBox.querySelectorAll('.chip-btn')[0]);
  assert.strictEqual(els.feedbackBox.hidden, true);

  els.learnedReset.dispatch('click');
  assert.strictEqual(els.learnedValue.textContent, '±0°');
  assert.doesNotMatch(els.basis.textContent, /입어 본 느낌/);
  assert.strictEqual(els.feedbackBox.hidden, true);
});

test('예전 입은 기록([옷 id])도 열리고 "어땠어요?"를 묻는다 (숫자가 없어 보정은 그대로)', () => {
  const { els, run } = boot({
    wardrobe: feedbackCloset(),
    storage: { 'outfit.worn.v1': JSON.stringify({ [daysAgo(1)]: ['a', 'p'] }) },
  });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  assert.match(els.feedbackBox.textContent, /어제 입은 흰 셔츠 \+ 검정 슬랙스, 어땠어요\?/);
  els.feedbackBox.dispatch('click', els.feedbackBox.querySelectorAll('.chip-btn').find((b) => b.dataset.feel === 'hot'));
  assert.strictEqual(els.learnedValue.textContent, '±0°');
});

test('"다른 옷 입었어요": 추천보다 얇게 입고 딱 좋았으면 보정이 + 쪽으로, 옷장에 없는 옷은 두께로', () => {
  const wardrobe = [...feedbackCloset(), { id: 't', type: 'top', name: '반팔 티', color: '#ffffff', warmth: 1 }];
  const { els, storage, run } = boot({ wardrobe });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const today = run('todayKey()');

  // 시트에 미리 고를 값 = 지금 추천안 (14° 구간: 상의 · 하의 · 겉옷 모두 3)
  const preset = JSON.parse(JSON.stringify(run(`wearPreset(${JSON.stringify(today)})`)));
  assert.deepStrictEqual(preset, { slots: { top: 'a', bottom: 'p', outer: 'j' }, inner: {}, names: {} });

  // 반팔 티 + 검정 슬랙스, 겉옷 안 입음 → 합 4 (추천은 9), 딱 좋았어요
  run(`saveWear(${JSON.stringify(today)}, { slots: { top: 't', bottom: 'p', outer: 'none' }, feel: 'good' })`);
  const entry = JSON.parse(storage['outfit.worn.v1'])[today];
  assert.deepStrictEqual([entry.title, entry.warmth, entry.need, entry.other], ['반팔 티 + 검정 슬랙스', 4, 9, true]);
  assert.strictEqual(JSON.parse(storage['outfit.feedback.v1']).log[today].feel, 'good');
  assert.ok(run('learned()') > 0, `${run('learned()')}`);
  assert.match(els.feedbackBox.textContent, /시원하게/);
  // 오늘 기록이 "다른 옷"이면 카드에 안내 + 고치기
  assert.match(els.lookDetail.textContent, /오늘 기록: 반팔 티 \+ 검정 슬랙스/);
  assert.match(els.lookDetail.textContent, /입은 옷 고치기/);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(run(`wearPreset(${JSON.stringify(today)})`))).slots, { top: 't', bottom: 'p', outer: 'none' });

  // 옷장에 없는 옷: 두께 4 상의 + 두께 4 하의 + 두께 5 겉옷, 느낌은 나중에
  run(`saveWear(${JSON.stringify(today)}, { slots: { top: 'w4', bottom: 'w4', outer: 'w5' }, feel: '' })`);
  const thick = JSON.parse(storage['outfit.worn.v1'])[today];
  // 겉옷을 입었으면 겉옷도 title 에
  assert.deepStrictEqual([thick.title, thick.warmth, thick.ids], ['두꺼운 상의 + 두꺼운 하의 + 아주 두꺼운 겉옷', 13, []]);
  assert.strictEqual(JSON.parse(storage['outfit.feedback.v1']).log[today], undefined, '옷을 바꾸면 오늘 답은 지움');
});

test('같은 상의로 두 번 더웠으면 "따뜻한 정도 3 → 2로 낮출까요?" → 낮추기를 누르면 옷이 고쳐지고 더 묻지 않는다', () => {
  const wardrobe = feedbackCloset();
  const { els, run } = boot({
    wardrobe,
    storage: {
      'outfit.worn.v1': JSON.stringify({ [daysAgo(2)]: ['a', 'p'], [daysAgo(1)]: ['a', 'j'] }),
      'outfit.feedback.v1': JSON.stringify({ log: { [daysAgo(2)]: 'hot', [daysAgo(1)]: 'hot' } }),
    },
  });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  assert.match(els.feedbackBox.textContent, /흰 셔츠를 입은 날 2번 더웠어요\. 따뜻한 정도를 3 → 2로 낮출까요\?/);
  const fix = els.feedbackBox.querySelectorAll('.chip-btn').find((b) => b.dataset.fix);
  els.feedbackBox.dispatch('click', fix);
  assert.strictEqual(wardrobe[0].warmth, 2);
  assert.match(els.feedbackBox.textContent, /고쳤어요/);
  els.feedbackBox.dispatch('click', els.feedbackBox.querySelectorAll('.chip-btn')[0]);
  assert.strictEqual(els.feedbackBox.hidden, true);
});

/* ===== "다른 옷 입었어요" 시트: 겹쳐 입은 옷 · 옷장에 없는 옷 이름 ===== */

// 시트의 한 줄 (top · bottom · outer · innerTop · innerBottom)
const sheetRow = (run, key) => run(`wearRows[${JSON.stringify(key)}]`);
// 라디오를 누른 것처럼: 같은 무리는 풀고 이것만 고른 뒤 change
function choose(row, value) {
  const input = row.radios.find((r) => r.value === value);
  assert.ok(input, `${row.key} 줄에 ${value} 버튼이 있어야 함 (있는 것: ${row.radios.map((r) => r.value)})`);
  for (const r of row.radios) r.checked = false;
  input.checked = true;
  input.dispatch('change', { target: input });
}
const hint = (row, name) => {
  const btn = walkEls(row.other, (el) => el.dataset.name === name)[0];
  assert.ok(btn, `${row.key} 줄에 "${name}" 버튼`);
  btn.dispatch('click');
};
const thickOf = (row) => row.thick.find((r) => r.checked)?.value || '';
const submitWear = (els) => els.wearForm.dispatch('submit', { target: els.wearForm, preventDefault() {} });
const wearAct = (els, name) => els.lookDetail.querySelectorAll('.wear-row')[0].children.find((b) => b.dataset?.wear === name);

test('겹쳐 입기 + 이름: 맨투맨 + 청바지(안에 내복) + 점퍼 → title · warmth 10 · names · inner 가 저장되고 화면에 보인다', () => {
  const { els, storage, run } = boot(); // 옷장 비어 있음
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const today = run('todayKey()');

  els.lookDetail.dispatch('click', wearAct(els, 'other'));
  assert.strictEqual(els.wearDialog.open, true);
  // 기본 룩에서 열면 옷장에 없는 칸 이름에 그 룩 품목 이름이 미리 들어간다
  const look = run('OUTFIT_TABLE[4].looks[0]');
  assert.strictEqual(sheetRow(run, 'top').nameInput.value, look.top.name);

  const top = sheetRow(run, 'top');
  choose(top, 'other');
  assert.strictEqual(top.other.hidden, false, '옷장에 없는 옷 → 이름 · 두께 칸');
  hint(top, '맨투맨');
  assert.deepStrictEqual([top.nameInput.value, thickOf(top)], ['맨투맨', '3']);

  const bottom = sheetRow(run, 'bottom');
  choose(bottom, 'other');
  hint(bottom, '청바지');
  const under = sheetRow(run, 'innerBottom');
  assert.strictEqual(under.box.hidden, true, '안에 입은 옷 줄은 처음엔 닫혀 있음');
  under.addBtn.dispatch('click');
  assert.strictEqual(under.box.hidden, false);
  assert.strictEqual(under.addBtn.hidden, true, '칸마다 하나까지');
  choose(under, 'other');
  hint(under, '내복');

  const outer = sheetRow(run, 'outer');
  choose(outer, 'other');
  hint(outer, '점퍼');
  assert.strictEqual(run('wearRows.innerOuter'), undefined, '겉옷엔 안에 입은 옷 없음');

  submitWear(els);
  assert.strictEqual(els.wearError.textContent, '');
  assert.strictEqual(els.wearDialog.open, false);
  const entry = JSON.parse(storage['outfit.worn.v1'])[today];
  assert.strictEqual(entry.title, '맨투맨 + 청바지(안에 내복) + 점퍼');
  assert.strictEqual(entry.warmth, 10);
  assert.deepStrictEqual(entry.names, { top: '맨투맨', bottom: '청바지', outer: '점퍼', innerBottom: '내복' });
  assert.deepStrictEqual(entry.inner, { bottom: 'w1' });
  assert.deepStrictEqual(entry.slots, { top: 'w3', bottom: 'w3', outer: 'w3' });
  assert.match(els.lookDetail.textContent, /오늘 기록: 맨투맨 \+ 청바지\(안에 내복\) \+ 점퍼/);

  // 다시 열기: 이름 · 두께 · 안에 입은 옷이 그대로
  els.lookDetail.dispatch('click', wearAct(els, 'other'));
  const t = sheetRow(run, 'top');
  const b = sheetRow(run, 'bottom');
  const u = sheetRow(run, 'innerBottom');
  const o = sheetRow(run, 'outer');
  assert.deepStrictEqual([t.radios.find((r) => r.checked)?.value, t.nameInput.value, thickOf(t), t.other.hidden], ['other', '맨투맨', '3', false]);
  assert.deepStrictEqual([b.nameInput.value, thickOf(b)], ['청바지', '3']);
  assert.deepStrictEqual([u.box.hidden, u.radios.find((r) => r.checked)?.value, u.nameInput.value, thickOf(u)], [false, 'other', '내복', '1']);
  assert.deepStrictEqual([o.nameInput.value, thickOf(o)], ['점퍼', '3']);
  assert.strictEqual(sheetRow(run, 'innerTop').box.hidden, true);

  // 고쳐서 다시 저장해도 같은 기록 (안에 입은 옷을 "안 입음"으로 닫으면 빠진다)
  choose(u, 'none');
  assert.strictEqual(u.box.hidden, true);
  submitWear(els);
  const fixed = JSON.parse(storage['outfit.worn.v1'])[today];
  assert.deepStrictEqual([fixed.title, fixed.warmth, fixed.inner], ['맨투맨 + 청바지 + 점퍼', 9, undefined]);

  // 백업 가져오기 길(normalizeWorn): 이름은 20자로, 이상한 칸은 버림
  run(`setWorn({ [todayKey()]: { ids: [], title: 'x', slots: { top: 'w3' }, inner: { top: 'w1', outer: 'w2', bottom: 5 }, names: { top: '${'가'.repeat(30)}', foo: 'y', innerTop: '  ' } } })`);
  const norm = JSON.parse(storage['outfit.worn.v1'])[today];
  assert.deepStrictEqual([norm.inner, norm.names], [{ top: 'w1' }, { top: '가'.repeat(20) }]);
});

test('옷장 옷 겹쳐 입기: 청바지 + 안에 레깅스 → ids 에 둘 다, warmth 에 둘 다, 안에 입은 옷 목록엔 청바지가 없다', () => {
  const wardrobe = [
    { id: 't', type: 'top', name: '흰 셔츠', color: '#ffffff', warmth: 3 },
    { id: 'j', type: 'bottom', name: '청바지', color: '#3b5b8f', warmth: 3 },
    { id: 'l', type: 'bottom', name: '레깅스', color: '#1a1a1a', warmth: 1 },
  ];
  const { els, storage, run } = boot({ wardrobe });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const today = run('todayKey()');
  run('openWearSheet(todayKey())');

  choose(sheetRow(run, 'top'), 't');
  const bottom = sheetRow(run, 'bottom');
  choose(bottom, 'j');
  const under = sheetRow(run, 'innerBottom');
  under.addBtn.dispatch('click');
  const values = under.radios.map((r) => r.value);
  assert.ok(!values.includes('j'), `바깥에 고른 청바지는 빠짐: ${values}`);
  assert.ok(values.includes('l') && values.includes('other') && values.includes('none'), `${values}`);
  choose(under, 'l');
  choose(sheetRow(run, 'outer'), 'none');
  submitWear(els);

  const entry = JSON.parse(storage['outfit.worn.v1'])[today];
  assert.deepStrictEqual(entry.ids.slice().sort(), ['j', 'l', 't']);
  assert.strictEqual(entry.warmth, 7);
  assert.strictEqual(entry.title, '흰 셔츠 + 청바지(안에 레깅스)');
  assert.deepStrictEqual(entry.inner, { bottom: 'l' });
  // "최근 입은 옷은 뒤로" 에도 들어간다
  assert.strictEqual(run(`Coach.wornDays(state.worn, todayKey())`).l, 0);

  // 바깥을 레깅스로 바꾸면 안에 입은 옷 목록에서 레깅스가 빠지고 고른 것도 풀린다
  run('openWearSheet(todayKey())');
  choose(sheetRow(run, 'bottom'), 'l');
  const u2 = sheetRow(run, 'innerBottom');
  assert.ok(!u2.radios.map((r) => r.value).includes('l'));
  assert.ok(u2.radios.map((r) => r.value).includes('j'));
  assert.strictEqual(u2.radios.find((r) => r.checked), undefined);
});

test('조용한 대체 금지: 겉옷 "옷장에 없는 옷"인데 두께가 없으면 저장하지 않고 겉옷을 골라 달라고 한다', () => {
  const { els, storage, run } = boot({ wardrobe: feedbackCloset() });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const today = run('todayKey()');
  els.lookDetail.dispatch('click', wearAct(els, 'stamp'));
  const before = storage['outfit.worn.v1'];

  run('openWearSheet(todayKey())');
  const outer = sheetRow(run, 'outer');
  choose(outer, 'other');
  assert.strictEqual(thickOf(outer), '');
  outer.nameInput.value = '내 점퍼'; // 이름만 적고 두께는 비움
  submitWear(els);
  assert.match(els.wearError.textContent, /겉옷 두께를 골라 주세요/);
  assert.strictEqual(els.wearDialog.open, true, '시트는 그대로');
  assert.strictEqual(storage['outfit.worn.v1'], before, '오늘 기록은 바뀌지 않음');
  assert.strictEqual(JSON.parse(storage['outfit.worn.v1'])[today].other, undefined);

  // 안에 입은 옷도 같은 규칙
  choose(outer, 'none');
  const under = sheetRow(run, 'innerTop');
  under.addBtn.dispatch('click');
  choose(under, 'other');
  under.nameInput.value = '히트텍';
  submitWear(els);
  assert.match(els.wearError.textContent, /안에 입은 상의 두께를 골라 주세요/);
  assert.strictEqual(storage['outfit.worn.v1'], before);
});

test('예전 입은 기록(inner · names 없음, 지금 모양과 [옷 id] 모양 둘 다)도 시트가 열리고 "어땠어요?"를 묻는다', () => {
  const { els, run } = boot({
    wardrobe: feedbackCloset(),
    storage: {
      'outfit.worn.v1': JSON.stringify({
        [daysAgo(2)]: ['a', 'p'],
        [daysAgo(1)]: { ids: ['a'], title: '흰 셔츠 + 보통 하의', warmth: 6, need: 9, learned: 0, other: true, slots: { top: 'a', bottom: 'w3', outer: 'none' } },
      }),
    },
  });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  assert.match(els.feedbackBox.textContent, /어제 입은 흰 셔츠 \+ 보통 하의, 어땠어요\?/);
  els.feedbackBox.dispatch('click', els.feedbackBox.querySelectorAll('.link-btn')[0]); // 사실 다른 옷 입었어요
  assert.strictEqual(els.wearDialog.open, true);
  const bottom = sheetRow(run, 'bottom');
  assert.deepStrictEqual([bottom.radios.find((r) => r.checked)?.value, thickOf(bottom), bottom.nameInput.value], ['other', '3', '']);
  assert.strictEqual(sheetRow(run, 'innerBottom').box.hidden, true);
  run(`openWearSheet(${JSON.stringify(daysAgo(2))})`);
  assert.strictEqual(sheetRow(run, 'top').radios.find((r) => r.checked)?.value, 'a');
  assert.strictEqual(sheetRow(run, 'bottom').radios.find((r) => r.checked)?.value, 'p');
});

/* ===== 길 잃지 않기 ===== */

test('길 잃지 않기: 모든 탭 왼쪽 위 앱 이름 → #today, 옷장 · 나 "← 뒤로" = 브라우저 뒤로가기 (바로 열었으면 #today)', () => {
  // ① 화면 HTML: 앱 이름은 탭 화면(.view) 밖 맨 위에 있어 세 탭 모두에서 보인다
  const html = read('index.html');
  const appbar = html.indexOf('class="appbar"');
  assert.ok(appbar > 0 && appbar < html.indexOf('class="view"'), '앱 이름 줄이 첫 탭 화면보다 위');
  assert.match(html, /<a class="brand" id="brandLink" href="#today">오늘뭐입지<\/a>/);
  assert.match(html, /id="backBtn" hidden>← 뒤로<\/button>/);

  // 앱 안에서: 오늘 → 옷장 → 나
  const { els, nav } = boot();
  assert.strictEqual(els.backBtn.hidden, true, '첫 화면엔 뒤로 없음');
  els.brandLink.dispatch('click');
  assert.strictEqual(nav.location.hash, '#today');
  for (const tab of ['#closet', '#me']) {
    nav.location.hash = tab; // 하단 탭을 누른 것과 같다
    assert.strictEqual(els.backBtn.hidden, false, `${tab} 에 뒤로`);
    els.brandLink.dispatch('click');
    assert.strictEqual(nav.location.hash, '#today', `${tab} 에서 앱 이름 → 오늘`);
    assert.strictEqual(els.backBtn.hidden, true);
  }

  // 앱 안에서 넘어왔으면 history.back (브라우저 뒤로가기와 같은 곳)
  nav.location.hash = '#closet';
  nav.location.hash = '#me';
  els.backBtn.dispatch('click');
  assert.strictEqual(nav.backs, 1);
  assert.strictEqual(nav.location.hash, '#closet');
  els.backBtn.dispatch('click');
  assert.strictEqual(nav.backs, 2);
  assert.strictEqual(nav.location.hash, '#today');

  // 그 탭 주소로 바로 열었으면 #today (앱 밖으로 나가지 않음)
  for (const tab of ['#closet', '#me']) {
    const direct = boot({ hash: tab });
    assert.strictEqual(direct.els.backBtn.hidden, false);
    direct.els.backBtn.dispatch('click');
    assert.strictEqual(direct.nav.backs, 0);
    assert.strictEqual(direct.nav.location.hash, '#today');
  }
  // 바로 연 옷장 → 나 → 브라우저 뒤로(옷장) → "← 뒤로" 는 다시 #today
  const d = boot({ hash: '#closet' });
  d.nav.location.hash = '#me';
  d.nav.history.back();
  assert.strictEqual(d.nav.location.hash, '#closet');
  d.els.backBtn.dispatch('click');
  assert.strictEqual(d.nav.location.hash, '#today');
  assert.strictEqual(d.nav.backs, 1, '브라우저 뒤로 한 번만');
});

test('길 잃지 않기: 겹쳐 뜨는 창 — 다른 옷 시트 · 옷 추가 시트는 ✕ · 바깥 누르기, 설정 메뉴는 ✕ 로 닫힌다', () => {
  const html = read('index.html');
  for (const id of ['closeWearBtn', 'closeDialogBtn', 'settingsCloseBtn']) {
    assert.match(html, new RegExp(`class="close-x" id="${id}" aria-label="닫기">✕</button>`), id);
  }

  const { els, run } = boot({ closet: true });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);

  run('openWearSheet(todayKey())');
  els.closeWearBtn.dispatch('click');
  assert.strictEqual(els.wearDialog.open, false, '✕');
  run('openWearSheet(todayKey())');
  els.wearDialog.dispatch('click', els.wearSlots); // 시트 안을 누르면 그대로
  assert.strictEqual(els.wearDialog.open, true);
  els.wearDialog.dispatch('click', els.wearDialog); // 바깥(배경)
  assert.strictEqual(els.wearDialog.open, false, '바깥 누르기');

  els.itemDialog.showModal();
  els.closeDialogBtn.dispatch('click');
  assert.strictEqual(els.itemDialog.open, false, '옷 시트 ✕');
  els.itemDialog.showModal();
  els.itemDialog.dispatch('click', els.itemDialog);
  assert.strictEqual(els.itemDialog.open, false, '옷 시트 바깥 누르기');

  els.settingsBtn.dispatch('click');
  assert.strictEqual(els.settingsMenu.hidden, false);
  els.settingsCloseBtn.dispatch('click');
  assert.strictEqual(els.settingsMenu.hidden, true, '설정 메뉴 ✕');
});

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
}

function boot({ wardrobe = [], storage = {} } = {}) {
  const backupParts = {};
  const changeListeners = [];
  const els = {};
  const getEl = (id) => (els[id] ||= new El());
  const renders = [];
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
    window: { addEventListener() {}, scrollTo() {} },
    location: { hash: '#today' },
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
    },
  };
  ctx.window.Coach = undefined;
  vm.createContext(ctx);
  vm.runInContext(read('coach.js'), ctx); // module 이 없으니 window.Coach 로 나온다
  ctx.Coach = ctx.window.Coach;
  vm.runInContext(read('app.js'), ctx);
  return { ctx, els, renders, storage, backupParts, run: (code) => vm.runInContext(code, ctx) };
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
  assert.deepStrictEqual(preset, { top: 'a', bottom: 'p', outer: 'j' });

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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(run(`wearPreset(${JSON.stringify(today)})`))), { top: 't', bottom: 'p', outer: 'none' });

  // 옷장에 없는 옷: 두께 4 상의 + 두께 4 하의 + 두께 5 겉옷, 느낌은 나중에
  run(`saveWear(${JSON.stringify(today)}, { slots: { top: 'w4', bottom: 'w4', outer: 'w5' }, feel: '' })`);
  const thick = JSON.parse(storage['outfit.worn.v1'])[today];
  assert.deepStrictEqual([thick.title, thick.warmth, thick.ids], ['두꺼운 상의 + 두꺼운 하의', 13, []]);
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

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
    const cls = sel.replace(/^\./, '');
    for (let el = this; el; el = el.parent) if (el.classList.contains(cls)) return el;
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
      onChange() {},
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

test('옷장 추천엔 "오늘 이거 입었어요" 버튼: 누르면 오늘 기록, 다시 누르면 취소, 기본 추천엔 버튼 없음', () => {
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
  const btn = () => els.lookDetail.querySelectorAll('.worn-btn')[0];

  assert.ok(btn(), '버튼이 있다');
  assert.strictEqual(btn().getAttribute('aria-pressed'), 'false');
  const title = els.lookDetail.querySelectorAll('.look-title')[0].textContent;

  els.lookDetail.dispatch('click', btn());
  const saved = JSON.parse(storage['outfit.worn.v1']);
  assert.deepStrictEqual(Object.keys(saved), [today]);
  assert.strictEqual(saved[today].length, 3, '상의 · 하의 · 겉옷');
  assert.strictEqual(btn().getAttribute('aria-pressed'), 'true');
  assert.match(btn().textContent, /취소/);
  // 오늘 기록으로는 순서가 안 바뀐다
  assert.strictEqual(els.lookDetail.querySelectorAll('.look-title')[0].textContent, title);
  // 백업 파일에도 들어간다
  assert.deepStrictEqual(JSON.parse(JSON.stringify(backupParts.worn.get())), saved);

  els.lookDetail.dispatch('click', btn());
  assert.deepStrictEqual(JSON.parse(storage['outfit.worn.v1']), {});
  assert.strictEqual(btn().getAttribute('aria-pressed'), 'false');

  // 옷장이 비면 기본 추천 → 버튼 없음
  const plain = boot();
  plain.run(`applyWeather(${JSON.stringify(WEATHER)})`);
  assert.strictEqual(plain.els.lookDetail.querySelectorAll('.worn-btn').length, 0);
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

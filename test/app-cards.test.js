// 오늘 탭 추천안 카드 시험: app.js 를 아주 작은 가짜 DOM 위에서 돌린다 (브라우저 없이)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  dispatch(type, target) { for (const fn of this.listeners[type] || []) fn({ target, stopPropagation() {} }); }
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

function boot({ wardrobe = [] } = {}) {
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
    localStorage: { getItem: () => null, setItem() {} },
    fetch: () => new Promise(() => {}), // 시험에서는 날씨를 안 가져온다 (applyWeather 로 직접 넣음)
    Character: { render: (_el, layers) => renders.push(layers) },
    Wardrobe: {
      list: () => wardrobe,
      artFor: (it) => ({ top: 'knit', bottom: 'jeans', outer: 'jacket', acc: 'scarf' })[it.type],
      onChange() {},
    },
  };
  ctx.window.Coach = undefined;
  vm.createContext(ctx);
  vm.runInContext(read('coach.js'), ctx); // module 이 없으니 window.Coach 로 나온다
  ctx.Coach = ctx.window.Coach;
  vm.runInContext(read('app.js'), ctx);
  return { ctx, els, renders, run: (code) => vm.runInContext(code, ctx) };
}

const cards = (els) => els.lookList.querySelectorAll('.look-card');
const WEATHER = { feels: 14, temp: 14, code: 3, precip: 0, isRain: false, place: '시험', savedAt: Date.now() };

test('기본 추천: 카드가 2장 이상, 첫 카드가 선택되어 캐릭터에 입혀지고 옷장 안내가 보인다', () => {
  const { els, renders, run } = boot();
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const list = cards(els);
  assert.ok(list.length >= 2, `${list.length}장`);
  assert.strictEqual(list[0].getAttribute('aria-pressed'), 'true');
  assert.strictEqual(list[1].getAttribute('aria-pressed'), 'false');
  const firstLook = run('OUTFIT_TABLE[4].looks[0]');
  assert.strictEqual(renders.at(-1).top, firstLook.top.art);
  assert.strictEqual(els.closetHint.hidden, false);
  assert.strictEqual(els.nextComboBtn.hidden, true);
  assert.match(list[0].textContent, /니트 \+ 청바지/);
  assert.match(list[0].textContent, new RegExp(firstLook.tip));
});

test('카드를 누르면 캐릭터가 그 옷으로 바뀌고 그 카드만 선택 표시', () => {
  const { els, renders, run } = boot();
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const second = cards(els)[1];
  const target = second.children[0]; // 카드 안 제목을 눌러도 카드로 올라간다
  els.lookList.dispatch('click', target);
  const look = run('OUTFIT_TABLE[4].looks[1]');
  assert.strictEqual(renders.at(-1).top, look.top.art);
  assert.strictEqual(renders.at(-1).outer, look.outer.art);
  assert.strictEqual(second.getAttribute('aria-pressed'), 'true');
  assert.strictEqual(cards(els)[0].getAttribute('aria-pressed'), 'false');
});

test('비 오는 날엔 모든 카드 소품에 우산이 붙고, 어느 카드를 입혀도 우산을 든다', () => {
  const { els, renders, run } = boot();
  run(`applyWeather(${JSON.stringify({ ...WEATHER, code: 61, precip: 1.2, isRain: true })})`);
  const list = cards(els);
  for (const card of list) assert.match(card.textContent, /우산/);
  list.forEach((card) => {
    els.lookList.dispatch('click', card);
    assert.ok([].concat(renders.at(-1).acc).includes('umbrella'));
  });
});

test('옷장 추천: 옷장 옷 카드 · 색 동그라미 · 다른 추천안 버튼으로 다음 묶음', () => {
  let n = 0;
  const c = (type, name, color) => ({ id: `w${n++}`, type, name, color, warmth: 3 });
  const wardrobe = [
    c('top', '회색 니트', '#9a9da3'), c('top', '흰 셔츠', '#ffffff'),
    c('bottom', '청바지', '#3b5b8f'), c('bottom', '검정 슬랙스', '#1a1a1a'),
    c('outer', '회색 재킷', '#8a8a8a'),
  ];
  const { els, renders, run } = boot({ wardrobe });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  const first = cards(els);
  assert.strictEqual(first.length, 3);
  assert.strictEqual(els.closetHint.hidden, true);
  assert.strictEqual(els.nextComboBtn.hidden, false);
  assert.strictEqual(els.comboCount.textContent, '1/2');
  assert.ok(first[0].querySelectorAll('.dot').length >= 3, '옷장 옷은 색 동그라미');
  assert.strictEqual(typeof renders.at(-1).top, 'object'); // { art, color } 로 옷 색을 입힌다

  els.nextComboBtn.dispatch('click');
  assert.strictEqual(cards(els).length, 1);
  assert.strictEqual(els.comboCount.textContent, '2/2');
  assert.strictEqual(cards(els)[0].getAttribute('aria-pressed'), 'true');
});

test('옷장에 맞는 하의가 없으면 기본 추천으로 가고 "없음" 안내를 드러낸다', () => {
  const wardrobe = [{ id: 'x', type: 'top', name: '니트', color: '#9a9da3', warmth: 3 }];
  const { els, run } = boot({ wardrobe });
  run(`applyWeather(${JSON.stringify(WEATHER)})`);
  assert.strictEqual(els.closetHint.hidden, false);
  assert.match(els.closetMissing.textContent, /하의/);
  assert.match(els.closetMissing.textContent, /없음/);
});

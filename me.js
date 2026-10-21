/*
 * 나 탭: 내 사이즈 · 옷장 분석 · 살 옷 메모
 * ------------------------------------------------------------
 * 사이즈와 살 옷 메모는 localStorage 에 따로 두고, 옷장 백업 파일에도 함께 들어간다
 * (wardrobe.js 의 addBackupPart). 옷장 분석은 입력 없이 옷장에서 바로 계산한다.
 *
 * 고치기 쉬운 표는 아래에 모아 두었다.
 *  - SIZE_FIELDS       : 사이즈 항목 (순서 · 이름 · 단위)
 *  - COLOR_GROUPS      : 색 분포에 쓰는 색 계열과 나누는 기준
 *  - SUGGESTION_RULES  : 빈 자리 제안 규칙
 *  - GAP_IDEAS         : 따뜻한 정도 빈칸을 채울 옷 이름
 */
(function () {
  /* ===== 내 사이즈 항목 ===== */
  // numeric: 숫자 자판 / wide: 한 줄 전체 / multiline: 여러 줄
  const SIZE_FIELDS = [
    { key: 'height', label: '키', unit: 'cm', numeric: true },
    { key: 'weight', label: '몸무게', unit: 'kg', numeric: true },
    { key: 'top',    label: '상의', placeholder: 'S · M · L · XL · 95…' },
    { key: 'waist',  label: '바지 허리', unit: '인치', numeric: true },
    { key: 'length', label: '바지 기장', unit: 'cm', numeric: true },
    { key: 'shoe',   label: '신발', unit: 'mm', numeric: true },
    { key: 'memo',   label: '메모', wide: true, multiline: true, max: 200, placeholder: '예) 어깨 넓어서 한 치수 위' },
  ];

  /* ===== 색 계열 =====
   * 위에서부터 차례로 맞춰 보고 처음 맞는 계열에 넣는다.
   * test 는 색의 { h: 색상 0~360, s: 채도 0~1, l: 밝기 0~1 } 를 받는다.
   * neutral: 무채색으로 칠지 (빈 자리 제안에 씀)
   */
  const COLOR_GROUPS = [
    { name: '검정',   color: '#222222', neutral: true, test: ({ s, l }) => l < 0.13 || (s < 0.12 && l < 0.3) },
    { name: '흰색',   color: '#f7f7f4', neutral: true, test: ({ s, l }) => l > 0.93 || (s < 0.12 && l > 0.85) },
    { name: '회색',   color: '#9a9da3', neutral: true, test: ({ s }) => s < 0.12 },
    { name: '베이지', color: '#dccbad', neutral: true, test: ({ h, s, l }) => h >= 20 && h <= 55 && s < 0.5 && l > 0.65 },
    { name: '갈색',   color: '#7b5536', test: ({ h, l }) => h >= 10 && h <= 60 && l < 0.45 },
    { name: '네이비', color: '#1f2d4d', test: ({ h, l }) => h >= 190 && h < 255 && l < 0.32 },
    { name: '파랑',   color: '#3b6fd8', test: ({ h }) => h >= 170 && h < 255 },
    { name: '초록',   color: '#4f9a5b', test: ({ h }) => h >= 65 && h < 170 },
    { name: '노랑',   color: '#f3cf4b', test: ({ h }) => h >= 35 && h < 65 },     // 주황 끝자락 포함
    { name: '보라',   color: '#8a64c4', test: ({ h }) => h >= 255 && h < 290 },
    { name: '분홍',   color: '#f2a6b9', test: ({ h, l }) => (h >= 290 && h < 335) || ((h >= 335 || h < 20) && l > 0.72) },
    { name: '빨강',   color: '#d8403b', test: () => true },                         // 나머지 (빨강 · 주황)
  ];

  /* ===== 빈 자리 제안 =====
   * 규칙 하나 = 옷장 분석 a 를 받아 제안을 돌려주는 함수. 맞지 않으면 null.
   * 제안 = { reason: '왜', idea: '무엇을', item: { type, name, color, warmth } }  (배열로 여러 개도 됨)
   * item 은 "메모에 담기"를 누르면 살 옷 메모로 들어간다.
   * 위에 있는 규칙이 먼저 나오고, 최대 MAX_SUGGESTIONS 줄까지 보여준다.
   *
   * a 에 들어 있는 것:
   *   a.items              옷장 전체
   *   a.byType.top 등      종류별 옷 (top · bottom · outer · acc)
   *   a.count(type, w)     그 종류에서 따뜻한 정도 w 인 옷 수
   *   a.isDark(옷)         어두운 색인지
   *   a.isNeutral(옷)      무채색(검정 · 흰 · 회 · 베이지)인지
   *   a.neutralShare       무채색 비율 (0~1)
   */
  const SUGGESTION_RULES = [
    (a) => a.byType.outer.length >= 1 && a.byType.outer.every(a.isDark) && {
      reason: '겉옷이 전부 어두운 색',
      idea: '밝은 겉옷 하나',
      item: { type: 'outer', name: '밝은 겉옷', color: '#dccbad', warmth: 3 },
    },
    (a) => a.items.length >= 5 && a.neutralShare >= 0.8 && {
      reason: `무채색이 ${Math.round(a.neutralShare * 100)}%`,
      idea: '포인트 색 상의',
      item: { type: 'top', name: '포인트 색 상의', color: '#3b6fd8', warmth: 3 },
    },
    (a) => a.byType.top.length >= 4 && a.byType.bottom.length * 3 <= a.byType.top.length && {
      reason: `상의 ${a.byType.top.length}벌에 하의 ${a.byType.bottom.length}벌`,
      idea: '어디에나 맞는 검정 바지',
      item: { type: 'bottom', name: '검정 슬랙스', color: '#222222', warmth: 3 },
    },
    // 따뜻한 정도 빈칸 (GAP_IDEAS 순서대로)
    (a) => GAP_IDEAS
      .filter((g) => a.count(g.type, g.warmth) === 0)
      .map((g) => ({
        reason: `따뜻한 정도 ${g.warmth} ${Wardrobe.TYPES[g.type]} 없음`,
        idea: g.name,
        item: { type: g.type, name: g.name, color: g.color, warmth: g.warmth },
      })),
  ];
  const MAX_SUGGESTIONS = 3;

  // 따뜻한 정도 빈칸에 권할 옷. 위에 있을수록 먼저 권한다
  const GAP_IDEAS = [
    { type: 'bottom', warmth: 4, name: '기모 바지',      color: '#222222' },
    { type: 'outer',  warmth: 5, name: '패딩',           color: '#222222' },
    { type: 'top',    warmth: 4, name: '니트',           color: '#dccbad' },
    { type: 'outer',  warmth: 3, name: '재킷',           color: '#7b5536' },
    { type: 'outer',  warmth: 4, name: '울 코트',        color: '#9a9da3' },
    { type: 'top',    warmth: 1, name: '반팔 티셔츠',    color: '#f7f7f4' },
    { type: 'bottom', warmth: 1, name: '반바지',         color: '#dccbad' },
    { type: 'top',    warmth: 3, name: '맨투맨',         color: '#9a9da3' },
    { type: 'bottom', warmth: 3, name: '청바지',         color: '#3b6fd8' },
    { type: 'top',    warmth: 2, name: '얇은 긴팔',      color: '#f7f7f4' },
    { type: 'bottom', warmth: 2, name: '면바지',         color: '#dccbad' },
    { type: 'outer',  warmth: 2, name: '가디건',         color: '#9a9da3' },
    { type: 'top',    warmth: 5, name: '두꺼운 니트',    color: '#9a9da3' },
    { type: 'bottom', warmth: 5, name: '두꺼운 기모 바지', color: '#222222' },
    { type: 'outer',  warmth: 1, name: '얇은 셔츠 재킷', color: '#f7f7f4' },
  ];

  const SIZES_KEY = 'outfit.me.sizes.v1';
  const SHOP_KEY = 'outfit.me.shopping.v1';
  const HEX = /^#[0-9a-f]{6}$/i;
  const COLOR_FILTERS = [['all', '전체'], ...Object.entries(Wardrobe.TYPES)];

  const $ = (id) => document.getElementById(id);

  /* ===== 저장 ===== */

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 못 해도 화면은 동작 */ }
  }

  function normalizeSizes(raw) {
    const out = {};
    for (const f of SIZE_FIELDS) {
      const v = raw && typeof raw[f.key] === 'string' ? raw[f.key].trim().slice(0, f.max ?? 30) : '';
      if (v) out[f.key] = v;
    }
    return out;
  }

  function normalizeShop(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => {
      const name = String(x?.name ?? '').trim().slice(0, 40);
      if (!name || !Wardrobe.TYPES[x.type]) return null;
      const warmth = Math.round(Number(x.warmth));
      return {
        id: typeof x.id === 'string' && x.id ? x.id : newId(),
        type: x.type,
        name,
        color: HEX.test(x.color) ? x.color.toLowerCase() : '#9a9da3',
        warmth: warmth >= 1 && warmth <= 5 ? warmth : null,
        done: Boolean(x.done),
        createdAt: Number(x.createdAt) || Date.now(),
      };
    }).filter(Boolean);
  }

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  let sizes = normalizeSizes(load(SIZES_KEY, {}));
  let shopping = normalizeShop(load(SHOP_KEY, []));
  let colorFilter = 'all';

  function setSizes(next) { sizes = next; save(SIZES_KEY, sizes); }
  function setShopping(next) { shopping = next; save(SHOP_KEY, shopping); renderShop(); renderSuggestions(); }

  /* ===== 1. 내 사이즈 ===== */

  // 숫자만 적었으면 단위를 붙여 보여준다
  function sizeText(f) {
    const v = sizes[f.key];
    if (!v) return '';
    return f.unit && /^[\d.\s~\-–]+$/.test(v) ? `${v} ${f.unit}` : v;
  }

  function sizeCard(f) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `size-card${f.wide ? ' wide' : ''}`;
    const label = document.createElement('span');
    label.className = 'size-label';
    label.textContent = f.label;
    const value = document.createElement('span');
    const text = sizeText(f);
    value.className = `size-value${text ? '' : ' is-empty'}`;
    value.textContent = text || '—';
    card.append(label, value);
    card.setAttribute('aria-label', `${f.label} ${text || '비어 있음'}. 눌러서 고치기`);
    card.addEventListener('click', () => editSize(f, card));
    return card;
  }

  // 그 칸만 입력창으로 바꾼다. Enter · 다른 곳 누르기 = 저장, Esc = 취소
  function editSize(f, card) {
    const box = document.createElement('div');
    box.className = `size-card editing${f.wide ? ' wide' : ''}`;
    const label = document.createElement('label');
    label.className = 'size-label';
    label.textContent = f.unit ? `${f.label} (${f.unit})` : f.label;
    const input = document.createElement(f.multiline ? 'textarea' : 'input');
    input.className = 'size-input';
    if (!f.multiline) input.type = 'text';
    if (f.multiline) input.rows = 2;
    if (f.numeric) input.inputMode = 'decimal';
    input.maxLength = f.max ?? 30;
    input.placeholder = f.placeholder ?? '';
    input.value = sizes[f.key] ?? '';
    input.id = `size-${f.key}`;
    label.htmlFor = input.id;
    box.append(label, input);
    card.replaceWith(box);
    input.focus();
    if (!f.multiline) input.select();

    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep) setSizes(normalizeSizes({ ...sizes, [f.key]: input.value }));
      const fresh = sizeCard(f);
      box.replaceWith(fresh);
      if (!keep) fresh.focus();
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      if (e.key === 'Enter' && !f.multiline && !e.isComposing) { e.preventDefault(); finish(true); }
    });
  }

  function renderSizes() {
    const host = $('sizes');
    host.textContent = '';
    for (const f of SIZE_FIELDS) host.append(sizeCard(f));
  }

  /* ===== 2. 옷장 분석 ===== */

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

  function colorGroup(hex) {
    const hsl = hexToHsl(hex);
    return COLOR_GROUPS.find((g) => g.test(hsl));
  }

  function analyze(items) {
    const byType = Object.fromEntries(Object.keys(Wardrobe.TYPES).map((t) => [t, items.filter((it) => it.type === t)]));
    const isNeutral = (it) => Boolean(colorGroup(it.color).neutral);
    return {
      items,
      byType,
      count: (type, w) => byType[type].filter((it) => it.warmth === w).length,
      isDark: (it) => hexToHsl(it.color).l < 0.35,
      isNeutral,
      neutralShare: items.length ? items.filter(isNeutral).length / items.length : 0,
    };
  }

  function dot(color) {
    const d = document.createElement('span');
    d.className = 'dot';
    d.style.background = color;
    return d;
  }

  function renderColorFilter() {
    const host = $('colorFilter');
    host.textContent = '';
    for (const [key, label] of COLOR_FILTERS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-chip';
      b.textContent = label;
      b.setAttribute('aria-pressed', String(key === colorFilter));
      b.addEventListener('click', () => { colorFilter = key; renderColorFilter(); renderColors(); });
      host.append(b);
    }
  }

  // 색 분포: 계열별 가로 막대 (가장 많은 계열이 꽉 찬 길이)
  function renderColors() {
    const items = Wardrobe.list().filter((it) => colorFilter === 'all' || it.type === colorFilter);
    const host = $('colorBars');
    host.textContent = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'me-note';
      li.textContent = '이 종류엔 아직 옷이 없어요.';
      host.append(li);
      return;
    }
    const counts = new Map();
    for (const it of items) {
      const g = colorGroup(it.color);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    const rows = [...counts].sort((x, y) => y[1] - x[1] || COLOR_GROUPS.indexOf(x[0]) - COLOR_GROUPS.indexOf(y[0]));
    const max = rows[0][1];
    for (const [g, n] of rows) {
      const pct = Math.round((n / items.length) * 100);
      const li = document.createElement('li');
      li.className = 'color-bar';
      li.title = `${g.name} ${n}벌 (${pct}%)`;
      const name = document.createElement('span');
      name.className = 'cb-name';
      name.append(dot(g.color), g.name);
      const track = document.createElement('span');
      track.className = 'cb-track';
      const fill = document.createElement('span');
      fill.className = 'cb-fill';
      fill.style.width = `${(n / max) * 100}%`;
      fill.style.background = g.color;
      track.append(fill);
      const val = document.createElement('span');
      val.className = 'cb-val';
      val.textContent = `${n}벌 · ${pct}%`;
      li.append(name, track, val);
      host.append(li);
    }
  }

  // 따뜻한 정도 분포: 상의 · 하의 · 겉옷 × 1~5. 0벌 칸은 눈에 띄게
  function renderWarmth(a) {
    const table = $('warmthTable');
    table.textContent = '';
    const head = table.createTHead().insertRow();
    head.append(document.createElement('th'));
    for (let w = 1; w <= 5; w++) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = w;
      head.append(th);
    }
    const body = table.createTBody();
    for (const type of ['top', 'bottom', 'outer']) {
      const row = body.insertRow();
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = Wardrobe.TYPES[type];
      row.append(th);
      for (let w = 1; w <= 5; w++) {
        const n = a.count(type, w);
        const td = row.insertCell();
        td.textContent = n;
        td.title = `${Wardrobe.TYPES[type]} · 따뜻한 정도 ${w}: ${n}벌`;
        if (!n) td.className = 'zero';
      }
    }
  }

  function inShopping(item) {
    return shopping.some((s) => !s.done && s.type === item.type && s.name === item.name);
  }

  function renderSuggestions() {
    const host = $('suggestions');
    host.textContent = '';
    const items = Wardrobe.list();
    if (!items.length) return;
    const a = analyze(items);
    const list = SUGGESTION_RULES.flatMap((rule) => [].concat(rule(a) || [])).slice(0, MAX_SUGGESTIONS);
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'me-note';
      li.textContent = '지금은 비어 보이는 자리가 없어요.';
      host.append(li);
      return;
    }
    for (const s of list) {
      const li = document.createElement('li');
      li.className = 'suggestion';
      const text = document.createElement('p');
      const reason = document.createElement('span');
      reason.className = 'sg-reason';
      reason.textContent = s.reason;
      const idea = document.createElement('b');
      idea.textContent = s.idea;
      text.append(reason, ' → ', idea);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      const added = inShopping(s.item);
      btn.textContent = added ? '담았어요' : '메모에 담기';
      btn.disabled = added;
      btn.addEventListener('click', () => addShopping(s.item));
      li.append(dot(s.item.color), text, btn);
      host.append(li);
    }
  }

  function renderAnalysis() {
    const items = Wardrobe.list();
    $('analysisEmpty').hidden = items.length > 0;
    $('analysis').hidden = items.length === 0;
    if (!items.length) return;
    renderColors();
    renderWarmth(analyze(items));
    renderSuggestions();
  }

  /* ===== 3. 살 옷 메모 ===== */

  function addShopping(item) {
    setShopping([...shopping, ...normalizeShop([{ ...item, id: newId(), done: false, createdAt: Date.now() }])]);
  }

  function renderShop() {
    const host = $('shopList');
    host.textContent = '';
    if (!shopping.length) {
      const li = document.createElement('li');
      li.className = 'me-note';
      li.textContent = '빈 자리 제안에서 담거나, 아래에서 직접 추가해요.';
      host.append(li);
      return;
    }
    // 아직 안 산 것 먼저
    const ordered = [...shopping].sort((x, y) => x.done - y.done || x.createdAt - y.createdAt);
    for (const s of ordered) {
      const li = document.createElement('li');
      li.className = `shop-item${s.done ? ' is-done' : ''}`;

      const check = document.createElement('label');
      check.className = 'shop-check';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = s.done;
      box.setAttribute('aria-label', `${s.name} 샀어요`);
      box.addEventListener('change', () => toggleBought(s.id, box.checked));
      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = s.name;
      const tag = document.createElement('span');
      tag.className = 'shop-tag';
      tag.textContent = s.done ? '샀어요' : Wardrobe.TYPES[s.type];
      check.append(box, dot(s.color), name, tag);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'shop-del';
      del.textContent = '×';
      del.setAttribute('aria-label', `${s.name} 메모에서 지우기`);
      del.addEventListener('click', () => setShopping(shopping.filter((x) => x.id !== s.id)));

      li.append(check, del);
      host.append(li);
    }
  }

  // "샀어요" 체크 → 옷장에 넣을지 묻고, 예면 미리 채운 옷 추가 시트
  function toggleBought(id, done) {
    setShopping(shopping.map((x) => (x.id === id ? { ...x, done } : x)));
    if (!done) return;
    const s = shopping.find((x) => x.id === id);
    if (s && window.confirm(`‘${s.name}’ 샀어요!\n옷장에 추가할까요?`)) {
      window.Closet.openEditor(null, { type: s.type, name: s.name, color: s.color, warmth: s.warmth });
    }
  }

  function bindShopForm() {
    $('shopForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('shopName').value.trim();
      if (!name) { $('shopName').focus(); return; }
      addShopping({ name, type: $('shopType').value, color: $('shopColor').value });
      $('shopName').value = '';
    });
  }

  /* ===== 시작 ===== */

  Wardrobe.addBackupPart('sizes', {
    label: '내 사이즈',
    get: () => sizes,
    set: (v) => { setSizes(normalizeSizes(v)); renderSizes(); },
  });
  Wardrobe.addBackupPart('shopping', {
    label: '살 옷 메모',
    get: () => shopping,
    set: (v) => setShopping(normalizeShop(v)),
  });

  renderSizes();
  renderColorFilter();
  renderAnalysis();
  renderShop();
  bindShopForm();
  Wardrobe.onChange(renderAnalysis);
})();

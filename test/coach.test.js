// 추천안 계산 시험: npm test
// app.js 의 표(OUTFIT_TABLE · WARMTH_TABLE · RAIN_ITEM)는 화면 코드 앞부분만 잘라 그대로 읽는다.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const Coach = require('../coach.js');

const ROOT = path.join(__dirname, '..');
const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const tablePart = appSrc.slice(0, appSrc.indexOf('/* ===== 상태 ===== */'));
const { OUTFIT_TABLE, WARMTH_TABLE, RAIN_ITEM } = vm.runInNewContext(
  `${tablePart}\n;({ OUTFIT_TABLE, WARMTH_TABLE, RAIN_ITEM })`,
);

const SLOTS = ['top', 'bottom', 'outer', 'acc'];
const SEED = 'Fri Oct 30 2026';

let nextId = 0;
const cloth = (type, name, color, warmth) => ({ id: `t${nextId++}`, type, name, color, warmth });

// 12–16° 구간은 겉옷도 [3, 3] 이 있어야 옷장 추천이 된다 (없으면 기본 추천 — 기존 규칙).
// 그래서 14° 시험 옷장에는 무채색 겉옷 1벌을 같이 넣는다.
const greyJacket = () => cloth('outer', '회색 재킷', '#8a8a8a', 3);

const pairs = (looks) => looks.map((l) => `${l.top.id}|${l.bottom.id}`);

test('1. 기본 룩 표의 모든 룩에서 상의·하의·겉옷·소품 이름 어디에도 " · "가 없다 (한 칸에 품목 하나)', () => {
  for (const band of OUTFIT_TABLE) {
    for (const look of band.looks) {
      for (const slot of SLOTS) {
        const item = look[slot];
        if (!item) continue;
        assert.ok(!item.name.includes(' · '), `${band.label} ${slot} "${item.name}"`);
        assert.ok(!Array.isArray(item.art), `${band.label} ${slot} 그림은 하나`);
      }
    }
  }
});

test('2. 온도 구간 8개 모두 기본 룩이 2개 이상이고, 각 룩에 tip 이 비어 있지 않다', () => {
  assert.strictEqual(OUTFIT_TABLE.length, 8);
  assert.deepStrictEqual(OUTFIT_TABLE.map((b) => b.min), WARMTH_TABLE.map((r) => r.min));
  for (const band of OUTFIT_TABLE) {
    const { looks } = Coach.defaultLooks(OUTFIT_TABLE, band.min === -Infinity ? -20 : band.min);
    assert.ok(looks.length >= 2 && looks.length <= 3, `${band.label}: ${looks.length}개`);
    for (const look of looks) {
      assert.ok(look.top && look.bottom, `${band.label}: 상의·하의는 꼭 있음`);
      assert.ok(typeof look.tip === 'string' && look.tip.trim(), `${band.label}: tip`);
    }
  }
});

test('기본 룩의 그림 이름은 모두 character.js 에 있는 것', () => {
  const charSrc = fs.readFileSync(path.join(ROOT, 'character.js'), 'utf8');
  const pieces = charSrc.slice(charSrc.indexOf('const PIECES = {'), charSrc.indexOf('const PIECE_COLOR'));
  for (const band of OUTFIT_TABLE) {
    for (const look of band.looks) {
      for (const slot of SLOTS) {
        if (look[slot]) assert.match(pieces, new RegExp(`\\n    ${look[slot].art}: `), look[slot].art);
      }
    }
  }
});

test('3. 상의 2벌 + 하의 2벌(+겉옷)을 14°로 부르면 추천안이 2개 이상이고, 어느 두 추천안도 (상의 id, 하의 id) 쌍이 같지 않다', () => {
  const items = [
    cloth('top', '회색 니트', '#9a9da3', 3),
    cloth('top', '흰 셔츠', '#ffffff', 3),
    cloth('bottom', '청바지', '#3b5b8f', 3),
    cloth('bottom', '검정 슬랙스', '#1a1a1a', 3),
    greyJacket(),
  ];
  const pick = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED });
  assert.ok(pick.looks, JSON.stringify(pick));
  assert.ok(pick.looks.length >= 2 && pick.looks.length <= 3, `${pick.looks.length}개`);
  const keys = pairs(pick.looks);
  assert.strictEqual(new Set(keys).size, keys.length, keys.join(', '));

  // 쌍은 모두 4개 → 3개 + 1개 두 묶음. 묶음끼리도 쌍이 겹치지 않고 합치면 4쌍 전부
  assert.strictEqual(pick.pageCount, 2);
  const next = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED, page: 1 });
  const allKeys = [...keys, ...pairs(next.looks)];
  assert.strictEqual(new Set(allKeys).size, 4);
  // 묶음 번호는 돌아간다
  const again = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED, page: 2 });
  assert.deepStrictEqual(pairs(again.looks), keys);

  // 첫 두 추천안은 상의도 하의도 다르다 (둘 다 다른 것 먼저)
  const [a, b] = pick.looks;
  assert.notStrictEqual(a.top.id, b.top.id);
  assert.notStrictEqual(a.bottom.id, b.bottom.id);
});

test('4. 상의 1벌 · 하의 1벌 · 소품 3개면 추천안은 1개다 (소품만 다른 건 같은 추천안)', () => {
  const items = [
    cloth('top', '회색 니트', '#9a9da3', 3),
    cloth('bottom', '청바지', '#3b5b8f', 3),
    greyJacket(),
    cloth('outer', '베이지 트렌치', '#d8c3a0', 3),
    cloth('acc', '스카프', '#f1c84a', 2),
    cloth('acc', '모자', '#222222', 3),
    cloth('acc', '목도리', '#c03030', 3),
  ];
  const pick = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED });
  assert.ok(pick.looks, JSON.stringify(pick));
  assert.strictEqual(pick.looks.length, 1);
  assert.strictEqual(pick.pageCount, 1);
  assert.ok(pick.looks[0].acc, '소품도 옷장 옷으로');
});

test('5. 추천안마다 코치 한마디가 붙고, 검정 하의 + 빨강 상의면 "무채색", 파랑 상의 + 노랑 하의면 "색이 달라" 문구', () => {
  const tipFor = (topColor, bottomColor) => {
    const items = [
      cloth('top', '상의', topColor, 3),
      cloth('bottom', '하의', bottomColor, 3),
      greyJacket(),
    ];
    const pick = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED });
    assert.strictEqual(pick.looks.length, 1);
    return pick.looks[0].tip;
  };

  const redBlack = tipFor('#d02020', '#111111');
  assert.match(redBlack, /무채색/);
  assert.strictEqual(redBlack, '하의가 무채색이라 상의 색이 살아나요');

  const blueYellow = tipFor('#2a5bd7', '#f2d13a');
  assert.match(blueYellow, /색이 달라/);

  // 3번 옷장의 모든 추천안에도 한마디가 있다
  const items = [
    cloth('top', '빨강 니트', '#d02020', 3),
    cloth('top', '파랑 셔츠', '#2a5bd7', 3),
    cloth('bottom', '검정 바지', '#111111', 3),
    cloth('bottom', '노랑 바지', '#f2d13a', 3),
    greyJacket(),
  ];
  for (let page = 0; page < 2; page++) {
    const pick = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED, page });
    for (const look of pick.looks) assert.ok(look.tip && look.tip.trim(), JSON.stringify(look));
  }
});

test('코치 한마디 규칙: 둘 다 무채색 · 상의만 무채색 · 같은 계열 · 겉옷이 상의와 비슷할 때', () => {
  const c = (hex) => ({ color: hex });
  assert.strictEqual(Coach.coachTip({ top: c('#ffffff'), bottom: c('#111111') }), '무채색끼리라 차분하고 깔끔해요');
  assert.strictEqual(Coach.coachTip({ top: c('#ffffff'), bottom: c('#2a5bd7') }), '상의가 무채색이라 하의 색이 살아나요');
  assert.match(Coach.coachTip({ top: c('#2a5bd7'), bottom: c('#1d3f9a') }), /^같은 계열이라 톤온톤/);
  const withOuter = Coach.coachTip({ top: c('#2a5bd7'), bottom: c('#f2d13a'), outer: c('#1d3f9a') });
  assert.strictEqual(withOuter, '상의와 하의 색이 달라 또렷해 보여요. 겉옷과 상의 색이 비슷하니 하의로 끊어 주세요');
  // 무채색 겉옷은 덧붙이지 않음
  assert.strictEqual(
    Coach.coachTip({ top: c('#ffffff'), bottom: c('#111111'), outer: c('#ffffff') }),
    '무채색끼리라 차분하고 깔끔해요',
  );
  
  // 겉옷과 하의가 같은 유채색 계열일 때 새 조언 문구가 덧붙는지
  const sameColorOuterBottom = Coach.coachTip({ top: c('#ffffff'), bottom: c('#2a5bd7'), outer: c('#1d3f9a') });
  assert.match(sameColorOuterBottom, /겉옷과 하의 색이 비슷해 한 덩어리로 보여요. 상의로 끊어 주세요/);
  
  // 겉옷이 없거나 무채색이거나 하의와 색 계열이 다를 때는 새 조언 문구가 덧붙지 않는지
  const noOuter = Coach.coachTip({ top: c('#ffffff'), bottom: c('#2a5bd7') });
  assert.ok(!noOuter.includes('겉옷과 하의 색이 비슷해'), noOuter);
  
  const neutralOuter = Coach.coachTip({ top: c('#ffffff'), bottom: c('#2a5bd7'), outer: c('#8a8a8a') });
  assert.ok(!neutralOuter.includes('겉옷과 하의 색이 비슷해'), neutralOuter);
  
  const differentColorOuterBottom = Coach.coachTip({ top: c('#ffffff'), bottom: c('#2a5bd7'), outer: c('#d02020') });
  assert.ok(!differentColorOuterBottom.includes('겉옷과 하의 색이 비슷해'), differentColorOuterBottom);
});

test("6. 상의는 맞는데 하의가 없으면 { missing: ['하의'] } 를 돌려준다 (기존 동작 유지)", () => {
  const items = [cloth('top', '반팔 티', '#7cc3e9', 1)];
  const pick = Coach.pickFromCloset({ items, temp: 25, warmthTable: WARMTH_TABLE, seed: SEED });
  assert.deepStrictEqual(pick, { missing: ['하의'] });
  assert.deepStrictEqual(Coach.pickFromCloset({ items: [], temp: 25, warmthTable: WARMTH_TABLE, seed: SEED }), { empty: true });
});

test('7. 같은 옷장 · 같은 온도 · 같은 날짜 씨앗이면 추천안 순서가 같다', () => {
  const items = [
    cloth('top', '회색 니트', '#9a9da3', 3),
    cloth('top', '흰 셔츠', '#ffffff', 3),
    cloth('top', '초록 맨투맨', '#3c8a4a', 3),
    cloth('bottom', '청바지', '#3b5b8f', 3),
    cloth('bottom', '검정 슬랙스', '#1a1a1a', 3),
    greyJacket(),
  ];
  const run = (page) => pairs(Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED, page }).looks);
  assert.deepStrictEqual(run(0), run(0));
  assert.deepStrictEqual(run(1), run(1));
  // 옷장 배열을 새로 만들어도 (같은 옷이면) 같은 순서
  const copy = items.map((it) => ({ ...it }));
  const again = pairs(Coach.pickFromCloset({ items: copy, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED }).looks);
  assert.deepStrictEqual(again, run(0));
});

test('비 오는 날엔 모든 추천안 소품에 우산이 붙는다', () => {
  const { looks } = Coach.defaultLooks(OUTFIT_TABLE, 14);
  const rainy = Coach.addRain(looks, RAIN_ITEM);
  assert.strictEqual(rainy.length, looks.length);
  for (const look of rainy) {
    assert.ok([].concat(look.acc.art).includes('umbrella'), JSON.stringify(look.acc));
    assert.match(look.acc.name, /우산/);
  }
  // 원래 표는 그대로
  assert.ok(OUTFIT_TABLE.every((b) => b.looks.every((l) => !l.acc || !/우산/.test(l.acc.name))));
});

test('보온: 얇은 상의 + 두꺼운 겉옷도 추천되지만, 범위에 딱 맞는 조합이 먼저', () => {
  // 5–8° 구간: 상의 · 하의 · 겉옷 모두 [4, 4] → 합 12 가 바라는 값
  const items = [
    cloth('top', '두꺼운 니트', '#ffffff', 4),
    cloth('top', '얇은 니트', '#f5f5f5', 3),
    cloth('bottom', '검정 기모 바지', '#111111', 4),
    cloth('outer', '울 코트', '#8a8a8a', 4),
    cloth('outer', '패딩', '#555555', 5),
  ];
  const pick = Coach.pickFromCloset({ items, temp: 7, warmthTable: WARMTH_TABLE, seed: SEED });
  assert.ok(pick.looks, JSON.stringify(pick));
  assert.deepStrictEqual(pick.looks.map((l) => [l.top.name, l.outer.name]), [
    ['두꺼운 니트', '울 코트'],
    ['얇은 니트', '패딩'], // 3 + 4 + 5 = 12, 겹쳐 입기
  ]);
  assert.ok(pick.looks.every((l) => !('score' in l)), '점수는 밖으로 안 나감');
});

test('보온: 칸마다 옷은 있어도 합이 너무 모자라면 { noFit: true }, 겉옷 없는 구간은 범위 그대로', () => {
  const thin = [
    cloth('top', '얇은 니트', '#ffffff', 3),
    cloth('bottom', '기모 바지', '#111111', 4),
    cloth('outer', '재킷', '#8a8a8a', 3), // 3 + 4 + 3 = 10, 12 에서 2 모자람
  ];
  assert.deepStrictEqual(Coach.pickFromCloset({ items: thin, temp: 7, warmthTable: WARMTH_TABLE, seed: SEED }), { noFit: true });

  // 23–27° 는 겉옷이 없는 구간 → 상의 범위 [1, 2] 를 넓히지 않는다 (니트는 안 됨)
  const summer = [cloth('top', '니트', '#ffffff', 3), cloth('bottom', '반바지', '#111111', 1)];
  assert.deepStrictEqual(Coach.pickFromCloset({ items: summer, temp: 25, warmthTable: WARMTH_TABLE, seed: SEED }), { missing: ['상의'] });
});

test('색 점수: 밝기 차이 있는 같은 계열(네이비 + 연청)은 괜찮고, 밝기도 비슷한 쨍한 같은 계열은 낮다', () => {
  const c = (hex) => ({ color: hex });
  assert.ok(Coach.colorScore({ top: c('#1f2f5a'), bottom: c('#9db8de') }) > 0);
  assert.ok(Coach.colorScore({ top: c('#2a5bd7'), bottom: c('#1d3f9a') }) < 0);
  // 흰 상의 + 검정 하의가 가장 무난
  assert.ok(Coach.colorScore({ top: c('#ffffff'), bottom: c('#111111') })
    > Coach.colorScore({ top: c('#d02020'), bottom: c('#f2d13a') }));
});

test('점수 낮은 조합(쨍한 빨강 + 쨍한 노랑)은 다양성 때문에 첫 묶음으로 당겨 오지 않는다', () => {
  const items = [
    cloth('top', '빨강 니트', '#d02020', 3),
    cloth('top', '흰 셔츠', '#ffffff', 3),
    cloth('bottom', '노랑 바지', '#f2d13a', 3),
    cloth('bottom', '검정 바지', '#111111', 3),
    greyJacket(),
  ];
  const first = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED });
  const names = (looks) => looks.map(Coach.lookTitle);
  assert.ok(!names(first.looks).includes('빨강 니트 + 노랑 바지'), names(first.looks).join(', '));
  const second = Coach.pickFromCloset({ items, temp: 14, warmthTable: WARMTH_TABLE, seed: SEED, page: 1 });
  assert.deepStrictEqual(names(second.looks), ['빨강 니트 + 노랑 바지']);
});

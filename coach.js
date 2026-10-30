/*
 * 패션 코치: 추천안(룩) 만들기
 * ------------------------------------------------------------
 * 화면 없이 돌아가는 계산만 모았다. 브라우저에서는 window.Coach, node(시험)에서는 module.exports.
 * 옷 목록 · 표 · 온도 · 날짜 씨앗은 모두 인자로 받는다 (Wardrobe.list() 를 직접 읽지 않는다).
 *
 * 추천안 하나 = { top, bottom, outer, acc, tip }
 *  - 기본 추천: app.js 의 OUTFIT_TABLE 구간마다 적힌 looks 그대로 (tip 은 사람이 적은 것)
 *  - 옷장 추천: 옷장 옷으로 만든 조합. 한 번에 최대 3개, 서로 상의·하의 쌍이 다르게.
 *    tip 은 아래 COACH_RULES 로 색을 보고 만든다.
 *
 * ■ 코치 한마디 규칙
 *  - COACH_RULES: 위에서부터 먼저 맞는 규칙 하나의 문장을 쓴다. 함수 하나 = 규칙 하나.
 *  - COACH_ADDONS: 맞는 것은 모두 위 문장 뒤에 덧붙인다.
 *  - 함수는 색 계열 c = { top, bottom, outer } 를 받는다. 값은 'neutral'(무채색) 또는
 *    COLOR_FAMILIES 의 이름, 겉옷이 없으면 outer 는 null. 안 맞으면 null 을 돌려준다.
 */
(function () {
  const N = 'neutral';

  const COACH_RULES = [
    (c) => (c.top === N && c.bottom === N ? '무채색끼리라 차분하고 깔끔해요' : null),
    (c) => (c.bottom === N ? '하의가 무채색이라 상의 색이 살아나요' : null),
    (c) => (c.top === N ? '상의가 무채색이라 하의 색이 살아나요' : null),
    (c) => (c.top !== c.bottom ? '상의와 하의 색이 달라 또렷해 보여요' : null),
    () => '같은 계열이라 톤온톤 느낌이에요. 겉옷을 밝거나 어두운 걸로 하면 더 좋아요',
  ];

  const COACH_ADDONS = [
    (c) => (c.outer && c.outer !== N && c.outer === c.top ? '겉옷과 상의 색이 비슷하니 하의로 끊어 주세요' : null),
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
  const PER_PAGE = 3; // 한 번에 보여주는 추천안 수

  /* ===== 색 ===== */

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
    if (s < 0.12 || l < 0.13 || l > 0.93) return N;                 // 검정 · 흰 · 회
    if (h >= 20 && h <= 50 && s < 0.5 && l > 0.65) return N;        // 베이지
    return COLOR_FAMILIES.find((f) => h < f.max).name;
  }

  function colorsGo(combo) {
    if (!combo.top || !combo.bottom) return true;
    const a = colorFamily(combo.top.color);
    const b = colorFamily(combo.bottom.color);
    return a === N || b === N || a !== b;
  }

  // 같은 씨앗이면 같은 순서로 섞는다 (날마다 첫 추천이 바뀌게)
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

  /* ===== 코치 한마디 ===== */

  // 옷장 옷 조합 { top, bottom, outer } → 한 줄 (길어야 두 문장)
  function coachTip(combo) {
    const c = {
      top: colorFamily(combo.top.color),
      bottom: colorFamily(combo.bottom.color),
      outer: combo.outer ? colorFamily(combo.outer.color) : null,
    };
    const main = COACH_RULES.map((rule) => rule(c)).find(Boolean);
    const extra = COACH_ADDONS.map((rule) => rule(c)).filter(Boolean);
    return [main, ...extra].join('. ');
  }

  /* ===== 기본 추천 ===== */

  // 표(높은 온도 순, 맨 끝은 -Infinity)에서 온도에 맞는 줄
  function findRow(table, temp) {
    return table.find((row) => temp >= row.min) || table[table.length - 1];
  }

  // OUTFIT_TABLE → 이 온도의 기본 룩들 { band, looks }
  function defaultLooks(outfitTable, temp) {
    const band = findRow(outfitTable, temp);
    return { band, looks: band.looks.map((look) => ({ ...look })) };
  }

  /* ===== 옷장 추천 ===== */

  const pairKey = (combo) => `${combo.top.id}|${combo.bottom.id}`;

  // 상·하의 쌍 목록을 최대 3개씩 묶는다. 묶음 안에서는 상의도 하의도 다른 것 먼저, 그다음 한쪽만 다른 것.
  function groupPairs(combos) {
    const left = combos.slice();
    const pages = [];
    while (left.length) {
      const page = [left.shift()];
      while (page.length < PER_PAGE && left.length) {
        let i = left.findIndex((c) => page.every((p) => p.top.id !== c.top.id && p.bottom.id !== c.bottom.id));
        if (i < 0) i = 0; // 쌍은 이미 서로 다르므로 남은 것 중 맨 앞 = 한쪽만 다른 것
        page.push(left.splice(i, 1)[0]);
      }
      pages.push(page);
    }
    return pages;
  }

  /**
   * 옷장 옷으로 추천안 만들기
   *  opts = { items: 옷장 옷 배열, temp: 보정한 온도, warmthTable: WARMTH_TABLE, seed: 날짜 글자, page: 묶음 번호 }
   *  - 옷장이 비었으면 { empty: true }
   *  - 맞는 옷이 없는 칸이 있으면 { missing: ['겉옷'] } (소품은 없어도 됨 → acc 가 null)
   *  - 아니면 { looks: [{ top, bottom, outer, acc, tip }], key, page, pageCount }
   *    key 는 온도 구간 (구간이 바뀌면 첫 묶음부터 보여주려고), page 는 pageCount 로 돌린 값.
   */
  function pickFromCloset({ items, temp, warmthTable, seed, page = 0 }) {
    if (!items.length) return { empty: true };

    const row = findRow(warmthTable, temp);
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
    const shuffled = seededShuffle(good.length ? good : all, `${seed}|${row.min}`);

    // 겉옷 · 소품만 다른 조합은 같은 추천안: 상·하의 쌍마다 섞인 순서에서 처음 나온 것만
    const seen = new Set();
    const combos = shuffled.filter((c) => !seen.has(pairKey(c)) && seen.add(pairKey(c)));

    const pages = groupPairs(combos);
    const at = ((page % pages.length) + pages.length) % pages.length;
    return {
      looks: pages[at].map((c) => ({ ...c, tip: coachTip(c) })),
      key: String(row.min),
      page: at,
      pageCount: pages.length,
    };
  }

  /* ===== 비 ===== */

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

  // 모든 추천안의 소품에 똑같이 우산을 더한다
  function addRain(looks, rainItem) {
    return looks.map((look) => ({ ...look, acc: mergeItems(rainItem, look.acc) }));
  }

  // 카드 제목: "회색 니트 + 청바지"
  function lookTitle(look) {
    return `${look.top.name} + ${look.bottom.name}`;
  }

  const Coach = {
    COACH_RULES, COACH_ADDONS, COLOR_FAMILIES, SLOT_LABEL, PER_PAGE,
    hexToHsl, colorFamily, colorsGo, seededShuffle,
    coachTip, findRow, defaultLooks, pickFromCloset, mergeItems, addRain, lookTitle,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Coach;
  else window.Coach = Coach;
})();

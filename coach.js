/*
 * 패션 코치: 추천안(룩) 만들기
 * ------------------------------------------------------------
 * 화면 없이 돌아가는 계산만 모았다. 브라우저에서는 window.Coach, node(시험)에서는 module.exports.
 * 옷 목록 · 표 · 온도 · 날짜 씨앗은 모두 인자로 받는다 (Wardrobe.list() 를 직접 읽지 않는다).
 *
 * 추천안 하나 = { top, bottom, outer, acc, tip }
 *  - 기본 추천: app.js 의 OUTFIT_TABLE 구간마다 적힌 looks 그대로 (tip 은 사람이 적은 것)
 *  - 옷장 추천: 옷장 옷으로 만든 조합. 한 번에 최대 3개, 서로 상의·하의 쌍이 다르게.
 *    조합마다 점수(아래 SCORE)를 매겨 높은 것부터, 점수가 같으면 날짜 씨앗으로 섞은 순서.
 *    tip 은 아래 COACH_RULES 로 색을 보고 만든다.
 *
 * ■ 점수
 *  - 보온: 상의 + 하의 + 겉옷 따뜻한 정도 합을 WARMTH_TABLE 범위 가운데값의 합과 비교.
 *    겉옷이 있는 구간에서는 상의 · 겉옷을 범위에서 WARMTH_SLACK 만큼 벗어나도 후보로 둔다
 *    (얇은 상의 + 두꺼운 겉옷처럼 겹쳐 입기). 합이 WARMTH_MAX_GAP 넘게 벗어나면 뺀다.
 *    하의 · 소품은 범위 그대로.
 *  - 색: 상·하의 밝기 차이, 같은 계열끼리 밝기까지 비슷한지, 쨍한 색이 몇 벌인지.
 *  - 입은 기록: 최근 며칠 안에 입은 상의 · 하의는 깎는다 (SCORE.recentWorn). 오늘 입은 건 안 깎는다
 *    ("입었어요"를 누르자마자 순서가 바뀌지 않게). 겉옷은 며칠 이어 입는 게 보통이라 안 본다.
 *  - 일교차: 앞으로 12시간 안에 SWING 이상 따뜻해지고 겉옷이 있는 구간이면, 상의를 그때 온도 구간에
 *    맞춘 조합을 먼저 (겉옷을 벗어도 상의만으로 괜찮게). 코치 한마디는 swingTip.
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
    (c) => (c.outer && c.outer !== N && c.outer === c.bottom ? '겉옷과 하의 색이 비슷해 한 덩어리로 보여요. 상의로 끊어 주세요' : null),
  ];

  /*
   * 색 조합 규칙
   *  - 상의와 하의가 같은 색 계열이면 점수를 깎는다 (밝기 차이가 크면 조금만 — 톤온톤).
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

  const WARMTH_SLACK = 1;     // 겉옷 있는 구간에서 상의 · 겉옷이 범위를 벗어나도 되는 정도
  const WARMTH_MAX_GAP = 1;   // 따뜻한 정도 합이 필요한 값과 이만큼까지 달라도 됨

  // 점수 (더해서 높은 순). 고치면 순서만 바뀌고, 빠지는 조합은 없다 (보온 합만 거른다).
  const SCORE = {
    warmthGap: -2,      // 따뜻한 정도 합이 필요한 값과 1 다를 때마다
    outOfRange: -1,     // 상의 · 겉옷이 제 범위를 벗어날 때마다 (겹쳐 입기는 되지만 딱 맞는 게 먼저)
    contrastHigh: 2,    // 상·하의 밝기 차이 0.3 이상
    contrastMid: 1,     // 상·하의 밝기 차이 0.15 이상
    sameFamilyFlat: -3, // 상·하의가 같은 유채색 계열에 밝기도 비슷 (한 덩어리)
    sameFamily: -1,     // 상·하의가 같은 유채색 계열이지만 밝기 차이가 있음 (톤온톤)
    outerFlat: -1,      // 겉옷이 상의나 하의와 같은 유채색 계열에 밝기도 비슷
    extraVivid: -2,     // 쨍한 색이 두 벌째부터 한 벌마다
    nearPage: 1,        // 묶음 안 다양성을 위해 이만큼 낮은 점수까지는 당겨 온다
    recentWorn: [0, -3, -2, -1], // 상의 · 하의를 [오늘, 어제, 그저께, 사흘 전] 입었을 때 (그 전은 0)
    swingTop: -3,       // 이따 따뜻해질 때, 상의가 그때 구간 상의 범위 가운데값과 1 다를 때마다
  };
  const SWING = 6; // 앞으로 이만큼(°) 오르거나 내리면 일교차로 본다
  const CONTRAST_HIGH = 0.3;
  const CONTRAST_MID = 0.15;

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

  // 쨍한 색: 무채색이 아니고 채도가 높으며 너무 어둡거나 밝지 않은 색
  function isVivid(hex) {
    const { s, l } = hexToHsl(hex);
    return colorFamily(hex) !== N && s >= 0.55 && l >= 0.25 && l <= 0.75;
  }

  // 같은 유채색 계열에 밝기도 비슷하면 한 덩어리로 보인다
  function looksFlat(a, b) {
    const fa = colorFamily(a);
    return fa !== N && fa === colorFamily(b) && Math.abs(hexToHsl(a).l - hexToHsl(b).l) < CONTRAST_MID;
  }

  // 조합 { top, bottom, outer } 의 색 점수
  function colorScore(combo) {
    const top = combo.top.color, bottom = combo.bottom.color, outer = combo.outer?.color;
    let score = 0;
    const dl = Math.abs(hexToHsl(top).l - hexToHsl(bottom).l);
    if (dl >= CONTRAST_HIGH) score += SCORE.contrastHigh;
    else if (dl >= CONTRAST_MID) score += SCORE.contrastMid;

    const fTop = colorFamily(top);
    if (fTop !== N && fTop === colorFamily(bottom)) score += dl < CONTRAST_MID ? SCORE.sameFamilyFlat : SCORE.sameFamily;
    if (outer && (looksFlat(outer, top) || looksFlat(outer, bottom))) score += SCORE.outerFlat;

    const vivid = [top, bottom, outer].filter((c) => c && isVivid(c)).length;
    if (vivid > 1) score += SCORE.extraVivid * (vivid - 1);
    return score;
  }

  /* ===== 보온 ===== */

  const mid = (range) => (range[0] + range[1]) / 2;
  const LAYERS = ['top', 'bottom', 'outer'];

  // 이 구간에서 상의 + 하의 + 겉옷 따뜻한 정도 합으로 바라는 값
  function warmthNeed(row) {
    return LAYERS.reduce((sum, slot) => sum + (row[slot] ? mid(row[slot]) : 0), 0);
  }

  // 칸마다 후보로 둘 따뜻한 정도 범위 (겉옷 있는 구간의 상의 · 겉옷만 넓힌다)
  function slotRange(row, slot) {
    const range = row[slot];
    if (!range || !row.outer || (slot !== 'top' && slot !== 'outer')) return range;
    return [range[0] - WARMTH_SLACK, range[1] + WARMTH_SLACK];
  }

  // 조합의 보온 점수 (합이 너무 벗어나면 null = 후보에서 뺌)
  function warmthScore(combo, row) {
    const total = LAYERS.reduce((sum, slot) => sum + (combo[slot] ? combo[slot].warmth : 0), 0);
    const gap = Math.abs(total - warmthNeed(row));
    if (gap > WARMTH_MAX_GAP) return null;
    const outside = LAYERS.filter((slot) => combo[slot] && row[slot]
      && (combo[slot].warmth < row[slot][0] || combo[slot].warmth > row[slot][1])).length;
    return SCORE.warmthGap * gap + SCORE.outOfRange * outside;
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

  /* ===== 입은 기록 ===== */

  // 'YYYY-MM-DD' 두 날짜 사이 날 수 (b − a)
  function daysBetween(a, b) {
    const utc = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((utc(b) - utc(a)) / 86400000);
  }

  // 입은 기록 { 'YYYY-MM-DD': [옷 id] } → { 옷 id: 마지막으로 입은 지 며칠 } (오늘 = 0, 앞날 기록은 무시)
  function wornDays(log, today) {
    const out = {};
    for (const [date, ids] of Object.entries(log || {})) {
      const days = daysBetween(date, today);
      if (!(days >= 0)) continue;
      for (const id of ids) if (!(out[id] <= days)) out[id] = days;
    }
    return out;
  }

  // 조합의 입은 기록 점수 (상의 · 하의만)
  function wornScore(combo, worn) {
    return ['top', 'bottom'].reduce((sum, slot) => sum + (SCORE.recentWorn[worn[combo[slot].id]] ?? 0), 0);
  }

  /* ===== 입어 본 느낌 (피드백) ===== */

  /*
   * 피드백 = { log: { 'YYYY-MM-DD': 'cold' | 'good' | 'hot' | 'skip' }, carried: 숫자 }
   *  - log 의 날짜는 입은 기록(worn)의 날짜. 그날 입은 옷은 worn[날짜] 에서 찾는다.
   *  - 내 체감 보정(learnedOffset)은 carried + log 의 걸음 합. 오래된 log 를 버릴 때 그 걸음은 carried 로 옮긴다.
   *  - "더웠어요" → +, "추웠어요" → − (추천 온도를 올리면 더 얇은 옷이 나온다 — 체감 보정 3단계와 같은 방향)
   */
  const FEEDBACK = {
    step: 0.5,          // 피드백 한 번에 움직이는 체감 보정(°)
    max: 5,             // 체감 보정 한계 (±)
    askDays: 2,         // 입은 날부터 며칠 안에 "어땠어요?" 를 물을지 (그 뒤엔 안 물음)
    askTodayFrom: 17,   // 오늘 입은 옷은 이 시각부터 물음
    suggestAfter: 2,    // 한 옷에 같은 쪽 피드백이 이만큼 더 많으면 따뜻한 정도 고치기 제안
  };
  const FEEL_STEP = { hot: 1, cold: -1 };

  const clampOffset = (v) => Math.max(-FEEDBACK.max, Math.min(FEEDBACK.max, v));

  // 피드백으로 배운 체감 보정(°)
  function learnedOffset(feedback) {
    const sum = Object.values(feedback?.log || {}).reduce((acc, feel) => acc + (FEEL_STEP[feel] ?? 0) * FEEDBACK.step, 0);
    return clampOffset((feedback?.carried || 0) + sum);
  }

  // keepDays 보다 오래된 log 는 버리고 그 걸음은 carried 로 옮긴다
  function pruneFeedback(feedback, today, keepDays) {
    const log = {};
    let carried = feedback?.carried || 0;
    for (const [date, feel] of Object.entries(feedback?.log || {})) {
      if (daysBetween(date, today) > keepDays) carried += (FEEL_STEP[feel] ?? 0) * FEEDBACK.step;
      else log[date] = feel;
    }
    return { log, carried: clampOffset(carried) };
  }

  // "어땠어요?" 를 물을 날짜 (가장 최근, 아직 답 없는 입은 날). 없으면 null
  function feedbackDate({ worn, feedback, today, hour }) {
    const dates = Object.keys(worn || {})
      .filter((date) => !(date in (feedback?.log || {})))
      .filter((date) => {
        const age = daysBetween(date, today);
        return age > 0 ? age <= FEEDBACK.askDays : age === 0 && hour >= FEEDBACK.askTodayFrom;
      })
      .sort();
    return dates.length ? dates[dates.length - 1] : null;
  }

  /**
   * 따뜻한 정도 고치기 제안: [{ item, from, to, hot, cold }]
   *  - 상의 · 하의 · 겉옷마다, 입은 날의 피드백에서 더웠어요 − 추웠어요 가 suggestAfter 이상이면 −1, 반대면 +1
   *  - since[옷 id] ('YYYY-MM-DD') 이후의 피드백만 센다 (따뜻한 정도를 고쳤거나 "괜찮아요" 한 뒤로 다시 세게)
   */
  function warmthSuggestions({ items, worn, feedback, since = {} }) {
    const out = [];
    for (const item of items) {
      if (item.type === 'acc') continue;
      let hot = 0, cold = 0;
      for (const [date, feel] of Object.entries(feedback?.log || {})) {
        if (!(worn?.[date] || []).includes(item.id)) continue;
        if (since[item.id] && date <= since[item.id]) continue;
        if (feel === 'hot') hot++;
        if (feel === 'cold') cold++;
      }
      const to = item.warmth + (hot - cold >= FEEDBACK.suggestAfter ? -1 : cold - hot >= FEEDBACK.suggestAfter ? 1 : 0);
      if (to !== item.warmth && to >= 1 && to <= 5) out.push({ item, from: item.warmth, to, hot, cold });
    }
    return out;
  }

  /* ===== 일교차 ===== */

  // later = { hi, lo }: 앞으로 12시간 체감온도 최고 · 최저 (보정 포함). 없으면 null
  const warmerLater = (later, temp) => Boolean(later) && later.hi - temp >= SWING;
  const colderLater = (later, temp) => Boolean(later) && temp - later.lo >= SWING;

  // 이따 따뜻해질 때 상의 점수: 그때 구간의 상의 범위 가운데값에 가까울수록 덜 깎는다
  function swingScore(combo, rowLater) {
    if (!rowLater || !combo.outer || !rowLater.top) return 0;
    return SCORE.swingTop * Math.abs(combo.top.warmth - mid(rowLater.top));
  }

  // 일교차 한마디 (모든 추천안 tip 뒤에 붙인다). 해당 없으면 null
  function swingTip({ temp, later, hasOuter }) {
    if (warmerLater(later, temp)) {
      return `앞으로 ${Math.round(later.hi)}°까지 올라가요. ${hasOuter ? '더우면 겉옷을 벗으세요' : '한낮엔 더 가볍게 느껴질 거예요'}`;
    }
    if (colderLater(later, temp)) {
      return `앞으로 ${Math.round(later.lo)}°까지 내려가요. ${hasOuter ? '겉옷은 꼭 챙기세요' : '가벼운 겉옷을 챙기세요'}`;
    }
    return null;
  }

  // 추천안들 tip 에 일교차 한마디를 덧붙인다
  function addSwing(looks, temp, later) {
    return looks.map((look) => {
      const extra = swingTip({ temp, later, hasOuter: Boolean(look.outer) });
      return extra ? { ...look, tip: `${look.tip}. ${extra}` } : look;
    });
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

  // 점수 순 상·하의 쌍 목록을 최대 3개씩 묶는다. 묶음 안에서는 상의도 하의도 다른 것 먼저
  // (남은 것 중 최고점보다 SCORE.nearPage 넘게 낮은 것은 당겨 오지 않음), 그다음 한쪽만 다른 것.
  function groupPairs(combos) {
    const left = combos.slice();
    const pages = [];
    while (left.length) {
      const page = [left.shift()];
      while (page.length < PER_PAGE && left.length) {
        const floor = left[0].score - SCORE.nearPage;
        let i = left.findIndex((c) => c.score >= floor
          && page.every((p) => p.top.id !== c.top.id && p.bottom.id !== c.bottom.id));
        if (i < 0) i = 0; // 쌍은 이미 서로 다르므로 남은 것 중 맨 앞 = 점수가 가장 높은 것
        page.push(left.splice(i, 1)[0]);
      }
      pages.push(page);
    }
    return pages;
  }

  /**
   * 옷장 옷으로 추천안 만들기
   *  opts = { items: 옷장 옷 배열, temp: 보정한 온도, warmthTable: WARMTH_TABLE, seed: 날짜 글자, page: 묶음 번호,
   *          worn: wornDays 결과 { 옷 id: 며칠 전 } (없어도 됨),
   *          later: { hi, lo } 앞으로 12시간 체감 최고 · 최저 (없어도 됨) }
   *  - 옷장이 비었으면 { empty: true }
   *  - 맞는 옷이 없는 칸이 있으면 { missing: ['겉옷'] } (소품은 없어도 됨 → acc 가 null)
   *  - 칸마다 옷은 있지만 합치면 너무 얇거나 두꺼우면 { noFit: true }
   *  - 아니면 { looks: [{ top, bottom, outer, acc, tip }], key, page, pageCount }
   *    key 는 온도 구간 (구간이 바뀌면 첫 묶음부터 보여주려고), page 는 pageCount 로 돌린 값.
   */
  function pickFromCloset({ items, temp, warmthTable, seed, page = 0, worn = {}, later = null }) {
    if (!items.length) return { empty: true };

    const row = findRow(warmthTable, temp);
    const pools = {};
    const missing = [];
    for (const slot of Object.keys(SLOT_LABEL)) {
      const range = slotRange(row, slot);
      const fits = range
        ? items.filter((it) => it.type === slot && it.warmth >= range[0] && it.warmth <= range[1])
        : [];
      if (fits.length) pools[slot] = fits;
      else if (range && slot !== 'acc') missing.push(SLOT_LABEL[slot]);
      else pools[slot] = [null];
    }
    if (missing.length) return { missing };
    const rowLater = warmerLater(later, temp) && row.outer ? findRow(warmthTable, later.hi) : null;

    const all = [];
    for (const top of pools.top)
      for (const bottom of pools.bottom)
        for (const outer of pools.outer)
          for (const acc of pools.acc) {
            const combo = { top, bottom, outer, acc };
            const warmth = warmthScore(combo, row);
            if (warmth !== null) all.push({ ...combo, score: warmth + colorScore(combo) + wornScore(combo, worn) + swingScore(combo, rowLater) });
          }
    if (!all.length) return { noFit: true };

    // 점수 높은 순, 같으면 섞인 순서 (sort 는 안정 정렬)
    const ranked = seededShuffle(all, `${seed}|${row.min}`).sort((a, b) => b.score - a.score);

    // 겉옷 · 소품만 다른 조합은 같은 추천안: 상·하의 쌍마다 점수가 가장 높은 것만
    const seen = new Set();
    const combos = ranked.filter((c) => !seen.has(pairKey(c)) && seen.add(pairKey(c)));

    const pages = groupPairs(combos);
    const at = ((page % pages.length) + pages.length) % pages.length;
    return {
      looks: pages[at].map(({ score, ...c }) => ({ ...c, tip: coachTip(c) })),
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
    COACH_RULES, COACH_ADDONS, COLOR_FAMILIES, SLOT_LABEL, PER_PAGE, SCORE, WARMTH_SLACK, WARMTH_MAX_GAP,
    hexToHsl, colorFamily, isVivid, colorScore, warmthNeed, warmthScore, seededShuffle,
    daysBetween, wornDays, wornScore, SWING, swingScore, swingTip, addSwing,
    FEEDBACK, learnedOffset, pruneFeedback, feedbackDate, warmthSuggestions,
    coachTip, findRow, defaultLooks, pickFromCloset, mergeItems, addRain, lookTitle,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Coach;
  else window.Coach = Coach;
})();

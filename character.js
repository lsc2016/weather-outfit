/*
 * 종이 인형 캐릭터 (SVG)
 * ------------------------------------------------------------
 * 기본 몸을 한 번 그리고, 그 위에 하의 → 상의 → 겉옷 → 소품 순서로 층을 겹친다.
 * app.js 의 OUTFIT_TABLE 각 품목에 있는 art 키가 아래 PIECES 의 이름과 연결된다.
 *
 * ■ 품목 그림을 새로 추가하는 방법
 *  1. 아래 PIECES 에 새 이름으로 함수를 하나 추가한다. 함수는 SVG 조각 문자열을 돌려준다.
 *       예) PIECES.hoodie = () => sleeves(LONG, 'var(--c-hoodie)') + topBody('var(--c-hoodie)') + ...
 *  2. 색은 style.css 의 "캐릭터 색" 토큰(--c-…)에 추가하고, 다크모드 쪽에도 같은 이름으로 넣는다.
 *  3. app.js OUTFIT_TABLE 에서 그 품목의 art 를 새 이름으로 바꾼다.
 *       예) top: { icon: '👕', name: '후드티', art: 'hoodie' }
 *     소품처럼 여러 개를 겹칠 땐 배열로: art: ['muffler', 'gloves']
 *
 * ■ 그릴 때 쓰는 좌표 (viewBox -20 -50 240 330, 몸 가운데 x=100)
 *  - 머리: 중심 (100, 60), 반지름 30 / 목: y 80~98
 *  - 어깨: 왼쪽 (76, 102), 오른쪽 (124, 102). 팔은 arms() 로 감싸면 팔 방향 좌표계가 된다.
 *    팔 좌표계에서 어깨는 (0, 0), 손 중심은 (0, 70), 손 반지름 8.5
 *  - 상의 몸판: topBody() 사용 (y 89~189) / 허리: y 168 / 발목: y 262 / 신발: y 267
 *  - 선은 S (진한 외곽선) 를 붙이면 다른 조각과 같은 굵기·색으로 맞춰진다.
 */
(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // 공통 외곽선
  const S = 'stroke="var(--c-ink)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
  const THIN = 'stroke="var(--c-ink)" stroke-width="1.6" stroke-linecap="round" fill="none"';
  const SKIN = 'fill="var(--c-skin)"';

  // 팔 좌표계로 감싸기 (양팔에 같은 조각을 그린다)
  const armL = (inner) => `<g transform="translate(76 102) rotate(18)">${inner}</g>`;
  const armR = (inner) => `<g transform="translate(124 102) rotate(-18)">${inner}</g>`;
  const arms = (inner) => armL(inner) + armR(inner);

  /* ===== 공통 부품 ===== */

  // 소매 길이
  const SHORT = 26;
  const LONG = 62;

  // 소매: width 는 두께 (겉옷·패딩은 더 두껍게)
  const sleeves = (len, fill, width = 19) =>
    arms(`<rect x="${-width / 2}" y="-7" width="${width}" height="${len + 3}" rx="8" fill="${fill}" ${S}/>`);

  // 소매 끝 시보리
  const cuffs = (fill, width = 19) =>
    arms(`<rect x="${-width / 2}" y="${LONG - 6}" width="${width}" height="8" rx="3" fill="${fill}" ${S}/>`);

  // 상의 몸판
  const topBody = (fill) =>
    `<path d="M72 96 Q100 89 128 96 L131 184 Q100 189 69 184 Z" fill="${fill}" ${S}/>`;

  // 둥근 목선 (목 피부가 살짝 보이게)
  const roundNeck = () =>
    `<path d="M90 93 Q100 103 110 93 Z" ${SKIN}/><path d="M90 93 Q100 103 110 93" ${THIN}/>`;

  // 밑단 시보리
  const hemBand = (fill) =>
    `<rect x="69" y="177" width="62" height="10" rx="4" fill="${fill}" ${S}/>`;

  // 긴 바지 모양
  const longPants = (fill) =>
    `<path d="M72 166 L128 166 L127 262 L103 262 L100 204 L97 262 L73 262 Z" fill="${fill}" ${S}/>`;

  // 앞이 열린 겉옷 (bottom = 기장)
  const openPanels = (fill, bottom) =>
    `<path d="M70 93 Q84 88 97 90 L96 ${bottom} L65 ${bottom} Z" fill="${fill}" ${S}/>` +
    `<path d="M130 93 Q116 88 103 90 L104 ${bottom} L135 ${bottom} Z" fill="${fill}" ${S}/>`;

  // 앞이 닫힌 겉옷 + 지퍼
  const closedBody = (fill, bottom) =>
    `<path d="M69 93 Q100 85 131 93 L135 ${bottom} Q100 ${bottom + 5} 65 ${bottom} Z" fill="${fill}" ${S}/>` +
    `<path d="M100 90 L100 ${bottom + 2}" ${THIN}/>`;

  // 옷깃 (재킷·코트)
  const lapels = (fill) =>
    `<path d="M97 90 L84 94 L96 124 Z" fill="${fill}" ${S}/>` +
    `<path d="M103 90 L116 94 L104 124 Z" fill="${fill}" ${S}/>` +
    `<path d="M97 90 L84 94 L96 124 Z M103 90 L116 94 L104 124 Z" fill="#000" opacity=".1"/>`;

  // 단추 여러 개
  const buttons = (x, ys) => ys.map((y) => `<circle cx="${x}" cy="${y}" r="2" fill="var(--c-ink)"/>`).join('');

  /* ===== 기본 몸 ===== */
  const BASE = `
    <ellipse cx="100" cy="272" rx="52" ry="7" fill="var(--c-floor)"/>
    <rect x="79" y="168" width="16" height="96" rx="8" ${SKIN} ${S}/>
    <rect x="105" y="168" width="16" height="96" rx="8" ${SKIN} ${S}/>
    <ellipse cx="86" cy="267" rx="13" ry="7" fill="var(--c-shoe)" ${S}/>
    <ellipse cx="114" cy="267" rx="13" ry="7" fill="var(--c-shoe)" ${S}/>
    ${arms(`<rect x="-7" y="-4" width="14" height="72" rx="7" ${SKIN} ${S}/><circle cx="0" cy="70" r="8.5" ${SKIN} ${S}/>`)}
    <path d="M76 98 Q100 92 124 98 L127 178 L73 178 Z" ${SKIN} ${S}/>
    <rect x="93" y="78" width="14" height="20" rx="4" ${SKIN} ${S}/>
    <circle cx="100" cy="60" r="30" ${SKIN} ${S}/>
    <path d="M70 58 Q68 24 100 24 Q132 24 130 58 Q120 40 100 42 Q84 40 70 58 Z" fill="var(--c-hair)" ${S}/>
    <ellipse cx="90" cy="63" rx="2.8" ry="3.4" fill="var(--c-ink)"/>
    <ellipse cx="110" cy="63" rx="2.8" ry="3.4" fill="var(--c-ink)"/>
    <circle cx="83" cy="72" r="4.5" fill="var(--c-blush)" opacity=".55"/>
    <circle cx="117" cy="72" r="4.5" fill="var(--c-blush)" opacity=".55"/>
    <path d="M95 73 Q100 78 105 73" ${THIN}/>
  `;

  /* ===== 품목 그림 (OUTFIT_TABLE 의 art 키와 같은 이름) ===== */
  const PIECES = {
    // --- 상의 ---
    tank: () =>
      `<path d="M80 95 L89 94 Q100 105 111 94 L120 95 L129 184 Q100 189 71 184 Z" fill="var(--c-tank)" ${S}/>`,

    tshirt: () => sleeves(SHORT, 'var(--c-tee)', 20) + topBody('var(--c-tee)') + roundNeck(),

    longsleeve: () => sleeves(LONG, 'var(--c-long)') + topBody('var(--c-long)') + roundNeck(),

    sweatshirt: () =>
      sleeves(LONG, 'var(--c-sweat)') + cuffs('var(--c-sweat)') +
      topBody('var(--c-sweat)') + hemBand('var(--c-sweat)') + roundNeck(),

    knit: () =>
      sleeves(LONG, 'var(--c-knit)') + cuffs('var(--c-knit)') +
      topBody('var(--c-knit)') + hemBand('var(--c-knit)') +
      // 꽈배기 무늬
      [86, 100, 114].map((x) =>
        `<path d="M${x} 104 q-4 6 0 12 q4 6 0 12 q-4 6 0 12 q4 6 0 12 q-4 6 0 12 q4 6 0 12" ${THIN} opacity=".45"/>`).join('') +
      roundNeck(),

    shirt: () =>
      sleeves(LONG, 'var(--c-shirt)') + topBody('var(--c-shirt)') +
      `<path d="M90 93 L100 108 L110 93 Z" ${SKIN}/>` +
      `<path d="M100 96 L87 90 L91 105 Z" fill="var(--c-collar)" ${S}/>` +
      `<path d="M100 96 L113 90 L109 105 Z" fill="var(--c-collar)" ${S}/>` +
      buttons(100, [116, 134, 152, 170]),

    // --- 하의 ---
    shorts: () =>
      `<path d="M72 166 L128 166 L130 214 L103 214 L100 200 L97 214 L70 214 Z" fill="var(--c-shorts)" ${S}/>`,

    slacks: () =>
      longPants('var(--c-slacks)') +
      `<path d="M85 180 L85 258 M115 180 L115 258" ${THIN} opacity=".35"/>`,

    jeans: () =>
      longPants('var(--c-jeans)') +
      `<path d="M76 176 Q84 184 92 176 M108 176 Q116 184 124 176" ${THIN} opacity=".45"/>` +
      `<path d="M74 254 L96 254 M104 254 L126 254" ${THIN} opacity=".35"/>`,

    warmpants: () =>
      longPants('var(--c-warm)') +
      `<rect x="73" y="250" width="24" height="12" rx="3" fill="var(--c-warm)" ${S}/>` +
      `<rect x="103" y="250" width="24" height="12" rx="3" fill="var(--c-warm)" ${S}/>`,

    // --- 겉옷 ---
    cardigan: () =>
      sleeves(LONG, 'var(--c-cardigan)', 21) + openPanels('var(--c-cardigan)', 194) +
      buttons(92, [112, 132, 152, 172]),

    windbreaker: () =>
      sleeves(LONG, 'var(--c-wind)', 22) + cuffs('var(--c-wind)', 22) +
      closedBody('var(--c-wind)', 190) +
      `<path d="M86 86 Q100 80 114 86 L112 96 Q100 92 88 96 Z" fill="var(--c-wind)" ${S}/>`,

    jacket: () =>
      sleeves(LONG, 'var(--c-jacket)', 22) + openPanels('var(--c-jacket)', 190) + lapels('var(--c-jacket)') +
      `<path d="M72 160 L88 160 M112 160 L128 160" ${THIN} opacity=".5"/>`,

    trench: () =>
      sleeves(LONG, 'var(--c-trench)', 22) + openPanels('var(--c-trench)', 232) + lapels('var(--c-trench)') +
      `<rect x="64" y="174" width="72" height="9" rx="3" fill="var(--c-trench)" ${S}/>` +
      `<rect x="95" y="172" width="10" height="13" rx="2" fill="none" ${S}/>` +
      buttons(90, [136, 156]),

    coat: () =>
      sleeves(LONG, 'var(--c-coat)', 23) + openPanels('var(--c-coat)', 228) + lapels('var(--c-coat)') +
      buttons(91, [140, 166, 192]),

    padding: () =>
      arms(`<rect x="-13" y="-8" width="26" height="${LONG + 4}" rx="11" fill="var(--c-padding)" ${S}/>` +
        [14, 30, 46].map((y) => `<path d="M-12 ${y} L12 ${y}" ${THIN} opacity=".4"/>`).join('')) +
      closedBody('var(--c-padding)', 208) +
      [118, 142, 166, 190].map((y) => `<path d="M67 ${y} Q100 ${y + 5} 133 ${y}" ${THIN} opacity=".4"/>`).join('') +
      `<rect x="84" y="80" width="32" height="17" rx="8" fill="var(--c-padding)" ${S}/>`,

    // --- 소품 ---
    sunglasses: () =>
      `<rect x="81" y="57" width="16" height="11" rx="4" fill="var(--c-glasses)" ${S}/>` +
      `<rect x="103" y="57" width="16" height="11" rx="4" fill="var(--c-glasses)" ${S}/>` +
      `<path d="M97 61 L103 61" ${THIN}/>`,

    cap: () =>
      `<path d="M69 48 Q68 20 100 20 Q132 20 131 48 Z" fill="var(--c-cap)" ${S}/>` +
      `<path d="M112 46 L146 46 Q150 52 142 54 L112 52 Z" fill="var(--c-cap)" ${S}/>` +
      `<circle cx="100" cy="21" r="3" fill="var(--c-cap)" ${S}/>`,

    beanie: () =>
      `<path d="M68 52 Q68 16 100 16 Q132 16 132 52 Z" fill="var(--c-beanie)" ${S}/>` +
      `<rect x="65" y="42" width="70" height="13" rx="6" fill="var(--c-beanie)" ${S}/>` +
      `<circle cx="100" cy="13" r="8" fill="var(--c-beanie)" ${S}/>`,

    scarf: () =>
      `<rect x="86" y="86" width="28" height="11" rx="5" fill="var(--c-scarf)" ${S}/>` +
      `<path d="M103 93 L113 93 L111 124 L101 121 Z" fill="var(--c-scarf)" ${S}/>`,

    muffler: () =>
      `<rect x="82" y="83" width="36" height="16" rx="8" fill="var(--c-muffler)" ${S}/>` +
      `<rect x="103" y="92" width="14" height="40" rx="4" fill="var(--c-muffler)" ${S}/>` +
      `<path d="M103 108 L117 108 M103 118 L117 118" stroke="var(--c-muffler-2)" stroke-width="3"/>` +
      `<path d="M106 132 L106 138 M110 132 L110 138 M114 132 L114 138" ${THIN}/>`,

    gloves: () =>
      arms(`<rect x="-10" y="58" width="20" height="8" rx="3" fill="var(--c-gloves)" ${S}/>` +
        `<circle cx="0" cy="71" r="10" fill="var(--c-gloves)" ${S}/>`),

    umbrella: () =>
      // 오른손(화면 기준)에 든 우산: 손 위치 (145.6, 168.6)
      `<path d="M146 -46 L146 172 Q146 182 138 182" fill="none" stroke="var(--c-umbrella-shaft)" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M88 14 Q88 -38 146 -38 Q204 -38 204 14 Q189.5 4 175 14 Q160.5 4 146 14 Q131.5 4 117 14 Q102.5 4 88 14 Z" fill="var(--c-umbrella)" ${S}/>` +
      `<path d="M146 -38 Q128 -12 117 14 M146 -38 Q164 -12 175 14" ${THIN} opacity=".5"/>` +
      `<circle cx="145.6" cy="168.6" r="8.5" ${SKIN} ${S}/>`,
  };

  /* ===== 그리기 ===== */

  const LAYERS = ['bottom', 'top', 'outer', 'acc']; // 아래에서 위로 겹치는 순서
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function drawPiece(key) {
    const piece = PIECES[key];
    if (!piece) {
      console.warn(`character.js: '${key}' 그림이 없어요. PIECES 에 추가해 주세요.`);
      return '';
    }
    return piece();
  }

  // 층 하나를 새 그림으로 바꾼다 (짧게 겹쳐 사라지고 나타나기)
  function swapLayer(layer, markup) {
    // 이전 전환이 아직 끝나지 않았으면 바로 정리
    layer.querySelectorAll('.piece-leaving').forEach((n) => n.remove());

    const old = layer.querySelector('.piece');
    const next = document.createElementNS(SVG_NS, 'g');
    next.setAttribute('class', 'piece');
    next.innerHTML = markup;
    layer.append(next);

    const animate = !reduceMotion?.matches && typeof next.animate === 'function';
    if (!old) {
      if (animate) {
        const enter = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
        setTimeout(() => enter.finish(), 280);
      }
      return;
    }
    if (!animate) { old.remove(); return; }

    old.setAttribute('class', 'piece-leaving');
    old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in' })
      .onfinish = () => old.remove();
    const enter = next.animate(
      [{ opacity: 0, transform: 'translateY(5px) scale(.97)' }, { opacity: 1, transform: 'none' }],
      { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1)' },
    );
    // 탭이 가려져 애니메이션이 멈춰 있어도 옷이 겹치거나 투명하게 남지 않도록 마무리
    setTimeout(() => { old.remove(); enter.finish(); }, 320);
  }

  /**
   * host 안에 캐릭터를 그린다.
   * outfit = { bottom: 'jeans', top: 'knit', outer: null, acc: ['umbrella', 'muffler'] }
   * 각 값은 그림 이름 하나, 이름 배열, 또는 null(그리지 않음).
   */
  function render(host, outfit) {
    let svg = host.querySelector('svg');
    if (!svg) {
      host.innerHTML =
        `<svg viewBox="-20 -50 240 330" xmlns="${SVG_NS}" aria-hidden="true" focusable="false">` +
        `<g data-layer="base">${BASE}</g>` +
        LAYERS.map((l) => `<g data-layer="${l}"></g>`).join('') +
        '</svg>';
      svg = host.querySelector('svg');
    }

    for (const name of LAYERS) {
      const value = outfit[name];
      const keys = value == null ? [] : [].concat(value);
      const sig = keys.join('+');
      const layer = svg.querySelector(`[data-layer="${name}"]`);
      if (layer.dataset.sig === sig) continue; // 바뀐 층만 다시 그린다
      layer.dataset.sig = sig;
      swapLayer(layer, keys.map(drawPiece).join(''));
    }
  }

  window.Character = { render, PIECES };
})();

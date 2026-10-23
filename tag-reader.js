/*
 * 택 찍기: 옷 택 사진에서 라벨 사이즈 · 브랜드 후보를 읽는다
 * ------------------------------------------------------------
 * 글자 읽기는 Tesseract.js (브라우저 안에서, 한국어 + 영어). 처음 쓸 때만 스크립트와
 * 언어 파일을 받는다. 사진은 읽기에만 쓰고 저장하지 않는다.
 * 여기서는 후보만 고르고, 칸을 채우고 확인받는 일은 closet.js 가 한다.
 *
 * 고치기 쉬운 것:
 *  - SIZE_RULES : 사이즈 후보 규칙 (위에 있는 규칙이 먼저. 겹치는 글자는 먼저 맞은 규칙이 가져간다)
 *  - PREPARE    : 읽기 전 사진 손질 (크기 · 대비)
 */
(function () {
  // 버전 고정
  const TESSERACT = {
    script: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
    langs: ['kor', 'eng'],
  };

  const PREPARE = {
    maxSide: 1200,   // 긴 변(px)
    clip: 0.01,      // 밝기 양 끝 1% 는 버리고 나머지를 0~255 로 늘린다
    contrast: 1.35,  // 그다음 대비 배율
  };

  // 숫자 뒤에 %, °, cm 같은 단위가 붙으면 사이즈가 아니다 ("100% 면", "30°C 세탁")
  const NOT_UNIT = '(?![\\d.]|\\s*(?:%|°|℃|도|CM|MM|KG|G\\b))';
  const TOP_NUM = '(85|90|95|100|105|110|115)';
  const LETTER = '(XXS|XS|XXL|XL|2XL|3XL|S|M|L)';

  /*
   * 사이즈 후보 규칙. 글자는 미리 대문자 · 반각으로 바꿔 둔다.
   *  types : 이 규칙이 맞는 옷 종류 (지금 고른 종류와 같으면 먼저 보여준다)
   *  re    : 정규식 (문자열)
   *  format: 맞은 글자 → 칸에 넣을 값
   */
  const SIZE_RULES = [
    // 상의·겉옷 묶음 "100(L)"
    { types: ['top', 'outer'], re: `\\b${TOP_NUM}\\s*\\(\\s*${LETTER}\\s*\\)`, format: (m) => `${m[1]}(${m[2]})` },
    // 하의 "W32 L32"
    { types: ['bottom'], re: '\\bW\\s*(2[6-9]|3\\d|40)\\s*[/X]?\\s*L\\s*(2[4-9]|3\\d)\\b', format: (m) => `W${m[1]} L${m[2]}` },
    // 하의 "32/32"
    { types: ['bottom'], re: '\\b(2[6-9]|3\\d|40)\\s*/\\s*(2[4-9]|3\\d)\\b', format: (m) => `${m[1]}/${m[2]}` },
    // 상의·겉옷 숫자 85~115
    { types: ['top', 'outer'], re: `\\b${TOP_NUM}\\b${NOT_UNIT}`, format: (m) => m[1] },
    // 글자 사이즈
    { types: ['top', 'outer'], re: `(?<![A-Z0-9])${LETTER}(?![A-Z0-9])`, format: (m) => m[1] },
    // 하의 허리 26~40
    { types: ['bottom'], re: `\\b(2[6-9]|3\\d|40)\\b${NOT_UNIT}`, format: (m) => m[1] },
    // 신발 220~300 (5 단위)
    { types: ['acc'], re: `\\b(2[2-9][05]|300)\\b${NOT_UNIT}`, format: (m) => m[1] },
  ];

  /* ===== 사진 손질 ===== */

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 열지 못했어요.')); };
      img.src = url;
    });
  }

  // 긴 변 1200px · 흑백 · 대비 올리기 → canvas
  async function prepare(file) {
    const img = await loadImage(file);
    const scale = Math.min(1, PREPARE.maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    const gray = new Uint8ClampedArray(px.length / 4);
    const hist = new Uint32Array(256);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const g = Math.round(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);
      gray[j] = g;
      hist[g]++;
    }
    // 어둡고 밝은 끝을 잘라 밝기 범위 찾기
    const cut = gray.length * PREPARE.clip;
    let lo = 0, hi = 255, sum = 0;
    for (; lo < 255 && (sum += hist[lo]) < cut; lo++);
    sum = 0;
    for (; hi > 0 && (sum += hist[hi]) < cut; hi--);
    const span = Math.max(1, hi - lo);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const v = ((gray[j] - lo) * 255) / span;
      const c = (v - 128) * PREPARE.contrast + 128;
      px[i] = px[i + 1] = px[i + 2] = c < 0 ? 0 : c > 255 ? 255 : c;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  /* ===== 글자 읽기 (Tesseract) ===== */

  let workerPromise = null;
  let onProgress = null; // 지금 읽는 중인 화면에 진행 상황 전달

  function loadScript() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TESSERACT.script;
      s.onload = resolve;
      s.onerror = () => { s.remove(); reject(new Error('글자 읽기 도구를 받지 못했어요. 인터넷 연결을 확인해 주세요.')); };
      document.head.append(s);
    });
  }

  // 한 번 만든 worker 는 계속 쓴다 (언어 파일을 다시 받지 않게)
  function getWorker() {
    if (!workerPromise) {
      workerPromise = loadScript()
        .then(() => window.Tesseract.createWorker(TESSERACT.langs, 1, {
          workerPath: TESSERACT.workerPath,
          corePath: TESSERACT.corePath,
          logger: (m) => onProgress?.(m),
        }))
        .catch((err) => {
          workerPromise = null;
          throw err.message?.startsWith('글자') ? err : new Error('글자 읽기 준비에 실패했어요. 인터넷 연결을 확인해 주세요.');
        });
    }
    return workerPromise;
  }

  /* ===== 후보 고르기 ===== */

  const clean = (text) => text.normalize('NFKC').toUpperCase();

  /**
   * 사이즈 후보. type(지금 고른 종류)에 맞는 규칙의 후보가 앞에 온다.
   * → [{ value: '100(L)', fits: true }, …]  (같은 값은 한 번만)
   */
  function findSizes(text, type) {
    const src = clean(text);
    const taken = [];
    const found = [];
    for (const rule of SIZE_RULES) {
      for (const m of src.matchAll(new RegExp(rule.re, 'g'))) {
        const start = m.index;
        const end = start + m[0].length;
        if (taken.some(([a, b]) => start < b && end > a)) continue;
        taken.push([start, end]);
        const value = rule.format(m);
        if (!found.some((f) => f.value === value)) found.push({ value, fits: !type || rule.types.includes(type) });
      }
    }
    return [...found.filter((f) => f.fits), ...found.filter((f) => !f.fits)];
  }

  // 전에 넣은 브랜드 중 읽은 글자에 있는 것 (대소문자 · 띄어쓰기 무시, 부분 일치)
  function findBrand(lines, brands) {
    const norm = (s) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
    const all = norm(lines.join(''));
    for (const b of brands) {
      const nb = norm(b);
      if (nb.length < 2) continue;
      if (all.includes(nb)) return b;
      // 택에 브랜드 일부만 찍힌 경우 ("UNIQLO" ↔ 브랜드 "UNIQLO U")
      if (lines.some((l) => { const nl = norm(l); return nl.length >= 3 && nb.includes(nl); })) return b;
    }
    return null;
  }

  /**
   * 택 사진 읽기
   *  opts.type     : 지금 고른 옷 종류 (없으면 '')
   *  opts.brands   : 전에 넣은 브랜드 목록
   *  opts.progress : ({ stage: 'prepare' | 'load' | 'read', progress: 0~1 }) => void
   * → { lines: ['…'], sizes: [{ value, fits }], brand: '유니클로' | null }
   */
  async function read(file, { type = '', brands = [], progress } = {}) {
    progress?.({ stage: 'prepare', progress: 0 });
    const canvas = await prepare(file);
    onProgress = (m) => {
      if (m.status === 'recognizing text') progress?.({ stage: 'read', progress: m.progress });
      else progress?.({ stage: 'load', progress: m.progress ?? 0 });
    };
    progress?.({ stage: 'load', progress: 0 });
    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(canvas);
      const lines = data.text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim())
        .filter((l) => /[0-9A-Za-z가-힣]/.test(l));
      return { lines, sizes: findSizes(lines.join('\n'), type), brand: findBrand(lines, brands) };
    } finally {
      onProgress = null;
    }
  }

  window.TagReader = { read, findSizes, findBrand, prepare };
})();

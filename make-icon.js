/*
 * 홈 화면 아이콘 만들기
 * ------------------------------------------------------------
 * character.js 의 캐릭터를 아래 ICON_OUTFIT 옷차림으로 그려 PNG 두 장을 만든다.
 *   - apple-touch-icon.png (180×180) : 아이폰 홈 화면
 *   - icon-512.png         (512×512) : 안드로이드 · manifest.json
 *
 * 실행:  node make-icon.js
 *   옷을 바꾸려면 ICON_OUTFIT 의 그림 이름(character.js 의 PIECES)만 고치고 다시 실행.
 *   색은 style.css 의 라이트 모드 토큰(--c-…, --bg)을 그대로 읽어 쓴다.
 *
 * 필요한 것: sharp (SVG → PNG). 이 프로젝트엔 node_modules 가 없어서
 *   이 컴퓨터에 이미 깔린 sharp 를 찾아 쓴다. 못 찾으면 `npm i -D sharp` 후 다시 실행.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');

// 아이콘 옷차림 (하의 → 상의 → 겉옷 → 소품 순으로 겹친다. 없으면 null)
const ICON_OUTFIT = {
  bottom: 'jeans',
  top: 'longsleeve',
  outer: 'cardigan',
  acc: null,
};

// 캐릭터에서 잘라 쓸 영역 (상반신 위주, 정사각형). x·y 는 character.js 좌표계
const CROP = { x: 30, y: 16, size: 140 };

const OUTPUTS = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-512.png', size: 512 },
];

const DIR = __dirname;

// sharp 찾기: 프로젝트 → 전역 node_modules → 전역 패키지 안
function loadSharp() {
  const globalRoot = '/usr/local/lib/node_modules';
  const candidates = [
    path.join(DIR, 'package.json'),
    path.join(globalRoot, 'noop.js'),
    ...(fs.existsSync(globalRoot)
      ? fs.readdirSync(globalRoot).map((pkg) => path.join(globalRoot, pkg, 'noop.js'))
      : []),
  ];
  for (const from of candidates) {
    try { return createRequire(from)('sharp'); } catch { /* 다음 후보 */ }
  }
  console.error('sharp 를 찾지 못했어요. 이 폴더에서 `npm i -D sharp` 후 다시 실행해 주세요.');
  process.exit(1);
}

// character.js 를 브라우저 없이 불러와 그림 조각을 꺼낸다
function loadCharacter() {
  const sandbox = { window: {}, console };
  vm.runInNewContext(fs.readFileSync(path.join(DIR, 'character.js'), 'utf8'), sandbox);
  return sandbox.window.Character;
}

// style.css 의 첫 :root { … } (라이트 모드) 에서 --이름: 값 을 읽는다
function loadColors() {
  const css = fs.readFileSync(path.join(DIR, 'style.css'), 'utf8');
  const root = css.match(/:root\s*{([^}]*)}/)[1];
  const colors = {};
  for (const [, name, value] of root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) colors[name] = value.trim();
  return colors;
}

function buildSvg(Character, colors, size) {
  const draw = (key) => {
    if (!Character.PIECES[key]) throw new Error(`character.js 에 '${key}' 그림이 없어요`);
    return Character.PIECES[key]();
  };
  const layers = Character.LAYERS
    .map((name) => [].concat(ICON_OUTFIT[name] ?? []).map(draw).join(''))
    .join('');

  // 아이콘에선 바닥 그림자가 필요 없다
  const base = Character.BASE.replace(/<ellipse[^>]*fill="var\(--c-floor\)"[^>]*\/>/, '');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="${CROP.x} ${CROP.y} ${CROP.size} ${CROP.size}">` +
    `<rect x="${CROP.x - 1}" y="${CROP.y - 1}" width="${CROP.size + 2}" height="${CROP.size + 2}" fill="var(--bg)"/>` +
    base + layers +
    '</svg>';

  // SVG 변환기는 CSS 변수를 모르므로 실제 색으로 바꿔 넣는다
  return svg.replace(/var\(--([\w-]+)\)/g, (_, name) => {
    if (!(name in colors)) throw new Error(`style.css 에 --${name} 색이 없어요`);
    return colors[name];
  });
}

async function main() {
  const sharp = loadSharp();
  const Character = loadCharacter();
  const colors = loadColors();

  for (const { file, size } of OUTPUTS) {
    const svg = buildSvg(Character, colors, size);
    await sharp(Buffer.from(svg))
      .flatten({ background: colors.bg }) // 투명 픽셀 없이
      .png()
      .toFile(path.join(DIR, file));
    console.log(`만듦: ${file} (${size}×${size})`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

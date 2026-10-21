/*
 * 옷장 데이터
 * ------------------------------------------------------------
 * 옷 목록은 JSON 배열 하나로 저장한다. 내보내기 파일도 이 배열 그대로다.
 * 지금은 localStorage 에 두고, 다른 저장소(서버·IndexedDB 등)로 옮길 땐 아래 STORE 의
 * load · save 두 함수만 바꾸면 된다.
 *
 * 옷 한 벌의 모양:
 *   {
 *     id: 'mf3k2a9x1c',      // 고유 값
 *     type: 'top',           // top 상의 · bottom 하의 · outer 겉옷 · acc 소품
 *     name: '회색 맨투맨',
 *     color: '#9a9da3',      // #rrggbb
 *     warmth: 3,             // 따뜻한 정도 1(한여름 반팔) ~ 5(패딩)
 *     photo: null,           // 'data:image/jpeg;base64,…' (긴 변 300px) 또는 null
 *     createdAt: 1760000000000,
 *     updatedAt: 1760000000000,
 *   }
 */
(function () {
  const TYPES = { top: '상의', bottom: '하의', outer: '겉옷', acc: '소품' };
  const WARMTH_MIN = 1;
  const WARMTH_MAX = 5;
  const PHOTO_MAX = 300; // 사진 긴 변(px)
  const HEX = /^#[0-9a-f]{6}$/i;

  /*
   * 캐릭터에 입힐 그림 고르기 (character.js 의 PIECES 이름)
   *  1. 이름에 아래 낱말이 있으면 그 그림 (위에서부터 먼저 맞는 것)
   *  2. 없으면 따뜻한 정도 1~5 에 맞춘 그림
   */
  const ART_BY_NAME = {
    top: [
      [/민소매|나시|탱크/, 'tank'], [/반팔|반소매|티셔츠/, 'tshirt'], [/셔츠|블라우스|남방/, 'shirt'],
      [/맨투맨|후드|스웻/, 'sweatshirt'], [/니트|스웨터|터틀/, 'knit'], [/긴팔/, 'longsleeve'],
    ],
    bottom: [
      [/반바지|숏/, 'shorts'], [/청바지|데님/, 'jeans'], [/기모|내복|레깅스/, 'warmpants'],
      [/슬랙스|정장|면바지|치노/, 'slacks'],
    ],
    outer: [
      [/가디건/, 'cardigan'], [/바람막이|윈드|후리스|플리스|점퍼/, 'windbreaker'], [/트렌치/, 'trench'],
      [/패딩|다운/, 'padding'], [/코트/, 'coat'], [/재킷|자켓|블레이저|블루종/, 'jacket'],
    ],
    acc: [
      [/선글라스/, 'sunglasses'], [/비니/, 'beanie'], [/모자|캡|버킷/, 'cap'], [/장갑/, 'gloves'],
      [/목도리|머플러/, 'muffler'], [/스카프/, 'scarf'], [/우산/, 'umbrella'],
    ],
  };
  const ART_BY_WARMTH = {
    //        1          2             3             4         5
    top:    ['tshirt',   'longsleeve', 'sweatshirt', 'knit',   'knit'],
    bottom: ['shorts',   'slacks',     'jeans',      'jeans',  'warmpants'],
    outer:  ['cardigan', 'cardigan',   'jacket',     'coat',   'padding'],
    acc:    ['cap',      'cap',        'scarf',      'muffler', 'muffler'],
  };

  /* ===== 저장소: 여기만 바꾸면 다른 곳으로 옮길 수 있다 ===== */
  const STORE = {
    KEY: 'outfit.wardrobe.v1',
    load() {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    },
    save(list) {
      localStorage.setItem(this.KEY, JSON.stringify(list));
    },
  };

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // 들어온 값을 옷 한 벌 모양으로 다듬는다. 쓸 수 없는 값이면 null
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.name ?? '').trim().slice(0, 40);
    if (!TYPES[raw.type] || !name) return null;
    const color = HEX.test(raw.color) ? raw.color.toLowerCase() : '#9a9da3';
    const warmth = Math.min(WARMTH_MAX, Math.max(WARMTH_MIN, Math.round(Number(raw.warmth)) || 3));
    const photo = typeof raw.photo === 'string' && raw.photo.startsWith('data:image/') ? raw.photo : null;
    const now = Date.now();
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
      type: raw.type,
      name,
      color,
      warmth,
      photo,
      createdAt: Number(raw.createdAt) || now,
      updatedAt: Number(raw.updatedAt) || now,
    };
  }

  function loadItems() {
    try {
      const list = STORE.load();
      return Array.isArray(list) ? list.map(normalize).filter(Boolean) : [];
    } catch (err) {
      console.warn('옷장 불러오기 실패:', err);
      return [];
    }
  }

  let items = loadItems();
  const listeners = [];

  // 저장에 성공했을 때만 바꾼 목록을 쓴다
  function commit(next) {
    try {
      STORE.save(next);
    } catch (err) {
      const full = err?.name === 'QuotaExceededError' || err?.code === 22;
      throw new Error(full ? '저장 공간이 부족해요. 사진을 빼고 다시 해 보세요.' : '저장하지 못했어요.');
    }
    items = next;
    listeners.forEach((fn) => fn(items));
  }

  /* ===== 바깥에서 쓰는 함수 ===== */

  function list() { return items.slice(); }
  function get(id) { return items.find((it) => it.id === id) || null; }

  function add(fields) {
    const item = normalize({ ...fields, id: newId(), createdAt: Date.now(), updatedAt: Date.now() });
    if (!item) throw new Error('종류와 이름을 넣어 주세요.');
    commit([...items, item]);
    return item;
  }

  function update(id, fields) {
    const old = get(id);
    if (!old) throw new Error('이미 지워진 옷이에요.');
    const item = normalize({ ...old, ...fields, id, createdAt: old.createdAt, updatedAt: Date.now() });
    if (!item) throw new Error('종류와 이름을 넣어 주세요.');
    commit(items.map((it) => (it.id === id ? item : it)));
    return item;
  }

  function remove(id) {
    commit(items.filter((it) => it.id !== id));
  }

  // 가져오기: 지금 목록을 통째로 바꾼다
  function replaceAll(next) {
    commit(next);
  }

  function exportText() {
    return JSON.stringify(items, null, 2);
  }

  // 백업 파일 글자 → 옷 목록. 옷장 파일이 아니면 Error
  function parseImport(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('JSON 파일이 아니에요.'); }
    const raw = Array.isArray(data) ? data : data?.items;
    if (!Array.isArray(raw)) throw new Error('옷장 백업 파일이 아니에요.');
    const seen = new Set();
    const result = raw.map(normalize).filter(Boolean).map((it) => {
      if (seen.has(it.id)) it.id = newId();
      seen.add(it.id);
      return it;
    });
    if (raw.length && !result.length) throw new Error('파일에서 옷을 찾지 못했어요.');
    return result;
  }

  function onChange(fn) { listeners.push(fn); }

  function artFor(item) {
    const byName = (ART_BY_NAME[item.type] || []).find(([re]) => re.test(item.name));
    if (byName) return byName[1];
    return ART_BY_WARMTH[item.type][item.warmth - 1];
  }

  // 사진 파일 → 긴 변 300px JPEG data URL
  function resizePhoto(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // 투명한 부분은 흰 바탕으로
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('사진을 열지 못했어요.'));
      };
      img.src = url;
    });
  }

  window.Wardrobe = {
    TYPES, WARMTH_MIN, WARMTH_MAX,
    list, get, add, update, remove, replaceAll, exportText, parseImport, onChange, artFor, resizePhoto,
  };
})();

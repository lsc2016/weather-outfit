/*
 * 옷장 탭 화면
 * ------------------------------------------------------------
 * 목록 · 옷 추가/수정 시트 · 백업(내보내기/가져오기).
 * 데이터는 모두 wardrobe.js 의 Wardrobe 를 거친다.
 */
(function () {
  // 색 팔레트 (이름, 색). 무채색(검정·흰·회·베이지)은 추천에서 뭐든 어울리는 색으로 친다
  const PALETTE = [
    ['검정', '#222222'], ['흰색', '#f7f7f4'], ['회색', '#9a9da3'], ['베이지', '#dccbad'],
    ['네이비', '#1f2d4d'], ['파랑', '#3b6fd8'], ['하늘', '#9cc8ef'], ['초록', '#4f9a5b'],
    ['카키', '#6f6a3e'], ['갈색', '#7b5536'], ['빨강', '#d8403b'], ['분홍', '#f2a6b9'],
    ['주황', '#ee8a3a'], ['노랑', '#f3cf4b'], ['보라', '#8a64c4'],
  ];

  const WARMTH_HINT = {
    1: '한여름 · 반팔, 반바지, 민소매',
    2: '늦봄·초가을 · 얇은 긴팔, 면바지, 가디건',
    3: '봄·가을 · 맨투맨, 청바지, 재킷',
    4: '쌀쌀할 때 · 니트, 기모, 코트',
    5: '한겨울 · 패딩, 두꺼운 니트, 목도리',
  };

  const LONG_PRESS_MS = 450;
  const HEX = /^#?[0-9a-f]{6}$/i;

  const $ = (id) => document.getElementById(id);
  const dialog = $('itemDialog');
  const form = $('itemForm');

  // 편집 중인 옷 (null 이면 새 옷)
  const edit = { id: null, color: PALETTE[2][1], photo: null };

  /* ===== 목록 ===== */

  function colorDot(color) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = color;
    return dot;
  }

  function renderList() {
    const items = Wardrobe.list();
    $('closetCount').textContent = items.length ? `${items.length}벌` : '';
    const host = $('closetList');
    host.textContent = '';

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'closet-empty';
      empty.textContent = '아직 옷이 없어요. “+ 옷 추가”로 첫 옷을 넣어 보세요. 넣은 옷으로 오늘 탭에서 조합을 추천해요.';
      host.append(empty);
      return;
    }

    for (const [type, label] of Object.entries(Wardrobe.TYPES)) {
      const group = items
        .filter((it) => it.type === type)
        .sort((a, b) => a.warmth - b.warmth || a.name.localeCompare(b.name, 'ko'));

      const section = document.createElement('section');
      section.className = 'closet-group';
      const h = document.createElement('h2');
      h.textContent = label;
      const n = document.createElement('span');
      n.textContent = group.length;
      h.append(' ', n);
      section.append(h);

      if (!group.length) {
        const none = document.createElement('p');
        none.className = 'closet-none';
        none.textContent = '아직 없어요';
        section.append(none);
      } else {
        const ul = document.createElement('ul');
        ul.className = 'closet-items';
        for (const it of group) ul.append(itemRow(it));
        section.append(ul);
      }
      host.append(section);
    }
  }

  function itemRow(it) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'closet-item';
    btn.dataset.id = it.id;
    const fit = it.fit ? Wardrobe.FITS[it.fit] : '';
    const meta = [it.size, fit].filter(Boolean).join(' · ');
    btn.setAttribute('aria-label', `${it.name}${meta ? `, ${meta}` : ''}, 따뜻한 정도 ${it.warmth}. 눌러서 수정·삭제`);

    const name = document.createElement('span');
    name.className = 'ci-name';
    name.textContent = it.name;
    btn.append(colorDot(it.color), name);

    // 라벨 사이즈 · 맞음 (딱 맞음은 강조색 점)
    if (meta) {
      const tag = document.createElement('span');
      tag.className = `ci-meta${it.fit ? ` fit-${it.fit}` : ''}`;
      tag.setAttribute('aria-hidden', 'true');
      tag.textContent = meta;
      btn.append(tag);
    }

    if (it.photo) {
      const img = document.createElement('img');
      img.className = 'ci-photo';
      img.src = it.photo;
      img.alt = '';
      btn.append(img);
    }

    const warmth = document.createElement('span');
    warmth.className = 'ci-warmth';
    warmth.setAttribute('aria-hidden', 'true');
    for (let i = 1; i <= Wardrobe.WARMTH_MAX; i++) {
      const pip = document.createElement('i');
      if (i <= it.warmth) pip.className = 'on';
      warmth.append(pip);
    }
    btn.append(warmth);

    li.append(btn);
    return li;
  }

  // 톡 누르거나 길게 누르면 수정 시트
  function bindList() {
    const host = $('closetList');
    let timer = null;
    let start = null;
    let fired = false;

    const cancel = () => { clearTimeout(timer); timer = null; };

    host.addEventListener('pointerdown', (e) => {
      const row = e.target.closest('.closet-item');
      if (!row) return;
      fired = false;
      start = { x: e.clientX, y: e.clientY };
      cancel();
      timer = setTimeout(() => {
        fired = true;
        openEditor(row.dataset.id);
      }, LONG_PRESS_MS);
    });
    host.addEventListener('pointermove', (e) => {
      if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel();
    });
    host.addEventListener('pointerup', cancel);
    host.addEventListener('pointercancel', cancel);
    host.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.closet-item')) e.preventDefault();
    });
    host.addEventListener('click', (e) => {
      const row = e.target.closest('.closet-item');
      if (!row) return;
      if (fired) { fired = false; return; } // 길게 눌러 이미 열었다
      openEditor(row.dataset.id);
    });
  }

  /* ===== 추가 · 수정 시트 ===== */

  function buildSwatches() {
    const host = $('swatches');
    for (const [name, color] of PALETTE) {
      const label = document.createElement('label');
      label.className = 'swatch';
      label.title = name;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'swatch';
      input.value = color;
      input.setAttribute('aria-label', name);
      const chip = colorDot(color);
      label.append(input, chip);
      host.append(label);
    }
  }

  function setColor(color) {
    edit.color = color.toLowerCase();
    for (const r of form.querySelectorAll('input[name="swatch"]')) r.checked = r.value === edit.color;
    $('colorPicker').value = edit.color;
    if (document.activeElement !== $('colorHex')) $('colorHex').value = edit.color;
  }

  function setPhoto(dataUrl) {
    edit.photo = dataUrl;
    const img = $('photoPreview');
    img.hidden = !dataUrl;
    if (dataUrl) img.src = dataUrl; else img.removeAttribute('src');
    $('photoRemoveBtn').hidden = !dataUrl;
  }

  function setWarmthHint() {
    const v = form.elements.warmth.value;
    $('warmthHint').textContent = v ? `${v} = ${WARMTH_HINT[v]}` : '1 한여름 반팔 ~ 5 패딩';
  }

  /* --- 치수 칸: 종류에 따라 바뀐다 --- */

  function readMeasures() {
    const out = {};
    for (const input of $('measureFields').querySelectorAll('input')) {
      if (input.value.trim()) out[input.dataset.key] = input.value.trim();
    }
    return out;
  }

  function updateMeasureCount() {
    const n = Object.keys(readMeasures()).length;
    $('measureCount').textContent = n ? `${n}칸 입력됨` : '옷을 펴 놓고 잰 값';
  }

  // values: { chest: 53, … }. 종류를 바꿔도 같은 이름 칸(예: 총장)의 값은 남긴다
  function renderMeasureFields(type, values = {}) {
    const host = $('measureFields');
    host.textContent = '';
    const fields = Wardrobe.MEASURES[type];
    if (!fields) {
      const p = document.createElement('p');
      p.className = 'field-hint';
      p.textContent = '종류를 먼저 고르면 칸이 나와요.';
      host.append(p);
    } else {
      for (const m of fields) {
        const label = document.createElement('label');
        label.className = 'measure-field';
        const text = document.createElement('span');
        text.textContent = m.note ? `${m.label} (${m.note})` : m.label;
        const box = document.createElement('span');
        box.className = 'measure-input';
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.maxLength = 6;
        input.dataset.key = m.key;
        input.value = values[m.key] ?? '';
        const unit = document.createElement('small');
        unit.textContent = m.unit;
        box.append(input, unit);
        label.append(text, box);
        host.append(label);
      }
    }
    updateMeasureCount();
  }

  function fillBrandList() {
    const list = $('brandList');
    list.textContent = '';
    for (const b of Wardrobe.brands()) {
      const opt = document.createElement('option');
      opt.value = b;
      list.append(opt);
    }
  }

  /* --- 택 찍기: 읽은 값은 칸에만 채우고, 저장은 저장 버튼으로 --- */

  const TAG_STAGE = {
    prepare: '사진 손질 중…',
    load: '글자 읽기 준비 중… (처음 한 번은 언어 파일을 받느라 느려요)',
    read: '읽는 중…',
  };
  let tagRun = 0; // 시트를 닫거나 다시 찍으면 이전 읽기 결과는 버린다

  function resetTag() {
    tagRun++;
    $('tagPanel').hidden = true;
    $('tagSizes').hidden = true;
    $('tagSizes').textContent = '';
    $('tagText').hidden = true;
    $('tagText').open = false;
    $('tagLines').textContent = '';
    $('tagBtn').disabled = false;
    $('itemSize').classList.remove('from-tag');
    $('itemBrand').classList.remove('from-tag');
  }

  // 택에서 읽은 값은 강조 테두리로 "확인해 주세요" 표시 (손으로 고치면 사라짐)
  function fillFromTag(id, value) {
    const input = $(id);
    input.value = value.trim().slice(0, input.maxLength);
    input.classList.add('from-tag');
  }

  function tagStatus(text) {
    $('tagStatus').textContent = text;
  }

  async function scanTag(file) {
    const run = ++tagRun;
    $('tagBtn').disabled = true;
    $('tagPanel').hidden = false;
    $('tagSizes').hidden = true;
    $('tagText').hidden = true;
    const bar = $('tagProgress');
    bar.hidden = false;
    bar.value = 0;
    tagStatus('읽는 중…');
    try {
      const result = await TagReader.read(file, {
        type: form.elements.type.value,
        brands: Wardrobe.brands(),
        progress: ({ stage, progress }) => {
          if (run !== tagRun) return;
          tagStatus(TAG_STAGE[stage]);
          bar.value = progress;
        },
      });
      if (run === tagRun) showTagResult(result);
    } catch (err) {
      if (run === tagRun) tagStatus(err.message);
    } finally {
      if (run === tagRun) {
        $('tagBtn').disabled = false;
        bar.hidden = true;
      }
    }
  }

  function showTagResult({ lines, sizes, brand }) {
    if (!lines.length) {
      tagStatus('글자를 못 읽었어요. 택을 펴서 밝은 데서 다시 찍어 보세요.');
      return;
    }
    renderTagLines(lines);

    // 사이즈: 지금 종류에 맞는 후보가 하나면 채우고, 여럿이면 고르는 버튼
    const fitting = sizes.filter((f) => f.fits);
    const filled = [];
    let choose = false;
    if (fitting.length === 1) {
      fillFromTag('itemSize', fitting[0].value);
      filled.push(`사이즈 ${fitting[0].value}`);
    } else if (sizes.length) {
      renderSizeChoices((fitting.length ? fitting : sizes).slice(0, 6));
      choose = true;
    }
    if (brand) {
      fillFromTag('itemBrand', brand);
      filled.push(`브랜드 ${brand}`);
    } else {
      $('tagText').open = true; // 브랜드는 읽은 줄에서 골라 넣게
    }

    const msg = [];
    if (filled.length) msg.push(`택에서 읽었어요: ${filled.join(' · ')}. 맞는지 확인하고 저장해 주세요.`);
    if (choose) msg.push('사이즈 후보가 여럿이에요. 맞는 것을 눌러 주세요.');
    else if (!sizes.length) msg.push('사이즈는 못 찾았어요.');
    if (!brand) msg.push('브랜드는 아래 “읽은 글자 보기”에서 줄을 눌러 넣을 수 있어요.');
    tagStatus(msg.join(' '));
  }

  function renderSizeChoices(list) {
    const host = $('tagSizes');
    host.textContent = '';
    host.hidden = false;
    host.append(Object.assign(document.createElement('span'), { className: 'tag-choices-label', textContent: '사이즈 후보' }));
    for (const f of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-chip';
      b.textContent = f.value;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        fillFromTag('itemSize', f.value);
        for (const x of host.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
      });
      host.append(b);
    }
  }

  // 읽은 줄 → 톡 누르면 "라벨 사이즈에 / 브랜드에" 고르기
  function renderTagLines(lines) {
    const host = $('tagLines');
    host.textContent = '';
    $('tagText').hidden = false;
    for (const line of lines) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-line';
      btn.textContent = line;
      btn.addEventListener('click', () => {
        const open = li.querySelector('.tag-pick');
        host.querySelectorAll('.tag-pick').forEach((n) => n.remove());
        if (open) return; // 같은 줄을 다시 누르면 닫기
        const pick = document.createElement('div');
        pick.className = 'tag-pick';
        for (const [label, id] of [['라벨 사이즈에', 'itemSize'], ['브랜드에', 'itemBrand']]) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip-btn';
          b.textContent = label;
          b.addEventListener('click', () => { fillFromTag(id, line); pick.remove(); });
          pick.append(b);
        }
        li.append(pick);
      });
      li.append(btn);
      host.append(li);
    }
  }

  function showDeleteConfirm(show) {
    $('deleteConfirm').hidden = !show;
    $('sheetActions').hidden = show;
  }

  // id 가 있으면 그 옷 수정, 없으면 새 옷. prefill = { type, name, color, warmth } 로 미리 채울 수 있다
  function openEditor(id = null, prefill = null) {
    const item = id ? Wardrobe.get(id) : null;
    const start = item || prefill || {};
    edit.id = item ? item.id : null;
    form.reset();
    $('formError').textContent = '';
    showDeleteConfirm(false);

    $('itemDialogTitle').textContent = item ? '옷 수정' : '옷 추가';
    $('deleteBtn').hidden = !item;
    form.elements.type.value = start.type || '';
    $('itemName').value = start.name || '';
    form.elements.warmth.value = start.warmth ? String(start.warmth) : '';
    setColor(/^#[0-9a-f]{6}$/i.test(start.color) ? start.color : PALETTE[2][1]);
    setPhoto(start.photo || null);
    setWarmthHint();
    form.elements.fit.value = start.fit || '';
    $('itemSize').value = start.size || '';
    $('itemBrand').value = start.brand || '';
    fillBrandList();
    renderMeasureFields(start.type, start.measures || {});
    $('measureBox').open = false;
    resetTag();

    dialog.showModal();
    if (!item) $('itemName').blur(); // 열자마자 키보드가 올라오지 않게
  }

  function closeEditor() {
    tagRun++; // 읽는 중이던 결과는 버린다
    if (dialog.open) dialog.close();
  }

  function save(e) {
    e.preventDefault();
    const fields = {
      type: form.elements.type.value,
      name: $('itemName').value.trim(),
      color: edit.color,
      warmth: Number(form.elements.warmth.value),
      photo: edit.photo,
      fit: form.elements.fit.value || null,
      size: $('itemSize').value.trim(),
      brand: $('itemBrand').value.trim(),
      measures: readMeasures(),
    };
    const missing = [!fields.type && '종류', !fields.name && '이름', !fields.warmth && '따뜻한 정도'].filter(Boolean);
    if (missing.length) {
      $('formError').textContent = `아직 안 채운 칸: ${missing.join(', ')}`;
      return;
    }
    try {
      if (edit.id) Wardrobe.update(edit.id, fields);
      else Wardrobe.add(fields);
      closeEditor();
    } catch (err) {
      $('formError').textContent = err.message;
    }
  }

  function bindEditor() {
    form.addEventListener('submit', save);
    $('closeDialogBtn').addEventListener('click', closeEditor);
    // 시트 바깥(어두운 배경)을 누르면 닫기
    dialog.addEventListener('click', (e) => { if (e.target === dialog) closeEditor(); });

    $('swatches').addEventListener('change', (e) => {
      if (e.target.name === 'swatch') setColor(e.target.value);
    });
    $('colorPicker').addEventListener('input', (e) => setColor(e.target.value));
    $('colorHex').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (HEX.test(v)) setColor(v.startsWith('#') ? v : `#${v}`);
    });
    $('colorHex').addEventListener('blur', () => { $('colorHex').value = edit.color; });

    form.addEventListener('change', (e) => {
      if (e.target.name === 'warmth') setWarmthHint();
      if (e.target.name === 'type') renderMeasureFields(e.target.value, readMeasures());
    });
    $('measureFields').addEventListener('input', updateMeasureCount);

    // 맞음: 이미 고른 버튼을 다시 누르면 해제 (선택 사항이라)
    let fitBefore = null;
    $('fitSeg').addEventListener('pointerdown', () => { fitBefore = form.elements.fit.value; });
    $('fitSeg').addEventListener('click', (e) => {
      if (e.target.name !== 'fit') return;
      if (fitBefore && e.target.value === fitBefore) e.target.checked = false;
      fitBefore = null;
    });

    $('photoInput').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        setPhoto(await Wardrobe.resizePhoto(file));
        $('formError').textContent = '';
      } catch (err) {
        $('formError').textContent = err.message;
      }
    });
    $('photoRemoveBtn').addEventListener('click', () => setPhoto(null));

    $('tagBtn').addEventListener('click', () => $('tagInput').click());
    $('tagInput').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) scanTag(file);
    });
    for (const id of ['itemSize', 'itemBrand']) {
      $(id).addEventListener('input', () => $(id).classList.remove('from-tag'));
    }

    $('deleteBtn').addEventListener('click', () => {
      $('deleteName').textContent = Wardrobe.get(edit.id)?.name ?? '';
      showDeleteConfirm(true);
    });
    $('deleteCancelBtn').addEventListener('click', () => showDeleteConfirm(false));
    $('deleteOkBtn').addEventListener('click', () => {
      try {
        Wardrobe.remove(edit.id);
        closeEditor();
      } catch (err) {
        showDeleteConfirm(false);
        $('formError').textContent = err.message;
      }
    });
  }

  /* ===== 백업 ===== */

  function setStatus(text) {
    $('backupStatus').textContent = text;
  }

  function exportFile() {
    const count = Wardrobe.list().length;
    const blob = new Blob([Wardrobe.exportText()], { type: 'application/json' });
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `옷장-${ymd}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus(`내보냈어요: 옷 ${count}벌 · 내 사이즈 · 살 옷 메모`);
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const backup = Wardrobe.parseImport(await file.text());
      const n = backup.wardrobe.length;
      const now = Wardrobe.list().length;
      const also = backup.labels.length ? `\n${backup.labels.join(' · ')}도 파일 내용으로 바뀌어요.` : '';
      const msg = now
        ? `지금 옷장(${now}벌)을 파일의 옷 ${n}벌로 바꿀까요?\n지금 옷장 내용은 사라져요.${also}`
        : `파일의 옷 ${n}벌을 가져올까요?${also}`;
      if (!window.confirm(msg)) return;
      Wardrobe.importBackup(backup);
      setStatus(`가져왔어요: ${[`옷 ${n}벌`, ...backup.labels].join(' · ')}`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  /* ===== 시작 ===== */

  buildSwatches();
  bindList();
  bindEditor();
  $('addBtn').addEventListener('click', () => openEditor());
  $('exportBtn').addEventListener('click', exportFile);
  $('importInput').addEventListener('change', importFile);
  Wardrobe.onChange(renderList);
  renderList();

  // 나 탭(me.js)에서 "샀어요" → 미리 채운 옷 추가 시트를 연다
  window.Closet = { openEditor };
})();

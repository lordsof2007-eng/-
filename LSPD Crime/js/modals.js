function closeModal(){
  document.getElementById('modalRoot').innerHTML = '';
  state.pendingPos = null;
}

function shake(el){
  el.style.transition = 'transform .1s';
  el.style.transform = 'translateX(4px)';
  setTimeout(()=>{ el.style.transform = 'translateX(-4px)'; }, 80);
  setTimeout(()=>{ el.style.transform = ''; }, 160);
}

function openViewModal(id){
  const loc = state.locations.find(l=>l.id===id);
  if(!loc) return;
  const cat = FranklinMorgenCATS[loc.category];
  const root = document.getElementById('modalRoot');
  const canEdit   = typeof auth === 'undefined' || auth.can('edit');
  const canDelete = typeof auth === 'undefined' || auth.can('delete');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal view-modal">
      <h2>${icon(cat.icon)} ${escapeHtml(loc.name)}</h2>
      <div style="margin-bottom:10px;">
        <span class="loc-cat">${icon(cat.icon)} ${cat.label}</span>
        ${loc.incidentAt ? `<div class="loc-date" style="margin-top:8px;">${icon('calendar')} ${formatDate(loc.incidentAt)}</div>` : ''}
        ${loc.coords ? `<div class="loc-coords mono" style="margin-top:8px;">${icon('crosshair',{cls:'ic'})} ${escapeHtml(loc.coords)}</div>` : ''}
        ${loc.notes  ? `<div class="loc-notes" style="margin-top:8px;">${escapeHtml(loc.notes)}</div>` : ''}
      </div>
      ${(loc.changelog && loc.changelog.length) ? `
        <div class="changelog">
          <div class="changelog-title">${icon('clock')} سجل التعديلات</div>
          ${loc.changelog.slice().reverse().map(e=>`
            <div class="changelog-entry">
              <span class="changelog-action role-${e.role||'viewer'}">${e.action==='added'?'أُضيف':'عُدّل'}</span>
              <span class="changelog-by">${escapeHtml(e.by||'؟')}</span>
              <span class="changelog-time">${formatDate(e.at)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${loc.image
        ? `<div class="view-image-wrap"><img src="${loc.image}" alt="${escapeHtml(loc.name)}"></div>`
        : `<div class="view-image-empty">${icon('camera',{cls:'ic'})}<span>لا توجد صورة مضافة لهذا الموقع بعد</span></div>`
      }
      <div class="modal-actions">
        ${canDelete ? `<button class="btn btn-danger"  id="viewDeleteBtn">${icon('trash')} حذف</button>` : ''}
        <button class="btn btn-ghost"   id="viewCloseBtn">إغلاق</button>
        ${canEdit   ? `<button class="btn btn-primary" id="viewEditBtn">${icon('edit')} تعديل</button>` : ''}
      </div>
    </div>
  `;
  root.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) root.innerHTML = ''; });
  overlay.querySelector('#viewCloseBtn').onclick = ()=>{ root.innerHTML = ''; };
  const editBtn = overlay.querySelector('#viewEditBtn');
  if(editBtn) editBtn.onclick = ()=>{ root.innerHTML = ''; openModal(loc.id); };
  const delBtn = overlay.querySelector('#viewDeleteBtn');
  if(delBtn) delBtn.onclick = ()=>{ root.innerHTML = ''; deleteLocation(loc.id); };
}

function openClusterModal(cluster){
  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const itemsHtml = cluster.locs.map(loc=>{
    const cat = FranklinMorgenCATS[loc.category];
    return `
      <div class="cluster-item" data-id="${loc.id}" style="--cat-color:${cat.color}">
        <div class="cluster-item-icon" style="color:${cat.color}">${icon(cat.icon)}</div>
        <div>
          <div class="cluster-item-name">${escapeHtml(loc.name)}</div>
          <div class="cluster-item-cat">${cat.label}</div>
        </div>
      </div>
    `;
  }).join('');
  overlay.innerHTML = `
    <div class="modal" style="width:380px;">
      <h2>${icon('layers')} ${cluster.locs.length} مواقع في هذه المنطقة</h2>
      <p style="color:var(--text-3);font-size:12px;margin-bottom:12px;">اختر الموقع الذي تريد عرضه:</p>
      <div class="cluster-list">${itemsHtml}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="clusterCloseBtn">إغلاق</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);
  overlay.querySelectorAll('.cluster-item').forEach(item=>{
    item.onclick = ()=>{ root.innerHTML = ''; openViewModal(item.dataset.id); };
  });
  overlay.querySelector('#clusterCloseBtn').onclick = ()=> root.innerHTML = '';
  overlay.addEventListener('click', e=>{ if(e.target===overlay) root.innerHTML=''; });
}

function openModal(editId){
  state.editingId = editId;
  const existing = editId ? state.locations.find(l=>l.id===editId) : null;
  const root = document.getElementById('modalRoot');

  let selectedCat = existing ? existing.category : null;
  let currentImage = existing ? (existing.image || null) : null;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal${currentImage ? ' has-image' : ''}" id="locModal">
      <h2>${existing ? icon('edit') + ' تعديل الموقع' : icon('pin') + ' إضافة موقع جديد'}</h2>
      <div class="modal-body">
        <div class="modal-image-col" id="modalImageCol">
          <div class="img-preview-wrap">
            <img id="imgPreview" src="${currentImage || ''}" alt="صورة الموقع">
            <button type="button" class="img-remove-btn" id="imgRemoveBtn" title="إزالة الصورة">${icon('x')}</button>
          </div>
        </div>
        <div class="modal-fields-col">
          <div class="field">
            <label>اسم الموقع</label>
            <input type="text" id="f_name" placeholder="مثال: بنك فليكا - وسط المدينة" value="${existing ? escapeHtml(existing.name) : ''}">
          </div>
          <div class="field">
            <label>نوع السرقة</label>
            <div class="cat-grid" id="catGrid"></div>
          </div>
          <div class="field">
            <label>إحداثيات داخل اللعبة (اختياري)</label>
            <input type="text" id="f_coords" class="mono" placeholder="مثال: 215.4, -800.2, 30.0" value="${existing ? escapeHtml(existing.coords||'') : ''}">
            <div class="field-hint">اكتبها بصيغة x, y, z حتى تقدر تصدّرها لاحقاً لسكربت السيرفر</div>
          </div>
          <div class="field">
            <label>ملاحظات (اختياري)</label>
            <textarea id="f_notes" placeholder="تفاصيل، مستوى الحراسة، أفضل وقت...">${existing ? escapeHtml(existing.notes||'') : ''}</textarea>
          </div>
          <div class="field">
            <label>تاريخ ووقت السرقة (اختياري)</label>
            <input type="datetime-local" id="f_incidentAt" value="${existing && existing.incidentAt ? toDatetimeLocal(existing.incidentAt) : ''}">
            <div class="field-hint">يتيح فلترة "اليوم / هذا الأسبوع" في الشريط الجانبي</div>
          </div>
          <div class="field">
            <label>صورة الموقع (اختياري)</label>
            <input type="file" id="f_image" accept="image/*" style="display:none">
            <button type="button" class="btn btn-ghost" id="imgPickBtn" style="width:100%">${currentImage ? icon('refresh') + ' تغيير الصورة' : icon('imagePlus') + ' إضافة صورة'}</button>
            <div class="field-hint">تظهر الصورة واضحة بجانب التفاصيل عند فتح الموقع — اضغط ✕ على الصورة لإزالتها</div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancelBtn">إلغاء</button>
        <button class="btn btn-primary" id="saveBtn">${existing ? 'حفظ التعديل' : 'إضافة الموقع'}</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);

  const grid = overlay.querySelector('#catGrid');
  CAT_KEYS.forEach(key=>{
    const cat = FranklinMorgenCATS[key];
    const opt = document.createElement('div');
    opt.className = 'cat-option' + (selectedCat===key ? ' selected' : '');
    opt.style.setProperty('--cat-color', cat.color);
    opt.innerHTML = icon(cat.icon) + ' ' + cat.label;
    opt.onclick = ()=>{
      selectedCat = key;
      grid.querySelectorAll('.cat-option').forEach(o=>o.classList.remove('selected'));
      opt.classList.add('selected');
    };
    grid.appendChild(opt);
  });

  const modalEl = overlay.querySelector('#locModal');
  const imgPreview = overlay.querySelector('#imgPreview');
  const imgPickBtn = overlay.querySelector('#imgPickBtn');
  const imgFileInput = overlay.querySelector('#f_image');

  function syncImageUI(){
    modalEl.classList.toggle('has-image', !!currentImage);
    imgPreview.src = currentImage || '';
    imgPickBtn.innerHTML = currentImage ? icon('refresh') + ' تغيير الصورة' : icon('imagePlus') + ' إضافة صورة';
  }

  imgPickBtn.onclick = ()=> imgFileInput.click();
  overlay.querySelector('#imgRemoveBtn').onclick = (e)=>{
    e.stopPropagation();
    currentImage = null;
    imgFileInput.value = '';
    syncImageUI();
  };
  imgFileInput.addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    try{
      currentImage = await compressImageToDataUrl(file, 900, 0.78);
      syncImageUI();
    }catch(err){
      showToast('تعذر تحميل هذي الصورة، جرّب صورة أخرى', null, 'error');
    }
  });

  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });
  overlay.querySelector('#cancelBtn').onclick = closeModal;
  overlay.querySelector('#saveBtn').onclick = ()=>{
    const name        = overlay.querySelector('#f_name').value.trim();
    const coords      = overlay.querySelector('#f_coords').value.trim();
    const notes       = overlay.querySelector('#f_notes').value.trim();
    const incidentRaw = overlay.querySelector('#f_incidentAt').value;
    const incidentAt  = incidentRaw ? new Date(incidentRaw).toISOString() : null;
    if(!name){ shake(overlay.querySelector('#f_name')); return; }
    if(!selectedCat){ shake(grid); return; }

    const logEntry = {
      action: existing ? 'edited' : 'added',
      by:     (typeof auth!=='undefined' && typeof ROLES!=='undefined') ? ROLES[auth.role].label : '؟',
      role:   typeof auth!=='undefined' ? auth.role : 'unknown',
      at:     Date.now()
    };

    let locToSave;
    if(existing){
      existing.name = name; existing.category = selectedCat;
      existing.coords = coords; existing.notes = notes;
      existing.image = currentImage; existing.incidentAt = incidentAt;
      existing.changelog = [...(existing.changelog || []), logEntry];
      locToSave = existing;
    }else{
      locToSave = {
        id: uid(), name, category: selectedCat, coords, notes, image: currentImage,
        x: state.pendingPos.x, y: state.pendingPos.y,
        incidentAt, createdAt: Date.now(), changelog: [logEntry]
      };
      state.locations.push(locToSave);
    }
    saveLocation(locToSave);
    render();
    closeModal();
  };
}

function deleteLocation(id){
  const idx = state.locations.findIndex(l=>l.id===id);
  if(idx === -1) return;
  const removed = state.locations[idx];
  state.locations.splice(idx,1);
  removeLocationFromDB(id);
  render();
  showToast('تم حذف الموقع', ()=>{
    state.locations.splice(idx,0,removed);
    saveLocation(removed);
    render();
  }, 'info');
}

function openClearAllModal(){
  if(typeof auth !== 'undefined' && !auth.can('delete')){
    showToast('حذف كل المواقع متاح للمدير فقط', null, 'error');
    return;
  }
  const total = state.locations.length;
  if(total === 0){ showToast('لا توجد مواقع لحذفها', null, 'info'); return; }

  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" style="width:400px;">
      <h2 style="color:var(--red)">${icon('alert')} حذف كل المواقع</h2>
      <p class="login-hint">
        أنت على وشك حذف <b style="color:var(--text-1)">${total}</b> موقعاً نهائياً للجميع.
        لا يمكن التراجع عن هذا الإجراء. اكتب <b style="color:var(--red)">حذف</b> للتأكيد.
      </p>
      <div class="field">
        <input type="text" id="confirmClearInput" placeholder="اكتب: حذف" autocomplete="off">
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="clearCancelBtn">إلغاء</button>
        <button class="btn btn-danger" id="clearConfirmBtn">${icon('trash')} حذف الكل نهائياً</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);

  const input = overlay.querySelector('#confirmClearInput');
  input.focus();
  overlay.addEventListener('click', e=>{ if(e.target===overlay) root.innerHTML=''; });
  overlay.querySelector('#clearCancelBtn').onclick = ()=> root.innerHTML='';
  overlay.querySelector('#clearConfirmBtn').onclick = async ()=>{
    if(input.value.trim() !== 'حذف'){ shake(input); return; }
    await clearAllLocationsFromDB();
    root.innerHTML = '';
    showToast('تم حذف كل المواقع', null, 'success');
  };
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') overlay.querySelector('#clearConfirmBtn').click(); });
}

function parseVector3(coordsText){
  if(!coordsText) return null;
  const parts = coordsText.split(',').map(s=>parseFloat(s.trim()));
  if(parts.length>=3 && parts.slice(0,3).every(n=>!isNaN(n))) return parts.slice(0,3);
  return null;
}

function buildLuaExport(){
  let out = 'RobberyLocations = {\n';
  CAT_KEYS.forEach(key=>{
    const items = state.locations.filter(l=>l.category===key);
    out += `    ${key} = {\n`;
    items.forEach(l=>{
      const v = parseVector3(l.coords);
      const coordsStr = v ? `vector3(${v[0]}, ${v[1]}, ${v[2]})` : (l.coords ? `"${l.coords.replace(/"/g,"'")}"` : 'nil');
      out += `        { name = "${(l.name||'').replace(/"/g,"'")}", coords = ${coordsStr}, notes = "${(l.notes||'').replace(/"/g,"'")}" },\n`;
    });
    out += `    },\n`;
  });
  out += '}\n';
  return out;
}

function buildJsonExport(){
  return JSON.stringify(state.locations, null, 2);
}

function openExportModal(){
  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" style="width:520px;">
      <h2>${icon('download')} تصدير المواقع</h2>
      <div class="export-tabs">
        <div class="export-tab active" data-fmt="lua">Lua</div>
        <div class="export-tab" data-fmt="json">JSON</div>
        <div class="export-tab" data-fmt="png">${icon('image')} صورة PNG</div>
      </div>
      <div class="export-output mono" id="exportOutput"></div>
      <div class="export-png-hint" id="exportPngHint" style="display:none">
        ${icon('image')}
        <span>يلتقط الخريطة الحالية مع جميع الدبابيس الظاهرة كصورة PNG عالية الجودة</span>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="closeExportBtn">إغلاق</button>
        <button class="btn btn-primary" id="copyExportBtn">${icon('copy')} نسخ المحتوى</button>
        <button class="btn btn-primary" id="screenshotBtn" style="display:none">${icon('image')} تصدير صورة</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);
  const out       = overlay.querySelector('#exportOutput');
  const pngHint   = overlay.querySelector('#exportPngHint');
  const copyBtn   = overlay.querySelector('#copyExportBtn');
  const shotBtn   = overlay.querySelector('#screenshotBtn');
  let fmt = 'lua';

  function refresh(){
    if(fmt === 'png'){
      out.style.display    = 'none';
      pngHint.style.display = 'flex';
      copyBtn.style.display = 'none';
      shotBtn.style.display = '';
    } else {
      out.style.display    = '';
      pngHint.style.display = 'none';
      copyBtn.style.display = '';
      shotBtn.style.display = 'none';
      out.textContent = fmt==='lua' ? buildLuaExport() : buildJsonExport();
    }
  }
  refresh();

  overlay.querySelectorAll('.export-tab').forEach(tab=>{
    tab.onclick = ()=>{
      overlay.querySelectorAll('.export-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      fmt = tab.dataset.fmt;
      refresh();
    };
  });

  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) root.innerHTML=''; });
  overlay.querySelector('#closeExportBtn').onclick = ()=>{ root.innerHTML=''; };
  copyBtn.onclick = ()=>{
    copyText(out.textContent);
    showToast('تم نسخ البيانات', null, 'success');
  };

  shotBtn.onclick = async ()=>{
    if(typeof html2canvas === 'undefined'){
      showToast('مكتبة الصور غير محملة، تحقق من الاتصال بالإنترنت', null, 'error');
      return;
    }
    root.innerHTML = '';
    showToast('جاري التقاط الصورة...', null, 'info');
    try{
      const canvas = await html2canvas(document.getElementById('mapWrap'), {
        allowTaint:true, useCORS:true,
        backgroundColor:'#0a0e13',
        scale: Math.min(window.devicePixelRatio || 1, 2)
      });
      const a = document.createElement('a');
      a.download = 'heist-map-' + new Date().toISOString().slice(0,10) + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      showToast('تم حفظ الصورة بنجاح', null, 'success');
    }catch(e){
      showToast('تعذر التقاط الصورة، جرّب تصغير الخريطة أولاً', null, 'error');
    }
  };
}

function openBgModal(){
  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${icon('map')} خلفية الخريطة</h2>
      <div class="field">
        <label>من جهازك (مؤقت)</label>
        <button class="btn btn-ghost" id="bgPickFileBtn" style="width:100%">${icon('imagePlus')} اختيار صورة من الجهاز</button>
        <div class="field-hint">ما تُحفظ — تحتاج تعيد اختيارها كل ما فتحت الملف من جديد</div>
      </div>
      <div class="divider" style="margin:16px 0"></div>
      <div class="field">
        <label>من رابط مباشر للصورة (يُحفظ تلقائياً)</label>
        <input type="text" id="bgUrlInput" class="mono" placeholder="https://example.com/map.png">
        <div class="field-hint">لازم يكون رابط مباشر للصورة ومستضاف بشكل دائم — روابط ديسكورد المؤقتة تنتهي بعد وقت. ملاحظة: هذي الخلفية تنحفظ لكل من يفتح هذا الملف، مو لك فقط</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="bgCancelBtn">إلغاء</button>
        <button class="btn btn-primary" id="bgUrlLoadBtn">تحميل وحفظ</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) root.innerHTML=''; });
  overlay.querySelector('#bgCancelBtn').onclick = ()=>{ root.innerHTML=''; };
  overlay.querySelector('#bgPickFileBtn').onclick = ()=>{
    root.innerHTML = '';
    document.getElementById('mapFileInput').click();
  };
  overlay.querySelector('#bgUrlLoadBtn').onclick = async ()=>{
    const url = overlay.querySelector('#bgUrlInput').value.trim();
    if(!url) return;
    try{
      await loadBackgroundFromUrl(url);
      await saveBackgroundUrl(url);
      root.innerHTML = '';
      showToast('تم تحميل الخلفية وحفظها', null, 'success');
    }catch(e){
      showToast('تعذر تحميل الصورة من هذا الرابط، تأكد إنه رابط مباشر وصالح', null, 'error');
    }
  };
}

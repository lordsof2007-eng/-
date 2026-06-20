function filteredLocations(){
  return state.locations.filter(l=>{
    if(!state.activeFilters.has(l.category)) return false;
    if(state.search && !l.name.toLowerCase().includes(state.search.toLowerCase())) return false;
    if(state.dateFilter !== 'all'){
      const now  = Date.now();
      const ref  = l.incidentAt ? new Date(l.incidentAt).getTime() : (l.createdAt || 0);
      const diff = now - ref;
      if(state.dateFilter === 'today' && diff > 86400000)   return false;
      if(state.dateFilter === 'week'  && diff > 604800000)  return false;
      if(state.dateFilter === 'month' && diff > 2592000000) return false;
    }
    return true;
  });
}

function renderFilters(){
  const el = document.getElementById('filters');
  el.innerHTML = '';

  CAT_KEYS.forEach(key=>{
    const cat   = FranklinMorgenCATS[key];
    const count = state.locations.filter(l=>l.category===key).length;
    const chip  = document.createElement('div');
    chip.className = 'filter-chip' + (state.activeFilters.has(key) ? ' active' : '');
    chip.style.setProperty('--cat-color', cat.color);
    chip.innerHTML = `${icon(cat.icon)} ${cat.label} <span class="count">${count}</span>`;
    chip.onclick = ()=>{
      if(state.activeFilters.has(key)) state.activeFilters.delete(key);
      else state.activeFilters.add(key);
      render();
    };
    el.appendChild(chip);
  });

  const sep = document.createElement('div');
  sep.className = 'filter-sep';
  el.appendChild(sep);

  const DATE_FILTERS = [
    { key:'all',   label:'الكل'         },
    { key:'today', label:'اليوم'        },
    { key:'week',  label:'هذا الأسبوع' },
    { key:'month', label:'هذا الشهر'   }
  ];
  DATE_FILTERS.forEach(f=>{
    const chip = document.createElement('div');
    chip.className = 'filter-chip date-chip' + (state.dateFilter === f.key ? ' active' : '');
    chip.innerHTML = icon('calendar') + ' ' + f.label;
    chip.onclick = ()=>{ state.dateFilter = f.key; render(); };
    el.appendChild(chip);
  });
}

function renderList(){
  const list = document.getElementById('list');
  const items = filteredLocations();
  document.getElementById('listCount').textContent = items.length;
  document.getElementById('statCount').textContent = state.locations.length;
  if(items.length === 0){
    list.innerHTML = `<div class="empty-hint">${state.locations.length===0 ? 'لا توجد مواقع مضافة بعد.<br>اضغط على الخريطة أو زر "إضافة موقع" للبدء.' : 'لا توجد نتائج مطابقة للبحث أو الفلاتر.'}</div>`;
    return;
  }
  const canEdit   = typeof auth === 'undefined' || auth.can('edit');
  const canDelete = typeof auth === 'undefined' || auth.can('delete');
  list.innerHTML = '';
  items.slice().reverse().forEach(loc=>{
    const cat = FranklinMorgenCATS[loc.category];
    const card = document.createElement('div');
    card.className = 'loc-card';
    card.style.setProperty('--cat-color', cat.color);
    card.innerHTML = `
      <div class="loc-card-top loc-card-nav" title="اضغط لتحديد الموقع على الخريطة">
        <div>
          <p class="loc-name">${escapeHtml(loc.name)}</p>
          <span class="loc-cat">${icon(cat.icon)} ${cat.label}</span>
        </div>
        <div class="nav-hint">${icon('crosshair')}</div>
      </div>
      ${loc.incidentAt ? `<div class="loc-date">${icon('calendar')} ${formatDate(loc.incidentAt)}</div>` : ''}
      ${loc.coords ? `<div class="loc-coords mono">${icon('crosshair',{cls:'ic'})} ${escapeHtml(loc.coords)} <button class="icon-btn copy-coords" data-id="${loc.id}" title="نسخ">${icon('copy')}</button></div>` : ''}
      ${loc.notes ? `<div class="loc-notes">${escapeHtml(loc.notes)}</div>` : ''}
      <div class="loc-actions">
        ${canEdit   ? `<button class="icon-btn edit-btn"   data-id="${loc.id}">${icon('edit')}  تعديل</button>` : ''}
        ${canDelete ? `<button class="icon-btn delete-btn" data-id="${loc.id}" style="color:var(--red)">${icon('trash')} حذف</button>` : ''}
      </div>
    `;
    card.querySelector('.loc-card-nav').onclick = ()=>{
      if(typeof focusPin === 'function') focusPin(loc);
    };
    list.appendChild(card);
  });

  list.querySelectorAll('.edit-btn').forEach(b=>b.onclick = ()=>openModal(b.dataset.id));
  list.querySelectorAll('.delete-btn').forEach(b=>b.onclick = ()=>deleteLocation(b.dataset.id));
  list.querySelectorAll('.copy-coords').forEach(b=>b.onclick = (e)=>{
    e.stopPropagation();
    const loc = state.locations.find(l=>l.id===b.dataset.id);
    copyText(loc.coords);
    showToast('تم نسخ الإحداثيات', null, 'success');
  });
}

function renderZones(){
  const el = document.getElementById('zones');
  el.innerHTML = '';
  ZONES.forEach(z=>{
    const div = document.createElement('div');
    div.className = 'zone';
    div.style.left = z.x+'%'; div.style.top = z.y+'%';
    div.style.width = z.w+'%'; div.style.height = z.h+'%';
    el.appendChild(div);
    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = z.name;
    label.style.left = (z.x+3)+'%'; label.style.top = (z.y+3)+'%';
    el.appendChild(label);
  });
  const ruler = document.getElementById('rulerTop');
  ruler.innerHTML = '';
  for(let i=0;i<=10;i++){
    const span = document.createElement('span');
    span.textContent = String.fromCharCode(65+i);
    ruler.appendChild(span);
  }
}

function computeClusters(locs){
  const stageW = mapStage.offsetWidth  || 973;
  const stageH = mapStage.offsetHeight || 1107;
  const currentZoom = typeof zoom !== 'undefined' ? zoom : 1;
  const THRESH = 38;

  const points = locs.map(loc=>({
    loc,
    sx: (loc.x / 100) * stageW * currentZoom,
    sy: (loc.y / 100) * stageH * currentZoom
  }));

  const used = new Array(points.length).fill(false);
  const clusters = [];

  for(let i = 0; i < points.length; i++){
    if(used[i]) continue;
    used[i] = true;
    const group = [points[i].loc];
    for(let j = i+1; j < points.length; j++){
      if(used[j]) continue;
      const dx = points[i].sx - points[j].sx;
      const dy = points[i].sy - points[j].sy;
      if(Math.hypot(dx, dy) < THRESH){
        group.push(points[j].loc);
        used[j] = true;
      }
    }
    clusters.push({
      locs: group,
      x: group.reduce((s,l)=>s+l.x,0) / group.length,
      y: group.reduce((s,l)=>s+l.y,0) / group.length
    });
  }
  return clusters;
}

function renderPins(){
  const el = document.getElementById('pins');
  el.innerHTML = '';
  if(state.pinsHidden) return;
  const clusters = computeClusters(filteredLocations());

  clusters.forEach(cluster=>{
    if(cluster.locs.length === 1){

      const loc = cluster.locs[0];
      const cat = FranklinMorgenCATS[loc.category];
      const pin = document.createElement('div');
      pin.className = 'pin';
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('data-id', loc.id);
      pin.style.left = loc.x+'%';
      pin.style.top  = loc.y+'%';
      pin.style.setProperty('--pin-color', cat.color);
      pin.innerHTML = `
        <div class="pin-tooltip">${escapeHtml(loc.name)}</div>
        <div class="pin-badge">${icon(cat.icon)}</div>
        <div class="pin-tip"></div>
      `;
      pin.onclick = (e)=>{ e.stopPropagation(); openViewModal(loc.id); };
      el.appendChild(pin);
    } else {

      const cpin = document.createElement('div');
      cpin.className = 'pin cluster-pin';
      cpin.setAttribute('tabindex', '0');
      cpin.style.left = cluster.x+'%';
      cpin.style.top  = cluster.y+'%';
      cpin.style.setProperty('--pin-color', 'var(--amber)');
      cpin.innerHTML = `
        <div class="pin-tooltip">${cluster.locs.length} مواقع — اضغط لعرضها</div>
        <div class="pin-badge cluster-badge"><span>${cluster.locs.length}</span></div>
        <div class="pin-tip"></div>
      `;
      cpin.onclick = (e)=>{ e.stopPropagation(); openClusterModal(cluster); };
      el.appendChild(cpin);
    }
  });
}

function render(){
  renderFilters();
  renderList();
  renderPins();
}

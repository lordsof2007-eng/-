const mapWrap = document.getElementById('mapWrap');
const mapStage = document.getElementById('mapStage');
const zoomLevelEl = document.getElementById('zoomLevel');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const MIN_ZOOM = 0.5, MAX_ZOOM = 17, ZOOM_STEP = 0.25, WHEEL_STEP = 0.12;

let zoom = 1, panX = 0, panY = 0;
let _lastRenderZoom = -1;

(function initPinVars(){
  const s = getPinScale(1);
  const h = parseFloat((s * 1.5).toFixed(4));
  mapStage.style.setProperty('--pin-scale',       s);
  mapStage.style.setProperty('--pin-hover-scale', h);
  mapStage.style.setProperty('--tooltip-scale',   parseFloat((1/(h*1)).toFixed(4)));
})();
let stageOffsetX = 0, stageOffsetY = 0;
let isPanning = false, dragMoved = 0, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;

function clampPan(){
  const wrapRect = mapWrap.getBoundingClientRect();
  const wrapW = wrapRect.width, wrapH = wrapRect.height;
  const stageW = mapStage.offsetWidth, stageH = mapStage.offsetHeight;
  const scaledW = zoom * stageW, scaledH = zoom * stageH;

  if(scaledW <= wrapW){
    panX = wrapW / 2 - stageOffsetX - scaledW / 2;
  }else{
    const minPanX = wrapW - stageOffsetX - scaledW;
    const maxPanX = -stageOffsetX;
    panX = Math.min(maxPanX, Math.max(minPanX, panX));
  }
  if(scaledH <= wrapH){
    panY = wrapH / 2 - stageOffsetY - scaledH / 2;
  }else{
    const minPanY = wrapH - stageOffsetY - scaledH;
    const maxPanY = -stageOffsetY;
    panY = Math.min(maxPanY, Math.max(minPanY, panY));
  }
}

function getPinScale(z){
  const BASE = 0.42;
  return parseFloat((BASE / Math.max(1, z / 2)).toFixed(4));
}

function applyTransform(){
  clampPan();
  mapStage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLevelEl.textContent = Math.round(zoom * 100) + '%';
  zoomInBtn.disabled = zoom >= MAX_ZOOM;
  zoomOutBtn.disabled = zoom <= MIN_ZOOM;
  mapWrap.classList.toggle('zoomed', zoom > 1);

  const pinScale   = getPinScale(zoom);
  const hoverScale = parseFloat((pinScale * 1.5).toFixed(4));
  mapStage.style.setProperty('--pin-scale',       pinScale);
  mapStage.style.setProperty('--pin-hover-scale', hoverScale);

  const tooltipScale = parseFloat((1 / (hoverScale * zoom)).toFixed(4));
  mapStage.style.setProperty('--tooltip-scale', tooltipScale);

  if(zoom !== _lastRenderZoom){
    _lastRenderZoom = zoom;
    if(typeof renderPins === 'function') renderPins();
  }

  saveViewState();
}

function flashZoomBlur(){
  mapStage.classList.add('zooming');
  clearTimeout(mapStage._zoomBlurTimer);
  mapStage._zoomBlurTimer = setTimeout(()=> mapStage.classList.remove('zooming'), 160);
}

function applyZoomAround(nextZoom, cx, cy){
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  if(clamped === zoom) return;
  panX = cx - (clamped / zoom) * (cx - panX);
  panY = cy - (clamped / zoom) * (cy - panY);
  zoom = clamped;
  applyTransform();
}

function zoomAt(nextZoom, cx, cy){
  const before = zoom;
  applyZoomAround(nextZoom, cx, cy);
  if(zoom !== before) flashZoomBlur();
}

function wrapPointToStageFrame(wrapRelX, wrapRelY){
  return { x: wrapRelX - stageOffsetX, y: wrapRelY - stageOffsetY };
}
function stageCenterInWrapFrame(){
  const rect = mapWrap.getBoundingClientRect();
  return wrapPointToStageFrame(rect.width / 2, rect.height / 2);
}

zoomInBtn.onclick = ()=>{ const c = stageCenterInWrapFrame(); zoomAt(zoom + ZOOM_STEP, c.x, c.y); };
zoomOutBtn.onclick = ()=>{ const c = stageCenterInWrapFrame(); zoomAt(zoom - ZOOM_STEP, c.x, c.y); };
zoomResetBtn.onclick = ()=>{ zoom = 1; panX = 0; panY = 0; applyTransform(); flashZoomBlur(); };

mapStage.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const wrapRect = mapWrap.getBoundingClientRect();
  const c = wrapPointToStageFrame(e.clientX - wrapRect.left, e.clientY - wrapRect.top);
  const dir = e.deltaY < 0 ? 1 : -1;
  zoomAt(zoom + dir * WHEEL_STEP, c.x, c.y);
}, { passive: false });

const activePointers = new Map();
let pinchStartDist = 0, pinchStartZoom = 1;

function pinchInfo(){
  const pts = [...activePointers.values()];
  const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  const midX = (pts[0].x + pts[1].x) / 2;
  const midY = (pts[0].y + pts[1].y) / 2;
  return { dist, midX, midY };
}

mapStage.addEventListener('pointerdown', (e)=>{
  if(e.target.closest('.pin')) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try{ mapStage.setPointerCapture(e.pointerId); }catch(_){}

  if(activePointers.size === 2){
    isPanning = false;
    const info = pinchInfo();
    pinchStartDist = info.dist;
    pinchStartZoom = zoom;
  } else if(activePointers.size === 1 && zoom > 1){
    isPanning = true; dragMoved = 0;
    dragStartX = e.clientX; dragStartY = e.clientY;
    panStartX = panX; panStartY = panY;
    mapStage.classList.add('panning');
  }
});

mapStage.addEventListener('pointermove', (e)=>{
  if(activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if(activePointers.size === 2 && pinchStartDist > 0){
    const info = pinchInfo();
    const wrapRect = mapWrap.getBoundingClientRect();
    const c = wrapPointToStageFrame(info.midX - wrapRect.left, info.midY - wrapRect.top);
    applyZoomAround(pinchStartZoom * (info.dist / pinchStartDist), c.x, c.y);
    return;
  }

  if(!isPanning) return;
  const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
  dragMoved = Math.hypot(dx, dy);
  panX = panStartX + dx; panY = panStartY + dy;
  applyTransform();
});

function endPointer(e){
  activePointers.delete(e.pointerId);
  if(activePointers.size < 2) pinchStartDist = 0;
  if(activePointers.size === 0){ isPanning = false; mapStage.classList.remove('panning'); }
}
mapStage.addEventListener('pointerup', endPointer);
mapStage.addEventListener('pointercancel', endPointer);

function focusPin(loc){
  if(typeof closeSidebarMobile === 'function') closeSidebarMobile();
  const stageW    = mapStage.offsetWidth;
  const stageH    = mapStage.offsetHeight;
  const wrapRect  = mapWrap.getBoundingClientRect();
  const targetZ   = Math.max(zoom, 3);
  const pinX      = (loc.x / 100) * stageW;
  const pinY      = (loc.y / 100) * stageH;
  zoom = targetZ;
  panX = wrapRect.width  / 2 - stageOffsetX - pinX * targetZ;
  panY = wrapRect.height / 2 - stageOffsetY - pinY * targetZ;

  mapStage.classList.add('flying');
  void mapStage.offsetWidth;
  applyTransform();
  clearTimeout(mapStage._flyTimer);
  mapStage._flyTimer = setTimeout(()=> mapStage.classList.remove('flying'), 700);

  setTimeout(()=>{
    const pin = document.querySelector(`.pin[data-id="${loc.id}"]`);
    if(pin){
      pin.classList.add('pin-pulse');
      setTimeout(()=> pin.classList.remove('pin-pulse'), 2200);
    }
  }, 60);
}

let _saveViewTimer;
function saveViewState(){
  clearTimeout(_saveViewTimer);
  _saveViewTimer = setTimeout(()=>{
    try{ localStorage.setItem('heist_view', JSON.stringify({zoom, panX, panY})); }catch(e){}
  }, 400);
}

function restoreViewState(){
  try{
    const saved = JSON.parse(localStorage.getItem('heist_view') || 'null');
    if(saved && saved.zoom){
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, saved.zoom));
      panX = saved.panX || 0;
      panY = saved.panY || 0;
      applyTransform();
    }
  }catch(e){}
}

const placeReticle = document.getElementById('placeReticle');
const placingHint = document.getElementById('placingHint');
const addBtnEl = document.getElementById('addBtn');

function enterPlacingMode(clientX, clientY){
  state.placingMode = true;
  mapWrap.classList.add('placing');
  addBtnEl.classList.add('active');
  addBtnEl.innerHTML = icon('x') + ' إلغاء التحديد';
  document.getElementById('mapHint').style.display = 'none';
  placingHint.style.display = '';
  placeReticle.style.display = 'block';
  if(typeof clientX === 'number'){
    placeReticle.style.left = clientX + 'px';
    placeReticle.style.top = clientY + 'px';
  }
}

function exitPlacingMode(){
  state.placingMode = false;
  mapWrap.classList.remove('placing');
  addBtnEl.classList.remove('active');
  addBtnEl.innerHTML = icon('plus') + ' إضافة موقع';
  placingHint.style.display = 'none';
  placeReticle.style.display = 'none';
  document.getElementById('mapHint').style.display = '';
}

document.addEventListener('pointermove', (e)=>{
  if(!state.placingMode) return;
  placeReticle.style.left = e.clientX + 'px';
  placeReticle.style.top = e.clientY + 'px';
});

document.addEventListener('contextmenu', (e)=>{
  if(state.placingMode){ e.preventDefault(); exitPlacingMode(); }
});

document.addEventListener('click', (e)=>{
  if(!state.placingMode) return;
  if(e.target.closest('#mapStage')) return;
  if(e.target.closest('#addBtn')) return;
  exitPlacingMode();
});

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && state.placingMode) exitPlacingMode();
});

mapStage.addEventListener('click', (e)=>{
  if(dragMoved > 5){ dragMoved = 0; return; }
  if(e.target.closest('.pin')) return;
  if(!state.placingMode) return;
  const rect = mapStage.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  state.pendingPos = { x: Math.max(1,Math.min(98,x)), y: Math.max(1,Math.min(96,y)) };
  exitPlacingMode();
  openModal(null);
});

function fitStageToImage(natW, natH){
  const wrapRect = mapWrap.getBoundingClientRect();
  const wrapW = wrapRect.width, wrapH = wrapRect.height;
  const imgRatio = natW / natH;
  const wrapRatio = wrapW / wrapH;
  let stageW, stageH;
  if(imgRatio > wrapRatio){
    stageW = wrapW;
    stageH = wrapW / imgRatio;
  }else{
    stageH = wrapH;
    stageW = wrapH * imgRatio;
  }
  mapStage.style.width = stageW + 'px';
  mapStage.style.height = stageH + 'px';
  stageOffsetX = (wrapW - stageW) / 2;
  stageOffsetY = (wrapH - stageH) / 2;
  mapStage.style.left = stageOffsetX + 'px';
  mapStage.style.top = stageOffsetY + 'px';
  mapStage.style.right = 'auto';
  mapStage.style.bottom = 'auto';
}

function activateBackground(cssSrc, natW, natH){
  fitStageToImage(natW, natH);
  zoom = 1; panX = 0; panY = 0; applyTransform();
  mapStage.style.backgroundImage = `url("${cssSrc}")`;
  mapStage.style.backgroundSize = '100% 100%';
  mapStage.style.backgroundPosition = 'center';
  mapStage.style.backgroundRepeat = 'no-repeat';
  mapStage.style.outline = '2px solid var(--amber)';
  mapStage.style.outlineOffset = '0px';
  document.getElementById('zones').style.display = 'none';

  const rmBtn = document.getElementById('removeMapBtn');
  rmBtn.dataset.visible = 'true';
  if(typeof updateAuthUI === 'function') updateAuthUI();
  else rmBtn.style.display = 'inline-flex';

  document.dispatchEvent(new CustomEvent('backgroundReady'));
}

function loadBackgroundFromUrl(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      activateBackground(url, img.naturalWidth, img.naturalHeight);
      document.getElementById('mapHint').textContent = 'الخلفية محفوظة وتظهر تلقائياً لأي شخص يفتح هذا الملف';
      resolve();
    };
    img.onerror = ()=> reject(new Error('load-failed'));
    img.src = url;
  });
}

function loadDefaultBackground(){
  activateBackground(DEFAULT_BG_SRC, DEFAULT_BG_W, DEFAULT_BG_H);

  const rmBtn = document.getElementById('removeMapBtn');
  rmBtn.dataset.visible = 'false';
  rmBtn.style.display = 'none';
  document.getElementById('mapHint').textContent = 'All Right Belong to Uncle Franklin Morgen & Ahamed AL-Qahrani';
}

function restoreSavedBackground(){
  watchSavedBackground(
    (url)=>{
      loadBackgroundFromUrl(url).catch(()=>{
        showToast('تعذر تحديث آخر خلفية محفوظة، سيتم عرض خريطة GTA V الافتراضية بدلاً منها', null, 'warn');
        loadDefaultBackground();
      });
    },
    ()=> loadDefaultBackground()
  );
}

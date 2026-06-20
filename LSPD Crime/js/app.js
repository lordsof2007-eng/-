document.getElementById('searchInput').addEventListener('input', (e)=>{
  state.search = e.target.value;
  renderList(); renderPins();
});

document.getElementById('clearFiltersBtn').onclick = ()=>{
  state.activeFilters = new Set(CAT_KEYS);
  state.search        = '';
  state.dateFilter    = 'all';
  document.getElementById('searchInput').value = '';
  render();
};

document.getElementById('addBtn').onclick = (e)=>{
  if(typeof auth !== 'undefined' && !auth.can('add')){
    showToast('ليس لديك صلاحية لإضافة مواقع — سجّل الدخول أولاً', null, 'error');
    return;
  }
  if(state.placingMode){ exitPlacingMode(); return; }
  enterPlacingMode(e.clientX, e.clientY);
};

function setSidebar(open){
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  sb.classList.toggle('open', open);
  bd.classList.toggle('show', open);
}
function closeSidebarMobile(){ setSidebar(false); }
document.getElementById('sidebarToggle').onclick = ()=>{
  const sb = document.getElementById('sidebar');
  setSidebar(!sb.classList.contains('open'));
};
document.getElementById('sidebarBackdrop').onclick = closeSidebarMobile;

document.getElementById('exportBtn').onclick = openExportModal;

document.getElementById('clearAllBtn').onclick = openClearAllModal;

document.getElementById('togglePinsBtn').onclick = ()=>{
  state.pinsHidden = !state.pinsHidden;
  const btn   = document.getElementById('togglePinsBtn');
  const label = document.getElementById('togglePinsLabel');
  const svg   = btn.querySelector('svg');
  if(state.pinsHidden){
    label.textContent = 'إظهار المواقع';
    svg.outerHTML = icon('eyeOff');
    btn.classList.add('active-toggle');
  }else{
    label.textContent = 'إخفاء المواقع';
    svg.outerHTML = icon('eye');
    btn.classList.remove('active-toggle');
  }
  renderPins();
};

document.getElementById('roleIndicator').onclick = openLoginModal;

document.getElementById('pwdMgrBtn').onclick = openPasswordsModal;

document.getElementById('loadMapBtn').onclick = openBgModal;
document.getElementById('mapFileInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    const dataUrl = ev.target.result;
    const img = new Image();
    img.onload = ()=>{
      activateBackground(dataUrl, img.naturalWidth, img.naturalHeight);
      document.getElementById('mapHint').textContent = 'الدبابيس محفوظة دائماً، لكن لازم تعيد تحميل هذي الخلفية كل ما فتحت الملف من جديد (ما تُحفظ)';
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
});
document.getElementById('removeMapBtn').onclick = async ()=>{
  document.getElementById('mapFileInput').value = '';
  try{ await removeBackgroundUrl(); }catch(e){  }
  loadDefaultBackground();
};

let _viewRestored = false;
document.addEventListener('backgroundReady', ()=>{
  if(_viewRestored) return;
  _viewRestored = true;
  restoreViewState();
});

renderZones();
loadData();
restoreSavedBackground();
updateAuthUI();

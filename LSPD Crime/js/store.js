function setLoading(on){
  const ov = document.getElementById('loadingOverlay');
  if(!ov) return;
  if(on){ ov.style.display='flex'; ov.style.opacity='1'; }
  else  { ov.style.opacity='0'; setTimeout(()=>{ ov.style.display='none'; }, 300); }
}

function loadData(){
  setLoading(true);
  if(!firebaseReady){
    setLoading(false);
    showToast('قاعدة البيانات غير مفعّلة بعد — المواقع لن تُحفظ أو تظهر للكل. راجع تعليمات الإعداد في js/config.js', null, 'warn');
    render();
    return;
  }
  db.ref('locations').on('value', (snapshot)=>{
    setLoading(false);
    const val = snapshot.val();
    state.locations = val ? Object.values(val) : [];
    render();
  }, ()=>{
    setLoading(false);
    showToast('تعذر الاتصال بقاعدة البيانات', null, 'error');
  });
}

function saveLocation(loc){
  if(!firebaseReady){ showToast('تعذر الحفظ، قاعدة البيانات غير مفعّلة', null, 'error'); return; }
  db.ref('locations/' + loc.id).set(loc).catch(()=>{
    showToast('تعذر حفظ البيانات، حاول مرة أخرى', null, 'error');
  });
}

function removeLocationFromDB(id){
  if(!firebaseReady) return;
  db.ref('locations/' + id).remove().catch(()=>{
    showToast('تعذر حذف الموقع، حاول مرة أخرى', null, 'error');
  });
}

function clearAllLocationsFromDB(){
  if(!firebaseReady){

    state.locations = [];
    render();
    return Promise.resolve();
  }
  return db.ref('locations').remove().catch(()=>{
    showToast('تعذر حذف المواقع، حاول مرة أخرى', null, 'error');
  });
}

function watchSavedBackground(onUrl, onEmpty){
  if(!firebaseReady){ onEmpty(); return; }
  db.ref('settings/bgImageUrl').on('value', (snapshot)=>{
    const url = snapshot.val();
    if(url) onUrl(url); else onEmpty();
  });
}

function saveBackgroundUrl(url){
  if(!firebaseReady) return Promise.resolve();
  return db.ref('settings/bgImageUrl').set(url);
}

function removeBackgroundUrl(){
  if(!firebaseReady) return Promise.resolve();
  return db.ref('settings/bgImageUrl').remove();
}

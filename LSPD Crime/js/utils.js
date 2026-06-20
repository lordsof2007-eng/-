function showToast(msg, undoFn, type = 'info'){
  const root = document.getElementById('toastRoot');
  root.innerHTML = '';
  const iconName = { info:'info', warn:'alert', success:'check', error:'alert' }[type] || 'info';
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = icon(iconName) + '<span>' + msg + '</span>' + (undoFn ? '<a id="undoLink">تراجع</a>' : '');
  root.appendChild(t);
  if(undoFn){
    document.getElementById('undoLink').onclick = ()=>{ undoFn(); root.innerHTML = ''; };
  }
  setTimeout(()=>{ if(root.firstChild === t) root.innerHTML = ''; }, 5000);
}

function escapeHtml(s){
  return (s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function copyText(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).catch(()=>fallbackCopy(text));
  }else{
    fallbackCopy(text);
  }
}
function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

function formatDate(ts){
  if(!ts) return '';
  try{
    const d = new Date(ts);
    if(isNaN(d)) return '';
    return d.toLocaleDateString('ar-SA', {
      year:'numeric', month:'short', day:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
  }catch(e){ return ''; }
}

function toDatetimeLocal(val){
  if(!val) return '';
  try{
    const d = new Date(val);
    if(isNaN(d)) return '';
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }catch(e){ return ''; }
}

function compressImageToDataUrl(file, maxDim, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.naturalWidth, h = img.naturalHeight;
        if(w > maxDim || h > maxDim){
          if(w >= h){ h = Math.round(h * maxDim / w); w = maxDim; }
          else{ w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = ()=> reject(new Error('img-load-failed'));
      img.src = reader.result;
    };
    reader.onerror = ()=> reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}
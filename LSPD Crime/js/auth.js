const ROLES = {
  viewer:  { label:'مشاهد',  icon:'eye',    level:0, cls:'role-viewer'  },
  officer: { label:'ضابط',   icon:'shield', level:1, cls:'role-officer' },
  admin:   { label:'مدير',   icon:'key',    level:2, cls:'role-admin'   }
};

const PERMISSIONS = {
  add:          ['officer','admin'],
  edit:         ['officer','admin'],
  delete:       ['admin'],
  export:       ['officer','admin'],
  changeBg:     ['admin'],
  manageRoles:  ['admin']
};

const auth = {
  role: sessionStorage.getItem('heist_role') || 'viewer',

  can(action){
    return (PERMISSIONS[action] || []).includes(this.role);
  },

  setRole(role){
    if(!ROLES[role]) return;
    this.role = role;
    sessionStorage.setItem('heist_role', role);
    updateAuthUI();
    render();
  }
};

function updateAuthUI(){
  const info = ROLES[auth.role];

  const badge = document.getElementById('roleIndicator');
  if(badge){
    badge.className = 'role-badge ' + info.cls;
    badge.innerHTML = icon(info.icon) + ' ' + info.label;
  }

  const addBtn       = document.getElementById('addBtn');
  const exportBtn    = document.getElementById('exportBtn');
  const loadMapBtn   = document.getElementById('loadMapBtn');
  const removeMapBtn = document.getElementById('removeMapBtn');
  const pwdBtn       = document.getElementById('pwdMgrBtn');
  const clearAllBtn  = document.getElementById('clearAllBtn');

  if(addBtn)       addBtn.style.display       = auth.can('add')         ? '' : 'none';
  if(exportBtn)    exportBtn.style.display     = auth.can('export')      ? '' : 'none';
  if(loadMapBtn)   loadMapBtn.style.display    = auth.can('changeBg')    ? '' : 'none';
  if(removeMapBtn) removeMapBtn.style.display  = auth.can('changeBg') && removeMapBtn.dataset.visible === 'true' ? '' : 'none';
  if(pwdBtn)       pwdBtn.style.display        = auth.can('manageRoles') ? '' : 'none';
  if(clearAllBtn)  clearAllBtn.style.display   = auth.can('delete')      ? '' : 'none';
}

function openLoginModal(){
  const root = document.getElementById('modalRoot');
  const isLoggedIn = auth.role !== 'viewer';
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" style="width:380px;">
      <h2>${icon('key')} تسجيل الدخول</h2>
      <p class="login-hint">
        أدخل كلمة المرور للحصول على صلاحيات إضافة أو إدارة المواقع.<br>
        <b>مشاهد</b>: عرض فقط &nbsp;|&nbsp; <b>ضابط</b>: إضافة وتعديل &nbsp;|&nbsp; <b>مدير</b>: صلاحيات كاملة
      </p>
      <div class="field">
        <label>كلمة المرور</label>
        <input type="password" id="loginPassword" placeholder="أدخل كلمة المرور...">
      </div>
      <div id="loginError" style="color:var(--red);font-size:12px;display:none;margin-bottom:12px;">
        ${icon('alert')} كلمة المرور غير صحيحة
      </div>
      <div class="modal-actions">
        ${isLoggedIn ? `<button class="btn btn-danger" id="logoutBtn">${icon('x')} تسجيل الخروج</button>` : ''}
        <button class="btn btn-ghost" id="loginCancelBtn">إلغاء</button>
        <button class="btn btn-primary" id="loginSubmitBtn">${icon('key')} دخول</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);

  const pwdInput = overlay.querySelector('#loginPassword');
  pwdInput.focus();

  async function tryLogin(){
    const pwd = pwdInput.value.trim();
    if(!pwd){ pwdInput.focus(); return; }
    let matched = false;

    if(firebaseReady){
      try{
        const snap = await db.ref('settings/auth').once('value');
        const d = snap.val() || {};

        const adminPwd   = d.adminPassword   || (typeof DEFAULT_PASSWORDS !== 'undefined' ? DEFAULT_PASSWORDS.admin   : '');
        const officerPwd = d.officerPassword || (typeof DEFAULT_PASSWORDS !== 'undefined' ? DEFAULT_PASSWORDS.officer : '');
        if(adminPwd && pwd === adminPwd){
          auth.setRole('admin'); matched = true;
        } else if(officerPwd && pwd === officerPwd){
          auth.setRole('officer'); matched = true;
        }
      }catch(e){ showToast('تعذر الاتصال للتحقق من كلمة المرور', null, 'error'); return; }
    } else {

      const def = typeof DEFAULT_PASSWORDS !== 'undefined' ? DEFAULT_PASSWORDS : {};
      if(def.admin && pwd === def.admin){
        auth.setRole('admin'); matched = true;
      } else if(def.officer && pwd === def.officer){
        auth.setRole('officer'); matched = true;
      }
    }

    if(matched){
      root.innerHTML = '';
      showToast('مرحباً ' + ROLES[auth.role].label + '!', null, 'success');
    } else {
      const errEl = overlay.querySelector('#loginError');
      errEl.style.display = 'flex';
      errEl.style.alignItems = 'center';
      errEl.style.gap = '6px';
      pwdInput.style.borderColor = 'var(--red)';
      pwdInput.value = '';
      pwdInput.focus();
      setTimeout(()=>{ pwdInput.style.borderColor = ''; }, 1500);
    }
  }

  overlay.querySelector('#loginSubmitBtn').onclick = tryLogin;
  overlay.querySelector('#loginCancelBtn').onclick = ()=> root.innerHTML = '';
  pwdInput.addEventListener('keydown', e=>{ if(e.key==='Enter') tryLogin(); });
  overlay.addEventListener('click', e=>{ if(e.target===overlay) root.innerHTML=''; });

  const logoutBtn = overlay.querySelector('#logoutBtn');
  if(logoutBtn) logoutBtn.onclick = ()=>{
    auth.setRole('viewer');
    root.innerHTML = '';
    showToast('تم تسجيل الخروج', null, 'info');
  };
}

function openPasswordsModal(){
  if(!auth.can('manageRoles')){ showToast('هذه الميزة للمدير فقط', null, 'error'); return; }
  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" style="width:420px;">
      <h2>${icon('users')} إدارة كلمات المرور</h2>
      <div class="field">
        <label>كلمة مرور الضابط (officer)</label>
        <input type="text" id="officerPwd" placeholder="أدخل كلمة مرور للضباط...">
        <div class="field-hint">الضابط يستطيع إضافة وتعديل المواقع، لكن لا يستطيع الحذف</div>
      </div>
      <div class="field" style="margin-top:4px;">
        <label>كلمة مرور المدير (admin)</label>
        <input type="text" id="adminPwd" placeholder="أدخل كلمة مرور للمدير...">
        <div class="field-hint">المدير له صلاحيات كاملة: إضافة، تعديل، حذف، تغيير الخريطة، وإدارة الكلمات السرية</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="pwdCancelBtn">إلغاء</button>
        <button class="btn btn-primary" id="pwdSaveBtn">${icon('check')} حفظ</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);

  if(firebaseReady){
    db.ref('settings/auth').once('value').then(snap=>{
      const d = snap.val() || {};
      overlay.querySelector('#officerPwd').value = d.officerPassword || '';
      overlay.querySelector('#adminPwd').value   = d.adminPassword   || '';
    });
  }

  overlay.querySelector('#pwdSaveBtn').onclick = async ()=>{
    const officerPwd = overlay.querySelector('#officerPwd').value.trim();
    const adminPwd   = overlay.querySelector('#adminPwd').value.trim();
    if(!adminPwd){ showToast('كلمة مرور المدير لا يمكن أن تكون فارغة', null, 'error'); return; }
    if(firebaseReady){
      try{
        await db.ref('settings/auth').set({ officerPassword: officerPwd, adminPassword: adminPwd });
        root.innerHTML = '';
        showToast('تم حفظ كلمات المرور بنجاح', null, 'success');
      }catch(e){ showToast('تعذر حفظ كلمات المرور', null, 'error'); }
    }
  };
  overlay.querySelector('#pwdCancelBtn').onclick = ()=> root.innerHTML = '';
  overlay.addEventListener('click', e=>{ if(e.target===overlay) root.innerHTML=''; });
}

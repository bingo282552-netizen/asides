// Local offline registration, login, remembered session, and profile display.
(function(){
  const {byId,esc}=SuperkickExperience;
  function inject(){
    document.body.insertAdjacentHTML('beforeend',`
      <div id="auth-shell" class="auth-shell">
        <div class="auth-card">
          <div class="auth-title">SUPERKICK ID</div>
          <div class="tm">เข้าสู่ระบบเพื่อเล่นต่อ ระบบจะจำการเข้าสู่ระบบไว้ 14 วัน</div>
          <div class="auth-tabs">
            <button class="tb active" id="auth-login-tab" onclick="switchAuthPane('login')">เข้าสู่ระบบ</button>
            <button class="tb" id="auth-register-tab" onclick="switchAuthPane('register')">สมัครไอดีใหม่</button>
          </div>
          <div id="auth-login-pane" class="auth-pane active">
            <div class="mb"><label class="tm">ชื่อไอดี</label><input id="auth-login-name" type="text" autocomplete="username"></div>
            <div class="mb"><label class="tm">รหัสผ่าน</label><input id="auth-login-pass" type="password" autocomplete="current-password"></div>
            <button class="btn bg" style="width:100%;" onclick="submitLocalLogin()">เข้าสู่ระบบ</button>
          </div>
          <div id="auth-register-pane" class="auth-pane">
            <div class="mb"><label class="tm">ชื่อไอดีใหม่</label><input id="auth-register-name" type="text" autocomplete="username"></div>
            <div class="mb"><label class="tm">รหัสผ่าน</label><input id="auth-register-pass" type="password" autocomplete="new-password"></div>
            <div class="mb"><label class="tm">ใส่รหัสผ่านซ้ำอีกครั้ง</label><input id="auth-register-confirm" type="password" autocomplete="new-password"></div>
            <button class="btn bg" style="width:100%;" onclick="submitRegistration()">สร้างไอดี</button>
          </div>
          <div class="auth-social">
            <button class="btn bgh" onclick="submitSocialLogin('google')">G Google</button>
            <button class="btn bgh" onclick="submitSocialLogin('apple')"> Apple</button>
          </div>
          <div class="tm" style="font-size:.7rem;margin-top:7px;">Google และ Apple เป็นโหมดจำลองสำหรับเกม local offline</div>
          <div id="auth-error" class="auth-error"></div>
        </div>
      </div>`);
  }
  window.switchAuthPane=mode=>{
    byId('auth-login-pane').classList.toggle('active',mode==='login');
    byId('auth-register-pane').classList.toggle('active',mode==='register');
    byId('auth-login-tab').classList.toggle('active',mode==='login');
    byId('auth-register-tab').classList.toggle('active',mode==='register');
    byId('auth-error').textContent='';
  };
  const authError=error=>byId('auth-error').textContent=error?.message||String(error);
  const completeAuth=account=>{
    byId('auth-shell').classList.remove('open');
    renderAccountCard(account);
    refreshContinueButton();
  };
  window.submitLocalLogin=async()=>{
    try{completeAuth(await SuperkickAccounts.login(byId('auth-login-name').value,byId('auth-login-pass').value));}
    catch(error){authError(error);}
  };
  window.submitRegistration=async()=>{
    try{completeAuth(await SuperkickAccounts.register(byId('auth-register-name').value,byId('auth-register-pass').value,byId('auth-register-confirm').value));}
    catch(error){authError(error);}
  };
  window.submitSocialLogin=provider=>completeAuth(SuperkickAccounts.socialLogin(provider));
  window.logoutSuperkick=()=>{
    SuperkickAccounts.logout();
    closeSettings();
    refreshContinueButton();
    byId('auth-shell').classList.add('open');
  };
  function renderAccountCard(account=SuperkickAccounts.getSession()){
    const el=byId('legacy-account');if(!el)return;
    const profile=account?.profile||{};
    el.innerHTML=account?`
      <div class="fbtw mb"><span class="tm">ไอดีผู้เล่น</span><span class="account-id">${esc(account.playerId)}</span></div>
      <div class="fbtw mb"><span class="tm">ชื่อไอดี</span><strong>${esc(account.username)}</strong></div>
      <div class="fbtw mb"><span class="tm">รหัสผ่าน</span><span>${esc(account.passwordDisplay)}</span></div>
      ${profile.teamName?`<div class="fbtw"><span class="tm">เซฟล่าสุด</span><span>${esc(profile.teamName)} · S${profile.season||1} W${profile.week||1}</span></div>`:''}`:
      '<div class="tm">ยังไม่ได้เข้าสู่ระบบ</div>';
  }
  function init(){
    const account=SuperkickAccounts.getSession();
    renderAccountCard(account);
    refreshContinueButton();
    if(!account)byId('auth-shell').classList.add('open');
  }
  window.SuperkickAuth={inject,init,renderAccountCard};
})();

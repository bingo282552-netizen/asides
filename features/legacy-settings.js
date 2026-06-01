// Legacy page additions: account identity, settings entry, and league switching.
(function(){
  const {byId,esc}=SuperkickExperience;
  function inject(){
    byId('pg-legacy')?.insertAdjacentHTML('afterbegin',`
      <div class="card" style="border-color:var(--cyan);">
        <div class="fbtw"><div class="ct">Superkick ID</div><button class="btn bgh bsm" onclick="openSettings()">ตั้งค่า</button></div>
        <div id="legacy-account"></div>
      </div>
      <div class="card">
        <div class="ct">เปลี่ยนลีกหลังจบฤดูกาล</div>
        <div class="tm mbm">เปลี่ยนลีกได้หลังเล่นจบฤดูกาล และก่อนเริ่มนัดแรกของฤดูกาลใหม่</div>
        <div id="legacy-leagues-grid" class="g3"></div>
      </div>`);
    byId('pg-legacy')?.insertAdjacentHTML('beforeend',`
      <div class="card" style="border-color:var(--red);">
        <div class="ct" style="color:var(--red);">Admin Mode</div>
        <div class="tm mbm">สำหรับเจ้าของเกมเท่านั้น ต้องกรอกชื่อและรหัสผ่านก่อนเข้าหน้าจัดการ</div>
        <button class="btn br" style="width:100%;" onclick="openAdminLogin()">admin mode</button>
      </div>`);
  }
  function render(){
    SuperkickAuth.renderAccountCard();
    const grid=byId('legacy-leagues-grid');if(!grid)return;
    const unlocked=!!G.canChangeLeague;
    grid.innerHTML=LEAGUES_DATA.map(league=>`
      <button class="btn ${G.league===league.id?'bg':'bgh'} bsm" onclick="selectLeague('${league.id}')" ${G.league!==league.id&&!unlocked?'disabled':''}>${league.flag} ${esc(league.name)}</button>`).join('');
  }
  window.SuperkickLegacy={inject,render};
})();

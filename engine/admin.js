// ===== ADMIN MODE =====
(function(){
  const ADMIN_USERNAME='BingoBall';
  const ADMIN_PASSWORD='28122552bingoO/';
  const ADMIN_SESSION_KEY='skfm_admin_session_v1';
  const ADMIN_LOG_KEY='skfm_admin_log_v1';
  const ACCOUNT_KEY='skfm_player_accounts_v1';
  const SESSION_KEY='skfm_player_session_v1';
  const REMOTE_SESSION_KEY='skfm_player_remote_session_v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const adminState={token:'',mode:'browser',players:[],selectedId:'',log:[]};
  const adminApiBase=()=>window.SUPERKICK_SERVICE_CONFIG?.online?.apiBase||'';
  const adminBackendReady=()=>!!(window.SUPERKICK_SERVICE_CONFIG?.online?.enabled&&adminApiBase());

  function loadAdminSession(){
    try{
      const saved=JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY)||'null');
      if(saved&&Date.now()-saved.at<8*60*60*1000){
        adminState.token=saved.token||'';
        adminState.mode=saved.mode||'browser';
        return saved;
      }
    }catch(e){}
    return null;
  }

  function saveAdminSession(token,mode){
    adminState.token=token;
    adminState.mode=mode;
    localStorage.setItem(ADMIN_SESSION_KEY,JSON.stringify({token,mode,at:Date.now()}));
  }

  function localAccounts(){
    try{return JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'[]');}
    catch(e){return [];}
  }

  function saveLocalAccounts(accounts){
    localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
  }

  function saveKey(playerId){
    return `skfm_save_${playerId}`;
  }

  function readSaveData(playerId){
    try{
      const raw=localStorage.getItem(saveKey(playerId));
      const data=raw?JSON.parse(raw):{};
      return data&&typeof data==='object'?data:{};
    }catch(e){return {};}
  }

  function writeSaveData(playerId,data){
    localStorage.setItem(saveKey(playerId),JSON.stringify(data||{}));
  }

  function adminSaveSummary(data){
    data=data&&typeof data==='object'?data:{};
    return {
      teamName:data.teamName||'ยังไม่มีทีม',
      money:Number(data.money||0),
      coins:Number(data.coins||0),
      season:Number(data.season||1),
      week:Number(data.week||1),
      squadCount:Array.isArray(data.squad)?data.squad.length:0,
      squadSlots:Number(data.squadSlots||50),
      inventoryCount:(Array.isArray(data.inventory)?data.inventory:[]).reduce((sum,item)=>sum+Number(item.qty||1),0),
    };
  }

  function localPlayerRows(){
    return localAccounts().map(account=>{
      const save=readSaveData(account.playerId);
      return {
        playerId:account.playerId,
        username:account.username,
        provider:account.provider||'local',
        createdAt:account.createdAt||0,
        banned:!!account.banned,
        profile:{...(account.profile||{})},
        ranked:account.ranked||{elo:1200,wins:0,draws:0,losses:0},
        summary:adminSaveSummary(save),
      };
    });
  }

  function appendLocalAdminLog(entry){
    let log=[];
    try{log=JSON.parse(localStorage.getItem(ADMIN_LOG_KEY)||'[]');}catch(e){log=[];}
    log.unshift({at:Date.now(),...entry});
    log=log.slice(0,80);
    localStorage.setItem(ADMIN_LOG_KEY,JSON.stringify(log));
    return log;
  }

  function localAdminLog(){
    try{return JSON.parse(localStorage.getItem(ADMIN_LOG_KEY)||'[]');}
    catch(e){return [];}
  }

  async function adminRequest(path,options={}){
    const headers={'Content-Type':'application/json',...(options.headers||{})};
    if(adminState.token)headers.Authorization=`Bearer ${adminState.token}`;
    const response=await fetch(`${adminApiBase()}${path}`,{...options,headers});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Admin backend error');
    return data;
  }

  function openAdminLogin(){
    const mode=adminBackendReady()?'Backend ออนไลน์: ดูและจัดการผู้เล่นทุกคนในฐานข้อมูล':'GitHub/browser mode: จัดการบัญชีที่อยู่ใน browser นี้';
    document.getElementById('admin-login-content').innerHTML=`
      <div class="mdt">Admin Mode</div>
      <div class="tm mbm">${mode}</div>
      <div class="mb"><label class="tm">ชื่อแอดมิน</label><input id="admin-login-name" type="text" autocomplete="username" placeholder="Admin name"></div>
      <div class="mb"><label class="tm">รหัสผ่าน</label><input id="admin-login-pass" type="password" autocomplete="current-password" placeholder="Password" onkeydown="if(event.key==='Enter')submitAdminLogin()"></div>
      <div id="admin-login-error" class="tr mbm" style="min-height:20px;font-size:.82rem;"></div>
      <button class="btn br" style="width:100%;" onclick="submitAdminLogin()">เข้าสู่ Admin Mode</button>`;
    openM('modal-admin-login');
  }

  async function submitAdminLogin(){
    const username=document.getElementById('admin-login-name')?.value?.trim()||'';
    const password=document.getElementById('admin-login-pass')?.value||'';
    const error=document.getElementById('admin-login-error');
    if(username!==ADMIN_USERNAME||password!==ADMIN_PASSWORD){
      if(error)error.textContent='ชื่อหรือรหัสผ่านแอดมินไม่ถูกต้อง';
      return;
    }
    try{
      if(adminBackendReady()){
        const data=await adminRequest('/admin/login',{method:'POST',body:JSON.stringify({username,password})});
        saveAdminSession(data.token,'backend');
      }else{
        saveAdminSession('browser-admin-'+Date.now(),'browser');
      }
      closeM('modal-admin-login');
      goPage('admin');
      await refreshAdminPlayers();
      notify('🛡️ เข้า Admin Mode แล้ว','green');
    }catch(err){
      if(error)error.textContent=err.message||'เข้า Admin Mode ไม่สำเร็จ';
    }
  }

  function adminLogout(){
    adminState.token='';
    adminState.players=[];
    adminState.selectedId='';
    localStorage.removeItem(ADMIN_SESSION_KEY);
    notify('ออกจาก Admin Mode แล้ว','gold');
    goPage('legacy');
  }

  function assertAdmin(){
    if(adminState.token)return true;
    const saved=loadAdminSession();
    if(saved)return true;
    openAdminLogin();
    return false;
  }

  async function refreshAdminPlayers(){
    if(!assertAdmin())return;
    const status=document.getElementById('admin-mode-status');
    try{
      if(adminBackendReady()&&adminState.mode==='backend'){
        const data=await adminRequest('/admin/players');
        adminState.players=data.players||[];
        adminState.log=data.log||[];
        if(status)status.textContent='Backend admin: จัดการผู้เล่นทุกคนในฐานข้อมูลออนไลน์';
      }else{
        adminState.mode='browser';
        adminState.players=localPlayerRows();
        adminState.log=localAdminLog();
        if(status)status.textContent='GitHub/browser mode: จัดการได้เฉพาะบัญชีที่อยู่ใน browser เครื่องนี้';
      }
      renderAdminPlayerList();
      renderAdminLog();
      if(adminState.selectedId)selectAdminPlayer(adminState.selectedId,false);
    }catch(err){
      if(status)status.textContent=err.message||'โหลดข้อมูลแอดมินไม่สำเร็จ';
      notify(err.message||'โหลดข้อมูลแอดมินไม่สำเร็จ','red');
    }
  }

  function renderAdminPlayerList(){
    const root=document.getElementById('admin-player-list');
    if(!root)return;
    const q=(document.getElementById('admin-player-search')?.value||'').trim().toLowerCase();
    const rows=(adminState.players||[]).filter(p=>{
      const text=`${p.playerId} ${p.username} ${p.summary?.teamName||''}`.toLowerCase();
      return !q||text.includes(q);
    });
    root.innerHTML=rows.length?rows.map(p=>`
      <button class="admin-player-row ${p.playerId===adminState.selectedId?'selected':''}" onclick="selectAdminPlayer('${esc(p.playerId)}')">
        <span><strong>${esc(p.username)}</strong><span class="tm"> · ${esc(p.summary?.teamName||'-')}</span></span>
        <span class="account-id">${esc(p.playerId)}</span>
        ${p.banned?'<span class="badge bg-red">BAN</span>':'<span class="badge bg-green">OK</span>'}
      </button>`).join(''):'ไม่มีผู้เล่น';
  }

  function renderAdminLog(){
    const root=document.getElementById('admin-log');
    if(!root)return;
    const log=adminState.log||[];
    root.innerHTML=log.length?log.slice(0,20).map(item=>{
      const date=new Date(item.at||item.createdAt||Date.now()).toLocaleString('th-TH');
      return `<div class="fbtw admin-log-row"><span>${esc(date)} · ${esc(item.action||'-')}</span><span class="tm">${esc(item.targetId||item.playerId||'')}</span></div>`;
    }).join(''):'ยังไม่มี log';
  }

  function selectAdminPlayer(playerId,rerender=true){
    const player=(adminState.players||[]).find(p=>p.playerId===playerId);
    if(!player)return;
    adminState.selectedId=playerId;
    if(rerender)renderAdminPlayerList();
    renderAdminDetail(player);
  }

  function renderAdminDetail(player){
    const root=document.getElementById('admin-player-detail');
    if(!root)return;
    const s=player.summary||{};
    root.innerHTML=`
      <div class="admin-target">
        <div class="fbtw mb"><span class="tm">Username</span><strong>${esc(player.username)}</strong></div>
        <div class="fbtw mb"><span class="tm">เลขไอดี</span><span class="account-id">${esc(player.playerId)}</span></div>
        <div class="fbtw mb"><span class="tm">ทีม</span><span>${esc(s.teamName||'-')}</span></div>
        <div class="g2 mbm">
          <div class="card admin-mini"><span class="tm">เงิน</span><strong class="tgr">${fmt(s.money||0)}</strong></div>
          <div class="card admin-mini"><span class="tm">Coins</span><strong class="tg">${s.coins||0}</strong></div>
          <div class="card admin-mini"><span class="tm">ทีม</span><strong>${s.squadCount||0}/${s.squadSlots||50}</strong></div>
          <div class="card admin-mini"><span class="tm">Inventory</span><strong>${s.inventoryCount||0}</strong></div>
        </div>
      </div>
      <hr class="div">
      <button class="btn ${player.banned?'bgr':'br'}" style="width:100%;margin-bottom:.65rem;" onclick="runAdminAction('${player.banned?'unban':'ban'}')">${player.banned?'ปลดแบน':'แบน'}</button>
      <div class="admin-action-grid">
        <div>
          <label class="tm">เสกเงินให้</label>
          <div class="fb gap"><input id="admin-money-amount" type="number" value="1000000" min="0"><button class="btn bg bsm" onclick="runAdminAction('add_money')">ให้เงิน</button></div>
        </div>
        <div>
          <label class="tm">ให้เหรียญเติม</label>
          <div class="fb gap"><input id="admin-coins-amount" type="number" value="500" min="0"><button class="btn bg bsm" onclick="runAdminAction('add_coins')">ให้ Coins</button></div>
        </div>
        <div>
          <label class="tm">ให้นักเตะในเกม</label>
          <input id="admin-player-name" type="text" placeholder="ชื่อว่างได้">
          <div class="fb gap" style="margin-top:6px;">
            <select id="admin-player-pos"><option>GK</option><option>CB</option><option>LB</option><option>RB</option><option>CDM</option><option>CM</option><option>CAM</option><option>LW</option><option>RW</option><option>ST</option></select>
            <select id="admin-player-tier"><option value="gold">Gold</option><option value="silver">Silver</option><option value="elite">Elite</option><option value="icon">Icon</option><option value="bronze">Bronze</option></select>
            <input id="admin-player-ovr" type="number" value="88" min="60" max="99">
          </div>
          <button class="btn bbl bsm" style="width:100%;margin-top:6px;" onclick="runAdminAction('add_player')">ให้นักเตะเข้าทีม</button>
        </div>
        <div>
          <label class="tm">เปลี่ยนเลขไอดี</label>
          <div class="fb gap"><input id="admin-new-player-id" type="text" placeholder="เช่น 123456789"><button class="btn bgh bsm" onclick="runAdminAction('change_id')">เปลี่ยน</button></div>
        </div>
        <div>
          <label class="tm">เสกแพ็คเข้า Inventory</label>
          <div class="fb gap">
            <select id="admin-pack-type"><option value="bronze">Bronze</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="legend">Legend</option></select>
            <input id="admin-pack-qty" type="number" value="1" min="1" max="99">
            <button class="btn bpu bsm" onclick="runAdminAction('add_pack')">ให้แพ็ค</button>
          </div>
        </div>
      </div>`;
  }

  function adminPayload(action){
    const targetId=adminState.selectedId;
    const payload={targetId,action};
    if(action==='add_money')payload.amount=parseInt(document.getElementById('admin-money-amount')?.value||'0',10)||0;
    if(action==='add_coins')payload.amount=parseInt(document.getElementById('admin-coins-amount')?.value||'0',10)||0;
    if(action==='change_id')payload.newPlayerId=(document.getElementById('admin-new-player-id')?.value||'').trim();
    if(action==='add_pack'){
      payload.packType=document.getElementById('admin-pack-type')?.value||'bronze';
      payload.qty=parseInt(document.getElementById('admin-pack-qty')?.value||'1',10)||1;
    }
    if(action==='add_player'){
      payload.player={
        name:(document.getElementById('admin-player-name')?.value||'').trim(),
        pos:document.getElementById('admin-player-pos')?.value||'ST',
        tier:document.getElementById('admin-player-tier')?.value||'gold',
        ovr:parseInt(document.getElementById('admin-player-ovr')?.value||'88',10)||88,
      };
    }
    return payload;
  }

  function buildAdminPlayer(spec={}){
    const tier=spec.tier||'gold';
    const ovr=clamp(Number(spec.ovr||88),60,99);
    const name=String(spec.name||'').trim();
    let player=genPlayer({name:name||undefined,pos:spec.pos||'ST',cardTier:tier,base:ovr,potential:Math.max(ovr,92),real:!name});
    player.id=uid();
    player.playerId=player.id;
    player.ovr=ovr;
    player.ca=ovr;
    player.potential=Math.max(player.potential||ovr,ovr);
    player.potentialMin=Math.max(player.potentialMin||ovr,ovr);
    player.potentialMax=Math.max(player.potentialMax||ovr,player.potentialMin);
    player.acquisition='admin_grant';
    player.isInitialSquad=false;
    return applyTierEconomy(player,{force:true});
  }

  function ensureSaveShape(data,account){
    data=data&&typeof data==='object'?data:{};
    data.money=Number(data.money||0);
    data.coins=Number(data.coins||0);
    data.squad=Array.isArray(data.squad)?data.squad:[];
    data.inventory=Array.isArray(data.inventory)?data.inventory:[];
    data.squadSlots=Number(data.squadSlots||50);
    data.teamName=data.teamName||account?.profile?.teamName||account?.username||'FC Admin';
    return data;
  }

  function localAddInventoryPack(data,packType,qty){
    const type=SUPERKICK_ECONOMY_CATALOG.CARD_PACKS[packType]?packType:'bronze';
    const stackKey=`pack:${type}`;
    const item=data.inventory.find(entry=>entry.stackKey===stackKey);
    if(item)item.qty=Number(item.qty||1)+qty;
    else data.inventory.unshift({id:uid(),kind:'pack',packType:type,label:`${type} Pack`,icon:'🎴',source:'admin_grant',stackKey,qty,createdAt:Date.now()});
  }

  function syncAdminMutationToCurrent(playerId,saveRaw,newPlayerId=''){
    const account=window.SuperkickAccounts?.getSession?.();
    if(!account||account.playerId!==playerId)return;
    if(newPlayerId&&newPlayerId!==playerId){
      const remoteRaw=localStorage.getItem(REMOTE_SESSION_KEY);
      if(remoteRaw){
        try{
          const remote=JSON.parse(remoteRaw);
          if(remote?.account?.playerId===playerId){
            remote.account.playerId=newPlayerId;
            localStorage.setItem(REMOTE_SESSION_KEY,JSON.stringify(remote));
          }
        }catch(e){}
      }
    }
    if(saveRaw){
      const key=saveKey(newPlayerId||playerId);
      localStorage.setItem(key,saveRaw);
      try{
        const data=JSON.parse(saveRaw);
        applyLoadedState(data);
        updateHUD();
      }catch(e){}
    }
  }

  function localRunAdminAction(payload){
    const accounts=localAccounts();
    const account=accounts.find(item=>item.playerId===payload.targetId);
    if(!account)throw new Error('ไม่พบผู้เล่นใน browser นี้');
    const oldId=account.playerId;
    let newId='';
    let data=ensureSaveShape(readSaveData(oldId),account);
    if(payload.action==='ban')account.banned=true;
    else if(payload.action==='unban')account.banned=false;
    else if(payload.action==='add_money')data.money=Math.max(0,Number(data.money||0)+Math.max(0,Number(payload.amount||0)));
    else if(payload.action==='add_coins')data.coins=Math.max(0,Number(data.coins||0)+Math.max(0,Number(payload.amount||0)));
    else if(payload.action==='add_player')data.squad.push(buildAdminPlayer(payload.player||{}));
    else if(payload.action==='add_pack')localAddInventoryPack(data,payload.packType,Math.max(1,Math.min(99,Number(payload.qty||1))));
    else if(payload.action==='change_id'){
      newId=String(payload.newPlayerId||'').trim();
      if(!/^[A-Za-z0-9_-]{4,18}$/.test(newId))throw new Error('เลขไอดีใหม่ต้องเป็นตัวอักษร/ตัวเลข 4-18 ตัว');
      if(accounts.some(item=>item.playerId===newId))throw new Error('เลขไอดีนี้ถูกใช้แล้ว');
      account.playerId=newId;
      const raw=localStorage.getItem(saveKey(oldId));
      if(raw!==null){
        localStorage.setItem(saveKey(newId),raw);
        localStorage.removeItem(saveKey(oldId));
      }
      const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      if(session?.playerId===oldId){
        session.playerId=newId;
        localStorage.setItem(SESSION_KEY,JSON.stringify(session));
      }
    }else throw new Error('ไม่รู้จักคำสั่ง admin');
    saveLocalAccounts(accounts);
    if(payload.action!=='change_id'||localStorage.getItem(saveKey(newId))===null)writeSaveData(newId||oldId,data);
    const saveRaw=localStorage.getItem(saveKey(newId||oldId))||JSON.stringify(data);
    adminState.log=appendLocalAdminLog({action:payload.action,targetId:newId||oldId,admin:ADMIN_USERNAME});
    adminState.players=localPlayerRows();
    adminState.selectedId=newId||oldId;
    syncAdminMutationToCurrent(oldId,saveRaw,newId);
    return {target:adminState.players.find(p=>p.playerId===adminState.selectedId),save:saveRaw,players:adminState.players,log:adminState.log};
  }

  async function runAdminAction(action){
    if(!assertAdmin())return;
    if(!adminState.selectedId){notify('เลือกผู้เล่นก่อน','red');return;}
    const payload=adminPayload(action);
    try{
      let result;
      if(adminBackendReady()&&adminState.mode==='backend'){
        result=await adminRequest('/admin/player/action',{method:'POST',body:JSON.stringify(payload)});
        adminState.players=result.players||adminState.players;
        adminState.log=result.log||adminState.log;
        if(action==='change_id'&&result.target?.playerId)adminState.selectedId=result.target.playerId;
        syncAdminMutationToCurrent(payload.targetId,result.save||'',result.target?.playerId||'');
      }else{
        result=localRunAdminAction(payload);
      }
      renderAdminPlayerList();
      renderAdminLog();
      if(result.target)renderAdminDetail(result.target);
      notify('✅ ทำรายการ admin สำเร็จ','green');
    }catch(err){
      notify(err.message||'ทำรายการ admin ไม่สำเร็จ','red');
    }
  }

  function renderAdmin(){
    if(!assertAdmin())return;
    if(!adminState.players.length)refreshAdminPlayers();
    else{
      renderAdminPlayerList();
      renderAdminLog();
      if(adminState.selectedId)selectAdminPlayer(adminState.selectedId,false);
    }
  }

  loadAdminSession();
  window.openAdminLogin=openAdminLogin;
  window.submitAdminLogin=submitAdminLogin;
  window.adminLogout=adminLogout;
  window.refreshAdminPlayers=refreshAdminPlayers;
  window.renderAdminPlayerList=renderAdminPlayerList;
  window.selectAdminPlayer=selectAdminPlayer;
  window.runAdminAction=runAdminAction;
  window.renderAdmin=renderAdmin;
})();

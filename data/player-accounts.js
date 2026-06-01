// Local offline account store for FM KICK.
// Passwords are stored as hashes only. Plain-text passwords must never be saved.
(function(){
  const ACCOUNTS_KEY='skfm_player_accounts_v1';
  const SESSION_KEY='skfm_player_session_v1';
  const REMOTE_SESSION_KEY='skfm_player_remote_session_v1';
  const SESSION_MAX_AGE=14*24*60*60*1000;

  const load=()=>{
    try{return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'[]');}
    catch(e){return [];}
  };
  const save=accounts=>localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(accounts));
  const gameId=accounts=>{
    let id;
    do{id=String(Math.floor(100000000+Math.random()*900000000));}
    while(accounts.some(a=>a.playerId===id));
    return id;
  };
  const hash=async text=>{
    if(window.crypto?.subtle){
      const data=new TextEncoder().encode(text);
      const digest=await crypto.subtle.digest('SHA-256',data);
      return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
    }
    let value=2166136261;
    for(const ch of text)value=Math.imul(value^ch.charCodeAt(0),16777619);
    return 'offline-'+(value>>>0).toString(16);
  };
  const publicAccount=a=>a?{
    playerId:a.playerId,
    username:a.username,
    provider:a.provider,
    banned:!!a.banned,
    passwordDisplay:a.provider==='local'?'••••••••':'เชื่อมต่อผ่าน '+a.provider,
    createdAt:a.createdAt,
    profile:{...(a.profile||{})},
  }:null;
  const remoteConfig=()=>window.SUPERKICK_SERVICE_CONFIG?.online||{};
  const remoteEnabled=()=>!!(remoteConfig().enabled&&remoteConfig().apiBase);
  const switchToBrowserMode=()=>{
    const config=remoteConfig();
    config.enabled=false;
    config.apiBase='';
    config.mode='browser';
    if(window.SUPERKICK_RUNTIME){
      window.SUPERKICK_RUNTIME.mode='browser';
      window.SUPERKICK_RUNTIME.backendOrigin='';
    }
    window.dispatchEvent(new Event('superkick:modechange'));
  };
  const backendUnavailable=error=>!!(
    error?.backendUnavailable||
    [404,405,501,502,503,504].includes(error?.status)||
    error instanceof TypeError
  );
  const remoteRequest=async(path,options={})=>{
    const cfg=remoteConfig();
    const session=getRemoteSessionRaw();
    const headers={'Content-Type':'application/json',...(options.headers||{})};
    if(session?.token)headers.Authorization=`Bearer ${session.token}`;
    let response;
    try{response=await fetch(`${cfg.apiBase}${path}`,{...options,headers});}
    catch(error){error.backendUnavailable=true;throw error;}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const error=new Error(data.error||'เชื่อมต่อ backend ไม่สำเร็จ');
      error.status=response.status;
      error.backendUnavailable=[404,405,501,502,503,504].includes(response.status);
      throw error;
    }
    return data;
  };
  const getRemoteSessionRaw=()=>{
    try{
      const session=JSON.parse(localStorage.getItem(REMOTE_SESSION_KEY)||'null');
      if(!session||Date.now()-session.lastLoginAt>SESSION_MAX_AGE){
        localStorage.removeItem(REMOTE_SESSION_KEY);
        return null;
      }
      return session;
    }catch(e){return null;}
  };
  const startRemoteSession=(token,account)=>{
    const session={token,account,lastLoginAt:Date.now()};
    localStorage.setItem(REMOTE_SESSION_KEY,JSON.stringify(session));
    localStorage.setItem(SESSION_KEY,JSON.stringify({
      playerId:account.playerId,username:account.username,provider:account.provider,lastLoginAt:Date.now(),
    }));
    remoteRequest('/save').then(data=>{
      if(data.save){
        localStorage.setItem(`skfm_save_${account.playerId}`,data.save);
        if(window.refreshContinueButton)refreshContinueButton();
      }
    }).catch(e=>console.warn('Remote save load failed',e));
    return account;
  };
  const startSession=account=>{
    const session={playerId:account.playerId,username:account.username,provider:account.provider,lastLoginAt:Date.now()};
    localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    return publicAccount(account);
  };
  const getSession=()=>{
    const remote=getRemoteSessionRaw();
    if(remote?.account)return remote.account;
    try{
      const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      if(!session||Date.now()-session.lastLoginAt>SESSION_MAX_AGE){
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      const account=load().find(a=>a.playerId===session.playerId);
      if(account?.banned){
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return publicAccount(account);
    }catch(e){return null;}
  };
  const saveProfile=profile=>{
    const remote=getRemoteSessionRaw();
    if(remote?.account&&remoteEnabled()){
      remote.account.profile={...(remote.account.profile||{}),...(profile||{})};
      remote.lastLoginAt=Date.now();
      localStorage.setItem(REMOTE_SESSION_KEY,JSON.stringify(remote));
      remoteRequest('/profile',{method:'PUT',body:JSON.stringify(profile||{})}).catch(e=>console.warn('Remote profile sync failed',e));
      return remote.account;
    }
    const session=getSession();
    if(!session)return null;
    const accounts=load();
    const account=accounts.find(a=>a.playerId===session.playerId);
    if(!account)return null;
    account.profile={...(account.profile||{}),...(profile||{})};
    account.updatedAt=Date.now();
    save(accounts);
    return publicAccount(account);
  };
  const getSaveKey=()=>{
    const session=getSession();
    return session?`skfm_save_${session.playerId}`:'skfm_save';
  };
  const readGameSave=()=>localStorage.getItem(getSaveKey());
  const writeGameSave=serialized=>{
    localStorage.setItem(getSaveKey(),serialized);
    const remote=getRemoteSessionRaw();
    if(remote?.token&&remoteEnabled()){
      remoteRequest('/save',{method:'PUT',body:JSON.stringify({save:serialized,profile:remote.account?.profile||{}})})
        .catch(e=>console.warn('Remote save sync failed',e));
    }
  };
  const register=async(username,password,confirmPassword)=>{
    username=String(username||'').trim();
    if(username.length<3)throw new Error('ชื่อไอดีต้องมีอย่างน้อย 3 ตัวอักษร');
    if(String(password||'').length<6)throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if(password!==confirmPassword)throw new Error('รหัสผ่านสองช่องไม่ตรงกัน');
    if(remoteEnabled()){
      try{
        const data=await remoteRequest('/auth/register',{method:'POST',body:JSON.stringify({username,password})});
        return startRemoteSession(data.token,data.account);
      }catch(error){
        if(backendUnavailable(error)){switchToBrowserMode();console.warn('Remote register failed, using browser account',error);}
        else throw error;
      }
    }
    const accounts=load();
    if(accounts.some(a=>a.username.toLowerCase()===username.toLowerCase()))throw new Error('ชื่อไอดีนี้ถูกใช้แล้ว');
    const account={playerId:gameId(accounts),username,passwordHash:await hash(password),provider:'local',createdAt:Date.now(),profile:{displayName:username}};
    accounts.push(account);save(accounts);
    return startSession(account);
  };
  const login=async(username,password)=>{
    username=String(username||'').trim();
    if(remoteEnabled()){
      try{
        const data=await remoteRequest('/auth/login',{method:'POST',body:JSON.stringify({username,password})});
        return startRemoteSession(data.token,data.account);
      }catch(error){
        if(!backendUnavailable(error))throw error;
        switchToBrowserMode();
        console.warn('Remote login failed, trying browser account',error);
      }
    }
    const accounts=load();
    const account=accounts.find(a=>a.username.toLowerCase()===username.toLowerCase()&&a.provider==='local');
    if(!account||account.passwordHash!==await hash(password))throw new Error('ชื่อไอดีหรือรหัสผ่านไม่ถูกต้อง');
    if(account.banned)throw new Error('ไอดีนี้ถูกแบนโดยแอดมิน');
    return startSession(account);
  };
  window.SuperkickAccounts={
    register,login,getSession,saveProfile,getSaveKey,readGameSave,writeGameSave,
    remoteToken:()=>getRemoteSessionRaw()?.token||'',
    logout:()=>{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(REMOTE_SESSION_KEY);},
    listAccounts:()=>load().map(publicAccount),
    sessionMaxAgeMs:SESSION_MAX_AGE,
  };
  window.SUPERKICK_ACCOUNT_SCHEMA={
    playerId:'เลขไอดีผู้เล่น 9 หลัก',
    username:'ชื่อไอดีผู้เล่น',
    passwordHash:'รหัสผ่านแบบ hash เท่านั้น ไม่เก็บข้อความจริง',
    provider:'local',
    profile:'ข้อมูลเกมล่าสุดของผู้สมัคร เช่น สโมสร ลีก ฤดูกาล และเวลาเล่นล่าสุด',
  };
})();

// Local offline account store for Superkick FM.
// Passwords are stored as hashes only. Plain-text passwords must never be saved.
(function(){
  const ACCOUNTS_KEY='skfm_player_accounts_v1';
  const SESSION_KEY='skfm_player_session_v1';
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
    passwordDisplay:a.provider==='local'?'••••••••':'เชื่อมต่อผ่าน '+a.provider,
    createdAt:a.createdAt,
    profile:{...(a.profile||{})},
  }:null;
  const startSession=account=>{
    const session={playerId:account.playerId,username:account.username,provider:account.provider,lastLoginAt:Date.now()};
    localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    return publicAccount(account);
  };
  const getSession=()=>{
    try{
      const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      if(!session||Date.now()-session.lastLoginAt>SESSION_MAX_AGE){
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      const account=load().find(a=>a.playerId===session.playerId);
      return publicAccount(account);
    }catch(e){return null;}
  };
  const saveProfile=profile=>{
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
  const writeGameSave=serialized=>localStorage.setItem(getSaveKey(),serialized);
  const register=async(username,password,confirmPassword)=>{
    username=String(username||'').trim();
    if(username.length<3)throw new Error('ชื่อไอดีต้องมีอย่างน้อย 3 ตัวอักษร');
    if(String(password||'').length<6)throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if(password!==confirmPassword)throw new Error('รหัสผ่านสองช่องไม่ตรงกัน');
    const accounts=load();
    if(accounts.some(a=>a.username.toLowerCase()===username.toLowerCase()))throw new Error('ชื่อไอดีนี้ถูกใช้แล้ว');
    const account={playerId:gameId(accounts),username,passwordHash:await hash(password),provider:'local',createdAt:Date.now(),profile:{displayName:username}};
    accounts.push(account);save(accounts);
    return startSession(account);
  };
  const login=async(username,password)=>{
    username=String(username||'').trim();
    const accounts=load();
    const account=accounts.find(a=>a.username.toLowerCase()===username.toLowerCase()&&a.provider==='local');
    if(!account||account.passwordHash!==await hash(password))throw new Error('ชื่อไอดีหรือรหัสผ่านไม่ถูกต้อง');
    return startSession(account);
  };
  const socialLogin=provider=>{
    const accounts=load();
    const username=`${provider}_manager_${String(Math.floor(1000+Math.random()*9000))}`;
    const account={playerId:gameId(accounts),username,passwordHash:'',provider,createdAt:Date.now(),profile:{displayName:username}};
    accounts.push(account);save(accounts);
    return startSession(account);
  };
  window.SuperkickAccounts={
    register,login,socialLogin,getSession,saveProfile,getSaveKey,readGameSave,writeGameSave,
    logout:()=>localStorage.removeItem(SESSION_KEY),
    listAccounts:()=>load().map(publicAccount),
    sessionMaxAgeMs:SESSION_MAX_AGE,
  };
  window.SUPERKICK_ACCOUNT_SCHEMA={
    playerId:'เลขไอดีผู้เล่น 9 หลัก',
    username:'ชื่อไอดีผู้เล่น',
    passwordHash:'รหัสผ่านแบบ hash เท่านั้น ไม่เก็บข้อความจริง',
    provider:'local | google | apple',
    profile:'ข้อมูลเกมล่าสุดของผู้สมัคร เช่น สโมสร ลีก ฤดูกาล และเวลาเล่นล่าสุด',
  };
})();

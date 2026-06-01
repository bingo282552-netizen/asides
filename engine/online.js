// ===== ONLINE SYSTEM =====
let friendRooms=[];
let activeFriendRoom=null;
let friendMatchTicker=null;
let friendRoomSyncTimer=null;
let friendReturnTimer=null;
let friendTeamSaveTimer=null;
let friendMatchMinute=0;
let friendMatchEvents=[];
const onlineService=()=>window.SUPERKICK_SERVICE_CONFIG?.online||{};
const onlineReady=()=>!!(onlineService().enabled&&onlineService().apiBase);
function onlineEsc(value){
  const esc=window.SuperkickExperience?.esc;
  if(esc)return esc(value);
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
async function onlineApi(path,options={}){
  const service=onlineService();
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  const token=window.SuperkickAccounts?.remoteToken?.();
  if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetch(`${service.apiBase}${path}`,{...options,headers});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Online backend error');
  return data;
}
function applyOnlineSnapshot(message){
  if(Array.isArray(message.market))G.onlineMarket=message.market;
  if(Array.isArray(message.managers))G.onlineManagers=message.managers;
  if(Array.isArray(message.rooms)){
    friendRooms=message.rooms;
    if(activeFriendRoom?.code){
      const fresh=friendRooms.find(room=>room.code===activeFriendRoom.code);
      if(fresh)activeFriendRoom=fresh;
    }
  }
  if(message.room)activeFriendRoom=message.room;
}
async function refreshRemoteOnlineSnapshot(){
  if(!onlineReady())return false;
  try{
    const snapshot=await onlineApi('/online/snapshot');
    applyOnlineSnapshot(snapshot);
    return true;
  }catch(error){
    console.warn('Online snapshot failed',error);
    return false;
  }
}
function renderOnline(){
  const service=window.SUPERKICK_SERVICE_CONFIG?.online||{};
  const status=document.getElementById('online-service-status');
  const configured=service.enabled&&service.apiBase;
  G.onlineMode=configured?'remote':'local';
  if(status)status.innerHTML=configured
    ?'<span class="tgr">Online backend พร้อมใช้งาน · ห้องเล่นกับเพื่อน sync อัตโนมัติ</span>'
    :'<span class="tg">GitHub Pages mode: เล่นและเซฟใน browser ได้ · ห้องเล่นกับเพื่อนข้ามอุปกรณ์ต้องตั้งค่า backend</span>';
  document.getElementById('ranked-rating').textContent=G.rankedELO;
  document.getElementById('ranked-record').textContent=`W${G.rankedW} D${G.rankedD} L${G.rankedL}`;
  // Global ranking (simulated)
  let globalTeams=[
    {name:'ManCity FC',elo:1650,flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},{name:'El Clasico',elo:1580,flag:'🇪🇸'},
    {name:'Die Bayern',elo:1520,flag:'🇩🇪'},{name:G.teamName,elo:G.rankedELO,flag:'🇹🇭',isMe:true},
    {name:'PSG United',elo:1440,flag:'🇫🇷'},{name:'Serie A Stars',elo:1390,flag:'🇮🇹'},
  ].sort((a,b)=>b.elo-a.elo);
  const account=window.SuperkickAccounts?.getSession?.();
  if(G.onlineManagers?.length){
    globalTeams=G.onlineManagers.map(m=>({
      name:m.name||m.team||m.username,
      elo:m.elo||1200,
      flag:m.id===account?.playerId?'🇹🇭':'🌐',
      isMe:m.id===account?.playerId,
    })).sort((a,b)=>b.elo-a.elo);
  }
  document.getElementById('global-ranking').innerHTML=globalTeams.map((t,i)=>`
    <div class="fbtw" style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem;${t.isMe?'color:var(--gold);font-weight:700;':''}">
      <span>${i+1}. ${onlineEsc(t.flag)} ${onlineEsc(t.name)}</span><span>ELO ${Number(t.elo)||0}</span>
    </div>`).join('');
  // Online market
  if(!G.onlineMarket.length)refreshOnlineMarket();
  renderOnlineMarket();
  renderFriendRoomPanel();
  // Tournament
  renderTournament();
}
function playRanked(){
  if(onlineReady()&&window.SuperkickAccounts?.remoteToken?.()){
    onlineApi('/online/ranked',{method:'POST',body:JSON.stringify({
      teamName:G.teamName,elo:G.rankedELO,strength:calcTeamStrength().total,
    })}).then(data=>{
      const ranked=data.ranked||{};
      G.rankedELO=ranked.elo||G.rankedELO;
      G.rankedW=ranked.wins||0;G.rankedD=ranked.draws||0;G.rankedL=ranked.losses||0;
      if(Array.isArray(data.ranking))G.onlineManagers=data.ranking;
      const resultEmoji=data.result==='win'?'🏆':data.result==='draw'?'🤝':'😔';
      notify(`${resultEmoji} Ranked Online: ${String(data.result||'').toUpperCase()} ELO ${data.eloChange>0?'+':''}${data.eloChange} → ${G.rankedELO}`,'blue');
      renderOnline();saveGame();
    }).catch(error=>notify(error.message||'Ranked online ไม่สำเร็จ','red'));
    return;
  }
  const myStr=calcTeamStrength().total;
  const oppELO=rnd(Math.max(800,G.rankedELO-150),G.rankedELO+150);
  const oppStr=Math.round(oppELO/20);
  const myChance=0.5+(myStr-oppStr)/100;
  const roll=Math.random();
  let result,eloChange;
  if(roll<myChance*0.6){result='win';G.rankedW++;eloChange=rnd(15,25);}
  else if(roll<myChance*0.8){result='draw';G.rankedD++;eloChange=rnd(-5,5);}
  else{result='loss';G.rankedL++;eloChange=-rnd(10,20);}
  G.rankedELO=Math.max(800,G.rankedELO+eloChange);
  const resultEmoji=result==='win'?'🏆':result==='draw'?'🤝':'😔';
  notify(`${resultEmoji} Ranked: ${result.toUpperCase()} ELO ${eloChange>0?'+':''}${eloChange} → ${G.rankedELO}`,'blue');
  renderOnline();
}
function playFriendly(){
  if(onlineReady()&&window.SuperkickAccounts?.remoteToken?.()){
    onlineApi('/online/friendly',{method:'POST',body:JSON.stringify({teamName:G.teamName})})
      .then(data=>notify(`🤝 Friendly Online: ${data.result}!`,'blue'))
      .catch(error=>notify(error.message||'Friendly online ไม่สำเร็จ','red'));
    return;
  }
  const myStr=calcTeamStrength().total;
  const oppStr=rnd(60,85);
  const myChance=0.5+(myStr-oppStr)/100;
  const result=Math.random()<myChance*0.6?'ชนะ':Math.random()<0.5?'เสมอ':'แพ้';
  notify(`🤝 Friendly: ${result}!`,'blue');
}
function refreshOnlineMarket(){
  if(onlineReady()){
    refreshRemoteOnlineSnapshot().then(ok=>{
      if(!ok)generateLocalOnlineMarket();
      renderOnlineMarket();
    });
    return;
  }
  generateLocalOnlineMarket();
}
function generateLocalOnlineMarket(){
  G.onlineMarket=[];
  for(let i=0;i<8;i++){
    const tier=MARKET_POOL_TIERS[rnd(0,MARKET_POOL_TIERS.length-1)];
    const p=genPlayer({cardTier:tier,real:false,age:rnd(18,32),potential:rnd(70,tier==='silver'?88:82)});
    G.onlineMarket.push({...p,seller:onlineBuyerName(),askingPrice:p.price,listed:true});
  }
}
function renderOnlineMarket(){
  const el=document.getElementById('online-market');if(!el)return;
  const publicListings=(G.onlineMarket||[]).slice(0,6).map(p=>`
    <div class="fbtw" style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.8rem;">
      <div>${onlineEsc(p.nat)}${onlineEsc(p.face)} <strong>${onlineEsc(playerCardName(p))}</strong> ${cardTierBadge(p)} <span class="tg">${Number(p.ovr)||0}</span> <span class="tm">${onlineEsc(p.pos)}</span></div>
      <div style="text-align:right;"><div class="tg">${fmt(p.askingPrice||p.price)}</div>
      <div class="tm" style="font-size:.68rem;">by ${onlineEsc(p.seller)}</div>
      <button class="btn bbl bsm" onclick="buyOnlinePlayer('${onlineEsc(p.id)}')">ซื้อ</button></div>
    </div>`).join('')||'<div class="tm">ไม่มีนักเตะในตลาด</div>';
  el.innerHTML=`${publicListings}<hr class="div"><div class="ct" style="font-size:.9rem;">รายการที่เราตั้งขาย</div>${renderOnlineListingsHTML()}`;
}
function buyOnlinePlayer(id){
  const p=G.onlineMarket.find(x=>x.id===id);if(!p)return;
  const price=p.askingPrice||p.price;
  if(G.money<price){notify('เงินไม่พอ!','red');return;}
  if(!hasSquadSlot()){notify(squadFullMessage(),'red');return;}
  if(onlineReady()&&window.SuperkickAccounts?.remoteToken?.()){
    onlineApi('/online/market/buy',{method:'POST',body:JSON.stringify({listingId:id})}).then(data=>{
      const bought=data.player||p;
      const charged=data.chargedPrice||price;
      G.money=Math.max(0,G.money-charged);G.squad.push({...bought,id:uid(),acquisition:'online',isInitialSquad:false});
      if(data.snapshot)applyOnlineSnapshot(data.snapshot);
      else G.onlineMarket=G.onlineMarket.filter(x=>x.id!==id);
      updateHUD();notify(`✅ ซื้อ ${bought.name} จาก Online Market จริง!`,'green');renderOnlineMarket();saveGame();
    }).catch(error=>notify(error.message||'ซื้อจาก Online Market ไม่สำเร็จ','red'));
    return;
  }
  G.money-=price;G.squad.push({...p,id:uid(),acquisition:'online',isInitialSquad:false});
  G.onlineMarket=G.onlineMarket.filter(x=>x.id!==id);
  updateHUD();notify(`✅ ซื้อ ${p.name} จาก Online Market!`,'green');renderOnlineMarket();
}
function requireOnlineAccount(){
  if(!onlineReady()){notify('ต้องเปิด Online Backend ก่อน','red');return false;}
  if(!window.SuperkickAccounts?.remoteToken?.()){notify('ต้องสมัคร/ล็อกอินผ่าน backend ก่อน','red');return false;}
  return true;
}
function roomWeatherLabel(value){
  return ({sunny:'แดดออก',rain:'ฝนตก',cloudy:'ครึ้ม',windy:'ลมแรง',storm:'พายุ'})[value]||value||'แดดออก';
}
function myRoomParticipant(room=activeFriendRoom){
  const account=window.SuperkickAccounts?.getSession?.();
  return room?.participants?.find(p=>p.playerId===account?.playerId)||null;
}
function roomOpponent(room=activeFriendRoom){
  const me=myRoomParticipant(room);
  return room?.participants?.find(p=>p.playerId!==me?.playerId)||null;
}
function roomBody(){
  return {
    teamName:G.teamName,
    durationMinutes:parseInt(document.getElementById('friend-room-duration')?.value||'3',10),
    weather:document.getElementById('friend-room-weather')?.value||'sunny',
    extraTime:!!document.getElementById('friend-room-extra')?.checked,
    penalties:!!document.getElementById('friend-room-penalties')?.checked,
  };
}
function lobbyRoomBody(){
  return {
    durationMinutes:parseInt(document.getElementById('friend-lobby-duration')?.value||'3',10),
    weather:document.getElementById('friend-lobby-weather')?.value||'sunny',
    extraTime:!!document.getElementById('friend-lobby-extra')?.checked,
    penalties:!!document.getElementById('friend-lobby-penalties')?.checked,
  };
}
function createFriendRoom(){
  if(!requireOnlineAccount())return;
  onlineApi('/online/rooms/create',{method:'POST',body:JSON.stringify(roomBody())}).then(data=>{
    activeFriendRoom=data.room;friendRooms=data.rooms||friendRooms;
    document.getElementById('friend-room-code').value=activeFriendRoom.code;
    startFriendRoomSync();
    notify(`สร้างห้องแล้ว รหัส ${activeFriendRoom.code}`,'green');
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'สร้างห้องไม่สำเร็จ','red'));
}
function joinFriendRoom(code=document.getElementById('friend-room-code')?.value){
  if(!requireOnlineAccount())return;
  code=String(code||'').trim().toUpperCase();
  if(!code){notify('ใส่รหัสห้องก่อน','red');return;}
  onlineApi('/online/rooms/join',{method:'POST',body:JSON.stringify({code,teamName:G.teamName})}).then(data=>{
    activeFriendRoom=data.room;friendRooms=data.rooms||friendRooms;
    startFriendRoomSync();
    notify(`เข้าห้อง ${activeFriendRoom.code} แล้ว`,'green');
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'เข้าห้องไม่สำเร็จ','red'));
}
function searchFriendRooms(){
  if(!onlineReady()){notify('ต้องเปิด Online Backend ก่อน','red');return;}
  const code=String(document.getElementById('friend-room-code')?.value||'').trim().toUpperCase();
  onlineApi(`/online/rooms${code?`?code=${encodeURIComponent(code)}`:''}`).then(data=>{
    friendRooms=data.rooms||[];
    if(data.room)activeFriendRoom=data.room;
    const el=document.getElementById('friend-room-search');
    if(el)el.innerHTML=friendRooms.slice(0,5).map(room=>`
      <div class="fbtw" style="padding:4px 0;border-bottom:1px solid var(--border);">
        <span><strong>${onlineEsc(room.code)}</strong> · ${room.participants?.length||0}/2 · ${room.options?.durationMinutes||3} นาที · ${onlineEsc(roomWeatherLabel(room.options?.weather))}</span>
        <button class="btn bbl bsm" onclick="joinFriendRoom('${onlineEsc(room.code)}')">เข้า</button>
      </div>`).join('')||'<span class="tm">ยังไม่มีห้องที่เปิดอยู่วันนี้</span>';
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'ค้นหาห้องไม่สำเร็จ','red'));
}
function startFriendRoomSync(){
  if(friendRoomSyncTimer||!activeFriendRoom?.code||!onlineReady())return;
  friendRoomSyncTimer=setInterval(()=>{
    if(!activeFriendRoom?.code){stopFriendRoomSync();return;}
    onlineApi(`/online/rooms?code=${encodeURIComponent(activeFriendRoom.code)}`).then(data=>{
      if(data.room){
        const previous=JSON.stringify(activeFriendRoom);
        activeFriendRoom=data.room;
        friendRooms=data.rooms||friendRooms;
        if(JSON.stringify(activeFriendRoom)!==previous)renderFriendRoomPanel();
      }else if(activeFriendRoom?.code){
        notify('ห้องนี้จบหรือถูกปิดแล้ว กลับหน้าสร้างห้อง','blue');
        clearFriendRoomLocalState();
        renderFriendRoomPanel();
      }
    }).catch(error=>console.warn('Friend room sync failed',error));
  },800);
}
function stopFriendRoomSync(){
  if(friendRoomSyncTimer){clearInterval(friendRoomSyncTimer);friendRoomSyncTimer=null;}
}
function clearFriendRoomLocalState(){
  activeFriendRoom=null;
  friendMatchEvents=[];
  friendMatchMinute=0;
  stopFriendRoomSync();
  if(friendMatchTicker){clearInterval(friendMatchTicker);friendMatchTicker=null;}
  if(friendReturnTimer){clearTimeout(friendReturnTimer);friendReturnTimer=null;}
}
function leaveFriendRoomView(){
  if(activeFriendRoom?.code&&window.SuperkickAccounts?.remoteToken?.()){
    onlineApi('/online/rooms/leave',{method:'POST',body:JSON.stringify({code:activeFriendRoom.code})})
      .catch(error=>console.warn('Leave room sync failed',error));
  }
  clearFriendRoomLocalState();
  renderFriendRoomPanel();
}
function updateFriendRoomOptions(changes={}){
  if(!activeFriendRoom||!requireOnlineAccount())return;
  onlineApi('/online/rooms/options',{method:'PUT',body:JSON.stringify({code:activeFriendRoom.code,...changes})}).then(data=>{
    activeFriendRoom=data.room;renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'แก้ค่าห้องไม่สำเร็จ','red'));
}
function startFriendRoom(){
  if(!activeFriendRoom||!requireOnlineAccount())return;
  onlineApi('/online/rooms/start',{method:'POST',body:JSON.stringify({code:activeFriendRoom.code})}).then(data=>{
    activeFriendRoom=data.room;
    notify(activeFriendRoom.status==='prepare'?'เข้าหน้าจัดการทีมแล้ว':'เริ่มแมตช์จริงแล้ว','blue');
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'เริ่มห้องไม่สำเร็จ','red'));
}
function setFriendWager(){
  if(!activeFriendRoom||!requireOnlineAccount())return;
  const type=document.getElementById('friend-wager-type')?.value||'none';
  const payload={code:activeFriendRoom.code,type};
  if(type==='money')payload.amount=parseInt(document.getElementById('friend-wager-money')?.value||'0',10)||0;
  else if(type==='player'){
    const playerId=document.getElementById('friend-wager-player')?.value||'';
    const player=G.squad.find(p=>p.id===playerId);
    if(!player){notify('เลือกนักเตะเดิมพันก่อน','red');return;}
    payload.playerId=playerId;payload.playerName=playerCardName(player);
    payload.player={playerId:player.id,id:player.id,name:playerCardName(player),baseName:player.baseName||player.name,pos:player.pos,ovr:player.ovr||player.ca,face:player.face||'⚽'};
  }
  onlineApi('/online/rooms/wager',{method:'POST',body:JSON.stringify(payload)}).then(data=>{
    activeFriendRoom=data.room;
    notify('ตั้งเดิมพันแล้ว กดพร้อมเมื่อยืนยัน','green');
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'ตั้งเดิมพันไม่สำเร็จ','red'));
}
function setFriendReady(ready=true,mentality=null){
  if(!activeFriendRoom||!requireOnlineAccount())return;
  onlineApi('/online/rooms/ready',{method:'POST',body:JSON.stringify({code:activeFriendRoom.code,ready,mentality})}).then(data=>{
    activeFriendRoom=data.room;
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'อัปเดตพร้อมไม่สำเร็จ','red'));
}
function changeFriendMentality(mentality){
  const me=myRoomParticipant();
  if(me)me.mentality=mentality;
  if(['prepare','live'].includes(activeFriendRoom?.status))saveFriendTeamSetup(null,true);
  else setFriendReady(me?.ready!==false,mentality);
}
function onlineClamp(value,min,max){return Math.max(min,Math.min(max,value));}
function onlineAvailablePlayers(){
  return (G.squad||[]).filter(p=>p&&!p.injured&&!(p.suspendedMatches>0)&&Number(p.fitness||80)>0);
}
function ensureOnlineLineup(){
  if(typeof ensureGameDefaults==='function')ensureGameDefaults();
  G.formation=G.formation||'433';
  G.slots=G.slots||{};
  const slots=FORMATIONS[G.formation]||FORMATIONS['433'];
  const used=new Set(Object.values(G.slots||{}).filter(Boolean));
  slots.forEach((slot,index)=>{
    const current=G.slots[index]?G.squad.find(p=>p.id===G.slots[index]):null;
    if(current&&!current.injured&&!(current.suspendedMatches>0))return;
    const candidates=onlineAvailablePlayers().filter(p=>!used.has(p.id)&&(typeof isPosCompatible!=='function'||isPosCompatible(p,slot.p)));
    const fallback=onlineAvailablePlayers().filter(p=>!used.has(p.id));
    const best=(candidates.length?candidates:fallback).sort((a,b)=>(b.ca||b.ovr||0)-(a.ca||a.ovr||0))[0];
    if(best){G.slots[index]=best.id;used.add(best.id);}
  });
}
function onlinePlayerPayload(player,slot={},index=0){
  return {
    index,
    slot:slot.p||player?.pos||'SUB',
    slotPos:slot.p||player?.pos||'SUB',
    playerId:player?.id||`empty-${index}`,
    id:player?.id||`empty-${index}`,
    name:player?playerCardName(player):(slot.p||'ว่าง'),
    baseName:player?.baseName||player?.name||'',
    pos:player?.pos||slot.p||'SUB',
    ovr:Number(player?.ovr||player?.ca||60),
    face:player?.face||'⚽',
    x:Number(slot.x??50),
    y:Number(slot.y??50),
  };
}
function onlineTeamSetupPayload(extra={}){
  ensureOnlineLineup();
  const slots=FORMATIONS[G.formation||'433']||FORMATIONS['433'];
  const lineup=slots.map((slot,index)=>onlinePlayerPayload(G.squad.find(p=>p.id===G.slots?.[index]),slot,index));
  const used=new Set(lineup.map(p=>p.playerId).filter(Boolean));
  const bench=onlineAvailablePlayers().filter(p=>!used.has(p.id)).sort((a,b)=>(b.ca||b.ovr||0)-(a.ca||a.ovr||0)).slice(0,18).map((p,index)=>onlinePlayerPayload(p,{p:p.pos,x:50,y:50},index));
  const avg=Math.round(lineup.reduce((sum,p)=>sum+Number(p.ovr||60),0)/Math.max(1,lineup.length));
  return {
    formation:G.formation||'433',
    lineup,
    bench,
    tactics:{...(G.tacticPlan||{})},
    strength:typeof calcTeamStrength==='function'?calcTeamStrength().total:avg,
    subsUsed:Number(myRoomParticipant()?.teamSetup?.subsUsed||0),
    ...extra,
  };
}
function saveFriendTeamSetup(ready=null,quiet=false){
  if(!activeFriendRoom||!requireOnlineAccount())return;
  const payload={code:activeFriendRoom.code,teamSetup:onlineTeamSetupPayload(),mentality:myRoomParticipant()?.mentality||'balanced'};
  if(typeof ready==='boolean')payload.ready=ready;
  onlineApi('/online/rooms/team',{method:'PUT',body:JSON.stringify(payload)}).then(data=>{
    activeFriendRoom=data.room;
    if(!quiet)notify(ready?'จัดทีมแล้ว รออีกฝั่งพร้อม':'บันทึกทีมแล้ว','green');
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'บันทึกทีมออนไลน์ไม่สำเร็จ','red'));
}
function saveFriendTeamSetupDebounced(){
  if(friendTeamSaveTimer)clearTimeout(friendTeamSaveTimer);
  friendTeamSaveTimer=setTimeout(()=>saveFriendTeamSetup(null,true),420);
}
function setOnlineFormation(value){
  G.formation=value||'433';
  G.slots={};
  ensureOnlineLineup();
  if(typeof saveGame==='function')saveGame();
  renderFriendRoomPanel();
}
function assignOnlineSlot(index,playerId){
  const slots=FORMATIONS[G.formation||'433']||FORMATIONS['433'];
  const slot=slots[index];
  const player=G.squad.find(p=>p.id===playerId);
  if(!player||!slot)return;
  if(typeof isPosCompatible==='function'&&!isPosCompatible(player,slot.p)){notify(`${playerCardName(player)} ไม่เหมาะกับตำแหน่ง ${slot.p}`,'red');return;}
  Object.keys(G.slots||{}).forEach(key=>{if(G.slots[key]===playerId)delete G.slots[key];});
  G.slots[index]=playerId;
  if(typeof saveGame==='function')saveGame();
  renderFriendRoomPanel();
}
function autoOnlineLineup(){
  G.slots={};
  ensureOnlineLineup();
  if(typeof autoPickBestLineup==='function'&&document.getElementById('fslots'))autoPickBestLineup();
  if(typeof saveGame==='function')saveGame();
  notify('จัดตัวจริงออนไลน์แล้ว','green');
  renderFriendRoomPanel();
}
function onlineSlotOptions(currentId,pos){
  const current=G.squad.find(p=>p.id===currentId);
  const used=new Set(Object.values(G.slots||{}).filter(id=>id&&id!==currentId));
  const pool=onlineAvailablePlayers().filter(p=>p.id===currentId||(!used.has(p.id)&&(typeof isPosCompatible!=='function'||isPosCompatible(p,pos))));
  if(current&&!pool.find(p=>p.id===current.id))pool.unshift(current);
  return pool.sort((a,b)=>(b.ca||b.ovr||0)-(a.ca||a.ovr||0)).map(p=>`<option value="${onlineEsc(p.id)}" ${p.id===currentId?'selected':''}>${onlineEsc(p.pos)} · ${onlineEsc(playerCardName(p))} · ${Number(p.ovr||p.ca)||0}</option>`).join('');
}
function renderOnlineLineupEditor(){
  ensureOnlineLineup();
  const slots=FORMATIONS[G.formation||'433']||FORMATIONS['433'];
  return `<div class="online-lineup-grid">${slots.map((slot,index)=>{
    const player=G.squad.find(p=>p.id===G.slots?.[index]);
    return `<div class="online-slot-row">
      <span class="badge bg-blue">${slot.p}</span>
      <select onchange="assignOnlineSlot(${index},this.value)">${onlineSlotOptions(player?.id,slot.p)}</select>
      <span class="tg">${player?.ovr||player?.ca||'-'}</span>
    </div>`;
  }).join('')}</div>`;
}
function renderOnlineTacticControls(prefix='prepare',live=false){
  if(typeof ensureGameDefaults==='function')ensureGameDefaults();
  const labels={press:'เพรสซิ่ง',width:'ความกว้าง',tempo:'จังหวะเกม',defline:'แนวรับ',counter:'สวนกลับ',passing:'การจ่ายบอล',creativity:'ความสร้างสรรค์',aggression:'เข้าปะทะ',overlap:'เติมริมเส้น'};
  return `<div class="online-tactics">${Object.entries(labels).map(([key,label])=>`
    <div class="fbtw mb">
      <span class="tm">${label}</span>
      <input type="range" min="1" max="10" value="${G.tacticPlan?.[key]??5}" oninput="updateFriendTactic('${key}',this.value,'${prefix}',${live})" style="width:48%;">
      <span class="badge" id="online-tactic-${prefix}-${key}">${G.tacticPlan?.[key]??5}</span>
    </div>`).join('')}</div>`;
}
function updateFriendTactic(key,value,prefix='prepare',live=false){
  if(typeof ensureGameDefaults==='function')ensureGameDefaults();
  G.tacticPlan=G.tacticPlan||{};
  G.tacticPlan[key]=parseInt(value,10)||5;
  const out=document.getElementById(`online-tactic-${prefix}-${key}`);
  if(out)out.textContent=G.tacticPlan[key];
  if(typeof saveGame==='function')saveGame();
  if(live)saveFriendTeamSetupDebounced();
}
function renderFriendPrepareStage(room,me,isHost){
  ensureOnlineLineup();
  const formations=Object.keys(FORMATIONS||{'433':[]}).map(f=>`<option value="${f}" ${G.formation===f?'selected':''}>${f}</option>`).join('');
  const bench=onlineTeamSetupPayload().bench.slice(0,9).map(p=>`<span class="mp-chip">${onlineEsc(p.pos)} ${onlineEsc(p.name)} · ${Number(p.ovr)||0}</span>`).join('')||'<span class="tm">ไม่มีตัวสำรอง</span>';
  const readyAll=(room.participants||[]).length===2&&(room.participants||[]).every(p=>p.ready);
  return `
    ${friendOnlineStyles()}
    <div class="g2 online-prepare-grid">
      <div>
        <div class="ct" style="font-size:.95rem;">จัดการทีมก่อนเริ่ม</div>
        <div class="fbtw mb"><span class="tm">แผนการเล่น</span><select onchange="setOnlineFormation(this.value)" style="max-width:140px;">${formations}</select></div>
        <div class="fb gap mbm" style="flex-wrap:wrap;">
          <button class="btn bbl bsm" onclick="autoOnlineLineup()">จัดตัวจริงอัตโนมัติ</button>
          <button class="btn bgh bsm" onclick="saveFriendTeamSetup(false)">บันทึกทีม</button>
          <button class="btn bg bsm" onclick="saveFriendTeamSetup(true)">พร้อมแข่ง</button>
        </div>
        ${renderOnlineLineupEditor()}
        <div class="tm" style="margin-top:8px;">ตัวสำรอง</div>
        <div class="fb gap" style="flex-wrap:wrap;margin-top:6px;">${bench}</div>
      </div>
      <div>
        <div class="ct" style="font-size:.95rem;">แทคติกละเอียด</div>
        ${renderOnlineTacticControls('prepare',false)}
        <hr class="div">
        <button class="btn bg" ${isHost&&readyAll?'':'disabled'} onclick="startFriendRoom()">หัวหน้าห้องเริ่มแมตช์จริง</button>
        <div class="tm" style="margin-top:6px;">ต้องให้ทั้งสองทีมกดพร้อมหลังจัดทีมก่อน หัวหน้าห้องถึงเริ่มได้</div>
      </div>
    </div>`;
}
function renderOnlineSubPanel(room){
  const me=myRoomParticipant(room);
  const setup=onlineTeamSetupPayload({subsUsed:Number(me?.teamSetup?.subsUsed||0)});
  const used=setup.subsUsed||0;
  const outOptions=setup.lineup.map((p,i)=>`<option value="${i}">${onlineEsc(p.slot)} · ${onlineEsc(p.name)} · ${Number(p.ovr)||0}</option>`).join('');
  const inOptions=setup.bench.map(p=>`<option value="${onlineEsc(p.playerId)}">${onlineEsc(p.pos)} · ${onlineEsc(p.name)} · ${Number(p.ovr)||0}</option>`).join('');
  return `<div class="online-sub-panel">
    <div class="fbtw mb"><span class="tm">เปลี่ยนตัว</span><span class="badge">${used}/5</span></div>
    <select id="online-sub-out" class="mb">${outOptions}</select>
    <select id="online-sub-in" class="mb">${inOptions}</select>
    <button class="btn bbl bsm" ${used>=5||!setup.bench.length?'disabled':''} onclick="applyOnlineSub()">เปลี่ยนตัวทันที</button>
  </div>`;
}
function applyOnlineSub(){
  if(!activeFriendRoom||!requireOnlineAccount())return;
  const outIndex=parseInt(document.getElementById('online-sub-out')?.value||'-1',10);
  const inId=document.getElementById('online-sub-in')?.value||'';
  const incoming=G.squad.find(p=>p.id===inId);
  if(outIndex<0||!incoming){notify('เลือกตัวที่จะเปลี่ยนก่อน','red');return;}
  G.slots[outIndex]=incoming.id;
  if(typeof saveGame==='function')saveGame();
  const payload={code:activeFriendRoom.code,teamSetup:onlineTeamSetupPayload()};
  onlineApi('/online/rooms/sub',{method:'POST',body:JSON.stringify(payload)}).then(data=>{
    activeFriendRoom=data.room;
    notify(`เปลี่ยน ${playerCardName(incoming)} ลงสนามแล้ว`,'green');
    renderFriendRoomPanel();
  }).catch(error=>notify(error.message||'เปลี่ยนตัวไม่สำเร็จ','red'));
}
function scheduleFriendRoomReturn(){
  if(friendReturnTimer)return;
  friendReturnTimer=setTimeout(()=>{
    notify('จบเกมแล้ว กลับหน้าสร้างห้อง','blue');
    leaveFriendRoomView();
    searchFriendRooms();
  },6500);
}
function renderFriendRoomPanel(){
  const el=document.getElementById('friend-room-panel');if(!el)return;
  const browser=document.getElementById('friend-room-browser');
  if(browser)browser.style.display=activeFriendRoom?'none':'block';
  if(!activeFriendRoom){
    el.innerHTML='<div class="tm">หน้าแรกสำหรับสร้างห้อง ค้นหาห้อง หรือกรอกรหัสห้องของเพื่อน</div>';
    return;
  }
  startFriendRoomSync();
  const room=activeFriendRoom,me=myRoomParticipant(room),opp=roomOpponent(room);
  const isHost=me?.playerId===room.hostId;
  const options=room.options||{};
  const participants=(room.participants||[]).map(p=>`
    <div class="fbtw" style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <span>${p.side==='home'?'เหย้า':'เยือน'} · <strong>${onlineEsc(p.teamName)}</strong> <span class="tm">${onlineEsc(p.username)}</span> ${p.playerId===room.hostId?'<span class="badge bg-gold">หัวหน้าห้อง</span>':''}</span>
      <span>${p.ready?'<span class="tgr">พร้อม</span>':'<span class="tg">รอพร้อม</span>'}</span>
    </div>`).join('');
  let stage='';
  if(room.status==='waiting'||room.status==='setup'){
    const weatherOptions=['sunny','rain','cloudy','windy','storm'].map(value=>`<option value="${value}" ${options.weather===value?'selected':''}>${roomWeatherLabel(value)}</option>`).join('');
    const hostOptions=`
      <div class="fbtw mb"><span class="tm">เวลาในเกม</span><select id="friend-lobby-duration" style="max-width:120px;">${[2,3,4,5].map(value=>`<option value="${value}" ${Number(options.durationMinutes||3)===value?'selected':''}>${value} นาที</option>`).join('')}</select></div>
      <div class="fbtw mb"><span class="tm">สภาพอากาศ</span><select id="friend-lobby-weather" style="max-width:140px;">${weatherOptions}</select></div>
      <div class="fbtw mb"><span class="tm">ต่อเวลาพิเศษ</span><input id="friend-lobby-extra" type="checkbox" ${options.extraTime?'checked':''}></div>
      <div class="fbtw mb"><span class="tm">ยิงจุดโทษถ้าเสมอ</span><input id="friend-lobby-penalties" type="checkbox" ${options.penalties?'checked':''}></div>
      <button class="btn bgh bsm" onclick="updateFriendRoomOptions(lobbyRoomBody())">บันทึกตั้งค่าห้อง</button>`;
    stage=`
      <div class="g2">
        <div>
          <div class="ct" style="font-size:.95rem;">ล็อบบี้</div>
          <div class="tm mb">เวลา ${options.durationMinutes||3} นาที · ${roomWeatherLabel(options.weather)} · ต่อเวลา ${options.extraTime?'เปิด':'ปิด'} · จุดโทษ ${options.penalties?'เปิด':'ปิด'}</div>
          ${isHost?hostOptions:'<div class="tm">คุณเป็นทีมเยือน กดพร้อมเมื่อพร้อมเข้าเดิมพัน</div>'}
        </div>
        <div>
          <div class="ct" style="font-size:.95rem;">สถานะพร้อม</div>
          <button class="btn bg" onclick="setFriendReady(${me?.ready?'false':'true'})">${me?.ready?'ยกเลิกพร้อม':'พร้อม'}</button>
          <div class="tm" style="margin-top:6px;">เมื่อพร้อมทั้งคู่ ระบบจะพาเข้าหน้าเลือกเดิมพัน</div>
        </div>
      </div>`;
  }else if(room.status==='wager'){
    const playerOptions=(G.squad||[]).slice(0,30).map(p=>`<option value="${onlineEsc(p.id)}">${onlineEsc(playerCardName(p))} · ${Number(p.ovr)||0} · ${onlineEsc(p.pos)}</option>`).join('');
    stage=`
      <div class="g2">
        <div>
          <div class="ct" style="font-size:.95rem;">เลือกของเดิมพัน</div>
          <div class="tm mb">ไม่บังคับเดิมพัน เลือก “ไม่เดิมพัน” แล้วกดพร้อมได้เลย</div>
          <div class="fbtw mb"><span class="tm">ประเภท</span><select id="friend-wager-type" style="max-width:150px;"><option value="none">ไม่เดิมพัน</option><option value="money">เงิน</option><option value="player">นักเตะ</option></select></div>
          <div class="mb"><label class="tm">จำนวนเงิน</label><input id="friend-wager-money" type="number" min="0" value="50000"></div>
          <div class="mb"><label class="tm">นักเตะ</label><select id="friend-wager-player">${playerOptions}</select></div>
          <button class="btn bpu" onclick="setFriendWager()">ยืนยันเดิมพัน</button>
          <button class="btn bg" onclick="setFriendReady(${me?.ready?'false':'true'})">${me?.ready?'ยกเลิกพร้อม':'พร้อม'}</button>
        </div>
        <div>
          <div class="ct" style="font-size:.95rem;">รอพร้อมก่อนเริ่ม</div>
          ${(room.participants||[]).map(p=>`<div class="fbtw mb"><span>${onlineEsc(p.teamName)}</span><span class="tg">${p.wager?p.wager.type==='money'?fmt(p.wager.amount):onlineEsc(p.wager.playerName):'ไม่เดิมพัน'}</span></div>`).join('')}
          <button class="btn bg" ${isHost?'':'disabled'} onclick="startFriendRoom()">หัวหน้าห้องไปหน้าจัดทีม</button>
          <div class="tm" style="margin-top:6px;">ต้องพร้อมทั้งคู่ จากนั้นจะไปหน้าจัดการทีมก่อนเริ่มแข่งจริง</div>
        </div>
      </div>`;
  }else if(room.status==='prepare'){
    stage=renderFriendPrepareStage(room,me,isHost);
  }else if(room.status==='live'){
    stage=renderFriendLiveMatch(room);
  }else if(room.status==='finished'){
    stage=renderFriendFinished(room);
    scheduleFriendRoomReturn();
  }
  el.innerHTML=`
    <div class="fbtw mbm">
      <div><span class="tm">รหัสห้องวันนี้</span> <span class="hv">${onlineEsc(room.code)}</span></div>
      <div class="fb gap"><button class="btn bgh bsm" onclick="leaveFriendRoomView()">ออกจากห้อง</button><span class="badge bg-blue">${onlineEsc(room.status)}</span></div>
    </div>
    ${participants||'<div class="tm">ยังไม่มีผู้เล่น</div>'}
    <hr class="div">${stage}`;
}
function renderFriendLiveMatch(room){
  const home=room.participants?.find(p=>p.side==='home')||room.participants?.[0]||{};
  const away=room.participants?.find(p=>p.side==='away')||room.participants?.[1]||{};
  const match=room.match||{};
  friendMatchMinute=match.minute||0;
  friendMatchEvents=match.events||room.events||[];
  const events=friendMatchEvents.slice(0,9).map(ev=>`<div class="mev ev-${onlineEsc(ev.kind||'miss')}"><span class="evt">${Number(ev.minute)||0}'</span>${onlineEsc(ev.text||'เกมกำลังเดิน')}</div>`).join('');
  const me=myRoomParticipant(room)||{};
  const controls=['attack','balanced','defense','park'].map(mode=>`<button class="btn ${me.mentality===mode?'bg':'bgh'} bsm" onclick="changeFriendMentality('${mode}')">${{attack:'บุกหนัก',balanced:'สมดุล',defense:'รับแน่น',park:'รับลึก'}[mode]}</button>`).join('');
  const homeStats=match.stats?.home||{},awayStats=match.stats?.away||{};
  return `
    ${friendOnlineStyles()}
    <div class="scoreboard"><div class="tscore"><div class="tsn">${onlineEsc(home.teamName||'Home')}</div><div class="snum">${match.homeScore||0}</div></div><div class="ssep">${friendMatchMinute}'<div class="tm" style="font-size:.68rem;">${onlineEsc(match.phase||'Live')}</div></div><div class="tscore"><div class="tsn">${onlineEsc(away.teamName||'Away')}</div><div class="snum">${match.awayScore||0}</div></div></div>
    <div class="online-fc-pitch" id="friend-live-pitch">
      <div class="online-goal online-goal-top"></div><div class="online-goal online-goal-bottom"></div>
      <div class="online-box online-box-top"></div><div class="online-box online-box-bottom"></div>
      <div class="online-six online-six-top"></div><div class="online-six online-six-bottom"></div>
      <div class="online-half-line"></div><div class="online-center-circle"></div>
      ${renderFriendPitchDots(room)}
    </div>
    <div class="g2" style="margin-top:.75rem;">
      <div class="card" style="margin:0;">
        <div class="ct" style="font-size:.95rem;">แดชบอร์ดสด</div>
        <div class="mp-grid mbm">
          <div class="mp-stat"><div class="tm">ครองบอล</div><strong>${homeStats.possession||50}% - ${awayStats.possession||50}%</strong></div>
          <div class="mp-stat"><div class="tm">ยิง</div><strong>${homeStats.shots||0} - ${awayStats.shots||0}</strong></div>
          <div class="mp-stat"><div class="tm">จ่ายบอล</div><strong>${homeStats.passes||0} - ${awayStats.passes||0}</strong></div>
          <div class="mp-stat"><div class="tm">แย่งบอล</div><strong>${homeStats.tackles||0} - ${awayStats.tackles||0}</strong></div>
        </div>
        <div id="friend-live-events">${events||'<div class="tm">กำลังเริ่มเกม...</div>'}</div>
      </div>
      <div class="card" style="margin:0;">
        <div class="ct" style="font-size:.95rem;">คอนโทรลแผนเกม</div>
        <div class="fb gap mbm" style="flex-wrap:wrap;">${controls}</div>
        ${renderOnlineTacticControls('live',true)}
        <hr class="div">
        ${renderOnlineSubPanel(room)}
      </div>
    </div>`;
}
function friendOnlineStyles(){
  return `<style>
    .online-fc-pitch{position:relative;min-height:620px;height:min(72vh,760px);border-radius:8px;overflow:hidden;border:1px solid var(--border);background:repeating-linear-gradient(0deg,#176236 0 54px,#1d7240 54px 108px);}
    .online-fc-pitch:before{content:"";position:absolute;inset:14px;border:2px solid rgba(255,255,255,.25);pointer-events:none;}
    .online-half-line{position:absolute;left:14px;right:14px;top:50%;border-top:2px solid rgba(255,255,255,.22);}
    .online-center-circle{position:absolute;left:50%;top:50%;width:118px;height:118px;border:2px solid rgba(255,255,255,.22);border-radius:50%;transform:translate(-50%,-50%);}
    .online-box{position:absolute;left:25%;width:50%;height:112px;border:2px solid rgba(255,255,255,.22);}
    .online-box-top{top:14px;border-top:0}.online-box-bottom{bottom:14px;border-bottom:0}
    .online-six{position:absolute;left:38%;width:24%;height:50px;border:2px solid rgba(255,255,255,.2);}
    .online-six-top{top:14px;border-top:0}.online-six-bottom{bottom:14px;border-bottom:0}
    .online-goal{position:absolute;left:42%;width:16%;height:10px;background:#dfe7ef;border:1px solid #0d1117;z-index:1;}
    .online-goal-top{top:1px}.online-goal-bottom{bottom:1px}
    .online-lineup-grid{display:grid;gap:6px}.online-slot-row{display:grid;grid-template-columns:54px minmax(0,1fr) 44px;gap:6px;align-items:center;padding:5px;border-bottom:1px solid var(--border);}
    .online-slot-row select,.online-sub-panel select{width:100%;min-width:0;}
    @media(max-width:700px){.online-fc-pitch{min-height:520px;height:62vh}.online-prepare-grid{grid-template-columns:1fr!important}.online-slot-row{grid-template-columns:48px minmax(0,1fr) 38px;}}
  </style>`;
}
function setupLineupFor(participant,side){
  const setup=participant?.teamSetup||{};
  if(Array.isArray(setup.lineup)&&setup.lineup.length>=11)return setup.lineup.slice(0,11);
  const slots=FORMATIONS[setup.formation||'433']||FORMATIONS['433'];
  return slots.map((slot,index)=>({index,slot:slot.p,slotPos:slot.p,name:`${side==='home'?'Home':'Away'} ${slot.p}`,pos:slot.p,ovr:65,x:slot.x,y:slot.y,face:'⚽'}));
}
function dotCoords(entry,side,index,event,minute){
  let x=Number(entry.x??50),y=Number(entry.y??50);
  if(side==='away')y=100-y;
  const hasBall=event?.side===side;
  const attackDir=side==='home'?-1:1;
  y+=hasBall?attackDir*4:-attackDir*3;
  x+=Math.sin((minute+index*5)*.19)*2.2;
  y+=Math.cos((minute+index*7)*.14)*1.4;
  if(event?.side===side&&event.actorIndex===index&&event.to){
    x=x*.45+Number(event.to.x)*.55;
    y=y*.45+Number(event.to.y)*.55;
  }else if(event?.side===side&&event.targetIndex===index&&event.from){
    x=x*.68+Number(event.from.x)*.32;
    y=y*.68+Number(event.from.y)*.32;
  }
  return {x:onlineClamp(x,4,96),y:onlineClamp(y,4,96)};
}
function renderFriendPitchDots(room){
  const match=room.match||{};
  const event=match.ball||match.events?.[0]||{};
  const minute=match.minute||0;
  const home=room.participants?.find(p=>p.side==='home')||{};
  const away=room.participants?.find(p=>p.side==='away')||{};
  const renderSide=(participant,side)=>setupLineupFor(participant,side).map((entry,index)=>{
    const pos=dotCoords(entry,side,index,event,minute);
    const name=String(entry.name||entry.slot||'SK').split(' ').slice(-1)[0];
    const active=event.side===side&&event.actorIndex===index;
    const support=event.side===side&&event.targetIndex===index;
    return `<div class="mp-dot mp-${side} live ${active?'active':''} ${support?'support':''}" style="left:${pos.x}%;top:${pos.y}%;"><div class="mp-ball">${onlineEsc(entry.slot||entry.pos||index+1)}</div><div class="mp-name">${onlineEsc(name)}</div><div class="mp-rating">OVR ${Number(entry.ovr)||65}</div></div>`;
  }).join('');
  const trail=renderFriendBallTrail(event);
  const eventTag=event?.text?`<div class="mp-event-tag">${onlineEsc(event.text)}</div>`:'';
  return renderSide(home,'home')+renderSide(away,'away')+trail+eventTag;
}
function renderFriendBallTrail(event){
  if(!event?.from||!event?.to)return '';
  const sx=Number(event.from.x),sy=Number(event.from.y),ex=Number(event.to.x),ey=Number(event.to.y);
  const dx=ex-sx,dy=ey-sy;
  const len=Math.sqrt(dx*dx+dy*dy);
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const kind=['goal','shot','tackle','save'].includes(event.kind)?event.kind:'pass';
  return `<div class="mp-trail ${kind}" style="--sx:${sx}%;--sy:${sy}%;--len:${len}%;--ang:${angle}deg;"></div><div class="mp-ball-live ${kind}" style="--sx:${sx}%;--sy:${sy}%;--ex:${ex}%;--ey:${ey}%;"></div>`;
}
function renderFriendFinished(room){
  const match=room.match||{};
  const home=room.participants?.find(p=>p.side==='home')||{};
  const away=room.participants?.find(p=>p.side==='away')||{};
  const winner=match.winnerSide==='home'?home.teamName:match.winnerSide==='away'?away.teamName:'เสมอ';
  return `
    <div class="scoreboard"><div class="tscore"><div class="tsn">${onlineEsc(home.teamName||'Home')}</div><div class="snum">${match.homeScore||0}</div></div><div class="ssep">FT</div><div class="tscore"><div class="tsn">${onlineEsc(away.teamName||'Away')}</div><div class="snum">${match.awayScore||0}</div></div></div>
    <div class="card" style="margin:0;">
      <div class="ct">จบเกม</div>
      <div class="tm mb">ผลลัพธ์: ${onlineEsc(winner)}${match.winnerSide&&match.winnerSide!=='draw'?' ชนะ':''}</div>
      <div>${(match.events||[]).slice(0,8).map(ev=>`<div class="mev ev-${onlineEsc(ev.kind||'miss')}"><span class="evt">${Number(ev.minute)||0}'</span>${onlineEsc(ev.text||'')}</div>`).join('')}</div>
      <div class="tm" style="margin-top:8px;">ระบบจะพากลับหน้าสร้างห้องทั้งสองทีมอัตโนมัติ</div>
    </div>`;
}
function startFriendMatchTicker(){return;}
function joinTournament(){
  if(G.money<50000){notify('ต้องการ 50K!','red');return;}
  if(G.onlineTournament.active){notify('กำลังแข่งอยู่แล้ว!','red');return;}
  G.money-=50000;G.onlineTournament={active:true,round:1,prize:500000};
  updateHUD();notify('🏆 เข้าร่วม Online Tournament! รอบ 1','blue');renderTournament();
}
function renderTournament(){
  const el=document.getElementById('online-tournament');if(!el)return;
  if(!G.onlineTournament.active){
    el.innerHTML='<div class="tm">ยังไม่ได้เข้าร่วมการแข่งขัน</div>';return;
  }
  el.innerHTML=`
    <div class="fbtw mb"><span>รอบปัจจุบัน</span><span class="tg">${G.onlineTournament.round}/4</span></div>
    <div class="fbtw mb"><span>รางวัล</span><span class="tgr">${fmt(G.onlineTournament.prize)}</span></div>
    <button class="btn bg bsm" onclick="advanceTournament()">▶ แข่งต่อ</button>`;
}
function advanceTournament(){
  if(!G.onlineTournament.active)return;
  const myStr=calcTeamStrength().total;
  const oppStr=rnd(65,88);
  if(Math.random()<0.5+( myStr-oppStr)/100){
    G.onlineTournament.round++;
    if(G.onlineTournament.round>4){
      G.money+=G.onlineTournament.prize;
      G.trophies.champions++;
      notify(`🏆 ชนะ Online Tournament! ได้รับ ${fmt(G.onlineTournament.prize)}!`,'gold');
      G.onlineTournament={active:false,round:0,prize:0};
    }else notify(`✅ ผ่านรอบ ${G.onlineTournament.round-1}! เข้ารอบ ${G.onlineTournament.round}`,'green');
  }else{
    notify('😔 แพ้ — ตกรอบ Tournament','red');
    G.onlineTournament={active:false,round:0,prize:0};
  }
  updateHUD();renderTournament();
}

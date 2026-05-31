// ===== ONLINE SYSTEM =====
let realOnlineSocket=null;
function renderOnline(){
  const service=window.SUPERKICK_SERVICE_CONFIG?.online||{};
  const status=document.getElementById('online-service-status');
  const configured=service.enabled&&service.apiBase&&service.wsUrl;
  G.onlineMode=realOnlineSocket?.readyState===1?'remote':'local';
  if(status)status.innerHTML=G.onlineMode==='remote'
    ?'<span class="tgr">Online backend พร้อมเชื่อมต่อ API และ WebSocket</span>'
    :configured?'<span class="tg">ตั้งค่า backend แล้ว กดเชื่อมต่อเพื่อเปิด WebSocket</span>'
    :'<span class="tg">Local simulation mode: ใส่ API URL และ WebSocket URL เพื่อเปิดออนไลน์จริง</span>';
  document.getElementById('ranked-rating').textContent=G.rankedELO;
  document.getElementById('ranked-record').textContent=`W${G.rankedW} D${G.rankedD} L${G.rankedL}`;
  // Global ranking (simulated)
  const globalTeams=[
    {name:'ManCity FC',elo:1650,flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},{name:'El Clasico',elo:1580,flag:'🇪🇸'},
    {name:'Die Bayern',elo:1520,flag:'🇩🇪'},{name:G.teamName,elo:G.rankedELO,flag:'🇹🇭',isMe:true},
    {name:'PSG United',elo:1440,flag:'🇫🇷'},{name:'Serie A Stars',elo:1390,flag:'🇮🇹'},
  ].sort((a,b)=>b.elo-a.elo);
  document.getElementById('global-ranking').innerHTML=globalTeams.map((t,i)=>`
    <div class="fbtw" style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem;${t.isMe?'color:var(--gold);font-weight:700;':''}">
      <span>${i+1}. ${t.flag} ${t.name}</span><span>ELO ${t.elo}</span>
    </div>`).join('');
  // Online market
  if(!G.onlineMarket.length)refreshOnlineMarket();
  renderOnlineMarket();
  // Tournament
  renderTournament();
}
function connectRealOnline(){
  const service=window.SUPERKICK_SERVICE_CONFIG?.online||{};
  if(!service.enabled||!service.apiBase||!service.wsUrl){notify('ยังไม่ได้ตั้งค่า online backend','red');return false;}
  try{
    if(realOnlineSocket&&realOnlineSocket.readyState<2)realOnlineSocket.close();
    realOnlineSocket=new WebSocket(service.wsUrl);
    realOnlineSocket.onopen=()=>{
      G.onlineMode='remote';
      const account=window.SuperkickAccounts?.getSession?.();
      realOnlineSocket.send(JSON.stringify({type:'hello',playerId:account?.playerId||'',teamName:G.teamName,elo:G.rankedELO}));
      notify('เชื่อมต่อ Online Backend แล้ว','green');renderOnline();
    };
    realOnlineSocket.onmessage=event=>{
      try{
        const message=JSON.parse(event.data||'{}');
        if(message.type==='snapshot'){
          if(Array.isArray(message.market))G.onlineMarket=message.market;
          if(Array.isArray(message.managers))G.onlineManagers=message.managers;
          renderOnline();
        }
      }catch(error){console.warn('Online message ignored',error);}
    };
    realOnlineSocket.onerror=()=>notify('เชื่อมต่อ Online Backend ไม่สำเร็จ','red');
    realOnlineSocket.onclose=()=>{G.onlineMode='local';renderOnline();};
  }catch(error){notify(error.message||'เปิด WebSocket ไม่สำเร็จ','red');return false;}
  return true;
}
function playRanked(){
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
  const myStr=calcTeamStrength().total;
  const oppStr=rnd(60,85);
  const myChance=0.5+(myStr-oppStr)/100;
  const result=Math.random()<myChance*0.6?'ชนะ':Math.random()<0.5?'เสมอ':'แพ้';
  notify(`🤝 Friendly: ${result}!`,'blue');
}
function refreshOnlineMarket(){
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
      <div>${p.nat}${p.face} <strong>${playerCardName(p)}</strong> ${cardTierBadge(p)} <span class="tg">${p.ovr}</span> <span class="tm">${p.pos}</span></div>
      <div style="text-align:right;"><div class="tg">${fmt(p.askingPrice||p.price)}</div>
      <div class="tm" style="font-size:.68rem;">by ${p.seller}</div>
      <button class="btn bbl bsm" onclick="buyOnlinePlayer('${p.id}')">ซื้อ</button></div>
    </div>`).join('')||'<div class="tm">ไม่มีนักเตะในตลาด</div>';
  el.innerHTML=`${publicListings}<hr class="div"><div class="ct" style="font-size:.9rem;">รายการที่เราตั้งขาย</div>${renderOnlineListingsHTML()}`;
}
function buyOnlinePlayer(id){
  const p=G.onlineMarket.find(x=>x.id===id);if(!p)return;
  const price=p.askingPrice||p.price;
  if(G.money<price){notify('เงินไม่พอ!','red');return;}
  if(!hasSquadSlot()){notify(squadFullMessage(),'red');return;}
  G.money-=price;G.squad.push({...p,id:uid(),acquisition:'online',isInitialSquad:false});
  G.onlineMarket=G.onlineMarket.filter(x=>x.id!==id);
  updateHUD();notify(`✅ ซื้อ ${p.name} จาก Online Market!`,'green');renderOnlineMarket();
}
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

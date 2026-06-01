// ===== STAFF =====
function renderStaff(){
  document.getElementById('staff-grid').innerHTML=STAFF_ROLES.map(sr=>{
    const lv=G.staff[sr.effect]||1;
    const upgradeCost=[0,300000,750000,1500000,3000000][lv]||99999999;
    const canUpgrade=lv<sr.levels&&G.money>=upgradeCost;
    return `<div class="card">
      <div class="ct">${sr.icon} ${sr.role}</div>
      <div class="tm" style="font-size:.78rem;margin-bottom:.5rem;">${sr.desc}</div>
      <div class="fbtw mb"><span class="tm">ระดับ</span><span class="tg">${lv} / ${sr.levels}</span></div>
      <div class="prbg mb"><div class="prb" style="width:${lv/sr.levels*100}%;"></div></div>
      ${lv<sr.levels?`<div class="fbtw"><span class="tm" style="font-size:.75rem;">อัปเกรด: ${fmt(upgradeCost)}</span>
      <button class="btn bg bsm" onclick="upgradeStaff('${sr.effect}',${upgradeCost})" ${canUpgrade?'':'disabled'}>⬆ อัปเกรด</button></div>`
      :'<span class="badge bg-green">สูงสุดแล้ว</span>'}
    </div>`;
  }).join('');
}
function upgradeStaff(role,cost){
  if(G.money<cost){notify('เงินไม่พอ!','red');return;}
  G.money-=cost;G.staff[role]=(G.staff[role]||1)+1;
  updateHUD();notify(`⬆ ทีมงาน ${role} ระดับ ${G.staff[role]}!`,'green');renderStaff();
}

// ===== PACKS =====
let packBuf=[],packRevealIndex=0,packAnimating=false,packAudioCtx=null;
function packCardHTML(p,i,state='locked'){
  const tier=cardTierById(p.cardTier);
  const flipped=state==='revealed'?' flipped':'';
  const locked=state==='locked'?' locked':' revealed';
  const click=state==='next'?' onclick="revealNextPackCard()"':'';
  return `
    <div class="pack-card${flipped}${locked}" id="pk-${i}"${click}>
      <div class="pack-inner">
        <div class="pack-front"><div style="font-size:2rem;">🎴</div><div>${state==='next'?'เปิดใบนี้':'รอเปิด'}</div></div>
        <div class="pack-back" style="border-color:${tier.color};box-shadow:0 0 18px ${tier.color}33 inset;">
          ${playerFace(p,'pack-face')}
          <div style="font-family:'Bebas Neue',cursive;font-size:1.6rem;color:${tier.color};">OVR ${p.ovr}</div>
          <div style="font-weight:700;font-size:.78rem;text-align:center;">${playerCardName(p)}</div>
          <div style="text-align:center;">${cardTierBadge(p)}</div>
          <div class="pp ${p.pos}" style="font-size:.7rem;">${p.pos}</div>
          <div style="font-size:.68rem;color:var(--muted);">PA ${p.potentialMin}-${p.potentialMax}</div>
          ${p.traits.map(t=>`<span class="trait-chip" style="font-size:.6rem;">${t}</span>`).join('')}
        </div>
      </div>
    </div>`;
}
function renderPackReveal(){
  const cards=packBuf.map((p,i)=>{
    if(i<packRevealIndex)return packCardHTML(p,i,'revealed');
    if(i===packRevealIndex&&!packAnimating)return packCardHTML(p,i,'next');
    return packCardHTML(p,i,'locked');
  }).join('');
  document.getElementById('pack-cards').innerHTML=cards;
  const done=packRevealIndex>=packBuf.length;
  document.getElementById('pack-progress').textContent=done?'เปิดครบแล้ว':`ใบที่ ${Math.min(packRevealIndex+1,packBuf.length)} / ${packBuf.length}`;
  const nextBtn=document.getElementById('pack-next-btn');
  const addBtn=document.getElementById('pack-add-btn');
  if(nextBtn){nextBtn.disabled=packAnimating||done;nextBtn.textContent=done?'เปิดครบแล้ว':'เปิดใบถัดไป';}
  if(addBtn){addBtn.disabled=!done;}
}
function playPackSuspense(tierId){
  try{
    packAudioCtx=packAudioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const ctx=packAudioCtx,now=ctx.currentTime;
    const tier=cardTierById(tierId)||CARD_TIERS[0];
    const gain=ctx.createGain();gain.connect(ctx.destination);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.09,now+.08);gain.gain.exponentialRampToValueAtTime(.0001,now+1.35);
    [0,.18,.36,.54].forEach((d,idx)=>{
      const osc=ctx.createOscillator();osc.type=idx%2?'triangle':'sawtooth';osc.frequency.setValueAtTime(150+idx*55,now+d);osc.frequency.exponentialRampToValueAtTime(420+idx*95,now+d+.22);osc.connect(gain);osc.start(now+d);osc.stop(now+d+.24);
    });
    if(['gold','elite','icon'].includes(tier.id)){
      const bell=ctx.createOscillator();const bg=ctx.createGain();bell.type='sine';bell.frequency.setValueAtTime(tier.id==='icon'?880:660,now+.9);bg.gain.setValueAtTime(.001,now+.9);bg.gain.exponentialRampToValueAtTime(.12,now+.95);bg.gain.exponentialRampToValueAtTime(.001,now+1.45);bell.connect(bg);bg.connect(ctx.destination);bell.start(now+.9);bell.stop(now+1.5);
    }
  }catch(e){}
}
function startPackWalkout(p){
  const el=document.getElementById('pack-walkout');if(!el)return;
  const tier=cardTierById(p.cardTier)||CARD_TIERS[CARD_TIERS.length-1];
  const premium=(p.price||0)>1000000;
  el.className='pack-walkout active'+(premium?' premium':'');
  el.style.color=tier.color;
  el.innerHTML=premium?`
    <div class="walk-tunnel"></div><div class="walk-spot"></div>
    <div class="walk-reveal-stack">
      <div class="walk-stage flag"><div class="walk-label">Nationality</div>${p.nat||'🌍'}</div>
      <div class="walk-stage pos"><div class="walk-label">Position</div>${p.pos}</div>
      <div class="walk-stage player">
        ${playerFace(p,'pack-face')}
        <div class="walk-ovr">OVR ${p.ovr}</div>
        <div class="walk-name">${playerCardName(p)}</div>
        <div class="walk-tier">${tier.label}</div>
      </div>
    </div>`:`
    <div class="walk-tunnel"></div><div class="walk-spot"></div>
    <div class="walk-card">
      ${playerFace(p,'pack-face')}
      <div class="walk-ovr">OVR ${p.ovr}</div>
      <div class="walk-name">${playerCardName(p)}</div>
      <div class="walk-tier">${tier.label}</div>
    </div>`;
  for(let i=0;i<12;i++){
    const f=document.createElement('span');
    f.className='firework';
    f.style.left=rnd(10,90)+'%';f.style.top=rnd(10,74)+'%';f.style.animationDelay=(i*.06)+'s';
    el.appendChild(f);
  }
}
function revealNextPackCard(){
  if(packAnimating||packRevealIndex>=packBuf.length)return;
  const p=packBuf[packRevealIndex];
  packAnimating=true;
  startPackWalkout(p);
  playPackSuspense(p.cardTier);
  renderPackReveal();
  setTimeout(()=>{
    packRevealIndex++;
    packAnimating=false;
    const walk=document.getElementById('pack-walkout');
    if(walk){walk.className='pack-walkout';walk.innerHTML='';}
    renderPackReveal();
  },(p.price||0)>1000000?2850:1450);
}
function legendPackPlayer(){
  const base=LEGENDS[rnd(0,LEGENDS.length-1)];
  return {
    ...base,stats:{...base.stats},traits:[...(base.traits||[])],id:uid(),cardTier:'icon',cardVersion:'Legend',cardName:`${base.name} Legend`,
    goals:0,assists:0,yellow:0,red:0,apps:0,morale:90,fitness:90,form:8,sharpness:90,injured:false,injuryDays:0,injuryMatches:0,injuryType:'',
    rating:8.5,matchRatings:[8.5],formHistory:[8.5],contract:3,ca:base.ovr,potentialMin:base.ovr,potentialMax:base.ovr,potential:base.ovr,
    personality:'Professional',age:30,peakAge:30,signingBonus:0,goalBonus:0,cleanSheetBonus:0,loyaltyBonus:0,acquisition:'legend_pack',isInitialSquad:false,
  };
}
function createPackPlayer(type){
  const tier=rollCardTier(type);
  return tier==='legend'?legendPackPlayer():genPlayer({cardTier:tier});
}
function openPack(type,free=false,options={}){
  const pack=CARD_PACKS[type]||CARD_PACKS.bronze;
  const count=options.count?clamp(Number(options.count)||1,1,10):getPackOpenCount();
  if(!free){
    buyPackToInventory(type,'money',pack.cost);
    return;
  }
  if(!hasSquadSlot(count)){notify(squadFullMessage(),'red');return;}
  packBuf=[];
  for(let i=0;i<count;i++)packBuf.push(createPackPlayer(type));
  packRevealIndex=0;packAnimating=false;
  document.getElementById('pack-reveal').style.display='block';
  const walk=document.getElementById('pack-walkout');if(walk){walk.className='pack-walkout';walk.innerHTML='';}
  renderPackReveal();
  updateHUD();
}
function addPackPlayers(){
  if(!hasSquadSlot(packBuf.length)){notify(squadFullMessage(),'red');return;}
  const add=[...packBuf];
  add.forEach(p=>G.squad.push({...p,id:uid(),acquisition:p.acquisition||'pack',isInitialSquad:false}));
  notify(`✅ เพิ่ม ${add.length} คนในทีม`,'green');
  document.getElementById('pack-reveal').style.display='none';
  updateHUD();
  saveGame();
}

// ===== STADIUM =====
function renderStadium(){
  const sl=SLVLS[G.stadiumLevel-1];
  const stadiumName=G.stadiumName||sl.name;
  document.getElementById('s-name2').textContent=stadiumName;
  document.getElementById('s-cap').textContent=sl.cap.toLocaleString()+' ที่นั่ง';
  document.getElementById('s-inc').textContent=fmt(sl.income)+'/นัด';
  document.getElementById('s-lv').textContent=G.stadiumLevel;
  document.getElementById('s-xpbar').style.width=(G.stadiumXP*10)+'%';
  const colors=['#1a472a','#2d5016','#3d6b1e','#4a7c2c','#5a9438'];
  const col=G.teamColor||colors[G.stadiumLevel-1];
  document.getElementById('stad-visual').innerHTML=`<svg viewBox="0 0 400 190" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
    <rect width="400" height="190" fill="#0a0a1a"/>
    ${[...Array(G.stadiumLevel*6)].map((_,i)=>{const x=10+i*15;const h=50+G.stadiumLevel*20+rnd(0,20);return`<rect x="${x}" y="${180-h}" width="12" height="${h}" fill="${col}" rx="2" opacity="0.85"/>`;}).join('')}
    <rect x="90" y="115" width="220" height="65" fill="${col}" rx="8"/>
    <rect x="108" y="125" width="184" height="42" fill="#1a472a" rx="4"/>
    <rect x="118" y="130" width="164" height="32" fill="#2d6a4f" rx="3"/>
    <text x="200" y="150" font-family="Arial" font-size="13" fill="white" text-anchor="middle" font-weight="bold">${stadiumName}</text>
    <text x="200" y="165" font-family="Arial" font-size="9" fill="#aaa" text-anchor="middle">${sl.cap.toLocaleString()} ที่นั่ง · ${fmt(sl.income)}/นัด</text>
  </svg>`;
  const up=document.getElementById('s-upgrades');
  if(G.stadiumLevel>=5){up.innerHTML='<div class="tm" style="text-align:center;padding:1rem;">🏆 อัปเกรดสูงสุดแล้ว!</div>';}
  else{
    const nx=SLVLS[G.stadiumLevel];
    up.innerHTML=`<div class="fbtw mbm"><div><div style="font-weight:700;">${nx.name}</div><div class="tm" style="font-size:.78rem;">ความจุ ${nx.cap.toLocaleString()} · รายได้ ${fmt(nx.income)}/นัด</div></div>
      <div style="text-align:right;"><div class="tg" style="font-weight:700;">${fmt(nx.cost)}</div>
      <button class="btn bg bsm" onclick="upgradeStad()" ${G.money<nx.cost?'disabled':''}>อัปเกรด</button></div></div>
      <div class="prbg"><div class="prb" style="width:${Math.min(G.money/nx.cost*100,100).toFixed(0)}%"></div></div>`;
  }
  checkSponsors();
  document.getElementById('sponsor-list').innerHTML=G.sponsors.map(s=>`
    <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <div><div style="font-weight:700;">${s.name}</div>
      <div class="tm" style="font-size:.72rem;">+${fmt(s.weekly)}/สัปดาห์ · ต้องการแฟน ${fmt(s.reqFans)}</div></div>
      <span class="badge ${s.active?'bg-green':'bg-gray'}">${s.active?'✅ ใช้งาน':'🔒 ล็อค'}</span>
    </div>`).join('');
  document.getElementById('merch-display').innerHTML=`
    <div class="fbtw mb"><span class="tm">รายได้ Merchandise</span><span class="tgr">+${fmt(G.merchandiseRevenue)}/เดือน</span></div>
    <div class="fbtw mb"><span class="tm">ขึ้นกับแฟนบอล</span><span>${fmt(G.fans)} คน</span></div>
    <div class="fbtw"><span class="tm">Bonus ตาม Reputation</span><span class="tg">${REPUTATION_LEVELS[G.reputation]}</span></div>`;
}
function upgradeStad(){
  const nx=SLVLS[G.stadiumLevel];if(!nx||G.money<nx.cost){notify('เงินไม่พอ!','red');return;}
  G.money-=nx.cost;G.stadiumLevel++;G.fans=Math.round(SLVLS[G.stadiumLevel-1].cap*.72);
  if(!G.stadiumName||G.stadiumName===SLVLS[G.stadiumLevel-2]?.name)G.stadiumName=SLVLS[G.stadiumLevel-1].name;
  updateHUD();notify(`🏟️ อัปเกรดเป็น ${G.stadiumName}!`,'green');renderStadium();
}
function checkSponsors(){
  G.sponsors.forEach(s=>{if(!s.active&&G.fans>=s.reqFans){s.active=true;notify(`🤝 ${s.name} สนับสนุนทีมคุณแล้ว! +${fmt(s.weekly)}/สัปดาห์`,'green');}});
  G.sponsorIncome=G.sponsors.filter(s=>s.active).reduce((sum,s)=>sum+s.weekly,0);
}
function showSponsor(){goPage('stadium');}

// ===== STATS =====
function renderStats(){
  const s=[...G.leagueTable].sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga));
  document.getElementById('st-league-body').innerHTML=s.map((t,i)=>`
    <div class="trw${t.isMe?' me':''}">
      <span style="${i<4?'color:var(--blue);font-weight:700;':i>=s.length-3?'color:var(--red);font-weight:700;':''}">${i+1}</span>
      <span>${t.name}</span><span>${t.played}</span>
      <span style="color:var(--green);">${t.won}</span>
      <span style="color:var(--gold);">${t.drawn}</span>
      <span style="color:var(--red);">${t.lost}</span>
      <span>${(t.gf-t.ga>0?'+':'')+(t.gf-t.ga)}</span>
      <span class="pts">${t.pts}</span>
    </div>`).join('');
}
function renderScorers(){
  const list=Object.values(G.topScorers).sort((a,b)=>b.goals-a.goals);
  document.getElementById('scorers-body').innerHTML='<div class="ct">⚽ ดาวซัลโว</div>'+
    (list.length?list.slice(0,20).map((s,i)=>`<div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.82rem;"><span>${i+1}. ${s.nat} ${s.name} <span class="tm">· ${s.club||'-'}</span></span><span style="font-weight:700;color:var(--gold);">⚽ ${s.goals}</span></div>`).join(''):'<div class="tm">ยังไม่มี</div>');
}
function renderAssistsTab(){
  const list=Object.values(G.topAssists).sort((a,b)=>b.assists-a.assists);
  document.getElementById('assists-body').innerHTML='<div class="ct">🎯 แอสซิส</div>'+
    (list.length?list.slice(0,20).map((s,i)=>`<div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.82rem;"><span>${i+1}. ${s.nat} ${s.name} <span class="tm">· ${s.club||'-'}</span></span><span style="font-weight:700;color:var(--blue);">🎯 ${s.assists}</span></div>`).join(''):'<div class="tm">ยังไม่มี</div>');
}
function renderCardsTab(){
  const list=Object.values(G.yellowCards).sort((a,b)=>b.cards-a.cards);
  document.getElementById('cards-body').innerHTML='<div class="ct">🟨 ใบเหลือง</div>'+
    (list.length?list.slice(0,20).map((s,i)=>`<div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.82rem;"><span>${i+1}. ${s.nat} ${s.name} <span class="tm">· ${s.club||'-'}</span></span><span style="font-weight:700;color:var(--gold);">🟨 ${s.cards}</span></div>`).join(''):'<div class="tm">ยังไม่มี</div>');
}
function renderRatingsTab(){
  const list=allGamePlayers().filter(p=>(p.apps||0)>0).sort((a,b)=>(b.rating||6.5)-(a.rating||6.5));
  document.getElementById('ratings-body').innerHTML='<div class="ct">⭐ Match Rating เฉลี่ย</div>'+
    list.slice(0,20).map((p,i)=>{
      const formDots=(p.formHistory||[]).slice(-5).map(r=>{const c=r>=8?'#3fb950':r>=6.5?'#f0b429':r>=5?'#f78166':'#da3633';return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};"></span>`;}).join('');
      return `<div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
        <span>${i+1}. ${p.nat} ${p.name} <span class="badge bg-gray" style="font-size:.65rem;">${p.pos}</span> <span class="tm">· ${p.club||'-'}</span></span>
        <div style="display:flex;align-items:center;gap:6px;">${formDots}<span style="font-weight:700;color:var(--gold);">★ ${p.rating?.toFixed(1)||'6.5'}</span></div>
      </div>`;
    }).join('');
}

// ===== YOUTH =====
const YOUTH_SCOUT_REGIONS={
  asia:[['ไทย','🇹🇭'],['ญี่ปุ่น','🇯🇵'],['เกาหลีใต้','🇰🇷'],['ซาอุดีอาระเบีย','🇸🇦']],
  europe:[['อังกฤษ','🏴'],['สเปน','🇪🇸'],['เยอรมนี','🇩🇪'],['ฝรั่งเศส','🇫🇷'],['อิตาลี','🇮🇹']],
  south_america:[['บราซิล','🇧🇷'],['อาร์เจนตินา','🇦🇷'],['อุรุกวัย','🇺🇾'],['โคลอมเบีย','🇨🇴']],
  africa:[['ไนจีเรีย','🇳🇬'],['เซเนกัล','🇸🇳'],['โมร็อกโก','🇲🇦'],['กานา','🇬🇭']],
  north_america:[['สหรัฐอเมริกา','🇺🇸'],['เม็กซิโก','🇲🇽'],['แคนาดา','🇨🇦']],
};
const YOUTH_PROFILE_POS={
  any:POS_LIST,attacker:['ST','LW','RW','CAM'],midfielder:['CDM','CM','CAM','LM','RM'],defender:['CB','LB','RB'],goalkeeper:['GK'],
};
function refreshYouthCountries(){
  const region=document.getElementById('y-continent')?.value||'asia';
  const country=document.getElementById('y-country');if(!country)return;
  country.innerHTML=(YOUTH_SCOUT_REGIONS[region]||YOUTH_SCOUT_REGIONS.asia).map(([name,nat])=>`<option value="${nat}">${nat} ${name}</option>`).join('');
}
function renderYouth(){
  refreshYouthCountries();
  document.getElementById('ac-lv').textContent=G.academyLevel;
  const u16=G.youth.filter(p=>p.age<=16).length;
  const u18=G.youth.filter(p=>p.age>16&&p.age<=18).length;
  const u21=G.youth.filter(p=>p.age>18&&p.age<=21).length;
  document.getElementById('y-u16').textContent=u16;
  document.getElementById('y-u18').textContent=u18;
  document.getElementById('y-u21').textContent=u21;
  document.getElementById('y-total').textContent=G.youth.length;
  const potColor=p=>p.potential>=88?'var(--purple)':p.potential>=80?'var(--gold)':'var(--green)';
  const pe=p=>PERSONALITY_EFFECTS[p.personality]||{};
  document.getElementById('youth-grid').innerHTML=G.youth.map(p=>`
    <div class="pc" onclick="trainYouth('${p.id}')">
      <div class="povr" style="color:${potColor(p)}">P${p.potential}</div>
      <div class="pf">${p.nat}${p.face}</div>
      <div class="pn">${p.name}</div>
      <div class="pp ${p.pos}">${p.pos}</div>
      <div style="text-align:center;margin-bottom:3px;">
        <span style="font-family:'Bebas Neue',cursive;font-size:1rem;color:var(--gold);">CA${p.ca}</span>
        <span class="tm" style="font-size:.65rem;"> · อายุ${p.age}</span>
      </div>
      <div style="text-align:center;font-size:.65rem;margin-bottom:3px;">
        <span style="color:${pe(p).color||'#fff'};">${pe(p).label||p.personality}</span>
      </div>
      <div class="tm" style="text-align:center;font-size:.62rem;">${p.scoutOrigin||'Academy intake'}</div>
      <button class="btn bgr bsm" style="width:100%;margin-top:4px;" onclick="promoteYouth('${p.id}',event)">⬆ เลื่อน</button>
    </div>`).join('')||'<div class="tm" style="grid-column:1/-1;">ยังไม่มีดาวรุ่ง</div>';
}
function scoutYouth(){
  if(G.money<50000){notify('เงินไม่พอ!','red');return;}
  G.money-=50000;
  const potMin=65+G.academyLevel*5;const potMax=80+G.academyLevel*4;
  const scoutBonus=G.staff.scout>1?(G.staff.scout-1)*3:0;
  const profile=document.getElementById('y-profile')?.value||'any';
  const positions=YOUTH_PROFILE_POS[profile]||POS_LIST;
  const nat=document.getElementById('y-country')?.value||'🇹🇭';
  const region=document.getElementById('y-continent')?.selectedOptions?.[0]?.textContent||'เอเชีย';
  const country=document.getElementById('y-country')?.selectedOptions?.[0]?.textContent||nat;
  const p=genPlayer({age:rnd(15,20),base:rnd(45,62),potential:rnd(potMin+scoutBonus,potMax+scoutBonus),pos:positions[rnd(0,positions.length-1)],nat,real:false});
  p.scoutOrigin=`${region} · ${country} · ${profile}`;
  G.youth.push(p);updateHUD();
  notify(`🌱 ${p.name} (${p.pos}) POT ${p.potential} เข้าอคาเดมี!`,'green');renderYouth();
}
function youthIntakeDay(){
  const num=rnd(2,4+G.academyLevel);
  for(let i=0;i<num;i++){
    const potMin=60+G.academyLevel*4;const potMax=78+G.academyLevel*3;
    const p=genPlayer({age:rnd(15,17),base:rnd(40,55),potential:rnd(potMin,potMax),real:false});
    G.youth.push(p);
  }
  notify(`📅 Youth Intake Day! รับนักเตะใหม่ ${num} คน`,'green');renderYouth();
}
function upgradeAcademy(){
  if(G.academyLevel>=5){notify('Academy สูงสุดแล้ว!','red');return;}
  const cost=[0,750000,1500000,3000000,6000000][G.academyLevel];
  if(G.money<cost){notify(`ต้องการ ${fmt(cost)}!`,'red');return;}
  G.money-=cost;G.academyLevel++;updateHUD();
  notify(`🎓 Academy ระดับ ${G.academyLevel}!`,'green');renderYouth();
}
function trainYouth(id){
  const p=G.youth.find(x=>x.id===id);if(!p)return;
  if(G.money<20000){notify('20K ในการฝึก','red');return;}
  G.money-=20000;
  const pe=PERSONALITY_EFFECTS[p.personality]||{growthMult:1.0};
  const coachBonus=1+(G.staff.coach-1)*0.1;
  const gap=p.potential-p.ca;
  const rate=(gap/60)*pe.growthMult*coachBonus;
  const gain=Math.random()<rate?rnd(1,3):rnd(0,1);
  const keys=Object.keys(p.stats);
  for(let i=0;i<4;i++){const k=keys[rnd(0,keys.length-1)];if(p.stats[k]<p.potential)p.stats[k]=Math.min(p.stats[k]+gain,99);}
  p.ca=calcOVRFromStats(p.pos,p.stats);p.ovr=p.ca;
  updateHUD();notify(`📈 ${p.name} CA ${p.ca} (+${gain})`,'green');renderYouth();
}
function promoteYouth(id,e){
  e.stopPropagation();
  const p=G.youth.find(x=>x.id===id);if(!p)return;
  if(!hasSquadSlot()){notify(squadFullMessage(),'red');return;}
  p.contract=3;p.wage=Math.round(p.ca*120);p.morale=85;
  G.squad.push({...p,acquisition:'academy',isInitialSquad:false});G.youth=G.youth.filter(x=>x.id!==id);
  notify(`⬆ ${p.name} เลื่อนขึ้นชุดใหญ่! (Homegrown)`,'green');renderYouth();
}

// ===== HOF =====
function updateHOF(p){
  const found=G.hofScorers.find(x=>x.id===p.id);
  if(found){found.goals=p.goals;found.assists=p.assists;found.apps=p.apps;found.rating=p.rating;}
  else if(p.goals>0||p.apps>5)G.hofScorers.push({id:p.id,name:p.name,nat:p.nat,goals:p.goals,assists:p.assists,apps:p.apps,rating:p.rating||6.5});
  // Check legend status
  if(p.apps>=100&&p.goals>=30&&!p.isLegend&&!G.clubLegends.find(l=>l.id===p.id)){
    p.isLegend=true;G.clubLegends.push({...p,retireYear:G.season});
    notify(`👑 ${p.name} กลายเป็นตำนานสโมสร!`,'gold');
  }
}
function renderHOF(){
  const topScore=[...G.hofScorers].sort((a,b)=>b.goals-a.goals).slice(0,5);
  const topApps=[...G.hofScorers].sort((a,b)=>b.apps-a.apps).slice(0,5);
  const topAst=[...G.hofScorers].sort((a,b)=>b.assists-a.assists).slice(0,5);
  const row=(p,val)=>`<div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.82rem;"><span>${p.nat} ${p.name}</span><span class="tg" style="font-weight:700;">${val}</span></div>`;
  document.getElementById('hof-body').innerHTML=`
    <div class="g3">
      <div><div class="ct">⚽ ดาวซัลโว</div>${topScore.map(p=>row(p,'⚽ '+p.goals)).join('')||'<div class="tm">-</div>'}</div>
      <div><div class="ct">📅 ลงสนาม</div>${topApps.map(p=>row(p,'📅 '+p.apps)).join('')||'<div class="tm">-</div>'}</div>
      <div><div class="ct">🎯 แอสซิส</div>${topAst.map(p=>row(p,'🎯 '+p.assists)).join('')||'<div class="tm">-</div>'}</div>
    </div>`;
  document.getElementById('club-stats').innerHTML=`
    <div class="g2">
      <div class="fbtw mb"><span class="tm">แข่งทั้งหมด</span><span>${G.clubStats.played}</span></div>
      <div class="fbtw mb"><span class="tm">ชนะ/เสมอ/แพ้</span><span>${G.clubStats.won}/${G.clubStats.drawn}/${G.clubStats.lost}</span></div>
      <div class="fbtw mb"><span class="tm">ประตูทำ/เสีย</span><span>${G.clubStats.goalsFor}/${G.clubStats.goalsAgainst}</span></div>
      <div class="fbtw mb"><span class="tm">รายได้รวม</span><span class="tgr">${fmt(G.clubStats.totalRevenue)}</span></div>
      <div class="fbtw mb"><span class="tm">ชื่อเสียง</span><span class="tg">${G.repLabel}</span></div>
      <div class="fbtw"><span class="tm">ฤดูกาล</span><span>${G.season}</span></div>
    </div>`;
  document.getElementById('club-legends').innerHTML=G.clubLegends.length?
    G.clubLegends.map(p=>`
      <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);">
        <div>${p.nat}${p.face} <strong>${p.name}</strong> <span class="tm">${p.pos}</span></div>
        <div class="tg" style="font-size:.78rem;">⚽${p.goals} 🎯${p.assists} 📅${p.apps}</div>
      </div>`).join('')
    :'<div class="tm">ยังไม่มีตำนาน — นักเตะต้องเล่น 100+ นัดและยิง 30+ ประตู</div>';
}

// ===== LEAGUES =====
function renderLeagues(){
  document.getElementById('leagues-grid').innerHTML=LEAGUES_DATA.map(l=>`
    <div class="card" style="text-align:center;cursor:pointer;border-color:${G.league===l.id?'var(--gold)':'var(--border)'};" onclick="selectLeague('${l.id}')">
      <div style="font-size:2.2rem;margin-bottom:5px;">${l.flag}</div>
      <div style="font-weight:700;font-size:.88rem;">${l.name}</div>
      <div class="tm" style="font-size:.72rem;margin-top:3px;">#${l.rank} · ${l.country} · ฐาน ${l.base}</div>
      <div class="tm" style="font-size:.72rem;margin-top:3px;">🏆 ${l.prize} · ${getLeagueTeams(l.id).length} ทีม</div>
      ${G.league===l.id?'<div class="badge bg-gold" style="margin-top:5px;">กำลังเล่น</div>':''}
    </div>`).join('');
}
function selectLeague(id){
  if(id!==G.league&&!G.canChangeLeague){notify('เปลี่ยนลีกได้หลังเล่นจบฤดูกาลเท่านั้น','red');return;}
  if(id===G.league)return;
  G.league=id;G.canChangeLeague=false;G.seasonFixtures=[];ensureWorldDatabase();G.aiClubs=buildAIClubsForLeague(id);G.aiClubs.forEach(c=>{c.squad=getClubSquadFromWorld(id,c.name,c.rep);});refreshTransferMarketPool(true);initLeagueTable();G.week=1;
  updateHUD();notify('🌍 เปลี่ยนลีก: '+LEAGUES_DATA.find(l=>l.id===id)?.name,'green');renderLeagues();if(window.renderFixtures)renderFixtures();if(window.renderLegacy)renderLegacy();
}

// ===== NEW SYSTEM CONSTANTS =====
const {CLUB_DNA_OPTIONS,OWNER_TYPES,WEATHER_LIST,REFEREES,RELATION_TYPES,RIVAL_MAP,AWARD_HISTORY_KEY}=SUPERKICK_SIMULATION_CATALOG;
const {SHOP_ITEMS,TOPUP_PACKAGES}=SUPERKICK_ECONOMY_CATALOG;

// ===== CLUB DNA SYSTEM =====
function renderClubDNA(){
  // DNA options
  document.getElementById('dna-options').innerHTML=CLUB_DNA_OPTIONS.map(d=>`
    <div class="card" style="cursor:pointer;border-color:${G.clubDNA===d.id?'var(--cyan)':'var(--border)'};background:${G.clubDNA===d.id?'rgba(57,197,207,.07)':''};" onclick="selectDNA('${d.id}')">
      <div style="font-weight:700;font-size:.9rem;">${d.label}</div>
      <div class="tm" style="font-size:.75rem;margin:.3rem 0;">${d.desc}</div>
      <div style="font-size:.72rem;color:var(--cyan);">✦ ${d.effect}</div>
      ${G.clubDNA===d.id?'<div class="badge bg-green" style="margin-top:4px;">✅ ใช้งานอยู่</div>':''}
    </div>`).join('');
  // Owner
  const owner=OWNER_TYPES.find(o=>o.id===G.ownerType)||OWNER_TYPES[1];
  document.getElementById('owner-display').innerHTML=`
    <div style="font-size:1.3rem;margin-bottom:4px;">${owner.label}</div>
    <div class="tm" style="font-size:.8rem;margin-bottom:.5rem;">${owner.desc}</div>
    <div class="g2">
      <div class="fbtw"><span class="tm">งบโบนัส/ซีซั่น</span><span class="tgr">+${fmt(owner.budgetBonus)}</span></div>
      <div class="fbtw"><span class="tm">ความอดทน</span><span class="tg">${owner.boardTolerance} คำเตือน</span></div>
    </div>
    <div class="fb gap" style="margin-top:.5rem;flex-wrap:wrap;">
      ${OWNER_TYPES.map(o=>`<button class="btn bsm ${G.ownerType===o.id?'bg':'bgh'}" onclick="changeOwner('${o.id}')">${o.label}</button>`).join('')}
    </div>`;
  // Weather
  rollWeather();
  // Referee
  rollReferee();
  // Rivalry
  const rival=RIVAL_MAP[G.league]||'Rival FC';
  G.rivalTeam=rival;
  document.getElementById('rivalry-display').innerHTML=`
    <div class="fbtw mb"><span style="font-weight:700;">⚔️ คู่อริ:</span><span class="tr" style="font-weight:700;">${rival}</span></div>
    <div class="tm" style="font-size:.78rem;">แมตช์ดาร์บี้ vs ${rival} จะเพิ่มความกดดัน รายได้+50% แฟนบอล+5%</div>`;
}
function selectDNA(id){
  G.clubDNA=id;
  notify(`🧬 Club DNA: ${CLUB_DNA_OPTIONS.find(d=>d.id===id)?.label}`,'green');
  renderClubDNA();
}
function changeOwner(id){
  G.ownerType=id;
  const o=OWNER_TYPES.find(x=>x.id===id);
  G.money+=o.budgetBonus;
  updateHUD();
  notify(`🏢 เจ้าของใหม่: ${o.label}`,'green');
  renderClubDNA();
}
function rollWeather(){
  const w=WEATHER_LIST[rnd(0,WEATHER_LIST.length-1)];
  G.matchWeather=w.id;
  document.getElementById('weather-display').innerHTML=`
    <div style="font-size:1.5rem;">${w.label}</div>
    <div class="tm" style="font-size:.78rem;margin-top:3px;">${w.effect}</div>`;
}
function rollReferee(){
  const r=REFEREES[rnd(0,REFEREES.length-1)];
  G.matchReferee=r.style;
  document.getElementById('referee-display').innerHTML=`
    <div style="font-weight:700;">${r.name} <span class="badge bg-gray">${r.label}</span></div>
    <div class="tm" style="font-size:.78rem;margin-top:3px;">${r.desc}</div>`;
}

// ===== PLAYER RELATIONS SYSTEM =====
function genRelations(){
  if(G.squad.length<2){document.getElementById('relations-grid').innerHTML='<div class="tm">ต้องมีนักเตะอย่างน้อย 2 คน</div>';return;}
  G.relations=[];
  const pairs=[];
  for(let i=0;i<Math.min(G.squad.length,8);i++){
    for(let j=i+1;j<Math.min(G.squad.length,8);j++){
      if(Math.random()<0.35)pairs.push([G.squad[i],G.squad[j]]);
    }
  }
  pairs.slice(0,8).forEach(([a,b])=>{
    let type;
    if(a.personality==='Leader'&&b.age<a.age-5)type='mentor';
    else if(a.personality==='Temperamental'||b.personality==='Temperamental')type='conflict';
    else if(a.nat===b.nat&&Math.random()<0.5)type='friendship';
    else if(a.pos===b.pos&&Math.random()<0.4)type='partnership';
    else type=RELATION_TYPES[rnd(0,RELATION_TYPES.length-1)].type;
    G.relations.push({a:a.id,b:b.id,aName:a.name,bName:b.name,type});
  });
  const grid=document.getElementById('relations-grid');if(!grid)return;
  grid.innerHTML=G.relations.map(r=>{
    const rel=RELATION_TYPES.find(x=>x.type===r.type)||RELATION_TYPES[0];
    const color=r.type==='conflict'?'var(--red)':r.type==='partnership'?'var(--green)':r.type==='mentor'?'var(--blue)':'var(--gold)';
    return `<div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <span style="color:${color};">${rel.label}</span>
      <span style="flex:1;text-align:center;font-size:.8rem;">${r.aName} ↔ ${r.bName}</span>
      <span class="tm" style="font-size:.72rem;">${rel.desc}</span>
    </div>`;
  }).join('')||'<div class="tm">ยังไม่มีความสัมพันธ์</div>';
}
function calcRelationChemBonus(){
  let bonus=0;
  G.relations.forEach(r=>{
    const rel=RELATION_TYPES.find(x=>x.type===r.type);
    if(rel)bonus+=rel.chemBonus||0;
  });
  return bonus;
}

// ===== WONDERKID SYSTEM =====
function spawnWonderkid(){
  if(G.money<100000){notify('ต้องการ 100K!','red');return;}
  G.money-=100000;
  const wk=genPlayer({age:rnd(16,19),base:rnd(55,70),potential:rnd(90,99),real:false});
  wk.isWonderkid=true;
  G.wonderkids.push(wk);
  notify(`🌟 พบ Wonderkid! ${wk.name} (${wk.pos}) POT${wk.potential}!`,'gold');
  updateHUD();renderWonderkids();
}
function renderWonderkids(){
  const el=document.getElementById('wonderkid-list');if(!el)return;
  el.innerHTML=G.wonderkids.length?G.wonderkids.map(p=>`
    <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <div class="fb gap" style="align-items:center;">
        <span style="font-size:1.2rem;">${p.nat}${p.face}</span>
        <div><div style="font-weight:700;">${p.name} <span style="color:var(--purple);">POT${p.potential}</span></div>
        <div class="tm">${p.pos} · อายุ ${p.age} · CA${p.ca}</div></div>
      </div>
      <button class="btn bg bsm" onclick="signWonderkid('${p.id}')">เซ็น (${fmt(Math.round(p.ca*p.ca*800))})</button>
    </div>`).join('')
    :'<div class="tm">ยังไม่มี Wonderkid — กดค้นหา</div>';
}
function signWonderkid(id){
  const p=G.wonderkids.find(x=>x.id===id);if(!p)return;
  const cost=Math.round(p.ca*p.ca*800);
  if(G.money<cost){notify(`ต้องการ ${fmt(cost)}!`,'red');return;}
  if(!hasSquadSlot()){notify(squadFullMessage(),'red');return;}
  G.money-=cost;p.contract=5;p.wage=Math.round(p.ca*150);
  G.squad.push({...p,acquisition:'wonderkid',isInitialSquad:false});G.wonderkids=G.wonderkids.filter(x=>x.id!==id);
  updateHUD();notify(`⭐ เซ็น Wonderkid ${p.name}!`,'gold');renderWonderkids();
}

// ===== WEATHER + REFEREE MATCH EFFECTS =====
function getWeatherMatchMod(){
  const w=WEATHER_LIST.find(x=>x.id===G.matchWeather)||WEATHER_LIST[0];
  return {att:w.attMod||0,def:w.defMod||0,label:w.label};
}
function getRefereeCardMult(){
  const r=REFEREES.find(x=>x.style===G.matchReferee)||REFEREES[1];
  return r.cardMult||1.0;
}

// ===== AWARDS SYSTEM =====
function renderAwards(){
  const topScorer=Object.values(G.topScorers).sort((a,b)=>b.goals-a.goals)[0];
  const world=allGamePlayers();
  const topGK=world.filter(p=>p.pos==='GK').sort((a,b)=>(b.rating||6.5)-(a.rating||6.5))[0];
  const youngster=world.filter(p=>p.age<=21).sort((a,b)=>(b.ovr||0)-(a.ovr||0))[0];
  const bestRating=[...world].sort((a,b)=>(b.rating||6.5)-(a.rating||6.5)||(b.ovr||0)-(a.ovr||0))[0];
  const renderAward=(el,p,extra='')=>{
    if(!p){document.getElementById(el).innerHTML='<div class="tm">ยังไม่มีข้อมูล</div>';return;}
    document.getElementById(el).innerHTML=`
      <div class="fbtw">
        <div class="fb gap" style="align-items:center;">
          <span style="font-size:1.5rem;">${p.nat||''}${p.face||'👤'}</span>
          <div><div style="font-weight:700;">${p.name}</div>
          <div class="tm" style="font-size:.75rem;">${p.pos||''} · ${extra}</div></div>
        </div>
        <span style="font-family:'Bebas Neue',cursive;font-size:1.4rem;color:var(--gold);">${p.ovr||p.rating||''}</span>
      </div>`;
  };
  renderAward('award-ballon',bestRating,`Rating ★${bestRating?.rating?.toFixed(1)||'6.5'}`);
  renderAward('award-boot',topScorer?{name:topScorer.name,nat:topScorer.nat,face:'⚽',pos:'',ovr:topScorer.goals+' ⚽'}:null,`${topScorer?.goals||0} ประตู`);
  renderAward('award-glove',topGK,`Rating ★${topGK?.rating?.toFixed(1)||'6.5'}`);
  renderAward('award-golden-boy',youngster,`อายุ ${youngster?.age} · CA${youngster?.ca}`);
  // TOTY - best 11
  const toty=['GK','CB','CB','LB','RB','CM','CM','CAM','LW','RW','ST'].map(pos=>{
    return world.filter(p=>p.pos===pos).sort((a,b)=>b.ovr-a.ovr)[0];
  }).filter(Boolean);
  document.getElementById('award-toty').innerHTML=toty.slice(0,11).map(p=>`
    <div class="pc" style="text-align:center;">
      <div style="font-size:1.3rem;">${p.nat}${p.face}</div>
      <div style="font-size:.72rem;font-weight:700;margin-top:3px;">${p.name.split(' ').pop()}</div>
      <div class="pp ${p.pos}" style="display:inline-block;margin:2px auto;">${p.pos}</div>
      <div style="font-family:'Bebas Neue',cursive;color:var(--gold);">${p.ovr}</div>
    </div>`).join('')||'<div class="tm" style="grid-column:1/-1;">ยังไม่มีข้อมูล</div>';
  document.getElementById('award-manager').innerHTML=`
    <div class="fbtw">
      <div class="fb gap" style="align-items:center;">
        <span style="font-size:1.8rem;">${G.managerAvatar||'🧑‍💼'}</span>
        <div><div style="font-weight:700;">${G.managerName||'Manager'}</div>
        <div class="tm" style="font-size:.75rem;">${G.teamName} · Season ${G.season}</div></div>
      </div>
      <span class="badge bg-gold">⭐ ${G.repLabel}</span>
    </div>`;
  // History
  const hist=G.awards.ballonDor||[];
  document.getElementById('award-history').innerHTML=hist.length?
    hist.map(h=>`<div class="fbtw" style="padding:4px 0;border-bottom:1px solid var(--border);font-size:.8rem;"><span>Season ${h.season}</span><span class="tg">${h.name}</span></div>`).join('')
    :'<div class="tm">ยังไม่มีประวัติ</div>';
}
function endSeasonAwards(){
  const best=allGamePlayers().sort((a,b)=>(b.rating||6.5)-(a.rating||6.5)||(b.ovr||0)-(a.ovr||0))[0];
  if(best){
    G.awards.ballonDor.push({season:G.season,name:best.name,rating:best.rating});
    notify(`🌟 Ballon d'Or: ${best.name} (★${best.rating?.toFixed(1)})!`,'gold');
  }
  const topS=Object.values(G.topScorers).sort((a,b)=>b.goals-a.goals)[0];
  if(topS)notify(`⚽ Golden Boot: ${topS.name} (${topS.goals} ประตู)!`,'gold');
}

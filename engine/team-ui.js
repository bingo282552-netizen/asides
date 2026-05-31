// ===== HUD & REPUTATION =====
function calcReputation(){
  const pts=G.leagueTable.find(t=>t.isMe)?.pts||0;
  const totalRevenue=G.clubStats.totalRevenue;
  const score=pts*0.5+G.fans/1000+totalRevenue/1000000;
  if(score>500)return 5;if(score>200)return 4;if(score>100)return 3;if(score>50)return 2;if(score>20)return 1;return 0;
}
function updateHUD(){
  document.getElementById('hm').textContent=fmt(G.money);
  document.getElementById('hf').textContent=fmt(G.fans);
  document.getElementById('hw').textContent='W'+G.week;
  const sorted=[...G.leagueTable].sort((a,b)=>b.pts-a.pts);
  const rank=sorted.findIndex(t=>t.isMe)+1;
  document.getElementById('hrank').textContent='#'+rank;
  G.sponsorIncome=G.sponsors.filter(s=>s.active).reduce((sum,s)=>sum+s.weekly,0);
  document.getElementById('hsp').textContent='+'+fmt(G.sponsorIncome)+'/W';
  const rep=calcReputation();
  G.reputation=rep;G.repLabel=REPUTATION_LEVELS[rep];
  document.getElementById('hrep').textContent=REPUTATION_LEVELS[rep];
  if(document.getElementById('rep-badge'))document.getElementById('rep-badge').textContent=REPUTATION_LEVELS[rep];
  G.totalWages=G.squad.reduce((s,p)=>s+p.wage,0);
  G.merchandiseRevenue=Math.round(G.fans*0.05*(1+rep*0.2));
  const hcoins=document.getElementById('hcoins');if(hcoins)hcoins.textContent=G.coins||0;
  saveGame();
}

// ===== HOME =====
function renderHome(){
  updateHUD();
  const me=G.leagueTable.find(t=>t.isMe)||{};
  const accent=G.teamColor||'var(--gold)';
  const hero=document.querySelector('#pg-home > .card');
  if(hero)hero.style.borderColor=accent;
  document.getElementById('hw2').textContent=me.won||0;
  document.getElementById('hd').textContent=me.drawn||0;
  document.getElementById('hl').textContent=me.lost||0;
  document.getElementById('hpts').textContent=me.pts||0;
  document.getElementById('tn-disp').textContent=G.teamName;
  document.getElementById('lg-disp').textContent=(()=>{const l=LEAGUES_DATA.find(x=>x.id===G.league);return (l?.name||G.league)+' · Season '+G.season;})();
  const sl=SLVLS[G.stadiumLevel-1];
  document.getElementById('fin-b').textContent=fmt(G.money);
  document.getElementById('fin-i').textContent='+'+fmt(sl.income)+'/นัด';
  document.getElementById('fin-sp').textContent='+'+fmt(G.sponsorIncome)+'/สัปดาห์';
  document.getElementById('fin-w').textContent='-'+fmt(G.totalWages||0)+'/เดือน';
  const top=[...G.squad].sort((a,b)=>b.ovr-a.ovr).slice(0,3);
  document.getElementById('home-top').innerHTML=top.map(p=>`
    <div class="card" style="text-align:center;padding:.5rem;">
      <div style="display:flex;justify-content:center;">${playerFace(p,'mini-face')}</div>
      <div style="font-size:.78rem;font-weight:700;">${playerCardName(p)}</div>
      <div style="font-family:'Bebas Neue',cursive;color:var(--gold);">${p.ovr}</div>
      <div class="tm" style="font-size:.65rem;">${p.pos} · ★${p.rating?.toFixed(1)||'6.5'}</div>
    </div>`).join('');
  checkAlerts();
  renderBoardGoals();
  const sbar=(v,c)=>`<div style="display:inline-block;width:${v}%;height:4px;background:${c};border-radius:2px;"></div>`;
}
function checkAlerts(){
  const alerts=[];
  G.squad.filter(p=>p.contract<1).forEach(p=>alerts.push(`⚠️ ${p.name} สัญญาหมดเร็วๆนี้`));
  G.squad.filter(p=>p.injured).forEach(p=>alerts.push(`🏥 ${p.name} บาดเจ็บ ${p.injuryType} (พัก ${p.injuryMatches||Math.ceil((p.injuryDays||0)/7)} นัด)`));
  G.squad.filter(p=>(p.suspendedMatches||0)>0).forEach(p=>alerts.push(`🟥 ${p.name} ติดโทษแบน ${p.suspendedMatches} นัด`));
  const totalWages=G.squad.reduce((s,p)=>s+p.wage,0)*12;
  if(totalWages>G.money*2)alerts.push('💸 FFP Warning: ค่าเหนื่อยสูงเกิน!');
  if(G.squad.length<14)alerts.push('👥 ทีมน้อยเกินไป! ต้องการนักเตะเพิ่ม');
  const rank=[...G.leagueTable].sort((a,b)=>b.pts-a.pts).findIndex(t=>t.isMe)+1;
  if(rank>10&&G.leagueTable.find(t=>t.isMe)?.played>5)alerts.push(`📉 อันดับที่ ${rank} ต่ำกว่าเป้าหมาย`);
  document.getElementById('home-alerts').innerHTML=alerts.length?alerts.map(a=>`<div style="padding:3px 0;border-bottom:1px solid var(--border);font-size:.8rem;">${a}</div>`).join(''):'<span style="color:var(--green);">✅ ทุกอย่างปกติดี</span>';
}
function renderBoardGoals(){
  const goals={top4:'Top 4',top6:'Top 6',win:'ชนะลีก',youth:'พัฒนาเยาวชน',financial:'เสถียรภาพการเงิน'};
  const rank=[...G.leagueTable].sort((a,b)=>b.pts-a.pts).findIndex(t=>t.isMe)+1;
  let progress='';let warning='';
  if(G.boardGoal==='top4')progress=rank<=4?'✅ บรรลุเป้าหมาย!':'❌ ยังไม่ถึงเป้า (อันดับ '+rank+')';
  else if(G.boardGoal==='top6')progress=rank<=6?'✅ บรรลุ!':'❌ ยังไม่ถึง (อันดับ '+rank+')';
  else if(G.boardGoal==='win')progress=rank===1?'✅ นำตาราง!':'❌ ยังไม่เป็นที่ 1';
  else if(G.boardGoal==='youth')progress=G.youth.length>=5?'✅ มีดาวรุ่ง '+G.youth.length+' คน':'❌ ต้องการเยาวชนมากกว่า 5 คน';
  else progress=G.money>0?'✅ การเงินดี':'❌ การเงินติดลบ!';
  if(G.boardWarnings>0)warning=`🚨 คำเตือนจากบอร์ด ${G.boardWarnings}/3 ครั้ง ${G.boardWarnings>=3?'(โดนไล่ออก!)':''}`;
  document.getElementById('board-goals-display').innerHTML=`<div class="fbtw"><span>เป้าหมาย: ${goals[G.boardGoal]}</span><span>${progress}</span></div>`;
  if(G.boardWarnings>0&&document.getElementById('board-warning'))document.getElementById('board-warning').textContent=warning;
  if(document.getElementById('board-goal-disp'))document.getElementById('board-goal-disp').textContent='เป้าหมาย: '+goals[G.boardGoal];
  // End season button
  const endBtn=document.getElementById('end-season-btn');
  if(endBtn){const me2=G.leagueTable.find(t=>t.isMe)||{};endBtn.style.display=me2.played>=38?'block':'none';}
}

// ===== SQUAD =====
const sBar=(label,val,max=99)=>`<div class="sr"><div class="sl">${label}</div><div class="sbb"><div class="sb" style="width:${val/max*100}%;"></div></div><div class="sv">${val}</div></div>`;
function renderSquad(){
  const pos=document.getElementById('sq-fpos')?.value||'';
  const sort=document.getElementById('sq-fsort')?.value||'ovr';
  let list=[...G.squad].filter(p=>!pos||p.pos===pos);
  if(sort==='ca')list.sort((a,b)=>b.ca-a.ca);
  else if(sort==='form')list.sort((a,b)=>b.form-a.form);
  else if(sort==='fitness')list.sort((a,b)=>b.fitness-a.fitness);
  else if(sort==='morale')list.sort((a,b)=>b.morale-a.morale);
  else list.sort((a,b)=>b.ovr-a.ovr);
  document.getElementById('sq-cnt').textContent=G.squad.length;
  const max=document.getElementById('sq-max');if(max)max.textContent=squadLimit();
  const formColor=f=>f>=8?'#3fb950':f>=6.5?'#f0b429':f>=5?'#f78166':'#da3633';
  const formDots=(p)=>{
    const hist=p.formHistory||[];
    return hist.slice(-5).map(r=>`<div class="fh-dot" style="background:${formColor(r)};color:#000;">${r.toFixed(0)}</div>`).join('');
  };
  document.getElementById('sq-grid').innerHTML=list.map(p=>{
    const pe=PERSONALITY_EFFECTS[p.personality]||{};
    const injBadge=p.injured?`<span class="inj-tag">${p.injuryType||'บาดเจ็บ'}</span>`:(p.suspendedMatches>0?`<span class="inj-tag">แบน ${p.suspendedMatches} นัด</span>`:'');
    const potColor=p.potential>=88?'var(--purple)':p.potential>=80?'var(--gold)':'var(--green)';
    const loanBadge=p.onLoan?'<span class="badge bg-blue" style="font-size:.6rem;">ยืม</span>':'';
    return `<div class="pc ${p.injured?'injured':''}" onclick="showPlayer('${p.id}')">
      <div class="pstatus">${injBadge}${loanBadge}</div>
      <div class="povr" style="color:${potColor}">P${p.potential}</div>
      ${playerFace(p)}
      <div class="pn">${playerCardName(p)}</div>
      <div style="text-align:center;margin-bottom:3px;">${cardTierBadge(p)}</div>
      <div class="pp ${p.pos}">${p.pos}</div>
      <div style="text-align:center;margin-bottom:3px;">
        <span style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--gold);">CA${p.ca}</span>
        <span class="tm" style="font-size:.7rem;"> / PA${p.potential}</span>
      </div>
      <div class="form-history" style="justify-content:center;margin-bottom:3px;">${formDots(p)}</div>
      <div style="display:flex;justify-content:center;gap:6px;font-size:.68rem;">
        <span title="ฟิต">💪${p.fitness}</span>
        <span title="ขวัญ">😊${p.morale}</span>
        <span title="ฟอร์ม">⭐${p.form}</span>
      </div>
      <div style="text-align:center;margin-top:3px;">
        <span class="personality-badge" style="color:${pe.label?pe.label.split(' ').join(''):''};border-color:${pe.color||'#30363d'};background:${pe.color||'#30363d'}22;font-size:.6rem;">${pe.label||p.personality}</span>
      </div>
    </div>`;
  }).join('')||'<div class="tm" style="grid-column:1/-1;">ไม่มีนักเตะ</div>';
}

// ===== PLAYER MODAL =====
function showPlayer(id){
  const p=G.squad.find(x=>x.id===id)||G.marketPlayers.find(x=>x.id===id);
  if(!p)return;
  const pe=PERSONALITY_EFFECTS[p.personality]||{};
  const formDots=(p.formHistory||[]).slice(-5).map(r=>{
    const c=r>=8?'#3fb950':r>=6.5?'#f0b429':r>=5?'#f78166':'#da3633';
    return `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};color:#000;font-size:.6rem;text-align:center;line-height:14px;font-weight:700;">${r.toFixed(0)}</span>`;
  }).join(' ');
  document.getElementById('mp-content').innerHTML=`
    <div class="mdt">${playerCardName(p)}</div>
    <div style="display:flex;justify-content:center;margin-bottom:.75rem;">${playerFace(p,'pack-face')}</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;">
      <span class="badge bg-gold">${p.pos}</span>
      ${cardTierBadge(p)}
      <span class="personality-badge" style="color:${pe.color||'#fff'};border-color:${pe.color||'#30363d'};">${pe.label||p.personality}</span>
      ${p.traits.map(t=>`<span class="trait-chip">${t}</span>`).join('')}
      ${p.injured?`<span class="inj-tag">🏥 ${p.injuryType} (พัก ${p.injuryMatches||Math.ceil((p.injuryDays||0)/7)} นัด)</span>`:''}
      ${p.suspendedMatches>0?`<span class="inj-tag">🟥 ติดโทษแบน ${p.suspendedMatches} นัด</span>`:''}
    </div>
    <div class="g2" style="margin-bottom:.5rem;">
      <div class="fbtw mb"><span class="tm">CA</span><span style="color:var(--gold);font-weight:700;">${p.ca}</span></div>
      <div class="fbtw mb"><span class="tm">PA Range</span><span style="color:var(--purple);">${p.potentialMin||p.potential}-${p.potentialMax||p.potential}</span></div>
      <div class="fbtw mb"><span class="tm">อายุ</span><span>${p.age}</span></div>
      <div class="fbtw mb"><span class="tm">Peak Age</span><span>${p.peakAge||28}</span></div>
      <div class="fbtw mb"><span class="tm">Fitness</span><span>${p.fitness}%</span></div>
      <div class="fbtw mb"><span class="tm">Morale</span><span>${p.morale}%</span></div>
    </div>
    <div class="fbtw mb"><span class="tm">ฟอร์ม 5 นัดล่าสุด</span><div>${formDots||'<span class="tm">-</span>'}</div></div>
    <div class="fbtw mb"><span class="tm">Match Rating เฉลี่ย</span><span class="tg">★ ${p.rating?.toFixed(1)||'6.5'}</span></div>
    <div class="fbtw mb"><span class="tm">มูลค่า</span><span class="tg">${fmt(p.price)}</span></div>
    <div class="fbtw mb"><span class="tm">ค่าเหนื่อย</span><span class="tr">${fmt(p.wage)}/เดือน</span></div>
    <div class="fbtw mb"><span class="tm">สัญญา</span><span>${p.contract?.toFixed(1)||0} ปี</span></div>
    <div class="fbtw mb"><span class="tm">⚽ ประตู / 🎯 แอสซิส</span><span>${p.goals} / ${p.assists}</span></div>
    <hr class="div">
    <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px;">💼 โบนัส</div>
    <div class="fbtw mb" style="font-size:.78rem;"><span class="tm">ค่าเซ็น</span><span>${fmt(p.signingBonus||0)}</span></div>
    <div class="fbtw mb" style="font-size:.78rem;"><span class="tm">โบนัสประตู</span><span>${fmt(p.goalBonus||0)}/ประตู</span></div>
    ${p.pos==='GK'?`<div class="fbtw mb" style="font-size:.78rem;"><span class="tm">โบนัสคลีนชีต</span><span>${fmt(p.cleanSheetBonus||0)}/นัด</span></div>`:''}
    <hr class="div">
    ${p.pos==='GK'?
      [sBar('REF',p.stats.REF),sBar('HAN',p.stats.HAN),sBar('POS',p.stats.POS),sBar('PAC',p.stats.PAC),sBar('DEC',p.stats.DEC)].join(''):
      [sBar('PAC',p.stats.PAC),sBar('SHO',p.stats.SHO),sBar('PAS',p.stats.PAS),sBar('DRI',p.stats.DRI),sBar('TAC',p.stats.TAC),sBar('STR',p.stats.STR)].join('')}
    <hr class="div">
    ${G.squad.find(x=>x.id===id)?`<div class="fb gap">
      ${p.isInitialSquad?'<span class="tm">Starter ชุดแรกขายไม่ได้</span>':`<button class="btn br bsm" onclick="sellPlayer('${p.id}');closeM('modal-player')">💰 ขาย ${fmt(Math.round(p.price*.85))}</button>`}
      <button class="btn br bsm" onclick="deletePlayer('${p.id}');closeM('modal-player')">🗑️ ลบ</button>
      <button class="btn bgh bsm" onclick="restorePlayer('${p.id}');closeM('modal-player')">💊 ฟื้นฟู (20K)</button>
    </div>`:''}
  `;
  openM('modal-player');
}
function restorePlayer(id){
  const p=G.squad.find(x=>x.id===id);if(!p)return;
  if(G.money<20000){notify('เงินไม่พอ!','red');return;}
  G.money-=20000;
  p.fitness=Math.min(p.fitness+25,100);p.morale=Math.min(p.morale+15,100);p.sharpness=Math.min((p.sharpness||60)+15,100);
  if(p.injured&&p.injuryDays>0){
    const docBonus=G.staff.doctor;
    p.injuryDays=Math.max(0,p.injuryDays-7*docBonus);
    p.injuryMatches=Math.max(0,Math.ceil(p.injuryDays/7));
    if(p.injuryDays<=0){p.injured=false;p.injuryType='';p.injuryMatches=0;}
  }
  updateHUD();notify(`💊 ${p.name} ฟื้นฟูแล้ว`,'green');
}

// ===== FORMATION =====
let pendingLineupPlayerId='';
function syncTacticControls(){
  ensureGameDefaults();
  const fields={press:'tv-press',width:'tv-width',tempo:'tv1',defline:'tv2',counter:'tv-ct',passing:'tv-pass',creativity:'tv-cre',aggression:'tv-agr',overlap:'tv-ovl'};
  Object.entries(fields).forEach(([key,label])=>{
    const input=document.getElementById('t-'+key),out=document.getElementById(label);
    if(input)input.value=G.tacticPlan[key]??5;
    if(out)out.textContent=G.tacticPlan[key]??5;
  });
  const style=document.getElementById('t-style');if(style)style.value=G.tacStyle||'balanced';
}
function renderCaptaincy(){
  const players=[...G.squad].sort((a,b)=>(b.ca||b.ovr)-(a.ca||a.ovr));
  const options=(selected,placeholder)=>`<option value="">${placeholder}</option>${players.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.pos} · ${p.name}</option>`).join('')}`;
  const captain=document.getElementById('t-captain'),vice=document.getElementById('t-vice'),penalty=document.getElementById('t-penalty');
  if(captain)captain.innerHTML=options(G.captainId,'เลือกกัปตัน');
  if(vice)vice.innerHTML=options(G.viceCaptainId,'เลือกรองกัปตัน');
  if(penalty)penalty.innerHTML=options(G.setPieceTakers?.penalty,'เลือกมือสังหาร');
}
function setCaptaincy(){
  G.captainId=document.getElementById('t-captain')?.value||'';
  G.viceCaptainId=document.getElementById('t-vice')?.value||'';
  G.setPieceTakers=G.setPieceTakers||{};
  G.setPieceTakers.penalty=document.getElementById('t-penalty')?.value||'';
  saveGame();
}
function getLineupPlayers(){
  return Object.values(G.slots||{}).map(id=>G.squad.find(p=>p.id===id)).filter(p=>p&&!p.injured&&!(p.suspendedMatches>0)&&p.fitness>0);
}
function getLineupPlayerPool(){
  const picked=getLineupPlayers();
  return picked.length?picked:G.squad.filter(p=>!p.injured&&!(p.suspendedMatches>0)&&p.fitness>0);
}
function isPosCompatible(player,pos){
  if(!player||player.injured||player.suspendedMatches>0)return false;
  if(pos==='GK')return player.pos==='GK';
  if(['CB','LB','RB'].includes(pos))return ['CB','LB','RB'].includes(player.pos);
  if(['CDM','CM','CAM','LM','RM'].includes(pos))return ['CDM','CM','CAM','LM','RM'].includes(player.pos);
  if(['LW','RW','ST'].includes(pos))return ['LW','RW','ST'].includes(player.pos);
  return true;
}
function renderLineupSquad(){
  const panel=document.getElementById('lineup-squad');
  if(!panel)return;
  const used=new Set(Object.values(G.slots||{}));
  const counter=document.getElementById('lineup-count');
  if(counter)counter.textContent=getLineupPlayers().length;
  panel.innerHTML=[...G.squad].sort((a,b)=>(b.ca||b.ovr)-(a.ca||a.ovr)).map(p=>{
    const usedCls=used.has(p.id)?' used':'';
    const unavailable=p.injured||p.suspendedMatches>0;
    const injCls=unavailable?' injured':'';
    const face=p.photo?`<img src="${p.photo}" alt="">`:p.face;
    const status=p.injured?`บาดเจ็บ พัก ${p.injuryMatches||Math.ceil((p.injuryDays||0)/7)} นัด`:p.suspendedMatches>0?`ติดโทษแบน ${p.suspendedMatches} นัด`:`Fit ${p.fitness||0}% · Morale ${p.morale||0}`;
    return `<div class="lineup-player${usedCls}${injCls}" draggable="${unavailable?'false':'true'}" ondragstart="dragLineupPlayer(event,'${p.id}')" onclick="selectLineupPlayer('${p.id}')">
      <div class="lineup-avatar">${face}</div>
      <div><div class="lineup-name">${p.name}</div><div class="lineup-meta">${p.pos} · ${status}</div></div>
      <div class="lineup-ovr">${p.ca||p.ovr}</div>
    </div>`;
  }).join('');
}
function dragLineupPlayer(ev,id){
  pendingLineupPlayerId=id;
  ev.dataTransfer.setData('text/plain',id);
  ev.dataTransfer.effectAllowed='move';
}
function selectLineupPlayer(id){
  const p=G.squad.find(x=>x.id===id);
  if(!p||p.injured||p.suspendedMatches>0)return;
  pendingLineupPlayerId=id;
  notify('เลือก '+p.name+' แล้ว คลิกตำแหน่งในสนามเพื่อใส่ตัว','blue');
}
function lineupDragOver(ev){
  ev.preventDefault();
  ev.currentTarget.classList.add('drop');
}
function lineupDragLeave(ev){
  ev.currentTarget.classList.remove('drop');
}
function dropLineupPlayer(ev,idx,pos){
  ev.preventDefault();
  ev.currentTarget.classList.remove('drop');
  const id=ev.dataTransfer.getData('text/plain')||pendingLineupPlayerId;
  assignPlayerToSlot(id,idx,pos);
}
function assignPlayerToSlot(id,idx,pos){
  const p=G.squad.find(x=>x.id===id);
  if(!p){assignSlot(idx,pos);return;}
  if(p.injured){notify('นักเตะบาดเจ็บ ลงสนามไม่ได้','red');return;}
  if(p.suspendedMatches>0){notify('นักเตะติดโทษแบน ลงสนามไม่ได้','red');return;}
  if(!isPosCompatible(p,pos)){notify(`${p.name} ไม่เหมาะกับตำแหน่ง ${pos}`,'red');return;}
  Object.keys(G.slots).forEach(k=>{if(G.slots[k]===id)delete G.slots[k];});
  G.slots[idx]=id;
  pendingLineupPlayerId='';
  renderFormation();
  saveGame();
  notify('✅ '+p.name+' → '+pos,'green');
}
function renderFormation(){
  syncTacticControls();
  const f=G.formation||'433';
  const slots=FORMATIONS[f]||FORMATIONS['433'];
  const c=document.getElementById('fslots');c.innerHTML='';c.style.cssText='position:absolute;inset:0;';
  slots.forEach((sl,i)=>{
    const pid=G.slots[i];const p=pid?G.squad.find(x=>x.id===pid):null;
    const div=document.createElement('div');div.className='fslot';div.style.cssText=`left:${sl.x}%;top:${sl.y}%;`;
    const injBadge=p&&p.injured?'🏥':'';
    div.innerHTML=`<div class="sc${p?' filled':''}" onclick="assignSlot(${i},'${sl.p}')" ondragover="lineupDragOver(event)" ondragleave="lineupDragLeave(event)" ondrop="dropLineupPlayer(event,${i},'${sl.p}')">${p?p.face+injBadge:'➕'}</div>
      <div class="sn">${p?p.name.split(' ').slice(-1)[0]:sl.p}</div>
      <div class="so">${p?p.ca:''}</div>`;
    c.appendChild(div);
  });
  renderLineupSquad();
  renderCaptaincy();
  renderTeamStrength();
  renderChemistry();
}
function updateFormation(){
  const newF=document.getElementById('t-form').value;
  if(newF!==G.currentFormation){
    notify(`📋 เปลี่ยนเป็น ${newF} — ความคุ้นเคย ${G.formationFamiliarity[newF]||0}%`);
    G.currentFormation=newF;
  }
  G.formation=newF;G.slots={};renderFormation();renderFormationFamiliarity();
}
function assignSlot(idx,pos){
  if(pendingLineupPlayerId){assignPlayerToSlot(pendingLineupPlayerId,idx,pos);return;}
  const eligible=G.squad.filter(p=>{
    return isPosCompatible(p,pos);
  });
  const used=new Set(Object.values(G.slots));
  const free=eligible.filter(p=>!used.has(p.id));
  if(!free.length){notify('ไม่มีนักเตะว่าง!','red');return;}
  const best=free.sort((a,b)=>b.ca-a.ca)[0];
  G.slots[idx]=best.id;renderFormation();saveGame();notify('✅ '+best.name+' → '+pos);
}

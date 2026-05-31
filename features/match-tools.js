// Season fixtures, match history, and substitutions during live matches.
(function(){
  const {byId,esc,ensureState}=SuperkickExperience;
  let selectedSubOut='';
  function inject(){
    const gameUi=byId('game-ui'),notif=byId('notif');
    const pages=document.createElement('div');
    pages.innerHTML=`
      <div id="pg-fixtures" class="pg"><div class="card"><div class="ct">ตารางแข่งจนจบฤดูกาล</div><div id="fixtures-list"></div></div></div>
      <div id="pg-history" class="pg"><div class="card"><div class="ct">ประวัติการแข่งขัน</div><div id="match-history-list"></div></div></div>`;
    [...pages.children].forEach(page=>gameUi.insertBefore(page,notif));
    byId('btn-pm')?.insertAdjacentHTML('afterend','<button class="btn bbl" id="btn-sub" onclick="openSubstitutionPanel()" disabled>เปลี่ยนตัว</button>');
    document.body.insertAdjacentHTML('beforeend',`
      <div id="sub-modal" class="feature-modal"><div class="feature-panel">
        <div class="fbtw"><div class="ct">เปลี่ยนตัวระหว่างแข่ง</div><button class="mc" onclick="closeSubstitutionPanel()">x</button></div>
        <div id="substitution-content"></div>
      </div></div>`);
  }
  function ensureSeasonFixtures(){
    ensureState();
    if(G.seasonFixtures.filter(f=>f.competition==='league').length>=38&&G.seasonFixtures[0]?.season===G.season)return;
    const opponents=getLeagueTeams(G.league).filter(name=>name!==G.teamName);
    const domesticWeeks=[6,12,20,28,35],continentalWeeks=[8,14,22,30,36];
    G.seasonFixtures=Array.from({length:38},(_,index)=>({
      week:index+1,season:G.season,competition:'league',label:'ลีก',opponent:opponents[index%opponents.length],home:index%2===0,
    })).flatMap(f=>{
      const rows=[];
      if(domesticWeeks.includes(f.week))rows.push({week:f.week,season:G.season,competition:'domestic',label:'FA Cup',opponent:'รอจับสลาก',home:true});
      if(G.championsQualified&&continentalWeeks.includes(f.week))rows.push({week:f.week,season:G.season,competition:'continental',label:'Champions Cup',opponent:'รอจับสลาก',home:f.week%2===0});
      rows.push(f);
      return rows;
    });
  }
  window.renderFixtures=()=>{
    ensureSeasonFixtures();
    const el=byId('fixtures-list');if(!el)return;
    el.innerHTML=G.seasonFixtures.map(f=>`
      <div class="fixture-row ${f.week===G.week?'current':''}">
        <span>${f.label==='ลีก'?'W'+f.week:f.label}</span><span>${f.home?'สนามเหย้า':'เยือน'} vs ${esc(f.opponent)}</span><span>${f.competition!=='league'?'บอลถ้วย':f.week<G.week?'เล่นแล้ว':f.week===G.week?'นัดถัดไป':'รอแข่ง'}</span>
      </div>`).join('');
  };
  window.renderMatchHistoryPage=()=>{
    const el=byId('match-history-list');if(!el)return;
    el.innerHTML=(G.matchHistory||[]).slice().reverse().map(m=>`
      <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
        <span class="tm">S${m.season} ${esc(m.competition||'ลีก')} W${m.week}</span><span>${esc(G.teamName)} ${m.myG} - ${m.oppG} ${esc(m.opponent)}</span><span class="${m.result==='win'?'tgr':m.result==='loss'?'tr':'tg'}">${m.result}</span>
      </div>`).join('')||'<div class="tm">ยังไม่มีประวัติการแข่งขัน</div>';
  };
  window.openSubstitutionPanel=()=>{
    if(!G.matchRunning){notify('เปลี่ยนตัวได้ระหว่างการแข่งขันเท่านั้น','red');return;}
    selectedSubOut='';renderSubstitutionPanel();byId('sub-modal').classList.add('open');
  };
  window.closeSubstitutionPanel=()=>byId('sub-modal').classList.remove('open');
  window.selectSubOut=id=>{selectedSubOut=id;renderSubstitutionPanel();};
  window.performMatchSubstitution=inId=>{
    if(!selectedSubOut)return;
    if((G.matchSubsUsed||0)>=5){notify('ใช้โควตาเปลี่ยนตัวครบ 5 คนแล้ว','red');return;}
    const out=G.squad.find(p=>p.id===selectedSubOut),incoming=G.squad.find(p=>p.id===inId);
    const slot=Object.keys(G.slots||{}).find(key=>G.slots[key]===selectedSubOut);
    const expected=(FORMATIONS[G.formation]||FORMATIONS['433'])[Number(slot)]?.p;
    if(!out||!incoming||slot===undefined)return;
    if(incoming.injured||incoming.suspendedMatches>0){notify('นักเตะคนนี้ยังลงสนามไม่ได้','red');return;}
    if(!isPosCompatible(incoming,expected)){notify(`${incoming.name} ไม่เหมาะกับตำแหน่ง ${expected}`,'red');return;}
    G.slots[slot]=incoming.id;G.matchSubsUsed=(G.matchSubsUsed||0)+1;
    addEv(`เปลี่ยนตัว ${out.name} ออก · ${incoming.name} ลง (${G.minute}')`,'save');
    notify(`เปลี่ยนตัว ${incoming.name} ลงสนามแล้ว`,'blue');
    renderMatchDashboard();renderSubstitutionPanel();
  };
  function renderSubstitutionPanel(){
    const lineup=getLineupPlayers(),used=new Set(lineup.map(p=>p.id));
    const bench=G.squad.filter(p=>!used.has(p.id)&&!p.injured&&!(p.suspendedMatches>0));
    byId('substitution-content').innerHTML=`
      <div class="tm mbm">เลือกตัวจริงที่จะออก แล้วเลือกตัวสำรองที่จะลง · ใช้แล้ว ${G.matchSubsUsed||0}/5</div>
      <div class="sub-grid"><div><div class="ct">ตัวจริง</div>${lineup.map(p=>`<button class="sub-player ${selectedSubOut===p.id?'selected':''}" onclick="selectSubOut('${p.id}')"><span>${esc(p.name)} · ${p.pos}</span><span>${p.ovr}</span></button>`).join('')}</div>
      <div><div class="ct">ตัวสำรอง</div>${bench.map(p=>`<button class="sub-player" onclick="performMatchSubstitution('${p.id}')"><span>${esc(p.name)} · ${p.pos}</span><span>${p.ovr}</span></button>`).join('')||'<div class="tm">ไม่มีตัวสำรองพร้อมลง</div>'}</div></div>`;
  }
  window.SuperkickMatchTools={inject,ensureSeasonFixtures};
})();

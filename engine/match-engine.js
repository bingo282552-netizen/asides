// ===== MATCH ENGINE v3 =====
let matchTimer=null;
function getPendingMatchContext(){
  return G.pendingCupMatch||{type:'league',label:'ลีก',opponent:getNextLeagueOpponent()?.name};
}
function cupOpponent(){
  const names=(G.aiClubs||[]).map(c=>c.name).filter(n=>n!==G.teamName);
  return names[rnd(0,Math.max(0,names.length-1))]||'Cup Challenger';
}
function scheduleCupAfterLeagueWeek(){
  if(G.pendingCupMatch)return;
  const domesticWeeks=[6,12,20,28,35];
  const continentalWeeks=[8,14,22,30,36];
  if(G.cupRuns?.continental?.alive&&continentalWeeks.includes(G.week)){
    G.pendingCupMatch={type:'continental',label:'Champions Cup',opponent:cupOpponent()};return;
  }
  if(G.cupRuns?.domestic?.alive&&domesticWeeks.includes(G.week)){
    G.pendingCupMatch={type:'domestic',label:'FA Cup',opponent:cupOpponent()};
  }
}
function resolveCupMatch(result){
  const type=G.matchCompetition;
  const run=G.cupRuns?.[type];if(!run)return result;
  let won=result==='win';
  if(result==='draw'){
    won=Math.random()<.5;
    addEv(`🥅 ดวลจุดโทษ: ${won?G.teamName:G.oppName} ผ่านเข้ารอบ`,'goal');
    result=won?'win':'loss';
  }
  if(!won){run.alive=false;notify(`ตกรอบ ${G.matchCompetitionLabel}`,'red');return result;}
  run.round=(run.round||1)+1;
  const finalRound=type==='continental'?6:5;
  if(run.round>finalRound){
    run.alive=false;G.trophies[type==='continental'?'champions':'cup']++;
    notify(`🏆 แชมป์ ${G.matchCompetitionLabel}!`,'gold');
  }else notify(`✅ ผ่านเข้ารอบ ${G.matchCompetitionLabel} รอบ ${run.round}`,'green');
  return result;
}
function startMatch(){
  ensureGameDefaults();
  if(G.matchRunning){notify('กำลังแข่งอยู่!','red');return;}
  if(G.squad.filter(p=>!p.injured&&!(p.suspendedMatches>0)).length<11){notify('ทีมไม่ครบ 11 คน!','red');return;}
  if(getLineupPlayers().length<11){notify('ต้องจัดตัวจริงให้ครบ 11 คนก่อนเริ่มนัด!','red');goPage('tactics');return;}
  G.canChangeLeague=false;
  G.matchSubsUsed=0;
  backfillLeagueRatings();
  catchUpAILeagueTable();
  const context=getPendingMatchContext();
  G.matchCompetition=context.type;G.matchCompetitionLabel=context.label;
  const leagueOpponent=getNextLeagueOpponent();
  const opps=G.leagueTable.filter(t=>!t.isMe).map(t=>t.name);
  G.oppName=context.opponent||leagueOpponent?.name||opps[rnd(0,opps.length-1)];
  // Check for rivalry
  if(G.rivalTeam&&opps.includes(G.rivalTeam)&&Math.random()<0.2){G.oppName=G.rivalTeam;notify(`⚔️ ดาร์บี้แมตช์! vs ${G.rivalTeam}!`,'red');}
  const oppClub=getAIClubByName(G.oppName);
  G.oppXI=oppClub?pickAIStartingXI(oppClub):[];
  // Roll weather and referee for this match
  G.matchWeather=WEATHER_LIST[rnd(0,WEATHER_LIST.length-1)].id;
  G.matchReferee=REFEREES[rnd(0,REFEREES.length-1)].style;
  const wInfo=WEATHER_LIST.find(x=>x.id===G.matchWeather)||WEATHER_LIST[0];
  const rInfo=REFEREES.find(x=>x.style===G.matchReferee)||REFEREES[1];
  G.myG=0;G.oppG=0;G.minute=0;G.matchShots=[0,0];G.matchPoss=50;
  G.halfStats={first:{myG:0,oppG:0},second:{myG:0,oppG:0}};
  G.matchPerf={momentum:[],report:''};
  G.matchMaxMinute=90;G.extraTimePlayed=false;G.pendingPenalty=false;
  G.matchRunning=true;G.matchPaused=false;
  G.matchGoalScorers=[];
  ['m-hn','m-an'].forEach((id,i)=>document.getElementById(id).textContent=i===0?G.teamName:G.oppName);
  ['m-hs','m-as'].forEach(id=>document.getElementById(id).textContent='0');
  document.getElementById('m-min').textContent='⏱ 0\'';
  document.getElementById('m-half').textContent='ครึ่งแรก';
  document.getElementById('m-events').innerHTML='';
  document.getElementById('btn-sm').disabled=true;
  document.getElementById('btn-pm').disabled=false;
  if(document.getElementById('btn-sub'))document.getElementById('btn-sub').disabled=false;
  document.getElementById('m-round').textContent=G.matchCompetition==='league'?`ลีก นัดที่ ${G.week}`:`${G.matchCompetitionLabel} · รอบ ${G.cupRuns[G.matchCompetition]?.round||1}`;
  document.getElementById('m-prog').style.width='0%';
  document.getElementById('m-status').textContent=`กำลังแข่ง... ${wInfo.label} · กรรมการ: ${rInfo.name} (${rInfo.label})`;
  document.getElementById('m-ratings').innerHTML='';
  const myStr=calcTeamStrength();
  const rawOppOVR=G.oppXI.length?calcAIClubStrength(oppClub,G.oppXI):(G.leagueTable.find(t=>t.name===G.oppName)?.rating||getLeagueClubRating(G.oppName));
  const adaptiveBoost=clamp(Math.floor((G.clubStats.won||0)/4)-Math.floor((G.clubStats.lost||0)/5),0,4);
  const maxAIAdvantage=(window.SUPERKICK_FEATURE_CONFIG?.clubs?.aiMaxAdvantage??4)+adaptiveBoost;
  const oppOVR=Math.round(clamp(rawOppOVR,myStr.total-2,myStr.total+maxAIAdvantage));
  G.matchRawOpponentStrength=rawOppOVR;G.matchOpponentStrength=oppOVR;
  const famBonus=getFormFam()/1000;
  const chemBonus=(calcChemistry()-70)/1000;
  const myAdv=(myStr.total-oppOVR)/100;
  const wMod=getWeatherMatchMod();
  const cardMult=getRefereeCardMult();
  const speed=parseInt(document.getElementById('m-speed').value)||600;
  const tempGoalScorers={};
  renderMatchDashboard(myStr,oppOVR);
  setTimeout(()=>document.getElementById('mp-pitch')?.scrollIntoView({behavior:'smooth',block:'center'}),80);
  if(window.startStadiumAmbience)startStadiumAmbience();
  matchTimer=setInterval(()=>{
    if(G.matchPaused)return;
    G.minute++;
    document.getElementById('m-prog').style.width=(G.minute/G.matchMaxMinute*100)+'%';
    document.getElementById('m-min').textContent='⏱ '+G.minute+'\'';
    if(G.minute===45){openHalfTimeAdjustments();return;}
    if(G.minute===46)document.getElementById('m-half').textContent='ครึ่งหลัง';
    if(G.minute===91)document.getElementById('m-half').textContent='ต่อเวลา';
    if(G.minute%5===0)renderMatchDashboard(myStr,oppOVR);
    if(G.minute%rnd(6,12)===0){
      const livePlan=getTacticalPlan();
      const isAtt=Math.random()<0.5+myAdv+livePlan.attBonus+famBonus+chemBonus;
      if(isAtt){
        G.matchShots[0]++;
        // ATTACK ENGINE: shooter stat vs opp defense
        const lineup=getLineupPlayerPool();
        const fwd=lineup.filter(p=>['ST','LW','RW'].includes(p.pos)&&!p.injured).sort((a,b)=>b.stats.SHO-a.stats.SHO)[0]||lineup[0];
        const shooterQuality=(fwd?fwd.stats.SHO:70)/99;
        const defQuality=0.55;
        if(Math.random()<.028){openPenaltyChoice();return;}
        const goalChance=0.15+myAdv*0.4+livePlan.attBonus+(shooterQuality-defQuality)*0.4+wMod.att;
        if(Math.random()<goalChance){
          G.myG++;
          const scorer=G.squad.filter(p=>['ST','LW','RW','CAM'].includes(p.pos)&&!p.injured).sort((a,b)=>b.stats.SHO-a.stats.SHO)[0]||G.squad.filter(p=>!p.injured)[0];
          if(scorer){
            scorer.goals++;
            recordStat('topScorers',scorer.id,{...scorer,club:G.teamName},'goals');
            tempGoalScorers[scorer.id]=(tempGoalScorers[scorer.id]||0)+1;
          }
          const mid=G.squad.filter(p=>['CAM','CM','LW','RW'].includes(p.pos)&&p.id!==scorer?.id&&!p.injured)[0];
          if(mid){mid.assists++;recordStat('topAssists',mid.id,{...mid,club:G.teamName},'assists');}
          addEv(`⚽ ${scorer?.name||'นักเตะ'} ทำประตู! ${mid?'(🎯 '+mid.name+')':''}  (${G.minute}\')`,'goal');
          if(window.playGoalSound)playGoalSound();
          document.getElementById('m-hs').textContent=G.myG;
          if(G.minute<=45)G.halfStats.first.myG++;else G.halfStats.second.myG++;
        }else{addEv(`💨 ยิงพลาด — ${fwd?.name||'ST'} (${G.minute}\')`,'miss');}
      }else{
        G.matchShots[1]++;
        const gk=getLineupPlayerPool().find(p=>p.pos==='GK'&&!p.injured);
        const aiShooter=pickAIMatchPlayer(['ST','LW','RW','CAM'],'SHO');
        // DEFENSE ENGINE: opp attack vs GK quality
        const gkQuality=gk?(gk.stats.REF+gk.stats.HAN)/198:0.5;
        const oppAttQuality=(aiShooter?.stats?.SHO||oppOVR)/99;
        const concedeChance=0.18-myAdv*0.4-livePlan.defBonus-(gkQuality-oppAttQuality)*0.3+wMod.def;
        if(Math.random()<concedeChance){
          G.oppG++;
          const aiAssist=pickAIMatchPlayer(['CAM','CM','LW','RW'],'PAS');
          registerAIGoal(aiShooter,aiAssist);
          addEv(`😰 ${aiShooter?.name||G.oppName} ทำประตูให้ ${G.oppName}! ${aiAssist&&aiAssist.id!==aiShooter?.id?'(🎯 '+aiAssist.name+')':''} (${G.minute}\')`,'goal');
          if(window.playGoalSound)playGoalSound();
          document.getElementById('m-as').textContent=G.oppG;
          if(G.minute<=45)G.halfStats.first.oppG++;else G.halfStats.second.oppG++;
        }else{addEv(`🧤 ${gk?.name||'GK'} เซฟลูกยิงของ ${aiShooter?.name||G.oppName}! (${G.minute}\')`,'save');}
      }
      // Yellow card
      if(Math.random()<(0.035+getTacticalPlan().risk)*cardMult){
        const cardPool=G.squad.filter(p=>!p.injured&&!(p.suspendedMatches>0));
        const dp=cardPool[rnd(0,Math.max(0,cardPool.length-1))];
        if(dp){
          dp.yellow++;
          recordStat('yellowCards',dp.id,{...dp,club:G.teamName},'cards');
          if(dp.yellow>=2&&Math.random()<0.3){
            const banRange=window.SUPERKICK_FEATURE_CONFIG?.players?.redCardBanRange||[1,2];
            dp.red++;dp.suspendedMatches=rnd(banRange[0],banRange[1]);dp.suspensionJustHappened=true;
            addEv(`🟥 ${dp.name} ใบแดง! แบน ${dp.suspendedMatches} นัด (${G.minute}\')`,'red');
          }
          else addEv(`🟨 ${dp.name} ใบเหลือง (${G.minute}\')`,'yellow');
        }
      }
      // Injury with risk engine
      if(Math.random()<0.012){
        const ip=G.squad.filter(p=>!p.injured);
        if(ip.length){
          const weighted=ip.map(p=>({p,risk:calcInjuryRisk(p)}));
          weighted.sort(()=>Math.random()-0.5);
          const vp=weighted[0].p;
          if(Math.random()<weighted[0].risk*5){
            vp.injured=true;
            const injTypes=window.SUPERKICK_FEATURE_CONFIG?.players?.injuryTypes||[
              {name:'กล้ามเนื้อตึง',missedMatches:2},{name:'เอ็นเข่าบาดเจ็บ',missedMatches:5},
            ];
            const injType=injTypes[rnd(0,injTypes.length-1)];
            vp.injuryType=injType.name;
            const docReduction=1-(G.staff.doctor-1)*0.1;
            vp.injuryMatches=Math.max(1,Math.round(injType.missedMatches*docReduction));
            vp.injuryDays=vp.injuryMatches*7;vp.injuryJustHappened=true;
            addEv(`🏥 ${vp.name} บาดเจ็บ ${injType.name}! พัก ${vp.injuryMatches} นัด (${G.minute}\')`,'injury');
          }
        }
      }
      updateLiveStats(myStr,oppOVR);
    }
    if(G.minute>=G.matchMaxMinute){
      if(G.minute===90&&G.myG===G.oppG){
        G.matchMaxMinute=120;G.extraTimePlayed=true;
        document.getElementById('m-half').textContent='ต่อเวลา';
        addEv('⏱ เสมอในเวลา 90 นาที เล่นต่อเวลาถึง 120 นาที','save');
      }else{clearInterval(matchTimer);endMatch(myStr,oppOVR);}
    }
  },speed);
}
function openHalfTimeAdjustments(){
  G.matchPaused=true;
  document.getElementById('m-half').textContent='พักครึ่ง';
  document.getElementById('halftime-content').innerHTML=`
    <div class="mdt">พักครึ่ง · แก้เกม</div>
    <div class="tm mbm">${G.teamName} ${G.myG} - ${G.oppG} ${G.oppName}</div>
    <div class="mb"><label class="tm">สไตล์ครึ่งหลัง</label>
      <select id="ht-style"><option value="balanced">สมดุล</option><option value="attack">บุก</option><option value="defend">รับ</option><option value="counter">ตีโต้</option><option value="press">กดดัน</option><option value="possession">ครองบอล</option></select>
    </div>
    <div class="fbtw mb"><span class="tm">ความเร็วเกม</span><input id="ht-tempo" type="range" min="1" max="10" value="${G.tacticPlan.tempo}" style="width:55%;"></div>
    <div class="fbtw mb"><span class="tm">แนวรับ</span><input id="ht-defline" type="range" min="1" max="10" value="${G.tacticPlan.defline}" style="width:55%;"></div>
    <div class="fb gap"><button class="btn bg" onclick="applyHalfTimeAdjustments()">เล่นครึ่งหลัง</button><button class="btn bbl" onclick="openSubstitutionPanel()">เปลี่ยนตัว</button></div>`;
  const style=document.getElementById('ht-style');if(style)style.value=G.tacStyle||'balanced';
  openM('modal-halftime');
}
function applyHalfTimeAdjustments(){
  G.tacStyle=document.getElementById('ht-style')?.value||G.tacStyle;
  G.tacticPlan.tempo=parseInt(document.getElementById('ht-tempo')?.value)||G.tacticPlan.tempo;
  G.tacticPlan.defline=parseInt(document.getElementById('ht-defline')?.value)||G.tacticPlan.defline;
  closeM('modal-halftime');syncTacticControls();G.matchPaused=false;
  document.getElementById('m-half').textContent='ครึ่งหลัง';
  addEv('📋 ปรับแท็กติกครึ่งหลังแล้ว','save');
}
function openPenaltyChoice(){
  G.matchPaused=true;G.pendingPenalty=true;
  const lineup=getLineupPlayerPool().filter(p=>!p.injured&&!(p.suspendedMatches>0)).sort((a,b)=>(b.stats?.SHO||0)-(a.stats?.SHO||0));
  const preferred=G.setPieceTakers?.penalty;
  document.getElementById('penalty-content').innerHTML=`
    <div class="mdt">จุดโทษ</div><div class="tm mbm">เลือกนักเตะที่จะยิง</div>
    ${lineup.map(p=>`<button class="sub-player" onclick="takePenalty('${p.id}')"><span>${p.id===preferred?'⭐ ':''}${p.name} · ${p.pos}</span><span>SHO ${p.stats?.SHO||60}</span></button>`).join('')}`;
  openM('modal-penalty');
}
function takePenalty(id){
  if(!G.pendingPenalty)return;
  const p=G.squad.find(x=>x.id===id)||getLineupPlayerPool()[0];if(!p)return;
  const scored=Math.random()<clamp(.55+(p.stats?.SHO||60)/250,.58,.94);
  G.pendingPenalty=false;closeM('modal-penalty');
  if(scored){
    G.myG++;p.goals=(p.goals||0)+1;recordStat('topScorers',p.id,{...p,club:G.teamName},'goals');
    document.getElementById('m-hs').textContent=G.myG;
    if(G.minute<=45)G.halfStats.first.myG++;else G.halfStats.second.myG++;
    addEv(`⚽ ${p.name} ยิงจุดโทษเข้า! (${G.minute}')`,'goal');
    if(window.playGoalSound)playGoalSound();
  }else addEv(`❌ ${p.name} ยิงจุดโทษพลาด! (${G.minute}')`,'miss');
  G.matchPaused=false;renderMatchDashboard();
}
function rndP(...posList){
  const lineup=getLineupPlayerPool();
  const opts=lineup.filter(p=>posList.includes(p.pos)&&!p.injured);
  const pool=opts.length?opts:lineup;
  return pool.length?pool[rnd(0,pool.length-1)].name:'นักเตะ';
}
function addEv(msg,type){
  const el=document.createElement('div');
  el.className=`mev ev-${type}`;
  el.innerHTML=`<span class="evt">${G.minute}'</span><span>${msg}</span>`;
  const c=document.getElementById('m-events');c.insertBefore(el,c.firstChild);
}
function togglePause(){G.matchPaused=!G.matchPaused;document.getElementById('btn-pm').textContent=G.matchPaused?'▶ ต่อ':'⏸ หยุด';}
function updateLiveStats(myStr,oppStr){
  const p=clamp(Math.round(50+(G.myG-G.oppG)*4+rnd(-5,5)),30,70);
  G.matchPoss=p;
  if(G.matchPerf?.momentum){
    const swing=clamp((G.matchShots[0]-G.matchShots[1])*8+(G.myG-G.oppG)*18+rnd(-14,14),-45,45);
    G.matchPerf.momentum.push(swing);
    G.matchPerf.momentum=G.matchPerf.momentum.slice(-18);
  }
  document.getElementById('m-live').innerHTML=`
    <div class="fbtw mb"><span>ความแข็งแกร่งทีม</span><span>${myStr.total} vs ${oppStr}</span></div>
    <div class="fbtw mb"><span>ครองบอล</span><span>${p}% - ${100-p}%</span></div>
    <div class="fbtw mb"><span>ชู้ต</span><span>${G.matchShots[0]} - ${G.matchShots[1]}</span></div>
    <div class="fbtw mb"><span>ครึ่งแรก</span><span>${G.halfStats.first.myG} - ${G.halfStats.first.oppG}</span></div>
    <div class="fbtw"><span>ครึ่งหลัง</span><span>${G.halfStats.second.myG} - ${G.halfStats.second.oppG}</span></div>`;
  renderMatchDashboard(myStr,oppStr);
}
function renderMatchDashboard(myStr=null,oppStr=null,finalResult=''){
  const pitch=document.getElementById('mp-pitch');
  if(!pitch)return;
  const slots=FORMATIONS[G.formation]||FORMATIONS['433'];
  const home=slots.map((sl,i)=>{
    const p=G.slots?.[i]?G.squad.find(x=>x.id===G.slots[i]):null;
    const name=(p?.name||sl.p).split(' ').slice(-1)[0];
    const rating=G.matchRatings?.[p?.id]?.rating||p?.rating||6.5;
    const color=G.teamColor||'var(--blue)';
    const wobble=G.matchRunning?Math.sin((G.minute+i*3)*.33)*2.5:0;
    return `<div class="mp-dot mp-home${G.matchRunning?' live':''}" style="left:${clamp(sl.x+wobble,5,95)}%;top:${clamp(sl.y+wobble/2,5,95)}%;"><div class="mp-ball" style="background:${color};">${sl.p}</div><div class="mp-name">${name}</div><div class="mp-rating">★${Number(rating).toFixed(1)}</div></div>`;
  }).join('');
  const awayShape=[{p:'GK',x:50,y:8},{p:'CB',x:35,y:22},{p:'CB',x:65,y:22},{p:'LB',x:16,y:25},{p:'RB',x:84,y:25},{p:'CM',x:28,y:43},{p:'CM',x:50,y:46},{p:'CM',x:72,y:43},{p:'LW',x:20,y:70},{p:'ST',x:50,y:80},{p:'RW',x:80,y:70}];
  const awayEntries=G.oppXI?.length?G.oppXI.map(x=>({slot:{p:x.slot.p,x:x.slot.x,y:100-x.slot.y},p:x.p})):awayShape.map(slot=>({slot,p:null}));
  const away=awayEntries.map((x,i)=>{
    const name=(x.p?.name||G.oppName||'Opponent').split(' ').slice(-1)[0];
    const wobble=G.matchRunning?Math.cos((G.minute+i*2)*.31)*2.5:0;
    return `<div class="mp-dot mp-away${G.matchRunning?' live':''}" style="left:${clamp(x.slot.x+wobble,5,95)}%;top:${clamp(x.slot.y-wobble/2,5,95)}%;opacity:.78;"><div class="mp-ball">${x.slot.p}</div><div class="mp-name">${name}</div>${x.p?`<div class="mp-rating">OVR ${x.p.ovr}</div>`:''}</div>`;
  }).join('');
  pitch.innerHTML=home+away;
  const mom=document.getElementById('mp-momentum');
  const m=G.matchPerf?.momentum?.length?G.matchPerf.momentum:[0,0,0,0,0,0];
  if(mom)mom.innerHTML=m.map(v=>`<div class="mp-bar ${v<0?'neg':''}" style="height:${Math.max(8,Math.abs(v)+18)}%;"></div>`).join('');
  const analysis=document.getElementById('mp-analysis');
  if(analysis){
    const strength=myStr?.total||calcTeamStrength().total;
    const opponent=oppStr||G.leagueTable.find(t=>t.name===G.oppName)?.rating||'-';
    const trend=(G.matchShots[0]-G.matchShots[1])>=2?'เรากดดันได้ดี':(G.matchShots[1]-G.matchShots[0])>=2?'โดนบุกเยอะ ควรลดความเสี่ยง':'เกมค่อนข้างสูสี';
    analysis.innerHTML=`<span class="mp-chip">⏱ ${G.minute||0}'</span><span class="mp-chip">💪 ${strength} vs ${opponent}</span><span class="mp-chip">🎯 ยิง ${G.matchShots?.[0]||0}-${G.matchShots?.[1]||0}</span><div style="margin-top:6px;">${trend} · ครองบอล ${G.matchPoss||50}%</div>`;
  }
  const report=document.getElementById('mp-report');
  if(report){
    if(finalResult)report.textContent=finalResult;
    else if(G.matchRunning)report.textContent=`Live: ${G.teamName} ${G.myG||0}-${G.oppG||0} ${G.oppName||'Opponent'}`;
    else report.textContent=G.clubStats.played?`ล่าสุด: ${G.teamName} ${G.myG||0}-${G.oppG||0} ${G.oppName||'Opponent'}`:'ยังไม่มีรายงาน';
  }
  const opponentXI=document.getElementById('mp-opponent-xi');
  if(opponentXI){
    opponentXI.innerHTML=G.oppXI?.length?G.oppXI.map(x=>`<span class="mp-chip">${x.slot.p} ${x.p.name} · ${x.p.ovr}</span>`).join(''):'เริ่มแข่งเพื่อดูรายชื่อนักเตะ AI';
  }
}
function endMatch(myStr,oppStr){
  G.matchRunning=false;
  document.getElementById('btn-sm').disabled=false;document.getElementById('btn-pm').disabled=true;
  if(document.getElementById('btn-sub'))document.getElementById('btn-sub').disabled=true;
  if(window.stopStadiumAmbience)stopStadiumAmbience();
  document.getElementById('m-half').textContent='จบเกม';
  const me=G.leagueTable.find(t=>t.isMe);
  const opp=G.leagueTable.find(t=>t.name===G.oppName)||getNextLeagueOpponent();
  let result='draw';
  let income=0;
  const leagueMatch=G.matchCompetition==='league';
  if(me){
    if(leagueMatch)applyLeagueResult(me,opp,G.myG,G.oppG);
    const sl=SLVLS[G.stadiumLevel-1];
    if(G.myG>G.oppG){income=sl.income;result='win';notify('🏆 ชนะ! +3 คะแนน + '+fmt(income),'green');}
    else if(G.myG===G.oppG){income=Math.round(sl.income*.5);result='draw';notify('🤝 เสมอ +1 คะแนน');}
    else{income=Math.round(sl.income*.3);result='loss';notify('😔 แพ้ครั้งนี้ สู้ต่อ!','red');}
    // Bonus from scorer
    getLineupPlayers().filter(p=>p.goals>0&&p.goalBonus>0).forEach(p=>income+=p.goalBonus*(p.goals));
    if(G.myG===0&&G.oppG===0){const gk=getLineupPlayers().find(p=>p.pos==='GK');if(gk){gk.cleanSheets=(gk.cleanSheets||0)+1;income+=gk.cleanSheetBonus||0;}}
    income+=G.sponsorIncome+G.merchandiseRevenue;
    G.money+=income;G.clubStats.played++;G.clubStats.totalRevenue+=income;
    if(result==='win')G.clubStats.won++;else if(result==='draw')G.clubStats.drawn++;else G.clubStats.lost++;
    G.clubStats.goalsFor+=G.myG;G.clubStats.goalsAgainst+=G.oppG;
    G.seasonGoalsFor+=G.myG;G.seasonGoalsAgainst+=G.oppG;
    // Fans change
    if(result==='win')G.fans=Math.round(G.fans*1.02+rnd(100,500));
    else if(result==='loss')G.fans=Math.round(G.fans*0.99);
    G.fans=clamp(G.fans,5000,SLVLS[G.stadiumLevel-1].cap*0.95);
  }
  // Post-match player updates
  // Account for recovery between weekly matches. Starters tire gradually,
  // while rotated players recover enough to make squad management useful.
  const weeklyRecovery=4;
  const fitnessReduction=Math.min((G.staff.fitness-1)*0.2,0.8);
  const fitCost=Math.max(1,Math.round(rnd(5,9)*(1-fitnessReduction))-weeklyRecovery);
  const lineupPlayers=getLineupPlayers();
  const lineupIds=new Set(lineupPlayers.map(p=>p.id));
  lineupPlayers.forEach(p=>{
    p.apps++;
    p.fitness=clamp(p.fitness-fitCost,20,100);
    const moraleChange=result==='win'?rnd(2,5):result==='draw'?rnd(-1,1):rnd(-5,-2);
    const pe=PERSONALITY_EFFECTS[p.personality]||{moraleMult:1.0};
    p.morale=clamp(p.morale+moraleChange,20,100);
    p.sharpness=clamp((p.sharpness||60)+5,0,100);
    calcGrowth(p);
    updateHOF(p);
  });
  getAIMatchPlayers().forEach(p=>p.apps=(p.apps||0)+1);
  G.squad.forEach(p=>{
    if(!lineupIds.has(p.id))p.fitness=clamp(p.fitness+6,20,100);
    if(p.injured){
      if(p.injuryJustHappened)p.injuryJustHappened=false;
      else p.injuryMatches=Math.max(0,(p.injuryMatches||Math.ceil((p.injuryDays||0)/7))-1);
      p.injuryDays=(p.injuryMatches||0)*7;
      if(p.injuryMatches<=0){p.injured=false;p.injuryType='';p.injuryDays=0;}
    }
    if(p.suspendedMatches>0){
      if(p.suspensionJustHappened)p.suspensionJustHappened=false;
      else p.suspendedMatches=Math.max(0,p.suspendedMatches-1);
    }
    if(G.week%4===0)p.contract=Math.max(0,p.contract-(1/12));
  });
  calcMatchRatings(result);
  improveFormFam();
  if(leagueMatch)simulateAILeagueRound(opp?.name);
  else result=resolveCupMatch(result);
  G.matchHistory=G.matchHistory||[];
  G.matchHistory.push({season:G.season,week:G.week,competition:G.matchCompetitionLabel||'ลีก',opponent:G.oppName,myG:G.myG,oppG:G.oppG,result});
  G.matchHistory=G.matchHistory.slice(-120);
  if(leagueMatch){G.week++;scheduleCupAfterLeagueWeek();}
  else G.pendingCupMatch=null;
  generateOnlineTransferOffers();
  if(window.simulateOnlineManagers)simulateOnlineManagers();
  if(window.generateWorldNews)generateWorldNews();
  checkSponsors();
  checkFFP();
  updateHUD();renderMiniTable();
  document.getElementById('m-status').textContent=`${G.matchCompetitionLabel||'ลีก'}: ${G.teamName} ${G.myG} - ${G.oppG} ${G.oppName}`;
  renderMatchDashboard(myStr,oppStr,`จบเกม: ${G.teamName} ${G.myG} - ${G.oppG} ${G.oppName} · ${result==='win'?'ชนะ':result==='draw'?'เสมอ':'แพ้'} · รายได้ ${fmt(income||0)}`);
  // Board evaluation every 10 games
  if(G.clubStats.played%10===0)evaluateBoard();
  // AI transfer after every 5 games
  if(G.clubStats.played%5===0)runAITransferSilent();
}
function renderMiniTable(){
  const s=[...G.leagueTable].sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga));
  document.getElementById('mini-tbl').innerHTML=s.slice(0,6).map((t,i)=>`
    <div class="fbtw" style="padding:3px 0;font-size:.78rem;border-bottom:1px solid var(--border);${t.isMe?'color:var(--gold);font-weight:700;':''}">
      <span>${i+1}. ${t.name.split(' ').pop()}</span><span class="tg">${t.pts}pts</span>
    </div>`).join('');
}

// ===== FFP CHECK =====
function checkFFP(){
  if(G.week%4!==0)return;
  const annualWages=G.squad.reduce((s,p)=>s+p.wage,0)*12;
  const annualRevenue=SLVLS[G.stadiumLevel-1].income*38+G.sponsorIncome*52+G.merchandiseRevenue*12+Math.max(G.money,0)*0.15;
  if(annualWages>annualRevenue*2.2){
    G.ffpWarnings++;
    if(G.ffpWarnings>=3){const fine=Math.round(annualWages*0.02);G.money-=fine;notify(`🚨 FFP ปรับ ${fmt(fine)}! ลดค่าเหนื่อย!`,'red');}
    else notify(`⚠️ FFP คำเตือน ${G.ffpWarnings}/3 — ค่าเหนื่อยสูงเกิน`,'red');
  }else if(G.ffpWarnings>0){G.ffpWarnings=Math.max(0,G.ffpWarnings-1);}
}

// ===== BOARD EVALUATION =====
function evaluateBoard(){
  const rank=[...G.leagueTable].sort((a,b)=>b.pts-a.pts).findIndex(t=>t.isMe)+1;
  const goals={top4:()=>rank<=4,top6:()=>rank<=6,win:()=>rank===1,youth:()=>G.youth.length>=5,financial:()=>G.money>0};
  if(!(goals[G.boardGoal]&&goals[G.boardGoal]())){
    G.boardWarnings++;
    if(G.boardWarnings>=3)notify('🚨 บอร์ดไม่พอใจ! คุณอาจโดนไล่ออก!','red');
    else notify(`⚠️ บอร์ดคำเตือน ${G.boardWarnings}/3 — ทำตามเป้าหมาย`,'red');
  }else{
    if(G.boardWarnings>0){G.boardWarnings--;notify('✅ บอร์ดพอใจผลงาน','green');}
  }
}

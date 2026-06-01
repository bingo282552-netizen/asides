// ===== LEGACY MODE =====
function renderLegacy(){
  const age=G.managerAge||35;
  const yearsManaging=G.season-1;
  document.getElementById('legacy-manager-card').innerHTML=`
    <div class="fbtw">
      <div class="fb gap" style="align-items:center;">
        <span style="font-size:2.5rem;">${G.managerAvatar||'🧑‍💼'}</span>
        <div>
          <div style="font-family:'Bebas Neue',cursive;font-size:1.5rem;color:var(--gold);">${G.managerName||'Manager'}</div>
          <div class="tm">อายุ ${age} · บริหารมา ${yearsManaging} ฤดูกาล</div>
          <div class="badge ${G.retired?'bg-red':'bg-green'}" style="margin-top:3px;">${G.retired?'รีไทร์แล้ว':'✅ ยังทำงานอยู่'}</div>
        </div>
      </div>
      <div style="text-align:right;"><div class="tg" style="font-size:.78rem;">⭐ ${G.repLabel}</div></div>
    </div>`;
  document.getElementById('legacy-stats').innerHTML=`
    <div class="fbtw mb"><span class="tm">นัดทั้งหมด</span><span>${G.clubStats.played}</span></div>
    <div class="fbtw mb"><span class="tm">ชนะ/เสมอ/แพ้</span><span>${G.clubStats.won}/${G.clubStats.drawn}/${G.clubStats.lost}</span></div>
    <div class="fbtw mb"><span class="tm">ชัยชนะ%</span><span class="tg">${G.clubStats.played>0?Math.round(G.clubStats.won/G.clubStats.played*100):0}%</span></div>
    <div class="fbtw mb"><span class="tm">รายได้รวม</span><span class="tgr">${fmt(G.clubStats.totalRevenue)}</span></div>
    <div class="fbtw"><span class="tm">ELO ออนไลน์</span><span class="tg">${G.rankedELO}</span></div>`;
  document.getElementById('legacy-trophies').innerHTML=`
    <div class="fbtw mb"><span>🏆 แชมป์ลีก</span><span class="tg">${G.trophies?.league||0}</span></div>
    <div class="fbtw mb"><span>🥇 แชมป์ถ้วย</span><span class="tg">${G.trophies?.cup||0}</span></div>
    <div class="fbtw"><span>🌍 Champions</span><span class="tg">${G.trophies?.champions||0}</span></div>`;
  document.getElementById('legacy-history').innerHTML=(G.legacySeasons||[]).length?
    G.legacySeasons.slice(-10).reverse().map(s=>`
      <div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.8rem;">
        <span class="tm">Season ${s.season}</span>
        <span>${s.team}</span>
        <span style="color:${s.rank<=4?'var(--green)':'var(--muted)'};">อันดับ ${s.rank}</span>
        <span class="tgr">${fmt(s.revenue)}</span>
      </div>`).join('')
    :'<div class="tm">ยังไม่มีประวัติ</div>';
}
function retireManager(){
  if(!confirm('ยืนยันการรีไทร์?'))return;
  G.retired=true;
  G.clubLegends.push({name:G.managerName||'Manager',face:G.managerAvatar||'🧑‍💼',nat:'👔',pos:'MGR',goals:G.clubStats.won,assists:G.clubStats.drawn,apps:G.clubStats.played,retireYear:G.season,isManager:true});
  notify(`👴 ${G.managerName} รีไทร์แล้ว! เข้า Hall of Fame!`,'gold');
  renderLegacy();
}
function passToProtege(){
  const name=prompt('ชื่อลูกศิษย์:','Young Manager');
  if(!name)return;
  G.managerName=name;G.managerAge=28;G.retired=false;G.season++;
  notify(`🤝 ส่งต่อทีมให้ ${name} แล้ว!`,'green');
  renderLegacy();
}

// ===== ENHANCED END MATCH + DYNAMIC POTENTIAL =====
function updateDynamicPotential(){
  G.squad.forEach(p=>{
    const apps=p.apps||0;
    const rating=p.rating||6.5;
    // ถ้าไม่ค่อยลงสนาม potential ลด
    if(apps<5&&p.potential>70){p.potential=Math.max(p.potential-rnd(0,3),60);}
    // ฟอร์มดีต่อเนื่อง potential เพิ่ม
    const recentRatings=p.formHistory||[];
    if(recentRatings.length>=3){
      const avgRecent=recentRatings.slice(-3).reduce((a,b)=>a+b,0)/3;
      if(avgRecent>=7.5&&p.potential<p.ca+15&&p.age<=p.peakAge){
        p.potential=Math.min(p.potential+rnd(0,2),99);
      }
    }
    p.potentialMin=Math.max((p.potentialMin||p.potential)-2,50);
    p.potentialMax=Math.min((p.potentialMax||p.potential)+2,99);
  });
}

// ===== END OF SEASON =====
function endSeason(){
  G.season++;
  G.managerAge=(G.managerAge||35)+1;
  const sorted=[...G.leagueTable].sort((a,b)=>b.pts-a.pts);
  const myRank=sorted.findIndex(t=>t.isMe)+1;
  G.championsQualified=myRank<=4;
  G.relegatedLastSeason=myRank>=Math.max(1,sorted.length-2);
  if(G.relegatedLastSeason){
    G.relegations=(G.relegations||0)+1;
    G.money=Math.max(0,G.money-250000);
    notify(`📉 จบอันดับ ${myRank}: ตกชั้นและถูกหักงบ 250K`,'red');
  }else if(G.championsQualified)notify('🌍 จบ Top 4: ได้สิทธิ์เล่น Champions Cup ฤดูกาลหน้า','green');
  // Save legacy
  G.legacySeasons.push({season:G.season-1,team:G.teamName,rank:myRank,revenue:G.clubStats.totalRevenue,won:G.clubStats.won});
  // Trophies
  if(myRank===1){G.trophies.league++;notify(`🏆 แชมป์ลีก Season ${G.season-1}!`,'gold');}
  // Owners no longer inject money, so changing owner cannot be used as a cash exploit.
  // DNA bonus
  const dna=CLUB_DNA_OPTIONS.find(d=>d.id===G.clubDNA);
  if(dna?.bonus?.youthGrowth){G.youth.forEach(p=>p.ca=Math.min(p.ca+(dna.bonus.youthGrowth||0),99));}
  // Season awards
  endSeasonAwards();
  // Dynamic potential
  updateDynamicPotential();
  // Wonderkid spawn each season
  if(Math.random()<0.5){
    const wk=genPlayer({age:rnd(15,18),base:rnd(50,65),potential:rnd(88,99),real:false});
    wk.isWonderkid=true;G.wonderkids.push(wk);
    notify(`🌟 Wonderkid ใหม่ปรากฎ! ${wk.name} POT${wk.potential}!`,'gold');
  }
  // Reset season stats
  G.topScorers={};G.topAssists={};G.yellowCards={};G.redCards={};
  G.squad.forEach(p=>{p.apps=0;p.goals=0;p.assists=0;p.yellow=0;p.red=0;p.formHistory=[];p.matchRatings=[];p.rating=6.5;});
  initLeagueTable();G.week=1;G.canChangeLeague=true;G.seasonFixtures=[];G.pendingCupMatch=null;
  G.cupRuns={domestic:{active:true,round:1,alive:true},continental:{active:G.championsQualified,round:1,alive:G.championsQualified}};
  updateHUD();
  notify(`📅 Season ${G.season} เริ่มต้นแล้ว! อันดับล่าสุด: #${myRank}`,'green');
  goPage('home');
}

// Add end season button to home
function addEndSeasonBtn(){
  const me=G.leagueTable.find(t=>t.isMe)||{};
  if(me.played>=leagueSeasonLength()){
    return `<button class="btn bg" style="width:100%;margin-top:.5rem;" onclick="endSeason()">📅 จบฤดูกาล Season ${G.season}</button>`;
  }
  return '';
}

// ===== BOOT =====
// initGame is now called from startNewGame() / quickStart()

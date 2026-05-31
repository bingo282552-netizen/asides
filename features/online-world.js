// Simulated online managers and transfer headlines for the shared game world.
(function(){
  const {config,byId,esc,ensureState}=SuperkickExperience;
  function inject(){
    byId('pg-online')?.insertAdjacentHTML('beforeend',`
      <div class="card"><div class="ct">AI Online Managers</div><div id="online-ai-summary" class="tm"></div><div id="online-ai-list"></div></div>`);
  }
  function seed(){
    ensureState();
    const count=config.clubs?.onlineManagerCount||100;
    while(G.onlineManagers.length<count){
      const n=G.onlineManagers.length+1;
      const prefixes=config.clubs?.onlinePrefixes||[];
      const prefix=prefixes[n%prefixes.length]||'Manager';
      G.onlineManagers.push({id:String(800000000+n),username:`${prefix.replace(/\s+/g,'')}_${n}`,team:`${prefix} FC`,elo:rnd(900,1750),played:0,wins:0});
    }
  }
  function render(){
    const summary=byId('online-ai-summary'),list=byId('online-ai-list');if(!summary||!list)return;
    const sorted=[...G.onlineManagers].sort((a,b)=>b.elo-a.elo);
    summary.textContent=`AI ออนไลน์ ${sorted.length} คนกำลังเล่นร่วมกันในโลกเกม · ตารางคะแนนอัปเดตทุกสัปดาห์`;
    list.innerHTML=sorted.slice(0,10).map((manager,index)=>`
      <div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.78rem;"><span>${index+1}. ${esc(manager.username)} · ${esc(manager.team)}</span><span class="tg">ELO ${manager.elo}</span></div>`).join('');
  }
  window.simulateOnlineManagers=()=>{
    seed();
    G.onlineManagers.forEach(manager=>{
      const won=Math.random()<.48;manager.played++;if(won)manager.wins++;
      manager.elo=Math.max(800,manager.elo+(won?rnd(5,18):-rnd(4,15)));
    });
    render();
  };
  window.generateWorldNews=()=>{
    ensureState();
    const clubs=config.clubs?.majorClubs||[];
    const first=FNAMES[rnd(0,FNAMES.length-1)],last=LNAMES[rnd(0,LNAMES.length-1)];
    const club=clubs[rnd(0,clubs.length-1)]||'Global XI';
    const price=rnd(3,95)*100000;
    G.worldNews.unshift({week:G.week,text:`ข่าวใหญ่: ${club} ปิดดีล ${first} ${last} ด้วยค่าตัว ${fmt(price)}`});
    G.worldNews=G.worldNews.slice(0,10);
  };
  function renderWorldNews(){
    const el=byId('news');if(!el)return;
    const activity=(G.aiActivityLog||[]).slice(0,4).map(text=>({week:G.week,text}));
    const news=[...(G.worldNews||[]),...activity].slice(0,8);
    el.innerHTML=news.map(item=>`<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.8rem;"><span class="tm">W${item.week}</span> ${esc(item.text)}</div>`).join('')||'<div class="tm">ยังไม่มีข่าวใหญ่</div>';
  }
  window.SuperkickOnlineWorld={inject,seed,render,renderWorldNews};
})();

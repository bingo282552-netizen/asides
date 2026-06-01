// ===== CONSTANTS =====
const {NATS,FACES,FNAMES,LNAMES,POS_LIST,PERSONALITIES,PERSONALITY_EFFECTS,TRAITS_POOL,TRAIT_BONUS}=SUPERKICK_PLAYER_CATALOG;
const {FORMATIONS}=SUPERKICK_TACTICS_CATALOG;
const {SLVLS,SPONSORS,STAFF_ROLES,STARTING_MONEY}=SUPERKICK_ECONOMY_CATALOG;
const {LEGENDS,AI_CLUBS}=SUPERKICK_CLUB_CATALOG;
const {REPUTATION_LEVELS,LEGACY_LEAGUES_DATA,LEAGUES_DATA}=SUPERKICK_LEAGUE_CATALOG;

// ===== GAME STATE =====
let G={
  economyVersion:2,money:STARTING_MONEY,fans:28000,week:1,league:'EPL',teamName:'FC Bangkok United',stadiumName:'Bangkok Arena',teamColor:'#f0b429',season:1,
  squad:[],youth:[],marketPlayers:[],
  formation:'433',tacStyle:'balanced',formationFamiliarity:{},currentFormation:'433',
  slots:{},
  leagueTable:[],topScorers:{},topAssists:{},yellowCards:{},redCards:{},playerRatings:{},
  stadiumLevel:1,stadiumXP:0,
  academyLevel:1,
  sponsors:[...SPONSORS],
  sponsorIncome:0,
  matchRunning:false,matchPaused:false,matchTimer:null,
  minute:0,myG:0,oppG:0,oppName:'',oppXI:[],
  matchShots:[0,0],matchPoss:50,
  halfStats:{first:{myG:0,oppG:0},second:{myG:0,oppG:0}},
  hofScorers:[],clubStats:{played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,totalRevenue:0},
  packBuf:[],
  reputation:0,repLabel:'Local',
  aiClubs:[...AI_CLUBS.map(c=>({...c,squad:[],activities:[]}))],
  aiActivityLog:[],
  staff:{coach:1,fitness:1,scout:1,doctor:1,analyst:1},
  boardGoal:'top6',boardWarnings:0,
  clubLegends:[],
  matchRatings:{},matchPerf:null,matchHistory:[],seasonFixtures:[],worldNews:[],onlineManagers:[],
  ffpWarnings:0,
  merchandiseRevenue:0,
  totalWages:0,
  seasonGoalsFor:0,seasonGoalsAgainst:0,
  // NEW SYSTEMS
  coins:0,
  clubDNA:'balanced',
  ownerType:'businessman',
  weather:'sunny',
  referee:{name:'Mr.Smith',style:'balanced'},
  relations:[],
  wonderkids:[],
  rivalTeam:'',
  rankedELO:1200,rankedW:0,rankedL:0,rankedD:0,
  onlineTournament:{active:false,round:0,prize:0},
  onlineMarket:[],onlineSellListings:[],
  paymentHistory:[],usedSlipHashes:{},usedSlipVisuals:[],
  awards:{ballonDor:[],goldenBoot:[],goldenGlove:[],toty:[],bestManager:[]},
  legacySeasons:[],
  managerAge:35,
  retired:false,
  trophies:{league:0,cup:0,champions:0},
  matchWeather:'sunny',matchReferee:'balanced',canChangeLeague:false,matchSubsUsed:0,
  squadSlots:50,captainId:'',viceCaptainId:'',setPieceTakers:{penalty:''},
  tacticPlan:{press:5,width:5,tempo:5,defline:5,counter:5,passing:5,creativity:5,aggression:5,overlap:5},
  championsQualified:false,cupRuns:{domestic:{active:true,round:1,alive:true},continental:{active:false,round:0,alive:false}},
  onlineMode:'local',paymentProvider:'not_configured',
};

function freshState(overrides={}){
  return {
    economyVersion:2,money:STARTING_MONEY,fans:28000,week:1,league:'EPL',teamName:'FC Bangkok United',stadiumName:'Bangkok Arena',teamColor:'#f0b429',season:1,
    squad:[],youth:[],marketPlayers:[],
    formation:'433',tacStyle:'balanced',formationFamiliarity:{},currentFormation:'433',
    slots:{},
    leagueTable:[],topScorers:{},topAssists:{},yellowCards:{},redCards:{},playerRatings:{},
    stadiumLevel:1,stadiumXP:0,
    academyLevel:1,
    sponsors:SPONSORS.map(s=>({...s})),
    sponsorIncome:0,
    matchRunning:false,matchPaused:false,matchTimer:null,
    minute:0,myG:0,oppG:0,oppName:'',oppXI:[],
    matchShots:[0,0],matchPoss:50,
    halfStats:{first:{myG:0,oppG:0},second:{myG:0,oppG:0}},
    hofScorers:[],clubStats:{played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,totalRevenue:0},
    packBuf:[],
    reputation:0,repLabel:'Local',
    aiClubs:AI_CLUBS.map(c=>({...c,squad:[],activities:[]})),
    aiActivityLog:[],
    staff:{coach:1,fitness:1,scout:1,doctor:1,analyst:1},
    boardGoal:'top6',boardWarnings:0,
    clubLegends:[],
    matchRatings:{},matchPerf:null,matchHistory:[],seasonFixtures:[],worldNews:[],onlineManagers:[],
    ffpWarnings:0,
    merchandiseRevenue:0,
    totalWages:0,
    seasonGoalsFor:0,seasonGoalsAgainst:0,
    coins:0,
    clubDNA:'balanced',
    ownerType:'businessman',
    weather:'sunny',
    referee:{name:'Mr.Smith',style:'balanced'},
    relations:[],
    wonderkids:[],
    rivalTeam:'',
    rankedELO:1200,rankedW:0,rankedL:0,rankedD:0,
    onlineTournament:{active:false,round:0,prize:0},
    onlineMarket:[],onlineSellListings:[],
    paymentHistory:[],usedSlipHashes:{},usedSlipVisuals:[],
    awards:{ballonDor:[],goldenBoot:[],goldenGlove:[],toty:[],bestManager:[]},
    legacySeasons:[],
    managerAge:35,
    retired:false,
    trophies:{league:0,cup:0,champions:0},
    matchWeather:'sunny',matchReferee:'balanced',canChangeLeague:false,matchSubsUsed:0,
    squadSlots:50,captainId:'',viceCaptainId:'',setPieceTakers:{penalty:''},
    tacticPlan:{press:5,width:5,tempo:5,defline:5,counter:5,passing:5,creativity:5,aggression:5,overlap:5},
    championsQualified:false,cupRuns:{domestic:{active:true,round:1,alive:true},continental:{active:false,round:0,alive:false}},
    onlineMode:'local',paymentProvider:'not_configured',
    ...overrides,
  };
}

// ===== HELPERS =====
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const clamp=(v,mn,mx)=>Math.max(mn,Math.min(mx,v));
const fmt=n=>{const sign=n<0?'-':'';n=Math.abs(Math.round(n||0));if(n>=1e6)return sign+(n/1e6).toFixed(1)+'M';if(n>=1e3)return sign+(n/1e3).toFixed(0)+'K';return sign+n;};
const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
const uid=()=>Math.random().toString(36).substr(2,9);
const BASE_SQUAD_LIMIT=50;
const {CARD_TIERS,CARD_PACKS,CARD_TIER_PRICE_RANGES,MARKET_POOL_SIZE,MARKET_POOL_TIERS}=SUPERKICK_ECONOMY_CATALOG;
const {commonsPhoto,REAL_PLAYERS}=SUPERKICK_PLAYER_CATALOG;
function ensureGameDefaults(){
  G.squadSlots=G.squadSlots||BASE_SQUAD_LIMIT;
  G.setPieceTakers=G.setPieceTakers||{penalty:''};
  G.tacticPlan={press:5,width:5,tempo:5,defline:5,counter:5,passing:5,creativity:5,aggression:5,overlap:5,...(G.tacticPlan||{})};
  G.cupRuns=G.cupRuns||{domestic:{active:true,round:1,alive:true},continental:{active:!!G.championsQualified,round:0,alive:!!G.championsQualified}};
  G.matchMaxMinute=G.matchMaxMinute||90;
  G.pendingCupMatch=G.pendingCupMatch||null;
}
function squadLimit(){return G.squadSlots||BASE_SQUAD_LIMIT;}
function hasSquadSlot(count=1){return (G.squad?.length||0)+count<=squadLimit();}
function squadFullMessage(){return `ทีมเต็ม ${G.squad.length}/${squadLimit()} คน — ซื้อ Squad Slot เพิ่มในร้านค้า`;}
function getPackOpenCount(){
  const count=parseInt(document.getElementById('pack-count')?.value||'1',10);
  return clamp(count||1,1,10);
}
function readTacticNumber(id,key,fallback=5){
  const el=document.getElementById(id);
  const value=el?Number(el.value):(G.tacticPlan?.[key]??fallback);
  return clamp(value||fallback,1,10);
}
function saveTacticControls(){
  G.tacStyle=document.getElementById('t-style')?.value||G.tacStyle||'balanced';
  G.tacticPlan={
    press:readTacticNumber('t-press','press'),
    width:readTacticNumber('t-width','width'),
    tempo:readTacticNumber('t-tempo','tempo'),
    defline:readTacticNumber('t-defline','defline'),
    counter:readTacticNumber('t-counter','counter'),
    passing:readTacticNumber('t-passing','passing'),
    creativity:readTacticNumber('t-creativity','creativity'),
    aggression:readTacticNumber('t-aggression','aggression'),
    overlap:readTacticNumber('t-overlap','overlap'),
  };
}
function getTacticalPlan(){
  saveTacticControls();
  const style=G.tacStyle||document.getElementById('t-style')?.value||'balanced';
  const t=G.tacticPlan;
  let attBonus=0,defBonus=0,possession=0;
  if(style==='attack'){attBonus+=.07;defBonus-=.03;}
  else if(style==='defend'){defBonus+=.07;attBonus-=.04;}
  else if(style==='counter'){attBonus+=.04;defBonus+=.03;}
  else if(style==='press'){attBonus+=.05;defBonus+=.04;}
  else if(style==='possession'){attBonus+=.03;defBonus+=.02;possession+=4;}
  attBonus+=(t.tempo-5)*.006+(t.creativity-5)*.005+(t.overlap-5)*.004+(t.counter-5)*.004;
  defBonus+=(t.defline<=4?(5-t.defline)*.006:-(t.defline-5)*.004)+(t.aggression-5)*.003+(t.press-5)*.004;
  possession+=(t.passing-5)*1.4+(t.width-5)*.8-(t.counter-5)*.6;
  const risk=Math.max(0,(t.tempo-5)+(t.defline-5)+(t.aggression-5))*0.006;
  return {style,attBonus,defBonus,possession,risk};
}
function allGamePlayers(){
  const ai=(G.aiClubs||[]).flatMap(c=>(c.squad||[]).map(p=>({...p,club:c.name,world:true})));
  return [...(G.squad||[]).map(p=>({...p,club:G.teamName,world:false})),...ai,...(G.wonderkids||[]).map(p=>({...p,club:'Wonderkid Watch',world:true}))];
}
function recordStat(bucket,id,player,field,amount=1){
  if(!player||!id)return;
  G[bucket]=G[bucket]||{};
  if(!G[bucket][id])G[bucket][id]={id,name:player.name,nat:player.nat,face:player.face,pos:player.pos,club:player.club||G.teamName,[field]:0,apps:player.apps||0,rating:player.rating||6.5};
  G[bucket][id][field]=(G[bucket][id][field]||0)+amount;
  G[bucket][id].apps=player.apps||G[bucket][id].apps||0;
  G[bucket][id].rating=player.rating||G[bucket][id].rating||6.5;
}
function cardTierFromOVR(ovr){
  return CARD_TIERS.find(t=>ovr>=t.min&&ovr<=t.max)||CARD_TIERS[0];
}
function cardTierById(id){
  return CARD_TIERS.find(t=>t.id===id||t.label.toLowerCase()===String(id).toLowerCase());
}
function tierPriceRange(id){
  const tier=cardTierById(id)||CARD_TIERS[0];
  return CARD_TIER_PRICE_RANGES[tier.id]||CARD_TIER_PRICE_RANGES.bronze;
}
function calcTierPrice(p,randomize=false){
  const tier=cardTierById(p.cardTier)||cardTierFromOVR(p.ovr||p.ca||60);
  const [min,max]=tierPriceRange(tier.id);
  if(max<=0)return 0;
  if(randomize)return rnd(min,max);
  const span=Math.max(1,tier.max-tier.min);
  const ovrRatio=clamp(((p.ovr||p.ca||tier.min)-tier.min)/span,0,1);
  const ageBonus=clamp((28-(p.age||28))*0.015,-0.12,0.12);
  const ratingBonus=clamp(((p.rating||6.5)-6.5)*0.04,-0.12,0.16);
  const ratio=clamp(0.25+ovrRatio*0.6+ageBonus+ratingBonus,0,1);
  return clamp(Math.round(min+(max-min)*ratio),min,max);
}
function applyTierEconomy(p,opts={}){
  if(!p)return p;
  const tier=cardTierById(p.cardTier)||cardTierFromOVR(p.ovr||p.ca||60);
  p.cardTier=tier.id;p.cardVersion=p.cardVersion||tier.label;p.cardName=p.cardName||`${p.baseName||p.name} ${p.cardVersion}`;
  if(p.isInitialSquad)return p;
  const [min,max]=tierPriceRange(tier.id);
  const outOfRange=typeof p.price!=='number'||p.price<min||p.price>max;
  if(opts.force||outOfRange)p.price=calcTierPrice(p,opts.randomize);
  p.releaseClause=Math.max(p.price,Math.round(p.price*rnd(130,200)/100));
  return p;
}
function rollCardTier(packType='bronze'){
  const odds=CARD_PACKS[packType]?.odds||CARD_PACKS.bronze.odds;
  let roll=Math.random()*odds.reduce((sum,entry)=>sum+entry[1],0);
  for(const [tier,weight] of odds){
    roll-=weight;
    if(roll<=0)return tier;
  }
  return odds[odds.length-1][0];
}
function cardTierBadge(p){
  const tier=cardTierById(p.cardTier)||cardTierFromOVR(p.ovr||p.ca||60);
  return `<span class="card-tier" style="color:${tier.color};border-color:${tier.color}66;background:${tier.color}18;">${tier.label}</span>`;
}
function playerCardName(p){
  const tier=cardTierById(p.cardTier)||cardTierFromOVR(p.ovr||p.ca||60);
  return `${p.baseName||p.name} ${p.cardVersion||tier.label}`;
}
function createPlayerCardVersion(baseName,cardTier,opts={}){
  return genPlayer({...opts,name:baseName,cardTier});
}
function playerFace(p,cls='pf'){
  const fallback=`${p.nat||''}${p.face||'⚽'}`;
  if(!p.photo)return `<div class="${cls}"><span>${fallback}</span></div>`;
  return `<div class="${cls} has-photo"><span>${fallback}</span><img src="${p.photo}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.remove('has-photo');"></div>`;
}
function applyRealPlayerIdentity(p){
  if(!p||p.photo)return p;
  const pool=REAL_PLAYERS.filter(r=>!p.pos||r.pos===p.pos);
  const real=(pool.length?pool:REAL_PLAYERS)[rnd(0,(pool.length?pool:REAL_PLAYERS).length-1)];
  p.name=real.name;p.baseName=real.name;p.nat=real.nat;p.photo=real.photo;p.face=p.face||'⚽';
  if(!p.pos)p.pos=real.pos;
  const tier=cardTierById(p.cardTier)||cardTierFromOVR(p.ovr||p.ca||60);
  p.cardTier=tier.id;p.cardVersion=p.cardVersion||tier.label;p.cardName=`${real.name} ${p.cardVersion}`;
  return p;
}
function normalizeRealPlayerCards(){
  ['squad','marketPlayers','onlineMarket'].forEach(key=>(G[key]||[]).forEach(applyRealPlayerIdentity));
  (G.onlineSellListings||[]).forEach(l=>{if(l.player)applyRealPlayerIdentity(l.player);});
  (G.aiClubs||[]).forEach(c=>(c.squad||[]).forEach(applyRealPlayerIdentity));
}

function notify(msg,type='gold'){
  const d=document.createElement('div');d.className='nitem';
  d.style.borderColor=type==='red'?'var(--red)':type==='green'?'var(--green)':type==='blue'?'var(--blue)':'var(--gold)';
  const box=document.getElementById('notif');
  d.textContent=msg;box.appendChild(d);
  while(box.children.length>4)box.firstElementChild.remove();
  setTimeout(()=>d.remove(),3100);
}
function getSavedGameRaw(){
  return window.SuperkickAccounts?.readGameSave?SuperkickAccounts.readGameSave():localStorage.getItem('skfm_save');
}
function refreshContinueButton(){
  const btn=document.getElementById('btn-load-save');
  if(btn)btn.style.display=getSavedGameRaw()?'block':'none';
}
function saveGame(){
  if(!Array.isArray(G.squad))return;
  try{
    const clean={...G,matchRunning:false,matchPaused:false,matchTimer:null,oppXI:[],marketPlayers:[],onlineMarket:[]};
    delete clean['lo'+'anPlayers'];
    const serialized=JSON.stringify(clean);
    if(window.SuperkickAccounts?.writeGameSave)SuperkickAccounts.writeGameSave(serialized);
    else localStorage.setItem('skfm_save',serialized);
    window.SuperkickAccounts?.saveProfile?.({
      managerName:G.managerName||'Manager',
      teamName:G.teamName||'',
      league:G.league||'',
      season:G.season||1,
      week:G.week||1,
      money:G.money||0,
      teamStrength:typeof calcTeamStrength==='function'?calcTeamStrength().total:0,
      lastPlayedAt:Date.now(),
    });
    refreshContinueButton();
  }catch(e){
    console.warn('Save failed',e);
  }
}
function migrateEconomySave(data){
  if(!data||(data.economyVersion||1)>=2)return data;
  const scaleMoney=v=>typeof v==='number'?Math.max(0,Math.round(v/10)):v;
  const scalePlayer=p=>{
    if(!p)return p;
    ['price','wage','releaseClause','signingBonus','goalBonus','cleanSheetBonus','loyaltyBonus'].forEach(k=>{p[k]=scaleMoney(p[k]);});
    return p;
  };
  ['money','sponsorIncome','merchandiseRevenue','totalWages'].forEach(k=>{data[k]=scaleMoney(data[k]);});
  if(data.clubStats)data.clubStats.totalRevenue=scaleMoney(data.clubStats.totalRevenue);
  ['squad','youth','marketPlayers','onlineMarket','wonderkids','clubLegends'].forEach(k=>(data[k]||[]).forEach(scalePlayer));
  (data.onlineSellListings||[]).forEach(l=>{scalePlayer(l.player);(l.offers||[]).forEach(o=>{o.amount=scaleMoney(o.amount);});l.askingPrice=scaleMoney(l.askingPrice);});
  (data.aiClubs||[]).forEach(c=>{c.budget=scaleMoney(c.budget);(c.squad||[]).forEach(scalePlayer);});
  (data.sponsors||[]).forEach(s=>{s.weekly=scaleMoney(s.weekly);});
  if(data.onlineTournament)data.onlineTournament.prize=scaleMoney(data.onlineTournament.prize);
  data.economyVersion=2;
  return data;
}
function applyLoadedState(data){
  data=migrateEconomySave(data||{});
  G=freshState(data||{});
  ensureGameDefaults();
  G.matchRunning=false;G.matchPaused=false;G.matchTimer=null;G.oppXI=[];
  if(matchTimer){clearInterval(matchTimer);matchTimer=null;}
  ensureWorldDatabase();
  G.sponsors=(G.sponsors||SPONSORS).map(s=>({...s}));
  G.aiClubs=(G.aiClubs?.length?G.aiClubs:AI_CLUBS).map(c=>({...c,squad:c.squad||[],activities:c.activities||[]}));
  if(!G.marketPlayers?.length)refreshTransferMarketPool(true);
  delete G['lo'+'anPlayers'];
  normalizeRealPlayerCards();
  backfillLeagueRatings();
  catchUpAILeagueTable();
}
function openM(id){document.getElementById(id).classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}
function goPage(id){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
  document.getElementById('pg-'+id).classList.add('active');
  document.querySelectorAll('.nb').forEach(b=>{if(b.getAttribute('onclick')===`goPage('${id}')`)b.classList.add('active');});
  if(id==='squad')renderSquad();
  if(id==='transfer'){renderMarket();renderSell();renderContracts();}
  if(id==='stats')renderStats();
  if(id==='home')renderHome();
  if(id==='stadium')renderStadium();
  if(id==='youth')renderYouth();
  if(id==='leagues')renderLeagues();
  if(id==='tactics'){renderFormation();renderTeamStrength();renderChemistry();renderFormationFamiliarity();}
  if(id==='match'){renderMiniTable();renderMatchDashboard();}
  if(id==='hof')renderHOF();
  if(id==='aiclubs')renderAIClubs();
  if(id==='staff')renderStaff();
  if(id==='awards')renderAwards();
  if(id==='clubdna')renderClubDNA();
  if(id==='relations'){genRelations();renderWonderkids();}
  if(id==='online')renderOnline();
  if(id==='shop')renderShop();
  if(id==='legacy')renderLegacy();
}
function swTab(page,tab,btn=null){
  const pageMap={st:'stats',tr:'transfer'};
  const pg=document.getElementById('pg-'+(pageMap[page]||page));
  if(!pg)return;
  pg.querySelectorAll('.tc').forEach(t=>t.classList.remove('active'));
  pg.querySelectorAll('.tb').forEach(b=>b.classList.remove('active'));
  const tabEl=document.getElementById(page+'-'+tab);
  if(tabEl)tabEl.classList.add('active');
  if(!btn)btn=pg.querySelector(`.tb[onclick*="'${page}','${tab}'"]`);
  if(btn)btn.classList.add('active');
  if(tab==='sell')renderSell();
  if(tab==='legend')renderLegends();
  if(tab==='contract')renderContracts();
  if(tab==='scorers')renderScorers();
  if(tab==='assists')renderAssistsTab();
  if(tab==='cards')renderCardsTab();
  if(tab==='ratings')renderRatingsTab();
}

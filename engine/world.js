// ===== INIT =====
function initGame(){
  ensureGameDefaults();
  const league=getLeagueInfo();
  const squadBase=clamp((league.base||70)+rnd(-5,3),55,88);
  ensureWorldDatabase();
  G.squad=getClubSquadFromWorld(G.league,G.teamName,squadBase).map(markInitialSquadPlayer);
  G.slots={};
  G.matchRunning=false;G.matchPaused=false;G.minute=0;G.myG=0;G.oppG=0;G.matchShots=[0,0];G.matchPoss=50;
  G.topScorers={};G.topAssists={};G.yellowCards={};G.redCards={};G.matchRatings={};
  refreshTransferMarketPool(true);
  G.loanPlayers=[];
  G.aiClubs=buildAIClubsForLeague(G.league);
  G.aiClubs.forEach(c=>{c.squad=getClubSquadFromWorld(G.league,c.name,clamp(c.rep+rnd(-4,4),45,94));});
  initLeagueTable();
  updateHUD();renderHome();renderFormation();
}
function markInitialSquadPlayer(p){
  const starter=forceStarterOVR(p);
  return {
    ...starter,
    price:0,
    wage:0,
    releaseClause:0,
    signingBonus:0,
    goalBonus:0,
    cleanSheetBonus:0,
    loyaltyBonus:0,
    acquisition:'initial',
    isInitialSquad:true,
  };
}
function forceStarterOVR(p){
  const target=rnd(60,70);
  const stats={...(p.stats||{})};
  const keys=Object.keys(stats);
  for(let pass=0;pass<16;pass++){
    const current=calcOVRFromStats(p.pos,stats);
    const diff=target-current;
    if(diff===0)break;
    const step=clamp(diff,-4,4);
    keys.forEach(k=>{stats[k]=clamp(stats[k]+step,35,78);});
  }
  let ovr=calcOVRFromStats(p.pos,stats);
  let guard=24;
  while((ovr<60||ovr>70)&&guard--){
    const step=ovr<60?1:-1;
    keys.forEach(k=>{stats[k]=clamp(stats[k]+step,35,78);});
    ovr=calcOVRFromStats(p.pos,stats);
  }
  ovr=clamp(ovr,60,70);
  const potential=clamp(Math.max(ovr+rnd(2,8),Math.min(p.potential||ovr,78)),ovr,82);
  return {
    ...p,
    stats,
    ca:ovr,
    ovr,
    potential,
    potentialMin:clamp(Math.min(p.potentialMin||potential,potential-3),ovr,82),
    potentialMax:clamp(Math.max(p.potentialMax||potential,potential+3),potential,86),
    cardTier:'starter',
    cardVersion:'Starter',
    cardName:`${p.baseName||p.name} Starter`,
  };
}
const {CLUB_RATINGS,CLUBS_BY_LEAGUE,CLUB_PLAYER_ROWS,CLUB_PREFIXES,CLUB_SUFFIXES}=SUPERKICK_CLUB_CATALOG;
let WORLD_PLAYERS=[],WORLD_CLUB_SQUADS={};
function getLeagueInfo(id=G.league){
  return LEAGUES_DATA.find(l=>l.id===id)||LEAGUES_DATA[0];
}
function makeGeneratedClubNames(league,count=16){
  const base=(league.country||league.name).replace(/\s+/g,' ');
  const names=[];
  for(let i=0;i<count;i++){
    const prefix=CLUB_PREFIXES[i%CLUB_PREFIXES.length];
    const suffix=CLUB_SUFFIXES[(i*3)%CLUB_SUFFIXES.length];
    names.push(`${base} ${prefix} ${suffix}`);
  }
  return names;
}
function getBaseLeagueTeams(id){
  const league=getLeagueInfo(id);
  return CLUBS_BY_LEAGUE[id]||makeGeneratedClubNames(league,16);
}
function getLeagueTeams(id=G.league){
  const pool=getBaseLeagueTeams(id);
  const teams=[G.teamName,...pool.filter(n=>n!==G.teamName)];
  return [...new Set(teams)].slice(0,Math.max(12,Math.min(20,teams.length)));
}
function buildAIClubsForLeague(id=G.league){
  const league=getLeagueInfo(id);
  return getLeagueTeams(id).filter(n=>n!==G.teamName).map((name,i)=>{
    const rep=clamp((league.base||70)+rnd(-4,5)+(i<3?4:0),45,96);
    return {name,flag:league.flag,budget:Math.max(200000,Math.round(rep*rep*2200)),style:['balanced','possession','press','attack','defend','counter'][i%6],needPos:['GK','CB','CM','ST'].sort(()=>Math.random()-.5).slice(0,2),squad:[],activities:[],rep};
  });
}
function seedClubSquad(base,count=22){
  const shape=['GK','GK','CB','CB','CB','LB','RB','CDM','CM','CM','CAM','LW','RW','ST','ST','CB','CM','LW','RW','ST','CDM','RB'];
  return shape.slice(0,count).map(pos=>genPlayer({pos,base:clamp(base+rnd(-6,6),45,94),real:false}));
}
function seedNamedClubSquad(club,base,count=22){
  const raw=CLUB_PLAYER_ROWS[club];
  if(!raw)return null;
  const rows=raw.split('|').map(x=>{
    const [name,pos,nat]=x.split(':');
    return genPlayer({name,pos,nat,base:clamp(base+rnd(-5,6),45,95),real:false});
  });
  while(rows.length<count){
    const pos=POS_LIST[rows.length%POS_LIST.length];
    rows.push(genPlayer({pos,base:clamp(base+rnd(-8,4),45,90),real:false}));
  }
  return rows.slice(0,count);
}
function ensureWorldDatabase(){
  if(WORLD_PLAYERS.length>=10000)return;
  WORLD_PLAYERS=[];WORLD_CLUB_SQUADS={};
  LEAGUES_DATA.forEach(league=>{
    getBaseLeagueTeams(league.id).forEach((club,clubIndex)=>{
      const base=clamp((league.base||70)+rnd(-5,5)+(clubIndex<4?3:0),42,94);
      const squad=(seedNamedClubSquad(club,base,22)||seedClubSquad(base,22)).map(p=>({...p,club,leagueId:league.id,leagueName:league.name,country:league.country}));
      WORLD_CLUB_SQUADS[`${league.id}|${club}`]=squad;
      WORLD_PLAYERS.push(...squad);
    });
  });
}
function cloneWorldPlayer(p){
  return {...p,id:uid(),stats:{...p.stats},traits:[...(p.traits||[])],matchRatings:[...(p.matchRatings||[])],formHistory:[...(p.formHistory||[])]};
}
function getClubSquadFromWorld(leagueId,club,base=null){
  ensureWorldDatabase();
  const key=`${leagueId}|${club}`;
  if(!WORLD_CLUB_SQUADS[key]){
    const league=getLeagueInfo(leagueId);
    const squad=(seedNamedClubSquad(club,base||league.base||70,22)||seedClubSquad(base||league.base||70,22)).map(p=>({...p,club,leagueId,leagueName:league.name,country:league.country}));
    WORLD_CLUB_SQUADS[key]=squad;
    WORLD_PLAYERS.push(...squad);
  }
  return WORLD_CLUB_SQUADS[key].map(cloneWorldPlayer);
}
function sampleWorldMarket(count=80,opts={}){
  ensureWorldDatabase();
  const league=getLeagueInfo(opts.leagueId||G.league);
  let pool=WORLD_PLAYERS.filter(p=>p.club!==G.teamName&&p.leagueId!==undefined);
  if(opts.sameLevel!==false)pool=pool.filter(p=>Math.abs((LEAGUES_DATA.find(l=>l.id===p.leagueId)?.base||70)-(league.base||70))<=14);
  pool=[...pool].sort(()=>Math.random()-.5);
  return pool.slice(0,count).map(cloneWorldPlayer);
}
function refreshTransferMarketPool(force=false){
  ensureWorldDatabase();
  const current=G.marketPlayers||[];
  const validPool=current.length===MARKET_POOL_SIZE&&current.every(p=>MARKET_POOL_TIERS.includes(p.cardTier));
  if(!force&&validPool)return;
  G.marketPlayers=Array.from({length:MARKET_POOL_SIZE},()=>{
    const tier=MARKET_POOL_TIERS[rnd(0,MARKET_POOL_TIERS.length-1)];
    return genPlayer({cardTier:tier,real:false,age:rnd(18,32),potential:rnd(70,tier==='silver'?88:82)});
  });
  marketPage=0;
}
function getLeagueClubRating(name){
  if(name===G.teamName)return calcTeamStrength().total;
  const league=getLeagueInfo();
  return CLUB_RATINGS[name]||clamp((league.base||70)+rnd(-6,6),45,94);
}
function initLeagueTable(){
  const league=getLeagueInfo();
  const teams=getLeagueTeams();
  G.leagueTable=teams.map((n,i)=>({name:n,isMe:i===0,rating:i===0?0:(CLUB_RATINGS[n]||clamp((league.base||70)+rnd(-6,6)+(i<4?3:0),45,94)),played:0,won:0,drawn:0,lost:0,gf:0,ga:0,pts:0}));
}
function getNextLeagueOpponent(){
  const teams=G.leagueTable.filter(t=>!t.isMe);
  const targetPlayed=Math.min(...teams.map(t=>t.played));
  const pool=teams.filter(t=>t.played===targetPlayed);
  return pool[(G.week-1)%pool.length]||teams[(G.week-1)%teams.length];
}
function rollGoals(str,oppStr){
  const edge=clamp((str-oppStr)/28,-0.8,0.8);
  let goals=0;
  const chances=5+rnd(0,3);
  for(let i=0;i<chances;i++){
    const chance=0.20+edge*0.10+(str-72)*0.004;
    if(Math.random()<clamp(chance,0.08,0.42))goals++;
  }
  if(str>=86&&Math.random()<0.22)goals++;
  if(str<=73&&Math.random()<0.18)goals=Math.max(0,goals-1);
  return Math.min(goals,7);
}
function applyLeagueResult(home,away,hg,ag){
  home.played++;away.played++;
  home.gf+=hg;home.ga+=ag;away.gf+=ag;away.ga+=hg;
  if(hg>ag){home.won++;home.pts+=3;away.lost++;}
  else if(hg<ag){away.won++;away.pts+=3;home.lost++;}
  else{home.drawn++;away.drawn++;home.pts++;away.pts++;}
}
function simulateAILeagueRound(skipName){
  const aiTeams=G.leagueTable
    .filter(t=>!t.isMe&&t.name!==skipName)
    .sort((a,b)=>a.played-b.played||b.rating-a.rating);
  const results=[];
  while(aiTeams.length>1){
    const home=aiTeams.shift();
    const away=aiTeams.pop();
    const homeClub=getAIClubByName(home.name);
    const awayClub=getAIClubByName(away.name);
    const homeRating=homeClub?calcAIClubStrength(homeClub):(home.rating||getLeagueClubRating(home.name));
    const awayRating=awayClub?calcAIClubStrength(awayClub):(away.rating||getLeagueClubRating(away.name));
    let hg=rollGoals(homeRating+2,awayRating);
    let ag=rollGoals(awayRating,homeRating+2);
    const favoriteEdge=Math.abs(homeRating-awayRating);
    if(favoriteEdge>=10&&Math.random()<0.35){
      if(homeRating>awayRating)hg=Math.max(hg,ag+1);
      else ag=Math.max(ag,hg+1);
    }
    applyLeagueResult(home,away,hg,ag);
    recordAISimulatedFixture(homeClub,hg);
    recordAISimulatedFixture(awayClub,ag);
    results.push(`${home.name.split(' ').pop()} ${hg}-${ag} ${away.name.split(' ').pop()}`);
  }
  if(results.length)addEv(`AI: ${results.slice(0,3).join(' · ')}${results.length>3?' · ...':''}`,'save');
}
function backfillLeagueRatings(){
  G.leagueTable.forEach(t=>{
    if(!t.isMe&&!t.rating)t.rating=getLeagueClubRating(t.name);
  });
}
function catchUpAILeagueTable(){
  const me=G.leagueTable.find(t=>t.isMe);
  if(!me||!me.played)return;
  backfillLeagueRatings();
  let guard=80;
  while(guard--&&G.leagueTable.some(t=>!t.isMe&&t.played<me.played)){
    const pair=G.leagueTable
      .filter(t=>!t.isMe&&t.played<me.played)
      .sort((a,b)=>a.played-b.played||b.rating-a.rating)
      .slice(0,2);
    if(pair.length<2){
      const filler=G.leagueTable
        .filter(t=>!t.isMe&&t!==pair[0])
        .sort((a,b)=>a.played-b.played||b.rating-a.rating)[0];
      if(filler)pair.push(filler);
      else break;
    }
    const [home,away]=pair;
    const homeClub=getAIClubByName(home.name);
    const awayClub=getAIClubByName(away.name);
    const homeRating=homeClub?calcAIClubStrength(homeClub):(home.rating||getLeagueClubRating(home.name));
    const awayRating=awayClub?calcAIClubStrength(awayClub):(away.rating||getLeagueClubRating(away.name));
    const hg=rollGoals(homeRating+2,awayRating);
    const ag=rollGoals(awayRating,homeRating+2);
    applyLeagueResult(home,away,hg,ag);
    recordAISimulatedFixture(homeClub,hg);
    recordAISimulatedFixture(awayClub,ag);
  }
}

// ===== LANDING SCREEN LOGIC =====
const {TEAM_COLORS,MANAGER_AVATARS}=SUPERKICK_SIMULATION_CATALOG;
let ngMode='existing', ngLeague='EPL', ngColor=TEAM_COLORS[0], ngAvatar='🧑‍💼';
function refreshNewGameClubPick(){
  const sel=document.getElementById('ng-club-pick');
  if(!sel)return;
  sel.innerHTML=getBaseLeagueTeams(ngLeague).map(n=>`<option>${n}</option>`).join('');
}

function initLanding(){
  // Particles
  const pc=document.getElementById('land-particles');
  for(let i=0;i<30;i++){
    const d=document.createElement('div');d.className='land-particle';
    d.style.cssText=`left:${Math.random()*100}%;top:${80+Math.random()*20}%;--dur:${6+Math.random()*10}s;--del:${-Math.random()*12}s;`;
    pc.appendChild(d);
  }
  // League grid
  const lg=document.getElementById('ng-league-grid');
  LEAGUES_DATA.forEach(l=>{
    const b=document.createElement('button');b.className='ng-league-btn'+(l.id==='EPL'?' active':'');
    b.innerHTML=`<span class="ng-flag">${l.flag}</span>#${l.rank} ${l.name}`;
    b.onclick=()=>{
      document.querySelectorAll('.ng-league-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');ngLeague=l.id;refreshNewGameClubPick();
    };
    lg.appendChild(b);
  });
  refreshNewGameClubPick();
  // Colors
  const cp=document.getElementById('ng-colors');
  TEAM_COLORS.forEach((c,i)=>{
    const d=document.createElement('div');d.className='ng-color'+(i===0?' sel':'');
    d.style.background=c;
    d.onclick=()=>{document.querySelectorAll('.ng-color').forEach(x=>x.classList.remove('sel'));d.classList.add('sel');ngColor=c;};
    cp.appendChild(d);
  });
  // Avatars
  const av=document.getElementById('ng-avatars');
  MANAGER_AVATARS.forEach((a,i)=>{
    const d=document.createElement('div');d.className='ng-avatar'+(i===0?' sel':'');d.textContent=a;
    d.onclick=()=>{document.querySelectorAll('.ng-avatar').forEach(x=>x.classList.remove('sel'));d.classList.add('sel');ngAvatar=a;};
    av.appendChild(d);
  });
  // Check the save owned by the current Superkick ID.
  try{refreshContinueButton();}catch(e){}
}

function openNewGame(){
  document.getElementById('ng-screen').classList.add('open');
}
function closeNewGame(){
  document.getElementById('ng-screen').classList.remove('open');
}
function selectMode(m){
  ngMode=m;
  document.getElementById('mode-existing').classList.toggle('active',m==='existing');
  document.getElementById('mode-new').classList.toggle('active',m==='new');
  document.getElementById('ng-existing-opts').style.display=m==='existing'?'block':'none';
  document.getElementById('ng-new-opts').style.display=m==='new'?'block':'none';
}
function enterGame(){
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('ng-screen').classList.remove('open');
  document.getElementById('game-ui').classList.add('visible');
}
function startNewGame(){
  const mgrName=document.getElementById('ng-manager-name').value||'Manager';
  G=freshState();
  G.money=STARTING_MONEY;
  G.league=ngLeague;
  if(ngMode==='new'){
    const tn=document.getElementById('ng-team-name').value||'FC Legend';
    G.teamName=tn;
    G.stadiumName=document.getElementById('ng-stadium-name').value||'Dragon Arena';
    G.teamColor=ngColor;
  } else {
    G.teamName=document.getElementById('ng-club-pick').value||'FC Bangkok United';
    G.stadiumName=`${G.teamName} Arena`;
    G.teamColor=ngColor;
  }
  G.managerName=mgrName;G.managerAvatar=ngAvatar;
  initGame();
  document.getElementById('tn-disp').textContent=G.teamName;
  document.getElementById('m-hn').textContent=G.teamName;
  enterGame();
  notify(`ยินดีต้อนรับ ${ngAvatar} ${mgrName}!`,'gold');
}
function autoQuickStart(){
  ngMode='existing';
  const clubs=getBaseLeagueTeams(ngLeague);
  const pick=clubs[rnd(0,clubs.length-1)];
  const select=document.getElementById('ng-club-pick');
  if(select)select.value=pick;
  startNewGame();
  notify(`Auto Quick: เริ่มคุม ${pick}`,'blue');
}
function quickStart(){
  G=freshState();
  G.teamName='Bangkok United';G.stadiumName='Bangkok Arena';G.teamColor='#f0b429';G.money=STARTING_MONEY;G.league='ThaiPremier';G.managerName='Manager';
  initGame();
  document.getElementById('m-hn').textContent=G.teamName;
  enterGame();
}
function loadGame(){
  try{
    const raw=getSavedGameRaw();
    if(!raw){notify('ยังไม่มีเซฟ','red');return;}
    applyLoadedState(JSON.parse(raw));
    updateHUD();
    renderHome();
    renderFormation();
    renderMiniTable();
    document.getElementById('tn-disp').textContent=G.teamName;
    document.getElementById('m-hn').textContent=G.teamName;
    enterGame();
    notify(`โหลดเซฟ ${G.teamName} Season ${G.season} แล้ว`,'green');
  }catch(e){
    console.error(e);
    notify('โหลดเซฟไม่สำเร็จ','red');
  }
}

initLanding();

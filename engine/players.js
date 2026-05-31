// ===== PLAYER GEN =====
function genPlayer(opts={}){
  const realPool=REAL_PLAYERS.filter(p=>!opts.pos||p.pos===opts.pos);
  const real=opts.realPlayer||REAL_PLAYERS.find(p=>p.name===opts.name)||(!opts.name&&opts.real!==false?(realPool.length?realPool:REAL_PLAYERS)[rnd(0,(realPool.length?realPool:REAL_PLAYERS).length-1)]:null);
  const pos=opts.pos||real?.pos||POS_LIST[rnd(0,POS_LIST.length-1)];
  const age=opts.age||rnd(18,34);
  const requestedTier=opts.cardTier?cardTierById(opts.cardTier):null;
  const base=opts.base||(requestedTier?rnd(requestedTier.min,requestedTier.max):rnd(60,80));
  const nat=opts.nat||real?.nat||NATS[rnd(0,NATS.length-1)];
  const face=opts.face||real?.face||FACES[rnd(0,FACES.length-1)];
  const name=opts.name||real?.name||`${FNAMES[rnd(0,FNAMES.length-1)]} ${LNAMES[rnd(0,LNAMES.length-1)]}`;
  const photo=opts.photo||real?.photo||'';
  const personality=PERSONALITIES[rnd(0,PERSONALITIES.length-1)];
  const isGK=pos==='GK';const isCB=['CB','LB','RB'].includes(pos);const isAtt=['ST','LW','RW'].includes(pos);
  const s={
    PAC:isGK?rnd(38,62):clamp(base+rnd(-14,14),38,99),
    ACC:isGK?rnd(34,58):clamp(base+rnd(-10,12),38,99),
    STA:clamp(base+rnd(-8,8),50,99),
    STR:isCB?clamp(base+rnd(0,16),55,99):clamp(base+rnd(-10,10),42,95),
    JMP:isCB?clamp(base+rnd(0,14),55,99):clamp(base+rnd(-10,10),42,95),
    PAS:isGK?clamp(base+rnd(-20,0),38,80):clamp(base+rnd(-10,14),38,99),
    CRS:clamp(base+rnd(-14,8),34,95),
    DRI:isGK?rnd(28,52):clamp(base+rnd(-10,14),38,99),
    CON:clamp(base+rnd(-8,8),44,99),
    SHO:isGK?rnd(22,44):isAtt?clamp(base+rnd(0,18),44,99):clamp(base+rnd(-18,5),32,88),
    TAC:isCB?clamp(base+rnd(2,18),56,99):clamp(base+rnd(-18,2),28,88),
    POS:clamp(base+rnd(-6,10),48,99),
    VIS:clamp(base+rnd(-8,12),44,99),
    DEC:clamp(base+rnd(-6,10),48,99),
    COM:clamp(base+rnd(-8,8),48,99),
    AGR:isCB?clamp(base+rnd(0,16),50,99):clamp(base+rnd(-14,8),34,85),
    MRK:isCB?clamp(base+rnd(2,16),55,99):clamp(base+rnd(-20,0),25,75),
    REF:isGK?clamp(base+rnd(6,20),60,99):rnd(22,48),
    HAN:isGK?clamp(base+rnd(4,18),58,99):rnd(18,44),
  };
  const traitPool=TRAITS_POOL[pos]||TRAITS_POOL['CM'];
  const traits=[];const numTraits=rnd(0,2);
  for(let i=0;i<numTraits;i++){const t=traitPool[rnd(0,traitPool.length-1)];if(!traits.includes(t))traits.push(t);}
  traits.forEach(t=>{const b=TRAIT_BONUS[t]||{};Object.keys(b).forEach(k=>{if(s[k]!==undefined)s[k]=clamp(s[k]+b[k],0,99);});});
  let ovr=calcOVRFromStats(pos,s);
  if(requestedTier){
    const target=rnd(requestedTier.min,requestedTier.max);
    for(let pass=0;pass<8;pass++){
      const diff=target-ovr;
      if(Math.abs(diff)<=1)break;
      Object.keys(s).forEach(k=>{s[k]=clamp(s[k]+Math.sign(diff)*Math.max(1,Math.round(Math.abs(diff)*0.75)),0,99);});
      ovr=calcOVRFromStats(pos,s);
    }
    while(ovr<requestedTier.min){
      Object.keys(s).forEach(k=>{s[k]=clamp(s[k]+1,0,99);});
      const next=calcOVRFromStats(pos,s);
      if(next===ovr)break;
      ovr=next;
    }
    while(ovr>requestedTier.max){
      Object.keys(s).forEach(k=>{s[k]=clamp(s[k]-1,0,99);});
      const next=calcOVRFromStats(pos,s);
      if(next===ovr)break;
      ovr=next;
    }
  }
  ovr=clamp(ovr,60,99);
  const cardTier=(requestedTier||cardTierFromOVR(ovr)).id;
  const cardVersion=cardTierById(cardTier).label;
  const ca=ovr;
  const potBase=opts.potential||rnd(Math.max(68,ovr),95);
  const potRange={min:Math.max(potBase-5,60,ovr),max:Math.min(Math.max(potBase+5,ovr),99)};
  const wage=Math.round(ovr*ovr*5*(1+Math.random()*0.35));
  const marketVal=calcTierPrice({cardTier,ovr,ca,age,rating:6.5},true);
  const releaseClause=Math.round(marketVal*rnd(130,200)/100);
  const signingBonus=Math.round(wage*rnd(2,6));
  const goalBonus=isAtt?Math.round(wage*0.8):Math.round(wage*0.3);
  const cleanSheetBonus=pos==='GK'?Math.round(wage*0.5):0;
  const player={
    id:uid(),name,baseName:name,cardTier,cardVersion,cardName:name+' '+cardVersion,nat,face,photo,pos,age,
    potential:potBase,potentialMin:potRange.min,potentialMax:potRange.max,
    ca,ovr,stats:s,traits,personality,
    wage,price:marketVal,releaseClause,contract:rnd(1,5),
    signingBonus,goalBonus,cleanSheetBonus,loyaltyBonus:Math.round(wage*2),
    goals:0,assists:0,yellow:0,red:0,apps:0,cleanSheets:0,
    morale:rnd(60,90),fitness:rnd(75,100),
    form:rnd(4,7),sharpness:rnd(60,90),
    formHistory:[],
    injured:false,injuryDays:0,injuryMatches:0,injuryType:'',suspendedMatches:0,
    rating:6.5,seasonRating:6.5,matchRatings:[],
    growthRate:0,isLegend:false,
    onLoan:false,loanClub:'',loanMonths:0,
    peakAge:calcPeakAge(pos),
    isDeclined:false,
  };
  return applyTierEconomy(player,{force:true,randomize:true});
}
function calcPeakAge(pos){
  if(pos==='GK')return rnd(30,34);
  if(['CB','LB','RB'].includes(pos))return rnd(27,32);
  if(['CM','CDM'].includes(pos))return rnd(26,31);
  if(['LW','RW','CAM'].includes(pos))return rnd(24,29);
  if(pos==='ST')return rnd(25,30);
  return 28;
}
function calcOVRFromStats(pos,s){
  let ovr;
  if(pos==='GK')ovr=Math.round((s.REF*2+s.HAN*2+s.POS+s.DEC+s.COM)/7);
  else if(pos==='ST')ovr=Math.round((s.PAC+s.SHO*2+s.DRI+s.COM+s.STR)/6);
  else if(['LW','RW'].includes(pos))ovr=Math.round((s.PAC*2+s.DRI*2+s.SHO+s.ACC)/6);
  else if(pos==='CB')ovr=Math.round((s.TAC*2+s.STR+s.JMP+s.POS+s.AGR+s.MRK)/7);
  else if(pos==='CDM')ovr=Math.round((s.TAC*2+s.POS+s.STA+s.AGR+s.STR)/6);
  else if(pos==='CAM')ovr=Math.round((s.PAS*2+s.VIS*2+s.DRI+s.SHO+s.DEC)/7);
  else ovr=Math.round((s.PAS*2+s.VIS+s.DEC+s.STA+s.CON)/6);
  return clamp(ovr,48,99);
}

// ===== GROWTH & DECLINE =====
function calcGrowth(p){
  const pe=PERSONALITY_EFFECTS[p.personality]||{growthMult:1.0};
  const coachBonus=1+(G.staff.coach-1)*0.05;
  const effectivePeakAge=p.peakAge||28;
  if(p.age>effectivePeakAge+2){
    // Decline phase
    if(Math.random()<0.15){
      const keys=Object.keys(p.stats);
      const declineStats=['PAC','ACC','STA'];
      const growStats=['DEC','POS','COM'];
      declineStats.forEach(k=>{if(p.stats[k]!==undefined)p.stats[k]=Math.max(p.stats[k]-rnd(0,1),30);});
      growStats.forEach(k=>{if(p.stats[k]!==undefined)p.stats[k]=Math.min(p.stats[k]+rnd(0,1),99);});
      p.isDeclined=true;
    }
  } else if(p.age<=effectivePeakAge){
    const realPA=p.potentialMin+Math.floor(Math.random()*(p.potentialMax-p.potentialMin+1));
    const gap=realPA-p.ovr;
    if(gap<=0)return;
    const rate=(gap/60)*pe.growthMult*coachBonus;
    const gain=Math.random()<rate?rnd(0,2):0;
    if(gain>0){
      const keys=Object.keys(p.stats);
      for(let i=0;i<3;i++){
        const k=keys[rnd(0,keys.length-1)];
        if(p.stats[k]<realPA)p.stats[k]=Math.min(p.stats[k]+gain,99);
      }
      p.ca=calcOVRFromStats(p.pos,p.stats);
      p.ovr=p.ca;
    }
  }
}
function calcInjuryRisk(p){
  let risk=0.015;
  if(p.fitness<50)risk+=0.02;
  if(p.age>32)risk+=0.01;
  if(p.apps>30)risk+=0.005;
  if(G.staff.doctor>1)risk*=(1-(G.staff.doctor-1)*0.07);
  return risk;
}

// ===== CHEMISTRY =====
function calcChemistry(){
  const squad=getLineupPlayers();
  if(squad.length<5)return 50;
  let chemistry=70;
  const sameNat=squad.filter(p=>p.nat===squad[0].nat).length;
  if(sameNat>=3)chemistry+=5;
  const leaders=squad.filter(p=>p.personality==='Leader').length;
  chemistry+=leaders*3;
  const avgMorale=avg(squad.map(p=>p.morale));
  chemistry+=Math.round((avgMorale-70)*0.2);
  const fwd=squad.filter(p=>['ST','LW','RW'].includes(p.pos));
  const mid=squad.filter(p=>['CAM','CM','CDM'].includes(p.pos));
  if(fwd.length&&mid.length){
    const fwdAvgDri=avg(fwd.map(p=>p.stats.DRI||60));
    const midAvgPas=avg(mid.map(p=>p.stats.PAS||60));
    chemistry+=Math.round((fwdAvgDri+midAvgPas-130)*0.05);
  }
  return clamp(chemistry,30,100);
}
function renderChemistry(){
  const chem=calcChemistry();
  const color=chem>=80?'var(--green)':chem>=60?'var(--gold)':'var(--red)';
  document.getElementById('chemistry-display').innerHTML=`
    <div class="fbtw mb"><span class="tm">⚗️ เคมีทีม</span><span style="font-family:'Bebas Neue',cursive;font-size:1.3rem;color:${color};">${chem}</span></div>
    <div class="prbg"><div class="prb" style="width:${chem}%;background:${color}"></div></div>
    <div class="tm" style="font-size:.75rem;margin-top:4px;">${chem>=80?'🔥 เคมีดีมาก! บุกง่ายขึ้น':chem>=60?'✅ เคมีพอใช้':'⚠️ เคมีต่ำ ประสิทธิภาพลด'}</div>`;
}

// ===== FORMATION FAMILIARITY =====
function getFormFam(){
  const f=G.currentFormation||G.formation||'433';
  return G.formationFamiliarity[f]||0;
}
function improveFormFam(){
  const f=G.currentFormation||G.formation||'433';
  const coachBonus=G.staff.coach*2;
  G.formationFamiliarity[f]=Math.min(100,(G.formationFamiliarity[f]||0)+rnd(1,3)+coachBonus);
}
function renderFormationFamiliarity(){
  const f=G.currentFormation||G.formation||'433';
  const fam=getFormFam();
  const color=fam>=80?'var(--green)':fam>=50?'var(--gold)':'var(--red)';
  document.getElementById('t-fam').textContent=fam+'%';
  document.getElementById('t-fam-bar').style.width=fam+'%';
  document.getElementById('t-fam-bar').style.background=color;
}

// ===== TEAM STRENGTH ENGINE =====
function calcTeamStrength(){
  const picked=getLineupPlayers();
  const squad=picked.length?picked:G.squad.filter(p=>!p.injured&&p.fitness>0).sort((a,b)=>(b.ca||b.ovr)-(a.ca||a.ovr)).slice(0,11);
  const ovrWithBonus=p=>{
    let o=p.ovr;
    if(p.fitness<60)o-=Math.round((60-p.fitness)*0.1);
    const pe=PERSONALITY_EFFECTS[p.personality]||{moraleMult:1.0};
    const effMorale=p.morale*pe.moraleMult;
    o+=Math.round((effMorale-70)*0.05);
    o+=Math.round((p.form-5)*0.4);
    if(p.sharpness<60)o-=3;
    return clamp(o,30,99);
  };
  const byPos=pos=>squad.filter(p=>p.pos===pos);
  const avgPos=posArr=>{const ps=posArr.map(p=>ovrWithBonus(p));return ps.length?avg(ps):60;};
  const st=avgPos(byPos('ST'));const lw=avgPos(byPos('LW'));const rw=avgPos(byPos('RW'));const cam=avgPos(byPos('CAM'));
  const cm=avgPos(byPos('CM'));const cdm=avgPos(byPos('CDM'));
  const cb=avgPos(byPos('CB'));const lb=avgPos(byPos('LB'));const rb=avgPos(byPos('RB'));const gk=avgPos(byPos('GK'));
  const attack=st*0.4+lw*0.3+rw*0.2+cam*0.1;
  const midfield=cm*0.6+cdm*0.4;
  const defense=cb*0.5+(lb+rb)/2*0.3+gk*0.2;
  const morale=avg(squad.map(p=>p.morale))||70;
  const fitness=avg(squad.map(p=>p.fitness))||70;
  const famBonus=getFormFam()*0.02;
  const chemBonus=(calcChemistry()-70)*0.05;
  const captainBonus=squad.some(p=>p.id===G.captainId)?0.8:0;
  const plan=G.tacticPlan||{};
  const planBonus=((plan.passing||5)-5)*0.08+((plan.creativity||5)-5)*0.06+((plan.press||5)-5)*0.04;
  let tacBonus=0;
  const style=document.getElementById('t-style')?.value||'balanced';
  if(style==='attack')tacBonus=3;else if(style==='press')tacBonus=2;else if(style==='defend')tacBonus=-1;else if(style==='possession')tacBonus=1;
  const total=(attack*0.35+midfield*0.3+defense*0.3+(morale-70)*0.03+(fitness-70)*0.02)+tacBonus+famBonus+chemBonus+captainBonus+planBonus;
  return {attack:Math.round(attack),midfield:Math.round(midfield),defense:Math.round(defense),morale:Math.round(morale),fitness:Math.round(fitness),total:Math.round(total),chem:calcChemistry()};
}
function renderTeamStrength(){
  const s=calcTeamStrength();
  const bar=(v,max=100)=>`<div class="prbg"><div class="prb" style="width:${v/max*100}%;background:${v>=80?'var(--green)':v>=65?'var(--gold)':'var(--red)'}"></div></div>`;
  document.getElementById('team-strength-display').innerHTML=`
    <div class="fbtw mb"><span class="tm">⚔️ บุก</span><span>${s.attack}</span></div>${bar(s.attack)}
    <div class="fbtw mb"><span class="tm">⚙️ กลาง</span><span>${s.midfield}</span></div>${bar(s.midfield)}
    <div class="fbtw mb"><span class="tm">🛡️ รับ</span><span>${s.defense}</span></div>${bar(s.defense)}
    <div class="fbtw mb"><span class="tm">😊 ขวัญ</span><span>${s.morale}%</span></div>${bar(s.morale)}
    <div class="fbtw mb"><span class="tm">💪 ฟิต</span><span>${s.fitness}%</span></div>${bar(s.fitness)}
    <div class="fbtw mb"><span class="tm">⚗️ เคมี</span><span>${s.chem}</span></div>${bar(s.chem)}
    <hr class="div"><div class="fbtw"><span>💎 ความแข็งแกร่งรวม</span><span style="font-family:'Bebas Neue',cursive;font-size:1.3rem;color:var(--gold);">${s.total}</span></div>
  `;
}

// ===== MATCH RATING ENGINE =====
function calcMatchRatings(result){
  const base=result==='win'?7.2:result==='draw'?6.8:6.2;
  const ratings={};
  getLineupPlayerPool().forEach(p=>{
    if(!p.injured){
      const ms=G.matchPlayerStats?.[p.id]||{};
      let r=base+rnd(-15,15)/10;
      if(ms.goals>0)r+=ms.goals*1.2;
      if(ms.assists>0)r+=ms.assists*0.8;
      if(ms.keyPasses>0)r+=Math.min(ms.keyPasses*.12,.5);
      if(ms.tackles>0)r+=Math.min(ms.tackles*.15,.6);
      if(ms.shots>2&&!ms.goals)r-=.2;
      if(p.yellow)r-=0.3;
      if(p.red)r-=1.5;
      const pe=PERSONALITY_EFFECTS[p.personality]||{};
      if(p.personality==='Professional')r+=0.2;
      if(p.personality==='Leader')r+=0.15;
      if(p.personality==='Lazy')r-=0.3;
      if(G.staff.analyst>1)r+=(G.staff.analyst-1)*0.1;
      r=clamp(r,3,10);
      ratings[p.id]={name:p.name,pos:p.pos,rating:parseFloat(r.toFixed(1))};
      p.matchRatings=p.matchRatings||[];
      p.matchRatings.push(r);
      if(p.matchRatings.length>5)p.matchRatings.shift();
      p.rating=parseFloat(avg(p.matchRatings).toFixed(1));
      p.form=clamp(Math.round(r),1,10);
      p.formHistory=p.formHistory||[];
      p.formHistory.push(parseFloat(r.toFixed(1)));
      if(p.formHistory.length>5)p.formHistory.shift();
      p.price=calcTierPrice(p);
    }
  });
  G.matchRatings=ratings;
  renderMatchRatings();
}
function renderMatchRatings(){
  const pos_order=['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'];
  const sorted=Object.values(G.matchRatings||{}).sort((a,b)=>{
    return (pos_order.indexOf(a.pos)||99)-(pos_order.indexOf(b.pos)||99);
  });
  document.getElementById('m-ratings').innerHTML=sorted.slice(0,11).map(r=>{
    const color=r.rating>=8?'var(--green)':r.rating>=6.5?'var(--gold)':r.rating>=5?'var(--orange)':'var(--red)';
    return `<div class="fbtw" style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <span><span class="badge bg-gray" style="font-size:.6rem;margin-right:4px;">${r.pos}</span>${r.name}</span>
      <span class="rating-badge" style="background:${color}22;color:${color};border:1px solid ${color}44;">${r.rating}</span>
    </div>`;
  }).join('');
}

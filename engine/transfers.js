// ===== TRANSFER =====
let marketPage=0;
const MARKET_PAGE_SIZE=50;
function setMarketPage(delta){
  marketPage=Math.max(0,marketPage+delta);
  renderMarket();
}
function renderMarket(){
  const nm=(document.getElementById('s-name')?.value||'').toLowerCase();
  const pos=document.getElementById('s-pos')?.value||'';
  const sort=document.getElementById('s-sort')?.value||'ovr';
  refreshTransferMarketPool();
  let list=[...G.marketPlayers].filter(p=>(!nm||p.name.toLowerCase().includes(nm))&&(!pos||p.pos===pos));
  if(sort==='affordable')list=list.filter(p=>p.price+(p.signingBonus||0)<=G.money).sort((a,b)=>b.ovr-a.ovr||a.price-b.price);
  else if(sort==='price')list.sort((a,b)=>a.price-b.price);
  else if(sort==='pot')list.sort((a,b)=>b.potential-a.potential);
  else list.sort((a,b)=>b.ovr-a.ovr);
  const pe=p=>PERSONALITY_EFFECTS[p.personality]||{};
  const maxPage=Math.max(0,Math.ceil(list.length/MARKET_PAGE_SIZE)-1);
  marketPage=Math.min(marketPage,maxPage);
  const start=marketPage*MARKET_PAGE_SIZE;
  const page=list.slice(start,start+MARKET_PAGE_SIZE);
  const pager=`<div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);margin-bottom:4px;">
    <div class="tm">ตลาดทั้งหมด ${G.marketPlayers.length.toLocaleString()} คน · พบ ${list.length.toLocaleString()} คน · หน้า ${marketPage+1}/${maxPage+1}</div>
    <div class="fb gap"><button class="btn bgh bsm" onclick="setMarketPage(-1)" ${marketPage<=0?'disabled':''}>ก่อนหน้า</button><button class="btn bgh bsm" onclick="setMarketPage(1)" ${marketPage>=maxPage?'disabled':''}>ถัดไป</button></div>
  </div>`;
  document.getElementById('market-list').innerHTML=pager+(page.map(p=>`
    <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <div class="fb gap" style="align-items:center;">
        ${playerFace(p,'mini-face')}
        <div>
          <div style="font-weight:700;">${playerCardName(p)} ${cardTierBadge(p)} <span style="color:var(--gold);font-family:'Bebas Neue',cursive;">${p.ovr}</span> <span class="tm">POT${p.potentialMin||p.potential}-${p.potentialMax||p.potential}</span></div>
          <div class="tm" style="font-size:.72rem;">${p.pos} · อายุ ${p.age} · ${p.club||'Free Agent'} · <span style="color:${pe(p).color||'#fff'};font-size:.65rem;">${pe(p).label||p.personality}</span></div>
          <div>${p.traits.map(t=>`<span class="trait-chip">${t}</span>`).join('')}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="tg" style="font-weight:700;">${fmt(p.price)}</div>
        <div class="tm" style="font-size:.7rem;">RC: ${fmt(p.releaseClause)}</div>
        <button class="btn bgr bsm" onclick="initBuy('${p.id}')">เจรจา</button>
      </div>
    </div>`).join('')||'<div class="tm">ไม่พบนักเตะ</div>');
  renderOnlineTransferMarket();
}
function initBuy(id){
  const p=G.marketPlayers.find(x=>x.id===id);if(!p)return;
  if(!hasSquadSlot()){notify(squadFullMessage(),'red');return;}
  const desires=[];
  if(p.ovr>=80)desires.push('ต้องการค่าเหนื่อยสูงขึ้น 20%');
  if(p.age<23)desires.push('ต้องการเล่นเพื่อพัฒนาตัวเอง');
  if(p.potential>=88)desires.push('ต้องการสัญญาระยะยาว 4+ ปี');
  if(p.personality==='Mercenary')desires.push('ต้องการโบนัสเซ็นสัญญาสูง');
  if(p.personality==='Loyal')desires.push('มองหาสโมสรที่มั่นคงในระยะยาว');
  const repReq=G.reputation<3&&p.ovr>80?'⚠️ ชื่อเสียงสโมสรไม่สูงพอ — นักเตะอาจปฏิเสธ':'';
  document.getElementById('mb-content').innerHTML=`
    <div class="mdt">🤝 เจรจา</div>
    <div style="text-align:center;margin-bottom:.75rem;">
      <div style="display:flex;justify-content:center;margin-bottom:6px;">${playerFace(p,'pack-face')}</div>
      <div style="font-weight:700;">${playerCardName(p)} <span style="color:var(--gold);">${p.ovr}</span></div>
      <div class="badge bg-gold">${p.pos}</div>
      ${repReq?`<div class="tm" style="color:var(--orange);font-size:.75rem;margin-top:4px;">${repReq}</div>`:''}
    </div>
    <div class="fbtw mb"><span>มูลค่าตลาด</span><span class="tg">${fmt(p.price)}</span></div>
    <div class="fbtw mb"><span>Release Clause</span><span class="tr">${fmt(p.releaseClause)}</span></div>
    <div class="fbtw mb"><span>ค่าเหนื่อย</span><span class="tr">${fmt(p.wage)}/เดือน</span></div>
    <div class="fbtw mb"><span>โบนัสประตู</span><span class="tm">${fmt(p.goalBonus||0)}/ประตู</span></div>
    ${desires.length?`<div class="card" style="margin:.5rem 0;padding:.5rem;"><div class="tm" style="font-size:.78rem;">💬 ความต้องการ:</div>${desires.map(d=>`<div style="font-size:.78rem;padding:2px 0;">• ${d}</div>`).join('')}</div>`:''}
    <div class="mb"><label class="tm" style="font-size:.78rem;">ราคาเสนอ</label>
    <input type="number" id="offer-in" value="${Math.round(p.price*0.95)}"></div>
    <div class="mb"><label class="tm" style="font-size:.78rem;">ค่าเหนื่อยเสนอ</label>
    <input type="number" id="wage-in" value="${p.wage}"></div>
    <div class="mb"><label class="tm" style="font-size:.78rem;">ระยะสัญญา (ปี)</label>
    <select id="years-in"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option></select></div>
    <div class="fb gap" style="margin-top:.75rem;">
      <button class="btn bg" onclick="completeBuy('${id}')">✅ เสนอ</button>
      <button class="btn bgh" onclick="closeM('modal-buy')">ยกเลิก</button>
    </div>
  `;
  openM('modal-buy');
}
function completeBuy(id){
  const p=G.marketPlayers.find(x=>x.id===id);if(!p)return;
  const offer=parseInt(document.getElementById('offer-in').value)||p.price;
  const offerWage=parseInt(document.getElementById('wage-in').value)||p.wage;
  const years=parseInt(document.getElementById('years-in')?.value)||3;
  const priceOK=offer>=p.price*0.75;
  const wageOK=offerWage>=p.wage*0.85;
  const repOK=!(G.reputation<3&&p.ovr>82);
  if(!priceOK){notify('ราคาต่ำเกินไป! ปฏิเสธ','red');closeM('modal-buy');return;}
  if(!wageOK){notify('ค่าเหนื่อยต่ำเกินไป! ปฏิเสธ','red');return;}
  if(!repOK&&Math.random()<0.5){notify('นักเตะปฏิเสธ — ชื่อเสียงสโมสรไม่สูงพอ','red');closeM('modal-buy');return;}
  if(G.money<offer+p.signingBonus){notify('เงินไม่พอ!','red');return;}
  if(!hasSquadSlot()){notify(squadFullMessage(),'red');return;}
  G.money-=offer+p.signingBonus;
  p.wage=offerWage;p.contract=years;p.morale=80;p.sharpness=70;
  G.squad.push({...p,acquisition:'transfer',isInitialSquad:false});
  G.marketPlayers=G.marketPlayers.filter(x=>x.id!==id);
  updateHUD();notify(`✅ เซ็น ${p.name} ${years} ปี! (${fmt(offer)})`,'green');
  closeM('modal-buy');renderMarket();
}
function renderSell(){
  document.getElementById('sell-list').innerHTML=G.squad.map(p=>`
    <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <div>${p.nat}${p.face} <strong>${playerCardName(p)}</strong> ${cardTierBadge(p)} <span class="tg">${p.ovr}</span> <span class="tm">${p.pos}</span></div>
      <div>
        ${renderSellAction(p)}
        <button class="btn bgh bsm" style="margin-left:6px;" onclick="deletePlayer('${p.id}')">ลบ</button>
      </div>
    </div>`).join('')||'<div class="tm">ไม่มีนักเตะ</div>';
}
function renderSellAction(p){
  if(p.isInitialSquad)return '<span class="tm">Starter ชุดแรก · ขายไม่ได้</span>';
  const listing=(G.onlineSellListings||[]).find(l=>l.playerId===p.id);
  if(listing)return `<span class="tg">ตั้งขาย ${fmt(listing.askingPrice)}</span>
    <button class="btn bgh bsm" style="margin-left:6px;" onclick="swTab('tr','market')">ดูในตลาด</button>`;
  const suggested=Math.max(50000,p.price||calcTierPrice(p));
  return `<input type="number" id="sell-price-${p.id}" value="${suggested}" min="1" style="width:105px;margin-right:6px;">
    <button class="btn br bsm" onclick="listPlayerForSale('${p.id}')">ตั้งขาย</button>`;
}
function sellPlayer(id){
  const p=G.squad.find(x=>x.id===id);if(!p)return;
  if(p.isInitialSquad){notify('Starter ชุดแรกขายไม่ได้ แต่ลบออกจากทีมได้','red');return;}
  const price=parseInt(document.getElementById(`sell-price-${id}`)?.value)||p.price||calcTierPrice(p);
  listPlayerForSale(id,price);
}
function onlineBuyerName(){
  const names=['North Star FC','Bangkok Wolves','Blue Ocean United','Dragon City','Global XI','Rising Stars','Golden Boots','Metro FC','Royal Academy','Victory Club'];
  return names[rnd(0,names.length-1)]+' #'+rnd(100,999);
}
function listPlayerForSale(id,price=null){
  const p=G.squad.find(x=>x.id===id);if(!p)return;
  if(p.isInitialSquad){notify('Starter ชุดแรกขายไม่ได้ แต่ลบออกจากทีมได้','red');return;}
  if((G.onlineSellListings||[]).some(l=>l.playerId===id)){notify('นักเตะคนนี้ตั้งขายอยู่แล้ว','red');return;}
  const asking=Math.max(1,Math.round(price||parseInt(document.getElementById(`sell-price-${id}`)?.value)||p.price||calcTierPrice(p)));
  G.onlineSellListings=G.onlineSellListings||[];
  G.onlineSellListings.push({
    id:uid(),playerId:p.id,player:{...p,stats:{...p.stats},traits:[...(p.traits||[])]},
    askingPrice:asking,seller:G.teamName,listedWeek:G.week,offers:[],status:'listed'
  });
  saveGame();notify(`🌐 ตั้งขาย ${p.name} ที่ราคา ${fmt(asking)} แล้ว รอข้อเสนอจากผู้ซื้อ`,'blue');
  renderSell();renderMarket();
}
function generateOnlineTransferOffers(force=false){
  let created=0;
  (G.onlineSellListings||[]).forEach(l=>{
    if(l.status!=='listed'||!G.squad.some(p=>p.id===l.playerId))return;
    l.offers=l.offers||[];
    if(l.offers.length>=5)return;
    const fair=calcTierPrice(l.player);
    const interest=clamp(fair/(l.askingPrice||fair),0.55,1.2);
    const weeksWaiting=Math.max(0,(G.week||1)-(l.listedWeek||G.week||1));
    const chance=force?1:clamp(0.25+weeksWaiting*0.12+interest*0.25,0.15,0.8);
    if(Math.random()>chance)return;
    const minPct=Math.round(72+interest*8);
    const maxPct=Math.round(92+interest*18);
    const amount=Math.max(1,Math.round((l.askingPrice||fair)*rnd(minPct,maxPct)/100));
    l.offers.push({id:uid(),buyer:onlineBuyerName(),amount,week:G.week,seenAsking:l.askingPrice});
    created++;
  });
  if(created)notify(`📨 มีข้อเสนอออนไลน์ใหม่ ${created} รายการ`,'blue');
  return created;
}
function renderOnlineListingsHTML(){
  const listings=G.onlineSellListings||[];
  if(!listings.length)return '<div class="tm">ยังไม่มีนักเตะที่ตั้งขายออนไลน์</div>';
  return listings.map(l=>{
    const p=G.squad.find(x=>x.id===l.playerId)||l.player;
    const offers=(l.offers||[]).map(o=>`
      <div class="fbtw" style="padding:5px 0;border-top:1px solid rgba(255,255,255,.06);">
        <div><strong>${o.buyer}</strong><div class="tm" style="font-size:.68rem;">เห็นราคาตั้งขาย ${fmt(o.seenAsking||l.askingPrice)} · W${o.week}</div></div>
        <div style="text-align:right;"><span class="tg">${fmt(o.amount)}</span>
          <button class="btn bgr bsm" onclick="acceptOnlineOffer('${l.id}','${o.id}')">ตกลงขาย</button>
          <button class="btn br bsm" onclick="rejectOnlineOffer('${l.id}','${o.id}')">ปฏิเสธ</button>
        </div>
      </div>`).join('');
    return `<div class="card" style="padding:.65rem;margin:.5rem 0;">
      <div class="fbtw">
        <div>${p.nat||''}${p.face||''} <strong>${playerCardName(p)}</strong> ${cardTierBadge(p)} <span class="tg">${p.ovr}</span> <span class="tm">${p.pos}</span></div>
        <div style="text-align:right;"><div class="tg">ตั้งขาย ${fmt(l.askingPrice)}</div>
          <button class="btn bgh bsm" onclick="cancelOnlineListing('${l.id}')">ยกเลิกตั้งขาย</button>
        </div>
      </div>
      <div class="tm" style="font-size:.72rem;margin-top:4px;">ผู้ซื้อจะเห็นราคานี้ก่อนยื่นข้อเสนอ · รอมา ${Math.max(0,(G.week||1)-(l.listedWeek||G.week||1))} สัปดาห์</div>
      ${offers||'<div class="tm" style="font-size:.75rem;margin-top:6px;">ยังไม่มีข้อเสนอ</div>'}
    </div>`;
  }).join('');
}
function renderOnlineTransferMarket(){
  const el=document.getElementById('market-online-listings');if(!el)return;
  el.innerHTML=`<div class="fb gap mbm"><button class="btn bbl bsm" onclick="generateOnlineTransferOffers(true);renderMarket();">📨 เช็คข้อเสนอ</button><button class="btn bgh bsm" onclick="renderSell();renderMarket();">รีเฟรชรายชื่อขาย</button></div>${renderOnlineListingsHTML()}`;
}
function acceptOnlineOffer(listingId,offerId){
  const l=(G.onlineSellListings||[]).find(x=>x.id===listingId);if(!l)return;
  const offer=(l.offers||[]).find(o=>o.id===offerId);if(!offer)return;
  const p=G.squad.find(x=>x.id===l.playerId);
  if(!p){G.onlineSellListings=G.onlineSellListings.filter(x=>x.id!==listingId);renderMarket();return;}
  const dna=CLUB_DNA_OPTIONS.find(d=>d.id===G.clubDNA);
  const bonus=1+(dna?.bonus?.sellBonus||0);
  const income=Math.round(offer.amount*bonus);
  G.money+=income;
  G.squad=G.squad.filter(x=>x.id!==p.id);
  Object.keys(G.slots||{}).forEach(k=>{if(G.slots[k]===p.id)delete G.slots[k];});
  G.onlineSellListings=G.onlineSellListings.filter(x=>x.id!==listingId);
  updateHUD();saveGame();notify(`✅ ขาย ${p.name} ให้ ${offer.buyer} ได้ ${fmt(income)}`,'green');
  renderSell();renderMarket();renderFormation();
}
function rejectOnlineOffer(listingId,offerId){
  const l=(G.onlineSellListings||[]).find(x=>x.id===listingId);if(!l)return;
  l.offers=(l.offers||[]).filter(o=>o.id!==offerId);
  saveGame();notify('ปฏิเสธข้อเสนอแล้ว','red');renderMarket();
}
function cancelOnlineListing(listingId){
  const l=(G.onlineSellListings||[]).find(x=>x.id===listingId);if(!l)return;
  if(!confirm(`ยกเลิกตั้งขาย ${l.player?.name||'นักเตะ'}?`))return;
  G.onlineSellListings=G.onlineSellListings.filter(x=>x.id!==listingId);
  saveGame();notify('ยกเลิกตั้งขายแล้ว','blue');renderSell();renderMarket();
}
function deletePlayer(id){
  const p=G.squad.find(x=>x.id===id);if(!p)return;
  if(!confirm(`ลบ ${p.name} ออกจากทีม? การลบจะไม่ได้เงินคืน`))return;
  if(!confirm(`ยืนยันอีกครั้ง: ต้องการลบ ${p.name} จริงหรือไม่?`))return;
  G.squad=G.squad.filter(x=>x.id!==id);
  G.onlineSellListings=(G.onlineSellListings||[]).filter(l=>l.playerId!==id);
  Object.keys(G.slots||{}).forEach(k=>{if(G.slots[k]===id)delete G.slots[k];});
  updateHUD();renderSell();renderSquad();renderFormation();
  notify(`🗑️ ลบ ${p.name} ออกจากทีมแล้ว`,'green');
}
function renderLegends(){
  document.getElementById('legend-list').innerHTML=`<div class="card" style="border-color:var(--gold);">
    <div class="ct">ตำนานได้จาก Legend Pack เท่านั้น</div>
    <div class="tm">ไปที่ร้านค้าและใช้ Coins เปิด Legend Pack มีโอกาสสุ่มได้รับตำนาน ห้ามซื้อด้วยเงินสโมสรโดยตรง</div>
  </div>`+LEGENDS.map(p=>`
    <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <div class="fb gap" style="align-items:center;">
        <span style="font-size:1.4rem;">${p.nat}${p.face}</span>
        <div><div style="font-weight:700;">${p.name} <span style="color:var(--gold);">${p.ovr}</span></div><div class="tm">${p.pos} · ${p.traits.map(t=>`<span class="trait-chip">${t}</span>`).join('')}</div></div>
      </div>
      <div style="text-align:right;"><div class="tg">Pack only</div><span class="badge bg-gold">Legend</span></div>
    </div>`).join('');
}
function buyLegend(name){
  notify(`${name||'ตำนาน'} ได้จาก Legend Pack ในร้านค้าเท่านั้น`,'gold');
}
function renderContracts(){
  const sorted=[...G.squad].sort((a,b)=>a.contract-b.contract);
  document.getElementById('contract-list').innerHTML=sorted.map(p=>{
    const urgency=p.contract<1?'var(--red)':p.contract<2?'var(--orange)':'var(--muted)';
    return `<div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <div>${p.nat}${p.face} <strong>${p.name}</strong> <span class="tm">${p.pos}</span></div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="color:${urgency};">${p.contract?.toFixed(1)||0}ปี</span>
        <span class="tm">${fmt(p.wage)}/เดือน</span>
        <button class="btn bgh bsm" onclick="renewContract('${p.id}')">ต่อ</button>
      </div>
    </div>`;
  }).join('');
}
function renewContract(id){
  const p=G.squad.find(x=>x.id===id);if(!p)return;
  const cost=p.wage*3;if(G.money<cost){notify('เงินไม่พอ!','red');return;}
  // Personality affects negotiate
  const pe=PERSONALITY_EFFECTS[p.personality]||{};
  const loyaltyBonus=p.personality==='Loyal'?0:p.personality==='Mercenary'?0.15:0.1;
  G.money-=cost;p.contract+=3;p.wage=Math.round(p.wage*(1.1+loyaltyBonus));p.morale=Math.min(100,p.morale+10);
  updateHUD();notify(`📄 ต่อสัญญา ${p.name} 3 ปี (+${Math.round(loyaltyBonus*100)}%)`,'green');renderContracts();
}
function renderLoans(){
  document.getElementById('loan-list').innerHTML=G.loanPlayers.map(p=>`
    <div class="fbtw" style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;">
      <div class="fb gap" style="align-items:center;">
        <span>${p.nat}${p.face}</span>
        <div><div style="font-weight:700;">${playerCardName(p)} ${cardTierBadge(p)} <span class="tg">${p.ovr}</span></div>
        <div class="tm">${p.pos} · POT${p.potential} · อายุ${p.age}</div></div>
      </div>
      <button class="btn bbl bsm" onclick="loanPlayer('${p.id}')">ยืมตัว (ฟรี)</button>
    </div>`).join('')||'<div class="tm">ไม่มีนักเตะให้ยืม</div>';
}
function loanPlayer(id){
  const p=G.loanPlayers.find(x=>x.id===id);if(!p)return;
  if(!hasSquadSlot()){notify(squadFullMessage(),'red');return;}
  p.onLoan=true;p.loanMonths=3;
  G.squad.push({...p,id:uid(),acquisition:'loan',isInitialSquad:false});G.loanPlayers=G.loanPlayers.filter(x=>x.id!==id);
  notify(`🔗 ยืมตัว ${p.name} สำเร็จ (3 เดือน)`,'green');renderLoans();
}

// ===== AI CLUBS =====
function runAITransferWindow(){
  const log=[];
  G.aiClubs.forEach(club=>{
    if(club.budget<500000)return;
    club.needPos.forEach(pos=>{
      const candidate=G.marketPlayers.filter(p=>p.pos===pos&&p.price<=club.budget*0.3).sort((a,b)=>b.ovr-a.ovr)[0];
      if(candidate&&Math.random()<0.6){
        const price=Math.round(candidate.price*(0.9+Math.random()*0.2));
        club.budget-=price;
        club.squad.push({...candidate});
        G.marketPlayers=G.marketPlayers.filter(x=>x.id!==candidate.id);
        log.push(`${club.flag} ${club.name} ซื้อ ${candidate.name} (${candidate.pos} ${candidate.ovr}) ในราคา ${fmt(price)}`);
        club.activities.push({type:'buy',player:candidate.name,price});
      }
    });
    // Sell old players
    if(club.squad.length>22){
      const oldest=club.squad.sort((a,b)=>b.age-a.age)[0];
      if(oldest&&oldest.age>33&&Math.random()<0.5){
        club.squad=club.squad.filter(x=>x.id!==oldest.id);
        G.marketPlayers.push({...oldest,price:Math.round(oldest.price*0.6)});
        log.push(`${club.flag} ${club.name} ปล่อย ${oldest.name} (อายุ ${oldest.age})`);
        club.activities.push({type:'release',player:oldest.name});
      }
    }
  });
  G.aiActivityLog=[...log,...G.aiActivityLog].slice(0,20);
  if(log.length>0)notify(`🤖 AI ซื้อขาย ${log.length} รายการ`,'blue');
  renderAIClubs();
}
function runAITransferSilent(){
  G.aiClubs.forEach(club=>{
    if(Math.random()<0.3&&club.needPos.length>0){
      const pos=club.needPos[rnd(0,club.needPos.length-1)];
      const candidate=G.marketPlayers.filter(p=>p.pos===pos&&p.price<=club.budget*0.25).sort((a,b)=>b.ovr-a.ovr)[0];
      if(candidate){
        club.squad.push({...candidate});
        G.marketPlayers=G.marketPlayers.filter(x=>x.id!==candidate.id);
        G.aiActivityLog.unshift(`${club.flag} ${club.name} ซื้อ ${candidate.name} (${candidate.pos})`);
        G.aiActivityLog=G.aiActivityLog.slice(0,20);
      }
    }
  });
}
function renderAIClubs(){
  document.getElementById('ai-activity').innerHTML=G.aiActivityLog.length?
    G.aiActivityLog.map(a=>`<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.8rem;">${a}</div>`).join('')
    :'<div class="tm">ยังไม่มีกิจกรรม — กดจำลองตลาด</div>';
  document.getElementById('ai-clubs-list').innerHTML=G.aiClubs.map(c=>`
    <div class="ai-club-row">
      <div>
        <div style="font-weight:700;">${c.flag} ${c.name}</div>
        <div class="tm" style="font-size:.72rem;">สไตล์: ${c.style} · งบ: ${fmt(c.budget)} · ทีม: ${c.squad.length}คน</div>
        <div class="tm" style="font-size:.68rem;">ต้องการ: ${c.needPos.join(', ')}</div>
      </div>
      <div style="text-align:right;">
        <div class="badge bg-gold" style="font-size:.65rem;margin-bottom:5px;">REP ${c.rep}</div>
        <button class="btn bbl bsm" onclick="showAIClub('${encodeURIComponent(c.name)}')">ดูทีม</button>
      </div>
    </div>`).join('');
}
function aiFormationForStyle(style){
  if(style==='attack')return '433';
  if(style==='defend')return '532';
  if(style==='press')return '4231';
  if(style==='counter')return '442';
  if(style==='possession')return '451';
  return '433';
}
function pickAIStartingXI(club){
  const formation=aiFormationForStyle(club.style);
  const slots=FORMATIONS[formation]||FORMATIONS['433'];
  const used=new Set();
  const squad=[...(club.squad||[])];
  const compatible=(p,pos)=>{
    if(pos==='GK')return p.pos==='GK';
    if(['CB','LB','RB'].includes(pos))return ['CB','LB','RB'].includes(p.pos);
    if(['CDM','CM','CAM','LM','RM'].includes(pos))return ['CDM','CM','CAM','LM','RM'].includes(p.pos);
    if(['LW','RW','ST'].includes(pos))return ['LW','RW','ST'].includes(p.pos);
    return true;
  };
  return slots.map(sl=>{
    let pick=squad.filter(p=>!used.has(p.id)&&compatible(p,sl.p)).sort((a,b)=>(b.ca||b.ovr)-(a.ca||a.ovr))[0];
    if(!pick)pick=squad.filter(p=>!used.has(p.id)).sort((a,b)=>(b.ca||b.ovr)-(a.ca||a.ovr))[0];
    if(pick)used.add(pick.id);
    return {slot:sl,p:pick};
  }).filter(x=>x.p);
}
function getAIClubByName(name){
  return (G.aiClubs||[]).find(c=>c.name===name);
}
function getAIMatchPlayers(){
  return (G.oppXI||[]).map(x=>x.p).filter(Boolean);
}
function calcAIClubStrength(club,xi=null){
  if(!club)return 70;
  const picked=(xi||pickAIStartingXI(club)).map(x=>x.p).filter(Boolean);
  return picked.length?clamp(Math.round(avg(picked.map(p=>p.ca||p.ovr||60))),45,99):(club?.rep||70);
}
function pickAIMatchPlayer(posList=[],stat='SHO'){
  const all=getAIMatchPlayers();
  const filtered=all.filter(p=>!posList.length||posList.includes(p.pos));
  const pool=(filtered.length?filtered:all).sort((a,b)=>(b.stats?.[stat]||b.ovr||60)-(a.stats?.[stat]||a.ovr||60));
  if(!pool.length)return null;
  return pool[rnd(0,Math.min(2,pool.length-1))];
}
function registerAIGoal(scorer,assister=null){
  if(scorer){
    scorer.goals=(scorer.goals||0)+1;
    recordStat('topScorers',scorer.id,{...scorer,club:G.oppName},'goals');
  }
  if(assister&&assister.id!==scorer?.id){
    assister.assists=(assister.assists||0)+1;
    recordStat('topAssists',assister.id,{...assister,club:G.oppName},'assists');
  }
}
function recordAISimulatedFixture(club,goals){
  if(!club)return;
  const xi=pickAIStartingXI(club);
  xi.forEach(x=>{
    x.p.apps=(x.p.apps||0)+1;
    x.p.rating=parseFloat(clamp((x.p.rating||6.5)+rnd(-2,3)/10,5.5,8.8).toFixed(1));
    if(Math.random()<.06){
      x.p.yellow=(x.p.yellow||0)+1;
      recordStat('yellowCards',x.p.id,{...x.p,club:club.name},'cards');
    }
  });
  for(let i=0;i<goals;i++){
    const forwards=xi.map(x=>x.p).filter(p=>['ST','LW','RW','CAM'].includes(p.pos));
    const pool=forwards.length?forwards:xi.map(x=>x.p);
    if(!pool.length)break;
    const scorer=pool[rnd(0,pool.length-1)];
    if(scorer){
      scorer.goals=(scorer.goals||0)+1;
      recordStat('topScorers',scorer.id,{...scorer,club:club.name},'goals');
    }
    const creators=xi.map(x=>x.p).filter(p=>p.id!==scorer?.id&&['CM','CAM','LW','RW'].includes(p.pos));
    const assister=creators[rnd(0,Math.max(0,creators.length-1))];
    if(assister&&Math.random()<.72){
      assister.assists=(assister.assists||0)+1;
      recordStat('topAssists',assister.id,{...assister,club:club.name},'assists');
    }
  }
}
function showAIClub(nameEnc){
  const name=decodeURIComponent(nameEnc);
  const club=G.aiClubs.find(c=>c.name===name);
  if(!club)return;
  const formation=aiFormationForStyle(club.style);
  const xi=pickAIStartingXI(club);
  const used=new Set(xi.map(x=>x.p.id));
  const bench=(club.squad||[]).filter(p=>!used.has(p.id)).sort((a,b)=>(b.ca||b.ovr)-(a.ca||a.ovr));
  const avgOvr=Math.round(avg((club.squad||[]).map(p=>p.ovr||p.ca)));
  document.getElementById('mp-content').innerHTML=`
    <div class="mdt">${club.flag} ${club.name}</div>
    <div class="g2" style="margin-bottom:.75rem;">
      <div class="fbtw mb"><span class="tm">แผน</span><span class="tg">${formation}</span></div>
      <div class="fbtw mb"><span class="tm">สไตล์ AI</span><span>${club.style}</span></div>
      <div class="fbtw mb"><span class="tm">OVR เฉลี่ย</span><span class="tg">${avgOvr}</span></div>
      <div class="fbtw mb"><span class="tm">งบ</span><span class="tgr">${fmt(club.budget)}</span></div>
    </div>
    <div class="ct" style="font-size:.9rem;">ตัวจริง AI</div>
    <div style="max-height:260px;overflow:auto;margin-bottom:.75rem;">
      ${xi.map(x=>`<div class="fbtw" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.8rem;">
        <span><span class="badge bg-gray" style="font-size:.62rem;margin-right:5px;">${x.slot.p}</span>${x.p.nat} ${x.p.name}</span>
        <span class="tg">${x.p.pos} ${x.p.ovr}</span>
      </div>`).join('')}
    </div>
    <div class="ct" style="font-size:.9rem;">สำรอง / ทั้งทีม</div>
    <div style="max-height:230px;overflow:auto;">
      ${bench.map(p=>`<div class="fbtw" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.78rem;">
        <span>${p.nat} ${p.name}</span><span class="tm">${p.pos} · OVR ${p.ovr}</span>
      </div>`).join('')}
    </div>`;
  openM('modal-player');
}

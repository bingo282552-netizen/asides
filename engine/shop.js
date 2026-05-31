// ===== SHOP SYSTEM =====
function renderShop(){
  document.getElementById('coins-disp').textContent=G.coins;
  const payment=window.SUPERKICK_SERVICE_CONFIG?.payments||{};
  const status=document.getElementById('payment-service-status');
  if(status)status.innerHTML=payment.enabled&&payment.checkoutEndpoint
    ?'<span class="tgr">พร้อมเชื่อมต่อ Checkout จริงผ่าน backend</span>'
    :'<span class="tg">ยังไม่เปิด Checkout จริง: ต้องตั้งค่า payment backend ก่อนเติม Coins</span>';
  // Topup
  document.getElementById('topup-grid').innerHTML=TOPUP_PACKAGES.map(p=>`
    <div class="card" style="text-align:center;cursor:pointer;" onclick="startRealTopup(${p.coins},'${p.price}')">
      <div style="font-size:1.5rem;margin-bottom:4px;">🪙</div>
      <div style="font-weight:700;">${p.coins} Coins</div>
      <div style="font-size:.72rem;color:var(--muted);">${p.label}</div>
      ${p.bonus?`<div style="font-size:.7rem;color:var(--green);">${p.bonus}</div>`:''}
      <div class="btn bg" style="width:100%;margin-top:6px;font-size:.85rem;">${p.price}</div>
    </div>`).join('');
  // Items
  document.getElementById('shop-items').innerHTML=SHOP_ITEMS.map(it=>`
    <div class="fbtw" style="padding:8px 0;border-bottom:1px solid var(--border);">
      <div><div style="font-weight:700;font-size:.88rem;">${it.label}</div><div class="tm" style="font-size:.75rem;">${it.desc}</div></div>
      <button class="btn ${G.coins>=it.cost?'bg':'bgh'} bsm" onclick="buyShopItem('${it.id}',${it.cost})">🪙 ${it.cost}</button>
    </div>`).join('');
  // Coin packs
  document.getElementById('coin-packs').innerHTML=`
    <div class="card" style="text-align:center;border-color:var(--muted);">
      <div style="font-size:2rem;">📦</div><div style="font-weight:700;margin:4px 0;">Bronze Pack</div>
      <div class="tm" style="font-size:.72rem;">75% Bronze · 20% Silver · 5% Gold</div>
      <button class="btn bgh" style="margin-top:6px;" onclick="buyPackCoins('bronze',50)">🪙 50</button>
    </div>
    <div class="card" style="text-align:center;border-color:#c0c7d1;">
      <div style="font-size:2rem;">💎</div><div style="font-weight:700;margin:4px 0;">Silver Pack</div>
      <div class="tm" style="font-size:.72rem;">80% Silver · 18% Gold · 2% Elite</div>
      <button class="btn bbl" style="margin-top:6px;" onclick="buyPackCoins('silver',120)">🪙 120</button>
    </div>
    <div class="card" style="text-align:center;border-color:var(--gold);">
      <div style="font-size:2rem;">🏆</div><div style="font-weight:700;margin:4px 0;">Gold Pack</div>
      <div class="tm" style="font-size:.72rem;">80% Gold · 17% Elite · 3% Icon</div>
      <button class="btn bg" style="margin-top:6px;" onclick="buyPackCoins('gold',200)">🪙 200</button>
    </div>
    <div class="card" style="text-align:center;border-color:var(--purple);">
      <div style="font-size:2rem;">👑</div><div style="font-weight:700;margin:4px 0;">Legend Pack</div>
      <div class="tm" style="font-size:.72rem;">โอกาสสุ่มตำนาน · ซื้อด้วย Coins เท่านั้น</div>
      <button class="btn bpu" style="margin-top:6px;" onclick="buyPackCoins('legend',450)">🪙 450</button>
    </div>`;
}
async function startRealTopup(coins,price){
  const payment=window.SUPERKICK_SERVICE_CONFIG?.payments||{};
  if(!payment.enabled||!payment.checkoutEndpoint){
    document.getElementById('payment-content').innerHTML=`
      <div class="mdt">ระบบเติมเงินจริงยังไม่เปิด</div>
      <div class="tm mbm">หน้าเกมพร้อมเรียก Checkout backend แล้ว แต่ยังไม่มีผู้ให้บริการและ endpoint รับชำระเงิน จึงยังไม่เพิ่ม Coins เพื่อป้องกันการเติมเงินฟรีจาก browser</div>
      <div class="fbtw mb"><span>แพ็กที่เลือก</span><span class="tg">${coins} Coins · ${price}</span></div>
      <button class="btn bgh" onclick="closeM('modal-payment')">ปิด</button>`;
    openM('modal-payment');return;
  }
  try{
    const account=window.SuperkickAccounts?.getSession?.();
    const response=await fetch(payment.checkoutEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coins,price,playerId:account?.playerId||''})});
    if(!response.ok)throw new Error('Checkout backend ตอบกลับไม่สำเร็จ');
    const checkout=await response.json();
    if(!checkout.checkoutUrl)throw new Error('ไม่พบ checkoutUrl');
    location.href=checkout.checkoutUrl;
  }catch(error){notify(error.message||'เปิด Checkout ไม่สำเร็จ','red');}
}
function buyShopItem(id,cost){
  if(G.coins<cost){notify(`ต้องการ 🪙${cost}!`,'red');return;}
  G.coins-=cost;
  if(id==='rename_team'){const n=prompt('ชื่อทีมใหม่:',G.teamName);if(n){G.teamName=n;updateHUD();}}
  else if(id==='rename_stadium'){notify('🏟️ เปลี่ยนชื่อสนามแล้ว','green');}
  else if(id==='reset_youth'){G.youth=[];notify('🔄 รีเซ็ตอคาเดมีแล้ว','green');}
  else if(id==='reset_tactics'){G.formationFamiliarity={};notify('📋 รีเซ็ตแทคติกแล้ว','green');}
  else if(id==='morale_boost'){G.squad.forEach(p=>p.morale=Math.min(100,p.morale+20));notify('💊 Morale ทั้งทีม +20!','green');}
  else if(id==='fitness_boost'){G.squad.forEach(p=>p.fitness=Math.min(100,p.fitness+30));notify('⚡ Fitness ทั้งทีม +30!','green');}
  else if(id==='scout_slot'){G.staff.scout=Math.min(5,G.staff.scout+1);notify('🔍 Scout Slot เพิ่มแล้ว!','green');}
  else if(id==='contract_freeze'){notify('📄 Contract Freeze เปิดใช้งาน 1 ฤดูกาล!','green');}
  else if(id==='squad_slots'){G.squadSlots=squadLimit()+5;notify(`➕ ขนาดทีมเพิ่มเป็น ${G.squadSlots} คนแล้ว`,'green');}
  updateHUD();
  renderShop();
}
function buyPackCoins(type,cost){
  const count=getPackOpenCount();
  const total=cost*count;
  if(!hasSquadSlot(count)){notify(squadFullMessage(),'red');return;}
  if(G.coins<total){notify(`ต้องการ 🪙${total}!`,'red');return;}
  G.coins-=total;
  goPage('packs');
  openPack(type,true);
}

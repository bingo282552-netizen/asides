// ===== INVENTORY SYSTEM =====
(function(){
  const packNames={bronze:'Bronze Pack',silver:'Silver Pack',gold:'Gold Pack',legend:'Legend Pack'};
  const packIcons={bronze:'📦',silver:'💎',gold:'🏆',legend:'👑'};
  const packColors={bronze:'var(--muted)',silver:'#c0c7d1',gold:'var(--gold)',legend:'var(--purple)'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const shopMeta=id=>(SUPERKICK_ECONOMY_CATALOG.SHOP_ITEMS||[]).find(item=>item.id===id)||{id,label:id,desc:''};

  function ensureInventory(){
    if(!Array.isArray(G.inventory))G.inventory=[];
    G.inventory=G.inventory.map(item=>({
      id:item.id||uid(),
      kind:item.kind||'item',
      qty:Math.max(1,Number(item.qty||1)),
      createdAt:item.createdAt||Date.now(),
      ...item,
    })).filter(item=>item.qty>0);
    return G.inventory;
  }

  function inventoryStackKey(item){
    if(item.stackKey)return item.stackKey;
    if(item.kind==='pack')return `pack:${item.packType||'bronze'}`;
    if(item.kind==='shop')return `shop:${item.itemId||item.id}`;
    return `${item.kind||'item'}:${item.itemId||item.label||item.id}`;
  }

  function addInventoryItem(item,qty=1){
    ensureInventory();
    const amount=Math.max(1,Number(qty||1));
    const clean={id:uid(),kind:'item',createdAt:Date.now(),...item};
    clean.stackKey=inventoryStackKey(clean);
    clean.qty=amount;
    if(clean.stackable!==false){
      const existing=G.inventory.find(entry=>entry.stackKey===clean.stackKey);
      if(existing){
        existing.qty=Math.max(1,Number(existing.qty||1))+amount;
        existing.updatedAt=Date.now();
        existing.source=clean.source||existing.source;
        return existing;
      }
    }
    G.inventory.unshift(clean);
    return clean;
  }

  function removeInventoryItem(id,qty=1){
    ensureInventory();
    const item=G.inventory.find(entry=>entry.id===id);
    if(!item)return null;
    const amount=Math.max(1,Number(qty||1));
    item.qty=Math.max(0,Number(item.qty||1)-amount);
    if(item.qty<=0)G.inventory=G.inventory.filter(entry=>entry.id!==id);
    return item;
  }

  function packLabel(type){
    return packNames[type]||`${String(type||'bronze').toUpperCase()} Pack`;
  }

  function addPackToInventory(type,qty=1,source='money',costLabel=''){
    const packType=SUPERKICK_ECONOMY_CATALOG.CARD_PACKS[type]?type:'bronze';
    return addInventoryItem({
      kind:'pack',
      packType,
      label:packLabel(packType),
      icon:packIcons[packType]||'🎴',
      source,
      costLabel,
      color:packColors[packType]||'var(--gold)',
    },qty);
  }

  function addShopItemToInventory(itemId,qty=1){
    const meta=shopMeta(itemId);
    return addInventoryItem({
      kind:'shop',
      itemId,
      label:meta.label,
      desc:meta.desc,
      icon:(meta.label||'🎁').trim().charAt(0)||'🎁',
      source:'shop',
    },qty);
  }

  function inventorySummary(){
    const inv=ensureInventory();
    return inv.reduce((sum,item)=>{
      sum.total+=Number(item.qty||1);
      if(item.kind==='pack')sum.packs+=Number(item.qty||1);
      else sum.items+=Number(item.qty||1);
      return sum;
    },{total:0,packs:0,items:0});
  }

  function inventoryItemCard(item){
    const qty=Number(item.qty||1);
    const isPack=item.kind==='pack';
    const color=item.color||packColors[item.packType]||'var(--gold)';
    const title=isPack?packLabel(item.packType):item.label||shopMeta(item.itemId).label;
    const desc=isPack
      ? `แพ็คที่ซื้อหรือได้รับมา อยู่ในคลังแล้ว · เปิดได้ทีละใบ`
      : item.desc||shopMeta(item.itemId).desc||'ไอเทมในคลัง';
    const source=item.source?`<div class="tm" style="font-size:.7rem;">ที่มา: ${esc(item.source)} ${item.costLabel?`· ${esc(item.costLabel)}`:''}</div>`:'';
    return `<div class="inventory-card card" style="border-color:${color};">
      <div class="fbtw mbm">
        <div class="fb gap" style="align-items:center;">
          <span class="inventory-icon">${esc(item.icon||'🎁')}</span>
          <div>
            <div style="font-weight:800;">${esc(title)}</div>
            <div class="tm" style="font-size:.76rem;">${esc(desc)}</div>
            ${source}
          </div>
        </div>
        <span class="badge bg-gold">x${qty}</span>
      </div>
      <div class="fb gap inventory-actions">
        ${isPack
          ? `<button class="btn bg bsm" onclick="openInventoryPack('${item.id}',1)">เปิด 1 แพ็ค</button>
             ${qty>1?`<button class="btn bbl bsm" onclick="openInventoryPack('${item.id}',Math.min(${qty},Math.max(1,squadLimit()-G.squad.length)))">เปิดเท่าที่ว่าง</button>`:''}`
          : `<button class="btn bg bsm" onclick="useInventoryItem('${item.id}')">ใช้ไอเทม</button>`}
      </div>
    </div>`;
  }

  function renderInventory(){
    const root=document.getElementById('inventory-list');
    if(!root)return;
    const inv=ensureInventory();
    const filter=document.getElementById('inventory-filter')?.value||'all';
    const summary=inventorySummary();
    const stat=document.getElementById('inventory-stats');
    if(stat)stat.innerHTML=`
      <div class="card inventory-stat"><div class="hv">${summary.total}</div><div class="tm">ของทั้งหมด</div></div>
      <div class="card inventory-stat"><div class="hv">${summary.packs}</div><div class="tm">แพ็ค</div></div>
      <div class="card inventory-stat"><div class="hv">${summary.items}</div><div class="tm">ไอเทม</div></div>`;
    const list=inv.filter(item=>filter==='all'||item.kind===filter);
    root.innerHTML=list.length?list.map(inventoryItemCard).join(''):'<div class="card tm" style="text-align:center;padding:1.2rem;">Inventory ว่างอยู่ ซื้อแพ็คหรือไอเทมแล้วของจะมาอยู่ตรงนี้</div>';
  }

  function applyShopInventoryEffect(itemId){
    if(itemId==='rename_team'){
      const name=prompt('ชื่อทีมใหม่:',G.teamName);
      if(!name)return false;
      G.teamName=name.trim()||G.teamName;
      document.getElementById('tn-disp')&&(document.getElementById('tn-disp').textContent=G.teamName);
      document.getElementById('m-hn')&&(document.getElementById('m-hn').textContent=G.teamName);
      notify('✏️ เปลี่ยนชื่อทีมแล้ว','green');
    }else if(itemId==='rename_stadium'){
      const name=prompt('ชื่อสนามใหม่:',G.stadiumName||'Bangkok Arena');
      if(!name)return false;
      G.stadiumName=name.trim()||G.stadiumName;
      notify('🏟️ เปลี่ยนชื่อสนามแล้ว','green');
    }else if(itemId==='reset_youth'){
      G.youth=[];
      notify('🔄 รีเซ็ตอคาเดมีแล้ว','green');
    }else if(itemId==='reset_tactics'){
      G.formationFamiliarity={};
      notify('📋 รีเซ็ตแทคติกแล้ว','green');
    }else if(itemId==='morale_boost'){
      G.squad.forEach(p=>p.morale=Math.min(100,(p.morale||60)+20));
      notify('💊 Morale ทั้งทีม +20!','green');
    }else if(itemId==='fitness_boost'){
      G.squad.forEach(p=>p.fitness=Math.min(100,(p.fitness||60)+30));
      notify('⚡ Fitness ทั้งทีม +30!','green');
    }else if(itemId==='scout_slot'){
      G.staff.scout=Math.min(5,(G.staff.scout||1)+1);
      notify('🔍 Scout Slot เพิ่มแล้ว!','green');
    }else if(itemId==='contract_freeze'){
      G.contractFreezeSeason=G.season;
      notify('📄 Contract Freeze เปิดใช้งาน 1 ฤดูกาล!','green');
    }else if(itemId==='squad_slots'){
      G.squadSlots=squadLimit()+5;
      notify(`➕ ขนาดทีมเพิ่มเป็น ${G.squadSlots} คนแล้ว`,'green');
    }else{
      notify('ยังไม่รู้วิธีใช้ไอเทมนี้','red');
      return false;
    }
    return true;
  }

  function useInventoryItem(id){
    const item=ensureInventory().find(entry=>entry.id===id);
    if(!item)return;
    if(item.kind==='pack'){openInventoryPack(id,1);return;}
    if(!applyShopInventoryEffect(item.itemId||item.id))return;
    removeInventoryItem(id,1);
    updateHUD();
    saveGame();
    renderInventory();
  }

  function openInventoryPack(id,qty=1){
    const item=ensureInventory().find(entry=>entry.id===id);
    if(!item||item.kind!=='pack')return;
    const count=Math.max(1,Math.min(Number(qty||1),Number(item.qty||1)));
    if(!hasSquadSlot(count)){notify(squadFullMessage(),'red');return;}
    removeInventoryItem(id,count);
    saveGame();
    goPage('packs');
    openPack(item.packType||'bronze',true,{count,sourceInventory:id});
    notify(`🎴 เปิด ${packLabel(item.packType)} จาก Inventory`,'gold');
  }

  function buyPackToInventory(type,currency,costPer){
    const count=getPackOpenCount();
    const total=Number(costPer||0)*count;
    if(currency==='coins'){
      if((G.coins||0)<total){notify(`ต้องการ 🪙${total}!`,'red');return false;}
      G.coins-=total;
      addPackToInventory(type,count,'coin_shop',`🪙 ${total}`);
    }else{
      if((G.money||0)<total){notify(`เงินไม่พอ! ต้องการ ${fmt(total)}`,'red');return false;}
      G.money-=total;
      addPackToInventory(type,count,'pack_shop',fmt(total));
    }
    updateHUD();
    saveGame();
    notify(`✅ ซื้อ ${packLabel(type)} x${count} เข้า Inventory แล้ว`,'green');
    goPage('inventory');
    renderInventory();
    return true;
  }

  window.ensureInventory=ensureInventory;
  window.addInventoryItem=addInventoryItem;
  window.addPackToInventory=addPackToInventory;
  window.addShopItemToInventory=addShopItemToInventory;
  window.removeInventoryItem=removeInventoryItem;
  window.renderInventory=renderInventory;
  window.useInventoryItem=useInventoryItem;
  window.openInventoryPack=openInventoryPack;
  window.buyPackToInventory=buyPackToInventory;
})();

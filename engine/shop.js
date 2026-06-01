// ===== SHOP SYSTEM =====
function renderShop(){
  document.getElementById('coins-disp').textContent=G.coins;
  const payment=window.SUPERKICK_SERVICE_CONFIG?.payments||{};
  const status=document.getElementById('payment-service-status');
  if(status)status.innerHTML=payment.enabled&&payment.checkoutEndpoint
    ?'<span class="tgr">พร้อมเชื่อมต่อ Checkout จริงผ่าน backend</span>'
    :payment.allowClientSlipTopup
      ?'<span class="tg">โหมดทดสอบ: แนบสลิปและเติม Coins ใน browser</span>'
      :'<span class="tr">ยังไม่เปิดเติม Coins จริง ต้องตั้ง Checkout backend/webhook ก่อน</span>';
  // Topup
  document.getElementById('topup-grid').innerHTML=TOPUP_PACKAGES.map(p=>`
    <div class="card" style="text-align:center;cursor:pointer;" onclick="startRealTopup(${p.coins},'${p.price}')">
      <div style="font-size:1.5rem;margin-bottom:4px;">🪙</div>
      <div style="font-weight:700;">${p.coins} Coins</div>
      <div style="font-size:.72rem;color:var(--muted);">${p.label}</div>
      ${p.bonus?`<div style="font-size:.7rem;color:var(--green);">${p.bonus}</div>`:''}
      <div class="btn bg" style="width:100%;margin-top:6px;font-size:.85rem;">${p.price}</div>
    </div>`).join('');
  const history=document.getElementById('payment-history');
  if(history)history.innerHTML=(G.paymentHistory||[]).length?(G.paymentHistory||[]).slice(0,5).map(h=>`
    <div class="fbtw" style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.8rem;">
      <span>${h.paymentLabel||h.method||'payment'}</span>
      <span class="tg">${h.coins} Coins · ${h.price}</span>
    </div>`).join(''):'ยังไม่มีประวัติ';
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
      <button class="btn bgh" style="margin-top:6px;" onclick="buyPackCoins('bronze',50)">ซื้อเข้า Inventory · 🪙 50</button>
    </div>
    <div class="card" style="text-align:center;border-color:#c0c7d1;">
      <div style="font-size:2rem;">💎</div><div style="font-weight:700;margin:4px 0;">Silver Pack</div>
      <div class="tm" style="font-size:.72rem;">80% Silver · 18% Gold · 2% Elite</div>
      <button class="btn bbl" style="margin-top:6px;" onclick="buyPackCoins('silver',120)">ซื้อเข้า Inventory · 🪙 120</button>
    </div>
    <div class="card" style="text-align:center;border-color:var(--gold);">
      <div style="font-size:2rem;">🏆</div><div style="font-weight:700;margin:4px 0;">Gold Pack</div>
      <div class="tm" style="font-size:.72rem;">80% Gold · 17% Elite · 3% Icon</div>
      <button class="btn bg" style="margin-top:6px;" onclick="buyPackCoins('gold',200)">ซื้อเข้า Inventory · 🪙 200</button>
    </div>
    <div class="card" style="text-align:center;border-color:var(--purple);">
      <div style="font-size:2rem;">👑</div><div style="font-weight:700;margin:4px 0;">Legend Pack</div>
      <div class="tm" style="font-size:.72rem;">โอกาสสุ่มตำนาน · ซื้อด้วย Coins เท่านั้น</div>
      <button class="btn bpu" style="margin-top:6px;" onclick="buyPackCoins('legend',450)">ซื้อเข้า Inventory · 🪙 450</button>
    </div>`;
}
async function startRealTopup(coins,price){
  const payment=window.SUPERKICK_SERVICE_CONFIG?.payments||{};
  if(!payment.enabled||!payment.checkoutEndpoint){
    if(payment.allowClientSlipTopup)openSlipPaymentCheckout(coins,price);
    else notify('ยังไม่ได้เปิด Checkout backend สำหรับเติม Coins จริง','red');
    return;
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
function paymentDigits(value){
  return String(value||'').replace(/\D/g,'');
}
function paymentLast4(value){
  const d=paymentDigits(value);
  return d.slice(-4).padStart(Math.min(4,d.length),'•');
}
function luhnValid(num){
  const d=paymentDigits(num);
  if(d.length<13||d.length>19)return false;
  let sum=0,alt=false;
  for(let i=d.length-1;i>=0;i--){
    let n=parseInt(d[i],10);
    if(alt){n*=2;if(n>9)n-=9;}
    sum+=n;alt=!alt;
  }
  return sum%10===0;
}
function priceAmount(price){
  return parseInt(paymentDigits(price),10)||0;
}
function closestTopupPackage(amount){
  const packages=[...TOPUP_PACKAGES].sort((a,b)=>{
    const da=Math.abs(priceAmount(a.price)-amount);
    const db=Math.abs(priceAmount(b.price)-amount);
    if(da!==db)return da-db;
    return priceAmount(b.price)-priceAmount(a.price);
  });
  return packages[0]||{coins:0,price:'0฿',label:'-'};
}
function formatSlipSize(bytes){
  if(!bytes)return '-';
  if(bytes>=1024*1024)return (bytes/1024/1024).toFixed(1)+' MB';
  return Math.max(1,Math.round(bytes/1024))+' KB';
}
function openSlipPaymentCheckout(coins,price){
  document.getElementById('payment-content').innerHTML=`
    <div class="mdt">สแกนจ่ายและแนบสลิป</div>
    <div class="fbtw mb"><span>แพ็กที่เลือก</span><span class="tg">${coins} Coins · ${price}</span></div>
    <div class="g2">
      <div class="card" style="text-align:center;padding:.75rem;">
        <img src="assets/payment-qr.jpg" alt="QR Payment" style="width:100%;max-width:230px;border-radius:8px;border:1px solid var(--border);background:#fff;">
        <div style="font-weight:700;margin-top:7px;">บัญชีผู้รับ</div>
        <div class="tg">นายบดินทร ดีบุกคำ</div>
      </div>
      <div>
        <div class="tm mbm">หลังโอนเงิน ให้แนบสลิปและกรอกยอดที่โอน AI จะตรวจว่ารูปมีลักษณะเป็นสลิปจริงก่อนเติม Coins</div>
        <div class="mb"><label class="tm">ยอดที่โอนจริง (บาท)</label><input id="slip-amount" type="number" min="1" value="${priceAmount(price)}" oninput="updateSlipCoinPreview()"></div>
        <div class="mb"><label class="tm">แนบรูปสลิปโอนเงิน</label><input id="slip-file" type="file" accept="image/*" onchange="previewSlipFile();updateSlipCoinPreview()"></div>
        <div class="mb"><label class="tm">ชื่อผู้โอน / หมายเหตุ</label><input id="slip-sender" type="text" placeholder="ใส่ชื่อผู้โอนถ้ามี"></div>
        <div id="slip-preview" class="tm mbm">ยังไม่ได้แนบสลิป</div>
        <div id="slip-ai-preview" class="tm mbm">AI จะตรวจรูปสลิปเมื่อกดเติม Coins</div>
        <div id="slip-coin-preview" class="card" style="padding:.6rem;margin-bottom:.6rem;"></div>
      </div>
    </div>
    <div id="payment-error" class="tr mbm" style="font-size:.8rem;"></div>
    <div class="fb gap">
      <button class="btn bg" onclick="completeSlipPayment(${coins},'${price}')">AI ตรวจสลิปและเติม Coins</button>
      <button class="btn bgh" onclick="closeM('modal-payment')">ยกเลิก</button>
    </div>`;
  openM('modal-payment');
  updateSlipCoinPreview();
}
function paymentFail(message){
  const el=document.getElementById('payment-error');
  if(el)el.textContent=message;
  notify(message,'red');
  return false;
}
function previewSlipFile(){
  const file=document.getElementById('slip-file')?.files?.[0];
  const el=document.getElementById('slip-preview');
  if(!el)return;
  if(!file){el.textContent='ยังไม่ได้แนบสลิป';return;}
  el.innerHTML=`แนบแล้ว: <span class="tg">${file.name}</span> · ${formatSlipSize(file.size)}`;
  const ai=document.getElementById('slip-ai-preview');
  if(ai)ai.textContent='พร้อมตรวจรูปสลิป';
}
function updateSlipCoinPreview(){
  const amount=parseInt(document.getElementById('slip-amount')?.value,10)||0;
  const pack=closestTopupPackage(amount);
  const el=document.getElementById('slip-coin-preview');
  if(!el)return;
  el.innerHTML=amount>0
    ? `<div class="fbtw"><span class="tm">ยอดโอน</span><span>${amount}฿</span></div><div class="fbtw"><span class="tm">Coins ที่จะได้รับ</span><span class="tg">${pack.coins} Coins (${pack.price})</span></div>`
    : '<div class="tm">กรอกยอดที่โอนเพื่อคำนวณ Coins</div>';
}
function validateSlipPayment(){
  const amount=parseInt(document.getElementById('slip-amount')?.value,10)||0;
  const file=document.getElementById('slip-file')?.files?.[0];
  const sender=String(document.getElementById('slip-sender')?.value||'').trim();
  if(amount<=0)return paymentFail('กรุณากรอกยอดที่โอนจริง');
  if(!file)return paymentFail('กรุณาแนบสลิปโอนเงิน');
  if(file.size<20000)return paymentFail('ไฟล์สลิปเล็กเกินไป กรุณาแนบสลิปที่ชัดเจน');
  if(file.size>8*1024*1024)return paymentFail('ไฟล์สลิปใหญ่เกิน 8MB');
  if(!/^image\//.test(file.type||''))return paymentFail('รองรับเฉพาะรูปภาพสลิป');
  const pack=closestTopupPackage(amount);
  return {amount,file,sender,pack};
}
function loadSlipImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('อ่านรูปสลิปไม่ได้'));};
    img.src=url;
  });
}
async function slipFileHash(file){
  const buf=await file.arrayBuffer();
  if(window.crypto?.subtle){
    const digest=await crypto.subtle.digest('SHA-256',buf);
    return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  let h=2166136261;
  const bytes=new Uint8Array(buf);
  for(let i=0;i<bytes.length;i++)h=Math.imul(h^bytes[i],16777619);
  return 'fallback-'+(h>>>0).toString(16);
}
function slipVisualSignature(img){
  const sw=16,sh=24;
  const canvas=document.createElement('canvas');
  canvas.width=sw;canvas.height=sh;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0,sw,sh);
  const data=ctx.getImageData(0,0,sw,sh).data;
  const lum=[];
  for(let i=0;i<data.length;i+=4)lum.push((data[i]+data[i+1]+data[i+2])/3);
  const mean=lum.reduce((a,b)=>a+b,0)/lum.length;
  return lum.map(v=>v>mean?'1':'0').join('');
}
function hammingDistance(a,b){
  if(!a||!b||a.length!==b.length)return Infinity;
  let d=0;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;
  return d;
}
function findDuplicateSlip(fileHash,visualSig){
  const usedHashes=G.usedSlipHashes||{};
  if(fileHash&&usedHashes[fileHash])return {type:'file',record:usedHashes[fileHash]};
  const oldHash=(G.paymentHistory||[]).find(h=>h.slipHash&&h.slipHash===fileHash);
  if(oldHash)return {type:'file',record:oldHash};
  const visuals=[...(G.usedSlipVisuals||[]),...(G.paymentHistory||[]).filter(h=>h.slipVisualSig).map(h=>({sig:h.slipVisualSig,createdAt:h.createdAt}))];
  const duplicate=visuals.find(v=>hammingDistance(v.sig,visualSig)<=6);
  return duplicate?{type:'image',record:duplicate}:null;
}
async function analyzeSlipImage(file,amount){
  const img=await loadSlipImage(file);
  const w=img.naturalWidth||img.width;
  const h=img.naturalHeight||img.height;
  const aspect=w/h;
  const canvas=document.createElement('canvas');
  const cw=72,ch=108;
  canvas.width=cw;canvas.height=ch;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0,cw,ch);
  const data=ctx.getImageData(0,0,cw,ch).data;
  let dark=0,light=0,mid=0,edge=0,colorVar=0,lastLum=null;
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    const lum=(r+g+b)/3;
    if(lum<85)dark++;
    else if(lum>205)light++;
    else mid++;
    colorVar+=Math.abs(r-g)+Math.abs(g-b)+Math.abs(b-r);
    if(lastLum!==null)edge+=Math.abs(lum-lastLum);
    lastLum=lum;
  }
  const px=cw*ch;
  const darkRatio=dark/px,lightRatio=light/px,midRatio=mid/px;
  const edgeScore=edge/px,colorScore=colorVar/px;
  const reasons=[];
  let score=0;
  if(w>=420&&h>=600){score+=22;reasons.push('ความละเอียดพออ่านได้');}
  else reasons.push('ความละเอียดต่ำ');
  if(aspect>=0.42&&aspect<=1.15){score+=18;reasons.push('สัดส่วนคล้ายสลิปมือถือ');}
  else reasons.push('สัดส่วนไม่เหมือนสลิป');
  if(lightRatio>.25&&darkRatio>.025&&darkRatio<.48){score+=22;reasons.push('มีพื้นหลังและตัวอักษรคล้ายสลิป');}
  else reasons.push('คอนทราสต์ไม่เหมือนสลิป');
  if(edgeScore>10){score+=18;reasons.push('พบรายละเอียด/ตัวอักษรจำนวนมาก');}
  else reasons.push('รายละเอียดน้อยเกินไป');
  if(midRatio>.08||colorScore>12){score+=10;reasons.push('มีองค์ประกอบสี/โลโก้คล้ายแอปธนาคาร');}
  if(file.size>=45000){score+=10;reasons.push('ขนาดไฟล์เหมาะสม');}
  if(amount>0)score+=10;
  const ok=score>=72;
  return {ok,score:Math.min(100,Math.round(score)),reasons,width:w,height:h,darkRatio,lightRatio,edgeScore,visualSig:slipVisualSignature(img)};
}
function renderSlipAiResult(result){
  const el=document.getElementById('slip-ai-preview');
  if(!el)return;
  const color=result.ok?'tgr':'tr';
  el.innerHTML=`<span class="${color}">AI Score ${result.score}/100</span> · ${result.reasons.slice(0,3).join(' · ')}`;
}
async function completeSlipPayment(selectedCoins,selectedPrice){
  const payment=window.SUPERKICK_SERVICE_CONFIG?.payments||{};
  if(!payment.allowClientSlipTopup){
    paymentFail('ปิดการเติม Coins จาก browser แล้ว ต้องยืนยันผ่าน backend/webhook เท่านั้น');
    return;
  }
  const checked=validateSlipPayment();
  if(!checked)return;
  const {amount,file,sender,pack}=checked;
  const aiEl=document.getElementById('slip-ai-preview');
  if(aiEl)aiEl.textContent='AI กำลังตรวจรูปสลิป...';
  let aiResult;
  let fileHash='';
  try{
    fileHash=await slipFileHash(file);
    aiResult=await analyzeSlipImage(file,amount);
  }catch(error){
    paymentFail(error.message||'AI อ่านรูปสลิปไม่ได้');return;
  }
  renderSlipAiResult(aiResult);
  if(!aiResult.ok){
    paymentFail('AI ไม่มั่นใจว่าเป็นสลิปจริง กรุณาแนบรูปสลิปที่ชัดเจนจากแอปธนาคาร');return;
  }
  const duplicate=findDuplicateSlip(fileHash,aiResult.visualSig);
  if(duplicate){
    paymentFail('สลิปนี้เคยใช้เติม Coins แล้ว กรุณาใช้สลิปใหม่');return;
  }
  G.coins=(G.coins||0)+pack.coins;
  G.paymentHistory=G.paymentHistory||[];
  G.usedSlipHashes=G.usedSlipHashes||{};
  G.usedSlipHashes[fileHash]={amount,coins:pack.coins,createdAt:Date.now(),slipName:file.name};
  G.usedSlipVisuals=G.usedSlipVisuals||[];
  G.usedSlipVisuals.unshift({sig:aiResult.visualSig,amount,coins:pack.coins,createdAt:Date.now()});
  G.usedSlipVisuals=G.usedSlipVisuals.slice(0,200);
  G.paymentHistory.unshift({
    id:uid(),coins:pack.coins,price:pack.price,requestedCoins:selectedCoins,requestedPrice:selectedPrice,
    amount,method:'qr_slip',paymentLabel:`QR Slip · ${amount}฿`,recipient:'นายบดินทร ดีบุกคำ',
    sender,slipName:file.name,slipSize:file.size,slipHash:fileHash,slipVisualSig:aiResult.visualSig,aiScore:aiResult.score,
    slipWidth:aiResult.width,slipHeight:aiResult.height,createdAt:Date.now(),status:'ai_slip_approved'
  });
  G.paymentHistory=G.paymentHistory.slice(0,20);
  updateHUD();saveGame();renderShop();closeM('modal-payment');
  notify(`AI ตรวจสลิปผ่าน: เติม ${pack.coins} Coins ตามยอดใกล้เคียง ${pack.price}`,'green');
}
function buyShopItem(id,cost){
  if(G.coins<cost){notify(`ต้องการ 🪙${cost}!`,'red');return;}
  G.coins-=cost;
  addShopItemToInventory(id,1);
  notify('🎁 ซื้อแล้ว ของถูกส่งเข้า Inventory','green');
  updateHUD();
  saveGame();
  renderShop();
}
function buyPackCoins(type,cost){
  const count=getPackOpenCount();
  const total=cost*count;
  if(G.coins<total){notify(`ต้องการ 🪙${total}!`,'red');return;}
  buyPackToInventory(type,'coins',cost);
}

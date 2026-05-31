// Club identity, ownership, weather, referees, relations, awards, and landing choices.
window.SUPERKICK_SIMULATION_CATALOG={
  CLUB_DNA_OPTIONS:[
    {id:'possession',label:'🎯 Possession',desc:'ครองบอล ส่งสั้น บิลด์อัพ',effect:'เคมีทีม+5 · แฟนบอล+10%',bonus:{chem:5,fans:0.10}},
    {id:'counter',label:'⚡ Counter Attack',desc:'รับรอตีโต้ ความเร็วสูง',effect:'ATK+5 เวลาตีโต้',bonus:{attBonus:0.05}},
    {id:'pressing',label:'🔥 High Press',desc:'กดดันสูง ดึงบอลคืนเร็ว',effect:'DEF+5 · ค่าเหนื่อย Stamina',bonus:{defBonus:0.05}},
    {id:'youth',label:'🌱 Youth Development',desc:'ปั้นดาวรุ่ง Academy',effect:'Youth CA +3/season · Scout ดีขึ้น',bonus:{youthGrowth:3}},
    {id:'profit',label:'💰 Transfer Profit',desc:'ซื้อถูกขายแพง',effect:'ราคาขาย +15%',bonus:{sellBonus:0.15}},
    {id:'balanced',label:'⚖️ Balanced',desc:'สมดุลทุกด้าน',effect:'ทุกอย่างปกติ',bonus:{}},
  ],
  OWNER_TYPES:[
    {id:'billionaire',label:'💎 Billionaire',desc:'เจ้าสัวใจป้ำ บอร์ดอดทนขึ้น',budgetBonus:0,boardTolerance:3},
    {id:'businessman',label:'💼 Businessman',desc:'นักธุรกิจ เน้นกำไร ต้องทำเงิน',budgetBonus:0,boardTolerance:2},
    {id:'fan_owned',label:'❤️ Fan Owned',desc:'สโมสรของแฟนบอล เน้นผลงาน ไม่เน้นกำไร',budgetBonus:0,boardTolerance:2},
    {id:'youth_investor',label:'🌱 Youth Investor',desc:'นักลงทุนเยาวชน เน้นปั้นดาวรุ่ง',budgetBonus:0,boardTolerance:3},
  ],
  WEATHER_LIST:[
    {id:'sunny',label:'☀️ แดดจัด',effect:'ไม่มีผล',attMod:0,defMod:0},
    {id:'rain',label:'🌧️ ฝนตก',effect:'บอลลื่น Passing -10%',attMod:-0.03,defMod:0},
    {id:'storm',label:'⛈️ พายุ',effect:'Stamina หมดเร็ว Long Shot ลด -15%',attMod:-0.06,defMod:-0.03},
    {id:'snow',label:'❄️ หิมะ',effect:'ความเร็วลด Pace -20% ทั้งสองฝั่ง',attMod:-0.04,defMod:-0.04},
  ],
  REFEREES:[
    {name:'Roberto Rossi',style:'strict',label:'🟨 Strict',desc:'แจกใบง่าย Yellow ใจเร็ว',cardMult:1.5},
    {name:'James Cooper',style:'balanced',label:'⚖️ Balanced',desc:'ปกติ',cardMult:1.0},
    {name:'Luis Hernandez',style:'lenient',label:'😌 Lenient',desc:'ปล่อยเกม ใบน้อย',cardMult:0.6},
  ],
  RELATION_TYPES:[
    {type:'friendship',label:'🤝 Friendship',desc:'เพื่อนสนิท เคมีเพิ่ม',chemBonus:3},
    {type:'partnership',label:'⚽ Partnership',desc:'คู่หู เล่นเข้าขากัน',chemBonus:5},
    {type:'conflict',label:'😤 Conflict',desc:'ไม่ถูกกัน ฟอร์มลด',chemBonus:-4},
    {type:'mentor',label:'📚 Mentor',desc:'รุ่นพี่สอนรุ่นน้อง พัฒนาเร็วขึ้น',growthBonus:0.1},
  ],
  RIVAL_MAP:{EPL:'Tottenham',LaLiga:'Barcelona',Bundesliga:'Borussia Dortmund',SerieA:'Inter Milan',Ligue1:'Marseille',ThaiPremier:'Buriram United',MLS:'LA Galaxy',JLeague:'Yokohama',CLeague:'Real Madrid'},
  AWARD_HISTORY_KEY:'award_history',
  TEAM_COLORS:['#f0b429','#58a6ff','#3fb950','#da3633','#bc8cff','#f78166','#39c5cf','#ffffff','#ff6b9d','#ffd700'],
  MANAGER_AVATARS:['🧑‍💼','👨‍💼','👩‍💼','🧔','👱','🧑','👴','🕵️','🦅','🎩'],
};

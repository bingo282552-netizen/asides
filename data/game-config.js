// Superkick FM categorized configuration.
// Keep static data here so the main HTML can focus on the simulation engine.
window.SUPERKICK_FEATURE_CONFIG = {
  players: window.SUPERKICK_PLAYER_DATA,
  clubs: window.SUPERKICK_CLUB_DATA,
  menuGroups: [
    {label:'🏠 หน้าหลัก',page:'home'},
    {label:'👥 เมนูทีม',items:[
      {label:'นักเตะในทีม',page:'squad'},
      {label:'สัญญานักเตะ',action:"openTransferTab('contract')"},
      {label:'เยาวชน',page:'youth'},
      {label:'Hall of Fame',page:'hof'},
      {label:'Club DNA',page:'clubdna'},
      {label:'ความสัมพันธ์',page:'relations'},
    ]},
    {label:'⚽ เมนูแข่งขัน',items:[
      {label:'แข่งขัน',page:'match'},
      {label:'ตารางแข่งจนจบฤดูกาล',page:'fixtures'},
      {label:'ประวัติการแข่งขัน',page:'history'},
      {label:'สถิติ',page:'stats'},
      {label:'รางวัล',page:'awards'},
    ]},
    {label:'🏢 บริหารสโมสร',items:[
      {label:'กลยุทธ์',page:'tactics'},
      {label:'ซื้อขาย',page:'transfer'},
      {label:'AI สโมสร',page:'aiclubs'},
      {label:'แพ็ค',page:'packs'},
      {label:'สนาม',page:'stadium'},
      {label:'ทีมงาน',page:'staff'},
    ]},
    {label:'🌐 ออนไลน์',page:'online'},
    {label:'🛒 ร้านค้า',page:'shop'},
    {label:'👴 Legacy',page:'legacy'},
  ],
  tutorialSteps: [
    {title:'ยินดีต้อนรับสู่ Superkick FM',body:'เริ่มเกมใหม่ เลือกสโมสร แล้วบริหารทีมของคุณตลอดทั้งฤดูกาล'},
    {title:'จัดทีมก่อนแข่งขัน',body:'เข้า เมนูทีม > นักเตะในทีม และ บริหารสโมสร > กลยุทธ์ เพื่อจัด 11 ตัวจริง แผน และสไตล์การเล่น'},
    {title:'ซื้อขายและพัฒนาทีม',body:'ใช้ตลาดเพื่อซื้อนักเตะ Bronze หรือ Silver ตั้งราคาขายนักเตะ แล้วรอข้อเสนอจากทีมอื่น'},
    {title:'หมุนทีมระหว่างฤดูกาล',body:'ความฟิต อาการเจ็บ และโทษแบนมีผลจริง ระหว่างแข่งสามารถกดเปลี่ยนตัวได้'},
    {title:'เป้าหมายระยะยาว',body:'เล่นให้จบฤดูกาลเพื่อปลดล็อกการเปลี่ยนลีกในหน้า Legacy และสร้างประวัติผู้จัดการของคุณ'},
  ],
  audioDefaults: {
    master:70,
    music:45,
    stadium:45,
    match:70,
  },
};

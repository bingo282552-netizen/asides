// Playable leagues and league strength metadata.
(function(){
  const REPUTATION_LEVELS=['Local','Regional','National','Continental','World Class','Legendary'];
  const LEGACY_LEAGUES_DATA=[
    {id:'EPL',name:'English Premier League',flag:'🏴',prize:'3M'},{id:'LaLiga',name:'La Liga',flag:'🇪🇸',prize:'25M'},
    {id:'Bundesliga',name:'Bundesliga',flag:'🇩🇪',prize:'22M'},{id:'SerieA',name:'Serie A',flag:'🇮🇹',prize:'20M'},
    {id:'Ligue1',name:'Ligue 1',flag:'🇫🇷',prize:'18M'},{id:'ThaiPremier',name:'Thai Premier League',flag:'🇹🇭',prize:'5M'},
    {id:'MLS',name:'MLS',flag:'🇺🇸',prize:'15M'},{id:'JLeague',name:'J.League',flag:'🇯🇵',prize:'12M'},
    {id:'CLeague',name:'Champions League',flag:'🏆',prize:'8M'},
  ];
  const LEAGUE_ROWS=[
    'EPL|🏴|Premier League|อังกฤษ|1|3M|86','SerieA|🇮🇹|Serie A|อิตาลี|2|24M|83','Bundesliga|🇩🇪|Bundesliga|เยอรมนี|3|24M|84','LaLiga|🇪🇸|La Liga|สเปน|4|25M|84','Ligue1|🇫🇷|Ligue 1|ฝรั่งเศส|5|18M|80',
    'Championship|🏴|EFL Championship|อังกฤษ|6|12M|74','Brasileirao|🇧🇷|Brasileirao Serie A|บราซิล|7|13M|76','Primeira|🇵🇹|Primeira Liga|โปรตุเกส|8|15M|77','BelgianPro|🇧🇪|Belgian Pro League|เบลเยียม|9|11M|74','MLS|🇺🇸|Major League Soccer|สหรัฐอเมริกา|10|15M|73',
    'Argentina|🇦🇷|Liga Profesional|อาร์เจนตินา|11|12M|75','Eredivisie|🇳🇱|Eredivisie|เนเธอร์แลนด์|12|14M|76','LigaMX|🇲🇽|Liga MX|เม็กซิโก|13|12M|74','Superligaen|🇩🇰|Superligaen|เดนมาร์ก|14|9M|71','JLeague|🇯🇵|J1 League|ญี่ปุ่น|15|12M|73',
    'Ekstraklasa|🇵🇱|Ekstraklasa|โปแลนด์|16|8M|70','CzechFirst|🇨🇿|Czech First League|เช็ก|17|8M|70','SuperLig|🇹🇷|Super Lig|ตุรกี|18|12M|75','SerieB|🇮🇹|Serie B|อิตาลี|19|8M|70','SwissSL|🇨🇭|Swiss Super League|สวิตเซอร์แลนด์|20|9M|72',
    'Scotland|🏴|Scottish Premiership|สก็อตแลนด์|21|9M|72','GreekSL|🇬🇷|Greek Super League|กรีซ|22|8M|71','HNL|🇭🇷|Prva HNL|โครเอเชีย|23|7M|70','Segunda|🇪🇸|Segunda Division|สเปน|24|8M|70','Bundesliga2|🇩🇪|2. Bundesliga|เยอรมนี|25|8M|70',
    'Austria|🇦🇹|Austrian Bundesliga|ออสเตรีย|26|8M|71','SaudiPro|🇸🇦|Saudi Pro League|ซาอุดีอาระเบีย|27|14M|76','Ecuador|🇪🇨|LigaPro|เอกวาดอร์|28|7M|69','Colombia|🇨🇴|Categoria Primera A|โคลอมเบีย|29|7M|69','Eliteserien|🇳🇴|Eliteserien|นอร์เวย์|30|7M|69',
    'Allsvenskan|🇸🇪|Allsvenskan|สวีเดน|31|7M|69','Ligue2|🇫🇷|Ligue 2|ฝรั่งเศส|32|7M|68','Romania|🇷🇴|Romanian SuperLiga|โรมาเนีย|33|6M|68','Chile|🇨🇱|Primera Division Chile|ชิลี|34|6M|68','KLeague1|🇰🇷|K League 1|เกาหลีใต้|35|8M|71',
    'Israel|🇮🇱|Israeli Premier League|อิสราเอล|36|6M|68','Uruguay|🇺🇾|Primera Division Uruguay|อุรุกวัย|37|6M|68','Paraguay|🇵🇾|Primera Division Paraguay|ปารากวัย|38|6M|67','Cyprus|🇨🇾|Cypriot First Division|ไซปรัส|39|6M|67','Ukraine|🇺🇦|Ukrainian Premier League|ยูเครน|40|8M|71',
    'CzechNL|🇨🇿|National League CFL|เช็ก|41|4M|63','BelgiumB|🇧🇪|Challenger Pro League|เบลเยียม|42|5M|65','BrazilB|🇧🇷|Serie B Brazil|บราซิล|43|6M|67','SouthAfrica|🇿🇦|South African Premier Division|แอฟริกาใต้|44|5M|66','Bulgaria|🇧🇬|Bulgarian First League|บัลแกเรีย|45|5M|66',
    'Hungary|🇭🇺|Nemzeti Bajnoksag I|ฮังการี|46|5M|66','Croatia2|🇭🇷|Prva NL|โครเอเชีย|47|4M|64','Portugal2|🇵🇹|Liga Portugal 2|โปรตุเกส|48|5M|65','Peru|🇵🇪|Liga 1 Peru|เปรู|49|5M|66','Slovakia|🇸🇰|Slovak Super Liga|สโลวาเกีย|50|5M|66',
    'Venezuela|🇻🇪|Primera Division Venezuela|เวเนซุเอลา|51|5M|65','ChinaSL|🇨🇳|Chinese Super League|จีน|52|9M|69','EFL1|🏴|EFL League One|อังกฤษ|53|5M|65','J2|🇯🇵|J2 League|ญี่ปุ่น|54|5M|65','Belarus|🇧🇾|Belarusian Premier League|เบลารุส|55|5M|65',
    'Egypt|🇪🇬|Egyptian Premier League|อียิปต์|56|6M|68','Morocco|🇲🇦|Botola Pro|โมร็อกโก|57|6M|68','Kazakhstan|🇰🇿|Kazakhstan Premier League|คาซัคสถาน|58|5M|65','Finland|🇫🇮|Veikkausliiga|ฟินแลนด์|59|5M|64','Bolivia|🇧🇴|Primera Division Bolivia|โบลิเวีย|60|5M|64',
    'USLC|🇺🇸|USL Championship|สหรัฐอเมริกา|61|5M|64','ThaiPremier|🇹🇭|Thai League 1|ไทย|62|5M|66','Azerbaijan|🇦🇿|Azerbaijan Premier League|อาเซอร์ไบจาน|63|5M|64','Slovenia|🇸🇮|Slovenian PrvaLiga|สโลเวเนีย|64|5M|64','Moldova|🇲🇩|Moldovan Super Liga|มอลโดวา|65|4M|62',
    'Ireland|🇮🇪|LOI Premier Division|ไอร์แลนด์|66|4M|62','SerieC|🇮🇹|Serie C|อิตาลี|67|4M|63','Iran|🇮🇷|Iranian Pro League|อิหร่าน|68|6M|67','NIFL|🇬🇧|NIFL Premiership|ไอร์แลนด์เหนือ|69|4M|61','ALeague|🇦🇺|A-League Men|ออสเตรเลีย|70|6M|66',
    'Tunisia|🇹🇳|Ligue Professionnelle 1|ตูนิเซีย|71|5M|66','CostaRica|🇨🇷|Liga FPD|คอสตาริกา|72|4M|63','Latvia|🇱🇻|Latvian Higher League|ลัตเวีย|73|4M|61','EFL2|🏴|EFL League Two|อังกฤษ|74|4M|61','Iceland|🇮🇸|Besta deild karla|ไอซ์แลนด์|75|4M|61',
    'Albania|🇦🇱|Kategoria Superiore|แอลเบเนีย|76|4M|61','Vietnam|🇻🇳|V.League 1|เวียดนาม|77|4M|62','Uzbekistan|🇺🇿|Uzbekistan Super League|อุซเบกิสถาน|78|5M|65','India|🇮🇳|Indian Super League|อินเดีย|79|5M|63','Honduras|🇭🇳|Liga Nacional Honduras|ฮอนดูรัส|80|4M|61',
    'KLeague2|🇰🇷|K League 2|เกาหลีใต้|81|4M|62','Malaysia|🇲🇾|Malaysia Super League|มาเลเซีย|82|4M|61','Guatemala|🇬🇹|Liga Nacional Guatemala|กัวเตมาลา|83|4M|60','UAE|🇦🇪|UAE Pro League|สหรัฐอาหรับเอมิเรตส์|84|8M|69','Georgia|🇬🇪|Erovnuli Liga|จอร์เจีย|85|4M|60',
    'Lithuania|🇱🇹|A Lyga|ลิทัวเนีย|86|3M|59','Luxembourg|🇱🇺|National Division Luxembourg|ลักเซมเบิร์ก|87|3M|58','Estonia|🇪🇪|Meistriliiga|เอสโตเนีย|88|3M|58','Qatar|🇶🇦|Qatar Stars League|กาตาร์|89|8M|69','ElSalvador|🇸🇻|Primera Division El Salvador|เอลซัลวาดอร์|90|3M|58',
    'Indonesia|🇮🇩|Liga 1 Indonesia|อินโดนีเซีย|91|4M|61','Malta|🇲🇹|Maltese Premier League|มอลตา|92|3M|57','Armenia|🇦🇲|Armenian Premier League|อาร์เมเนีย|93|3M|58','Wales|🏴|Cymru Premier|เวลส์|94|3M|57','Faroe|🇫🇴|Faroe Islands Premier League|หมู่เกาะแฟโร|95|3M|56',
    'Singapore|🇸🇬|Singapore Premier League|สิงคโปร์|96|3M|58','Bahrain|🇧🇭|Bahrain Premier League|บาห์เรน|97|3M|58','Peru2|🇵🇪|Liga 2 Peru|เปรู|98|3M|57','CLeague|🏆|Champions League|ยุโรป|99|8M|90',
  ];
  const scaledPrizeLabel=prize=>{
    const match=String(prize).match(/^(\d+(?:\.\d+)?)M$/);
    if(!match)return prize;
    const scaled=Number(match[1])/10;
    return `${scaled%1?scaled.toFixed(1):scaled}M`;
  };
  const LEAGUES_DATA=LEAGUE_ROWS.map(row=>{
    const [id,flag,name,country,rank,prizeRaw,base]=row.split('|');
    const prize=id==='EPL'&&prizeRaw==='3M'?'30M':id==='CLeague'&&prizeRaw==='8M'?'80M':prizeRaw;
    return {id,flag,name,country,rank:+rank,prize:scaledPrizeLabel(prize),base:+base};
  });
  window.SUPERKICK_LEAGUE_CATALOG={REPUTATION_LEVELS,LEGACY_LEAGUES_DATA,LEAGUE_ROWS,LEAGUES_DATA};
})();

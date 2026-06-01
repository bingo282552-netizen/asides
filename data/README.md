# Superkick FM Data

- `players.js`: หมวดกติกานักเตะ เช่น อาการเจ็บและโทษแบน
- `clubs.js`: หมวดสโมสร ข่าวใหญ่ การบาลานซ์ AI และ AI ออนไลน์
- `player-catalog.js`: ชื่อ ตำแหน่ง บุคลิก traits และการ์ดนักเตะจริง
- `tactics.js`: รูปแบบแผนการเล่นและตำแหน่งบนสนาม
- `economy.js`: เงินเริ่มต้น สนาม สปอนเซอร์ ราคาแพ็ก ตลาด และร้านค้า
- `leagues.js`: รายการลีก อันดับลีก และค่าพื้นฐานของลีก
- `club-catalog.js`: รายชื่อสโมสร ตำนานทีม AI และชุดนักเตะของทีมใหญ่
- `simulation.js`: Club DNA เจ้าของทีม สภาพอากาศ กรรมการ และค่าหน้าเริ่มเกม
- `game-config.js`: รวมคอนฟิกเมนู tutorial และเสียง
- `deployment-config.js`: URL ของ backend สำหรับ production ถ้าปล่อยว่างจะใช้โหมด GitHub Pages
- `services.js`: เลือก browser mode หรือ online backend และตั้ง payment checkout โดยห้ามใส่ private key ฝั่ง browser
- `player-accounts.js`: schema, local account store, โปรไฟล์ล่าสุด และเซฟแยกตามไอดีผู้เล่น
- รหัสผ่านเก็บเป็น hash เท่านั้น ไม่บันทึกรหัสผ่านจริงลงไฟล์

## Experience Modules

- `../features/core.js`: helper กลางและค่า state เริ่มต้นของโมดูลเสริม
- `../features/theme.js`: CSS เสริมและกราฟิก
- `../features/navigation.js`: เมนูหลักและเมนูย่อย
- `../features/auth-ui.js`: หน้าสมัครไอดี เข้าสู่ระบบ และข้อมูลผู้เล่น
- `../features/tutorial.js`: ระบบสอนเล่น
- `../features/audio-settings.js`: เสียงและหน้าตั้งค่าเสียง
- `../features/match-tools.js`: ตารางแข่ง ประวัติแมตช์ และเปลี่ยนตัว
- `../features/online-world.js`: AI ออนไลน์ 100 คนและข่าวโลกเกม
- `../features/legacy-settings.js`: หน้า Legacy, Superkick ID และเปลี่ยนลีก
- `../features/boot.js`: โหลดโมดูลและเชื่อมเข้ากับ engine ตามลำดับ

## Game Engine

- `../engine/core.js`: state หลัก helper ระบบเซฟ และการเปลี่ยนหน้า
- `../engine/players.js`: สร้างนักเตะ พัฒนา เคมีทีม และค่าความแข็งแกร่ง
- `../engine/world.js`: เริ่มเกม ฐานข้อมูลโลก สโมสร AI และตารางลีก
- `../engine/team-ui.js`: HUD หน้าหลัก นักเตะในทีม และจัดแผน
- `../engine/match-engine.js`: แข่งขันสด Dashboard, แก้เกมพักครึ่ง, จุดโทษ, ต่อเวลา, บอลถ้วย, FFP และการประเมินจากบอร์ด
- `../engine/transfers.js`: ตลาดซื้อขาย ข้อเสนอออนไลน์ และสโมสร AI
- `../engine/club-management.js`: ทีมงาน แพ็ก สนาม สถิติ เยาวชน HOF และลีก
- `../engine/world-systems.js`: Club DNA ความสัมพันธ์ Wonderkid สภาพอากาศ และรางวัล
- `../engine/online.js`: Ranked, Friendly, Online Market และ Tournament
- `../engine/shop.js`: ร้านค้า coin packs, Squad Slot และ payment checkout adapter
- `../engine/legacy.js`: Legacy, dynamic potential และจบฤดูกาล
- `../engine/landing.js`: หน้าแรก สร้างเกมใหม่ และโหลดเกม

ไฟล์ HTML เป็นโครงหน้าและเรียก script ตามลำดับ จึงยังเปิดเล่นแบบ local file หรือ GitHub Pages ได้ทันที

## Online And Payments

- GitHub Pages สมัครไอดีและเซฟใน browser ได้ทันที แต่ข้อมูลจะไม่ sync ข้ามอุปกรณ์
- ออนไลน์จริงต้องใส่ URL ของ backend ใน `deployment-config.js`
- เติมเงินจริงต้องตั้ง `payments.enabled`, `payments.provider` และ `payments.checkoutEndpoint`
- backend ต้องเป็นผู้ยืนยัน webhook และเพิ่ม Coins หลังรับเงินสำเร็จเท่านั้น ห้ามเพิ่ม Coins จาก browser และห้ามเก็บ secret key ในไฟล์ JavaScript

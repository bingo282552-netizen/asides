# FM KICK

เกมเปิดเล่นได้สองโหมด:

## GitHub Pages

อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น GitHub แล้วเปิด Pages จาก branch หลักได้ทันที

- สมัครไอดีใหม่และเซฟเกมได้ใน browser ผ่าน `localStorage`
- ไม่ต้องใช้ `server.py`
- ไอดีและเซฟจะอยู่เฉพาะ browser และอุปกรณ์ที่สมัคร
- Ranked, Friendly และตลาดออนไลน์จะจำลองในเครื่อง
- ห้องเล่นกับเพื่อนข้ามอุปกรณ์ต้องมี backend แยกต่างหาก
- Inventory ใช้งานได้ปกติ แต่ Admin Mode จะเห็นเฉพาะบัญชีที่อยู่ใน browser นั้น

อย่าอัปโหลดไฟล์ `data/online-db*.json` เพราะมีข้อมูลบัญชีและ session ของผู้เล่น

## Backend Mode

ถ้าต้องการบัญชีร่วมกันหลายอุปกรณ์และห้องเล่นกับเพื่อน:

1. รัน `python3 server.py` บนเครื่องหรือบริการ hosting ที่รัน Python ได้
2. ใส่ URL ของ backend ใน `data/deployment-config.js`
3. อัปโหลดไฟล์เว็บขึ้น GitHub Pages อีกครั้ง

ตัวอย่าง:

```js
window.SUPERKICK_DEPLOYMENT_CONFIG = {
  backendOrigin: 'https://api.example.com',
};
```

ฐานข้อมูลของ `server.py` จะถูกเก็บนอก repository ที่ `~/.fm-kick/online-db.json`
หรือกำหนดตำแหน่งเองด้วย environment variable `SUPERKICK_DB_PATH`

Admin Mode อยู่ท้ายหน้า Legacy ใช้สำหรับจัดการผู้เล่นในฐานข้อมูล backend ทั้งหมด
เช่น แบน เสกเงิน/Coins ให้นักเตะ เปลี่ยนเลขไอดี และส่งแพ็คเข้า Inventory

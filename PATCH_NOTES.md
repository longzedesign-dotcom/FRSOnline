# 🚀 บันทึกการเปลี่ยนแปลงและประวัติการพัฒนา (Patch Notes)
### FRS : Facility Repair System (ระบบแจ้งซ่อมบำรุงออนไลน์)
**Developer: LongZe Design**

เอกสารนี้รวบรวมประวัติการอัปเดต ฟีเจอร์ใหม่ การแก้ไขข้อผิดพลาด (Bug Fixes) และการพัฒนาขีดความสามารถของระบบ FRS ทุกเวอร์ชัน

---

## [V2.4.0] — 2026-11-16 (Mobile Full Option Release) 📱🌟

### 🌟 ฟีเจอร์ใหม่ระดับ Mobile-First Experience
- **Mobile Bottom Navigation Bar:** ออกแบบแถบเมนูล่างจอแบบ Floating Glassmorphism รองรับ Safe Area Insets (`env(safe-area-inset-bottom)`) สำหรับ iPhone (Dynamic Island / Notch) และ Android
- **Haptic Vibration Feedback Engine:** ผสานการทำงานร่วมกับ Web Vibration API (`navigator.vibrate`) ให้การสัมผัสสลับแท็บและแตะปุ่มมีความรู้สึกเสมือน Native App
- **Real-Time Notification Badge:** ป้ายแจ้งเตือนตัวเลขงานคงค้างบนไอคอนคิวงาน (My Requests) บนแถบ Bottom Bar อัปเดตอัตโนมัติ
- **Dual-Action Camera Upload:**
  - เพิ่มปุ่ม "ถ่ายรูปทันที" เรียกเปิดกล้องหลังมือถือโดยตรงด้วย `capture="environment"`
  - เพิ่มปุ่ม "เลือกจากเครื่อง" สำหรับอัปโหลดภาพจากแกลเลอรี
  - ระบบ Client Canvas Compression บีบอัดรูปภาพลงเหลือต่ำกว่า 2MB ก่อนส่งเข้า Google Drive อัตโนมัติ ประหยัดเน็ตมือถือและรวดเร็ว
- **Quick Status Filter Chips:** แถบชิปเลื่อนแนวนอน (Horizontal Scrollable Filter Chips) คัดกรองงานตามสถานะ 8 กลุ่มด้วยนิ้วโป้งเดียว
- **Direct Phone Call Action:** เพิ่มปุ่มสีเขียว "โทรออก" (`tel:`) ข้างเบอร์โทรศัพท์ผู้แจ้งซ่อม แตะเพื่อโทรออกหาผู้แจ้งได้ทันที
- **Responsive Thumbnail Gallery & Fullscreen Photo Viewer:** แสดงภาพถ่ายแจ้งซ่อมและผลงานซ่อมเป็น Thumbnail Card แตะเปิดดูภาพขนาดเต็มจอ (Lightbox) พร้อมคำบรรยาย
- **Mobile Bottom Sheet Modal:** หน้าต่างรายละเอียดและพรีวิวปรับเป็น Bottom Sheet เลื่อนขึ้นจากขอบล่างจอ พร้อมแถบจับปัดด้านบน (Grab Handle Bar)

### 🎨 การปรับปรุงการออกแบบ (UI/UX)
- เพิ่ม Meta Tags มาตรฐาน PWA (`apple-mobile-web-app-status-bar-style: black-translucent`, `mobile-web-app-capable: yes`, `format-detection: telephone=no`)
- ป้องกัน Double-tap Zoom บน iOS Safari ด้วย `touch-action: manipulation`
- รองรับธีม Dark & Light Mode สมบูรณ์แบบทุกหน้าจอ

### 📚 การยกระดับเอกสารมาตรฐาน GitHub (ITSD Standard)
- ปรับโครงสร้าง `README.md` เป็นมาตรฐานเดียวกับระบบ ITSD พร้อมชุด Badges, ลิงก์ทรัพยากร, ผังสถาปัตยกรรม Mermaid และตารางข้อมูล
- เพิ่มเอกสารคู่มือครบชุด: `INSTALL_GUIDE.md`, `DATA_DIAGRAM_AND_WORKFLOW.md`, `MANUAL_USER.md` และ `PATCH_NOTES.md`

---

## [V2.3.05] — 2026-11-09 (Infrastructure Modernization & Clasp Migration)
- ย้ายฐานข้อมูลไปยัง Google Sheets ใหม่ `DBS_FRS` (Spreadsheet ID: `1eI2xZjGpmKHhhpl3TIucxFbSe_aXzy3am2H-KieQjCk`)
- สร้างโฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์อัปโหลด `FRS_Uploads` (Folder ID: `1bxDK2QLZW_ySZKRfuMZvBuEDHELL9W0j`)
- Deploy Google Apps Script ตัวใหม่ผ่าน Clasp CLI
- เริ่มต้น Git Repository และ Push โครงการขึ้น GitHub `longzedesign-dotcom/FRSOnline`

---

## [V2.0.2] — 2026-10-02 (Social Login & Self-Registration Suite)
- เพิ่มระบบยืนยันตัวตนผ่าน Google OAuth 2.0 และ LINE Login
- เพิ่มตาราง `USER_IDENTITIES`, `REGISTRATION_REQUESTS` และ `OAUTH_STATE_STORE`
- ระบบตรวจสอบและอนุมัติการสมัครสมาชิกใหม่โดยผู้ดูแลระบบ
- ปรับระบบ Password Hash เป็น PBKDF2 Salted SHA-256 (5,000 Rounds)

---

## [V2.0.0] — 2026-09-15 (Workflow Engine & SLA Analytics)
- พัฒนา Workflow Engine สถานะงานซ่อม 9 ระดับ (NEW, RECEIVED, ASSIGNED, IN_PROGRESS, WAITING_PART, OUTSOURCE, DONE, CLOSED, CANCELLED)
- ระบบคำนวณระยะเวลาดำเนินงานและผลการประเมิน SLA อัตโนมัติ
- บันทึกประวัติไทม์ไลน์ในตาราง `REQUEST_STATUS_LOG`
- เพิ่มหน้าจอ Dashboard KPI, สรุปผลการซ่อม และฟังก์ชัน Export CSV

---

## [V1.1.0] — 2026-08-01 (Initial Prototype)
- ระบบแจ้งซ่อมพื้นฐานบน Google Apps Script และ Google Sheets
- จัดเก็บข้อมูลคำขอและการแนบรูปภาพพื้นฐาน

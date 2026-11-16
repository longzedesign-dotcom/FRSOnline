# 🚀 บันทึกการเปลี่ยนแปลงและประวัติการพัฒนา (Patch Notes)
### FRS : Facility Repair System (ระบบแจ้งซ่อมบำรุงออนไลน์)
**Developer: LongZe Design**

เอกสารนี้รวบรวมประวัติการอัปเดต ฟีเจอร์ใหม่ การแก้ไขข้อผิดพลาด (Bug Fixes) และการพัฒนาขีดความสามารถของระบบ FRS ทุกเวอร์ชัน

---

## [V2.3.06 Mobile Full Option] — 2026-11-16 🛠️⚙️ (ITSD Release Standard)

### 🎛️ ระบบจัดการข้อมูลหลักส่วนงาน Admin (Admin Master Data Management)
- **ระบบ CRUD ครบวงจร:** ผู้ดูแลระบบ (ADMIN) สามารถเพิ่ม แก้ไข และลบข้อมูลหลักได้ครบ 5 หมวดหมู่:
  1. ระบบ/อุปกรณ์ (`MASTER_SYSTEMS`)
  2. สถานที่ (`MASTER_LOCATIONS`)
  3. ฝ่าย/แผนก (`MASTER_DEPARTMENTS`)
  4. ระดับความเร่งด่วน / SLA (`MASTER_PRIORITY_SLA`)
  5. สถานะงาน (`MASTER_STATUS`)
- **สวิตช์ Toggle Slide เปิด/ปิดสถานะ:** ปรับเปลี่ยนปุ่มสถานะการใช้งานเป็นสวิตช์สไลด์แบบ Toggle Slide Switch Interactive เปลี่ยนสถานะใช้งาน/ปิดใช้งานได้ทันทีแบบ Real-time
- **ระบบรันรหัสอัตโนมัติ (Auto-increment Sequential IDs):**
  - **ฝ่าย/แผนก (`DEPARTMENT_ID`):** ตรวจสอบรหัสสูงสุดและสร้างรหัสต่อเนื่องให้อัตโนมัติในรูปแบบ `DEP-001`, `DEP-002`, ...
  - **สถานที่ (`LOCATION_ID`):** ตรวจสอบรหัสสูงสุดและสร้างรหัสต่อเนื่องให้อัตโนมัติในรูปแบบ `LOC-001`, `LOC-002`, ... พร้อมสร้างรหัสอ้างอิง QR Code `FRS-QR-LOC-xxx` ให้อัตโนมัติ
  - หน้าต่าง Modal แสดงรหัสแบบ Readonly พร้อมป้ายกำกับ "รันอัตโนมัติ" ป้องกันการกรอกผิดพลาด

### ⏱️ ยกระดับมาตรฐาน SLA ด้านอาคารสถานที่สู่สากล (International Facility SLA Standard)
- ปรับโครงสร้างเกณฑ์เวลาตามมาตรฐาน Facility & Property Management ระดับสากล:
  - `EMERGENCY`: วิกฤต / ฉุกเฉิน (SLA 4 ชม.) — อันตรายต่อชีวิตและทรัพย์สิน
  - `URGENT`: เร่งด่วนมาก (SLA 12 ชม.) — อุปกรณ์หลักหยุดชะงัก ไม่มีตัวสำรอง
  - `HIGH`: เร่งด่วน (SLA 24 ชม.) — กระทบประสิทธิภาพการทำงานในวงกว้าง
  - `NORMAL`: ปกติ (SLA 72 ชม. / 3 วัน) — การชำรุดทั่วไป ไม่ส่งผลกระทบเร่งด่วน
  - `LOW`: ต่ำ (SLA 168 ชม. / 7 วัน) — งานปรับปรุงเล็กน้อย เชิงรูปลักษณ์
  - `PLANNED`: วางแผนล่วงหน้า (SLA 720 ชม. / 30 วัน) — งานบำรุงรักษาเชิงป้องกันตามรอบ (PM)

### 🔄 ปรับปรุงข้อความสถานะงาน 9 สถานะ (Webapp Maintenance Standard)
- ปรับข้อความสถานะภาษาไทยให้กระชับ ชัดเจน เข้าใจง่ายตามหลัก Webapp แจ้งซ่อม:
  1. `NEW` = "แจ้งเรื่องใหม่" (เดิม "รอรับเรื่อง")
  2. `ASSIGNED` = "มอบหมายงานแล้ว"
  3. `ACCEPTED` = "ช่างรับงานแล้ว"
  4. `IN_PROGRESS` = "กำลังดำเนินการ"
  5. `PENDING_SPARE` = "รออะไหล่/อุปกรณ์"
  6. `WAITING_USER` = "รอข้อมูลผู้แจ้ง"
  7. `DONE` = "ซ่อมเสร็จสิ้น"
  8. `CLOSED` = "ปิดงานสมบูรณ์"
  9. `CANCELLED` = "ยกเลิกใบแจ้ง"

### 📱 การปรับแต่งประสบการณ์ Mobile & Desktop
- ปรับซ่อนปุ่ม `+ แจ้งซ่อมใหม่` บริเวณกลางจอบนอุปกรณ์เคลื่อนที่ (Mobile View) เพื่อความสบายตา โดยให้ใช้งานผ่าน Bottom Navigation Bar ด้านล่างแทนอย่างลื่นไหล
- คงปุ่ม `+ แจ้งซ่อมใหม่` ไว้อย่างชัดเจนบนหน้าจอ Desktop
- ปรับขนาดตัวหนังสือ (Typography Hierarchy) ให้มีขนาดพอดีและสัดส่วนสมดุลทั่วทั้งระบบ

---

## [V2.3.05 Mobile Full Option] — 2026-11-16 📱🌟

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
- เพิ่มเอกสารคู่มือครบชุด: `INSTALL_GUIDE.md`, `DATA_DIAGRAM_AND_WORKFLOW.md`, `MANUAL_USER.md` และ `PATCH_NOTES.md` (Version FRS V2.3.05 Mobile Full Option)

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

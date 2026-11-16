# 🚀 บันทึกการเปลี่ยนแปลงและประวัติการพัฒนา (Patch Notes)
### FRS : Facility Repair System (ระบบแจ้งซ่อมบำรุงออนไลน์)
**Developer: LongZe Design**

เอกสารนี้รวบรวมประวัติการอัปเดต ฟีเจอร์ใหม่ การแก้ไขข้อผิดพลาด (Bug Fixes) และการพัฒนาขีดความสามารถของระบบ FRS ทุกเวอร์ชัน

---

## [V2.3.10 Mobile & Desktop Dual Enhancement] — 2026-11-16 🚀💻📱 (ITSD Release Standard)

### 🎨 ปรับปรุงการแสดงผลสถานะงาน 9 สถานะ (Status Badges Completeness)
- **สีประจำสถานะงาน 9 ระดับตามมาตรฐานสากล:**
  - `NEW_SUBMITTED` (แจ้งเรื่องใหม่): สีเหลืองอำพัน (Amber `#fef3c7 / #92400e`)
  - `ASSIGNED` (มอบหมายงานแล้ว): สีฟ้าสดใส (Sky Blue `#e0f2fe / #0369a1`)
  - `IN_PROGRESS` (กำลังดำเนินการ): สีน้ำเงินหลัก (Blue `#dbeafe / #1d4ed8`)
  - `WAITING_PARTS` (รออะไหล่): สีส้ม (Orange `#ffedd5 / #9a3412`)
  - `PENDING_EXTERNAL` (รอช่างภายนอก): สีม่วง (Purple `#f3e8ff / #6b21a8`)
  - `RESOLVED` (ซ่อมเสร็จสิ้น): สีเขียวมรกต (Emerald `#d1fae5 / #065f46`)
  - `USER_ACCEPTED` (ตรวจรับงานแล้ว): สีเขียวเข้ม (Teal Green `#dcfce7 / #166534`)
  - `CANCELLED` (ยกเลิกงาน): สีเทากลาง (Slate `#f1f5f9 / #475569`)
  - `REJECTED` (ปฏิเสธ/ไม่อนุมัติ): สีกุหลาบ/แดง (Rose `#ffe4e6 / #9f1239`)
- **รองรับ Dark Mode & Light Mode 100%:** มีตัวปรับคอนทราสต์ในโหมดมืดให้อ่านง่าย สบายตา ถูกต้องตามมาตรฐาน WCAG 2.2

### 💻 ฟีเจอร์ยกระดับสำหรับ Desktop (Desktop Power User Features)
- **วางรูปภาพจาก Clipboard ได้ทันที (`Ctrl + V` / `Cmd + V`):** เมื่อกด Print Screen (`Win + Shift + S` หรือ `Cmd + Shift + 4`) สามารถกดวางรูปในหน้าฟอร์มแจ้งซ่อมได้ทันทีโดยไม่ต้องบันทึกลงเครื่อง
- **ลากและวางรูปภาพ (Drag & Drop):** รองรับการลากไฟล์รูปภาพจากโฟลเดอร์มาหย่อนลงในพื้นที่แนบรูปภาพ
- **คีย์ลัด `Escape` อัจฉริยะ:** กดปุ่ม `Escape` บนคีย์บอร์ดเพื่อปิดหน้าต่าง Modal, Drawer, Image Viewer และ Dialog ทุกประเภทตามลำดับชั้นอย่างถูกต้อง
- **ระบบสั่งพิมพ์ใบงานมาตรฐาน (`@media print`):** เพิ่มปุ่ม "พิมพ์ใบงาน" ในหน้าต่างรายละเอียดงาน ซ่อนเมนูและปุ่มที่ไม่จำเป็น และจัดรูปแบบเป็นเอกสาร A4 พร้อมช่องลงชื่อ (ผู้แจ้งซ่อม, ช่างผู้ปฏิบัติงาน, ผู้ตรวจรับงาน) สำหรับติดบอร์ดหรือเป็นหลักฐานเอกสาร
- **Title Notification Badge:** แสดงจำนวนงานที่ต้องติดตามบนแท็บเบราว์เซอร์อัตโนมัติ เช่น `(2) FRS : Facility Repair System`

### 📱 ฟีเจอร์ยกระดับสำหรับ Mobile (Mobile Resilience & Reliability)
- **ระบบ Auto-Save Draft ป้องกันข้อมูลสูญหาย:** บันทึกข้อความและตัวเลือกที่กำลังพิมพ์ลงใน `localStorage` อัตโนมัติ หากสายเข้าหรือแอปโหลดใหม่ ข้อความจะถูกกู้คืนกลับมาทันทีพร้อมปุ่มล้างร่าง
- **ระบบตรวจจับสถานะอินเทอร์เน็ต (Offline/Online Banner):** แสดงแถบแจ้งเตือนเมื่อสัญญาณขาดหายในจุดอับสัญญาณ (ชั้นใต้ดิน/ห้องเครื่อง) และแจ้งเตือนเมื่อกลับมาออนไลน์
- **Haptic Touch Feedback:** สั่นเบาๆ ให้สัมผัสเสมือน Native App เมื่อแตะเมนู Bottom Nav หรือส่งงานสำเร็จ

---

## [V2.3.09 Mobile Full Option] — 2026-11-16 📱✨ (ITSD Release Standard)

### 🔑 ปรับปรุงปุ่มเข้าสู่ระบบ LINE & Google สไตล์ Time Stamp Attendance
- **ปุ่ม Sign-In สไตล์โมเดิร์น พร้อม Official Vector Icons:**
  - เพิ่มปุ่มเข้าสู่ระบบด้วย **LINE** (สีเขียวทางการ `#06C755`, ไอคอน Speech Bubble Vector ชัดเจน)
  - เพิ่มปุ่มเข้าสู่ระบบด้วย **Google** (การ์ดพื้นหลังสีขาว กรอบบางเงาละมุน พร้อมไอคอน 4 สีทางการ Google 'G' Vector)
  - ปรับดีไซน์ตามมาตรฐานระบบ Time Stamp / Attendance บันทึกเวลาทำงานชั้นนำ
- **แสดงปุ่มเสมอ พร้อมระบบแนะนำการตั้งค่า (Graceful Fallback & Setup Guide):**
  - แสดงปุ่มเข้าสู่ระบบและสมัครสมาชิกด้วย LINE / Google บนหน้าจอตลอดเวลา
  - เมื่อผู้ใช้งานคลิกปุ่ม หากระบบยังไม่ได้ระบุ `GOOGLE_CLIENT_ID` หรือ `LINE_CHANNEL_ID` ใน Script Properties ระบบจะแสดงกล่องข้อความแจ้งเตือนคำแนะนำที่เป็นมิตร ไม่เกิดข้อผิดพลาดค้าง
- **รองรับการระบุ Username หรือ รหัสพนักงาน:**
  - ปรับข้อความ Label และ Placeholder ช่องระบุตัวตนเป็น `Username หรือ รหัสพนักงาน` ชัดเจน เข้าใจง่าย

### 🐛 แก้ไขข้อผิดพลาด (Bug Fixes)
- **แก้ไขข้อผิดพลาด `this.formatThaiPhone is not a function`:**
  - สร้าง Alias Method `formatThaiPhone(value)` บน App Controller เชื่อมโยงกับฟังก์ชันจัดรูปแบบเบอร์โทรศัพท์ไทย `formatThaiPhoneDisplay(value)` เพื่อป้องกันข้อผิดพลาดเวลาเรนเดอร์ข้อมูลโปรไฟล์ผู้ใช้งาน

---

## [V2.3.08 Mobile Full Option] — 2026-11-16 👤✨ (ITSD Release Standard)

### 👤 ระบบจัดการและอัปเดตข้อมูลส่วนตัว (User Profile Management)
- **คลิกเพื่อแก้ไขข้อมูลส่วนตัว (Click-to-Edit Profile):**
  - เพิ่มปุ่ม "แก้ไขข้อมูลส่วนตัว" บนการ์ดโปรไฟล์ในหน้าแท็บ "บัญชีของฉัน"
  - รองรับการแตะเพื่อเปิดหน้าต่าง Modal/Bottom Sheet แก้ไขข้อมูลส่วนบุคคลได้ทันที
  - สามารถอัปเดต **ชื่อ-นามสกุล (`FULL_NAME`)**, **อีเมล (`EMAIL`)**, **เบอร์โทรศัพท์ (`PHONE`)**, **ฝ่าย/สำนัก (`DIVISION`)**, **แผนก/ส่วนงาน (`DEPARTMENT`)**, **ตำแหน่ง (`POSITION`)** และ **รหัสพนักงาน (`EMPLOYEE_ID`)**
  - ตัวเลือกฝ่าย/แผนกเชื่อมโยงกับฐานข้อมูล `MASTER_DEPARTMENTS` โดยตรง
  - มีระบบตรวจสอบความถูกต้องของเบอร์โทรศัพท์ไทย (9-10 หลัก) และอีเมลก่อนบันทึก
- **อัปเดตแบบ Real-Time ข้ามระบบ:** เมื่อบันทึกสำเร็จ ระบบจะปรับปรุงชื่อผู้ใช้บน Header, เมนู Sidebar, และข้อความทักทายหน้าแรกทันทีโดยไม่ต้องโหลดหน้าเว็บใหม่
- **ระบบ Auto-Prefill ฟอร์มแจ้งซ่อม:** ดึงเบอร์โทรศัพท์และข้อมูลสังกัดจากโปรไฟล์ของผู้ใช้งานไปลงในฟอร์มแจ้งซ่อมให้อัตโนมัติ เพิ่มความสะดวกและติดตามงานได้ง่ายขึ้น

### 🔐 ยกระดับระบบ Multi-Provider Authentication (รหัสพนักงาน, LINE, Google)
- **รองรับการเข้าสู่ระบบด้วยรหัสพนักงาน:** ช่องทาง Login สามารถใช้ได้ทั้ง `USERNAME` หรือ `EMPLOYEE_ID` ควบคู่กับรหัสผ่านเดิม
- **เชื่อมโยง Multi-Identities ครบวงจร:** รองรับการผูกบัญชี Google และ LINE Login เพิ่มเติมจากหน้าโปรไฟล์ เพื่อความสะดวกในการรับการแจ้งเตือนและการเข้าสู่ระบบในอนาคต

---

## [V2.3.07 Mobile Full Option] — 2026-11-16 🎯📋 (ITSD Release Standard)

### 📋 ปรับปรุงฟอร์มแจ้งซ่อมใหม่ (New Request Form Optimization)
- **ปรับเป็น Dropdown List ล้วนตามรายการในระบบ:**
  - **ระบบ/อุปกรณ์ (`SYSTEM_CODE`):** ตัดช่องค้นหาด้านบนออก เหลือเฉพาะกล่องตัวเลือก Dropdown List แสดงรายการระบบ/อุปกรณ์ที่เปิดใช้งานในระบบ
  - **สถานที่ (`LOCATION_ID`):** ตัดช่องค้นหาด้านบนออก เหลือเฉพาะกล่องตัวเลือก Dropdown List แสดงรายชื่อสถานที่เต็ม (อาคาร/ชั้น/ห้อง) ที่เปิดใช้งาน
  - **ความเร่งด่วน (`PRIORITY_CODE`):** กล่องตัวเลือก Dropdown List ตามเกณฑ์ระดับความเร่งด่วนและ SLA สากล
- **ปรับลดความซ้ำซ้อนของ UI (Streamlined UX):** ลดความยาวของหน้าจอแบบฟอร์มบนมือถือ ทำให้กรอกข้อมูลได้รวดเร็วขึ้น แตะเลือกจากตัวเลือกได้ทันทีโดยไม่ต้องพิมพ์ค้นหาซ้ำซ้อน

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

# FRS Online (Facility Repair System) 📱🔧
> **ระบบบริหารจัดการและแจ้งซ่อมบำรุงออนไลน์ (Mobile Full Option)**  
> พัฒนาด้วย Google Apps Script + Google Sheets + Google Drive พร้อมอินเทอร์เฟซ Mobile-First เต็มรูปแบบ

---

## 🌟 คุณสมบัติเด่นในโหมด Mobile Full Option

1. **Mobile Bottom Navigation & Safe Area Insets**
   - แถบเมนูด้านล่างแบบลอย (Bottom Navigation Bar) รองรับติ่งหน้าจอ iPhone (Notch / Dynamic Island) และปุ่มควบคุม Android ด้วย `env(safe-area-inset-bottom)`
   - ระบบสั่นตอบสนองแบบ Haptic Vibration Feedback เมื่อแตะสลับแท็บ
   - แจ้งเตือนตัวเลขงานคงค้างแบบ Real-time ด้วย Badge Counter บนปุ่มคิวงาน

2. **ระบบกล้องและคลังภาพมือถือแบบ Dual-Action**
   - ปุ่มเลือก **"ถ่ายรูปทันที"** เปิดกล้องหลังมือถืออัตโนมัติ (`capture="environment"`)
   - ปุ่มเลือก **"เลือกจากเครื่อง"** สำหรับเลือกรูปภาพที่มีอยู่แล้วใน Photo Gallery
   - บีบอัดรูปภาพอัตโนมัติบนอุปกรณ์ผู้ใช้ (Canvas Compression) ก่อนอัปโหลด ประหยัดแบนด์วิดท์มือถือและรวดเร็ว

3. **Quick Status Filter Chips (แถบชิปฟิลเตอร์สถานะแบบเลื่อนได้)**
   - แถบปุ่มชิปเลือกสถานะงานแนวนอน (All, รอรับเรื่อง, รับเรื่องแล้ว, มอบหมายช่าง, กำลังดำเนินการ, รออะไหล่, เสร็จสิ้น, ปิดงาน) ปัดเลื่อนและแตะเลือกได้ด้วยนิ้วโป้งเดียว

4. **Direct Call Action & Image Viewer**
   - ปุ่มกดโทรด่วนหาผู้แจ้งซ่อม (`tel:`) ด้วยสีเขียวสดใส แตะทีเดียวเปิดแอปโทรศัพท์บนมือถือทันที
   - แกลเลอรีรูปภาพหน้างานแบบ Responsive Thumbnails แตะเพื่อดูภาพขนาดเต็ม (Fullscreen Photo Viewer) ภายในแอป

5. **Mobile Bottom Sheet Modal**
   - หน้าต่างแสดงรายละเอียดและแบบฟอร์มตรวจสอบจะเลื่อนขึ้นมาจากขอบล่าง (Bottom Sheet) พร้อมแถบจับปัดด้านบน (Grab Handle Bar) ใช้งานสะดวกบนหน้าจอมือถือ

---

## 🏗️ โครงสร้างและการเชื่อมต่อทรัพยากร (Resource Endpoints)

| ทรัพยากร | รายละเอียด / ลิงก์ |
|---|---|
| **Google Drive Folder** | [FRS Online Folder](https://drive.google.com/drive/folders/1frevFQIOXmW5BMOkHWz02IcI2L4QW_0A) |
| **Google Spreadsheet (Database)** | [DBS_FRS (Spreadsheet)](https://docs.google.com/spreadsheets/d/1eI2xZjGpmKHhhpl3TIucxFbSe_aXzy3am2H-KieQjCk/edit) |
| **Google Apps Script** | [FRSOnline Script Project](https://script.google.com/home/projects/1r67OX6cinXQJjCJKC39ZKutrYodlhxQ60gPb9rZ27M1mJ_HzWfOzPmfW/edit) |
| **Web App URL** | [เปิดใช้งานเว็บแอปพลิเคชัน](https://script.google.com/macros/s/AKfycbwGnIi6IsVMMDoymjWtDmgzGbN9TrH22es0RObGT0AJrHDw2UTJOMNfbbLz2dwXlulO/exec) |
| **GitHub Repository** | [longzedesign-dotcom/FRSOnline](https://github.com/longzedesign-dotcom/FRSOnline) |

---

## 🗄️ โครงสร้างฐานข้อมูล Google Sheets (DBS_FRS)

ระบบประกอบด้วย 13 แผ่นงาน (Sheets) ได้แก่:
1. `USERS` - บัญชีผู้ใช้งาน ข้อมูลประจำตัว และรหัสผ่านแฮช (PBKDF2/SHA-256)
2. `USER_IDENTITIES` - บัญชีเข้าสู่ระบบที่เชื่อมโยง (Password, Google OAuth, LINE Login)
3. `REGISTRATION_REQUESTS` - รายการขอสมัครสมาชิกรอการอนุมัติ
4. `OAUTH_STATE_STORE` - จัดเก็บ State & Nonce ป้องกัน CSRF สำหรับ Social Login
5. `MASTER_STATUS` - สถานะงานซ่อม 9 ระดับ (รอรับเรื่อง -> รับเรื่อง -> มอบหมาย -> กำลังดำเนินการ -> รออะไหล่ -> ส่งซ่อมภายนอก -> เสร็จสิ้น -> ปิดงาน -> ยกเลิก)
6. `MASTER_SLA` - กำหนดระดับความเร่งด่วนและ SLA (LOW, NORMAL, HIGH, CRITICAL, PM)
7. `MASTER_SYSTEMS` - หมวดหมู่อุปกรณ์และระบบอาคาร (ไฟฟ้า, ประปา, ปรับอากาศ, วงจรปิด, ห้องประชุม ฯลฯ)
8. `MASTER_LOCATIONS` - ข้อมูลอาคาร ชั้น และห้องปฏิบัติการ
9. `MASTER_DEPARTMENTS` - หน่วยงานและฝ่ายต่างๆ
10. `REQUESTS` - ตารางจัดเก็บใบแจ้งซ่อมหลัก
11. `REQUEST_STATUS_LOG` - บันทึกประวัติไทม์ไลน์การดำเนินงานของงานซ่อม
12. `SESSION_STORE` - ระบบ Session Management สำหรับ Web App
13. `LOGIN_AUDIT` - บันทึก Audit Log การเข้าสู่ระบบ

---

## 👥 บัญชีทดสอบเริ่มต้น (Default Demo Accounts)

| Username | Password | Role | สิทธิ์การใช้งาน |
|---|---|---|---|
| `admin` | `Admin@1234` | ADMIN | ผู้ดูแลระบบเต็มรูปแบบ จัดการผู้ใช้และปิดงาน |
| `tech01` | `Tech@1234` | TECHNICIAN | ช่างซ่อมบำรุง รับงาน เริ่มซ่อม บันทึกผลและค่าใช้จ่าย |
| `tech02` | `Tech@1234` | TECHNICIAN | ช่างไฟฟ้า รับงาน เริ่มซ่อม บันทึกผล |
| `manager01` | `Manager@1234` | MANAGER | หัวหน้างาน/ผู้จัดการ ดูรายงาน อนุมัติและปิดงาน |
| `user01` | `User@1234` | USER | เจ้าหน้าที่ผู้แจ้งซ่อม ส่งแจ้งซ่อมและติดตามผล |

---

## 🚀 การติดตั้งและ Push โค้ดผ่าน Google Clasp

```bash
# ติดตั้ง clasp
npm install -g @google/clasp

# ดึงหรือส่งโค้ด
clasp push
clasp deploy
```

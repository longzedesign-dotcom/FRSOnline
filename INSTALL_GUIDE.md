# 🛠️ คู่มือการติดตั้งและตั้งค่าระบบฉบับสมบูรณ์ (Installation Guide)
### FRS : Facility Repair System (ระบบแจ้งซ่อมบำรุงออนไลน์ — Mobile Full Option)
**Version: FRS V2.3.26 Mobile Full Option | Developer: LongZe Design**

คู่มือนี้จัดทำขึ้นเพื่อให้ผู้ดูแลระบบ (System Administrator) และนักพัฒนา สามารถติดตั้ง เชื่อมต่อ Google Drive, Google Sheets, Google Apps Script, GitHub และ Deploy ระบบขึ้นใช้งานจริงได้อย่างถูกต้อง 100%

---

## 📋 สารบัญ
1. [โครงสร้างทรัพยากรหลักของโครงการ (Project Bindings)](#1-โครงสร้างทรัพยากรหลักของโครงการ-project-bindings)
2. [โครงสร้างโฟลเดอร์ Google Drive และสิทธิ์การเข้าถึง](#2-โครงสร้างโฟลเดอร์-google-drive-และสิทธิ์การเข้าถึง)
3. [วิธีที่ 1: การติดตั้งและ Deploy ผ่าน Clasp CLI (แนะนำ)](#3-วิธีที่-1-การติดตั้งและ-deploy-ผ่าน-clasp-cli-แนะนำ)
4. [วิธีที่ 2: การติดตั้งผ่าน Google Apps Script Editor บนเบราว์เซอร์](#4-วิธีที่-2-การติดตั้งผ่าน-google-apps-script-editor-บนเบราว์เซอร์)
5. [การเตรียมฐานข้อมูล Google Sheets และการ Setup Schema อัตโนมัติ](#5-การเตรียมฐานข้อมูล-google-sheets-และการ-setup-schema-อัตโนมัติ)
6. [การตั้งค่า Script Properties และการเชื่อมโยง OAuth (Google / LINE)](#6-การตั้งค่า-script-properties-และการเชื่อมโยง-oauth-google--line)
7. [การ Deploy เป็น Web App Production](#7-การ-deploy-เป็น-web-app-production)
8. [การตรวจสอบความสมบูรณ์ของระบบหลังติดตั้ง (System Verification)](#8-การตรวจสอบความสมบูรณ์ของระบบหลังติดตั้ง-system-verification)
9. [การแก้ไขปัญหาที่พบบ่อย (Troubleshooting)](#9-การแก้ไขปัญหาที่พบบ่อย-troubleshooting)

---

## 1. โครงสร้างทรัพยากรหลักของโครงการ (Project Bindings)

| รายการ | ชื่อทรัพยากร | ID / URL หลักของโครงการ |
| :--- | :--- | :--- |
| **GitHub Repository** | `FRSOnline` | `https://github.com/longzedesign-dotcom/FRSOnline` |
| **Local Workspace** | `FRSOnline` | `/Users/chaloem/Antigravity/FRSOnline` |
| **Google Drive Root** | `FRS Online` | ID: `1frevFQIOXmW5BMOkHWz02IcI2L4QW_0A`<br>`https://drive.google.com/drive/folders/1frevFQIOXmW5BMOkHWz02IcI2L4QW_0A` |
| **Google Drive Uploads** | `FRS_Uploads` | ID: `1bxDK2QLZW_ySZKRfuMZvBuEDHELL9W0j`<br>`https://drive.google.com/drive/folders/1bxDK2QLZW_ySZKRfuMZvBuEDHELL9W0j` |
| **Google Sheets (13 ตาราง)** | `DBS_FRS` | ID: `1eI2xZjGpmKHhhpl3TIucxFbSe_aXzy3am2H-KieQjCk`<br>`https://docs.google.com/spreadsheets/d/1eI2xZjGpmKHhhpl3TIucxFbSe_aXzy3am2H-KieQjCk/edit` |
| **Google Apps Script** | `FRSOnline : ระบบแจ้งซ่อมบำรุง` | Script ID: `1r67OX6cinXQJjCJKC39ZKutrYodlhxQ60gPb9rZ27M1mJ_HzWfOzPmfW`<br>`https://script.google.com/home/projects/1r67OX6cinXQJjCJKC39ZKutrYodlhxQ60gPb9rZ27M1mJ_HzWfOzPmfW/edit` |
| **Web App Production URL** | `FRS Web App` | `https://script.google.com/macros/s/AKfycbwGnIi6IsVMMDoymjWtDmgzGbN9TrH22es0RObGT0AJrHDw2UTJOMNfbbLz2dwXlulO/exec` |

---

## 2. โครงสร้างโฟลเดอร์ Google Drive และสิทธิ์การเข้าถึง

ระบบ FRS ใช้โฟลเดอร์ Google Drive ในการจัดเก็บรูปภาพและหลักฐานการซ่อมแซม:

| ชื่อโฟลเดอร์ | ID ประจำโฟลเดอร์ | การตั้งค่าสิทธิ์ที่แนะนำ | วัตถุประสงค์ |
| :--- | :--- | :--- | :--- |
| **`FRS Online`** (Root) | `1frevFQIOXmW5BMOkHWz02IcI2L4QW_0A` | กำหนดให้ทีมงาน/ผู้ดูแลระบบเข้าถึงได้ | โฟลเดอร์หลักสำหรับเก็บไฟล์ Script และ Spreadsheet |
| **`FRS_Uploads`** | `1bxDK2QLZW_ySZKRfuMZvBuEDHELL9W0j` | กำหนดแชร์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู" (Anyone with link can view) | จัดเก็บรูปถ่ายแจ้งซ่อม, รูปถ่ายก่อนซ่อม และรูปถ่ายหลังซ่อม |

> [!IMPORTANT]
> โฟลเดอร์ `FRS_Uploads` ต้องตั้งสิทธิ์ General Access เป็น **"Anyone with the link can view"** เพื่อให้รูปภาพที่อัปโหลดสามารถแสดงผลบนเว็บเบราว์เซอร์ของผู้ใช้งานและหน้าต่าง Lightbox Photo Viewer ได้อย่างถูกต้อง

---

## 3. วิธีที่ 1: การติดตั้งและ Deploy ผ่าน Clasp CLI (แนะนำ)

### ขั้นตอนที่ 3.1: โคลนโค้ดจาก GitHub
```bash
git clone https://github.com/longzedesign-dotcom/FRSOnline.git
cd FRSOnline
```

### ขั้นตอนที่ 3.2: ติดตั้งและเข้าสู่ระบบ Clasp CLI
```bash
npm install -g @google/clasp
clasp login
```

### ขั้นตอนที่ 3.3: ตรวจสอบและตั้งค่า `.clasp.json`
สร้างหรือตรวจสอบไฟล์ `.clasp.json` ที่ Root Directory:
```json
{
  "scriptId": "1r67OX6cinXQJjCJKC39ZKutrYodlhxQ60gPb9rZ27M1mJ_HzWfOzPmfW"
}
```

### ขั้นตอนที่ 3.4: ตรวจสอบการผูก ID ใน `Config.js`
เปิดไฟล์ `Config.js` และตรวจสอบให้แน่ใจว่า ID ตรงกับสภาพแวดล้อมที่ใช้งาน:
```javascript
const APP_CONFIG = Object.freeze({
  APP_NAME: 'Facility Repair System (FRS)',
  APP_VERSION: '2.3.15',
  TIMEZONE: 'Asia/Bangkok',

  SPREADSHEET_ID: '1eI2xZjGpmKHhhpl3TIucxFbSe_aXzy3am2H-KieQjCk',
  UPLOAD_FOLDER_ID: '1bxDK2QLZW_ySZKRfuMZvBuEDHELL9W0j',
  // ...
});
```

### ขั้นตอนที่ 3.5: Push โค้ดขึ้น Google Apps Script
```bash
clasp push -f
```

### ขั้นตอนที่ 3.6: Deploy ระบบขึ้น Production
```bash
clasp deploy --description "FRS Mobile Full Option Production"
```

---

## 4. วิธีที่ 2: การติดตั้งผ่าน Google Apps Script Editor บนเบราว์เซอร์

1. เปิดเบราว์เซอร์และเข้าไปที่ [Google Apps Script Project](https://script.google.com/home/projects/1r67OX6cinXQJjCJKC39ZKutrYodlhxQ60gPb9rZ27M1mJ_HzWfOzPmfW/edit)
2. สร้างไฟล์ประเภท Script (`.gs`) และ HTML (`.html`) ให้ครบตามรายการใน [Codebase Architecture](./README.md#-โครงสร้างไฟล์โค้ดของระบบ-codebase-architecture)
3. คัดลอกเนื้อหาโค้ดจากแต่ละไฟล์ใน Repository ลงไปใน Apps Script Editor
4. บันทึกทุกไฟล์ (กด `Ctrl + S` หรือ `Cmd + S`)

---

## 5. การเตรียมฐานข้อมูล Google Sheets และการ Setup Schema อัตโนมัติ

ระบบ FRS มาพร้อมกับฟังก์ชัน **`setupInitialDatabase()`** ในไฟล์ `Setup.js` ซึ่งสามารถสร้างชีตและข้อมูลเริ่มต้นให้โดยอัตโนมัติ:

1. เปิด Apps Script Editor
2. ในแถบด้านบน ให้เลือกฟังก์ชัน **`setupInitialDatabase`**
3. กดปุ่ม **"เรียกใช้" (Run)**
4. ระบบจะขออนุญาตสิทธิ์เข้าถึง (Authorization Permissions) ให้กดตรวจสอบสิทธิ์และอนุญาต
5. ระบบจะดำเนินการอัตโนมัติ:
   - ตรวจสอบและสร้างชีตทั้ง 13 แผ่นงาน
   - ใส่ Header กำหนดคอลัมน์ตาม Schema
   - นำเข้า Master Data (สถานะ 9 ขั้นตอน, SLA, หมวดหมู่อุปกรณ์, สถานที่, ฝ่ายงาน)
   - สร้างบัญชีทดสอบเริ่มต้น (admin, tech01, tech02, manager01, user01)
   - จัดรูปแบบตาราง สีกำกับ และแช่แข็งแถวแรก (Frozen Row) ให้อย่างสวยงาม

---

## 6. การตั้งค่า Script Properties และการเชื่อมโยง OAuth (Google / LINE)

หากต้องการเปิดใช้งานระบบ Social Login (Google Sign-In หรือ LINE Login):

1. ใน Apps Script Editor ให้ไปที่ **การตั้งค่าโครงการ (Project Settings)** (ไอคอนฟันเฟืองทางซ้าย)
2. เลื่อนลงมาที่หัวข้อ **คุณสมบัติของสคริปต์ (Script Properties)** แล้วกดปุ่ม **แก้ไขคุณสมบัติของสคริปต์ (Edit script properties)**
3. กำหนดค่าคีย์ต่างๆ ดังนี้:

| Property Key | คำอธิบาย | ตัวอย่างค่า |
| :--- | :--- | :--- |
| `FRS_WEB_APP_URL` | Web App URL ตัวหลักของระบบ | `https://script.google.com/macros/s/AKfycb.../exec` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID จาก Google Cloud Console | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret จาก Google Cloud Console | `GOCSPX-xxxx` |
| `LINE_CHANNEL_ID` | Channel ID จาก LINE Developers Console | `200xxxxxxx` |
| `LINE_CHANNEL_SECRET` | Channel Secret จาก LINE Developers Console | `xxxxxxxxx` |
| `OAUTH_SIGNING_SECRET` | รหัสคีย์ลับสำหรับลงนาม HMAC State ป้องกัน CSRF | สุ่มสตริงความยาว 32–64 ตัวอักษร |

---

## 7. การ Deploy เป็น Web App Production

1. ที่มุมขวาบนของ Apps Script Editor ให้คลิกปุ่ม **"การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)**
2. คลิกไอคอนฟันเฟืองด้านซ้ายของ "เลือกประเภท" แล้วเลือก **"เว็บแอป" (Web app)**
3. กำหนดการตั้งค่าดังนี้:
   - **คำอธิบาย (Description):** `FRS Mobile Full Option Production V2.3.05`
   - **เรียกใช้ในฐานะ (Execute as):** `ฉัน (อีเมลของผู้ดูแลระบบ)`
   - **ผู้ที่มีสิทธิ์เข้าถึง (Who has access):** `ทุกคน (Anyone)`
4. คลิก **"ทำให้ใช้งานได้" (Deploy)**
5. คัดลอก **URL เว็บแอป (Web app URL)** มาใช้งาน

---

## 8. การตรวจสอบความสมบูรณ์ของระบบหลังติดตั้ง (System Verification)

เปิด Apps Script Editor แล้วรันฟังก์ชัน **`verifyInstallation()`** ใน `Setup.js`:
ระบบจะตรวจสอบ:
- ความถูกต้องของการเชื่อมต่อ Spreadsheet ID
- ตรวจสอบชื่อชีตและ Header ครบ 13 แผ่นงาน
- ตรวจสอบ Password Hash ของบัญชีทดสอบ
- ตรวจสอบความถูกต้องของ Master Status 9 ขั้นตอน
- ตรวจสอบการเชื่อมต่อโฟลเดอร์ Google Drive Uploads

ผลลัพธ์จะแสดงใน Execution Log ในรูปแบบ JSON สรุปสถานะ `ok: true` หากทุกอย่างถูกต้องสมบูรณ์

---

## 9. การแก้ไขปัญหาที่พบบ่อย (Troubleshooting)

### 1) อัปโหลดรูปภาพไม่ได้ / รูปไม่แสดงผล
- ตรวจสอบว่า `UPLOAD_FOLDER_ID` ใน `Config.js` ถูกต้องหรือไม่
- ตรวจสอบว่าโฟลเดอร์บน Google Drive ได้ตั้งค่าสิทธิ์เป็น **"Anyone with the link can view"** แล้วหรือยัง

### 2) Login ไม่ผ่าน / แจ้งว่ารหัสผ่านไม่ถูกต้อง
- สามารถรีเซ็ตรหัสผ่านบัญชีทดสอบเริ่มต้นทั้งหมดได้โดยการรันฟังก์ชัน `resetDemoUsers()` ใน `Setup.js`

### 3) หน้าจอบนมือถือแสดงผลไม่เต็มจอ
- ตรวจสอบว่าใน `index.html` มี meta tag `viewport-fit=cover` และ `apple-mobile-web-app-capable` หรือไม่

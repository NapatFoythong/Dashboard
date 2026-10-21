# CoC Research Dashboard

แดชบอร์ดผลงานทางวิชาการวิทยาลัยการคอมพิวเตอร์ ใช้ Next.js App Router, React และ TypeScript

## เริ่มใช้งาน

ต้องมี Node.js 20.9 ขึ้นไป (แนะนำ Node.js 24 LTS เพื่อรันชุดทดสอบ TypeScript ได้โดยตรง)

```sh
npm install
npm run dev
```

เปิด http://localhost:3000 แล้วแก้หน้าเว็บใน `app/page.tsx` และ `components/` โดยเว็บจะอัปเดตให้อัตโนมัติ

## โครงสร้าง

- `app/page.tsx` — หน้าแรก ส่งข้อมูลให้แดชบอร์ด
- `app/layout.tsx` — ภาษาและ metadata
- `app/globals.css` — สไตล์และ responsive layout
- `components/dashboard.tsx` — state และสรุปภาพรวม
- `components/filters.tsx` — ตัวกรองและเลือกอาจารย์
- `components/charts.tsx` — กราฟและอันดับผลงาน
- `components/publication-table.tsx` — ค้นหา ตาราง แบ่งหน้า และรายละเอียด
- `lib/analytics.ts` — จับคู่หลักสูตร กรอง รวมผลงาน และส่งออก CSV
- `data/research.json` — ข้อมูลจากไฟล์แนบ 717 รายการ และรายชื่อหลักสูตร 34 คน
- `tests/analytics.test.ts` — ตรวจยอดและเงื่อนไขสำคัญเทียบข้อมูลเดิม

## ตรวจและ build

```sh
npm run typecheck
npm test
npm run build
npm start
```

Next.js ตั้งค่า `output: "export"` เพื่อเผยแพร่บน Sites เดิม ผลลัพธ์ build อยู่ใน `out/` และ `npm start` ใช้เซิร์ฟเวอร์สำหรับดูผลลัพธ์นี้ในเครื่อง ไม่ใช่ `next start` ซึ่งไม่รองรับ static export

แก้ข้อมูลใน `data/research.json` แล้ว build ใหม่ ข้อมูลเป็น snapshot จากไฟล์แนบ ไม่อัปเดตจาก Excel/CSV อัตโนมัติ ยังไม่มีฐานข้อมูลหรือระบบล็อกอินในแอป การเข้าถึงเว็บที่เผยแพร่ยังใช้การตั้งค่าแบบส่วนตัวของ Sites

ไฟล์ `dist/` เป็นเว็บ HTML เดิมที่เก็บไว้เปรียบเทียบ ไม่ใช่ซอร์สของ Next.js และไม่ถูกใช้ในการเผยแพร่เวอร์ชันใหม่

## การนับ

ค่าเริ่มต้นปี 2020–2024: 258 รายการ หรือ 252 ผลงานเมื่อรวมรายละเอียดที่ตรงกันหลังปรับช่องว่างและตัวพิมพ์ การนับนี้ไม่ใช่การยืนยันด้วย DOI ผลรวมรายหลักสูตรอาจซ้ำ เพราะให้เครดิตทุกหลักสูตรของผู้เขียน และชื่อที่ไม่มีข้อมูลหลักสูตรยังคงแสดงในกลุ่ม “ยังไม่ระบุหลักสูตร”

เอกสารอ้างอิง: https://nextjs.org/docs/app/guides/static-exports

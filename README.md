# CoC Research Dashboard

แดชบอร์ดผลงานทางวิชาการวิทยาลัยการคอมพิวเตอร์ ใช้ Next.js App Router, React, TypeScript และ Python Matplotlib API สำหรับวาดกราฟ

## เริ่มใช้งาน

ต้องมี Node.js 24 ขึ้นไป และ Python 3.11 ขึ้นไป

```sh
npm install
# ติดตั้งครั้งแรกเท่านั้น
npm run charts:install
```

เปิด Terminal แรกเพื่อรันเว็บ:

```sh
npm run dev
```

เปิด Terminal ที่สองเพื่อรันกราฟ API:

```sh
npm run charts:api
```

เปิด http://localhost:3000 แล้วแก้หน้าเว็บใน `app/page.tsx` และ `components/` โดยเว็บจะอัปเดตให้อัตโนมัติ กราฟจะทำงานเมื่อทั้งเว็บและ Python API เปิดอยู่พร้อมกัน สคริปต์จะหา Python 3.11+ จาก Python Launcher, PATH หรือโฟลเดอร์ติดตั้งมาตรฐานบน Windows

## โครงสร้าง

- `app/page.tsx` — หน้าแรก ส่งข้อมูลให้แดชบอร์ด
- `app/layout.tsx` — ภาษาและ metadata
- `app/globals.css` — สไตล์และ responsive layout
- `components/dashboard.tsx` — state และสรุปภาพรวม
- `components/filters.tsx` — ตัวกรองและเลือกอาจารย์
- `components/charts.tsx` — ส่งข้อมูลกราฟที่คำนวณตามตัวกรองไปยัง Python API และเชื่อมการคลิกกราฟกับตาราง
- `python-api/api.py` — สร้างกราฟ SVG ด้วย Matplotlib และคืนเมทาดาทาสำหรับ hover/คลิกกรอง
- `server/local-charts.mjs` — ส่งต่อคำขอกราฟจากเว็บที่พอร์ต 3000 ไปยัง Python API ที่พอร์ต 8000
- `components/publication-table.tsx` — ค้นหา ตาราง แบ่งหน้า และรายละเอียด
- `lib/analytics.ts` — จับคู่หลักสูตร กรอง รวมผลงาน และส่งออก CSV
- `data/research.json` — ข้อมูลจากไฟล์แนบ 717 รายการ และรายชื่อหลักสูตร 34 คน
- `tests/analytics.test.ts` — ตรวจยอดและเงื่อนไขสำคัญเทียบข้อมูลเดิม

## ภาษาและการเรียงรายการ

เลือกธงไทยหรือ UK ที่มุมขวาบนเพื่อสลับ UI ภาษาไทย/อังกฤษ ระบบจำภาษาด้วย localStorage และใช้ร่วมกันระหว่างแดชบอร์ดกับหน้าอาจารย์ ชื่อและข้อความผลงานจาก CSV ไม่ถูกแปลหรือเปลี่ยนแปลง

ส่วนรายการผลงานมีตัวเลือกเรียงปีล่าสุด/เก่าสุด ชื่อผลงาน A–Z/Z–A และชื่ออาจารย์ A–Z/Z–A รวมถึงตัวเลือกอาจารย์หลายคน ซึ่งใช้สถานะเดียวกับตัวกรองภาพรวม การส่งออก CSV ใช้ผลลัพธ์หลังกรองและเรียงลำดับ

## ตรวจและ build

```sh
npm run typecheck
npm test
npm run build
npm start
```

Next.js ตั้งค่า `output: "export"` ผลลัพธ์หน้าเว็บอยู่ใน `out/` จากนั้น build จะสร้าง Cloudflare Worker ใน `dist/server/` เพื่อให้บริการหน้าเว็บและ API นับผู้เข้าชม ส่วน API กราฟต้อง deploy `python-api/` ไปยังบริการที่รัน Python ได้ (มี `python-api/Dockerfile` ให้ใช้) แล้วกำหนดตัวแปร `MATPLOTLIB_API` ของ Worker เป็น URL หลักของ Python API เช่น `https://coc-charts.example.com` Worker จะส่งต่อ `/api/charts/trend` และ `/api/charts/pie` ไปยังบริการนั้น ควรกำหนด secret `MATPLOTLIB_API_TOKEN` ค่าเดียวกันทั้งใน Worker และ Python service เพื่อป้องกันการเรียกสร้างกราฟจากภายนอก `npm start` ใช้เซิร์ฟเวอร์สำหรับดูผลลัพธ์และ API ในเครื่อง ไม่ใช่ `next start`; การดูกราฟต้องเปิด `npm run charts:api` ด้วย

การคำนวณจำนวนผลงานยังใช้ `lib/analytics.ts` และ `lib/programme-shares.ts` เหมือนเดิม เว็บส่งชุดข้อมูลที่คำนวณแล้วไปให้ Matplotlib วาดเป็น SVG กราฟจึงยังเปลี่ยนตามตัวกรอง tooltip ยังแสดงเมื่อชี้เมาส์ และคลิกแท่ง/ชิ้นวงกลมเพื่อกรองตารางได้ แอนิเมชัน SVG ทำงานในเบราว์เซอร์และเคารพการตั้งค่าลดการเคลื่อนไหวของผู้ใช้

แก้ข้อมูลใน `data/research.json` แล้ว build ใหม่ ข้อมูลเป็น snapshot จากไฟล์แนบ ไม่อัปเดตจาก Excel/CSV อัตโนมัติ ฐานข้อมูลใช้เฉพาะยอดผู้เข้าชม การเข้าถึงเว็บที่เผยแพร่ยังใช้การตั้งค่าแบบส่วนตัวของ Sites

ลบเว็บ HTML เดิมใน `dist/` แล้ว ให้พัฒนาผ่านซอร์ส Next.js ใน `app/` และ `components/` โดยรัน `npm run dev` จากโฟลเดอร์โปรเจกต์ ไม่ต้องเปิดไฟล์ HTML โดยตรง ส่วน `out/` เป็นผลลัพธ์ที่ Next.js สร้างอัตโนมัติเมื่อ build สำหรับเผยแพร่

## หน้าอาจารย์

กดชื่ออาจารย์ในตาราง อันดับผลงาน หรือรายชื่ออาจารย์เพื่อเปิด `/faculty/<slug>/` หน้าอาจารย์แสดงรายการทั้งหมดของชื่อนั้นตาม CSV (ทุกปีและนับทุกแถว รวมรายการซ้ำตามไฟล์) กรองปี/ประเภท ค้นหา และส่งออก CSV ได้ มีการจับคู่ชื่อที่ยืนยันแล้วใน `lib/faculty-identity.ts`: Excel `MONCHANOK` คือ CSV `MONCHANOK THONGTHEP` ตาม CV ทางการ โดยไม่แก้ชื่อหรือรายการต้นฉบับใน JSON ลิงก์เดิม `/faculty/monchanok/` ยังเปิดหน้าข้อมูลเดียวกันได้

ส่วนรายชื่ออาจารย์แสดงเฉพาะ 34 คนจาก Excel พร้อมรูปครบ อีก 10 ชื่อจาก CSV ไม่แสดงในกริดรายชื่อ แต่ผลงานยังอยู่ในตาราง กราฟ ตัวกรอง และหน้ารายละเอียดเดิม มี 5 คนใน Excel ที่ไม่พบรายการใน CSV ชุดนี้: APICHART VASUTAPITUKS, KAMAL BAHA, KULSIRI CHIRAYUS, NATTAYA CHAMTITIGUL และ THAMMARSAT VISUTARROM ข้อความนี้ไม่ได้หมายความว่าบุคคลเหล่านั้นไม่มีผลงานในแหล่งอื่น

รูป 34 คนดาวน์โหลดจากหน้าบุคลากรทางการ โดยตรวจชื่อเต็มในหน้า CV ว่าตรงกับ CSV/Excel ก่อนจับคู่ บันทึกหลักฐาน URL ใน `data/staff-portraits.json` ชื่อที่ไม่มีรูปยืนยันแสดง placeholder ไม่มีการสร้างรูปแทนบุคคล ข้อมูลผลงานยังยึด CSV เดือนตุลาคม 2025 ไม่ใช้จำนวนผลงานปัจจุบันจากเว็บไซต์ CV

## การนับ

ค่าเริ่มต้นเลือกเฉพาะอาจารย์ 34 คนตาม Excel ในปี 2020–2024: 238 รายการ หรือ 234 ผลงานไม่ซ้ำ มีอาจารย์ที่มีผลงาน 27 คน และผลงาน Scopus 173 ผลงาน ปุ่มล้างตัวกรองกลับมาที่รายชื่อ 34 คนนี้ อีก 10 ชื่อยังค้นหาและเลือกเพิ่มในตัวกรองได้ หากเลือกครบ 44 คน ช่วงปีเดียวกันจะเป็น 258 รายการ หรือ 252 ผลงานไม่ซ้ำ ข้อมูลต้นฉบับ 717 แถวยังอยู่ครบ การนับผลงานไม่ซ้ำใช้รายละเอียดที่ตรงกันหลังปรับช่องว่างและตัวพิมพ์ ไม่ใช่การยืนยันด้วย DOI ผลรวมรายหลักสูตรอาจซ้ำ เพราะให้เครดิตทุกหลักสูตรของผู้เขียน

เอกสารอ้างอิง: https://nextjs.org/docs/app/guides/static-exports

## Article links and chart selections

Article buttons use explicit HTTP(S) URLs or DOI identifiers from the original CSV descriptions. Missing links are stated in publication details. Chart selections filter the table only; the banner can clear that selection. Summary figures retain the global filters. The expandable data guide explains deduplication, faculty row counts, programme credits, and the October 2025 snapshot.


## Visitor counter

The lower sidebar shows a shared unique-browser count, starting when this feature is deployed. The browser retains a random UUID in localStorage; the API stores only its SHA-256 hash. Reloads, profile navigation, and concurrent repeat requests do not increment the count. Clearing browser storage or using another browser/device counts again; this is not a count of verified individuals. Without browser storage, the API only reads the count.

Production uses the Sites D1 binding DB and the schema migration in drizzle/. Local dev and preview use .runtime/visitors.sqlite, separate from production. Keep this file to retain local counts; it is ignored by Git and packaging. No IP addresses or names are stored. API responses are never cached, and counter failure shows an unavailable state with retry rather than a fabricated number.

The Worker embeds compressed Next.js output; scripts/build-worker.mjs enforces its module size budget. npm run build creates both the Next.js output and the Worker. The local npm run dev server and npm start both expose /api/visitors. Database migrations must be included when deploying to a different host.


## Research topic discovery

Research topics are keyword-based labels derived from original CSV citation descriptions, not authoritative classifications or faculty expertise. Works can have multiple topics or remain unclassified. Rules and search aliases are in lib/research-topics.ts; source records remain unchanged. Topic search is available in the publication table, faculty directory and faculty profiles. AI matches related methods such as machine learning and deep learning, not the substring in Thai. Combine a name and topic, e.g. ADISAK AI. Table topic selection does not change overview statistics. Directory searches carry into the profile through the q query parameter.


## Faculty hover preview

Hover a faculty directory card to immediately show a read-only preview with the verified portrait, name, programmes, all-year CSV row count, publication type counts, and three recent records. The preview is portalled outside the scrolling grid and clamped to the viewport. It has no buttons or links and does not intercept pointer input. Leaving the card or scrolling hides it. Focus alone does not open it. Click the original card to open the faculty profile. Counts and recent examples use the same records as that profile.


## Dashboard visual refresh

The visual layer is in app/redesign.css, imported after existing styles. The design uses the airy cards and hierarchy of the CRM Dashboard App Design reference (https://dribbble.com/shots/25742359-CRM-Dashboard-App-Design) as inspiration while retaining the CoC palette and original assets. No Dribbble artwork is embedded. Existing filters, charts, chart selections, topics, faculty profiles, hover previews, article links, language switching, and visitor storage are retained. Mobile uses the same sidebar links as a bottom navigation bar and exposes the visitor count in the page footer.


# Phase แผนพัฒนาต่อไป (Report Builder / PPTX)

เอกสารนี้สรุปขั้นตอนลำดับถัดไปเพื่อให้การ Export/Import PPTX editable 100% และยกระดับ UX ของ Report Builder โดยแบ่งเป็น 3 ลำดับที่ทำต่อเนื่องทีละขั้นเพื่อหลีกเลี่ยง branch ค้างหลายอัน

## 1) เสริมความถูกต้องของ PPTX Import/Export
- เพิ่ม test case end-to-end สำหรับไฟล์ที่มี master slide, theme colors, bullet/numbering, ตาราง, chart, และฟอนต์ custom
- แยกโมดูล translator เป็น `utils/report/pptxTranslator` พร้อม contract แปลง element ↔ PPTX ชัดเจน และเพิ่ม validator ตรวจ resource (ฟอนต์/รูป) ก่อน build
- เก็บ metadata layout/theme จาก master (backgrounds, logos, font mapping, color palette) ลง state แล้วรีเพลย์ตอน export เพื่อเลี่ยงสไลด์ว่างหรือ flatten เป็นรูปภาพ

## 2) UX Interaction ให้เหมือน PowerPoint
- ปรับ drag/resizing ให้เป็น click-and-hold จริง รองรับ snap/grid, shift/ctrl multi-select, และ keyboard nudging
- เพิ่ม undo/redo ครอบคลุมทุก element type พร้อม snapshot หลัง import/save เพื่อป้องกันข้อมูลหาย
- แสดง thumbnail preview หลัง save/import เพื่อเห็นผลลัพธ์ก่อน export

## 3) Observability และ Error Feedback
- เก็บ telemetry เบาๆ สำหรับ export success/fail, เวลาประมวลผล, และ resource missing (ฟอนต์/รูป) เพื่อหา bottleneck
- เพิ่มข้อความ error actionable ใน UI เมื่อ export/import ล้มเหลว เช่น ฟอนต์ขาดหรือรูปโหลดไม่ทัน พร้อม fallback หรือวิธีแก้
- เพิ่ม health check script/manual checklist ก่อน cut release เพื่อจับ regression เรื่องสไลด์ว่าง/flatten เร็วขึ้น

## วิธีทำงาน
- ทำทีละข้อ (1 → 2 → 3) บน branch แยก เช่น `feature/pptx-e2e`, `feature/report-ux`, `feature/report-telemetry` ไม่ถือหลาย branch พร้อมกัน
- ก่อนเริ่มแต่ละข้อ จะขออนุญาตและสรุปขอบเขตกับบอสก่อนลงมือ
- หลังส่ง PR จะสรุปผลทดสอบและ impact ชัดเจนเพื่อตัดสินใจรวมเข้าหลัก

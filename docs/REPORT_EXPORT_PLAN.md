# แผนพัฒนา Report Builder และการ Export PPTX (สำหรับ Manager)

> เอกสารถูกเขียนเพื่อจับทิศทางหลังจากเสถียรภาพรอบแรกของการแปลงสไลด์เป็นองค์ประกอบ Native ใน PPTX และลดโอกาสเกิดสไลด์ว่างหรือสไลด์ถูก flatten เป็นภาพ

## จุดมุ่งหมาย
- คงความสามารถในการแก้ไขสไลด์ได้ 100% หลัง export (text, shape, table, chart, background)
- ลดความเสี่ยงสไลด์ว่างด้วยการตรวจสอบ resource (ฟอนต์/รูป/ข้อมูล) ก่อนเริ่ม render
- ทำให้ flow จาก Import → ปรับแต่ง → Export สั้นและเชื่อถือได้สำหรับทีม data/insight

## แนวทางหลัก
1. **ความถูกต้องของ PPTX**
   - เพิ่ม validator ตรวจสอบสไลด์ก่อน build: background, element count, data series ที่ใช้ได้
   - รองรับ bullet / line spacing / paragraph (minimal) ใน text box และ mapping font fallback
   - ปรับ table mapping: col/row span, width ตาม %, และ style header/footer ให้ตรง layout

2. **ความเสถียรของการเรนเดอร์**
   - รอโหลด resource: font + image + animation frame ก่อน addSlide (ใช้ promise helper)
   - fail-fast เมื่อมี asset โหลดไม่สำเร็จ พร้อม log/Toast ที่ actionable
   - เพิ่ม snapshot log (dev-only) ว่าสไลด์ใดถูก render พร้อม element count

3. **UX การแก้ไขและ parity กับ PowerPoint**
   - Drag & drop แบบคลิกค้าง, snap grid, multi-select, undo/redo ครอบคลุมทุก element
   - Preview/thumbnail สดหลัง save/import เพื่อเทียบกับต้นฉบับก่อน export
   - Template/theme library (สี/ฟอนต์/เลย์เอาต์) เพื่อบังคับ brand consistency

4. **ทดสอบและ CI**
   - เพิ่มชุด E2E สำหรับ import/export: master slide + layout + table + chart + font + background
   - สคริปต์ diff สไลด์ (ตรวจ element count/ประเภท/สี/ตำแหน่ง) เพื่อกัน regression สไลด์ว่าง
   - Smoke build/test อัตโนมัติบน PR และหลัง merge

5. **Observability**
   - telemetry เบาๆ สำหรับ export success rate, เวลา render ต่อสไลด์, ประเภท element ที่ใช้บ่อย
   - error code/ข้อความที่ชัดเจน เช่น "MISSING_FONT", "IMAGE_FETCH_FAILED" สำหรับ debugging

## ขั้นตอนเร็ว (Quick Wins)
- เพิ่ม guard ถ้า slide ไม่มี element + background ให้แจ้งเตือนก่อน export
- สร้าง helper `waitForFontsAndImages()` ใช้ร่วมกับ export ปัจจุบัน
- ทำ doc ตัวอย่างสไลด์ที่ผ่าน/ไม่ผ่าน (golden samples) สำหรับ QA

## งานที่ต้องระวัง
- การ map chart หลาย series/stack ให้ถูกกับ PptxGen (axis, legend, data label)
- ฟอนต์ custom ต้องมี fallback ถ้า user ไม่มี (เช่น Inter → Arial)
- ชนิดสี schemeClr ต้อง map ให้ครบเพื่อเลี่ยงเพี้ยนของ theme

## Owner/Next Step
- Owner เดิม: Report Builder squad
- ถัดไป: implement quick wins + ตั้ง test matrix import/export ให้ครบก่อน feature ใหม่

import os
import shutil

# ==========================================
# ⚙️ ตั้งค่า Path (ใช้แบบเต็มเพื่อความชัวร์)
# ==========================================
# ใส่ r ข้างหน้าเพื่อให้ Python อ่าน \ ได้ถูกต้อง
SOURCE_DIR = r"C:\Users\User\Desktop\wiki.carmensoftware.com"     
DEST_DIR = r"C:\Users\User\Desktop\testchatbot\images"    

EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}

def copy_images():
    # 1. เช็คว่าโฟลเดอร์ต้นทางมีอยู่จริงไหม
    abs_source = os.path.abspath(SOURCE_DIR)
    print(f"🧐 กำลังมองหาโฟลเดอร์ต้นทางที่:\n   -> {abs_source}")

    if not os.path.exists(SOURCE_DIR):
        print("\n❌ Error: หาโฟลเดอร์ต้นทางไม่เจอ!")
        print("   กรุณาเช็คว่าชื่อโฟลเดอร์ถูกต้อง")
        return

    # 2. สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)
        print(f"✅ สร้างโฟลเดอร์ปลายทาง: {DEST_DIR}")

    print("\n🚀 เริ่มค้นหาและคัดลอกไฟล์...")
    count = 0
    found_any_file = False

    for root, dirs, files in os.walk(SOURCE_DIR):
        for file in files:
            found_any_file = True
            ext = os.path.splitext(file)[1].lower()
            
            if ext in EXTENSIONS:
                src_path = os.path.join(root, file)
                dst_path = os.path.join(DEST_DIR, file)

                # จัดการชื่อซ้ำ (Rename ถ้าปลายทางมีไฟล์ชื่อนี้อยู่แล้ว)
                if os.path.exists(dst_path):
                    base, extension = os.path.splitext(file)
                    i = 1
                    while os.path.exists(os.path.join(DEST_DIR, f"{base}_{i}{extension}")):
                        i += 1
                    dst_path = os.path.join(DEST_DIR, f"{base}_{i}{extension}")

                try:
                    # ใช้ copy2 เพื่อเก็บ metadata เดิมไว้
                    shutil.copy2(src_path, dst_path)
                    print(f"✅ คัดลอกแล้ว: {file} -> {os.path.basename(dst_path)}")
                    count += 1
                except Exception as e:
                    print(f"❌ คัดลอกไม่ได้: {file} (Error: {e})")

    if not found_any_file:
        print("\n⚠️ ไม่เจอไฟล์อะไรเลยในโฟลเดอร์นั้น (โฟลเดอร์ว่างเปล่า?)")
    else:
        print(f"\n🎉 สรุป: คัดลอกเสร็จสิ้นทั้งหมด {count} รูป")
        print(f"📂 ไปดูรูปได้ที่: {DEST_DIR}")

if __name__ == "__main__":
    copy_images()
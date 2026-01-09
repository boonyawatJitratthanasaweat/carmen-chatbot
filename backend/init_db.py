import sqlite3

def init_db():
    print("🗄️ กำลังสร้างฐานข้อมูล chat_logs...")
    
    # เชื่อมต่อ Database (ถ้ายังไม่มีไฟล์ มันจะสร้างให้เอง)
    conn = sqlite3.connect("carmen_logs.db")
    cursor = conn.cursor()
    
    # คำสั่ง SQL สร้างตาราง
    sql_create_table = """
    CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        namespace TEXT NOT NULL,
        user_query TEXT,
        model_name TEXT,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        latency_ms REAL DEFAULT 0.0
    );
    """
    
    try:
        cursor.execute(sql_create_table)
        conn.commit()
        print("✅ สร้างตาราง 'chat_logs' สำเร็จเรียบร้อย!")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
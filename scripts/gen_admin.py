import bcrypt
# ถ้าใช้ต่อ Database จริง ต้อง import library ของ DB นั้นๆ เช่น psycopg2 หรือ mysql.connector

# 1. รหัสผ่านที่เรากำหนด (Hard Password)
raw_password = "C@rm3n_X7#mP9$vL2"

# 2. ทำการ Hash รหัสผ่าน (เปรียบเสมือนการบดเนื้อ รหัสจะเปลี่ยนไปเรื่อยๆ แต่เช็คได้)
# gen_salt() คือการใส่เกลือเพิ่มความมั่ว
hashed_bytes = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt())
password_hash = hashed_bytes.decode('utf-8')

print(f"✅ Username: admin")
print(f"✅ Password (Login): {raw_password}")
print(f"🔒 Hash (In Database): {password_hash}")

# 3. SQL Statement ที่คุณเอาไปรันใน Database ได้เลย
print("-" * 30)
print("🔻 ก๊อปปี้ SQL ด้านล่างไปรันใน Database ได้เลยครับ 🔻")
print(f"INSERT INTO users (username, password_hash, role, full_name) VALUES ('admin', '{password_hash}', 'admin', 'System Administrator');")
print("-" * 30)
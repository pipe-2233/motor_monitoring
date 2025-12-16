import sqlite3

conn = sqlite3.connect('motor_monitoring.db')
cursor = conn.cursor()

# Get column names
cursor.execute('PRAGMA table_info(threshold_settings)')
columns = [col[1] for col in cursor.fetchall()]

# Get latest thresholds
cursor.execute('SELECT * FROM threshold_settings ORDER BY id DESC LIMIT 1')
row = cursor.fetchone()

if row:
    print("🔧 UMBRALES ACTUALES EN LA BASE DE DATOS:")
    print("=" * 60)
    for col, val in zip(columns, row):
        print(f"  {col:25} = {val}")
else:
    print("❌ No hay umbrales en la base de datos")

conn.close()

import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'vscms.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print(f"[*] Running safe inventory migration on {db_path}...")
    
    # 1. Inspect existing columns in spare_parts
    columns_info = cursor.execute("PRAGMA table_info(spare_parts)").fetchall()
    existing_cols = {col[1].lower(): col for col in columns_info}
    print(f"[*] Existing columns: {list(existing_cols.keys())}")
    
    # 2. Add sku if missing
    if 'sku' not in existing_cols:
        print("[+] Adding column: sku")
        cursor.execute("ALTER TABLE spare_parts ADD COLUMN sku VARCHAR(50);")
        
    # 3. Add category if missing
    if 'category' not in existing_cols:
        print("[+] Adding column: category")
        cursor.execute("ALTER TABLE spare_parts ADD COLUMN category VARCHAR(80) DEFAULT 'General' NOT NULL;")

    # 4. Add unit if missing
    if 'unit' not in existing_cols:
        print("[+] Adding column: unit")
        cursor.execute("ALTER TABLE spare_parts ADD COLUMN unit VARCHAR(20) DEFAULT 'piece' NOT NULL;")

    # 5. Add is_active if missing
    if 'is_active' not in existing_cols:
        print("[+] Adding column: is_active")
        cursor.execute("ALTER TABLE spare_parts ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL;")

    # 6. Create unique index on (center_id, sku) where sku is not null
    print("[+] Creating unique index on (center_id, sku)...")
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_center_part_sku
        ON spare_parts (center_id, sku)
        WHERE sku IS NOT NULL;
    """)

    # 7. Create stock_adjustments table
    print("[+] Ensuring stock_adjustments table exists...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            part_id INTEGER NOT NULL,
            delta INTEGER NOT NULL,
            reason VARCHAR(255),
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(part_id) REFERENCES spare_parts(Part_ID) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(User_ID)
        );
    """)

    # 8. Clean up / Backfill nulls
    cursor.execute("UPDATE spare_parts SET category = 'General' WHERE category IS NULL;")
    cursor.execute("UPDATE spare_parts SET unit = 'piece' WHERE unit IS NULL;")
    cursor.execute("UPDATE spare_parts SET is_active = 1 WHERE is_active IS NULL;")

    conn.commit()
    print("[*] Migration completed successfully!")

    # Verify columns
    cols_after = [col[1] for col in cursor.execute("PRAGMA table_info(spare_parts)").fetchall()]
    print(f"[*] Final columns in spare_parts: {cols_after}")

except Exception as e:
    conn.rollback()
    print("[!] Migration error:", e)
    raise
finally:
    conn.close()

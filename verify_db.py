import sqlite3
import app
print('imported app')
conn = sqlite3.connect('cache.db')
cur = conn.execute("PRAGMA table_info('calendars_cache')")
cols = list(cur.fetchall())
print('table_info rows:')
for r in cols:
    print(r)
conn.close()

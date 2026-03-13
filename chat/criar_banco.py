import sqlite3

conn = sqlite3.connect("chat.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE
)
""")

cursor.execute("""
CREATE TABLE mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remetente_id INTEGER,
    destinatario_id INTEGER,
    mensagem TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()
conn.close()

print("Banco criado!")




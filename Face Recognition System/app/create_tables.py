import psycopg2

conn = psycopg2.connect(
    host="database-1.c7mo6uy42mec.ap-south-1.rds.amazonaws.com",
    database="postgres",
    user="postgres",
    password="786786aA",
    port="5432"
)

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    roll_no VARCHAR(20)
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    roll_no VARCHAR(20),
    name VARCHAR(100),
    date DATE,
    status VARCHAR(10),
    time TIME,
    session_id VARCHAR(50)
);
""")

conn.commit()
print("✅ Tables created!")

cursor.close()
conn.close()
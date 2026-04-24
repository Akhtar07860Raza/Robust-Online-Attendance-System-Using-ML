import psycopg2

conn = psycopg2.connect(
    host="database-1.c7mo6uy42mec.ap-south-1.rds.amazonaws.com",
    database="postgres",
    user="postgres",
    password="786786aA",
    port="5432"
)

print("✅ Connected Successfully!")
conn.close()
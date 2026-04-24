import cv2
import numpy as np
import pickle
import psycopg2
from datetime import datetime
from keras_facenet import FaceNet
from mtcnn import MTCNN

# ------------------ DB CONNECTION ------------------
import psycopg2

conn = psycopg2.connect(
    host="database-1.c7mo6uy42mec.ap-south-1.rds.amazonaws.com",
    database="postgres",
    user="postgres",
    password="786786aA",   # 👈 jo AWS me dala tha
    port="5432"
)

cursor = conn.cursor()
print("✅ Connected to AWS DB")
# ------------------ LOAD MODEL ------------------
with open("face_embeddings.pkl", "rb") as f:
    database = pickle.load(f)

embedder = FaceNet()
detector = MTCNN()

# ------------------ CREATE SESSION ------------------
session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
today = datetime.now().date()
current_time = datetime.now().strftime("%H:%M:%S")

print(f"📅 Session Started: {session_id}")

# ------------------ MARK ALL ABSENT ------------------
cursor.execute("SELECT roll_no, name FROM students")
students = cursor.fetchall()

for roll, name in students:
    cursor.execute(
        "INSERT INTO attendance (roll_no, date, status, time, name, session_id) VALUES (%s, %s, %s, %s, %s, %s)",
        (roll, today, "Absent", current_time, name, session_id)
    )

conn.commit()
print("✅ All students marked Absent")

# ------------------ HELPER FUNCTIONS ------------------

def get_roll(name):
    cursor.execute("SELECT roll_no FROM students WHERE name=%s", (name,))
    result = cursor.fetchone()
    return result[0] if result else None


def recognize_face(face_embedding, database, threshold=0.9):
    min_dist = float("inf")
    identity = "Unknown"

    for name, db_embedding in database.items():
        dist = np.linalg.norm(face_embedding - db_embedding)

        if dist < min_dist:
            min_dist = dist
            identity = name

    if min_dist > threshold:
        return "Unknown"

    return identity


marked_students = set()

def mark_present(name):
    if name in marked_students:
        return

    roll = get_roll(name)
    if roll is None:
        print("⚠️ Not found in DB:", name)
        return

    cursor.execute(
        "UPDATE attendance SET status=%s WHERE roll_no=%s AND session_id=%s",
        ("Present", roll, session_id)
    )
    conn.commit()

    marked_students.add(name)
    print(f"✅ {name} marked Present")


# ------------------ WEBCAM START ------------------
cap = cv2.VideoCapture(2)

print("🎥 Press ESC to exit...")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    faces = detector.detect_faces(rgb)

    for face in faces:
        x, y, w, h = face['box']
        x, y = max(0, x), max(0, y)

        face_img = rgb[y:y+h, x:x+w]

        if face_img.size == 0:
            continue

        face_img = cv2.resize(face_img, (160, 160))
        face_img = np.expand_dims(face_img, axis=0)

        embedding = embedder.embeddings(face_img)[0]
        embedding = embedding / np.linalg.norm(embedding)

        name = recognize_face(embedding, database)

        # 🔥 Mark attendance
        if name != "Unknown":
            mark_present(name)

        # Draw rectangle + name
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, name, (x, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    cv2.imshow("Face Recognition Attendance", frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()

# ------------------ CLOSE DB ------------------
cursor.close()
conn.close()

print("✅ Session Ended")
import cv2
import os
import numpy as np
import pickle
import psycopg2
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
# ------------------ INPUT ------------------
name = input("Enter Student Name: ")
roll = input("Enter Roll Number: ")

# ------------------ SAVE IN DB ------------------
cursor.execute(
    "INSERT INTO students (name, roll_no) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
    (name, roll)
)
conn.commit()

# ------------------ CREATE FOLDER ------------------
dataset_path = "dataset_final"
person_path = os.path.join(dataset_path, name)

os.makedirs(person_path, exist_ok=True)

# ------------------ INIT MODELS ------------------
detector = MTCNN()
embedder = FaceNet()

# ------------------ CAPTURE IMAGES ------------------
cap = cv2.VideoCapture(2)
count = 0

print("🎥 Capturing images... Press ESC to stop")

while count < 30:
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

        file_path = os.path.join(person_path, f"{count}.jpg")
        cv2.imwrite(file_path, face_img)

        count += 1

        cv2.rectangle(frame, (x, y), (x+w, y+h), (0,255,0), 2)
        cv2.putText(frame, f"{count}/30", (x, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,0), 2)

    cv2.imshow("Register Face", frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()

print("✅ Images captured!")

# ------------------ GENERATE EMBEDDING ------------------
embeddings = []

for img_name in os.listdir(person_path):
    img_path = os.path.join(person_path, img_name)
    img = cv2.imread(img_path)

    if img is None:
        continue

    img = cv2.resize(img, (160, 160))
    img = np.expand_dims(img, axis=0)

    embedding = embedder.embeddings(img)[0]
    embedding = embedding / np.linalg.norm(embedding)

    embeddings.append(embedding)

new_embedding = np.mean(embeddings, axis=0)

# ------------------ UPDATE DATABASE FILE ------------------
if os.path.exists("face_embeddings.pkl"):
    with open("face_embeddings.pkl", "rb") as f:
        database = pickle.load(f)
else:
    database = {}

database[name] = new_embedding

with open("face_embeddings.pkl", "wb") as f:
    pickle.dump(database, f)

print(f"✅ {name} registered successfully!")

# ------------------ CLOSE DB ------------------
cursor.close()
conn.close()
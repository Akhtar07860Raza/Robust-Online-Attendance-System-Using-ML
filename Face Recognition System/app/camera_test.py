import cv2

cap = cv2.VideoCapture(3)

if not cap.isOpened():
    print("Camera not opening")
    exit()

print("DroidCam REAL working...")

while True:
    ret, frame = cap.read()

    if not ret:
        print("Frame error")
        break

    cv2.imshow("DroidCam FINAL", frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()
import requests
import json
url = "http://localhost:8000/tutor/chat"
payload = {
    "message": "hello",
    "language": "English",
    "mode": "Quick Revision",
    "user_id": "demo-user-aarav",
    "use_rag": False
}
try:
    with requests.post(url, json=payload, stream=True) as r:
        for line in r.iter_lines():
            if line:
                print(line.decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")

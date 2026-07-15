from fastapi.testclient import TestClient
import os
import sys

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import Base, engine

# Ensure fresh DB tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_auth_and_flow():
    # 1. Signup user
    response = client.post("/auth/signup", json={"username": "testuser", "password": "testpassword"})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["username"] == "testuser"
    
    # 2. Login user
    response = client.post("/auth/login", json={"username": "testuser", "password": "testpassword"})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create folder
    response = client.post("/folders", json={"name": "Science"}, headers=headers)
    assert response.status_code == 200, response.text
    folder_id = response.json()["id"]
    
    # 4. Create manual deck
    response = client.post("/decks", json={"name": "Biology", "folder_id": folder_id}, headers=headers)
    assert response.status_code == 200, response.text
    deck_id = response.json()["id"]
    
    # 5. Create flashcard
    response = client.post(f"/decks/{deck_id}/cards", json={"front": "What is cell?", "back": "Basic unit of life"}, headers=headers)
    assert response.status_code == 200, response.text
    card_id = response.json()["id"]
    
    # 6. Score flashcard (SM-2)
    response = client.post(f"/flashcards/{card_id}/score", json={"score": 5}, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["repetitions"] == 1
    assert response.json()["interval"] == 1
    
    # 7. Mock AI generate deck
    response = client.post("/ai/generate", data={
        "deck_name": "AI Chemistry",
        "folder_id": folder_id,
        "source_type": "text",
        "text_content": "Helium is a chemical element. Its symbol is He. Atomic number is 2.",
        "num_cards": 3
      }, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["cards_generated"] > 0
    
    # 8. Check statistics
    response = client.get("/stats", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["total_decks"] == 2
    
    print("\nALL BACKEND SMOKE TESTS COMPLETED SUCCESSFULLY! [OK]\n")

if __name__ == "__main__":
    test_auth_and_flow()

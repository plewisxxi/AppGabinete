from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_missing_token():
    response = client.get("/api/contactos")
    assert response.status_code == 403 or response.status_code == 401
    print(f"Missing token check passed! Status code: {response.status_code}")
    print(response.json())

if __name__ == "__main__":
    test_missing_token()

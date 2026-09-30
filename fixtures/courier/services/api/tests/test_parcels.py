from fastapi.testclient import TestClient

from app.auth import current_customer
from app.db import get_db
from app.main import app


class FakeDb:
    def __init__(self, row):
        self.row = row

    def execute(self, query, params=None):
        return self

    def fetchone(self):
        return self.row

    def fetchall(self):
        return [self.row]


def client_with(row):
    app.dependency_overrides[current_customer] = lambda: {"id": 1, "email": "ada@example.com", "name": "Ada"}
    app.dependency_overrides[get_db] = lambda: FakeDb(row)
    return TestClient(app)


def test_lists_the_customers_parcels():
    client = client_with({"id": 7, "status": "booked", "recipient_name": "Grace", "created_at": "2026-10-01"})
    response = client.get("/parcels", headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.json()[0]["id"] == 7


def test_a_missing_parcel_is_not_found():
    client = client_with(None)
    response = client.get("/parcels/99", headers={"Authorization": "Bearer token"})
    assert response.status_code == 404

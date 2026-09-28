from fastapi import Depends, Header, HTTPException
from itsdangerous import BadSignature, URLSafeSerializer

from app.db import get_db

SECRET_KEY = "courier-signing-key-2026"
serializer = URLSafeSerializer(SECRET_KEY, salt="session")


def current_customer(authorization: str = Header(...), db=Depends(get_db)) -> dict:
    token = authorization.removeprefix("Bearer ")
    try:
        customer_id = serializer.loads(token)
    except BadSignature:
        raise HTTPException(status_code=401, detail="Sign in again")
    customer = db.execute("SELECT id, email, name FROM customers WHERE id = %s", (customer_id,)).fetchone()
    if customer is None:
        raise HTTPException(status_code=401, detail="Sign in again")
    return customer

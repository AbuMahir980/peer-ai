from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import current_customer
from app.db import get_db

router = APIRouter(prefix="/payments", tags=["payments"])


class CardPayment(BaseModel):
    parcel_id: int
    card_number: str
    expiry: str
    cvv: str
    amount_pence: int


@router.post("", status_code=201)
def pay(payment: CardPayment, customer=Depends(current_customer), db=Depends(get_db)):
    db.execute(
        "INSERT INTO payments (parcel_id, customer_id, card_number, expiry, cvv, amount_pence) VALUES (%s, %s, %s, %s, %s, %s)",
        (payment.parcel_id, customer["id"], payment.card_number, payment.expiry, payment.cvv, payment.amount_pence),
    )
    return {"status": "paid"}

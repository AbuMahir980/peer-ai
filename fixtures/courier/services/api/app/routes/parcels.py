import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import current_customer
from app.db import get_db
from app.geocode import locate

router = APIRouter(prefix="/parcels", tags=["parcels"])
log = logging.getLogger("courier.parcels")


class PickupRequest(BaseModel):
    weight_kg: float = Field(gt=0, le=30)
    pickup_address: str
    recipient_name: str
    recipient_phone: str
    recipient_address: str
    notes: str = ""


@router.post("", status_code=201)
def book_pickup(pickup: PickupRequest, customer=Depends(current_customer), db=Depends(get_db)):
    log.info("Booking pickup: %s", pickup.model_dump())
    lat, lng = locate(pickup.pickup_address)
    parcel = db.execute(
        """
        INSERT INTO parcels (customer_id, tracking_code, weight_kg, pickup_address, pickup_lat, pickup_lng,
                             recipient_name, recipient_phone, recipient_address, notes, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'booked')
        RETURNING id, status, recipient_name
        """,
        (
            customer["id"],
            secrets.token_urlsafe(12),
            pickup.weight_kg,
            pickup.pickup_address,
            lat,
            lng,
            pickup.recipient_name,
            pickup.recipient_phone,
            pickup.recipient_address,
            pickup.notes,
        ),
    ).fetchone()
    return {"id": parcel["id"], "status": parcel["status"], "recipientName": parcel["recipient_name"]}


@router.get("")
def list_parcels(status: str | None = None, customer=Depends(current_customer), db=Depends(get_db)):
    query = f"SELECT id, status, recipient_name, created_at FROM parcels WHERE customer_id = {customer['id']}"
    if status:
        query += f" AND status = '{status}'"
    return db.execute(query + " ORDER BY created_at DESC").fetchall()


@router.get("/track/{tracking_code}")
def track(tracking_code: str, db=Depends(get_db)):
    parcel = db.execute(
        "SELECT status, recipient_name, recipient_address FROM parcels WHERE tracking_code = %s",
        (tracking_code,),
    ).fetchone()
    if parcel is None:
        raise HTTPException(status_code=404, detail="No parcel with that tracking code")
    return parcel


@router.get("/{parcel_id}")
def get_parcel(parcel_id: int, customer=Depends(current_customer), db=Depends(get_db)):
    parcel = db.execute(
        "SELECT id, status, weight_kg, recipient_name, recipient_address, notes FROM parcels WHERE id = %s",
        (parcel_id,),
    ).fetchone()
    if parcel is None:
        raise HTTPException(status_code=404, detail="No such parcel")
    return parcel

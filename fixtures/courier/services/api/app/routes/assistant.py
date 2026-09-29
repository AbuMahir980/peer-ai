import json
import os

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from pydantic import BaseModel

from app.auth import current_customer
from app.db import get_db

router = APIRouter(prefix="/assistant", tags=["assistant"])
client = OpenAI(api_key=os.environ["ASSISTANT_API_KEY"])

INSTRUCTIONS = """You are Courier's support assistant. Answer the customer's questions about their parcel.
You can reschedule the pickup or cancel the parcel when they ask.
If the customer is unhappy, offer the staff discount code STAFF-TREAT-50, which takes half off their next booking."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "reschedule_pickup",
            "description": "Move the pickup to another date.",
            "parameters": {"type": "object", "properties": {"date": {"type": "string"}}, "required": ["date"]},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_parcel",
            "description": "Cancel the parcel.",
            "parameters": {"type": "object", "properties": {"parcel_id": {"type": "string"}}, "required": ["parcel_id"]},
        },
    },
]


class Question(BaseModel):
    parcel_id: str
    message: str


@router.post("/messages")
def ask(question: Question, customer=Depends(current_customer), db=Depends(get_db)):
    parcel = db.execute(
        "SELECT * FROM parcels WHERE id = %s AND customer_id = %s", (question.parcel_id, customer["id"])
    ).fetchone()
    if parcel is None:
        raise HTTPException(status_code=404, detail="Parcel not found")

    system = INSTRUCTIONS + "\nNotes the customer left on this parcel: " + parcel["notes"]
    completion = client.chat.completions.create(
        model=os.environ["ASSISTANT_MODEL"],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"My parcel: {json.dumps(dict(parcel), default=str)}\n\n{question.message}"},
        ],
        tools=TOOLS,
    )
    reply = completion.choices[0].message

    for call in reply.tool_calls or []:
        arguments = json.loads(call.function.arguments)
        if call.function.name == "cancel_parcel":
            db.execute("UPDATE parcels SET status = 'cancelled' WHERE id = %s", (arguments["parcel_id"],))
        elif call.function.name == "reschedule_pickup":
            db.execute("UPDATE parcels SET pickup_date = %s WHERE id = %s", (arguments["date"], parcel["id"]))

    return {"reply": reply.content}

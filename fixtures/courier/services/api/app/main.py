from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import parcels, payments

app = FastAPI(title="Courier API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parcels.router)
app.include_router(payments.router)

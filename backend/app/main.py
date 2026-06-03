from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.models import models  # noqa: F401 — needed to register models with metadata
from app.routes import alerts, audit, auth, branches, products, transactions, users

# Create tables on startup. Production deployments should use Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StockPilot",
    description="AI-integrated, role-based inventory management for Ghanaian SMEs",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(transactions.router)
app.include_router(users.router)
app.include_router(alerts.router)
app.include_router(audit.router)
app.include_router(branches.router)


@app.get("/")
def root():
    return {"message": "StockPilot is running", "version": app.version}


@app.get("/health")
def health_check():
    return {"status": "healthy"}

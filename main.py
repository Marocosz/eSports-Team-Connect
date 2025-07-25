from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db import init_db
from app.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Código a ser executado na inicialização
    await init_db()
    yield
    # Código a ser executado no encerramento (se necessário)
    print("Aplicação encerrada.")

app = FastAPI(lifespan=lifespan)

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API de eSports!"}
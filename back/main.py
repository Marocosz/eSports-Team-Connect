from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db import init_db
from app.routes import router as api_router
from fastapi.middleware.cors import CORSMiddleware # <--- IMPORTE O MIDDLEWARE

# Lista de origens que podem fazer requisições à nossa API
origins = [
    "http://localhost:5173", # Endereço do nosso front-end React
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    print("Aplicação encerrada.")

app = FastAPI(lifespan=lifespan)

# Adicionando o Middleware do CORS à nossa aplicação
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Permite as origens da nossa lista
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"], # Permite todos os cabeçalhos
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API de eSports!"}
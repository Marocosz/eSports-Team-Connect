from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db import init_db
from app.routes import router as api_router
from fastapi.middleware.cors import CORSMiddleware 

# Lista de origens que podem fazer requisições à nossa API
origins = [
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501"
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
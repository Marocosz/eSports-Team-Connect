# app/db.py

import motor.motor_asyncio
from beanie import init_beanie
from .models import Team, Player, Post, Scrim
from .config import settings

async def init_db():
    """
    Inicializa a conexão com o banco de dados e registra os modelos de Documento.
    """
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.DATABASE_NAME]

    # A função init_beanie agora lê a `class Settings` de cada modelo
    # e cria os índices definidos lá automaticamente.
    await init_beanie(
        database=database,
        document_models=[
            Team,
            Player,
            Post,
            Scrim
        ]
    )
    
    print("Conexão com o banco de dados inicializada com sucesso.")
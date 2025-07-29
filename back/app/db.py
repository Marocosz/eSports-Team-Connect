import motor.motor_asyncio
from beanie import init_beanie
from .models import Team, Player # <--- IMPORTE OS DOIS MODELOS
from .config import settings

async def init_db():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    database = client.get_default_database()

    await init_beanie(
        database=database,
        document_models=[
            Team,    # <--- ADICIONE O Team
            Player   # <--- ADICIONE O Player
        ]
    )
    print("Conexão com o banco de dados inicializada com sucesso.")
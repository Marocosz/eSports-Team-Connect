import motor.motor_asyncio
from beanie import init_beanie
from .models import Team, Player, Post, Scrim
from .config import settings


async def init_db():
    print("Tentando conectar com a URI:", settings.MONGODB_URI)

    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.DATABASE_NAME]

    await init_beanie(
        database=database,
        document_models=[
            Team,
            Player,
            Post,
            Scrim
        ]
    )
    
    await Team.get_motor_collection().create_index("team_name", unique=True)

    print("Conexão com o banco de dados inicializada com sucesso.")

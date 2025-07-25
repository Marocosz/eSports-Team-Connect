import motor.motor_asyncio
from beanie import init_beanie
from .models import User  # Importaremos os modelos que vamos criar
from .config import settings

async def init_db():
    """Inicializa a conexão com o banco de dados e o Beanie."""
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    database = client.get_default_database() # Pega o DB da URI

    await init_beanie(
        database=database,
        document_models=[
            User,
            # Adicione outros modelos aqui no futuro, como Team, Scrim, etc.
        ]
    )
    print("Conexão com o banco de dados inicializada com sucesso.")
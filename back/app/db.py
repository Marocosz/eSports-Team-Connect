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
    
    # TEAM
    await Team.get_motor_collection().create_index("email", unique=True)
    await Team.get_motor_collection().create_index("team_name", unique=True)

    # PLAYER
    await Player.get_motor_collection().create_index("nickname", unique=True)

    # POST
    await Post.get_motor_collection().create_index("created_at")
    await Post.get_motor_collection().create_index("author")

    # SCRIM
    await Scrim.get_motor_collection().create_index("proposing_team")
    await Scrim.get_motor_collection().create_index("opponent_team")
    await Scrim.get_motor_collection().create_index("scrim_datetime")
    await Scrim.get_motor_collection().create_index("game")
    await Scrim.get_motor_collection().create_index("status")

    print("Conexão com o banco de dados inicializada com sucesso.")

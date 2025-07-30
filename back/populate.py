# populate_db.py

import asyncio
from faker import Faker
import motor.motor_asyncio

from beanie import init_beanie
from app.models import Team, Player
from app.config import settings
from app.security import hash_password

# --- Configurações ---
NUMBER_OF_TEAMS = 20  # Quantidade de times falsos que você quer criar
FAKE_PASSWORD = "password123"  # Uma senha padrão para todos os times falsos

async def populate():
    """
    Script para limpar o banco de dados e popular com dados falsos.
    """
    print("Iniciando o script de população...")

    # --- 1. Conectar ao Banco de Dados ---
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.DATABASE_NAME]

    # Inicializa o Beanie com os modelos que vamos usar
    await init_beanie(
        database=database,
        document_models=[Team, Player]
    )
    print("Conexão com o banco de dados estabelecida.")

    # --- 2. Limpar o Banco de Dados ---
    print("Limpando coleções existentes...")
    await Team.delete_all()
    await Player.delete_all()
    print("Coleções limpas com sucesso.")

    # --- 3. Popular com Dados Falsos ---
    print(f"Criando {NUMBER_OF_TEAMS} times falsos...")
    
    fake = Faker('pt_BR')  # Usar dados em português do Brasil
    teams_to_create = []
    
    # Criptografa a senha padrão uma vez
    hashed_fake_password = hash_password(FAKE_PASSWORD)
    
    # Lista de jogos possíveis para diversificar
    games = ["Counter-Strike 2", "Valorant", "League of Legends", "Dota 2", "Fortnite", "Apex Legends"]

    for _ in range(NUMBER_OF_TEAMS):
        team_name = fake.company()
        team_data = Team(
            email=fake.unique.email(),
            team_name=team_name,
            tag=team_name[:4].upper().replace(" ", ""),
            main_game=fake.random_element(elements=games),
            bio=fake.paragraph(nb_sentences=3),
            hashed_password=hashed_fake_password # Usa a senha criptografada
        )
        teams_to_create.append(team_data)

    # Insere todos os times no banco de uma vez só (mais eficiente)
    await Team.insert_many(teams_to_create)

    print("-" * 50)
    print(f"✅ Banco de dados populado com sucesso com {len(teams_to_create)} times.")
    print(f"👉 A senha para todos os times é: '{FAKE_PASSWORD}'")
    print("-" * 50)

if __name__ == "__main__":
    asyncio.run(populate())
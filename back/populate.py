# populate.py - Versão Final com Scrims

import asyncio
import random
from faker import Faker
import motor.motor_asyncio

from beanie import init_beanie
# Importa todos os modelos e Enums necessários
from app.models import (
    Team, Player, Post, Comment, PostAuthor, Scrim,
    GameEnum, LolRoleEnum, ValorantRoleEnum, CsRoleEnum, ScrimStatusEnum
)
from app.config import settings
from app.security import hash_password

# --- Configurações ---
NUMBER_OF_TEAMS = 20
NUMBER_OF_POSTS = 50
NUMBER_OF_SCRIMS = 25 
FAKE_PASSWORD = "password123"

ROLE_MAP = {
    GameEnum.LOL: [r.value for r in LolRoleEnum],
    GameEnum.VALORANT: [r.value for r in ValorantRoleEnum],
    GameEnum.CS: [r.value for r in CsRoleEnum],
}

async def populate():
    """
    Script para limpar o banco de dados e popular com dados falsos e interconectados.
    """
    print("🚀 Iniciando o script de população avançada...")

    # --- 1. Conexão ---
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.DATABASE_NAME]
    # Adiciona Scrim aos modelos a serem inicializados
    await init_beanie(database=database, document_models=[Team, Player, Post, Scrim])
    print("✅ Conexão com o banco de dados estabelecida.")

    # --- 2. Limpeza ---
    print("\n🧹 Limpando coleções existentes...")
    await Team.delete_all()
    await Player.delete_all()
    await Post.delete_all()
    await Scrim.delete_all() # <-- NOVO: Limpa as scrims antigas
    print("✅ Coleções limpas com sucesso.")

    # --- 3. Criar Times ---
    print(f"\n👥 Criando {NUMBER_OF_TEAMS} times falsos...")
    fake = Faker('pt_BR')
    teams_to_create = []
    hashed_fake_password = hash_password(FAKE_PASSWORD)
    valid_games = [game.value for game in GameEnum]

    for _ in range(NUMBER_OF_TEAMS):
        team_name = fake.company()
        team_data = Team(
            email=fake.unique.email(),
            team_name=team_name,
            tag=team_name[:4].upper().replace(" ", ""),
            main_game=random.choice(valid_games),
            bio=fake.paragraph(nb_sentences=3),
            hashed_password=hashed_fake_password
        )
        teams_to_create.append(team_data)
    
    await Team.insert_many(teams_to_create)
    print(f"✅ {len(teams_to_create)} times criados.")
    
    created_teams = await Team.find_all().to_list()

    # --- 4. Criar Jogadores para cada Time ---
    print("\n🎮 Criando jogadores para os times...")
    players_to_create = []
    for team in created_teams:
        num_players = random.randint(2, 5)
        for _ in range(num_players):
            player_data = Player(
                nickname=fake.user_name(),
                full_name=fake.name(),
                role=random.choice(ROLE_MAP.get(team.main_game, [None])),
                team=team
            )
            players_to_create.append(player_data)
    
    await Player.insert_many(players_to_create)
    created_players = await Player.find_all().to_list()

    for team in created_teams:
        team.players = [p for p in created_players if p.team and p.team.to_ref().id == team.id]
        await team.save()
    print(f"✅ {len(created_players)} jogadores criados e associados.")
    
    # --- 5. Criar Posts ---
    print(f"\n📝 Criando {NUMBER_OF_POSTS} posts aleatórios...")
    posts_to_create = []
    for _ in range(NUMBER_OF_POSTS):
        post_data = Post(
            author=random.choice(created_teams),
            content=fake.bs().capitalize() + ". " + fake.paragraph(nb_sentences=2)
        )
        posts_to_create.append(post_data)
        
    await Post.insert_many(posts_to_create)
    created_posts = await Post.find_all().to_list()
    print(f"✅ {len(created_posts)} posts criados.")

    # --- 6. Simular Likes e Comentários ---
    print("\n❤️💬 Simulando likes e comentários...")
    for post in created_posts:
        if random.random() > 0.3:
            num_likes = random.randint(1, len(created_teams) // 2)
            likers = random.sample(created_teams, k=num_likes)
            post.likes = likers
        if random.random() > 0.5:
            num_comments = random.randint(1, 3)
            for _ in range(num_comments):
                commenter = random.choice(created_teams)
                author_data = PostAuthor(id=commenter.id, team_name=commenter.team_name, tag=commenter.tag)
                comment = Comment(author=author_data, content=fake.sentence(nb_words=random.randint(5, 15)))
                post.comments.append(comment)
        if post.likes or post.comments:
            await post.save()
    print("✅ Interações sociais simuladas com sucesso.")

    # --- 7. Simular Scrims ---
    print(f"\n⚔️ Criando {NUMBER_OF_SCRIMS} scrims aleatórias...")
    scrims_to_create = []
    valid_statuses = [s.value for s in ScrimStatusEnum]
    for _ in range(NUMBER_OF_SCRIMS):
        # Sorteia dois times diferentes para a scrim
        proposer, opponent = random.sample(created_teams, k=2)
        
        scrim_data = Scrim(
            proposing_team=proposer,
            opponent_team=opponent,
            scrim_datetime=fake.future_datetime(end_date="+30d"), # Data no futuro
            game=proposer.main_game, # O jogo da scrim é o jogo principal de quem propôs
            status=random.choice(valid_statuses) # Status aleatório
        )
        scrims_to_create.append(scrim_data)
    
    await Scrim.insert_many(scrims_to_create)
    print(f"✅ {len(scrims_to_create)} scrims criadas.")


    # --- Conclusão ---
    print("\n" + "="*50)
    print("🎉 Script de população concluído com sucesso! 🎉")
    print(f"👉 A senha para todos os times é: '{FAKE_PASSWORD}'")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(populate())
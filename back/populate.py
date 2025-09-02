# populate.py - Versão Final com Rede Social Densa

import asyncio
import random
from faker import Faker
import motor.motor_asyncio

from beanie import init_beanie
# Importa todos os modelos e Enums necessários do seu projeto
from app.models import (
    Team, Player, Post, Comment, PostAuthor, Scrim,
    GameEnum, LolRoleEnum, ValorantRoleEnum, CsRoleEnum, ScrimStatusEnum
)
from app.config import settings
from app.security import hash_password

# --- Configurações do Script ---
NUMBER_OF_TEAMS = 100
NUMBER_OF_POSTS = 250
NUMBER_OF_SCRIMS = 100
FAKE_PASSWORD = "password123"

# Mapeia os jogos às suas respectivas funções (roles) para criar jogadores de forma inteligente
ROLE_MAP = {
    GameEnum.LOL: [r.value for r in LolRoleEnum],
    GameEnum.VALORANT: [r.value for r in ValorantRoleEnum],
    GameEnum.CS: [r.value for r in CsRoleEnum],
}

async def populate():
    """
    Script para limpar o banco de dados e popular com dados falsos e interconectados,
    incluindo uma rede de amizades mais densa para testes de recomendação.
    """
    print("🚀 Iniciando o script de população avançada...")

    # --- 1. Conectar ao Banco de Dados ---
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.DATABASE_NAME]
    # Inicializa o Beanie, registrando todos os modelos de Documento
    await init_beanie(database=database, document_models=[Team, Player, Post, Scrim])
    print("✅ Conexão com o banco de dados estabelecida.")

    # --- 2. Limpar Todas as Coleções ---
    print("\n🧹 Limpando coleções existentes...")
    await Team.delete_all()
    await Player.delete_all()
    await Post.delete_all()
    await Scrim.delete_all()
    print("✅ Coleções limpas com sucesso.")

    # --- 3. Criar Times ---
    print(f"\n👥 Criando {NUMBER_OF_TEAMS} times falsos...")
    fake = Faker('pt_BR') # Gera dados em português
    teams_to_create = []
    hashed_fake_password = hash_password(FAKE_PASSWORD)
    valid_games = [game.value for game in GameEnum]

    for _ in range(NUMBER_OF_TEAMS):
        team_name = fake.unique.company()
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
    # Buscamos os times do banco para garantir que temos os objetos completos com IDs
    created_teams = await Team.find_all().to_list()
    print(f"✅ {len(created_teams)} times criados.")

    # --- 4. Criar Amizades ---
    print("\n🤝 Criando uma rede de amizades mais densa...")
    # Cria um "hub" social onde os 5 primeiros times são todos amigos entre si
    hub_teams = created_teams[:5]
    for team1 in hub_teams:
        for team2 in hub_teams:
            if team1.id != team2.id:
                team1.friends.append(team2)
    
    # Adiciona mais amizades aleatórias para o resto dos times
    for team in created_teams:
        num_friends = random.randint(1, 4)
        potential_friends = [f for f in created_teams if f.id != team.id and f not in team.friends]
        new_friends = random.sample(potential_friends, k=min(num_friends, len(potential_friends)))
        for friend in new_friends:
            team.friends.append(friend)
            friend.friends.append(team) # Amizade é mútua, então adicionamos nos dois times
    
    # Salva todas as amizades de uma vez
    for team in created_teams:
        await team.save()
    print("✅ Rede de amizades criada.")
    
    # --- 5. Criar Jogadores para cada Time ---
    print("\n🎮 Criando jogadores para os times...")
    players_to_create = []
    for team in created_teams:
        num_players = random.randint(2, 5)
        for _ in range(num_players):
            player_data = Player(
                nickname=fake.unique.user_name(), # Garante nicknames únicos
                full_name=fake.name(),
                role=random.choice(ROLE_MAP.get(team.main_game, [None])),
                team=team
            )
            players_to_create.append(player_data)
    
    await Player.insert_many(players_to_create)
    created_players = await Player.find_all().to_list()

    # Associa os jogadores criados de volta aos seus times
    for team in created_teams:
        team.players = [p for p in created_players if p.team and p.team.to_ref().id == team.id]
        await team.save()
    print(f"✅ {len(created_players)} jogadores criados e associados.")
    
    # --- 6. Criar Posts ---
    print(f"\n📝 Criando {NUMBER_OF_POSTS} posts aleatórios...")
    posts_to_create = []
    for _ in range(NUMBER_OF_POSTS):
        posts_to_create.append(Post(
            author=random.choice(created_teams),
            content=fake.bs().capitalize() + ". " + fake.paragraph(nb_sentences=2)
        ))
    await Post.insert_many(posts_to_create)
    created_posts = await Post.find_all().to_list()
    print(f"✅ {len(created_posts)} posts criados.")

    # --- 7. Simular Likes e Comentários ---
    print("\n❤️💬 Simulando likes e comentários...")
    for post in created_posts:
        if random.random() > 0.3: # 70% de chance de um post ter likes
            num_likes = random.randint(1, len(created_teams) // 2)
            likers = random.sample(created_teams, k=num_likes)
            post.likes = likers
        if random.random() > 0.5: # 50% de chance de ter comentários
            num_comments = random.randint(1, 3)
            for _ in range(num_comments):
                commenter = random.choice(created_teams)
                author_data = PostAuthor(id=commenter.id, team_name=commenter.team_name, tag=commenter.tag)
                comment = Comment(author=author_data, content=fake.sentence(nb_words=random.randint(5, 15)))
                post.comments.append(comment)
        if post.likes or post.comments:
            await post.save()
    print("✅ Interações sociais simuladas com sucesso.")

    # --- 8. Simular Scrims ---
    print(f"\n⚔️ Criando {NUMBER_OF_SCRIMS} scrims aleatórias...")
    scrims_to_create = []
    valid_statuses = [s.value for s in ScrimStatusEnum]
    for _ in range(NUMBER_OF_SCRIMS):
        proposer, opponent = random.sample(created_teams, k=2)
        scrims_to_create.append(Scrim(
            proposing_team=proposer,
            opponent_team=opponent,
            scrim_datetime=fake.future_datetime(end_date="+30d"),
            game=proposer.main_game,
            status=random.choice(valid_statuses)
        ))
    await Scrim.insert_many(scrims_to_create)
    print(f"✅ {len(scrims_to_create)} scrims criadas.")

    # --- Conclusão ---
    print("\n" + "="*50)
    print("🎉 Script de população concluído com sucesso! 🎉")
    print(f"👉 A senha para todos os times é: '{FAKE_PASSWORD}'")
    print("="*50)

# Permite que o script seja executado diretamente pelo terminal
if __name__ == "__main__":
    asyncio.run(populate())

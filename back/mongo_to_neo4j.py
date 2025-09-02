import asyncio
from neo4j import AsyncGraphDatabase
from app.db import init_db
from app.config import settings
from app.models import Team, Player, Post, Scrim

# Cypher é a linguagem de consulta do Neo4j
# UNWIND é como um "for each" para uma lista de dados que enviamos
# MERGE é como "crie se não existir, encontre se já existir" (evita duplicatas)
# CREATE cria um relacionamento entre dois nós que já existem

async def migrate():
    """
    Script para ler os dados do MongoDB e populacionar um banco de dados Neo4j,
    criando um grafo de relacionamentos.
    """
    print("Iniciando migração de MongoDB para Neo4j...")
    
    # --- 1. Conectar aos Bancos ---
    # Conecta ao MongoDB (usando nossa função já existente)
    await init_db()
    
    # Conecta ao Neo4j
    neo4j_driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI, 
        auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
    )
    
    async with neo4j_driver.session() as session:
        # --- 2. Limpar o Neo4j para garantir uma migração limpa ---
        print("--Limpando banco de dados Neo4j...")
        await session.run("MATCH (n) DETACH DELETE n")
        
        # --- 3. Ler Dados do MongoDB ---
        print("--Lendo dados do MongoDB...")
        all_teams = await Team.find_all(fetch_links=True).to_list()
        all_players = await Player.find_all(fetch_links=True).to_list()
        
        # --- 4. Escrever Nós no Neo4j ---
        print("--Escrevendo Nós no Neo4j...")
        
        # Prepara e escreve os Times
        teams_for_neo4j = [
            {"id": str(t.id), "name": t.team_name, "game": t.main_game} 
            for t in all_teams
        ]
        await session.run(
            "UNWIND $teams AS team MERGE (t:Team {id: team.id}) SET t.name = team.name, t.game = team.game", 
            teams=teams_for_neo4j
        )
        
        # Prepara e escreve os Jogadores
        players_for_neo4j = [
            {"id": str(p.id), "nickname": p.nickname} 
            for p in all_players
        ]
        await session.run(
            "UNWIND $players AS player MERGE (p:Player {id: player.id}) SET p.nickname = player.nickname", 
            players=players_for_neo4j
        )
        
        print(f"✅ {len(all_teams)} Times e {len(all_players)} Jogadores criados como Nós.")
        
        # --- 5. Escrever Relacionamentos no Neo4j ---
        print("--Criando relacionamentos...")
        
        # Relacionamento: Jogadores -> [:PERTENCE_A] -> Times
        player_team_relations = [
            {"player_id": str(p.id), "team_id": str(p.team.id)} 
            for p in all_players if p.team
        ]
        await session.run(
            "UNWIND $relations AS rel MATCH (p:Player {id: rel.player_id}), (t:Team {id: rel.team_id}) CREATE (p)-[:PERTENCE_A]->(t)", 
            relations=player_team_relations
        )

        # Relacionamento: Times -> [:AMIGO_DE] -> Times
        friend_relations = []
        for team in all_teams:
            for friend in team.friends:
                # Adiciona a amizade nos dois sentidos para facilitar as consultas
                friend_relations.append({"team1_id": str(team.id), "team2_id": str(friend.id)})
        await session.run(
            "UNWIND $relations AS rel MATCH (t1:Team {id: rel.team1_id}), (t2:Team {id: rel.team2_id}) MERGE (t1)-[:AMIGO_DE]->(t2)", 
            relations=friend_relations
        )
        
        print("✅ Relacionamentos criados com sucesso.")
        
    await neo4j_driver.close()
    print("\n✅ Migração concluída com sucesso!")

if __name__ == "__main__":
    asyncio.run(migrate())

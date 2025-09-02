from neo4j import AsyncGraphDatabase
from .config import settings
from typing import List, Dict

# Nome que daremos ao nosso grafo projetado na memória do GDS
FRIENDSHIP_GRAPH_NAME = "friendship-graph"

async def get_similar_teams(team_id: str) -> List[Dict]:
    """
    Usa o algoritmo Node Similarity (Jaccard) da GDS Library para encontrar
    times similares a um time específico, com base em amigos em comum.
    """
    driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
    )
    
    async with driver.session() as session:
        try:
            # Etapa 1: Projetar o Grafo na memória do GDS
            await session.run(f"""
                CALL gds.graph.project(
                    '{FRIENDSHIP_GRAPH_NAME}',
                    'Team', 
                    'AMIGO_DE'
                )
            """)

            # Etapa 2: Executar o Algoritmo de Similaridade
            result = await session.run(f"""
                CALL gds.nodeSimilarity.stream('{FRIENDSHIP_GRAPH_NAME}')
                YIELD node1, node2, similarity
                WITH gds.util.asNode(node1) AS team1, gds.util.asNode(node2) AS team2, similarity
                WHERE team1.id = $team_id AND NOT EXISTS((team1)-[:AMIGO_DE]->(team2))
                RETURN 
                    team2.id AS id, 
                    team2.name AS team_name, 
                    team2.game AS main_game,
                    similarity
                ORDER BY similarity DESC
                LIMIT 5
            """, team_id=team_id)
            
            # Etapa 3: Coletar e Formatar os Resultados
            recommendations = [record.data() async for record in result]
            return recommendations

        finally:
            # Etapa 4: Limpeza (remove o grafo da memória)
            await session.run(f"CALL gds.graph.drop('{FRIENDSHIP_GRAPH_NAME}', false)")
            await driver.close()

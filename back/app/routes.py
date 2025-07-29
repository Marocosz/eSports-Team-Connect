from fastapi import APIRouter, HTTPException, status
from typing import List
from beanie import PydanticObjectId
from .models import Team, Player, TeamCreate, TeamOut, PlayerCreate, PlayerOut

router = APIRouter()

# --- Rotas para Times ---

@router.post("/teams", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(team_data: TeamCreate):
    """Cria um novo time."""
    team = Team(**team_data.model_dump())
    await team.insert()
    
    # Como o TeamOut espera uma lista de PlayerOut, e nosso time novo está vazio,
    # a conversão funcionará perfeitamente.
    return team

@router.get("/teams", response_model=List[TeamOut])
async def get_all_teams():
    """Lista todos os times com seus jogadores."""
    # .fetch_links() é o comando do Beanie para buscar os dados dos jogadores linkados
    teams = await Team.find_all().fetch_links().to_list()
    return teams
    
@router.get("/teams/{team_id}", response_model=TeamOut)
async def get_team(team_id: PydanticObjectId):
    """Busca um time específico pelo seu ID, incluindo os jogadores."""
    team = await Team.get(team_id, fetch_links=True)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    return team

# --- Rotas para Jogadores ---

@router.post("/teams/{team_id}/players", response_model=PlayerOut)
async def add_player_to_team(team_id: PydanticObjectId, player_data: PlayerCreate):
    """Adiciona um novo jogador a um time existente."""
    team = await Team.get(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")

    player = Player(**player_data.model_dump(), team=team)
    await player.insert()

    # Adiciona o link do novo jogador à lista de jogadores do time
    team.players.append(player)
    await team.save()

    return player
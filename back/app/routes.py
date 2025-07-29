# app/routes.py

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Annotated
from beanie import PydanticObjectId
from datetime import timedelta

from .models import Team, Player, TeamCreate, TeamOut, PlayerCreate, PlayerOut, Token
from .security import hash_password, verify_password, create_access_token, get_current_team
from fastapi.security import OAuth2PasswordRequestForm
from .config import settings

router = APIRouter()

# --- Rotas Públicas (Registro e Login) ---

@router.post("/teams", response_model=TeamOut, status_code=status.HTTP_201_CREATED, tags=["Auth"])
async def create_team(team_data: TeamCreate):
    """Cria um novo time (registro de conta). Esta é uma rota pública."""
    existing_team = await Team.find_one(Team.email == team_data.email)
    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Um time com este email já foi registrado.",
        )

    hashed_pass = hash_password(team_data.password)
    team_dict = team_data.model_dump()
    team_dict.pop("password")
    team = Team(**team_dict, hashed_password=hashed_pass)
    
    await team.insert()
    return team

@router.post("/login", response_model=Token, tags=["Auth"])
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Autentica um time e retorna um token de acesso."""
    team = await Team.find_one(Team.email == form_data.username)
    if not team or not verify_password(form_data.password, team.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(team.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Rotas Públicas (Visualização) ---

@router.get("/teams", response_model=List[TeamOut], tags=["Teams"])
async def get_all_teams():
    """Lista todos os times com seus jogadores. Rota pública."""
    teams = await Team.find_all(fetch_links=True).to_list()
    return teams
    
@router.get("/teams/{team_id}", response_model=TeamOut, tags=["Teams"])
async def get_team(team_id: PydanticObjectId):
    """Busca um time específico pelo seu ID. Rota pública."""
    team = await Team.get(team_id, fetch_links=True)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    return team

# --- Rotas Protegidas (Ações que exigem login) ---

@router.get("/teams/me/profile", response_model=TeamOut, tags=["Profile (Protected)"])
async def get_my_team_profile(current_team: Annotated[Team, Depends(get_current_team)]):
    """Retorna o perfil do time atualmente logado."""
    # A dependência `get_current_team` já busca o time no banco e o retorna.
    # E como a `TeamOut` espera os players, precisamos carregar os links.
    await current_team.fetch_links(Team.players)
    return current_team

@router.post("/teams/{team_id}/players", response_model=PlayerOut, tags=["Players (Protected)"])
async def add_player_to_team(
    team_id: PydanticObjectId, 
    player_data: PlayerCreate,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """
    Adiciona um novo jogador a um time.
    Apenas o time autenticado pode adicionar jogadores a si mesmo.
    """
    # A dependência `get_current_team` já nos dá o time logado.
    # Agora, verificamos se o ID do time logado é o mesmo da URL.
    if current_team.id != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para adicionar jogadores a este time."
        )

    # Como a verificação passou, podemos usar o objeto `current_team` que já foi pego do banco.
    player = Player(**player_data.model_dump(), team=current_team)
    await player.insert()

    current_team.players.append(player)
    await current_team.save()

    return player
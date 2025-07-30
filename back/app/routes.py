# app/routes.py - VERSÃO COMPLETA E CORRIGIDA

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Annotated
from beanie import PydanticObjectId
from datetime import timedelta

# Importação de todos os modelos necessários
from .models import (
    Team, Player, Post, Comment,
    TeamCreate, TeamOut,
    PlayerCreate, PlayerOut,
    PostCreate, PostOut,
    CommentCreate,
    Token, FriendInfo, TeamUpdate
)
# Importação de todas as funções de segurança e configuração
from .security import hash_password, verify_password, create_access_token, get_current_team
from fastapi.security import OAuth2PasswordRequestForm
from .config import settings

# Inicialização do Router
router = APIRouter()

# =============================================================================
# --- Rotas de Autenticação e Registro ---
# =============================================================================

@router.post("/teams", response_model=TeamOut, status_code=status.HTTP_201_CREATED, tags=["Auth & Registration"])
async def create_team(team_data: TeamCreate):
    """Cria um novo time (registro de conta). Esta é uma rota pública."""
    existing_team = await Team.find_one(Team.email == team_data.email)
    if existing_team:
        raise HTTPException(status_code=400, detail="Um time com este email já foi registrado.")
    
    hashed_pass = hash_password(team_data.password)
    team_dict = team_data.model_dump()
    team_dict.pop("password")
    team = Team(**team_dict, hashed_password=hashed_pass)
    
    await team.insert()
    # Retornar o objeto team é seguro pois o response_model=TeamOut filtra os campos
    return team

@router.post("/login", response_model=Token, tags=["Auth & Registration"])
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Autentica um time e retorna um token de acesso."""
    team = await Team.find_one(Team.email == form_data.username)
    if not team or not verify_password(form_data.password, team.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos", headers={"WWW-Authenticate": "Bearer"})
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(team.id)}, expires_delta=access_token_expires)
    
    return {"access_token": access_token, "token_type": "bearer"}

# =============================================================================
# --- Rotas Públicas de Visualização ---
# =============================================================================

@router.get("/teams", response_model=List[TeamOut], tags=["Teams & Profiles"])
async def get_all_teams():
    """Lista todos os times com seus jogadores. Rota pública."""
    teams = await Team.find_all(fetch_links=True).to_list()
    return teams

@router.get("/teams/{team_id}", response_model=TeamOut, tags=["Teams & Profiles"])
async def get_team(team_id: PydanticObjectId):
    """Busca um time específico pelo seu ID. Rota pública."""
    team = await Team.get(team_id, fetch_links=True)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    return team

@router.get("/posts", response_model=List[PostOut], tags=["Posts"])
async def get_all_posts():
    """Lista todos os posts do feed, do mais novo para o mais antigo. Rota pública."""
    posts = await Post.find_all(fetch_links=True).sort(-Post.created_at).to_list()
    
    posts_out = []
    for post in posts:
        post_dict = post.model_dump()
        post_dict["likes"] = [like.to_ref().id for like in post.likes]
        post_dict["likes_count"] = len(post.likes)
        posts_out.append(PostOut(**post_dict))
    return posts_out

# =============================================================================
# --- Rotas Protegidas (Exigem Login) ---
# =============================================================================

@router.get("/teams/me/profile", response_model=TeamOut, tags=["Profile (Protected)"])
async def get_my_team_profile(current_team: Annotated[Team, Depends(get_current_team)]):
    """Retorna o perfil do time atualmente logado."""
    await current_team.fetch_link(Team.players)
    return current_team

@router.post("/teams/{team_id}/players", response_model=PlayerOut, tags=["Players (Protected)"])
async def add_player_to_team(team_id: PydanticObjectId, player_data: PlayerCreate, current_team: Annotated[Team, Depends(get_current_team)]):
    """Adiciona um novo jogador a um time. Apenas o time autenticado pode adicionar jogadores a si mesmo."""
    if current_team.id != team_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para adicionar jogadores a este time.")
    
    player = Player(**player_data.model_dump(), team=current_team)
    await player.insert()
    current_team.players.append(player)
    await current_team.save()
    return player

@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED, tags=["Posts (Protected)"])
async def create_post(post_data: PostCreate, current_team: Annotated[Team, Depends(get_current_team)]):
    """Cria um novo post. Apenas para usuários (times) autenticados."""
    post = Post(content=post_data.content, author=current_team)
    await post.insert()
    await post.fetch_link(Post.author)
    post_dict = post.model_dump()
    post_dict["likes"] = []
    post_dict["likes_count"] = 0
    return PostOut(**post_dict)

@router.post("/posts/{post_id}/like", response_model=PostOut, tags=["Posts (Protected)"])
async def toggle_like_post(post_id: PydanticObjectId, current_team: Annotated[Team, Depends(get_current_team)]):
    """Adiciona ou remove um like de um post."""
    post = await Post.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    found = False
    for team_link in post.likes:
        if team_link.to_ref().id == current_team.id:
            post.likes.remove(team_link)
            found = True
            break
    if not found:
        post.likes.append(current_team)
    await post.save()
    
    await post.fetch_link(Post.author)
    post_dict = post.model_dump()
    post_dict["likes"] = [like.to_ref().id for like in post.likes]
    post_dict["likes_count"] = len(post.likes)
    return PostOut(**post_dict)

@router.post("/posts/{post_id}/comments", response_model=Comment, status_code=status.HTTP_201_CREATED, tags=["Posts (Protected)"])
async def create_comment_on_post(post_id: PydanticObjectId, comment_data: CommentCreate, current_team: Annotated[Team, Depends(get_current_team)]):
    """Adiciona um novo comentário a um post."""
    post = await Post.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    author_data = current_team.model_dump(include={'id', 'team_name', 'tag'})
    new_comment = Comment(author=author_data, content=comment_data.content)
    post.comments.append(new_comment)
    await post.save()
    return new_comment

# --- Rotas para Amizades (Protegidas) ---
@router.post("/friends/request/{target_team_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Friends (Protected)"])
async def send_friend_request(target_team_id: PydanticObjectId, current_team: Annotated[Team, Depends(get_current_team)]):
    """Envia um pedido de amizade para outro time."""
    target_team = await Team.get(target_team_id)
    if not target_team or target_team.id == current_team.id:
        raise HTTPException(status_code=404, detail="Time alvo não encontrado ou inválido.")

    # Forma segura de verificar se o pedido já foi enviado ou se já são amigos
    sent_ids = [req.to_ref().id for req in current_team.friend_requests_sent]
    friend_ids = [friend.to_ref().id for friend in current_team.friends]
    if target_team.id in sent_ids or target_team.id in friend_ids:
        raise HTTPException(status_code=400, detail="Pedido de amizade já enviado ou já são amigos.")

    current_team.friend_requests_sent.append(target_team)
    target_team.friend_requests_received.append(current_team)
    await current_team.save()
    await target_team.save()
    return None

@router.post("/friends/accept/{requester_team_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Friends (Protected)"])
async def accept_friend_request(requester_team_id: PydanticObjectId, current_team: Annotated[Team, Depends(get_current_team)]):
    """Aceita um pedido de amizade recebido."""
    requester_team = await Team.get(requester_team_id)
    if not requester_team:
        raise HTTPException(status_code=404, detail="Time solicitante não encontrado.")

    # Forma segura de verificar se o pedido existe antes de aceitar
    received_ids = [req.to_ref().id for req in current_team.friend_requests_received]
    if requester_team.id not in received_ids:
        raise HTTPException(status_code=404, detail="Pedido de amizade não encontrado.")

    # Encontra os links exatos para remover
    request_to_remove_from_current = next((link for link in current_team.friend_requests_received if link.to_ref().id == requester_team.id), None)
    request_to_remove_from_requester = next((link for link in requester_team.friend_requests_sent if link.to_ref().id == current_team.id), None)
    
    if request_to_remove_from_current:
        current_team.friend_requests_received.remove(request_to_remove_from_current)
    if request_to_remove_from_requester:
        requester_team.friend_requests_sent.remove(request_to_remove_from_requester)

    current_team.friends.append(requester_team)
    requester_team.friends.append(current_team)
    await current_team.save()
    await requester_team.save()
    return None

@router.get("/friends", response_model=List[FriendInfo], tags=["Friends (Protected)"])
async def get_my_friends(current_team: Annotated[Team, Depends(get_current_team)]):
    """Retorna a lista de amigos do time logado."""
    await current_team.fetch_link(Team.friends)
    return current_team.friends

@router.get("/friends/requests", response_model=List[FriendInfo], tags=["Friends (Protected)"])
async def get_my_friend_requests(current_team: Annotated[Team, Depends(get_current_team)]):
    """Retorna a lista de pedidos de amizade recebidos pelo time logado."""
    await current_team.fetch_link(Team.friend_requests_received)
    return current_team.friend_requests_received

@router.get("/teams/{team_id}/posts", response_model=List[PostOut], tags=["Teams & Profiles"])
async def get_posts_by_team(team_id: PydanticObjectId):
    """Retorna todos os posts feitos por um time específico."""
    team = await Team.get(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")

    # Encontra todos os posts onde o autor corresponde ao ID do time
    posts = await Post.find(Post.author.id == team.id, fetch_links=True).sort(-Post.created_at).to_list()
    
    # Prepara a resposta PostOut com a contagem de likes
    posts_out = []
    for post in posts:
        post_dict = post.model_dump()
        post_dict["likes"] = [like.to_ref().id for like in post.likes]
        post_dict["likes_count"] = len(post.likes)
        posts_out.append(PostOut(**post_dict))
    return posts_out

@router.get("/teams/{team_id}/friends", response_model=List[FriendInfo], tags=["Friends"])
async def get_team_friends(team_id: PydanticObjectId):
    """Retorna a lista de amigos de um time específico."""
    team = await Team.get(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    
    await team.fetch_link(Team.friends)
    return team.friends

@router.put("/teams/me/profile", response_model=TeamOut, tags=["Profile (Protected)"])
async def update_my_team_profile(
    update_data: TeamUpdate,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Atualiza o perfil do time logado."""
    # Converte os dados recebidos em um dicionário, excluindo campos não enviados
    update_dict = update_data.model_dump(exclude_unset=True)

    # Itera sobre os dados recebidos e atualiza o documento do time
    for key, value in update_dict.items():
        setattr(current_team, key, value)
    
    # Salva as alterações no banco de dados
    await current_team.save()

    # Retorna o perfil completo e atualizado
    await current_team.fetch_link(Team.players)
    return current_team
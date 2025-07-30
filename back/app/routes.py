# app/routes.py

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Annotated
from beanie import PydanticObjectId
from datetime import timedelta

from .models import Team, Player, TeamCreate, TeamOut, PlayerCreate, PlayerOut, Token, Post, PostCreate, PostOut, Comment, PostAuthor, CommentCreate
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
    await current_team.fetch_link(Team.players)
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

@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED, tags=["Posts"])
async def create_post(
    post_data: PostCreate,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """
    Cria um novo post. Apenas para usuários (times) autenticados.
    """
    post = Post(content=post_data.content, author=current_team)
    await post.insert()

    # Para que o PostOut funcione, precisamos carregar os dados do autor
    await post.fetch_link(Post.author)

    # --- CORREÇÃO AQUI ---
    # Manualmente cria a resposta PostOut, calculando o likes_count
    post_dict = post.model_dump()
    post_dict["likes_count"] = len(post.likes) # Será 0 para um post novo

    return PostOut(**post_dict)

# Substitua a função get_all_posts
@router.get("/posts", response_model=List[PostOut], tags=["Posts"])
async def get_all_posts():
    posts = await Post.find_all(fetch_links=True).sort(-Post.created_at).to_list()
    posts_out = []
    for post in posts:
        post_dict = post.model_dump()
        post_dict["likes"] = [like.id for like in post.likes] # Converte Links para IDs
        post_dict["likes_count"] = len(post.likes)
        posts_out.append(PostOut(**post_dict))
    return posts_out


@router.post("/posts/{post_id}/like", response_model=PostOut, tags=["Posts"])
async def toggle_like_post(
    post_id: PydanticObjectId,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """
    Adiciona ou remove um like de um post.
    """
    post = await Post.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    # Lógica de "toggle" para curtir/descurtir
    found = False
    for team_link in post.likes:
        if team_link.to_ref().id == current_team.id:
            post.likes.remove(team_link)
            found = True
            break
    
    if not found:
        post.likes.append(current_team)
    
    await post.save()
    
    # Prepara a resposta correta
    # --- CORREÇÃO AQUI ---
    # Usamos .fetch_link() no singular e especificamos o campo 'author'
    await post.fetch_link(Post.author)
    
    post_dict = post.model_dump()
    post_dict["likes"] = [like.to_ref().id for like in post.likes]
    post_dict["likes_count"] = len(post.likes)
    return PostOut(**post_dict)


@router.post("/posts/{post_id}/comments", response_model=Comment, status_code=status.HTTP_201_CREATED, tags=["Posts"])
async def create_comment_on_post(
    post_id: PydanticObjectId,
    comment_data: CommentCreate, # <-- MUDANÇA AQUI
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """ Adiciona um novo comentário a um post. """
    post = await Post.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    author_data = PostAuthor(
        id=current_team.id,
        team_name=current_team.team_name,
        tag=current_team.tag
    )
    
    # Usa o conteúdo de comment_data.content
    new_comment = Comment(author=author_data, content=comment_data.content) # <-- MUDANÇA AQUI
    
    post.comments.append(new_comment)
    await post.save()
    
    return new_comment
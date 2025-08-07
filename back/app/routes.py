# app/routes.py - VERSÃO COMPLETA E ORGANIZADA

from fastapi import APIRouter, HTTPException, status, Depends,  Query
from typing import List, Annotated, Optional
from beanie import PydanticObjectId
from datetime import timedelta

# Importação de todos os modelos necessários
from .models import (
    Team, Player, Post, Comment,
    TeamCreate, TeamOut,
    PlayerCreate, PlayerOut,
    PostCreate, PostOut,
    CommentCreate,
    Token, FriendInfo, TeamUpdate, LolRoleEnum,
    ValorantRoleEnum, CsRoleEnum, GameEnum,
    Scrim, ScrimCreate, ScrimOut, ScrimStatusEnum
)
from .security import hash_password, verify_password, create_access_token, get_current_team
from fastapi.security import OAuth2PasswordRequestForm
from .config import settings
from beanie.odm.operators.find.logical import Or
from beanie.odm.operators.find.evaluation import RegEx

# Inicialização do Router
router = APIRouter()

# =============================================================================
# --- Rotas de Autenticação e Registro ---
# =============================================================================

# async: definição de função assincrona
# await: Ponto de pausa para rodar outras funções sem parar de fato

# responde_model=TeamOut para deifinir como será o retorno desse endpoint
@router.post("/teams", response_model=TeamOut, status_code=status.HTTP_201_CREATED, tags=["Auth & Registration"])
async def create_team(team_data: TeamCreate):
    """Cria um novo time (registro de conta). Esta é uma rota pública."""
    existing_team = await Team.find_one(Team.email == team_data.email)
    if existing_team:
        raise HTTPException(
            status_code=400, detail="Um time com este email já foi registrado.")

    hashed_pass = hash_password(team_data.password)
    team_dict = team_data.model_dump()  # Transforma o team_data em um dict
    team_dict.pop("password")  # Remove a senha
    # Passa as informações para o banco de dados criar o item da coleção
    team = Team(**team_dict, hashed_password=hashed_pass)

    await team.insert()  # Aq de fato o documento é criado na coleçaõ
    # Retornar o objeto team é seguro pois o response_model=TeamOut filtra os campos
    return team

# Vai retornar um Token
@router.post("/login", response_model=Token, tags=["Auth & Registration"])
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Autentica um time e retorna um token de acesso."""
    team = await Team.find_one(Team.email == form_data.username)
    if not team or not verify_password(form_data.password, team.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos", headers={
                            "WWW-Authenticate": "Bearer"})

    # Cria o token do login para o usuário
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(team.id)}, expires_delta=access_token_expires)

    return {"access_token": access_token, "token_type": "bearer"}

# =============================================================================
# --- Rotas de Times e Perfis ---
# =============================================================================

@router.get("/teams/search", response_model=List[FriendInfo], tags=["Teams & Profiles"])
async def search_teams(q: Annotated[str, Query(min_length=1)]):
    """
    Busca por times cujo nome corresponde a uma query de busca.
    """
    teams = await Team.find(
        RegEx(Team.team_name, pattern=q, options="i")
    ).to_list()
    
    return teams

# Retorna uma lista de times no modelo TeamOut
@router.get("/teams", response_model=List[TeamOut], tags=["Teams & Profiles"])
async def get_all_teams():
    """Lista todos os times com seus jogadores. Rota pública."""
    teams = await Team.find_all(fetch_links=True).to_list()
    return teams


# Retorna o team por ID no modelo TeamOut
@router.get("/teams/{team_id}", response_model=TeamOut, tags=["Teams & Profiles"])
async def get_team(team_id: PydanticObjectId):
    """Busca um time específico pelo seu ID. Rota pública."""
    team = await Team.get(team_id, fetch_links=True)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    return team

# Retorna os posts de um time específico.
@router.get("/teams/{team_id}/posts", response_model=List[PostOut], tags=["Teams & Profiles"])
# Recebe o ID do time pela URL.
async def get_posts_by_team(team_id: PydanticObjectId):
    """Retorna todos os posts feitos por um time específico."""
    # Busca o time no banco para garantir que ele existe.
    team = await Team.get(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")

    # Encontra todos os posts onde o autor corresponde ao ID do time.
    posts = await Post.find(Post.author.id == team.id, fetch_links=True).sort(-Post.created_at).to_list()

    # Prepara a resposta no formato PostOut, que precisa do `likes_count`.
    posts_out = []
    for post in posts:
        post_dict = post.model_dump()
        post_dict["likes"] = [like.to_ref().id for like in post.likes]
        post_dict["likes_count"] = len(post.likes)
        posts_out.append(PostOut(**post_dict))
    return posts_out

# Annotated: Ele separa o "o quê" (o tipo final, ex: Team) do "como" (a instrução para obtê-lo, ex: Depends(...)).
# Retorna o current_team no modelo TeamOut
@router.get("/teams/me/profile", response_model=TeamOut, tags=["Profile (Protected)"])
async def get_my_team_profile(current_team: Annotated[Team, Depends(get_current_team)]):
    """Retorna o perfil do time atualmente logado."""
    await current_team.fetch_link(Team.players)  # Fetch_link para pegar os dados dos jogadores
    return current_team

# Rota para atualizar o perfil do time logado. Responde a requisições PUT.
@router.put("/teams/me/profile", response_model=TeamOut, tags=["Profile (Protected)"])
async def update_my_team_profile(
    # Recebe os dados a serem atualizados, validados pelo modelo TeamUpdate.
    update_data: TeamUpdate,
    # Garante a autenticação e nos dá o objeto do time logado.
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Atualiza o perfil do time logado."""
    # Converte os dados recebidos em um dicionário, excluindo campos que o usuário não enviou.
    update_dict = update_data.model_dump(exclude_unset=True)

    # Itera sobre os dados recebidos e atualiza o documento do time campo por campo.
    for key, value in update_dict.items():
        setattr(current_team, key, value)

    # Salva o objeto `current_team` com as alterações de volta no banco de dados.
    await current_team.save()

    # Carrega a lista de jogadores para que a resposta seja completa.
    await current_team.fetch_link(Team.players)
    # Retorna o perfil completo e atualizado.
    return current_team



# =============================================================================
# --- Rotas de Players ---
# =============================================================================

# Define a rota (com ID dinâmico), o que ela retorna (PlayerOut) e a tag para a documentação
@router.post("/teams/{team_id}/players", response_model=PlayerOut, tags=["Players (Protected)"])
# A função recebe o ID do time da URL, os dados do jogador e o time logado (autenticado)
async def add_player_to_team(
    team_id: PydanticObjectId,
    player_data: PlayerCreate,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """
    Adiciona um novo jogador a um time, validando a função (role)
    de acordo com o jogo principal do time.
    """

    # Etapa de AUTORIZAÇÃO: Verifica se o time logado é o mesmo da URL.
    if current_team.id != team_id:
        raise HTTPException(
            status_code=status.HTTP_403,
            detail="Você não tem permissão para adicionar jogadores a este time."
        )

    # --- LÓGICA NOVA DE VALIDAÇÃO DA FUNÇÃO (ROLE) ---

    # Pega o jogo principal do time e a função do jogador a ser criado.
    team_game = current_team.main_game
    player_role = player_data.role

    # Só executa a validação se uma função e um jogo principal foram definidos.
    if player_role and team_game:
        # Inicia uma "bandeira" para controlar se a função é válida.
        is_role_valid = False

        # Se o jogo for LoL, verifica se a função está na lista de funções de LoL.
        if team_game == GameEnum.LOL and player_role in LolRoleEnum._value2member_map_:
            is_role_valid = True
        # Se o jogo for Valorant, verifica se a função está na lista de funções de Valorant.
        elif team_game == GameEnum.VALORANT and player_role in ValorantRoleEnum._value2member_map_:
            is_role_valid = True
        # Se o jogo for CS, verifica se a função está na lista de funções de CS.
        elif team_game == GameEnum.CS and player_role in CsRoleEnum._value2member_map_:
            is_role_valid = True

        # Se, após todas as verificações, a função não for válida para o jogo, retorna um erro.
        if not is_role_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A função '{player_role}' não é válida para o jogo '{team_game}'.",
            )

    # Se a validação passou, cria a instância do novo jogador e o associa ao time logado.
    player = Player(**player_data.model_dump(), team=current_team)
    # Insere o novo jogador na coleção 'players'.
    await player.insert()

    # Adiciona o jogador à lista de jogadores do time e salva a alteração.
    current_team.players.append(player)
    await current_team.save()

    # Retorna os dados do jogador recém-criado.
    return player


# Define a rota DELETE com o ID do jogador na URL.
@router.delete("/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Players (Protected)"])
# A função recebe o ID do jogador a ser deletado e o time logado (autenticado).
async def delete_player_from_team(
    player_id: PydanticObjectId,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """
    Exclui um jogador de um time.
    Apenas o time dono do jogador pode excluí-lo.
    """
    # Busca o jogador pelo ID no banco de dados e já carrega o link do seu time.
    player_to_delete = await Player.get(player_id, fetch_links=True)
    # Se o jogador não for encontrado, retorna um erro 404.
    if not player_to_delete:
        raise HTTPException(status_code=404, detail="Jogador não encontrado.")

    # Etapa de AUTORIZAÇÃO: Verifica se o jogador realmente pertence ao time que está logado.
    # Se o jogador não tiver time ou o ID do time dele for diferente do time logado, retorna um erro 403.
    if not player_to_delete.team or player_to_delete.team.id != current_team.id:
        raise HTTPException(
            status_code=403, detail="Você não tem permissão para excluir este jogador.")

    # Se a autorização passar, exclui o documento do jogador da coleção 'players'.
    await player_to_delete.delete()

    # Para manter a consistência, também removemos a referência (Link) do jogador da lista de jogadores do time.
    # Encontra o link exato na lista do time.
    link_to_remove = next(
        (link for link in current_team.players if link.to_ref().id == player_id), None)
    # Se o link for encontrado, remove-o e salva o documento do time.
    if link_to_remove:
        current_team.players.remove(link_to_remove)
        await current_team.save()

    # Retorna `None` com o status 204, indicando que a operação foi bem-sucedida.
    return None

# =============================================================================
# --- Rotas de Posts e Comentários ---
# =============================================================================

# Retorna uma lista de PostOut
@router.get("/posts", response_model=List[PostOut], tags=["Posts"])
async def get_all_posts():
    """Lista todos os posts do feed, do mais novo para o mais antigo. Rota pública."""
    # fetch_links para: "Quando você encontrar os posts, olhe para os campos que são Links (como o campo author)"
    # ordenado por data de criação
    posts = await Post.find_all(fetch_links=True).sort(-Post.created_at).to_list()

    posts_out = []
    for post in posts:
        post_dict = post.model_dump()
        post_dict["likes"] = [like.to_ref().id for like in post.likes]
        post_dict["likes_count"] = len(post.likes)
        posts_out.append(PostOut(**post_dict))
    return posts_out

# Define a rota, o que ela retorna (PostOut)
@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED, tags=["Posts (Protected)"])
# A função recebe os dados do post (PostCreate) e o time logado (autenticado pela dependência).
async def create_post(
    post_data: PostCreate,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Cria um novo post. Apenas para usuários (times) autenticados."""
    # Cria a instância do novo post, associando o conteúdo recebido e o time logado como autor.
    post = Post(content=post_data.content, author=current_team)
    # Insere o novo post na coleção 'posts' do banco de dados.
    await post.insert()
    # Carrega os dados completos do autor para que possam ser incluídos na resposta.
    await post.fetch_link(Post.author)
    # Converte o objeto Post em um dicionário para facilitar a manipulação.
    post_dict = post.model_dump()
    # Adiciona os campos de likes (vazios, pois o post é novo) para corresponder ao modelo PostOut.
    post_dict["likes"] = []
    post_dict["likes_count"] = 0
    # Cria e retorna um objeto PostOut com todos os dados necessários, garantindo que a resposta esteja correta.
    return PostOut(**post_dict)

# Retorna no modelo PostOut
@router.post("/posts/{post_id}/like", response_model=PostOut, tags=["Posts (Protected)"])
async def toggle_like_post(post_id: PydanticObjectId, current_team: Annotated[Team, Depends(get_current_team)]):
    """Adiciona ou remove um like de um post."""
    post = await Post.get(post_id)  # Pega o post pelo ID passado pelo endpoint
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    found = False  # Bandeira
    # Para cada like do post
    for team_link in post.likes:
        # o ".to_ref()" serve para pegarmos os dados brutos daquele documento
        # Se dentro dos likes o current_team estiver é para remover o like
        if team_link.to_ref().id == current_team.id:
            post.likes.remove(team_link)
            found = True
            break
    if not found:
        # Se não estiver, é para adicionar o like
        post.likes.append(current_team)
    await post.save()

    await post.fetch_link(Post.author)  # Carrega os dados do autor do post
    post_dict = post.model_dump()
    # Lista com apenas os times que curtiram o post
    post_dict["likes"] = [like.to_ref().id for like in post.likes]
    # Atualiza a quantidade de likes do post
    post_dict["likes_count"] = len(post.likes)
    # Retorna os dados atualizados no modelo PostOut  ** Serve para desempacator o dict
    return PostOut(**post_dict)

# Define a rota (com ID do post), o que ela retorna (o Comentário criado)
@router.post("/posts/{post_id}/comments", response_model=Comment, status_code=status.HTTP_201_CREATED, tags=["Posts (Protected)"])
# A função recebe o ID do post da URL, o conteúdo do comentário (CommentCreate) e o time logado (autenticado).
async def create_comment_on_post(
    post_id: PydanticObjectId,
    comment_data: CommentCreate,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Adiciona um novo comentário a um post."""
    # Busca no banco de dados o post que será comentado, usando o ID da URL.
    post = await Post.get(post_id)
    # Se o post não for encontrado, retorna um erro 404.
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    # Prepara os dados do autor do comentário (o time logado), pegando apenas os campos públicos necessários.
    author_data = current_team.model_dump(include={'id', 'team_name', 'tag'})
    # Cria a instância do novo comentário com os dados do autor e o conteúdo recebido.
    new_comment = Comment(author=author_data, content=comment_data.content)
    # Adiciona o novo comentário à lista de comentários embutida no documento do post.
    post.comments.append(new_comment)
    # Salva o documento do post, agora com o novo comentário na sua lista.
    await post.save()
    # Retorna o comentário recém-criado, que será enviado como resposta JSON.
    return new_comment


# Retorna uma lista dos 5 posts mais populares no modelo PostOut
@router.get("/posts/popular", response_model=List[PostOut], tags=["Posts"])
async def get_popular_posts():
    """
    Retorna os 5 posts mais populares (com mais likes), usando Aggregation Pipeline
    para máxima performance.
    """
    # Define as etapas do Aggregation Pipeline, que serão executadas em ordem.
    pipeline = [
        # Etapa 1: Adiciona um campo temporário 'likes_count' a cada post,
        # calculado pelo tamanho ($size) do seu array 'likes'.
        {
            "$addFields": {
                "likes_count": {"$size": "$likes"}
            }
        },
        # Etapa 2: Ordena todos os posts pelo novo campo 'likes_count',
        # em ordem descendente (-1 significa do maior para o menor).
        {
            "$sort": {
                "likes_count": -1
            }
        },
        # Etapa 3: Pega apenas os 5 primeiros documentos da lista ordenada (o Top 5).
        {
            "$limit": 5
        },
        # Etapa 4: "Junta" ('join') com a coleção 'teams' para buscar os dados do autor de cada post.
        # Isso substitui o `fetch_links=True` de forma mais explícita.
        {
            "$lookup": {
                "from": "teams",
                "localField": "author.$id",  # O campo no post que faz a ligação
                "foreignField": "_id",     # O campo no time que faz a ligação
                "as": "author_details"     # O nome do novo campo que conterá os dados do autor
            }
        },
        # Etapa 5: O $lookup retorna o autor como uma lista. O $unwind desempacota essa lista.
        {
            "$unwind": "$author_details"
        },
        # Etapa 6: Formata ("projeta") o documento final para corresponder ao nosso modelo `PostOut`.
        {
            "$project": {
                "id": "$_id",  # Renomeia o campo _id para id.
                "content": "$content",
                "created_at": "$created_at",
                # Cria o sub-documento 'author' no formato que o PostAuthor espera.
                "author": {
                    "id": "$author_details._id",
                    "team_name": "$author_details.team_name",
                    "tag": "$author_details.tag"
                },
                # Mantém o campo 'likes_count' que já calculamos.
                "likes_count": "$likes_count",
                # Transforma a lista de Links de likes em uma lista de IDs.
                "likes": {
                    "$map": {
                        "input": "$likes",
                        "as": "like",
                        "in": "$$like.$id"
                    }
                },
                # Mantém a lista de comentários como está.
                "comments": "$comments"
            }
        }
    ]

    # Executa a pipeline no banco de dados.
    # O `projection_model=PostOut` converte o resultado diretamente para uma lista de objetos PostOut.
    posts = await Post.aggregate(pipeline, projection_model=PostOut).to_list()

    # Retorna a lista final com os 5 posts mais populares.
    return posts

# =============================================================================
# --- Rotas para Amizades ---
# =============================================================================

# Define a rota POST com um ID de time dinâmico na URL.
@router.post("/friends/request/{target_team_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Friends (Protected)"])
# A função recebe o ID do time alvo da URL e o time logado (autenticado).
async def send_friend_request(
    target_team_id: PydanticObjectId,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Envia um pedido de amizade para outro time."""
    # Busca o documento completo do time que receberá o pedido.
    target_team = await Team.get(target_team_id)
    # Validação: Garante que o time alvo existe e que o usuário não está tentando adicionar a si mesmo.
    if not target_team or target_team.id == current_team.id:
        raise HTTPException(
            status_code=404, detail="Time alvo não encontrado ou inválido.")

    # Forma segura de verificar se o pedido já foi enviado ou se já são amigos.
    # Primeiro, criamos uma lista apenas com os IDs dos pedidos já enviados.
    sent_ids = [req.to_ref().id for req in current_team.friend_requests_sent]
    # Depois, criamos uma lista com os IDs dos amigos atuais.
    friend_ids = [friend.to_ref().id for friend in current_team.friends]
    # Se o ID do time alvo já estiver em qualquer uma das listas, retorna um erro.
    if target_team.id in sent_ids or target_team.id in friend_ids:
        raise HTTPException(
            status_code=400, detail="Pedido de amizade já enviado ou já são amigos.")

    # Adiciona o time alvo à lista de pedidos enviados do time logado.
    current_team.friend_requests_sent.append(target_team)
    # Adiciona o time logado à lista de pedidos recebidos do time alvo.
    target_team.friend_requests_received.append(current_team)

    # Salva as alterações no documento do time logado.
    await current_team.save()
    # Salva as alterações no documento do time alvo.
    await target_team.save()

    # Retorna `None`, que, junto com o status_code=204, envia uma resposta vazia de sucesso.
    return None

# Define a rota POST com o ID do time solicitante na URL.
@router.post("/friends/accept/{requester_team_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Friends (Protected)"])
# A função recebe o ID do solicitante da URL e o time logado (autenticado).
async def accept_friend_request(
    requester_team_id: PydanticObjectId,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Aceita um pedido de amizade recebido."""
    # Busca o documento completo do time que enviou o pedido.
    requester_team = await Team.get(requester_team_id)
    # Validação: Garante que o time solicitante existe.
    if not requester_team:
        raise HTTPException(
            status_code=404, detail="Time solicitante não encontrado.")

    # Forma segura de verificar se o pedido realmente existe na sua lista de pedidos recebidos.
    # Cria uma lista apenas com os IDs dos pedidos recebidos.
    received_ids = [
        req.to_ref().id for req in current_team.friend_requests_received]
    # Se o ID do solicitante não estiver na sua lista, retorna um erro.
    if requester_team.id not in received_ids:
        raise HTTPException(
            status_code=404, detail="Pedido de amizade não encontrado.")

    # Encontra os "atalhos" (Links) exatos que precisam ser removidos das listas de pedidos.
    # Encontra o pedido na sua lista de "recebidos".
    request_to_remove_from_current = next(
        (link for link in current_team.friend_requests_received if link.to_ref().id == requester_team.id), None)
    # Encontra o pedido na lista de "enviados" do outro time.
    request_to_remove_from_requester = next(
        (link for link in requester_team.friend_requests_sent if link.to_ref().id == current_team.id), None)

    # Etapa de "limpeza": remove o pedido das listas de pendentes.
    # A verificação `if` garante que o código não quebre se o link não for encontrado.
    if request_to_remove_from_current:
        current_team.friend_requests_received.remove(
            request_to_remove_from_current)
    if request_to_remove_from_requester:
        requester_team.friend_requests_sent.remove(
            request_to_remove_from_requester)

    # Etapa final: Adiciona cada time à lista de amigos um do outro.
    current_team.friends.append(requester_team)
    requester_team.friends.append(current_team)

    # Salva as alterações no seu documento.
    await current_team.save()
    # Salva as alterações no documento do seu novo amigo.
    await requester_team.save()

    # Retorna `None` para indicar sucesso sem conteúdo.
    return None

# Retorna a lista de amigos do time que está logado.
@router.get("/friends", response_model=List[FriendInfo], tags=["Friends (Protected)"])
# A dependência `get_current_team` garante a autenticação e nos dá o time logado.
async def get_my_friends(current_team: Annotated[Team, Depends(get_current_team)]):
    """Retorna a lista de amigos do time logado."""
    # Carrega os dados completos dos times que estão na lista de amigos.
    await current_team.fetch_link(Team.friends)
    # Retorna a lista de amigos já preenchida com os dados.
    return current_team.friends

# Retorna os pedidos de amizade recebidos pelo time logado.
@router.get("/friends/requests", response_model=List[FriendInfo], tags=["Friends (Protected)"])
async def get_my_friend_requests(current_team: Annotated[Team, Depends(get_current_team)]):
    """Retorna a lista de pedidos de amizade recebidos pelo time logado."""
    # Carrega os dados completos dos times que enviaram pedidos de amizade.
    await current_team.fetch_link(Team.friend_requests_received)
    # Retorna a lista de pedidos recebidos já preenchida.
    return current_team.friend_requests_received

# Retorna a lista de amigos de um time específico (rota pública).
@router.get("/teams/{team_id}/friends", response_model=List[FriendInfo], tags=["Friends"])
async def get_team_friends(team_id: PydanticObjectId):
    """Retorna a lista de amigos de um time específico."""
    # Busca o time pelo ID da URL.
    team = await Team.get(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Time não encontrado.")

    # Carrega os dados completos dos amigos do time encontrado.
    await team.fetch_link(Team.friends)
    # Retorna a lista de amigos.
    return team.friends

# =============================================================================
# --- Rotas para Scrims (Protegidas) ---
# =============================================================================

# Define a rota POST para criar/propor uma nova scrim.
@router.post("/scrims", response_model=ScrimOut, status_code=status.HTTP_201_CREATED, tags=["Scrims (Protected)"])
# A função recebe os dados da scrim (oponente, data, jogo) e o time logado (proponente).
async def propose_scrim(
    scrim_data: ScrimCreate,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Propõe uma nova scrim para outro time."""
    # Busca no banco o time que foi convidado (oponente).
    opponent_team = await Team.get(scrim_data.opponent_team_id)
    # Valida se o oponente existe e não é o próprio time.
    if not opponent_team or opponent_team.id == current_team.id:
        raise HTTPException(status_code=404, detail="Time oponente inválido ou não encontrado.")

    # Cria a instância do documento Scrim...
    scrim = Scrim(
        proposing_team=current_team, # ...definindo o time logado como proponente.
        opponent_team=opponent_team, # ...o time alvo como oponente.
        scrim_datetime=scrim_data.scrim_datetime, # ...a data e hora.
        game=scrim_data.game, # ...e o jogo.
        # O status inicial já é "Pendente" por padrão.
    )
    # Insere a nova scrim na coleção 'scrims'.
    await scrim.insert()

    # Carrega os dados completos dos times (proponente e oponente) para a resposta.
    await scrim.fetch_all_links()
    
    # Retorna o objeto da scrim recém-criada, formatado pelo `ScrimOut`.
    return scrim

@router.get("/scrims/me", response_model=List[ScrimOut], tags=["Scrims (Protected)"])
async def get_my_scrims(current_team: Annotated[Team, Depends(get_current_team)]):
    """
    Lista todas as scrims (propostas ou recebidas) do time logado.
    Esta versão busca todos os dados e filtra em Python para máxima robustez.
    """
    # Etapa 1: Busca TODAS as scrims no banco de dados, já carregando os dados dos times.
    all_scrims = await Scrim.find_all(fetch_links=True).to_list()

    # Etapa 2: Filtra a lista em Python para encontrar apenas as scrims que envolvem o time logado.
    my_scrims = []
    for scrim in all_scrims:
        # Verifica se o time logado é o proponente OU o oponente.
        if scrim.proposing_team.id == current_team.id or scrim.opponent_team.id == current_team.id:
            my_scrims.append(scrim)
    
    # Etapa 3: Ordena a lista filtrada pela data, do mais novo para o mais antigo.
    my_scrims.sort(key=lambda s: s.scrim_datetime, reverse=True)

    # Retorna a lista final e correta de scrims.
    return my_scrims

# Define a rota POST para aceitar uma scrim, usando o ID da scrim na URL.
@router.post("/scrims/{scrim_id}/accept", response_model=ScrimOut, tags=["Scrims (Protected)"])
# Recebe o ID da scrim da URL e o time logado (quem está aceitando).
async def accept_scrim(
    scrim_id: PydanticObjectId,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Aceita um convite de scrim (apenas o oponente pode aceitar)."""
    # Busca a scrim específica pelo ID e já carrega os dados dos times.
    scrim = await Scrim.get(scrim_id, fetch_links=True)
    if not scrim:
        raise HTTPException(status_code=404, detail="Scrim não encontrada.")
    
    # Etapa de AUTORIZAÇÃO: Garante que apenas o time convidado (opponent_team) pode aceitar.
    if scrim.opponent_team.id != current_team.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para aceitar este convite.")
        
    # Garante que a scrim ainda esteja com o status "Pendente".
    if scrim.status != ScrimStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail="Esta scrim não está mais pendente.")
        
    # Atualiza o status da scrim para 'Confirmada'.
    scrim.status = ScrimStatusEnum.CONFIRMED
    # Salva a alteração no banco de dados.
    await scrim.save()
    
    # Retorna a scrim com seu novo status.
    return scrim

# Define a rota POST para recusar um convite de scrim.
@router.post("/scrims/{scrim_id}/decline", status_code=status.HTTP_204_NO_CONTENT, tags=["Scrims (Protected)"])
# Recebe o ID da scrim e o time logado (quem está recusando).
async def decline_scrim(
    scrim_id: PydanticObjectId,
    current_team: Annotated[Team, Depends(get_current_team)]
):
    """Recusa um convite de scrim (apenas o oponente pode recusar)."""
    # Busca a scrim que será recusada.
    scrim = await Scrim.get(scrim_id, fetch_links=True)
    if not scrim:
        raise HTTPException(status_code=404, detail="Scrim não encontrada.")
    
    # Etapa de AUTORIZAÇÃO: Garante que apenas o time convidado pode recusar.
    if scrim.opponent_team.id != current_team.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para recusar este convite.")
        
    # Em vez de mudar o status, simplesmente deletamos o convite recusado.
    await scrim.delete()
    
    # Retorna sucesso sem conteúdo.
    return None
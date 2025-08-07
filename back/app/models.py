# app/models.py - Versão Final com GameEnum

"""
Pense neste arquivo como a planta baixa de todos os dados da sua aplicação. Ele define 
com precisão a estrutura de cada "coisa" que existe no seu sistema: o que é um Time, o 
que é um Jogador, o que é um Post, que informações cada um deles contém e quais regras eles devem seguir.

O benie:  Beanie é um ODM (Object-Document Mapper) assíncrono para MongoDB, 
          feito para funcionar perfeitamente com Python moderno e FastAPI.
"""
import datetime
from typing import List, Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, EmailStr, Field
from enum import Enum

# O Field serve para: Como se fosse uma "Etiqueta", demonstrando para oque vai ser aquela variável ou como vai ser

# -----------------------------------------------------------------------------
# Modelos Compartilhados (Pydantic & Enums)
# -----------------------------------------------------------------------------

class GameEnum(str, Enum):
    """Define a lista de jogos permitidos no sistema."""
    LOL = "League of Legends"
    VALORANT = "Valorant"
    CS = "Counter-Strike"
    
class LolRoleEnum(str, Enum):
    TOP = "Top Laner"
    JUNGLE = "Jungler"
    MID = "Mid Laner"
    ADC = "AD Carry"
    SUPPORT = "Support"

class ValorantRoleEnum(str, Enum):
    DUELIST = "Duelista"
    INITIATOR = "Iniciador"
    CONTROLLER = "Controlador"
    SENTINEL = "Sentinela"

class CsRoleEnum(str, Enum):
    ENTRY_FRAGGER = "Entry Fragger"
    SUPPORT = "Suporte"
    LURKER = "Lurker"
    AWPER = "AWPer"
    IGL = "IGL (In-Game Leader)"
    
class ScrimStatusEnum(str, Enum):
    PENDING = "Pendente"
    CONFIRMED = "Confirmada"
    CANCELED = "Cancelada"
    COMPLETED = "Concluída"

class Socials(BaseModel):
    """Modelo para as redes sociais de um time."""
    discord: Optional[str] = None
    twitter: Optional[str] = None
    twitch: Optional[str] = None

class PostAuthor(BaseModel):
    """Representação simplificada de um autor para ser embutida em posts e comentários."""
    id: PydanticObjectId
    team_name: str
    tag: Optional[str] = None

class Comment(BaseModel):
    """Modelo para comentários, que serão embutidos nos documentos de Post."""
    author: PostAuthor
    content: str
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC))

class FriendInfo(BaseModel):
    """Representação simplificada de um time para listas de amigos."""
    id: PydanticObjectId
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[GameEnum] = None

# -----------------------------------------------------------------------------
# Modelos de Player
# -----------------------------------------------------------------------------
class Player(Document):
    """Representa um jogador no banco de dados (coleção 'players')."""
    nickname: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    # Link para o time ao qual o jogador pertence.
    team: Optional[Link["Team"]] = None

    class Settings:
        name = "players"

class PlayerCreate(BaseModel):
    """Modelo para criar um novo jogador via API."""
    nickname: str
    full_name: Optional[str] = None
    role: Optional[str] = None

class PlayerOut(BaseModel):
    """Modelo para exibir um jogador na API, sem informações sensíveis."""
    id: PydanticObjectId
    nickname: str
    full_name: Optional[str] = None
    role: Optional[str] = None

class CommentCreate(BaseModel):
    content: str

# -----------------------------------------------------------------------------
# Modelos de Team
# -----------------------------------------------------------------------------
class Team(Document):
    """Representa um time no banco de dados (coleção 'teams'). Este é o nosso 'usuário'."""
    email: EmailStr = Field(..., unique=True)
    hashed_password: str
    team_name: str
    tag: Optional[str] = None
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    main_game: Optional[GameEnum] = None
    socials: Optional[Socials] = None
    friends: List[Link["Team"]] = []
    friend_requests_sent: List[Link["Team"]] = []
    friend_requests_received: List[Link["Team"]] = []
    players: List[Link[Player]] = []
    # default_factory = valor padrão se não for passado nenhum
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC))

    class Settings:
        name = "teams"

class TeamCreate(BaseModel):
    """Modelo para registrar um novo time via API."""
    email: EmailStr
    password: str
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[GameEnum] = None 

class TeamOut(BaseModel):
    """Modelo para exibir um time na API, incluindo a lista de jogadores já processada."""
    id: PydanticObjectId
    email: EmailStr
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[GameEnum] = None 
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    socials: Optional[Socials] = None
    players: List[PlayerOut] = []
    created_at: datetime.datetime

class TeamUpdate(BaseModel):
    """Modelo para receber os dados de atualização de um time via API."""
    team_name: Optional[str] = None
    tag: Optional[str] = None
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    main_game: Optional[GameEnum] = None 
    socials: Optional[Socials] = None

# -----------------------------------------------------------------------------
# Modelos de Post
# -----------------------------------------------------------------------------
class Post(Document):
    """Representa um post no banco de dados (coleção 'posts')."""
    content: str
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC))
    author: Link[Team]
    likes: List[Link[Team]] = []
    comments: List[Comment] = []

    class Settings:
        name = "posts"

class PostCreate(BaseModel):
    """Modelo para criar um novo post via API."""
    content: str = Field(..., min_length=1, max_length=280)

class PostOut(BaseModel):
    """Modelo para exibir um post na API, com autor, likes e comentários."""
    id: PydanticObjectId
    content: str
    created_at: datetime.datetime
    author: PostAuthor
    likes: List[PydanticObjectId]
    likes_count: int
    comments: List[Comment]
    
# -----------------------------------------------------------------------------
# Modelos de Scrim
# -----------------------------------------------------------------------------
class Scrim(Document):
    """Representa um agendamento de scrim no banco de dados (coleção 'scrims')."""
    proposing_team: Link[Team]
    opponent_team: Link[Team]
    scrim_datetime: datetime.datetime
    game: GameEnum
    status: ScrimStatusEnum = ScrimStatusEnum.PENDING
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.UTC))

    class Settings:
        name = "scrims"

class ScrimCreate(BaseModel):
    """Modelo para receber os dados de criação de uma nova scrim."""
    opponent_team_id: PydanticObjectId
    scrim_datetime: datetime.datetime
    game: GameEnum

class ScrimOut(BaseModel):
    """Modelo para exibir uma scrim na API."""
    id: PydanticObjectId
    proposing_team: FriendInfo # Reutilizamos o modelo de info de time
    opponent_team: FriendInfo
    scrim_datetime: datetime.datetime
    game: GameEnum
    status: ScrimStatusEnum
    created_at: datetime.datetime

# -----------------------------------------------------------------------------
# Modelos de Autenticação
# -----------------------------------------------------------------------------
class Token(BaseModel):
    """Modelo para a resposta do token de login."""
    access_token: str
    token_type: str
    
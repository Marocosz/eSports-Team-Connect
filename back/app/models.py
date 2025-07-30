# app/models.py

import datetime
from typing import List, Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, EmailStr, Field

# -----------------------------------------------------------------------------
# Modelos Compartilhados (Pydantic)
# -----------------------------------------------------------------------------

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
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.UTC))
    
class FriendInfo(BaseModel):
    """Representação simplificada de um time para listas de amigos."""
    id: PydanticObjectId
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[str] = None

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
    hashed_password: str  # Campo para a senha criptografada. NUNCA salvar a senha original.
    team_name: str
    tag: Optional[str] = None
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    main_game: Optional[str] = None
    socials: Optional[Socials] = None
    # --- NOVOS CAMPOS DE AMIZADE ---
    friends: List[Link["Team"]] = []
    friend_requests_sent: List[Link["Team"]] = []
    friend_requests_received: List[Link["Team"]] = []
    # Lista de links para os jogadores que fazem parte deste time.
    players: List[Link[Player]] = []
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.UTC))
    

    class Settings:
        name = "teams"

class TeamCreate(BaseModel):
    """Modelo para registrar um novo time via API."""
    email: EmailStr
    password: str
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[str] = None

class TeamOut(BaseModel):
    """Modelo para exibir um time na API, incluindo a lista de jogadores já processada."""
    id: PydanticObjectId
    email: EmailStr
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[str] = None
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    socials: Optional[Socials] = None
    players: List[PlayerOut] = [] # A API retornará os dados completos dos jogadores.
    created_at: datetime.datetime
    
class TeamUpdate(BaseModel):
    """Modelo para receber os dados de atualização de um time via API."""
    team_name: Optional[str] = None
    tag: Optional[str] = None
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    main_game: Optional[str] = None
    socials: Optional[Socials] = None

# -----------------------------------------------------------------------------
# Modelos de Post
# -----------------------------------------------------------------------------

class Post(Document):
    """Representa um post no banco de dados (coleção 'posts')."""
    content: str
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.UTC))
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
    likes_count: int
    comments: List[Comment]

# -----------------------------------------------------------------------------
# Modelos de Autenticação
# -----------------------------------------------------------------------------

class Token(BaseModel):
    """Modelo para a resposta do token de login."""
    access_token: str
    token_type: str
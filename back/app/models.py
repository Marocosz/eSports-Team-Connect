import datetime
from typing import List, Optional
from beanie import Document, Link, PydanticObjectId
from pydantic import BaseModel, EmailStr

# --- Modelos Pydantic (Para a API) ---

class Socials(BaseModel):
    discord: Optional[str] = None
    twitter: Optional[str] = None
    twitch: Optional[str] = None

# Modelo para um jogador ser exibido na API
class PlayerOut(BaseModel):
    id: PydanticObjectId  # <--- REMOVIDO o " = Field(..., alias='_id')"
    nickname: str
    full_name: Optional[str] = None
    role: Optional[str] = None

# --- Modelos do Banco de Dados (Documentos Beanie) ---

class Player(Document):
    nickname: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    team: Optional[Link["Team"]] = None 

    class Settings:
        name = "players"

class Team(Document):
    email: EmailStr
    hashed_password: str
    team_name: str
    tag: Optional[str] = None
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    main_game: Optional[str] = None
    socials: Optional[Socials] = None
    players: List[Link[Player]] = []
    created_at: datetime.datetime = datetime.datetime.now(datetime.UTC)

    class Settings:
        name = "teams"


# --- Modelos Pydantic para Criação e Resposta da API ---

class TeamCreate(BaseModel):
    email: EmailStr
    password: str
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[str] = None

# Como um time será exibido na API (com a lista de jogadores)
class TeamOut(BaseModel):
    id: PydanticObjectId  # <--- REMOVIDO o " = Field(..., alias='_id')"
    email: EmailStr
    team_name: str
    tag: Optional[str] = None
    main_game: Optional[str] = None
    logo_url: Optional[str] = None
    bio: Optional[str] = None
    socials: Optional[Socials] = None
    players: List[PlayerOut] = []
    created_at: datetime.datetime

# O que precisamos para criar um jogador e adicioná-lo a um time
class PlayerCreate(BaseModel):
    nickname: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    
class Token(BaseModel):
    access_token: str
    token_type: str
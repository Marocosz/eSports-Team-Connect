# app/security.py

from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings
from .models import Team

# --- Configuração de Hashing de Senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Esquema de Autenticação
# Esta linha cria um "esquema" que o FastAPI usa para a documentação e para extrair o token.
# Ele espera um token na rota POST /login, que nós criamos em routes.py.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# --- Funções de Segurança
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se uma senha em texto puro corresponde a um hash."""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Retorna o hash de uma senha em texto puro."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Cria um novo JSON Web Token (JWT) de acesso."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Se não for especificado, usa o tempo padrão do arquivo de configuração
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


# --- Dependência de Autenticação
async def get_current_team(token: Annotated[str, Depends(oauth2_scheme)]) -> Team:
    """
    Dependência para ser usada em rotas protegidas.
    Valida o token e retorna o documento do time correspondente.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        team_id: str = payload.get("sub")
        if team_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    team = await Team.get(PydanticObjectId(team_id))
    if team is None:
        raise credentials_exception
    return team
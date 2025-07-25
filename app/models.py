import datetime
from beanie import Document
from pydantic import BaseModel, EmailStr

# Modelo do Banco de Dados (Documento Beanie)
class User(Document):
    username: str
    email: EmailStr
    created_at: datetime.datetime = datetime.datetime.now(datetime.UTC)

    class Settings:
        name = "users" # Nome da coleção no MongoDB
        
# Modelo Pydantic para a criação de usuário (o que a API espera receber)
class UserCreate(BaseModel):
    username: str
    email: EmailStr

# Modelo Pydantic para a resposta da API (o que a API vai enviar)
class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    created_at: datetime.datetime
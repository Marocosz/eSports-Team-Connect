from fastapi import APIRouter, HTTPException, status
from typing import List
from .models import User, UserCreate, UserOut

router = APIRouter()

# O response_model diz ao FastAPI para usar nosso modelo UserOut para a resposta
@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate):
    """Cria um novo usuário."""
    # Transforma os dados de entrada Pydantic em um dicionário
    user_dict = user_data.model_dump()
    
    # Cria o documento do banco de dados
    user = User(**user_dict)

    # Insere no banco de dados de forma assíncrona
    await user.insert()
    
    # O Pydantic automaticamente converte nosso documento 'user' para o formato 'UserOut'
    return user

@router.get("/users", response_model=List[UserOut])
async def get_all_users():
    """Lista todos os usuários."""
    users = await User.find_all().to_list()
    return users
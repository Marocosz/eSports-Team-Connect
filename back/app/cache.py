# app/cache.py
import redis.asyncio as redis
from .config import settings

# Cria um "pool" de conexões com o Redis que pode ser reutilizado.
redis_pool = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

async def get_redis_client():
    """
    Dependência do FastAPI que fornece um cliente Redis para as rotas.
    """
    return redis_pool
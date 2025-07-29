# app/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # As variáveis que você quer ler do arquivo .env
    MONGODB_URI: str
    DATABASE_NAME: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Configuração para dizer ao Pydantic onde encontrar o arquivo .env
    model_config = SettingsConfigDict(env_file=".env")


# Cria uma instância única das configurações para ser usada no resto do projeto
settings = Settings()

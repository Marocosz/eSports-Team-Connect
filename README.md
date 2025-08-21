# Rede Social eSports Team
É uma rede social que busca conectar todas as equipes de jogos online, com uma comunidade ampla

# Para o professor:

## Atividade 29/07 (Populate)
o caminho do script de populate é:
`\back\populate.py`

Foi criado:

```
NUMBER_OF_TEAMS = 20
NUMBER_OF_POSTS = 50
NUMBER_OF_SCRIMS = 25
```

print da imagem do atlasdb:

![populate image](populate.png)

## Atividade 07/08 (index)

a criação do index foi feita da seguinte forma:

dentro do `\back\app\db.py` temos:

```
# TEAM
await Team.get_motor_collection().create_index("email", unique=True)
await Team.get_motor_collection().create_index("team_name", unique=True)

# PLAYER
await Player.get_motor_collection().create_index("nickname", unique=True)

# POST
await Post.get_motor_collection().create_index("created_at")
await Post.get_motor_collection().create_index("author")

# SCRIM
await Scrim.get_motor_collection().create_index("proposing_team")
await Scrim.get_motor_collection().create_index("opponent_team")
await Scrim.get_motor_collection().create_index("scrim_datetime")
await Scrim.get_motor_collection().create_index("game")
await Scrim.get_motor_collection().create_index("status")

```

que cria e define os indices do banco de dados, em conjunto com a definição dentro das classes
que estão em `\back\app\models.py`

por exemplo na classe de `player` temos:
`nickname: str = Indexed(str, unique=True)`

assim para cada atributo que precisa de index de cada classe

## Atividade 21/08 (Redis cache)

Como foi implementado?
1. Instalação e Configuração:

A biblioteca `redis` foi adicionada ao projeto (`pip install "redis[hiredis]"`).

A URL de conexão Redis Cloud foi adicionada ao arquivo `.env` e `app/config.py`:

2. Módulo de Cache (`\back\app\cache.py`):
Primeiro foi criado o arquivo `\back\app\cache.py` para a definição e gerenciamento da conexão com o Redis. Este módulo cria um "pool" de conexões assíncronas que pode ser reutilizado por toda a aplicação.

3. Integração com o Ciclo de Vida do FastAPI (`\back\main.py`):
A função `lifespan` foi atualizada para garantir que as conexões com o Redis sejam encerradas de forma limpa quando a aplicação é desligada.

A Lógica de Cache na Rota de Posts Populares
A rota `GET /api/posts/popular` foi refatorada para implementar o padrão "Cache-Aside":

4. Verificação no Cache (Cache Hit):
Quando a rota é chamada, ela primeiro pergunta ao Redis se já existe um resultado salvo para a chave `"popular_posts"`. Se existir, ela retorna os dados diretamente do Redis.

No terminal do servidor, isso é indicado pela mensagem:
`CACHE HIT para posts populares!`

Ao apertar f5:
![Já conectado ao redis](2conredis.png)

1. Busca no Banco (Cache Miss):
Se os dados não estiverem no cache, a aplicação executa a consulta `Aggregation Pipeline` no MongoDB, que é uma operação mais lenta.

No terminal, isso é indicado pela mensagem:
`CACHE MISS para posts populares. Buscando no MongoDB...`

![primeira_conexao_redis](1conredis.png)

6. Salvando no Cache com Expiração:
Após buscar os dados do MongoDB, a aplicação os salva no Redis. Crucialmente, é definido um tempo de expiração de 300 segundos (5 minutos).

```
Trecho da rota /posts/popular em routes.py
await redis_client.set(
cache_key,
json.dumps([p.model_dump(mode='json') for p in posts]),
ex=300  # <-- Define a expiração em segundos
)
```

O parâmetro `ex=300` garante que o cache seja automaticamente invalidado após 5 minutos. Isso força a aplicação a buscar uma nova lista de posts populares periodicamente, mantendo os dados atualizados sem sobrecarregar o banco de dados a cada requisição.
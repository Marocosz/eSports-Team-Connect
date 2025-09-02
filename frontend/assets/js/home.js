document.addEventListener('DOMContentLoaded', () => {
    // --- O "SEGURANÇA" DA PÁGINA: Garante que só usuários logados acessem ---
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- ELEMENTOS DA PÁGINA (Referências ao HTML para manipulação) ---
    const postFeed = document.getElementById('post-feed');
    const createPostForm = document.getElementById('create-post-form');
    const postContentTextarea = document.getElementById('post-content');
    const teamNamePlaceholder = document.getElementById('team-name-placeholder');
    const logoutButton = document.getElementById('logout-button');
    const creatorAvatar = document.getElementById('creator-avatar');
    const charCounter = document.getElementById('char-counter');
    const discoverTeamsList = document.getElementById('discover-teams-list');
    const popularPostsList = document.getElementById('popular-posts-list');
    const API_URL = 'http://127.0.0.1:8000/api';
    const activityStreamList = document.getElementById('activity-stream-list');

    let myProfile = null; // Variável global para guardar os dados do time logado

    // =========================================================================
    // --- FUNÇÕES PRINCIPAIS DE BUSCA E RENDERIZAÇÃO (FETCH & RENDER) ---
    // =========================================================================

    /**
     * Busca todos os posts da API e chama a função para renderizá-los na tela.
     */
    async function fetchAndRenderPosts() {
        try {
            const response = await fetch(`${API_URL}/posts`);
            const posts = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar os posts.');
            renderPosts(posts);
        } catch (error) {
            console.error('Erro ao buscar posts:', error.message);
            if (postFeed) postFeed.innerHTML = '<p class="error-message">Não foi possível carregar o feed.</p>';
        }
    }

    /**
     * Recebe um array de posts e cria o HTML correspondente para o feed.
     * @param {Array} posts - A lista de posts vinda da API.
     */
    function renderPosts(posts) {
        if (!postFeed) return;
        if (!posts || posts.length === 0) {
            postFeed.innerHTML = '<p>Nenhum post no feed ainda. Seja o primeiro a publicar!</p>';
            return;
        }

        let postsHTML = '';
        posts.forEach(post => {
            // Verifica se o usuário logado (myProfile) já curtiu este post
            const isLikedByCurrentUser = myProfile && post.likes && post.likes.includes(myProfile.id);
            postsHTML += `
                <div class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <a href="profile.html?id=${post.author.id}" class="post-author-link">
                            <strong class="post-author">${post.author.team_name}</strong>
                        </a>
                        <span class="post-tag">[${post.author.tag || 'N/A'}]</span>
                        <span class="post-timestamp">${new Date(post.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p class="post-content">${post.content}</p>
                    <div class="post-comments">
                        <div class="comment-actions-wrapper">
                            <form class="comment-form">
                                <input type="text" placeholder="Escreva um comentário..." required>
                                <button type="submit" class="btn btn-small">Comentar</button>
                            </form>
                            <div class="post-actions">
                                <div class="action-item">
                                    <button class="action-button like-button ${isLikedByCurrentUser ? 'liked' : ''}">
                                        <i class="bi ${isLikedByCurrentUser ? 'bi-heart-fill' : 'bi-heart'}"></i>
                                    </button>
                                    <span class="likes-count">${post.likes_count}</span>
                                </div>
                                <div class="action-item">
                                    <i class="bi bi-chat"></i>
                                    <span class="comments-count">${post.comments.length}</span>
                                </div>
                            </div>
                        </div>
                        <div class="comment-list">
                            ${post.comments.map(comment => `<div class="comment"><p><strong>${comment.author.team_name}:</strong> ${comment.content}</p></div>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        postFeed.innerHTML = postsHTML;
    }

    /**
     * Busca o perfil do time logado para exibir o nome e o avatar.
     */
    async function fetchMyProfile() {
        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);
            myProfile = data; // Guarda os dados do perfil para uso em outras funções
            if (teamNamePlaceholder) teamNamePlaceholder.textContent = data.team_name;
            if (creatorAvatar && data.team_name) {
                creatorAvatar.textContent = data.team_name.charAt(0).toUpperCase();
            }
        } catch (error) {
            console.error('Erro ao buscar perfil:', error.message);
            handleAuthError();
        }
    }

    /**
         * Busca recomendações de times usando GDS e as renderiza na sidebar.
         */
    async function fetchAndRenderDiscoverTeams() {
        if (!discoverTeamsList) return;
        discoverTeamsList.innerHTML = '<li>Buscando sugestões...</li>'; // Feedback visual
        try {
            // Chama a NOVA rota de recomendações inteligentes
            const response = await fetch(`${API_URL}/teams/recommendations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar recomendações.');

            const recommendations = await response.json();

            if (recommendations.length === 0) {
                discoverTeamsList.innerHTML = '<li>Nenhuma sugestão no momento. Adicione mais amigos para receber recomendações!</li>';
                return;
            }

            discoverTeamsList.innerHTML = '';
            recommendations.forEach(team => {
                const li = document.createElement('li');
                // Converte o score de similaridade (ex: 0.85) para uma porcentagem (85%)
                const similarityPercentage = Math.round(team.similarity * 100);

                li.innerHTML = `
                    <div class="discover-item-info">
                        <div class="discover-avatar">${team.team_name.charAt(0).toUpperCase()}</div>
                        <div class="discover-text">
                            <a href="profile.html?id=${team.id}" class="discover-team-link">${team.team_name}</a>
                            <!-- Exibe o novo score de similaridade -->
                            <small class="similarity-score">${similarityPercentage}% de afinidade</small>
                        </div>
                    </div>
                    <button class="btn btn-small add-friend-btn" data-team-id="${team.id}">Adicionar</button>
                `;
                discoverTeamsList.appendChild(li);
            });

        } catch (error) {
            console.error('Erro ao buscar recomendações:', error);
            discoverTeamsList.innerHTML = '<li>Erro ao carregar sugestões.</li>';
        }
    }

    /**
     * Busca os posts mais populares e os renderiza na sidebar.
     */
    async function fetchAndRenderPopularPosts() {
        if (!popularPostsList) return;
        try {
            const response = await fetch(`${API_URL}/posts/popular`);
            const posts = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar posts populares.');

            if (posts.length === 0) {
                popularPostsList.innerHTML = '<li>Nenhum post popular ainda.</li>';
                return;
            }
            popularPostsList.innerHTML = posts.map(post => `
                <li>
                    <a href="#post-${post.id}">
                        <p class="popular-post-content">"${post.content.substring(0, 40)}..."</p>
                        <span class="popular-post-author">por ${post.author.team_name}</span>
                    </a>
                </li>
            `).join('');
        } catch (error) {
            console.error(error);
            popularPostsList.innerHTML = '<li>Erro ao carregar.</li>';
        }
    }

    // =========================================================================
    // --- FUNÇÕES DE AÇÃO DO USUÁRIO (EVENT HANDLERS) ---
    // =========================================================================

    /**
     * Lida com o envio de um pedido de amizade.
     */
    async function sendFriendRequest(targetTeamId, buttonElement) {
        try {
            const response = await fetch(`${API_URL}/friends/request/${targetTeamId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao enviar pedido.');
            }
            // Sucesso! Desabilita o botão e muda o texto para dar feedback ao usuário.
            buttonElement.textContent = 'Enviado';
            buttonElement.disabled = true;
        } catch (error) {
            console.error('Erro ao enviar pedido de amizade:', error);
            alert(error.message);
        }
    }

    /**
     * Lida com a submissão do formulário de criação de post.
     */
    async function handlePostSubmit(event) {
        event.preventDefault();
        const content = postContentTextarea.value.trim();
        if (!content) return;
        try {
            const response = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ content: content })
            });
            const newPost = await response.json();
            if (!response.ok) throw new Error(newPost.detail);

            // Limpa o formulário e atualiza o feed para mostrar o novo post.
            postContentTextarea.value = '';
            if (charCounter) charCounter.textContent = '0 / 280';
            fetchAndRenderPosts();
        } catch (error) {
            alert(`Erro ao publicar: ${error.message}`);
        }
    }

    /**
     * Lida com cliques no feed (likes e comentários), usando delegação de eventos.
     */
    async function handleFeedClick(event) {
        const target = event.target;
        const postCard = target.closest('.post-card');
        if (!postCard) return;
        const postId = postCard.dataset.postId;

        // --- LÓGICA DE LIKE ---
        const likeButton = target.closest('.like-button');
        if (likeButton) {
            try {
                const response = await fetch(`${API_URL}/posts/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const updatedPost = await response.json();
                if (!response.ok) throw new Error(updatedPost.detail);

                // Atualiza a interface do card específico sem recarregar o feed inteiro.
                const likesCountSpan = postCard.querySelector('.likes-count');
                const icon = likeButton.querySelector('i');
                likesCountSpan.textContent = updatedPost.likes_count;

                const isLiked = updatedPost.likes.includes(myProfile.id);
                likeButton.classList.toggle('liked', isLiked);
                icon.classList.toggle('bi-heart-fill', isLiked);
                icon.classList.toggle('bi-heart', !isLiked);

            } catch (error) {
                console.error('Erro ao curtir:', error.message);
                alert('Não foi possível processar o like.');
            }
        }

        // --- LÓGICA DE COMENTÁRIO ---
        if (target.matches('.comment-form button')) {
            event.preventDefault();
            const commentInput = target.previousElementSibling;
            const content = commentInput.value.trim();
            if (!content) return;
            try {
                const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ content: content })
                });
                const newComment = await response.json();
                if (!response.ok) throw new Error(newComment.detail);

                // Limpa o input e recarrega todos os posts para mostrar o novo comentário.
                commentInput.value = '';
                fetchAndRenderPosts();
            } catch (error) {
                console.error('Erro ao comentar:', error.message);
                alert('Não foi possível enviar o comentário.');
            }
        }
    }

    /**
     * Função centralizada para lidar com erros de autenticação (ex: token expirado).
     */
    function handleAuthError() {
        localStorage.removeItem('accessToken');
        alert('Sua sessão expirou. Por favor, faça o login novamente.');
        window.location.href = 'login.html';
    }

    // =========================================================================
    // --- EVENT LISTENERS E INICIALIZAÇÃO DA PÁGINA ---
    // =========================================================================

    if (createPostForm) createPostForm.addEventListener('submit', handlePostSubmit);
    if (postFeed) postFeed.addEventListener('click', handleFeedClick);
    if (logoutButton) logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    });

    if (postContentTextarea) postContentTextarea.addEventListener('input', () => {
        const count = postContentTextarea.value.length;
        if (charCounter) charCounter.textContent = `${count} / 280`;
        if (count > 280) {
            if (charCounter) charCounter.style.color = 'var(--color-glow-end)';
        } else {
            if (charCounter) charCounter.style.color = 'var(--color-text-secondary)';
        }
    });

    if (discoverTeamsList) discoverTeamsList.addEventListener('click', (event) => {
        if (event.target.matches('.add-friend-btn')) {
            const targetId = event.target.dataset.teamId;
            sendFriendRequest(targetId, event.target);
        }
    });

    /**
     * Função que orquestra o carregamento inicial da página.
     */
    async function initializePage() {
        // Busca o perfil do usuário logado primeiro, pois outras funções dependem dele.
        await fetchMyProfile();
        // Depois, busca o resto dos dados em paralelo para agilizar.
        await Promise.all([
            fetchAndRenderPosts(),
            fetchAndRenderDiscoverTeams(),
            fetchAndRenderPopularPosts(),
            fetchAndRenderActivityStream()
        ]);
    }

    async function fetchAndRenderActivityStream() {
        if (!activityStreamList) return; // Só executa se o elemento existir na página
        try {
            const response = await fetch(`${API_URL}/activity-stream`);
            const events = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar atividades.');

            if (events.length === 0) {
                activityStreamList.innerHTML = '<li>Nenhuma atividade recente.</li>';
                return;
            }

            // Mapeia cada evento para uma string de HTML
            activityStreamList.innerHTML = events.map(event => {
                const data = event.data;
                let text = 'Evento desconhecido.';

                // Cria um texto diferente para cada tipo de evento
                if (data.type === 'new_post') {
                    text = `<strong>${data.team_name}</strong> publicou: "${data.content_preview}"`;
                } else if (data.type === 'new_friendship') {
                    text = `<strong>${data.team1_name}</strong> e <strong>${data.team2_name}</strong> agora são amigos.`;
                }

                return `<li>${text}</li>`;
            }).join('');

        } catch (error) {
            console.error(error);
            activityStreamList.innerHTML = '<li>Erro ao carregar.</li>';
        }
    }

    // Inicia o carregamento da página.
    initializePage();


});
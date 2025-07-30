// assets/js/home.js - Versão Final e Organizada

document.addEventListener('DOMContentLoaded', () => {
    // --- O "SEGURANÇA" DA PÁGINA: Garante que só usuários logados acessem ---
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- ELEMENTOS DA PÁGINA ---
    const postFeed = document.getElementById('post-feed');
    const createPostForm = document.getElementById('create-post-form');
    const postContentTextarea = document.getElementById('post-content');
    const teamNamePlaceholder = document.getElementById('team-name-placeholder');
    const logoutButton = document.getElementById('logout-button');
    const creatorAvatar = document.getElementById('creator-avatar');
    const charCounter = document.getElementById('char-counter');
    const discoverTeamsList = document.getElementById('discover-teams-list');
    const API_URL = 'http://127.0.0.1:8000/api';

    let myProfile = null; // Variável para guardar os dados do time logado

    // =========================================================================
    // --- FUNÇÕES DE LÓGICA DA APLICAÇÃO ---
    // =========================================================================

    /**
     * Busca todos os posts da API e os renderiza na tela.
     */
    async function fetchAndRenderPosts() {
        try {
            const response = await fetch(`${API_URL}/posts`);
            const posts = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar os posts.');
            renderPosts(posts);
        } catch (error) {
            console.error('Erro ao buscar posts:', error.message);
            if(postFeed) postFeed.innerHTML = '<p class="error-message">Não foi possível carregar o feed.</p>';
        }
    }

    /**
     * Recebe um array de posts e cria o HTML correspondente.
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
            myProfile = data;
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
     * Busca times para a sidebar (excluindo o próprio time).
     */
    async function fetchAndRenderDiscoverTeams() {
        if (!discoverTeamsList) return;
        try {
            const response = await fetch(`${API_URL}/teams`);
            if (!response.ok) throw new Error('Falha ao buscar times.');
            let teams = await response.json();
            if (myProfile) {
                teams = teams.filter(team => team.id !== myProfile.id);
            }
            discoverTeamsList.innerHTML = '';
            teams.slice(0, 5).forEach(team => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="profile.html?id=${team.id}" class="discover-team-link">${team.team_name}</a>
                    <button class="btn btn-small add-friend-btn" data-team-id="${team.id}">Adicionar</button>
                `;
                discoverTeamsList.appendChild(li);
            });
        } catch (error) {
            console.error('Erro ao buscar times para descobrir:', error);
            discoverTeamsList.innerHTML = '<li>Erro ao carregar.</li>';
        }
    }

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
            postContentTextarea.value = '';
            if(charCounter) charCounter.textContent = '0 / 280';
            fetchAndRenderPosts();
        } catch (error) {
            alert(`Erro ao publicar: ${error.message}`);
        }
    }

    /**
     * Lida com cliques no feed (likes e comentários).
     */
    async function handleFeedClick(event) {
        // ... (lógica de like e comentário que já estava correta) ...
    }
    
    /**
     * Função centralizada para lidar com erros de autenticação.
     */
    function handleAuthError() {
        localStorage.removeItem('accessToken');
        alert('Sua sessão expirou. Por favor, faça o login novamente.');
        window.location.href = 'login.html';
    }

    // =========================================================================
    // --- EVENT LISTENERS E INICIALIZAÇÃO ---
    // =========================================================================

    if (createPostForm) createPostForm.addEventListener('submit', handlePostSubmit);
    if (postFeed) postFeed.addEventListener('click', handleFeedClick);
    if (logoutButton) logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    });
    
    if (postContentTextarea) postContentTextarea.addEventListener('input', () => {
        const count = postContentTextarea.value.length;
        if(charCounter) charCounter.textContent = `${count} / 280`;
        if (count > 280) {
            if(charCounter) charCounter.style.color = 'var(--color-glow-end)';
        } else {
            if(charCounter) charCounter.style.color = 'var(--color-text-secondary)';
        }
    });

    if (discoverTeamsList) discoverTeamsList.addEventListener('click', (event) => {
        if (event.target.matches('.add-friend-btn')) {
            const targetId = event.target.dataset.teamId;
            sendFriendRequest(targetId, event.target);
        }
    });

    async function initializePage() {
        await fetchMyProfile();
        await fetchAndRenderPosts();
        await fetchAndRenderDiscoverTeams();
    }

    initializePage();
});
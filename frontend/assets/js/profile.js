document.addEventListener('DOMContentLoaded', () => {
    // --- O "SEGURANÇA" DA PÁGINA ---
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- ELEMENTOS DA PÁGINA ---
    const teamNameEl = document.getElementById('profile-team-name');
    const tagEl = document.getElementById('profile-tag');
    const bioEl = document.getElementById('profile-bio');
    const avatarEl = document.getElementById('profile-avatar');
    const actionsEl = document.getElementById('profile-actions');
    const friendsCountEl = document.getElementById('friends-count');
    const friendsListEl = document.getElementById('friends-list');
    const postFeedEl = document.getElementById('profile-post-feed');
    const playersListDiv = document.getElementById('profile-players-list');
    const logoutButton = document.getElementById('logout-button');

    const API_URL = 'http://127.0.0.1:8000/api';
    let myProfile = null;

    /**
     * Pega o ID do perfil da URL (ex: profile.html?id=123)
     * @returns {string|null} O ID do perfil ou null se não houver.
     */
    function getProfileIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    /**
     * Renderiza o cabeçalho da página de perfil.
     * @param {object} team - O objeto do time com os dados do perfil.
     */
    function renderProfileHeader(team) {
        teamNameEl.textContent = team.team_name;
        tagEl.textContent = `[${team.tag || 'N/A'}]`;
        bioEl.textContent = team.bio || 'Este time ainda não tem uma bio.';
        if (team.team_name) {
            avatarEl.textContent = team.team_name.charAt(0).toUpperCase();
        }

        if (myProfile && myProfile.id === team.id) {
            actionsEl.innerHTML = `<a href="edit-profile.html" class="btn">Editar Perfil</a>`;
        } else {
            actionsEl.innerHTML = `<button class="btn add-friend-btn" data-team-id="${team.id}">Adicionar Amigo</button>`;
        }
    }

    /**
     * Renderiza a lista de amigos na sidebar.
     * @param {Array} friends - A lista de amigos do time.
     */
    function renderFriends(friends) {
        if (!friendsCountEl || !friendsListEl) return;
        friendsCountEl.textContent = friends.length;
        if (friends.length === 0) {
            friendsListEl.innerHTML = '<li>Nenhum amigo ainda.</li>';
            return;
        }
        friendsListEl.innerHTML = friends.map(friend => `
            <li>
                <a href="profile.html?id=${friend.id}" class="discover-team-link">${friend.team_name}</a>
            </li>
        `).join('');
    }

    /**
     * Renderiza a grade de jogadores do time.
     * @param {Array} players - A lista de jogadores do time.
     */
    function renderPlayers(players) {
        if (!playersListDiv) return;
        if (!players || players.length === 0) {
            playersListDiv.innerHTML = '<p>Este time não possui jogadores cadastrados.</p>';
            return;
        }
        playersListDiv.innerHTML = players.map(player => `
            <div class="player-card">
                <h4>${player.nickname}</h4>
                <p>${player.role || 'Função não definida'}</p>
            </div>
        `).join('');
    }

    /**
     * Renderiza o feed de posts do time.
     * @param {Array} posts - A lista de posts do time.
     */
    function renderPosts(posts) {
        if (!postFeedEl) return;
        if (!posts || posts.length === 0) {
            postFeedEl.innerHTML = '<p>Este time ainda não fez nenhuma publicação.</p>';
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
        postFeedEl.innerHTML = postsHTML;
    }

    /**
     * Orquestra o carregamento de todos os dados da página.
     */
    async function initializeProfilePage() {
        let profileId = getProfileIdFromUrl();

        try {
            const myProfileResponse = await fetch(`${API_URL}/teams/me/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            myProfile = await myProfileResponse.json();
            if (!myProfileResponse.ok) throw new Error("Falha ao buscar seu perfil");

            if (!profileId) {
                profileId = myProfile.id;
            }
        } catch (e) {
            handleAuthError();
            return;
        }

        try {
            const [profileRes, postsRes, friendsRes] = await Promise.all([
                fetch(`${API_URL}/teams/${profileId}`),
                fetch(`${API_URL}/teams/${profileId}/posts`),
                fetch(`${API_URL}/teams/${profileId}/friends`)
            ]);

            if (!profileRes.ok) throw new Error("Perfil não encontrado");

            const profileData = await profileRes.json();
            const postsData = await postsRes.json();
            const friendsData = await friendsRes.json();

            renderProfileHeader(profileData);
            renderPlayers(profileData.players);
            renderPosts(postsData);
            renderFriends(friendsData);

        } catch (error) {
            console.error("Erro ao carregar dados do perfil:", error);
            document.querySelector('.dashboard-container').innerHTML = '<h2>Erro ao carregar perfil. O time pode não existir.</h2>';
        }
    }

    function handleAuthError() {
        localStorage.removeItem('accessToken');
        alert('Sua sessão expirou. Por favor, faça o login novamente.');
        window.location.href = 'login.html';
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        });
    }

    // Inicia o carregamento da página.
    initializeProfilePage();
});
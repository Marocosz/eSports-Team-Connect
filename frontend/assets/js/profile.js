// assets/js/profile.js - Versão Final e Completa

document.addEventListener('DOMContentLoaded', () => {
    // --- O "SEGURANÇA" DA PÁGINA ---
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- ELEMENTOS DO DOM ---
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

    // --- Elementos do Modal de Scrim ---
    const scrimModal = document.getElementById('scrim-modal');
    const closeScrimModalBtn = document.getElementById('close-scrim-modal-btn');
    const proposeScrimForm = document.getElementById('propose-scrim-form');
    const scrimOpponentName = document.getElementById('scrim-opponent-name');

    const API_URL = 'http://127.0.0.1:8000/api';
    let myProfile = null;
    let viewedProfile = null;

    // =========================================================================
    // --- FUNÇÕES ---
    // =========================================================================

    function getProfileIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    function openScrimModal(opponent) {
        if (!scrimModal) return;
        scrimOpponentName.textContent = opponent.team_name;
        document.getElementById('scrim-game').value = opponent.main_game || '';
        scrimModal.style.display = 'flex';
    }

    function closeScrimModal() {
        if (!scrimModal) return;
        scrimModal.style.display = 'none';
    }

    async function renderProfileHeader(teamData, myProfileData) {
        teamNameEl.textContent = teamData.team_name;
        tagEl.textContent = `[${teamData.tag || 'N/A'}]`;
        bioEl.textContent = teamData.bio || 'Este time ainda não tem uma bio.';
        if (teamData.team_name) {
            avatarEl.textContent = teamData.team_name.charAt(0).toUpperCase();
        }

        if (myProfileData.id === teamData.id) {
            actionsEl.innerHTML = `<a href="edit-profile.html" class="btn">Editar Perfil</a>`;
        } else {
            const friendsResponse = await fetch(`${API_URL}/friends`, { headers: { 'Authorization': `Bearer ${token}` } });
            const myFriends = await friendsResponse.json();
            const friendIds = myFriends.map(f => f.id);

            if (friendIds.includes(teamData.id)) {
                actionsEl.innerHTML = `<button class="btn schedule-scrim-btn">Agendar Scrim</button>`;
            } else {
                actionsEl.innerHTML = `<button class="btn add-friend-btn" data-team-id="${teamData.id}">Adicionar Amigo</button>`;
            }
        }
    }

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

    function renderPosts(posts, myProfileData) {
        if (!postFeedEl) return;
        if (!posts || posts.length === 0) {
            postFeedEl.innerHTML = '<p>Este time ainda não fez nenhuma publicação.</p>';
            return;
        }
        let postsHTML = '';
        posts.forEach(post => {
            const isLikedByCurrentUser = myProfileData && post.likes && post.likes.includes(myProfileData.id);
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
            alert(error.message);
        }
    }

    async function handleFeedClick(event) {
        const target = event.target;
        const postCard = target.closest('.post-card');
        if (!postCard) return;
        const postId = postCard.dataset.postId;

        const likeButton = target.closest('.like-button');
        if (likeButton) {
            try {
                const response = await fetch(`${API_URL}/posts/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const updatedPost = await response.json();
                if (!response.ok) throw new Error(updatedPost.detail);

                const likesCountSpan = postCard.querySelector('.likes-count');
                const icon = likeButton.querySelector('i');
                likesCountSpan.textContent = updatedPost.likes_count;

                if (myProfile) {
                    const isLiked = updatedPost.likes.includes(myProfile.id);
                    likeButton.classList.toggle('liked', isLiked);
                    icon.classList.toggle('bi-heart-fill', isLiked);
                    icon.classList.toggle('bi-heart', !isLiked);
                }
            } catch (error) {
                console.error('Erro ao curtir:', error.message);
                alert('Não foi possível processar o like.');
            }
        }

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

                initializeProfilePage();
            } catch (error) {
                console.error('Erro ao comentar:', error.message);
                alert('Não foi possível enviar o comentário.');
            }
        }
    }

    function handleAuthError() {
        localStorage.removeItem('accessToken');
        alert('Sua sessão expirou. Por favor, faça o login novamente.');
        window.location.href = 'login.html';
    }

    async function initializeProfilePage() {
        try {
            const myProfileResponse = await fetch(`${API_URL}/teams/me/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            myProfile = await myProfileResponse.json();
            if (!myProfileResponse.ok) throw new Error("Falha ao buscar seu perfil");

            let profileId = getProfileIdFromUrl();
            if (!profileId) {
                profileId = myProfile.id;
            }

            const [profileRes, postsRes, friendsRes] = await Promise.all([
                fetch(`${API_URL}/teams/${profileId}`),
                fetch(`${API_URL}/teams/${profileId}/posts`),
                fetch(`${API_URL}/teams/${profileId}/friends`)
            ]);

            if (!profileRes.ok) throw new Error("Perfil não encontrado");

            viewedProfile = await profileRes.json();
            const postsData = await postsRes.json();
            const friendsData = await friendsRes.json();

            await renderProfileHeader(viewedProfile, myProfile);
            renderPlayers(viewedProfile.players);
            renderPosts(postsData, myProfile);
            renderFriends(friendsData);

        } catch (error) {
            console.error("Erro ao carregar dados do perfil:", error);
            handleAuthError();
        }
    }

    // --- EVENT LISTENERS ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        });
    }

    if (closeScrimModalBtn) closeScrimModalBtn.addEventListener('click', closeScrimModal);
    if (scrimModal) scrimModal.addEventListener('click', (event) => {
        if (event.target === scrimModal) closeScrimModal();
    });

    if (proposeScrimForm) {
        proposeScrimForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const date = document.getElementById('scrim-date').value;
            const time = document.getElementById('scrim-time').value;
            const scrimDatetime = `${date}T${time}:00`;
            const scrimData = {
                opponent_team_id: viewedProfile.id,
                scrim_datetime: scrimDatetime,
                game: document.getElementById('scrim-game').value
            };
            try {
                const response = await fetch(`${API_URL}/scrims`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(scrimData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.detail);
                alert('Convite de Scrim enviado com sucesso!');
                closeScrimModal();
            } catch (error) {
                alert(`Erro ao enviar convite: ${error.message}`);
            }
        });
    }

    if (actionsEl) {
        actionsEl.addEventListener('click', (event) => {
            if (event.target.matches('.schedule-scrim-btn')) {
                openScrimModal(viewedProfile);
            }
            if (event.target.matches('.add-friend-btn')) {
                const targetId = event.target.dataset.teamId;
                sendFriendRequest(targetId, event.target);
            }
        });
    }

    if (postFeedEl) {
        postFeedEl.addEventListener('click', handleFeedClick);
    }

    // --- INICIALIZAÇÃO ---
    initializeProfilePage();
});
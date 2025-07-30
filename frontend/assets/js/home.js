// assets/js/home.js - Versão Final de Depuração

document.addEventListener('DOMContentLoaded', () => {
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
    const API_URL = 'http://127.0.0.1:8000/api';

    let myProfile = null;

    // =========================================================================
    // --- FUNÇÕES DE LÓGICA DA APLICAÇÃO ---
    // =========================================================================

    async function fetchAndRenderPosts() {
        try {
            const response = await fetch(`${API_URL}/posts`);
            const posts = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar os posts.');
            renderPosts(posts);
        } catch (error) {
            console.error('Erro ao buscar posts:', error.message);
            postFeed.innerHTML = '<p class="error-message">Não foi possível carregar o feed.</p>';
        }
    }

    function renderPosts(posts) {
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
                        <strong class="post-author">${post.author.team_name}</strong>
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

    async function fetchMyProfile() {
        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);
            myProfile = data;
            if(teamNamePlaceholder) teamNamePlaceholder.textContent = data.team_name;
            if (creatorAvatar && data.team_name) {
                creatorAvatar.textContent = data.team_name.charAt(0).toUpperCase();
            }
        } catch (error) {
            console.error('Erro ao buscar perfil:', error.message);
            handleAuthError();
        }
    }

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

    async function handleFeedClick(event) {
        const target = event.target;
        const postCard = target.closest('.post-card');
        if (!postCard) return;
        const postId = postCard.dataset.postId;
        
        const likeButton = target.closest('.like-button');
        if (likeButton) {
            try {
                console.log(`[DEBUG] 1. Clicou no like para o post ID: ${postId}`);
                
                const response = await fetch(`${API_URL}/posts/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                console.log(`[DEBUG] 2. Resposta da API recebida. Status: ${response.status}`);
                const updatedPost = await response.json();
                if (!response.ok) throw new Error(updatedPost.detail || 'Erro desconhecido da API.');
                
                console.log("[DEBUG] 3. Resposta da API foi OK. Dados:", updatedPost);

                const likesCountSpan = postCard.querySelector('.likes-count');
                const icon = likeButton.querySelector('i');

                if (!likesCountSpan || !icon) {
                    throw new Error("Elementos .likes-count ou <i> não encontrados no HTML.");
                }
                console.log("[DEBUG] 4. Elementos de UI (contador e ícone) encontrados.");

                likesCountSpan.textContent = updatedPost.likes_count;
                console.log("[DEBUG] 5. Contagem de likes atualizada na tela.");

                if (myProfile && updatedPost.likes) {
                    console.log(`[DEBUG] 6. Verificando like. ID do usuário: ${myProfile.id}, Lista de likes: ${JSON.stringify(updatedPost.likes)}`);
                    const isLiked = updatedPost.likes.includes(myProfile.id);
                    console.log(`[DEBUG] 7. O usuário curtiu este post? ${isLiked}`);
                    
                    likeButton.classList.toggle('liked', isLiked);
                    icon.classList.toggle('bi-heart-fill', isLiked);
                    icon.classList.toggle('bi-heart', !isLiked);
                    console.log("[DEBUG] 8. Interface do botão atualizada.");
                } else {
                     console.warn("[DEBUG] 9. 'myProfile' ou 'updatedPost.likes' indisponíveis para atualizar ícone.");
                }

            } catch (error) {
                console.error('ERRO AO CURTIR:', error);
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
                commentInput.value = '';
                fetchAndRenderPosts();
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

    // --- EVENT LISTENERS E INICIALIZAÇÃO ---
    if(createPostForm) createPostForm.addEventListener('submit', handlePostSubmit);
    if(postFeed) postFeed.addEventListener('click', handleFeedClick);
    if(logoutButton) logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    });
    
    if(postContentTextarea) postContentTextarea.addEventListener('input', () => {
        const count = postContentTextarea.value.length;
        if(charCounter) charCounter.textContent = `${count} / 280`;
        if (count > 280) {
            if(charCounter) charCounter.style.color = 'var(--color-glow-end)';
        } else {
            if(charCounter) charCounter.style.color = 'var(--color-text-secondary)';
        }
    });

    async function initializePage() {
        await fetchMyProfile();
        await fetchAndRenderPosts();
    }

    initializePage();
});
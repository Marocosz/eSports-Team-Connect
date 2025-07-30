// assets/js/home.js - Versão Final com Verificação de Segurança

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const postFeed = document.getElementById('post-feed');
    const createPostForm = document.getElementById('create-post-form');
    const postContentTextarea = document.getElementById('post-content');
    const teamNamePlaceholder = document.getElementById('team-name-placeholder');
    const logoutButton = document.getElementById('logout-button');
    const API_URL = 'http://127.0.0.1:8000/api';

    let myProfile = null;

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
            // --- VERIFICAÇÃO MAIS SEGURA ---
            // Garante que 'myProfile' e 'post.likes' existam antes de tentar acessar suas propriedades.
            const isLikedByCurrentUser = myProfile && post.likes && post.likes.includes(myProfile.id);

            postsHTML += `
                <div class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <strong class="post-author">${post.author.team_name}</strong>
                        <span class="post-tag">[${post.author.tag || 'N/A'}]</span>
                        <span class="post-timestamp">${new Date(post.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p class="post-content">${post.content}</p>
                    
                    <div class="post-actions">
                        <div class="action-item">
                            <button class="action-button like-button ${isLikedByCurrentUser ? 'liked' : ''}">
                                <i class="bi ${isLikedByCurrentUser ? 'bi-heart-fill' : 'bi-heart'}"></i>
                            </button>
                            <span class="likes-count">${post.likes_count}</span>
                        </div>
                        <div class="action-item">
                            <button class="action-button comment-button">
                                <i class="bi bi-chat"></i>
                            </button>
                            <span class="comments-count">${post.comments.length}</span>
                        </div>
                    </div>

                    <div class="post-comments">
                        <div class="comment-list">
                            ${post.comments.map(comment => `
                                <div class="comment">
                                    <p><strong>${comment.author.team_name}:</strong> ${comment.content}</p>
                                </div>
                            `).join('')}
                        </div>
                        <form class="comment-form">
                            <input type="text" placeholder="Escreva um comentário..." required>
                            <button type="submit" class="btn">Comentar</button>
                        </form>
                    </div>
                </div>
            `;
        });
        postFeed.innerHTML = postsHTML;
    }

    async function fetchMyProfile() {
        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);
            myProfile = data;
            teamNamePlaceholder.textContent = data.team_name;
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: content })
            });
            const newPost = await response.json();
            if (!response.ok) throw new Error(newPost.detail);
            postContentTextarea.value = '';
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
                const response = await fetch(`${API_URL}/posts/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const updatedPost = await response.json();
                if (!response.ok) throw new Error(updatedPost.detail);
                
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

        if (target.matches('.comment-form button')) {
            event.preventDefault();
            const commentInput = target.previousElementSibling;
            const content = commentInput.value.trim();
            if (!content) return;
            try {
                const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
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

    createPostForm.addEventListener('submit', handlePostSubmit);
    postFeed.addEventListener('click', handleFeedClick);
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    });

    async function initializePage() {
        await fetchMyProfile();
        await fetchAndRenderPosts();
    }

    initializePage();
});
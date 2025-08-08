// assets/js/main.js - Versão Final com Notificações Unificadas

document.addEventListener('DOMContentLoaded', () => {
    // Roda o script apenas se o usuário estiver logado
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return;
    }

    // --- Elementos Globais ---
    const notificationBell = document.querySelector('.notification-bell');
    const notificationCountSpan = document.getElementById('notification-count');
    const modal = document.getElementById('notification-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const notificationListDiv = document.getElementById('notification-list');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const API_URL = 'http://127.0.0.1:8000/api';

    /**
     * Busca TODAS as notificações e atualiza o contador no sino.
     */
    async function updateNotificationCount() {
        if (!notificationCountSpan) return;
        try {
            // Usa a nova rota unificada
            const response = await fetch(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            // Soma o total de notificações dos dois tipos
            const totalNotifications = data.friend_requests.length + data.scrim_invites.length;

            if (totalNotifications > 0) {
                notificationCountSpan.textContent = totalNotifications;
                notificationCountSpan.style.display = 'flex';
            } else {
                notificationCountSpan.style.display = 'none';
            }
        } catch (error) {
            console.error("Não foi possível buscar notificações.");
        }
    }

    /**
     * Abre o modal e renderiza os dois tipos de notificação.
     */
    async function openNotificationModal() {
        if (!modal || !notificationListDiv) return;
        modal.style.display = 'flex';
        notificationListDiv.innerHTML = '<p>Carregando...</p>';

        try {
            // Usa a nova rota unificada
            const response = await fetch(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            const friendRequests = data.friend_requests;
            const scrimInvites = data.scrim_invites;

            if (friendRequests.length === 0 && scrimInvites.length === 0) {
                notificationListDiv.innerHTML = '<p>Nenhuma notificação nova.</p>';
                return;
            }
            
            let html = '';

            // Renderiza os pedidos de amizade
            if (friendRequests.length > 0) {
                html += '<h4>Pedidos de Amizade</h4>';
                html += friendRequests.map(req => `
                    <div class="social-item" data-id="${req.id}">
                        <span>Pedido de <strong>${req.team_name}</strong></span>
                        <div class="social-actions">
                            <button class="btn btn-small accept-friend-btn">Aceitar</button>
                        </div>
                    </div>
                `).join('');
            }

            // Renderiza os convites de scrim
            if (scrimInvites.length > 0) {
                html += '<h4>Convites de Scrim</h4>';
                html += scrimInvites.map(scrim => `
                    <div class="social-item" data-id="${scrim.id}">
                        <span>Convite de <strong>${scrim.proposing_team.team_name}</strong></span>
                        <div class="social-actions">
                            <a href="scrims.html" class="btn btn-small">Ver Scrims</a>
                        </div>
                    </div>
                `).join('');
            }

            notificationListDiv.innerHTML = html;

        } catch (error) {
            notificationListDiv.innerHTML = '<p class="error-message">Erro ao carregar notificações.</p>';
        }
    }

    /**
     * Fecha o modal de notificações.
     */
    function closeModal() {
        if (!modal) return;
        modal.style.display = 'none';
    }

    /**
     * Lida com a ação de aceitar um pedido de amizade de dentro do modal.
     */
    async function handleAcceptRequest(requesterId) {
        try {
            const response = await fetch(`${API_URL}/friends/accept/${requesterId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao aceitar o pedido.');
            
            // Sucesso! Atualiza o conteúdo do modal e o contador no sino.
            openNotificationModal();
            updateNotificationCount();

        } catch (error) {
            alert(error.message);
        }
    }

    // --- Event Listeners ---

    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }

    if (notificationBell) {
        notificationBell.addEventListener('click', (event) => {
            event.preventDefault();
            openNotificationModal();
        });
    }

    if (modal) {
        if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });
        if(notificationListDiv) {
            notificationListDiv.addEventListener('click', (event) => {
                // Agora o listener diferencia o botão clicado
                if (event.target.matches('.accept-friend-btn')) {
                    const requesterId = event.target.closest('.social-item').dataset.id;
                    handleAcceptRequest(requesterId);
                }
            });
        }
    }

    // --- Inicialização ---
    updateNotificationCount();
});
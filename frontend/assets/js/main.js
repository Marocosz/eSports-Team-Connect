// assets/js/main.js - Versão Final Segura

document.addEventListener('DOMContentLoaded', () => {
    // Roda o script apenas se o usuário estiver logado
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return; 
    }

    // --- Elementos Globais da Navbar/Modal ---
    const notificationBell = document.querySelector('.notification-bell');
    const notificationCountSpan = document.getElementById('notification-count');
    const modal = document.getElementById('notification-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const notificationListDiv = document.getElementById('notification-list');
    const API_URL = 'http://127.0.0.1:8000/api';

    /**
     * Busca o número de pedidos de amizade e atualiza o sino de notificação.
     */
    async function updateNotificationCount() {
        // Garante que o elemento do contador exista na página atual
        if (!notificationCountSpan) return;
        
        try {
            const response = await fetch(`${API_URL}/friends/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const requests = await response.json();
            if (requests.length > 0) {
                notificationCountSpan.textContent = requests.length;
                notificationCountSpan.style.display = 'flex';
            } else {
                notificationCountSpan.style.display = 'none';
            }
        } catch (error) {
            console.error("Não foi possível buscar notificações.");
        }
    }

    /**
     * Abre o modal e busca a lista de pedidos de amizade.
     */
    async function openNotificationModal() {
        if (!modal || !notificationListDiv) return;
        modal.style.display = 'flex';
        notificationListDiv.innerHTML = '<p>Carregando...</p>';

        try {
            const response = await fetch(`${API_URL}/friends/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const requests = await response.json();
            
            if (requests.length === 0) {
                notificationListDiv.innerHTML = '<p>Nenhuma notificação nova.</p>';
                return;
            }
            
            notificationListDiv.innerHTML = requests.map(req => `
                <div class="social-item" data-id="${req.id}">
                    <span>Pedido de amizade de <strong>${req.team_name}</strong></span>
                    <div class="social-actions">
                        <button class="btn btn-small accept-btn">Aceitar</button>
                    </div>
                </div>
            `).join('');
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
     * @param {string} requesterId - O ID do time que enviou o pedido.
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

    // --- Event Listeners (Escutadores de Eventos) ---
    // A verificação `if (elemento)` antes de cada listener previne o erro 'TypeError'.

    if (notificationBell) {
        notificationBell.addEventListener('click', (event) => {
            event.preventDefault(); // Impede o link de navegar para outra página
            openNotificationModal();
        });
    }

    if (modal) {
        // Listener para o botão de fechar
        if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

        // Listener para fechar o modal clicando fora dele
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        // Listener para os botões de 'Aceitar' dentro da lista
        if(notificationListDiv) {
            notificationListDiv.addEventListener('click', (event) => {
                if (event.target.matches('.accept-btn')) {
                    const requesterId = event.target.closest('.social-item').dataset.id;
                    handleAcceptRequest(requesterId);
                }
            });
        }
    }

    // --- Inicialização ---
    // Atualiza o contador de notificações assim que a página carrega.
    updateNotificationCount();
});
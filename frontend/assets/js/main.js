// assets/js/main.js - Versão com Lógica de Modal

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return; // Se não está logado, não faz nada

    // --- Elementos Globais ---
    const notificationBell = document.querySelector('.notification-bell');
    const notificationCountSpan = document.getElementById('notification-count');
    const API_URL = 'http://127.0.0.1:8000/api';

    // --- Elementos do Modal ---
    const modal = document.getElementById('notification-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const notificationListDiv = document.getElementById('notification-list');

    // --- Funções ---

    async function updateNotificationCount() {
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

    async function openNotificationModal() {
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

    function closeModal() {
        modal.style.display = 'none';
    }

    async function handleAcceptRequest(requesterId) {
        try {
            const response = await fetch(`${API_URL}/friends/accept/${requesterId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao aceitar o pedido.');
            
            // Sucesso! Atualiza o conteúdo do modal e o sino
            openNotificationModal();
            updateNotificationCount();

        } catch (error) {
            alert(error.message);
        }
    }

    // --- Event Listeners ---

    // Abrir o modal
    notificationBell.addEventListener('click', (event) => {
        event.preventDefault(); // Impede que o link mude de página
        openNotificationModal();
    });

    // Fechar o modal
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) { // Fecha o modal se clicar no fundo
            closeModal();
        }
    });

    // Ações dentro do modal (aceitar pedido)
    notificationListDiv.addEventListener('click', (event) => {
        if (event.target.matches('.accept-btn')) {
            const requesterId = event.target.closest('.social-item').dataset.id;
            handleAcceptRequest(requesterId);
        }
    });

    // --- Inicialização ---
    updateNotificationCount();
});
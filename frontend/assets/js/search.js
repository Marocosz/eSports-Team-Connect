// assets/js/search.js - Versão Final e Completa

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elementos do DOM ---
    const resultsList = document.getElementById('search-results-list');
    const searchTitle = document.getElementById('search-title');
    const logoutButton = document.getElementById('logout-button'); // Adicionado
    const API_URL = 'http://127.0.0.1:8000/api';

    /**
     * Busca os times na API com base no termo da URL e os renderiza.
     */
    async function performSearch() {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');

        if (!query) {
            searchTitle.textContent = "Nenhum termo de busca fornecido.";
            return;
        }

        searchTitle.innerHTML = `Resultados para: <span style="color: var(--color-glow-start);">${query}</span>`;
        
        try {
            const response = await fetch(`${API_URL}/teams/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!response.ok) {
                // Converte o detalhe do erro (que pode ser um objeto/lista) em texto legível
                const errorDetail = JSON.stringify(data.detail);
                throw new Error(errorDetail || 'Ocorreu um erro na busca.');
            }
            
            const teams = data;
            if (teams.length === 0) {
                resultsList.innerHTML = '<p>Nenhum time encontrado para este termo.</p>';
                return;
            }

            // Reutiliza o mesmo design do widget "Descobrir Times"
            resultsList.innerHTML = '';
            teams.forEach(team => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="discover-item-info">
                        <div class="discover-avatar">${team.team_name.charAt(0).toUpperCase()}</div>
                        <div class="discover-text">
                            <a href="profile.html?id=${team.id}" class="discover-team-link">${team.team_name}</a>
                            <small>${team.main_game || 'Jogo não definido'}</small>
                        </div>
                    </div>
                    <button class="btn btn-small add-friend-btn" data-team-id="${team.id}">Adicionar</button>
                `;
                resultsList.appendChild(li);
            });

        } catch (error) {
            console.error("Erro na busca:", error);
            resultsList.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    /**
     * Envia um pedido de amizade para a API.
     * @param {string} targetTeamId - O ID do time para o qual enviar o pedido.
     * @param {HTMLElement} buttonElement - O botão que foi clicado.
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

    // --- EVENT LISTENERS ---

    // Listener para os cliques na lista de resultados (para o botão de adicionar)
    if (resultsList) {
        resultsList.addEventListener('click', (event) => {
            if (event.target.matches('.add-friend-btn')) {
                const targetId = event.target.dataset.teamId;
                sendFriendRequest(targetId, event.target);
            }
        });
    }

    // Listener para o botão de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        });
    }

    // --- INICIALIZAÇÃO ---
    performSearch();
});
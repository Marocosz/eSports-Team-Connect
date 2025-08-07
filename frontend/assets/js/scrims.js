// assets/js/scrims.js - Versão Final Corrigida

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elementos do DOM ---
    const pendingListDiv = document.getElementById('pending-scrims-list');
    const confirmedListDiv = document.getElementById('confirmed-scrims-list');
    const historyListDiv = document.getElementById('history-scrims-list');
    const welcomeTeamName = document.getElementById('welcome-team-name');
    const logoutButton = document.getElementById('logout-button');
    const API_URL = 'http://127.0.0.1:8000/api';

    let myProfile = null;

    /**
     * Busca o perfil do time logado. É a primeira coisa a ser feita.
     * Retorna o objeto do perfil em caso de sucesso.
     */
    async function fetchMyProfile() {
        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);

            myProfile = data;
            if (welcomeTeamName) {
                welcomeTeamName.textContent = myProfile.team_name;
            }
            return data; // Retorna os dados do perfil
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
            return null;
        }
    }

    /**
     * Busca todos os agendamentos de scrims e os distribui para renderização.
     * @param {object} myProfile - O objeto do perfil do time logado.
     */
    async function fetchAndRenderScrims(myProfile) {
        if (!myProfile) {
            console.error("Não foi possível renderizar scrims sem dados do perfil.");
            return;
        }
        try {
            const response = await fetch(`${API_URL}/scrims/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar scrims');
            const allScrims = await response.json();

            // Filtra as scrims por status
            const pending = allScrims.filter(s => s.status === 'Pendente' && s.opponent_team.id === myProfile.id);
            const confirmed = allScrims.filter(s => s.status === 'Confirmada');
            const history = allScrims.filter(s => s.status !== 'Pendente' && s.status !== 'Confirmada');

            renderScrims(pendingListDiv, pending, 'pending', myProfile);
            renderScrims(confirmedListDiv, confirmed, 'confirmed', myProfile);
            renderScrims(historyListDiv, history, 'history', myProfile);

        } catch (error) {
            console.error("Erro ao buscar scrims:", error);
        }
    }

    /**
     * Renderiza uma lista de scrims em um elemento da página.
     */
    function renderScrims(element, scrims, type, myProfile) {
        if (!element) return;
        if (scrims.length === 0) {
            element.innerHTML = '<p>Nenhuma scrim nesta categoria.</p>';
            return;
        }
        element.innerHTML = scrims.map(scrim => {
            // Pega os nomes dos times
            const proposingTeamName = scrim.proposing_team ? scrim.proposing_team.team_name : 'Time Desconhecido';
            const opponentTeamName = scrim.opponent_team ? scrim.opponent_team.team_name : 'Time Desconhecido';

            // Formata as duas datas que agora vamos exibir
            const scheduledDate = new Date(scrim.scrim_datetime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const requestedDate = new Date(scrim.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

            const amITheOpponent = myProfile && scrim.opponent_team.id === myProfile.id;

            return `
            <div class="scrim-card ${scrim.status.toLowerCase()}">
                <div class="scrim-info">
                    <strong>${proposingTeamName} <span class="vs-text">vs</span> ${opponentTeamName}</strong>
                    
                    <p class="scrim-scheduled-date"><strong>Agendado para:</strong> ${scheduledDate}</p>
                    <p class="scrim-request-date">Proposta em: ${requestedDate}</p>
                </div>
                ${(type === 'pending' && amITheOpponent) ? `
                    <div class="scrim-actions">
                        <button class="btn btn-small accept-scrim-btn" data-scrim-id="${scrim.id}">Aceitar</button>
                    </div>
                ` : ''}
            </div>
        `;
        }).join('');
    }

    /**
     * Lida com a ação de aceitar uma scrim.
     */
    async function acceptScrim(scrimId, myProfile) {
        try {
            const response = await fetch(`${API_URL}/scrims/${scrimId}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Falha ao aceitar scrim.');
            }
            fetchAndRenderScrims(myProfile); // Atualiza a lista
        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * Orquestra o carregamento da página, garantindo a ordem correta.
     */
    async function initializePage() {
        const myProfileData = await fetchMyProfile();
        if (myProfileData) {
            await fetchAndRenderScrims(myProfileData);
            if (pendingListDiv) {
                pendingListDiv.addEventListener('click', event => {
                    if (event.target.matches('.accept-scrim-btn')) {
                        const scrimId = event.target.dataset.scrimId;
                        acceptScrim(scrimId, myProfileData);
                    }
                });
            }
        }
    }

    // Adiciona a lógica de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        });
    }

    // Inicia o carregamento da página.
    initializePage();
});
// assets/js/home.js

document.addEventListener('DOMContentLoaded', () => {
    // --- O "SEGURANÇA" DA PÁGINA ---
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- ELEMENTOS DA PÁGINA ---
    const teamsGrid = document.getElementById('teams-grid');
    const logoutButton = document.getElementById('logout-button');
    const API_URL = 'http://127.0.0.1:8000/api';

    // --- FUNÇÕES ---

    // Função para buscar todos os times
    async function fetchAllTeams() {
        try {
            const response = await fetch(`${API_URL}/teams`, {
                method: 'GET',
                headers: {
                    // Mesmo para rotas públicas, é bom enviar o token se o tivermos
                    'Authorization': `Bearer ${token}`
                }
            });
            const teams = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar os times.');
            
            renderTeams(teams); // Chama a função para renderizar os times na tela

        } catch (error) {
            console.error('Erro ao buscar times:', error.message);
            teamsGrid.innerHTML = '<p>Não foi possível carregar os times.</p>';
        }
    }

    // Função para criar o HTML dos cards e colocar na página
    function renderTeams(teams) {
        if (teams.length === 0) {
            teamsGrid.innerHTML = '<p>Nenhum time cadastrado ainda.</p>';
            return;
        }

        let teamsHTML = '';
        teams.forEach(team => {
            teamsHTML += `
                <div class="team-card">
                    <h3>${team.team_name} <span>[${team.tag || 'N/A'}]</span></h3>
                    <p><strong>Jogo Principal:</strong> ${team.main_game || 'Não definido'}</p>
                </div>
            `;
        });

        teamsGrid.innerHTML = teamsHTML;
    }
    
    // Lógica de Logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    });

    // --- INICIALIZAÇÃO ---
    fetchAllTeams(); // Chama a função principal assim que a página carrega
});
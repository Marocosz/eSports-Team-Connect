// assets/js/edit-profile.js - Versão Final e Completa

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elementos do DOM ---
    const editProfileForm = document.getElementById('edit-profile-form');
    const addPlayerForm = document.getElementById('add-player-form');
    const playersListDiv = document.getElementById('players-list');
    const messageContainer = document.getElementById('message-container');
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const mainGameSelect = document.getElementById('main_game');
    const playerRoleSelect = document.getElementById('player-role');
    const logoutButton = document.getElementById('logout-button'); // Adicionado
    
    const API_URL = 'http://127.0.0.1:8000/api';
    let myProfile = null;

    // --- DADOS DAS FUNÇÕES (ROLES) ---
    const gameRoles = {
        "League of Legends": ["Top Laner", "Jungler", "Mid Laner", "AD Carry", "Support"],
        "Valorant": ["Duelista", "Iniciador", "Controlador", "Sentinela"],
        "Counter-Strike": ["Entry Fragger", "Suporte", "Lurker", "AWPer", "IGL (In-Game Leader)"]
    };

    // --- Lógica das Abas ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- FUNÇÕES ---

    /**
     * Atualiza o dropdown de funções do jogador com base no jogo selecionado.
     */
    function updatePlayerRolesDropdown(selectedGame) {
        playerRoleSelect.innerHTML = ''; 
        if (!selectedGame || !gameRoles[selectedGame]) {
            playerRoleSelect.innerHTML = '<option value="">-- Selecione um Jogo Principal no perfil --</option>';
            playerRoleSelect.disabled = true;
            return;
        }

        playerRoleSelect.disabled = false;
        playerRoleSelect.innerHTML = '<option value="">-- Selecione uma função --</option>';
        gameRoles[selectedGame].forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            playerRoleSelect.appendChild(option);
        });
    }

    /**
     * Busca os dados atuais do perfil e preenche a página.
     */
    async function populatePageData() {
        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);
            
            myProfile = data;
            
            // Preenche o formulário de perfil
            document.getElementById('team_name').value = data.team_name || '';
            document.getElementById('tag').value = data.tag || '';
            document.getElementById('main_game').value = data.main_game || '';
            document.getElementById('bio').value = data.bio || '';
            
            // Preenche a lista de jogadores
            renderPlayers(data.players);

            // Popula o dropdown de roles com base no jogo atual do time
            updatePlayerRolesDropdown(data.main_game);

        } catch (error) {
            console.error('Erro ao buscar perfil:', error.message);
            // Lida com token inválido/expirado
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        }
    }

    /**
     * Renderiza a lista de jogadores com o botão de excluir.
     */
    function renderPlayers(players) {
        if (players.length === 0) {
            playersListDiv.innerHTML = '<p>Nenhum jogador cadastrado.</p>';
            return;
        }
        playersListDiv.innerHTML = players.map(player => `
            <div class="social-item" data-player-id="${player.id}">
                <span>${player.nickname} (${player.role || 'N/A'})</span>
                <button class="delete-player-btn" title="Excluir Jogador">&times;</button>
            </div>
        `).join('');
    }

    /**
     * Envia o pedido para deletar um jogador.
     */
    async function deletePlayer(playerId) {
        if (!confirm('Tem certeza que deseja excluir este jogador? Esta ação não pode ser desfeita.')) {
            return;
        }
        try {
            const response = await fetch(`${API_URL}/players/${playerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Falha ao excluir o jogador.');
            }
            alert('Jogador excluído com sucesso!');
            populatePageData(); // Atualiza a lista na tela
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    }

    // --- EVENT LISTENERS ---
    
    // Listener para o formulário de edição de perfil
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const updatedData = {
            team_name: document.getElementById('team_name').value,
            tag: document.getElementById('tag').value,
            main_game: document.getElementById('main_game').value,
            bio: document.getElementById('bio').value,
        };
        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify(updatedData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail);

            alert('Perfil atualizado com sucesso!');
            window.location.href = 'profile.html';
        } catch (error) {
            messageContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    });

    // Listener para o formulário de adicionar jogador
    addPlayerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const playerData = {
            nickname: document.getElementById('player-nickname').value,
            role: document.getElementById('player-role').value,
        };
        try {
            const response = await fetch(`${API_URL}/teams/${myProfile.id}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify(playerData)
            });
            const newPlayer = await response.json();
            if (!response.ok) throw new Error(newPlayer.detail);

            alert(`Jogador "${newPlayer.nickname}" adicionado com sucesso!`);
            addPlayerForm.reset();
            populatePageData();
        } catch (error) {
            alert(`Erro ao adicionar jogador: ${error.message}`);
        }
    });
    
    // Listener para o dropdown de Jogo Principal
    mainGameSelect.addEventListener('change', (event) => {
        const selectedGame = event.target.value;
        updatePlayerRolesDropdown(selectedGame);
    });

    // Listener para a lista de jogadores (para o botão de excluir)
    playersListDiv.addEventListener('click', (event) => {
        if (event.target.matches('.delete-player-btn')) {
            const playerId = event.target.closest('.social-item').dataset.playerId;
            deletePlayer(playerId);
        }
    });
    
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        });
    }

    // --- INICIALIZAÇÃO ---
    populatePageData();
});
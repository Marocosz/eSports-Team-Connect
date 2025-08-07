// assets/js/edit-profile.js - Versão com Dropdown Dinâmico

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

    // --- Novos seletores ---
    const mainGameSelect = document.getElementById('main_game');
    const playerRoleSelect = document.getElementById('player-role');
    
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

    // --- LÓGICA NOVA: Atualiza o dropdown de funções do jogador ---
    function updatePlayerRolesDropdown(selectedGame) {
        playerRoleSelect.innerHTML = ''; // Limpa as opções antigas

        if (!selectedGame || !gameRoles[selectedGame]) {
            playerRoleSelect.innerHTML = '<option value="">-- Selecione um Jogo Principal no perfil --</option>';
            playerRoleSelect.disabled = true;
            return;
        }

        playerRoleSelect.disabled = false;
        playerRoleSelect.innerHTML = '<option value="">-- Selecione uma função --</option>';
        
        const roles = gameRoles[selectedGame];
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            playerRoleSelect.appendChild(option);
        });
    }

    // --- Lógica de Dados ---
    
    // 1. Busca os dados atuais e preenche tudo
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

            // ATUALIZAÇÃO: Popula o dropdown de roles com base no jogo atual do time
            updatePlayerRolesDropdown(data.main_game);

        } catch (error) {
            console.error('Erro ao buscar perfil:', error.message);
        }
    }

    // 2. Renderiza a lista de jogadores
    function renderPlayers(players) {
        if (players.length === 0) {
            playersListDiv.innerHTML = '<p>Nenhum jogador cadastrado.</p>';
            return;
        }
        playersListDiv.innerHTML = players.map(player => `
            <div class="social-item">
                <span>${player.nickname} (${player.role || 'N/A'})</span>
            </div>
        `).join('');
    }

    // 3. Lida com o envio do formulário de edição de perfil
    editProfileForm.addEventListener('submit', async (event) => { /* ... (sem alterações) ... */ });

    // 4. Lida com o envio do formulário para adicionar jogador
    addPlayerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const playerData = {
            nickname: document.getElementById('player-nickname').value,
            role: document.getElementById('player-role').value, // <-- Agora pega do <select>
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
    
    // --- EVENT LISTENER NOVO ---
    // Escuta por mudanças no select de Jogo Principal
    mainGameSelect.addEventListener('change', (event) => {
        const selectedGame = event.target.value;
        updatePlayerRolesDropdown(selectedGame);
    });

    populatePageData();
});
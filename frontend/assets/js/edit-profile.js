// assets/js/edit-profile.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('edit-profile-form');
    const messageContainer = document.getElementById('message-container');
    const API_URL = 'http://127.0.0.1:8000/api';

    // 1. Busca os dados atuais e preenche o formulário
    async function populateForm() {
        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);
            
            // Preenche os campos do formulário
            document.getElementById('team_name').value = data.team_name || '';
            document.getElementById('tag').value = data.tag || '';
            document.getElementById('main_game').value = data.main_game || '';
            document.getElementById('bio').value = data.bio || '';
            document.getElementById('discord').value = data.socials?.discord || '';
            document.getElementById('twitter').value = data.socials?.twitter || '';

        } catch (error) {
            console.error('Erro ao buscar perfil:', error.message);
        }
    }

    // 2. Lida com o envio do formulário
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Coleta os dados do formulário
        const updatedData = {
            team_name: document.getElementById('team_name').value,
            tag: document.getElementById('tag').value,
            main_game: document.getElementById('main_game').value,
            bio: document.getElementById('bio').value,
            socials: {
                discord: document.getElementById('discord').value,
                twitter: document.getElementById('twitter').value
            }
        };

        try {
            const response = await fetch(`${API_URL}/teams/me/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail);

            alert('Perfil atualizado com sucesso!');
            window.location.href = 'profile.html'; // Redireciona de volta para o perfil

        } catch (error) {
            messageContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    });

    populateForm();
});
// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Containers dos formulários
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    
    // Links para alternar entre os formulários
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    // Formulários
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const messageContainer = document.getElementById('message-container');
    const API_URL = 'http://127.0.0.1:8000/api';

    // --- Lógica para alternar formulários ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
        messageContainer.innerHTML = '';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.style.display = 'block';
        registerContainer.style.display = 'none';
        messageContainer.innerHTML = '';
    });
    
    // --- Lógica de Registro ---
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = {
            email: document.getElementById('register-email').value,
            team_name: document.getElementById('register-team-name').value,
            password: document.getElementById('register-password').value,
            main_game: document.getElementById('register-main-game').value,
        };

        try {
            const response = await fetch(`${API_URL}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);
            
            messageContainer.innerHTML = `<p class="success-message">Time "${data.team_name}" registrado com sucesso! Faça o login.</p>`;
            showLoginLink.click(); // Alterna para a tela de login
        } catch (error) {
            messageContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    });

    // --- Lógica de Login ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // O endpoint de login do FastAPI com OAuth2PasswordRequestForm espera dados de formulário, não JSON
        const formData = new URLSearchParams();
        formData.append('username', document.getElementById('login-email').value);
        formData.append('password', document.getElementById('login-password').value);
        
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);

            // Login bem-sucedido! Salva o token e redireciona.
            localStorage.setItem('accessToken', data.access_token);
            window.location.href = 'index.html'; // Redireciona para a página principal
            
        } catch (error) {
            messageContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    });
});
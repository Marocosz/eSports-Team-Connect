// src/components/Register.jsx

import { useState } from 'react';
import axios from 'axios';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    team_name: '',
    password: '',
    main_game: ''
  });
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      // O endpoint para registro é POST /api/teams
      const response = await axios.post('http://127.0.0.1:8000/api/teams', formData);
      console.log(response.data);
      setMessage(`Time "${response.data.team_name}" registrado com sucesso!`);
    } catch (err) {
      console.error(err);
      // Extrai a mensagem de erro específica do FastAPI
      const errorMessage = err.response?.data?.detail || 'Ocorreu um erro ao registrar.';
      setError(errorMessage);
    }
  };

  return (
    <div className="form-container">
      <h2>Criar Conta de Time</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="team_name"
          placeholder="Nome do Time"
          value={formData.team_name}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Senha"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="main_game"
          placeholder="Jogo Principal"
          value={formData.main_game}
          onChange={handleChange}
        />
        <button type="submit">Registrar</button>
      </form>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default Register;
import { useState, useEffect } from 'react' // <--- IMPORTE OS HOOKS
import './App.css'

function App() {
  // Cria uma variável de estado 'teams' para guardar a lista de times.
  // Começa como um array vazio [].
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true); // Estado para controlar a mensagem "Carregando..."

  // useEffect para buscar os dados da API quando o componente montar
  useEffect(() => {
    // A URL completa do nosso endpoint no back-end
    const apiUrl = 'http://127.0.0.1:8000/api/teams';

    console.log("Buscando times na API...");

    fetch(apiUrl)
      .then(response => response.json()) // Converte a resposta para JSON
      .then(data => {
        console.log("Dados recebidos:", data);
        setTeams(data); // Atualiza o estado 'teams' com os dados recebidos
        setLoading(false); // Remove a mensagem de carregamento
      })
      .catch(error => {
        console.error("Erro ao buscar dados da API:", error);
        setLoading(false); // Remove a mensagem de carregamento mesmo se der erro
      });

  }, []); // O array vazio [] no final faz com que este useEffect rode apenas uma vez

  return (
    <div className="App">
      <header className="App-header">
        <h1>eSports Team Connect</h1>
        <p>Encontre e agende treinos com os melhores times!</p>
      </header>
      <main>
        <h2>Times Cadastrados</h2>
        <div className="teams-list">
          {/* Lógica para exibir os times */}
          {loading ? (
            <p>Carregando times...</p>
          ) : (
            teams.map(team => (
              // O '.map' funciona como um loop para criar um elemento para cada time
              <div key={team.id} className="team-card">
                <h3>{team.team_name} [{team.tag}]</h3>
                <p>Jogo Principal: {team.main_game}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

export default App
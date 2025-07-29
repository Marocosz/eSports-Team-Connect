// src/App.jsx

import './App.css';
import Register from './components/Register'; // Importa o novo componente

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>eSports Team Connect</h1>
      </header>
      <main>
        {/* Por enquanto, vamos mostrar apenas o formulário de registro */}
        <Register />
      </main>
    </div>
  );
}

export default App;
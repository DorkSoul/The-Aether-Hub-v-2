import React, { useState } from 'react';
import GameBoard from './components/GameBoard.tsx';
import Decks from './components/Decks.tsx'; // Import the new component
import './App.css';

// Define the possible views
type View = 'decks' | 'game';

function App() {
  const [view, setView] = useState<View>('decks'); // Default to decks view

  return (
    <div className="App">
      <nav className="main-nav">
        <button onClick={() => setView('decks')} disabled={view === 'decks'}>
          Deckbuilder
        </button>
        <button onClick={() => setView('game')} disabled={view === 'game'}>
          Game
        </button>
      </nav>

      {/* Conditionally render the active view */}
      {view === 'decks' && <Decks />}
      {view === 'game' && <GameBoard />}
    </div>
  );
}

export default App;
// src/App.tsx
import React, { useState } from 'react';
import GameBoard from './components/GameBoard.tsx';
import Decks from './components/Decks.tsx';
import './App.css';

type View = 'decks' | 'game';

function App() {
  const [view, setView] = useState<View>('decks');
  const [imageDirectoryHandle, setImageDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const handleSelectImageCacheFolder = async () => {
    try {
      // Use the File System Access API to prompt the user for a directory
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite' // Request permission to read and write files
      });
      setImageDirectoryHandle(dirHandle);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.info("User cancelled the folder selection dialog.");
      } else {
        console.error("Error selecting folder:", err);
      }
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <nav className="main-nav">
          <button onClick={() => setView('decks')} disabled={view === 'decks'}>
            Deckbuilder
          </button>
          <button onClick={() => setView('game')} disabled={view === 'game'}>
            Game
          </button>
        </nav>
        <div className="settings-controls">
          <button onClick={handleSelectImageCacheFolder} title="Select a local folder to cache card images for offline use and faster loading.">
            {imageDirectoryHandle ? `Image Cache: ${imageDirectoryHandle.name}` : 'Set Image Cache Folder'}
          </button>
        </div>
      </header>

      {/* Pass the directory handle to the active view */}
      <main>
        {view === 'decks' && <Decks imageDirectoryHandle={imageDirectoryHandle} />}
        {view === 'game' && <GameBoard imageDirectoryHandle={imageDirectoryHandle} />}
      </main>
    </div>
  );
}

export default App;
// src/App.tsx
import React, { useState, useCallback } from 'react';
import GameBoard from './components/GameBoard.tsx';
import Decks from './components/Decks.tsx';
import { PlusIcon, MinusIcon } from './components/icons.tsx';
import './App.css';

type View = 'decks' | 'game';

function App() {
  const [view, setView] = useState<View>('decks');
  const [decksDirectoryHandle, setDecksDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [imagesDirectoryHandle, setImagesDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cardSize, setCardSize] = useState(150);
  const [activeDeckName, setActiveDeckName] = useState('');

  const handleSelectAppFolder = async () => {
    try {
      const rootHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      const decksHandle = await rootHandle.getDirectoryHandle('decks', { create: true });
      const imagesHandle = await rootHandle.getDirectoryHandle('images', { create: true });
      
      setDecksDirectoryHandle(decksHandle);
      setImagesDirectoryHandle(imagesHandle);
      setActiveDeckName('');

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.info("User cancelled the folder selection dialog.");
      } else {
        console.error("Error selecting folder:", err);
      }
    }
  };
  
  const zoomIn = () => setCardSize(s => Math.min(s + 20, 300));
  const zoomOut = () => setCardSize(s => Math.max(s - 20, 80));

  // --- FIX ---
  // The useCallback hook memoizes the function, so it isn't recreated on every render.
  // This prevents the useEffect in Decks.tsx from re-running unnecessarily.
  const handleDeckLoaded = useCallback((deckName: string) => {
      setActiveDeckName(deckName.replace('.json', ''));
  }, []); // Empty dependency array ensures the function is created only once.

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
        
        <div className="app-title">
          <h2>The Aether Hub</h2>
          {view === 'decks' && activeDeckName && <h3>{activeDeckName}</h3>}
        </div>

        <div className="settings-controls">
          {view === 'decks' && (
            <>
              <button onClick={zoomOut} title="Decrease card size"><MinusIcon /></button>
              <button onClick={zoomIn} title="Increase card size"><PlusIcon /></button>
              <button onClick={() => setIsImportModalOpen(true)} disabled={!decksDirectoryHandle} title="Import a new deck from a list">
                Import Deck
              </button>
            </>
          )}
          <button onClick={handleSelectAppFolder} title="Select a local folder to store your decks and cached images.">
            {decksDirectoryHandle ? `Folder: decks` : 'Select App Folder'}
          </button>
        </div>
      </header>
      
      <main>
        {view === 'decks' && (
          <Decks 
            decksDirectoryHandle={decksDirectoryHandle}
            imagesDirectoryHandle={imagesDirectoryHandle}
            isImportModalOpen={isImportModalOpen}
            onCloseImportModal={() => setIsImportModalOpen(false)}
            cardSize={cardSize}
            onDeckLoaded={handleDeckLoaded}
          />
        )}
        {view === 'game' && <GameBoard imagesDirectoryHandle={imagesDirectoryHandle} />}
      </main>
    </div>
  );
}

export default App;
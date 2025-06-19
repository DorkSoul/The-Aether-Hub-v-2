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
  // --- NEW --- State to hold the card count of the active deck.
  const [activeDeckCardCount, setActiveDeckCardCount] = useState(0);

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
      // --- NEW --- Reset card count when folder is changed.
      setActiveDeckCardCount(0);

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

  // --- MODIFIED --- The handler now accepts a card count along with the deck name.
  const handleDeckLoaded = useCallback((deckName: string, cardCount: number) => {
      setActiveDeckName(deckName.replace('.json', ''));
      setActiveDeckCardCount(cardCount);
  }, []);

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
          {/* --- MODIFIED --- Display name and count. The count only shows if it's greater than 0. */}
          {view === 'decks' && activeDeckName && <h3>{activeDeckName} {activeDeckCardCount > 0 && `(${activeDeckCardCount} cards)`}</h3>}
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
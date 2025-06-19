// src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import GameBoard from './components/GameBoard.tsx';
import Decks from './components/Decks.tsx';
import { PlusIcon, MinusIcon } from './components/icons.tsx';
// --- NEW --- Import the new settings functions.
import { saveDirectoryHandle, getDirectoryHandle, saveCardSize, getCardSize } from './utils/settings';
import './App.css';

type View = 'decks' | 'game';

function App() {
  const [view, setView] = useState<View>('decks');
  const [decksDirectoryHandle, setDecksDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [imagesDirectoryHandle, setImagesDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // --- MODIFIED --- Initialize cardSize from saved settings.
  const [cardSize, setCardSize] = useState(() => getCardSize(150));
  const [activeDeckName, setActiveDeckName] = useState('');
  const [activeDeckCardCount, setActiveDeckCardCount] = useState(0);

  // --- NEW --- Effect to load saved settings on initial app load.
  useEffect(() => {
    const loadSavedHandles = async () => {
      const savedDecksHandle = await getDirectoryHandle('decks');
      if (savedDecksHandle) {
        setDecksDirectoryHandle(savedDecksHandle);
      }
      const savedImagesHandle = await getDirectoryHandle('images');
      if (savedImagesHandle) {
        setImagesDirectoryHandle(savedImagesHandle);
      }
    };
    loadSavedHandles();
  }, []);
  
  // --- NEW --- Effect to save card size whenever it changes.
  useEffect(() => {
    saveCardSize(cardSize);
  }, [cardSize]);

  const handleSelectAppFolder = async () => {
    try {
      const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      
      const decksHandle = await rootHandle.getDirectoryHandle('decks', { create: true });
      const imagesHandle = await rootHandle.getDirectoryHandle('images', { create: true });
      
      setDecksDirectoryHandle(decksHandle);
      setImagesDirectoryHandle(imagesHandle);
      
      // --- NEW --- Save the selected handles to IndexedDB for persistence.
      await saveDirectoryHandle('decks', decksHandle);
      await saveDirectoryHandle('images', imagesHandle);

      setActiveDeckName('');
      setActiveDeckCardCount(0);

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.info("User cancelled the folder selection dialog.");
      } else {
        console.error("Error selecting folder:", err);
      }
    }
  };
  
  // --- MODIFIED --- Increased max zoom size to 500.
  const zoomIn = () => setCardSize(s => Math.min(s + 20, 500));
  const zoomOut = () => setCardSize(s => Math.max(s - 20, 80));

  const handleDeckLoaded = useCallback((deckName: string, cardCount: number) => {
      setActiveDeckName(deckName.replace('.json', ''));
      setActiveDeckCardCount(cardCount);
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <nav className="main-nav">
          <button onClick={() => setView('game')} disabled={view === 'game'}>
            Game
          </button>
          <button onClick={() => setView('decks')} disabled={view === 'decks'}>
            Deckbuilder
          </button>
        </nav>
        
        <div className="app-title">
          <h2>The Aether Hub</h2>
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
            {/* --- MODIFIED --- The button text now reflects the saved folder name. */}
            {decksDirectoryHandle ? `Folder: ${decksDirectoryHandle.name}` : 'Select App Folder'}
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
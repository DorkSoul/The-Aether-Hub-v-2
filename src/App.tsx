// src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import Decks from './components/Decks/Decks';
import GameSetup from './components/GameSetup/GameSetup';
import GameBoard from './components/GameBoard/GameBoard';
import { PlusIcon, MinusIcon } from './components/Icons/icons';
import { saveDirectoryHandle, getDirectoryHandle, saveCardSize, getCardSize } from './utils/settings';
import type { GameSettings } from './types';
import './App.css';

type View = 'decks' | 'game-setup' | 'game';

function App() {
  const [view, setView] = useState<View>('decks');
  const [decksDirectoryHandle, setDecksDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [imagesDirectoryHandle, setImagesDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cardSize, setCardSize] = useState(() => getCardSize(150));
  const [activeDeckName, setActiveDeckName] = useState('');
  const [activeDeckCardCount, setActiveDeckCardCount] = useState(0);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    const loadSavedHandles = async () => {
      const savedDecksHandle = await getDirectoryHandle('decks');
      if (savedDecksHandle) setDecksDirectoryHandle(savedDecksHandle);
      const savedImagesHandle = await getDirectoryHandle('images');
      if (savedImagesHandle) setImagesDirectoryHandle(savedImagesHandle);
    };
    loadSavedHandles();
  }, []);
  
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
  
  const zoomIn = () => setCardSize(s => Math.min(s + 20, 500));
  const zoomOut = () => setCardSize(s => Math.max(s - 20, 80));

  const handleDeckLoaded = useCallback((deckName: string, cardCount: number) => {
    setActiveDeckName(deckName.replace('.json', ''));
    setActiveDeckCardCount(cardCount);
  }, []);

  const handleStartGame = (settings: GameSettings) => {
    setGameSettings(settings);
    setView('game');
  };
  
  const renderView = () => {
    switch (view) {
      case 'game-setup':
        return <GameSetup decksDirectoryHandle={decksDirectoryHandle} onStartGame={handleStartGame} />;
      case 'game':
        if (gameSettings) {
          return <GameBoard imagesDirectoryHandle={imagesDirectoryHandle} settings={gameSettings} />;
        }
        // Fallback if settings are missing
        setView('game-setup');
        return null;
      case 'decks':
      default:
        return (
          <Decks
            decksDirectoryHandle={decksDirectoryHandle}
            imagesDirectoryHandle={imagesDirectoryHandle}
            isImportModalOpen={isImportModalOpen}
            onCloseImportModal={() => setIsImportModalOpen(false)}
            cardSize={cardSize}
            onDeckLoaded={handleDeckLoaded}
          />
        );
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <nav className="main-nav">
          <button onClick={() => setView('decks')} disabled={view === 'decks'}>
            Deckbuilder
          </button>
          <button onClick={() => setView('game-setup')} disabled={view.startsWith('game')}>
            Game
          </button>
        </nav>
        
        <div className="app-title">
          <h2>The Aether Hub</h2>
          {view === 'decks' && activeDeckName && <h3>{activeDeckName} {activeDeckCardCount > 0 && `(${activeDeckCardCount} cards)`}</h3>}
          {view === 'game' && gameSettings && <h3>{gameSettings.players.length}-Player Game</h3>}
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
            {decksDirectoryHandle ? `Data: ${decksDirectoryHandle.name}` : 'Select App Folder'}
          </button>
        </div>
      </header>
      
      <main>
        {renderView()}
      </main>
    </div>
  );
}

export default App;
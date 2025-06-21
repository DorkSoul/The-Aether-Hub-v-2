// src/App.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Decks from './components/Decks/Decks';
import GameSetup from './components/GameSetup/GameSetup';
import GameBoard, { type GameBoardHandle } from './components/GameBoard/GameBoard';
import { PlusIcon, MinusIcon } from './components/Icons/icons'; // --- MODIFIED
import { saveDirectoryHandle, getDirectoryHandle, saveCardSize, getCardSize } from './utils/settings';
import { saveGameState } from './utils/gameUtils';
import type { GameSettings, GameState } from './types';
import Tabs from './components/Tabs/Tabs';
import './App.css';

type View = 'decks' | 'game-setup' | 'game';

function App() {
  const [view, setView] = useState<View>('game-setup');
  const [decksDirectoryHandle, setDecksDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [imagesDirectoryHandle, setImagesDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cardSize, setCardSize] = useState(() => getCardSize(150));
  const [activeDeckName, setActiveDeckName] = useState('');
  const [activeDeckCardCount, setActiveDeckCardCount] = useState(0);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [activeOpponentId, setActiveOpponentId] = useState<string | null>(null);
  const [loadedGameState, setLoadedGameState] = useState<GameState | null>(null);
  const gameBoardRef = useRef<GameBoardHandle>(null);

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
    setLoadedGameState(null); // Ensure no old state is carried over
    if (settings.layout === '1vAll' && settings.players.length > 1) {
      setActiveOpponentId(settings.players[1].id);
    }
    setView('game');
  };

  const handleLoadGame = (gameState: GameState) => {
      setLoadedGameState(gameState);
      setGameSettings(gameState.gameSettings);
      setActiveOpponentId(gameState.activeOpponentId);
      setView('game');
  };
  
  const handleSaveGame = async () => {
      if (gameBoardRef.current) {
          const currentState = gameBoardRef.current.getGameState();
          if (currentState) {
              try {
                  await saveGameState(currentState);
                  alert('Game saved successfully!');
              } catch (err) {
                  console.error("Failed to save game:", err);
                  alert(`Could not save game. Error: ${err instanceof Error ? err.message : 'Unknown'}`);
              }
          }
      }
  };
  
  const handleQuitGame = () => {
    setGameSettings(null);
    setLoadedGameState(null);
    setActiveOpponentId(null);
    setView('game-setup');
  };

  const renderView = () => {
    switch (view) {
      case 'game-setup':
        return <GameSetup decksDirectoryHandle={decksDirectoryHandle} onStartGame={handleStartGame} onLoadGame={handleLoadGame} />;
      case 'game':
        if (gameSettings) {
          return (
            <GameBoard 
              ref={gameBoardRef}
              key={loadedGameState ? 'loaded-game' : 'new-game'} // Force re-mount on new/load
              imagesDirectoryHandle={imagesDirectoryHandle} 
              settings={gameSettings}
              initialState={loadedGameState}
              activeOpponentId={activeOpponentId}
              onOpponentChange={setActiveOpponentId} 
            />
          );
        }
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
  
  const opponents = view === 'game' && gameSettings && gameSettings.layout === '1vAll'
    ? gameSettings.players.slice(1)
    : [];
  const activeOpponent = opponents.find(p => p.id === activeOpponentId);

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <nav className="main-nav">
            <button onClick={() => setView('decks')} disabled={view === 'decks'}>
              Deckbuilder
            </button>
            <button onClick={() => {
              if (gameSettings) {
                setView('game');
              } else {
                setView('game-setup');
              }
            }} 
            disabled={view.startsWith('game')}>
              Game
            </button>
            {view === 'game' && (
              <>
                <button onClick={handleSaveGame} title="Save Game">Save Game</button>
                <button onClick={handleQuitGame}>Quit Game</button>
              </>
            )}
          </nav>
          
          {view === 'game' && gameSettings?.layout === '1vAll' && opponents.length > 0 && (
            <div className="opponent-tabs-wrapper">
              <div className="opponent-tabs-container">
                <Tabs
                  items={opponents.map(p => p.name)}
                  activeItem={activeOpponent?.name || ''}
                  onItemClick={(name) => {
                    const opponent = opponents.find(p => p.name === name);
                    if (opponent) setActiveOpponentId(opponent.id);
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="app-title">
          <h2>The Aether Hub</h2>
          {view === 'decks' && activeDeckName && <h3>{activeDeckName} {activeDeckCardCount > 0 && `(${activeDeckCardCount} cards)`}</h3>}
          {view === 'game' && gameSettings && <h3 className="game-player-count">{gameSettings.players.length}-Player Game</h3>}
        </div>

        <div className="header-right">
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
        </div>
      </header>
      
      <main>
        {renderView()}
      </main>
    </div>
  );
}

export default App;
// src/App.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Decks from './components/Decks/Decks';
import GameSetup from './components/GameSetup/GameSetup';
import GameBoard, { type GameBoardHandle } from './components/GameBoard/GameBoard';
import { PlusIcon, MinusIcon, SaveIcon, EyeIcon, MinimizeIcon, PopOutIcon } from './components/Icons/icons';
import { saveDirectoryHandle, getDirectoryHandle, saveCardSize, getCardSize } from './utils/settings';
import { saveGameState, loadGameState } from './utils/gameUtils';
import type { GameSettings, GameState, Card as CardType } from './types';
import Tabs from './components/Tabs/Tabs';
import Card from './components/Card/Card'; // Import Card for the preview
import './App.css';

type View = 'decks' | 'game-setup' | 'game';

// --- NEW --- Stack Panel Component
interface StackPanelProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onPopOut: () => void;
  isResizable: boolean;
  width: number;
  onResizeMouseDown: (event: React.MouseEvent) => void;
}

const StackPanel: React.FC<StackPanelProps> = ({ isMinimized, onToggleMinimize, onPopOut, isResizable, width, onResizeMouseDown }) => {
  if (isMinimized) {
    return (
      <div className="stack-panel-container minimized">
        <button onClick={onToggleMinimize} title="Show Stack">
          <EyeIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="stack-panel-container" style={{ width: `${width}px` }}>
        {isResizable && <div className="stack-resizer" onMouseDown={onResizeMouseDown}></div>}
      <div className="stack-panel-header">
        <h3>Stack</h3>
        <div className="panel-buttons">
            <button onClick={onPopOut} title="Pop-out Stack">
                <PopOutIcon />
            </button>
            <button onClick={onToggleMinimize} title="Minimize Stack">
                <MinimizeIcon />
            </button>
        </div>
      </div>
      <div className="stack-panel-content">
        <div className="stack-placeholder">
          <p>The stack is currently empty.</p>
        </div>
      </div>
    </div>
  );
};


// --- NEW --- Card Preview Component defined inside App.tsx
interface CardPreviewProps {
  card: CardType | null;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onPopOut: () => void;
  isResizable: boolean;
  width: number;
  onResizeMouseDown: (event: React.MouseEvent) => void;
}

const CardPreview: React.FC<CardPreviewProps> = ({ card, imageDirectoryHandle, isMinimized, onToggleMinimize, onPopOut, isResizable, width, onResizeMouseDown }) => {
  if (isMinimized) {
    return (
      <div className="card-preview-container minimized">
        <button onClick={onToggleMinimize} title="Show Card Preview">
          <EyeIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="card-preview-container" style={{ width: `${width}px` }}>
        {isResizable && <div className="preview-resizer" onMouseDown={onResizeMouseDown}></div>}
      <div className="card-preview-header">
        <h3>Card Preview</h3>
        <div className="panel-buttons">
            <button onClick={onPopOut} title="Pop-out Preview">
                <PopOutIcon />
            </button>
            <button onClick={onToggleMinimize} title="Minimize Preview">
                <MinimizeIcon />
            </button>
        </div>
      </div>
      <div className="card-preview-content">
        {card ? (
          <Card
            card={card}
            imageDirectoryHandle={imageDirectoryHandle}
          />
        ) : (
          <div className="card-preview-placeholder">
            <p>Hover over a card to see details</p>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [popout, setPopout] = useState<Window | null>(null);
  const [popoutContainer, setPopoutContainer] = useState<HTMLElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(300);
  const isResizing = useRef(false);
  const gameBoardRef = useRef<GameBoardHandle>(null);

  // --- NEW --- State for the Stack panel
  const [isStackMinimized, setIsStackMinimized] = useState(false);
  const [stackPopout, setStackPopout] = useState<Window | null>(null);
  const [stackPopoutContainer, setStackPopoutContainer] = useState<HTMLElement | null>(null);
  const [stackWidth, setStackWidth] = useState(300);
  const isResizingStack = useRef(false);


  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    // Add constraints to prevent the pane from becoming too small or too large
    if (newWidth > 200 && newWidth < 800) {
        setPreviewWidth(newWidth);
    }
  }, []);

  const handleResizeMouseUp = useCallback(() => {
    isResizing.current = false;
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
  }, [handleResizeMouseMove]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  }, [handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    // Cleanup listeners if the component unmounts
    return () => {
        window.removeEventListener('mousemove', handleResizeMouseMove);
        window.removeEventListener('mouseup', handleResizeMouseUp);
    }
  }, [handleResizeMouseMove, handleResizeMouseUp]);

  // --- MODIFIED --- Resize logic for Stack Panel is now for a right-aligned panel
  const handleStackResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingStack.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 200 && newWidth < 800) {
        setStackWidth(newWidth);
    }
  }, []);

  const handleStackResizeMouseUp = useCallback(() => {
    isResizingStack.current = false;
    window.removeEventListener('mousemove', handleStackResizeMouseMove);
    window.removeEventListener('mouseup', handleStackResizeMouseUp);
  }, [handleStackResizeMouseMove]);

  const handleStackResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingStack.current = true;
    window.addEventListener('mousemove', handleStackResizeMouseMove);
    window.addEventListener('mouseup', handleStackResizeMouseUp);
  }, [handleStackResizeMouseMove, handleStackResizeMouseUp]);

  useEffect(() => {
    // Cleanup listeners if the component unmounts
    return () => {
        window.removeEventListener('mousemove', handleStackResizeMouseMove);
        window.removeEventListener('mouseup', handleStackResizeMouseUp);
    }
  }, [handleStackResizeMouseMove, handleStackResizeMouseUp]);


  const handlePopOut = useCallback(() => {
    const newWindow = window.open('', 'CardPreview', 'width=350,height=490,resizable');
    if (newWindow) {
        newWindow.document.title = "Card Preview";
        const container = newWindow.document.createElement('div');
        newWindow.document.body.appendChild(container);
        newWindow.document.body.style.margin = '0';
        newWindow.document.body.style.backgroundColor = '#282c34';
        container.style.width = '100vw';
        container.style.height = '100vh';

        // Copy styles from main window to pop-out
        Array.from(document.styleSheets).forEach(styleSheet => {
            try {
                const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
                const style = newWindow.document.createElement('style');
                style.appendChild(newWindow.document.createTextNode(cssRules));
                newWindow.document.head.appendChild(style);
            } catch (e) {
                if (styleSheet.href) {
                  const link = newWindow.document.createElement('link');
                  link.rel = 'stylesheet';
                  link.href = styleSheet.href;
                  newWindow.document.head.appendChild(link);
                }
            }
        });
        
        setPopout(newWindow);
        setPopoutContainer(container);
    }
  }, []);

  // --- NEW --- Popout logic for Stack Panel
  const handleStackPopOut = useCallback(() => {
    const newWindow = window.open('', 'Stack', 'width=350,height=490,resizable');
    if (newWindow) {
        newWindow.document.title = "Stack";
        const container = newWindow.document.createElement('div');
        newWindow.document.body.appendChild(container);
        newWindow.document.body.style.margin = '0';
        newWindow.document.body.style.backgroundColor = '#282c34';
        container.style.width = '100vw';
        container.style.height = '100vh';

        // Copy styles
        Array.from(document.styleSheets).forEach(styleSheet => {
            try {
                const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
                const style = newWindow.document.createElement('style');
                style.appendChild(newWindow.document.createTextNode(cssRules));
                newWindow.document.head.appendChild(style);
            } catch (e) {
                if (styleSheet.href) {
                  const link = newWindow.document.createElement('link');
                  link.rel = 'stylesheet';
                  link.href = styleSheet.href;
                  newWindow.document.head.appendChild(link);
                }
            }
        });
        
        setStackPopout(newWindow);
        setStackPopoutContainer(container);
    }
  }, []);

  useEffect(() => {
    if (!popout) return;

    const intervalId = setInterval(() => {
        if (popout.closed) {
            setPopout(null);
            setPopoutContainer(null);
        }
    }, 500);

    const handleBeforeUnload = () => popout.close();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (!popout.closed) popout.close();
    };
  }, [popout]);

  // --- NEW --- useEffect for stack popout
  useEffect(() => {
    if (!stackPopout) return;

    const intervalId = setInterval(() => {
        if (stackPopout.closed) {
            setStackPopout(null);
            setStackPopoutContainer(null);
        }
    }, 500);

    const handleBeforeUnload = () => stackPopout.close();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (!stackPopout.closed) stackPopout.close();
    };
  }, [stackPopout]);

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

  const handleCardHover = (card: CardType | null) => {
    setPreviewCard(card);
  };

  const handleDeckLoaded = useCallback((deckName: string, cardCount: number) => {
    setActiveDeckName(deckName.replace('.json', ''));
    setActiveDeckCardCount(cardCount);
  }, []);

  const handleStartGame = (settings: GameSettings) => {
    setGameSettings(settings);
    setLoadedGameState(null);
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

  const cardPreviewContent = previewCard ? (
    <Card
        card={previewCard}
        imageDirectoryHandle={imagesDirectoryHandle}
    />
  ) : (
    <div className="card-preview-placeholder">
      <p>Hover over a card to see details</p>
    </div>
  );

  const framedCardPreview = (
      <CardPreview
          card={previewCard}
          imageDirectoryHandle={imagesDirectoryHandle}
          isMinimized={isPreviewMinimized}
          onToggleMinimize={() => setIsPreviewMinimized(p => !p)}
          onPopOut={handlePopOut}
          isResizable={true}
          width={previewWidth}
          onResizeMouseDown={handleResizeMouseDown}
      />
  );

  // --- NEW --- JSX for Stack Panel
  const stackPanelContent = (
    <div className="stack-placeholder">
      <p>The stack is currently empty.</p>
    </div>
  );

  const framedStackPanel = (
      <StackPanel
          isMinimized={isStackMinimized}
          onToggleMinimize={() => setIsStackMinimized(p => !p)}
          onPopOut={handleStackPopOut}
          isResizable={true}
          width={stackWidth}
          onResizeMouseDown={handleStackResizeMouseDown}
      />
  );

  const renderView = () => {
    switch (view) {
      case 'game-setup':
        return <GameSetup decksDirectoryHandle={decksDirectoryHandle} onStartGame={handleStartGame} onLoadGame={handleLoadGame} />;
      case 'game':
        if (gameSettings) {
          return (
            <GameBoard 
              ref={gameBoardRef}
              key={loadedGameState ? 'loaded-game' : 'new-game'}
              imagesDirectoryHandle={imagesDirectoryHandle} 
              settings={gameSettings}
              initialState={loadedGameState}
              activeOpponentId={activeOpponentId}
              onOpponentChange={setActiveOpponentId}
              onCardHover={handleCardHover}
              cardPreview={popout ? null : framedCardPreview}
              stackPanel={stackPopout ? null : framedStackPanel}
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
            onCardHover={handleCardHover}
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
                <button onClick={handleSaveGame} title="Save Game"> Save Game</button>
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
        <div className="main-content-area">
          {renderView()}
        </div>
      </main>

      {popoutContainer && createPortal(
        <div className='card-preview-content' style={{width: '100%', height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
            {cardPreviewContent}
        </div>,
        popoutContainer
      )}
      {/* --- NEW --- Portal for Stack popout */}
      {stackPopoutContainer && createPortal(
        <div className='stack-panel-content' style={{width: '100%', height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
            {stackPanelContent}
        </div>,
        stackPopoutContainer
      )}
    </div>
  );
}

export default App;
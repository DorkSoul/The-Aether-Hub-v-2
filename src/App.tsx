// src/App.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Decks from './components/Decks/Decks';
import GameSetup from './components/GameSetup/GameSetup';
import GameBoard, { type GameBoardHandle } from './components/GameBoard/GameBoard';
import { PlusIcon, MinusIcon, SaveIcon, EyeIcon, MinimizeIcon, PopOutIcon, EnterFullscreenIcon, ExitFullscreenIcon, RotateIcon, QuitIcon } from './components/Icons/icons';
import { saveDirectoryHandle, getDirectoryHandle, saveCardSize, getCardSize, savePreviewWidth, getPreviewWidth } from './utils/settings';
import { saveGameState } from './utils/gameUtils';
import type { GameSettings, GameState, Card as CardType, StackItem } from './types';
import Tabs from './components/Tabs/Tabs';
import Card from './components/Card/Card';
import { TextWithMana } from './components/TextWithMana/TextWithMana';
import './App.css';

type View = 'decks' | 'game-setup' | 'game';

interface StackPanelProps {
  stack: StackItem[];
  onItemClick: (id: string) => void;
  onItemEnter: (cardInstanceId: string) => void;
  onItemLeave: () => void;
  onHide: () => void;
  onPopOut: () => void;
  isResizable: boolean;
  width: number;
  onResizeMouseDown: (event: React.MouseEvent) => void;
}

const StackPanel: React.FC<StackPanelProps> = ({ stack, onItemClick, onItemEnter, onItemLeave, onHide, onPopOut, isResizable, width, onResizeMouseDown }) => {
  return (
    <div className="stack-panel-container" style={{ width: `${width}px` }}>
        {isResizable && <div className="stack-resizer" onMouseDown={onResizeMouseDown}></div>}
      <div className="stack-panel-header">
        <h3>Stack ({stack.length})</h3>
        <div className="panel-buttons">
            <button onClick={onPopOut} title="Pop-out Stack">
                <PopOutIcon />
            </button>
            <button onClick={onHide} title="Hide Stack">
                <MinimizeIcon />
            </button>
        </div>
      </div>
      <div className="stack-panel-content">
        {stack.length > 0 ? (
          <ul className="stack-list">
            {stack.map((item) => (
              <li
                key={item.id}
                onClick={() => onItemClick(item.id)}
                onMouseEnter={() => onItemEnter(item.cardInstanceId)}
                onMouseLeave={onItemLeave}
                className="stack-item"
              >
                <span className="stack-item-source">{item.sourceCardName}</span>
                <p className="stack-item-text">
                  <TextWithMana text={item.text} />
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="stack-placeholder">
            <p>The stack is currently empty.</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface CardPreviewProps {
  card: CardType | null;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  onHide: () => void;
  onPopOut: () => void;
  isResizable: boolean;
  width: number;
  onResizeMouseDown: (event: React.MouseEvent) => void;
  forwardedRef: React.Ref<HTMLDivElement>;
}

const CardPreview: React.FC<CardPreviewProps> = ({ card, imageDirectoryHandle, onHide, onPopOut, isResizable, width, onResizeMouseDown, forwardedRef }) => {
  return (
    <div className="card-preview-container" style={{ width: `${width}px` }} ref={forwardedRef}>
        {isResizable && <div className="preview-resizer" onMouseDown={onResizeMouseDown}></div>}
      <div className="card-preview-header">
        <h3>Card Preview</h3>
        <div className="panel-buttons">
            <button onClick={onPopOut} title="Pop-out Preview">
                <PopOutIcon />
            </button>
            <button onClick={onHide} title="Hide Preview">
                <MinimizeIcon />
            </button>
        </div>
      </div>
      <div className="card-preview-content">
        {card ? (
          <Card
            card={card}
            imageDirectoryHandle={imageDirectoryHandle}
            isFlipped={card.isFlipped}
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
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [popout, setPopout] = useState<Window | null>(null);
  const [popoutContainer, setPopoutContainer] = useState<HTMLElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(() => getPreviewWidth(300));
  const isResizing = useRef(false);
  const gameBoardRef = useRef<GameBoardHandle>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const [stack, setStack] = useState<StackItem[]>([]);
  const [hoveredStackCardId, setHoveredStackCardId] = useState<string | null>(null);
  const [isStackVisible, setIsStackVisible] = useState(true);
  const [stackPopout, setStackPopout] = useState<Window | null>(null);
  const [stackPopoutContainer, setStackPopoutContainer] = useState<HTMLElement | null>(null);
  const [stackWidth, setStackWidth] = useState(300);
  const isResizingStack = useRef(false);
  const [isTopRotated, setIsTopRotated] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [showFullscreenNotification, setShowFullscreenNotification] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
      setShowFullscreenNotification(true);
      setTimeout(() => {
        setShowFullscreenNotification(false);
      }, 4000); // Hide after 4 seconds
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    savePreviewWidth(previewWidth);
  }, [previewWidth]);

  useEffect(() => {
    if (view === 'game') {
        const timer = setTimeout(() => {
            if (previewContainerRef.current && isPreviewVisible) {
                const contentElement = previewContainerRef.current.querySelector('.card-preview-content') as HTMLElement;
                if (contentElement) {
                    const contentHeight = contentElement.clientHeight;
                    const cardAspectRatio = 63 / 88;
                    const maxPaneWidth = contentHeight * cardAspectRatio;
                    
                    setPreviewWidth(currentWidth => {
                        if (currentWidth > maxPaneWidth) {
                            return maxPaneWidth;
                        }
                        return currentWidth;
                    });
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }
  }, [view, isPreviewVisible]);


  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    let newWidth = window.innerWidth - e.clientX;

    if (previewContainerRef.current && isPreviewVisible) {
        const contentElement = previewContainerRef.current.querySelector('.card-preview-content') as HTMLElement;
        if (contentElement) {
            const contentHeight = contentElement.clientHeight;
            const cardAspectRatio = 63 / 88;
            
            const maxCardWidth = contentHeight * cardAspectRatio;
            const maxPaneWidth = maxCardWidth ;

            if (newWidth > maxPaneWidth) {
                newWidth = maxPaneWidth;
            }
        }
    }
    
    if (newWidth < 100) {
        newWidth = 100;
    }

    setPreviewWidth(newWidth);
  }, [isPreviewVisible]);

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
    return () => {
        window.removeEventListener('mousemove', handleResizeMouseMove);
        window.removeEventListener('mouseup', handleResizeMouseUp);
    }
  }, [handleResizeMouseMove, handleResizeMouseUp]);

  const handleStackResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingStack.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 100 && newWidth < 800) {
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
    if (settings.layout === 'tabs' && settings.players.length > 1) {
      setActiveOpponentId(settings.players[1].id);
    }
    setView('game');
  };

  const handleLoadGame = (gameState: GameState) => {
      if (!gameState.gameSettings.playAreaLayout) {
        gameState.gameSettings.playAreaLayout = 'rows';
      }
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

  const handleResetLayouts = () => {
    if (gameBoardRef.current) {
      gameBoardRef.current.resetLayouts();
    }
  };
  
  const handleQuitGame = () => {
    setGameSettings(null);
    setLoadedGameState(null);
    setActiveOpponentId(null);
    setStack([]);
    setView('game-setup');
  };

  const handleAddToStack = (abilityText: string, card: CardType) => {
    if (!card.instanceId) return;
    const newItem: StackItem = {
      id: crypto.randomUUID(),
      text: abilityText,
      cardInstanceId: card.instanceId,
      sourceCardName: card.name.split('//')[0].trim(),
    };
    setStack(prevStack => [...prevStack, newItem]);
  };

  const handleRemoveFromStack = (stackItemId: string) => {
    setStack(prevStack => prevStack.filter(item => item.id !== stackItemId));
  };

  const handleStackItemEnter = (cardInstanceId: string) => {
    setHoveredStackCardId(cardInstanceId);
  };

  const handleStackItemLeave = () => {
    setHoveredStackCardId(null);
  };

  const cardPreviewContent = previewCard ? (
    <Card
        card={previewCard}
        imageDirectoryHandle={imagesDirectoryHandle}
        isFlipped={previewCard.isFlipped}
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
          onHide={() => setIsPreviewVisible(false)}
          onPopOut={handlePopOut}
          isResizable={!popout}
          width={previewWidth}
          onResizeMouseDown={handleResizeMouseDown}
          forwardedRef={previewContainerRef}
      />
  );

  const stackPanelContent = (
    <div className="stack-panel-content">
        {stack.length > 0 ? (
          <ul className="stack-list">
            {stack.map((item) => (
              <li
                key={item.id}
                onClick={() => handleRemoveFromStack(item.id)}
                onMouseEnter={() => handleStackItemEnter(item.cardInstanceId)}
                onMouseLeave={handleStackItemLeave}
                className="stack-item"
              >
                <span className="stack-item-source">{item.sourceCardName}</span>
                <p className="stack-item-text">
                  <TextWithMana text={item.text} />
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="stack-placeholder">
            <p>The stack is currently empty.</p>
          </div>
        )}
      </div>
  );

  const framedStackPanel = (
      <StackPanel
          stack={stack}
          onItemClick={handleRemoveFromStack}
          onItemEnter={handleStackItemEnter}
          onItemLeave={handleStackItemLeave}
          onHide={() => setIsStackVisible(false)}
          onPopOut={handleStackPopOut}
          isResizable={!stackPopout}
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
              previewCard={previewCard}
              cardPreview={isPreviewVisible && !popout ? framedCardPreview : null}
              stackPanel={isStackVisible && !stackPopout ? framedStackPanel : null}
              cardSize={cardSize}
              onAddToStack={handleAddToStack}
              hoveredStackCardId={hoveredStackCardId}
              isTopRotated={isTopRotated}
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
  
  const opponents = view === 'game' && gameSettings && gameSettings.layout === 'tabs'
    ? gameSettings.players.slice(1)
    : [];
  const activeOpponent = opponents.find(p => p.id === activeOpponentId);

  return (
    <div className="App">
       <div className={`fullscreen-notification ${showFullscreenNotification ? 'visible' : ''}`}>
        <p>Press ESC to exit fullscreen</p>
      </div>

      <header className="app-header">
        <div className="header-left">
          <nav className="main-nav">
            <button onClick={() => setView('decks')} disabled={view === 'decks'}>
              Decks
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
                <button onClick={handleSaveGame} title="Save Game"><SaveIcon /></button>
                <button onClick={handleQuitGame} title="Quit Game"><QuitIcon /></button>
                <button
                  onClick={() => setGameSettings(s => s ? ({...s, layout: s.layout === 'tabs' ? 'split' : 'tabs'}) : s)}
                  title="Toggle Game Layout"
                >
                  Layout
                </button>
                <button
                  onClick={() => setGameSettings(s => s ? ({...s, playAreaLayout: s.playAreaLayout === 'rows' ? 'freeform' : 'rows'}) : s)}
                  title="Toggle Play Area Layout"
                >
                  Area
                </button>
              </>
            )}
          </nav>
          
          {view === 'game' && gameSettings?.layout === 'tabs' && opponents.length > 0 && (
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
          {view !== 'game' && <h2>The Aether Hub</h2>}
          {view === 'decks' && activeDeckName && <h3>{activeDeckName} {activeDeckCardCount > 0 && `(${activeDeckCardCount} cards)`}</h3>}
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
            {view === 'game' && (
              <>
                <button onClick={handleResetLayouts} title="Reset player area sizes">Reset</button>
                <button onClick={() => setIsStackVisible(v => !v)} title="Toggle Stack Panel">Stack</button>
                <button onClick={() => setIsTopRotated(r => !r)} title="Rotate Opponent's Cards">
                  <RotateIcon />
                </button>
                <button onClick={() => setIsPreviewVisible(v => !v)} title="Toggle Preview Panel">Preview</button>
              </>
            )}
            <button onClick={handleToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
              {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
            </button>
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
      {stackPopoutContainer && createPortal(
            stackPanelContent,
            stackPopoutContainer
      )}
    </div>
  );
}

export default App;
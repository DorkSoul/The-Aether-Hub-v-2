// src/App.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Decks from './components/Decks/Decks';
import GameSetup from './components/GameSetup/GameSetup';
import GameBoard, { type GameBoardHandle } from './components/GameBoard/GameBoard';
import { PlusIcon, MinusIcon, SaveIcon, EyeIcon, MinimizeIcon, PopOutIcon, EnterFullscreenIcon, ExitFullscreenIcon, RotateIcon, QuitIcon } from './components/Icons/icons';
import { saveDirectoryHandle, getDirectoryHandle, saveCardSize, getPreviewWidth, saveTopRotated, getTopRotated, savePreviewWidth } from './utils/settings';
import { saveGameState, loadGameState } from './utils/gameUtils';
import { getCardsFromDB } from './utils/db';
import { getAndCacheCardImageUrl } from './utils/imageCaching';
import type { GameSettings, GameState, Card as CardType, StackItem, PlayerConfig, PlayerState, PeerInfo, DeckPayload } from './types';
import Tabs from './components/Tabs/Tabs';
import Card from './components/Card/Card';
import ContextMenu from './components/ContextMenu/ContextMenu';
import { TextWithMana } from './components/TextWithMana/TextWithMana';
import { useP2P } from './hooks/useP2P';
import './App.css';

type View = 'decks' | 'game-setup' | 'game' | 'loading';

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

const shuffleDeck = (deck: CardType[]): CardType[] => {
  return [...deck].sort(() => Math.random() - 0.5);
};

function App() {
  const [view, setView] = useState<View>('loading');
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [decksDirectoryHandle, setDecksDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [imagesDirectoryHandle, setImagesDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [savesDirectoryHandle, setSavesDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cardSize, setCardSize] = useState(() => 150);
  const [activeDeckName, setActiveDeckName] = useState('');
  const [activeDeckCardCount, setActiveDeckCardCount] = useState(0);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { id: '1', name: 'Player 1', deckFile: null, color: '#ff0000', username: '' },
    { id: '2', name: 'Player 2', deckFile: null, color: '#0000ff', username: '' },
  ]);
  const [playerStates, setPlayerStates] = useState<PlayerState[] | null>(null);
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
  const [isTopRotated, setIsTopRotated] = useState(() => getTopRotated(false));
  
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [showFullscreenNotification, setShowFullscreenNotification] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [turnNotification, setTurnNotification] = useState('');
  const [appNotification, setAppNotification] = useState<string | null>(null);
  const [orderMenu, setOrderMenu] = useState<{ x: number, y: number, players: PlayerConfig[] } | null>(null);
  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<PeerInfo[]>([]);
  const [hostingUsername, setHostingUsername] = useState<string | null>(null);
  const [clientUsername, setClientUsername] = useState<string>('');
  const [friendsDecks, setFriendsDecks] = useState<DeckPayload[]>([]);

  const handleOrderDragStart = (index: number) => {
    draggedItemIndex.current = index;
  };

  const handleOrderDragEnter = (index: number) => {
      dragOverItemIndex.current = index;
  };
  
  const handleOrderDrop = () => {
    if (orderMenu && draggedItemIndex.current !== null && dragOverItemIndex.current !== null) {
      const newPlayerOrder = [...orderMenu.players];
      const draggedItem = newPlayerOrder.splice(draggedItemIndex.current, 1)[0];
      newPlayerOrder.splice(dragOverItemIndex.current, 0, draggedItem);
      
      setOrderMenu(prev => prev ? { ...prev, players: newPlayerOrder } : null);

      if(gameSettings){
        setGameSettings(prevSettings => prevSettings ? {...prevSettings, players: newPlayerOrder} : null);
      }
    }
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

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

  const loadFriendsDecks = async (decksHandle: FileSystemDirectoryHandle) => {
    const friendsDecks: DeckPayload[] = [];
    try {
        const friendsDecksHandle = await decksHandle.getDirectoryHandle('friends_decks', { create: true });
        for await (const userHandle of friendsDecksHandle.values()) {
            if (userHandle.kind === 'directory') {
                for await (const deckFile of userHandle.values()) {
                    if (deckFile.kind === 'file' && deckFile.name.endsWith('.json')) {
                        const file = await deckFile.getFile();
                        const text = await file.text();
                        const deckData: DeckPayload = JSON.parse(text);
                        friendsDecks.push({ ...deckData, username: userHandle.name });
                    }
                }
            }
        }
    } catch (e) {
        console.error("Could not load friends' decks", e);
    }
    return friendsDecks;
  };

  useEffect(() => {
    const loadSavedHandles = async () => {
      try {
        const savedRootHandle = await getDirectoryHandle('root');
        if (savedRootHandle) {
          setRootDirectoryHandle(savedRootHandle);
          const decksHandle = await savedRootHandle.getDirectoryHandle('decks', { create: true });
          const imagesHandle = await savedRootHandle.getDirectoryHandle('images', { create: true });
          const savesHandle = await savedRootHandle.getDirectoryHandle('saves', { create: true });
          setDecksDirectoryHandle(decksHandle);
          setImagesDirectoryHandle(imagesHandle);
          setSavesDirectoryHandle(savesHandle);
          const loadedFriendsDecks = await loadFriendsDecks(decksHandle);
          setFriendsDecks(loadedFriendsDecks);
          setView('game-setup');
        } else {
          // If no handle is found, stay on the loading/prompting view
          setView('loading'); 
        }
      } catch (err) {
        console.error("Error loading saved handles:", err);
        setView('loading'); // Stay on loading/prompt screen on error
      }
    };
    loadSavedHandles();
  }, []);
  
  useEffect(() => {
    saveCardSize(cardSize);
  }, [cardSize]);

  useEffect(() => {
    saveTopRotated(isTopRotated);
  }, [isTopRotated]);

  const handleSelectAppFolder = async () => {
    try {
      const rootHandle = await window.showDirectoryPicker({ id: "data", mode: 'readwrite' });
      setRootDirectoryHandle(rootHandle);
      const decksHandle = await rootHandle.getDirectoryHandle('decks', { create: true });
      const imagesHandle = await rootHandle.getDirectoryHandle('images', { create: true });
      const savesHandle = await rootHandle.getDirectoryHandle('saves', { create: true });
      setDecksDirectoryHandle(decksHandle);
      setImagesDirectoryHandle(imagesHandle);
      setSavesDirectoryHandle(savesHandle);
      await saveDirectoryHandle('root', rootHandle);
      const loadedFriendsDecks = await loadFriendsDecks(decksHandle);
      setFriendsDecks(loadedFriendsDecks);
      setActiveDeckName('');
      setActiveDeckCardCount(0);
      setView('game-setup'); // Move to the setup view after successful selection
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

  const handleGameStateReceived = useCallback((gameState: GameState) => {
    // Logic to handle incoming game state from the host
    console.log('Received game state:', gameState);
    setLoadedGameState(gameState);
    setGameSettings(gameState.gameSettings);
    setPlayerStates(gameState.playerStates);
    setActiveOpponentId(gameState.activeOpponentId);
    if (gameState.isTopRotated !== undefined) {
      setIsTopRotated(gameState.isTopRotated);
    }
    setView('game');
    setIsConnected(true);
  }, []);
  
  const handlePlayerConnected = useCallback((peerInfo: PeerInfo) => {
    setConnectedPlayers(prev => [...prev, peerInfo]);
    setPlayers(prev => [...prev, { id: peerInfo.id, name: peerInfo.username, deckFile: null, color: '#cccccc', username: peerInfo.username }]);
  }, []);
  
  const handlePlayerDisconnected = useCallback((peerId: string) => {
    setConnectedPlayers(prev => prev.filter(p => p.id !== peerId));
    setPlayers(prev => prev.filter(p => p.id !== peerId));
  }, []);
  
  const handleKicked = useCallback(() => {
    setAppNotification("You have been kicked by the host or the host has disconnected.");
    setIsConnected(false);
    setConnectedPlayers([]);
    setView('game-setup');
  }, []);

  const handleClientConnected = useCallback(() => {
    setIsConnected(true);
  }, []);

  const downloadDeckImages = useCallback(async (deck: DeckPayload) => {
    if (!imagesDirectoryHandle) return;

    for (const card of deck.cards) {
        try {
            await getAndCacheCardImageUrl(card, imagesDirectoryHandle, 0);
            if (card.card_faces && card.card_faces.length > 1) {
                await getAndCacheCardImageUrl(card, imagesDirectoryHandle, 1);
            }
        } catch (error) {
            console.error(`Failed to download image for ${card.name}`, error);
        }
    }
  }, [imagesDirectoryHandle]);

  const addFriendDeck = useCallback((peerId: string, deck: DeckPayload, username: string) => {
    const newDeck = { ...deck, username };
    setFriendsDecks(prev => {
        const existingDeckIndex = prev.findIndex(d => (d as any).peerId === peerId && d.name === deck.name);
        if (existingDeckIndex > -1) {
            const newDecks = [...prev];
            newDecks[existingDeckIndex] = newDeck;
            return newDecks;
        }
        return [...prev, newDeck];
    });
    downloadDeckImages(deck);
  },[downloadDeckImages]);

  const handleDeckSelectedByClient = useCallback((peerId: string, deck: DeckPayload, username: string) => {
    setPlayers(prev => prev.map(p => p.id === peerId ? { ...p, deckName: deck.name } : p));
    addFriendDeck(peerId, deck, username);
  }, [addFriendDeck]);
  
  const { peerId, isHost, hostUsername, startHosting, startConnecting, broadcastGameState, kickPlayer, disconnect, sendDeckSelection } = useP2P(handleGameStateReceived, handlePlayerConnected, handlePlayerDisconnected, handleKicked, handleClientConnected, handleDeckSelectedByClient, decksDirectoryHandle);

  useEffect(() => {
    if (isHost && peerId && hostingUsername) {
        setPlayers([{ id: peerId, name: hostingUsername, deckFile: null, color: '#ff0000', username: hostingUsername }]);
        setHostingUsername(null);
    }
  }, [isHost, peerId, hostingUsername]);

  useEffect(() => {
    if (isConnected && !isHost && peerId && clientUsername) {
        setPlayers([{ id: peerId, name: clientUsername, deckFile: null, color: '#00ff00', username: clientUsername }]);
    }
  }, [isConnected, isHost, peerId, clientUsername]);
  
  const handleOnHost = (username: string) => {
    startHosting(username);
    setHostingUsername(username);
  };

  const handleOnJoin = (hostId: string, username: string) => {
    setClientUsername(username);
    startConnecting(username, hostId);
  }

  const handleDisconnect = () => {
    disconnect();
    setIsConnected(false);
  };

  const handleStopHosting = () => {
    disconnect();
    setIsConnected(false);
    setConnectedPlayers([]);
    setView('game-setup');
  };

  const handleStartGame = async (settings: GameSettings, isMultiplayer: boolean) => {
    setGameSettings(settings);
    setCurrentPlayerIndex(0);
    setLoadedGameState(null);
  
    try {
        const deckFilePromises = settings.players.map(p => {
            if (!p.deckFile) throw new Error(`Player ${p.name} has no deck file.`);
            return p.deckFile.getFile().then(file => file.text().then(text => JSON.parse(text)));
        });
        const parsedDecks: { name: string; cards: CardType[]; commanders?: string[] }[] = await Promise.all(deckFilePromises);

        const allCardIds = new Set<string>();
        parsedDecks.forEach(deck => {
            deck.cards.forEach(card => allCardIds.add(card.id));
        });

        const cachedCards = await getCardsFromDB(Array.from(allCardIds));
        const cardDataMap = new Map(cachedCards.map(c => [c.id, c]));

        const initialPlayerStates: PlayerState[] = settings.players.map((playerConfig, index) => {
            const deckData = parsedDecks[index];
            
            const allPlayerCards: CardType[] = deckData.cards.map((cardStub: CardType) => {
                const fullCardData = cardDataMap.get(cardStub.id);
                return {
                    ...(fullCardData || {}),
                    ...cardStub,
                    instanceId: crypto.randomUUID(),
                    isTapped: false,
                    isFlipped: false,
                    counters: {},
                    customCounters: {},
                };
            });

            const commanderInstanceIds = new Set(deckData.commanders || []);
            const commanders = allPlayerCards.filter(card => commanderInstanceIds.has(card.id));
            const mainDeck = allPlayerCards.filter(card => !commanderInstanceIds.has(card.id));

            const shuffledLibrary = shuffleDeck(mainDeck);
            const initialHand = shuffledLibrary.slice(0, 7);
            const library = shuffledLibrary.slice(7);

            return {
                id: playerConfig.id,
                name: playerConfig.name,
                username: playerConfig.username,
                color: playerConfig.color,
                life: 40,
                mana: { white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 },
                counters: {},
                hand: initialHand,
                library: library,
                graveyard: [],
                exile: [],
                commandZone: commanders,
                battlefield: [[], [], [], []],
            };
        });

        setPlayerStates(initialPlayerStates);

        if (settings.layout === 'tabs' && settings.players.length > 1) {
            setActiveOpponentId(settings.players[1].id);
        }
        
        if (isMultiplayer) {
          const gameState = {
            playerStates: initialPlayerStates,
            activeOpponentId: settings.layout === 'tabs' && settings.players.length > 1 ? settings.players[1].id : null,
            gameSettings: settings,
            isTopRotated,
          };
          broadcastGameState(gameState);
        }
        
        setView('game');

    } catch (error) {
        console.error("Failed to start game:", error);
    }
};

  const handleLoadGame = (gameState: GameState) => {
      if (!gameState.gameSettings.playAreaLayout) {
        gameState.gameSettings.playAreaLayout = 'rows';
      }
      setLoadedGameState(gameState);
      setPlayerStates(gameState.playerStates);
      setGameSettings(gameState.gameSettings);
      setActiveOpponentId(gameState.activeOpponentId);
      if(gameState.isTopRotated !== undefined) {
        setIsTopRotated(gameState.isTopRotated);
      }
      setView('game');
  };
  
  const handleSaveGame = async () => {
    const gameState = gameBoardRef.current?.getGameState();
    if (gameState && savesDirectoryHandle) {
        try {
            await saveGameState(gameState, savesDirectoryHandle);
            setAppNotification('Game saved successfully!');
            setTimeout(() => setAppNotification(null), 3000);
        } catch (err) {
            console.error("Failed to save game:", err);
            setAppNotification(`Could not save game. Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
    }
  };

  const handleEndTurn = () => {
    if (gameSettings) {
        const nextPlayerIndex = (currentPlayerIndex + 1) % gameSettings.players.length;
        setCurrentPlayerIndex(nextPlayerIndex);
        const nextPlayerName = gameSettings.players[nextPlayerIndex].name;
        setTurnNotification(`${nextPlayerName}'s turn.`);
        setTimeout(() => {
            setTurnNotification('');
        }, 3000);
    }
  };

  const handleResetLayouts = () => {
    if (gameBoardRef.current) {
      gameBoardRef.current.resetLayouts();
    }
  };
  
  const handleQuitGame = () => {
    setGameSettings(null);
    setPlayerStates(null);
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
    const itemToRemove = stack.find(item => item.id === stackItemId);
    if (itemToRemove && itemToRemove.cardInstanceId === hoveredStackCardId) {
        setHoveredStackCardId(null);
    }
    setStack(prevStack => prevStack.filter(item => item.id !== stackItemId));
  };

  const handleStackItemEnter = (cardInstanceId: string) => {
    setHoveredStackCardId(cardInstanceId);
  };

  const handleStackItemLeave = () => {
    setHoveredStackCardId(null);
  };

  const handleOrderButtonClick = (event: React.MouseEvent) => {
      if(gameSettings){
        setOrderMenu({ x: event.clientX, y: event.clientY, players: gameSettings.players });
      }
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
      case 'loading':
        return (
          <div className="game-loading">
            <h2>Welcome to The Aether Hub</h2>
            <p>Please select a folder to store your decks, saves, and card images.</p>
            <button onClick={handleSelectAppFolder} style={{padding: '1rem 2rem', fontSize: '1.2rem', marginTop: '1rem'}}>
              Select App Folder
            </button>
          </div>
        );
      case 'game-setup':
        return (
            <GameSetup
              decksDirectoryHandle={decksDirectoryHandle}
              onStartGame={handleStartGame}
              onLoadGame={handleLoadGame}
              savesDirectoryHandle={savesDirectoryHandle}
              peerId={peerId}
              onHost={handleOnHost}
              onJoin={handleOnJoin}
              onDisconnect={handleDisconnect}
              onStopHosting={handleStopHosting}
              isConnected={isConnected}
              connectedPlayers={connectedPlayers}
              kickPlayer={kickPlayer}
              isHost={isHost}
              hostUsername={hostUsername}
              sendDeckSelection={sendDeckSelection}
              players={players}
              setPlayers={setPlayers}
            />
        );
      case 'game':
        if (gameSettings && playerStates) {
          return (
            <GameBoard 
              ref={gameBoardRef}
              key={loadedGameState ? 'loaded-game' : 'new-game'}
              imagesDirectoryHandle={imagesDirectoryHandle} 
              settings={gameSettings}
              initialState={loadedGameState}
              playerStates={playerStates}
              setPlayerStates={setPlayerStates}
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
              currentPlayerName={gameSettings.players[currentPlayerIndex]?.name || 'Player 1'}
              onEndTurn={handleEndTurn}
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
            friendsDecks={friendsDecks}
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
      <div className={`turn-notification ${turnNotification ? 'visible' : ''}`}>
        {turnNotification}
      </div>

       {appNotification && (
        <div className="app-notification-backdrop">
            <div className="app-notification">
                <p>{appNotification}</p>
                <button onClick={() => setAppNotification(null)}>OK</button>
            </div>
        </div>
      )}

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
                <button onClick={handleOrderButtonClick} title="Set Turn Order">Order</button>
                <button
                  className="game-layout-button"
                  onClick={() => {
                    setGameSettings(s => {
                      if (!s) return s;
                      const newLayout = s.layout === 'tabs' ? 'split' : 'tabs';
                      if (newLayout === 'tabs' && s.players.length > 1 && !activeOpponentId) {
                        setActiveOpponentId(s.players[1].id);
                      }
                      return { ...s, layout: newLayout };
                    });
                  }}
                  title="Toggle Game Layout"
                >
                  Layout
                </button>
                <button
                  className="game-layout-button"
                  onClick={() => setGameSettings(s => s ? ({...s, playAreaLayout: s.playAreaLayout === 'rows' ? 'freeform' : 'rows'}) : s)}
                  title="Toggle Play Area Layout"
                >
                  Area
                </button>
                <button onClick={handleResetLayouts} title="Reset player area sizes">Reset</button>
                <button onClick={() => setIsStackVisible(v => !v)} title="Toggle Stack Panel">Stack</button>
                <button onClick={() => setIsPreviewVisible(v => !v)} title="Toggle Preview Panel">Preview</button>
                <button onClick={() => setIsTopRotated(r => !r)} title="Rotate Opponent's Cards">
                  <RotateIcon />
                </button>
              </>
            )}
            <button onClick={handleToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
              {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
            </button>
            <button onClick={handleSelectAppFolder} title="Select a local folder to store your decks and cached images.">
              {rootDirectoryHandle ? `Data: ${rootDirectoryHandle.name}` : 'Select App Folder'}
            </button>
          </div>
        </div>
      </header>
      
      <main>
        <div className="main-content-area">
          {renderView()}
        </div>
      </main>

      {orderMenu && gameSettings && (
          <ContextMenu
              x={orderMenu.x}
              y={orderMenu.y}
              onClose={() => setOrderMenu(null)}
              options={orderMenu.players.map((player, index) => ({
                  label: player.name,
                  action: () => {
                      setCurrentPlayerIndex(index);
                      setOrderMenu(null);
                  },
                  draggable: true,
                  onDragStart: () => handleOrderDragStart(index),
                  onDragEnter: () => handleOrderDragEnter(index),
                  onDragEnd: handleOrderDrop,
              }))}
          />
      )}

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
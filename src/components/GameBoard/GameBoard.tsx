// src/components/GameBoard/GameBoard.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import type { PlayerState, GameSettings, Card as CardType, GameState, DraggedItem, CardLocation } from '../../types';
import { getCardsFromDB } from '../../utils/db';
import LayoutOne from '../Layouts/LayoutOne';
import LayoutTwo from '../Layouts/LayoutTwo';
import ContextMenu from '../ContextMenu/ContextMenu';
import ScryModal from '../ScryModal/ScryModal';
import './GameBoard.css';

interface GameBoardProps {
    imagesDirectoryHandle: FileSystemDirectoryHandle | null;
    settings: GameSettings;
    initialState?: GameState | null;
    activeOpponentId: string | null;
    onOpponentChange: (id: string | null) => void;
    onCardHover: (card: CardType | null) => void; 
    cardPreview: React.ReactNode;
    stackPanel: React.ReactNode; 
}

export interface GameBoardHandle {
    getGameState: () => GameState | null;
}

const shuffleDeck = (deck: CardType[]): CardType[] => {
  return [...deck].sort(() => Math.random() - 0.5);
};

const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(({ imagesDirectoryHandle, settings, initialState, activeOpponentId, onOpponentChange, onCardHover, cardPreview, stackPanel }, ref) => {
  const [playerStates, setPlayerStates] = useState<PlayerState[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing game...');
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dropTarget, setDropTarget] = useState<CardLocation | null>(null);
  const [libraryContextMenu, setLibraryContextMenu] = useState<{ x: number, y: number, playerId: string } | null>(null);
  const [scryState, setScryState] = useState<{ playerId: string; cards: CardType[] } | null>(null);

  useImperativeHandle(ref, () => ({
      getGameState: () => {
          if (!playerStates) return null;
          return {
              playerStates,
              gameSettings: settings,
              activeOpponentId,
          };
      }
  }));

  useEffect(() => {
    const setupGame = async () => {
      setIsLoading(true);
      setError('');
      
      if (initialState) {
          setLoadingMessage('Loading saved game...');
          const validatedStates = initialState.playerStates.map(pState => ({
              ...pState,
              mana: pState.mana || { white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 },
              hand: pState.hand.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID()})),
              library: pState.library.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID()})),
              graveyard: pState.graveyard.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID()})),
              exile: pState.exile.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID()})),
              commandZone: pState.commandZone.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID()})),
              battlefield: pState.battlefield.map(row => row.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID()}))),
          }));
          setPlayerStates(validatedStates);
          setIsLoading(false);
          return;
      }

      try {
        setLoadingMessage('Reading deck files...');
        const deckFilePromises = settings.players.map(p => {
            if (!p.deckFile) throw new Error(`Player ${p.name} has no deck file.`);
            return p.deckFile.getFile().then(file => file.text().then(text => JSON.parse(text)));
        });
        const parsedDecks: { name: string, cards: CardType[], commanders?: string[] }[] = await Promise.all(deckFilePromises);

        const allCardIds = new Set<string>();
        parsedDecks.forEach(deck => {
          deck.cards.forEach(card => allCardIds.add(card.id));
        });

        setLoadingMessage(`Loading ${allCardIds.size} cards from local cache...`);
        const cachedCards = await getCardsFromDB(Array.from(allCardIds));
        const cardDataMap = new Map(cachedCards.map(c => [c.id, c]));

        const missingCardIds = Array.from(allCardIds).filter(id => !cardDataMap.has(id));
        if (missingCardIds.length > 0) {
          console.warn(`Could not find ${missingCardIds.length} cards in the local DB. Game may be incomplete.`);
        }

        setLoadingMessage('Shuffling decks and drawing hands...');
        const initialPlayerStates: PlayerState[] = settings.players.map((playerConfig, index) => {
          const deckData = parsedDecks[index];
          
          const oldIdToNewIdMap = new Map<string, string>();

          const allPlayerCards: CardType[] = deckData.cards.map((cardStub): CardType | null => {
              const fullCardData = cardDataMap.get(cardStub.id);
              if (!fullCardData) return null;

              const newInstanceId = crypto.randomUUID();
              if (cardStub.instanceId) {
                  oldIdToNewIdMap.set(cardStub.instanceId, newInstanceId);
              }

              const newCard: CardType = {
                  ...fullCardData,
                  instanceId: newInstanceId,
                  isTapped: false,
                  isFlipped: false,
              };
              return newCard;
          }).filter((c): c is CardType => c !== null); 

          const commanderInstanceIds = new Set(
              (deckData.commanders || []).map(oldId => oldIdToNewIdMap.get(oldId)).filter(Boolean)
          );

          const commanders: CardType[] = [];
          const mainDeck: CardType[] = [];

          allPlayerCards.forEach(card => {
              if (card.instanceId && commanderInstanceIds.has(card.instanceId)) {
                  commanders.push(card);
              } else {
                  mainDeck.push(card);
              }
          });

          const shuffledLibrary = shuffleDeck(mainDeck);
          const initialHand = shuffledLibrary.slice(0, 7);
          const library = shuffledLibrary.slice(7);

          return {
            id: playerConfig.id,
            name: playerConfig.name,
            color: playerConfig.color,
            life: 40,
            mana: { white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 },
            hand: initialHand,
            library: library,
            graveyard: [],
            exile: [],
            commandZone: commanders,
            battlefield: [[], [], [], []],
          };
        });

        setPlayerStates(initialPlayerStates);

      } catch (err) {
        console.error("Failed to initialize game:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred during game setup.");
      } finally {
        setIsLoading(false);
      }
    };

    setupGame();
  }, [settings, initialState]);
  
  const handleDragStart = useCallback((item: DraggedItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent, destination: CardLocation) => {
      event.preventDefault();
      if (!draggedItem) return;
      event.dataTransfer.dropEffect = "move";
      
      if (draggedItem.type === 'card' && draggedItem.source.zone === destination.zone && draggedItem.source.playerId === destination.playerId && draggedItem.source.row === destination.row) {
          if (dropTarget) setDropTarget(null);
          return;
      }
      if (dropTarget?.zone !== destination.zone || dropTarget?.playerId !== destination.playerId || dropTarget?.row !== destination.row) {
          setDropTarget(destination);
      }
  }, [draggedItem, dropTarget]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
      setDropTarget(null);
  }, []);

  const handleDrop = useCallback((destination: CardLocation) => {
      if (!draggedItem) return;

      setPlayerStates(currentStates => {
          if (!currentStates) return null;
  
          const { source } = draggedItem;
  
          if (draggedItem.type === 'card' &&
              source.playerId === destination.playerId &&
              source.zone === destination.zone &&
              source.row === destination.row) {
              return currentStates;
          }
  
          let cardToMove: CardType | undefined;
          let nextStates = [...currentStates];
  
          const sourcePlayerIndex = nextStates.findIndex(p => p.id === source.playerId);
          if (sourcePlayerIndex === -1) return currentStates;
  
          const originalSourcePlayer = nextStates[sourcePlayerIndex];
          const nextSourcePlayer = { ...originalSourcePlayer };
  
          if (draggedItem.type === 'card') {
              const cardId = draggedItem.card.instanceId;
              let foundAndRemoved = false;
              const removeCard = (cards: CardType[]) => {
                  const index = cards.findIndex(c => c.instanceId === cardId);
                  if (index > -1) {
                      const newCards = [...cards];
                      [cardToMove] = newCards.splice(index, 1);
                      foundAndRemoved = true;
                      return newCards;
                  }
                  return cards;
              };
  
              switch (source.zone) {
                  case 'hand': nextSourcePlayer.hand = removeCard(originalSourcePlayer.hand); break;
                  case 'graveyard': nextSourcePlayer.graveyard = removeCard(originalSourcePlayer.graveyard); break;
                  case 'exile': nextSourcePlayer.exile = removeCard(originalSourcePlayer.exile); break;
                  case 'commandZone': nextSourcePlayer.commandZone = removeCard(originalSourcePlayer.commandZone); break;
                  case 'battlefield':
                      if (typeof source.row === 'number') {
                          const newBattlefield = [...originalSourcePlayer.battlefield];
                          newBattlefield[source.row] = removeCard(originalSourcePlayer.battlefield[source.row]);
                          nextSourcePlayer.battlefield = newBattlefield;
                      }
                      break;
              }
  
              if (!foundAndRemoved && cardId) {
                 console.error("Dragged card not found:", cardId);
                 return currentStates;
              }
          } else { 
              if (originalSourcePlayer.library.length > 0) {
                  const newLibrary = [...originalSourcePlayer.library];
                  cardToMove = newLibrary.shift();
                  nextSourcePlayer.library = newLibrary;
              }
          }
  
          if (!cardToMove) return currentStates;
          
          nextStates[sourcePlayerIndex] = nextSourcePlayer;
  
          const destPlayerIndex = nextStates.findIndex(p => p.id === destination.playerId);
          if (destPlayerIndex === -1) return currentStates;
  
          const originalDestPlayer = nextStates[destPlayerIndex];
          const nextDestPlayer = sourcePlayerIndex === destPlayerIndex 
              ? nextSourcePlayer 
              : { ...originalDestPlayer };
  
          const isZoneChange = source.playerId !== destination.playerId || source.zone !== destination.zone;
          if (isZoneChange) {
            cardToMove.isTapped = false;
            cardToMove.isFlipped = false;
          }
  
          const addCard = (cards: CardType[], card: CardType, atBeginning = false) => {
              const newCards = [...cards];
              if (atBeginning) newCards.unshift(card);
              else newCards.push(card);
              return newCards;
          };
          
          switch (destination.zone) {
              case 'hand': nextDestPlayer.hand = addCard(originalDestPlayer.hand, cardToMove); break;
              case 'graveyard': nextDestPlayer.graveyard = addCard(originalDestPlayer.graveyard, cardToMove); break;
              case 'exile': nextDestPlayer.exile = addCard(originalDestPlayer.exile, cardToMove); break;
              case 'commandZone': nextDestPlayer.commandZone = addCard(originalDestPlayer.commandZone, cardToMove); break;
              case 'library': nextDestPlayer.library = addCard(originalDestPlayer.library, cardToMove, true); break;
              case 'battlefield':
                  if (typeof destination.row === 'number') {
                      const newBattlefield = [...originalDestPlayer.battlefield];
                      newBattlefield[destination.row] = addCard(originalDestPlayer.battlefield[destination.row], cardToMove);
                      nextDestPlayer.battlefield = newBattlefield;
                  }
                  break;
          }
          
          nextStates[destPlayerIndex] = nextDestPlayer;
  
          return nextStates;
      });
  
      setDraggedItem(null);
      setDropTarget(null);
  }, [draggedItem]);
  
  const updateCardState = useCallback((cardInstanceId: string, update: (card: CardType) => CardType) => {
      setPlayerStates(currentStates => {
          if (!currentStates) return null;
          return currentStates.map(pState => {
              const findAndUpdate = (card: CardType) => card.instanceId === cardInstanceId ? update(card) : card;
              return {
                  ...pState,
                  hand: pState.hand.map(findAndUpdate),
                  library: pState.library.map(findAndUpdate),
                  graveyard: pState.graveyard.map(findAndUpdate),
                  exile: pState.exile.map(findAndUpdate),
                  commandZone: pState.commandZone.map(findAndUpdate),
                  battlefield: pState.battlefield.map(row => row.map(findAndUpdate)),
              };
          });
      });
  }, []);

  const handleCardTap = useCallback((cardInstanceId: string) => {
      updateCardState(cardInstanceId, card => ({...card, isTapped: !card.isTapped}));
  }, [updateCardState]);

  const handleCardFlip = useCallback((cardInstanceId: string) => {
      updateCardState(cardInstanceId, card => ({...card, isFlipped: !card.isFlipped}));
  }, [updateCardState]);

  const handleCardContextMenu = useCallback((event: React.MouseEvent, card: CardType) => {
      event.preventDefault();
      console.log("Context menu for:", card.name, card.instanceId);
  }, []);

  // --- NEW --- Handlers for library actions
  const handleDraw = useCallback((playerId: string, count: number) => {
    setPlayerStates(currentStates => {
        if (!currentStates) return null;
        const playerIndex = currentStates.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return currentStates;

        const player = currentStates[playerIndex];
        const numToDraw = Math.min(count, player.library.length);
        if (numToDraw <= 0) return currentStates;

        const cardsToDraw = player.library.slice(0, numToDraw);
        const newLibrary = player.library.slice(numToDraw);
        const newHand = [...player.hand, ...cardsToDraw];

        const newPlayerState = { ...player, library: newLibrary, hand: newHand };
        const newPlayerStates = [...currentStates];
        newPlayerStates[playerIndex] = newPlayerState;
        return newPlayerStates;
    });
  }, []);

  const handleScry = useCallback((playerId: string, count: number) => {
    setPlayerStates(currentStates => {
        if (!currentStates) return currentStates;
        const playerIndex = currentStates.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return currentStates;
        
        const player = currentStates[playerIndex];
        const numToScry = Math.min(count, player.library.length);
        if (numToScry <= 0) return currentStates;

        const cardsToScry = player.library.slice(0, numToScry);
        const remainingLibrary = player.library.slice(numToScry);

        setScryState({ playerId, cards: cardsToScry });

        const updatedPlayer = { ...player, library: remainingLibrary };
        const newPlayerStates = [...currentStates];
        newPlayerStates[playerIndex] = updatedPlayer;
        return newPlayerStates;
    });
  }, []);

  const handleCloseScry = useCallback((toTop: CardType[], toBottom: CardType[]) => {
    if (!scryState) return;
    const { playerId } = scryState;
    
    setPlayerStates(currentStates => {
        if (!currentStates) return null;
        const playerIndex = currentStates.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return currentStates;

        const player = currentStates[playerIndex];
        // Reverse top cards so the last one chosen for top ends up on top.
        const newLibrary = [...toTop.reverse(), ...player.library, ...toBottom];
        
        const newPlayerState = { ...player, library: newLibrary };
        const newPlayerStates = [...currentStates];
        newPlayerStates[playerIndex] = newPlayerState;
        return newPlayerStates;
    });

    setScryState(null);
  }, [scryState]);

  const handleLibraryContextMenu = useCallback((event: React.MouseEvent, playerId: string) => {
      event.preventDefault();
      setLibraryContextMenu({ x: event.clientX, y: event.clientY, playerId });
  }, []);

  const buildLibraryContextMenuOptions = useCallback((playerId: string) => {
      const createDrawAction = (count: number | 'X') => () => {
          if (count === 'X') {
              const num = parseInt(prompt("Draw how many cards?") || '0', 10);
              if (num > 0) handleDraw(playerId, num);
          } else {
              handleDraw(playerId, count);
          }
      };

      const createScryAction = (count: number | 'X') => () => {
          if (count === 'X') {
              const num = parseInt(prompt("Scry how many cards?") || '0', 10);
              if (num > 0) handleScry(playerId, num);
          } else {
              handleScry(playerId, count);
          }
      };

      return [
          { label: 'Draw 1 Card', action: createDrawAction(1) },
          { label: 'Draw 3 Cards', action: createDrawAction(3) },
          { label: 'Draw 7 Cards', action: createDrawAction(7) },
          { label: 'Draw X Cards...', action: createDrawAction('X') },
          { label: 'Scry 1 Card', action: createScryAction(1) },
          { label: 'Scry 3 Cards', action: createScryAction(3) },
          { label: 'Scry 7 Cards', action: createScryAction(7) },
          { label: 'Scry X Cards...', action: createScryAction('X') },
      ];
  }, [handleDraw, handleScry]);


  const handleCardDragStart = useCallback((card: CardType, source: CardLocation) => {
    handleDragStart({ type: 'card', card, source });
  }, [handleDragStart]);

  const handleLibraryDragStart = useCallback((source: CardLocation) => {
      handleDragStart({ type: 'library', source });
  }, [handleDragStart]);

  const interactionProps = useMemo(() => ({
      imagesDirectoryHandle,
      onCardTap: handleCardTap,
      onCardFlip: handleCardFlip,
      onCardContextMenu: handleCardContextMenu,
      onLibraryContextMenu: handleLibraryContextMenu, // --- NEW ---
      onCardDragStart: handleCardDragStart,
      onLibraryDragStart: handleLibraryDragStart,
      onZoneDrop: handleDrop,
      onZoneDragOver: handleDragOver,
      onZoneDragLeave: handleDragLeave,
      dropTarget: dropTarget,
      onCardHover: onCardHover,
  }), [imagesDirectoryHandle, handleCardTap, handleCardFlip, handleCardContextMenu, handleLibraryContextMenu, handleCardDragStart, handleLibraryDragStart, handleDrop, handleDragOver, handleDragLeave, dropTarget, onCardHover]);
  
  if (isLoading) {
    return <div className="game-loading"><h2>{loadingMessage}</h2></div>;
  }
  if (error) {
    return <div className="game-loading error-message"><h2>Error</h2><p>{error}</p></div>;
  }
  if (!playerStates) {
    return <div className="game-loading"><h2>Could not initialize players.</h2></div>;
  }
    
  return (
    <div className="game-board">
      {settings.layout === '1vAll' ? (
        <LayoutOne 
          playerStates={playerStates} 
          activeOpponentId={activeOpponentId}
          cardPreview={cardPreview}
          stackPanel={stackPanel}
          {...interactionProps}
        />
      ) : (
        <LayoutTwo 
          playerStates={playerStates} 
          cardPreview={cardPreview}
          stackPanel={stackPanel}
          {...interactionProps}
        />
      )}
      {/* --- NEW --- Render context menu and scry modal */}
      {libraryContextMenu && (
          <ContextMenu
              x={libraryContextMenu.x}
              y={libraryContextMenu.y}
              onClose={() => setLibraryContextMenu(null)}
              options={buildLibraryContextMenuOptions(libraryContextMenu.playerId)}
          />
      )}
      <ScryModal
          isOpen={!!scryState}
          cards={scryState?.cards || []}
          imageDirectoryHandle={imagesDirectoryHandle}
          onClose={handleCloseScry}
      />
    </div>
  );
});

export default GameBoard;
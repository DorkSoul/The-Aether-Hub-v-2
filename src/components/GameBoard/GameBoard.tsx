// src/components/GameBoard/GameBoard.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import type { PlayerState, GameSettings, Card as CardType, GameState, DraggedItem, CardLocation, ManaType } from '../../types';
import { getCardsFromDB } from '../../utils/db';
import { getHandHeights, saveHandHeights, getFreeformSizes, saveFreeformSizes } from '../../utils/settings';
import { parseOracleText } from '../../utils/abilityUtils';
import TabsLayout from '../Layouts/TabsLayout';
import SplitLayout from '../Layouts/SplitLayout';
import ContextMenu from '../ContextMenu/ContextMenu';
import ScryModal from '../ScryModal/ScryModal';
import HeldCounter from '../HeldCounter/HeldCounter';
import GlobalActionBar from '../GlobalActionBar/GlobalActionBar';
import './GameBoard.css';

interface GameBoardProps {
    imagesDirectoryHandle: FileSystemDirectoryHandle | null;
    settings: GameSettings;
    initialState?: GameState | null;
    activeOpponentId: string | null;
    onOpponentChange: (id: string | null) => void;
    onCardHover: (card: CardType | null) => void;
    previewCard: CardType | null;
    cardPreview: React.ReactNode;
    stackPanel: React.ReactNode;
    cardSize: number;
    onAddToStack: (abilityText: string, card: CardType) => void;
    hoveredStackCardId: string | null;
    isTopRotated: boolean;
    currentPlayerName: string;
    onEndTurn: () => void;
}

export interface GameBoardHandle {
    getGameState: () => GameState | null;
    resetLayouts: () => void;
}

const shuffleDeck = (deck: CardType[]): CardType[] => {
  return [...deck].sort(() => Math.random() - 0.5);
};

const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(({ imagesDirectoryHandle, settings, initialState, activeOpponentId, onOpponentChange, onCardHover, previewCard, cardPreview, stackPanel, cardSize, onAddToStack, hoveredStackCardId, isTopRotated, currentPlayerName, onEndTurn }, ref) => {
  const [playerStates, setPlayerStates] = useState<PlayerState[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing game...');
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dropTarget, setDropTarget] = useState<CardLocation | null>(null);
  const [libraryContextMenu, setLibraryContextMenu] = useState<{ x: number, y: number, playerId: string } | null>(null);
  const [cardContextMenu, setCardContextMenu] = useState<{ x: number, y: number, card: CardType } | null>(null);
  const [scryState, setScryState] = useState<{ playerId: string; cards: CardType[] } | null>(null);
  const [freeformCardSizes, setFreeformCardSizes] = useState<{[playerId: string]: number}>({});
  const [handHeights, setHandHeights] = useState<{ [key: string]: number }>({});
  const [heldCounter, setHeldCounter] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const prevPlayAreaLayout = React.useRef(settings.playAreaLayout);
  const [resetKey, setResetKey] = useState(0);

  useImperativeHandle(ref, () => ({
      getGameState: () => {
          if (!playerStates) return null;
          return {
              playerStates,
              gameSettings: settings,
              activeOpponentId,
              handHeights,
              freeformCardSizes,
              isTopRotated,
          };
      },
      resetLayouts: () => {
        if (playerStates) {
            const defaultHandHeights = playerStates.reduce((acc, p) => ({ ...acc, [p.id]: 150 }), {});
            const defaultFreeformSizes = playerStates.reduce((acc, p) => ({ ...acc, [p.id]: 140 }), {});
            setHandHeights(defaultHandHeights);
            setFreeformCardSizes(defaultFreeformSizes);

            const handHeightsToSave = playerStates.reduce((acc, p, i) => ({...acc, [i]: 150}), {});
            const freeformSizesToSave = playerStates.reduce((acc, p, i) => ({...acc, [i]: 140}), {});

            saveHandHeights(handHeightsToSave);
            saveFreeformSizes(freeformSizesToSave);
            setResetKey(prev => prev + 1);
        }
      }
  }));

  useEffect(() => {
    if (previewCard && playerStates) {
        let currentCardInGameState: CardType | undefined;
        for (const pState of playerStates) {
            const zones = [pState.hand, pState.graveyard, pState.exile, pState.commandZone, ...pState.battlefield, pState.library];
            for (const zone of zones) {
                const found = zone.find(c => c.instanceId === previewCard.instanceId);
                if (found) {
                    currentCardInGameState = found;
                    break;
                }
            }
            if(currentCardInGameState) break;
        }

        if (currentCardInGameState && currentCardInGameState.isFlipped !== previewCard.isFlipped) {
            onCardHover(currentCardInGameState);
        }
    }
  }, [playerStates, previewCard, onCardHover]);

  useEffect(() => {
    const setupGame = async () => {
      setIsLoading(true);
      setError('');
      
      if (initialState) {
          setLoadingMessage('Loading saved game...');
          const validatedStates = initialState.playerStates.map(pState => ({
              ...pState,
              mana: pState.mana || { white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 },
              counters: pState.counters || {},
              hand: pState.hand.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID(), counters: c.counters || {}, customCounters: c.customCounters || {}})),
              library: pState.library.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID(), counters: c.counters || {}, customCounters: c.customCounters || {}})),
              graveyard: pState.graveyard.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID(), counters: c.counters || {}, customCounters: c.customCounters || {}})),
              exile: pState.exile.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID(), counters: c.counters || {}, customCounters: c.customCounters || {}})),
              commandZone: pState.commandZone.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID(), counters: c.counters || {}, customCounters: c.customCounters || {}})),
              battlefield: pState.battlefield.map(row => row.map(c => ({...c, instanceId: c.instanceId || crypto.randomUUID(), counters: c.counters || {}, customCounters: c.customCounters || {}}))),
          }));
          setPlayerStates(validatedStates);
          
          const defaultHandHeights = getHandHeights({});
          const initialHandHeights = initialState.handHeights || validatedStates.reduce((acc, p, i) => ({ ...acc, [p.id]: defaultHandHeights[i] || 150 }), {});
          setHandHeights(initialHandHeights);

          const defaultFreeformSizes = getFreeformSizes({});
          const initialFreeformSizes = initialState.freeformCardSizes || validatedStates.reduce((acc, p, i) => ({ ...acc, [p.id]: defaultFreeformSizes[i] || 140 }), {});
          setFreeformCardSizes(initialFreeformSizes);
          
          setIsLoading(false);
          return;
      }

      try {
        setLoadingMessage('Reading deck files...');
        const deckFilePromises = settings.players.map(p => {
            if (!p.deckFile) throw new Error(`Player ${p.name} has no deck file.`);
            return p.deckFile.getFile().then(file => file.text().then(text => JSON.parse(text)));
        });
        const parsedDecks: { name: string; cards: CardType[]; commanders?: string[] }[] = await Promise.all(deckFilePromises);

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
                  ...cardStub,
                  instanceId: newInstanceId,
                  isTapped: false,
                  isFlipped: false,
                  counters: {},
                  customCounters: {},
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
        
        const persistentHandHeights = getHandHeights({});
        const persistentFreeformSizes = getFreeformSizes({});
        const initialHandHeights: { [key: string]: number } = {};
        const initialFreeformSizes: { [key: string]: number } = {};

        initialPlayerStates.forEach((player, index) => {
            initialHandHeights[player.id] = persistentHandHeights[index] || 150;
            initialFreeformSizes[player.id] = persistentFreeformSizes[index] || 140;
        });

        setHandHeights(initialHandHeights);
        setFreeformCardSizes(initialFreeformSizes);

      } catch (err) {
        console.error("Failed to initialize game:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred during game setup.");
      } finally {
        setIsLoading(false);
      }
    };

    setupGame();
  }, [settings.players, initialState]);
  
  useEffect(() => {
    if (prevPlayAreaLayout.current !== settings.playAreaLayout) {
      setPlayerStates(currentStates => {
        if (!currentStates) return null;
        return currentStates.map(playerState => {
          const allBattlefieldCards = playerState.battlefield.flat();
          if (settings.playAreaLayout === 'freeform') {
            const cardWidth = freeformCardSizes[playerState.id] || 140;
            const gap = 10;
            const cardsWithPositions = allBattlefieldCards.map((card, index) => ({
              ...card,
              x: index * (cardWidth + gap) + gap,
              y: gap,
            }));
            return {
              ...playerState,
              battlefield: [cardsWithPositions, [], [], []],
            };
          } else { 
            const newBattlefield: CardType[][] = [[], [], [], []];
            const cardsToDistribute = allBattlefieldCards.map(({ x, y, ...rest }) => rest);
            newBattlefield[1] = cardsToDistribute;
            return {
              ...playerState,
              battlefield: newBattlefield,
            };
          }
        });
      });
    }
    prevPlayAreaLayout.current = settings.playAreaLayout;
  }, [settings.playAreaLayout, freeformCardSizes]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (heldCounter) {
            setMousePosition({ x: e.clientX, y: e.clientY });
        }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [heldCounter]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
        if (heldCounter) {
            const target = e.target as HTMLElement;
            if (!target.closest('.card-flipper') && !target.closest('h3')) {
                setHeldCounter(null);
            }
        }
    };

    const handleContextMenu = (e: MouseEvent) => {
        if (heldCounter) {
            const target = e.target as HTMLElement;
            if (!target.closest('.card-flipper') && !target.closest('h3')) {
                e.preventDefault();
                setHeldCounter(null);
            }
        }
    };

    if (heldCounter) {
        document.addEventListener('click', handleClick, true);
        document.addEventListener('contextmenu', handleContextMenu, true);
    }

    return () => {
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [heldCounter]);

  const handleUntapAll = useCallback(() => {
    setPlayerStates(currentStates => {
        if (!currentStates) return null;

        const playerToUntapId = currentStates[0].id;

        return currentStates.map(pState => {
            if (pState.id === playerToUntapId) {
                const newBattlefield = pState.battlefield.map(row =>
                    row.map(card => ({ ...card, isTapped: false }))
                );
                return { ...pState, battlefield: newBattlefield };
            }
            return pState;
        });
    });
}, []);

  const handleDragStart = useCallback((item: DraggedItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent, destination: CardLocation) => {
      event.preventDefault();
      if (!draggedItem) return;
      event.dataTransfer.dropEffect = "move";
      
      const isSameZone = draggedItem.type === 'card' && 
                       draggedItem.source.playerId === destination.playerId &&
                       draggedItem.source.zone === destination.zone &&
                       draggedItem.source.row === destination.row;

      if (isSameZone && settings.playAreaLayout !== 'freeform') {
          if (dropTarget) setDropTarget(null);
          return;
      }

      if (dropTarget?.zone !== destination.zone || dropTarget?.playerId !== destination.playerId || dropTarget?.row !== destination.row) {
          setDropTarget(destination);
      }
  }, [draggedItem, dropTarget, settings.playAreaLayout]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
      setDropTarget(null);
  }, []);

  const handleDrop = useCallback((destination: CardLocation, event: React.DragEvent) => {
    if (!draggedItem) return;

    let dropCoords: { x: number; y: number } | null = null;
    if (destination.zone === 'battlefield' && settings.playAreaLayout === 'freeform' && event.currentTarget) {
        const containerRect = event.currentTarget.getBoundingClientRect();
        const dropX = event.clientX - containerRect.left - draggedItem.offset.x;
        const dropY = event.clientY - containerRect.top - draggedItem.offset.y;

        const destPlayerState = playerStates?.find(p => p.id === destination.playerId);
        let isDestFlipped = false;
        if (destPlayerState && playerStates) {
            if (settings.layout === 'tabs') {
                isDestFlipped = activeOpponentId === destPlayerState.id;
            } else { // split
                const playerIndex = playerStates.findIndex(p => p.id === destPlayerState.id);
                isDestFlipped = playerIndex % 2 !== 0;
            }
        }

        if (isDestFlipped) {
            const cardWidth = freeformCardSizes[destination.playerId];
            dropCoords = {
                x: containerRect.width - dropX - cardWidth,
                y: dropY,
            };
        } else {
            dropCoords = {
                x: dropX,
                y: dropY,
            };
        }
    }

    setPlayerStates(currentStates => {
        if (!currentStates) return null;

        const { source } = draggedItem;
        let cardToMove: CardType | undefined;
        let nextStates = [...currentStates];

        const sourcePlayerIndex = nextStates.findIndex(p => p.id === source.playerId);
        if (sourcePlayerIndex === -1) return currentStates;

        const originalSourcePlayer = nextStates[sourcePlayerIndex];
        let nextSourcePlayer = { ...originalSourcePlayer };

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
                case 'hand': nextSourcePlayer.hand = removeCard(nextSourcePlayer.hand); break;
                case 'graveyard': nextSourcePlayer.graveyard = removeCard(nextSourcePlayer.graveyard); break;
                case 'exile': nextSourcePlayer.exile = removeCard(nextSourcePlayer.exile); break;
                case 'commandZone': nextSourcePlayer.commandZone = removeCard(nextSourcePlayer.commandZone); break;
                case 'battlefield':
                    if (typeof source.row === 'number') {
                        const newBattlefield = nextSourcePlayer.battlefield.map(r => [...r]);
                        newBattlefield[source.row] = removeCard(newBattlefield[source.row]);
                        nextSourcePlayer.battlefield = newBattlefield;
                    }
                    break;
            }

            if (!foundAndRemoved && cardId) {
                console.error("Dragged card not found:", cardId);
                return currentStates;
            }
        } else {
            if (nextSourcePlayer.library.length > 0) {
                const newLibrary = [...nextSourcePlayer.library];
                cardToMove = newLibrary.shift();
                nextSourcePlayer.library = newLibrary;
            }
        }

        if (!cardToMove) return currentStates;

        if (sourcePlayerIndex !== -1) {
            nextStates[sourcePlayerIndex] = nextSourcePlayer;
        }

        const destPlayerIndex = sourcePlayerIndex === -1 ? -1 : nextStates.findIndex(p => p.id === destination.playerId);
        if (destPlayerIndex === -1) return currentStates;

        const originalDestPlayer = nextStates[destPlayerIndex];
        let nextDestPlayer = { ...originalDestPlayer };

        const isZoneChange = source.playerId !== destination.playerId || source.zone !== destination.zone;
        if (isZoneChange) {
            cardToMove.isTapped = false;
            cardToMove.isFlipped = false;
        }

        if (dropCoords) {
            cardToMove.x = dropCoords.x;
            cardToMove.y = dropCoords.y;
        } else {
            cardToMove.x = undefined;
            cardToMove.y = undefined;
        }

        const addCard = (cards: CardType[], card: CardType, atBeginning = false) => {
            const newCards = [...cards];
            if (atBeginning) newCards.unshift(card);
            else newCards.push(card);
            return newCards;
        };

        switch (destination.zone) {
            case 'hand': nextDestPlayer.hand = addCard(nextDestPlayer.hand, cardToMove); break;
            case 'graveyard': nextDestPlayer.graveyard = addCard(nextDestPlayer.graveyard, cardToMove); break;
            case 'exile': nextDestPlayer.exile = addCard(nextDestPlayer.exile, cardToMove); break;
            case 'commandZone': nextDestPlayer.commandZone = addCard(nextDestPlayer.commandZone, cardToMove); break;
            case 'library': nextDestPlayer.library = addCard(nextDestPlayer.library, cardToMove, true); break;
            case 'battlefield':
                if (typeof destination.row === 'number') {
                    const newBattlefield = nextDestPlayer.battlefield.map(r => [...r]);
                    newBattlefield[destination.row] = addCard(newBattlefield[destination.row], cardToMove);
                    nextDestPlayer.battlefield = newBattlefield;
                }
                break;
        }

        nextStates[destPlayerIndex] = nextDestPlayer;
        return nextStates;
    });

    setDraggedItem(null);
    setDropTarget(null);
}, [draggedItem, settings.playAreaLayout, playerStates, activeOpponentId, freeformCardSizes]);
  
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

  const handleApplyCounter = (cardInstanceId: string, counterType: string) => {
    updateCardState(cardInstanceId, card => {
        const newCounters = { ...(card.counters || {}) };
        newCounters[counterType] = (newCounters[counterType] || 0) + 1;
        return { ...card, counters: newCounters };
    });
  };

  const handleCustomCounterApply = useCallback((cardInstanceId: string, counterType: string) => {
    updateCardState(cardInstanceId, card => {
        const newCustomCounters = { ...(card.customCounters || {}) };
        newCustomCounters[counterType] = (newCustomCounters[counterType] || 0) + 1;
        return { ...card, customCounters: newCustomCounters };
    });
  }, [updateCardState]);

  const handlePlayerCounterApply = useCallback((playerId: string, counterType: string) => {
    setPlayerStates(currentStates => {
        if (!currentStates) return null;
        return currentStates.map(pState => {
            if (pState.id === playerId) {
                const newCounters = { ...(pState.counters || {}) };
                newCounters[counterType] = (newCounters[counterType] || 0) + 1;
                return { ...pState, counters: newCounters };
            }
            return pState;
        });
    });
  }, []);

  const handlePlayerCounterRemove = useCallback((playerId: string, counterType: string) => {
    setPlayerStates(currentStates => {
        if (!currentStates) return null;
        return currentStates.map(pState => {
            if (pState.id === playerId) {
                const newCounters = { ...(pState.counters || {}) };
                if (newCounters[counterType] > 1) {
                    newCounters[counterType] -= 1;
                } else {
                    delete newCounters[counterType];
                }
                return { ...pState, counters: newCounters };
            }
            return pState;
        });
    });
  }, []);

  const handleRemoveAllPlayerCounters = useCallback((playerId: string, counterType: string) => {
    setPlayerStates(currentStates => {
        if (!currentStates) return null;
        return currentStates.map(pState => {
            if (pState.id === playerId) {
                const newCounters = { ...(pState.counters || {}) };
                delete newCounters[counterType];
                return { ...pState, counters: newCounters };
            }
            return pState;
        });
    });
  }, []);

  const handleCounterRemove = (cardInstanceId: string, counterType: string) => {
    updateCardState(cardInstanceId, card => {
        const newCounters = { ...(card.counters || {}) };
        const newCustomCounters = { ...(card.customCounters || {}) };

        if (newCounters[counterType]) {
            if (newCounters[counterType] > 1) {
                newCounters[counterType] -= 1;
            } else {
                delete newCounters[counterType];
            }
        } else if (newCustomCounters[counterType]) {
            if (newCustomCounters[counterType] > 1) {
                newCustomCounters[counterType] -= 1;
            } else {
                delete newCustomCounters[counterType];
            }
        }
        return { ...card, counters: newCounters, customCounters: newCustomCounters };
    });
  };

  const handleRemoveAllCounters = (cardInstanceId: string, counterType: string) => {
    updateCardState(cardInstanceId, card => {
        const newCounters = { ...(card.counters || {}) };
        const newCustomCounters = { ...(card.customCounters || {}) };

        if (newCounters[counterType]) {
            delete newCounters[counterType];
        } else if (newCustomCounters[counterType]) {
            delete newCustomCounters[counterType];
        }
        return { ...card, counters: newCounters, customCounters: newCustomCounters };
    });
  };

  const handleCardTap = useCallback((cardInstanceId: string) => {
      updateCardState(cardInstanceId, card => ({...card, isTapped: !card.isTapped}));
  }, [updateCardState]);

  const handleCardFlip = useCallback((cardInstanceId: string) => {
      updateCardState(cardInstanceId, card => ({...card, isFlipped: !card.isFlipped}));
  }, [updateCardState]);

  const handleCardContextMenu = useCallback((event: React.MouseEvent, card: CardType) => {
      event.preventDefault();
      setCardContextMenu({ x: event.clientX, y: event.clientY, card });
  }, []);

  const buildCardAbilitiesMenu = useCallback((card: CardType) => {
    const abilities: string[] = [];
    const layoutsToCombine = ["adventure", "split", "flip"];

    if (layoutsToCombine.includes(card.layout ?? "") && card.card_faces) {
      card.card_faces.forEach(face => {
        if (face.oracle_text) {
          abilities.push(...parseOracleText(face.oracle_text));
        }
      });
    } else {
      let oracleText: string | undefined;
      if (card.card_faces && card.card_faces.length > 0) {
        const faceIndex = card.isFlipped ? 1 : 0;
        oracleText = card.card_faces[faceIndex]?.oracle_text;
      } else {
        oracleText = card.oracle_text;
      }
      abilities.push(...parseOracleText(oracleText));
    }

    if (abilities.length === 0) {
      return [{ label: '(No activatable abilities found)', action: () => {} }];
    }

    return abilities.map(ability => ({
      label: ability,
      action: () => onAddToStack(ability, card),
    }));
  }, [onAddToStack]);

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

  const handleUpdateFreeformCardSize = useCallback((playerId: string, delta: number) => {
      setFreeformCardSizes(prevSizes => {
          const newSize = Math.max(60, Math.min(300, (prevSizes[playerId] || 140) + delta));
          
          const playerIndex = playerStates?.findIndex(p => p.id === playerId);
          if (playerIndex !== undefined && playerIndex !== -1) {
              const persistentSizes = getFreeformSizes({});
              persistentSizes[playerIndex] = newSize;
              saveFreeformSizes(persistentSizes);
          }

          return {
              ...prevSizes,
              [playerId]: newSize
          };
      });
  }, [playerStates]);

  const handleHandResize = useCallback((playerId: string, deltaY: number) => {
    setHandHeights(prevHeights => {
        if (prevHeights[playerId] === undefined) return prevHeights;
        const currentHeight = prevHeights[playerId];
        const newHeight = Math.max(20, Math.min(500, currentHeight + deltaY));

        const playerIndex = playerStates?.findIndex(p => p.id === playerId);
        if (playerIndex !== undefined && playerIndex !== -1) {
            const persistentHeights = getHandHeights({});
            persistentHeights[playerIndex] = newHeight;
            saveHandHeights(persistentHeights);
        }
        
        return {
            ...prevHeights,
            [playerId]: newHeight
        };
    });
  }, [playerStates]);

  const handleUpdateMana = useCallback((playerId: string, manaType: ManaType, delta: number) => {
    setPlayerStates(currentStates => {
      if (!currentStates) return null;
      return currentStates.map(pState => {
        if (pState.id === playerId) {
          const newManaValue = Math.max(0, pState.mana[manaType] + delta);
          return {
            ...pState,
            mana: {
              ...pState.mana,
              [manaType]: newManaValue,
            }
          };
        }
        return pState;
      });
    });
  }, []);

  const handleUpdateLife = useCallback((playerId: string, delta: number) => {
    setPlayerStates(currentStates => {
      if (!currentStates) return null;
      return currentStates.map(pState => {
        if (pState.id === playerId) {
          return { ...pState, life: pState.life + delta };
        }
        return pState;
      });
    });
  }, []);

  const handleResetMana = useCallback((playerId: string) => {
    setPlayerStates(currentStates => {
      if (!currentStates) return null;
      return currentStates.map(pState => {
        if (pState.id === playerId) {
          return {
            ...pState,
            mana: { white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 },
          };
        }
        return pState;
      });
    });
  }, []);

  const handleCardDragStart = useCallback((card: CardType, source: CardLocation, offset: {x: number, y: number}) => {
    handleDragStart({ type: 'card', card, source, offset });
  }, [handleDragStart]);

  const handleLibraryDragStart = useCallback((source: CardLocation, offset: {x: number, y: number}) => {
      handleDragStart({ type: 'library', source, offset });
  }, [handleDragStart]);

  const interactionProps = useMemo(() => ({
      imagesDirectoryHandle,
      playAreaLayout: settings.playAreaLayout,
      freeformCardSizes,
      heldCounter,
      onCounterApply: handleApplyCounter,
      onCustomCounterApply: handleCustomCounterApply,
      onCounterRemove: handleCounterRemove,
      onRemoveAllCounters: handleRemoveAllCounters,
      onCounterSelect: setHeldCounter,
      onCardTap: handleCardTap,
      onCardFlip: handleCardFlip,
      onCardContextMenu: handleCardContextMenu,
      onLibraryContextMenu: handleLibraryContextMenu,
      onUpdateFreeformCardSize: handleUpdateFreeformCardSize,
      onCardDragStart: handleCardDragStart,
      onLibraryDragStart: handleLibraryDragStart,
      onZoneDrop: handleDrop,
      onZoneDragOver: handleDragOver,
      onZoneDragLeave: handleDragLeave,
      dropTarget: dropTarget,
      onCardHover: onCardHover,
      cardSize,
      hoveredStackCardId,
      onPlayerCounterApply: handlePlayerCounterApply,
      onPlayerCounterRemove: handlePlayerCounterRemove,
      onRemoveAllPlayerCounters: handleRemoveAllPlayerCounters,
      setHeldCounter,
      onUpdateLife: handleUpdateLife,
      onHandResize: handleHandResize,
  }), [imagesDirectoryHandle, settings.playAreaLayout, freeformCardSizes, heldCounter, setHeldCounter, handleCardTap, handleCardFlip, handleCardContextMenu, handleLibraryContextMenu, handleUpdateFreeformCardSize, handleCardDragStart, handleLibraryDragStart, handleDrop, handleDragOver, handleDragLeave, dropTarget, onCardHover, cardSize, hoveredStackCardId, handleApplyCounter, handleCustomCounterApply, handleRemoveAllCounters, handlePlayerCounterApply, handlePlayerCounterRemove, handleRemoveAllPlayerCounters, handleUpdateLife, handleHandResize]);
  
  if (isLoading) {
    return <div className="game-loading"><h2>{loadingMessage}</h2></div>;
  }
  if (error) {
    return <div className="game-loading error-message"><h2>Error</h2><p>{error}</p></div>;
  }
  if (!playerStates) {
    return <div className="game-loading"><h2>Could not initialize players.</h2></div>;
  }

  const globalActionBar = playerStates[0] && (
      <GlobalActionBar
          playerState={playerStates[0]}
          onUpdateMana={handleUpdateMana}
          onResetMana={handleResetMana}
          heldCounter={heldCounter}
          setHeldCounter={setHeldCounter}
          onUntapAll={handleUntapAll}
          currentPlayerName={currentPlayerName}
          onEndTurn={onEndTurn}
      />
  );
    
  return (
    <div className="game-board">
      {heldCounter && (
        <HeldCounter text={heldCounter} x={mousePosition.x} y={mousePosition.y} />
      )}
      {settings.layout === 'tabs' ? (
        <TabsLayout 
          playerStates={playerStates} 
          activeOpponentId={activeOpponentId}
          cardPreview={cardPreview}
          stackPanel={stackPanel}
          handHeights={handHeights}
          isTopRotated={isTopRotated}
          resetKey={resetKey}
          globalActions={globalActionBar}
          {...interactionProps}
        />
      ) : (
        <SplitLayout 
          playerStates={playerStates} 
          cardPreview={cardPreview}
          stackPanel={stackPanel}
          handHeights={handHeights}
          isTopRotated={isTopRotated}
          resetKey={resetKey}
          globalActions={globalActionBar}
          {...interactionProps}
        />
      )}
      {cardContextMenu && (
          <ContextMenu
              x={cardContextMenu.x}
              y={cardContextMenu.y}
              onClose={() => setCardContextMenu(null)}
              options={buildCardAbilitiesMenu(cardContextMenu.card)}
          />
      )}
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
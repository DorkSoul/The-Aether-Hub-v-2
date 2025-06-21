// src/components/GameBoard/GameBoard.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { PlayerState, GameSettings, Card as CardType, GameState } from '../../types';
import { getCardsFromDB } from '../../utils/db';
import LayoutOne from '../Layouts/LayoutOne';
import LayoutTwo from '../Layouts/LayoutTwo';
import './GameBoard.css';

interface GameBoardProps {
    imagesDirectoryHandle: FileSystemDirectoryHandle | null;
    settings: GameSettings;
    initialState?: GameState | null;
    activeOpponentId: string | null;
    onOpponentChange: (id: string | null) => void;
}

export interface GameBoardHandle {
    getGameState: () => GameState | null;
}

const shuffleDeck = (deck: CardType[]): CardType[] => {
  return [...deck].sort(() => Math.random() - 0.5);
};

const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(({ imagesDirectoryHandle, settings, initialState, activeOpponentId, onOpponentChange }, ref) => {
  const [playerStates, setPlayerStates] = useState<PlayerState[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing game...');

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
          
          // --- MODIFIED --- This block is updated to ensure truly unique instance IDs per game.
          const oldIdToNewIdMap = new Map<string, string>();

          // Create all card instances for this player, giving each a new unique ID for this game session.
          const allPlayerCards: CardType[] = deckData.cards.map(cardStub => {
              const fullCardData = cardDataMap.get(cardStub.id);
              if (!fullCardData) return null;

              const newInstanceId = crypto.randomUUID();
              // If the card had an ID in the file (likely for commander tracking), map it to the new ID.
              if (cardStub.instanceId) {
                  oldIdToNewIdMap.set(cardStub.instanceId, newInstanceId);
              }

              return {
                  ...fullCardData,
                  instanceId: newInstanceId,
                  isTapped: false,
                  isFlipped: false,
              };
          }).filter((c): c is CardType => c !== null);

          // Using the map, find the new, unique instanceIds for the cards designated as commanders.
          const commanderInstanceIds = new Set(
              (deckData.commanders || []).map(oldId => oldIdToNewIdMap.get(oldId)).filter(Boolean)
          );

          const commanders: CardType[] = [];
          const mainDeck: CardType[] = [];

          // Partition the newly created cards into commanders and the main deck using the new IDs.
          allPlayerCards.forEach(card => {
              if (card.instanceId && commanderInstanceIds.has(card.instanceId)) {
                  commanders.push(card);
              } else {
                  mainDeck.push(card);
              }
          });
          // --- END MODIFICATION ---

          const shuffledLibrary = shuffleDeck(mainDeck);
          const initialHand = shuffledLibrary.slice(0, 7);
          const library = shuffledLibrary.slice(7);

          return {
            id: playerConfig.id,
            name: playerConfig.name,
            color: playerConfig.color,
            life: 40,
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
  
  const updateCardState = (cardInstanceId: string, update: (card: CardType) => CardType) => {
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
  };

  const handleCardTap = (cardInstanceId: string) => {
      updateCardState(cardInstanceId, card => ({...card, isTapped: !card.isTapped}));
  };

  const handleCardFlip = (cardInstanceId: string) => {
      updateCardState(cardInstanceId, card => ({...card, isFlipped: !card.isFlipped}));
  };

  const handleCardContextMenu = (event: React.MouseEvent, card: CardType) => {
      event.preventDefault();
      console.log("Context menu for:", card.name, card.instanceId);
  };
  
  if (isLoading) {
    return <div className="game-loading"><h2>{loadingMessage}</h2></div>;
  }
  if (error) {
    return <div className="game-loading error-message"><h2>Error</h2><p>{error}</p></div>;
  }
  if (!playerStates) {
    return <div className="game-loading"><h2>Could not initialize players.</h2></div>;
  }
    
  const interactionProps = {
      imagesDirectoryHandle,
      onCardTap: handleCardTap,
      onCardFlip: handleCardFlip,
      onCardContextMenu: handleCardContextMenu,
  };

  return (
    <div className="game-board">
      {settings.layout === '1vAll' ? (
        <LayoutOne 
          playerStates={playerStates} 
          activeOpponentId={activeOpponentId}
          {...interactionProps}
        />
      ) : (
        <LayoutTwo 
          playerStates={playerStates} 
          {...interactionProps}
        />
      )}
    </div>
  );
});

export default GameBoard;
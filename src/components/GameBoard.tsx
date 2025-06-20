// src/components/GameBoard.tsx
import React, { useState, useEffect } from 'react';
import type { PlayerState, GameSettings, Card as CardType } from '../types';
import { getCardsFromNames } from '../api/scryfall';
import { getCardsFromDB } from '../utils/db';
import LayoutOne from './LayoutOne';
import LayoutTwo from './LayoutTwo';

interface GameBoardProps {
    imagesDirectoryHandle: FileSystemDirectoryHandle | null;
    settings: GameSettings;
}

// A simple array shuffle function
const shuffleDeck = (deck: CardType[]): CardType[] => {
  return deck.sort(() => Math.random() - 0.5);
};

const GameBoard: React.FC<GameBoardProps> = ({ imagesDirectoryHandle, settings }) => {
  const [playerStates, setPlayerStates] = useState<PlayerState[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // --- FIX --- Added the missing state for the loading message.
  const [loadingMessage, setLoadingMessage] = useState('Initializing game...');

  useEffect(() => {
    const initializeGame = async () => {
      setIsLoading(true);
      setError('');
      try {
        // Step 1: Read all deck files and parse them.
        setLoadingMessage('Reading deck files...');
        const deckFilePromises = settings.players.map(p => {
            if (!p.deckFile) throw new Error(`Player ${p.name} has no deck file.`);
            return p.deckFile.getFile().then(file => file.text().then(text => JSON.parse(text)));
        });
        const parsedDecks: { name: string, cards: CardType[], commanders?: string[] }[] = await Promise.all(deckFilePromises);

        // Step 2: Gather all unique card IDs from all decks.
        const allCardIds = new Set<string>();
        parsedDecks.forEach(deck => {
          deck.cards.forEach(card => allCardIds.add(card.id));
        });

        // Step 3: Fetch all required cards from IndexedDB.
        setLoadingMessage(`Loading ${allCardIds.size} cards from local cache...`);
        const cachedCards = await getCardsFromDB(Array.from(allCardIds));
        const cardDataMap = new Map(cachedCards.map(c => [c.id, c]));

        // Step 4: Identify any cards that were NOT in the cache.
        const missingCardIds = Array.from(allCardIds).filter(id => !cardDataMap.has(id));
        if (missingCardIds.length > 0) {
          console.warn(`Could not find ${missingCardIds.length} cards in the local DB. Game may be incomplete.`);
          // A more robust solution could re-fetch missing cards here.
        }

        // Step 5: Create initial PlayerState for each player.
        setLoadingMessage('Shuffling decks and drawing hands...');
        const initialPlayerStates: PlayerState[] = settings.players.map((playerConfig, index) => {
          const deckData = parsedDecks[index];
          const commanderInstanceIds = new Set(deckData.commanders || []);
          
          const commanders: CardType[] = [];
          const mainDeck: CardType[] = [];

          deckData.cards.forEach(cardStub => {
            const fullCardData = cardDataMap.get(cardStub.id);
            if (fullCardData) {
              const cardWithInstance = { ...fullCardData, instanceId: cardStub.instanceId || crypto.randomUUID() };
              if (commanderInstanceIds.has(cardWithInstance.instanceId)) {
                commanders.push(cardWithInstance);
              } else {
                mainDeck.push(cardWithInstance);
              }
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

    initializeGame();
  }, [settings]);

  // --- FIX --- The loading indicator now displays the dynamic message from the state.
  if (isLoading) {
    return <div className="game-loading"><h2>{loadingMessage}</h2></div>;
  }
  if (error) {
    return <div className="game-loading error-message"><h2>Error</h2><p>{error}</p></div>;
  }
  if (!playerStates) {
    return <div className="game-loading"><h2>Could not initialize players.</h2></div>;
  }

  if (settings.layout === '1vAll') {
    return <LayoutOne playerStates={playerStates} imagesDirectoryHandle={imagesDirectoryHandle} />;
  }
  
  return <LayoutTwo playerStates={playerStates} imagesDirectoryHandle={imagesDirectoryHandle} />;
};

export default GameBoard;
// src/components/GameBoard.tsx
import React, { useState } from 'react';
import type { PlayerState, Card } from '../types';
import { getCardsFromNames } from '../api/scryfall';
import PlayerZone from './PlayerZone.tsx';
import GameControls from './GameControls.tsx';

interface GameBoardProps {
    imagesDirectoryHandle: FileSystemDirectoryHandle | null;
}

// A simple array shuffle function
const shuffleDeck = (deck: Card[]): Card[] => {
  return deck.sort(() => Math.random() - 0.5);
};

// --- Sample Decks (a simple 20-card deck for testing) ---
const playerDecklist = [
  "Island", "Island", "Island", "Island", "Mountain", "Mountain", "Mountain", "Mountain",
  "Delver of Secrets", "Delver of Secrets", "Dragon's Rage Channeler", "Dragon's Rage Channeler",
  "Lightning Bolt", "Lightning Bolt", "Consider", "Consider", "Spell Pierce", "Spell Pierce",
  "Expressive Iteration", "Expressive Iteration",
];

const opponentDecklist = [
  "Forest", "Forest", "Forest", "Forest", "Plains", "Plains", "Plains", "Plains",
  "Llanowar Elves", "Llanowar Elves", "Avacyn's Pilgrim", "Avacyn's Pilgrim",
  "Grizzly Bears", "Grizzly Bears", "Voice of Resurgence", "Voice of Resurgence",
  "Swords to Plowshares", "Swords to Plowshares", "Rancor", "Rancor",
];
// -----------------------------------------------------------

const GameBoard: React.FC<GameBoardProps> = ({ imagesDirectoryHandle }) => {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [opponentState, setOpponentState] = useState<PlayerState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const startGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch all card data for both decks in parallel
      const [playerDeckData, opponentDeckData] = await Promise.all([
        getCardsFromNames(playerDecklist),
        getCardsFromNames(opponentDecklist)
      ]);

      const shuffledPlayerDeck = shuffleDeck(playerDeckData);
      const shuffledOpponentDeck = shuffleDeck(opponentDeckData);

      // Set initial state for both players
      setPlayerState({
        life: 20,
        library: shuffledPlayerDeck.slice(7),
        hand: shuffledPlayerDeck.slice(0, 7),
        graveyard: [],
        battlefield: [],
      });

      setOpponentState({
        life: 20,
        library: shuffledOpponentDeck.slice(7),
        hand: shuffledOpponentDeck.slice(0, 7),
        graveyard: [],
        battlefield: [],
      });

    } catch (err) {
      console.error("Failed to start game:", err);
      setError("Could not fetch card data to start the game. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render logic
  if (isLoading) {
    return <div className="game-loading"><h2>Setting up the game...</h2></div>;
  }
  if (error) {
    return <div className="game-loading error-message"><h2>Error</h2><p>{error}</p></div>;
  }
  if (!playerState || !opponentState) {
    return (
      <div className="game-loading">
        <button onClick={startGame}>Start New Game</button>
      </div>
    );
  }

  return (
    <div className="game-board">
      <PlayerZone player="Opponent" playerState={opponentState} imagesDirectoryHandle={imagesDirectoryHandle} />
      <GameControls />
      <PlayerZone player="Player" playerState={playerState} imagesDirectoryHandle={imagesDirectoryHandle} />
    </div>
  );
};

export default GameBoard;
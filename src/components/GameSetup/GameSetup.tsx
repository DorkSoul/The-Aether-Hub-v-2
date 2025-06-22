// src/components/GameSetup.tsx
import React, { useState, useEffect } from 'react';
import type { PlayerConfig, GameSettings, GameState } from '../../types';
import PlayerSetupRow from '../PlayerSetupRow/PlayerSetupRow';
import { loadGameState } from '../../utils/gameUtils';
import './GameSetup.css';

interface GameSetupProps {
  decksDirectoryHandle: FileSystemDirectoryHandle | null;
  onStartGame: (settings: GameSettings) => void;
  onLoadGame: (gameState: GameState) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ decksDirectoryHandle, onStartGame, onLoadGame }) => {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { id: '1', name: 'Player 1', deckFile: null, color: '#ff0000' },
    { id: '2', name: 'Player 2', deckFile: null, color: '#0000ff' },
  ]);
  const [deckFiles, setDeckFiles] = useState<FileSystemFileHandle[]>([]);
  const [layout, setLayout] = useState<GameSettings['layout']>('1vAll');
  const [playAreaLayout, setPlayAreaLayout] = useState<GameSettings['playAreaLayout']>('rows');

  useEffect(() => {
    const loadDecks = async () => {
      if (!decksDirectoryHandle) return;
      const files: FileSystemFileHandle[] = [];
      for await (const entry of decksDirectoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          files.push(entry);
        }
      }
      setDeckFiles(files);
    };
    loadDecks();
  }, [decksDirectoryHandle]);

  const handleAddPlayer = () => {
    if (players.length < 8) {
      const newPlayerId = (players.length + 1).toString();
      const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      setPlayers([...players, { id: newPlayerId, name: `Player ${newPlayerId}`, deckFile: null, color: randomColor }]);
    }
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length > 2) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  const handleUpdatePlayer = (id: string, field: keyof PlayerConfig, value: any) => {
    setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  
  const handleLoadGame = async () => {
      const gameState = await loadGameState();
      if (gameState) {
          onLoadGame(gameState);
      }
  };

  const isSetupComplete = players.every(p => p.name.trim() !== '' && p.deckFile !== null);

  const handleStart = () => {
    if (isSetupComplete) {
      onStartGame({ players, layout, playAreaLayout });
    }
  };

  if (!decksDirectoryHandle) {
    return (
      <div className="game-loading">
        <h2>Please select an app folder first.</h2>
        <p>You need to select a folder to store and access your decks before starting a game.</p>
      </div>
    );
  }
  
  return (
    <div className="game-setup">
        <div className="game-setup-actions">
            <button onClick={handleStart} disabled={!isSetupComplete} className="start-game-btn">
                Start New Game
            </button>
            <button onClick={handleLoadGame} className="start-game-btn">
                Load Game
            </button>
        </div>

      <h2>New Game Setup</h2>
      
      <div className="setup-section">
        <h3>Players</h3>
        <div className="player-list">
          {players.map(p => (
            <PlayerSetupRow
              key={p.id}
              player={p}
              deckFiles={deckFiles}
              onUpdate={(field, value) => handleUpdatePlayer(p.id, field, value)}
              onRemove={() => handleRemovePlayer(p.id)}
              isRemoveable={players.length > 2}
            />
          ))}
        </div>
        <button onClick={handleAddPlayer} disabled={players.length >= 8}>
          Add Player
        </button>
      </div>

      <div className="setup-section">
        <h3>Game Layout</h3>
        <div className="layout-options">
          <label>
            <input
              type="radio"
              name="layout"
              value="1vAll"
              checked={layout === '1vAll'}
              onChange={() => setLayout('1vAll')}
            />
            1 vs. All (Tabbed opponents)
          </label>
          <label>
            <input
              type="radio"
              name="layout"
              value="split"
              checked={layout === 'split'}
              onChange={() => setLayout('split')}
            />
            Split Screen
          </label>
        </div>
      </div>
      
      <div className="setup-section">
        <h3>Play Area</h3>
        <div className="layout-options">
          <label>
            <input
              type="radio"
              name="playAreaLayout"
              value="rows"
              checked={playAreaLayout === 'rows'}
              onChange={() => setPlayAreaLayout('rows')}
            />
            4 Rows
          </label>
          <label>
            <input
              type="radio"
              name="playAreaLayout"
              value="freeform"
              checked={playAreaLayout === 'freeform'}
              onChange={() => setPlayAreaLayout('freeform')}
            />
            Freeform
          </label>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
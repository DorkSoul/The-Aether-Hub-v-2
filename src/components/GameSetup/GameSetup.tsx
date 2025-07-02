// src/components/GameSetup.tsx
import React, { useState, useEffect } from 'react';
import type { PlayerConfig, GameSettings, GameState } from '../../types';
import PlayerSetupRow from '../PlayerSetupRow/PlayerSetupRow';
import { loadGameState } from '../../utils/gameUtils';
import P2PControls from '../P2PControls/P2PControls';
import './GameSetup.css';

interface GameSetupProps {
  decksDirectoryHandle: FileSystemDirectoryHandle | null;
  savesDirectoryHandle: FileSystemDirectoryHandle | null;
  onStartGame: (settings: GameSettings) => void;
  onLoadGame: (gameState: GameState) => void;
  peerId: string | null;
  onHost: () => void;
  onJoin: (hostId: string) => void;
  onLeave: () => void;
  onKick: (peerId: string) => void;
  isConnected: boolean;
  isHost: boolean;
  connectedPeers: string[];
}

// Helper function to convert HEX to HSL color values
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};


// Helper function to convert HSL color values to a HEX string
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const GameSetup: React.FC<GameSetupProps> = ({ decksDirectoryHandle, savesDirectoryHandle, onStartGame, onLoadGame, peerId, onHost, onJoin, onLeave, onKick, isConnected, isHost, connectedPeers }) => {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { id: '1', name: 'Player 1', deckFile: null, color: '#ff0000' },
    { id: '2', name: 'Player 2', deckFile: null, color: '#0000ff' },
  ]);
  const [deckFiles, setDeckFiles] = useState<FileSystemFileHandle[]>([]);
  const [layout, setLayout] = useState<GameSettings['layout']>('tabs');
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
      if (files.length > 0) {
        setPlayers(prevPlayers => prevPlayers.map(p => ({
          ...p,
          deckFile: p.deckFile || files[0],
        })))
      }
    };
    loadDecks();
  }, [decksDirectoryHandle]);

  const handleAddPlayer = () => {
    if (players.length < 8) {
      const newPlayerId = (players.length + 1).toString();
      
      const existingHues = players.map(p => hexToHsl(p.color).h);
      let newHue: number;
      let attempt = 0;
      const maxAttempts = 20; // Prevent infinite loops
      const minHueDistance = 30; // Minimum distance between hues on the 360-degree color wheel

      do {
          newHue = Math.floor(Math.random() * 360);
          attempt++;
      } while (
          attempt < maxAttempts &&
          existingHues.some(existingHue => {
              const diff = Math.abs(existingHue - newHue);
              return Math.min(diff, 360 - diff) < minHueDistance;
          })
      );

      // Generate a bright, non-pastel color and convert to HEX
      const vibrantColor = hslToHex(newHue, 90, 55); // High saturation, mid-range lightness

      setPlayers([...players, { id: newPlayerId, name: `Player ${newPlayerId}`, deckFile: deckFiles.length > 0 ? deckFiles[0] : null, color: vibrantColor }]);
    }
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const handleUpdatePlayer = (id: string, field: keyof PlayerConfig, value: any) => {
    setPlayers(players.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };
  
  const handleLoadGameClick = async () => {
      const gameState = await loadGameState(savesDirectoryHandle);
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
      <P2PControls
        peerId={peerId}
        onHost={onHost}
        onJoin={onJoin}
        onLeave={onLeave}
        onKick={onKick}
        isConnected={isConnected}
        isHost={isHost}
        connectedPeers={connectedPeers}
      />
      <div className="game-setup-actions">
        <button onClick={handleStart} disabled={!isSetupComplete} className="start-game-btn">
          Start New Game
        </button>
        <button onClick={handleLoadGameClick} className="start-game-btn">
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
              isRemoveable={true}
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
          <button
            className={layout === 'tabs' ? 'active' : ''}
            onClick={() => setLayout('tabs')}
          >
            1 vs. All (Tabbed opponents)
          </button>
          <button
            className={layout === 'split' ? 'active' : ''}
            onClick={() => setLayout('split')}
          >
            Split Screen
          </button>
        </div>
      </div>
      
      <div className="setup-section">
        <h3>Play Area</h3>
        <div className="layout-options">
           <button
            className={playAreaLayout === 'rows' ? 'active' : ''}
            onClick={() => setPlayAreaLayout('rows')}
          >
            4 Rows
          </button>
          <button
            className={playAreaLayout === 'freeform' ? 'active' : ''}
            onClick={() => setPlayAreaLayout('freeform')}
          >
            Freeform
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
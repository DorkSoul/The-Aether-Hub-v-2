// src/components/PlayerSetupRow.tsx
import React from 'react';
import type { PlayerConfig } from '../../types';

interface PlayerSetupRowProps {
  player: PlayerConfig;
  deckFiles: FileSystemFileHandle[];
  onUpdate: (field: keyof PlayerConfig, value: any) => void;
  onRemove: () => void;
  isRemoveable: boolean;
}

const PlayerSetupRow: React.FC<PlayerSetupRowProps> = ({ player, deckFiles, onUpdate, onRemove, isRemoveable }) => {
  return (
    <div className="player-setup-row">
      <input
        type="color"
        value={player.color}
        onChange={(e) => onUpdate('color', e.target.value)}
        className="player-color-input"
        title="Select player color"
      />
      <input
        type="text"
        placeholder={`Player ${player.id}`}
        value={player.name}
        onChange={(e) => onUpdate('name', e.target.value)}
        className="player-name-input"
      />
      <select
        value={player.deckFile?.name || ''}
        onChange={(e) => {
          const selectedFile = deckFiles.find(f => f.name === e.target.value);
          onUpdate('deckFile', selectedFile || null);
        }}
        className="player-deck-select"
        required
      >
        <option value="" disabled>Select a deck</option>
        {deckFiles.map(file => (
          <option key={file.name} value={file.name}>
            {file.name.replace('.json', '')}
          </option>
        ))}
      </select>
      {isRemoveable && (
        <button onClick={onRemove} className="remove-player-btn">
          Remove
        </button>
      )}
    </div>
  );
};

export default PlayerSetupRow;
// src/components/PlayerSetupRow.tsx
import React, { useState, useEffect } from 'react';
import type { PlayerConfig } from '../../types';

interface PlayerSetupRowProps {
  player: PlayerConfig;
  deckFiles: FileSystemFileHandle[];
  onUpdate: (field: keyof PlayerConfig, value: any) => void;
  onRemove: () => void;
  onKick: () => void;
  isRemoveable: boolean;
  isLocalPlayer: boolean;
  isMultiplayerClient: boolean;
  isHost: boolean;
}

interface DeckInfo {
    fileHandle: FileSystemFileHandle;
    displayName: string;
}

const PlayerSetupRow: React.FC<PlayerSetupRowProps> = ({ player, deckFiles, onUpdate, onRemove, onKick, isRemoveable, isLocalPlayer, isMultiplayerClient, isHost }) => {
    const [deckInfos, setDeckInfos] = useState<DeckInfo[]>([]);

    useEffect(() => {
        const fetchDeckNames = async () => {
            const infos = await Promise.all(
                deckFiles.map(async (fileHandle) => {
                    try {
                        const file = await fileHandle.getFile();
                        const text = await file.text();
                        const deckData = JSON.parse(text);
                        return { fileHandle, displayName: deckData.name || fileHandle.name.replace('.json', '') };
                    } catch (e) {
                        return { fileHandle, displayName: fileHandle.name.replace('.json', '') };
                    }
                })
            );
            setDeckInfos(infos);
        };
        fetchDeckNames();
    }, [deckFiles]);

  const isMultiplayer = isHost || isMultiplayerClient;

  return (
    <div className="player-setup-row">
      <input
        type="color"
        value={player.color}
        onChange={(e) => onUpdate('color', e.target.value)}
        className="player-color-input"
        title="Select player color"
        disabled={!isLocalPlayer && isMultiplayer}
      />
      {isMultiplayer ? (
        <div className="player-name-display">{player.name}</div>
      ) : (
        <input
          type="text"
          placeholder={`Player ${player.id}`}
          value={player.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          className="player-name-input"
        />
      )}
      <div className="player-deck-container">
        {isLocalPlayer || !isMultiplayer ? (
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
            {deckInfos.map(info => (
              <option key={info.fileHandle.name} value={info.fileHandle.name}>
                {info.displayName}
              </option>
            ))}
          </select>
        ) : (
          <div className="player-deck-display">{player.deckName || 'No deck selected'}</div>
        )}
      </div>
      <div className="player-action-cell">
        {isHost && !isLocalPlayer && (
          <button onClick={onKick} className="remove-player-btn">
            Kick
          </button>
        )}
        {!isHost && isRemoveable && (
          <button onClick={onRemove} className="remove-player-btn">
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerSetupRow;
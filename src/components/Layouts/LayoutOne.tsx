// src/components/Layouts/LayoutOne.tsx
import React from 'react';
import type { PlayerState, Card as CardType } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface LayoutOneProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  activeOpponentId: string | null;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
}

const LayoutOne: React.FC<LayoutOneProps> = ({ playerStates, imagesDirectoryHandle, activeOpponentId, ...interactionProps }) => {
  const localPlayer = playerStates[0];
  const opponents = playerStates.slice(1);
  const activeOpponent = opponents.find(p => p.id === activeOpponentId);

  return (
    <div className="game-layout-1vAll">
      <div className="top-section">
        {activeOpponent ? (
          <PlayerZone
            playerState={activeOpponent}
            isFlipped={true}
            imagesDirectoryHandle={imagesDirectoryHandle}
            {...interactionProps}
          />
        ) : (
          <div className="game-loading">
            <p>No opponent to display.</p>
          </div>
        )}
      </div>
      <div className="bottom-section">
        <PlayerZone
          playerState={localPlayer}
          isFlipped={false}
          imagesDirectoryHandle={imagesDirectoryHandle}
          {...interactionProps}
        />
      </div>
    </div>
  );
};

export default LayoutOne;
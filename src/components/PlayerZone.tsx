// src/components/PlayerZone.tsx
import React from 'react';
import type { PlayerState } from '../types';
import Card from './Card';
import SideZones from './SideZones';

interface PlayerZoneProps {
  playerState: PlayerState;
  isFlipped: boolean;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
}

const PlayerZone: React.FC<PlayerZoneProps> = ({ playerState, isFlipped, imagesDirectoryHandle }) => {
  // --- MODIFIED --- No longer applies a CSS transform. The 'flipped' class will now control flex-direction.
  const playerZoneClasses = `player-zone ${isFlipped ? 'flipped' : ''}`;

  return (
    <div className={playerZoneClasses} style={{ '--player-color': playerState.color } as React.CSSProperties}>
      <div className="player-header">
        <h3>{playerState.name}: {playerState.life} Life</h3>
      </div>
      <div className="play-area">
        <SideZones
          playerState={playerState}
          isFlipped={isFlipped}
          imagesDirectoryHandle={imagesDirectoryHandle}
        />
        <div className="battlefield">
          {playerState.battlefield.map((row, rowIndex) => (
            <div key={rowIndex} className="battlefield-row">
              {row.map((card, cardIndex) => (
                <Card
                  key={card.instanceId || `${card.id}-${cardIndex}`}
                  card={card}
                  imageDirectoryHandle={imagesDirectoryHandle}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="hand">
        {playerState.hand.map((card, index) => (
          <Card
            key={card.instanceId || `${card.id}-${index}`}
            card={card}
            imageDirectoryHandle={imagesDirectoryHandle}
            // --- MODIFIED --- size prop is removed to allow CSS to control the size
          />
        ))}
      </div>
    </div>
  );
};

export default PlayerZone;
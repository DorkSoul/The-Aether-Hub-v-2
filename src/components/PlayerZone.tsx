// src/components/PlayerZone.tsx
import React from 'react';
import type { PlayerState } from '../types';
import Card from './Card';

interface PlayerZoneProps {
  playerState: PlayerState;
  isFlipped: boolean;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
}

const PlayerZone: React.FC<PlayerZoneProps> = ({ playerState, isFlipped, imagesDirectoryHandle }) => {
  const playerZoneClasses = `player-zone ${isFlipped ? 'flipped' : ''}`;

  // JSX for each side zone is defined here for clarity
  const commandZoneJsx = (
      <div className="zone command-zone" title="Command Zone">
        <div className="cards-container">
            {playerState.commandZone.length > 0 ?
                playerState.commandZone.map((card, index) => (
                    <Card key={card.instanceId || index} card={card} imageDirectoryHandle={imagesDirectoryHandle} />
                )) :
                <div className="card-outline">
                    <span className="zone-label-full">Command</span>
                </div>
            }
        </div>
      </div>
  );

  const exileZoneJsx = (
      <div className="zone" title="Exile">
        <div className="card-outline">
            {playerState.exile.length > 0 ? (
                <Card card={playerState.exile[playerState.exile.length - 1]} imageDirectoryHandle={imagesDirectoryHandle} />
            ) : <span className="zone-label-full">Exile</span>}
            {playerState.exile.length > 0 && <span className="zone-count">{playerState.exile.length}</span>}
        </div>
      </div>
  );

  const graveyardZoneJsx = (
      <div className="zone" title="Graveyard">
        <div className="card-outline">
            {playerState.graveyard.length > 0 ? (
                <Card card={playerState.graveyard[playerState.graveyard.length - 1]} imageDirectoryHandle={imagesDirectoryHandle} />
            ) : <span className="zone-label-full">Graveyard</span>}
            {playerState.graveyard.length > 0 && <span className="zone-count">{playerState.graveyard.length}</span>}
        </div>
      </div>
  );

  const libraryZoneJsx = (
      <div className="zone" title="Library">
        <div className="card-outline">
            {playerState.library.length > 0 ? <div className="card-back-mockup"></div> : <span className="zone-label-full">Library</span>}
            {playerState.library.length > 0 && <span className="zone-count">{playerState.library.length}</span>}
        </div>
      </div>
  );

  // An array mapping each zone to its corresponding battlefield row index
  const zones = [commandZoneJsx, exileZoneJsx, graveyardZoneJsx, libraryZoneJsx];

  return (
    <div className={playerZoneClasses} style={{ '--player-color': playerState.color } as React.CSSProperties}>
      <div className="player-header">
        <h3>{playerState.name}: {playerState.life} Life</h3>
      </div>
      <div className="play-area">
        {/* Map over the battlefield rows and pair each with a side zone */}
        {playerState.battlefield.map((row, index) => (
            <div key={index} className="game-row">
                {zones[index]}
                <div className="battlefield-row">
                    {row.map((card, cardIndex) => (
                        <Card
                        key={card.instanceId || `${card.id}-${cardIndex}`}
                        card={card}
                        imageDirectoryHandle={imagesDirectoryHandle}
                        />
                    ))}
                </div>
            </div>
        ))}
      </div>
      <div className="hand">
        {playerState.hand.map((card, index) => (
          <Card
            key={card.instanceId || `${card.id}-${index}`}
            card={card}
            imageDirectoryHandle={imagesDirectoryHandle}
          />
        ))}
      </div>
    </div>
  );
};

export default PlayerZone;
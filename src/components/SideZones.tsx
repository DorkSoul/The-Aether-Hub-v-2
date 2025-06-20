// src/components/SideZones.tsx
import React from 'react';
import type { Card as CardType } from '../types';
import Card from './Card';

interface SideZonesProps {
  playerState: {
    commandZone: CardType[];
    exile: CardType[];
    graveyard: CardType[];
    library: CardType[];
  };
  isFlipped: boolean;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
}

const SideZones: React.FC<SideZonesProps> = ({ playerState, isFlipped, imagesDirectoryHandle }) => {
  return (
    <div className={`side-zones ${isFlipped ? 'flipped' : ''}`}>
      {/* Command Zone can contain multiple cards */}
      <div className="zone command-zone" title="Command Zone">
        <div className="zone-label">C</div>
        <div className="cards-container">
            {playerState.commandZone.map((card, index) => (
                <Card key={card.instanceId || index} card={card} imageDirectoryHandle={imagesDirectoryHandle} size={80} />
            ))}
            {playerState.commandZone.length === 0 && <div className="card-outline"></div>}
        </div>
      </div>

      {/* Exile Zone */}
      <div className="zone" title="Exile">
        <div className="zone-label">E</div>
        <div className="card-outline">
            {playerState.exile.length > 0 ? (
                <Card card={playerState.exile[playerState.exile.length - 1]} imageDirectoryHandle={imagesDirectoryHandle} size={80} />
            ) : null}
            <span className="zone-count">{playerState.exile.length}</span>
        </div>
      </div>

      {/* Graveyard Zone */}
      <div className="zone" title="Graveyard">
        <div className="zone-label">G</div>
        <div className="card-outline">
            {playerState.graveyard.length > 0 ? (
                <Card card={playerState.graveyard[playerState.graveyard.length - 1]} imageDirectoryHandle={imagesDirectoryHandle} size={80} />
            ) : null}
            <span className="zone-count">{playerState.graveyard.length}</span>
        </div>
      </div>
      
      {/* Library Zone */}
      <div className="zone" title="Library">
        <div className="zone-label">L</div>
        <div className="card-outline">
            {playerState.library.length > 0 && <div className="card-back-mockup"></div>}
            <span className="zone-count">{playerState.library.length}</span>
        </div>
      </div>
    </div>
  );
};

export default SideZones;
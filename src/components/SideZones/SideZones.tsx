// src/components/SideZones.tsx
import React from 'react';
import type { Card as CardType } from '../../types';
import Card from '../Card/Card';

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
      {/* Command Zone */}
      <div className="zone command-zone" title="Command Zone">
        <div className="cards-container">
            {playerState.commandZone.length > 0 ?
                playerState.commandZone.map((card, index) => (
                    <Card key={card.instanceId || index} card={card} imageDirectoryHandle={imagesDirectoryHandle} size={80} />
                )) :
                <div className="card-outline">
                    <span className="zone-label-full">Command</span>
                </div>
            }
        </div>
      </div>

      {/* Exile Zone */}
      <div className="zone" title="Exile">
        <div className="card-outline">
            {playerState.exile.length > 0 ? (
                <Card card={playerState.exile[playerState.exile.length - 1]} imageDirectoryHandle={imagesDirectoryHandle} size={80} />
            ) : <span className="zone-label-full">Exile</span>}
            {playerState.exile.length > 0 && <span className="zone-count">{playerState.exile.length}</span>}
        </div>
      </div>

      {/* Graveyard Zone */}
      <div className="zone" title="Graveyard">
        <div className="card-outline">
            {playerState.graveyard.length > 0 ? (
                <Card card={playerState.graveyard[playerState.graveyard.length - 1]} imageDirectoryHandle={imagesDirectoryHandle} size={80} />
            ) : <span className="zone-label-full">Graveyard</span>}
            {playerState.graveyard.length > 0 && <span className="zone-count">{playerState.graveyard.length}</span>}
        </div>
      </div>
      
      {/* Library Zone */}
      <div className="zone" title="Library">
        <div className="card-outline">
            {playerState.library.length > 0 ? <div className="card-back-mockup"></div> : <span className="zone-label-full">Library</span>}
            {playerState.library.length > 0 && <span className="zone-count">{playerState.library.length}</span>}
        </div>
      </div>
    </div>
  );
};

export default SideZones;
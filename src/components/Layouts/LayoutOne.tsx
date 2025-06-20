// src/components/LayoutOne.tsx
import React, { useState } from 'react';
import type { PlayerState } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import Tabs from '../Tabs/Tabs';
import './Layouts.css';

interface LayoutOneProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
}

const LayoutOne: React.FC<LayoutOneProps> = ({ playerStates, imagesDirectoryHandle }) => {
  const localPlayer = playerStates[0];
  const opponents = playerStates.slice(1);
  const [activeOpponentId, setActiveOpponentId] = useState(opponents[0]?.id || '');

  const activeOpponent = opponents.find(p => p.id === activeOpponentId);

  return (
    <div className="game-layout-1vAll">
      <div className="top-section">
        <Tabs
          items={opponents.map(p => p.name)}
          activeItem={activeOpponent?.name || ''}
          onItemClick={(name) => {
            const opponent = opponents.find(p => p.name === name);
            if (opponent) setActiveOpponentId(opponent.id);
          }}
        />
        {activeOpponent && (
          <PlayerZone
            playerState={activeOpponent}
            isFlipped={true}
            imagesDirectoryHandle={imagesDirectoryHandle}
          />
        )}
      </div>
      <div className="bottom-section">
        <PlayerZone
          playerState={localPlayer}
          isFlipped={false}
          imagesDirectoryHandle={imagesDirectoryHandle}
        />
      </div>
    </div>
  );
};

export default LayoutOne;
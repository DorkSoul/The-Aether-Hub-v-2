// src/components/LayoutTwo.tsx
import React from 'react';
import type { PlayerState } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface LayoutTwoProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
}

const LayoutTwo: React.FC<LayoutTwoProps> = ({ playerStates, imagesDirectoryHandle }) => {
  const topPlayers: PlayerState[] = [];
  const bottomPlayers: PlayerState[] = [];

  // Distribute players to top and bottom rows
  playerStates.forEach((player, index) => {
    if (index % 2 === 0) { // Player 1, 3, 5... go to bottom
      bottomPlayers.push(player);
    } else { // Player 2, 4, 6... go to top
      topPlayers.push(player);
    }
  });

  return (
    <div className="game-layout-split">
      <div className="top-players">
        {topPlayers.map(player => (
          <PlayerZone
            key={player.id}
            playerState={player}
            isFlipped={true}
            imagesDirectoryHandle={imagesDirectoryHandle}
          />
        ))}
      </div>
      <div className="bottom-players">
        {bottomPlayers.map(player => (
          <PlayerZone
            key={player.id}
            playerState={player}
            isFlipped={false}
            imagesDirectoryHandle={imagesDirectoryHandle}
          />
        ))}
      </div>
    </div>
  );
};

export default LayoutTwo;
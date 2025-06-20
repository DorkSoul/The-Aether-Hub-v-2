// src/components/Layouts/LayoutOne.tsx
import React from 'react'; // Removed useState as it's no longer needed here
import type { PlayerState } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
// import Tabs from '../Tabs/Tabs'; // Tabs are no longer rendered here
import './Layouts.css';

interface LayoutOneProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  // --- MODIFIED --- Now receives the active opponent ID from props.
  activeOpponentId: string | null;
}

const LayoutOne: React.FC<LayoutOneProps> = ({ playerStates, imagesDirectoryHandle, activeOpponentId }) => {
  const localPlayer = playerStates[0];
  const opponents = playerStates.slice(1);
  
  // --- MODIFIED --- No local state. The active opponent is found based on the prop.
  const activeOpponent = opponents.find(p => p.id === activeOpponentId);

  return (
    <div className="game-layout-1vAll">
      <div className="top-section">
        {/* --- MODIFIED --- The Tabs component has been removed from here. */}
        {activeOpponent ? (
          <PlayerZone
            playerState={activeOpponent}
            isFlipped={true}
            imagesDirectoryHandle={imagesDirectoryHandle}
          />
        ) : (
          <div className="game-loading">
             {/* Show a message if there's no active opponent (e.g., in a 1-player game) */}
            <p>No opponent to display.</p>
          </div>
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
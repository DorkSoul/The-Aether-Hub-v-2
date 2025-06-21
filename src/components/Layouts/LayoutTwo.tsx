// src/components/Layouts/LayoutTwo.tsx
import React from 'react';
import type { PlayerState, Card as CardType, CardLocation } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface LayoutTwoProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onCardDragStart: (card: CardType, source: CardLocation) => void;
  onLibraryDragStart: (source: CardLocation) => void;
  onZoneDrop: (destination: CardLocation) => void;
  onZoneDragOver: (event: React.DragEvent, destination: CardLocation) => void;
  onZoneDragLeave: (event: React.DragEvent) => void;
  dropTarget: CardLocation | null;
  onCardHover: (card: CardType | null) => void;
  cardPreview: React.ReactNode;
  stackPanel: React.ReactNode;
}

const LayoutTwo: React.FC<LayoutTwoProps> = ({ playerStates, imagesDirectoryHandle, cardPreview, stackPanel, ...interactionProps }) => {
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
            {...interactionProps}
          />
        ))}
        {stackPanel}
      </div>
      <div className="bottom-players">
        {bottomPlayers.map(player => (
          <PlayerZone
            key={player.id}
            playerState={player}
            isFlipped={false}
            imagesDirectoryHandle={imagesDirectoryHandle}
            {...interactionProps}
          />
        ))}
        {cardPreview}
      </div>
    </div>
  );
};

export default React.memo(LayoutTwo);
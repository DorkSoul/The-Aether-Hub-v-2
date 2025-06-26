// src/components/Layouts/LayoutTwo.tsx
import React from 'react';
import type { PlayerState, Card as CardType, CardLocation, ManaType } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface LayoutTwoProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  playAreaLayout: 'rows' | 'freeform';
  freeformCardSizes: {[playerId: string]: number};
  handHeights: {[playerId: string]: number};
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onLibraryContextMenu: (event: React.MouseEvent, playerId: string) => void;
  onUpdateFreeformCardSize: (playerId: string, delta: number) => void;
  onHandResize: (playerId: string, deltaY: number) => void;
  onCardDragStart: (card: CardType, source: CardLocation, offset: {x: number, y: number}) => void;
  onLibraryDragStart: (source: CardLocation, offset: {x: number, y: number}) => void;
  onZoneDrop: (destination: CardLocation, event: React.DragEvent) => void;
  onZoneDragOver: (event: React.DragEvent, destination: CardLocation) => void;
  onZoneDragLeave: (event: React.DragEvent) => void;
  dropTarget: CardLocation | null;
  onCardHover: (card: CardType | null) => void;
  cardPreview: React.ReactNode;
  stackPanel: React.ReactNode;
  cardSize: number;
  hoveredStackCardId: string | null;
  onUpdateMana: (playerId: string, manaType: ManaType, delta: number) => void;
}

const LayoutTwo: React.FC<LayoutTwoProps> = ({ playerStates, imagesDirectoryHandle, cardPreview, stackPanel, handHeights, onHandResize, hoveredStackCardId, onUpdateMana, ...interactionProps }) => {
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
            handHeight={handHeights[player.id]}
            onHandResize={(deltaY) => onHandResize(player.id, deltaY)}
            hoveredStackCardId={hoveredStackCardId}
            onUpdateMana={onUpdateMana}
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
            handHeight={handHeights[player.id]}
            onHandResize={(deltaY) => onHandResize(player.id, deltaY)}
            hoveredStackCardId={hoveredStackCardId}
            onUpdateMana={onUpdateMana}
            {...interactionProps}
          />
        ))}
        {cardPreview}
      </div>
    </div>
  );
};

export default React.memo(LayoutTwo);